-- ============================================================
-- M20 Batch 16A
-- Dataset expansion + first-class entity aliases
-- ============================================================

-- ============================================================
-- ENTITY ALIASES
-- ============================================================

create table if not exists public.entity_aliases (
  id uuid primary key default gen_random_uuid(),

  entity_id uuid not null
    references public.entities(id)
    on delete restrict,

  alias text not null,
  normalized_alias text not null,

  created_at timestamptz not null default now(),

  constraint entity_aliases_alias_not_blank
    check (length(trim(alias)) > 0),

  constraint entity_aliases_normalized_not_blank
    check (length(trim(normalized_alias)) > 0),

  constraint entity_aliases_entity_alias_unique
    unique (entity_id, normalized_alias),

  constraint entity_aliases_normalized_unique
    unique (normalized_alias)
);

create index if not exists idx_entity_aliases_entity
  on public.entity_aliases(entity_id);

create index if not exists idx_entity_aliases_normalized
  on public.entity_aliases(normalized_alias);

-- ============================================================
-- ADDITIONAL CATEGORIES
-- ============================================================

insert into public.categories (name, description)
values
  ('Technology', 'Common electronic and computing devices'),
  ('Vehicles', 'Common vehicles and transportation'),
  ('Household', 'Common household and personal-use objects')
on conflict (name) do nothing;

-- ============================================================
-- ADDITIONAL ATTRIBUTES
-- ============================================================

insert into public.attributes (name, description, value_type)
values
  ('has_screen', 'Has a visible electronic display screen', 'BOOLEAN'),
  ('has_buttons', 'Normally has physical or interactive buttons', 'BOOLEAN'),
  ('has_fur', 'Normally has fur or hair covering the body', 'BOOLEAN'),
  ('has_beak', 'Has a beak', 'BOOLEAN'),
  ('has_tail', 'Normally has a tail', 'BOOLEAN'),
  ('has_feathers', 'Has feathers', 'BOOLEAN'),
  ('lives_in_water', 'Normally lives in water', 'BOOLEAN'),
  ('is_plant', 'Is a plant', 'BOOLEAN'),
  ('is_fruit', 'Is a fruit', 'BOOLEAN'),
  ('is_vegetable', 'Is a vegetable', 'BOOLEAN'),
  ('is_beverage', 'Is a beverage or drink', 'BOOLEAN'),
  ('has_engine', 'Has an engine or motor', 'BOOLEAN'),
  ('has_four_wheels', 'Normally has four wheels', 'BOOLEAN'),
  ('has_two_wheels', 'Normally has two wheels', 'BOOLEAN'),
  ('can_be_driven', 'Can normally be driven', 'BOOLEAN'),
  ('used_for_cooking', 'Commonly used for cooking or food preparation', 'BOOLEAN'),
  ('used_for_cleaning', 'Commonly used for cleaning', 'BOOLEAN'),
  ('made_of_glass', 'Contains substantial glass construction', 'BOOLEAN'),
  ('made_of_plastic', 'Contains substantial plastic construction', 'BOOLEAN'),
  ('made_of_wood', 'Contains substantial wood construction', 'BOOLEAN')
on conflict (name) do nothing;

-- ============================================================
-- ADDITIONAL QUESTIONS
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
    ('Does it have a screen?', 'has_screen', 'Physical Properties'),
    ('Does it have buttons?', 'has_buttons', 'Physical Properties'),
    ('Does it have fur?', 'has_fur', 'Biological'),
    ('Does it have a beak?', 'has_beak', 'Biological'),
    ('Does it normally have a tail?', 'has_tail', 'Biological'),
    ('Does it have feathers?', 'has_feathers', 'Biological'),
    ('Does it normally live in water?', 'lives_in_water', 'Biological'),
    ('Is it a plant?', 'is_plant', 'Biological'),
    ('Is it a fruit?', 'is_fruit', 'Biological'),
    ('Is it a vegetable?', 'is_vegetable', 'Biological'),
    ('Is it a beverage?', 'is_beverage', 'Composition'),
    ('Does it have an engine or motor?', 'has_engine', 'Composition'),
    ('Does it normally have four wheels?', 'has_four_wheels', 'Physical Properties'),
    ('Does it normally have two wheels?', 'has_two_wheels', 'Physical Properties'),
    ('Can it normally be driven?', 'can_be_driven', 'Usage'),
    ('Is it commonly used for cooking?', 'used_for_cooking', 'Usage'),
    ('Is it commonly used for cleaning?', 'used_for_cleaning', 'Usage'),
    ('Is it substantially made of glass?', 'made_of_glass', 'Composition'),
    ('Is it substantially made of plastic?', 'made_of_plastic', 'Composition'),
    ('Is it substantially made of wood?', 'made_of_wood', 'Composition')
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
-- ADDITIONAL ENTITIES
-- ============================================================

insert into public.entities (canonical_name, description)
values
  ('Tablet', 'A portable touchscreen computing device'),
  ('Television', 'An electronic device used to display video and audio'),
  ('Headphones', 'A wearable audio listening device'),
  ('Camera', 'A device used to capture photographs or video'),
  ('Keyboard', 'An input device with keys for entering information'),
  ('Mouse', 'A computer pointing and input device'),
  ('Printer', 'A device that produces physical copies of digital documents'),
  ('Refrigerator', 'An appliance used to keep food and drinks cold'),
  ('Microwave', 'An appliance used to heat food'),
  ('Washing Machine', 'An appliance used to wash clothes'),
  ('Car', 'A four-wheeled motor vehicle'),
  ('Motorcycle', 'A two-wheeled motor vehicle'),
  ('Bus', 'A large road vehicle used to transport passengers'),
  ('Train', 'A rail vehicle used to transport passengers or goods'),
  ('Airplane', 'A powered aircraft used for air travel'),
  ('Boat', 'A watercraft used for transportation or recreation'),
  ('Lion', 'A large wild cat'),
  ('Tiger', 'A large striped wild cat'),
  ('Elephant', 'A large land mammal with a trunk'),
  ('Horse', 'A domesticated hoofed mammal'),
  ('Cow', 'A domesticated bovine mammal'),
  ('Chicken', 'A domesticated bird commonly raised for eggs and meat'),
  ('Fish', 'An aquatic animal that lives in water'),
  ('Shark', 'A predatory fish with a cartilaginous skeleton'),
  ('Dolphin', 'An intelligent aquatic mammal'),
  ('Parrot', 'A colorful bird known for its curved beak'),
  ('Orange', 'A common citrus fruit'),
  ('Mango', 'A sweet tropical fruit'),
  ('Grape', 'A small edible fruit that grows in clusters'),
  ('Watermelon', 'A large fruit with juicy flesh'),
  ('Carrot', 'An edible orange root vegetable'),
  ('Potato', 'An edible starchy tuber'),
  ('Tomato', 'An edible red fruit commonly used as a vegetable'),
  ('Bread', 'A baked food made primarily from flour and water'),
  ('Rice', 'A common edible grain'),
  ('Milk', 'A dairy beverage'),
  ('Tea', 'A beverage commonly prepared by steeping leaves in hot water'),
  ('Juice', 'A beverage made from extracted fruit or vegetable liquid'),
  ('Chair', 'A piece of furniture designed for sitting'),
  ('Table', 'A piece of furniture with a flat surface'),
  ('Umbrella', 'A handheld object used for protection from rain or sun'),
  ('Backpack', 'A bag designed to be carried on the back'),
  ('Book', 'A bound collection of written or printed pages')
on conflict (canonical_name) do nothing;

-- ============================================================
-- ENTITY -> CATEGORY
-- ============================================================

insert into public.entity_categories (entity_id, category_id)
select e.id, c.id
from public.entities e
join public.categories c
  on c.name =
    case
      when e.canonical_name in (
        'Tablet',
        'Television',
        'Headphones',
        'Camera',
        'Keyboard',
        'Mouse',
        'Printer'
      ) then 'Technology'

      when e.canonical_name in (
        'Car',
        'Motorcycle',
        'Bus',
        'Train',
        'Airplane',
        'Boat'
      ) then 'Vehicles'

      when e.canonical_name in (
        'Refrigerator',
        'Microwave',
        'Washing Machine',
        'Chair',
        'Table',
        'Umbrella',
        'Backpack',
        'Book'
      ) then 'Household'

      when e.canonical_name in (
        'Lion',
        'Tiger',
        'Elephant',
        'Horse',
        'Cow',
        'Chicken',
        'Fish',
        'Shark',
        'Dolphin',
        'Parrot'
      ) then 'Animals'

      when e.canonical_name in (
        'Orange',
        'Mango',
        'Grape',
        'Watermelon',
        'Carrot',
        'Potato',
        'Tomato',
        'Bread',
        'Rice',
        'Milk',
        'Tea',
        'Juice'
      ) then 'Food & Drinks'

      else null
    end
where e.canonical_name in (
  'Tablet',
  'Television',
  'Headphones',
  'Camera',
  'Keyboard',
  'Mouse',
  'Printer',
  'Refrigerator',
  'Microwave',
  'Washing Machine',
  'Car',
  'Motorcycle',
  'Bus',
  'Train',
  'Airplane',
  'Boat',
  'Lion',
  'Tiger',
  'Elephant',
  'Horse',
  'Cow',
  'Chicken',
  'Fish',
  'Shark',
  'Dolphin',
  'Parrot',
  'Orange',
  'Mango',
  'Grape',
  'Watermelon',
  'Carrot',
  'Potato',
  'Tomato',
  'Bread',
  'Rice',
  'Milk',
  'Tea',
  'Juice',
  'Chair',
  'Table',
  'Umbrella',
  'Backpack',
  'Book'
)
on conflict do nothing;

-- ============================================================
-- ALIASES
-- ============================================================

insert into public.entity_aliases (
  entity_id,
  alias,
  normalized_alias
)
select
  e.id,
  a.alias,
  lower(trim(a.alias))
from (
  values
    ('Tablet', 'Tablet Computer'),
    ('Tablet', 'Tab'),
    ('Television', 'TV'),
    ('Television', 'Television Set'),
    ('Headphones', 'Headset'),
    ('Camera', 'Digital Camera'),
    ('Keyboard', 'Computer Keyboard'),
    ('Mouse', 'Computer Mouse'),
    ('Printer', 'Computer Printer'),
    ('Refrigerator', 'Fridge'),
    ('Microwave', 'Microwave Oven'),
    ('Washing Machine', 'Washer'),
    ('Car', 'Automobile'),
    ('Car', 'Motorcar'),
    ('Motorcycle', 'Motorbike'),
    ('Bus', 'Coach'),
    ('Airplane', 'Aeroplane'),
    ('Boat', 'Watercraft'),
    ('Lion', 'Big Cat'),
    ('Tiger', 'Big Cat Tiger'),
    ('Elephant', 'Elephant'),
    ('Horse', 'Equine'),
    ('Cow', 'Cattle'),
    ('Chicken', 'Hen'),
    ('Fish', 'Fish'),
    ('Shark', 'Shark'),
    ('Dolphin', 'Dolphin'),
    ('Parrot', 'Parakeet'),
    ('Orange', 'Orange Fruit'),
    ('Mango', 'Mango Fruit'),
    ('Grape', 'Grapes'),
    ('Watermelon', 'Melon'),
    ('Carrot', 'Carrot Root'),
    ('Potato', 'Potato Root'),
    ('Tomato', 'Tomato Fruit'),
    ('Bread', 'Loaf'),
    ('Rice', 'Rice Grain'),
    ('Milk', 'Dairy Milk'),
    ('Tea', 'Chai'),
    ('Juice', 'Fruit Juice'),
    ('Chair', 'Seat'),
    ('Table', 'Desk'),
    ('Umbrella', 'Rain Umbrella'),
    ('Backpack', 'Rucksack'),
    ('Book', 'Textbook')
) as a(entity_name, alias)
join public.entities e
  on e.canonical_name = a.entity_name
on conflict (normalized_alias) do nothing;

-- ============================================================
-- CURATED KNOWLEDGE
-- ============================================================
--
-- Only the newly introduced attributes are populated here.
-- Existing knowledge remains untouched.
-- confidence/evidence fields match the curated development
-- baseline used by the original seed.
--

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
    -- Technology
    ('Tablet', 'has_screen', true),
    ('Tablet', 'has_buttons', true),
    ('Tablet', 'made_of_glass', true),
    ('Tablet', 'made_of_plastic', true),
    ('Television', 'has_screen', true),
    ('Television', 'has_buttons', true),
    ('Television', 'made_of_glass', true),
    ('Television', 'made_of_plastic', true),
    ('Headphones', 'has_screen', false),
    ('Headphones', 'has_buttons', true),
    ('Headphones', 'made_of_plastic', true),
    ('Camera', 'has_screen', true),
    ('Camera', 'has_buttons', true),
    ('Camera', 'made_of_glass', true),
    ('Camera', 'made_of_plastic', true),
    ('Keyboard', 'has_screen', false),
    ('Keyboard', 'has_buttons', true),
    ('Keyboard', 'made_of_plastic', true),
    ('Mouse', 'has_screen', false),
    ('Mouse', 'has_buttons', true),
    ('Mouse', 'made_of_plastic', true),
    ('Printer', 'has_screen', false),
    ('Printer', 'has_buttons', true),
    ('Printer', 'made_of_plastic', true),

    -- Household
    ('Refrigerator', 'has_screen', false),
    ('Refrigerator', 'has_buttons', true),
    ('Refrigerator', 'made_of_metal', true),
    ('Microwave', 'has_screen', true),
    ('Microwave', 'has_buttons', true),
    ('Microwave', 'used_for_cooking', true),
    ('Microwave', 'made_of_metal', true),
    ('Washing Machine', 'has_screen', true),
    ('Washing Machine', 'has_buttons', true),
    ('Washing Machine', 'used_for_cleaning', true),
    ('Washing Machine', 'made_of_metal', true),
    ('Chair', 'has_screen', false),
    ('Chair', 'made_of_wood', true),
    ('Table', 'has_screen', false),
    ('Table', 'made_of_wood', true),
    ('Umbrella', 'made_of_plastic', true),
    ('Backpack', 'made_of_plastic', true),
    ('Book', 'has_screen', false),
    ('Book', 'made_of_wood', false),

    -- Vehicles
    ('Car', 'has_engine', true),
    ('Car', 'has_four_wheels', true),
    ('Car', 'can_be_driven', true),
    ('Car', 'made_of_metal', true),
    ('Motorcycle', 'has_engine', true),
    ('Motorcycle', 'has_two_wheels', true),
    ('Motorcycle', 'can_be_driven', true),
    ('Motorcycle', 'made_of_metal', true),
    ('Bus', 'has_engine', true),
    ('Bus', 'has_four_wheels', true),
    ('Bus', 'can_be_driven', true),
    ('Bus', 'made_of_metal', true),
    ('Train', 'has_engine', true),
    ('Train', 'can_be_driven', false),
    ('Train', 'made_of_metal', true),
    ('Airplane', 'has_engine', true),
    ('Airplane', 'can_be_driven', false),
    ('Airplane', 'made_of_metal', true),
    ('Boat', 'has_engine', true),
    ('Boat', 'lives_in_water', false),
    ('Boat', 'made_of_metal', true),

    -- Animals
    ('Lion', 'has_fur', true),
    ('Lion', 'has_tail', true),
    ('Lion', 'is_animal', true),
    ('Tiger', 'has_fur', true),
    ('Tiger', 'has_tail', true),
    ('Tiger', 'is_animal', true),
    ('Elephant', 'has_fur', false),
    ('Elephant', 'has_tail', true),
    ('Elephant', 'is_animal', true),
    ('Horse', 'has_fur', true),
    ('Horse', 'has_tail', true),
    ('Horse', 'is_animal', true),
    ('Cow', 'has_fur', true),
    ('Cow', 'has_tail', true),
    ('Cow', 'is_animal', true),
    ('Chicken', 'has_feathers', true),
    ('Chicken', 'has_beak', true),
    ('Chicken', 'is_animal', true),
    ('Fish', 'lives_in_water', true),
    ('Fish', 'has_fur', false),
    ('Fish', 'is_animal', true),
    ('Shark', 'lives_in_water', true),
    ('Shark', 'has_fur', false),
    ('Shark', 'is_animal', true),
    ('Dolphin', 'lives_in_water', true),
    ('Dolphin', 'has_fur', false),
    ('Dolphin', 'is_animal', true),
    ('Parrot', 'has_feathers', true),
    ('Parrot', 'has_beak', true),
    ('Parrot', 'is_animal', true),

    -- Food & Drinks
    ('Orange', 'is_fruit', true),
    ('Orange', 'edible', true),
    ('Mango', 'is_fruit', true),
    ('Mango', 'edible', true),
    ('Grape', 'is_fruit', true),
    ('Grape', 'edible', true),
    ('Watermelon', 'is_fruit', true),
    ('Watermelon', 'edible', true),
    ('Carrot', 'is_vegetable', true),
    ('Carrot', 'edible', true),
    ('Carrot', 'used_for_cooking', true),
    ('Potato', 'is_vegetable', true),
    ('Potato', 'edible', true),
    ('Potato', 'used_for_cooking', true),
    ('Tomato', 'is_fruit', true),
    ('Tomato', 'edible', true),
    ('Tomato', 'used_for_cooking', true),
    ('Bread', 'edible', true),
    ('Bread', 'used_for_cooking', true),
    ('Rice', 'edible', true),
    ('Rice', 'used_for_cooking', true),
    ('Milk', 'edible', true),
    ('Milk', 'is_beverage', true),
    ('Milk', 'contains_liquid', true),
    ('Tea', 'edible', false),
    ('Tea', 'is_beverage', true),
    ('Tea', 'contains_liquid', true),
    ('Juice', 'edible', false),
    ('Juice', 'is_beverage', true),
    ('Juice', 'contains_liquid', true)
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

-- ============================================================
-- RLS / CLIENT ACCESS
-- ============================================================

alter table public.entity_aliases enable row level security;

drop policy if exists "Authenticated users can read entity aliases"
  on public.entity_aliases;

create policy "Authenticated users can read entity aliases"
  on public.entity_aliases
  for select
  to authenticated
  using (true);

revoke all on public.entity_aliases from anon;
revoke all on public.entity_aliases from authenticated;

grant select on public.entity_aliases to authenticated;
