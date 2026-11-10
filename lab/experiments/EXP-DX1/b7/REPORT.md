O1 MISSED: 986 pulls/s, p99 516 ms; O2 MISSED: 64-reader p99 130 ms, 256 goodput below 64; O3 MISSED: 676 pulls/s; O4 MISSED: 824 pulls/gateway CPU-second; O5 MISSED: read p99 870 ms, feed p99 26.8 ms, commit ratio 2.33; O6 MET: feed p99 16.8 / 13.6 ms; O7 MISSED: final legacy 21/21 and Clojure 53,800 assertions passed; final lean / 300-case differential unexecuted at budget.

# DX-B7 read gateway

Implemented steps 1–4. The throughput objective was not achieved. Notification delivery meets O6 in this sample, and mixed feed
lag meets O5's feed sub-bar, but mixed read latency and writer isolation miss. These are developer diagnostics, not acceptance
promotion. No target or contract was changed.

Evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B7/`. All raw samples, JFRs, source/build preimages, seed
requests/ACKs, container identities, CPU caps, logs, failed attempts and cleanup observations are retained there.

## Measurement conditions and limits

VM-local network, 2,000 representative subjects, lean layout. Postgres CPU 0; transactor CPUs 0–1; write gateway CPU 1; read gateway
CPUs 2–3; driver CPUs 4–7. Read/write gateway flags: `-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g`.
Transactor `-Xms1g -Xmx3g`, object cache 1g, memory-index threshold 256m/max 1g. Read gateway also records JFR, settings=profile.
All pulls use the seed's frozen recorded-at basis; valid-at is the current wall clock over open-ended seeded intervals.

Earlier baseline/steps 1–3 had **no keep-awake**. The orchestrator published VM wake instructions at 12:22 UTC and removed an
unrelated QLever health-check container then. Final step 4 uses eight verified SCHED_IDLE workers, one per CPU. These environmental
changes prevent attributing before/after differences solely to code. Final gateway CPU usage was only about 1.2 of its two assigned
cores; the effect of the wake helper's scheduling/cgroup placement remains an untested hypothesis, not an established cause.

The upstream helper's start command self-matched its SSH ancestor. The local corrected copy constructs the marker indirectly and
checks actual scheduler policy/affinity; sudo monitor processes are excluded. Its start output says 16 matching processes, while
its policy check correctly finds eight actual workers. The earlier `step4-legacy-a` keep-awake receipt was a false positive and is
not valid environment evidence. That attempt's completed content tests remain usable. `step4-lean-a` stopped at helper preflight
before creating an engine. Both failures are retained. Final `step4-pull-c` has verified pre/post worker inventories and zero workers
after stop; its engine lease lasted 416 seconds and cleaned up completely.

The first baseline JFR was empty because PID 1's shell did not forward TERM to Java. The second baseline is the unchanged gateway,
with a usable JFR. Harness-only edits during its startup leave partial harness-byte binding; both captures are retained. Its gateway
bytes were unchanged and staged before execution. Initial baseline/step 1/2 results did not retain the exact frozen R/t; these are
partial-input diagnostic comparators. Step 3 onward preserves seed JSON requests, ACK coordinates and an ACK-matched frozen basis.

Final workers were increased from three to four as a labelled driver variant. Their event-loop utilisation stayed below 0.27 in
all frozen arms and below 0.15 under mixed load. There is no evidence of a saturated driver. No measurement is reported as a
client-limited gateway maximum. All frozen phases last 30 seconds; mixed phases last 60 seconds. Sequential step 4 warms a complete
2,000-subject cycle per worker first and then measures two HTTP calls per pull (ordinary need repair, no full retries).

## Changes and measurements

1. `7dd9877f`: fair CPU admission, default available processors / `TX2_READ_PERMITS`; a separate one-permit journal/feed class.
   Long-poll, position, record-time and sync waits hold no permit. Jetty's 512-thread ceiling remains. Clojure fixtures were brought
   up to current commit/init arities and layouts; unexpected fixture reads still throw. The feed helper gained a proper entrypoint.
2. `73b9f41a`: atomically replace session generations on reset rather than clearing a live map. A builder retains its generation;
   an AtomicInteger reservation bounds concurrent new entries. There is no response-wide session lock. Old maps remain intact for
   in-flight responses. Reference-before-inline races retain the client's existing `need` repair. No wire format change is needed:
   stale references still name the exact immutable revision, and each reset response is full.
3. `a3a49968`: byte-estimated, insertion-order parsed-entity cache; no global lock on a hit. It caches immutable row texts, reference
   intervals and already-escaped inline JSON. Valid-time filtering remains per request. Captured connection/configuration generations
   prevent a late insertion from a deleted database poisoning its replacement. Admin scan stats expose hits/misses/evictions/bytes.
4. `8a70c528` (unpromoted prototype): one permanent daemon report-queue consumer per connection, broadcast notification waits with arm-before-read and
   deadline predicate checks. Journal long-polls and freshness waits use it; the bounded 2-second sync fallback is retained. Submit
   predecessor waits use the existing notifyAll with deadline waits. No `Thread/sleep 1` remains. Because step 3's profile still ranked
   Datomic index iteration highest, an additional exact-selected-physical-cut revision memo shares the same 256 MiB estimated budget
   (32 MiB revision memo, 224 MiB parsed entities). This is labelled as part of step 4; its isolated effect is not measured.

The table below includes the requested O1 observation after each step and the diagnostic 4/64/sequential arms. Costs count the
complete SDK pull, including ordinary repair requests. CPU is actual read-gateway cgroup usage. No rates are adjusted for unused cores.

| Step | Pattern / readers | Pulls/s | p50 ms | p99 ms | Gateway cores | Pulls/CPU-second | Worker utilisation | Keep-awake |
|---|---|---:|---:|---:|---:|---:|---|---|
| 0 unchanged | random-4 | 2149.17 | 1.446 | 6.181 | 1.857 | 1157.29 | 0.445, 0.255, 0.240 | no |
| 0 unchanged | random-256 | 2225.59 | 75.311 | 515.239 | 1.969 | 1130.34 | 0.334, 0.337, 0.340 | no |
| 1 admission | random-4 | 2132.31 | 1.488 | 5.903 | 1.824 | 1169.26 | 0.413, 0.233, 0.230 | no |
| 1 admission | random-64 | 2094.82 | 23.854 | 54.177 | 1.863 | 1124.41 | 0.308, 0.289, 0.290 | no |
| 1 admission | random-256 | 1997.66 | 99.869 | 214.434 | 1.869 | 1068.82 | 0.309, 0.302, 0.300 | no |
| 2 session | random-4 | 1777.61 | 1.763 | 7.036 | 1.849 | 961.23 | 0.355, 0.201, 0.188 | no |
| 2 session | random-64 | 1776.91 | 27.986 | 62.352 | 1.871 | 949.74 | 0.258, 0.250, 0.235 | no |
| 2 session | random-256 | 1686.27 | 118.516 | 257.540 | 1.881 | 896.49 | 0.259, 0.256, 0.255 | no |
| 3 parsed cache | random-4 | 1931.93 | 1.544 | 6.727 | 1.808 | 1068.79 | 0.423, 0.238, 0.232 | no |
| 3 parsed cache | random-64 | 1321.79 | 33.918 | 188.021 | 1.689 | 782.52 | 0.337, 0.292, 0.322 | no |
| 3 parsed cache | random-256 | 1566.49 | 125.372 | 338.814 | 1.675 | 934.99 | 0.288, 0.288, 0.285 | no |
| 3 parsed cache | sequential-256 | 1124.97 | 231.921 | 283.120 | 1.694 | 664.10 | 0.334, 0.333, 0.336 | no |
| 4 notification + cut memo | random-4 | 1115.00 | 2.590 | 14.852 | 1.190 | 937.17 | 0.185, 0.200, 0.190, 0.190 | yes |
| 4 notification + cut memo | random-64 | 1020.13 | 50.925 | 130.001 | 1.169 | 872.33 | 0.208, 0.203, 0.208, 0.219 | yes |
| 4 notification + cut memo | random-256 | 985.93 | 207.721 | 515.986 | 1.197 | 823.90 | 0.210, 0.211, 0.209, 0.206 | yes |
| 4 notification + cut memo | sequential-256 | 676.13 | 372.173 | 488.051 | 1.191 | 567.52 | 0.255, 0.266, 0.261, 0.270 | yes |

## Writer and feed results

The quiet and loaded Poisson arms offer the identical independent arrival schedule and fact-count/subject distribution; both
prefetch the same 400 subjects' exact precondition rows. Every observed commit used one HTTP call. ACK-to-feed lag is signed: delivery
may precede ACK. Raw tx IDs, positions and timestamps bind each lag sample; no unmatched sample is included.

| Arm (60 s each) | Commits | Commit p50 / p99 ms | Feed p50 / p99 ms | Maximum feed ms | Read pulls/s / p99 ms |
|---|---:|---:|---:|---:|---:|
| sparse | 60 | 17.121 / 61.448 | 3.078 / 16.799 | 16.799 | — |
| quietPoisson | 917 | 12.388 / 46.731 | 2.599 / 13.608 | 28.543 | — |
| readPoisson | 917 | 14.759 / 108.928 | 5.024 / 26.778 | 138.741 | 606.7 / 870.183 |

O5 loaded commit p99 / quiet Poisson commit p99 = 2.331, exceeding 1.25. O6 passed at both requested rates. The former 2-second
feed outliers did not reproduce; maximum observed delivery lag was 138.742 ms under load, 28.543 ms without readers. The 2-second
sync fallback remains in code, but this experiment does not establish it caused the historical outliers.

## Before and after profiles

Raw JFRs and full event JSON are retained. `profile.py` counts observed leaf frames and also emits inclusive top-25 frames,
monitor-enter milliseconds by class, GCPhasePause durations and all JavaThreadStatistics observations. Monitor durations are summed
across threads, not wall time; short events below the JFR profile threshold are not included. Phase slices use recorded UTC timestamps.

### Before (unchanged code)

Whole recording: 188 GC pauses / 805.221 ms. Maximum sampled active threads: 302; peakCount: 302. Recording durations differ (the after recording includes writer/feed phases), so whole-recording totals are not a normalized comparison.

**random-4:** 3616 execution samples; GC 73 pauses / 222.934 ms; maximum sampled active threads 56. Monitor-enter: `org/eclipse/jetty/util/thread/strategy/EatWhatYouKill` 11.638 ms.

| Leaf frame | Samples |
|---|---:|
| `datomic/common$compare.invokeStatic` | 590 |
| `datomic/iter$take_while$reify__9261.next` | 518 |
| `clojure/lang/Util.equiv` | 479 |
| `datomic/btset/BTSetIter.next` | 315 |
| `datomic/iter$inext.invokeStatic` | 222 |
| `clojure/lang/Numbers$LongOps.combine` | 185 |
| `datomic/db$filter_retractions$skip__10247.invoke` | 151 |
| `clojure/lang/RT.aget` | 115 |
| `datomic/iter$take_while$reify__9261.get` | 104 |
| `clojure/lang/Numbers$DoubleOps.combine` | 93 |
| `datomic/db$filter_retractions$eat_past__10241.invoke` | 84 |
| `datomic/btset/BTSetIter$fn__9311.invoke` | 63 |
| `java/lang/String.checkIndex` | 61 |
| `datomic/btset/BTSetBranch.compare` | 54 |
| `clojure/lang/PersistentArrayMap.indexOf` | 29 |
| `triplex/gateway/reach$read_entity.invokeStatic` | 27 |
| `java/lang/AbstractStringBuilder.append` | 23 |
| `java/util/concurrent/ConcurrentHashMap.get` | 22 |
| `clojure/lang/RT.nthFrom` | 19 |
| `datomic/index$reify__13665.compare` | 18 |
| `java/util/regex/Pattern.lambda$union$3` | 17 |
| `clojure/lang/RT.get` | 16 |
| `java/util/HashMap.putVal` | 15 |
| `datomic/db$filter_retractions.invokeStatic` | 15 |
| `triplex/gateway/reach$append_string_BANG_.invokeStatic` | 14 |
**random-256:** 1605 execution samples; GC 77 pauses / 318.704 ms; maximum sampled active threads 302. Monitor-enter: `java/util/concurrent/ConcurrentHashMap` 1008745.038 ms; `org/eclipse/jetty/util/thread/strategy/EatWhatYouKill` 5323.276 ms; `java/util/LinkedHashMap` 2037.862 ms; `java/lang/Object` 422.761 ms.

| Leaf frame | Samples |
|---|---:|
| `datomic/common$compare.invokeStatic` | 276 |
| `datomic/iter$take_while$reify__9261.next` | 207 |
| `clojure/lang/Util.equiv` | 199 |
| `datomic/btset/BTSetIter.next` | 129 |
| `datomic/iter$inext.invokeStatic` | 96 |
| `clojure/lang/Numbers$LongOps.combine` | 65 |
| `clojure/lang/RT.aget` | 63 |
| `datomic/db$filter_retractions$skip__10247.invoke` | 56 |
| `datomic/iter$take_while$reify__9261.get` | 54 |
| `clojure/lang/Numbers$DoubleOps.combine` | 42 |
| `datomic/db$filter_retractions$eat_past__10241.invoke` | 39 |
| `java/lang/String.checkIndex` | 35 |
| `datomic/btset/BTSetIter$fn__9311.invoke` | 26 |
| `triplex/gateway/reach$append_string_BANG_.invokeStatic` | 19 |
| `datomic/btset/BTSetBranch.compare` | 18 |
| `clojure/lang/RT.nthFrom` | 17 |
| `java/lang/AbstractStringBuilder.append` | 15 |
| `triplex/gateway/reach$read_entity.invokeStatic` | 13 |
| `clojure/lang/KeywordLookupSite$1.get` | 12 |
| `clojure/lang/PersistentArrayMap.indexOf` | 12 |
| `clojure/lang/RT.get` | 12 |
| `datomic/index$reify__13665.search` | 10 |
| `java/util/concurrent/ConcurrentHashMap.get` | 9 |
| `datomic/index$reify__13665.compare` | 9 |
| `triplex/gateway/reach$response.invokeStatic` | 8 |
### After (step 4)

Whole recording: 191 GC pauses / 1861.486 ms. Maximum sampled active threads: 302; peakCount: 302. Recording durations differ (the after recording includes writer/feed phases), so whole-recording totals are not a normalized comparison.

**random-4:** 2786 execution samples; GC 24 pauses / 234.817 ms; maximum sampled active threads 57. Monitor-enter: `org/eclipse/jetty/util/thread/strategy/EatWhatYouKill` 35.404 ms.

| Leaf frame | Samples |
|---|---:|
| `clojure/lang/Numbers.ops` | 1030 |
| `clojure/lang/Numbers$DoubleOps.combine` | 370 |
| `datomic/iter$take_while$reify__9261.get` | 324 |
| `datomic/db$filter_retractions$eat_past__10241.invoke` | 271 |
| `clojure/lang/RT.aget` | 211 |
| `datomic/btset/BTSetIter.next` | 66 |
| `datomic/db$filter_retractions$skip__10247.invoke` | 42 |
| `clojure/lang/Util.equals` | 36 |
| `datomic/btset/BTSetIter$fn__9311.invoke` | 33 |
| `datomic/common$compare.invokeStatic` | 30 |
| `java/lang/String.equals` | 25 |
| `java/util/concurrent/ConcurrentHashMap.get` | 18 |
| `java/lang/AbstractStringBuilder.append` | 17 |
| `clojure/lang/PersistentArrayMap.indexOf` | 17 |
| `java/util/HashMap.putVal` | 16 |
| `triplex/gateway/reach$build_response.invokeStatic` | 13 |
| `java/util/concurrent/atomic/LongAdder.add` | 11 |
| `java/util/regex/Pattern.lambda$union$3` | 11 |
| `triplex/gateway/reach$append_string_BANG_.invokeStatic` | 10 |
| `datomic/iter$inext.invokeStatic` | 9 |
| `java/util/regex/Pattern$BmpCharPropertyGreedy.match` | 6 |
| `clojure/lang/RT.count` | 6 |
| `java/util/regex/Pattern$GroupTail.match` | 5 |
| `org/eclipse/jetty/http/HttpGenerator.generateHeaders` | 5 |
| `java/util/HashMap.resize` | 5 |
**random-256:** 2325 execution samples; GC 22 pauses / 162.503 ms; maximum sampled active threads 296. Monitor-enter: `org/eclipse/jetty/util/thread/strategy/EatWhatYouKill` 136.109 ms.

| Leaf frame | Samples |
|---|---:|
| `clojure/lang/Numbers.ops` | 864 |
| `datomic/iter$take_while$reify__9261.get` | 282 |
| `clojure/lang/Numbers$DoubleOps.combine` | 278 |
| `datomic/db$filter_retractions$eat_past__10241.invoke` | 217 |
| `clojure/lang/RT.aget` | 188 |
| `datomic/btset/BTSetIter.next` | 57 |
| `datomic/db$filter_retractions$skip__10247.invoke` | 47 |
| `datomic/common$compare.invokeStatic` | 28 |
| `clojure/lang/Util.equals` | 26 |
| `datomic/btset/BTSetIter$fn__9311.invoke` | 24 |
| `java/util/concurrent/ConcurrentHashMap.get` | 20 |
| `triplex/gateway/reach$build_response.invokeStatic` | 14 |
| `java/lang/String.equals` | 14 |
| `java/util/concurrent/atomic/LongAdder.add` | 13 |
| `triplex/gateway/reach$append_string_BANG_.invokeStatic` | 13 |
| `clojure/lang/PersistentArrayMap.indexOf` | 12 |
| `java/util/HashMap.putVal` | 10 |
| `java/lang/AbstractStringBuilder.append` | 9 |
| `datomic/iter$inext.invokeStatic` | 9 |
| `clojure/lang/Util.equiv` | 7 |
| `clojure/lang/RT.count` | 7 |
| `java/util/regex/Pattern$BmpCharPropertyGreedy.match` | 6 |
| `java/lang/String.valueOf` | 6 |
| `java/util/regex/Pattern.lambda$union$3` | 6 |
| `clojure/lang/PersistentVector.arrayFor` | 5 |

The after random-256 top is `Numbers.ops` (864), followed by Datomic `take_while.get` (282), `DoubleOps.combine` (278),
`filter_retractions.eat_past` (217), and `RT.aget` (188). Both entity and revision caches have zero misses during the timed frozen
phases, yet Datomic work remains dominant. The profile therefore does not justify step 5's escaping/parser/output changes.

The next change I would investigate is caching the immutable scope headers and selected database cut, and measuring the freshness/
cut-selection index reads separately. The stack examples identify Datomic internals but do not reliably retain their gateway caller;
this is a hypothesis to isolate, not a proven attribution. A deeper/caller-specific profile and an isolated wake-helper scheduling
control should precede another throughput claim. The requested 5,000/s objective remains unachieved. The mixed probe retained monotonic ACK/delivery timelines but omitted UTC
phase boundaries, so exact O5-only profile attribution was not completed; the complete after JFR includes that arm.

## Revision-key proof and exactness gates

See [KEY-AUDIT.md](KEY-AUDIT.md) and [PASS-AUDIT.md](PASS-AUDIT.md) for the full write-boundary and assertion-site audit.

- `storage.clj:110–111` decodes every compact or raw SPI input row before fresh/old splitting.
- `storage.clj:169–205` derives canonical/overflow rows, lean born-retired markers, ordinary retractions and imported retirement
  metadata from that collection; `storage.clj:206` revises every distinct affected entity, independent of layout and origin.
- `storage.clj:213–217` passes the complete operations to the transaction function. `commit.clj:23–26` allocates the final head;
  `commit.clj:37–48` recursively remaps the position marker, including entity revisions; `commit.clj:49–75` expands lean operations
  atomically; `commit.clj:84–93` publishes prepared operations with the final position. Nested logical journals share that final
  physical revision. Arbitrary direct Datomic writes outside the gateway are not supported by this proof.
- `reach/select-db` selects an immutable cut. Parsed keys are database / captured connection generation / config generation / eid /
  revision. The extra revision memo is keyed by **the exact selected physical t returned by select-db**, including historical cuts;
  it does not use the unfiltered basis-t of an as-of value. Valid-time filtering occurs after lookup from the same cached intervals.
- Verification rereads revision datoms on revision-memo hits and rebuilds rows/retirement datoms/JSON on parsed-cache hits. Exact
  strings and raw floating-point interval bits are compared. Duplicate insertions also compare. A mismatch increments the error
  counter before throwing. Negative fixtures deliberately mutate a same-revision row set on both layouts and require detection.
  Other fixtures cover oversize bypass, byte accounting, eviction, detached cut views and late old-connection insertion.

Step 1 and step 2 completed both 21-test native suites and all 300 differential scenarios. Step 3 did the same with cache verification
enabled (15,878 hits, at least 15,878 fresh comparisons, zero verification errors). All differential runs use the unchanged test's
existing three adjoining 100-case ranges, preserving the full original RNG stream: 121 draws/scenario, 95,028 comparisons, 5,664 fast
row-closure comparisons, final RNG state -1699957524. This is the full denominator, not a sampled subset. A transparent host proxy
limits physical sockets to 32 per gateway / 64 total while preserving the native logical 256-reader race.

Final legacy: all six named native files, 21 tests passed. Final Clojure selftest: 14 tests, 53,715 assertions passed, including the
20 × 256 forced-reset race (5,120 completed exact responses). Feed helper: 13 tests, 85 assertions passed. Final lean and the full
verifier-enabled differential were not executed: the full job queued for 28 minutes, with the lean lease unadmitted for 15 minutes,
while another owner repeatedly acquired the shared lock. I cancelled only my queued engine-free jobs after the approximate task
budget. There is no final step-4 gate union or O7 PASS. Every frozen and mixed load worker asserts zero declines, faults and full
retries; those assertions passed. Ordinary `need` repairs remain observable and are not counted as full retries.

## Commands and retained evidence

Run from this worktree. Dependency installation was offline:

```sh
pnpm install --offline --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store
```

Every engine attempt used `node lab/bin/heavy.mjs --label DX-B7-... -- bash <immutable-runner-copy> <fresh-prefix> <command>`.
`gates.sh` takes the canonical shared measurement lock, checks free disk, captures source/build bytes, starts the exact split-peer
stack through `stack/up.sh`, runs VM-local commands through `stack/run-in-vm.sh`, and removes owned resources before releasing.
The full options are in each retained runner and `stack.json`; no default Docker endpoint or remote dependency fallback is used.

Final performance command (runner copied before admission):

```sh
B7_CLOJURE_GATES=1 \
B7_DRIVER_ENV='B7_PHASES=[["random",4],["random",64],["random",256],["sequential",256]] B7_WORKERS=4 B7_MIXED=1' \
node lab/bin/heavy.mjs --label DX-B7-step4-pull-c -- \
  bash /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B7/step4-pull-c-runner.sh \
  tx2-dxb7-step4-pull-c node --experimental-strip-types lab/experiments/EXP-DX1/b7/pull-load.mjs
```

Full step 2/3 gates: `run-step-gates.sh step2 a` and `B7_DIFF_VERIFY=true run-step-gates.sh step3 a`, each under `heavy.mjs`.
Final legacy used the legacy arm of `run-step-gates.sh step4 a`. Remaining work can resume with a fresh attempt:

```sh
node lab/bin/heavy.mjs --label DX-B7-resume-c -- bash lab/experiments/EXP-DX1/b7/finish-gates.sh c
python3 lab/experiments/EXP-DX1/b7/verify-final.py c
```

That runs final lean and all 300 verified differential cases in separate leases, then validates the union. These commands have **not**
completed in this run. Test sources were not weakened or edited. The helper fixture changes are explained
in the step-1 audit and commit.

Profile extraction:

```sh
python3 lab/experiments/EXP-DX1/b7/profile.py <prefix-profile.json> <prefix/driver/pull-load.json>
```

Raw JFR extraction is in `gates.sh`: Java 21 `jfr print --json` for ExecutionSample, GCPhasePause, GarbageCollection,
JavaMonitorEnter and JavaThreadStatistics, in an owned temporary container from the already-local image. No download.

Evidence index: [EVIDENCE.md](EVIDENCE.md); checksums: [SHA256SUMS](SHA256SUMS). The index covers 16,516 retained files /
1,615,860,269 bytes through 312 root entries and nested manifests. An optional independent checksum recheck was cancelled before
admission at close; the generated manifests remain available for the reviewer to verify. Important attempt prefixes:
`tx2-dxb7-baseline-b`, `tx2-dxb7-step1-pull-a`, `tx2-dxb7-step2-pull-a`, `tx2-dxb7-step3-pull-a`, `tx2-dxb7-step4-pull-c`.
Each has source/build CAPTURE.json, stack identities/cgroups, driver raw files, JFR/events/summary and cleanup receipts. Earlier gate-union
JSONs separately retain successful layout slices and contiguous scenario ranges; no final step-4 union is claimed. Early timeouts, stale-fixture failures, empty JFR,
helper preflight failures and explicitly cancelled queued probes remain; no failed whole attempt was relabelled successful.

## Pins, omissions and handoff

`lab/acceptance/` is unchanged. No changed package file is explicitly listed in the checked-in acceptance pins (recursive path
search); [SOURCE-HASHES.json](SOURCE-HASHES.json) nevertheless lists all ten changed/new package paths with old and new SHA-256,
against base `2870c42b`, for the contract owner. No publication anchor or historical receipt was retroactively changed.

The recreation regression covers late parsed-cache insertion; it does not qualify a full live delete/recreate race across the
pre-existing global ID/config caches. No root `pnpm check` or tarball gate was run for this private gateway-only change.

No acceptance promotion, north-star rerun, 10m-entity scale run, external-service suite, publication, merge or push was performed.
Step 5 was not implemented because the second profile does not rank those mechanisms highest. Estimated cache accounting is not
an exact retained-heap proof. The final performance misses remain open; notification sample success does not close broader goals.
Wall time exceeded the approximate three-hour task budget, substantially through waiting for shared engine/measurement access and
retaining complete correctness gates rather than reducing the denominator.
