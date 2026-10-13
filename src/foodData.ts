import { useEffect, useState } from 'react'

export type MealCategory = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'
export type FoodEntry = { id: string; date: string; foodName: string; mealCategory: MealCategory; servingSize: number; servingUnit: string; calories: number; protein: number; carbohydrates: number; fat: number }
export type NutritionTotals = { calories: number; protein: number; carbohydrates: number; fat: number }

export const mealCategories: MealCategory[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']
export const caloriesGoal = 2200
export const macroGoals = { protein: 128, carbohydrates: 310, fat: 76 }
export const foodEntriesStorageKey = 'caloried-food-entries-v1'
const foodEntriesUpdatedEvent = 'caloried-food-entries-updated'

function isMealCategory(value: unknown): value is MealCategory { return typeof value === 'string' && mealCategories.includes(value as MealCategory) }

function isValidFoodEntry(value: unknown): value is FoodEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<FoodEntry>
  return typeof entry.id === 'string' && typeof entry.date === 'string' && typeof entry.foodName === 'string' && isMealCategory(entry.mealCategory) && typeof entry.servingUnit === 'string' && typeof entry.servingSize === 'number' && Number.isFinite(entry.servingSize) && entry.servingSize > 0 && typeof entry.calories === 'number' && Number.isFinite(entry.calories) && entry.calories >= 0 && typeof entry.protein === 'number' && Number.isFinite(entry.protein) && entry.protein >= 0 && typeof entry.carbohydrates === 'number' && Number.isFinite(entry.carbohydrates) && entry.carbohydrates >= 0 && typeof entry.fat === 'number' && Number.isFinite(entry.fat) && entry.fat >= 0
}

export function loadFoodEntries(): FoodEntry[] {
  try {
    const storedEntries = localStorage.getItem(foodEntriesStorageKey)
    if (!storedEntries) return []
    const parsedEntries: unknown = JSON.parse(storedEntries)
    return Array.isArray(parsedEntries) ? parsedEntries.filter(isValidFoodEntry) : []
  } catch { return [] }
}

export function saveFoodEntries(entries: FoodEntry[]) {
  try {
    localStorage.setItem(foodEntriesStorageKey, JSON.stringify(entries))
    window.dispatchEvent(new Event(foodEntriesUpdatedEvent))
  } catch { /* In-memory state still works if storage is unavailable. */ }
}

export function useFoodEntries() {
  const [entries, setEntries] = useState<FoodEntry[]>(loadFoodEntries)
  useEffect(() => {
    const syncEntries = () => setEntries(loadFoodEntries())
    window.addEventListener('storage', syncEntries)
    window.addEventListener(foodEntriesUpdatedEvent, syncEntries)
    return () => { window.removeEventListener('storage', syncEntries); window.removeEventListener(foodEntriesUpdatedEvent, syncEntries) }
  }, [])
  return [entries, setEntries] as const
}

export function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
export function getEntriesForDate(entries: FoodEntry[], date: string) { return entries.filter((entry) => entry.date === date) }
export function calculateNutritionTotals(entries: FoodEntry[]): NutritionTotals { return entries.reduce((totals, entry) => ({ calories: totals.calories + entry.calories, protein: totals.protein + entry.protein, carbohydrates: totals.carbohydrates + entry.carbohydrates, fat: totals.fat + entry.fat }), { calories: 0, protein: 0, carbohydrates: 0, fat: 0 }) }
export function calculateMealCalories(entries: FoodEntry[], mealCategory: MealCategory) { return entries.filter((entry) => entry.mealCategory === mealCategory).reduce((total, entry) => total + entry.calories, 0) }
