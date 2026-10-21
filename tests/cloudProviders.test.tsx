import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: { user: null as { id: string } | null, loading: false },
  supabase: { from: vi.fn() },
}))

vi.mock('../src/auth/useAuth', () => ({ useAuth: () => mocks.auth }))
vi.mock('../src/supabaseClient', () => ({ supabase: mocks.supabase }))

import { FoodEntriesProvider } from '../src/FoodEntriesProvider'
import { useFoodEntries } from '../src/FoodEntriesContext'
import { UserDataProvider } from '../src/UserDataProvider'
import { useUserData } from '../src/UserDataContext'
import { foodEntriesStorageKey } from '../src/foodData'
import { profileStorageKey } from '../src/profileData'
import { settingsStorageKey } from '../src/settingsData'

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (reason?: unknown) => void }

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => { resolve = nextResolve; reject = nextReject })
  return { promise, resolve, reject }
}

function chain<T>(terminal: Promise<T>) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    maybeSingle: vi.fn(() => terminal),
  }
  return builder
}

function userDataResponse(fullName: string) {
  return {
    profile: { data: { full_name: fullName, age: null, height_cm: null, weight_kg: null }, error: null },
    goals: { data: { calories: 2200, protein: 128, carbohydrates: 310, fat: 76 }, error: null },
  }
}

function UserDataProbe() {
  const { profile, nutritionGoals, loading, error, retryUserData, saveProfile } = useUserData()
  return <>
    <span data-testid="loading">{String(loading)}</span>
    <span data-testid="error">{error}</span>
    <span data-testid="profile">{profile?.fullName ?? ''}</span>
    <span data-testid="calories">{nutritionGoals?.calories ?? ''}</span>
    <button type="button" onClick={retryUserData}>Retry user data</button>
    <button type="button" onClick={() => void saveProfile({ fullName: 'Saved A', age: '', height: '', weight: '' })}>Save profile</button>
  </>
}

function FoodProbe() {
  const { entries, loading, error, refreshEntries } = useFoodEntries()
  return <>
    <span data-testid="food-loading">{String(loading)}</span>
    <span data-testid="food-error">{error}</span>
    <span data-testid="food-name">{entries[0]?.foodName ?? ''}</span>
    <button type="button" onClick={refreshEntries}>Retry food</button>
  </>
}

function renderUserData() { return render(<UserDataProvider><UserDataProbe /></UserDataProvider>) }
function renderFood() { return render(<FoodEntriesProvider><FoodProbe /></FoodEntriesProvider>) }
function text(testId: string) { return screen.getByTestId(testId).textContent ?? '' }
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }) }

function configureUserDataLoads(profile: Promise<unknown>, goals: Promise<unknown>) {
  mocks.supabase.from.mockImplementation((table: string) => table === 'profiles' ? chain(profile) : chain(goals))
}

function configureFoodLoad(result: Promise<unknown>) {
  mocks.supabase.from.mockImplementation(() => {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) => result.then(onFulfilled, onRejected),
    }
    return builder
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  mocks.auth.user = { id: 'user-a' }
  mocks.auth.loading = false
})

afterEach(() => {
  vi.useRealTimers()
})

describe('cloud loading resilience', () => {
  it('times out stalled profile and goal loads, shows an error, and never uses guest data', async () => {
    localStorage.setItem(profileStorageKey, JSON.stringify({ fullName: 'Guest Name', age: '', height: '', weight: '' }))
    localStorage.setItem(settingsStorageKey, JSON.stringify({ calories: 1800, protein: 90, carbohydrates: 200, fat: 60 }))
    configureUserDataLoads(new Promise(() => {}), new Promise(() => {}))
    renderUserData()

    await act(async () => { await vi.advanceTimersByTimeAsync(10001) })

    expect(text('error')).toContain('could not load')
    expect(text('profile')).toBe('')
    expect(text('calories')).toBe('')
    expect(screen.getByRole('button', { name: 'Retry user data' })).toBeTruthy()
  })

  it('times out stalled food loads and exposes a retry control', async () => {
    configureFoodLoad(new Promise(() => {}))
    renderFood()

    await act(async () => { await vi.advanceTimersByTimeAsync(10001) })

    expect(text('food-error')).toContain('could not load')
    expect(screen.getByRole('button', { name: 'Retry food' })).toBeTruthy()
  })

  it('retries user data after recovery and ignores duplicate retry clicks', async () => {
    const firstProfile = deferred<unknown>()
    const firstGoals = deferred<unknown>()
    configureUserDataLoads(firstProfile.promise, firstGoals.promise)
    renderUserData()
    await act(async () => { await vi.advanceTimersByTimeAsync(10001) })

    const recoveredProfile = deferred<unknown>()
    const recoveredGoals = deferred<unknown>()
    configureUserDataLoads(recoveredProfile.promise, recoveredGoals.promise)
    const retry = screen.getByRole('button', { name: 'Retry user data' })
    fireEvent.click(retry)
    fireEvent.click(retry)
    expect(mocks.supabase.from).toHaveBeenCalledTimes(4)

    const response = userDataResponse('User B')
    await act(async () => {
      recoveredProfile.resolve(response.profile)
      recoveredGoals.resolve(response.goals)
      await Promise.resolve()
    })
    await flush()
    expect(text('profile')).toContain('User B')
  })

  it('retries food data after recovery without duplicate requests', async () => {
    const initial = deferred<unknown>()
    configureFoodLoad(initial.promise)
    renderFood()
    await act(async () => { await vi.advanceTimersByTimeAsync(10001) })

    const recovered = deferred<unknown>()
    configureFoodLoad(recovered.promise)
    const retry = screen.getByRole('button', { name: 'Retry food' })
    fireEvent.click(retry)
    fireEvent.click(retry)
    expect(mocks.supabase.from).toHaveBeenCalledTimes(2)

    await act(async () => {
      recovered.resolve({ data: [{ id: 'food-1', date: '2026-10-21', food_name: 'Recovered meal', meal_category: 'Lunch', serving_size: 1, serving_unit: 'servings', calories: 500, protein: null, carbohydrates: null, fat: null }], error: null })
      await Promise.resolve()
    })
    await flush()
    expect(text('food-name')).toContain('Recovered meal')
  })
})

describe('account and storage isolation', () => {
  it('does not apply a profile save that completes after logout', async () => {
    const loaded = userDataResponse('Cloud A')
    configureUserDataLoads(Promise.resolve(loaded.profile), Promise.resolve(loaded.goals))
    const save = deferred<unknown>()
    mocks.supabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const builder: any = chain(Promise.resolve(loaded.profile))
        builder.upsert = vi.fn(() => save.promise)
        return builder
      }
      return chain(Promise.resolve(loaded.goals))
    })
    const view = renderUserData()
    await flush()
    expect(text('profile')).toContain('Cloud A')

    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))
    mocks.auth.user = null
    view.rerender(<UserDataProvider><UserDataProbe /></UserDataProvider>)
    await act(async () => { save.resolve({ data: null, error: null }); await Promise.resolve() })

    expect(text('profile')).not.toContain('Saved A')
  })

  it('does not show account A data after switching to account B', async () => {
    const save = deferred<unknown>()
    let loadNumber = 0
    mocks.supabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        loadNumber += 1
        const name = loadNumber === 1 ? 'Cloud A' : 'Cloud B'
        const builder: any = chain(Promise.resolve({ data: { full_name: name, age: null, height_cm: null, weight_kg: null }, error: null }))
        builder.upsert = vi.fn(() => save.promise)
        return builder
      }
      return chain(Promise.resolve({ data: { calories: 2200, protein: 128, carbohydrates: 310, fat: 76 }, error: null }))
    })
    const view = renderUserData()
    await flush()
    expect(text('profile')).toContain('Cloud A')
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    mocks.auth.user = { id: 'user-b' }
    view.rerender(<UserDataProvider><UserDataProbe /></UserDataProvider>)
    await flush()
    expect(text('profile')).toContain('Cloud B')
    await act(async () => { save.resolve({ data: null, error: null }); await Promise.resolve() })

    expect(text('profile')).toContain('Cloud B')
    expect(text('profile')).not.toContain('Saved A')
  })

  it('keeps authenticated food data separate from guest localStorage data', async () => {
    localStorage.setItem(foodEntriesStorageKey, JSON.stringify([{ id: 'guest-1', date: '2026-10-21', foodName: 'Guest meal', mealCategory: 'Breakfast', servingSize: 1, servingUnit: 'servings', calories: 100, protein: null, carbohydrates: null, fat: null }]))
    configureFoodLoad(Promise.resolve({ data: [{ id: 'cloud-1', date: '2026-10-21', food_name: 'Cloud meal', meal_category: 'Lunch', serving_size: 1, serving_unit: 'servings', calories: 500, protein: null, carbohydrates: null, fat: null }], error: null }))
    renderFood()

    await flush()
    expect(text('food-name')).toContain('Cloud meal')
    expect(text('food-name')).not.toContain('Guest meal')
  })
})
