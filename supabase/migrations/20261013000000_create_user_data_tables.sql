-- Calorie'd Version 2 user-owned data schema.
-- This migration is intended for the development Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default 'User',
  age integer,
  height_cm numeric,
  weight_kg numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_not_blank check (char_length(btrim(full_name)) between 1 and 120),
  constraint profiles_age_valid check (age is null or age between 1 and 120),
  constraint profiles_height_valid check (height_cm is null or height_cm between 50 and 250),
  constraint profiles_weight_valid check (weight_kg is null or weight_kg between 20 and 500)
);

create table if not exists public.nutrition_goals (
  user_id uuid primary key references auth.users (id) on delete cascade,
  calories numeric not null default 2200,
  protein numeric not null default 128,
  carbohydrates numeric not null default 310,
  fat numeric not null default 76,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nutrition_goals_calories_valid check (calories > 0 and calories <= 10000),
  constraint nutrition_goals_protein_valid check (protein > 0 and protein <= 1000),
  constraint nutrition_goals_carbohydrates_valid check (carbohydrates > 0 and carbohydrates <= 1000),
  constraint nutrition_goals_fat_valid check (fat > 0 and fat <= 1000)
);

create table if not exists public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  food_name text not null,
  meal_category text not null,
  serving_size numeric not null,
  serving_unit text not null,
  calories numeric not null default 0,
  protein numeric not null default 0,
  carbohydrates numeric not null default 0,
  fat numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_entries_food_name_not_blank check (char_length(btrim(food_name)) between 1 and 200),
  constraint food_entries_meal_category_valid check (meal_category in ('Breakfast', 'Lunch', 'Dinner', 'Snacks')),
  constraint food_entries_serving_size_valid check (serving_size > 0 and serving_size <= 10000),
  constraint food_entries_serving_unit_valid check (serving_unit in ('grams', 'pieces', 'cups', 'servings')),
  constraint food_entries_calories_valid check (calories >= 0 and calories <= 10000),
  constraint food_entries_protein_valid check (protein >= 0 and protein <= 1000),
  constraint food_entries_carbohydrates_valid check (carbohydrates >= 0 and carbohydrates <= 1000),
  constraint food_entries_fat_valid check (fat >= 0 and fat <= 1000)
);

create index if not exists food_entries_user_id_idx
  on public.food_entries (user_id);

create index if not exists food_entries_user_date_idx
  on public.food_entries (user_id, date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists nutrition_goals_set_updated_at on public.nutrition_goals;
create trigger nutrition_goals_set_updated_at
before update on public.nutrition_goals
for each row execute function public.set_updated_at();

drop trigger if exists food_entries_set_updated_at on public.food_entries;
create trigger food_entries_set_updated_at
before update on public.food_entries
for each row execute function public.set_updated_at();

create or replace function public.prevent_user_id_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'Changing user_id is not allowed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_user_id_change on public.profiles;
create trigger profiles_prevent_user_id_change
before update on public.profiles
for each row execute function public.prevent_user_id_change();

drop trigger if exists nutrition_goals_prevent_user_id_change on public.nutrition_goals;
create trigger nutrition_goals_prevent_user_id_change
before update on public.nutrition_goals
for each row execute function public.prevent_user_id_change();

drop trigger if exists food_entries_prevent_user_id_change on public.food_entries;
create trigger food_entries_prevent_user_id_change
before update on public.food_entries
for each row execute function public.prevent_user_id_change();

alter table public.profiles enable row level security;
alter table public.nutrition_goals enable row level security;
alter table public.food_entries enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.nutrition_goals from anon, authenticated;
revoke all on table public.food_entries from anon, authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.nutrition_goals to authenticated;
grant select, insert, update, delete on table public.food_entries to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own
on public.profiles for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists nutrition_goals_select_own on public.nutrition_goals;
create policy nutrition_goals_select_own
on public.nutrition_goals for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists nutrition_goals_insert_own on public.nutrition_goals;
create policy nutrition_goals_insert_own
on public.nutrition_goals for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists nutrition_goals_update_own on public.nutrition_goals;
create policy nutrition_goals_update_own
on public.nutrition_goals for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists nutrition_goals_delete_own on public.nutrition_goals;
create policy nutrition_goals_delete_own
on public.nutrition_goals for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists food_entries_select_own on public.food_entries;
create policy food_entries_select_own
on public.food_entries for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists food_entries_insert_own on public.food_entries;
create policy food_entries_insert_own
on public.food_entries for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists food_entries_update_own on public.food_entries;
create policy food_entries_update_own
on public.food_entries for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists food_entries_delete_own on public.food_entries;
create policy food_entries_delete_own
on public.food_entries for delete to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.nutrition_goals (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to postgres, supabase_auth_admin;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Idempotent backfill for development accounts created before this migration.
insert into public.profiles (user_id)
select users.id
from auth.users as users
where not exists (
  select 1 from public.profiles as profiles where profiles.user_id = users.id
)
on conflict (user_id) do nothing;

insert into public.nutrition_goals (user_id)
select users.id
from auth.users as users
where not exists (
  select 1 from public.nutrition_goals as goals where goals.user_id = users.id
)
on conflict (user_id) do nothing;
