import { useEffect, useRef, useState, type FormEvent } from 'react'
import './FoodLog.css'
import DashboardSidebar from './DashboardSidebar'

type FoodItem = { name: string; serving: string; calories: number }
type Meal = { name: string; total: number; className: string; items: FoodItem[] }
type FoodForm = { foodName: string; mealCategory: string; servingSize: string; servingUnit: string; calories: string; protein: string; carbohydrates: string; fat: string }
type FoodErrors = Partial<Record<keyof FoodForm, string>>

const meals: Meal[] = [
  { name: 'Breakfast', total: 420, className: 'breakfast', items: [{ name: 'Oatmeal with berries', serving: '1 bowl', calories: 280 }, { name: 'Coffee with milk', serving: '1 cup', calories: 140 }] },
  { name: 'Lunch', total: 560, className: 'lunch', items: [{ name: 'Grilled chicken salad', serving: '1 serving', calories: 410 }, { name: 'Whole wheat bread', serving: '2 slices', calories: 150 }] },
  { name: 'Dinner', total: 680, className: 'dinner', items: [{ name: 'Baked salmon', serving: '1 fillet', calories: 390 }, { name: 'Rice and vegetables', serving: '1 plate', calories: 290 }] },
  { name: 'Snacks', total: 182, className: 'snacks', items: [{ name: 'Greek yogurt', serving: '1 cup', calories: 120 }, { name: 'Almonds', serving: '12 pieces', calories: 62 }] },
]

const emptyForm = (mealCategory: string): FoodForm => ({ foodName: '', mealCategory, servingSize: '', servingUnit: 'grams', calories: '', protein: '', carbohydrates: '', fat: '' })

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date)
}

function FoodLog() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [activeMeal, setActiveMeal] = useState<string | null>(null)
  const [form, setForm] = useState<FoodForm>(() => emptyForm('Breakfast'))
  const [errors, setErrors] = useState<FoodErrors>({})
  const [validationMessage, setValidationMessage] = useState('')
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!activeMeal) return
    previouslyFocusedRef.current = document.activeElement as HTMLElement
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setActiveMeal(null)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previouslyFocusedRef.current?.focus()
    }
  }, [activeMeal])

  function shiftDate(days: number) {
    setSelectedDate((date) => {
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + days)
      return nextDate
    })
  }

  function openAddFood(mealName: string) {
    setForm(emptyForm(mealName))
    setErrors({})
    setValidationMessage('')
    setActiveMeal(mealName)
  }

  function closeModal() {
    setActiveMeal(null)
    setErrors({})
    setValidationMessage('')
  }

  function updateField(field: keyof FoodForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setValidationMessage('')
  }

  function validateForm() {
    const nextErrors: FoodErrors = {}
    if (!form.foodName.trim()) nextErrors.foodName = 'Enter a food name.'
    if (!form.servingSize || Number.isNaN(Number(form.servingSize)) || Number(form.servingSize) <= 0) nextErrors.servingSize = 'Enter a serving size greater than 0.'
    for (const field of ['calories', 'protein', 'carbohydrates', 'fat'] as const) {
      if (!form[field] || Number.isNaN(Number(form[field])) || Number(form[field]) < 0) nextErrors[field] = 'Enter a value of 0 or more.'
    }
    return nextErrors
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateForm()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setValidationMessage('Please fix the highlighted fields before adding food.')
      return
    }
    setValidationMessage('This form is valid. Food saving will be added in a future update.')
  }

  return (
    <div className="dashboard-shell food-log-shell">
      <DashboardSidebar active="food" />
      <main className="dashboard-main food-log-main">
        <header className="food-log-header">
          <div><p className="dashboard-kicker">Your meals, at a glance</p><h1>Food Log</h1><p className="food-log-description">Keep a simple record of what you eat throughout the day.</p></div>
          <div className="food-log-date-controls"><button type="button" onClick={() => shiftDate(-1)}>← <span>Previous</span></button><strong>{formatDate(selectedDate)}</strong><button type="button" onClick={() => shiftDate(1)}><span>Next</span> →</button></div>
        </header>

        <section className="food-summary-card" aria-label="Daily summary">
          <div className="food-summary-heading"><div><p className="dashboard-kicker">Daily Summary</p><strong>1,842 <small>of 2,200 kcal</small></strong></div><span className="summary-remaining">358 kcal remaining</span></div>
          <div className="food-summary-progress"><span /></div>
          <div className="food-summary-macros"><div><span className="summary-dot protein" />Protein <strong>92g</strong></div><div><span className="summary-dot carbs" />Carbs <strong>211g</strong></div><div><span className="summary-dot fats" />Fats <strong>58g</strong></div></div>
        </section>

        <section className="food-meals-section"><div className="food-meals-heading"><div><p className="dashboard-kicker">Your day</p><h2>Meals</h2></div></div><div className="food-meals-grid">{meals.map((meal) => <article className={`food-meal-card ${meal.className}`} key={meal.name}><header><div><h3>{meal.name}</h3><span>{meal.items.length} items</span></div><strong>{meal.total} kcal</strong></header><div className="food-table-heading"><span>Food name</span><span>Serving</span><span>Calories</span></div><div className="food-items">{meal.items.map((item) => <div className="food-item" key={item.name}><span>{item.name}</span><span>{item.serving}</span><strong>{item.calories} kcal</strong></div>)}</div><button className="food-add-button" type="button" onClick={() => openAddFood(meal.name)}>+ Add Food</button></article>)}</div></section>
      </main>

      {activeMeal && <div className="food-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal() }}>
        <section className="food-modal" role="dialog" aria-modal="true" aria-labelledby="add-food-title">
          <div className="food-modal-header"><div><p className="dashboard-kicker">{activeMeal}</p><h2 id="add-food-title">Add Food</h2></div><button className="food-modal-close" ref={closeButtonRef} type="button" onClick={closeModal} aria-label="Close Add Food dialog">×</button></div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="food-form-field food-form-wide"><label htmlFor="food-name">Food Name</label><input id="food-name" type="text" value={form.foodName} onChange={(event) => updateField('foodName', event.target.value)} aria-invalid={Boolean(errors.foodName)} aria-describedby={errors.foodName ? 'food-name-error' : undefined} placeholder="e.g. Grilled chicken" />{errors.foodName && <span className="food-field-error" id="food-name-error">{errors.foodName}</span>}</div>
            <div className="food-form-field"><label htmlFor="meal-category">Meal Category</label><select id="meal-category" value={form.mealCategory} onChange={(event) => updateField('mealCategory', event.target.value)}><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snacks</option></select></div>
            <div className="food-form-field"><label htmlFor="serving-size">Serving Size</label><input id="serving-size" type="number" min="0.01" step="any" value={form.servingSize} onChange={(event) => updateField('servingSize', event.target.value)} aria-invalid={Boolean(errors.servingSize)} aria-describedby={errors.servingSize ? 'serving-size-error' : undefined} placeholder="1" />{errors.servingSize && <span className="food-field-error" id="serving-size-error">{errors.servingSize}</span>}</div>
            <div className="food-form-field"><label htmlFor="serving-unit">Serving Unit</label><select id="serving-unit" value={form.servingUnit} onChange={(event) => updateField('servingUnit', event.target.value)}><option>grams</option><option>pieces</option><option>cups</option><option>servings</option></select></div>
            <div className="food-form-field"><label htmlFor="calories">Calories</label><input id="calories" type="number" min="0" step="any" value={form.calories} onChange={(event) => updateField('calories', event.target.value)} aria-invalid={Boolean(errors.calories)} placeholder="0" />{errors.calories && <span className="food-field-error">{errors.calories}</span>}</div>
            <div className="food-form-field"><label htmlFor="protein">Protein (g)</label><input id="protein" type="number" min="0" step="any" value={form.protein} onChange={(event) => updateField('protein', event.target.value)} aria-invalid={Boolean(errors.protein)} placeholder="0" />{errors.protein && <span className="food-field-error">{errors.protein}</span>}</div>
            <div className="food-form-field"><label htmlFor="carbohydrates">Carbohydrates (g)</label><input id="carbohydrates" type="number" min="0" step="any" value={form.carbohydrates} onChange={(event) => updateField('carbohydrates', event.target.value)} aria-invalid={Boolean(errors.carbohydrates)} placeholder="0" />{errors.carbohydrates && <span className="food-field-error">{errors.carbohydrates}</span>}</div>
            <div className="food-form-field"><label htmlFor="fat">Fat (g)</label><input id="fat" type="number" min="0" step="any" value={form.fat} onChange={(event) => updateField('fat', event.target.value)} aria-invalid={Boolean(errors.fat)} placeholder="0" />{errors.fat && <span className="food-field-error">{errors.fat}</span>}</div>
            {validationMessage && <p className={`food-validation-message ${Object.keys(errors).length === 0 ? 'success' : ''}`} role="status">{validationMessage}</p>}
            <div className="food-modal-actions"><button className="food-cancel-button" type="button" onClick={closeModal}>Cancel</button><button className="food-submit-button" type="submit">Add Food</button></div>
          </form>
        </section>
      </div>}
    </div>
  )
}

export default FoodLog
