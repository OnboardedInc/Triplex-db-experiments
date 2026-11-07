# EXP-R01 entity core: projection spec, projection planner, repository and writer (shared, engine-independent)

## Commander's intent
Give Triplex its ORM-shaped surface and the one engine-neutral brain that both lane projections will share.
When this lands: (1) an application defines EntityTypes once and gets a typed `Repository<Model>` and `Writer`
over the public `Triples` service that works on any backend today (KV first); (2) a content-addressed
`ProjectionSpec` compiles those EntityTypes into physical names and declared types for XTDB tables/columns and
for QLever classes/predicates/literals, rejecting collisions at release-compile time; (3) a pure `planProjection`
function turns "the post-transaction live facts of the touched entities" into an engine-neutral projection plan
(per entity, per attribute, valid-time segments with values, support counts, conflicts, partial/untyped markers).
The XTDB and QLever lane experiments then only translate that plan into their own statements inside `persist()`,
so the two projections cannot drift semantically. Everything here is engine-free and testable on the in-memory
KV runtime.

## Point of view (the orchestrator's design; follow it unless you find hard evidence against it)
- **Location and plumbing (R9).** New core subpath `./entity` (see lab/research/R9-core-plumbing.md, change list
  items 1 to 3 and 6): a `ContentId.Domain` entry for projection specs, `ProjectionSpec` + compiler, pure
  `planProjection`, and the Repository/Writer. Move `ConfigApi.compile` and `EntityCodec` from `packages/http`
  into core and have http import them from core (move, do not duplicate; http behavior must stay identical).
  Move `rowToTriple` to a shared module if the planner needs it. Do NOT touch packages/xtdb or packages/qlever;
  adapter integration is a later experiment per lane.
- **API shape (R3).** Follow the type-checked sketch in lab/research/R3-artifacts/api-sketch.ts and usage.ts and
  the R3 report sections on the repository: `Repository<Model>` with `at(basis)`, `get`, `getMany`,
  `find({ where, include, limit, cursor })`, `timeline`; `Writer` builds a `WritePlan`; `commit(plans, { actor,
  commandId, ... })` performs exactly one `transact`. Absent optional attributes are missing properties (never
  null); cardinality-many is always an array (decision D5). Row/model types derive from schema handles, never from
  caller-supplied generics. Keep literal `required`/`cardinality` and the ref target in `Attribute.use` and
  EntityType handles so models type correctly (R9 change 6; must keep `bench:config:typecheck` passing if it exists).
- **Physical naming (R1, R3; decisions D1, D3).** XTDB: column `ns$attr` for `:ns/attr` in XTDB's normal form
  (XTQL lowercases and folds `-` to `_`), table name snake_case of the EntityType key; RDF: attribute
  `urn:triplex:attr:<ns>:<name>`, class `urn:triplex:type:<Type>`, entity `urn:triplex:entity:<canonical
  percent-encoding>` (R3's lab/research/R3-artifacts/physical-names.mjs has vectors, injective over 7,380 strings),
  base IRI configurable. The compiler rejects collisions (`-` vs `_`, case-folded type names like ABTest/AbTest)
  with a precise error. Each attribute gets exactly one declared physical type per engine; record where the engine
  cannot represent the Triplex type exactly (QLever integers outside ±2^59, doubles beyond 49 mantissa bits,
  sub-ms datetimes; XTDB sub-µs valid-time coordinates) as an exactness flag in the spec, so lanes route those to
  the ledger instead of rounding.
- **Planner semantics.** Input: spec + the full live assertion set (both clocks resolved at the newest position) for
  each touched entity. Output per entity: entity type (from `entityType` on assertions; untyped entities are not
  projected), per attribute the piecewise-constant valid-time segments `[from, to)` with value (card-one) or value
  set (card-many), support counts per value (so retracting one of two identical assertions keeps the value), and
  conflict markers (card-one with two different live overlapping values → conflict, never an arbitrary pick).
  Values that violate the declared type are not projected; the entity is marked partial. The planner must be a pure
  function with property tests (random assertion sets vs a brute-force reference evaluator written independently
  inside the test), including half-open boundaries, adjacent identical segments coalescing, open-ended intervals,
  overlapping intervals, retractions, and -0 vs 0.
- **Repository on KV.** Implement `get/getMany/find/timeline` generically over the public `Triples` service so it is
  correct on every backend (it will be slow; that is fine). Card-one conflicts raise a typed error. Lane-specific
  compilers that read projections natively come later and must match this behavior.
- **Rejected alternatives.** A post-commit StoreCapability for projections (not atomic with the ledger, R9);
  caller-asserted row generics (unsafe); null for absent values (D5); per-engine planners (semantic drift).

## Boundaries
- Work in your own git worktree on branch `exp/R01-entity-core` (you were started with worktree isolation; run
  `pnpm install --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store` there first). The
  pinned references live at /Users/sam/projects/triplex-db-2/references (read-only).
- Files in scope: packages/core (new `entity` subpath, ContentId domain, config handle types, moved codecs),
  packages/http (switch to core imports only), their tests, package exports. Out of scope: packages/xtdb,
  packages/qlever, packages/qualification, lab/bin.
- Code comments carry reasoning: `// [EXP-R01] Why: ... Inspired by: <ref@sha path:line> ... Rejected: ...`.
- Commit on your branch in logical commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  Do not merge to main and do not push; the orchestrator merges after verification.

## Gates
- `pnpm typecheck` passes across the workspace; `pnpm --filter @triplex-build/triplex test` and the http package tests
  pass with unchanged counts plus your new tests; the shared 44-case suite on KV still passes (packages/testkit).
- Planner property tests and repository tests on KV pass; type-level negative tests (expected compile errors) pass.

## Report
`lab/experiments/EXP-R01-entity-core/REPORT.md` (write it in the main checkout path
/Users/sam/projects/triplex-db-2/lab/experiments/EXP-R01-entity-core/REPORT.md as well as committing it on your
branch): result class, API summary with signatures, spec format, planner IR, test counts, what lanes must
implement, deviations from this brief and why. Final message: ≤300 words.
