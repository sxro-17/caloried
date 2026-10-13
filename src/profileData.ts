import { useEffect, useState } from 'react'

export type ProfileData = { fullName: string; age: string; height: string; weight: string }

export const profileStorageKey = 'caloried-profile-v1'
const profileUpdatedEvent = 'caloried-profile-updated'
export const defaultProfile: ProfileData = { fullName: 'Sittie Macabago', age: '', height: '', weight: '' }

function isProfileData(value: unknown): value is ProfileData {
  if (!value || typeof value !== 'object') return false
  const profile = value as Partial<ProfileData>
  return typeof profile.fullName === 'string' && typeof profile.age === 'string' && typeof profile.height === 'string' && typeof profile.weight === 'string'
}

export function loadProfile(): ProfileData {
  try {
    const storedProfile = localStorage.getItem(profileStorageKey)
    if (!storedProfile) return defaultProfile
    const parsedProfile: unknown = JSON.parse(storedProfile)
    return isProfileData(parsedProfile) ? parsedProfile : defaultProfile
  } catch { return defaultProfile }
}

export function saveProfile(profile: ProfileData) {
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
  if (parts.length === 0) return 'CM'
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('')
}
