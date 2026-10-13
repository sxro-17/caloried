import './Dashboard.css'
import DashboardSidebar from './DashboardSidebar'
import { calculateMealCalories, calculateNutritionTotals, dateKey, getEntriesForDate, mealCategories, useFoodEntries, type MealCategory } from './foodData'
import { getInitials, useProfile } from './profileData'
import { useNutritionGoals } from './settingsData'

function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1) }
const dashboardToday = new Date()
const dashboardCurrentDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(dashboardToday)
const dashboardGreeting = dashboardToday.getHours() < 12 ? 'Good morning' : dashboardToday.getHours() < 18 ? 'Good afternoon' : 'Good evening'

function Dashboard() {
  const [entries] = useFoodEntries()
  const [profile] = useProfile()
  const [goals] = useNutritionGoals()
  const displayName = profile.fullName.trim() || 'User'
  const todayEntries = getEntriesForDate(entries, dateKey(dashboardToday))
  const dailyTotals = calculateNutritionTotals(todayEntries)
  const caloriesRemaining = Math.max(goals.calories - dailyTotals.calories, 0)
  const calorieProgress = Math.min((dailyTotals.calories / goals.calories) * 100, 100)
  const macroProgress = { protein: Math.min((dailyTotals.protein / goals.protein) * 100, 100), carbohydrates: Math.min((dailyTotals.carbohydrates / goals.carbohydrates) * 100, 100), fat: Math.min((dailyTotals.fat / goals.fat) * 100, 100) }

  function mealDetail(mealCategory: MealCategory) {
    const count = todayEntries.filter((entry) => entry.mealCategory === mealCategory).length
    return count === 0 ? 'No foods logged yet.' : `${count} ${count === 1 ? 'item' : 'items'} logged today`
  }

  return (
    <div className="dashboard-shell">
      <DashboardSidebar active="dashboard" />
      <main className="dashboard-main">
        <header className="dashboard-header"><div><p className="dashboard-kicker">Your daily overview</p><h1>{dashboardGreeting}, {displayName}<span>!</span></h1><p className="dashboard-date">{dashboardCurrentDate}</p></div><div className="header-avatar">{getInitials(displayName)}</div></header>

        <section className="summary-grid" aria-label="Daily nutrition summary">
          <article className="summary-card calories-card"><div className="card-heading"><span>Daily Calories</span><span className="card-menu">•••</span></div><div className="calories-content"><div className="calorie-ring" style={{ background: `conic-gradient(var(--dashboard-deep) ${calorieProgress}%, #e9efeb 0)` }}><div className="calorie-ring-inner"><strong>{formatNumber(dailyTotals.calories)}</strong><span>of {goals.calories.toLocaleString()} kcal</span></div></div><div className="calories-copy"><strong>{formatNumber(caloriesRemaining)}</strong><span>calories remaining</span></div></div><div className="progress-track"><span style={{ width: `${calorieProgress}%` }} /></div></article>
          <article className="summary-card goal-card"><div className="card-heading"><span>Daily Goal</span><span className="goal-check">✓</span></div><strong className="goal-number">{formatNumber(caloriesRemaining)}</strong><span className="goal-label">calories remaining</span><p>{todayEntries.length === 0 ? 'No foods logged today.' : 'You’re doing great today.'}<br />{todayEntries.length === 0 ? 'Add a meal to get started.' : 'Keep it up!'}</p></article>
        </section>

        <section className="macros-section"><div className="section-title-row"><div><p className="dashboard-kicker">Your nutrition breakdown</p><h2>Macros</h2></div><span className="date-button">Today</span></div><div className="macro-grid">
          <article className="macro-card"><div className="macro-top"><span className="macro-dot protein" /><span>Protein</span><strong>{formatNumber(dailyTotals.protein)}g</strong></div><div className="progress-track"><span className="protein-fill" style={{ width: `${macroProgress.protein}%` }} /></div><small>of {goals.protein}g goal</small></article>
          <article className="macro-card"><div className="macro-top"><span className="macro-dot carbs" /><span>Carbs</span><strong>{formatNumber(dailyTotals.carbohydrates)}g</strong></div><div className="progress-track"><span className="carbs-fill" style={{ width: `${macroProgress.carbohydrates}%` }} /></div><small>of {goals.carbohydrates}g goal</small></article>
          <article className="macro-card"><div className="macro-top"><span className="macro-dot fats" /><span>Fats</span><strong>{formatNumber(dailyTotals.fat)}g</strong></div><div className="progress-track"><span className="fats-fill" style={{ width: `${macroProgress.fat}%` }} /></div><small>of {goals.fat}g goal</small></article>
        </div></section>

        <section className="meals-section"><div className="section-title-row"><div><p className="dashboard-kicker">Keep track of your day</p><h2>Today’s Meals</h2></div><a className="add-food-button" href="/food-log">+ Add Food</a></div><div className="meal-list">{mealCategories.map((mealCategory) => <a className={`meal-row ${mealCategory.toLowerCase()}`} href={`/food-log?meal=${encodeURIComponent(mealCategory)}`} key={mealCategory}><div className="meal-icon" /><div className="meal-copy"><strong>{mealCategory}</strong><span>{mealDetail(mealCategory)}</span></div><span className="meal-calories">{formatNumber(calculateMealCalories(todayEntries, mealCategory))} kcal</span><span className="meal-arrow" aria-hidden="true">→</span></a>)}</div></section>
      </main>
    </div>
  )
}

export default Dashboard
