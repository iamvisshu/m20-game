-- M20 curated development dataset

-- ============================================================
-- CATEGORIES
-- ============================================================

insert into public.categories (name, description)
values
  ('Everyday Objects', 'Common physical objects people encounter regularly'),
  ('Animals', 'Common living animals'),
  ('Food & Drinks', 'Common foods and beverages')
on conflict (name) do nothing;

-- ============================================================
-- ATTRIBUTES
-- ============================================================

insert into public.attributes (
  name,
  description,
  value_type
)
values
  ('electronic', 'Uses electricity or electronic components', 'BOOLEAN'),
  ('portable', 'Can normally be carried by one person', 'BOOLEAN'),
  ('edible', 'Can normally be eaten or consumed', 'BOOLEAN'),
  ('alive', 'Is a living organism', 'BOOLEAN'),
  ('has_legs', 'Normally has legs', 'BOOLEAN'),
  ('has_wheels', 'Normally has wheels', 'BOOLEAN'),
  ('used_indoors', 'Commonly used indoors', 'BOOLEAN'),
  ('used_outdoors', 'Commonly used outdoors', 'BOOLEAN'),
  ('contains_liquid', 'Normally contains liquid', 'BOOLEAN'),
  ('can_fly', 'Can naturally fly', 'BOOLEAN'),
  ('is_animal', 'Is an animal', 'BOOLEAN'),
  ('is_human', 'Is a human', 'BOOLEAN'),
  ('is_fictional', 'Is fictional', 'BOOLEAN'),
  ('made_of_metal', 'Contains substantial metal construction', 'BOOLEAN')
on conflict (name) do nothing;

-- ============================================================
-- QUESTION FAMILIES
-- ============================================================

insert into public.question_families (name, description)
values
  ('Physical Properties', 'Questions about physical characteristics'),
  ('Usage', 'Questions about typical usage'),
  ('Biological', 'Questions about living organisms'),
  ('Composition', 'Questions about material or composition')
on conflict (name) do nothing;

-- ============================================================
-- ENTITIES
-- ============================================================

insert into public.entities (canonical_name, description)
values
  ('Water Bottle', 'A reusable or disposable bottle used to carry water'),
  ('Smartphone', 'A handheld electronic mobile phone'),
  ('Laptop', 'A portable personal computer'),
  ('Bicycle', 'A human-powered two-wheeled vehicle'),
  ('Dog', 'A domesticated canine'),
  ('Cat', 'A domesticated feline'),
  ('Eagle', 'A large bird of prey'),
  ('Apple', 'A common edible fruit'),
  ('Banana', 'A common edible fruit'),
  ('Coffee', 'A prepared beverage made from roasted coffee beans')
on conflict (canonical_name) do nothing;

-- ============================================================
-- ENTITY -> CATEGORY
-- ============================================================

insert into public.entity_categories (entity_id, category_id)
select e.id, c.id
from public.entities e
cross join public.categories c
where
  (c.name = 'Everyday Objects'
    and e.canonical_name in (
      'Water Bottle',
      'Smartphone',
      'Laptop',
      'Bicycle'
    ))
  or
  (c.name = 'Animals'
    and e.canonical_name in (
      'Dog',
      'Cat',
      'Eagle'
    ))
  or
  (c.name = 'Food & Drinks'
    and e.canonical_name in (
      'Apple',
      'Banana',
      'Coffee'
    ))
on conflict do nothing;

-- ============================================================
-- QUESTIONS
-- ============================================================

insert into public.questions (
  text,
  primary_attribute_id,
  question_family_id
)
select
  q.text,
  a.id,
  f.id
from (
  values
    ('Is it electronic?', 'electronic', 'Physical Properties'),
    ('Is it portable?', 'portable', 'Physical Properties'),
    ('Is it edible?', 'edible', 'Physical Properties'),
    ('Is it alive?', 'alive', 'Biological'),
    ('Does it have legs?', 'has_legs', 'Physical Properties'),
    ('Does it have wheels?', 'has_wheels', 'Physical Properties'),
    ('Is it commonly used indoors?', 'used_indoors', 'Usage'),
    ('Is it commonly used outdoors?', 'used_outdoors', 'Usage'),
    ('Does it normally contain liquid?', 'contains_liquid', 'Physical Properties'),
    ('Can it naturally fly?', 'can_fly', 'Biological'),
    ('Is it an animal?', 'is_animal', 'Biological'),
    ('Is it human?', 'is_human', 'Biological'),
    ('Is it fictional?', 'is_fictional', 'Biological'),
    ('Is it substantially made of metal?', 'made_of_metal', 'Composition')
) as q(text, attribute_name, family_name)
join public.attributes a
  on a.name = q.attribute_name
join public.question_families f
  on f.name = q.family_name
where not exists (
  select 1
  from public.questions existing
  where existing.text = q.text
);

-- ============================================================
-- INITIAL CURATED KNOWLEDGE
-- ============================================================

insert into public.entity_attributes (
  entity_id,
  attribute_id,
  value_boolean,
  confidence,
  evidence_count,
  positive_evidence,
  negative_evidence
)
select
  e.id,
  a.id,
  k.value_boolean,
  1,
  10,
  case when k.value_boolean then 10 else 0 end,
  case when k.value_boolean then 0 else 10 end
from (
  values
    ('Water Bottle', 'electronic', false),
    ('Water Bottle', 'portable', true),
    ('Water Bottle', 'edible', false),
    ('Water Bottle', 'alive', false),
    ('Water Bottle', 'has_legs', false),
    ('Water Bottle', 'has_wheels', false),
    ('Water Bottle', 'used_indoors', true),
    ('Water Bottle', 'used_outdoors', true),
    ('Water Bottle', 'contains_liquid', true),
    ('Water Bottle', 'can_fly', false),
    ('Water Bottle', 'is_animal', false),
    ('Water Bottle', 'is_human', false),
    ('Water Bottle', 'is_fictional', false),
    ('Water Bottle', 'made_of_metal', false),

    ('Smartphone', 'electronic', true),
    ('Smartphone', 'portable', true),
    ('Smartphone', 'edible', false),
    ('Smartphone', 'alive', false),
    ('Smartphone', 'has_legs', false),
    ('Smartphone', 'has_wheels', false),
    ('Smartphone', 'used_indoors', true),
    ('Smartphone', 'used_outdoors', true),
    ('Smartphone', 'contains_liquid', false),
    ('Smartphone', 'can_fly', false),
    ('Smartphone', 'is_animal', false),
    ('Smartphone', 'is_human', false),
    ('Smartphone', 'is_fictional', false),
    ('Smartphone', 'made_of_metal', true),

    ('Laptop', 'electronic', true),
    ('Laptop', 'portable', true),
    ('Laptop', 'edible', false),
    ('Laptop', 'alive', false),
    ('Laptop', 'has_legs', false),
    ('Laptop', 'has_wheels', false),
    ('Laptop', 'used_indoors', true),
    ('Laptop', 'used_outdoors', true),
    ('Laptop', 'contains_liquid', false),
    ('Laptop', 'can_fly', false),
    ('Laptop', 'is_animal', false),
    ('Laptop', 'is_human', false),
    ('Laptop', 'is_fictional', false),
    ('Laptop', 'made_of_metal', true),

    ('Bicycle', 'electronic', false),
    ('Bicycle', 'portable', true),
    ('Bicycle', 'edible', false),
    ('Bicycle', 'alive', false),
    ('Bicycle', 'has_legs', false),
    ('Bicycle', 'has_wheels', true),
    ('Bicycle', 'used_indoors', false),
    ('Bicycle', 'used_outdoors', true),
    ('Bicycle', 'contains_liquid', false),
    ('Bicycle', 'can_fly', false),
    ('Bicycle', 'is_animal', false),
    ('Bicycle', 'is_human', false),
    ('Bicycle', 'is_fictional', false),
    ('Bicycle', 'made_of_metal', true),

    ('Dog', 'electronic', false),
    ('Dog', 'portable', true),
    ('Dog', 'edible', false),
    ('Dog', 'alive', true),
    ('Dog', 'has_legs', true),
    ('Dog', 'has_wheels', false),
    ('Dog', 'used_indoors', true),
    ('Dog', 'used_outdoors', true),
    ('Dog', 'contains_liquid', false),
    ('Dog', 'can_fly', false),
    ('Dog', 'is_animal', true),
    ('Dog', 'is_human', false),
    ('Dog', 'is_fictional', false),
    ('Dog', 'made_of_metal', false),

    ('Cat', 'electronic', false),
    ('Cat', 'portable', true),
    ('Cat', 'edible', false),
    ('Cat', 'alive', true),
    ('Cat', 'has_legs', true),
    ('Cat', 'has_wheels', false),
    ('Cat', 'used_indoors', true),
    ('Cat', 'used_outdoors', true),
    ('Cat', 'contains_liquid', false),
    ('Cat', 'can_fly', false),
    ('Cat', 'is_animal', true),
    ('Cat', 'is_human', false),
    ('Cat', 'is_fictional', false),
    ('Cat', 'made_of_metal', false),

    ('Eagle', 'electronic', false),
    ('Eagle', 'portable', true),
    ('Eagle', 'edible', false),
    ('Eagle', 'alive', true),
    ('Eagle', 'has_legs', true),
    ('Eagle', 'has_wheels', false),
    ('Eagle', 'used_indoors', false),
    ('Eagle', 'used_outdoors', true),
    ('Eagle', 'contains_liquid', false),
    ('Eagle', 'can_fly', true),
    ('Eagle', 'is_animal', true),
    ('Eagle', 'is_human', false),
    ('Eagle', 'is_fictional', false),
    ('Eagle', 'made_of_metal', false),

    ('Apple', 'electronic', false),
    ('Apple', 'portable', true),
    ('Apple', 'edible', true),
    ('Apple', 'alive', false),
    ('Apple', 'has_legs', false),
    ('Apple', 'has_wheels', false),
    ('Apple', 'used_indoors', true),
    ('Apple', 'used_outdoors', true),
    ('Apple', 'contains_liquid', false),
    ('Apple', 'can_fly', false),
    ('Apple', 'is_animal', false),
    ('Apple', 'is_human', false),
    ('Apple', 'is_fictional', false),
    ('Apple', 'made_of_metal', false),

    ('Banana', 'electronic', false),
    ('Banana', 'portable', true),
    ('Banana', 'edible', true),
    ('Banana', 'alive', false),
    ('Banana', 'has_legs', false),
    ('Banana', 'has_wheels', false),
    ('Banana', 'used_indoors', true),
    ('Banana', 'used_outdoors', true),
    ('Banana', 'contains_liquid', false),
    ('Banana', 'can_fly', false),
    ('Banana', 'is_animal', false),
    ('Banana', 'is_human', false),
    ('Banana', 'is_fictional', false),
    ('Banana', 'made_of_metal', false),

    ('Coffee', 'electronic', false),
    ('Coffee', 'portable', true),
    ('Coffee', 'edible', true),
    ('Coffee', 'alive', false),
    ('Coffee', 'has_legs', false),
    ('Coffee', 'has_wheels', false),
    ('Coffee', 'used_indoors', true),
    ('Coffee', 'used_outdoors', true),
    ('Coffee', 'contains_liquid', true),
    ('Coffee', 'can_fly', false),
    ('Coffee', 'is_animal', false),
    ('Coffee', 'is_human', false),
    ('Coffee', 'is_fictional', false),
    ('Coffee', 'made_of_metal', false)
) as k(entity_name, attribute_name, value_boolean)
join public.entities e
  on e.canonical_name = k.entity_name
join public.attributes a
  on a.name = k.attribute_name
on conflict (entity_id, attribute_id)
do update set
  value_boolean = excluded.value_boolean,
  confidence = excluded.confidence,
  evidence_count = excluded.evidence_count,
  positive_evidence = excluded.positive_evidence,
  negative_evidence = excluded.negative_evidence,
  updated_at = now();
