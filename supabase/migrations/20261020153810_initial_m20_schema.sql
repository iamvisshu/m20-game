-- M20 initial PostgreSQL schema
-- Architecture:
--   Reference data -> gameplay -> immutable evidence -> derived knowledge
--
-- Shared knowledge is never directly writable by the browser.
-- RLS and SECURITY DEFINER RPCs form the application security boundary.

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

create type public.attribute_value_type as enum (
  'BOOLEAN',
  'NUMERIC',
  'CATEGORICAL',
  'MULTI_VALUE'
);

create type public.answer_value as enum (
  'YES',
  'PROBABLY_YES',
  'UNKNOWN',
  'PROBABLY_NO',
  'NO'
);

create type public.game_status as enum (
  'IN_PROGRESS',
  'COMPLETED',
  'ABANDONED'
);

create type public.game_outcome as enum (
  'CORRECT_GUESS',
  'WRONG_GUESS',
  'PLAYER_GAVE_UP',
  'QUESTION_LIMIT_REACHED'
);

-- ============================================================
-- REFERENCE / KNOWLEDGE MODEL
-- ============================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint categories_name_not_blank
    check (length(trim(name)) > 0),

  constraint categories_name_unique
    unique (name)
);

create table public.entities (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  description text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint entities_canonical_name_not_blank
    check (length(trim(canonical_name)) > 0),

  constraint entities_canonical_name_unique
    unique (canonical_name)
);

create table public.entity_categories (
  entity_id uuid not null
    references public.entities(id)
    on delete restrict,

  category_id uuid not null
    references public.categories(id)
    on delete restrict,

  created_at timestamptz not null default now(),

  primary key (entity_id, category_id)
);

create table public.attributes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  value_type public.attribute_value_type not null default 'BOOLEAN',
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint attributes_name_not_blank
    check (length(trim(name)) > 0),

  constraint attributes_name_unique
    unique (name)
);

-- Current / derived knowledge.
--
-- This is NOT immutable truth.
-- It represents the current best belief derived from evidence.
--
-- Initial engine supports BOOLEAN values.
-- The schema leaves room for future value types.

create table public.entity_attributes (
  entity_id uuid not null
    references public.entities(id)
    on delete restrict,

  attribute_id uuid not null
    references public.attributes(id)
    on delete restrict,

  value_boolean boolean,
  confidence numeric(6,5) not null default 0,
  evidence_count integer not null default 0,
  positive_evidence numeric(12,5) not null default 0,
  negative_evidence numeric(12,5) not null default 0,
  updated_at timestamptz not null default now(),

  primary key (entity_id, attribute_id),

  constraint entity_attributes_confidence_range
    check (confidence >= 0 and confidence <= 1),

  constraint entity_attributes_evidence_count_nonnegative
    check (evidence_count >= 0),

  constraint entity_attributes_positive_nonnegative
    check (positive_evidence >= 0),

  constraint entity_attributes_negative_nonnegative
    check (negative_evidence >= 0)
);

create table public.question_families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint question_families_name_not_blank
    check (length(trim(name)) > 0),

  constraint question_families_name_unique
    unique (name)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),

  text text not null,

  primary_attribute_id uuid not null
    references public.attributes(id)
    on delete restrict,

  question_family_id uuid
    references public.question_families(id)
    on delete restrict,

  active boolean not null default true,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint questions_text_not_blank
    check (length(trim(text)) > 0)
);

-- ============================================================
-- GAMEPLAY
-- ============================================================

create table public.games (
  id uuid primary key default gen_random_uuid(),

  created_by uuid not null
    references auth.users(id)
    on delete restrict
    default auth.uid(),

  category_id uuid
    references public.categories(id)
    on delete restrict,

  status public.game_status not null default 'IN_PROGRESS',

  outcome public.game_outcome,

  guessed_entity_id uuid
    references public.entities(id)
    on delete restrict,

  target_entity_id uuid
    references public.entities(id)
    on delete restrict,

  questions_asked integer not null default 0,

  started_at timestamptz not null default now(),
  completed_at timestamptz,

  created_at timestamptz not null default now(),

  constraint games_questions_asked_nonnegative
    check (questions_asked >= 0),

  constraint games_completed_timestamp_consistency
    check (
      (status = 'IN_PROGRESS' and completed_at is null)
      or
      (status in ('COMPLETED', 'ABANDONED') and completed_at is not null)
    )
);

create table public.game_questions (
  id uuid primary key default gen_random_uuid(),

  game_id uuid not null
    references public.games(id)
    on delete restrict,

  question_id uuid not null
    references public.questions(id)
    on delete restrict,

  question_number integer not null,

  asked_at timestamptz not null default now(),

  constraint game_questions_number_positive
    check (question_number > 0),

  constraint game_questions_unique_number
    unique (game_id, question_number),

  constraint game_questions_unique_question
    unique (game_id, question_id)
);

create table public.game_answers (
  id uuid primary key default gen_random_uuid(),

  game_id uuid not null
    references public.games(id)
    on delete restrict,

  game_question_id uuid not null
    references public.game_questions(id)
    on delete restrict,

  answer public.answer_value not null,

  answered_at timestamptz not null default now(),

  constraint game_answers_unique_question
    unique (game_id, game_question_id)
);

-- ============================================================
-- LEARNING / EVIDENCE
-- ============================================================

-- Immutable observation history.
--
-- Evidence is generated from gameplay only after the target entity
-- is known. A single player answer therefore does NOT directly
-- overwrite entity_attributes.

create table public.evidence (
  id uuid primary key default gen_random_uuid(),

  game_id uuid not null
    references public.games(id)
    on delete restrict,

  entity_id uuid not null
    references public.entities(id)
    on delete restrict,

  attribute_id uuid not null
    references public.attributes(id)
    on delete restrict,

  question_id uuid not null
    references public.questions(id)
    on delete restrict,

  answer public.answer_value not null,

  evidence_weight numeric(8,5) not null default 1,

  created_at timestamptz not null default now(),

  constraint evidence_weight_nonnegative
    check (evidence_weight >= 0),

  constraint evidence_idempotency
    unique (game_id, entity_id, attribute_id, question_id)
);

-- Aggregated learning statistics.
--
-- This table is derived from immutable evidence and is maintained
-- transactionally by the learning layer.

create table public.entity_attribute_stats (
  entity_id uuid not null
    references public.entities(id)
    on delete restrict,

  attribute_id uuid not null
    references public.attributes(id)
    on delete restrict,

  evidence_count integer not null default 0,

  positive_weight numeric(12,5) not null default 0,
  negative_weight numeric(12,5) not null default 0,

  updated_at timestamptz not null default now(),

  primary key (entity_id, attribute_id),

  constraint entity_attribute_stats_count_nonnegative
    check (evidence_count >= 0),

  constraint entity_attribute_stats_positive_nonnegative
    check (positive_weight >= 0),

  constraint entity_attribute_stats_negative_nonnegative
    check (negative_weight >= 0)
);

-- Immutable snapshots of derived knowledge.
--
-- This makes future recalculation/debugging possible if the
-- learning algorithm changes.

create table public.knowledge_history (
  id uuid primary key default gen_random_uuid(),

  entity_id uuid not null
    references public.entities(id)
    on delete restrict,

  attribute_id uuid not null
    references public.attributes(id)
    on delete restrict,

  value_boolean boolean,

  confidence numeric(6,5) not null,

  evidence_count integer not null,

  positive_evidence numeric(12,5) not null,

  negative_evidence numeric(12,5) not null,

  source_evidence_id uuid
    references public.evidence(id)
    on delete restrict,

  created_at timestamptz not null default now(),

  constraint knowledge_history_confidence_range
    check (confidence >= 0 and confidence <= 1),

  constraint knowledge_history_count_nonnegative
    check (evidence_count >= 0),

  constraint knowledge_history_positive_nonnegative
    check (positive_evidence >= 0),

  constraint knowledge_history_negative_nonnegative
    check (negative_evidence >= 0)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_entities_active
  on public.entities(active);

create index idx_categories_active
  on public.categories(active);

create index idx_attributes_active
  on public.attributes(active);

create index idx_questions_active
  on public.questions(active);

create index idx_questions_primary_attribute
  on public.questions(primary_attribute_id);

create index idx_questions_family
  on public.questions(question_family_id);

create index idx_entity_categories_category
  on public.entity_categories(category_id);

create index idx_entity_attributes_attribute
  on public.entity_attributes(attribute_id);

create index idx_games_created_by
  on public.games(created_by);

create index idx_games_status
  on public.games(status);

create index idx_games_target_entity
  on public.games(target_entity_id);

create index idx_game_questions_game
  on public.game_questions(game_id);

create index idx_game_answers_game
  on public.game_answers(game_id);

create index idx_evidence_game
  on public.evidence(game_id);

create index idx_evidence_entity_attribute
  on public.evidence(entity_id, attribute_id);

create index idx_entity_attribute_stats_attribute
  on public.entity_attribute_stats(attribute_id);

create index idx_knowledge_history_entity_attribute
  on public.knowledge_history(entity_id, attribute_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.categories enable row level security;
alter table public.entities enable row level security;
alter table public.entity_categories enable row level security;
alter table public.attributes enable row level security;
alter table public.entity_attributes enable row level security;
alter table public.question_families enable row level security;
alter table public.questions enable row level security;
alter table public.games enable row level security;
alter table public.game_questions enable row level security;
alter table public.game_answers enable row level security;
alter table public.evidence enable row level security;
alter table public.entity_attribute_stats enable row level security;
alter table public.knowledge_history enable row level security;

-- ============================================================
-- PUBLIC READ ACCESS TO ACTIVE REFERENCE DATA
-- ============================================================

create policy "active categories are readable"
on public.categories
for select
to anon, authenticated
using (active = true);

create policy "active entities are readable"
on public.entities
for select
to anon, authenticated
using (active = true);

create policy "active entity categories are readable"
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
  and exists (
    select 1
    from public.categories c
    where c.id = entity_categories.category_id
      and c.active = true
  )
);

create policy "active attributes are readable"
on public.attributes
for select
to anon, authenticated
using (active = true);

create policy "active question families are readable"
on public.question_families
for select
to anon, authenticated
using (active = true);

create policy "active questions are readable"
on public.questions
for select
to anon, authenticated
using (active = true);

-- Current knowledge is readable for gameplay/scoring.
-- It is intentionally NOT directly writable by clients.

create policy "current knowledge is readable"
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
  and exists (
    select 1
    from public.attributes a
    where a.id = entity_attributes.attribute_id
      and a.active = true
  )
);

-- ============================================================
-- GAME OWNERSHIP POLICIES
-- ============================================================

create policy "players can read their own games"
on public.games
for select
to authenticated
using (created_by = auth.uid());

create policy "players can create their own games"
on public.games
for insert
to authenticated
with check (created_by = auth.uid());

create policy "players can update their own games"
on public.games
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "players can read their own game questions"
on public.game_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.games g
    where g.id = game_questions.game_id
      and g.created_by = auth.uid()
  )
);

create policy "players can create questions for their own games"
on public.game_questions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.games g
    where g.id = game_questions.game_id
      and g.created_by = auth.uid()
      and g.status = 'IN_PROGRESS'
  )
);

create policy "players can read their own game answers"
on public.game_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.games g
    where g.id = game_answers.game_id
      and g.created_by = auth.uid()
  )
);

create policy "players can create answers for their own games"
on public.game_answers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.games g
    where g.id = game_answers.game_id
      and g.created_by = auth.uid()
      and g.status = 'IN_PROGRESS'
  )
);

-- ============================================================
-- LEARNING TABLES
-- ============================================================
--
-- No client INSERT/UPDATE/DELETE policies are intentionally
-- created for:
--
--   evidence
--   entity_attribute_stats
--   knowledge_history
--
-- These tables will only be mutated through SECURITY DEFINER
-- PostgreSQL functions created in the next migration stage.
--
-- This prevents browser code from directly modifying shared
-- global knowledge.

-- ============================================================
-- TIMESTAMP TRIGGERS
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

create trigger entities_set_updated_at
before update on public.entities
for each row
execute function public.set_updated_at();

create trigger attributes_set_updated_at
before update on public.attributes
for each row
execute function public.set_updated_at();

create trigger question_families_set_updated_at
before update on public.question_families
for each row
execute function public.set_updated_at();

create trigger entity_attributes_set_updated_at
before update on public.entity_attributes
for each row
execute function public.set_updated_at();

-- ============================================================
-- PRIVILEGES
-- ============================================================

revoke all on public.entity_attributes
from anon, authenticated;

grant select on public.entity_attributes
to anon, authenticated;

revoke all on public.evidence
from anon, authenticated;

revoke all on public.entity_attribute_stats
from anon, authenticated;

revoke all on public.knowledge_history
from anon, authenticated;

-- ============================================================
-- SCHEMA COMPLETE
-- ============================================================
