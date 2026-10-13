import { useState } from 'react'
import './FoodLog.css'
import DashboardSidebar from './DashboardSidebar'

type FoodItem = { name: string; serving: string; calories: number }
type Meal = { name: string; total: number; className: string; items: FoodItem[] }

const meals: Meal[] = [
  { name: 'Breakfast', total: 420, className: 'breakfast', items: [{ name: 'Oatmeal with berries', serving: '1 bowl', calories: 280 }, { name: 'Coffee with milk', serving: '1 cup', calories: 140 }] },
  { name: 'Lunch', total: 560, className: 'lunch', items: [{ name: 'Grilled chicken salad', serving: '1 serving', calories: 410 }, { name: 'Whole wheat bread', serving: '2 slices', calories: 150 }] },
  { name: 'Dinner', total: 680, className: 'dinner', items: [{ name: 'Baked salmon', serving: '1 fillet', calories: 390 }, { name: 'Rice and vegetables', serving: '1 plate', calories: 290 }] },
  { name: 'Snacks', total: 182, className: 'snacks', items: [{ name: 'Greek yogurt', serving: '1 cup', calories: 120 }, { name: 'Almonds', serving: '12 pieces', calories: 62 }] },
]

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date)
}

function FoodLog() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  function shiftDate(days: number) {
    setSelectedDate((date) => {
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + days)
      return nextDate
    })
  }

  return (
    <div className="dashboard-shell food-log-shell">
      <DashboardSidebar active="food" />
      <main className="dashboard-main food-log-main">
        <header className="food-log-header">
          <div><p className="dashboard-kicker">Your meals, at a glance</p><h1>Food Log</h1><p className="food-log-description">Keep a simple record of what you eat throughout the day.</p></div>
          <div className="food-log-date-controls"><button type="button" onClick={() => shiftDate(-1)}>← <span>Previous</span></button><strong>{formatDate(selectedDate)}</strong><button type="button" onClick={() => shiftDate(1)}><span>Next</span> →</button></div>
        </header>

        <section className="food-summary-card" aria-label="Daily summary">
          <div className="food-summary-heading"><div><p className="dashboard-kicker">Daily Summary</p><strong>1,842 <small>of 2,200 kcal</small></strong></div><span className="summary-remaining">358 kcal remaining</span></div>
          <div className="food-summary-progress"><span /></div>
          <div className="food-summary-macros"><div><span className="summary-dot protein" />Protein <strong>92g</strong></div><div><span className="summary-dot carbs" />Carbs <strong>211g</strong></div><div><span className="summary-dot fats" />Fats <strong>58g</strong></div></div>
        </section>

        <section className="food-meals-section"><div className="food-meals-heading"><div><p className="dashboard-kicker">Your day</p><h2>Meals</h2></div></div><div className="food-meals-grid">{meals.map((meal) => <article className={`food-meal-card ${meal.className}`} key={meal.name}><header><div><h3>{meal.name}</h3><span>{meal.items.length} items</span></div><strong>{meal.total} kcal</strong></header><div className="food-table-heading"><span>Food name</span><span>Serving</span><span>Calories</span></div><div className="food-items">{meal.items.map((item) => <div className="food-item" key={item.name}><span>{item.name}</span><span>{item.serving}</span><strong>{item.calories} kcal</strong></div>)}</div><button className="food-add-button" type="button">+ Add Food</button></article>)}</div></section>
      </main>
    </div>
  )
}

export default FoodLog
