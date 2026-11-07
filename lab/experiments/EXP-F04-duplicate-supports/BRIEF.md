# EXP-F04 falsifier: duplicate supports and card-one duplicates, both engines

## Commander's intent
Establish how each engine and Triplex itself behave when two live assertions carry the same entity, attribute and
value (and when card-one has two different overlapping values), so the projection planner's support counting and
conflict semantics match the ledger exactly. RDF set semantics deduplicate identical triples; XTDB rows do not; Triplex
enforcement counts assertions, not distinct values (`packages/core/src/Constraint.ts:193`). A projection that gets this
wrong shows a value after its last support is retracted, or hides one that is still supported.

## Cases
Equal duplicates with equal and different valid intervals; retract one, then the other; card-one with two different
overlapping values with enforcement off and on; card-many duplicates; correction (retract plus assert) of one of two
duplicates in one transaction. Observe `entity`, `match`, `history`, journal changes, and constraint validation results
on both engines and KV; record raw outputs.

## Deliverables
A behavior table per engine and API, the exact rule the projection planner must implement, and any place where the
two engines or KV disagree (each disagreement is a finding). Branch `exp/F04-duplicate-supports`; shared `dev` slots with
unique scopes. No adapter behavior change.
