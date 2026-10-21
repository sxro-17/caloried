import { useState } from 'react'
import type { FormEvent } from 'react'
import DashboardSidebar from './DashboardSidebar'
import { nutritionGoalLimits, type NutritionGoals } from './settingsData'
import { useUserData } from './UserDataContext'
import { useAuth } from './auth/useAuth'
import { useGuestDataImport } from './GuestDataImportContext'
import './Settings.css'

type GoalField = keyof NutritionGoals
type GoalForm = Record<GoalField, string>
type GoalErrors = Partial<Record<GoalField, string>>

const labels: Record<GoalField, string> = {
  calories: 'Daily calorie goal',
  protein: 'Protein goal',
  carbohydrates: 'Carbohydrate goal',
  fat: 'Fat goal',
}

const units: Record<GoalField, string> = { calories: 'kcal', protein: 'g', carbohydrates: 'g', fat: 'g' }

function goalsToForm(goals: NutritionGoals): GoalForm {
  return { calories: String(goals.calories), protein: String(goals.protein), carbohydrates: String(goals.carbohydrates), fat: String(goals.fat) }
}

function Settings() {
  const { user } = useAuth()
  const { openImport } = useGuestDataImport()
  const { nutritionGoals: goals, loading, error, goalsSaving: _goalsSaving, saveNutritionGoals, retryUserData } = useUserData()
  const [importMessage, setImportMessage] = useState('')

  if (loading || !goals || error) return <div className="dashboard-shell"><DashboardSidebar active="settings" /><main className="dashboard-main settings-main">{loading && <p role="status">Loading your profile and nutrition goals…</p>}{error && <div className="storage-warning" role="alert"><span>{error}</span><button type="button" onClick={retryUserData}>Try again</button></div>}{!loading && !error && !goals && <p className="storage-warning" role="alert">Your nutrition goals are unavailable. Please refresh and try again.</p>}</main></div>

  return (
    <div className="dashboard-shell">
      <DashboardSidebar active="settings" />
      <main className="dashboard-main settings-main">
        <header className="settings-header">
          <div><p className="dashboard-kicker">Personalize your plan</p><h1>Settings</h1><p>Set the daily nutrition goals you want to work toward.</p></div>
        </header>
        <section className="settings-card" aria-labelledby="nutrition-goals-heading">
          <div className="settings-card-heading"><div><p className="dashboard-kicker">Your targets</p><h2 id="nutrition-goals-heading">Daily Nutrition Goals</h2><p>These goals will be used across your Dashboard, Food Log, History, and Profile.</p></div></div>
          <SettingsGoalEditor goals={goals} saveNutritionGoals={saveNutritionGoals} />
        </section>
        {user && <section className="settings-card settings-import-card" aria-labelledby="guest-import-heading"><div className="settings-card-heading"><div><p className="dashboard-kicker">Move browser data</p><h2 id="guest-import-heading">Import Guest Data</h2><p>Review and optionally copy data saved in guest mode into this account. Nothing is imported until you confirm it in the preview.</p></div></div><div className="settings-import-actions"><button className="settings-import-button" type="button" onClick={() => { const result = openImport(); setImportMessage(result.opened ? '' : result.reason === 'no-eligible-data' ? 'No eligible guest data is available in this browser.' : 'Guest data import is not ready yet. Please try again in a moment.') }}>Import Guest Data</button>{importMessage && <p className="settings-import-message" role="status">{importMessage}</p>}</div></section>}
      </main>
    </div>
  )
}

function SettingsGoalEditor({ goals, saveNutritionGoals }: { goals: NutritionGoals; saveNutritionGoals: (goals: NutritionGoals) => Promise<boolean> }) {
  const [form, setForm] = useState<GoalForm>(() => goalsToForm(goals))
  const [errors, setErrors] = useState<GoalErrors>({})
  const [saved, setSaved] = useState(false)
  const [storageWarning, setStorageWarning] = useState('')
  const updateField = (field: GoalField, value: string) => { setSaved(false); setForm((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: undefined })) }
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: GoalErrors = {}
    const values = {} as NutritionGoals
    ;(Object.keys(labels) as GoalField[]).forEach((field) => {
      const value = Number(form[field])
      const limits = nutritionGoalLimits[field]
      if (!form[field].trim() || !Number.isFinite(value) || value <= 0) nextErrors[field] = 'Enter a positive number.'
      else if (value < limits.min || value > limits.max) nextErrors[field] = `Use a value between ${limits.min} and ${limits.max.toLocaleString()}.`
      else values[field] = value
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const didSave = await saveNutritionGoals(values)
    if (didSave) { setForm(goalsToForm(values)); setSaved(true); setStorageWarning('') }
    else { setSaved(false); setStorageWarning('Your goals could not be saved. Your changes are still in the form; please try again.') }
  }
  return <>{storageWarning && <p className="storage-warning" role="alert">{storageWarning}</p>}<form className="settings-form" onSubmit={handleSubmit} noValidate>{(Object.keys(labels) as GoalField[]).map((field) => <div className="settings-field" key={field}><label htmlFor={`goal-${field}`}>{labels[field]} <span>({units[field]})</span></label><div className="settings-input-wrap"><input id={`goal-${field}`} type="number" min="0.01" step="any" value={form[field]} onChange={(event) => updateField(field, event.target.value)} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `error-${field}` : undefined} /><span>{units[field]}</span></div>{errors[field] && <p className="settings-error" id={`error-${field}`}>{errors[field]}</p>}</div>)}<div className="settings-actions"><button className="settings-save-button" type="submit">Save Goals</button>{saved && <p className="settings-success" role="status">Nutrition goals saved successfully.</p>}</div></form></>
}

export default Settings
