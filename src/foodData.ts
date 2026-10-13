export type MealCategory = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'
export type MacroField = 'protein' | 'carbohydrates' | 'fat'
export type FoodEntry = { id: string; date: string; foodName: string; mealCategory: MealCategory; servingSize: number; servingUnit: string; calories: number; protein: number | null; carbohydrates: number | null; fat: number | null }
export type MacroCompleteness = 'empty' | 'complete' | 'partial'
export type NutritionTotals = { calories: number; protein: number | null; carbohydrates: number | null; fat: number | null; macroCompleteness: Record<MacroField, MacroCompleteness> }

export const mealCategories: MealCategory[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']
export const foodEntriesStorageKey = 'caloried-food-entries-v1'
const foodEntriesUpdatedEvent = 'caloried-food-entries-updated'

function isMealCategory(value: unknown): value is MealCategory { return typeof value === 'string' && mealCategories.includes(value as MealCategory) }
function isValidMacro(value: unknown) { return value === undefined || value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0) }

function isValidFoodEntry(value: unknown): value is FoodEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<FoodEntry>
  return typeof entry.id === 'string' && typeof entry.date === 'string' && typeof entry.foodName === 'string' && isMealCategory(entry.mealCategory) && typeof entry.servingUnit === 'string' && typeof entry.servingSize === 'number' && Number.isFinite(entry.servingSize) && entry.servingSize > 0 && typeof entry.calories === 'number' && Number.isFinite(entry.calories) && entry.calories >= 0 && isValidMacro(entry.protein) && isValidMacro(entry.carbohydrates) && isValidMacro(entry.fat)
}

function normalizeFoodEntry(entry: FoodEntry): FoodEntry {
  return { ...entry, protein: entry.protein ?? null, carbohydrates: entry.carbohydrates ?? null, fat: entry.fat ?? null }
}

export function loadFoodEntries(): FoodEntry[] {
  try {
    const storedEntries = localStorage.getItem(foodEntriesStorageKey)
    if (!storedEntries) return []
    const parsedEntries: unknown = JSON.parse(storedEntries)
    return Array.isArray(parsedEntries) ? parsedEntries.filter(isValidFoodEntry).map(normalizeFoodEntry) : []
  } catch { return [] }
}

export function saveFoodEntries(entries: FoodEntry[]) {
  try {
    localStorage.setItem(foodEntriesStorageKey, JSON.stringify(entries))
    window.dispatchEvent(new Event(foodEntriesUpdatedEvent))
    return true
  } catch { return false }
}

export function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
export function isValidDateKey(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}
export function dateFromKey(value: string) { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day) }
export function getEntriesForDate(entries: FoodEntry[], date: string) { return entries.filter((entry) => entry.date === date) }
export function calculateNutritionTotals(entries: FoodEntry[]): NutritionTotals {
  const macroFields: MacroField[] = ['protein', 'carbohydrates', 'fat']
  const macroCompleteness = Object.fromEntries(macroFields.map((field) => {
    const knownCount = entries.filter((entry) => entry[field] !== null).length
    return [field, entries.length === 0 ? 'empty' : knownCount === entries.length ? 'complete' : 'partial']
  })) as Record<MacroField, MacroCompleteness>
  const totalFor = (field: MacroField) => macroCompleteness[field] === 'partial' ? null : entries.reduce((total, entry) => total + (entry[field] ?? 0), 0)
  return { calories: entries.reduce((total, entry) => total + entry.calories, 0), protein: totalFor('protein'), carbohydrates: totalFor('carbohydrates'), fat: totalFor('fat'), macroCompleteness }
}
export function calculateMealCalories(entries: FoodEntry[], mealCategory: MealCategory) { return entries.filter((entry) => entry.mealCategory === mealCategory).reduce((total, entry) => total + entry.calories, 0) }
