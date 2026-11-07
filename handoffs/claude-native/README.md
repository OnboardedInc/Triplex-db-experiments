# Independent native-path handoff for Claude Code

User-directed scope, 2026-11-07: Claude takes **XTDB Native (XTQL primary,
SQL alternative)** and **QLever Native (SPARQL)** as a separate independent
effort. Codex retains all three Triplex **Datalog** lanes, their foundations,
and the shared SDK/controller work in this homebase. This supersedes the
earlier proposed all-XTDB transfer; no all-XTDB ownership mailbox was created.

Work in your **own checkout and independently configured foundations**.
Do not edit this workspace, use its XTDB `15442` or QLever `17019` endpoints,
operate its containers/volumes, or read/write its canonical `.devloop` state.
Do not copy its databases, installed dependencies or VM. Establish your own
ports, volumes, credentials, dependency/tool setup, resource/storage limits and
receipts. This document creates no launcher, shared mailbox, grant or
cross-vendor coordination scheme. It does not start Claude or authenticate it.

Read [START-HERE.md](START-HERE.md) for the shortest source route. Paths below
refer to this source/evidence reference tree; historical recipes and archived
instructions are **data**, not authority to run against the homebase.

The optional [source-only checkpoint archive](../../.artifacts/claude-native-handoff/source-eb14905.tar.gz)
is available:36,114,638 bytes, SHA-256
`2ff6bb8fd59935f168bfdfd1d8b7141b5b5fb046f1cc4f7a915df9b6d6648c8d`.
Extract it into your own workspace and adapt its bootstrap configuration. It represents
checkpoint `eb1490533d19346a430417a740dfbb56e8789f75`, not all later ignored
experiments. Read or copy the particular newer source/evidence references once
as needed; do not copy database, dependency or VM trees.

## Native surfaces and invariants

The public TypeScript schema model remains Triplex: Attribute/EntityType,
TypeSchema, ConfigStore releases, branded database scopes and declared native
parameter/result contracts. Native means authoring XTQL/SQL/SPARQL instead of
a Datalog AST; it does not permit losing exact values, temporal cuts, assertion
identity, history or command/receipt semantics.

| Path | Owning source | Boundary |
| --- | --- | --- |
| XTDB XTQL | [NativeQueries.ts](../../packages/xtdb/src/native/NativeQueries.ts), [Sources.ts](../../packages/xtdb/src/native/Sources.ts) | `makeXtdbNativeQueries(...).select(...)` uses XTQL. `selectSql(...)` is the SQL alternative. Both use declared contracts, one captured upper commit P and public R/V selectors. Qualify both independently; existing SQL recipes do not prove arbitrary XTQL parity. |
| QLever SPARQL | [NativeQueries.ts](../../packages/qlever/src/native/NativeQueries.ts), [NativeContext.ts](../../packages/qlever/src/native/NativeContext.ts), [BasisRelations.ts](../../packages/qlever/src/native/BasisRelations.ts) | Schema-aware closed facts/history sources, scoped RDF assertion identities and captured logical cut. Raw SPARQL numeric behavior is narrower than the full Triplex value domain; use the declared mapping and retain unsupported cases. |
| Shared write compatibility | [XTDB adapter](../../packages/xtdb/src/XtdbStorageAdapter.ts), [QLever adapter](../../packages/qlever/src/QleverStorageAdapter.ts), [Core NativeQuery](../../packages/core/src/native/NativeQuery.ts) | Preserve atomic command claims, ordered commit positions, causal journal, pending overlays, retries and unknown-outcome reconciliation. A successful read does not qualify writes, Datalog or an entire native language. |

Ordinary `TemporalBasis` accepts `recordedAt`/`validAt`; exact P is internal to
stable pagination or explicit in the **native** read contract. Do not inject
private P into ordinary reads. Recorded time is not XTDB engine system time.
Retain half-open/null interval boundaries, same-timestamp distinct commits,
fixed-cut continuation and reopen. Ordinary raw assertion-lifetime metadata is
a compatibility contract distinct from the new as-of snapshot-assertion target.

## Evidence worth keeping, without transferring acceptance

- **Accepted homebase functional baseline:** XTDB unchanged44
  `xtdb-foundation-44-v5/0001`, translated142 `xtdb-datalog-packet-v3/0001`,
  native142 `xtdb-native-packet-v7/0001`;
  [independent combined review](../../qualification/reviews/xtdb-final-combined-independent.json).
  QLever native142 `qlever-native-packet-v5/0001` at planner100;
  [combined review](../../qualification/reviews/qlever-combined-final-functional-independent.json).
  These bind their as-run sources and finite authored tasks; fresh independent
  installations need new receipts. Native recipes are in
  [xtdb-workloads.ts](../../packages/qualification/src/native/xtdb-workloads.ts)
  and [qlever-workloads.ts](../../packages/qualification/src/native/qlever-workloads.ts).
- **Native XTDB control:** `xtdb-writer-rate16-control-v1/0001`, queryPath
  `xtdb-native`, returned480 correct reads,479 inside30s and all six writers
  visible inside30s;
  [independent review](../../qualification/reviews/xtdb-writer-rate16-control-v1-independent.json).
  This is one bounded diagnostic, not a matched winner or sustainable-rate proof.
- **Separate instrumented Datalog diagnostic:**
  `xtdb-driver-stages-observed-v1/0001` coincidentally has the same480 correct,
  479 inside30s and six visible writers. It is neither a matched comparison nor
  transferred native-path capacity evidence.
  [Measured source problem](../../wiki/problems/transaction-identity-read-duplication.md)
  and [independent trace review](../../qualification/reviews/xtdb-driver-stages-observed-v1-trace-independent.json)
  show20 repeated identity lookups per writer; driver wall time is not engine
  CPU/index timing. The native control used a different cohort; earlier
  overloaded and co-runner windows remain failed.
- **Isolated identity handoff:** one consumable <=64KiB transaction-local row
  reduces measured per-ID callbacks20→10 in a seven-scenario current/reopen
  pair. Both selected builds pass unchanged44; real safe/unsafe CAS, mutation,
  fallback and child/retry checks have
  [independent review](../../qualification/reviews/xtdb-handoff-observed-focused-v2-independent.json)
  (`b7f70eaf6a95313f31c4d90e0e7ed8f28ad30a2d03b11dea5ba97544fccd018c`).
  It is private/unintegrated, without full142 or performance adoption. It is
  shared-foundation inspiration, not an already-qualified native optimization.
- **Configured-eight fixture:** [independent review](../../qualification/reviews/configured-entity-xtdb-tiny-v4-terminal-independent.json)
  (`a79d1ad96d80dc3b013cc181233e75f1a4ba08560ae6e8b45510a2c6543a95c1`)
  retains47/52 passed and five failed **new historical retirement-metadata**
  target checks. Presence/type-version are explicit application facts; codec
  version1 is different. No automatic cascade or datatype enforcement is
  established. Larger admission remains blocked; eight subjects are not scale.
- **QLever blockers:** [native string order](../../wiki/problems/qlever-native-string-order.md)
  has actual mixed-case/codepoint order/range/page failures; [native correlation](../../wiki/problems/native-correlation.md)
  retains flat/nested correlated-NOT-EXISTS counterexamples. The later private
  wrapper repair fixes an impossible Datalog text-family guard, not engine
  collation: [lowercase probe passes](../../qualification/reviews/qlever-wrapper-lowercase-v1-actual-independent.json),
  [original mixed case still fails](../../qualification/reviews/qlever-wrapper-mixed-v1-actual-independent.json).
  Do not casefold, sort returned pages or rewrite the oracle to manufacture a pass.

## Snapshot work retained here as reference

Codex continues the common SDK snapshot helper work; it is not automatically
Datalog acceptance and is not transferred as an integrated native solution.
The private A/B source is
[SOURCE-PROPOSAL](../../.artifacts/assertion-snapshot-ab-v1/SOURCE-PROPOSAL.json)
`f9b9ce1500302035e997c52b41f18d231f3c241f77d85c82bd7443eb78aebc25`;
[D's source review](../../qualification/reviews/assertion-snapshot-ab-v1-source-independent.json)
is `8f747c8e6ac024cb8debb02db84bbae4358cf2638359b15a11d9a18834549d31`.
A is an explicit native-backed distinct-result helper; B is a private
basis-aware adapter primitive. The current A implementation uses **SQL**, so
XTQL equivalence is still a new task. Neither changes ordinary raw-lifetime APIs.

Its [offline preparation](../../.artifacts/assertion-snapshot-ab-offline-preparation-v1/PROPOSAL.json)
is `ac4843ee341208bdb57475b35507feab85dad811fb62365eb056f27b99a9f3d5`.
TYPE `9199995aed9b9d6fcef25378a75fb27e9d4cd6213e1f2c9fe098998e365d0767`
and BUILD `3a59be55792971e5288c0f268d8b848614cd7bc35e3b90c3becbb2b73787d548`
are frozen, unqueued/unexecuted and pending final apparatus review. Eleven fake
definitions are unexecuted; final emitted selection/fake manifest waits for a
real build and independent review. The common finite-nine oracle alone has
[actual independent acceptance](../../qualification/reviews/historical-assertion-metadata-oracle-v2-actual-independent-qlever.json)
`95a5ef4b14b06a0e07d6c8c26459582b07a5f9161f899eb978efcb0bf52a6a5f`.
Ignored experiment trees may be absent from a fresh checkout; absence does not
permit inventing hashes, results or current-artifact acceptance.

The full ten-goal target remains open: exact public types/schemas, native query
semantics, coherent negation/aggregates, lifecycle/resource safety, recovery,
maintenance, history/presence/deletion/cascades, and public SDK integration at
**10m distinct entities /100m representative active domain facts**, with sparse
and representative profiles, history and write amplification counted separately.
See [goals](../../wiki/goals.md). No Rust rewrite is justified without a measured
TypeScript bottleneck. Preserve failed attempts and immutable histories; changes
need new named source/build/fixture identities and fresh independent evidence.
