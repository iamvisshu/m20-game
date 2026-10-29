-- Batch 25H knowledge corrections

insert into public.entity_attributes
(entity_id, attribute_id, value_boolean, confidence, evidence_count, positive_evidence, negative_evidence, updated_at)
values
(
      'e969e036-59e5-4dcd-aad5-d067325d4479'::uuid,
      '01e681ea-6633-4a84-8290-b9c2c03eeaee'::uuid,
      true,
      1.0,
      1,
      1,
      0,
      now()
    ),
(
      '6ed284fd-f3b9-47be-a260-1fc40feffe6a'::uuid,
      '1c71bed8-5a92-4667-b7c9-c1d7c563616d'::uuid,
      true,
      1.0,
      1,
      1,
      0,
      now()
    ),
(
      'c36812af-12c3-4366-93db-52272f3a5e59'::uuid,
      'ab89c293-399b-436e-8ed3-90fe7c2c0d11'::uuid,
      true,
      1.0,
      1,
      1,
      0,
      now()
    ),
(
      'eaa0782c-7c76-47d8-b22d-a2470634ad6e'::uuid,
      '486cec75-5ef6-4985-acce-da4e802f500f'::uuid,
      true,
      1.0,
      1,
      1,
      0,
      now()
    ),
(
      'f42fccdd-bd20-4d8c-9e3a-f8dee2cfc034'::uuid,
      '961432de-6812-40c7-8eb9-4a3f22970000'::uuid,
      true,
      1.0,
      1,
      1,
      0,
      now()
    ),
(
      'bc09520c-129a-45b0-9b98-771f0c248d02'::uuid,
      '961432de-6812-40c7-8eb9-4a3f22970000'::uuid,
      true,
      1.0,
      1,
      1,
      0,
      now()
    ),
(
      'f42fccdd-bd20-4d8c-9e3a-f8dee2cfc034'::uuid,
      '72a9c43e-63c8-4a11-ae6f-39dec6935497'::uuid,
      true,
      1.0,
      1,
      1,
      0,
      now()
    ),
(
      'bc09520c-129a-45b0-9b98-771f0c248d02'::uuid,
      '72a9c43e-63c8-4a11-ae6f-39dec6935497'::uuid,
      true,
      1.0,
      1,
      1,
      0,
      now()
    )
on conflict (entity_id, attribute_id)
do update set
  value_boolean = excluded.value_boolean,
  confidence = excluded.confidence,
  evidence_count = excluded.evidence_count,
  positive_evidence = excluded.positive_evidence,
  negative_evidence = excluded.negative_evidence,
  updated_at = now();
