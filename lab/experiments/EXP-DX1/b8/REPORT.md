Hypothesis CONFIRMED. M1 MISSED (helper fill decay; commit p50 500k/1k ratios 0.499 /0.705). M2 MISSED (final no-helper 3568 pulls/s, p99 188.8ms,2128 pulls/CPU-s; helper blocked). M3 MISSED (final no-helper read p99 308.6ms; helper blocked). M4 MISSED (both fingerprints blocked by <5GiB host free disk).

The unchanged implementation slowed from 625 to 59 fill commits/s by 98,500 commits. At heads 1,000 / 50,000 its trace p50 was 8.103 / 10.522 ms, goodput 106.46 / 90.97 commits/s, and read CPU 0.521 / 3.770 ms per pull (7.24 times). A fresh transactor dump shows retraction filtering under the stored function's scope-position lookup. These original observations were without keep-awake; they establish the growing-cost mechanism, not a paired environmental comparison.

DX-B7's four commits are retained in merge `96676785`; WIP checkpoint is `23514af9`. Its cache/notification/admission implementation is integrated. The three formerly shared reads now call version-aware helpers in `storage/begin!`, `storage/await-record-time`, and `main/basis`. `select-db` reads only exact stable eligibility attributes rather than iterating the scope entity. Journal and notification predicates use the shared head helper. Production newest-commit helpers use direct cut transaction metadata then reverse AEVT bounded by that transaction, including `as-of-t` for historical values. This replaces the proposed reverse AVET fallback because AVET cannot seek to a historical entity cut before filtering future commits.

Durable evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B8/`. Raw failures remain; their replacement attempts have fresh names and captured source copies. No acceptance contract was edited.

## Hot-value audit

| Value/read | Existing frequency | Integrated change |
| --- | --- | --- |
| Scope position | Replaced every commit; read in stored function, snapshots, basis, waits, journal and pull header | v2 reads immutable tx/position; v1 stays legacy. Snapshot/basis substitutions are applied to the actual gateway. |
| Scope maximum record time | Replaced as row timestamps advance; stored function plus record-time wait | v2 carries the prefix maximum on every commit transaction, including timestamp-free commits; wait expression uses the same version-aware helper. |
| position-regular | true at creation, false once on irregular positions | Keep sticky proof and exact targeted read. |
| irregular, feed-irregular | sticky false/absent to true | Keep; repeated same-value assertions do not replace values. |
| Scope key/bootstrap/row/feed versions | Written at creation | Keep; stable targeted lookups. |
| Schema/commit-function hash | On installation/change | Keep; infrequent control-plane mutation. |
| Entity revision | Replaced for touched entity | Keep, as required; bounded by that entity's history. |
| select-db full entity iteration | Every pull, merges unrelated hot scope attributes | Replace with four exact attribute reads and shared versioned head helper. |
| journal compatibility checks | Targeted stable version/flag lookups | Keep. |
| feed_live CAS fixture | Legacy manually authored transaction | Keep on explicit legacy arity; new transaction-function commits are v2 only when enabled. |


## Integration gates completed

Integrated-v1 production source: base legacy 23 files /179 tests passed; lean 23 files /177 passed,2 expected LayoutUnsupported skips. The remaining four long files passed all nine tests on each layout, including all 200 reach scenarios, 16 writers ×200 commands, 500 conflicting-row races, four processes ×500 clock-ordered commands and 5,000 cross-peer record-time commits /10,000 answers. Final native-v2: 29 head assertions, 53,715 selftest assertions,85 feed assertions, all zero failures/errors. Typecheck and build passed.

All 300 verified differential scenarios passed: 95,028 comparisons,5,664 fast row-closure comparisons, final RNG state -1699957524. Cache stats:15,878 parsed hits,17,102 revision hits,32,980 verifications,zero mismatches. `GATES-19f5422d.json` and durable `integrated-gate-union.json` bind the union to exact source hashes and completed attempts. Base attempt's three old-storage fixture failures remain retained; its package slice passed. Final native-v2 changes only concurrent-initialization and database-lifecycle fixtures to explicit legacy creation, preserving every assertion; all other production source bytes match v1. The added head test checks a historical marker cut and exact bounded AEVT seek. Full lease held715 seconds and cleaned up.

## PASS audit

No benchmark helper promotes acceptance. Load assertions compare actual ACK positions, feed tx IDs/positions, zero decline/fault/full-retry counters, and response-bound measured bytes; all samples and exact scope/input coordinates are retained under a fresh attempt. `native-tests.sh` uses actual Clojure test assertions and nonzero failure exits against the immutable gateway source mounted for that attempt. `parallel-gates.sh` records each process exit separately; its verified differential check reads fresh cache stats from that attempt's gateway and requires verification enabled, positive hits, verified >= hits+revisionHits, zero errors and bounded bytes. Existing B7 cache-check assertion sites are audited in `b7/PASS-AUDIT.md` and `b7/KEY-AUDIT.md`; none is weakened. Cleanup receipts report only observed lifecycle state, have semanticVerdict:null, and bind exact prefix/holder/attempt. `verify-gates.py` is the original integration gate-union verdict site: it checks actual assertion counts, complete expected suite summaries, every shard's zero exit, the original contiguous RNG states/draw counts/comparison denominators, fresh cache verification stats and bounded sockets. It binds each attempt to its fresh prefix, four distinct container IDs, the observed gateway manifest hash and immutable source preimages; current production hashes must match those preimages. Its cleanup checks require observed empty resources and a <=900-second lease. The known failed base native slice is never relabelled passing; its expected exit1 is explicit and replaced by the separately successful native-v2 slice. `harness-smoke.mjs` asserts fake-peer schedule/ACK/cut/feed control flow only and prints that it is not a database gate; its fresh local fake inputs never enter correctness or performance denominators.


## Compatibility

Scopes with no head-version marker retain scope/position and scope/max-recorded-at semantics and writes. New HTTP-created scopes,
including both physical layouts, receive head-version 2 once at creation; a later schema/function installation never migrates an
existing scope. The legacy direct two-argument factory remains for the explicitly legacy CAS/live-feed fixtures. A v2 transaction
stores its final span position and prefix record-time maximum exactly once on its own transaction entity. Sticky eligibility flags,
entity conflict checks, identity/replay checks, journals and LayoutUnsupported behavior stay in the original atomic transaction.

An upgraded gateway can serve either scope version. An old gateway cannot safely serve a new v2 scope: it would read the stale
initial scope position and an old installed transaction function could replace the serial allocator. Deployment therefore requires
upgrading all gateways before routing new v2 scopes to a mixed fleet; this change does not claim backwards compatibility for old
binaries reading newly versioned scopes. Old scopes are deliberately not silently optimized.


## Step C revision witnesses

The committed integration fix is `19f5422d`; its completed gates and measurements stand independently. Step C adds a report-fed revision map and connection-generation binding of cached reach ID/config/session maps. The fresh v6 writer race passed 42,884 independent answer comparisons across 2,400 writes; the complete source-bound v6 gate union passed:53,869 native assertions,179 /177 short tests (2 expected lean skips),9 long tests per layout, and all300 differential scenarios /95,028 comparisons /5,664 fast row closures with verification enabled. GATES.json binds the exact immutable source and fresh attempts. Qualification commit: `da77a50a3cc45c1bb0993027628f735ef06027f4`. The prior integration fix is `19f5422d`. New parsed/revision witnesses share the original 256 MiB budget:
208 MiB parsed entities,32 MiB unchanged cut memo,16 MiB recent entries and state estimates. No existing assertion was weakened.

The map is per captured connection, with an initial basis floor. Every report updates existing entries for its added revision datoms,
then publishes its watermark while holding all changed entities' stripes, including those with no map entry. Lazy insertion holds
its entity stripe, accepts only a selected cut at/after both the connection floor and current watermark, and cannot overwrite an entry
filled from a later cut. Eviction occurs before taking the insertion stripe to avoid a lock-order cycle with a multi-entity report.
Reports at/below a lazy fill's through-cut do not overwrite that fill. Reconnect gets an empty new map; a historical cut before its
floor cannot seed it. The last subscriber closes its map; deletion/recreation creates a distinct captured connection generation and ID/config/session maps even while an old subscriber remains. The native lifecycle test covers one gateway's recreation; cross-gateway catalog invalidation is not qualified here.

Inductively, an entry describes its entity through at least the applied watermark (or its later fill cut). At selected cut t<=tw,
if its revision datom's transaction te<=t, no row-changing revision could occur in (te,t] without replacing/inhibiting that witness.
B7's KEY-AUDIT establishes every supported row-changing write revises the entity atomically. Thus the parsed (eid,rev) bytes are
exact at t. Consumer lag, missing entries, historical te>t, irregular scopes, retirement markers, overflow and absent/zero revisions
retain the previous exact path. Catch-up is an optimization precondition; no response waits for the cache to catch up. A changed
entity becomes safe only after its selected revision has been parsed and found free of retirement markers. Verification rereads
both the revision and parsed bytes. The independent oracle race uses a separate gateway with all parsed/revision cache budgets zero.

## Before/after head-growth observations on 19f5422d

Numbers are without /with the original eight-worker helper, in separate fresh SQL scopes. No manual index request was issued;
the threshold remained256 MiB. Automatic indexing was not independently counted. Each point has400 trace commands and a64-reader
CPU probe on the same400-subject graph. The initial trace arm is colder than later arms; at50k versus500k, no-helper p50 is3.058
versus3.155 ms (1.032 times). Original-helper fill intervals later fell from about1200/s to578/s; that observation is retained and
is not described as flat fill. No-helper mature fill remained around2100–2200/s. The head-read cost bounds pass at all four heads;
the entire helper-enabled fill curve does not remain flat.

| Source | Keep-awake | Head | Commit p50 ms | p99 ms | Commits/s | Pull CPU ms |
|---|---|---:|---:|---:|---:|---:|
| unchanged | off | 1000 | 8.103 | 24.233 | 106.46 | 0.5207 |
| unchanged | off | 50000 | 10.522 | 19.611 | 90.97 | 3.7701 |
| unchanged | off | 250000 | — | — | — | — |
| unchanged | off | 500000 | — | — | — | — |
| 19f5422d | off | 1000 | 6.320 | 20.207 | 135.52 | 0.1449 |
| 19f5422d | off | 50000 | 3.058 | 11.506 | 271.82 | 0.1220 |
| 19f5422d | off | 250000 | 3.256 | 22.679 | 256.47 | 0.1317 |
| 19f5422d | off | 500000 | 3.155 | 9.565 | 268.95 | 0.1272 |
| 19f5422d | on (original) | 1000 | 11.462 | 31.495 | 78.74 | 0.2080 |
| 19f5422d | on (original) | 50000 | 5.613 | 15.743 | 158.28 | 0.1481 |
| 19f5422d | on (original) | 250000 | 5.648 | 23.095 | 149.98 | 0.1611 |
| 19f5422d | on (original) | 500000 | 8.079 | 27.020 | 101.25 | 0.1826 |


## Frozen and moving measurements

Without /with keep-awake always means the original verified eight-worker helper. Its status had to print `running 8` and
`"onePerCpu": true`; no-helper status had to show zero. Both 19f5422d arms completed. Only the final da77a50a no-helper arm completed:
the next helper arm failed its disk preflight before starting engines, and both W0 arms consequently did not start. No values
are borrowed from an earlier source to fill those missing final cells. Final measured scope head was52,039 physical commits;
no manual index job was requested. All arms used the requested CPU placements, JVM flags, lean layout and256MiB threshold.

| Source | Helper | Readers | Pulls/s | Read p99 ms | Pulls / gateway CPU-second |
|---|---|---:|---:|---:|---:|
| 19f5422d | off | 4 | 6054.52 | 2.65 | 5318.24 |
| 19f5422d | off | 64 | 8848.21 | 20.18 | 5701.92 |
| 19f5422d | off | 256 | 7972.89 | 75.64 | 4916.00 |
| 19f5422d | on | 4 | 3063.86 | 6.98 | 4319.53 |
| 19f5422d | on | 64 | 4034.31 | 47.87 | 4816.74 |
| 19f5422d | on | 256 | 3858.11 | 180.33 | 4388.70 |
| da77a50a | off | 4 | 3190.48 | 5.39 | 2643.17 |
| da77a50a | off | 64 | 3906.56 | 49.11 | 2390.98 |
| da77a50a | off | 256 | 3567.98 | 188.83 | 2128.48 |
| da77a50a | on | 4 /64 /256 | blocked | blocked | blocked |

| Source | Helper | Moving pulls/s | Read p99 ms | Quiet commit p99 ms | Loaded commit p99 ms | Ratio | Feed lag p99 ms |
|---|---|---:|---:|---:|---:|---:|---:|
| 19f5422d | off | 5108.63 | 158.78 | 48.06 | 26.05 | 0.542 | 17.87 |
| 19f5422d | on | 2097.05 | 368.45 | 34.92 | 57.44 | 1.645 | 30.92 |
| da77a50a | off | 2657.63 | 308.56 | 1755.82 | 76.62 | 0.044 | 20.48 |
| da77a50a | on | blocked | blocked | blocked | blocked | blocked | blocked |

Each writer arm has917 acknowledged commands, a seeded Poisson offer at15/s, and readers pin the greatest acknowledged receipt
before each pull. The final quiet baseline's1.756-second tail makes its favorable commit ratio weak evidence; both actual values
are shown. Final loaded read gateway CPU was91.943s over60s (~1.53 cores); driver CPU was231.459s (~3.86 cores across four).
Worker event-loop utilization alone is not proof of CPU saturation. These temporally separated attempts do not isolate all host
conditions: later inspection showed36GiB physical RAM and24.1GiB swap in use. The final version is not claimed faster than19f5422d.

M1 is measured on19f5422d, not rerun after the revision-map change. Its numeric head-cost bounds pass but its helper fill curve
decays, so the whole M1 target is marked missed. The unchanged baseline was measured before the paired-helper rule and stopped
at98,553 commits;250k/500k and helper baseline cells are unavailable. No1,000,000-commit experiment was run.

## Profiles and remaining bottleneck

[PROFILES.md](PROFILES.md) contains the requested top15 leaf frames **with the first captured gateway caller** for M2 and M3,
for both19f5422d helper states and the completed final no-helper arm. Raw JFRs, actual30-frame `jfr print` text and complete128-frame
JSON supplements remain in durable evidence. Phase UTC boundaries select samples; missing gateway callers are counted, never guessed.

Final frozen256:1,423 samples,150 without a gateway caller,zero truncated stacks;83 Datomic leaf samples (5.83%). Final moving:
2,606 samples,315 without a gateway caller,zero truncated stacks;145 Datomic leaves (5.56%). Leading final moving leaves are
PersistentArrayMap.indexOf→reach/read-entity296, Util.equals→entity-cache/lookup208, ConcurrentHashMap.get→entity-cache/lookup96,
and AbstractStringBuilder.append→reach/append-string68. Datomic samples remain mainly in exact header reads and guarded revision
fallbacks; the old retraction walk is no longer the dominant leaf. This identifies the next CPU work but does not meet the read bars.

The frozen cut predates the read connection's floor, so its recent-map hits/reports are zero and its existing cut memo has zero
revision misses. That is an intentional historical fallback, not a consumer failure. The independent fresh writer race proves
remote commit report handling:498,577 verified recent hits and1,137,254 total fresh checks,zero errors after both layouts. The hot
native test forbids entity EAVT and lookup-ref calls after warming; all response bytes still match. Ordinary pull headers and cache
misses still call Datomic; the guarantee is zero **per-entity** calls for eligible warmed current witnesses, not zero calls per HTTP request.

The helper runs in `/user.slice/user-501.slice/session-6.scope`; Docker workloads are under `/docker`. A labelled low-weight helper
control on unchanged19f5422d gateway bytes yielded3708 frozen pulls/s,p99171ms and1587 moving pulls/s,p99948ms, with loaded commit
p991384ms. Gateway CPU share increased without throughput recovery. It is rejected and is not substituted for the original helper.

## Commands, evidence and limits

All engine/gate/measurement jobs used `node lab/bin/heavy.mjs --label DX-B8-<attempt> -- ...`, own `tx2-dxb8-*` identities and
`DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock`. The runner captures exact source/build preimages, image/container IDs,
CPU/memory settings, raw requests/ACKs, selected cuts, profiles and lifecycle receipts. No download, push, main merge or acceptance edit.

```sh
# Exact final gate bodies, each admitted through gate-window.sh / race-window.sh and heavy.mjs:
B8_GATEWAY_SRC="$evidence/step-c-v6/gateway" bash lab/experiments/EXP-DX1/b8/gate-window.sh tx2-dxb8-stepc-v6-full bash lab/experiments/EXP-DX1/b8/parallel-gates.sh tx2-dxb8-stepc-v6-full full
B8_RECENT_TESTS=1 B8_CACHE_VERIFY=true B8_GATEWAY_SRC="$evidence/step-c-v6/gateway" bash lab/experiments/EXP-DX1/b8/gate-window.sh tx2-dxb8-stepc-v6-shortdiff bash lab/experiments/EXP-DX1/b8/short-diff-gates.sh tx2-dxb8-stepc-v6-shortdiff
B8_CACHE_VERIFY=true B8_GATEWAY_SRC="$evidence/step-c-v6/gateway" bash lab/experiments/EXP-DX1/b8/race-window.sh tx2-dxb8-stepc-v6-race bash lab/experiments/EXP-DX1/b8/race-gates.sh tx2-dxb8-stepc-v6-race
python3 lab/experiments/EXP-DX1/b8/verify-stepc-gates.py
# Paired final driver command; first arm completed, second refused low disk:
B8_KEEP_AWAKE=0 B8_PROFILE=1 B8_GATEWAY_SRC="$evidence/step-c-v6/gateway" B8_DRIVER_ENV='B7_PHASES=[["random",4],["random",64],["random",256]] B7_WORKERS=4 B7_MIXED=1' bash lab/experiments/EXP-DX1/b8/measure-window.sh tx2-dxb8-final-v6-noawake node --experimental-strip-types lab/experiments/EXP-DX1/b8/load.mjs
# Same command with B8_KEEP_AWAKE=1 / prefix tx2-dxb8-final-v6-awake was blocked.
# Prepared W0 command (not executed):
node --experimental-strip-types lab/experiments/EXP-DX1/h5/observe.mjs --world w0 --lane datomic --composition reach --output runs/DX-H5-vm/receipt.json --rung 1000 --scope dxb8-w0-v6-noawake --g0-only
```

Here `$evidence` is `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B8`. `after-qualification.sh` records the complete heavy
invocations and their labels; the committed final admission guard now checks disk before launching each wrapper as well as inside
the window. The failed helper attempt reached only the inner preflight, held its lock0 seconds and started no engines. No substantive
heavy workload ran below the threshold. Resource maintenance (verified lossless compression, checksum inventory and volume removal)
remained bounded and created no engine. Host free space remained about3.4GiB after cleanup, below5GiB; unrelated data was untouched.
The W0 reference `sha256:ca15387e66e25ed5e19a4adc602e941f7f06dd8b0f1c6ca7d1a5d2f02f8171ad` is **not freshly verified**.

Key durable paths: `before-c-checkpoint.json`, `before-analysis.json`, `before-thread-dump-1.log`; `state-after-noawake-a.json`,
`state-after-awake-a.json`; `integrated-gate-union.json`; `stepc-v6-gate-union.json`; `tx2-dxb8-stepc-v6-{full,shortdiff,race}-*`;
`tx2-dxb8-final-v6-noawake-1794328871/`; `final-v6-analysis.json`; `profile-{noawake,awake}-complete.json`,
`profile-final-v6-noawake.json`, `profile-final-v6-datomic-counts.json`; `DISK-BLOCK.json`; `final-cleanup.json`.
[The evidence index](EVIDENCE.md) and [SHA256SUMS](SHA256SUMS) bind the retained files. Raw profile JSON is losslessly gzip-compressed;
`profile-compression*.json` records original byte hashes and round-trip verification. Raw JFRs are also retained. Failed/time-limited
exports and superseded attempts remain evidence; the first export's misleading cleanup exit0 is not an export-success verdict.

`SOURCE-HASHES.json` lists17 changed package paths against53fcf4f289b257a7c26a630a3c6b447ff926b516 with every old/new SHA256.
No changed path or old digest has an explicit reference in `lab/acceptance/`; **pinned paths moved: none found**. Contract unchanged.
Only old-storage fixtures changed: concurrent-init and database-lifecycle explicitly create legacy scopes; feed_live explicitly uses
its legacy CAS scope. Every behavioral assertion remains. B7's own retained fixture adjustments are described in its report.

The retained `tx2-dxb8-before-a-pg-data` volume was removed in final cleanup. All other attempted PG/driver/tools volumes were removed
by their bounded-window cleanup; exact per-attempt names are in receipts and logs. Final inventories show zero owned containers,
networks and volumes. No shared resident or unrelated resource was touched. Open work: a fresh final helper arm and both W0 arms
when disk admission recovers; controlled follow-up on map/key/hash/string response CPU and host scheduling, without claiming this
run meets M2/M3. No additional implementation or performance promotion is inferred from passing correctness tests.

## Additional PASS audit

Step C PASS audit adds `recent/lookup`: verification compares the witness revision with the selected immutable db value; its cut, watermark, transaction, connection floor and generation bind freshness and identity. `recent_test`, lifecycle and hot-pull tests assert content plus explicit current synthetic/report or real connection identities; the hot test forbids per-entity Datomic calls after warming both layouts. `report-revision-race.mjs` compares every recorded answer hash against a separate zero-budget gateway at the exact acknowledged cut, retains both hashes and receipts, and requires 1,200 fresh commits and at least8,000 comparisons per layout. `verify-stepc-gates.py` checks the unchanged original scenario RNG chain and counts, all fresh assertion summaries, zero-cache oracle counters, positive verified recent hits, every transcript hash pair and source-manifest/container/cleanup binding. None of these sites promotes acceptance. The benchmark completion markers are execution markers only and target verdicts require the actual measured numbers. W0's original G0 checks remain unchanged; its runner uses a disclosed lease-loader adaptation bound to the current DX-B8 owner and exact own service URL.

`index-evidence.py` binds checksums to exact durable relative paths, reads current bytes in bounded chunks and rejects a changing inode/size/mtime; it produces no semantic verdict. `source-hashes.py` binds old bytes to the named Git baseline and new bytes to the current file. Profile analysis binds event timestamps to actual phase intervals and attributes only captured callers. Compression receipts compare the decompressed stream SHA256 to the original before removing the uncompressed copy. These maintenance checks have content/freshness/path binding; none substitutes for an answer or fingerprint gate.
