import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from './auth/useAuth'
import { supabase } from './supabaseClient'
import { loadProfile, saveProfile as saveGuestProfile, type ProfileData } from './profileData'
import { isNutritionGoals, loadNutritionGoals, saveNutritionGoals as saveGuestNutritionGoals, type NutritionGoals } from './settingsData'
import { UserDataContext, type UserDataContextValue } from './UserDataContext'

type CloudProfile = { full_name: string; age: number | null; height_cm: number | string | null; weight_kg: number | string | null }
type CloudGoals = { calories: number | string; protein: number | string; carbohydrates: number | string; fat: number | string }

function mapProfile(row: CloudProfile): ProfileData {
  return { fullName: row.full_name, age: row.age === null ? '' : String(row.age), height: row.height_cm === null ? '' : String(row.height_cm), weight: row.weight_kg === null ? '' : String(row.weight_kg) }
}
function mapGoals(row: CloudGoals): NutritionGoals {
  return { calories: Number(row.calories), protein: Number(row.protein), carbohydrates: Number(row.carbohydrates), fat: Number(row.fat) }
}

function cloudError(action: string) { return `We could not ${action} your account data. Please check your connection and try again.` }
const cloudSaveTimeoutMs = 10000
const cloudLoadTimeoutMs = 10000

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error('Cloud save timed out')), timeoutMs)
    promise.then((value) => { window.clearTimeout(timeoutId); resolve(value) }, (reason: unknown) => { window.clearTimeout(timeoutId); reject(reason) })
  })
}

export function UserDataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [goalsSaving, setGoalsSaving] = useState(false)
  const generationRef = useRef(0)
  const activeUserIdRef = useRef<string | null>(null)
  const mountedRef = useRef(false)
  const loadInFlightRef = useRef(false)
  const profileOperationRef = useRef(0)
  const goalsOperationRef = useRef(0)
  const [retryToken, setRetryToken] = useState(0)
  const profileSavingRef = useRef(false)
  const goalsSavingRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    activeUserIdRef.current = user?.id ?? null
    const generation = ++generationRef.current
    let active = true
    setProfile(null)
    setNutritionGoals(null)
    setError('')
    setLoading(true)
    profileOperationRef.current += 1
    goalsOperationRef.current += 1
    profileSavingRef.current = false
    goalsSavingRef.current = false
    setProfileSaving(false)
    setGoalsSaving(false)

    if (authLoading) return () => { active = false }

    if (!user) {
      const syncGuestData = () => {
        if (!active || generation !== generationRef.current) return
        setProfile(loadProfile())
        setNutritionGoals(loadNutritionGoals())
        setLoading(false)
      }
      syncGuestData()
      loadInFlightRef.current = false
      window.addEventListener('storage', syncGuestData)
      window.addEventListener('caloried-profile-updated', syncGuestData)
      window.addEventListener('caloried-settings-updated', syncGuestData)
      return () => {
        active = false
        window.removeEventListener('storage', syncGuestData)
        window.removeEventListener('caloried-profile-updated', syncGuestData)
        window.removeEventListener('caloried-settings-updated', syncGuestData)
      }
    }

    const userId = user.id
    loadInFlightRef.current = true
    void (async () => {
      try {
        const [profileResult, goalsResult] = await withTimeout(Promise.all([
          supabase.from('profiles').select('full_name,age,height_cm,weight_kg').eq('user_id', userId).maybeSingle(),
          supabase.from('nutrition_goals').select('calories,protein,carbohydrates,fat').eq('user_id', userId).maybeSingle(),
        ]), cloudLoadTimeoutMs)
        if (!active || generation !== generationRef.current) return
        if (profileResult.error || goalsResult.error) {
          setError(cloudError('load'))
        } else if (!profileResult.data || !goalsResult.data) {
          setError('Your account data is not available yet. Please refresh and try again.')
        } else {
          const nextProfile = mapProfile(profileResult.data as CloudProfile)
          const nextGoals = mapGoals(goalsResult.data as CloudGoals)
          if (isNutritionGoals(nextGoals)) {
            setProfile(nextProfile)
            setNutritionGoals(nextGoals)
          } else {
            setError('Your nutrition goals could not be loaded. Please refresh and try again.')
          }
        }
      } catch {
        if (active && generation === generationRef.current) setError(cloudError('load'))
      } finally {
        if (active && generation === generationRef.current) setLoading(false)
        if (generation === generationRef.current) loadInFlightRef.current = false
      }
    })()

    return () => { active = false; if (generation === generationRef.current) { generationRef.current += 1; loadInFlightRef.current = false } }
  }, [authLoading, retryToken, user])

  async function saveProfile(profileToSave: ProfileData) {
    if (profileSavingRef.current) return false
    profileSavingRef.current = true
    setProfileSaving(true)
    const saveUserId = user?.id ?? null
    const saveGeneration = generationRef.current
    const operation = ++profileOperationRef.current
    const isCurrentSave = () => mountedRef.current && activeUserIdRef.current === saveUserId && generationRef.current === saveGeneration && profileOperationRef.current === operation
    try {
      if (!user) {
        const didSave = saveGuestProfile(profileToSave)
        if (didSave && isCurrentSave()) setProfile(profileToSave)
        return didSave
      }
      const { error: saveError } = await withTimeout(supabase.from('profiles').upsert({ user_id: user.id, full_name: profileToSave.fullName, age: profileToSave.age ? Number(profileToSave.age) : null, height_cm: profileToSave.height ? Number(profileToSave.height) : null, weight_kg: profileToSave.weight ? Number(profileToSave.weight) : null }, { onConflict: 'user_id' }), cloudSaveTimeoutMs)
      if (saveError) return false
      if (!isCurrentSave()) return false
      setProfile(profileToSave)
      return true
    } catch { return false } finally {
      profileSavingRef.current = false
      setProfileSaving(false)
    }
  }

  async function saveNutritionGoals(goalsToSave: NutritionGoals) {
    if (goalsSavingRef.current) return false
    goalsSavingRef.current = true
    setGoalsSaving(true)
    const saveUserId = user?.id ?? null
    const saveGeneration = generationRef.current
    const operation = ++goalsOperationRef.current
    const isCurrentSave = () => mountedRef.current && activeUserIdRef.current === saveUserId && generationRef.current === saveGeneration && goalsOperationRef.current === operation
    try {
      if (!user) {
        const didSave = saveGuestNutritionGoals(goalsToSave)
        if (didSave && isCurrentSave()) setNutritionGoals(goalsToSave)
        return didSave
      }
      const { error: saveError } = await withTimeout(supabase.from('nutrition_goals').upsert({ user_id: user.id, ...goalsToSave }, { onConflict: 'user_id' }), cloudSaveTimeoutMs)
      if (saveError) return false
      if (!isCurrentSave()) return false
      setNutritionGoals(goalsToSave)
      return true
    } catch { return false } finally {
      goalsSavingRef.current = false
      setGoalsSaving(false)
    }
  }

  function retryUserData() {
    if (loadInFlightRef.current) return
    setRetryToken((current) => current + 1)
  }

  const value: UserDataContextValue = { profile, nutritionGoals, loading, error, profileSaving, goalsSaving, saveProfile, saveNutritionGoals, retryUserData }
  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>
}

