-- Restrict the browser Data API to the operations used by the application.
-- Profile and nutrition-goal rows are managed by the account lifecycle and
-- must not be deleted directly by an authenticated client.
--
-- This is intentionally incremental. The original schema migration remains
-- unchanged, and public.food_entries retains authenticated DELETE access.

revoke delete on table public.profiles from anon, authenticated;
revoke delete on table public.nutrition_goals from anon, authenticated;

drop policy if exists profiles_delete_own on public.profiles;
drop policy if exists nutrition_goals_delete_own on public.nutrition_goals;
