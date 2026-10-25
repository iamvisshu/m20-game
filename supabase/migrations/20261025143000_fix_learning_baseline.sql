-- Repair curated knowledge baseline and make learning cumulative.
--
-- This migration:
-- 1. Restores the Cat curated baseline that was overwritten during Batch 8 testing.
-- 2. Rebuilds entity_attribute_stats from curated knowledge.
-- 3. Re-applies all existing evidence on top of that baseline.
-- 4. Makes apply_learning initialize missing stats and remain idempotent.
-- 5. Records the latest triggering evidence in knowledge_history.

update public.entity_attributes ea
set
    value_boolean = case a.name
                        when 'electronic' then false
                        when 'portable' then true
                        when 'edible' then false
                        when 'alive' then true
                        when 'has_legs' then true
                        when 'has_wheels' then false
                        when 'used_indoors' then true
                        when 'used_outdoors' then true
                        when 'contains_liquid' then false
                        when 'can_fly' then false
                        when 'is_animal' then true
                        when 'is_human' then false
                        when 'is_fictional' then false
                        when 'made_of_metal' then false
        end,
    confidence = 1,
    evidence_count = 10,
    positive_evidence = case a.name
                            when 'portable' then 10
                            when 'alive' then 10
                            when 'has_legs' then 10
                            when 'used_indoors' then 10
                            when 'used_outdoors' then 10
                            when 'is_animal' then 10
                            else 0
        end,
    negative_evidence = case a.name
                            when 'portable' then 0
                            when 'alive' then 0
                            when 'has_legs' then 0
                            when 'used_indoors' then 0
                            when 'used_outdoors' then 0
                            when 'is_animal' then 0
                            else 10
        end,
    updated_at = now()
    from public.entities e
join public.attributes a on true
where ea.entity_id = e.id
  and ea.attribute_id = a.id
  and e.canonical_name = 'Cat';

-- Rebuild stats from the curated entity knowledge baseline.
delete from public.entity_attribute_stats;

insert into public.entity_attribute_stats (
    entity_id,
    attribute_id,
    evidence_count,
    positive_weight,
    negative_weight,
    updated_at
)
select
    ea.entity_id,
    ea.attribute_id,
    ea.evidence_count,
    ea.positive_evidence,
    ea.negative_evidence,
    now()
from public.entity_attributes ea;

-- Re-apply all historical evidence on top of the curated baseline.
insert into public.entity_attribute_stats (
    entity_id,
    attribute_id,
    evidence_count,
    positive_weight,
    negative_weight,
    updated_at
)
select
    e.entity_id,
    e.attribute_id,
    count(*)::integer,
    coalesce(
            sum(
                    case
                        when e.answer in ('YES', 'PROBABLY_YES')
                            then e.evidence_weight
                        else 0
                        end
            ),
            0
    ),
    coalesce(
            sum(
                    case
                        when e.answer in ('NO', 'PROBABLY_NO')
                            then e.evidence_weight
                        else 0
                        end
            ),
            0
    ),
    now()
from public.evidence e
group by e.entity_id, e.attribute_id
    on conflict (entity_id, attribute_id)
do update set
    evidence_count =
           public.entity_attribute_stats.evidence_count + excluded.evidence_count,
           positive_weight =
           public.entity_attribute_stats.positive_weight + excluded.positive_weight,
           negative_weight =
           public.entity_attribute_stats.negative_weight + excluded.negative_weight,
           updated_at = now();

-- Rebuild derived entity knowledge from the repaired cumulative stats.
update public.entity_attributes ea
set
    value_boolean =
        case
            when s.positive_weight >= s.negative_weight then true
            else false
            end,
    confidence =
        case
            when s.positive_weight + s.negative_weight = 0 then 0
            else greatest(s.positive_weight, s.negative_weight)
                / (s.positive_weight + s.negative_weight)
            end,
    evidence_count = s.evidence_count,
    positive_evidence = s.positive_weight,
    negative_evidence = s.negative_weight,
    updated_at = now()
    from public.entity_attribute_stats s
where ea.entity_id = s.entity_id
  and ea.attribute_id = s.attribute_id;

-- Replace apply_learning with a cumulative, idempotent implementation.
create or replace function public.apply_learning(p_game_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
v_target_entity_id uuid;
  v_inserted_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
end if;

select g.target_entity_id
into v_target_entity_id
from public.games g
where g.id = p_game_id
  and g.created_by = (select auth.uid())
  and g.status = 'COMPLETED'
  and g.outcome = 'CORRECT_GUESS'
    for update;

if v_target_entity_id is null then
    raise exception 'Learning requires a completed correct game';
end if;

  -- Ensure the curated baseline exists before adding new evidence.
insert into public.entity_attribute_stats (
    entity_id,
    attribute_id,
    evidence_count,
    positive_weight,
    negative_weight,
    updated_at
)
select
    ea.entity_id,
    ea.attribute_id,
    ea.evidence_count,
    ea.positive_evidence,
    ea.negative_evidence,
    now()
from public.entity_attributes ea
where ea.entity_id = v_target_entity_id
    on conflict (entity_id, attribute_id) do nothing;

-- Insert immutable evidence.
insert into public.evidence (
    game_id,
    entity_id,
    attribute_id,
    question_id,
    answer,
    evidence_weight
)
select
    ga.game_id,
    v_target_entity_id,
    q.primary_attribute_id,
    q.id,
    ga.answer,
    case ga.answer
        when 'YES' then 1
        when 'PROBABLY_YES' then 0.5
        when 'UNKNOWN' then 0
        when 'PROBABLY_NO' then 0.5
        when 'NO' then 1
        end
from public.game_answers ga
         join public.game_questions gq
              on gq.id = ga.game_question_id
         join public.questions q
              on q.id = gq.question_id
where ga.game_id = p_game_id
    on conflict (game_id, entity_id, attribute_id, question_id)
  do nothing;

get diagnostics v_inserted_count = row_count;

-- Already learned: nothing else to do.
if v_inserted_count = 0 then
    return 0;
end if;

  -- Add this game's evidence to cumulative statistics.
insert into public.entity_attribute_stats (
    entity_id,
    attribute_id,
    evidence_count,
    positive_weight,
    negative_weight,
    updated_at
)
select
    e.entity_id,
    e.attribute_id,
    count(*)::integer,
    coalesce(
            sum(
                    case
                        when e.answer in ('YES', 'PROBABLY_YES')
                            then e.evidence_weight
                        else 0
                        end
            ),
            0
    ),
    coalesce(
            sum(
                    case
                        when e.answer in ('NO', 'PROBABLY_NO')
                            then e.evidence_weight
                        else 0
                        end
            ),
            0
    ),
    now()
from public.evidence e
where e.game_id = p_game_id
  and e.entity_id = v_target_entity_id
group by e.entity_id, e.attribute_id
    on conflict (entity_id, attribute_id)
  do update set
    evidence_count =
             public.entity_attribute_stats.evidence_count + excluded.evidence_count,
             positive_weight =
             public.entity_attribute_stats.positive_weight + excluded.positive_weight,
             negative_weight =
             public.entity_attribute_stats.negative_weight + excluded.negative_weight,
             updated_at = now();

-- Recalculate derived knowledge.
update public.entity_attributes ea
set
    value_boolean =
        case
            when s.positive_weight >= s.negative_weight then true
            else false
            end,
    confidence =
        case
            when s.positive_weight + s.negative_weight = 0 then 0
            else greatest(s.positive_weight, s.negative_weight)
                / (s.positive_weight + s.negative_weight)
            end,
    evidence_count = s.evidence_count,
    positive_evidence = s.positive_weight,
    negative_evidence = s.negative_weight,
    updated_at = now()
    from public.entity_attribute_stats s
where ea.entity_id = s.entity_id
  and ea.attribute_id = s.attribute_id
  and ea.entity_id = v_target_entity_id;

-- Record the corrected derived state.
insert into public.knowledge_history (
    entity_id,
    attribute_id,
    value_boolean,
    confidence,
    evidence_count,
    positive_evidence,
    negative_evidence,
    source_evidence_id
)
select
    ea.entity_id,
    ea.attribute_id,
    ea.value_boolean,
    ea.confidence,
    ea.evidence_count,
    ea.positive_evidence,
    ea.negative_evidence,
    (
        select ev.id
        from public.evidence ev
        where ev.game_id = p_game_id
          and ev.entity_id = v_target_entity_id
          and ev.attribute_id = ea.attribute_id
        order by ev.created_at desc, ev.id desc
        limit 1
    )
from public.entity_attributes ea
where ea.entity_id = v_target_entity_id;

return v_inserted_count;
end;
$function$;

grant execute on function public.apply_learning(uuid)
to authenticated;