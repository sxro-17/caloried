import { isValidDateKey, mealCategories, type FoodEntry, type MealCategory } from './foodData'
import { nutritionGoalLimits, type NutritionGoals } from './settingsData'
import type { ProfileData } from './profileData'

export const guestImportMetadataKey = 'caloried-guest-import-metadata-v1'
export const guestImportDismissedKey = 'caloried-guest-import-dismissed-v1'
export const foodEntriesStorageKey = 'caloried-food-entries-v1'
export const profileStorageKey = 'caloried-profile-v1'
export const settingsStorageKey = 'caloried-settings-v1'

export type GuestImportPreview = {
  foodEntries: FoodEntry[]
  invalidFoodEntryCount: number
  profile: ProfileData | null
  profileInvalid: boolean
  nutritionGoals: NutritionGoals | null
  nutritionGoalsInvalid: boolean
  hasStoredData: boolean
  hasEligibleData: boolean
}

type ImportMetadata = { namespace: string; foodSourceIds: Record<string, string> }
type RawFoodEntry = Partial<FoodEntry> & { id?: unknown }

function isMealCategory(value: unknown): value is MealCategory { return typeof value === 'string' && mealCategories.includes(value as MealCategory) }
function isValidMacro(value: unknown): value is number | null { return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0) }
function isValidServingUnit(value: unknown) { return value === 'grams' || value === 'pieces' || value === 'cups' || value === 'servings' }

function parseProfile(value: string | null): { value: ProfileData | null; invalid: boolean } {
  if (value === null) return { value: null, invalid: false }
  try {
    const parsed = JSON.parse(value) as Partial<ProfileData>
    const fullName = parsed.fullName
    const age = parsed.age
    const height = parsed.height
    const weight = parsed.weight
    const valid = typeof fullName === 'string' && fullName.trim().length >= 1 && fullName.trim().length <= 120 && typeof age === 'string' && typeof height === 'string' && typeof weight === 'string'
    if (!valid) return { value: null, invalid: true }
    const numericFields = [{ value: age, min: 1, max: 120 }, { value: height, min: 50, max: 250 }, { value: weight, min: 20, max: 500 }]
    if (numericFields.some((field) => field.value !== '' && (!Number.isFinite(Number(field.value)) || Number(field.value) < field.min || Number(field.value) > field.max))) return { value: null, invalid: true }
    return { value: { fullName: fullName.trim(), age, height, weight }, invalid: false }
  } catch { return { value: null, invalid: true } }
}

function parseGoals(value: string | null): { value: NutritionGoals | null; invalid: boolean } {
  if (value === null) return { value: null, invalid: false }
  try {
    const parsed = JSON.parse(value) as Partial<NutritionGoals>
    const valid = (Object.keys(nutritionGoalLimits) as (keyof NutritionGoals)[]).every((field) => typeof parsed[field] === 'number' && Number.isFinite(parsed[field]) && parsed[field] >= nutritionGoalLimits[field].min && parsed[field] <= nutritionGoalLimits[field].max)
    return valid ? { value: parsed as NutritionGoals, invalid: false } : { value: null, invalid: true }
  } catch { return { value: null, invalid: true } }
}

function parseFoodEntry(value: unknown): value is FoodEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as RawFoodEntry
  return typeof entry.id === 'string' && typeof entry.date === 'string' && isValidDateKey(entry.date) && typeof entry.foodName === 'string' && entry.foodName.trim().length >= 1 && entry.foodName.trim().length <= 200 && isMealCategory(entry.mealCategory) && isValidServingUnit(entry.servingUnit) && typeof entry.servingSize === 'number' && Number.isFinite(entry.servingSize) && entry.servingSize > 0 && entry.servingSize <= 10000 && typeof entry.calories === 'number' && Number.isFinite(entry.calories) && entry.calories >= 0 && entry.calories <= 10000 && isValidMacro(entry.protein) && isValidMacro(entry.carbohydrates) && isValidMacro(entry.fat)
}

function readFoodEntries() {
  const raw = localStorage.getItem(foodEntriesStorageKey)
  if (raw === null) return { entries: [], invalidCount: 0 }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return { entries: [], invalidCount: 1 }
    const entries = parsed.filter(parseFoodEntry).map((entry) => ({ ...entry, foodName: entry.foodName.trim(), protein: entry.protein ?? null, carbohydrates: entry.carbohydrates ?? null, fat: entry.fat ?? null }))
    return { entries, invalidCount: parsed.length - entries.length }
  } catch { return { entries: [], invalidCount: 1 } }
}

export function readGuestImportPreview(): GuestImportPreview {
  const food = readFoodEntries()
  const profile = parseProfile(localStorage.getItem(profileStorageKey))
  const goals = parseGoals(localStorage.getItem(settingsStorageKey))
  const hasStoredData = localStorage.getItem(foodEntriesStorageKey) !== null || localStorage.getItem(profileStorageKey) !== null || localStorage.getItem(settingsStorageKey) !== null
  return { foodEntries: food.entries, invalidFoodEntryCount: food.invalidCount, profile: profile.value, profileInvalid: profile.invalid, nutritionGoals: goals.value, nutritionGoalsInvalid: goals.invalid, hasStoredData, hasEligibleData: food.entries.length > 0 || profile.value !== null || goals.value !== null }
}

function readMetadata(): ImportMetadata | null {
  try {
    const value = localStorage.getItem(guestImportMetadataKey)
    if (!value) return null
    const parsed = JSON.parse(value) as Partial<ImportMetadata>
    if (typeof parsed.namespace !== 'string' || !parsed.namespace || !parsed.foodSourceIds || typeof parsed.foodSourceIds !== 'object') return null
    return { namespace: parsed.namespace, foodSourceIds: parsed.foodSourceIds as Record<string, string> }
  } catch { return null }
}

function createNamespace() { return crypto.randomUUID() }

export function ensureFoodSourceIds(entries: FoodEntry[]) {
  const existing = readMetadata()
  const metadata: ImportMetadata = existing ?? { namespace: createNamespace(), foodSourceIds: {} }
  const usedIds = new Set<string>()
  const occurrenceByLegacyId = new Map<string, number>()
  const sourceIds = entries.map((entry, index) => {
    const legacyId = entry.id.trim()
    const occurrence = occurrenceByLegacyId.get(legacyId) ?? 0
    occurrenceByLegacyId.set(legacyId, occurrence + 1)
    const sourceKey = legacyId ? `id:${legacyId}:${occurrence}` : `index:${index}`
    const stored = metadata.foodSourceIds[sourceKey]
    if (stored) { usedIds.add(stored); return stored }
    const sourceId = `caloried-local-v1:${metadata.namespace}:${sourceKey}`
    if (usedIds.has(sourceId)) throw new Error('Could not create unique guest food import identifiers.')
    metadata.foodSourceIds[sourceKey] = sourceId
    usedIds.add(sourceId)
    return sourceId
  })
  try {
    localStorage.setItem(guestImportMetadataKey, JSON.stringify(metadata))
  } catch { throw new Error('Guest import metadata could not be saved in this browser.') }
  return { sourceIds, namespace: metadata.namespace }
}

export function importDismissedKey(userId: string) { return `${guestImportDismissedKey}:${userId}` }
