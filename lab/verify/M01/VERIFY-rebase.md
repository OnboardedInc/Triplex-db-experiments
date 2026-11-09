# CX-VM01R: EXP-M01 rebase review

**Verdict: FIX-FIRST.** The tested PAIR-off paths preserve merged main's behavior, and both retained receipts really recompute. Fix the runbook's absolute-window grading handoff and its prebuild command before treating this as the G03 execution handoff. No production code was changed by this review.

North star: P1-P5 measurement validity, especially correct attribution of the first NS timing acceptance. Goals and targets come from `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`.

Reviewed commit: `f45d479a313f2679db892ea8e773f0c6c0a27d76` (`exp/M01-rebase`). Comparator: its merged-main parent `1a83095c97885e3865c88b3985ecddb036276881`. The other parent is original M01 `1e3c2b551e2b08a0040247787655c4b5547b42d3`. Main has advanced since that merge; this review compares against the exact main whose conflicts were resolved, not subsequent unrelated changes. R44 is absent from this review commit, so I read the requested main-checkout document read-only; its full-file hash, path commit, and relevant numbered excerpts are retained in `references.json` and `R44-reference.txt`.

## Findings

### F1 — P1, integration blocker: paired GREEN is not Q100k single-arm timing GREEN

Location: `lab/experiments/EXP-M01-paired-measurement/RUNBOOK-rebase.md:49` and `:51`; implementation at `lab/bench/lib/paired.ts:393` and `lab/bench/lib/pair-analysis.ts:162`.

The runbook describes an implementation in which a hard-rule-excluded round can be dropped and the remaining window can still be GREEN. It then says absolute NS bars count in GREEN windows without stating the stricter Q100k predicate or the different statistic required for `measure_single`. R44 section 6.2 item 3 and Q100k require hard rules unbroken, at most one third excluded, and **sequential equal-burst-phase A/A on the same arm**. The existing PAIR statistic is simultaneous `ln(p50_A / p50_B)`.

Reproduction: `challenge.ts` constructs twelve identical A/A rounds with valid accounting, calibration and disjoint cpuset placement. One round has `vm.psi.memFullShare = 0.05`, above the pre-registered hard limit 0.01; all other signals are clean. The actual `analysePair` result is:

```json
{"exclusions":{"R01":["vm-psi-mem-full"]},"counts":{"rounds":12,"excluded":1,"usable":11,"amber":0},"windowGrade":{"grade":"GREEN","reasons":[],"sdUsed":0}}
```

`challenge2.json` contains the complete synthetic input and observed output. Accounting/calibration checks pass and placement problems are empty. Under Q100k this must not admit absolute timing bars: a hard rule broke. This is a handoff incompatibility, not evidence that a production NS receipt has already been admitted incorrectly; PAIR remains default-off and the runbook explicitly disclaims evaluator integration.

Proposed fix: document separate paired and single-arm grading contracts, and require the future G03 `measure_single` adapter to enforce Q100k before timing admission. Carry hard-rule history into that decision; `windowGrade` currently receives an exclusion count rather than enough information to distinguish hard-rule failures. Preserve paired R22 behavior where intended. Add the above case to the independent G03 admission tests. Do not change noise thresholds or the acceptance contract in this patch.

### F2 — P2: the documented clean-checkout prebuild command fails

Location: `lab/experiments/EXP-M01-paired-measurement/RUNBOOK-rebase.md:22`.

Reproduction on Node 22.23.2 and pinned pnpm 10.11.0 after a frozen offline install:

1. The documented `pnpm --store-dir ... --filter ... build` form exits 1 with `Unknown option: 'store-dir'` (`build.log`).
2. Using the supported `--config.store-dir=...` form exposes the second problem: `@triplex-build/triplex-core` matches no project. The actual core package is `@triplex-build/triplex`. On this clean checkout, qualification declarations then fail because core has not been built (`build2.log`).
3. Using the actual core name and including W0 succeeds (`build3.log`). The documented prebuild also omits W0, although the rebase report correctly says NS/PAIR import it. The gate itself uses the correct core name and now builds W0, so this finding concerns the pre-outage preparation command.

Proposed replacement for that line:

```sh
node lab/bin/heavy.mjs --label M01-window-build -- pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store --filter @triplex-build/triplex --filter @triplex-build/triplex-testkit --filter @triplex-build/triplex-xtdb --filter @triplex-build/triplex-qualification --filter @triplex-build/w0 build
```

## 1. Conflict resolutions and PAIR-off compatibility

Fresh focused suite: **50/50**, no failures/skips (`focused-tests.tap`). The exact main snapshot's common suite also ran fresh: **31/31**, no failures/skips (`main-tests.tap`). These are offline harness checks, not the root `pnpm check` or a live gate.

`prepare-baseline.mjs` materializes exact Git source into this verifier's ignored `runtime/` directory. Both snapshots consume the same locally built public package artifacts; package source and lockfile have no diff between merged main and the reviewed commit. No package source or dist was imported from another checkout. The baseline engine probe only appends an export for its otherwise private `runArgs`; its function body is unchanged. `compat-probe.mjs` compares actual outputs, not a second implementation of the engine logic.

Results (`comparison.json`, `main-harness.json`, `reviewed-harness.json`, empty `harness.diff`):

- **12 engine slot configurations**, across X/Q/D, have equal effective objects, hashes and Docker argument arrays.
- **16 XTDB follower configurations**, across every slot, default/small profile and absent/explicit cpuset, match main. Quota and optional cpuset behavior survive.
- **36 existing gate-verdict fixtures**, five pool-admission fixtures and four language-classification fixtures match.
- **21 gate/lane dry runs** have the same dispatch admission and stdout. Unsupported Datomic routes still refuse. Their usage text adds `|PAIR`; that additive name is the only stderr normalization.
- **Four actual memory-driver executions**: zero-reader baseline and reader/sweep profiles on both revisions, each completed `DONE` with PAIR absent. Same 21-subject population, seed, generated trace, shortened phase settings, memory service delay and package builds. Full raw outputs are retained.
- Stable driver projections match: trace bytes/digest and parameters, seed counts, full phase layout/history-growth results, histogram names, oracle nonexecution reasons, zero correctness errors/violations, three feed crash points fired, no feed gaps/duplicates/order or affected-set violations, exact replay, and checkpoint equal to final feed target. Command identities, frozen background offsets and outcomes match after removing measured latency and phase-triggered overlay start times.
- The zero-reader baseline offered/completed six background commands per revision; both feed targets/checkpoints are 47. The reader/sweep profile completed seven P5 overlay commands per revision; both targets/checkpoints are 49. All 5/5 baseline reads, 111/111 main reader-profile reads, and 121/121 reviewed reader-profile reads are correct. Read totals differ with scheduling; no performance equality is claimed.

The comparator retains raw reports and explicitly excludes random scope IDs, timestamps, elapsed-time histograms/CPU/ELU, polling/retry counts and read totals from equality. Four new PAIR config fields are null in the reviewed NS report. Added engine status columns/cgroup probes and the additive `probe pending` log field are intentional instrumentation changes; there is no claim of byte-identical arbitrary CLI output.

| Textual conflict | Independent check and result |
| --- | --- |
| driver shutdown/drain | Diff retains main's separate 300 s in-flight wait after PAIR finalization. Both offline profiles finish with zero pending work and checkpoint equal to target. The minutes-long adapter queue case was inspected, not reproduced. |
| driver feed shutdown/replay | Main's late-growth folding, current-position target, 120 s catch-up and post-drain replay remain behind the non-null feed guard. The actual PAIR-off runs exercise all three crash points and exact replay. |
| engine imports | Datomic source/config hashing remains executable offline; every D/X/Q effective config and Docker argument array matches main. No Docker process is started. |
| engine CPU flags | Default slot hashes/args and explicit follower cpusets match. Opt-in cpuset/no-quota behavior is separately covered by the 50-test suite. |
| gate inserted functions | Both `gatePAIR` and `gateGS` remain distinct; all existing dry-run routes match and GS Datomic is admitted. No live GS execution was performed. |
| gate validation/dry-run | 21-case output comparison preserves main's supported lane set and OBL planning/nonexecution. |
| gate dispatcher | Existing G0/G1/G2/G4/NS/GS branches remain; PAIR is a separate explicit branch. No existing route invokes PAIR. |
| test environment | Main's checkout-local config and temporary lock/engine isolation remain in the current test file; both snapshots' suites run without engine access. |
| appended tests | The current 50 include the common main 31 plus M01 tests; no test names from the common set were dropped. |

The all-token lease parent-grant regression passes in the focused suite. Default `slots.json` is byte-identical to merged main; only explicit `TX2_SLOTS_FILE` selects the paired placement. These finite checks establish compatibility on the stated offline inputs, not all possible harness or backend behavior.

## 2. MATCH is real, with its stated limits

`challenge.ts` imports the reviewed recomputer and independently reads both original receipt files:

| Receipt | Original recompute | One recorded sample changed |
| --- | --- | --- |
| Historical `PAIR-xtdb-20261108T010440Z-7fcef1` | MATCH; grade INVALID | R01 pre-host minimum at index 17: 21.42725 → 0.2142725 ms |
| Rebase memory `PAIR-xtdb-20261109T070418Z-f081c3` | MATCH; grade INVALID | R01 pre-host minimum at index 5: 20.070041 → 0.20070041 ms |

For **both** receipts, leaving the original evidence hash causes an explicit calibration-hash refusal. Rehashing the modified evidence still produces **MISMATCH**: recomputed `checks.calibration.ok` becomes false, and the drift/interference checks disagree with the recorded numbers. This tests the arithmetic dependency as well as the hash check. The saved originals are not edited. `challenge2.json` binds each original receipt's SHA256 and retains the exact mutations and differences.

The originals are offline memory receipts with missing placement; their stored gate FAIL is intentional. Recompute derives a protocol INVALID and permits a stored FAIL to remain a stronger enclosing failure. Neither MATCH proves engine identity, capture freshness, genuine placement, independently reviewed semantics, or a measured performance PASS. I did not recollect either receipt's underlying observations.

## 3. Signal rules, s_d and the GREEN expectation

The actual `noise.json` matches R22's registered provisional signal thresholds: critical host pressure, >20,000 pageouts, CPU PSI amber >0.4/exclude >0.6, memory-full >0.01, IO >0.1, cpuset throttle >0.05, OOM/restart, memory max-events >50, neighbor >0.25 cores after partition, calibration drift outside [0.85,1.18], interference >2, hiccup >100 ms and client ELU >0.9. Missing evidence excludes rounds; host load and idle remain record-only. Rules operate on signals rather than choosing latency outliers. The whole config is hash-bound. `noise.test.ts` exercises parsing/rule boundaries; I inspected the config against R22 rather than treating test success as policy authority.

The planning inversion gives `s_d <= 0.2759123411` at 12 rounds and `<= 0.3901989748` at 24 rounds for ratio 1.25, 95% level and 80% power. Those agree with R22's rounded 0.28/0.39 and the runbook. The p99 claim floor is 25,000 commands per arm and eight usable rounds; a GREEN p50 window alone does not establish a p99 claim. The runbook's predicted live p50 `s_d <= 0.10` is explicitly an **unmeasured prediction**, not R22's admission threshold or a verified XTDB expectation. Historical memory dispersion is not an XTDB calibration.

The 1.5 preflight safety multiplier exists in `windowGrade` when explicitly passed `sdSource: "preflight"`. Current `analysePair` passes `"aa"` or `"all"`; the duet completes its A/A series rather than implementing R44's preflight/defer protocol. Do not infer that future single-arm preflight admission is already implemented from that helper option.

## 4. Q100l capacity and what measure_single needs

**Yes, the runbook still requires concurrent arms.** Lines 7 and 35 reserve s1/s3; `duet.ts:103` spawns both drivers, and both must reach the barrier before GO. The template omits `--readers`, so the current plan defaults to **zero closed-loop readers**, with open-loop probes. This is a reduced-reader calibration, not an instruction to run two 256-reader arms. Its statement that screening does not close NS cells is correct.

The 10 GiB engine-only reservation calculation does not establish capacity for R44's complete NS path. Q100l budgets about six CPUs and 7 GiB **per arm**, including engine, broker, consumer, readers and trusted processes. Two full arms cannot fit this six-vCPU/11-GiB VM. Stopping residents alone does not create that CPU capacity. Comparative/A-A duets must remain reduced-reader DIAGNOSTIC for 256-reader bars until the VM grows. The runbook should say so explicitly and point to the separate single-arm handoff.

The G03 `measure_single` handoff needs:

1. One complete, resource-admitted arm with 256 readers and the fixed writer trace, including broker/consumer/trusted-process cost and actual source/build/slot/input bindings. Do not fake a second simultaneous arm or put both arms on one slot.
2. Same-arm rounds of **equal burst phase**; calculate `d_k = ln(p50_k / p50_{k-1})`. Keep R22's provisional limits until reduced-reader M01 calibration establishes a separately registered sequential limit. Sequential drift is not canceled as duet drift is.
3. R22's per-round signal recording and rule IDs, Q100k's hard-rule predicate and timing eligibility, and the exclusion denominator. Keep the pair and single measurement kinds/statistic sources explicit in receipts; do not manufacture a paired A/B interval for absolute bars.
4. A GREEN three-round preflight, lease release and 30-minute deferral when it is not GREEN, and stopping with HOST-NOT-QUIET after the specified three failed deferrals. Finish later noisy attempts for correctness; timing becomes unjudged. Count bars remain judged in every window; timing-INVALID/unjudged must not trigger VA12 failure accounting.
5. A resolved preflight sample-count contract: three sequential medians give only two adjacent differences, whereas the current helper requires at least three identified ratios. G03 must define the baseline/control arrangement explicitly rather than silently passing duet ratios or relaxing a threshold. This is an open integration detail, not something this reviewer implemented.

## Evidence and reproduction

Durable raw root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VM01R/`. `SHA256SUMS` binds all 29 raw files (474,722 bytes), including the first interrupted fixture and the four complete comparison runs. `INDEX.md` maps the committed evidence. All verifier tools and reports are under `lab/verify/M01/`; ignored runtime snapshots are reconstructible with `prepare-baseline.mjs`.

```sh
node lab/verify/M01/prepare-baseline.mjs
node lab/verify/M01/prepare-baseline.mjs reviewed
node lab/verify/M01/compat-probe.mjs lab/verify/M01/runtime/main main
node lab/verify/M01/compat-probe.mjs . reviewed
NODE_OPTIONS=--experimental-strip-types node lab/bin/heavy.mjs --label CX-VM01R-repeat -- node lab/verify/M01/run-offline.mjs 3
NODE_OPTIONS=--experimental-strip-types node lab/bin/heavy.mjs --label CX-VM01R-challenge-repeat -- node lab/verify/M01/challenge.ts
```

`compare.mjs` compares retained attempt 2; a new attempt number preserves the old observations. Install/build commands and results are in `install.log`, `build.log`, `build2.log`, and `build3.log`. The 50-test command is the one in REPORT-rebase, run afresh under heavy.mjs. Free host disk was 30 GiB initially and 27 GiB after setup, above the 5-GiB floor. Shared heavy grants were respected; waits are retained in the logs.

First failures were preserved, not relabeled: (a) invalid runbook build syntax and package filter, (b) the first reviewer fixture used zero-delay memory service and the main positive-reader run timed out; the retry uses the same 1-ms service delay on both revisions, (c) the initial baseline snapshot omitted the dry-run policy module, then was completed from the same pinned revision, (d) the first synthetic fixture omitted the interference signal's value 1, then was corrected, and (e) comparison initially tried to equate P5 overlay timestamps, then explicitly classified these phase-triggered times as measurements. Relevant original logs remain committed or in the durable raw archive. None is asserted to be a rebase regression.

## PASS / verdict / receipt audit (rule 9a)

No new semantic PASS receipt or promotion was issued. The review's observation-to-result boundaries are:

| Boundary | Content | Freshness | Binding / limit |
| --- | --- | --- | --- |
| focused/common test TAP success | Actual fresh commands, exit status and all test outcomes; 50/50 and 31/31 | Executed in this review | Reviewed source / exact main snapshot; temporary lock/engine directories; offline only |
| `run-offline.mjs` driver/dry-run checks | Child status, `DONE`, no PAIR report, supported/refused routes and parsed planning output | New per-attempt directories; timeout retained as first failure | Exact snapshots, explicit identical arguments, own public builds, memory composition; no engine slot claimed |
| `compat-probe.mjs` outputs / `compare.mjs` `equal:true` | Deep equality of actual effective configs/args/verdicts; validated stable report projection and command outcomes; zero correctness/feed violations | This review's generated outputs and attempt-2 reports | Both Git revisions, driver source manifests and raw report SHA256; documented normalizations; no latency equality or long-queue coverage claim |
| `challenge.ts` assertions | Both original recomputations, explicit stale-hash refusal, MISMATCH after rehash, synthetic hard-rule GREEN counterexample with valid accounting/calibration/placement | New computation and new in-memory mutations | Original receipt SHA256, exact edited index/values, reviewed recomputer and config; historical capture stays historical; synthetic data claims no slot |
| durable `SHA256SUMS` | SHA256 of every copied raw file | Copied/read now from this review's owned output paths | Relative paths under the named durable root; bytes can be independently checked |
| this FIX-FIRST verdict | Two concrete findings, source locations, reproduction and proposed fixes | Based on this review's executions and inspected R44 bytes | Target f45d479a and merged-main parent; separate from any NS/GS acceptance |

## Contract / scope audit and open work

No file in `lab/acceptance/` was edited. Its tree is also unchanged between merged main and f45d479a. This branch changes only new `lab/verify/M01/` files, none of which was previously a pinned source path; **no pinned path has an old/new hash change to report**. No dependency or lockfile change, code-under-review fix, merge, push, engine reservation, Docker/Colima invocation, resident lifecycle operation, host pause, or live benchmark occurred.

Not verified: live XTDB A/A `s_d`, actual GREEN host/VM partitioning, two-slot reservation viability, 10k seed timing, the minutes-long late-commit case, full `pnpm check`, independent O-REPLAY/O-DOMAIN acceptance, or G03/evaluator integration. Resolve F1/F2 and the explicit single-arm preflight detail, then have an independent verifier exercise the eventual admission adapter. No first-PASS claim follows from this review.
