# Triplex database scope and generation lifecycle

3 November 2026. Goal 10 source research and fourteen hand-only controls. No adapter subset, implementation or executable action is selected.

## Findings for the next adapter contract

Triplex's public Runtime validates a complete environment, tenant, database and numeric-generation identity. That identity binds cursors; the supplied storage and query layers still determine the physical database. The host must authorize that mapping, keep identities unique to database incarnations and advance generation when replacing a database.

The legacy SQL DatabaseManager is a different entry point. It directly builds the string scope `database:${name}`, caches services by name, and clears a database by deleting and recreating that same name. Its registry has no generation field. Consequently the same-name reset does not supply generation-based cursor rejection. Other cursor and temporal checks can still reject or affect a particular continuation; no successful stale replay, leak or database failure was executed here.

Entity pages also need their own contract. They carry a distinct scope/type/after/snapshot envelope, permit a new valid page limit during continuation and restore the old temporal cut. Query-page size instead participates in the normalized query identity. The shared runtimeConformance wrapper does not exercise entityPage, two-database isolation or lifecycle reset. Separate upstream source tests assert some of those boundaries, but those tests were not run in this research.

The legacy manager's lifecycle branches require additional failure specifications. Creation registers metadata before initialization without visible compensation. Deletion catches cached-close and physical-deletion error-channel failures. In the ordinary sequential successful branch, clear recreates name and description without restoring access grants removed by registry unregister. Retained service handles, cache lifetime and scoped release are separate from cursor namespace validation. These are source sequencing findings, not observed operational incidents.

## Evidence and current product mapping

- [Scope, lifecycle and registry source analysis](SCOPE-LIFECYCLE.md).
- [Conformance boundaries, positive isolation source assertions and unchanged product mapping](CONFORMANCE-PRODUCT.md).
- [Fourteen hand-only controls](HAND-CONTROLS.md), all unexecuted.
- [Named source identities](PRIMARY-SOURCES.json) and [independent review qualifications](REVIEW.md).

The published DuckDB prototype is file-scoped: an object opens one confined database file, with an object-local lock and per-file clock, receipts and facts. Its schema and API do not establish a tenant registry, database-incarnation identity or Triplex query/entity cursor service. Position-derived fact IDs are file-local. A future adapter must map storage, query execution, temporal metadata, receipts and cursor identity to the same authorized database incarnation.

Triplex remains pinned to e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0. Product mapping uses unchanged published PR 8 source at 0e8823973f5e1b886b7ef96e8dc5a899f467f241. This packet builds on the prior cursor/receipt, capability/explain, value and write-precondition packets. It neither adopts nor claims novelty over unpublished local work. Source identities are project provenance, not loaded-build authentication or a computer-environment inventory.

## Remote reconciliation

The progress Page (private application reference omitted) was read at sequence 94, updated at 09:36 UTC. Private main was b023709a04708c8a685e218cb145331ca0c8903e. Draft PRs 7, 8 and 9 remained open and unmerged at a7ddd790, 0e882397 and dbb7d27a respectively. PR 9 metadata still reported 29 commits, 189 changed files, 46,339 additions and zero deletions. The exact head returned empty combined-status and PR-triggered workflow lists; no required-CI pass is attested. This pass did not independently reverify its full source tree.

Published records leave the original owner's live state and pending calls unobservable. Remote source/PR metadata does not resolve that uncertainty. Goals 1–2 retain bounded acceptance; goal 3 and original goal 4 remain incomplete and held. Independent 4.1 and goal 5 have bounded results, not full acceptance. Goals 6–10 remain unaccepted. Persisted50/comparison84 remain UNRUN.

PR 9's seven earlier bounded runtime passes and separate probe build remain distinct from its three later NONPASS attempts. The budget runner stopped in preflight, IR serialization stopped before its unit, and schema2 rollback stopped in STORE_UNIT without result/evidence. Known outer terminal outcomes do not establish goal 7 command, rollback, health, close or other database-level outcomes.

## Next gate and stopping condition

A future adapter selection needs a host-owned incarnation ledger, an authorized physical mapping shared by storage and queries, explicit replacement/failure/retained-handle semantics, separate query/entity-page controls and scoped release. It must retain backend isolation assertions separately from public cursor validation and the shared Triples corpus. No adapter surface or executable lane is selected by this packet.

This focused research pass stops after source review and remote preservation. No stopped runner, database, WAL, capture, artifact, dependency acquisition or original-owner workspace was inspected or used. No subject import, compilation, fixture/model evaluation, database/conformance/package action, computer snapshot, Codex task, merge, deployment or deletion occurred. Existing holds, nonpasses and runtime outcomes remain unchanged; no retry is granted.
