import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import { AuthContext, type AuthContextValue } from './AuthContext'

function genericAuthError(action: 'sign in' | 'sign up' | 'sign out' | 'password reset' | 'password update') {
  return `We could not complete your ${action} request. Please check your details and try again.`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
    }).catch(() => {
      if (mounted) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error ? genericAuthError('sign in') : null }
    },
    async signUp(email, password) {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard` } })
      return { error: error ? genericAuthError('sign up') : null, confirmationRequired: !error && !data.session }
    },
    async signOut() {
      const { error } = await supabase.auth.signOut()
      return { error: error ? genericAuthError('sign out') : null }
    },
    async resetPassword(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/update-password` })
      return { error: error ? genericAuthError('password reset') : null }
    },
    async updatePassword(password) {
      const { error } = await supabase.auth.updateUser({ password })
      return { error: error ? genericAuthError('password update') : null }
    },
  }), [loading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
