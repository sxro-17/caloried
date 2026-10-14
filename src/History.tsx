import './History.css'
import DashboardSidebar from './DashboardSidebar'
import { calculateNutritionTotals, dateKey, getEntriesForDate } from './foodData'
import { FoodEntriesStatus } from './FoodEntriesStatus'
import { useFoodEntries } from './FoodEntriesProvider'
import { useUserData } from './UserDataProvider'

type DayRecord = { key: string; date: Date; calories: number; hasEntries: boolean }

function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1) }
function formatDay(date: Date) { return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date) }
function formatRecordDate(date: Date) { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date) }

function getLastSevenDays(entries: ReturnType<typeof useFoodEntries>['entries']): DayRecord[] {
  const today = new Date()
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setHours(0, 0, 0, 0)
    date.setDate(today.getDate() - (6 - index))
    const dayEntries = getEntriesForDate(entries, dateKey(date))
    return { key: dateKey(date), date, calories: calculateNutritionTotals(dayEntries).calories, hasEntries: dayEntries.length > 0 }
  })
}

function History() {
  const { entries, loading: foodLoading, error: foodError } = useFoodEntries()
  const { nutritionGoals: goals, loading: userDataLoading, error: userDataError } = useUserData()
  if (userDataLoading || !goals || userDataError) return <div className="dashboard-shell history-shell"><DashboardSidebar active="history" /><main className="dashboard-main history-main">{userDataLoading && <p role="status">Loading your nutrition goals…</p>}{userDataError && <p className="storage-warning" role="alert">{userDataError}</p>}{!userDataLoading && !userDataError && !goals && <p className="storage-warning" role="alert">Your nutrition goals are unavailable. Please refresh and try again.</p>}</main></div>
  const days = getLastSevenDays(entries)
  const chartMax = Math.max(goals.calories, ...days.map((day) => day.calories))
  const todayKey = days[days.length - 1]?.key

  return (
    <div className="dashboard-shell history-shell">
      <DashboardSidebar active="history" />
      <main className="dashboard-main history-main">
        <header className="history-header"><div><p className="dashboard-kicker">Look back at your progress</p><h1>History</h1><p className="history-description">See how your daily calorie intake has changed over the last seven days.</p></div></header>

        <FoodEntriesStatus loading={foodLoading} error={foodError} />
        {!foodLoading && !foodError && <>
        <section className="history-chart-card" aria-labelledby="calorie-history-title">
          <div className="history-section-heading"><div><p className="dashboard-kicker">Last 7 days</p><h2 id="calorie-history-title">Calorie History</h2></div><span className="history-goal-label">Goal: {goals.calories.toLocaleString()} kcal</span></div>
          <div className="history-chart" role="img" aria-label="Bar chart showing calorie intake for the last seven days">
            <div className="history-chart-goal" aria-hidden="true" />
            <div className="history-bars">{days.map((day) => <div className={`history-bar-column ${day.hasEntries ? 'has-entries' : 'empty-day'}`} key={day.key}><span className="history-bar-value">{formatNumber(day.calories)}</span><div className="history-bar-track"><div className="history-bar" style={{ height: day.calories === 0 ? '0%' : `${Math.max((day.calories / chartMax) * 100, 5)}%` }} /></div><span className="history-bar-date">{formatDay(day.date)}<small>{day.date.getMonth() + 1}/{day.date.getDate()}</small></span></div>)}</div>
          </div>
          <p className="history-chart-note"><span className="history-legend-dot" /> Days with food logged <span className="history-legend-empty" /> No entries</p>
        </section>

        <section className="daily-records-section" aria-labelledby="daily-records-title"><div className="history-section-heading"><div><p className="dashboard-kicker">Your daily overview</p><h2 id="daily-records-title">Daily Records</h2></div></div><div className="daily-records-list">{days.slice().reverse().map((day) => <a className={`daily-record ${day.hasEntries ? '' : 'empty-record'}`} href={`/food-log?date=${day.key}`} key={day.key}><div className="daily-record-date"><strong>{formatRecordDate(day.date)}</strong><span>{day.key === todayKey ? 'Today' : formatDay(day.date)}</span></div><div className="daily-record-calories"><strong>{formatNumber(day.calories)} <small>kcal</small></strong><span>{day.hasEntries ? 'Food logged' : 'No food logged'}</span></div><div className="daily-record-goal"><span>Daily goal</span><strong>{goals.calories.toLocaleString()} kcal</strong></div><span className="daily-record-arrow" aria-hidden="true">→</span></a>)}</div></section>
        </>}
      </main>
    </div>
  )
}

export default History
