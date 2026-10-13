import type { ReactNode } from 'react'
import logoSrc from '../assets/caloried-logo.svg'

function AuthLayout({ title, eyebrow, description, children }: { title: string; eyebrow: string; description: string; children: ReactNode }) {
  return (
    <main className="auth-page">
      <a className="auth-logo" href="/" aria-label="Back to Calorie’d home"><img src={logoSrc} alt="Calorie’d" /></a>
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="auth-eyebrow">{eyebrow}</p>
        <h1 id="auth-title">{title}</h1>
        <p className="auth-description">{description}</p>
        {children}
      </section>
      <p className="auth-note">Your food entries remain stored in this browser until cloud synchronization is added.</p>
    </main>
  )
}

export default AuthLayout
