import { useState, type FormEvent } from 'react'
import AuthLayout from './auth/AuthLayout'
import { useAuth } from './auth/useAuth'
import './Auth.css'

function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email address.'); return }
    setSubmitting(true)
    const result = await resetPassword(email.trim())
    setSubmitting(false)
    if (result.error) setError(result.error)
    else setMessage('If an account uses that email, you will receive a password reset link shortly.')
  }

  return <AuthLayout eyebrow="Account recovery" title="Reset your password" description="Enter your email and we’ll send instructions to reset your password."><form className="auth-form" onSubmit={handleSubmit} noValidate><div className="auth-field"><label htmlFor="reset-email">Email</label><input id="reset-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(error)} /></div>{error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-success" role="status">{message}</p>}<button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Send reset link'}</button></form><p className="auth-switch"><a href="/login">Back to log in</a></p></AuthLayout>
}

export default ForgotPassword
