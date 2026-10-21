import { readStoredFoodEntries } from './foodData'
import { isValidNutritionGoals, isValidProfileData } from './dataValidation'
import type { FoodEntry } from './foodData'
import type { NutritionGoals } from './settingsData'
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
  storageFingerprint: string
}

type ImportMetadata = { namespace: string; foodSourceIds: Record<string, string> }
function parseProfile(value: string | null): { value: ProfileData | null; invalid: boolean } {
  if (value === null) return { value: null, invalid: false }
  try {
    const parsed: unknown = JSON.parse(value)
    return isValidProfileData(parsed) ? { value: { ...(parsed as ProfileData), fullName: (parsed as ProfileData).fullName.trim() }, invalid: false } : { value: null, invalid: true }
  } catch { return { value: null, invalid: true } }
}

function parseGoals(value: string | null): { value: NutritionGoals | null; invalid: boolean } {
  if (value === null) return { value: null, invalid: false }
  try {
    const parsed: unknown = JSON.parse(value)
    return isValidNutritionGoals(parsed) ? { value: parsed, invalid: false } : { value: null, invalid: true }
  } catch { return { value: null, invalid: true } }
}

function readStorageSnapshot() {
  const snapshot = { food: localStorage.getItem(foodEntriesStorageKey), profile: localStorage.getItem(profileStorageKey), goals: localStorage.getItem(settingsStorageKey) }
  return { ...snapshot, fingerprint: JSON.stringify([snapshot.food, snapshot.profile, snapshot.goals]) }
}

export function guestStorageChanged(preview: GuestImportPreview) { return readStorageSnapshot().fingerprint !== preview.storageFingerprint }

export function readGuestImportPreview(): GuestImportPreview {
  const snapshot = readStorageSnapshot()
  const food = readStoredFoodEntries()
  const profile = parseProfile(snapshot.profile)
  const goals = parseGoals(snapshot.goals)
  const hasStoredData = snapshot.food !== null || snapshot.profile !== null || snapshot.goals !== null
  const hasReviewableData = food.entries.length > 0 || profile.value !== null || goals.value !== null || food.invalidCount > 0 || profile.invalid || goals.invalid
  return { foodEntries: food.entries, invalidFoodEntryCount: food.invalidCount, profile: profile.value, profileInvalid: profile.invalid, nutritionGoals: goals.value, nutritionGoalsInvalid: goals.invalid, hasStoredData, hasEligibleData: hasReviewableData, storageFingerprint: snapshot.fingerprint }
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
