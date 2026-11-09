# CX-VDF01: EXP-DF01 round 2 review

North star: P3 correctness, ordered resumable feed, under `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.
Scope: original finding F1 and the requested stale-report storm, zero-wait and last-millisecond publication cases. Offline only.

Reviewed source: `exp/DF01-datomic-feed` at **`0f6c28c08daf9d370d2370eca8d152931b0ac512`**.
Reviewer branch: `verify/DF01`, starting at `d4f06d59`. Production source was neither edited nor merged onto this branch.

## Verdict

**FIX-FIRST.** The original early-empty reproducer is fixed, but a forced last-millisecond publication still produces an empty
response when the last captured empty cut straddles expiry. This is within the expressly requested deadline case, not an
unrelated expansion of scope. It is a medium-severity response-completeness issue; no permanent data loss is demonstrated.

The original probe passes on the fix and still fails on the old source. Storm/zero-wait cases and a favorable last-millisecond
publication passed. They do not cover the remaining interleaving below.

This is **not an all-green combined harness result**: five publication-window assertions failed across the two runs because
the fake publisher missed its intended window. Those attempts and nonzero process exits remain intact, as detailed below.
Those fixture failures are separate from the two actual content/checkpoint failures in the final counterexample.

## Remaining F1 deadline case

**Severity: medium (P2).** `packages/datomic/gateway/src/triplex/gateway/feed.clj:81`.
The loop computes remaining time **after** reading the page. If that read captured an empty old database value before the
deadline and returns after the deadline, the `remaining <= 0` branch returns the stale empty result without a fresh read.
A transaction that became readable before the deadline, together with its notification, is left to a subsequent HTTP poll.

Fresh reproduction: [round2/deadline-cut-1.log](round2/deadline-cut-1.log),
[deadline_cut_verify.clj](deadline_cut_verify.clj). Input binding and actual nonzero result are in
`round2/deadline-cut-1/{inputs,result}.json`.

1. Start the actual route with `fromT=105`, `waitMs=100`, visible basis t=100; first read is empty.
2. Inject a legal delayed report for t=100. The second `d/db` captures the old immutable value t=100.
3. Pause that captured-value return. Publish t=105 **0.962875–1.045084 ms before the actual internal deadline**, then enqueue
   its report. The interval brackets the real deadline; the timing-window assertion passes.
4. Resume the old captured read after expiry. The route sees its old empty page and the expired clock and returns
   **`{"fromT":"105","nextT":"105","rows":[]}` after 104.823541 ms**, with t=105 already visible. Captures are **[100,100]**;
   there is no post-expiry read of the latest log.

This probe executes the reviewed loop, clock, drainer and promise wait. It fakes the database API and deliberately pauses
between snapshot capture and return to model a thread that is descheduled/paused there. It does not claim that real `d/db`
performs blocking I/O or that this delay was observed on a live peer. This is the same immutable-cut concurrency model as the
original accepted reproducer, now crossing the deadline. Publication precedes report enqueue, consistent with the real API.

Result: **1 test / 6 assertions; 4 pass, 2 fail, zero errors**. The failed assertions are the expected t=105 row and nextT=106,
not the timing fixture. The checkpoint remains unchanged, so retry can recover the transaction; no permanent gap is shown.

**Proposed fix:** when a positive-budget empty read crosses expiry, perform a final fresh log read after expiry before emitting
the empty response. Keep this bounded and preserve the zero-wait single-read behavior. Alternatively, make the promised
deadline sampling semantics explicit and obtain a ruling that permits excluding a transaction already readable before expiry;
that semantic relaxation is outside this reviewer's authority. The reviewer did not modify production code.

## F1 analysis

The change at `packages/datomic/gateway/src/triplex/gateway/feed.clj:75` establishes one monotonic deadline before the loop.
At `feed.clj:77`, each iteration arms a fresh notification promise **before** reading the same requested log range. A nonempty
page returns immediately. An empty page can return only when the remaining deadline is nonpositive; otherwise the route waits
and reads again, including after a timer expiry. The actual `deref` rounds its remaining nanoseconds up to milliseconds at
`feed.clj:97`. The subscription is held across the whole loop and released by the existing `finally`.

That addresses both parts of the original *early-return* finding: a stale report cannot itself decide an early empty result, and the loop does not
keep dereferencing its original already-delivered promise. The source diff from `bc8a5edb` contains only the production feed
file and its gateway tests; projection, wire payloads, TypeScript interfaces, SQLite consumer storage and queue drainer are unchanged.

The **byte-identical original reviewer probe** now returns commit t=105 with nextT=106 after the observed cuts **100, 100, 105**.
In `candidate-2`, this took 1.146125 ms, and all of the original probe's 6 tests / 119 assertions passed. This is recovery of the
intended row, not a relaxed timing assertion that simply allows the earlier empty result.

## Independent checks

| Check | Observation |
| --- | --- |
| Builder's revised gateway suite | Fresh **10 tests / 52 assertions**, zero failures/errors in `candidate-2`. |
| Original reviewer probe | Fresh **6 tests / 119 assertions**, zero failures/errors in `candidate-2`; unchanged probe bytes checked against `d4f06d59`. Together these reproduce the claimed 16 tests / 171 assertions. |
| Stale-report storm with no new data | **1,000 stale reports in 0.570625 ms**, within the requested 10 ms window. A 120 ms request stayed pending, then returned empty with unchanged nextT after **126.755667 ms**; 344 reads, one queue removal, no remaining subscription. |
| Stale storm followed by new data | Delivered exactly t=105 / nextT=106, with no empty response; queue state cleaned up. |
| `waitMs=0`, empty and populated log | Exactly one database read per request; no queue subscription/removal/wait. Empty keeps nextT=105; populated delivers t=105 / nextT=106. Queue APIs are redefined to throw if called, so this is not inferred just from elapsed time. |
| Transaction published in the final approximately 1 ms | A valid measured trial published **0.969334–1.000042 ms** before the real internal deadline and delivered t=105 / nextT=106. The deadline is bracketed using timestamps immediately before entering the real poll function and its first arm callback. Neither the production clock nor wait is replaced. |
| Same publication timing with an old empty cut crossing expiry | **FAIL**, remaining F1 case above: publication 0.962875–1.045084 ms before expiry, empty response after expiry. Timing assertion passes; row/checkpoint assertions fail. |

The first complete candidate run also contains **two timing-fixture failures**, which remain failures: one publisher ran
6.62–6.66 ms **after** the deadline, and another published only 0.6385–0.6440 ms before it, outside the predeclared 0.7–1.3 ms
window. Both delivered the correct row, but neither qualifies as the requested approximately-one-millisecond schedule.
`candidate-2` therefore reports **4 new tests / 33 assertions, 31 passes and 2 failures**, not an all-green result. A repeat is
justified by these observed scheduling misses; its assertions and source are unchanged.

The unchanged repeat, `candidate-3`, again passes **10/52 + 6/119** baseline/original checks and every product-content assertion
in the four new tests. Its three publisher trials all missed the deadline, by approximately **0.52–0.59 ms, 1.86–1.87 ms and
2.30–2.31 ms**, respectively. It reports **30 passes / 3 failures** in the new suite. Each failure is the same timing-window
assertion at `round2_verify.clj:109`; all three returned t=105 / nextT=106. They add no valid last-millisecond trial. No timing
window or test assertion was weakened, and no further reruns were used to seek a clean aggregate result.

The repeat storm sent 1,000 reports in **0.506750 ms**; the 120 ms empty poll completed after **121.970125 ms**, with 675 reads.
Its zero-wait and storm-then-new-data checks passed again. These durations are diagnostic observations, not performance bars.

The deadline probes wrap the `poll-log` call only to measure deadline bounds and schedule the fake transaction's publication.
They invoke the actual reviewed loop, actual subscription/drainer and actual promise wait. Synthetic `d/db` values and
`tx-range` fixtures stand in for the database, consistently publishing the new database state before its report is enqueued.
These are offline behavior checks, not Datomic scheduling or P3 latency measurements.

## Attempts and binding

- `round2/candidate/`: source-load failure in the reviewer's new probe (unmatched delimiter), before tests executed. Retained
  snapshot, input manifest, result and log; unqualified. Only the probe delimiter was corrected.
- `round2/candidate-2/`: complete fresh tests above, including the two failed timing-window assertions. Source and probe
  preimages remain in this attempt; no failure is overwritten.
- `round2/candidate-3/`: unchanged timing-fixture retry; original/baseline checks pass, three timing-window failures retained.
- `round2/control/`: fresh old-source control at `bc8a5edb`. Original gateway suite 7/32 passes; original reviewer suite has
  118 passes and **one F1 failure**: empty response in **0.537542 ms**, with t=105 visible. This is the expected negative control.
- `round2/deadline-cut-1/`: valid last-millisecond schedule and two production-result failures, described above.
- Every attempt uses a separate exclusively created directory. Test output from one directory is never adopted by another.

Reproduction commands (from this reviewer worktree; use new attempt names to retain existing evidence):

```sh
node lab/bin/heavy.mjs --label CX-VDF01-r2-control -- node lab/verify/DF01/run-round2.mjs control bc8a5edb
node lab/bin/heavy.mjs --label CX-VDF01-r2-candidate-2 -- node lab/verify/DF01/run-round2.mjs candidate-2
node lab/bin/heavy.mjs --label CX-VDF01-r2-candidate-3 -- node lab/verify/DF01/run-round2.mjs candidate-3
node lab/bin/heavy.mjs --label CX-VDF01-r2-deadline-cut -- node lab/verify/DF01/run-deadline-cut.mjs
```

`run-round2.mjs` extracts every gateway Clojure file and codec specification directly from the named immutable Git commit.
Only that extracted gateway source and copied probes are on the project classpath, alongside the existing vendor distribution.
Each source copy records its original repository path, Git blob ID and SHA256. Each attempt records the reviewer head, exact
source/test/runner/JAR/JVM hashes before/after execution, actual parent heavy grant, disk availability, child exit status and
fresh projected-output hashes. It uses the retained Temurin 21 JRE and Datomic 1.0.7745 jars; no dependency install is needed.

All test/fingerprint commands use `lab/bin/heavy.mjs`; available host disk exceeded 5 GiB at admission and is checked again
inside the runner. No Docker command, engine lifecycle operation, Datomic slot, global cache, main-checkout edit or subagent was used.

## PASS / verdict / receipt audit (rule 9a)

| Place interpreting observations | Content | Freshness | Binding |
| --- | --- | --- | --- |
| Unchanged `offline_verify.clj` assertions and candidate gateway `feed_test.clj` | Exact F1 row/nextT, identity/stamp/replay/skip expectations, deadline and queue cleanup | New JVM, queues, promises, atoms and output files per attempt | Probe bytes from reviewer `d4f06d59`; exact candidate gateway snapshot and vendor API; no slot claim |
| `round2_verify.clj` / `-main` | Exact empty/populated pages, 1,000-report count and burst duration, pending-before-deadline state, read bound, queue cleanup, measured publication window and t/nextT | Fresh state per test/trial; fails if scheduling misses the declared window; preserves those failures | Actual reviewed loop/wait, explicitly fake database values; original clock remains in use |
| `deadline_cut_verify.clj` / `run-deadline-cut.mjs` | Actual nonzero child result, passing predeadline timing/visibility checks and failing exact row/checkpoint assertions; immutable candidate bytes compared with Git | Exclusive new attempt directory; fresh JVM/queues/cuts/output; hashes before/after | Same reviewed source snapshot, exact probe/runner/JAR/JVM bytes, actual parent heavy grant, slot null; source copies are rechecked before execution |
| `run-round2.mjs` result file and exit | Preserves actual child status/error/output hashes; source/runtime hashes must match before and after | Refuses an existing attempt directory; creates snapshots and outputs for this run | Immutable candidate commit and blob IDs, actual classpath, test/runner/dependency hashes, parent heavy grant, slot null |
| `index-round2.mjs` | Requires actual nonzero candidate statuses and original/baseline counts; distinguishes five declared timing misses from the two exact deadline counterexample content failures; validates the counterexample's passing time window, old cuts, visible t and empty page before emitting FIX-FIRST; checks storm/zero/control and Git source bytes | Indexes named terminal attempts separately; preserves setup failure, timing failures, negative control and semantic failure; never emits a whole-suite PASS | Exact reviewed head and every candidate/counterexample input binding; historical builder G0 explicitly marked not independently rerun |
| This report's verdict | Supported by a valid predeadline schedule with an incorrect empty result, separately from favorable cases and fixture failures | Independent reviewer executions, separate from builder history | Named revision, source-bound attempt paths and hash index; no acceptance promotion |

## Pins and limits

No `lab/acceptance/` file, contract version, slot pin, dependency, lockfile or production file was changed by this review. No
existing pinned path's hash was moved: the new source snapshots are review artifacts under `lab/verify/DF01/round2/`.
The candidate's two changed source hashes are:

| Path | Before (`bc8a5edb`) | Reviewed (`0f6c28c0`) |
| --- | --- | --- |
| `packages/datomic/gateway/src/triplex/gateway/feed.clj` | `238f2cf45ac46274ca6b6cd0b3d3ddd25d18e0d5b49c2d5bf4bee8b0e3f12996` | `fb1fa09735f90f30781ae9845e9bcec2b5974cba89e0411c5bc1adcd69504f3a` |
| `packages/datomic/gateway/src/triplex/gateway/feed_test.clj` | `b223d77da840c9cc7eaafaac979a253b6ba4511793998eee7ed58da16ab47915` | `186860a3375b10cff2eef2e73c184f604ce726830e406b5a9391597798a4c560` |

Neither changed path is directly mentioned by a pin in the reviewed acceptance tree. The existing contract is left unchanged.
The builder reports G0 `G0-datomic-20261109T081416Z-e9ae93`: 1,279 passes, 66 reviewed skips, and TypeScript conformance 4/4.
Those suites were not independently rerun in this F1-scoped review. The two modified source hashes in that G0 receipt match the
reviewed commit; this is source-binding corroboration, not a fresh execution of G0 or an independent recount of all its outcomes.

Real Datomic notifications, real peer restart/excision, live HTTP-to-peer replay, lag under load and full P3 acceptance remain
unverified. No production fix, merge, push, deployment or acceptance promotion was performed. No new high-severity finding was
observed. Round-1 reports, manifests and first failures are retained unchanged; this round uses its separate `round2/SHA256SUMS`.
All new review files are under 1 MB and the full new review evidence is under 5 MB, so no bulky evidence was added to git or
duplicated into the durable vendor/evidence trees. The copied gateway code is an immutable review fixture, not an implementation fix.
