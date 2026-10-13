import { useState, type FormEvent } from 'react'
import AuthLayout from './auth/AuthLayout'
import { useAuth } from './auth/useAuth'
import './Auth.css'

function UpdatePassword() {
  const { user, loading, updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const recoveryLinkError = !loading && !user ? 'This password reset link is invalid or has expired. Request a new link to continue.' : ''

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setSubmitting(true)
    const result = await updatePassword(password)
    setSubmitting(false)
    if (result.error) setError(result.error)
    else setMessage('Your password has been updated. You can now use it to log in.')
  }

  return <AuthLayout eyebrow="Account recovery" title="Choose a new password" description="Set a new password for your Calorie’d account.">{!loading && user ? <form className="auth-form" onSubmit={handleSubmit} noValidate><div className="auth-field"><label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(error)} /></div><div className="auth-field"><label htmlFor="confirm-new-password">Confirm new password</label><input id="confirm-new-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} aria-invalid={Boolean(error)} /></div>{error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-success" role="status">{message}</p>}<button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Updating…' : 'Update password'}</button></form> : !loading && <p className="auth-error" role="alert">{recoveryLinkError}</p>}</AuthLayout>
}

export default UpdatePassword
