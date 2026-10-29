-- M20 Batch 25D
-- Conservative knowledge expansion.
-- Only explicitly curated facts are inserted.
-- Existing knowledge is never overwritten.
-- Legacy/non-question attributes are intentionally excluded.

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
  f.value_boolean,
  0.95,
  5,
  case when f.value_boolean then 5 else 0 end,
  case when f.value_boolean then 0 else 5 end
from (
  values

  -- ============================================================
  -- ELECTRONIC
  -- ============================================================
  ('Smartphone','electronic',true),
  ('Laptop','electronic',true),
  ('Tablet','electronic',true),
  ('Television','electronic',true),
  ('Headphones','electronic',true),
  ('Camera','electronic',true),
  ('Keyboard','electronic',true),
  ('Mouse','electronic',true),
  ('Printer','electronic',true),
  ('Refrigerator','electronic',true),
  ('Microwave','electronic',true),
  ('Washing Machine','electronic',true),

  ('Water Bottle','electronic',false),
  ('Bicycle','electronic',false),
  ('Dog','electronic',false),
  ('Cat','electronic',false),
  ('Eagle','electronic',false),
  ('Apple','electronic',false),
  ('Banana','electronic',false),
  ('Coffee','electronic',false),
  ('Car','electronic',false),
  ('Motorcycle','electronic',false),
  ('Bus','electronic',false),
  ('Train','electronic',false),
  ('Airplane','electronic',false),
  ('Boat','electronic',false),
  ('Lion','electronic',false),
  ('Tiger','electronic',false),
  ('Elephant','electronic',false),
  ('Horse','electronic',false),
  ('Cow','electronic',false),
  ('Chicken','electronic',false),
  ('Fish','electronic',false),
  ('Shark','electronic',false),
  ('Dolphin','electronic',false),
  ('Parrot','electronic',false),
  ('Orange','electronic',false),
  ('Mango','electronic',false),
  ('Grape','electronic',false),
  ('Watermelon','electronic',false),
  ('Carrot','electronic',false),
  ('Potato','electronic',false),
  ('Tomato','electronic',false),
  ('Bread','electronic',false),
  ('Rice','electronic',false),
  ('Milk','electronic',false),
  ('Tea','electronic',false),
  ('Juice','electronic',false),
  ('Chair','electronic',false),
  ('Table','electronic',false),
  ('Umbrella','electronic',false),
  ('Backpack','electronic',false),
  ('Book','electronic',false),

  -- ============================================================
  -- SCREEN
  -- ============================================================
  ('Smartphone','has_screen',true),
  ('Laptop','has_screen',true),
  ('Tablet','has_screen',true),
  ('Television','has_screen',true),
  ('Camera','has_screen',true),
  ('Printer','has_screen',false),
  ('Keyboard','has_screen',false),
  ('Mouse','has_screen',false),
  ('Headphones','has_screen',false),
  ('Refrigerator','has_screen',false),
  ('Microwave','has_screen',false),
  ('Washing Machine','has_screen',false),

  -- ============================================================
  -- BUTTONS
  -- ============================================================
  ('Smartphone','has_buttons',true),
  ('Laptop','has_buttons',true),
  ('Tablet','has_buttons',false),
  ('Television','has_buttons',true),
  ('Headphones','has_buttons',true),
  ('Camera','has_buttons',true),
  ('Keyboard','has_buttons',true),
  ('Mouse','has_buttons',true),
  ('Printer','has_buttons',true),
  ('Refrigerator','has_buttons',true),
  ('Microwave','has_buttons',true),
  ('Washing Machine','has_buttons',true),

  -- ============================================================
  -- FUR / BEAK / FEATHERS
  -- ============================================================
  ('Dog','has_fur',true),
  ('Cat','has_fur',true),
  ('Lion','has_fur',true),
  ('Tiger','has_fur',true),
  ('Elephant','has_fur',false),
  ('Horse','has_fur',true),
  ('Cow','has_fur',true),
  ('Chicken','has_fur',false),
  ('Fish','has_fur',false),
  ('Shark','has_fur',false),
  ('Dolphin','has_fur',false),
  ('Parrot','has_fur',false),
  ('Eagle','has_fur',false),

  ('Eagle','has_beak',true),
  ('Chicken','has_beak',true),
  ('Parrot','has_beak',true),
  ('Dog','has_beak',false),
  ('Cat','has_beak',false),
  ('Lion','has_beak',false),
  ('Tiger','has_beak',false),
  ('Elephant','has_beak',false),
  ('Horse','has_beak',false),
  ('Cow','has_beak',false),
  ('Fish','has_beak',false),
  ('Shark','has_beak',false),
  ('Dolphin','has_beak',false),

  ('Eagle','has_feathers',true),
  ('Chicken','has_feathers',true),
  ('Parrot','has_feathers',true),
  ('Dog','has_feathers',false),
  ('Cat','has_feathers',false),
  ('Lion','has_feathers',false),
  ('Tiger','has_feathers',false),
  ('Elephant','has_feathers',false),
  ('Horse','has_feathers',false),
  ('Cow','has_feathers',false),
  ('Fish','has_feathers',false),
  ('Shark','has_feathers',false),
  ('Dolphin','has_feathers',false),

  -- ============================================================
  -- TAIL
  -- ============================================================
  ('Dog','has_tail',true),
  ('Cat','has_tail',true),
  ('Eagle','has_tail',true),
  ('Lion','has_tail',true),
  ('Tiger','has_tail',true),
  ('Elephant','has_tail',true),
  ('Horse','has_tail',true),
  ('Cow','has_tail',true),
  ('Chicken','has_tail',true),
  ('Fish','has_tail',true),
  ('Shark','has_tail',true),
  ('Dolphin','has_tail',true),
  ('Parrot','has_tail',true),

  -- ============================================================
  -- WATER
  -- ============================================================
  ('Fish','lives_in_water',true),
  ('Shark','lives_in_water',true),
  ('Dolphin','lives_in_water',true),
  ('Boat','lives_in_water',true),
  ('Water Bottle','lives_in_water',false),
  ('Dog','lives_in_water',false),
  ('Cat','lives_in_water',false),
  ('Eagle','lives_in_water',false),
  ('Lion','lives_in_water',false),
  ('Tiger','lives_in_water',false),
  ('Elephant','lives_in_water',false),
  ('Horse','lives_in_water',false),
  ('Cow','lives_in_water',false),
  ('Chicken','lives_in_water',false),
  ('Parrot','lives_in_water',false),

  -- ============================================================
  -- PLANT
  -- Current dataset contains no plants.
  -- Explicitly known false for all current entities.
  -- ============================================================
  ('Water Bottle','is_plant',false),
  ('Smartphone','is_plant',false),
  ('Laptop','is_plant',false),
  ('Bicycle','is_plant',false),
  ('Dog','is_plant',false),
  ('Cat','is_plant',false),
  ('Eagle','is_plant',false),
  ('Apple','is_plant',false),
  ('Banana','is_plant',false),
  ('Coffee','is_plant',false),
  ('Tablet','is_plant',false),
  ('Television','is_plant',false),
  ('Headphones','is_plant',false),
  ('Camera','is_plant',false),
  ('Keyboard','is_plant',false),
  ('Mouse','is_plant',false),
  ('Printer','is_plant',false),
  ('Refrigerator','is_plant',false),
  ('Microwave','is_plant',false),
  ('Washing Machine','is_plant',false),
  ('Chair','is_plant',false),
  ('Table','is_plant',false),
  ('Umbrella','is_plant',false),
  ('Backpack','is_plant',false),
  ('Book','is_plant',false),
  ('Car','is_plant',false),
  ('Motorcycle','is_plant',false),
  ('Bus','is_plant',false),
  ('Train','is_plant',false),
  ('Airplane','is_plant',false),
  ('Boat','is_plant',false),
  ('Lion','is_plant',false),
  ('Tiger','is_plant',false),
  ('Elephant','is_plant',false),
  ('Horse','is_plant',false),
  ('Cow','is_plant',false),
  ('Chicken','is_plant',false),
  ('Fish','is_plant',false),
  ('Shark','is_plant',false),
  ('Dolphin','is_plant',false),
  ('Parrot','is_plant',false),
  ('Orange','is_plant',false),
  ('Mango','is_plant',false),
  ('Grape','is_plant',false),
  ('Watermelon','is_plant',false),
  ('Carrot','is_plant',false),
  ('Potato','is_plant',false),
  ('Tomato','is_plant',false),
  ('Bread','is_plant',false),
  ('Rice','is_plant',false),
  ('Milk','is_plant',false),
  ('Tea','is_plant',false),
  ('Juice','is_plant',false),

  -- ============================================================
  -- FRUIT
  -- ============================================================
  ('Apple','is_fruit',true),
  ('Banana','is_fruit',true),
  ('Orange','is_fruit',true),
  ('Mango','is_fruit',true),
  ('Grape','is_fruit',true),
  ('Watermelon','is_fruit',true),
  ('Tomato','is_fruit',true),
  ('Carrot','is_fruit',false),
  ('Potato','is_fruit',false),
  ('Bread','is_fruit',false),
  ('Rice','is_fruit',false),
  ('Milk','is_fruit',false),
  ('Tea','is_fruit',false),
  ('Juice','is_fruit',false),

  -- ============================================================
  -- VEGETABLE
  -- ============================================================
  ('Carrot','is_vegetable',true),
  ('Potato','is_vegetable',true),
  ('Tomato','is_vegetable',true),
  ('Apple','is_vegetable',false),
  ('Banana','is_vegetable',false),
  ('Orange','is_vegetable',false),
  ('Mango','is_vegetable',false),
  ('Grape','is_vegetable',false),
  ('Watermelon','is_vegetable',false),
  ('Bread','is_vegetable',false),
  ('Rice','is_vegetable',false),
  ('Milk','is_vegetable',false),
  ('Tea','is_vegetable',false),
  ('Juice','is_vegetable',false),

  -- ============================================================
  -- BEVERAGE
  -- ============================================================
  ('Coffee','is_beverage',true),
  ('Milk','is_beverage',true),
  ('Tea','is_beverage',true),
  ('Juice','is_beverage',true),
  ('Water Bottle','is_beverage',false),
  ('Apple','is_beverage',false),
  ('Banana','is_beverage',false),
  ('Orange','is_beverage',false),
  ('Mango','is_beverage',false),
  ('Grape','is_beverage',false),
  ('Watermelon','is_beverage',false),
  ('Carrot','is_beverage',false),
  ('Potato','is_beverage',false),
  ('Tomato','is_beverage',false),
  ('Bread','is_beverage',false),
  ('Rice','is_beverage',false),

  -- ============================================================
  -- VEHICLE / ENGINE / WHEELS
  -- ============================================================
  ('Car','has_engine',true),
  ('Motorcycle','has_engine',true),
  ('Bus','has_engine',true),
  ('Train','has_engine',true),
  ('Airplane','has_engine',true),
  ('Boat','has_engine',true),
  ('Bicycle','has_engine',false),

  ('Car','has_four_wheels',true),
  ('Bus','has_four_wheels',true),
  ('Train','has_four_wheels',true),
  ('Airplane','has_four_wheels',false),
  ('Boat','has_four_wheels',false),
  ('Motorcycle','has_four_wheels',false),
  ('Bicycle','has_four_wheels',false),

  ('Bicycle','has_two_wheels',true),
  ('Motorcycle','has_two_wheels',true),
  ('Car','has_two_wheels',false),
  ('Bus','has_two_wheels',false),
  ('Train','has_two_wheels',false),
  ('Airplane','has_two_wheels',false),
  ('Boat','has_two_wheels',false),

  ('Car','can_be_driven',true),
  ('Motorcycle','can_be_driven',true),
  ('Bus','can_be_driven',true),
  ('Train','can_be_driven',true),
  ('Airplane','can_be_driven',false),
  ('Boat','can_be_driven',false),
  ('Bicycle','can_be_driven',true),

  -- ============================================================
  -- COOKING / CLEANING
  -- ============================================================
  ('Microwave','used_for_cooking',true),
  ('Refrigerator','used_for_cooking',false),
  ('Washing Machine','used_for_cooking',false),
  ('Chair','used_for_cooking',false),
  ('Table','used_for_cooking',false),
  ('Umbrella','used_for_cooking',false),
  ('Backpack','used_for_cooking',false),
  ('Book','used_for_cooking',false),
  ('Printer','used_for_cooking',false),
  ('Keyboard','used_for_cooking',false),
  ('Mouse','used_for_cooking',false),
  ('Camera','used_for_cooking',false),

  ('Washing Machine','used_for_cleaning',true),
  ('Microwave','used_for_cleaning',false),
  ('Refrigerator','used_for_cleaning',false),
  ('Chair','used_for_cleaning',false),
  ('Table','used_for_cleaning',false),
  ('Umbrella','used_for_cleaning',false),
  ('Backpack','used_for_cleaning',false),
  ('Book','used_for_cleaning',false),

  -- ============================================================
  -- MATERIALS
  -- ============================================================
  ('Water Bottle','made_of_plastic',true),
  ('Smartphone','made_of_plastic',true),
  ('Laptop','made_of_plastic',true),
  ('Tablet','made_of_plastic',true),
  ('Keyboard','made_of_plastic',true),
  ('Mouse','made_of_plastic',true),
  ('Printer','made_of_plastic',true),
  ('Chair','made_of_plastic',false),
  ('Table','made_of_plastic',false),

  ('Chair','made_of_wood',true),
  ('Table','made_of_wood',true),
  ('Book','made_of_wood',false),
  ('Water Bottle','made_of_wood',false),
  ('Smartphone','made_of_wood',false),
  ('Laptop','made_of_wood',false),
  ('Tablet','made_of_wood',false),

  ('Water Bottle','made_of_glass',false),
  ('Smartphone','made_of_glass',true),
  ('Laptop','made_of_glass',true),
  ('Tablet','made_of_glass',true),
  ('Television','made_of_glass',true),
  ('Camera','made_of_glass',true),
  ('Chair','made_of_glass',false),
  ('Table','made_of_glass',false),
  ('Book','made_of_glass',false)

) as f(entity_name, attribute_name, value_boolean)
join public.entities e
  on e.canonical_name = f.entity_name
join public.attributes a
  on a.name = f.attribute_name
where exists (
  select 1
  from public.questions q
  where q.primary_attribute_id = a.id
)
on conflict (entity_id, attribute_id) do nothing;
