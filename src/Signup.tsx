import { useEffect, useState, type FormEvent } from 'react'
import AuthLayout from './auth/AuthLayout'
import { useAuth } from './auth/useAuth'
import './Auth.css'

function Signup() {
  const { user, loading, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (!loading && user) window.location.assign('/dashboard') }, [loading, user])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email address.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setSubmitting(true)
    const result = await signUp(email.trim(), password)
    setSubmitting(false)
    if (result.error) setError(result.error)
    else if (result.confirmationRequired) setMessage('Account created. Check your email to confirm your account before logging in.')
    else window.location.assign('/dashboard')
  }

  return <AuthLayout eyebrow="Start simply" title="Create an account" description="Save your account access while keeping the current guest experience available."><form className="auth-form" onSubmit={handleSubmit} noValidate><div className="auth-field"><label htmlFor="signup-email">Email</label><input id="signup-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(error)} /></div><div className="auth-field"><label htmlFor="signup-password">Password</label><input id="signup-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(error)} /><small>Use at least 6 characters. Supabase may enforce a stronger project policy.</small></div><div className="auth-field"><label htmlFor="signup-confirm-password">Confirm password</label><input id="signup-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} aria-invalid={Boolean(error)} /></div>{error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-success" role="status">{message}</p>}<button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Sign up'}</button></form><p className="auth-switch">Already have an account? <a href="/login">Log in</a></p></AuthLayout>
}

export default Signup
