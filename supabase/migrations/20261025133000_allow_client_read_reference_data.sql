-- Allow the browser client to read the public reference/knowledge
-- data required to run a game.
--
-- RLS policies remain the security boundary for row-level access.
-- No INSERT, UPDATE, or DELETE privileges are granted here.

grant select on public.categories to anon, authenticated;
grant select on public.entities to anon, authenticated;
grant select on public.entity_categories to anon, authenticated;
grant select on public.attributes to anon, authenticated;
grant select on public.entity_attributes to anon, authenticated;
grant select on public.questions to anon, authenticated;

drop policy if exists "Active categories are readable" on public.categories;

create policy "Active categories are readable"
on public.categories
for select
to anon, authenticated
using (active = true);

drop policy if exists "Active entities are readable" on public.entities;

create policy "Active entities are readable"
on public.entities
for select
to anon, authenticated
using (active = true);

drop policy if exists "Entity categories are readable" on public.entity_categories;

create policy "Entity categories are readable"
on public.entity_categories
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.entities e
    where e.id = entity_categories.entity_id
      and e.active = true
  )
);

drop policy if exists "Active attributes are readable" on public.attributes;

create policy "Active attributes are readable"
on public.attributes
for select
to anon, authenticated
using (active = true);

drop policy if exists "Current entity knowledge is readable" on public.entity_attributes;

create policy "Current entity knowledge is readable"
on public.entity_attributes
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.entities e
    where e.id = entity_attributes.entity_id
      and e.active = true
  )
);

drop policy if exists "Active questions are readable" on public.questions;

create policy "Active questions are readable"
on public.questions
for select
to anon, authenticated
using (active = true);
