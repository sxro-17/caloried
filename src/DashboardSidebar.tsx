import type { ReactNode } from 'react'
import './Dashboard.css'
import logoSrc from './assets/caloried-logo.svg'
import { getInitials, useProfile } from './profileData'

type IconName = 'dashboard' | 'food' | 'history' | 'settings' | 'help'

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    dashboard: <><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></>,
    food: <><path d="M5 4v16M8 4v6M11 4v6M8 10v10M16 4c2 2 2 5 0 7l-1 1v8" /></>,
    history: <><path d="M4 10a7 7 0 1 0 2-5" /><path d="M4 4v6h6M11 7v4l3 2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.3 1a8 8 0 0 0-1.7-1L15 3h-4l-.4 3a8 8 0 0 0-1.7 1l-2.3-1-2 3.5L6.6 11a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.3-1a8 8 0 0 0 1.7 1l.4 3h4l.4-3a8 8 0 0 0 1.7-1l2.3 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" /></>,
    help: <><circle cx="12" cy="12" r="8" /><path d="M9.5 9a2.5 2.5 0 1 1 4.3 1.8c-1 .8-1.8 1.2-1.8 2.7M12 16.5v.1" /></>,
  }

  return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function DashboardSidebar({ active }: { active: 'dashboard' | 'food' | 'history' | 'settings' | 'profile' }) {
  const [profile] = useProfile()
  const profileName = profile.fullName.trim() || 'Your Name'

  return (
    <aside className="dashboard-sidebar">
      <a className="dashboard-logo" href="/" aria-label="Back to Calorie’d home"><img src={logoSrc} alt="Calorie’d" /></a>
      <nav className="dashboard-nav" aria-label="Dashboard navigation">
        <a className={`dashboard-nav-item ${active === 'dashboard' ? 'active' : ''}`} href="/dashboard"><Icon name="dashboard" />Dashboard</a>
        <a className={`dashboard-nav-item ${active === 'food' ? 'active' : ''}`} href="/food-log"><Icon name="food" />Food Log</a>
        <a className={`dashboard-nav-item ${active === 'history' ? 'active' : ''}`} href="/history"><Icon name="history" />History</a>
        <a className={`dashboard-nav-item ${active === 'settings' ? 'active' : ''}`} href="/settings"><Icon name="settings" />Settings</a>
        <button className="dashboard-nav-item" type="button"><Icon name="help" />Help</button>
      </nav>
      <a className={`profile-card ${active === 'profile' ? 'active' : ''}`} href="/profile" aria-label="Open profile">
        <div className="profile-avatar">{getInitials(profileName)}</div>
        <div><strong>{profileName}</strong><span>Personal account</span></div>
        <span className="profile-more" aria-hidden="true">•••</span>
      </a>
    </aside>
  )
}

export default DashboardSidebar
