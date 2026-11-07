# Five-path execution plan

This plan supersedes the archived two-backend,12GiB, globally serialized plan.
It preserves that plan and its evidence as historical material. Work is local
and all implementation, integration and verification is delegated to max-effort
workers; root coordinates only.

## Foundation and bring-up

Use three engine/storage foundations and five query paths: `duckdb-datalog`,
`xtdb-datalog`, `qlever-datalog`, `xtdb-native`, `qlever-native`. The two native
paths share Triplex writes, schemas, history, receipts, codecs and lifecycle.
Trusted authored XTQL/SQL and SPARQL execute through schema helpers and typed
parameters/output codecs. They bypass Datalog lowering without requiring a full
native AST parser or inventing another public schema DSL. Justified native
patches/helpers are permitted and require their own evidence.

Retain DuckDB's existing C++ engine/owner on the current Mac. Its old public
bridge does not cover the expanded exact-integer/public schema contract. Linux
is another profile when the existing build is qualified; no rewrite is required.
Reproduce the QLever self-rule issue and existing capacity boundaries rather
than presenting an authored SPARQL answer as a fix to the translated path.

The original ZIP remains the lossless research/variant source. Selective import
and the new portable-export baseline do not reproduce original Git audit proofs
or historical test runs. Build and test current sources with new receipts.

## Operate the loop

Start with `README.md` in this directory and the real CLI. Keep fifteen candidate
menus and five shared prerequisites in `initial-queue.json`; `seed` queues them
without claiming execution. Each lane selects two or three hypotheses for the
same measured problem. Replace menus explicitly if local profiling identifies
another stage; do not compare unrelated successes.

Three workers rotate among candidate work, integration and independent review.
A worker cannot be its own sole verifier. Aged lane opportunities plus CPU,
memory and disk admission allow up to three heavy trials systemwide. There is
no global serial mutex. Fewer run when physically inadmissible. Source reading,
oracles, small fixtures and review continue while trials wait.

Freeze the public call, independent oracle, exact inputs/builds, logical task,
cuts, update trace, fixed window, co-runners and budgets before candidate timing.
Reach actual engine work early. Models, source checks, byte checks, process exits
and actual engine ACKs are different evidence classes. Preserve every first
failure and link justified repairs/retests; never rerun merely for a favorable
sample or retroactively alter the old budget.

## Diagnose and hill climb

Calibrate actual local capacity first, including256 logical clients and steady
writers. Distinguish physical pools, client queueing and backend overlap. Use
512/1024 stress to qualify overload/fairness/recovery behavior, not to imply that
all submitted requests execute simultaneously.

Select the dominant public read stage per lane: translation/planning, source
access, engine operators, queueing, validation or complete-result conversion.
Compare two or three mechanisms for that stage. Charge indexes/projections,
updates, startup, rebuild and storage. DuckDB's archived42% small-write coverage
regression remains a prepared problem, not an automatic priority over a larger
read bottleneck. Do not replace TypeScript/C++ based on unmeasured assumptions.

Shared-engine changes affect both sibling surfaces and need both regressions.
Research transfers a hypothesis; every other lane reruns its own qualification.

## Qualify outcomes and query surfaces

Common outcomes cover all ten goals: exact types/schema constraints; expression
errors; planning/admission/recursion; completed absence; exact full-support
aggregates; cancellation/resources; atomic mutations/receipts/recovery/evolution;
bounded reuse/maintained publication; intervals/presence/corrections/proof lineage/
deletion/cascades; and public SDK scope/cursor/lifecycle/consumer integration.
The current five-path goal ledger remains open until exact integrated public
checks qualify it. Preserve historical DuckDB closures only within their scope.

Keep query expressiveness separate. One SQL query does not prove general Datalog
recursion/stratification. Reconcile sets versus bags, NULL/unbound/missing tuples,
property paths, eight value families, fractional public valid time and logical K.
Passing44 through the three Triplex foundations does not test the native facade.
Run all71 logical cases/current+reopen (142 per query path), applicable native
facade tests, adverse cases and actual scale/load gates. Unsupported required
outcomes stay incomplete.

Compare complete application paths; separately label temporal-equivalent controls
and bare engine floors. Native queries are independently authored/tuned, not
generated statements renamed. Freeze the writer floor from controls; require
at least10% read-goodput gain beyond observed run variation, no more than10%
required P99 regression, all writer/freshness/resource gates, and independent
exact-integrated-source verification. Necessary correctness work does not need
an invented performance win to become a valid fix.

## Defaults and storage

The hard owned-disk limit is50,000,000,000 bytes and the operational stop is46GB,
counting the original ZIP and outer sparse-image allocation once. All new files,
caches, VM disks, data and spill stay inside the fixed45GB APFS image. The shared
memory reservation pool is10GiB. Native Mac RSS watchdogs are not hard memory
containment. Existing unrelated user resources and HOME are untouched.

Maintain one logical fixture/event recipe and admitted engine generations, not
five copies. Count10m distinct entities and100m active representative domain
facts separately from retained history, commands, edges, presence and output.
Calibrate bytes at smaller stages before allocating. A stage that cannot fit
remains capacity-blocked while representations/lifecycle improve; do not lower
the target silently. Preserve compact receipts/inputs/recipes permanently and
hold uncertain forensic databases until reconciliation.

The initial deliverable is an operational reproducible loop/wiki plus current
small public baselines and calibrated profiles. Completing all goals and target
scale proceeds through subsequent measured waves; no current controller test
or imported result is that final qualification.
