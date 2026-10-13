export function FoodEntriesStatus({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <p className="food-data-status" role="status">Loading your food entries…</p>
  if (error) return <p className="food-data-status food-data-error" role="alert">{error}</p>
  return null
}
