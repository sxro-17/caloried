import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from './auth/useAuth'
import { supabase } from './supabaseClient'
import { useFoodEntries } from './FoodEntriesProvider'
import { useUserData } from './UserDataProvider'
import { ensureFoodSourceIds, importDismissedKey, readGuestImportPreview, type GuestImportPreview } from './guestDataImport'
import './GuestDataImport.css'

type ImportSelection = { food: boolean; profile: boolean; goals: boolean }
type ImportCounts = { imported: number; skipped: number; failed: number }
type ImportResult = ImportCounts & { messages: string[] }
type ImportOpenResult = { opened: boolean; reason?: 'not-ready' | 'no-eligible-data' }
type ImportContextValue = { importing: boolean; openImport: () => ImportOpenResult }
const ImportContext = createContext<ImportContextValue>({ importing: false, openImport: () => ({ opened: false, reason: 'not-ready' }) })
const importTimeoutMs = 15000

function withTimeout<T>(promise: PromiseLike<T>) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error('Import request timed out.')), importTimeoutMs)
    promise.then((value) => { window.clearTimeout(timeoutId); resolve(value) }, (reason: unknown) => { window.clearTimeout(timeoutId); reject(reason) })
  })
}

function sameProfile(left: NonNullable<GuestImportPreview['profile']>, right: NonNullable<GuestImportPreview['profile']>) { return left.fullName === right.fullName && left.age === right.age && left.height === right.height && left.weight === right.weight }
function sameGoals(left: NonNullable<GuestImportPreview['nutritionGoals']>, right: NonNullable<GuestImportPreview['nutritionGoals']>) { return left.calories === right.calories && left.protein === right.protein && left.carbohydrates === right.carbohydrates && left.fat === right.fat }

export function GuestDataImportProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { profile, nutritionGoals, loading: userDataLoading, error: userDataError, saveProfile, saveNutritionGoals } = useUserData()
  const { loading: foodLoading, refreshEntries } = useFoodEntries()
  const [preview, setPreview] = useState<GuestImportPreview | null>(null)
  const [selection, setSelection] = useState<ImportSelection>({ food: false, profile: false, goals: false })
  const [profileConfirmation, setProfileConfirmation] = useState(false)
  const [goalsConfirmation, setGoalsConfirmation] = useState(false)
  const [visible, setVisible] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<ImportCounts>({ imported: 0, skipped: 0, failed: 0 })
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const activeUserIdRef = useRef<string | null>(null)
  const operationRef = useRef(0)
  useEffect(() => { activeUserIdRef.current = user?.id ?? null; setPreview(null); setVisible(false); setResult(null); setError(''); setImporting(false) }, [user])

  useEffect(() => {
    if (authLoading || !user || userDataLoading || userDataError || foodLoading || activeUserIdRef.current !== user.id) return
    if (localStorage.getItem(importDismissedKey(user.id))) return
    const nextPreview = readGuestImportPreview()
    if (!nextPreview.hasEligibleData) return
    setPreview(nextPreview)
    setSelection({ food: nextPreview.foodEntries.length > 0, profile: nextPreview.profile !== null, goals: nextPreview.nutritionGoals !== null })
    setVisible(true)
  }, [authLoading, foodLoading, user, userDataError, userDataLoading])

  const profileConflict = Boolean(preview?.profile && profile && !sameProfile(preview.profile, profile))
  const goalsConflict = Boolean(preview?.nutritionGoals && nutritionGoals && !sameGoals(preview.nutritionGoals, nutritionGoals))
  const selectedCount = Number(selection.food) + Number(selection.profile) + Number(selection.goals)

  function openImport(): ImportOpenResult {
    if (authLoading || !user || userDataLoading || userDataError || foodLoading || activeUserIdRef.current !== user.id) return { opened: false, reason: 'not-ready' }
    const nextPreview = readGuestImportPreview()
    if (!nextPreview.hasEligibleData) return { opened: false, reason: 'no-eligible-data' }
    setPreview(nextPreview)
    setSelection({ food: nextPreview.foodEntries.length > 0, profile: nextPreview.profile !== null, goals: nextPreview.nutritionGoals !== null })
    setProfileConfirmation(false)
    setGoalsConfirmation(false)
    setProgress({ imported: 0, skipped: 0, failed: 0 })
    setResult(null)
    setError('')
    setVisible(true)
    return { opened: true }
  }

  function dismiss() {
    if (user) localStorage.setItem(importDismissedKey(user.id), '1')
    setVisible(false)
  }

  function currentOperation(operation: number, userId: string) { return operation === operationRef.current && activeUserIdRef.current === userId }

  async function importData() {
    if (!user || !preview || selectedCount === 0 || importing) return
    const operation = ++operationRef.current
    const userId = user.id
    setImporting(true); setError(''); setResult(null); setProgress({ imported: 0, skipped: 0, failed: 0 })
    let counts: ImportCounts = { imported: 0, skipped: 0, failed: 0 }
    const messages: string[] = []
    const updateProgress = (next: Partial<ImportCounts>) => { counts = { ...counts, ...next }; setProgress(counts) }

    try {
      let sourceIds: string[] = []
      if (selection.food) {
        try { sourceIds = ensureFoodSourceIds(preview.foodEntries).sourceIds }
        catch (metadataError) { setError(metadataError instanceof Error ? metadataError.message : 'Guest import metadata could not be saved. No food entries were imported.'); setImporting(false); return }
      }

      if (selection.food) {
        for (const [index, entry] of preview.foodEntries.entries()) {
          if (!currentOperation(operation, userId)) return
          const sourceImportId = sourceIds[index]
          try {
            const existing = await withTimeout(supabase.from('food_entries').select('id,source_import_id').eq('user_id', userId).eq('source_import_id', sourceImportId).maybeSingle())
            if (!currentOperation(operation, userId)) return
            if (existing.error) throw existing.error
            if (existing.data?.source_import_id === sourceImportId) { updateProgress({ skipped: counts.skipped + 1 }); continue }
            const inserted = await withTimeout(supabase.from('food_entries').insert({ user_id: userId, source_import_id: sourceImportId, date: entry.date, food_name: entry.foodName, meal_category: entry.mealCategory, serving_size: entry.servingSize, serving_unit: entry.servingUnit, calories: entry.calories, protein: entry.protein, carbohydrates: entry.carbohydrates, fat: entry.fat }).select('id,source_import_id').single())
            if (!currentOperation(operation, userId)) return
            if (!inserted.error && inserted.data?.source_import_id === sourceImportId) { updateProgress({ imported: counts.imported + 1 }); continue }
            if (inserted.error?.code === '23505') {
              const verified = await withTimeout(supabase.from('food_entries').select('id,source_import_id').eq('user_id', userId).eq('source_import_id', sourceImportId).maybeSingle())
              if (verified.data?.source_import_id === sourceImportId) { updateProgress({ skipped: counts.skipped + 1 }); continue }
            }
            throw inserted.error ?? new Error('The imported food entry was not confirmed by Supabase.')
          } catch (entryError) {
            updateProgress({ failed: counts.failed + 1 })
            messages.push(`${entry.foodName}: ${entryError instanceof Error ? entryError.message : 'could not be imported'}`)
          }
        }
      }

      if (selection.profile && preview.profile) {
        if (profileConflict && !profileConfirmation) { updateProgress({ skipped: counts.skipped + 1 }); messages.push('Profile was skipped because the cloud profile differs and replacement was not confirmed.') }
        else if (profile && sameProfile(preview.profile, profile)) updateProgress({ skipped: counts.skipped + 1 })
        else if (!currentOperation(operation, userId) || !(await saveProfile(preview.profile))) { updateProgress({ failed: counts.failed + 1 }); messages.push('Profile could not be imported.') }
        else updateProgress({ imported: counts.imported + 1 })
      }

      if (selection.goals && preview.nutritionGoals) {
        if (goalsConflict && !goalsConfirmation) { updateProgress({ skipped: counts.skipped + 1 }); messages.push('Nutrition goals were skipped because the cloud goals differ and replacement was not confirmed.') }
        else if (nutritionGoals && sameGoals(preview.nutritionGoals, nutritionGoals)) updateProgress({ skipped: counts.skipped + 1 })
        else if (!currentOperation(operation, userId) || !(await saveNutritionGoals(preview.nutritionGoals))) { updateProgress({ failed: counts.failed + 1 }); messages.push('Nutrition goals could not be imported.') }
        else updateProgress({ imported: counts.imported + 1 })
      }

      if (currentOperation(operation, userId) && selection.food && counts.imported > 0) refreshEntries()
      if (currentOperation(operation, userId)) {
        setResult({ ...counts, messages })
        const unresolvedConflict = (profileConflict && selection.profile && !profileConfirmation) || (goalsConflict && selection.goals && !goalsConfirmation)
        if (counts.failed === 0 && !unresolvedConflict) localStorage.setItem(importDismissedKey(userId), '1')
      }
    } catch (importError) {
      if (currentOperation(operation, userId)) setError(importError instanceof Error ? importError.message : 'The import could not be completed. You can retry safely.')
    } finally {
      if (currentOperation(operation, userId)) setImporting(false)
    }
  }

  const value: ImportContextValue = { importing, openImport }
  return <ImportContext.Provider value={value}>{children}{visible && preview && <ImportDialog preview={preview} selection={selection} setSelection={setSelection} profileConflict={profileConflict} goalsConflict={goalsConflict} profileConfirmation={profileConfirmation} setProfileConfirmation={setProfileConfirmation} goalsConfirmation={goalsConfirmation} setGoalsConfirmation={setGoalsConfirmation} importing={importing} progress={progress} result={result} error={error} onDismiss={dismiss} onImport={() => void importData()} />}</ImportContext.Provider>
}

function ImportDialog({ preview, selection, setSelection, profileConflict, goalsConflict, profileConfirmation, setProfileConfirmation, goalsConfirmation, setGoalsConfirmation, importing, progress, result, error, onDismiss, onImport }: { preview: GuestImportPreview; selection: ImportSelection; setSelection: (value: ImportSelection) => void; profileConflict: boolean; goalsConflict: boolean; profileConfirmation: boolean; setProfileConfirmation: (value: boolean) => void; goalsConfirmation: boolean; setGoalsConfirmation: (value: boolean) => void; importing: boolean; progress: ImportCounts; result: ImportResult | null; error: string; onDismiss: () => void; onImport: () => void }) {
  const totalSelected = (selection.food ? preview.foodEntries.length : 0) + Number(selection.profile && preview.profile !== null) + Number(selection.goals && preview.nutritionGoals !== null)
  const done = progress.imported + progress.skipped + progress.failed
  return <div className="guest-import-backdrop" role="presentation"><section className="guest-import-dialog" role="dialog" aria-modal="true" aria-labelledby="guest-import-title"><div className="guest-import-header"><div><p className="dashboard-kicker">Optional transfer</p><h2 id="guest-import-title">Bring your guest data with you?</h2></div><button type="button" className="guest-import-close" onClick={onDismiss} disabled={importing} aria-label="Close import dialog">×</button></div><p className="guest-import-intro">Your browser has data from guest mode. Choose what you want to copy to this account. Your original browser data will not be changed.</p>
    <div className="guest-import-options">
      <label className="guest-import-option"><input type="checkbox" checked={selection.food} onChange={(event) => setSelection({ ...selection, food: event.target.checked })} disabled={importing || preview.foodEntries.length === 0} /><span><strong>Food Entries</strong><small>{preview.foodEntries.length} valid entries{preview.invalidFoodEntryCount > 0 ? `, ${preview.invalidFoodEntryCount} invalid` : ''}</small></span></label>
      <label className="guest-import-option"><input type="checkbox" checked={selection.profile} onChange={(event) => setSelection({ ...selection, profile: event.target.checked })} disabled={importing || preview.profile === null} /><span><strong>Profile</strong><small>{preview.profile ? `${preview.profile.fullName}${profileConflict ? ' · cloud conflict' : ''}` : preview.profileInvalid ? 'Invalid profile data' : 'No profile data'}</small></span></label>
      <label className="guest-import-option"><input type="checkbox" checked={selection.goals} onChange={(event) => setSelection({ ...selection, goals: event.target.checked })} disabled={importing || preview.nutritionGoals === null} /><span><strong>Nutrition Goals</strong><small>{preview.nutritionGoals ? `${preview.nutritionGoals.calories.toLocaleString()} kcal${goalsConflict ? ' · cloud conflict' : ''}` : preview.nutritionGoalsInvalid ? 'Invalid goals data' : 'No goals data'}</small></span></label>
    </div>
    {(profileConflict && selection.profile) && <label className="guest-import-conflict"><input type="checkbox" checked={profileConfirmation} onChange={(event) => setProfileConfirmation(event.target.checked)} disabled={importing} />I understand this will replace the cloud Profile with the guest Profile.</label>}
    {(goalsConflict && selection.goals) && <label className="guest-import-conflict"><input type="checkbox" checked={goalsConfirmation} onChange={(event) => setGoalsConfirmation(event.target.checked)} disabled={importing} />I understand this will replace the cloud Nutrition Goals with the guest goals.</label>}
    {preview.invalidFoodEntryCount > 0 && <p className="guest-import-note" role="status">Invalid food records will be left untouched and can be reviewed later.</p>}
    {error && <p className="guest-import-error" role="alert">{error}</p>}
    {importing && <div className="guest-import-progress" role="status"><span>Importing… {done} of {totalSelected}</span><span>{progress.failed} failed · {progress.skipped} skipped</span></div>}
    {result && !importing && <div className={`guest-import-result ${result.failed > 0 ? 'has-failures' : ''}`} role="status"><strong>{result.failed > 0 ? 'Import partially completed.' : 'Import complete.'}</strong><span>{result.imported} imported · {result.skipped} skipped · {result.failed} failed</span>{result.messages.map((message) => <small key={message}>{message}</small>)}</div>}
    <div className="guest-import-actions"><button type="button" className="guest-import-secondary" onClick={onDismiss} disabled={importing}>Not Now</button><button type="button" className="guest-import-primary" onClick={onImport} disabled={importing || totalSelected === 0}> {importing ? 'Importing…' : result?.failed ? 'Retry Import' : 'Import My Data'}</button></div>
  </section></div>
}

export function useGuestDataImport() { return useContext(ImportContext) }
