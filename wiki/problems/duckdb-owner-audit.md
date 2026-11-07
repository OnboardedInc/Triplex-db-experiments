# DuckDB repeated owner reconciliation

Tags: `backend:duckdb`, `surface:duckdb-datalog`,
`problem:duckdb-owner-audit-cycles`, `status:observed`,
`mechanism:acknowledged-read-scope`, `status:hypothesis`.

The small strict [read-priority load failed](../../qualification/reviews/five-surface-rate16-first-loads-contract-independent.json):
145 correct replies,335 timeouts/errors and only four of six writers visible
inside30s. All six commands eventually reconciled. The last read event is at
59.94s. The75.4s report drain includes a later queued final-position check;
it is not a75.4s read-return measurement.

A bounded [isolated public-read observer](../../qualification/evidence/duckdb-public-read-stages-v1-analysis.json)
then reused the untouched second seeded scope after proving P2/R1000.25. It
retained the actual C++ owner/native calls, one thread,128,000,000-byte memory,
64,000,000-byte maximum spill,30s request deadlines and a120s/2GiB/2CPU envelope.
One current read, one historical read and a16-call burst produced17 correct
answers and one explicitly requested queued caller cancellation. No application
write occurred, P stayed2 and all physical work was drained. The observer is
measurement only; its wrappers add reactions and timing overhead.

| Observed wrapper scope | Count | Sum of dispatch-to-settlement wall spans |
| --- | ---: | ---: |
| Complete `activateOwnership` |38|3,870.642ms|
| Nested `td_owner_probe_activate(0)` calls |38|3,822.126ms|
| Final point `public_runner` SQL |17|54.615ms|

The activation and nested UDF spans overlap: never add those totals or call them
engine CPU. This identifies the wrapper stage, not the expensive internal audit
query. The simple point AST has no operated variable and issues no type-domain
probe. Current evidence therefore does not prioritize projection, binding or a
language rewrite. [Independent review](../../qualification/reviews/duckdb-final-combined-stage-independent.json)
recomputes the raw totals and verifies current48/142/source preimages separately.

`TriplesLive.queryAll` with `includeBasis:true` first captures P in its own
metadata transaction; the Duck executor then opens its answer snapshot. The
shared backend queue performs full ownership activation after each acknowledged
physical transaction. At the source checkpoint, see
[`TriplesLive.ts`](../../packages/core/src/store/TriplesLive.ts#L688),
[`query-executor-adapter.ts`](../../packages/duckdb/src/query-executor-adapter.ts#L74)
and [`public-backend.mjs`](../../packages/duckdb/src/public-backend.mjs#L746).
The C++ owner still performs its complete catalog/data/presence/current/all-cut
validation; no check has been removed.

The cancelled caller settled after0.436ms, but its accepted metadata transaction
later acquired the queue after1,529.403ms and consumed104.913ms of service,
including0.539ms of current-position SQL. It ran no final answer SQL. This is a
concrete pending-acquisition resource gap, not physical withdrawal acceptance.
Active native interruption, acknowledged rollback and the later physical drain
must remain distinguishable from caller settlement.

The [frozen next wave](../../qualification/devloop/DUCKDB-OWNER-WAVE1.md) has
three competing alternatives: A combines captured basis and answer in one
acknowledged same-bundle scope; B explores validation reuse only under proven
physical/catalog/context/mutation epochs; C reduces complete-audit cost only
after finer internal measurement. A follows the separately qualified queued
withdrawal prerequisite, with
an explicit opt-in for `queryAll/includeBasis:true`; default/page/non-Duck paths
are controls. Its [tests and oracle](../../qualification/devloop/DUCKDB-OWNER-A-TESTS.md)
now have [isolated source/noEmit/fake-port clearance](../../qualification/reviews/duckdb-owner-a-rebased-final-independent.json)
and an [independently checked optional-capable Core→Duck emitted tree](../../qualification/reviews/duckdb-owner-a-isolated-build-v1-independent.json).
The actual seed's first module load failed before database creation. Its
[closed import-map successor](unbundled-core-module-resolution.md) now loads and
passes the fresh seed and two small native arms described below. This is
isolated mechanism evidence; B/C remain proposals. A is not part of the
withdrawal repair and has not changed the live package or default.

Every candidate retains the existing Mac C++ owner, all audits, exact cut/value
semantics and acknowledged cleanup. No measured microdiagnostic, reduced
transaction count or functional fixture qualifies capacity, a default change,
writer liveness or target scale.

## Qualified queued withdrawal, with an explicit remaining branch

Tags for this narrower outcome: `problem:duckdb-cancelled-queued-physical-work`,
`mechanism:queue-ticket-withdrawal`, `status:qualified`.

The [scoped checkpoint](../../qualification/evidence/duckdb-withdrawal-scoped-checkpoint-20261106.json)
retains all nine attempts, including the initial invalid test-port fixture and
the first typed-build failure. The real `duckdb-public-read-withdrawal-v1/0001`
gate returns17 correct rows/bases and one genuinely queued interruption at P2.
The cancelled ticket emits `CANCELED_BEFORE_BEGIN` and performs zero later work
callbacks or native dispatches. All37 actual BEGINs have37 COMMITs and37 complete
ownership activations; no other request is interrupted. The existing120s/2GiB/
2CPU diagnostic, one thread,128,000,000-byte memory and64,000,000-byte spill
profile is unchanged. This is correctness evidence, not timing promotion.

Current `duckdb-sdk-entry-v9/0001` passes48 checks and
`duckdb-datalog-packet-v5/0001` passes142 current/reopen checks with unchanged
expectations/native binaries. `duckdb-resource-withdrawal-v1/0001` separately
exercises a controlled1MiB spill limit on the actual leased session and active
native interruption with healthy session reuse. The current13 component checks
cover acquisition races, original-fiber ACK handling, live FIFO, write masking,
same-owner poison, existing caught-foreign behavior and observer fidelity.
[Independent source/native/full-suite review](../../qualification/reviews/duckdb-withdrawal-final-independent.json)
clears exactly that scope.

An already-acquiring standalone metadata read can still return caller
interruption before its read/COMMIT/audit later finishes. That retained branch
is not acknowledged queued withdrawal or general physical cancellation. The
acknowledged read-helper acquisition race instead waits for rollback/audit.
No writer behavior, ownership audit, A/B/C mechanism, query defaults or capacity
claim is bundled into this repair.

## Isolated A mechanism observed on 2026-11-07

Tags: `problem:repeated-acknowledged-read-scopes`,
`mechanism:one-basis-answer-scope`, `status:observed`.

The [fresh seed](../../.devloop/jobs/duckdb-owner-a-actual-v3-seed/attempts/0001/terminal.json)
writes two disjoint scopes with 1,000 acknowledged raw fact subjects each,
four500-fact commands, P2 and recorded time1000.25. This is not configured-entity
scale or an independent native physical-count proof.
[Independent seed review](../../qualification/reviews/duckdb-owner-a-actual-v3-seed-independent.json)
checks all2,000 returned facts and command-journal changes.

The [separate control](../../.devloop/jobs/duckdb-owner-a-actual-v3-separate/attempts/0001/terminal.json)
and [combined opt-in](../../.devloop/jobs/duckdb-owner-a-actual-v3-combined/attempts/0001/terminal.json)
use the exact same immutable optional-capable Core/Duck tree
`4ea29c79275a463ce7a4582e650dde5ca27fd13c4c5187fb009c7aa16d7fa760`,
external map/bootstrap and unchanged C++ artifacts. Each returns17 identical
logical answers and P/V/R bases (with its own fresh scope), performs no
application write and retains P2. Both exercise one genuinely queued
cancellation with zero later cancelled-ticket work/native dispatches, zero
other-request interrupts and fully drained queues.

| Physical BEGIN / successful COMMIT / complete owner activation | Separate | Combined |
| --- | ---: | ---: |
| Seventeen eligible public `queryAll(includeBasis:true)` calls |34|17|
| Common setup and before/after position checks |3|3|
| Total |37|20|

The combined hook is observed present; the control hook is absent. Every actual
physical transaction retains its complete ownership audit. The profile is one
thread,128,000,000-byte memory and64,000,000-byte spill, within a2GiB/2CPU/120s
diagnostic envelope. [Independent exact-arm review](../../qualification/reviews/duckdb-owner-a-actual-v3-arms-independent.json)
(`7ac732b590485f63f9bd6f3519f672ef69b1fdace3b9518b364fe0c3c686ad8d`)
recomputes answers, cuts, per-request physical counts, cancellation, immutable
module identity, source preimages and canonical cleanup. This is not throughput,
writer liveness, capacity, full44/142 or default-path qualification.

The old raw reports' text about already demonstrated emitted fake-port
settlement was too broad. The [immutable scope correction](../../qualification/evidence/duckdb-owner-a-emitted-settlement-scope-v1.json)
preserves that wording and distinguishes the earlier copied-Duck/baseline-Core
three-case gate. A **new**
[exact-emitted three-case fake-port gate](../../.devloop/jobs/duckdb-owner-a-emitted-settlement-components-v1/attempts/0001/terminal.json)
passes on2026-11-07 against the same private tree, with native-module loading
refused. It executes actual controlled callbacks for caller environment and
separate early-caller versus combined awaited metadata cleanup. Its
[independent component review](../../qualification/reviews/duckdb-owner-a-emitted-settlement-v1-independent.json)
(`56e62c07b45a2423866b834d84a33ab935a30257cde9f8db29fca6dec4113252`)
clears those three cases on2026-11-07. It does not qualify physical
active-query cancellation, and the other13 copied withdrawal components remain
unexecuted on this private tree. No old report is strengthened retroactively.

## Public-suite harness first failure on 2026-11-07

Tags: `problem:frozen-service-instrumentation`, `status:failed-apparatus`,
`mechanism:physical-scope-observation`, `source:anchored-private-factory`.

The unchanged [separate44 v2](../../.devloop/jobs/duckdb-owner-a-foundation44-separate-v2/attempts/0001/terminal.json)
passes. The [combined44 v2](../../.devloop/jobs/duckdb-owner-a-foundation44-combined-v2/attempts/0001/terminal.json)
fails during harness setup: the apparatus wrongly required a writable
`withReadScope` property and tried to replace it. The actual anchored factory
freezes its query service before Core captures it. Its44 diagnostic entries all
repeat this setup assertion; they are not44 observed product failures or passes.
The [first-failure receipt](../../qualification/evidence/duckdb-owner-a-qualification-v2-first-failure.json)
preserves both outcomes. Neither142 v2 arm was enqueued.

The source-only v3 successor leaves that service unchanged and records hook
availability separately from activation. It checks actual serial point-read
physical scopes, matching captured native P to returned basis, final SQL and
typed-parameter digests, complete BEGIN/COMMIT ordering and native owner ACKs:
one scope for combined, two for separate. It adds no public read, fiber, timer
or owner bypass and refuses pending/overlapping evidence. Its
[eight fake controls pass](../../qualification/evidence/duckdb-owner-a-physical-observer-components-v1.json),
and their [independent source/control review clears](../../qualification/reviews/duckdb-owner-a-qualification-v3-source-independent.json).
Default44 still proves no includeBasis activation.

## V3 isolated public-suite outcome on 2026-11-07

The same optional-capable tree now passes both explicit modes through the
[complete unchanged44 suite](../../qualification/reviews/duckdb-owner-a-foundation44-v3-independent.json)
and [all71 current/reopen tasks,142 executions](../../qualification/reviews/duckdb-owner-a-packet142-v3-independent.json).
Every packet uses the existing public includeBasis option in its point helper;
all logical expected answers remain unchanged. The194 point calls per arm
include auxiliary assertions, not194 new logical tasks.

Independent review joins every returned basis to the recorded AST/requested V/R,
actual native currentP and command-history upper cut. It rederives388 complete
physical scopes for separate and194 for combined, including1,552+388 versus
776+194 true native/writer owner acknowledgements, ordered BEGIN/run/COMMIT/full
audit settlement and zero pending/error evidence. Ten fixed-basis interval
provider calls are explicitly outside this optional point mechanism. Hook
function call counts are not observed; the frozen executor remains unchanged.
Native SQL/parameters and auxiliary point rows are retained as digests; the full
142 business result rows and query traces are retained separately.

These are isolated functional and physical-scope gates, with the same private
Core/Duck tree and explicit flags. Source stripping is not another typecheck or
ordinary package build. The old v2 combined setup failure remains failed.
Actual acquired-answer cancellation/resource-failure and acknowledged drain
through public includeBasis still need their separately frozen real-engine
gate; raw native/fake settlement checks cannot substitute. No live/default
integration, performance, writer liveness, capacity or all-ten-goal promotion
follows from these results.

## Acquired-answer apparatus checkpoint on 2026-11-07

Tags: `problem:public-acquired-answer-resource-proof`,
`mechanism:diagnostic-prelock-progress`, `status:fake-components-pass`,
`source:private-factory-configuration-lock`.

The next real public cancellation/resource gate remains unexecuted. Source
inspection rejected a post-factory progress-setting proposal because the original
factory already locks configuration. The isolated successor enables only
progress with printing disabled before forwarding that same mandatory lock;
owned-context retirement and a fresh ordinary process must later prove default
restoration. No lock exception, C++ change or owner-audit bypass is proposed.

[Independent source review](../../qualification/reviews/duckdb-owner-a-progress-initialization-v3-source-independent.json)
found that counting two initialized contexts could accept the same file twice.
The preserved source-only v3 never ran. The v4 successor refuses duplicate-file
initialization before the original factory and requires both declared files.
Its [19 fake controls pass](../../qualification/evidence/duckdb-owner-a-public-resource-apparatus-fakes-v2-author.json)
in `duckdb-owner-a-public-resource-fakes-v2/0001`, with zero SDK, compiler or
native calls. [Independent source/component review clears that exact scope](../../qualification/reviews/duckdb-owner-a-progress-initialization-v4-independent.json).
Fake positive progress is an apparatus predicate check; actual final-statement
activity, public interruption/ACK/drain/reuse, `RESULT_LIMIT` and fresh-process
defaults still require separately granted real-engine evidence. `RESULT_LIMIT`
would qualify answer admission, not working-memory or spill exhaustion.
