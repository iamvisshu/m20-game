grant
    select
    on public.questions to anon,
    authenticated;
drop
policy if exists "Active questions are readable" on public.questions;
create policy "Active questions are readable" on public.questions for
select
    to anon,
    authenticated using (active = true);
