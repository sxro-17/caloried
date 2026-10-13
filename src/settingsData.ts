import { useEffect, useState } from 'react'

export type NutritionGoals = { calories: number; protein: number; carbohydrates: number; fat: number }

export const settingsStorageKey = 'caloried-settings-v1'
export const defaultNutritionGoals: NutritionGoals = { calories: 2200, protein: 128, carbohydrates: 310, fat: 76 }
export const nutritionGoalLimits: Record<keyof NutritionGoals, { min: number; max: number }> = {
  calories: { min: 0.01, max: 10000 },
  protein: { min: 0.01, max: 1000 },
  carbohydrates: { min: 0.01, max: 1000 },
  fat: { min: 0.01, max: 1000 },
}
const settingsUpdatedEvent = 'caloried-settings-updated'

export function isNutritionGoals(value: unknown): value is NutritionGoals {
  if (!value || typeof value !== 'object') return false
  const goals = value as Partial<NutritionGoals>
  return (Object.keys(nutritionGoalLimits) as (keyof NutritionGoals)[]).every((field) => {
    const value = goals[field]
    const limits = nutritionGoalLimits[field]
    return typeof value === 'number' && Number.isFinite(value) && value >= limits.min && value <= limits.max
  })
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
