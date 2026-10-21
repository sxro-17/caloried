import { describe, expect, it } from 'vitest'
import { foodEntriesStorageKey, guestStorageChanged, readGuestImportPreview } from '../src/guestDataImport'

const validEntry = (overrides: Record<string, unknown> = {}) => ({
  id: 'legacy-1', date: '2026-10-21', foodName: ' Oatmeal ', mealCategory: 'Breakfast', servingSize: 1, servingUnit: 'cups', calories: 250, protein: null, carbohydrates: 0, fat: 4, ...overrides,
})

describe('guest data validation and preview snapshots', () => {
  it('preserves valid legacy entries, explicit zero macros, null macros, and raw storage', () => {
    const raw = JSON.stringify([validEntry(), validEntry({ id: 'legacy-2', protein: 0, carbohydrates: null, fat: 0 })])
    localStorage.setItem(foodEntriesStorageKey, raw)

    const preview = readGuestImportPreview()

    expect(preview.foodEntries).toHaveLength(2)
    expect(preview.foodEntries[0]).toMatchObject({ foodName: 'Oatmeal', protein: null, carbohydrates: 0, fat: 4 })
    expect(preview.foodEntries[1]).toMatchObject({ protein: 0, carbohydrates: null, fat: 0 })
    expect(localStorage.getItem(foodEntriesStorageKey)).toBe(raw)
  })

  it('reports invalid dates, serving units, numeric limits, and malformed legacy records without importing them', () => {
    const raw = JSON.stringify([
      validEntry({ date: '2026-02-30' }),
      validEntry({ servingUnit: 'ounces' }),
      validEntry({ calories: 10001 }),
      validEntry({ id: 'valid-entry' }),
    ])
    localStorage.setItem(foodEntriesStorageKey, raw)

    const preview = readGuestImportPreview()

    expect(preview.foodEntries).toHaveLength(1)
    expect(preview.foodEntries[0].id).toBe('valid-entry')
    expect(preview.invalidFoodEntryCount).toBe(3)
    expect(preview.hasEligibleData).toBe(true)
    expect(localStorage.getItem(foodEntriesStorageKey)).toBe(raw)
  })

  it('reports invalid profile and nutrition-goal records safely', () => {
    localStorage.setItem('caloried-profile-v1', JSON.stringify({ fullName: '', age: 'not-a-number', height: '170', weight: '70' }))
    localStorage.setItem('caloried-settings-v1', JSON.stringify({ calories: 0, protein: 128, carbohydrates: 310, fat: 76 }))

    const preview = readGuestImportPreview()

    expect(preview.profile).toBeNull()
    expect(preview.profileInvalid).toBe(true)
    expect(preview.nutritionGoals).toBeNull()
    expect(preview.nutritionGoalsInvalid).toBe(true)
    expect(preview.hasEligibleData).toBe(true)
  })

  it('detects guest storage changes after a preview was displayed', () => {
    localStorage.setItem(foodEntriesStorageKey, JSON.stringify([validEntry()]))
    const preview = readGuestImportPreview()

    localStorage.setItem(foodEntriesStorageKey, JSON.stringify([validEntry({ calories: 300 })]))

    expect(guestStorageChanged(preview)).toBe(true)
    expect(readGuestImportPreview().foodEntries[0].calories).toBe(300)
  })

  it('does not report a change when storage is unchanged', () => {
    localStorage.setItem(foodEntriesStorageKey, JSON.stringify([validEntry()]))
    const preview = readGuestImportPreview()

    expect(guestStorageChanged(preview)).toBe(false)
  })
})
