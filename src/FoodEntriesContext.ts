import { createContext, useContext } from 'react'
import type { FoodEntry } from './foodData'

export type FoodEntriesContextValue = {
  entries: FoodEntry[]
  loading: boolean
  saving: boolean
  error: string
  addEntry: (entry: FoodEntry) => Promise<string | null>
  updateEntry: (entry: FoodEntry) => Promise<string | null>
  deleteEntry: (id: string) => Promise<string | null>
  refreshEntries: () => void
}

export const FoodEntriesContext = createContext<FoodEntriesContextValue | undefined>(undefined)

export function useFoodEntries() {
  const context = useContext(FoodEntriesContext)
  if (!context) throw new Error('useFoodEntries must be used within FoodEntriesProvider')
  return context
}
