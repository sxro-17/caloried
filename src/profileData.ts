import { useEffect, useState } from 'react'
import { isValidProfileData } from './dataValidation'

export type ProfileData = { fullName: string; age: string; height: string; weight: string }

export const profileStorageKey = 'caloried-profile-v1'
const profileUpdatedEvent = 'caloried-profile-updated'
export const defaultProfile: ProfileData = { fullName: 'User', age: '', height: '', weight: '' }

export function loadProfile(): ProfileData {
  try {
    const storedProfile = localStorage.getItem(profileStorageKey)
    if (!storedProfile) return defaultProfile
    const parsedProfile: unknown = JSON.parse(storedProfile)
    return isValidProfileData(parsedProfile) ? { ...parsedProfile, fullName: parsedProfile.fullName.trim() } : defaultProfile
  } catch { return defaultProfile }
}

export function saveProfile(profile: ProfileData) {
  if (!isValidProfileData(profile)) return false
  try {
    localStorage.setItem(profileStorageKey, JSON.stringify(profile))
    window.dispatchEvent(new Event(profileUpdatedEvent))
    return true
  } catch { return false }
}

export function useProfile() {
  const [profile, setProfile] = useState<ProfileData>(loadProfile)
  useEffect(() => {
    const syncProfile = () => setProfile(loadProfile())
    window.addEventListener('storage', syncProfile)
    window.addEventListener(profileUpdatedEvent, syncProfile)
    return () => { window.removeEventListener('storage', syncProfile); window.removeEventListener(profileUpdatedEvent, syncProfile) }
  }, [])
  return [profile, setProfile] as const
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('')
}
