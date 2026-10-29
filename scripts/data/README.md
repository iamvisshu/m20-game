# M20 Dataset

This directory contains the source dataset used by M20's automated
accuracy and dataset-validation tooling.

The dataset is intentionally kept separate from the engine so that
entities, attributes, categories and knowledge coverage can grow
without modifying the simulation engine itself.

Future dataset expansion should follow these rules:

- Every entity has one canonical name.
- Aliases must be unambiguous.
- Every entity should have sufficient attribute coverage.
- Attribute values must be internally consistent.
- Every gameplay-relevant attribute should have a corresponding question.
- Category assignments should be explicit.
- Dataset changes should be evaluated through the automated simulation.
