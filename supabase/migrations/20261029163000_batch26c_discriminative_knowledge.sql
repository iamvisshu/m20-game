-- Batch 26C: targeted discriminative knowledge
-- Generated from the known failure clusters.

with values(entity_name, attribute_name, value_boolean) as (
  values
    ('Laptop', 'fits_in_pocket', false),
    ('Smartphone', 'fits_in_pocket', true),
    ('Cat', 'barks', false),
    ('Dog', 'barks', true),
    ('Cat', 'meows', true),
    ('Dog', 'meows', false),
    ('Mouse', 'used_for_audio', false),
    ('Headphones', 'used_for_audio', true),
    ('Mouse', 'used_for_computer_input', true),
    ('Headphones', 'used_for_computer_input', false),
    ('Mouse', 'worn_on_head', false),
    ('Headphones', 'worn_on_head', true),
    ('Car', 'travels_on_rails', false),
    ('Motorcycle', 'travels_on_rails', false),
    ('Bus', 'travels_on_rails', false),
    ('Train', 'travels_on_rails', true),
    ('Airplane', 'travels_on_rails', false),
    ('Boat', 'travels_on_rails', false),
    ('Car', 'travels_on_water', false),
    ('Motorcycle', 'travels_on_water', false),
    ('Bus', 'travels_on_water', false),
    ('Train', 'travels_on_water', false),
    ('Airplane', 'travels_on_water', false),
    ('Boat', 'travels_on_water', true),
    ('Tiger', 'has_hooves', false),
    ('Lion', 'has_hooves', false),
    ('Horse', 'has_hooves', true),
    ('Cow', 'has_hooves', true),
    ('Tiger', 'has_stripes', true),
    ('Lion', 'has_stripes', false),
    ('Horse', 'has_stripes', false),
    ('Cow', 'has_stripes', false),
    ('Shark', 'is_mammal', false),
    ('Dolphin', 'is_mammal', true),
    ('Fish', 'is_mammal', false),
    ('Shark', 'has_gills', true),
    ('Dolphin', 'has_gills', false),
    ('Fish', 'has_gills', true),
    ('Mango', 'is_citrus', false),
    ('Orange', 'is_citrus', true),
    ('Grape', 'is_citrus', false),
    ('Potato', 'is_grain', false),
    ('Carrot', 'is_grain', false),
    ('Bread', 'is_grain', true),
    ('Rice', 'is_grain', true),
    ('Potato', 'is_baked_food', false),
    ('Carrot', 'is_baked_food', false),
    ('Bread', 'is_baked_food', true),
    ('Rice', 'is_baked_food', false)
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
  v.value_boolean,
  1.0,
  1,
  case when v.value_boolean then 1 else 0 end,
  case when v.value_boolean then 0 else 1 end
from values v
join public.entities e on e.canonical_name = v.entity_name
join public.attributes a on a.name = v.attribute_name
on conflict (entity_id, attribute_id) do update
set
  value_boolean = excluded.value_boolean,
  confidence = excluded.confidence,
  evidence_count = excluded.evidence_count,
  positive_evidence = excluded.positive_evidence,
  negative_evidence = excluded.negative_evidence,
  updated_at = now();
