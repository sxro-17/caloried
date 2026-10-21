import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from './auth/useAuth'
import { supabase } from './supabaseClient'
import { loadFoodEntries, saveFoodEntries, type FoodEntry } from './foodData'
import { FoodEntriesContext } from './FoodEntriesContext'

type CloudFoodEntry = {
  id: string
  date: string
  food_name: string
  meal_category: FoodEntry['mealCategory']
  serving_size: number
  serving_unit: string
  calories: number
  protein: number | null
  carbohydrates: number | null
  fat: number | null
}
const cloudColumns = 'id,date,food_name,meal_category,serving_size,serving_unit,calories,protein,carbohydrates,fat'
const cloudLoadTimeoutMs = 10000

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error('Cloud load timed out')), timeoutMs)
    promise.then((value) => { window.clearTimeout(timeoutId); resolve(value) }, (reason: unknown) => { window.clearTimeout(timeoutId); reject(reason) })
  })
}

function mapCloudEntry(entry: CloudFoodEntry): FoodEntry {
  return { id: entry.id, date: entry.date, foodName: entry.food_name, mealCategory: entry.meal_category, servingSize: Number(entry.serving_size), servingUnit: entry.serving_unit, calories: Number(entry.calories), protein: entry.protein === null ? null : Number(entry.protein), carbohydrates: entry.carbohydrates === null ? null : Number(entry.carbohydrates), fat: entry.fat === null ? null : Number(entry.fat) }
}

function cloudError(action: string) { return `We could not ${action} your food entry. Please check your connection and try again.` }

export function FoodEntriesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)
  const generationRef = useRef(0)
  const operationRef = useRef(0)
  const savingRef = useRef(false)
  const loadingRef = useRef(false)

  useEffect(() => {
    const generation = ++generationRef.current
    let active = true
    setEntries([])
    setError('')
    setLoading(true)
    operationRef.current += 1
    savingRef.current = false
    setSaving(false)
    loadingRef.current = true

    if (authLoading) return () => { active = false }

    if (!user) {
      const syncGuestEntries = () => { if (active && generation === generationRef.current) setEntries(loadFoodEntries()) }
      syncGuestEntries()
      setLoading(false)
      loadingRef.current = false
      window.addEventListener('storage', syncGuestEntries)
      window.addEventListener('caloried-food-entries-updated', syncGuestEntries)
      return () => {
        active = false
        window.removeEventListener('storage', syncGuestEntries)
        window.removeEventListener('caloried-food-entries-updated', syncGuestEntries)
      }
    }

    const userId = user.id
    void (async () => {
      try {
        const { data, error: queryError } = await withTimeout(supabase.from('food_entries').select(cloudColumns).eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: true }), cloudLoadTimeoutMs)
        if (!active || generation !== generationRef.current) return
        if (queryError) {
          setEntries([])
          setError('We could not load your cloud food entries. Please check your connection and try again.')
        } else {
          setEntries((data as CloudFoodEntry[]).map(mapCloudEntry))
        }
        setLoading(false)
        loadingRef.current = false
      } catch {
        if (!active || generation !== generationRef.current) return
        setEntries([])
        setError('We could not load your cloud food entries. Please check your connection and try again.')
        setLoading(false)
        loadingRef.current = false
      }
    })()

    return () => { active = false; loadingRef.current = false; if (generation === generationRef.current) generationRef.current += 1 }
  }, [authLoading, refreshToken, user])

  async function addEntry(entry: FoodEntry) {
    if (savingRef.current) return 'Another food update is still being saved.'
    if (!user) {
      const nextEntries = [...entries, entry]
      if (!saveFoodEntries(nextEntries)) return 'Your food could not be saved in this browser.'
      setEntries(nextEntries)
      return null
    }
    const userId = user.id
    const generation = generationRef.current
    const operation = ++operationRef.current
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      const { data, error: insertError } = await supabase.from('food_entries').insert({ user_id: userId, date: entry.date, food_name: entry.foodName, meal_category: entry.mealCategory, serving_size: entry.servingSize, serving_unit: entry.servingUnit, calories: entry.calories, protein: entry.protein, carbohydrates: entry.carbohydrates, fat: entry.fat }).select(cloudColumns).single()
      if (insertError || !data) return cloudError('save')
      if (generation !== generationRef.current || user?.id !== userId) return 'Your account changed before the save completed.'
      setEntries((current) => [...current, mapCloudEntry(data as CloudFoodEntry)])
      return null
    } catch { return cloudError('save') }
    finally { if (operation === operationRef.current) { savingRef.current = false; setSaving(false) } }
  }

  async function updateEntry(entry: FoodEntry) {
    if (savingRef.current) return 'Another food update is still being saved.'
    if (!user) {
      const nextEntries = entries.map((current) => current.id === entry.id ? entry : current)
      if (!saveFoodEntries(nextEntries)) return 'Your food could not be saved in this browser.'
      setEntries(nextEntries)
      return null
    }
    const userId = user.id
    const generation = generationRef.current
    const operation = ++operationRef.current
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      const { data, error: updateError } = await supabase.from('food_entries').update({ date: entry.date, food_name: entry.foodName, meal_category: entry.mealCategory, serving_size: entry.servingSize, serving_unit: entry.servingUnit, calories: entry.calories, protein: entry.protein, carbohydrates: entry.carbohydrates, fat: entry.fat }).eq('id', entry.id).eq('user_id', userId).select(cloudColumns).single()
      if (updateError || !data) return cloudError('update')
      if (generation !== generationRef.current || user?.id !== userId) return 'Your account changed before the update completed.'
      setEntries((current) => current.map((item) => item.id === entry.id ? mapCloudEntry(data as CloudFoodEntry) : item))
      return null
    } catch { return cloudError('update') }
    finally { if (operation === operationRef.current) { savingRef.current = false; setSaving(false) } }
  }

  async function deleteEntry(id: string) {
    if (savingRef.current) return 'Another food update is still being saved.'
    if (!user) {
      const nextEntries = entries.filter((entry) => entry.id !== id)
      if (!saveFoodEntries(nextEntries)) return 'Your food could not be deleted from this browser.'
      setEntries(nextEntries)
      return null
    }
    const userId = user.id
    const generation = generationRef.current
    const operation = ++operationRef.current
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      const { data, error: deleteError } = await supabase.from('food_entries').delete().eq('id', id).eq('user_id', userId).select('id').single()
      if (deleteError || !data) return cloudError('delete')
      if (generation !== generationRef.current || user?.id !== userId) return 'Your account changed before the delete completed.'
      setEntries((current) => current.filter((entry) => entry.id !== id))
      return null
    } catch { return cloudError('delete') }
    finally { if (operation === operationRef.current) { savingRef.current = false; setSaving(false) } }
  }

  function refreshEntries() {
    if (loadingRef.current) return
    setRefreshToken((current) => current + 1)
  }

  const value = { entries, loading, saving, error, addEntry, updateEntry, deleteEntry, refreshEntries }
  return <FoodEntriesContext.Provider value={value}>{children}</FoodEntriesContext.Provider>
}
