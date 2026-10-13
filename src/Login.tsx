import { useEffect, useState, type FormEvent } from 'react'
import AuthLayout from './auth/AuthLayout'
import { useAuth } from './auth/useAuth'
import './Auth.css'

function Login() {
  const { user, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (!loading && user) window.location.assign('/dashboard') }, [loading, user])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email address.'); return }
    if (!password) { setError('Enter your password.'); return }
    setSubmitting(true)
    const result = await signIn(email.trim(), password)
    setSubmitting(false)
    if (result.error) setError(result.error)
    else window.location.assign('/dashboard')
  }

  return <AuthLayout eyebrow="Welcome back" title="Log in" description="Sign in to your Calorie’d account. You can still use the app as a guest."><form className="auth-form" onSubmit={handleSubmit} noValidate><div className="auth-field"><label htmlFor="login-email">Email</label><input id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(error)} /></div><div className="auth-field"><label htmlFor="login-password">Password</label><input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(error)} /></div>{error && <p className="auth-error" role="alert">{error}</p>}<button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Log in'}</button><a className="auth-secondary-link" href="/forgot-password">Forgot your password?</a></form><p className="auth-switch">New to Calorie’d? <a href="/signup">Create an account</a></p></AuthLayout>
}

export default Login
