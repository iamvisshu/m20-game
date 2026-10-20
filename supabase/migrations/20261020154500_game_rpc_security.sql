-- M20 gameplay RPC and learning boundary

-- ============================================================
-- REMOVE DIRECT CLIENT MUTATION OF GAME DATA
-- ============================================================

revoke insert, update, delete
on public.games
from anon, authenticated;

revoke insert, update, delete
on public.game_questions
from anon, authenticated;

revoke insert, update, delete
on public.game_answers
from anon, authenticated;

-- Keep client read access subject to RLS.
grant select
on public.games, public.game_questions, public.game_answers
to authenticated;

-- ============================================================
-- START GAME
-- ============================================================

create or replace function public.start_game(
  p_category_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if p_category_id is not null
     and not exists (
       select 1
       from public.categories c
       where c.id = p_category_id
         and c.active = true
     )
  then
    raise exception 'Invalid or inactive category';
  end if;

  insert into public.games (
    created_by,
    category_id
  )
  values (
    (select auth.uid()),
    p_category_id
  )
  returning id into v_game_id;

  return v_game_id;
end;
$$;

-- ============================================================
-- RECORD ANSWER
-- ============================================================

create or replace function public.record_answer(
  p_game_id uuid,
  p_question_id uuid,
  p_answer public.answer_value
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game_question_id uuid;
  v_question_number integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select
    g.questions_asked + 1
  into
    v_question_number
  from public.games g
  where g.id = p_game_id
    and g.created_by = (select auth.uid())
    and g.status = 'IN_PROGRESS'
  for update;

  if v_question_number is null then
    raise exception 'Game not found or is not in progress';
  end if;

  if not exists (
    select 1
    from public.questions q
    where q.id = p_question_id
      and q.active = true
  ) then
    raise exception 'Question not found or inactive';
  end if;

  if exists (
    select 1
    from public.game_questions gq
    where gq.game_id = p_game_id
      and gq.question_id = p_question_id
  ) then
    raise exception 'Question has already been asked in this game';
  end if;

  insert into public.game_questions (
    game_id,
    question_id,
    question_number
  )
  values (
    p_game_id,
    p_question_id,
    v_question_number
  )
  returning id into v_game_question_id;

  insert into public.game_answers (
    game_id,
    game_question_id,
    answer
  )
  values (
    p_game_id,
    v_game_question_id,
    p_answer
  );

  update public.games
  set questions_asked = v_question_number
  where id = p_game_id;

  return v_game_question_id;
end;
$$;

-- ============================================================
-- FINALIZE GAME
-- ============================================================

create or replace function public.finalize_game(
  p_game_id uuid,
  p_guessed_entity_id uuid,
  p_correct boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.entities e
    where e.id = p_guessed_entity_id
      and e.active = true
  ) then
    raise exception 'Invalid guessed entity';
  end if;

  if not exists (
    select 1
    from public.games g
    where g.id = p_game_id
      and g.created_by = (select auth.uid())
      and g.status = 'IN_PROGRESS'
  ) then
    raise exception 'Game not found or already finalized';
  end if;

  update public.games
  set
    status = 'COMPLETED',
    outcome = case
      when p_correct then 'CORRECT_GUESS'::public.game_outcome
      else 'WRONG_GUESS'::public.game_outcome
    end,
    guessed_entity_id = p_guessed_entity_id,
    target_entity_id = case
      when p_correct then p_guessed_entity_id
      else null
    end,
    completed_at = now()
  where id = p_game_id
    and created_by = (select auth.uid())
    and status = 'IN_PROGRESS';
end;
$$;

-- ============================================================
-- APPLY LEARNING
-- ============================================================

create or replace function public.apply_learning(
  p_game_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
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

  with inserted_evidence as (
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
    on conflict (
      game_id,
      entity_id,
      attribute_id,
      question_id
    ) do nothing
    returning
      id,
      entity_id,
      attribute_id,
      answer,
      evidence_weight
  ),
  aggregated as (
    select
      entity_id,
      attribute_id,
      count(*)::integer as evidence_count,
      coalesce(
        sum(
          case
            when answer in ('YES', 'PROBABLY_YES')
              then evidence_weight
            else 0
          end
        ),
        0
      ) as positive_weight,
      coalesce(
        sum(
          case
            when answer in ('NO', 'PROBABLY_NO')
              then evidence_weight
            else 0
          end
        ),
        0
      ) as negative_weight
    from inserted_evidence
    group by entity_id, attribute_id
  )
  insert into public.entity_attribute_stats (
    entity_id,
    attribute_id,
    evidence_count,
    positive_weight,
    negative_weight,
    updated_at
  )
  select
    entity_id,
    attribute_id,
    evidence_count,
    positive_weight,
    negative_weight,
    now()
  from aggregated
  on conflict (entity_id, attribute_id)
  do update set
    evidence_count =
      public.entity_attribute_stats.evidence_count
      + excluded.evidence_count,

    positive_weight =
      public.entity_attribute_stats.positive_weight
      + excluded.positive_weight,

    negative_weight =
      public.entity_attribute_stats.negative_weight
      + excluded.negative_weight,

    updated_at = now();

  get diagnostics v_inserted_count = row_count;

  -- Recalculate current knowledge from aggregated statistics.
  insert into public.entity_attributes (
    entity_id,
    attribute_id,
    value_boolean,
    confidence,
    evidence_count,
    positive_evidence,
    negative_evidence,
    updated_at
  )
  select
    s.entity_id,
    s.attribute_id,

    case
      when s.positive_weight >= s.negative_weight
        then true
      else false
    end,

    case
      when (s.positive_weight + s.negative_weight) = 0
        then 0
      else greatest(
        s.positive_weight,
        s.negative_weight
      ) / (
        s.positive_weight + s.negative_weight
      )
    end,

    s.evidence_count,
    s.positive_weight,
    s.negative_weight,
    now()

  from public.entity_attribute_stats s

  where s.entity_id = v_target_entity_id

  on conflict (entity_id, attribute_id)
  do update set
    value_boolean = excluded.value_boolean,
    confidence = excluded.confidence,
    evidence_count = excluded.evidence_count,
    positive_evidence = excluded.positive_evidence,
    negative_evidence = excluded.negative_evidence,
    updated_at = now();

  -- Preserve an immutable knowledge snapshot.
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
    null
  from public.entity_attributes ea
  where ea.entity_id = v_target_entity_id;

  return v_inserted_count;
end;
$$;

-- ============================================================
-- FUNCTION PRIVILEGES
-- ============================================================

revoke execute on function public.start_game(uuid)
from public, anon;

revoke execute on function public.record_answer(
  uuid,
  uuid,
  public.answer_value
)
from public, anon;

revoke execute on function public.finalize_game(
  uuid,
  uuid,
  boolean
)
from public, anon;

revoke execute on function public.apply_learning(uuid)
from public, anon;

grant execute on function public.start_game(uuid)
to authenticated;

grant execute on function public.record_answer(
  uuid,
  uuid,
  public.answer_value
)
to authenticated;

grant execute on function public.finalize_game(
  uuid,
  uuid,
  boolean
)
to authenticated;

grant execute on function public.apply_learning(uuid)
to authenticated;

-- ============================================================
-- END
-- ============================================================
