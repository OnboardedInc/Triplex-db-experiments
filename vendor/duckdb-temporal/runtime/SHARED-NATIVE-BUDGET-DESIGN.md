# Shared native requested-capacity ownership

Source-only decision, 5 November 2026. No implementation, new default, engine
test or performance acceptance follows from this document. Use stage-two
`eea9d495`/`dd86a404` and exact DuckDB pin
`d54cbbe3df17e8e5ce68312f483b4155836112aa` for the first comparison. Preserve
the accepted SDK fairness work and the existing frozen artifacts.

The [ordinary wide gate](evidence/native-evaluator-wide-ordinary-032-review-20261105.json)
passed first/repeat/reopen with 45,000 relevant inputs, 40,000 exact i64 rows,
K76 and counters `(1,40000,180000)`. Each retained evaluator peaked at
17,184,432 requested bytes under the unchanged 64 MiB per-evaluator cap. That
does not establish simultaneous memory by adding independent peaks.

## Decision

Favor **C APIv2 function user data**, subject to an actual lifetime gate. The
pin supports this directly. It is not the legacy `extra_info` API. Keep the
invocation registry for cancellation, deadlines and per-invocation caps; it
does not already identify a database. Defer an additional C++ instance hook
unless the C API lifetime gate exposes a concrete missing capability.

| Approach on the same wide workload | Where the shared owner lives | Token-zero / independent instances | Main proof burden and decision |
| --- | --- | --- | --- |
| 1. C APIv2 catalog/function user data | One shared ledger created during extension initialization, referenced by every evaluator overload through `duckdb_v2_opaque`; callback retrieves it with `duckdb_v2_scalar_function_exec_get_user_data`. | Token-zero and legacy scalars retrieve the same ledger without manufacturing controls. Separate actual DuckDB instances create distinct ledgers. | Function metadata is shared, registration is database-bound and the system catalog belongs to a `DatabaseInstance`. Prove prepared/result references, repeated/failed LOAD and ATTACH behavior. **Smallest favored route.** |
| 2. Invocation registry grouping | A group owner shared by registry entries, with explicit instance identity and lifetime. Existing tokens are process-wide integers, not instance handles. | Token-zero bypasses the registry; creating a fake token just for accounting changes that path. A path, catalog name, connection ID or arbitrary caller group is insufficient instance identity. | Must supply an actual engine instance owner, include raw/legacy/tokenless callbacks and retire groups after all live users. If identity comes from function user data, this is route1 plus registry attribution, not an independent solution. **Insufficient alone; retain registry for controls.** |
| 3. Pinned C++ companion instance hook | A ledger owned from the existing companion's real `DatabaseInstance` state, with a refcounted C ABI bridge to the evaluator. | Can cover all connections and token-zero when every callback receives that owner. ATTACH shares its containing engine instance; new instances get new owners. | Must implement and pair the bridge, not cast a borrowed C API context into `ClientContext`. Existing `ProbeState` proves an ownership seam, not a ready allocation API. More pinned C++ coupling, teardown and old/new pairing work. **Only if route1 genuinely cannot satisfy the contract.** |

Here “instance” means the live DuckDB `DatabaseInstance` behind
`DuckDBInstance`, not each attached file/catalog. An ATTACH within that instance
shares its physical-memory ledger. A closed/reopened database or filesystem
copy starts a new owner, even at identical K. If a later product contract needs
per-attached-catalog quotas, this owner alone cannot supply them.

## What the pin establishes, and what remains unproved

- `CV2ScalarFunction` stores the factory's `DatabaseInstance`; `Build` checks
  the registration target is that same instance. Extension registration uses
  its loader's instance and registers in the instance's system catalog.
- `scalar_function_set_user_data` wraps pointer/destroy/equals in shared
  `CV2UserData`. `CV2ScalarFunctionInfo` retains that shared wrapper;
  `ScalarFunction` retains shared function metadata. Exec obtains the pointer
  from its bound function. Bind-data `Copy()` also shares its own handle, but
  bind data and registration user data are different owners.
- This supports one entrypoint-created ledger shared by all evaluator
  registrations. Give each registration an independently owned opaque wrapper
  containing a `shared_ptr<Ledger>`; never give multiple owning wrappers the
  same raw pointer and destructor. Copy the ledger owner into the active
  evaluator budget. Destructors/equals must not throw or re-enter the API.
- User data is **per function registration**, not automatically a named
  per-database singleton. Repeated/aliased LOAD, partial initialization failure
  or replacing a function must not leave old and new callable definitions with
  independent ledgers in one instance. Source routes loading through the
  instance extension manager, but these exact lifecycle outcomes require the
  small engine gate. Do not infer them from a global extension-library handle.
- Prepared expressions and in-flight callbacks may retain function metadata
  after a registration changes. Refcounts must cover the real lifetime, and
  the final ledger destructor must see zero reservations. Closing one reader
  cannot reset shared state while another reader still runs. No destruction
  callback may query DuckDB to rediscover its owner.

## Minimal accounting seam

`temporal_datalog.cpp::query` currently ignores its context and retrieves no
function user data. Its `Engine` owns the retained `EvaluatorBudget` through
borrowed encoding. Add explicit ledger ownership along this existing seam;
do not introduce a second evaluator or a connection-local ledger.

For each allocation, check overflow and cancellation first, then reserve the
full new capacity against the request and instance counters together under one
short lock. Old capacity stays charged. Release the lock before upstream
allocation/copy/polling. An upstream failure rolls back its reservation once;
success records fixed-size metadata without throwing. Deallocate before
releasing the corresponding grant. No lock across DuckDB calls, allocator
callbacks or destruction; denial needs no dynamic strings/containers. Preserve
existing primary fatal/cleanup errors and identify resource denial separately
from cancellation. Denied demand is not retained allocated memory.

Do not replace the current requested-capacity counter with `sizeof(row)` or
logical output bytes. Account nested maps/buckets/postings/text and growth
overlap through the existing allocator propagation. Same-token serialization
remains a control mechanism; independent invocation tokens must share the
instance ledger even if they run on different reader connections. A tokenless
call gets a local request owner plus that same instance ledger.

This first seam covers **retained evaluator requested capacity only**.
Parser/compiler/IR, import temporaries and scheduler scratch still require
propagation. Compiler template callbacks currently have eight arguments and
no control token; function user data could charge their instance owner but
does not magically attribute them to a whole public request. Request-level
compile-through-encoding attribution needs an explicit reviewed identity seam.
Upstream DISTINCT/LIST, DuckDB vectors/StringHeap/buffers/spill and SDK/V8 remain
separate owners. Held JS result streams do not prove a retained Core is live:
the ordinary borrowed callback already destroyed it after encoding.

## Small actual-engine qualification, before a wider integration

All routes must use the existing native-command recipe and identical program,
typed oracle, K76, 45,000 relevant inputs, 47,112 retained facts and original
query/engine limits. Use fresh owned databases, no promoted artifact edits.
Run raw/direct owned engine calls and public `query(...forceNative:true)` at
1/4/16 logical callers. Retain original public result shapes and token-zero
transport; observe actual overlap rather than assuming16 simultaneous cores.

1. **Identity/lifetime probe first.** A default-off diagnostic reports only
   fixed-size owner identity/live/peak/destruction data. On two independently
   created in-memory instances and two different files, each instance's16
   connections and every evaluator overload must see exactly one owner;
   separate live instances must differ. Repeated LOAD on each connection must
   not split/reset it. Destroy registration handles after success, then use
   prepared statements. Include failed registration/load cleanup. Stop if
   singleton/lifetime behavior is ambiguous; do not patch it with a global map.
2. **Same wide correctness.** Reuse the exact existing query/oracle at1/4/16
   raw and public callers, first/repeat/reopen. A sufficient diagnostic shared
   cap leaves all answers/counters exact. A separately predeclared tight cap
   must retain enough for the known single query yet deny genuinely overlapping
   covered requests. The final product instance cap is undecided; do not pick
   or raise it after seeing failures.
3. **Prove live overlap.** For the tight-cap case only, use a default-off native
   phase barrier with an independently observed live-byte count before borrowed
   encoding, so multiple real Cores remain alive. A JS SDK stream hold is not
   sufficient. Predeclare the cap from the single-call live/peak evidence and
   require the test's necessary overlap inequality; if that cannot be met,
   stop and report the test condition rather than assuming summed peaks.
   SDK fairness may admit at most3 heavy calls, while raw callers can differ;
   record both facts. Never sum per-reader maxima as an instance peak.
4. **Failure and isolation.** Force request denial, shared denial and upstream
   allocation failure separately. Assert no partial answers, stable resource
   cause, no poisoned peers, exact release, same-store reuse and independent
   instance success while the first instance is full. Cancel one live callback
   and expire another; ledger ownership survives token retirement until actual
   cleanup and never holds its lock while polling. Record unsuccessful peaks
   and terminal release, not only successful evaluator maxima.
5. **Prepared/result/close lifecycle.** Keep one materialized wide result while
   its Core is destroyed and another call runs; results stay exact but are
   explicitly engine-owned/excluded after encoding. Retain/destroy prepared
   handles in different order, close one reader while peers complete, drain
   public close/revalidate, then close the last instance handle. No early
   ledger destruction, double destroy or residual grant. New open has a new
   owner and still returns the same exact K76 answer.
6. **ATTACH and copied files.** In a direct diagnostic instance attach/detach a
   second catalog and verify the system function owner remains the containing
   instance's owner; this does not authorize raw ATTACH on a live public owned
   store. Close before filesystem copying, then open the copy in a new instance:
   no ledger/counter inheritance. Public ownership behavior stays unchanged.

One small native diagnostic plus focused real-engine lifecycle cases is the
next gate, not a new large pure model. Then run the existing native/control/
cut/public suites and full integrated verification. Capture setup, complete
public call/cleanup and native reservation timelines on the same workload;
keep engine memory/spill and host/RSS separate. Passing user-data lifetime or
shared retained quotas alone does not close Goal6.

## Owning source anchors

Exact DuckDB pin above:

- `src/main/capi/v2/capi_v2_func_scalar.cpp:117-124,143-227,234-285,350-357,440-445,538-549`:
  metadata/user data, binding, exec and database-bound registration.
- `src/include/duckdb/main/capi_v2/capi_v2_internal.hpp:258-266,318-323,919-951`:
  factory scope, registration target and opaque destruction.
- `src/include/duckdb/function/scalar_function.hpp:371-400`:
  shared function-info ownership.
- `src/main/extension/extension_loader.cpp:137-147`,
  `src/main/database.cpp:151-152`, `src/main/database_manager.cpp:584-586`:
  system catalog belongs to the actual instance.
- `src/main/extension/extension_load.cpp:769-795`:
  instance extension manager gates loading; actual retry/alias tests remain.
- `api_spec/v2/function/scalar.yaml:223-243,484-500` and
  `src/include/duckdb_v2.h:420-440,491-495`:
  exact unstable user-data/opaque APIs and callback restrictions.

Allocator `eea9d495`:

- `native/src/temporal_allocation.hpp:18-80`: local request allocator; currently
  no shared reserve ticket before upstream allocation.
- `native/src/temporal_control.hpp:18-60,91-108`: immutable cap, same-token lease
  and process-wide token registry; no database grouping.
- `native/src/temporal_datalog.cpp:292-422,535-569,1296-1326,1474-1508`:
  current callback/registration, tokenless compiler seam and entrypoint.
- `native/owner_probe/owner_probe.cpp:118-121,612-624`: existing pinned C++
  per-instance owner seam, not a shared native allocation implementation.

## Initial lifetime-probe source checkpoint

This section records source `fd034365` before execution. Subsequent isolated
[raw lifetime](evidence/native-memory-owner-probe-first-032-20261105.json)
and [public cancellation/reopen](evidence/native-memory-owner-probe-second-repaired-032-20261105.json)
gates pass. The public gate's first artifact-path setup failure is retained;
`0c8810e0` changes only fixture spelling to match the SDK's exact pin. Shared
bytes and the further ownership gaps below remain unqualified. Current engine
ownership and source/build references are in [TAKEOVER-STATE.md](TAKEOVER-STATE.md).
The source-only follow-up `78cc4ed7` tests a recorded late registration failure,
retry, old/new live callbacks and prepared-after-close behavior. The two passing
gates must not be used to infer that one entrypoint owner is a database singleton:
source review identifies nontransactional registration/overload replacement as
the unresolved boundary. No follow-up engine result is claimed. The existing
C++ companion's per-instance anchor is also being assessed for native write
execution; this may supply a justified deeper ownership seam if needed.

The isolated branch `codex/temporal-native-memory-owner-probe-20261105` adds
only instrumentation, behind default-off `--with-native-memory-owner-probe`.
The manifest identifies `diagnostic_native_memory_owner_probe`; both native
core and Node control bridge must be built with the same flag, then paired
with the exact companion. No frozen artifact is replaced. No shared byte cap
or allocator policy is implemented.

One entrypoint-local owner is carried by seven independently owned C APIv2
opaque wrappers, one per ordinary evaluator registration. Each actual scalar
callback copies its shared owner into a scope covering input preparation,
Core construction/import, evaluation, borrowed encoding and error unwinding.
The existing result wire and native counters are untouched. A finite32-slot
atomic diagnostic records wrapper/callback/row/destruction counts and the
reached overload mask, with no owner pointers or policy in a process registry.
The internal Node bridge reads the exact pinned DSO's counters; it does not
query or mutate a live engine. Snapshots are individually atomic fields,
coherent assertions only after drain, not a chronological event trace.

First scheduled actual condition is the first method in
`adapter/test-native-memory-owner-probe.ts`: two independent actual owned
instances, one with16reader connections; all seven ordinary scalar signatures,
raw zero and positive controls, repeated LOAD and same-byte alternate-path
LOAD, ATTACH/USE/DETACH, prepared/materialized result lifetimes, cancellation
failure and final wrapper/owner destruction. The second method uses an actual
public4096-value fixture, sixteen public calls, a real live native cancellation
plus drained close, exact reopen and a closed copied database. Stage-two public
`query()` already always creates an invocation to carry its cap; calls without
timeouts are unbounded controls, not token-zero. The raw method tests zero.
The separately qualified SDK query contract2 (`native-entity.js`8240cebc)
preserves uncontrolled token-zero when neither timeout nor signal is supplied.
Future allocator integration must preserve that transport rather than inherit
the isolated stage-two always-control choice. A local native request/default
cap and this per-instance user-data owner can cover raw zero; whole-request
compiler attribution remains a separate proof. This probe changes neither SDK.

Nothing has been compiled, syntax-checked or run at this checkpoint. Suggested
commands, only after an explicit correctness lease, from this isolated runtime:

```sh
[LOCAL_PATH_0034] build_native.py --with-native-memory-owner-probe
[LOCAL_PATH_0034] build_owner_probe.py --source-dir [LOCAL_PATH_0041] --engine-library [LOCAL_PATH_0042] --compat-mutations
node_modules/.bin/tsc --pretty false
cp adapter/*.mjs build/adapter/
node --test --test-name-pattern='per-instance user data' build/adapter/test-native-memory-owner-probe.js
node --test build/adapter/test-native-memory-owner-probe.js
```

First preserve/pin the actual core/bridge/companion manifests, all source inputs
and SDK engine. No dependency installation or command execution is authorized
by this document. Stop and retain the first actual failure. Partial entrypoint
failure/retry, registration replacement and deliberately retained prepared
handles after instance teardown remain further lifecycle gates; no shared
quota implementation may assume those outcomes from this initial source.
