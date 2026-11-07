# Exact integer schema bounds

The public constrained `int64` primitive works, but a constrained union of `int64`
and `number` applies a JavaScript number filter to the tagged integer. The baseline
rejects valid exact values. This is a shared Goal 1 correctness bottleneck.

Two host schema compilation candidates use the existing TypeExpr model:

- Distribute outer constraints over union members, reusing primitive compilation.
- Keep the union codec and apply one integer-aware numeric constraint filter.

Check safe integer bounds, both sides of the boundary, binary64 numbers, exact
values above the binary64 safe domain, nested constraints and wrong value families.
Expected booleans are explicit fixtures, independent of both candidates. The same
tagged values and TypeExpr nodes feed the baseline and both candidates. No database
or protected reference is modified. This packet qualifies correctness only.

No shared source change is promoted while native qualification freezes are active.

After both native freezes closed, the distributive candidate was integrated in
commit `9382694`. The initial baseline passed 11/16 cases; both candidates passed
16/16. The rebuilt public baseline now passes 16/16, and all 719 core tests pass.
Those facts do not requalify native receipts captured against earlier core bytes.
See `qualification/evidence/schema-bounds-3e570860-514b-4bff-a912-f4674070933f.json`
and `qualification/evidence/schema-bounds-291c1307-9904-4862-bd95-d6cb5cd8f998.json`.
