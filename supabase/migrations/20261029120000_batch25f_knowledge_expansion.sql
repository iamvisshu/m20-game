-- Batch 25F: Knowledge coverage expansion
-- Purpose:
--   Expand knowledge for all question-backed attributes.
--   Existing knowledge is preserved.
--   Legacy/non-question attributes are intentionally excluded.
--   Missing pairs are inserted only when explicitly curated below.

with curated(entity_name, attribute_name, value_boolean) as (
  values

  -- Technology
  ('Smartphone','has_screen',true),
  ('Smartphone','has_buttons',true),
  ('Smartphone','has_fur',false),
  ('Smartphone','has_beak',false),
  ('Smartphone','has_tail',false),
  ('Smartphone','has_feathers',false),
  ('Smartphone','lives_in_water',false),
  ('Smartphone','is_plant',false),
  ('Smartphone','is_fruit',false),
  ('Smartphone','is_vegetable',false),
  ('Smartphone','is_beverage',false),
  ('Smartphone','has_engine',false),
  ('Smartphone','has_four_wheels',false),
  ('Smartphone','has_two_wheels',false),
  ('Smartphone','can_be_driven',false),
  ('Smartphone','used_for_cooking',false),
  ('Smartphone','used_for_cleaning',false),
  ('Smartphone','made_of_glass',true),
  ('Smartphone','made_of_plastic',true),
  ('Smartphone','made_of_wood',false),

  ('Laptop','has_screen',true),
  ('Laptop','has_buttons',true),
  ('Laptop','has_fur',false),
  ('Laptop','has_beak',false),
  ('Laptop','has_tail',false),
  ('Laptop','has_feathers',false),
  ('Laptop','lives_in_water',false),
  ('Laptop','is_plant',false),
  ('Laptop','is_fruit',false),
  ('Laptop','is_vegetable',false),
  ('Laptop','is_beverage',false),
  ('Laptop','has_engine',false),
  ('Laptop','has_four_wheels',false),
  ('Laptop','has_two_wheels',false),
  ('Laptop','can_be_driven',false),
  ('Laptop','used_for_cooking',false),
  ('Laptop','used_for_cleaning',false),
  ('Laptop','made_of_glass',true),
  ('Laptop','made_of_plastic',true),
  ('Laptop','made_of_wood',false),

  ('Tablet','has_screen',true),
  ('Tablet','has_buttons',false),
  ('Tablet','has_fur',false),
  ('Tablet','has_beak',false),
  ('Tablet','has_tail',false),
  ('Tablet','has_feathers',false),
  ('Tablet','lives_in_water',false),
  ('Tablet','is_plant',false),
  ('Tablet','is_fruit',false),
  ('Tablet','is_vegetable',false),
  ('Tablet','is_beverage',false),
  ('Tablet','has_engine',false),
  ('Tablet','has_four_wheels',false),
  ('Tablet','has_two_wheels',false),
  ('Tablet','can_be_driven',false),
  ('Tablet','used_for_cooking',false),
  ('Tablet','used_for_cleaning',false),
  ('Tablet','made_of_glass',true),
  ('Tablet','made_of_plastic',true),
  ('Tablet','made_of_wood',false),

  -- Household
  ('Chair','has_screen',false),
  ('Chair','has_buttons',false),
  ('Chair','has_fur',false),
  ('Chair','has_beak',false),
  ('Chair','has_tail',false),
  ('Chair','has_feathers',false),
  ('Chair','lives_in_water',false),
  ('Chair','is_plant',false),
  ('Chair','is_fruit',false),
  ('Chair','is_vegetable',false),
  ('Chair','is_beverage',false),
  ('Chair','has_engine',false),
  ('Chair','has_four_wheels',false),
  ('Chair','has_two_wheels',false),
  ('Chair','can_be_driven',false),
  ('Chair','used_for_cooking',false),
  ('Chair','used_for_cleaning',false),
  ('Chair','made_of_glass',false),
  ('Chair','made_of_plastic',false),
  ('Chair','made_of_wood',true),

  ('Table','has_screen',false),
  ('Table','has_buttons',false),
  ('Table','has_fur',false),
  ('Table','has_beak',false),
  ('Table','has_tail',false),
  ('Table','has_feathers',false),
  ('Table','lives_in_water',false),
  ('Table','is_plant',false),
  ('Table','is_fruit',false),
  ('Table','is_vegetable',false),
  ('Table','is_beverage',false),
  ('Table','has_engine',false),
  ('Table','has_four_wheels',false),
  ('Table','has_two_wheels',false),
  ('Table','can_be_driven',false),
  ('Table','used_for_cooking',false),
  ('Table','used_for_cleaning',false),
  ('Table','made_of_glass',false),
  ('Table','made_of_plastic',false),
  ('Table','made_of_wood',true),

  ('Umbrella','has_screen',false),
  ('Umbrella','has_buttons',false),
  ('Umbrella','has_fur',false),
  ('Umbrella','has_beak',false),
  ('Umbrella','has_tail',false),
  ('Umbrella','has_feathers',false),
  ('Umbrella','lives_in_water',false),
  ('Umbrella','is_plant',false),
  ('Umbrella','is_fruit',false),
  ('Umbrella','is_vegetable',false),
  ('Umbrella','is_beverage',false),
  ('Umbrella','has_engine',false),
  ('Umbrella','has_four_wheels',false),
  ('Umbrella','has_two_wheels',false),
  ('Umbrella','can_be_driven',false),
  ('Umbrella','used_for_cooking',false),
  ('Umbrella','used_for_cleaning',false),
  ('Umbrella','made_of_glass',false),
  ('Umbrella','made_of_plastic',true),
  ('Umbrella','made_of_wood',false),

  ('Backpack','has_screen',false),
  ('Backpack','has_buttons',false),
  ('Backpack','has_fur',false),
  ('Backpack','has_beak',false),
  ('Backpack','has_tail',false),
  ('Backpack','has_feathers',false),
  ('Backpack','lives_in_water',false),
  ('Backpack','is_plant',false),
  ('Backpack','is_fruit',false),
  ('Backpack','is_vegetable',false),
  ('Backpack','is_beverage',false),
  ('Backpack','has_engine',false),
  ('Backpack','has_four_wheels',false),
  ('Backpack','has_two_wheels',false),
  ('Backpack','can_be_driven',false),
  ('Backpack','used_for_cooking',false),
  ('Backpack','used_for_cleaning',false),
  ('Backpack','made_of_glass',false),
  ('Backpack','made_of_plastic',true),
  ('Backpack','made_of_wood',false)

)
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
  c.value_boolean,
  1.0,
  10,
  case when c.value_boolean then 10 else 0 end,
  case when c.value_boolean then 0 else 10 end
from curated c
join public.entities e
  on e.canonical_name = c.entity_name
join public.attributes a
  on a.name = c.attribute_name
where exists (
  select 1
  from public.questions q
  where q.primary_attribute_id = a.id
)
on conflict (entity_id, attribute_id) do nothing;
