# Temporal fact store zero context takeover

Prepared 5 November 2026. This is the starting document for an agent taking over
Contributor's DuckDB temporal fact store with no conversation history. It records the
product ambition, architecture, ten goals, implementation, experiments, exact
working checkpoint, research, unfinished work and proposed next workloads.

**Start from the Mac integration branch, not main or one of the old independent
prototypes.** The latest implementation checkpoint is
[`c08ed2dda2fd5bc448484c033538399dc063b8b9`]([PRIVATE_REFERENCE_REMOVED]),
extension **0.18.0**, with **142 scoped checks plus semantic TypeScript PASS**.
The branch is `mac/temporal-store-integration-20261104` in
`Contributor/research-reference`, with [draft PR 25]([PRIVATE_REFERENCE_REMOVED])
targeting `main`. It is not merged or a production acceptance declaration.
This handoff and its navigation links are a later documentation-only checkpoint.

## Current continuation

This document preserves the original 0.18 handoff. Continue from the current
integration branch and [runtime takeover state](../runtime/TAKEOVER-STATE.md).
Contributor subsequently required one audited native-ownership strategy, with macOS
ARM64 as the currently verified platform. The older portable/optional-profile
assumptions below are historical. Current verification and paused worktree
ownership are recorded in the runtime state and ten-goal ledger.

## 1 The mission in Contributor's words

The initial request was to consolidate known research, continue on Contributor's Mac at
**high effort**, use the ten items as the guide, and build a really good triple
store. The subsequent performance instruction was:

> Push the envelope on the native C++ extension to maximize performance and
> speed. Go do that and hill climb toward it and all the 10 items in mind.

The agreed architecture was explicit:

> Native C++ semantics, schemas defined through a DSL, and thin TypeScript/SQL
> APIs. The adapter is a bridge while that native engine is built. Schemas would
> compile into runtime catalog data, so introducing a new entity type wouldn't
> require rebuilding the extension.

Contributor then sharpened the product framing: **this is a temporal fact store**.
Think about common event-sourcing queries, historical truth, corrections,
relationships and derived answers. Entity APIs are useful views over facts;
they are not the whole product. Immutable business events and temporal assertions
must both be representable without confusing a legitimate reversal with a data
correction.

Contributor requested a sub-agent brainstorm and research, followed by **20 real-world
test cases** and comparable schemas/queries for naive SQL, direct DuckDB and our
store. He confirmed that “Doc DB” meant **DuckDB**, not MongoDB. This is the next
benchmark track **after the ten items**, not a replacement for finishing them.
The proposed cases are preserved in section 13; none is an executed three-way
benchmark yet.

The latest request was to stop adding new implementation scope long enough to
write this complete takeover document and add it to the repository. The 0.18
implementation was completed, verified and pushed before writing the handoff.

### Latest clarification large scale concurrent reads are the priority

While this handoff was being written, Contributor explicitly clarified the scale and
priority: hundreds of thousands, **millions and millions of rows**, event-sourcing
use, fast queries across large datasets, and many concurrent/continuous reads.
**Read performance and read concurrency matter more than write throughput.**
Small-data improvements are useful regression checks but do not satisfy the goal.
The ambition is a read-heavy temporal fact platform over massive retained event
histories, not an engine optimized mainly for tiny fixtures or writes.

Treat the present limits as an experimental profile, not the intended product
ceiling. The current one-million-retained admission, 100000-relevant-active-fact
query cap, one-thread configuration and serialized single-connection API do not
demonstrate this ambition. Existing performance evidence reaches tens of thousands
of active facts. No million-row read benchmark or high-reader-concurrency result
has been established by this work.

This clarification changes where to spend engineering effort: scalable SQL-owned
reads, query/partition pruning over retained history, reusable read plans/projections, bounded memory
and independently owned concurrent reader connections. Preserve write correctness,
history and receipts; prioritize write-speed tuning after the read path.

## 2 Read these first

1. This document, then [the current ten-goal ledger](../runtime/TEN-GOAL-LEDGER.md).
2. [Native schema and public API contract](../runtime/NATIVE-SCHEMA.md),
   [architecture](../runtime/DESIGN.md), and [runtime README](../runtime/README.md).
3. [Timestamped working notes](../runtime/WORKING-NOTES.md). These preserve the
   detailed chronological decisions, first failures, fixes and measurements.
4. The proof documents for [joins](../runtime/NATIVE-JOIN-PROOF.md),
   [count](../runtime/NATIVE-COUNT-PROOF.md) and
   [extrema and integer sums](../runtime/NATIVE-AGGREGATE-PROOF.md).
5. [Current verification receipt](../runtime/evidence/verification.json) and the
   relevant versioned benchmark JSON under `runtime/evidence/`.
6. [Historical research index](research-index-20261104.md) and
   [Triplex/Effect build research](triplex-effect-build-research-20261104.md).
   They were brought into this branch from published commit
   `daba053f47695aa272947947c0b18f67303242df`; source links pin older evidence.

The living roadmap Page (private application reference omitted)
is the original acceptance guide. Its read on 5 November contained a latest
owner observation at 12:17 UTC, still describing 0.17/135 checks. The new
0.18/142-check checkpoint in this handoff is later. The Page was read, not edited,
for this handoff; do not mistake its older summary for the current branch head.

The [4 November Mac handoff](mac-complete-ten-goals-20261104.md) is historical
context for the source branches and original acceptance boundaries. Start here
for current work. Historical cloud execution rules and cloud-only skills are
not a Mac setup procedure.

## 3 Working preferences and lessons for the next agent

- Work directly on the real embedded engine early. Build, LOAD, run queries,
  verify exact results, and continue through integration. A mock ACK or source
  review is not an engine result.
- Keep the C++ engine authoritative. TypeScript encodes/decodes and manages
  lifecycle; it should not acquire a parallel schema or Datalog compiler.
- Use high effort for delegated implementation. The user explicitly rejected
  starting the Mac worker at medium effort.
- Continue authorized work autonomously. Contributor dislikes repeated permission
  questions, plans without action and repetitive status messages. Give concrete
  progress, failures, evidence and next actions.
- Keep existing authorization for ordinary local work and checkpoint pushes;
  the user already approved pushing this branch. Reconcile any uncertain write
  before repeating it. Existing approvals remain action-specific.
- Preserve unfavorable measurements and the first failure. Label source-only,
  proposed, unrun, injected-fault and actual-runtime evidence accurately.
- Use incremental commits on the existing branch and keep PR 25 draft while
  the ten-goal scope remains incomplete. No merge or deployment was performed.
- Prefer the connected GitHub tools for available PR metadata operations. A
  sub-agent's read-only `gh pr view` hit a network error; its escalated retry
  waited about 13 minutes for approval and blocked its queued messages. It was
  aborted, made no edits/builds, and parent took over. Avoid another silent stall.
- There was a serious repeated-final-update loop in this conversation. Contributor
  noticed it. The owner acknowledged that no code advanced during that episode,
  then resumed implementation. Do not repeat a checkpoint summary instead of
  doing the work, or imply a worker is implementing when it is stalled.
- Evidence here is project source, selected dependency identities, synthetic
  data and actual results. Keep handoffs focused on the project, not computer
  inventories, secrets or machine backups.

## 4 The ten items and their actual state

“Implemented in this profile” is different from full goal acceptance. The old
research accepted goals 1–2 within bounded contracts; this Mac integration adds
substantial executed evidence for all ten. **All ten are not complete.**

| Item | Intended behavior | Current integrated evidence | Remaining work |
| --- | --- | --- | --- |
| 1 Typed values | Disjoint string, boolean, int64 and finite binary64 across literals, persistence, equality, order, parameters and results | Exact endpoints/float bits/Unicode; typed v5 carrier; schema DSL, required/one/many and native references; same-binary new types/versions/reopen | Broader native value families are not supported; global uniqueness, temporal references/deletion/cascades and native schema enforcement for legacy Triplex writes remain open |
| 2 Expressions | Bounded already-bound comparisons and checked arithmetic, eager errors, no silent coercion | Native filters/arithmetic, overflow/division/type errors and healthy reuse; regression through public reads | Expression whitelist remains bounded; native SQL lowering of general filters is not implemented |
| 3 SQL first | Let DuckDB execute eligible relational work, expose route/fallback and preserve native admission | C++ single-atom scans, 2–4 positive EAV joins and complete-source count/min/max/sum SQL; real persisted data; 45 scan and 22 join identities; fresh proofs and measured comparisons | Derived-relation joins, larger aggregate programs and expression filters; better costing, selective history validation, broader scale; generic incoming/HIDDEN attachment admission remains uncertified |
| 4 Stratified negation | Safe variables, completed lower strata, one shared temporal cut, reject negative cycles | Public persisted native recursion/negation, clause reorder/rejection tests and Triplex conformance | Broader native SQL negation and final goal-wide acceptance; historical research's unrun matrices were not relabeled passed |
| 5 Completed aggregates | Full-source set-tuple contribution identity, typed keys, empty groups, exact checked sums | Native count/min/max/sum_i64; reference SQL compiler; C++ count plus 0.18 extrema/sum lowering; canonical error, correction and exact budget tests | Larger multi-rule aggregate SQL programs and broader workload acceptance; conservative global domain proof can fall back for valid heterogeneous groups |
| 6 Cancellation/resources | Owned cancellation, actual termination/cleanup and honest resource bounds | Shared Node/C++ invocation registry, AbortSignal/timeouts, native polling, queued-abort isolation, bounded output/appends, cleanup-fault fencing; 0.18 reference late-delivery fix | Full allocator accounting, hard physical containment and adversarial latency remain incomplete; synchronous appender flush and evaluator-only deadline distinction remain |
| 7 Recovery/evolution | Atomic commands/receipts/positions/history, crash recovery and real migrations | Late INSERT rollback, two-connection conflict/reconciliation, observed SIGKILL inside native INSERT/before/after commit; complete history/usage/receipt checks; v1→v5 migration path in reference API | Broader contention, disk/power failures and backup/restore; native opener handles empty/v5 only; cross-API journals/receipts differ |
| 8 Reuse/maintenance | Cache immutable structure with fresh facts/cuts/admission; maintain derived data safely | Bounded compiler/read-source LRUs, parameterized controlled templates, fresh tokens/data/schema/rollback, schema metadata borrowing, restricted EAV support maintenance | General joins/recursive incremental maintenance, deletion supports and full memory accounting; no arbitrary result or authorization cache |
| 9 History/intervals | Assertion identity, both time dimensions, corrections and interval answers without bridging gaps | Native history/at APIs, original schema/ref meaning and corruption checks; reference timeline endpoint/coalescing/point equivalence | Native interval-local patch API, native general interval-result path, temporal foreign keys and proof lineage |
| 10 Triplex | Working pinned public Runtime/Effect/QueryExecutor integration with acknowledged lifecycle | Exact-source core/testkit/sql build, all 44 unchanged runtimeConformance cases through direct native Node factory, 11 extra adapter methods, common v5 store | Capabilities.none only; full native Triplex schema/query delegation, optional providers and upstream full `pnpm check` remain open |

Full details and evidence pointers live in the current ledger. Historical large
case counts in old branches are not additional current Mac acceptance totals.

## 5 Architecture and semantics that must survive optimization

### One canonical fact authority

The runtime uses physical store version **5**. `main.assertions` is the canonical
EAV assertion relation. `main.commands`, singleton `main.clock` and
`main.storage_usage` own receipts, commit positions and retained usage.
Triplex compatibility views and native APIs share that authority.

Assertions retain independent half-open valid and recorded intervals:

```text
valid_from <= V < valid_to
tx_from    <= K < tx_to
```

`V` is business validity; `K` is logical committed knowledge position, not wall
clock. `INT64_MAX` is the infinity sentinel. Native query `knownAt` omitted uses
latest committed knowledge. SQL uses `-1` for that request. Both dimensions must
belong to one coherent query cut. A database query snapshot is not a computer
environment snapshot.

Set identity is the full typed tuple. An int64 `1`, binary64 `1.0`, string `"1"`
and boolean `true` are distinct. Native text is UTF-8 with explicit admission,
and binary text comparisons use BLOBs. Integers cross Node as `bigint` and query
JSON as decimal strings; floats use exact bit strings. Finite binary64 only.

The 28 physical assertion columns, in order, are:

```text
assertion_id,e,a,tag,payload,valid_from,valid_to,tx_from,tx_to,
command_id,corrected_by,payload_hash,v_tag,v_s,v_b,v_i,v_f,
recorded_at,retracted_at,external_valid_from,external_valid_to,
created_by,entity_type,transaction_id,retract_transaction_id,
extra_json,origin,interop
```

Do not change the order casually: native appends, migration/interop code and
tests share it. Native four-tag values use the typed slots; the common carrier
also preserves Triplex's additional ref/datetime/json/blob forms. Relevant native
Datalog input outside four tags rejects explicitly. Fractional Triplex validity
is retained separately and projected onto the integer domain with ceiling
bounds. Values outside exact Triplex numeric/tick representation are marked
`interop=false`; do not round them into compatibility.

### Runtime schemas and commands

C++ parses the schema DSL into canonical `td.schema/1` descriptors in
`td_catalog_v1`. Registration is atomic, immutable by schema name/version and
content-hashed. New types and versions work with the same extension after
reopen. There is no generated C++ compilation per user entity type.

Native `putRecord` is **full-record replacement**. It closes every live native
assertion for that entity and appends the new record at one position, including
superseding old knowledge outside the newly supplied valid interval. It is not
an interval-local patch. Equal duplicate/reordered record values canonicalize to
the same replay identity and original receipt. Schema/type ownership stays stable;
creator commands bind original schema version/hash. Legacy entities require a
future explicit adoption path.

`ref(Type)` refines a string ID, not a fifth native scalar tag. Targets must be
declared in the same schema with the required stable type. Forward/self type
declarations and first-write self-links work. A referenced target must have a
durable first declaration no later than the source command under its original
schema. Target identity survives property validity changes; this is not temporal
overlap enforcement, cascade/delete semantics or a temporal foreign key.

Missing creator/owner/header bindings, descriptor/carrier corruption and invalid
inactive retained history must reject, rather than disappearing through joins.

### Execution boundary

```text
Schema DSL / Datalog / commands
            |
     thin TypeScript or SQL
            |
   native C++ validation/compiler
            |
   canonical DuckDB tables and catalog
            |
   proved SQL plan OR bounded native evaluator
            |
   exact owned result and acknowledged cleanup
```

There is no Python subprocess on the production native/Triplex path. Python is
the build helper, scalar reference API and regression/oracle path. The retained
Python worker files are historical/reference code, not the current transport.

## 6 Source map and public entry points

All paths below are relative to `projects/temporal-datalog/runtime/`.

| Area | Files and role |
| --- | --- |
| Native semantics | `native/src/temporal_core.cpp`, typed/stratified/value/float headers: parser, genuine IR, exact values, rules, counters and evaluator |
| DuckDB binding | `native/src/temporal_datalog.cpp`: actual unstable C API v2 registration, typed vectors, pragma expansion and result encoding |
| Schema catalog | `native/src/temporal_schema.cpp/.hpp`, `native/catalog.sql`: DSL, descriptors, records, references, runtime views |
| Atomic commands/history | `native/src/temporal_command.cpp/.hpp`: schema-bound replacement, receipts and temporal reads |
| Persisted planner | `native/src/temporal_store_query.cpp`, `temporal_scan_plan.hpp`, `temporal_join_plan.hpp`, `temporal_count_plan.hpp`: database-owned input selection, proofs, SQL/native dispatch; the count header now also handles extrema/sum |
| Retained integrity | `native/retained_validity.sql`, native catalog history/reference views |
| Native controls | `native/src/temporal_control.hpp`, `node_control.cpp`: invocation registry and Node-API C ABI control bridge |
| Owned Node transport | `adapter/native-duckdb-port.mjs`: native instance/connection, streaming bounds, prepared-source LRU, appends, interrupt and teardown |
| Native APIs | `adapter/native-schema.ts`, `native-entity.ts`: schema, command, history and Datalog encoding/decoding/lifecycle |
| Triplex bridge | `adapter/index.ts`, `effect-storage.ts`, `query-executor-adapter.ts`, `transaction-owner.mjs`, public backend/schema/result-boundary files |
| Reference implementation | `temporal_store/store.py`, `persisted.py`, `compiler/`, `projection.py`, `shared.py`, `control.py`: Python/reference SQL/migration/timeline paths |
| Reproduction/evidence | `build_native.py`, `build_triplex.py`, `verify.py`, `adapter/test-*.ts`, `adapter/benchmark-*.mjs`, `evidence/` |

Native SQL entry points include `td_initialize`, `td_define_schema`,
`td_put_entity`, `td_entity_receipt`, `td_entity_history`, `td_entity_at`,
`td_query_store`, `td_query_store_native`, `td_query_store_preferred_native`,
`td_query_store_controlled` and `td_query_store_sql_v1`. Helper suffixes and
`td_query_v2` are application API versions, distinct from DuckDB C API v2.

A minimal native API example after building:

```typescript
import {NativeEntityStore} from './build/adapter/native-entity.js';
const store = await NativeEntityStore.open({database: 'example.duckdb'});
try {
  await store.defineSchema('schema demo version 1 {entity Person {name:text required;}}');
  await store.putRecord({schema:'demo',version:1,type:'Person',entityId:'p1',
    commandId:'create-p1',record:'{name="Ada";}',validFrom:0n,
    validTo:9223372036854775807n});
  const result = await store.query("answer(?name) :- triple('p1','name',?name).",
    {validAt:0n,forceNative:false,timeoutMs:5000});
  // result.position, rows, route, reason, counters
} finally { await store.close(); }
```

Triplex uses `makeDuckDBRuntime({database?})` from `build/adapter/index.js`, an
explicit DatabaseScope and `Capabilities.none`. Its TS layer still owns portions
of orchestration/schema semantics and uses the pinned SQL compiler strategy with
a DuckDB LIMIT/OFFSET adaptation. The bridge remains transitional.

## 7 Current planning profiles and limits

### SQL routes

- One ordinary answer rule over one EAV atom: constants, repeated-variable
  equality, set projection and exact order. `proved_single_atom` on success.
- One answer rule over 2–4 positive EAV atoms: fresh subset cardinality and
  indexed-candidate work proof, including rejected candidates; same-entity
  independent-attribute specialization. `proved_edb_join` on success.
- Direct complete-source aggregate, or one single-EAV source projection then
  aggregate: count/min/max/sum_i64. Count reports `proved_count`; other operators
  report `proved_aggregate`. Native compilation still enforces aggregate grammar.
- Unsupported or unproved shapes use unchanged native evaluation and report a
  specific fallback reason; limits are never silently widened.

The planner gathers fresh statistics over one admitted cut. Constants/projected
tuple identity, native fact/round/work/dictionary/output limits and logical
intermediate gates must hold. SQL result counters are null; native counters are
actual. SQL-selected queries gate native fact-list packing off. Native fallback
still materializes the validated active SQL list for the scalar callback; a
general streaming/spillable native evaluator is not implemented.

The default API asks C++ for an empirical retained-row preference: below 16384
retained assertions use native, otherwise try SQL. This includes history and
unrelated rows, can be stale with another writer and is not an admission proof.
`forceNative:true` selects native; `false` tries proved SQL; omitted uses the
hint. The 0.18 results show that some aggregates cross over later than 16384.

### Important bounds

| Boundary | Current profile |
| --- | --- |
| Retained storage | 1 million assertions / 256 MiB logical retained payload admission |
| Native Datalog input | At most 100000 relevant active distinct EAV tuples; e/a/value text at most 512 bytes |
| Native query budgets | maxFacts <=100000, maxRounds <=2000, maxWork <=50 million; defaults 100000/1000/5 million |
| Native evaluator deadline | 1..60000ms, default 1000; separate from optional whole-query controls |
| Schema DSL | 16 KiB; 32 types; 64 attributes/type; 1024 total; schema/type identifiers <=64 bytes; version 1..2147483647 |
| Native record | 64 KiB source / 4096 values; scalar text <=16 KiB; entity/command IDs <=128 bytes |
| Replacement | <=4096 new input values and <=4096 old live assertions |
| Node result transport | 100000 rows / 800000 flat cells / 16 MiB output; per-cell 1 MiB; bounded trace 256 entries |
| Native appends | At most 2048 rows/chunk; payload-driven target 8 MiB; transaction poisoned by a late chunk failure |
| Prepared read source | 32 entries / 256 KiB SQL source, fresh bindings and result ownership |
| Controlled compiler output | >262144-byte expanded SQL returns NULL for pragma fallback; batches <=32 MiB |
| Aggregate/join logical intermediates | Separate stage row/cell/carrier gates, including 800000 cells / 32 MiB where specified by proof |
| Live controls | At most 1024 invocation tokens, retired after terminal cleanup |

Logical admission and DuckDB's buffer limit do not bound every C++/driver
allocation or guarantee hard wall-clock termination. The native factory uses
one thread, 128 MiB DuckDB memory and 64 MiB temp configuration.

These are current test-profile settings, not a production configuration for the
clarified massive-data/read-concurrency target. The current admission CTE rejects
more than 100000 relevant active tuples before route selection, and SQL proofs
also require native-equivalent budgets. Thus even a SQL aggregate returning one
row cannot currently scan millions of relevant facts through this API. Simply
raising the cap would expose native materialization/private-memory growth.
The next scalable profile needs an explicit SQL-owned scan/aggregate resource
contract, bounded native fallback, and clearly versioned budget semantics rather
than silently dropping today's checks.

### Aggregate subtleties

Count contributes complete projected source tuples, not DISTINCT measure values.
Empty global count and sum produce zero; empty global min/max produce no row;
keyed empty inputs have no groups. Native extrema reject booleans and mixed
measure tags within a group.

0.18 SQL extrema conservatively require a globally homogeneous projected measure
tag (string/int64/f64). Valid heterogeneous groups can therefore use native.
Sums use exact HUGEINT accumulation and TRY_CAST final int64 admission. A bad
domain or any unproved final sum selects native so its error ordering remains
authoritative. Native checks all groups' tags before any sum range error.

For n base facts, m projected source tuples, g internal groups, non-count work
is bounded by 2n+2g direct or n+2m+2g projected. An empty global extrema group
still counts toward work before its output is omitted. Extrema text bytes and
extra group row-count cells enter source/group/output bounds. Full proofs are
linked above.

## 8 Controls, lifecycle, recovery and remaining hard boundaries

The Node-API 8 addon shares the actual loaded extension control registry through
its exported C ABI. It pins extension path/hash and retains one loader reference
for process lifetime; it does not own facts, results or a DuckDB callback context.
After rebuilding, start a fresh Node process rather than hot-replacing the
already pinned image.

Optional `signal`/`timeoutMs` starts after the request acquires its owned queue
scope. Cancellation marks the native atomic token and interrupts DuckDB. Native
monotonic checks also cover conversion when JS timer delivery is delayed. A
queued request cannot interrupt the preceding request. `deadlineMs` alone bounds
the native evaluator/conversion, not all SQL planning/selection/validation.
These controls are cooperative.

Controlled SQL templates are compiled in C++, transported through TS and bound
to a fresh token. Source reuse does not retain facts, results, cuts, permissions,
live handles or token authority. Retired tokens reject. Oversized templates
retain the original pragma route instead of rejecting an otherwise valid program.

The Node port independently attempts result close, pre/post binding clear,
destruction and eviction cleanup. It preserves primary and cleanup errors and
fences before pending clears. Explicit close attempts all deferred handles,
statements, connection and instance. A failed close may be retried for teardown
only; business operations remain closed. A failed write ACK needs durable receipt
reconciliation before any retry.

0.18 also fixed the Python reference read lifecycle: invocation controls now
live inside the read transaction and retire/join delivery before COMMIT/ROLLBACK.
The original full regression observed a fenced healthy-reuse failure after a
deadline; the isolated rerun passed. A deterministic late-notification test
fails against previous query/timeline methods (four unwanted cleanup interrupts)
and passes after the fix, using actual DuckDB transaction acknowledgments.

Native command recovery tests observe a real owned child during assertion INSERT
after headers/retractions, then SIGKILL it; other cases kill before/after commit.
A test-only CHECK/sequence creates and observes the window. Reopen checks complete
old/committed history, receipts, clock, usage and temporary-plan cleanup, then a
healthy next write. This is bounded observed phase evidence, not instruction-exact
crash placement or broad disk/power-loss certification.

The owned factory creates a fresh instance/connection and disables external
access after initialization. Raw SQL entry points need equivalent ownership.
DuckDB 2.0 filters HIDDEN attachments from both catalog-listing surfaces tested.
The visible attachment count is diagnostic, not proof that a supplied arbitrary
connection has no hidden database. The public C API reviewed did not expose an
unfiltered callback-context attachment enumeration or native interrupt poll.
Do not turn a filtered count into a stronger claim.

### Read concurrency target and DuckDB deployment model

Separate concurrent queries from parallel execution inside one query. The current
API serializes work on one connection and configures one execution thread; neither
is a reader-pool implementation. A likely direction is an owned shared database
instance with independent leased reader connections and transactions, controlled
ingestion, per-lease prepared/result/control ownership and explicit admission.
That is a proposed architecture to validate, not an implemented pool.

The pinned [DuckDB 2.0 concurrency model](https://duckdb.org/docs/2.0/connect/concurrency)
supports concurrent activity within one read-write owning process. Multiple
processes can open a native database in read-only mode when there is no writer;
arbitrary independent read/write processes are not the same deployment model.
DuckDB 2.0 also documents Quack remote mode, but adopting a server/protocol is a
separate product choice, not a current requirement or implemented feature here.
[Multiple connections](https://duckdb.org/docs/2.0/guides/performance/how_to_tune_workloads.html)
can overlap queries while DuckDB also parallelizes eligible work within a query.
The native scalar fallback's private evaluator does not become parallel merely
by increasing DuckDB's thread setting.

Measure connection count versus per-query threads under a fixed CPU/memory
budget; avoid oversubscription, head-of-line blocking and cancellation crossing
leases. Each reader needs a coherent V/K cut, its own invocation/result lifecycle,
fresh visibility after commits and correct cleanup before return to a pool.
Mixed continuous ingestion and concurrent reads must be tested explicitly.
Repeated reads are not automatically a streaming subscription or incremental
maintenance implementation.

## 9 How to build and verify on the existing Mac workspace

The existing task root is `[LOCAL_PATH_0019]`.
The repository is `task/research-reference`; runtime is
`research-reference/projects/temporal-datalog/runtime`. These are project paths, not a
computer inventory. On another machine, use equivalent owned paths and rebuild.

Selected dependencies:

- Python `duckdb==2.0.0` in task-root `.venv` (`runtime/requirements.txt`).
- `@duckdb/node-api` **2.0.0-r.1**, actual engine **v2.0.0**.
- Node **24.13.0** used for the current build, with its own `include/node/node_api.h`.
- TypeScript **6.0.2**, Effect **4.0.3**.
- Triplex source **e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0**, local checkout
  `task/triplex-source`, selected npm dependencies under `task/triplex-build`.
- `runtime/node_modules` is an ignored link to the selected dependency directory.
- Actual vendored v2 headers and metadata appender are under `native/vendor/`.

From the runtime directory, using the existing environment:

```sh
../../../../.venv/bin/python build_native.py
node_modules/.bin/tsc --pretty false
../../../../.venv/bin/python verify.py
node build/adapter/benchmark-aggregate.mjs
```

`verify.py` typechecks/compiles TS, copies adapter `.mjs`/`.sql`, then runs the
Python and actual Node/Triplex suites. **It does not rebuild the extension.**
Run `build_native.py` after native changes and before relying on verification.
`build/` binaries, databases, WAL files, caches and dependency links are ignored.
Evidence receipts are committed.

`build_native.py` compiles C++17/O3 with strict floating-point flags
`-fno-fast-math -frounding-math -ffp-contract=off`, warnings-as-errors and
`C_STRUCT_UNSTABLE` metadata targeting exact DuckDB 2.0.0. It builds the control
addon from headers belonging to the selected Node executable. A new host/API
version needs matched headers, a fresh binary and real tests; do not relabel an
existing artifact.

For dependency/source reproduction, `build_triplex.py` supports explicit
`--deps-dir`, `--source-dir` and `--offline`. It uses the committed npm integrity
lock, exact upstream revision and official tsdown builds. It performs `npm ci`
in that owned dependency directory, so do not run it concurrently with a worker
using the same modules. It preserves a different existing dependency link.
The task passed with selected inputs and an offline install from already
acquired packages; a fresh network-empty clean-room reproduction is not claimed.

The full upstream `pnpm check` has not passed here. Upstream's root script chains
format check, lint, typecheck, docs check, tests and build, including packages and
tools outside the core/testkit/sql dependency subset. Passing the pinned adapter
suite does not imply that larger monorepo gate ran.

### Latest evidence identity

At code commit `c08ed2dd`, current verification and aggregate benchmark source
pins match each other and the source files. The native build identities are:

```text
extension version: 0.18.0
library SHA256: e85013399dd83848b7a5d19ace6fb931c9f5af54fea7fc503dcfb55a0e9b2098
extension SHA256: 71324c70577cc4d1faa4395e7a9bb1b8ff082be0c5097aefe987c318bab92f5e
control addon SHA256: 32eae773f88838d668133a24a49d099a70397024a5615abd75c0d699c26dce8a
```

The 142 scopes are 26 Python methods, 44 unchanged Triplex cases, 11 adapter,
7 schema, 10 entity, 10 persisted-query, 6 join, 5 reference, 7 control,
6 cleanup, 4 count and 6 aggregate methods, plus semantic TypeScript. They have
different granularities; the total is a checkpoint counter, not a coverage score.

Check `source_sha256` and `native_build` against files before reusing a receipt.
Older packets intentionally retain older source/build identities; their mismatch
against HEAD is not a reason to overwrite historical evidence.

## 10 Performance evidence and what it actually means

| Packet under runtime/evidence | Comparison and interpretation |
| --- | --- |
| [`native-hillclimb.json`](../runtime/evidence/native-hillclimb.json) | Earlier native kernel changes; separate from complete persisted/API timing |
| [`full-path-benchmark.json`](../runtime/evidence/full-path-benchmark.json) | Complete Python reference public paths; includes its storage/validation/marshalling |
| [`native-transport-benchmark.json`](../runtime/evidence/native-transport-benchmark.json) | Direct native Node versus retained Python transport; keeps the tiny-query regression that motivated prepared reuse |
| [`native-write-benchmark.json`](../runtime/evidence/native-write-benchmark.json) | Native appender versus SQL VALUES on the same public write transaction; selected 4096-row comparison was about 38x, not a universal write claim |
| [`native-entity-benchmark.json`](../runtime/evidence/native-entity-benchmark.json) | Native schema-bound commands and reads; not a cross-API speedup claim |
| [`native-store-query-benchmark.json`](../runtime/evidence/native-store-query-benchmark.json) | First native persisted query measurements, with checked complete output |
| [`native-scan-benchmark.json`](../runtime/evidence/native-scan-benchmark.json) | Paired forced native/proved SQL scans through 40000 facts; small-query regressions retained |
| [`native-join-benchmark.json`](../runtime/evidence/native-join-benchmark.json) | Native/SQL/default over 500/2000/10000 three-attribute entities; proof overhead and exact output included |
| [`native-reference-benchmark.json`](../runtime/evidence/native-reference-benchmark.json) | Actual reference commands plus reopened graph queries; current-path measurements |
| [`native-control-benchmark.json`](../runtime/evidence/native-control-benchmark.json) | 0.14 control overhead, roughly 9–13ms regression retained |
| [`native-control-template-benchmark.json`](../runtime/evidence/native-control-template-benchmark.json) | 0.15 parameterized control transport; small differences/variation, not universal speedup |
| [`native-count-benchmark.json`](../runtime/evidence/native-count-benchmark.json) | 0.16 direct/projected/global/grouped counts; 40000-fact filtered count 51.66ms native / 47.87ms SQL; small queries favor native |
| [`native-schema-view-benchmark.json`](../runtime/evidence/native-schema-view-benchmark.json) | 0.17 same-source metadata borrowing off/on; both variants keep DSL reuse. At 32768 facts/64 attrs: callback 11.91→5.82ms, persisted native count 53.20→47.48ms, SQL count 55.60→49.19ms. These persisted timings use the direct Node SQL/owned-row surface, not the later full NativeEntityStore typed decoder |
| [`native-aggregate-benchmark.json`](../runtime/evidence/native-aggregate-benchmark.json) | 0.18 complete NativeEntityStore global/grouped extrema/sum calls, exact decoded answers, native versus SQL |

The 0.18 protocol uses native schema-bound file fixtures, closes/reopens before
query timing, alternates two warmup and five measured pairs, and checks every
answer/route/position. Retained integrity/schema validation, fresh proof/statistics,
execution and complete exact output are included. Ingestion/open are excluded.

| Facts | Query | Native ms | SQL ms | Native / SQL |
| --- | --- | --- | --- | --- |
| 512 | min | 11.64 | 15.84 | 0.73x |
| 512 | max | 11.29 | 16.04 | 0.70x |
| 512 | sum | 12.49 | 17.54 | 0.71x |
| 20000 | min | 32.78 | 33.63 | 0.97x |
| 20000 | max | 34.43 | 34.96 | 0.98x |
| 20000 | sum | 34.24 | 34.74 | 0.99x |
| 40000 | min | 56.12 | 51.66 | 1.09x |
| 40000 | max | 57.41 | 52.10 | 1.10x |
| 40000 | sum | 57.51 | 52.11 | 1.10x |
| 40000 | grouped min | 57.23 | 53.32 | 1.07x |
| 40000 | grouped max | 57.81 | 52.05 | 1.11x |
| 40000 | grouped sum | 55.82 | 53.23 | 1.05x |

Ratios above one favor SQL. The six large-case ratios are 1.05–1.11x, roughly
5–10% lower latency, while small cases favor native. Speedup ratios and percentage
latency reduction are different quantities. Do not turn these selected results
into a universal triplestore/Datalog/unstable-v2 performance claim.

## 11 What was tried and what failed

The working notes give full chronology. Important recovery context:

- The first Mac integration built the real v2 kernel and a Python/reference
  public store, then real pinned Triplex conformance. Python was initially useful
  for integration/reference work; Contributor challenged its presence, and the production
  transport moved to direct native Node.
- A 512-assertion integration cap was removed as a general working ceiling;
  retained history now stays in DuckDB with larger explicit admission and scoped
  native input. Do not reintroduce whole-history host materialization.
- Separate native/Python/Triplex schema assumptions converged on the common v5
  physical store. Exact carrier/migration/cross-language checks matter.
- Native vector appends replaced large SQL VALUES construction. Late append
  failure poisons the whole transaction, even if the application catches it.
- Native schema commands originally needed fixes for large 4096-value plans,
  quote-expanded records, signed-min timestamp literals and correlated/lateral
  JSON input. The corrected plan uses uncorrelated prepared input.
- Incoming-context isolation cannot be proved by filtered SQL attachment listings;
  real probing showed HIDDEN is filtered. Use the owned factory profile.
- Query pragmas reject prepared `?` parameters. Controlled literal-token pragmas
  therefore caused repeated planning and a measurable regression. C++ now emits
  reusable read SQL with a BIGINT token parameter, with oversized-template fallback.
- The conditional cleanup review found a plausible gap, not a natural reproduction.
  Real-SDK injected faults led to independent cleanup, preserved errors and fenced
  teardown-only retry. Keep that evidence scope distinct.
- Borrowed schema metadata required preparing all vector aliases before retaining
  views. The v2 dictionary view can flatten an aliased child and invalidate older
  pointers. No view escapes a callback; changed DSL resets descriptor checks.
- A count test initially assumed zero-argument ordinary predicates existed. The
  real parser rejected them; the fixture was corrected, not the grammar widened.
- An ad-hoc A/B build supplied a relative output path and could not find generated
  `catalog_sql.hpp` from the compiler's native working directory. The normal
  absolute ROOT/build path succeeded; no dependency change was needed.
- 0.18's first full verification caught the reference cancellation cleanup race.
  Do not hide it with a retry. The subsequent lifecycle fix has a deterministic
  old-method failure/new-method pass and final full-suite PASS.
- The first late-delivery test mistakenly used `Timeline.rows`; its actual API is
  `Timeline.intervals`. That test fixture was corrected before final verification.
- No implementation of redundant-DISTINCT elimination, shape-aware costing,
  general native incremental joins, or the 20-case three-way benchmark was made.
  They are proposed next steps, not invisible completed work.

## 12 Research and source history

### Current integration checkpoints

| Commit | Main contribution |
| --- | --- |
| [`56e536f0`]([PRIVATE_REFERENCE_REMOVED]) | Mac v2 kernel and integrated persisted store |
| [`1fa1534e`]([PRIVATE_REFERENCE_REMOVED]) | Pinned Triplex conformance, cancellation, recovery, migrations, timelines |
| [`26dd8ace`]([PRIVATE_REFERENCE_REMOVED]) | Assertion-supported projections, contention and locked builds |
| [`0964c782`]([PRIVATE_REFERENCE_REMOVED]) | SQL-owned retained history and 20000-row public reads |
| [`a96d61ec`]([PRIVATE_REFERENCE_REMOVED]) | Direct native runtime/common catalog and measured hill climb |
| [`37d219c6`]([PRIVATE_REFERENCE_REMOVED]) | Native vector appends |
| [`b976da56`]([PRIVATE_REFERENCE_REMOVED]) | Native DSL/thin API architecture made explicit |
| [`cb6b08bf`]([PRIVATE_REFERENCE_REMOVED]) | Native schema compiler and runtime catalog |
| [`033ffabb`]([PRIVATE_REFERENCE_REMOVED]) | Native entity commands and history |
| [`6a6e875e`]([PRIVATE_REFERENCE_REMOVED]) | Native persisted Datalog API |
| [`fc3105fa`]([PRIVATE_REFERENCE_REMOVED]) | C++ SQL scan proofs and prepared read reuse |
| [`89d9750a`]([PRIVATE_REFERENCE_REMOVED]) | Bounded EAV joins and cost preference |
| [`4607f495`]([PRIVATE_REFERENCE_REMOVED]) | Native refs and historical target identity |
| [`8af43f81`]([PRIVATE_REFERENCE_REMOVED]) | Observed native command process-loss recovery |
| [`bb01ae99`]([PRIVATE_REFERENCE_REMOVED]) | Owned query cancellation/control bridge |
| [`a769701f`]([PRIVATE_REFERENCE_REMOVED]) | Parameterized controlled templates and cleanup faults |
| [`a8c5e5b8`]([PRIVATE_REFERENCE_REMOVED]) | Complete-source count SQL and gated native input packing |
| [`4188a997`]([PRIVATE_REFERENCE_REMOVED]) | Borrowed schema metadata, 0.17/135 checks |
| [`c08ed2dd`]([PRIVATE_REFERENCE_REMOVED]) | Extrema/exact sums, reference late-interrupt fix, 0.18/142 checks |

### Older branch research

These were the observed 4 November source heads, not freshly reverified current
PR heads. They explain provenance; do not merge every branch mechanically.

| PR | Historical head | Subject |
| --- | --- | --- |
| [7]([PRIVATE_REFERENCE_REMOVED]) | `a7ddd79021ce3f5a7030420ebc1003e855fccfde` | Original prototype |
| [8]([PRIVATE_REFERENCE_REMOVED]) | `0e8823973f5e1b886b7ef96e8dc5a899f467f241` | Independent native v0.6 |
| [9]([PRIVATE_REFERENCE_REMOVED]) | `dbb7d27a20430e09413f92259007961ad8e66ac3` | Direct continuation, stacked on PR8 |
| [18]([PRIVATE_REFERENCE_REMOVED]) | `983eaeb20cc93dac11d83b9042c339fc96d56971` | Independent SQL planner |
| [19]([PRIVATE_REFERENCE_REMOVED]) | `878871fec9416e32d5509210092b2cfd7008dadb` | Independent stratified negation |
| [20]([PRIVATE_REFERENCE_REMOVED]) | `3de749d706de5a421248195483ec22cd053972fb` | Aggregate conformance |
| [21]([PRIVATE_REFERENCE_REMOVED]) | `38d3723c08bed3ebd1e7b71da3fad2efa1b34c92` | Immutable template/CQ cache work |
| [22]([PRIVATE_REFERENCE_REMOVED]) | `d3143ce170916d10c21bed36d542bd54ab2d10ff` | Triplex boundary/host bridge |
| [23]([PRIVATE_REFERENCE_REMOVED]) | `7bf95500fb457debe0dfea18d6d09252b927fe4d` | Invocation cancellation authority |
| [24]([PRIVATE_REFERENCE_REMOVED]) | `a63ae47a2e88861ce9f8d01f265f86b102ab1db6` | History/recovery equivalence |

The older goal9 branch was recorded at
`e2c6c8f4ba422ebc998bc11ce32cf1c9f9d2f52e`, with uncertain historical publication.
Older goal8 local-result preservation also had an unresolved owner/publication
state. The current Mac implementation does not establish those older outcomes.
Use the indexed published source/evidence and keep their historical scope labels.

The [research index](research-index-20261104.md) maps primary contracts, hand
oracles, v2 vector/lifetime research, exact numeric/FP rules, SQL proofs, cancellation
ownership, history/evolution, cache semantics and Triplex runtime boundaries.
The [Effect/build synthesis](triplex-effect-build-research-20261104.md) explains
scoped resources, interruption/rollback ownership, package build pitfalls and
the distinction between conformance and optional provider coverage.

Useful official references checked during this continuation:

- [DuckDB v2 vector API contract](https://github.com/duckdb/duckdb/blob/v2.0.0/api_spec/v2/vector/vector.yaml)
  and the vendored header's `vector_get_view` lifetime/alias notes.
- [DuckDB 2.0 recursive CTEs](https://duckdb.org/docs/2.0/sql/query_syntax/with),
  including USING KEY; SQL is a serious recursive baseline.
- [ASOF joins](https://duckdb.org/docs/2.0/guides/sql_features/asof_join),
  [indexing/order and zonemaps](https://duckdb.org/docs/2.0/guides/performance/indexing),
  [window functions](https://duckdb.org/docs/2.0/sql/functions/window_functions) and
  [profiling](https://duckdb.org/docs/2.0/dev/profiling).
- [Datomic history/as-of/since](https://docs.datomic.com/reference/filters.html),
  [XTDB business/system time](https://docs.xtdb.com/about/time-in-xtdb.html),
  and [Fowler's bitemporal history](https://martinfowler.com/articles/bitemporal-history.html).
- [AWS event sourcing](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/event-sourcing-pattern.html)
  and [Microsoft materialized read models](https://learn.microsoft.com/en-us/azure/architecture/patterns/materialized-view).

These references inform design; they are not evidence that our implementation
matches another system's complete semantics or performance.

## 13 The queued twenty real world workloads

This is the proposed workload list presented to Contributor, preserved so it does not
vanish with chat context. Contributor approved researching this direction and confirmed
DuckDB; a final detailed schema/query specification and implementation have not
been completed. All fixtures are synthetic. Current kernel support does not
imply an optimized end-to-end implementation of every row below.

| # | Query and main facts | Fixture and required answer | Direct SQL technique |
| --- | --- | --- | --- |
| 1 | Historical order status: order/status transitions | Paid at 20, shipped at 30; V25 returns paid after shipment is known | Replay versus bitemporal lookup |
| 2 | Corrected customer address | A recorded first, B later backdated; same V gives A at K1 and B at K2 | Correction resolution and two-time filter |
| 3 | Price at purchase: product, prices, purchases | Price 100 before 50 and 120 from 50; purchases at 49/50 use 100/120 | Interval join, ASOF only for equivalent nearest-preceding semantics |
| 4 | Coverage at claim time: policy/customer/interval | Coverage [10,30); claim29 covered, claim30 uncovered; later correction affects later K | Interval join and historical correction |
| 5 | Duplicate/reordered webhooks: source IDs and object revisions | E twice counts once; older revision arriving last must not replace newer authoritative state | Dedup plus domain-specific reducer |
| 6 | Account balance: posting IDs/account/signed amount/currency | Two distinct +500 events and -200 yield 800; duplicate delivery leaves 800 | Exact signed SUM preserving event identity |
| 7 | Available inventory: physical and reservation movements | Receive10, reserve4, release1 yields 7 available; cancellation does not create physical stock | Separate movement aggregates |
| 8 | Net revenue by customer: capture/refund/customer | Pay1000, refund100 and200 yields 700 without join multiplication | Preaggregate each source before joining |
| 9 | Paid but unprovisioned subscriptions | Paid S with no entitlement returns S; later entitlement removes it at newer K | Joins and NOT EXISTS |
| 10 | Stuck workflow with source completeness | Start10/deadline20; before watermark20 report pending knowledge, after it report overdue if no terminal event | Anti-join with explicit completeness condition |
| 11 | Inherited access: membership/grant/resource ancestry | User→team→organization→folder grant allows; expiring required edge removes access at boundary | Temporal recursive CTE |
| 12 | Explicit deny over inherited access | Two allow paths plus active block denies; correcting erroneous block restores access | Recursive allow then anti-join |
| 13 | Nested pallet contents: container/item edges | Pallet→case→A/B; moving B out leaves A, duplicate paths do not duplicate items | Recursive containment/set semantics |
| 14 | Product recall: transformation and shipment facts | Contaminated A contributes to B shipped to C; correcting input relation removes C's implication | Genealogy closure plus shipment join |
| 15 | Vulnerable deployed dependencies | AppX→Y→vulnerableZ returns X once; include cycles/diamonds | Recursive dependency CTE |
| 16 | Historical data lineage: run/input/output/code versions | D used A/B/code7; metadata adding C later changes K2 only | Versioned ancestry traversal |
| 17 | Ordered conversion funnel | View→checkout→payment qualifies; view→payment→checkout alone does not | Ordered joins/window sequence analysis |
| 18 | Machine uptime interval union | [0,5),[3,8),[10,12) gives 10 units, not naive sum12 | Gaps-and-islands/interval union |
| 19 | Point-in-time ML features and labels | A feature correction learned after prediction cannot leak into its historical example | Per-label business/knowledge-time joins |
| 20 | Incremental alternate support | A reaches D through B and C; remove B→D and retain answer; remove C→D and delete it | Full closure versus maintained supports |

Research sources for these proposed patterns include
[Stripe webhook ordering/duplicates](https://docs.stripe.com/webhooks),
[subscription lifecycle](https://docs.stripe.com/billing/subscriptions/webhooks),
[OpenFGA inheritance](https://openfga.dev/docs/modeling/parent-child),
[blocklists](https://openfga.dev/docs/modeling/blocklists),
[GS1 EPCIS](https://ref.gs1.org/standards/epcis/),
[OpenLineage](https://openlineage.io/docs/spec/object-model/) and
[point-in-time feature extraction](https://docs.xtdb.com/adbc/guides/point-in-time-feature-extraction.html).
The research sub-agent additionally suggested subscription cohorts, pallet
location audit, dependency-review exceptions and corrected measurement cohorts;
these were candidate ideas, not extra executed tests.

### Three versions of each workload

1. **Naive SQL:** append-only event envelope with source/event identity, subject,
   kind, schema version, optional authoritative stream revision, occurrence time,
   recorded position, correction/causation links and payload. Reconstruct state
   at query time with the correct domain reducer. Arrival-time last-write-wins is
   not a valid generic reducer for deltas, patches or additive lineage metadata.
2. **Direct DuckDB:** typed domain-specific bitemporal version/edge/event tables,
   handwritten joins, windows, ASOF and recursive USING KEY where appropriate.
   Retain equivalent history and provenance. Allow maintained projections and
   report their write/refresh/storage cost.
3. **Our temporal store:** canonical typed EAV assertions, runtime DSL schemas,
   Datalog/native semantics and proved SQL, with derived typed projections or
   indexes where they help. Facts remain the source of truth; projections should
   be rebuildable and their maintenance cost measured.

The ambition is substantial wins over naive replay and competitive or better
reads than tuned direct DuckDB. That is a target, not an existing measurement.
Simple typed lookups/sums can favor direct DuckDB. Do not manufacture a win by
giving only our engine free precomputation or omitting result conversion.

Record exact fixtures/oracles, complete decoded equality, cold/warm and prepared
behavior, correction latency, p50/p95/p99, memory/spill, retained history, storage
amplification and projection maintenance. Separate on-demand and maintained-read
comparisons. Scale within current limits first; exceeding a capacity gate is a
recorded unsupported case, never silent truncation or an unreported limit change.

The scale ladder should progress from 100000 to 1 million, 10 million and larger
retained facts/events as the implementation and available resources permit.
These are proposed benchmark stages, not achieved capacities or user-specified
SLOs. Count business events, physical assertions, active relevant facts and
returned rows separately. Include long history with selective reads, broad
aggregates, joins and recursive/exception queries. Add concurrent-reader sweeps
(for example 1/4/16/64 readers), sustained read throughput and tail latency under
ongoing ingestion. Exact reader targets, latency objectives and hardware budgets
remain to be agreed. Tiny-query samples do not substitute for massive-data or
concurrent-reader evidence.

## 14 Open product and engineering questions

- What first-class native assert/retract fact-transaction API should sit beside
  full-record replacement? How should interval-local correction split history
  atomically, bind schema meaning and preserve replay receipts?
- Which business-event identity/revision rules belong to ingestion contracts?
  Different sources have different duplicate and ordering semantics. Distinguish
  business causation, database transaction identity and assertion correction.
- Which relationship facts persist as historical occurrences, and which describe
  current/interval state? A historical transformation edge need not disappear
  when a physical lot is consumed. Keep temporal paths coherent.
- When does missing data mean false, and when is it unknown/pending? Anti-join
  alerts need an explicit domain completeness/watermark policy.
- How should schemas express global uniqueness, temporal reference overlap,
  deletion and cascades? Current stable-identity refs do not decide those rules.
- How much exact Triplex compatibility is required before replacing its remaining
  TS semantics? The native target is agreed; full compatibility has not been
  specified or achieved by Capabilities.none conformance alone.
- Can read integrity validation become selective without overlooking inactive
  corruption or external writes? Current full retained checks create an O(history)
  floor even for selective reads. Do not remove them without a replacement proof.
- Which physical derived layouts/indexes help while canonical facts remain EAV?
  DuckDB's storage order/zonemaps and typed domain projections are real competitors.
- How should costing use program shape and active/relevant/history cardinalities?
  The current single retained-row threshold is intentionally crude.
- How can recursion/index/dictionary allocations be fully accounted for or use
  DuckDB-managed spillable intermediates? Current buffer/logic limits are incomplete.
- How should scalable SQL-owned query admission differ from bounded native
  fact-list admission so millions of scanned facts do not require millions of
  host objects or native derived facts? How are old budget guarantees preserved?
- What concurrent-reader ownership/deployment model and latency/throughput SLOs
  should the product offer while ingestion continues? The serialized factory
  and two-connection conflict tests do not answer that.
- What native interval-result/multi-cut interface supports uptime, historical
  causality and per-label feature extraction efficiently? The current native
  Datalog API selects one V/K cut; these wider forms are not automatically done.

## 15 Suggested continuation order

The user asked for the ten items first. Review the current ledger and select a
concrete remaining integrated slice; do not restart the entire research program.

1. Confirm branch/head and clean worktree, read this handoff and current receipts.
   No new native-code work was started after 0.18 while this handoff was written.
2. Prioritize the clarified large-data/read-concurrency target. Design and prove
   scalable SQL-owned admission, inspect the global retained-integrity scan floor,
   and validate independent reader connections/transactions under ingestion.
   Establish real million-row and concurrent-read evidence before describing
   the scale ambition as achieved. Exact SLOs and capacity-profile changes remain
   explicit decisions.
3. Inspect real plans/costs for focused optimizations. Unimplemented candidates
   include proving projection injectivity to remove redundant DISTINCT and
   shape-aware aggregate costing. Benchmark them at relevant scale with full
   semantics and regressions; write microbenchmarks are secondary now.
4. Continue the correctness/integration gaps in goals 6–10: resource ownership,
   broader recovery, supported reuse/incremental deletion behavior, interval APIs
   and Triplex delegation. Keep exact acceptance slices and evidence.
5. Specify and implement fact transactions/interval-local patches where needed
   for the agreed fact-store vision; preserve the existing replacement contract.
6. Build the twenty-case schema/query/oracle suite as the next workload track,
   with the three fair baselines, rather than claiming the brainstorm is a test run.

The latest evidence and all source are committed. At handoff preparation, no
build, test, benchmark, child database process or coding agent remained active;
the implementation/research sub-agent completed its read-only review. The PR is
draft. Before this documentation checkpoint is published, the remaining work is
its documentation commit and verified PR/head update. For a takeover, use the
branch containing this file and check its actual current head rather than
assuming this preparation note describes a live pending operation.

## 16 Copyable task for the next agent

> Continue Contributor's native DuckDB temporal fact store at high effort. Start by
> reading projects/temporal-datalog/handoffs/mac-zero-context-takeover-20261105.md
> and runtime/TEN-GOAL-LEDGER.md on mac/temporal-store-integration-20261104, draft
> PR 25. The verified code checkpoint is c08ed2dd, extension 0.18, 142 scoped checks
> plus TypeScript. Build a performant integrated fact store with C++ semantics,
> schemas compiled into runtime catalog data and thin TS/SQL APIs; the Triplex
> adapter is transitional. The product must target millions of retained facts/events,
> fast large-data queries and many concurrent readers; write throughput is secondary.
> Current tens-of-thousands benchmarks, active-fact cap and single-connection factory
> do not satisfy that scale target. Preserve exact typed values, full history, canonical
> native errors, fresh query admission, acknowledgments and resource ownership.
> Continue a concrete remaining ten-goal slice using actual DuckDB and honest
> full-path benchmarks. Record what ran, what failed and what remains. Keep
> incremental commits and the existing draft PR current. The proposed twenty-case
> event-sourcing comparison means naive SQL versus tuned DuckDB versus this
> temporal store, and is queued after the ten-item work. Do not repeat status
> summaries instead of implementing or assume all ten are complete.
