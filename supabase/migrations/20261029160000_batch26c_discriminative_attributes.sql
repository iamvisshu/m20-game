-- Batch 26C
-- Targeted discriminative attributes for the current live failure clusters.
-- Local migration only; do not push until verification passes.

insert into public.attributes (name, description, value_type, active)
values
  ('fits_in_pocket', 'Can the object normally fit in a pocket?', 'BOOLEAN', true),
  ('barks', 'Does the animal bark?', 'BOOLEAN', true),
  ('meows', 'Does the animal meow?', 'BOOLEAN', true),
  ('used_for_audio', 'Is the object primarily used for listening to or producing audio?', 'BOOLEAN', true),
  ('used_for_computer_input', 'Is the object primarily used to provide input to a computer?', 'BOOLEAN', true),
  ('worn_on_head', 'Is the object normally worn on the head?', 'BOOLEAN', true),
  ('travels_on_rails', 'Does the vehicle normally travel on rails?', 'BOOLEAN', true),
  ('travels_on_water', 'Does the vehicle normally travel on water?', 'BOOLEAN', true),
  ('has_hooves', 'Does the animal have hooves?', 'BOOLEAN', true),
  ('has_stripes', 'Does the animal normally have visible stripes?', 'BOOLEAN', true),
  ('is_mammal', 'Is the animal a mammal?', 'BOOLEAN', true),
  ('has_gills', 'Does the animal breathe using gills?', 'BOOLEAN', true),
  ('is_citrus', 'Is the fruit a citrus fruit?', 'BOOLEAN', true),
  ('is_grain', 'Is the food a grain or grain-based staple?', 'BOOLEAN', true),
  ('is_baked_food', 'Is the food normally prepared by baking?', 'BOOLEAN', true)
on conflict (name) do nothing;

insert into public.questions
  (text, primary_attribute_id, active)
select
  v.question_text,
  a.id,
  true
from (
  values
    ('Can it fit in a pocket?', 'fits_in_pocket'),
    ('Does it bark?', 'barks'),
    ('Does it meow?', 'meows'),
    ('Is it used for audio?', 'used_for_audio'),
    ('Is it used for computer input?', 'used_for_computer_input'),
    ('Is it worn on the head?', 'worn_on_head'),
    ('Does it travel on rails?', 'travels_on_rails'),
    ('Does it travel on water?', 'travels_on_water'),
    ('Does it have hooves?', 'has_hooves'),
    ('Does it have stripes?', 'has_stripes'),
    ('Is it a mammal?', 'is_mammal'),
    ('Does it have gills?', 'has_gills'),
    ('Is it a citrus fruit?', 'is_citrus'),
    ('Is it a grain or grain-based food?', 'is_grain'),
    ('Is it normally prepared by baking?', 'is_baked_food')
) as v(question_text, attribute_name)
join public.attributes a
  on a.name = v.attribute_name
where not exists (
  select 1
  from public.questions q
  where q.text = v.question_text
);
