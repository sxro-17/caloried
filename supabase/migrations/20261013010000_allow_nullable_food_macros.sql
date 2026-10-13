-- Allow food macros to remain unknown when a user does not enter them.
-- Existing values, including explicit zeroes, are preserved.

alter table public.food_entries
  alter column protein drop not null,
  alter column protein drop default,
  alter column carbohydrates drop not null,
  alter column carbohydrates drop default,
  alter column fat drop not null,
  alter column fat drop default;
