# EXP-R01 entity core: report (saved by the orchestrator from the agent hand-back; the agent's harness refused the write)

Branch `exp/R01-entity-core` (commits 7d9c63a, f66b831, 8dccd43, b3d24a2 on 00a300d), worktree
`.claude/worktrees/agent-abf74104ceeee6bc3`. Not merged. Result: PASS on the narrowed scope (skeleton, spec compiler, codec move).

## Gates (agent-run; independent verification pending)
| Gate | Baseline 00a300d | Branch |
| --- | --- | --- |
| pnpm typecheck (31 turbo tasks) | pass | pass |
| core tests | 733 / 51 files | 799 / 55 files (+66) |
| http tests | 8 / 2 files | 12 / 3 files (8 unchanged + 4 new parity) |
| testkit (44 shared cases on KV + 2) | 46 | 46 |
| type-level negatives | none | 16 @ts-expect-error, each verified to fire for the intended reason |
| bench:config:typecheck | none | pass |
| pnpm lint | 0 errors | 0 errors |

## What exists
- `packages/core/src/entity/`: Descriptors and EntityCodec (moved from http), PhysicalNames, ProjectionSpec, Plan (IR + stubs),
  Repository (interfaces + stubs). Stubs fail with `NotImplementedError("EXP-R02: ...")`.
- Handle typing: `Attribute.use<D, const O>` keeps literal required/cardinality; `Attribute.ref` carries `refTarget`.
- Model types: Doc (absent optional = missing property, card-many ReadonlyArray, instants as number), Include, Expanded, Where,
  Predicate, Input, Patch. Repository: model, at, get, getMany, find (Page with nextCursor and basis), count, timeline.
  Writer: create/addValue pure, patch/removeValue need Triples; commit performs exactly one transact.
- ConflictingValuesError per C5.
- ProjectionSpec.compile: id in ContentId domain `triplex/projection-spec`, layout `triplex-projection/1`, rdfBase default
  `urn:triplex:`, per-type XTDB table and RDF class, per-attribute declared XTDB type and RDF datatype with exactness rules
  (RDF: integers in [-2^59, 2^59-1], doubles with low 4 mantissa bits zero, instants integral ms years 1..9999; XTDB: integer
  no -0, instants integral ms, valid time on the microsecond grid). Collisions rejected (column -/_ global, table ABTest/AbTest,
  reserved names, reserved namespace, duplicates, Any and mixed-family unions).
- Planner IR (signatures): ProjectionPlan, EntityPlan, TypeMembershipPlan, AttributePlan, Segment (half-open, values, conflict),
  ProjectedValue (canonical key, supports, assertionIds, per-engine exactness), Completeness with reasons (conflict,
  type-violation, inexact-value, inexact-coordinate, inexact-entity-id, mixed-membership, stale), partialSet, rowSegments.

## Deviations
1. Planner, repository, writer are stubs (scope change after review r3 #5).
2. rowToTriple not moved (goes with R02).
3. Spec compiler takes attribute usages, not the entity Struct (a Struct cannot tell card-one List from card-many).
4. ConfigApi.compile split: core compiles descriptors; http keeps REST rules via hooks at the original positions.
5. Any and mixed-family unions rejected rather than ledger-only.
6. Instants map to TIMESTAMPTZ / xsd:dateTime, dates to DATE.
7. XTDB DOUBLE PRECISION marked exact including -0: UNVERIFIED (no containers ran). EXP-F02 must confirm.
8. Reported basis has an optional recordedPosition; public TemporalBasis cannot pin a position.

## Open questions for EXP-R02
1. Which value to project when supports differ only in representation (-0 vs 0, JSON key order); EntityCodec keeps the last.
2. Mixed membership: IR marks the entity partial and the codec rejects it on read; golden vectors should confirm.
3. One commit cut across a page and its includes through the public Triples API.
