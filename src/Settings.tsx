import { useState } from 'react'
import type { FormEvent } from 'react'
import DashboardSidebar from './DashboardSidebar'
import { defaultNutritionGoals, saveNutritionGoals, useNutritionGoals, type NutritionGoals } from './settingsData'
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
  const [goals] = useNutritionGoals()
  const [form, setForm] = useState<GoalForm>(() => goalsToForm(goals || defaultNutritionGoals))
  const [errors, setErrors] = useState<GoalErrors>({})
  const [saved, setSaved] = useState(false)

  const updateField = (field: GoalField, value: string) => {
    setSaved(false)
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const validate = (): NutritionGoals | null => {
    const nextErrors: GoalErrors = {}
    const values = {} as NutritionGoals
    const limits: Record<GoalField, number> = { calories: 10000, protein: 1000, carbohydrates: 1000, fat: 1000 }
    ;(Object.keys(labels) as GoalField[]).forEach((field) => {
      const value = Number(form[field])
      if (!form[field].trim() || !Number.isFinite(value) || value <= 0) nextErrors[field] = 'Enter a positive number.'
      else if (value > limits[field]) nextErrors[field] = `Use a value of ${limits[field].toLocaleString()} or less.`
      else values[field] = value
    })
    setErrors(nextErrors)
    return Object.keys(nextErrors).length ? null : values
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextGoals = validate()
    if (!nextGoals) return
    saveNutritionGoals(nextGoals)
    setForm(goalsToForm(nextGoals))
    setSaved(true)
  }

  return (
    <div className="dashboard-shell">
      <DashboardSidebar active="settings" />
      <main className="dashboard-main settings-main">
        <header className="settings-header">
          <div><p className="dashboard-kicker">Personalize your plan</p><h1>Settings</h1><p>Set the daily nutrition goals you want to work toward.</p></div>
        </header>
        <section className="settings-card" aria-labelledby="nutrition-goals-heading">
          <div className="settings-card-heading"><div><p className="dashboard-kicker">Your targets</p><h2 id="nutrition-goals-heading">Daily Nutrition Goals</h2><p>These goals will be used across your Dashboard, Food Log, History, and Profile.</p></div></div>
          <form className="settings-form" onSubmit={handleSubmit} noValidate>
            {(Object.keys(labels) as GoalField[]).map((field) => (
              <div className="settings-field" key={field}>
                <label htmlFor={`goal-${field}`}>{labels[field]} <span>({units[field]})</span></label>
                <div className="settings-input-wrap"><input id={`goal-${field}`} type="number" min="0.01" step="any" value={form[field]} onChange={(event) => updateField(field, event.target.value)} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `error-${field}` : undefined} /><span>{units[field]}</span></div>
                {errors[field] && <p className="settings-error" id={`error-${field}`}>{errors[field]}</p>}
              </div>
            ))}
            <div className="settings-actions"><button className="settings-save-button" type="submit">Save Goals</button>{saved && <p className="settings-success" role="status">Nutrition goals saved successfully.</p>}</div>
          </form>
        </section>
      </main>
    </div>
  )
}

export default Settings
