# DX-B6 — package correctness, bounded caches and sparse-write attribution

North star: P1 exact pinned reads and scalable pulls, P2 sparse commits, P3 exact
journal pages and P4 current-value fast paths with bounded client caches. Authority: `lab/SCOPE.md`,
`lab/NORTH-STAR.md`, `lab/TARGETS.md`; protocol 0b. No acceptance promotion,
contract edit, merge, push or release is claimed.

**Final result: the package correctness gates pass; performance gaps remain.**
Findings 2–5 have implemented fixes and passing scoped gates. Finding 1 has
complete client/adapter attribution and a measured cache-admission fix, but the
8/30 ms sparse-write target remains unmet and the actual gateway socket-flush
timestamp is absent. Finding 2 removes full retries in the measured workloads;
the 256-reader goodput/read-p99 bars remain unmet. This is a developer test
result, not north-star acceptance or independent promotion.

| Finding | Before | Observed after | Scope / remaining gap |
| --- | --- | --- | --- |
| 1 | Early sparse p50 30–33 ms; seed probe two HTTP calls | One HTTP call; warm 1/s p50/p99 24.913/37.328 ms; Poisson 17.054/46.839 ms | Target 8/30 ms unmet; actual gateway socket-flush timestamp absent |
| 2 | Historical 2.7% full retries at 64 readers | Zero full retries in 10,240 fresh-session concurrent pulls across both layouts | VM goodput/p99 bars remain unmet; no matched pre-fix VM load arm |
| 3 | Up to 500,000 decoded entities per client | Default 128/32 MiB estimated entity/row budgets; 1 MiB native gates pass | Estimated retained bytes, not whole-process RSS or historical 4 GB OOM reproduction |
| 5 | Historical six stale and four split failures / 729,761 reads | Zero incorrect answers / 40,000 immediate row/reach reads, including Java pauses | Targeted peer test; no complete north-star rerun |
| 4 | Two known failing tests | Both pass on both layouts | Full final package counts below; intentional lean skips stay explicit |

The before column combines the supplied historical observations with the named
B6 diagnostic baseline; these are not statistically matched workload arms.

## Finding 1 — measured, one package cause fixed; latency target remains unmet

The original VM probe reproduced the distinction: 2,000 back-to-back commits
were p50 4.780 / p99 15.272 ms, while one per second was 26.902 / 67.956 ms. Cold
sparse commits immediately after seeding took 30.039 / 50.452 ms and made two
HTTP calls. The first 120 subjects' preconditions had been displaced by journal
bodies in the bounded row cache. Skipping immutable journal bodies in that cache
keeps all 400 seeded stamps: 24,793,988 estimated bytes, 22,865 entries, zero
evictions and zero missing stamps. All subsequent measured commits use one HTTP
call. A cache miss still takes a real snapshot; exactness is not inferred from a
cache hit.

`DatomicClient.onCommit` is off by default. It now reports operation/transaction
identities, HTTP calls, replays and per-attempt optimistic/begin flags,
staging/order timestamps and attributed request observations. Observation scope
is captured synchronously before async transport yields; the reversed-response
and conflict-response tests exercise this attribution. HTTP observations include
actual socket finish, response headers, parsed response, byte counts, socket
reuse and gateway preparation/predecessor/submission/future completion. The
adapter return and the probe's public receipt return are distinct timestamps.
Gateway `responsePrepared` is **not** a socket-flush completion timestamp; actual
gateway response-flush completion was not instrumented.

All performance runs use built packages, fresh lean scopes, the driver's
`buildTraceCommand`, 400 seeded subjects, the requested Postgres/transactor/
write-peer/read-peer topology and CPU assignment, 1 GiB object caches, the
256m/1g index settings, transactor Xms1g/Xmx3g and gateway Xms1g/Xmx2g/G1/25 ms
settings. Engine CPUs are 0–3 and driver CPUs 4–7. `stack.json`, source captures
and VM driver container/cgroup manifests retain the actual identities and caps.

Final VM attempt: `tx2-dxb6-lone-d`. Latency below is command construction plus
public `Triples.transact` through receipt return, excluding offered-time delay:

| Case | Commands | p50 ms | p99 ms | HTTP p50/p99 | Clock replays |
| --- | ---: | ---: | ---: | --- | ---: |
| Immediately after seed, 1/s, no warm-up | 120 | 34.349 | 71.444 | 1 / 1 | 0 |
| Back-to-back | 2,000 | 4.696 | 15.942 | 1 / 1 | 0 |
| 1/s after the saturated phase | 120 | 24.913 | 37.328 | 1 / 1 | 0 |
| Independent Poisson 15/s for 60 s | 917 | 17.054 | 46.839 | 1 / 1 | 0 |

The final Poisson runner offers independently of completion and preserves
per-subject predecessor order. Its offered-time p50/p99 is 21.702/55.440 ms;
the 1/s phase is 31.843/46.172 ms. Median offer delays are 3.917 and 7.279 ms.
Earlier b/c probes paced one writer; b offered 900 Poisson intervals over
57.728 s and c 931 over 59.847 s. Those are retained diagnostics, not a matched
open-loop before/after comparison. The cold wall median did not improve despite
removing the snapshot; do not turn the RPC reduction into an unsupported latency
claim. No A/A calibration or randomized arm order was run.

Final component medians, ms:

| Component | Cold 1/s | Back-to-back | Warm 1/s | Open Poisson |
| --- | ---: | ---: | ---: | ---: |
| Offer to adapter | 9.238 | 0.074 | 7.847 | 4.249 |
| Adapter staging | 4.255 | 0.368 | 3.450 | 1.381 |
| Client order queue | 0.038 | 0.003 | 0.030 | 0.017 |
| Encode and socket finish | 3.066 | 0.333 | 2.579 | 1.184 |
| Socket finish to response headers | 25.535 | 3.680 | 16.915 | 13.453 |
| Headers to adapter return | 0.595 | 0.110 | 0.414 | 0.255 |
| Gateway payload preparation | 2.761 | 0.285 | 1.384 | 0.917 |
| Gateway predecessor wait | 0.028 | 0.004 | 0.016 | 0.015 |
| Native future completion after submission | 17.592 | 2.747 | 12.576 | 10.177 |

The gateway components are a subdivision, not additional client wall time.
Coverage is calculated per observation before summarizing, not by summing
percentiles. Median coverage is 99.86–99.93%; every slow-case observation covers
at least 99.19% of its wall time. All 1/s sockets were reused. Poisson reused
912/917 sockets; its five fresh sockets occurred under overlapping arrivals.
Neither reconnects nor either ordering queue explains the sparse-write cost.
The remaining observed native/transactor/messaging component alone has median
12.576 ms at 1/s and 10.177 ms at open Poisson 15/s. These are measured components,
not a proof of a universal engine lower bound. I did not remove them, and the
requested 8/30 ms target is **unmet**. Durability settings were not weakened and
no warming writes or background traffic were added.

## Finding 2 — missing references repair at the exact basis

Previously the first missing entity caused another entire `full: true` pull.
The client now snapshots older in-flight ingestion signals, decodes its inline
entities, releases its own ingestion signal, waits for those older signals and
rechecks the cache. Waiting for ingestion rather than complete pulls prevents
cyclic repair waits. Remaining misses request only `need` entities at the chosen
position, record time and valid time. The gateway does no reference traversal for
`need` and returns the requested entities inline. The client checks exact
position, t, IDs, revisions, coverage and row bindings. Only a failed repair can
trigger a full retry. Diagnostics distinguish ref misses, waits, wait hits, need
requests/entities and full retries.

Controlled response-order tests verify no extra HTTP call when an older inline
response repairs the race, exact missing-ID requests, and a true full fallback
when repair bytes carry another revision. Native `reach.test.ts` repeats 256
concurrent logical pulls on one client for 20 fresh sessions and compares every
answer with the portable fallback. The Mac transport cap is 64 sockets; the VM
performance probe has all 256 readers inside the VM.

Both final-source native reach runs pass three cases each. Per layout, 6,600
generated comparisons include 6,100 accepted fast reads and 30,500 complete
answer comparisons. Expected declines remain explicit (400 interior-position,
100 irregular). The 20 x 256 race gate completes 5,120 concurrent pulls with
zero full retries: legacy observes eight concurrent missing-reference races,
lean eleven; neither resets its session.

Read measurements: three worker threads, 2,000 subjects, 30 seconds per level,
64 and 256 closed-loop readers, frozen receipt basis, no concurrent writer trace.
Sequential access deliberately exceeds cache residence; seeded random is a
separate diagnostic. Every recorded answer uses the package path; faults,
declines and full retries are asserted zero. These are not full NS-P1 runs.

| Access / readers | Pulls/s | p50 / p99 ms | Requests/pull | Bytes/pull | Read-peer CPU cores |
| --- | ---: | ---: | ---: | ---: | ---: |
| Sequential / 64 | 1,349.05 | 44.10 / 124.06 | 2.000 | 12,313.52 | 1.980 |
| Sequential / 256 | 1,316.14 | 171.85 / 591.44 | 2.000 | 12,316.13 | 1.921 |
| Seeded random / 64 | 2,111.86 | 23.73 / 119.78 | 1.3094 | 6,297.18 | 1.977 |
| Seeded random / 256 | 2,100.03 | 85.86 / 526.40 | 1.3066 | 6,290.11 | 1.977 |

The 256/64 goodput ratios are 0.976 sequential and 0.994 random. The full-retry
path is eliminated in these samples, but neither the nondecreasing-goodput bar
nor the 100 ms read-p99 bar passes. No matched pre-fix load run was performed;
the supplied 2.7% full-retry observation is historical context only. This
protocol fix does not claim P1 acceptance.

## Finding 3 — byte budgets, LRU and cheap eviction misses

One client now shares estimated-byte LRUs across all its scopes: default entity
128 MiB (134,217,728 bytes), row 32 MiB (33,554,432 bytes). Options are
`makeDatomicRuntime({ entityCacheBytes, rowCacheBytes, ... })` or the fourth
`DatomicClient` constructor argument. Accounting uses UTF-16 row text/columns and
an allowance for decoded entities and object slots. Oversize entries are not
cached; updates, reads, deletions and evictions maintain the linked LRU and byte
counter without scanning deleted Map slots. `bytes`, `peakBytes` and `evictions`
are exposed. Closing a client clears its caches.

Eviction preserves the session and uses `need`; rotating it would resend shared
unchanged graphs. A bare reference is accepted only if the client still holds
the exact revision. Unit tests cover LRU promotion, updates, oversize entries and
a 1 MiB budget over a larger world. The native fixture uses 128 entities with
eight 2 KiB rows each, over 2 MiB of value text, rather than legacy overflow rows.
Every answer is compared with the portable row reader under 1 MiB budgets.

The native budget case passes on both layouts: 256 answers per layout equal
the fallback, with 128 entity repairs and zero full retries, faults or declines.
Final entity bytes are 1,022,670 and row bytes 1,047,716, each below the
1,048,576-byte budget; the test checks the bounds after every answer. This bounds the
retained estimate, not process RSS. The exact historical 4 GB driver OOM was not
rerun; VM probes use a 5 GiB driver cap. No whole-process memory qualification is
claimed.

## Finding 5 — unique receipt instants and second-peer freshness

The two authorized core edits add only optional
`StorageAdapterService.transactionInstant(now)` and use it in `TriplesLive`
transact. Absent hooks retain the original wall-clock timestamp. Datomic issues
`max(now, lastIssued + 1)` per scope across clients in one process and registers
its first ordering ticket before yielding. Nested public transactions call the
hook once each and retain their issued values. The transaction function rejects
any replay-safe timestamp at or below the scope maximum, returns that maximum,
and the adapter advances its process clock before replay. The old 50 ms catch-up
loop is removed. Raw/import SPI semantics are not rewritten.

Multi-instant nested physical transactions retain the conservative irregular
record-time-cut guard: a physical as-of cut cannot represent their interior
logical times. The position-indexed immutable journal has a separate proof and
can still be read exactly; feed-irregular guards remain. New tests cover a sole
interior journal followed by an unjournaled physical tail and compare all cursor
positions with the portable feed. An explicit journal basis now selects its cut
after waiting, so later journals do not leak into an earlier receipt time.

Read, reach/reach-many and record-time journal requests consult the scope's
maximum. When R is ahead, they poll the peer every 1 ms up to basisWaitMs (50 ms
default), then invoke bounded 2-second d/sync once. Requests with both pins wait
for position first. Held transaction snapshots retain their fixed semantics.
Scan stats count `recordTimeWaits` and `recordTimeSyncs`.

`peer-c.log`: 5,000 commits per layout with normal peer delivery and another
5,000 with actual Java pauses. Every commit is checked through both row and
reach routes, alternating the first route, using a separate client and R only,
no position or basisT. All **40,000 answers for 20,000 commits are correct**.

| Layout / delivery | Commits | Answers | Record-time waits | Syncs | Java pauses |
| --- | ---: | ---: | ---: | ---: | ---: |
| Legacy / normal | 5,000 | 10,000 | 29 | 0 | 0 |
| Legacy / paused | 5,000 | 10,000 | 137 | 0 | 179 |
| Lean / normal | 5,000 | 10,000 | 3 | 0 | 0 |
| Lean / paused | 5,000 | 10,000 | 103 | 0 | 168 |

The pauser discovers Java via /proc and logs PID 10, then runs STOP/sleep 0.03/
CONT inside the owned gateway container. An earlier diagnostic signalled PID 1,
the launcher; it does not qualify forced Java lag. All original observations are
retained. Zero syncs in the 30 ms pause test is expected under a 50 ms local
wait; future-record-time differential/reach fixtures exercise the sync path.

Final-source legacy and lean windows each pass all five concurrency/clock
cases. Each layout completes 3,200 commands from 16 clients and 2,000 from four
processes. Actual clock replays are respectively 11 / 917 for legacy and
52 / 942 for lean; declines are empty and ordering regressions zero. The old
case title says “no conflicts/replays”; the assertions and printed counters,
not that inherited title, describe the actual successful replay behavior.
Receipt instants are asserted distinct and strictly increasing by actual commit
position; every receipt-time fast read equals the fallback and is accepted, so
no irregular scope is silently adopted. Clock replays are reported, not hidden.

## Finding 4 — declared value domain and journal decoding

The negative-zero test predated domain enforcement. Initial adapter integration
`fc07dc3bab98197dcdce92a30994fd59d5b230d8` had that test;
`811a42a8` introduced explicit adapter value admission, and
`d1c6f5648efb2639aab6777cd82e9351811a8ff4` adds the
`CX-A01-0314-R3` enforcement at `packValue`. The declared Datomic domain sets
`negativeZero: false`. I kept typed rejection, verified no stored row, and
retained both signed int64 boundary round trips and noncanonical/out-of-range
integer rejections. Production value encoding did not change and the test was
not deleted.

Journal pages now select raw rows with `entity_type === "_Transaction"` before
constructing branded transaction fields. The original untyped SPI `tx_id: "spi"`
neighbor is ignored correctly on both layouts. The differential's former
error-parity witness now requires the actual valid journal bytes and excludes
the untyped row. Position feed eligibility is independent of record-time-cut
eligibility, and resume filtering applies to every logical journal, including a
single interior one. Typed malformed journals and modified-journal decline
rules are preserved.

Final package ledger (`SUITE-COVERAGE.json`), counting distinct test cases:

| Layout | Datomic passed | Datomic skipped | Datomic failures | Touched core cases passed |
| --- | ---: | ---: | ---: | ---: |
| Legacy | 189 | 0 | 0 | 6 |
| Lean | 187 | 2 | 0 | 6 |

The six core cases are distinct and run on both layouts. The two existing lean
skips are native-query read-pin tests (optional pulls and rule rounds), not the
two regressions fixed here. The broad source-bound `suite-e` covers 178/176
Datomic passes plus six core passes per layout; the isolated heavy windows add
five concurrency/clock, three reach, one peer and two paired-layout differential
cases. Repeated shards/phases are not additional unique cases. Runtime changes
are at `ac0fe9cee69f3d5655794ceb9aec647256fccec5`; corpus batching is at
`21107f5f`. Each attempt retains its actual source bytes and observed Git base.

## Verification, retained failures and resources

Durable evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B6/`.
Bulky raw output and copied source/build preimages remain outside git. The VM
launcher initially writes `evidence/DX-H3/PREFIX/`; exact copies, including driver
container/cgroup identity, are retained under the B6 attempt and `vm-launch/`.
Every code/build preimage is indexed in its attempt's `CAPTURE.json`. Its head is
the observed Git base; copied bytes, including working-tree changes, are the
source authority. No later Git commit is represented as original execution proof.

- Offline install: pinned pnpm 10.11, frozen/offline shared store, 605 reused
  packages, **zero downloads**. No lockfile/dependency edit.
- Datomic/core builds pass. Other-adapter typechecks: **11 Turbo tasks pass**.
- Final source lint: zero warnings/errors. Focused telemetry/transport tests:
  **98 pass**. Final offline broad run: **150 pass,
  45 native skips**, 195 total cases in 29 files after building W0 prerequisites.
- `SOURCE-AUDIT.json` verifies each selected capture's bytes against its original
  index. It also verifies 19 staged gateway files against captured source and
  the stack hash, both peer health hashes, and all four inspected container
  identities/CPU sets/memory caps/read-only source mounts. `suite-e-test-source`
  matches all 694 package/core source, build and test
  entries in the final tree. B concurrent/reach windows match runtime JavaScript,
  package source and gateway; regenerated core declaration/map files differ.
  `lone-d` additionally predates the differential batching-only test change.
  `peer-c` predates the telemetry changes and journal follow-ups; its storage
  freshness barrier, read/reach routes, transaction functions and core runtime
  bytes match. The changed client/adapter paths and journal file are explicitly
  listed, rather than labelling that entire attempt the final revision.
- Production source lint has zero warnings/errors. An isolated lint of the
  changed differential test reports one inherited useless string-escape warning
  and zero errors; formatting passes.
- Terminal audit exits zero. It verifies all three successful differential
  ranges, RNG continuity and independently recomputed xorshift states; all ten
  selected source captures/stack bindings; 23 empty retained cleanup inventories;
  and an empty final B6 container/volume/network inventory.
- Evidence readback: **15,145 files, 168,061,218 bytes**, every retained file
  re-hashed against `SHA256SUMS.full`. Its SHA-256 is
  `1a936b0bd491e3ffe714160e2f8f3d4ddc89c24607ef2d7b563bfe8291eb4c58`.
  VM b/c/d raw arrays are byte-identical to their original inherited-launcher
  outputs. The committed `EVIDENCE.json` and small `SHA256SUMS` index the durable
  full manifest and principal logs; raw oracle output/preimages stay outside git.
  The accidentally default-located generated oracle directory was relocated,
  without discarding it, into `evidence/DX-B6/generated-oracle/`.

Executed orchestration entry points are below. These scripts contain historical
attempt names: use new IDs and immutable copies rather than overwriting their
existing logs/captures. Every engine command must retain the heavy wrapper and
shared measurement lock:

```sh
node lab/bin/heavy.mjs --label DX-B6-native -- bash lab/experiments/EXP-DX1/b6/final-confirmation.sh
node lab/bin/heavy.mjs --label DX-B6-differential-batches -- bash lab/experiments/EXP-DX1/b6/differential-batches.sh
B6_HOST_GATES=1 node lab/bin/heavy.mjs --label DX-B6-peer -- bash lab/experiments/EXP-DX1/b6/gates.sh tx2-dxb6-peer-new bash lab/experiments/EXP-DX1/b6/peer-gates.sh tx2-dxb6-peer-new
B6_HOST_GATES=1 B6_CAPTURE_TAG=suite-new node lab/bin/heavy.mjs --label DX-B6-suite -- bash lab/experiments/EXP-DX1/b6/gates.sh tx2-dxb6-suite-new bash lab/experiments/EXP-DX1/b6/suite.sh
B6_PREBUILD=1 node lab/bin/heavy.mjs --label DX-B6-write-probe -- bash lab/experiments/EXP-DX1/b6/gates.sh tx2-dxb6-lone-new node lab/experiments/EXP-DX1/b6/lone-commit.mjs
```

The confirmation script retains its historical oversized tail for inspection;
run its concurrency/reach selections in individual windows and use the separate
bounded differential batches. Never edit a dispatched shell script. The VM
write probe chains the read probe and retains both raw arrays. Native scripts
explicitly select the B5 workspace-alias config and do not use Linux Vitest.

Retained first failures: Linux Vitest cannot load the Mac-only cached Rolldown
binding, so correctness uses the Mac runner and performance remains inside the
VM; initial combined native run exceeded its window and later tests hit removed
endpoints; a queued mutable shell script was edited and resumed at an old byte
offset; a broad title regex unintentionally selected the long differential;
missing W0 dist prevented initial collection; the first byte-budget fixture hit
legacy's deliberate row overflow; nested increasing instants exposed the feed's
shared timestamp guard; the unpartitioned 300-scenario differential timed out
(exit 124). None is adopted as a pass. The final ledger qualifies the final source; it does
not assert that every intermediate commit passed the complete native suite.
Subsequent attempts use new identities,
immutable runner copies, explicit file selection and bounded child groups.

The 300-scenario differential is partitioned into 0–99, 100–199 and 200–299,
advancing the original RNG by its exact 121 draws per prior scenario. Every
scenario asserts that draw count, and each batch reports input/final RNG state;
this preserves the monolithic corpus. All batches pass: **95,028 comparisons,
5,664 accepted fast answers and 5,664 matching row closures**. Independent Python
recomputation verifies all 36,300 draws and the adjacent boundary states:

| Scenarios | Input RNG state | Final RNG state | Comparisons | Fast / row closures |
| --- | ---: | ---: | ---: | ---: |
| 0–99 | 428278297 | -711779450 | 31,660 | 1,880 / 1,880 |
| 100–199 | -711779450 | 1425974214 | 31,684 | 1,892 / 1,892 |
| 200–299 | 1425974214 | -1699957524 | 31,684 | 1,892 / 1,892 |

The three-window root controller exits zero; each child window independently
exits zero and cleans its stack.
The confirmation controller completed all four individually successful native
windows, then failed at its unused tail with exit 127 (`t.ts: command not found`)
because that queued controller had been edited at an old shell byte offset.
Its root exit is not a pass. A separate attempted handoff watcher exited 1 after
the controller had already ended and killed nothing. The immutable per-window
runner copies and individual exit-zero files establish those four executions.
The replacement bounded batches retain all 300 cases.

Each owned stack is created only under the shared lock, uses no forbidden port,
and is removed with its driver, network and volumes before release. Cleanup
requires empty inventory and the matching owner. Final live inventory is empty
for all B6 containers, volumes and networks; all 23 retained cleanup inventories
are empty. The newer explicit duration receipts record 419 and 423 seconds for
the last two differential windows, both including startup/cleanup. Earlier
windows retain the 870-second watchdog/bounded child runner and cleanup files,
not an exact end-to-end hold-duration receipt. I do not invent those timings. Shared residents, foreign locks/containers, default
Docker context, original ZIP and the other Triplex checkout were untouched.

## Observation-to-verdict audit

No acceptance PASS/receipt generator or scorecard promotion is introduced.
Developer-verdict sites and their content/freshness/binding checks are:

1. `CommitOrder.test.ts`: actual fresh clock values, strict increase, immediate
   conflict catch-up and scope separation; pure fixture with no native slot claim.
2. `reach-repair.test.ts`: controlled new inline/reference bytes, exact missing
   IDs/basis, revision rejection and actual request counts on a fresh client.
3. `byte-cache.test.ts`, existing `RowCache.test.ts`: actual retained accounting,
   LRU updates/turnover and complete decoded content over a new generated world;
   they assert estimates, not RSS.
4. Native `cache-budget.test.ts`: fresh UUID scope in the captured owned stack,
   complete raw-row equality with the fallback, budgets after every answer,
   actual need/eviction counters and zero full retries.
5. Native `reach.test.ts`: actual ordered content and closures against fallback
   at every generated basis, plus 20 x 256 new-session races. Declines, faults and
   full retries stay distinct; no queued work is treated as a completed answer.
6. Native concurrency/clock tests: actual receipts/positions, strict global
   uniqueness within the scope, exact receipt-time content and nonzero accepted
   fast-path denominators; fresh clients/processes/scopes and captured slot.
7. `record-time-peer.test.ts` and pauser: actual current-attempt writes and both
   read routes at receipt R, expected strings, distinct ordered instants, actual
   Java PID and pause counts, source-bound owned two-peer stack and counter deltas.
8. Journal/adapter/differential tests: complete portable equality, typed domain
   errors, stored-row absence, exact int64 text, untyped-neighbor filtering,
   interior resume/earlier-cut witnesses, original RNG continuation and fresh
   paired scopes. A generic transport failure cannot satisfy a content witness.
9. `commit-observation.test.ts`: fresh loopback server, reversed actual response
   order and a specific conflict reply; expected operation identities, statuses,
   call counts and monotonic transport timestamps. No native semantics claimed.
10. `lone-commit.mjs`/`pull-load.mjs`: actual public operations, receipt-to-observation
    identity checks, independent offers, raw arrays, measured cgroup CPU and fixed
    basis; current copied source/build/driver/stack identity. Summaries are
    diagnostic; they do not emit semantic acceptance.
11. Window/controller helpers: child exit and actual cleanup inventories/owner
    identity establish execution/cleanup only. Timeout/cancelled windows remain
    explicit. They cannot substitute for the underlying content assertions.
12. Analysis/hash/evidence helpers and this report: derive from retained bytes,
    preserve denominators, read back hashes and label incomplete/failed attempts.
    They establish integrity, not query correctness or acceptance.

## Pins, scope and remaining work

`lab/acceptance/` is unchanged. `HASH-CHANGES.json` conservatively lists every
modified package/authorized stack path with baseline/current SHA-256, against
`66c40d5b5cd723da48ffd344ac6644bd00ed0fae`. The final direct-path/old-hash scan finds zero references among 28 changed
package/helper paths. This is a conservative full change inventory, not proof
that indirect collection pins are unaffected; every old/new hash is retained for
the contract builder. No acceptance file was edited or re-pinned.
The core seam is the expressly authorized optional member and its timestamp use.
The only out-of-ownership exception is the expressly authorized prefix regex in
`stack/run-in-vm.sh`, committed separately. No `lab/bench/` edit, generated dist
commit, merge, push, deployment or publication.

The sparse 8/30 ms target and read p99 bar remain open. I did not rerun the full
NS report, split-read workload, real 4 GB OOM case, year-one scale, crash recovery,
PII erasure, root `pnpm check`, packed consumer or PostgreSQL integration suite.
Other adapters were typechecked and the touched core cases run; this is not a
release qualification. A public-core Changeset is left to the integration/release
owner because the task restricts authored paths to the package, B6, and the optional
core member. Gateway response-flush completion is not instrumented. Independent
review and contract re-pinning remain with the orchestrator.
