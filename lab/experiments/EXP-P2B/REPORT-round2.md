# EXP-P2B round 2: isolate reader CPU from the broker

## Result and scope

The offline latency failure is event-loop contention from colocating the memory
replica, reader loops and answer checks with the broker. At 256 readers the first
matched matrix measured 10-fact offer-to-ACK p50/p99 **227.53/607.03 ms** locally
and **6.68/21.90 ms** with a worker. SQLite's median COMMIT/FULL-fsync envelope
was **5.38 ms locally and 4.51 ms with the worker**. The much larger local delay
happened before offers, in the broker queue and after SQLite had already committed.

The fix is harness placement. The new offline driver defaults to 256 readers in
a separate worker thread, with the actual memory replica and read/check work in
that worker. The broker remains on the main thread and its SQLite writer remains
in its existing worker. No broker batching, ACK durability, marker eligibility,
source/overlay routing, pinned-read, replica-apply or feed protocol was changed.
The legacy memory driver now requires explicit `--allow-colocated` when readers
are enabled, directing ordinary offline latency runs to the isolated driver.
The local cells remain deliberately available as contention controls. The second
matrix repeats all six controls and isolated cases after that default change;
it is not a claim that changing defaults makes a forced-local control faster.

This is builder diagnostic evidence, not independent acceptance or P2/P3 promotion.
There was no engine, slot, Docker lifecycle operation or edit to `lab/acceptance`.
The 10-fact worker diagnostic can be compared to the provisional 10/50 ms bars;
it does not establish live XTDB performance, year-one scale or target goodput.
P2Q's cited 5.9 ms measures source-to-durable-consumer feed lag, a different
interval from scheduled-offer-to-ACK. This driver retains both intervals.

## Method and stage definitions

Each cell offers 600 public `Triples.transact` commands at **20 commands/second**,
independent of completion (all offer timers are installed up front). Each of
10, 20 and 40 facts receives exactly **200 samples**, representing the upper end
of the 5–10, 11–25 and 26–50 bands. The balanced cyclic diagnostic deliberately
raises every band's denominator; it is not the target's 60/30/10 workload mix.
All cells share trace SHA256
`8288f958ac2b9087ac62bae11f1de2412903836988b4551c1da64b2df90990cb`.
The workload revisits 128 subjects with fresh attributes so old receipt pins must
mask subsequent writes. No closed-loop writer pacing or omitted late offers.
Nearest-rank p99 with n=200 is the third-highest observation; this is substantially
better than nine samples, while still a short diagnostic with host-noise tails.

`traceStages` is default-off instrumentation. Every elapsed interval uses
`process.hrtime.bigint()` in one process (including its threads):

1. Scheduled offer → actual offer: scheduling delay, included in offer-to-ACK.
2. Actual offer → broker submit: public transaction staging.
3. Submit → dequeue: broker queue wait.
4. Dequeue → append request: validation/decision/encoding.
5. Append request → writer entry: dispatch/serialization.
6. Writer entry → SQLite transaction body end: append body.
7. Body end → durable return: SQLite COMMIT/FULL-fsync **envelope**, including
   driver return construction. This is not isolated fsync syscall time; the
   driver has no native syscall hook. Existing `requireFullFsync: true` is used.
8. Durable return → host append callback: completion delivery delay.
9. Host append callback → receipt resolution: source publication/watermark.
10. Receipt resolution → public ACK callback: ACK return.

Items 5–8 partition append roundtrip; items 1–4, append roundtrip, 9 and 10
sum to offer-to-ACK for every sample, checked within 0.00001 ms. Replica apply
is timed separately from the guarded publication request to completion: it is
asynchronous, not an ACK prerequisite, and cannot be added to that sum. A
worker's apply interval includes IPC and reader-worker scheduling; synchronous
apply-body CPU is separately measured inside the worker. No system-time clock
or broker position is substituted for elapsed time.

`process.threadCpuUsage()` records CPU envelopes at each command stage and
attributable synchronous preparation/publication, SQLite body/COMMIT, replica
apply/read scan, answer comparison and feed poll bodies. CPU envelopes across
awaits overlap reader/other-command work and are **not additive attribution**.
Root and reader thread totals overlap in local mode because they are the same
thread; process CPU also includes SQLite and runtime workers. Raw reports retain
user/system microseconds; tables convert to milliseconds or seconds as labeled.

## Matched before and after observations

Each latency cell is p50 / p99 in milliseconds; n=200 per band in every row.

| Phase  | Placement | Readers |        10 facts |        20 facts |        40 facts | Checked reads |
| ------ | --------- | ------: | --------------: | --------------: | --------------: | ------------: |
| before | local     |       0 |    7.41 / 63.35 |    8.24 / 30.33 |    8.65 / 36.62 |             0 |
| before | local     |      16 |   14.45 / 44.07 |   14.28 / 35.51 |   15.57 / 51.12 |         99912 |
| before | local     |     256 | 227.53 / 607.03 | 241.56 / 557.08 | 247.53 / 638.29 |        144602 |
| before | worker    |       0 |    7.75 / 14.81 |    8.47 / 15.66 |    9.49 / 34.37 |             0 |
| before | worker    |      16 |    7.31 / 14.09 |    8.22 / 18.40 |    8.46 / 13.70 |        111201 |
| before | worker    |     256 |    6.68 / 21.90 |    7.47 / 16.81 |    8.41 / 21.28 |        189123 |
| after  | local     |       0 |    8.25 / 25.25 |    9.06 / 13.40 |   10.13 / 15.73 |             0 |
| after  | local     |      16 |   14.53 / 72.43 |   15.25 / 53.37 |   16.62 / 62.73 |        100628 |
| after  | local     |     256 | 226.38 / 712.45 | 237.53 / 691.74 | 254.07 / 654.43 |        129081 |
| after  | worker    |       0 |    7.81 / 20.95 |    7.95 / 12.80 |    9.32 / 17.10 |             0 |
| after  | worker    |      16 |    7.88 / 22.13 |    8.13 / 15.91 |    9.64 / 25.99 |        112210 |
| after  | worker    |     256 |    7.32 / 55.42 |    7.50 / 41.08 |    8.45 / 66.68 |        185422 |

Across both matrices: **7,200/7,200 commits**, 2,400 per facts band, **1,072,179 concurrent content checks**, 7,200 additional post-load pin checks, zero recorded semantic/timeline errors and unchanged source/build bytes in every valid attempt.

The isolated 256-reader repeat measured **7.32 / 55.42 ms** for 10 facts: the median meets the provisional bar, the p99 exceeds 50 ms. The first isolated run was 6.68 / 21.90 ms. Reader-count amplification is removed, but repeatable tail acceptance is unresolved. No additional rerun was used to replace that tail failure.

For the repeat's p99 observation (sequence 450), 39.11 ms was scheduling delay, 6.10 ms staging, 0.010 ms queue, 8.03 ms append and 1.77 ms remaining decision/publication/ACK work. The slowest 10-fact sample (99.69 ms, seq 435) included 15.84 ms queue, 39.17 ms COMMIT/FULL envelope and 40.87 ms completion delivery. These mixed tails are retained; this diagnostic does not establish their external scheduler, storage or runtime cause.

### Ten-fact stage elapsed time

p50 / p99 milliseconds. Stage quantiles do not add; per-sample intervals do.

| Stage                   | Before local/256 | Before worker/256 |  After local/256 | After worker/256 |
| ----------------------- | ---------------: | ----------------: | ---------------: | ---------------: |
| scheduling              | 66.448 / 228.658 |     0.321 / 3.620 | 68.576 / 312.868 |   0.385 / 18.413 |
| staging                 | 20.369 / 156.433 |     0.409 / 4.023 | 20.575 / 155.813 |    0.506 / 6.104 |
| queue                   | 65.189 / 184.211 |     0.007 / 0.030 | 65.651 / 192.326 |    0.008 / 0.602 |
| decision                |    0.271 / 0.824 |     0.215 / 0.655 |    0.272 / 2.404 |    0.240 / 0.621 |
| logDispatch             |    0.275 / 2.755 |     0.155 / 0.442 |    0.395 / 1.291 |    0.165 / 0.395 |
| logBody                 |    0.502 / 4.016 |     0.223 / 1.008 |    0.508 / 5.035 |    0.229 / 1.956 |
| commitFullFsyncEnvelope |   5.377 / 24.493 |     4.511 / 9.303 |   6.394 / 34.062 |   4.361 / 22.543 |
| durableToHost           | 62.164 / 194.570 |     0.059 / 7.209 | 59.883 / 194.081 |   0.068 / 20.775 |
| publication             |    0.474 / 2.235 |     0.640 / 1.480 |    0.463 / 3.123 |    0.690 / 9.386 |
| ackReturn               |    0.580 / 3.456 |     0.059 / 0.244 |    0.617 / 2.790 |    0.065 / 0.352 |
| replicaApplyMs          |    1.339 / 4.294 |  34.374 / 114.590 |    1.158 / 3.986 | 33.224 / 149.866 |

### CPU observations

Thread CPU totals below are seconds over each approximately 30-second offer window. Local reader and root totals refer to the same thread. Scan, apply and check columns are attributable synchronous CPU milliseconds; they exclude async waiting.

| Phase / placement / readers | Root CPU s | Reader CPU s | Read scan ms | Apply body ms | Check ms | Feed poll ms |
| --------------------------- | ---------: | -----------: | -----------: | ------------: | -------: | -----------: |
| before / local / 0          |       2.34 |         2.34 |         0.00 |        604.58 |     0.00 |       464.23 |
| before / local / 16         |      22.36 |        22.36 |     16734.20 |        690.23 |   777.29 |       427.51 |
| before / local / 256        |      27.70 |        27.70 |     19028.29 |        447.66 |  1072.25 |       246.12 |
| before / worker / 0         |       1.82 |         0.95 |         0.00 |        732.70 |     0.00 |       488.12 |
| before / worker / 16        |       1.83 |        23.24 |     18946.61 |        605.35 |   900.94 |       480.03 |
| before / worker / 256       |       6.26 |        29.39 |     22817.74 |        396.39 |  1246.32 |       447.92 |
| after / local / 0           |       2.81 |         2.81 |         0.00 |        701.07 |     0.00 |       579.17 |
| after / local / 16          |      21.89 |        21.89 |     16420.95 |        659.12 |   779.66 |       390.56 |
| after / local / 256         |      26.90 |        26.91 |     18488.49 |        427.24 |   994.32 |       241.60 |
| after / worker / 0          |       1.91 |         0.91 |         0.00 |        704.82 |     0.00 |       510.18 |
| after / worker / 16         |       1.82 |        23.24 |     18928.35 |        651.84 |   868.03 |       483.66 |
| after / worker / 256        |       7.23 |        29.42 |     22733.00 |        393.01 |  1226.16 |       467.28 |

Root command-stage CPU envelopes below are ten-fact medians, **milliseconds**, not additive stage attribution. SQLite CPU and synchronous preparation/publication are totals over all frames, also milliseconds. Full per-band distributions and user/system counters are in each report.

| CPU interval           | Before local/256 | Before worker/256 | After local/256 | After worker/256 |
| ---------------------- | ---------------: | ----------------: | --------------: | ---------------: |
| stagingCpuEnvelope     |           16.076 |             0.382 |          15.771 |            0.456 |
| queueCpuEnvelope       |           60.114 |             0.006 |          60.631 |            0.007 |
| decisionCpuEnvelope    |            0.168 |             0.131 |           0.179 |            0.145 |
| appendCpuEnvelope      |           64.263 |             0.577 |          60.652 |            0.784 |
| publicationCpuEnvelope |            0.035 |             0.036 |           0.036 |            0.041 |
| ackReturnCpuEnvelope   |            0.516 |             0.059 |           0.551 |            0.064 |
| preparation total      |           106.69 |            118.33 |          112.08 |           124.67 |
| publication total      |            17.95 |             23.75 |           17.72 |            27.11 |
| logBody total          |           210.42 |            221.08 |          213.56 |           228.98 |
| logCommit total        |           665.55 |            692.24 |          691.33 |           515.52 |

Read scan CPU dominates colocated reader work (19.03 seconds in the first local/256 run); broker synchronous preparation/publication totaled only 0.125 seconds and SQLite body/COMMIT CPU 0.876 seconds. Moving the real scan and check work to a worker fixes placement without altering broker protocol. The memory replica still scans its full map and is a diagnostic model, not a scalable engine.

### Feed observations

| Phase / placement / readers | Source durable to consumer durable p50 / p99 ms |
| --------------------------- | ----------------------------------------------: |
| before / local / 0          |                                    7.96 / 16.03 |
| before / local / 16         |                                    9.98 / 22.07 |
| before / local / 256        |                                  42.84 / 187.16 |
| before / worker / 0         |                                    7.95 / 16.02 |
| before / worker / 16        |                                    7.98 / 15.00 |
| before / worker / 256       |                                    8.74 / 17.95 |
| after / local / 0           |                                    7.80 / 16.06 |
| after / local / 16          |                                   10.54 / 27.86 |
| after / local / 256         |                                  45.02 / 187.88 |
| after / worker / 0          |                                    7.48 / 15.05 |
| after / worker / 16         |                                    8.02 / 15.49 |
| after / worker / 256        |                                   10.41 / 36.37 |

Lag is per source frame (some overloaded cells group multiple commits), not necessarily one sample per command. Both matrices preserve ordered complete feed positions and the post-load pin corpus; these do not replace P3 crash acceptance.

## Evidence and reproducibility

Durable evidence root:
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round2/`.
`ROUND2-SHA256SUMS` and `ROUND2-INDEX.md` index the retained files, including raw
results, per-attempt source/build preimages and first failures. Every successful
cell copies and hashes the actual broker source, core/broker JS builds, driver,
lockfile and package manifest before running, then verifies they are unchanged.
Reports also record Node version, SQLite native binary hash, fsync calibration,
attempt-specific source directory and scope. No slot identity is claimed offline.

Two initial setup cells are invalid and retained in `matrix-before-setup1.json`:
`r2-before-local-0-65100ab3-63c4-46a2-b104-6bba121c68f4` and
`r2-before-worker-0-2d35fb70-2213-4cea-87d4-def8dc57aef4`. Timers could fire
before their scheduled target because setTimeout truncates fractional delays;
the timeline check caught 170 and 145 negative scheduling intervals. The second
also detected source movement while setup was corrected. The valid rerun waits
until the monotonic target has actually arrived. Neither invalid cell contributes
to the before/after tables. No failure evidence was removed.

Run from this worktree with installed dependencies and at least 5 GiB free:

```sh
node lab/bin/heavy.mjs --label CX-P2B-R2-gates -- node lab/experiments/EXP-P2B/gates.mjs
node lab/bin/heavy.mjs --label CX-P2B-R2-isolated -- node lab/experiments/EXP-P2B/round2/case.mjs --phase after
node lab/bin/heavy.mjs --label CX-P2B-R2-matrix -- node lab/experiments/EXP-P2B/round2/run.mjs after
```

The single-case default is worker/256 readers/200 per band/20 offers per second.
Use `--placement local|worker --readers 0|16|256` for an individual control.
`before` and `after` are run labels; historical before bytes are retained in their
preimages, not reconstructed by relabeling the final driver. The matrix writes
unique attempt directories and a convenience pointer file; use the checksummed
attempt reports when reviewing historical evidence.

## PASS audit

All new observation-to-result paths are enumerated here. None grants contract
acceptance or changes a persisted broker eligibility marker.

- `round2/case.mjs`, concurrent read check and post-load pin check: compare actual
  entity attribute/value pairs against the deterministic writes visible at the
  exact receipt position; at least 600 post-load pin checks per cell. Freshness:
  newly created attempt/scope/directory and this run's receipts. Binding: same
  actual adapter, replica and source, receipt subject/position and saved trace.
  Reader-worker root fallbacks call the real broker; they do not fabricate rows.
- `round2/case.mjs`, feed checks: actual positions must equal all this attempt's
  ACK positions in strict order; every emitted affected entity/attribute/valid
  range/operation is compared to its source command. Replaying the complete feed
  twice must be identical; reopening the durable consumer must recover exactly
  its saved cursor. This checks deterministic replay and checkpoint persistence;
  crash/resume correctness is additionally covered by the existing broker
  regression suite, not inferred from checkpoint equality alone.
- `round2/case.mjs`, timing/sample/source result and exit status: require all 600
  offers accounted, at least 200 observations per band, no content/clock errors,
  exact stage sums, an actual apply event for each frame, nonnegative joined
  source-durable-to-consumer times, and unchanged before/after source/build
  hashes. Events bind command positions and frame LSNs within this attempt;
  source-durable clock values come from that frame's actual SQLite commit.
  Printed summaries and SHA256 files describe these observed bytes; they confer
  no acceptance verdict. Runtime/native hashes are retained for diagnosis, not
  proof of a separately qualified dependency installation.
- `round2/run.mjs`, matrix rows: spawn fresh child attempts and retain exit code
  and raw log alongside child summary. The matrix itself makes no PASS claim;
  review checks child report identity, denominators, source stability and errors,
  not merely child exit zero. All successful cell reports are separately hashed.
- `packages/broker/test/stage-timing.test.ts`: actual fresh SQLite append with
  and without tracing; verify opt-out absence, ordered monotonic boundaries
  bounded by this submit and ACK, command/position binding, actual durable stamp
  identity, CPU field presence, and identical receipt on retry with one frame.
  This is a focused regression, not a live durability acceptance test.
- Existing scoped gates: actual source-bound test assertions (pinned history,
  retractions, overlay/source/replica routes, lost ACK/duplicate recovery and
  feed checkpoint/resume) determine test results. Gate logs are retained; no
  wrapper converts a printed status into semantic promotion.

## Final gates and pin impact

`r2-final-gates-attempt2.log` records successful builds of core, testkit, broker,
QLever and XTDB; declarations and scoped TypeScript checks; **14 broker tests,
48 XTDB driver/route/native/compiler tests and 80 QLever broker regressions**.
Focused lint has zero errors/warnings; formatting, syntax and diff checks pass.
The legacy memory guard was exercised and refused a reader-enabled run with the
expected instruction before creating an attempt or engine resource.

`r2-final-gates-attempt1.log` retains the first new tracing-test failure: the
assertion incorrectly compared the diagnostic callback's `ackAt` across retry.
A retry naturally has a new callback clock. The corrected test compares stable
LSN, epoch, position map and decision stamp, and checks command position arrays
against the receipt map's values. No production behavior was changed to satisfy
that test. Final script comments were annotated with experiment rationale after
the matrices; the retained preimages have the executed script bytes. This final
comment-only edit was syntax/format checked, without rerunning the matrices.

An exact-path search of all `lab/acceptance` files found **no references to any
changed existing path**, and no existing pinned path hash was moved. The broker
package and the experiment files were introduced in round one and are not
contract pins. Acceptance files and contract version remain unchanged. The
source/build preimages and final change manifest distinguish executed bytes
from final reporting/test/comment additions.

## Remaining boundaries

No live XTDB latency or native engine transaction was measured. No exclusive
slot was requested. No engine stalls, scale population, long-run memory bound,
maintenance overlap or full target workload was exercised. Root `pnpm check`,
`pack:check`, full integration/engine conformance and independent verification
remain outstanding. The final lane-Q integration head has not been merged in
this round. Existing round-one live commands remain in `COMMANDS.md`; the
orchestrator owns the later scale window.
