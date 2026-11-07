# Triplex write preconditions and temporal graph constraints

3 November 2026. Goal 10 source research and hand specifications only. No adapter subset, implementation, executable fixture or runtime action is selected.

## Findings for the next adapter contract

Pinned Triplex exposes two write preconditions. TripleLive must identify an explicit retract operation and turns a failed retraction into a transaction conflict. EntityState compares the complete observed live-recorded fact-ID collection for one entity before applying the command. Its empty collection can guard an entity with no unretracted facts, but it is not an arbitrary attribute-absence predicate. Facts outside the current valid-time instant still participate in that collection.

Opt-in graph enforcement projects the ordered command and checks new or worsened findings at every valid-time boundary represented by the current and projected relevant facts. It deliberately permits an unchanged existing violation. Cardinality counts assertion rows; uniqueness counts distinct entity claimants for a canonical tagged storage value. Flattened Datalog equality is not a substitute for that identity. Reference targets additionally depend on a visible typed reference and a visible fact carrying the required entityType.

The unchanged DuckDB prototype has useful atomic command, exact-ID stale-retraction and retained-history foundations. Its API instead separates retractions from assertions, executes all retractions first, and rejects every missing live retraction. It has no EntityState, ordered pattern-retraction, entityType or graph-enforcement surface. Treating its current transact method as the pinned Triplex service would change observable behavior.

The full [source contract](CONTRACT.md), [product mapping](PRODUCT-MAP.md) and [twenty hand-only controls](HAND-CONTROLS.md) separate declarations, actual implementation and unexecuted predictions. A missing standalone retract can report an error after its underlying no-op transaction returns, so a helper error alone is not proof that no position or envelope committed. [Named source identities](PRIMARY-SOURCES.md) are project provenance, not loaded-build authentication or an execution-environment inventory.

## Current remote reconciliation

At the start of this pass the progress Page (private application reference omitted) was sequence 93, updated at 08:37 UTC. Private main was b86193233b22d76494b9948f99cdcd2c45f23186. [Draft PR 9]([PRIVATE_REFERENCE_REMOVED]) remained open and unmerged at dbb7d27a20430e09413f92259007961ad8e66ac3, stacked on unchanged PR 8 head 0e8823973f5e1b886b7ef96e8dc5a899f467f241. PR9 metadata reported 29 commits, 189 files and additions only. The exact head returned empty combined-status and PR-triggered workflow lists; no required-CI pass is established. This pass did not reverify the full PR source tree.

Published records still leave the original owner's live state and pending calls unobservable. Remote PR and source metadata does not resolve that uncertainty. PR9 retains seven separately bounded earlier runtime passes and a separate probe build. Its later budget preflight, pre-unit IR compilation and STORE_UNIT attempts remain NONPASS. The last has known outer terminal exit 4 but absent result/evidence, so command, rollback, health, close and other database-level outcomes remain unobserved.

Goals 1–2 retain bounded acceptance. Goal 3 and original goal 4 remain incomplete and held. Independent 4.1 and goal 5 have bounded results, not full acceptance. Goals 6–10 remain unaccepted. Persisted50/comparison84 remain UNRUN. This research changes none of those outcomes or restrictions.

## Scope and next gate

Triplex is pinned to e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0. Product mapping uses unchanged published PR8 source at 0e8823973f5e1b886b7ef96e8dc5a899f467f241. Earlier cursor/receipt, capability/explain and typed-value research stays separate. This packet neither adopts nor claims novelty over unpublished local work.

A future selected adapter contract must specify precondition admission, current-recorded identity capture, ordered operations, temporal graph enforcement and backend-wide serialization. It must preserve stable errors and atomic journal/receipt/position behavior. Any product code or executable check needs separate selection and applicable gates.

No stopped runner, database, WAL, capture, artifact, dependency acquisition or original-owner workspace was inspected or used. No subject import, compilation, model/fixture evaluation, database/conformance/package action, computer snapshot, Codex task, merge, deployment or deletion occurred. This packet releases no hold, repairs no stopped action and grants no retry.
