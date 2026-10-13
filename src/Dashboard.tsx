import { useState } from 'react'
import './Dashboard.css'
import DashboardSidebar from './DashboardSidebar'

const meals = [
  { name: 'Breakfast', detail: 'Oatmeal, berries & coffee', calories: '420 kcal', className: 'breakfast' },
  { name: 'Lunch', detail: 'Grilled chicken salad', calories: '560 kcal', className: 'lunch' },
  { name: 'Dinner', detail: 'Salmon, rice & vegetables', calories: '680 kcal', className: 'dinner' },
  { name: 'Snacks', detail: 'Greek yogurt & almonds', calories: '182 kcal', className: 'snacks' },
]

function Dashboard() {
  const [currentDate] = useState(() => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()))

  return (
    <div className="dashboard-shell">
      <DashboardSidebar active="dashboard" />
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div><p className="dashboard-kicker">Your daily overview</p><h1>Good morning, Sittie<span>!</span></h1><p className="dashboard-date">{currentDate}</p></div>
          <div className="header-avatar">SM</div>
        </header>

        <section className="summary-grid" aria-label="Daily nutrition summary">
          <article className="summary-card calories-card"><div className="card-heading"><span>Daily Calories</span><span className="card-menu">•••</span></div><div className="calories-content"><div className="calorie-ring"><strong>1,842</strong><span>of 2,200 kcal</span></div><div className="calories-copy"><strong>358</strong><span>calories remaining</span></div></div><div className="progress-track"><span style={{ width: '84%' }} /></div></article>
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
