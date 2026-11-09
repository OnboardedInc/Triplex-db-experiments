# RT01 Q104a rerun — live4 continuation policy

North star: P1 exact reads and P2 small atomic commit latency; goals/targets are lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md. Authority: Q104a/Q100k on main, M01 99d9641d (byte-exact source provenance in M01-SOURCES.json). This is a new G6 series. **Live3 stays FAILED. The live4 dispatch authorized execution after DF01 and explicitly supersedes the former non-GREEN stop policy: record those timing bars as UNJUDGED and continue; stop at the first judged failure.**

**Live4 outcome:** G2 passed; recorder setup hit sandbox `spawn EPERM` at the read-only `top` probe before any A/A/B sample. The same hostSample succeeds through approved `exec_command` with `sandbox_permissions: require_escalated`; the whole live controller needs that host-counter permission, not altered noise thresholds. Recovery was not run: the fresh post-cleanup disk capture had 12.24 GiB versus the >13 GiB forecast. The acquired resources were removed, private trim/context restoration verified. The raw live4 output names below are now occupied and immutable. A later dispatch needs new attempt paths, a fresh A/A rule, adequate disk and the approved host-counter execution permission; do not rerun this command in place.

## Admission and capacity

Wait for a new orchestrator dispatch after DF01 releases its window. Read `engine.mjs status`, the pool and actual host `df -k` before starting. No engine exclusive, DF01 owner, or retained/orphaned s1 container/volume may be displaced. Never touch resident engines or another holder's retained state. The controller refuses existing output directories and runs one attempt only.

Require **strictly more than 13 GiB free**: the 5 GiB guard plus an **8 GiB provisional whole-window growth forecast**, increased from round6 because the control/sample counts grow. This is a conservative planning estimate, not observed 10k growth: up to 128,000 public commits × at most 25 assertion/marker rows × 512 payload bytes × 4 storage overhead, plus 1 GiB trace/build allowance, rounded up to 8 GiB. Engine internal overhead and shared-host writes can differ. Admission rechecks 13 GiB inside the grant; each history point rechecks >10 GiB, and preloads recheck the 5 GiB floor every 500 commits. Record actual df/volume growth; stop if available headroom no longer covers the remaining forecast. Do not reclaim others' data to fit.

A normal shared quota slot may grade AMBER because its CPUs overlap residents. **Free slot and free disk do not establish GREEN.** Record actual VM/cgroup partition signals. Do not force `partitioned=true`, change thresholds, reconfigure other holders or claim timing from AMBER. A non-GREEN window cannot grant acceptance: retain UNJUDGED point metrics and continue under the live4 dispatch. Q100k permits three failed 30-minute deferrals before HOST-NOT-QUIET; record those as separate attempts with new names and explicit authorization, never retry a timing failure in place.

## One authorized attempt

From this worktree, on the committed branch, with the private DOCKER_HOST already set:

```sh
node lab/bin/engine.mjs status
node lab/bin/heavy.mjs --label CX-RT01-live4 -- node lab/experiments/EXP-RT01/round7/run-live.mjs
```

The live4 controller creates raw `live4/admission1`, `live-attempt1`, `g2-attempt1`, `g6-attempt1` under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/`; the prior round7 offline attempts and live3 receipts are separate and must remain. It acquires xtdb-s1 through engine.mjs as CX-RT01, rebuilds core/testkit/XTDB and completes the same G2 first. G6 validates the exact G2 source/build hashes and the isolated pre-RT01 59e07afb baseline artifacts. No dependency install or sibling source import is part of the command. G6's child explicitly uses Node's experimental type stripping for the byte-exact M01 TypeScript helpers.

The maximum G6 child budget remains six hours, G2 ninety minutes. This is a safety deadline, not an observed completion estimate for the expanded history run. There are up to **32,000 A/A control commits + 16,000 measured A/B commits + 80,000 history preload commits**. At 100 ms each that alone is 3.56 hours; history growth can slow it further. Arrange an appropriate window before admission. A deadline failure is retained; no timeout retry is automatic.

## Pre-B rule and window grade

1. Start the pinned M01 host/VM recorder and calibration/hiccup probes in the same heavy grant and private triplex2 profile. Record host pressure/pageouts, VM PSI, exact engine cgroup/neighbor CPU/memory, spin drift/interference, driver ELU and hiccups, with boundary samples and ten-second sampling. Raw signal/calibration observations and parser errors remain per round. Missing signals do not clear a hard rule.
2. For each encoding A0/compact and input size 10/5, collect **four independent A/A rounds**. Each round uses fresh matched scopes, the same declared application input and deterministic clock/id seed, ABAB 500-commit blocks: **1,000 samples/control arm**. No B runtime is instantiated here. The microbench is closed-loop, without NS reader/burst traffic; the equal-phase identity names this exact workload, not a frozen NS acceptance series.
3. Reuse M01 sample `sd`, Student t and `analyseSingleWindow`. Pair noise is `d_k=ln(q_right/q_left)` for each metric; record sample s_d, mean log ratio and round count. Four same-engine, same-input left-control observations also give three adjacent sequential p50 log ratios for Q100k. Keep all attempted hard-rule history. Record every preflight context grade before B. RED/AMBER/INVALID/UNGRADED leaves that context’s timing bars unjudged while observations continue; another context’s grade does not suppress a GREEN context.
4. Freeze the **entire** rule, identities, noise config digest, calibration data, per-metric bands and grades in `AA-RULE-BEFORE-B.json` with exclusive creation. Write its SHA256 sidecar and rule-frozen event before any B sample. The pre-registered 95% predictive log band is:

   `band = exp(abs(mean(d)) + t975(k-1) * 1.5 * s_d * sqrt(1 + 1/k)) - 1`.

   This uses M01's 1.5 preflight safety and a future-round prediction factor, rather than a standard error of the A/A mean. The absolute bias term covers persistent arm/order bias conservatively. It is an RT01 adaptation using the accepted M01 primitives, not M01's unrelated NS superiority margin. No arbitrary percentage floor or post-B widening is added.
5. After freezing the rule and preflight grades, measure fresh then 10k-history points, A0/compact × 10/5 facts, ABAB 500-commit blocks, **1,000 samples/arm/point**. p50 requires >=150; p99 requires >=1,000. This runbook chooses Q104a's large-n alternative; it does not bootstrap individual dependent commands. Quantiles use exact nearest ranks on raw milliseconds.
6. Re-read/hash/recompute the frozen rule before every point. The point's fresh noise signals pass through Q100k with the frozen same-arm A/A drift reference and complete preflight hard history; B latency never grades noise. Point noise must be after rule creation. A non-GREEN point is UNJUDGED and continues, never performance FAIL/PASS. Completion with any unjudged points uses child exit 3 and an explicit UNJUDGED overall outcome. A GREEN point is a regression only for a **strict** B/A ratio above `1+band`; equality is within band. Below sample floors is INCONCLUSIVE. Stop at the first judged regression or correctness/transport/resource failure; no retries. Continue past non-GREEN points without judging their timing bars.

The variance reference is preflight, not a newly estimated candidate-dependent s_d. Signal drift, long gaps or changing host conditions require a new orchestrator-authorized A/A window; do not carry a GREEN label into a different attempt. A within-band point is evidence under this rule, not a blanket promotion or NS result.

## Diagnostic observations and cleanup

Retain every sample's receipt position/stamp, input SHA, observed query/submit/statement count and PG-wire Execute/ReadyForQuery counts. Check physical fact readback, exact scope assertion counts and current marker. Preload 10,000 real public commits per arm; no synthetic SQL history or huge literal VALUES. Keep native SELECT-predicate EXPLAIN and EXPLAIN ANALYZE outside timing: **actual pre-RT01 position-only guard**, old RT01 wide-stamp guard, and current marker guard. Native rows/pages/source and exact scope/cut/stamp parameters must accompany latency. Plans are diagnostic SELECT probes, not per-commit ASSERT execution counts.

Inspect retained p99 wire/service decomposition and current driver ELU/hiccups before proposing a compact fix. COMMIT SYNC includes transaction application; ASSERT wire duration alone is not its execution cost. Time outside wire cycles includes runtime/connection/event-loop scheduling and synchronous observer logging; do not call it pure CPU time. No causal conclusion follows from one tail sample or a post-point scan.

The controller's finally block captures end identity/logs, removes only its acquired engine/volume through engine.mjs, runs private-profile fstrim and restores Docker context colima. Verify specific missing-resource messages, owner/reservation/retained-volume absence and saved context (DOCKER_HOST masks `context show`). Never remove a pre-existing unknown resource. Preserve first-failure stdout/stderr and exact source/build/engine identity. Seal closed streams with a **new live4 manifest**, read back hashes, append the report and commit only derived receipts/manifest/index. Never run round6's old seal/retention scripts against this attempt or alter any failed receipt, acceptance pin or oracle.
