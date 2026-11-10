Hypothesis CONFIRMED. M1 MISSED (helper fill curve decays; commit/read-cost bounds MET) (500k/1k p50 0.499 / 0.705; goodput 1.985 / 1.286); M2 MISSED with original keep-awake (7973 /3858 pulls/s, p99 75.6 /180.3 ms); M3 MISSED (read p99 158.8 /368.4 ms); M4 MISSED (not yet run).

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

All 300 verified differential scenarios passed: 95,028 comparisons,5,664 fast row-closure comparisons, final RNG state -1699957524. Cache stats:15,878 parsed hits,17,102 revision hits,32,980 verifications,zero mismatches. `GATES.json` and durable `integrated-gate-union.json` bind the union to exact source hashes and completed attempts. Base attempt's three old-storage fixture failures remain retained; its package slice passed. Final native-v2 changes only concurrent-initialization and database-lifecycle fixtures to explicit legacy creation, preserving every assertion; all other production source bytes match v1. The added head test checks a historical marker cut and exact bounded AEVT seek. Full lease held715 seconds and cleaned up.

## PASS audit

No benchmark helper promotes acceptance. Load assertions compare actual ACK positions, feed tx IDs/positions, zero decline/fault/full-retry counters, and response-bound measured bytes; all samples and exact scope/input coordinates are retained under a fresh attempt. `native-tests.sh` uses actual Clojure test assertions and nonzero failure exits against the immutable gateway source mounted for that attempt. `parallel-gates.sh` records each process exit separately; its verified differential check reads fresh cache stats from that attempt's gateway and requires verification enabled, positive hits, verified >= hits+revisionHits, zero errors and bounded bytes. Existing B7 cache-check assertion sites are audited in `b7/PASS-AUDIT.md` and `b7/KEY-AUDIT.md`; none is weakened. Cleanup receipts report only observed lifecycle state, have semanticVerdict:null, and bind exact prefix/holder/attempt. `verify-gates.py` is the only new gate-union verdict site: it checks actual assertion counts, complete expected suite summaries, every shard's zero exit, the original contiguous RNG states/draw counts/comparison denominators, fresh cache verification stats and bounded sockets. It binds each attempt to its fresh prefix, four distinct container IDs, the observed gateway manifest hash and immutable source preimages; current production hashes must match those preimages. Its cleanup checks require observed empty resources and a <=900-second lease. The known failed base native slice is never relabelled passing; its expected exit1 is explicit and replaced by the separately successful native-v2 slice. `harness-smoke.mjs` asserts fake-peer schedule/ACK/cut/feed control flow only and prints that it is not a database gate; its fresh local fake inputs never enter correctness or performance denominators. Final report will list paired numbers, missing targets, commands and removals.


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

The committed integration fix is `19f5422d`; its completed gates and measurements stand independently. Step C adds a report-fed revision map and connection-generation binding of cached reach ID/config/session maps. The fresh v6 writer race passed 42,884 independent answer comparisons across 2,400 writes; the complete source-bound v6 gate union passed:53,869 native assertions,179 /177 short tests (2 expected lean skips),9 long tests per layout, and all300 differential scenarios /95,028 comparisons /5,664 fast row closures with verification enabled. GATES.json binds the exact immutable source and fresh attempts. Final paired performance measurements follow this qualification commit. New parsed/revision witnesses share the original 256 MiB budget:
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


The original helper is SCHED_IDLE inside `/user.slice/user-501.slice/session-6.scope`; Retained container cgroup paths show Docker workloads under `/docker`, not system.slice.
The paired frozen256-reader gateway used1.622 /0.879 cores and4916 /4389 pulls/CPU-second. Moving-reader workers were near99%
busy in both arms. A labelled low-weight cgroup variant ran on unchanged 19f5422d gateway bytes: frozen256 rate3708/s, p99171ms; moving rate1587/s, p99948ms, commit p991384ms. It increased observed gateway CPU share without restoring throughput and is rejected. Host inspection later found36GiB RAM and24.1GiB swap in use; that is a contamination concern, not proof of the cause of these losses.
The original results remain preserved, not replaced. First profile JSON exports hit the15-second cap. Raw JFRs are intact; the first
re-export completed one full JSON but failed on an empty-array Bash expansion before the remaining exports. Its cleanup exit0 is
not evidence of export success. The corrected export checks completion and container exits, with full JSON parsing before use.


Step C PASS audit adds `recent/lookup`: verification compares the witness revision with the selected immutable db value; its cut, watermark, transaction, connection floor and generation bind freshness and identity. `recent_test`, lifecycle and hot-pull tests assert content plus explicit current synthetic/report or real connection identities; the hot test forbids per-entity Datomic calls after warming both layouts. `report-revision-race.mjs` compares every recorded answer hash against a separate zero-budget gateway at the exact acknowledged cut, retains both hashes and receipts, and requires 1,200 fresh commits and at least8,000 comparisons per layout. `verify-stepc-gates.py` checks the unchanged original scenario RNG chain and counts, all fresh assertion summaries, zero-cache oracle counters, positive verified recent hits, every transcript hash pair and source-manifest/container/cleanup binding. None of these sites promotes acceptance. The benchmark completion markers are execution markers only and target verdicts require the actual measured numbers. W0's original G0 checks remain unchanged; its runner uses a disclosed lease-loader adaptation bound to the current DX-B8 owner and exact own service URL.
