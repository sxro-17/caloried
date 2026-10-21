import { createContext, useContext } from 'react'
import type { ProfileData } from './profileData'
import type { NutritionGoals } from './settingsData'

export type UserDataContextValue = {
  profile: ProfileData | null
  nutritionGoals: NutritionGoals | null
  loading: boolean
  error: string
  profileSaving: boolean
  goalsSaving: boolean
  saveProfile: (profile: ProfileData) => Promise<boolean>
  saveNutritionGoals: (goals: NutritionGoals) => Promise<boolean>
  retryUserData: () => void
}

export const UserDataContext = createContext<UserDataContextValue | undefined>(undefined)

export function useUserData() {
  const context = useContext(UserDataContext)
  if (!context) throw new Error('useUserData must be used within UserDataProvider')
  return context
}
