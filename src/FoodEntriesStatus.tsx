export function FoodEntriesStatus({ loading, error, onRetry }: { loading: boolean; error: string; onRetry?: () => void }) {
  if (loading) return <p className="food-data-status" role="status">Loading your food entries…</p>
  if (error) return <div className="food-data-status food-data-error" role="alert"><span>{error}</span>{onRetry && <button type="button" onClick={onRetry}>Try again</button>}</div>
  return null
}
