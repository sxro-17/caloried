export type MealCategory = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'
export type MacroField = 'protein' | 'carbohydrates' | 'fat'
export type FoodEntry = { id: string; date: string; foodName: string; mealCategory: MealCategory; servingSize: number; servingUnit: string; calories: number; protein: number | null; carbohydrates: number | null; fat: number | null }
export type MacroCompleteness = 'empty' | 'complete' | 'partial'
export type NutritionTotals = { calories: number; protein: number | null; carbohydrates: number | null; fat: number | null; macroCompleteness: Record<MacroField, MacroCompleteness> }

import { isValidDateKey, isValidFoodEntry, mealCategories, normalizeFoodEntry } from './dataValidation'
export { isValidDateKey, mealCategories }
export const foodEntriesStorageKey = 'caloried-food-entries-v1'
const foodEntriesUpdatedEvent = 'caloried-food-entries-updated'

export function readStoredFoodEntries() {
  try {
    const storedEntries = localStorage.getItem(foodEntriesStorageKey)
    if (!storedEntries) return { entries: [], invalidCount: 0 }
    const parsedEntries: unknown = JSON.parse(storedEntries)
    if (!Array.isArray(parsedEntries)) return { entries: [], invalidCount: 1 }
    const entries = parsedEntries.filter(isValidFoodEntry).map(normalizeFoodEntry)
    return { entries, invalidCount: parsedEntries.length - entries.length }
  } catch { return { entries: [], invalidCount: 1 } }
}

export function loadFoodEntries(): FoodEntry[] {
  return readStoredFoodEntries().entries
}

export function saveFoodEntries(entries: FoodEntry[]) {
  try {
    localStorage.setItem(foodEntriesStorageKey, JSON.stringify(entries))
    window.dispatchEvent(new Event(foodEntriesUpdatedEvent))
    return true
  } catch { return false }
}

export function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
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
