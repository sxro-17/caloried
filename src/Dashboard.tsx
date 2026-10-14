import './Dashboard.css'
import DashboardSidebar from './DashboardSidebar'
import { calculateMealCalories, calculateNutritionTotals, dateKey, getEntriesForDate, mealCategories, type MealCategory } from './foodData'
import { FoodEntriesStatus } from './FoodEntriesStatus'
import { useFoodEntries } from './FoodEntriesProvider'
import { getInitials } from './profileData'
import { useUserData } from './UserDataProvider'

function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1) }
function formatMacro(value: number | null, completeness: 'empty' | 'complete' | 'partial') { return completeness === 'partial' ? '—' : `${formatNumber(value ?? 0)}g` }
function macroProgress(value: number | null, completeness: 'empty' | 'complete' | 'partial', goal: number) { return completeness === 'complete' && value !== null ? Math.min((value / goal) * 100, 100) : 0 }
const dashboardToday = new Date()
const dashboardCurrentDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(dashboardToday)
const dashboardGreeting = dashboardToday.getHours() < 12 ? 'Good morning' : dashboardToday.getHours() < 18 ? 'Good afternoon' : 'Good evening'

function Dashboard() {
  const { entries, loading: foodLoading, error: foodError } = useFoodEntries()
  const { profile, nutritionGoals: goals, loading: userDataLoading, error: userDataError } = useUserData()
  if (userDataLoading || !profile || !goals || userDataError) return <div className="dashboard-shell"><DashboardSidebar active="dashboard" /><main className="dashboard-main">{userDataLoading && <p role="status">Loading your profile and nutrition goals…</p>}{userDataError && <p className="storage-warning" role="alert">{userDataError}</p>}{!userDataLoading && !userDataError && (!profile || !goals) && <p className="storage-warning" role="alert">Your account data is unavailable. Please refresh and try again.</p>}</main></div>
  const displayName = profile.fullName.trim() || 'User'
  const todayEntries = getEntriesForDate(entries, dateKey(dashboardToday))
  const dailyTotals = calculateNutritionTotals(todayEntries)
  const caloriesRemaining = Math.max(goals.calories - dailyTotals.calories, 0)
  const calorieProgress = Math.min((dailyTotals.calories / goals.calories) * 100, 100)
  const macroProgressValues = { protein: macroProgress(dailyTotals.protein, dailyTotals.macroCompleteness.protein, goals.protein), carbohydrates: macroProgress(dailyTotals.carbohydrates, dailyTotals.macroCompleteness.carbohydrates, goals.carbohydrates), fat: macroProgress(dailyTotals.fat, dailyTotals.macroCompleteness.fat, goals.fat) }

  function mealDetail(mealCategory: MealCategory) {
    const count = todayEntries.filter((entry) => entry.mealCategory === mealCategory).length
    return count === 0 ? 'No foods logged yet.' : `${count} ${count === 1 ? 'item' : 'items'} logged today`
  }

  return (
    <div className="dashboard-shell">
      <DashboardSidebar active="dashboard" />
      <main className="dashboard-main">
        <header className="dashboard-header"><div><p className="dashboard-kicker">Your daily overview</p><h1>{dashboardGreeting}, {displayName}<span>!</span></h1><p className="dashboard-date">{dashboardCurrentDate}</p></div><div className="header-avatar">{getInitials(displayName)}</div></header>

        <FoodEntriesStatus loading={foodLoading} error={foodError} />
        {!foodLoading && !foodError && <>
        <section className="summary-grid" aria-label="Daily nutrition summary">
          <article className="summary-card calories-card"><div className="card-heading"><span>Daily Calories</span><span className="card-menu">•••</span></div><div className="calories-content"><div className="calorie-ring" style={{ background: `conic-gradient(var(--dashboard-deep) ${calorieProgress}%, #e9efeb 0)` }}><div className="calorie-ring-inner"><strong>{formatNumber(dailyTotals.calories)}</strong><span>of {goals.calories.toLocaleString()} kcal</span></div></div><div className="calories-copy"><strong>{formatNumber(caloriesRemaining)}</strong><span>calories remaining</span></div></div><div className="progress-track"><span style={{ width: `${calorieProgress}%` }} /></div></article>
          <article className="summary-card goal-card"><div className="card-heading"><span>Daily Goal</span><span className="goal-check">✓</span></div><strong className="goal-number">{formatNumber(caloriesRemaining)}</strong><span className="goal-label">calories remaining</span><p>{todayEntries.length === 0 ? 'No foods logged today.' : 'You’re doing great today.'}<br />{todayEntries.length === 0 ? 'Add a meal to get started.' : 'Keep it up!'}</p></article>
        </section>

        <section className="macros-section"><div className="section-title-row"><div><p className="dashboard-kicker">Your nutrition breakdown</p><h2>Macros</h2></div><span className="date-button">Today</span></div><div className="macro-grid">
          <article className="macro-card"><div className="macro-top"><span className="macro-dot protein" /><span>Protein</span><strong>{formatMacro(dailyTotals.protein, dailyTotals.macroCompleteness.protein)}</strong></div><div className="progress-track"><span className="protein-fill" style={{ width: `${macroProgressValues.protein}%` }} /></div><small>{dailyTotals.macroCompleteness.protein === 'partial' ? 'Incomplete data' : `of ${goals.protein}g goal`}</small></article>
          <article className="macro-card"><div className="macro-top"><span className="macro-dot carbs" /><span>Carbs</span><strong>{formatMacro(dailyTotals.carbohydrates, dailyTotals.macroCompleteness.carbohydrates)}</strong></div><div className="progress-track"><span className="carbs-fill" style={{ width: `${macroProgressValues.carbohydrates}%` }} /></div><small>{dailyTotals.macroCompleteness.carbohydrates === 'partial' ? 'Incomplete data' : `of ${goals.carbohydrates}g goal`}</small></article>
          <article className="macro-card"><div className="macro-top"><span className="macro-dot fats" /><span>Fats</span><strong>{formatMacro(dailyTotals.fat, dailyTotals.macroCompleteness.fat)}</strong></div><div className="progress-track"><span className="fats-fill" style={{ width: `${macroProgressValues.fat}%` }} /></div><small>{dailyTotals.macroCompleteness.fat === 'partial' ? 'Incomplete data' : `of ${goals.fat}g goal`}</small></article>
        </div></section>

        <section className="meals-section"><div className="section-title-row"><div><p className="dashboard-kicker">Keep track of your day</p><h2>Today’s Meals</h2></div><a className="add-food-button" href="/food-log">+ Add Food</a></div><div className="meal-list">{mealCategories.map((mealCategory) => <a className={`meal-row ${mealCategory.toLowerCase()}`} href={`/food-log?meal=${encodeURIComponent(mealCategory)}`} key={mealCategory}><div className="meal-icon" /><div className="meal-copy"><strong>{mealCategory}</strong><span>{mealDetail(mealCategory)}</span></div><span className="meal-calories">{formatNumber(calculateMealCalories(todayEntries, mealCategory))} kcal</span><span className="meal-arrow" aria-hidden="true">→</span></a>)}</div></section>
        </>}
      </main>
    </div>
  )
}

export default Dashboard
