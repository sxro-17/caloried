import { useEffect, useRef, useState, type FormEvent } from 'react'
import './FoodLog.css'
import DashboardSidebar from './DashboardSidebar'
import { calculateNutritionTotals, dateFromKey, dateKey, getEntriesForDate, isValidDateKey, mealCategories, type FoodEntry, type MealCategory } from './foodData'
import { useUserData } from './UserDataProvider'
import { FoodEntriesStatus } from './FoodEntriesStatus'
import { useFoodEntries } from './FoodEntriesProvider'

type FoodForm = { foodName: string; mealCategory: MealCategory; servingSize: string; servingUnit: string; calories: string; protein: string; carbohydrates: string; fat: string }
type FoodErrors = Partial<Record<keyof FoodForm, string>>

const mealClassNames: Record<MealCategory, string> = { Breakfast: 'breakfast', Lunch: 'lunch', Dinner: 'dinner', Snacks: 'snacks' }
const emptyForm = (mealCategory: MealCategory): FoodForm => ({ foodName: '', mealCategory, servingSize: '', servingUnit: 'grams', calories: '', protein: '', carbohydrates: '', fat: '' })
function formatDate(date: Date) { return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date) }
function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1) }
function formatMacro(value: number | null, completeness: 'empty' | 'complete' | 'partial') { return completeness === 'partial' ? '—' : `${formatNumber(value ?? 0)}g` }
function parseOptionalNumber(value: string) { return value.trim() === '' ? null : Number(value) }

function FoodLog() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const requestedDate = new URLSearchParams(window.location.search).get('date')
    return isValidDateKey(requestedDate) ? dateFromKey(requestedDate) : new Date()
  })
  const { entries, loading: foodLoading, error: foodError, saving, addEntry, updateEntry, deleteEntry } = useFoodEntries()
  const { nutritionGoals: goals, loading: userDataLoading, error: userDataError } = useUserData()
  const [highlightedMeal, setHighlightedMeal] = useState<MealCategory | null>(() => {
    const requestedMeal = new URLSearchParams(window.location.search).get('meal')
    return mealCategories.find((meal) => meal === requestedMeal) ?? null
  })
  const [activeMeal, setActiveMeal] = useState<MealCategory | null>(null)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [entryToDelete, setEntryToDelete] = useState<FoodEntry | null>(null)
  const [form, setForm] = useState<FoodForm>(() => emptyForm('Breakfast'))
  const [errors, setErrors] = useState<FoodErrors>({})
  const [validationMessage, setValidationMessage] = useState('')
  const [storageWarning, setStorageWarning] = useState('')
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const confirmDeleteRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const selectedDateKey = dateKey(selectedDate)
  const selectedEntries = getEntriesForDate(entries, selectedDateKey)
  const dailyTotals = calculateNutritionTotals(selectedEntries)
  const caloriesRemaining = Math.max(goals!.calories - dailyTotals.calories, 0)
  const calorieProgress = Math.min((dailyTotals.calories / goals!.calories) * 100, 100)
  const dialogIsOpen = Boolean(activeMeal || entryToDelete)

  useEffect(() => {
    if (!dialogIsOpen) return
    previouslyFocusedRef.current = document.activeElement as HTMLElement
    document.body.style.overflow = 'hidden'
    if (entryToDelete) confirmDeleteRef.current?.focus()
    else closeButtonRef.current?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (entryToDelete) setEntryToDelete(null)
        else setActiveMeal(null)
        return
      }
      const dialogElement = document.querySelector<HTMLElement>('.food-modal, .food-confirm-dialog')
      if (event.key !== 'Tab' || !dialogElement) return
      const focusable = Array.from(dialogElement.querySelectorAll<HTMLElement>('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true')
      if (focusable.length === 0) { event.preventDefault(); return }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previouslyFocusedRef.current?.focus()
    }
  }, [dialogIsOpen, entryToDelete])

  useEffect(() => {
    if (!openMenuId) return
    function handleKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') setOpenMenuId(null) }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [openMenuId])

  useEffect(() => {
    if (!highlightedMeal) return
    const mealElement = document.getElementById(`meal-${highlightedMeal.toLowerCase()}`)
    const frame = requestAnimationFrame(() => mealElement?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    const timeout = window.setTimeout(() => setHighlightedMeal(null), 2400)
    return () => { cancelAnimationFrame(frame); window.clearTimeout(timeout) }
  }, [highlightedMeal])

  if (userDataLoading || !goals || userDataError) return <div className="dashboard-shell"><DashboardSidebar active="food" /><main className="dashboard-main">{userDataLoading && <p role="status">Loading your nutrition goals…</p>}{userDataError && <p className="storage-warning" role="alert">{userDataError}</p>}</main></div>

  function shiftDate(days: number) { setSelectedDate((date) => { const nextDate = new Date(date); nextDate.setDate(nextDate.getDate() + days); return nextDate }) }
  function openAddFood(mealName: MealCategory) { setForm(emptyForm(mealName)); setEditingEntryId(null); setErrors({}); setValidationMessage(''); setOpenMenuId(null); setActiveMeal(mealName) }
  function openEditFood(entry: FoodEntry) { setForm({ foodName: entry.foodName, mealCategory: entry.mealCategory, servingSize: String(entry.servingSize), servingUnit: entry.servingUnit, calories: String(entry.calories), protein: entry.protein === null ? '' : String(entry.protein), carbohydrates: entry.carbohydrates === null ? '' : String(entry.carbohydrates), fat: entry.fat === null ? '' : String(entry.fat) }); setEditingEntryId(entry.id); setErrors({}); setValidationMessage(''); setOpenMenuId(null); setActiveMeal(entry.mealCategory) }
  function closeModal() { setActiveMeal(null); setEditingEntryId(null); setErrors({}); setValidationMessage('') }
  function updateField(field: keyof FoodForm, value: string) { setForm((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: undefined })); setValidationMessage('') }
  function validateForm() {
    const nextErrors: FoodErrors = {}
    if (!form.foodName.trim()) nextErrors.foodName = 'Enter a food name.'
    if (!form.servingSize || !Number.isFinite(Number(form.servingSize)) || Number(form.servingSize) <= 0) nextErrors.servingSize = 'Enter a serving size greater than 0.'
    if (!form.calories || !Number.isFinite(Number(form.calories)) || Number(form.calories) < 0) nextErrors.calories = 'Enter a value of 0 or more.'
    for (const field of ['protein', 'carbohydrates', 'fat'] as const) if (form[field].trim() !== '' && (!Number.isFinite(Number(form[field])) || Number(form[field]) < 0)) nextErrors[field] = 'Enter a value of 0 or more, or leave it blank.'
    return nextErrors
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const nextErrors = validateForm()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) { setValidationMessage('Please fix the highlighted fields before saving.'); return }
    const values = { foodName: form.foodName.trim(), mealCategory: form.mealCategory, servingSize: Number(form.servingSize), servingUnit: form.servingUnit, calories: Number(form.calories), protein: parseOptionalNumber(form.protein), carbohydrates: parseOptionalNumber(form.carbohydrates), fat: parseOptionalNumber(form.fat) }
    const nextEntry = editingEntryId ? entries.find((entry) => entry.id === editingEntryId) : undefined
    if (editingEntryId && !nextEntry) { setStorageWarning('That food entry is no longer available. Please close and reopen the form.'); return }
    const entryToSave: FoodEntry = nextEntry ? { ...nextEntry, ...values } : { id: crypto.randomUUID(), date: selectedDateKey, ...values }
    const saveError = editingEntryId ? await updateEntry(entryToSave) : await addEntry(entryToSave)
    if (saveError) { setStorageWarning(saveError); return }
    setStorageWarning('')
    setForm(emptyForm('Breakfast'))
    closeModal()
  }
  async function confirmDelete() {
    if (!entryToDelete) return
    if (saving) return
    const deleteError = await deleteEntry(entryToDelete.id)
    if (deleteError) { setStorageWarning(deleteError); return }
    setStorageWarning('')
    setEntryToDelete(null)
  }

  return (
    <div className="dashboard-shell food-log-shell">
      <DashboardSidebar active="food" />
      <main className="dashboard-main food-log-main">
        <header className="food-log-header"><div><p className="dashboard-kicker">Your meals, at a glance</p><h1>Food Log</h1><p className="food-log-description">Keep a simple record of what you eat throughout the day.</p></div><div className="food-log-date-controls"><button type="button" onClick={() => shiftDate(-1)}>← <span>Previous</span></button><strong>{formatDate(selectedDate)}</strong><button type="button" onClick={() => shiftDate(1)}><span>Next</span> →</button></div></header>
        {storageWarning && <p className="storage-warning" role="alert">{storageWarning}</p>}
        <FoodEntriesStatus loading={foodLoading} error={foodError} />
        {!foodLoading && !foodError && <>
        <section className="food-summary-card" aria-label="Daily summary"><div className="food-summary-heading"><div><p className="dashboard-kicker">Daily Summary</p><strong>{formatNumber(dailyTotals.calories)} <small>of {goals.calories.toLocaleString()} kcal</small></strong></div><span className="summary-remaining">{formatNumber(caloriesRemaining)} kcal remaining</span></div><div className="food-summary-progress"><span style={{ width: `${calorieProgress}%` }} /></div><div className="food-summary-macros"><div><span className="summary-dot protein" />Protein <strong>{formatMacro(dailyTotals.protein, dailyTotals.macroCompleteness.protein)}</strong>{dailyTotals.macroCompleteness.protein === 'partial' && <small className="macro-incomplete">Incomplete</small>}</div><div><span className="summary-dot carbs" />Carbs <strong>{formatMacro(dailyTotals.carbohydrates, dailyTotals.macroCompleteness.carbohydrates)}</strong>{dailyTotals.macroCompleteness.carbohydrates === 'partial' && <small className="macro-incomplete">Incomplete</small>}</div><div><span className="summary-dot fats" />Fats <strong>{formatMacro(dailyTotals.fat, dailyTotals.macroCompleteness.fat)}</strong>{dailyTotals.macroCompleteness.fat === 'partial' && <small className="macro-incomplete">Incomplete</small>}</div></div></section>
        <section className="food-meals-section"><div className="food-meals-heading"><div><p className="dashboard-kicker">Your day</p><h2>Meals</h2></div></div><div className="food-meals-grid">{mealCategories.map((mealName) => { const mealEntries = selectedEntries.filter((entry) => entry.mealCategory === mealName); const mealTotal = mealEntries.reduce((total, entry) => total + entry.calories, 0); return <article className={`food-meal-card ${mealClassNames[mealName]} ${highlightedMeal === mealName ? 'is-highlighted' : ''}`} id={`meal-${mealName.toLowerCase()}`} key={mealName}><header><div><h3>{mealName}</h3><span>{mealEntries.length} {mealEntries.length === 1 ? 'item' : 'items'}</span></div><strong>{formatNumber(mealTotal)} kcal</strong></header><div className="food-table-heading"><span>Food name</span><span>Serving</span><span>Calories</span><span aria-hidden="true" /></div><div className="food-items">{mealEntries.length === 0 ? <p className="food-empty-state">No foods logged yet.</p> : mealEntries.map((entry) => <div className="food-item" key={entry.id}><span>{entry.foodName}</span><span>{formatNumber(entry.servingSize)} {entry.servingUnit}</span><strong>{formatNumber(entry.calories)} kcal</strong><div className="food-entry-menu"><button className="food-entry-menu-button" type="button" aria-label={`Actions for ${entry.foodName}`} aria-expanded={openMenuId === entry.id} aria-haspopup="menu" onClick={() => setOpenMenuId(openMenuId === entry.id ? null : entry.id)}>⋮</button>{openMenuId === entry.id && <div className="food-entry-menu-list" role="menu"><button type="button" role="menuitem" onClick={() => openEditFood(entry)}>Edit</button><button type="button" role="menuitem" onClick={() => { setOpenMenuId(null); setEntryToDelete(entry) }}>Delete</button></div>}</div></div>)}</div><button className="food-add-button" type="button" onClick={() => openAddFood(mealName)}>+ Add Food</button></article> })}</div></section>
        </>}
      </main>

      {activeMeal && <div className="food-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal() }}><section className="food-modal" role="dialog" aria-modal="true" aria-labelledby="add-food-title"><div className="food-modal-header"><div><p className="dashboard-kicker">{activeMeal}</p><h2 id="add-food-title">{editingEntryId ? 'Edit Food' : 'Add Food'}</h2></div><button className="food-modal-close" ref={closeButtonRef} type="button" onClick={closeModal} aria-label={`Close ${editingEntryId ? 'Edit' : 'Add'} Food dialog`}>×</button></div><form onSubmit={handleSubmit} noValidate><div className="food-form-field food-form-wide"><label htmlFor="food-name">Food Name</label><input id="food-name" type="text" value={form.foodName} onChange={(event) => updateField('foodName', event.target.value)} aria-invalid={Boolean(errors.foodName)} aria-describedby={errors.foodName ? 'food-name-error' : undefined} placeholder="e.g. Grilled chicken" />{errors.foodName && <span className="food-field-error" id="food-name-error">{errors.foodName}</span>}</div><div className="food-form-field"><label htmlFor="meal-category">Meal Category</label><select id="meal-category" value={form.mealCategory} onChange={(event) => updateField('mealCategory', event.target.value as MealCategory)}><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snacks</option></select></div><div className="food-form-field"><label htmlFor="serving-size">Serving Size</label><input id="serving-size" type="number" min="0.01" step="any" value={form.servingSize} onChange={(event) => updateField('servingSize', event.target.value)} aria-invalid={Boolean(errors.servingSize)} aria-describedby={errors.servingSize ? 'serving-size-error' : undefined} placeholder="1" />{errors.servingSize && <span className="food-field-error" id="serving-size-error">{errors.servingSize}</span>}</div><div className="food-form-field"><label htmlFor="serving-unit">Serving Unit</label><select id="serving-unit" value={form.servingUnit} onChange={(event) => updateField('servingUnit', event.target.value)}><option>grams</option><option>pieces</option><option>cups</option><option>servings</option></select></div><div className="food-form-field"><label htmlFor="calories">Calories</label><input id="calories" type="number" min="0" step="any" value={form.calories} onChange={(event) => updateField('calories', event.target.value)} aria-invalid={Boolean(errors.calories)} placeholder="0" />{errors.calories && <span className="food-field-error">{errors.calories}</span>}</div><div className="food-form-field"><label htmlFor="protein">Protein (g) <span className="optional-field-label">optional</span></label><input id="protein" type="number" min="0" step="any" value={form.protein} onChange={(event) => updateField('protein', event.target.value)} aria-invalid={Boolean(errors.protein)} placeholder="Optional" />{errors.protein && <span className="food-field-error">{errors.protein}</span>}</div><div className="food-form-field"><label htmlFor="carbohydrates">Carbohydrates (g) <span className="optional-field-label">optional</span></label><input id="carbohydrates" type="number" min="0" step="any" value={form.carbohydrates} onChange={(event) => updateField('carbohydrates', event.target.value)} aria-invalid={Boolean(errors.carbohydrates)} placeholder="Optional" />{errors.carbohydrates && <span className="food-field-error">{errors.carbohydrates}</span>}</div><div className="food-form-field"><label htmlFor="fat">Fat (g) <span className="optional-field-label">optional</span></label><input id="fat" type="number" min="0" step="any" value={form.fat} onChange={(event) => updateField('fat', event.target.value)} aria-invalid={Boolean(errors.fat)} placeholder="Optional" />{errors.fat && <span className="food-field-error">{errors.fat}</span>}</div>{validationMessage && <p className={`food-validation-message ${Object.keys(errors).length === 0 ? 'success' : ''}`} role="status">{validationMessage}</p>}<div className="food-modal-actions"><button className="food-cancel-button" type="button" onClick={closeModal}>Cancel</button><button className="food-submit-button" type="submit">{editingEntryId ? 'Save Changes' : 'Add Food'}</button></div></form></section></div>}
      {entryToDelete && <div className="food-modal-backdrop" role="presentation"><section className="food-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-food-title" aria-describedby="delete-food-description"><div className="food-modal-header"><div><p className="dashboard-kicker">Remove entry</p><h2 id="delete-food-title">Delete Food?</h2></div><button className="food-modal-close" type="button" onClick={() => setEntryToDelete(null)} aria-label="Close delete confirmation">×</button></div><p id="delete-food-description">Are you sure you want to delete <strong>{entryToDelete.foodName}</strong>? This cannot be undone.</p><div className="food-modal-actions"><button className="food-cancel-button" type="button" onClick={() => setEntryToDelete(null)}>Cancel</button><button className="food-delete-button" ref={confirmDeleteRef} type="button" onClick={confirmDelete}>Delete</button></div></section></div>}
    </div>
  )
}

export default FoodLog
