-- RLS checks for the Calorie'd user-owned data tables.
-- Run with the Supabase local test harness after the migration is applied:
--   supabase test db
-- The tests package provides the `tests.*` helper functions used below.

begin;

select plan(79);

select tests.create_supabase_user('user1@test.com');
select tests.create_supabase_user('user2@test.com');
select tests.authenticate_as_service_role();

-- Keep the test deterministic if it is rerun in the same development test database.
delete from public.food_entries
where id in (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid
);

insert into public.food_entries (
  id, user_id, date, food_name, meal_category, serving_size, serving_unit, calories
)
values
  (
    '00000000-0000-0000-0000-000000000001',
    tests.get_supabase_uid('user1@test.com'),
    date '2026-01-01', 'Test breakfast', 'Breakfast', 1, 'servings', 300
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    tests.get_supabase_uid('user2@test.com'),
    date '2026-01-01', 'Other breakfast', 'Breakfast', 1, 'servings', 400
  );

update public.profiles
set full_name = 'User Two'
where user_id = tests.get_supabase_uid('user2@test.com');

update public.nutrition_goals
set calories = 2100
where user_id = tests.get_supabase_uid('user2@test.com');

select is(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.profiles'::regclass),
  true,
  'RLS is enabled on profiles'
);
select is(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.nutrition_goals'::regclass),
  true,
  'RLS is enabled on nutrition_goals'
);
select is(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.food_entries'::regclass),
  true,
  'RLS is enabled on food_entries'
);

-- Explicit Data API grants: authenticated users retain only the operations
-- exposed by the application, and anon receives no table privileges.
select is(has_table_privilege('authenticated', 'public.profiles', 'SELECT'), true, 'Authenticated users can select profiles');
select is(has_table_privilege('authenticated', 'public.profiles', 'INSERT'), true, 'Authenticated users can insert profiles');
select is(has_table_privilege('authenticated', 'public.profiles', 'UPDATE'), true, 'Authenticated users can update profiles');
select is(has_table_privilege('authenticated', 'public.profiles', 'DELETE'), false, 'Authenticated users cannot delete profiles');
select is(has_table_privilege('authenticated', 'public.nutrition_goals', 'SELECT'), true, 'Authenticated users can select nutrition goals');
select is(has_table_privilege('authenticated', 'public.nutrition_goals', 'INSERT'), true, 'Authenticated users can insert nutrition goals');
select is(has_table_privilege('authenticated', 'public.nutrition_goals', 'UPDATE'), true, 'Authenticated users can update nutrition goals');
select is(has_table_privilege('authenticated', 'public.nutrition_goals', 'DELETE'), false, 'Authenticated users cannot delete nutrition goals');
select is(has_table_privilege('authenticated', 'public.food_entries', 'SELECT'), true, 'Authenticated users can select food entries');
select is(has_table_privilege('authenticated', 'public.food_entries', 'INSERT'), true, 'Authenticated users can insert food entries');
select is(has_table_privilege('authenticated', 'public.food_entries', 'UPDATE'), true, 'Authenticated users can update food entries');
select is(has_table_privilege('authenticated', 'public.food_entries', 'DELETE'), true, 'Authenticated users can delete food entries');

select is(has_table_privilege('anon', 'public.profiles', 'SELECT'), false, 'Anonymous users cannot select profiles');
select is(has_table_privilege('anon', 'public.profiles', 'INSERT'), false, 'Anonymous users cannot insert profiles');
select is(has_table_privilege('anon', 'public.profiles', 'UPDATE'), false, 'Anonymous users cannot update profiles');
select is(has_table_privilege('anon', 'public.profiles', 'DELETE'), false, 'Anonymous users cannot delete profiles');
select is(has_table_privilege('anon', 'public.nutrition_goals', 'SELECT'), false, 'Anonymous users cannot select nutrition goals');
select is(has_table_privilege('anon', 'public.nutrition_goals', 'INSERT'), false, 'Anonymous users cannot insert nutrition goals');
select is(has_table_privilege('anon', 'public.nutrition_goals', 'UPDATE'), false, 'Anonymous users cannot update nutrition goals');
select is(has_table_privilege('anon', 'public.nutrition_goals', 'DELETE'), false, 'Anonymous users cannot delete nutrition goals');
select is(has_table_privilege('anon', 'public.food_entries', 'SELECT'), false, 'Anonymous users cannot select food entries');
select is(has_table_privilege('anon', 'public.food_entries', 'INSERT'), false, 'Anonymous users cannot insert food entries');
select is(has_table_privilege('anon', 'public.food_entries', 'UPDATE'), false, 'Anonymous users cannot update food entries');
select is(has_table_privilege('anon', 'public.food_entries', 'DELETE'), false, 'Anonymous users cannot delete food entries');

select is((select count(*)::integer from pg_catalog.pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_delete_own'), 0, 'Profile delete policy is removed');
select is((select count(*)::integer from pg_catalog.pg_policies where schemaname = 'public' and tablename = 'nutrition_goals' and policyname = 'nutrition_goals_delete_own'), 0, 'Nutrition-goal delete policy is removed');

select tests.authenticate_as('user1@test.com');

select is(
  (select count(*)::integer from public.food_entries),
  1,
  'User 1 can select only their food entries'
);
select is(
  (select count(*)::integer from public.profiles),
  1,
  'User 1 can select only their profile'
);
select is(
  (select count(*)::integer from public.nutrition_goals),
  1,
  'User 1 can select only their nutrition goals'
);

select lives_ok(
  $$
    update public.profiles
    set full_name = 'User One'
    where user_id = tests.get_supabase_uid('user1@test.com')
  $$,
  'User 1 can update their own profile'
);
select lives_ok(
  $$
    update public.nutrition_goals
    set calories = 2300
    where user_id = tests.get_supabase_uid('user1@test.com')
  $$,
  'User 1 can update their own nutrition goals'
);
select lives_ok(
  $$
    update public.food_entries
    set calories = 325
    where id = '00000000-0000-0000-0000-000000000001'::uuid
  $$,
  'User 1 can update their own food entry'
);

select throws_ok(
  $$
    delete from public.profiles
    where user_id = tests.get_supabase_uid('user1@test.com')
  $$,
  '42501',
  'User 1 cannot delete their own profile'
);
select lives_ok(
  $$
    insert into public.profiles (user_id, full_name)
    values (tests.get_supabase_uid('user1@test.com'), 'User One')
  $$,
  'User 1 can insert their own profile'
);
select throws_ok(
  $$
    delete from public.nutrition_goals
    where user_id = tests.get_supabase_uid('user1@test.com')
  $$,
  '42501',
  'User 1 cannot delete their own nutrition goals'
);
select lives_ok(
  $$
    insert into public.nutrition_goals (user_id, calories, protein, carbohydrates, fat)
    values (tests.get_supabase_uid('user1@test.com'), 2300, 128, 310, 76)
  $$,
  'User 1 can insert their own nutrition goals'
);
select lives_ok(
  $$
    insert into public.food_entries (
      user_id, date, food_name, meal_category, serving_size, serving_unit, calories
    ) values (
      tests.get_supabase_uid('user1@test.com'),
      date '2026-01-01', 'User 1 snack', 'Snacks', 1, 'servings', 100
    )
  $$,
  'User 1 can insert their own food entry'
);

select throws_ok(
  $$
    update public.profiles
    set user_id = tests.get_supabase_uid('user2@test.com')
    where user_id = tests.get_supabase_uid('user1@test.com')
  $$,
  '42501',
  'User 1 cannot change profile ownership'
);
select throws_ok(
  $$
    update public.nutrition_goals
    set user_id = tests.get_supabase_uid('user2@test.com')
    where user_id = tests.get_supabase_uid('user1@test.com')
  $$,
  '42501',
  'User 1 cannot change nutrition-goal ownership'
);
select throws_ok(
  $$
    update public.food_entries
    set user_id = tests.get_supabase_uid('user2@test.com')
    where id = '00000000-0000-0000-0000-000000000001'::uuid
  $$,
  '42501',
  'User 1 cannot change food-entry ownership'
);

select throws_ok(
  $$
    insert into public.profiles (user_id, full_name)
    values (tests.get_supabase_uid('user2@test.com'), 'Cross-user profile')
  $$,
  '42501',
  'User 1 cannot insert User 2 profile data'
);
select throws_ok(
  $$
    insert into public.nutrition_goals (user_id, calories, protein, carbohydrates, fat)
    values (tests.get_supabase_uid('user2@test.com'), 2000, 100, 250, 70)
  $$,
  '42501',
  'User 1 cannot insert User 2 nutrition goals'
);
select throws_ok(
  $$
    insert into public.food_entries (
      user_id, date, food_name, meal_category, serving_size, serving_unit, calories
    ) values (
      tests.get_supabase_uid('user2@test.com'),
      date '2026-01-01', 'Cross-user entry', 'Snacks', 1, 'servings', 100
    )
  $$,
  '42501',
  'User 1 cannot insert User 2 food data'
);

-- Profile and nutrition-goal deletes are denied at the Data API grant layer;
-- food-entry deletes remain policy-scoped to the current user.
select throws_ok(
  $$ delete from public.profiles where user_id = tests.get_supabase_uid('user2@test.com') $$,
  '42501',
  'User 1 cannot delete User 2 profile data'
);
select throws_ok(
  $$ delete from public.nutrition_goals where user_id = tests.get_supabase_uid('user2@test.com') $$,
  '42501',
  'User 1 cannot delete User 2 nutrition goals'
);
select lives_ok(
  $$ delete from public.food_entries where id = '00000000-0000-0000-0000-000000000002'::uuid $$,
  'User 1 cannot delete User 2 food data'
);
select is(
  (select count(*)::integer from public.food_entries),
  2,
  'User 1 has two visible food entries after their insert'
);

select tests.authenticate_as('user2@test.com');

select is(
  (select full_name from public.profiles),
  'User Two',
  'User 2 profile survived User 1 access attempts'
);
select is(
  (select calories from public.nutrition_goals),
  2100,
  'User 2 nutrition goals survived User 1 access attempts'
);
select is(
  (select count(*)::integer from public.food_entries),
  1,
  'User 2 can select only their food entries'
);

select lives_ok(
  $$
    update public.profiles
    set full_name = 'User Two Updated'
    where user_id = tests.get_supabase_uid('user2@test.com')
  $$,
  'User 2 can update their own profile'
);
select lives_ok(
  $$
    update public.nutrition_goals
    set calories = 2150
    where user_id = tests.get_supabase_uid('user2@test.com')
  $$,
  'User 2 can update their own nutrition goals'
);
select lives_ok(
  $$
    update public.food_entries
    set calories = 450
    where id = '00000000-0000-0000-0000-000000000002'::uuid
  $$,
  'User 2 can update their own food entry'
);

select throws_ok(
  $$
    delete from public.profiles
    where user_id = tests.get_supabase_uid('user2@test.com')
  $$,
  '42501',
  'User 2 cannot delete their own profile'
);
select lives_ok(
  $$
    insert into public.profiles (user_id, full_name)
    values (tests.get_supabase_uid('user2@test.com'), 'User Two Updated')
  $$,
  'User 2 can insert their own profile'
);
select throws_ok(
  $$
    delete from public.nutrition_goals
    where user_id = tests.get_supabase_uid('user2@test.com')
  $$,
  '42501',
  'User 2 cannot delete their own nutrition goals'
);
select lives_ok(
  $$
    insert into public.nutrition_goals (user_id, calories, protein, carbohydrates, fat)
    values (tests.get_supabase_uid('user2@test.com'), 2150, 128, 310, 76)
  $$,
  'User 2 can insert their own nutrition goals'
);
select lives_ok(
  $$
    delete from public.food_entries
    where id = '00000000-0000-0000-0000-000000000002'::uuid
  $$,
  'User 2 can delete their own food entry'
);
select lives_ok(
  $$
    insert into public.food_entries (
      user_id, date, food_name, meal_category, serving_size, serving_unit, calories
    ) values (
      tests.get_supabase_uid('user2@test.com'),
      date '2026-01-01', 'User 2 snack', 'Snacks', 1, 'servings', 100
    )
  $$,
  'User 2 can insert their own food entry'
);

select throws_ok(
  $$
    update public.profiles
    set user_id = tests.get_supabase_uid('user1@test.com')
    where user_id = tests.get_supabase_uid('user2@test.com')
  $$,
  '42501',
  'User 2 cannot change profile ownership'
);
select throws_ok(
  $$
    update public.nutrition_goals
    set user_id = tests.get_supabase_uid('user1@test.com')
    where user_id = tests.get_supabase_uid('user2@test.com')
  $$,
  '42501',
  'User 2 cannot change nutrition-goal ownership'
);
select throws_ok(
  $$
    update public.food_entries
    set user_id = tests.get_supabase_uid('user1@test.com')
    where food_name = 'User 2 snack'
  $$,
  '42501',
  'User 2 cannot change food-entry ownership'
);

select throws_ok(
  $$ delete from public.profiles where user_id = tests.get_supabase_uid('user1@test.com') $$,
  '42501',
  'User 2 cannot delete User 1 profile data'
);
select throws_ok(
  $$ delete from public.nutrition_goals where user_id = tests.get_supabase_uid('user1@test.com') $$,
  '42501',
  'User 2 cannot delete User 1 nutrition goals'
);
select lives_ok(
  $$ delete from public.food_entries where id = '00000000-0000-0000-0000-000000000001'::uuid $$,
  'User 2 cannot delete User 1 food data'
);

select tests.authenticate_as('user1@test.com');
select is(
  (select full_name from public.profiles),
  'User One',
  'User 1 profile survived User 2 access attempts'
);
select is(
  (select calories from public.nutrition_goals),
  2300,
  'User 1 nutrition goals survived User 2 access attempts'
);
select is(
  (select count(*)::integer from public.food_entries),
  2,
  'User 1 food entries survived User 2 access attempts'
);
select lives_ok(
  $$
    delete from public.food_entries
    where food_name = 'User 1 snack'
  $$,
  'User 1 can delete their own food entry'
);
select is(
  (select count(*)::integer from public.food_entries),
  1,
  'User 1 sees only their remaining food entry'
);

select tests.clear_authentication();
set local role anon;

select throws_ok(
  $$ select count(*) from public.profiles $$,
  '42501',
  'Anonymous users cannot read profiles'
);
select throws_ok(
  $$ select count(*) from public.nutrition_goals $$,
  '42501',
  'Anonymous users cannot read nutrition goals'
);
select throws_ok(
  $$ select count(*) from public.food_entries $$,
  '42501',
  'Anonymous users cannot read food entries'
);

select throws_ok(
  $$
    insert into public.profiles (user_id, full_name)
    values (null, 'Anonymous profile')
  $$,
  '42501',
  'Anonymous users cannot insert profiles'
);
select throws_ok(
  $$
    insert into public.nutrition_goals (user_id)
    values (null)
  $$,
  '42501',
  'Anonymous users cannot insert nutrition goals'
);
select throws_ok(
  $$
    insert into public.food_entries (
      user_id, date, food_name, meal_category, serving_size, serving_unit, calories
    ) values (null, date '2026-01-01', 'Anonymous entry', 'Snacks', 1, 'servings', 100)
  $$,
  '42501',
  'Anonymous users cannot insert food entries'
);

select * from finish();

rollback;
