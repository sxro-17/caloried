import { useState, type ReactNode } from 'react'
import './Dashboard.css'
import logoSrc from './assets/caloried-logo.svg'

type IconName = 'dashboard' | 'food' | 'history' | 'settings' | 'help'

const meals = [
  { name: 'Breakfast', detail: 'Oatmeal, berries & coffee', calories: '420 kcal', className: 'breakfast' },
  { name: 'Lunch', detail: 'Grilled chicken salad', calories: '560 kcal', className: 'lunch' },
  { name: 'Dinner', detail: 'Salmon, rice & vegetables', calories: '680 kcal', className: 'dinner' },
  { name: 'Snacks', detail: 'Greek yogurt & almonds', calories: '182 kcal', className: 'snacks' },
]

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

function Dashboard() {
  const [currentDate] = useState(() => new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date()))

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <a className="dashboard-logo" href="/" aria-label="Back to Calorie’d home"><img src={logoSrc} alt="Calorie’d" /></a>
        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          <a className="dashboard-nav-item active" href="/dashboard"><Icon name="dashboard" />Dashboard</a>
          <button className="dashboard-nav-item" type="button"><Icon name="food" />Food Log</button>
          <button className="dashboard-nav-item" type="button"><Icon name="history" />History</button>
          <button className="dashboard-nav-item" type="button"><Icon name="settings" />Settings</button>
          <button className="dashboard-nav-item" type="button"><Icon name="help" />Help</button>
        </nav>
        <div className="profile-card">
          <div className="profile-avatar">SM</div>
          <div><strong>Sittie Macabago</strong><span>Personal account</span></div>
          <span className="profile-more" aria-hidden="true">•••</span>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div><p className="dashboard-kicker">Your daily overview</p><h1>Good morning, Sittie<span>!</span></h1><p className="dashboard-date">{currentDate}</p></div>
          <div className="header-avatar">SM</div>
        </header>

        <section className="summary-grid" aria-label="Daily nutrition summary">
          <article className="summary-card calories-card">
            <div className="card-heading"><span>Daily Calories</span><span className="card-menu">•••</span></div>
            <div className="calories-content"><div className="calorie-ring"><strong>1,842</strong><span>of 2,200 kcal</span></div><div className="calories-copy"><strong>358</strong><span>calories remaining</span></div></div>
            <div className="progress-track"><span style={{ width: '84%' }} /></div>
          </article>
          <article className="summary-card goal-card"><div className="card-heading"><span>Daily Goal</span><span className="goal-check">✓</span></div><strong className="goal-number">358</strong><span className="goal-label">calories remaining</span><p>You’re doing great today.<br />Keep it up!</p></article>
        </section>

        <section className="macros-section"><div className="section-title-row"><div><p className="dashboard-kicker">Your nutrition breakdown</p><h2>Macros</h2></div><button className="date-button" type="button">Today <span>⌄</span></button></div><div className="macro-grid">
          <article className="macro-card"><div className="macro-top"><span className="macro-dot protein" /><span>Protein</span><strong>92g</strong></div><div className="progress-track"><span className="protein-fill" style={{ width: '72%' }} /></div><small>of 128g goal</small></article>
          <article className="macro-card"><div className="macro-top"><span className="macro-dot carbs" /><span>Carbs</span><strong>211g</strong></div><div className="progress-track"><span className="carbs-fill" style={{ width: '68%' }} /></div><small>of 310g goal</small></article>
          <article className="macro-card"><div className="macro-top"><span className="macro-dot fats" /><span>Fats</span><strong>58g</strong></div><div className="progress-track"><span className="fats-fill" style={{ width: '76%' }} /></div><small>of 76g goal</small></article>
        </div></section>

        <section className="meals-section"><div className="section-title-row"><div><p className="dashboard-kicker">Keep track of your day</p><h2>Today’s Meals</h2></div><button className="add-food-button" type="button"><span>+</span> Add Food</button></div><div className="meal-list">{meals.map((meal) => <article className={`meal-row ${meal.className}`} key={meal.name}><div className="meal-icon" /><div className="meal-copy"><strong>{meal.name}</strong><span>{meal.detail}</span></div><span className="meal-calories">{meal.calories}</span><span className="meal-arrow" aria-hidden="true">→</span></article>)}</div></section>
      </main>
    </div>
  )
}

export default Dashboard
