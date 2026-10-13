import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export type AuthResult = { error: string | null }
export type SignUpResult = AuthResult & { confirmationRequired: boolean }

export type AuthContextValue = {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string) => Promise<SignUpResult>
  signOut: () => Promise<AuthResult>
  resetPassword: (email: string) => Promise<AuthResult>
  updatePassword: (password: string) => Promise<AuthResult>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
