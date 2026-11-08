# EXP-K01 offline verification: FIX-FIRST

Reviewer: CX-VK01. Reviewed builder head: `05a23dd90fde0d7c1df5f8ecff2ef417fa436e20`.
This branch starts at that exact commit. No implementation under review was changed.

North star: correctness of reused seed state, required for trustworthy P1-P5 measurements. Goals and targets come from
`lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`. Review criteria: R26, R30, Q83a-d, and
`lab/experiments/EXP-K01-seed-clone/REPORT-round2.md` at the reviewed head.

**Verdict: FIX-FIRST.** The main freeze/copy sequence follows R30, and the offline negative controls generally reject
unsettled or different state. Three reproducible gaps remain. These are offline findings, not claims that an invalid
golden was observed on XTDB.

## Findings

### F1 — HIGH: a failed re-verification leaves an earlier PASS usable by the driver

**Location:** `lab/bin/engine.mjs:888` (status is updated only at line 892);
consumer `lab/bench/lib/bulk.ts:48`.

Start with a previously verified clone whose owner record says `readiness.verdict: PASS`. Re-run `engine.mjs verify`
while its `clone-check` process fails before returning JSON, for example a connection error in `startCheck`. The exception
escapes before any owner update. The previous PASS remains current, and `seedPathOf` still accepts the owner as a
verified clone. The command reports an error, but its durable admission state contradicts that result; the failed attempt
also has no new verification receipt. The same window covers early `loadGolden`/running-config failures and receipt-write errors.

**Reproduction:** test `F1:` in [offline.test.mjs](offline.test.mjs) executes the actual engine verification function
with a failing `cloneCheck`, then passes the resulting owner file to the actual `seedPathOf`. Expected: refused.
Observed: `driverAccepted: true`, owner still PASS. Raw result: `exceptional-reverify` in
[cases.json](evidence/cases.json); failing assertion in [regressions.tap](evidence/regressions.tap).

**Proposed fix:** before starting any new verification checks, atomically replace the current readiness with PENDING
bound to a new attempt. Preserve the old PASS as historical evidence. On every exception, save an ERROR/refusal receipt
and leave admission non-PASS. Publish PASS only after the complete new checks and receipt are durable. Extend the
regression to early identity/config and receipt-write failures.

### F2 — MEDIUM: T1's failed stop proof is treated as a successful stage

**Location:** `lab/experiments/EXP-K01-seed-clone/round2-live.mjs:44` and its exit-only helper at line 24;
also `lab/experiments/EXP-K01-seed-clone/round2-t1.mjs:12` and line 17.
The stop command returns a JSON verdict without making `verdict.ok:false` a process error (`lab/bin/engine.mjs:637`).

A T1 stop can return exit 0 with `verdict.ok:false` because `Node stopped.` is missing or the duration exceeds ten seconds.
Both runners only inspect the exit status. The main runner proceeds through logs into `T1-up`; the standalone T1 script
would complete normally after logs and cleanup. The result files preserve the false verdict, but the orchestration
does not recognize it as a failed prediction. This is especially relevant to the Log4j shutdown-hook regression T1
exists to detect.

**Reproduction:** test `F2:` executes the actual complete live-runner body with an exit-zero, unclean T1 response.
Expected: abort after the failed stop, with owned cleanup allowed. Observed command sequence:
`up, stop, logs, up, down, status`. The second `up` proves the runner continued. See `runner-unclean-T1` in
[cases.json](evidence/cases.json).

**Proposed fix:** explicitly decode stop results and require `verdict.ok === true` for every T1/required-clean-stop
stage in both runners. T2's expected no-flag refusal should remain an explicitly interpreted diagnostic. Record a
semantic stage failure before cleanup and propagate it through the runner exit. The main `golden` function already
checks stop verdicts, so this finding does **not** show that it publishes a golden after an unclean stop.

### F3 — MEDIUM: settle ignores the current completed-transaction gauge

**Location:** `lab/bench/clone-check.ts:119`.

Q83d requires the new block's `tx_id` to equal the node's gauge in the settle evidence. The predicate instead compares
it only to `before.gauges.latestCompletedTxId`. It never checks `g.latestCompletedTxId` in the current reading.
Thus it can emit `settled:true` for evidence that says the block contains tx 100 while the node currently reports tx 101,
provided the remaining conditions pass.

**Reproduction:** test `F3:` feeds the actual settle function otherwise valid two-cut observations, changing the current
completed-tx gauge to 101 while block tx and initial tx remain 100. Expected: refusal. Observed: both phases pass,
`settled:true`; see `completed-tx-gauge-drift` in [cases.json](evidence/cases.json).

**Proposed fix:** require a present, valid current completed-tx gauge and equality of block tx, current gauge, and
the frozen seed tx on every accepted poll. A change from the seed tx should explicitly refuse rather than produce a
settled receipt. This is an evidence-contract counterexample using injected observations; it does not establish that
XTDB produces that inconsistent gauge/source combination under normal operation. The later reference-start check can
also catch a real tx mismatch, so no invalid published golden is demonstrated by this test alone.

## Checks that held offline

| Criterion | Result and evidence |
| --- | --- |
| Q83a / Log4j race | Only s1-s3 add the shutdown-hook flag; effective config and golden identity include it. Actual `stopVerdict` rejects missing stop lines, ten-second/forced stops and OOM; accepts the complete clean-stop fixture. Component lines are recorded. |
| R30 stale sharedSnap | Settle does not read `xt.live_tables`; an injected function that throws if it is consulted is never called. Actual `startCheck` accepts a clean restarted state and rejects nonzero live rows, wrong resume watermark, trie drift and busy compaction. |
| Q83b/d settle | Actual settle accepts L1 coverage after fast compaction with two cuts and three observations five seconds apart per cut. It rejects busy jobs, missing tables, garbage tries, coverage of another block, missing gauges, changing catalogs, non-advancing upload time and lag. A busy poll resets the stability streak. A changed second-cut catalog refuses. F3 is the missing equality above. |
| Superseded source watermark | A stable immutable block behind the node's source offset explicitly refuses after four total samples (three unchanged comparisons). No replacement block cut is issued. This preserves, rather than resolves, the builder's reported live-watermark concern. |
| Content differences | Actual `clone` preparation compares actual `parseListing` tree hashes. A one-byte Arrow-file fixture change from `a` to `b` refuses C1 before the start boundary; identical bytes pass that boundary. Actual `compareFreeze` rejects changed tx/count/history/layout/position and sampled-result fingerprints. |
| Golden ordering | Source review: two cuts, exited query process, checked stop, read-only offline tails and `.tmp` refusal, stopped-byte copy and exact tree comparison, reference start, fingerprint, second checked stop. The golden is not started. The reference listing and time guard precede publication. |
| Q83c | Block queries enumerate actual published files and re-list immediately before each query. No dense/absent-index probe is introduced. |
| Explicit failures | A failed finish-block returns failure after one cut, with no polling/retry; a snapshot exception propagates on its first call. Golden attempts persist incremental observations and final exceptions. Admission retries are visibly logged capacity waits. F1 and F2 are the remaining failure-state gaps. |

These checks are controlled offline fixtures. C1 hashes every regular file before the first start; C8 samples subjects,
and does not independently prove every row equal after arbitrary later storage changes. The R26 C10 full-content audit
remains a live E1 obligation. Historical pinned-image toolcheck results were read, not rerun or promoted to fresh evidence.

## Execution and artifacts

- Original focused suites: **41/41 passed**, zero skipped.
- New reviewer suite: **21 tests, 18 passed, 3 failed**, zero skipped. The failures are the desired-behavior assertions for
  F1-F3, deliberately retained as regressions. No expected-failure marker hides them.
- [run.json](evidence/run.json) records actual command statuses, signals, Node version, source head and TAP hashes.
  [baseline.tap](evidence/baseline.tap) and [regressions.tap](evidence/regressions.tap) hold raw results.
- [cases.json](evidence/cases.json) binds raw reviewed-source SHA-256 values and controlled observations. The helper
  extracts the reviewed functions, strips TypeScript with Node's built-in stripper, and injects I/O plus virtual time.
  It does not substitute a rewritten settle predicate. The copy fixture stops at the injected start boundary.
- [initial-19](evidence/initial-19/) retains the earlier 19-case run before the two explicit no-retry cases were added.
- [run-offline.mjs](run-offline.mjs) reruns both suites and preserves their exits; it exits 1 while the three defects remain.
- [SHA256SUMS](evidence/SHA256SUMS) covers the committed review report, test tools and result files.

Reproduce from this worktree (the shared heavy semaphore controls test admission):

```sh
node lab/bin/heavy.mjs --label CX-VK01-offline -- node lab/verify/K01/run-offline.mjs
```

Host disk preflight showed about 23.6 GiB free, above the 5 GiB floor. Test temporary files are confined to this review's
ignored `tmp/` directory, removed after the gates. All authored changes and retained review results are under `lab/verify/K01/`.

## Unverified work and handoff

No Docker command, engine lifecycle action, volume creation, exclusive-slot reservation, network service call, package
installation, implementation fix, main-checkout edit, merge or push was performed. Only the shared heavy-test semaphore
was acquired. No full monorepo check or TypeScript build was run: the worktree has no installed dependencies or built
XTDB package, and these offline fixtures require neither.

T1-T7 on a real engine, log-tail/BusyBox parser execution on the pinned image, actual copy/restart/C1-C8 certification,
full-content C10, E1/PAIR-0 latency equivalence, large-rung behavior and performance remain unverified here. In particular,
the historical G3 refusal due to compaction advancing the source watermark is still unresolved by fresh execution.
The builder report accurately records that admission was blocked and makes no successful golden/clone claim.

After F1-F3 are fixed, rerun these regressions before the separately admitted live window. The orchestrator must still
resolve source ownership/capacity and the watermark question; this review grants no cleanup or lifecycle authorization.
