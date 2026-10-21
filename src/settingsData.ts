import { useEffect, useState } from 'react'
import { isValidNutritionGoals, nutritionGoalLimits } from './dataValidation'

export type NutritionGoals = { calories: number; protein: number; carbohydrates: number; fat: number }

export const settingsStorageKey = 'caloried-settings-v1'
export const defaultNutritionGoals: NutritionGoals = { calories: 2200, protein: 128, carbohydrates: 310, fat: 76 }
export { nutritionGoalLimits }
const settingsUpdatedEvent = 'caloried-settings-updated'

export function isNutritionGoals(value: unknown): value is NutritionGoals {
  return isValidNutritionGoals(value)
}

export function loadNutritionGoals(): NutritionGoals {
  try {
    const storedSettings = localStorage.getItem(settingsStorageKey)
    if (!storedSettings) return defaultNutritionGoals
    const parsedSettings: unknown = JSON.parse(storedSettings)
    return isNutritionGoals(parsedSettings) ? parsedSettings : defaultNutritionGoals
  } catch { return defaultNutritionGoals }
}

export function saveNutritionGoals(goals: NutritionGoals) {
  if (!isNutritionGoals(goals)) return false
  try {
    localStorage.setItem(settingsStorageKey, JSON.stringify(goals))
    window.dispatchEvent(new Event(settingsUpdatedEvent))
    return true
  } catch { return false }
}

export function useNutritionGoals() {
  const [goals, setGoals] = useState<NutritionGoals>(loadNutritionGoals)
  useEffect(() => {
    const syncGoals = () => setGoals(loadNutritionGoals())
    window.addEventListener('storage', syncGoals)
    window.addEventListener(settingsUpdatedEvent, syncGoals)
    return () => { window.removeEventListener('storage', syncGoals); window.removeEventListener(settingsUpdatedEvent, syncGoals) }
  }, [])
  return [goals, setGoals] as const
}
