import { useEffect, useState } from 'react'

export type NutritionGoals = { calories: number; protein: number; carbohydrates: number; fat: number }

export const settingsStorageKey = 'caloried-settings-v1'
export const defaultNutritionGoals: NutritionGoals = { calories: 2200, protein: 128, carbohydrates: 310, fat: 76 }
const settingsUpdatedEvent = 'caloried-settings-updated'

function isNutritionGoals(value: unknown): value is NutritionGoals {
  if (!value || typeof value !== 'object') return false
  const goals = value as Partial<NutritionGoals>
  return typeof goals.calories === 'number' && Number.isFinite(goals.calories) && goals.calories > 0
    && typeof goals.protein === 'number' && Number.isFinite(goals.protein) && goals.protein > 0
    && typeof goals.carbohydrates === 'number' && Number.isFinite(goals.carbohydrates) && goals.carbohydrates > 0
    && typeof goals.fat === 'number' && Number.isFinite(goals.fat) && goals.fat > 0
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
  } catch { /* In-memory state still works if storage is unavailable. */ }
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
