import type { FoodEntry, MealCategory } from './foodData'
import type { ProfileData } from './profileData'
import type { NutritionGoals } from './settingsData'

export const mealCategories: MealCategory[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']
export const servingUnits = ['grams', 'pieces', 'cups', 'servings'] as const
export const nutritionGoalLimits: Record<keyof NutritionGoals, { min: number; max: number }> = {
  calories: { min: 0.01, max: 10000 },
  protein: { min: 0.01, max: 1000 },
  carbohydrates: { min: 0.01, max: 1000 },
  fat: { min: 0.01, max: 1000 },
}

export function isMealCategory(value: unknown): value is MealCategory { return typeof value === 'string' && mealCategories.includes(value as MealCategory) }
export function isServingUnit(value: unknown): value is typeof servingUnits[number] { return typeof value === 'string' && servingUnits.includes(value as typeof servingUnits[number]) }
export function isValidDateKey(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function isValidMacro(value: unknown) { return value === undefined || value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000) }

export function isValidFoodEntry(value: unknown): value is FoodEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<FoodEntry>
  return typeof entry.id === 'string' && entry.id.trim().length > 0 && entry.id.length <= 200 && typeof entry.date === 'string' && isValidDateKey(entry.date) && typeof entry.foodName === 'string' && entry.foodName.trim().length >= 1 && entry.foodName.trim().length <= 200 && isMealCategory(entry.mealCategory) && isServingUnit(entry.servingUnit) && typeof entry.servingSize === 'number' && Number.isFinite(entry.servingSize) && entry.servingSize > 0 && entry.servingSize <= 10000 && typeof entry.calories === 'number' && Number.isFinite(entry.calories) && entry.calories >= 0 && entry.calories <= 10000 && isValidMacro(entry.protein) && isValidMacro(entry.carbohydrates) && isValidMacro(entry.fat)
}

export function normalizeFoodEntry(entry: FoodEntry): FoodEntry { return { ...entry, foodName: entry.foodName.trim(), protein: entry.protein ?? null, carbohydrates: entry.carbohydrates ?? null, fat: entry.fat ?? null } }

export function isValidProfileData(value: unknown): value is ProfileData {
  if (!value || typeof value !== 'object') return false
  const profile = value as Partial<ProfileData>
  if (typeof profile.fullName !== 'string' || profile.fullName.trim().length < 1 || profile.fullName.trim().length > 120 || typeof profile.age !== 'string' || typeof profile.height !== 'string' || typeof profile.weight !== 'string') return false
  const numericFields: Array<[string, string, number, number]> = [['age', profile.age, 1, 120], ['height', profile.height, 50, 250], ['weight', profile.weight, 20, 500]]
  return numericFields.every(([, raw, min, max]) => raw === '' || (Number.isInteger(Number(raw)) && Number(raw) >= min && Number(raw) <= max))
}

export function isValidNutritionGoals(value: unknown): value is NutritionGoals {
  if (!value || typeof value !== 'object') return false
  const goals = value as Partial<NutritionGoals>
  return (Object.keys(nutritionGoalLimits) as (keyof NutritionGoals)[]).every((field) => {
    const fieldValue = goals[field]
    const limits = nutritionGoalLimits[field]
    return typeof fieldValue === 'number' && Number.isFinite(fieldValue) && fieldValue >= limits.min && fieldValue <= limits.max
  })
}
