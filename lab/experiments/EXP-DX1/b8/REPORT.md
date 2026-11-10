Hypothesis CONFIRMED. M1–M4 pending fresh paired measurements; no completed integration verdict yet.

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

All 300 verified differential scenarios passed: 95,028 comparisons,5,664 fast row-closure comparisons, final RNG state -1699957524. Cache stats:15,878 parsed hits,17,102 revision hits,32,980 verifications,zero mismatches. `GATES.json` and durable `integrated-gate-union.json` bind the union to exact source hashes and completed attempts. Base attempt's three old-storage fixture failures remain retained; its package slice passed. Final native-v2 changes only concurrent-initialization and database-lifecycle fixtures to explicit legacy creation, preserving every assertion; all other production source bytes match v1. The added head test checks a historical marker cut and exact bounded AEVT seek. Full lease held716 seconds and cleaned up.

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
