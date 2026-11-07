# Triplex capability lifecycle and explain boundaries

3 November 2026. Source research and hand specifications only. Goal 10 remains unaccepted. This packet selects no adapter capability subset, executable fixture, package action or runtime action.

## Findings for the next adapter contract

A Triplex runtime's capability bundle is not a flag that makes storage or query services optional. Omitting it selects snapshot and emission wrappers with explicit provider requirements. The base store is initialized and providers are built before wrapper dependency validation; failure can therefore require releasing already acquired resources. The supplied Effect layers own scoped release. The runtime builder does not call the storage adapter's close method. Snapshot projection failure can be reported after source commit, so a failed decorated call is not itself evidence of rollback or projection freshness.

Query-plan explanation, cursor acceptance and complete derivation provenance are different contracts. Triplex's explain methods describe a plan without executing the query; the public paged-query path separately prepares its cursor and temporal basis. The DuckDB prototype's published explain_planned method instead plans against a real SQL read snapshot, including metadata reads, retained-row statistics, native parser inspection and pattern counts. Its td.plan/1 output is neither a Triplex QueryExecutor service nor a semantic derivation proof.

The detailed source analysis and hand controls qualify these findings. A documented restriction must not be treated as an executable validation guarantee without checking the actual entry point, and a constructor-only success cannot establish later evaluation success.

## Contents

- [Capability providers, resource ownership and nine hand-only controls](CAPABILITY-LIFECYCLE.md).
- [Explain, cursor/preflight and provenance distinctions with ten hand-only controls](EXPLAIN-PROVENANCE.md).
- [Published DuckDB source mapping](PRODUCT-MAP.md).
- [Capability/product source provenance](PRIMARY-SOURCES.md) and [explain/provenance source provenance](EXPLAIN-SOURCES.json).
- [Independent source counterchecks](REVIEW.md) and [timed remote reconciliation](REMOTE-RECONCILIATION.json).

The nineteen authored controls are unexecuted specifications, not observed passes or a combined certification score.

## Current project reconciliation

The living progress Page (private application reference omitted) was read at sequence 91, last updated at 05:38 UTC. Private main remained 20f5f6d57155660672f6dc7a82d55129afbb7bd5. Draft PRs [7]([PRIVATE_REFERENCE_REMOVED]), [8]([PRIVATE_REFERENCE_REMOVED]) and [9]([PRIVATE_REFERENCE_REMOVED]) remained open and unmerged at a7ddd790, 0e882397 and dbb7d27a respectively. PR 9 returned no combined-status records or PR-triggered workflow records; no required-CI pass is established.

Goals 1–2 remain accepted only within their bounded contracts. Goal 3 and original goal 4 remain incomplete and held. Independent 4.1 and goal 5 have bounded results, not full acceptance. Goals 6–10 remain unaccepted. The three later PR 9 NONPASS outcomes and all earlier holds are unchanged. Published refs and checkpoint records do not establish the original owner's live execution or pending calls.

## Sources and scope

Triplex is pinned to e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0. Product mapping uses unchanged source published at PR 8 head 0e8823973f5e1b886b7ef96e8dc5a899f467f241. The earlier [cursor and receipt addendum]([PRIVATE_REFERENCE_REMOVED]) remains separate.

This independent pass does not adopt or make a novelty claim about unpublished local work. No stopped runner, database, WAL, capture, artifact, dependency acquisition or original-owner workspace was inspected or used. No subject import, compilation, fixture/model evaluation, package, database or conformance action occurred. No computer-environment snapshot was collected. Source provenance is limited to named project revisions and connector-returned blob IDs, not loaded-build authentication or a public-body rehash survey.

## Next gate

A future selected adapter contract needs an explicit base-service subset and stable unsupported-feature errors, capability/provider requirements and failure sequencing, connection ownership and scoped release, separate plan/cursor/provenance guarantees, and source/semantic validation before execution. New code and executable checks require separate selection and applicable gates. This packet releases no hold and grants no retry.

