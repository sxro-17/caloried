import { lazy, Suspense, useEffect, useState } from 'react'
import './App.css'
import logoSrc from './assets/caloried-logo.svg'
import cookieSrc from './assets/cookie-bite.svg'
import { AuthProvider } from './auth/AuthProvider'
import { UserDataProvider } from './UserDataProvider'
import { FoodEntriesProvider } from './FoodEntriesProvider'
import { GuestDataImportProvider } from './GuestDataImportProvider'

const Dashboard = lazy(() => import('./Dashboard'))
const FoodLog = lazy(() => import('./FoodLog'))
const History = lazy(() => import('./History'))
const Profile = lazy(() => import('./Profile'))
const Settings = lazy(() => import('./Settings'))
const Help = lazy(() => import('./Help'))
const Login = lazy(() => import('./Login'))
const Signup = lazy(() => import('./Signup'))
const ForgotPassword = lazy(() => import('./ForgotPassword'))
const UpdatePassword = lazy(() => import('./UpdatePassword'))

const features = [
  { title: 'Track Calories', description: 'Keep track of your daily calorie intake and stay on top of your goals.' },
  { title: 'Track Macros', description: 'Monitor your protein, carbohydrates, and fats for a balanced diet.' },
  { title: 'Meal History', description: 'Review your meals and understand your eating habits over time.' },
  { title: 'Daily Goals', description: 'Set personalized goals and make every day a step toward a healthier you.' },
]

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  useEffect(() => {
    if (!mobileMenuOpen) return
    function closeOnEscape(event: KeyboardEvent) { if (event.key === 'Escape') setMobileMenuOpen(false) }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [mobileMenuOpen])
  function closeMobileMenu() { setMobileMenuOpen(false) }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="header-logo" href="#home" aria-label="Calorie’d home"><img src={logoSrc} alt="Calorie’d" /></a>
        <nav className={`main-nav ${mobileMenuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          <button className="mobile-menu-toggle" type="button" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen} aria-controls="landing-navigation" onClick={() => setMobileMenuOpen((open) => !open)}><span /><span /><span /></button>
          <div className="landing-navigation-links" id="landing-navigation">
          <a onClick={closeMobileMenu} className="active" href="#home">Home</a>
          <a onClick={closeMobileMenu} href="#features">Features</a>
          <a onClick={closeMobileMenu} href="#about">About</a>
          <a onClick={closeMobileMenu} className="auth-nav-link" href="/login">Log in</a>
          <a onClick={closeMobileMenu} className="auth-nav-link" href="/signup">Sign up</a>
          <a onClick={closeMobileMenu} className="nav-cta" href="/dashboard">Get Started</a>
          </div>
        </nav>
      </header>

      <main>
        <section className="hero-section" id="home">
          <div className="hero-copy">
            <p className="eyebrow">A simpler way to eat well</p>
            <h1>make every bite <em>calculated.</em></h1>
            <p className="hero-description">Calorie’d makes keeping track of your food feel clear, calm, and completely yours.</p>
            <a className="button button-dark" href="/dashboard">Get Started <span aria-hidden="true">↗</span></a>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="hero-circle" />
            <div className="stats-card stats-card-back" />
            <div className="stats-card stats-card-front">
              <span className="card-label">today’s intake</span>
              <strong>1,842</strong>
              <span className="card-unit">calories</span>
              <div className="card-progress"><span /></div>
              <div className="card-macros"><span>protein <b>92g</b></span><span>carbs <b>211g</b></span></div>
            </div>
            <img className="cookie cookie-hero-large" src={cookieSrc} alt="" />
            <img className="cookie cookie-hero-small" src={cookieSrc} alt="" />
          </div>
        </section>

        <section className="features-section" id="features">
          <img className="cookie cookie-features-left" src={cookieSrc} alt="" aria-hidden="true" />
          <img className="cookie cookie-features-right" src={cookieSrc} alt="" aria-hidden="true" />
          <div className="section-heading">
            <p className="eyebrow">Everything in one place</p>
            <h2>Small choices.<br /><em>Big difference.</em></h2>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span className="feature-arrow" aria-hidden="true">↗</span>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="about-art" aria-hidden="true">
            <img className="cookie cookie-about-main" src={cookieSrc} alt="" />
            <img className="cookie cookie-about-small" src={cookieSrc} alt="" />
            <span>eat<br /><em>well.</em></span>
          </div>
          <div className="about-copy">
            <p className="eyebrow">About Calorie’d</p>
            <h2>A little more mindful.<br /><em>A lot more you.</em></h2>
            <p>Calorie’d is a simple calorie-tracking tool designed to help you understand your food, reach your goals, and build healthier habits one meal at a time.</p>
            <a className="text-link" href="#get-started">Learn more about us <span aria-hidden="true">↗</span></a>
          </div>
        </section>

        <section className="cta-section" id="get-started">
          <img className="cookie cookie-cta-left" src={cookieSrc} alt="" aria-hidden="true" />
          <img className="cookie cookie-cta-right" src={cookieSrc} alt="" aria-hidden="true" />
          <p className="eyebrow">Ready when you are</p>
          <h2>Start making<br /><em>every bite count.</em></h2>
          <a className="button button-light" href="/dashboard">Get Started <span aria-hidden="true">↗</span></a>
        </section>
      </main>

      <footer className="site-footer">
        <a className="header-logo" href="#home"><img src={logoSrc} alt="Calorie’d" /></a>
        <p>make every bite calculated.</p>
        <span>© 2026 Calorie’d</span>
      </footer>
    </div>
  )
}

function AppRoutes() {
  const pathname = window.location.pathname
  let route = <LandingPage />
  if (pathname === '/login') route = <Login />
  else if (pathname === '/signup') route = <Signup />
  else if (pathname === '/forgot-password') route = <ForgotPassword />
  else if (pathname === '/update-password') route = <UpdatePassword />
  else if (pathname === '/dashboard') route = <Dashboard />
  else if (pathname === '/food-log') route = <FoodLog />
  else if (pathname === '/history') route = <History />
  else if (pathname === '/profile') route = <Profile />
  else if (pathname === '/settings') route = <Settings />
  else if (pathname === '/help') route = <Help />
  return <Suspense fallback={<main className="route-loading" aria-live="polite">Loading…</main>}>{route}</Suspense>
}

function App() {
  return <AuthProvider><UserDataProvider><FoodEntriesProvider><GuestDataImportProvider><AppRoutes /></GuestDataImportProvider></FoodEntriesProvider></UserDataProvider></AuthProvider>
}

export default App
