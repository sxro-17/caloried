-- Add an idempotent source identity for optional guest-data imports.
-- Existing food entries remain unchanged, including nullable macro values.

alter table public.food_entries
  add column if not exists source_import_id text;

create unique index if not exists food_entries_user_source_import_id_idx
  on public.food_entries (user_id, source_import_id)
  where source_import_id is not null;
