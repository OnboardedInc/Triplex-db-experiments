# Mac integration working notes

## 2026-11-04 23:29 UTC — first real public-path checkpoint

Read roadmap sequence 132, verified handoff, source index and Triplex/Effect
build research through consolidation commit daba053f. All eleven remote
implementation heads matched the handoff. Source provenance records each
integrated kernel/compiler input. No existing implementation branch was merged
or changed. Goal3.1/8/9 uncertain historical runs/publications were not retried.

New build: strict C++17 Mac port, DuckDB 2.0.0 C API v2; actual LOAD completed.
Added AArch64 floating-point control admission, preserving gradual underflow
and nearest rounding without changing thread controls. Native-owned row storage
differs from the Linux ABI; the strict IR2 consumer now uses the tested Mac
layout (24-byte row plus 32 bytes per value), rather than silently accepting
the historical Linux layout. Build outputs stay untracked.

Executed `python -m unittest -v test_store`: 9 methods PASS, 6.206 seconds.
They cover strict four-tag SQL/native round trips, int64 endpoints/subnormals,
atomic corrections and receipts through same-database reopen, failed-command
rollback including partial retractions, expression faults/reuse, shared-cut
negation and reordering, aggregate full-tuple set contributions/empty/overflow,
recursive fallback/work limits, serialized duplicate commands and randomized
raw-input temporal-oracle comparisons across 30 commands. These are one bounded
integrated suite, not the historical 1,210-attempt plan or Triplex conformance.

Initial syntax smoke used invalid variable spelling and failed before a read;
corrected to the documented `?variable` syntax. Initial integration rejected
the genuine compiler layout mismatch, then passed after an explicit Mac
contract change. An aggregate smoke correctly rejected a source atom with a
constant column; the supported form projects through a complete source relation.
These failures were not promoted to passes.

Next: recovery/fault tests, native cancellation/resource integration, immutable
compiler reuse and history endpoint controls; exact-source Triplex build,
semantic adapter typecheck and actual public conformance. Physical memory
containment, full resource ownership and production durability remain open.

## 2026-11-04 23:45 UTC — public conformance, recovery and controlled native execution

Exact upstream Triplex e24dcdbf core/testkit/sql built with the committed source
and one shared Effect 4.0.3 peer. Stock tsc emitted an extensionless upstream
import that Node rejected; the pinned official tsdown 0.21.7 recipe resolved it.
No upstream contract/source was patched. Adapter semantic typecheck passed.
The unmodified full runtimeConformance helper passed all 44 cases with
Capabilities.none, including through the new public runtime factory. Four
additional real-engine methods passed for restart/scope rejection, nested
transaction poisoning, Effect interruption/acknowledged rollback and shared
layer initialization-failure cleanup. Exact package integrity closure is saved
in adapter/build-deps; no installed packages or computer snapshots are saved.

The new controlled v2 scalar owns a registry token, shared atomic cancellation
and monotonic deadline. Native work, filters, input, rounds and result delivery
check it; SQL also uses the supported driver interrupt. Actual native-loop
cancellation and deadline tests complete with connection reuse. This avoids
pretending the C API exposes an internal client interrupt poll. Full private
memory accounting and physical containment remain incomplete.

Python public-path validation now passes 16 methods, including randomized
temporal SQL/native/oracle equality, five abrupt writer exits around receipt,
retraction/assertion/clock/commit, lost-ack resolution via receipt, exact normal
reopen, actual v1→v2→v3 schema evolution and failed-migration rollback. DuckDB
initially rejected NOT NULL alteration while indexes depended on the table;
the migration now transactionally drops/recreates those declared indexes.
The timeline API coalesces adjacent equal answers without bridging gaps and
matches point reads across relevant endpoints, corrections and empty groups.

SQL-selected reads now scan persisted strict typed carrier columns at the shared
cut. The proof still validates bounded retained history in Python. Nine paired
full-path measurements after three warmups, alternating route order, checked
complete answers on every pair. SQL/native medians in milliseconds: scan512
18.986/21.678; join192 10.683/11.402; aggregate256 10.981/11.251. These small
shared-runtime workloads are not universal speedup or large-store evidence.

Verification receipt at 23:44:26 UTC records 16 Python methods, semantic TS,
44 pinned public-factory cases and four adapter methods PASS. The next receipt
will bind any subsequent source changes. Remaining ten-goal gaps are explicit
in TEN-GOAL-LEDGER.md; no all-ten or production acceptance is claimed.

## 2026-11-04 23:52 UTC — contention and restricted incremental maintenance

Added and executed a two-real-connection conflict test. A barrier makes both
commands stage their headers before contending; one commits, the other rolls
back. Retrying the complete losing command produces the next position, leaving
exactly two complete receipts/history entries and no position gap.

Added fixed-valid-cut latest-knowledge EAV projections with assertion-ID support
tracking. Local committed deltas maintain the projection; failed commands never
publish it, and external committed positions trigger a fresh rebuild. Two new
methods passed: duplicate support/retraction/failure/reopen/external-commit
controls and 30 randomized command sequences compared with fresh SQL and native
reads at three fixed cuts. This is deliberately restricted incremental work,
not general recursive deletion maintenance.

The separate projection benchmark charges writes as well as reads on identical
command streams. Its first 21 measured commands gave median maintained/plain
write 3.511/2.901 ms and maintained/fresh read 0.519/5.616 ms. Later final raw
measurements are retained separately rather than replacing these observations.
Native polling was extended through index construction, output conversion,
sorting and DuckDB output publication. Full private memory accounting and
physical containment remain an explicit uncompleted goal6 requirement.

The combined final native build/source checkpoint passed 19 Python methods,
semantic adapter typecheck, all 44 pinned public-factory conformance cases and
four additional adapter methods. The build recipe also completed against the
verified clean tracked upstream source and freshly reinstalled locked npm
dependencies (`npm ci --offline` from this task's official package acquisitions).
Optional WASM peer warnings did not prevent the selected native bundler build;
this is not a WASM portability test or full upstream pnpm check.

Final paired SQL/native medians (ms) were scan512 19.694/22.454, join192
14.003/13.219 and aggregate256 13.118/12.582. The final run is mixed: SQL was
slower on the latter two small workloads. No broad planner-performance win is
claimed. Final projection maintained/plain write medians were 3.812/2.987 ms,
and maintained/fresh read medians 0.533/5.673 ms; maintenance cost is included
in the separate command-stream workload. Complete raw samples, code hashes
and the native build identity are in the benchmark receipt.

## 2026-11-05 01:30 UTC — SQL-owned large-history reads

Removed the 512-retained-assertion restriction. Storage admission now has an
atomic version4 usage ledger and declared ceilings of one million retained
assertions / 256 MiB of logical payload; the largest executed fixture is 20000
rows, not a claimed million-row run. Writes accept up to4096 operations and
insert parameterized batches instead of issuing one statement per assertion.

SQL validates all retained carriers, including inactive rows, and computes
fresh set cardinality/domains for the genuine compiler's EAV atoms inside the
read transaction. The existing conservative proof consumes an explicit owned
statistics contract. Native fallback receives only the validated active set,
with its existing invocation/output budgets; neither path calls eager Python
history loading. A new inventory-free v2 DOUBLE-to-bits scalar preserves exact
subnormal/signed-zero carrier validation. History has a bounded paging API;
pages do not yet supply a cross-page pinned cursor.

Executed three new large-history methods: 20000 assertions with SQL/native
count equality, corrections, prior knowledge cut, usage rollback, paged reads
and same-file reopen; corrupted inactive f64 carrier rejection; native output
budget failure followed by healthy reuse. Full combined verification passed
22 Python methods, semantic TypeScript, all44 pinned Triplex cases and four
adapter lifecycle methods. New paired benchmark adds a20000-row count workload
and binds every sample packet to source and native artifact hashes. See the
current evidence files for complete measurements. Shared-schema integration
and full native memory accounting remain unfinished.

## 2026-11-05 02:18 UTC — direct native path, common catalog, measured hill climb

Following Contributor's direction to push the native C++ engine, replaced the production
Triplex Python subprocess with @duckdb/node-api 2.0.0-r.1 (engine 2.0.0). The
reference transport remains only for comparison. The C++ extension now provides
`PRAGMA td_initialize`, embedding the canonical version-5 catalog and executing
its DDL through DuckDB's query-pragma API in the caller's transaction.

Version 5 shares one assertion table, command registry, position clock and usage
ledger. Triplex's former tables are projections. Native exact scalar values and
Triplex-specific tags remain distinct. Fractional validity is retained alongside
its integer-domain projection; unrepresentable exact integers/time bounds fail
at Triplex initialization. Cross-language tests cover sequential writes,
correction history and position reuse; they do not certify identical command
journal semantics or concurrent cross-process writers. A legacy Triplex fixture
tests migration, interrupted migration rollback, subnormal/boolean preservation
and blob metadata accounting. Independently populated histories are not silently
merged.

The direct binding streams chunks, releases results, explicitly types int64
parameters (default Node inference otherwise selects HUGEINT), retains exact
integer versus DOUBLE results, bounds traces, and supports SQL interruption.
The first streaming implementation failed to stop on DuckDB's empty terminal
chunk; that was fixed before acceptance. Integer conversion/overload failures
were also reproduced and fixed, not counted as passing runs.

Initial transport comparison found large-read gains but slower repeated tiny
queries. Added a 32-entry / 256-KiB-SQL SELECT prepared-statement cache. It clears
bindings, releases results, drops failed statements, and relies on DuckDB catalog
rebinding; real tests change parameters, update/roll back data, ALTER the selected
table, evict entries and close. These limits account for SQL text, not all native
heap allocations. In the final five measured pairs after two warmups, native
20,000-row reads were 11.55 ms versus 47.62 ms for the reference transport;
100 parameterized tiny queries were 12.19 ms versus 21.59 ms. Opening was measured
separately (20.50 versus 135.12 ms). Complete results were checked every attempt.

In C++, known-fact insertion avoids a redundant hash probe and global aggregates
avoid hashing the same empty key for each row. Work charging, polling and error
ordering remain unchanged. Four alternating binary pairs against 0964c782 check
every answer. Median direct-core total gains were approximately 3–8% for the
four measured workloads; these exclude persistence and host costs. See raw
source-bound native and full-path reports for scope and distributions.

Final verify.py: 25 Python methods, semantic TypeScript, all 44 unmodified Triplex
runtimeConformance cases through the native factory, and eight direct native
adapter tests PASS. Build artifacts/dependencies/databases remain untracked.
The native entity-schema DSL and full native Triplex semantic validation,
allocation accounting, wider contention/disk-fault/backup coverage, and general
incremental joins/recursion remain open. This is a verified native checkpoint,
not an all-ten or production acceptance claim.

## 2026-11-05 02:47 UTC — native vector ingest and recovery

The next bottleneck was write expansion: a 4096-row command became 128 separate
SQL VALUES inserts, plus per-chunk usage reads/updates. Added an owned typed
append-plan contract to the existing transaction-owner queue. Native ports now
use DuckDB data chunks/appender; reference ports retain the SQL path. The native
batch admits at most 2048 rows and splits toward 8 MiB of logical input. No C++
evaluator semantics were changed in this step; it removes repeated SQL parsing,
binding and round trips from the native storage path.

Every appender is flushed and closed before usage accounting continues. Failed
pending rows are cleared without replay; cleanup failure fences the connection.
Input admission failure after an earlier chunk also invalidates the transaction,
so a caller catching an exception cannot commit a partially appended command.
Tests exercise both a duplicate in the second chunk and a later oversized value,
then verify rows, clock, receipt and usage rollback followed by healthy reuse.
All seven Triplex carriers and byte-driven chunk splitting are exercised.

A separate native-process fixture exits abruptly after the first chunk, before
commit and after commit. A fresh process verifies all-or-nothing rows, history,
receipt and usage, and then writes a healthy next command. Committed command
identity is reconciled rather than replayed. Appender flush is synchronous;
physical allocation containment and a hard cancellation-latency bound remain
open.

The benchmark alternates both native appender and SQL VALUES modes using the
same current source/engine. It charges the full command transaction and verifies
all fields of every returned row. It uses two warmup pairs and five measured
pairs at 32, 512 and 4096 rows. Exact medians, every sample and source hashes are
in evidence/native-write-benchmark.json. Bounded trace counts are explicitly
marked incomplete when the trace has wrapped. The full verification includes
25 Python methods, all 44 Triplex cases, semantic TypeScript and eleven native
adapter tests. The earlier remaining-goal boundaries still apply.

Final measured write medians (SQL VALUES → appender): 32 rows 13.58 → 4.93 ms;
512 rows 164.79 → 9.10 ms; 4096 rows 1249.51 → 32.77 ms. These are 2.76×, 18.10×
and 38.13× on the selected workloads, not general database speedup claims.

## 2026-11-05 — confirmed native architecture target

Contributor explicitly reaffirmed native C++ semantics, schemas defined through a DSL,
thin TypeScript/SQL APIs, a transitional compatibility adapter, and runtime
catalog definitions that permit new entity types without rebuilding the
extension. Recorded this as the governing target at the top of DESIGN.md and
linked it from README.md and the ten-goal ledger.

The next milestone is the native DSL → versioned runtime catalog → native
validation path, tested through both interfaces. Acceptance includes adding an
entity type, reopening, preserving historical schema meaning, and verifying the
same extension hash throughout. Existing version-5 physical DDL and faster
adapter ingestion are foundations; the native entity-schema path remains open.

## 2026-11-05 03:29 UTC — native schema compiler, catalog and validator

Implemented the first native schema slice in extension 0.8.0. C++ parses a
bounded DSL into canonical descriptors, registers immutable schema versions as
rows in td_catalog_v1.schemas, and validates complete entity records. Native
catalog views expose entity/attribute descriptors. Adding an entity type or a
schema version changes runtime data and does not rebuild the extension.

The initial profile includes text, Boolean, int64 and float64, closed records,
required fields, one/many cardinality and exact full-value set identity. It
preserves int64 endpoints, finite float bits/subnormals and Unicode scalars.
Unsupported types/modifiers fail. Catalog use recompiles/verifies the stored
descriptor before record validation; mismatches fail after reopen too. Schema
registration is one atomic SQL mutation produced by a C++ query pragma, with
literal quoting and no reentrant SQL execution in scalar callbacks. An initial
upsert/immutable-version failure on first insert was fixed with explicit NULL
old-row handling; first, repeated and changed-version registrations now have
executed regression coverage.

NativeSchemaCatalog is a thin TypeScript entry point: primitive serialization,
bounded transport encoding, operation sequencing, errors and lifecycle. Schema
meaning and validation rules live in C++. SQL calls the same engine functions.
The six schema tests cover canonical/idempotent versions, constraints/set
identity, scalar/Unicode boundaries, SQL rollback/quoting, same-binary new
entity/reopen, SQL/TypeScript parity and persisted descriptor mismatch.

Hill climb: native vector callbacks originally recompiled the same definition
for each record. They now retain one immutable template for adjacent equal DSL
within the callback, while checking every descriptor and record. Late-row
required-field and descriptor faults prove results are not cached. The cache
ends with the callback and stores no record values, permissions or live catalog
handles. A private build-time control reproduces an uncached/cached A/B using
identical source; the default extension enables reuse. On 512-row validation,
measured medians were 1.674 → 1.117 ms for two attributes and 20.790 → 9.740 ms
for 64 attributes (1.50× / 2.13×). These callback/query measurements include full
owned Boolean output and exclude connection opening. Every attempt also checks
a last-row error. Full source/build hashes and raw samples are in the schema
benchmark packet.

The full verification covers 25 Python methods, 44 unchanged Triplex cases,
eleven native adapter tests and six native schema tests, plus semantic TypeScript.
Schema enforcement in native transactional commands, binding versions to data
history, references/global graph constraints and schema-aware planning remain
open. Existing Triplex writes do not yet enforce the new definitions. The guide
and ten-goal ledger distinguish this completed native slice from those remaining
parts of the required architecture.

## 2026-11-05 04:30 UTC — native schema-bound commands and history

Implemented the next native slice in extension 0.9.0: C++ owns full-record
entity replacement, canonical idempotency, schema/type ownership, schema-version
binding, temporal point/history query cuts and SQL generation. TypeScript's new
NativeEntityStore owns primitive codecs, sequencing, error conversion and
connection lifecycle. SQL calls the same td_put_entity/td_entity_receipt/
td_entity_history/td_entity_at pragmas. Schemas remain runtime catalog data;
actual commands under a new entity type and evolved version survive reopen with
the same extension hash. Existing Triplex appends remain the compatibility path
and do not automatically enforce these user schemas.

The shared version-5 assertion table remains authoritative. Native creator
commands add schema-version/hash metadata in td_catalog_v1; ownership fixes an
entity's schema name/type. Replacement closes all live native assertions for an
entity and appends a validated complete record with the supplied valid interval.
It supersedes old knowledge across the entity, rather than patching only that
valid-time span. Historical reads verify original schema descriptors, command
bindings, declared tags and typed carriers. Foreign/legacy live assertions are
rejected rather than silently adopted.

The pinned C API v2 does not expose a supported context-to-connection SQL
executor. The implementation uses query-pragma expansion, without reentrant
scalar SQL or private opaque casts. A fresh initialization probe showed late
DDL failure rolls back earlier statements in the expansion. Permanent tests
then injected a UNIQUE failure at the late assertion INSERT, after receipt,
command binding and retractions. Both direct run and stream paths preserve all
prior facts, usage, clock and receipts, remove temporary tables, and permit a
healthy whole-command retry after a confirmed absent receipt. An explicit SQL
transaction can roll back a successful native command. Two actual connections
exercise a write conflict and reconcile the missing receipt before retry.

Development measurement found a real 4096-value OOM under the fixed 128 MiB
runtime. Isolating each generated statement identified the correlated
json_each(c.prepared) expansion: it repeated the complete prepared record through
the lateral plan. Changed this to one uncorrelated scalar JSON input, retaining
the same semantics and memory limit. A permanent test now executes 4096-value
insert/replacement, 8192-row history, over-limit rejection and a 64 KiB record
whose safely quoted SQL exceeds the old transport limit. The transport's byte
admission is now 256 KiB; result/statement-cache bounds remain unchanged.

Nine native command tests cover those cases plus exact four-tag sets, canonical
replay after later corrections, historical version meaning, runtime new types,
reopen, independent Python/native Datalog equality, interval/schema admission,
legacy IDs/ownership, and descriptor/binding/carrier corruption rejection.
Final verification passes all 95 checks: 25 Python methods, 44 unchanged Triplex
cases, eleven adapter tests, six schema tests and nine native command tests,
plus semantic TypeScript. Verification and benchmark source hashes match the
final source tree.

Selected complete native command timings (two warmups, five measured attempts)
include TypeScript serialization, native validation/SQL expansion, transaction
execution and owned receipt; open/definition and full output checks are outside
timing. Final insert/replacement medians: 1 value 13.63/13.73 ms, 64 values
15.00/15.38 ms, 4096 values 31.11/55.98 ms. Source/build hashes and every sample
are in evidence/native-entity-benchmark.json. This is a current-path measurement,
not a speedup comparison against the differently scoped Triplex appender API.
Small-command statement overhead remains an optimization target.

References/global graph constraints, interval-local patch/adoption APIs,
schema-aware planning, complete Triplex delegation and the previously recorded
resource/recovery/incremental-maintenance boundaries remain open. The ten-goal
ledger distinguishes this native milestone from full-goal completion.

## 2026-11-05 04:53 UTC — native-owned persisted Datalog reads

Extension 0.10.0 adds td_query_store and NativeEntityStore.query. C++ compiles
the complete program, collects attribute scope and generates the one-cut
persisted query. DuckDB validates all retained carriers, including inactive
history, checks original native schema bindings and builds a distinct active
EAV set. The existing C++ stratified engine evaluates it directly, without a
TypeScript/Python fact list. Exact int64 and float bits survive SQL/JSON result
conversion and the thin TypeScript decoder. The result exposes the selected
knowledge position, native route/reason and counters, including an empty answer.

Added a callback-local timed evaluator using existing invocation polling. Its
deadline covers native evaluation, not SQL preparation/retained validation or
output conversion. No new global token/cache authority is created. Native work,
round/fact and deadline failures produce no partial answer and permit healthy
connection reuse. The initial native read route deliberately remains bounded
native; the existing reference planner's SQL-first proofs still need native
integration. No SQL-first performance claim is made.

Tests found two concrete boundary problems during development. A minimum signed
int64 timestamp followed by ::BIGINT casts the positive magnitude before unary
minus in DuckDB; canonical signed decimal string casts now preserve the endpoint
in writes and persisted reads. Explicit knowledge cuts above the committed
clock now reject, including for an entity with no assertions. An initial
two-SELECT point-read check hit DuckDB's one-result expansion restriction; it is
now a single result query with an error-only UNION branch and is tested through
the existing point-read suite. SQL lambdas use the supported 2.0 syntax;
see the [official lambda contract](https://duckdb.org/docs/2.0/sql/functions/lambda).

A catalog probe corrected an earlier inaccurate Python comment: both
duckdb_databases() and PRAGMA database_list omit HIDDEN attachments in this
engine. The pinned [database table function](https://raw.githubusercontent.com/duckdb/duckdb/v2.0.0/src/function/table/system/duckdb_databases.cpp)
explicitly filters them; the [pragma view](https://raw.githubusercontent.com/duckdb/duckdb/v2.0.0/src/catalog/default/default_views.cpp)
uses that table function. The current v2 callback context exposes no unfiltered
attachment enumeration. The fresh native factory accepts a database path, owns
its instance/connection and disables external access before public use. SQL
catalog-count checks are diagnostics for visible attachments, not proof for
arbitrary supplied sessions. Generic host-supplied attachment admission remains
open in the ledger; no old held operation was retried.

Six new real-engine tests cover exact four-tag values and temporal cuts,
recursive reachability with stratified negation, full-tuple aggregates and
checked expressions/eager faults, work/deadline/static errors followed by reuse,
inactive corrupt carriers/original schema bindings, relevant 512-byte profile
admission, and thin SQL/TypeScript parity after reopen. Final verification passes
101 checks: 25 Python, 44 pinned Triplex, eleven adapter, six schema, nine native
entity and six persisted-query cases, plus semantic TypeScript.

The new source-bound query packet measures complete API calls on 64, 4096 and
20000 retained facts, including native compilation, retained/schema checks,
snapshot selection, evaluation and full owned exact output. Open/fixture
creation are excluded; every count and projected value is verified. It retains
two warmups, five samples, source hashes and native artifact identity in
evidence/native-store-query-benchmark.json. On the final run, the 20000-fact
count median is 44.23 ms and complete 20000-value projection median 110.96 ms.
These are selected current-path timings, not a before/after speedup claim.

## 2026-11-05 05:40 UTC — C++ SQL scan proof and prepared query reuse

Extension 0.11.0 adds the first native SQL-first lowering. The C++ compiler
recognizes a whole program with one ordinary answer rule over one triple atom,
excluding other rules, ground facts, filters, negation and aggregates from this
route. It emits exact five-slot comparisons for constants/repeated variables,
DISTINCT projection and native typed ordering. Fresh SQL-owned snapshot
statistics must prove conservative native fact/round/work/dictionary/output
bounds. An unproved budget selects the same bounded native evaluator rather
than widening admission or rejecting a query it might accept. DESIGN.md records
the bound construction and model identity. General native joins/aggregates
remain open; no host-side planner was introduced.

SQL reports proved_single_atom with null native counters. Native fallback
reports bounded_native_store or single_atom_budget_unproved; forceNative uses
td_query_store_native and reports forced_native. Both call the same native
program compiler and share retained carrier/schema checks and one cut.

The existing prepared-statement LRU now includes only the two native read-only
query pragmas alongside SELECTs, under the same 32-entry/256 KiB source bound.
Every execution refreshes data, schema meaning and budgets. Tests repeat a
prepared query across an uncommitted replacement, rollback, schema-version/type
change and cache eviction. Parameters/results are cleared after each call;
failed statements are discarded. No facts/results or new host compiler cache
are retained. A separate compiled-query-text cache was tried and removed after
it gave no measured latency benefit. A small-scan cost threshold likewise failed
to improve the complete automatic path and is not shipped.

History validation now uses td_validate_schema_fact_v1 to consult the native
compiled schema directly instead of joining JSON attribute views per assertion.
It checks each descriptor/entity/attribute/tag even with callback-local immutable
definition reuse. A last-row wrong-tag test rejects after a valid first row.
The thin text serializer rejects unpaired Unicode and NUL before UTF-8
conversion, preventing metadata/program text from silently becoming replacement
characters. Schema meaning remains in C++.

Ten persisted-query methods now include 45 typed SQL/native identities across
constants, repeated variables, projection/set identity and ordering, plus fresh
budget/cut fallback, empty-answer inactive corruption rejection, prepared
reuse/eviction and late-row schema-fact faults. Final full verification passes
105 checks: 25 Python, 44 unchanged Triplex, eleven adapter, six schema, nine
entity and ten persisted-query methods, plus semantic TypeScript.

The final alternating same-binary comparison uses two warmup pairs and five
measured pairs and verifies every value. Native → SQL projection medians:
64 facts 6.41 → 8.60 ms; 4096 facts 20.77 → 23.53 ms; 20000 facts
88.85 → 84.02 ms; 40000 facts 162.95 → 153.54 ms. The packet retains both
small-query regressions and roughly 6% large-query gains; it does not claim a
universal speedup. forceNative exposes the faster small-query alternative.
All samples, source/build identities and the protocol are retained in
evidence/native-scan-benchmark.json. Older packets retain their own versioned
source/build checkpoints. The native-only benchmark driver now requests
forceNative explicitly so it stays reproducible when the planner expands.

## 2026-11-05 07:15 UTC — Native bounded EAV joins and cost dispatch

Extension 0.12.0 adds C++ lowering for one ordinary answer rule over two to
four positive EAV atoms. Constants and shared/repeated variables use exact
five-slot equality with BLOB string keys, DISTINCT projection and native typed
ordering. Filters, negation, aggregates, ground facts and additional relations
or rules retain native evaluation in this API. Schemas remain runtime catalog
data; TypeScript contains transport/codec/dispatch only.

Fresh atom cardinalities and maximum key multiplicities bound satisfying
bindings for all subsets. A separate bound counts full native indexed
candidates, including rejected rows, using the actual greedy evaluator's
single nonrecursive seed pass. Saturated arithmetic or unproved native
fact/round/work/dictionary/output and logical intermediate row/cell/carrier
bounds fall back to native. SQL inputs are individually materialized behind
admission, so an unproved Cartesian product cannot be constructed by the SQL
answer branch. NATIVE-JOIN-PROOF.md records the source-coupled derivation.

The first generic proof incurred excessive statistics/planning cost on
same-entity attribute joins. A specialized single grouping now computes exact
per-entity subset multiplicities and conservative rejected-index work for
distinct attributes with independent values. General path/triangle/self joins
retain the generic proof. The final same-binary benchmark includes all proof
cost, retained validation and exact output conversion.

A new cost-only C++ helper prefers native below 16384 total retained assertions.
The thin API reads that current ledger hint, then invokes either the smaller
native-only query plan or SQL-first plan. Unlike the prior removed shared-AST
threshold experiment, this avoids binding the larger SQL proof branch for small
queries. The hint does not replace fresh execution admission, contains no
cached facts and cannot change the actual query's coherent cut. It includes
history/unrelated attributes and may be stale under another writer; it is an
empirical starting heuristic. Omitted forceNative selects this preference;
true explicitly selects native and false explicitly tries proved SQL. Raw
td_query_store stays SQL first. Default-native metadata uses preferred_native;
proved joins use proved_edb_join and failed proof edb_join_budget_unproved.

Six new real-engine methods cover 22 SQL/native identities across 2–4 atoms,
all six reorderings of a three-atom conjunction, typed constants, repeated
variables, empty/cartesian/path/triangle joins, set projection, native work
budget sweeps with rejected indexed candidates, fact/round fallback,
600^4 potential product gating, temporal/schema-version changes, and cost-hint
refresh across 16384 retained assertions through actual native writes. Work
errors still reject without partial output and preserve healthy reuse. Full
verification passes 111 checks: 25 Python, 44 unchanged Triplex, eleven adapter,
six schema, nine entity, ten persisted-query and six join methods, plus semantic
TypeScript. The final build uses the exact DuckDB 2.0.0 C API v2 artifact.

The source-bound native-join packet rotates forced native, proved SQL and
automatic preference, with two warmup rounds and five measured rounds on the
same binary/data/program. Three-attribute canonical fixtures are ingested via
the native appender and closed/reopened before querying; ingestion/open are
excluded. Every returned value is checked. Median milliseconds (native / SQL /
automatic):

| Entities | Atoms | Native | SQL | Automatic |
| --- | --- | --- | --- | --- |
| 500 | 2 | 9.89 | 12.33 | 9.19 |
| 500 | 3 | 7.87 | 14.08 | 7.94 |
| 2000 | 2 | 16.56 | 18.83 | 16.26 |
| 2000 | 3 | 18.63 | 24.09 | 18.51 |
| 10000 | 2 | 56.79 | 55.28 | 54.48 |
| 10000 | 3 | 59.35 | 53.31 | 54.77 |

SQL's small-query regressions are retained. Large selected SQL gains are about
3–11% in this run, with ordinary timing variation and no universal speedup or
optimal-plan claim. All samples, source hashes and artifact identity are in
evidence/native-join-benchmark.json. Older evidence packets retain their own
versioned checkpoints. Remaining ten-goal boundaries include references/global
constraints, interval-local patch/adoption, broader native SQL profiles,
full Triplex delegation, physical allocation containment, broader recovery
testing and general incremental joins/recursion.

## 2026-11-05 07:30 UTC — Native schema references and historical identity

Extension 0.13.0 adds ref(EntityType) to the C++ schema DSL. The compiler resolves
forward/self target types inside the same definition and emits optional
reference metadata in the canonical descriptor. Records use ordinary string
IDs, preserving the four scalar tags and direct Datalog entity/value joins.
Native structural validation enforces UTF-8/NUL/type, 1..128-byte IDs and existing
required/one/many/set rules. Scalar-only canonical descriptors and prepared
record encodings retain their prior bytes, preserving existing replay hashes.
No schema interpretation or reference target logic was added to TypeScript.

Atomic entity commands require every reference target to have native identity
of the same schema/name type, or allow a matching first-write self-reference.
Targets created earlier in the caller's SQL transaction are visible, and
rollback removes all target/source changes and receipts. Wrong-type,
foreign-schema and missing targets reject before facts/ownership/clock changes.
Native declarations define stable identity independently of current properties
and valid intervals. This does not implement valid-time overlap foreign keys,
entity deletion/cascades, global uniqueness or arbitrary graph constraints.

The new td_schema_references_v1 helper produces metadata from a checked native
definition; schema_references and attributes.reference_type expose it as catalog
data. entity_identities derives each target's first declaration from matching
owner/type, immutable original schema and durable command headers. Historical
reads require that declaration no later than the source command, under the
source's original schema version. Later target creation cannot repair an invalid
earlier reference, including inactive facts. Reference target-type evolution
retains old meaning through reopen with the same binary.

The integrity review also found that the previous history view's inner join
could silently omit a native assertion if its creator binding was deleted.
History now identifies native facts through creator metadata, owner identity or
native command headers and rejects missing creator bindings/owners/headers.
Legacy facts remain outside that native view. This is corruption detection for
the stated surviving metadata, not an authorization boundary against arbitrary
direct SQL rewriting or a claim to recover completely erased provenance.

Five new real-engine methods cover declaration/descriptor/ID rules, canonical
replay/set identity, atomic target checks, self-links, 128-byte Unicode IDs via
the thin field encoder, transaction-local creation/rollback, runtime metadata,
same-binary reopen/type evolution, exact SQL/native graph joins, and removed,
wrong-type, too-late or missing first target declarations. Each corruption case
also runs through the all-retained Datalog check on inactive links. Missing
source creator/owner/header cases reject rather than silently dropping facts.
The final full suite passes 116 checks: 25 Python, 44 unchanged Triplex, eleven
adapter, six schema, nine entity, ten persisted-query, six join and five
reference methods, plus semantic TypeScript. Source-bound verification matches
the final native artifact and project code.

The new reference packet performs actual native reference commands, closes and
reopens the database, then alternates complete native and proved-SQL graph
queries with two warmup pairs and five measured pairs. Every output value is
checked. Complete sequential source writes take 1.50 s for 64 entities and
12.28 s for 512, including owned receipt decoding/checks; schema/root/open are
excluded. These are current per-command costs, not bulk-throughput claims.
Graph-query native / SQL medians are 11.33 / 36.36 ms at 64 sources and
13.63 / 39.24 ms at 512. Query timing includes retained reference/schema/history
validation, current proof statistics or native evaluation, and exact output;
ingestion/open are excluded. SQL remains slower on these small graph fixtures;
the default cost heuristic selects native at these retained sizes. No
cross-version speedup is claimed. Samples and source/build identities are in
evidence/native-reference-benchmark.json; older packets retain versioned
checkpoints. Triplex's transitional projection still exposes these string IDs
as strings; full native Triplex schema/reference delegation remains open.

## 2026-11-05 07:47 UTC — Observed native-command process-loss recovery

Added actual SIGKILL recovery coverage for the C++ entity command, complementing
the prior appender process exits and late-DML exception rollback tests. Each
case owns a fresh file-backed canonical fixture and a forked native writer. The
production extension remains the verified 0.13.0 binary; no test hook was added
to its command expansion, callbacks or host API.

For the mid-command case, the fixture adds one CHECK to the canonical assertion
table. On the selected new int64 value, it advances a sequence then performs
bounded built-in regex work. A second connection verifies the sequence was
unused before starting, observes advancement while the command promise remains
pending, and sends a phase acknowledgement to the parent. The parent kills that
owned writer immediately. This CHECK is reached inside assertion INSERT after
the native header/schema binding and old-assertion retraction statements; the
4096-value replacement uses the actual public C++ pragma. The test requires
complete old state after reopen, so a writer that completes/commits before the
kill is a failed observation, not a mid-command success. No unknown operation is
blindly retried.

The other cases acknowledge command execution inside an explicit transaction
before COMMIT, or completed autocommit, then are also killed without connection
cleanup. Reopen checks command receipts, original receipt replay identity,
complete history/current values and old-fact transaction bounds. It reconciles
durable outcome before a healthy next command, checks the next global position,
retained row/byte ledger against physical facts and absence of temporary plans.
Both precommit cases preserve the complete seed and no crash-command receipt;
the after-commit case preserves the complete replacement and receipt.

The focused three-phase gate passed, followed by the full suite with 117
checks: 25 Python, 44 unchanged Triplex, eleven adapter, six schema, ten entity,
ten persisted-query, six join and five reference methods, plus semantic
TypeScript. Current verification and reference benchmark source/build identities
remain coherent. Broader contention, disk failures and backup/restore remain
open; this closes the separately untested native mid-expansion process-loss
boundary without claiming those broader recovery properties.

## 2026-11-05 08:33 UTC — Owned query cancellation through native Node controls

Extension 0.14.0 and a small Node-API 8 addon connect the owned TypeScript query
scope to the existing C++ invocation registry. The vendored C API v2 offers
connection interruption but no supported callback-context interrupt-state
polling. The bridge therefore calls only public control C ABI symbols in the
exact loaded extension image; it does not cast opaque contexts or execute SQL
inside a scalar callback. Both binaries are hashed. Initialization pins the
extension path/hash, retains one loader reference for process lifetime, and
rejects replacing that image. Build uses Node-API headers beside the selected
Node installation (the existing Node 24.13.0 installation supplied them); no
new dependency installation or Python runtime path was introduced.

The native registry now supports a scope without an outer deadline and exposes
bounded status metadata (live/canceled/expired/retired). Its existing timed ABI
and 1024-live-invocation admission remain. A combined controlled/timed native
query callback polls both the scope and independent evaluator deadline, without
widening fact/work/dictionary/output budgets. The new nine-argument
td_query_store_controlled pragma adds token and route to the original seven
arguments. Its execution-time control check also runs on the proved SQL route.
Old raw SQL entry points retain their evaluator-only deadline behavior.

NativeEntityStore.query accepts optional signal and timeoutMs (1..60000). Scope
creation occurs after the request leaves the serialization queue and includes
source serialization, cost hint, SQL preparation/validation/execution, native
evaluation and owned output/typed decoding. A signal alone has no outer timeout;
the native evaluator deadline still applies. Cancellation sets the invocation's
atomic flag and interrupts DuckDB. The driver polls native monotonic status
between chunks and periodically during conversion, avoiding acceptance of an
expired result when the JS timer is delayed. It awaits terminal execution and
result cleanup, removes timers/listeners and retires the token before reuse.
Queued aborts do not interrupt prior work. No partial answer is published.
These controls remain cooperative, not hard wall-time/process containment or
complete allocator accounting.

Five new real-engine methods prove that Node and SQL use the same actual C++
registry; validate artifact pinning, token admission/retirement, all four exact
tags and SQL/native route parity, fresh data, option errors and listener cleanup;
exercise real SQL timeout/cancel with healthy reuse, native cancellation and
independent evaluator/whole-query deadlines and unchanged work limits; and check
queued-abort isolation. Final full verification passes 122 checks: 25 Python,
44 unchanged Triplex, eleven adapter, six schema, ten entity, ten persisted-query,
six join, five reference and five query-control methods, plus semantic TypeScript.

The new source-bound comparison writes native schema-bound facts, closes/reopens
and rotates plain/controlled forced-native and proved-SQL projections with two
warmup rounds and five measured rounds. Every value and listener cleanup is
checked. Query timing includes retained schema/history validation and exact
output; ingestion/open are excluded. Both modes use a 5000ms evaluator deadline;
controlled calls add a 5000ms whole-query timeout and live AbortSignal.

| Facts | Route | Plain ms | Controlled ms |
| --- | --- | --- | --- |
| 512 | Native | 12.46 | 22.09 |
| 512 | SQL | 14.01 | 26.62 |
| 4096 | Native | 26.82 | 37.47 |
| 4096 | SQL | 28.47 | 41.03 |
| 20000 | Native | 95.17 | 108.29 |
| 20000 | SQL | 97.26 | 106.54 |

The optional path adds roughly 9–13ms here, with large percentage regressions
on small queries. It is not presented as a speedup; ordinary calls retain their
prepared path. Distinct tokens make controlled pragma source one-use, so those
statements deliberately bypass the reusable LRU. A real-engine probe confirmed
that binding pragma parameters fails with "Unexpected prepared parameter. This
type of statement can't be prepared!". The next optimization to evaluate is a
C++-compiled parameterized SELECT with fresh bound controls and the same data/
budget checks, retaining pragma fallback when generated SQL exceeds transport
admission. That optimization is not shipped in this checkpoint. Samples,
source hashes and both artifact identities are in evidence/native-control-benchmark.json;
current verification/benchmark fingerprints match the code. Older packets retain
their own versioned checkpoints. A transient local exec transport disconnect
after verification was reconciled with read-only status before the benchmark
was started; no unknown write was retried.

## 2026-11-05 09:26 UTC — Parameterized native query transport and cleanup faults

Extension 0.15.0 adds td_query_store_sql_v1: the same C++ query compiler emits
read SQL with one BIGINT control parameter. The host transports that source and
binds the fresh token through the existing 32-entry/256 KiB prepared-source LRU.
It adds no host planner, fact/result cache or stored catalog/authorization
context. Each execution still runs current token, carrier/schema, data/cut and
budget checks. The compiler runs in C++, normalizing all aliased input vectors
before capturing borrowed views. Exact source includes program/cut/budgets;
only the invocation token is bound dynamically.

If expanded SQL exceeds 262144 bytes, C++ returns NULL and the driver retains
the original controlled pragma. Compiler output batches have a 32 MiB bound.
A real-engine case uses a valid ~65KiB four-atom program whose expansion exceeds
the wire bound; both the original and controlled fallback return the same empty
SQL answer. No valid program is newly rejected by that transport limit.
Tests also reuse the same parameterized source across fresh/retired tokens,
committed updates, caller rollback and schema/type evolution, and verify quoted
program literals cannot become SQL statements. This is structural reuse with
fresh execution, not a snapshot or fact cache.

The forwarded [published-source review]([PRIVATE_REFERENCE_REMOVED])
identified a conditional cleanup gap in 0.14. Source inspection confirmed that
an early result/binding cleanup exception could skip later releases and leave
pending cleared without fencing. It was not a naturally reproduced engine
failure. Cleanup now attempts result closure, binding clear and statement
destruction independently, retaining the primary error and every cleanup error.
Initial binding-clear and eviction-destruction failures are also cleanup faults.
The port is fenced before pending clears; successful traces/results occur only
after cleanup. Cancellation cannot replace cleanup uncertainty with an ordinary
abort/deadline error.

Close attempts deferred failed releases, every cached statement, connection and
instance even after an earlier release throws. Failed resource releases are
retained for explicit close-only cleanup. Entity/schema clients remain closed
after their first close request, while a failed close can be attempted again to
release remaining resources. Business operations never resume on that port and
no command is automatically retried. A failed write acknowledgement still needs
durable receipt reconciliation; this does not change historical unknown action
outcomes or legacy transaction-owner semantics.

Six new real-engine fault methods inject exceptions into actual SDK resources:
result close, pre/post binding clear, statement destruction, fetch acknowledgement,
cache eviction, all-statement/connection/instance close, and listener/control
release. They verify independent attempts, preserved primary/cause and cleanup
errors, fenced reuse, release despite cancellation, explicit close-only cleanup
and no successful operation trace on cleanup failure. These are injected failure
paths over real DuckDB resources, not a claim those faults arose naturally or
that every possible native cleanup fault has been enumerated.

Final full verification passes 130 scoped methods/cases: 25 Python, 44 unchanged
Triplex, eleven adapter, six schema, ten entity, ten persisted-query, six join,
five reference, seven query-control and six cleanup methods, plus semantic
TypeScript. Verification and the current benchmark fingerprints match the exact
source and 0.15 artifacts.

The same benchmark protocol rotates plain/controlled native and proved-SQL full
projections over native schema-bound fixtures, closed/reopened before timing.
There are two warmup rounds and five measured rounds; every output value and
listener release is checked. Query timing includes retained validation, the C++
template call, fresh execution and full exact output; open/ingestion are excluded.

| Facts | Route | Plain ms | Controlled ms |
| --- | --- | --- | --- |
| 512 | Native | 11.76 | 12.08 |
| 512 | SQL | 14.03 | 14.76 |
| 4096 | Native | 23.92 | 24.71 |
| 4096 | SQL | 26.18 | 25.70 |
| 20000 | Native | 91.90 | 91.09 |
| 20000 | SQL | 85.67 | 85.31 |

The measured differences are small, including controlled medians slightly below
plain medians in larger cases; treat those as timing variation, not a guaranteed
speedup. The roughly 9–13ms 0.14 regression remains preserved in its versioned
packet/commit. Current paired results and raw samples are in
evidence/native-control-template-benchmark.json. The recipe accepts an explicit
evidence filename so new versions do not overwrite that baseline. Full allocation
accounting, hard containment/adversarial latency, broader recovery, global/temporal
constraints, full Triplex delegation and general incremental maintenance remain
open in the ten-goal ledger.


## 2026-11-05 10:30 UTC — native count lowering and measured dispatch tradeoff

Extension 0.16 adds C++ IR-owned SQL for direct complete-source count or one
single-triple projection followed by count. Source DISTINCT preserves complete
tuple identity and grouping uses all five typed slots. Empty global count is
zero; empty grouped count has no rows. The authoritative compiler still rejects
unsafe heads and literal/repeated aggregate body terms; no grammar was widened.
An initial test incorrectly assumed zero-argument ordinary predicates existed;
the real parser rejected it and the fixture was corrected to a constant source
projection rather than changing language semantics.

Fresh n/source/group counts prove conservative native fact/work/round, dictionary
and output bounds. Worst-case source/group logical limits gate DISTINCT and
group construction before unproved intermediates can grow, including a repeated
16KiB constant. Failed proof runs unchanged native budgets. Native input-list
packing is gated off whenever proved SQL is selected, avoiding an unnecessary
native fact transport allocation in that route. The exact reasoning is in
NATIVE-COUNT-PROOF.md.

Four new real-engine methods pass typed/set/empty/temporal identities, independent
expected counts, source/output fact/work boundaries, conservative round fallback
and a 4096-row wide-constant preprojection gate. Full verification passes 134
scoped checks plus semantic TypeScript. Verification and the count packet source
pins match the same 0.16 build.

Paired same-binary full-call measurements alternate two warmup and five measured
pairs over native file fixtures after close/reopen. Every row/route/position is
checked; ingestion/open are excluded, retained validation/proof/output included.
At 40000 facts filtered count measures 51.66ms native / 47.87ms SQL (~8% gain),
direct count 51.97 / 51.39ms and grouped count 51.11 / 51.57ms. At 512/4096
facts filtered count regresses from 10.13/14.58ms native to 13.94/17.78ms SQL.
These regressions and raw samples remain in evidence/native-count-benchmark.json.
The existing small-input C++ cost preference remains an empirical hint; no
universal gain or optimal threshold is claimed. Other aggregates/derived joins,
global/temporal constraints, full Triplex delegation, broader recovery and total
resource containment remain open in the ten-goal ledger.


## 2026-11-05 10:35 UTC — remove per-fact schema metadata copies in C++

Extension 0.17 borrows bounded DSL/descriptor string views inside the scalar
callback after preparing every vector alias. The pinned C API v2 documents
borrowed view lifetime through the owning chunk and dictionary get_view's
flattening side effect; existing alias normalization completes first. No view
escapes the callback and no further input mutation occurs. Equal immutable
metadata cells reuse their structural comparison, avoiding per-fact text copies
and repeated full descriptor byte comparisons. A changed DSL resets descriptor
validation even with an unchanged descriptor cell. Every record/fact/type/attr
check still runs; no fact outcome or live catalog state is cached.

A seventh schema method exercises two valid schema definitions across 8192
rows, a changed DSL against a fixed descriptor, changed descriptor, NULL and
wrong fact tag at row 2050, then healthy reuse. It complements existing late
record/descriptor and persisted inactive-history faults. The complete suite
passes 135 scoped checks plus semantic TypeScript at 10:33:35 UTC, including
cleanup, cancellation, real native process loss and all 44 unchanged Triplex
cases. Source pins and the current build match the A/B packet's enabled build.

The paired recipe builds identical source with only TD_SCHEMA_BORROWED_INPUT
disabled/enabled; both variants retain compiled DSL reuse. It alternates two
warmup/five measured pairs over 32768 facts at 2 and 64 attributes, checks every
Boolean or exact count/route/position, and closes/reopens native file fixtures
before query timing. Persisted query timing includes retained schema/history
validation, proof/execution and exact output; fixture writes/open are excluded.

| Attributes | Case | Disabled ms | Enabled ms | Ratio |
| --- | --- | --- | --- | --- |
| 2 | Schema-fact callback | 6.30 | 4.96 | 1.27x |
| 2 | Persisted native count | 47.08 | 45.35 | 1.04x |
| 2 | Persisted SQL count | 51.08 | 48.67 | 1.05x |
| 64 | Schema-fact callback | 11.91 | 5.82 | 2.05x |
| 64 | Persisted native count | 53.20 | 47.48 | 1.12x |
| 64 | Persisted SQL count | 55.60 | 49.19 | 1.13x |

This is a measured complete-query improvement for selected wide-schema counts,
not a universal throughput claim. Raw samples, compiler modes and identical
source hashes are in evidence/native-schema-view-benchmark.json. Reproduce with
python benchmark_schema_views.py. An initial ad-hoc build supplied a relative
output path, which the existing helper interprets relative to the native compiler
working directory; it failed to find generated catalog_sql.hpp. Using the normal
absolute ROOT/build path built both variants successfully; no dependency or
permission change was needed. Earlier versioned packets remain intact.

The architecture remains native C++ semantics, runtime catalog schemas and thin
TypeScript/SQL APIs. The adapter is still transitional. The ten-goal ledger
continues to track global/temporal constraints, interval-local patch/adoption,
full Triplex delegation/providers, wider SQL/incremental plans, broader recovery
and total physical resource accounting as incomplete.


## 2026-11-05 12:45 UTC — native extrema and exact sums, plus late interrupt cleanup

Extension 0.18 extends the existing complete-source count profile in C++ to
min/max/sum_i64. It proves the complete projected measure domain, with global
homogeneous non-bool admission for extrema and all-int64 admission for sums.
BLOB extrema preserve binary text order. HUGEINT accumulation plus final
TRY_CAST allows exact cancellation of overflowing prefixes; any unproved type
or final range selects unchanged native evaluation. Native errors retain
canonical budget/tag/range priority. Internal global groups are counted before
filtering empty extrema output; work is 2n+2g direct or n+2m+2g projected.
Extrema measure bytes and extra group row-count cells enter preconstruction
gates. Count's existing route/reason behavior remains intact.

Six new methods cover independent expected values/native differential results,
i64 endpoints/cancellation/full-tuple set identity, Unicode/subnormal/extreme
floats, empty groups, original schema history, tag/mixed-tag/range errors, exact
fact/work/round boundaries with SQL at admitted thresholds, direct one-round
fallback, e/constant measure projection, valid mixed-group native fallback and
a wide non-measure source constant. A read-only source review found no defect
and suggested the added exact-boundary and no-boolean mixed-tag controls.

The initial full verification run failed an existing Python reference native
cancellation/healthy-reuse method: the connection was fenced after timeout
cleanup. An isolated rerun passed, consistent with a timing race. Source review
found read invocation interrupt delivery stayed active through COMMIT/ROLLBACK.
Point queries and timelines now create controls inside the owned read
transaction and retire/listener-remove/release/join them before cleanup. A final
guard checks the query result before retirement. Unknown cleanup outcomes still
fence and no business operation is replayed.

A deterministic late-delivery test wraps the real connection cleanup seam,
invokes the timer callback at each cleanup and verifies no cleanup interrupt
escapes, all real cleanup commands acknowledge, and healthy reuse works. Using
the previous checkpoint's query/timeline methods in an isolated process makes
this new regression fail (4 unwanted interrupts versus 0); the corrected methods
pass. The first version of this test used Timeline.rows instead of intervals;
that fixture mistake was corrected before verification.

Final full verification at 12:39:42 UTC passes 142 scopes: 26 Python methods,
44 unchanged Triplex cases, 11 adapter, 7 schema, 10 entity, 10 persisted-query,
6 join, 5 reference, 7 control, 6 cleanup, 4 count and 6 aggregate methods, plus
semantic TypeScript. Verification/aggregate source pins and build identities
match 0.18. The Node/Triplex production path still uses no Python subprocess.

Paired complete aggregate calls alternate two warmup/five measured pairs on
native file fixtures after close/reopen. Every exact result/route/position is
checked; retained validation/proof/output are included, ingestion/open excluded.

| Facts | Query | Native ms | SQL ms | Native / SQL |
| --- | --- | --- | --- | --- |
| 512 | min | 11.64 | 15.84 | 0.74x |
| 512 | max | 11.29 | 16.04 | 0.70x |
| 512 | sum | 12.49 | 17.54 | 0.71x |
| 512 | grouped_sum | 11.62 | 16.86 | 0.69x |
| 20000 | min | 32.78 | 33.63 | 0.97x |
| 20000 | max | 34.43 | 34.96 | 0.98x |
| 20000 | sum | 34.24 | 34.74 | 0.99x |
| 20000 | grouped_sum | 34.36 | 35.77 | 0.96x |
| 40000 | min | 56.12 | 51.66 | 1.09x |
| 40000 | max | 57.41 | 52.10 | 1.10x |
| 40000 | sum | 57.51 | 52.11 | 1.10x |
| 40000 | grouped_sum | 55.82 | 53.23 | 1.05x |

All six 40000-fact shapes improve in SQL (1.05–1.11x ratio). Small inputs favor
native and 20000 is approximately tied/slower; all unfavorable samples remain
in evidence/native-aggregate-benchmark.json. The 16384 retained-row preference
is still empirical and can choose SQL before an aggregate's actual crossover.
No universal speedup or all-ten acceptance is claimed. A next performance
candidate is proving projection identity to avoid redundant DISTINCT when all
source variables survive; it was considered but NOT implemented.

The implementation sub-agent's initial read-only gh lookup hit a network error
and its escalated retry waited for approval for about 13 minutes, blocking
message delivery; it was aborted. It made no edits/builds. Parent took over
implementation directly, and the sub-agent then reviewed local sources only.
Use connected GitHub tools for available PR metadata operations to avoid
repeating this coordination problem. No read-only CLI success is claimed.

Contributor confirmed Doc DB meant DuckDB and requested 20 real-world event-sourcing
workloads as the next benchmark track AFTER the ten goals. A sub-agent researched
primary sources and parent presented a draft 20-case list with three baselines:
raw-event SQL replay, tuned typed DuckDB projections, and this temporal fact
store. That suite is proposed/unimplemented; no three-way speedup exists yet.
Contributor then requested a complete zero-context repo handoff. This checkpoint closes
current code/evidence first; the handoff must include vision, all ten items,
research, experiments/failures, exact setup, future cases and remaining choices.
