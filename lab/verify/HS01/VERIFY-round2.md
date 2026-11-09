# CX-VHS01: EXP-HS01 round 2 offline review

**Verdict: FIX-FIRST.** The round 1 oversized-frame finding is closed, and the W0 size result is independently confirmed. One new compatibility regression remains: a finite numeric `purgeFrames` request silently keeps every frame. This finding concerns the worker RPC's expressly retained numeric form; the public `HostLog` frame/byte options work in the tested cases. No product code was changed by this review.

Reviewed head `a9ebe759dbbd448220c9f3688788f2ae4b86f7c3`; product `dfddd916d7aaaf99ad78158073156f051f1dad93`; final builder tests `535459e2` (following `e81c16df`). I read round 2 of REPORT.md, R2-PREDICTIONS.md and evidence-r2.json and inspected the product diff. My unpublished review branch was rebased onto the requested head; the old review remains a separate historical document. All package bytes executed here match `dfddd916`. No main-branch merge or push occurred.

North star: P1/P2 exact-cut and recovery correctness, P3 resumable retention, and P4/P5 storage cost. Goals and targets come only from [SCOPE](../../SCOPE.md), [NORTH-STAR](../../NORTH-STAR.md) and [TARGETS](../../TARGETS.md).

## Finding R2-1 — P2: numeric purge compatibility disables finite retention

Location: [sqlite-worker.ts:225](../../../packages/qlever/src/broker/sqlite-worker.ts#L225), together with the byte-floor check at line 234. REPORT.md line 171 explicitly promises that a bare number still means a frame count.

`typeof a === 'number' ? {frames:a, bytes:Infinity} : a` assigns an infinite byte minimum to legacy requests. The loop then immediately stops because every finite `marker.size - f.end` is less than Infinity. Thus `purgeFrames(2)` removes nothing even when there are no holders and the protected ACKED/last frame is far beyond the eligible prefix. Older direct worker callers silently lose finite retention and can accumulate unbounded frames.

Reproduction: [round2/review.test.ts](round2/review.test.ts), test **"legacy numeric purge request still means a frame count"**. Append twelve 100-byte payload frames, acknowledge frame 12, request numeric `2`, then request `{frames:2,bytes:0}` against that same store. Actual observations:

| Request              | Removed frames | Anchor | Removed bytes |
| -------------------- | -------------: | -----: | ------------: |
| `2`                  |              0 |      0 |             0 |
| `{frames:2,bytes:0}` |             10 |     10 |         1,360 |

The equality assertion fails on the frozen round 2 product, in two separate fresh attempts. Raw observations are retained in `independent-r2-788d079b-d29b-455c-8ea3-f8937ef6d0ab/numeric-compatibility.json`. This is not an assertion failure in the public normalized options path and is not a recurrence of the oversized-frame bug.

Proposed fix: normalize a bare number as a frame-only policy with a zero byte minimum, matching `HostLog.open({frameRetention:{tailFrames:n}})`. Retain the default keep-all behavior. Add numeric 0/1/2/Infinity comparisons against the corresponding normalized policies, with holders and ACKED protection. Do not change the byte policy or introduce a write cap. The product was left unchanged for the builder.

## Checks requested in the brief

**1. Oversized-frame progress: verified fixed.** My independent negative control loads the round 1 worker and codec directly from Git `13ce4978`, constructs a real twenty-value commit group above 16 MiB, and compares its behavior with the round 2 worker. Old anchor: 1, with the large frame at LSN 2 stuck. New anchor: 11 after the same ten following small frames. The new calls assert that work is at most 16 MiB or exactly one frame. The builder's regression is also present and passes in my fresh run. No frame-format or admission cap changed.

The complete fresh HS01 suite passed the boundary cases at 16 MiB - 1, exactly 16 MiB, +1, +36 and 17 MiB, counting headers/trailers. It also actually used the full **256 MiB payload** limit (`full:true`): frame size 268,435,492 bytes, one purge call 84.70 ms, subsequent reopen 491.57 ms on this shared host. These are diagnostics, not latency acceptance. The source takes the first eligible frame, then stops before exceeding the normal budget with later frames. The claimed 16 MiB plus one-frame bound holds; the former strict 16 MiB bound is explicitly superseded.

**2. Frame/byte minima and recovery frontiers: verified for normalized policies.** An independent suffix oracle evaluates unequal frame sizes, byte-only and combined minima, zero minima, a slow holder, and an ACKED frame behind the unacknowledged head. The holder bounds the anchor at 5; after its release ACKED frame 10 bounds the anchor at 9. A fresh worker test uses mixed ids through 63-head saturation, retires each previous assertion, pins basis 2048, and advances byte retention beyond the old commits. The old pin still returns exactly the original assertion after snapshot retirement masking; the latest cut returns exactly the replacement. Both remain exact after reopen, and every id lookup still returns the expected full row. First retained predecessor CRC/offset match the persisted anchor. A below-anchor feed cursor refuses with `FeedRetentionExpired`; no shortened feed is accepted. The legacy numeric exception is R2-1 above.

**3. Id encoding: no collision or lookup drift found.** The independent corpus contains **100,202 inputs / 99,538 unique ids**, generated separately from the builder's corpus. It includes low/high canonical ULIDs; structured heads and widths; tails around 2^43; numeric-looking, punctuation and arbitrary UTF-16 strings; paired and lone surrogates; and an explicit 64th distinct head. Through real SQLite storage, every unique input decodes exactly and every lookup returns its original UTF-16 bytes. All lookups are repeated after saturation. Observed classes: 19,745 INTEGER, 35,642 BLOB and 44,151 TEXT; exactly 63 head slots; head 64 falls back to TEXT. A second actual-worker test checks reads before allocation (including negative head lookups), after saturation, after retractions, and after reopen.

The integer construction is injective while slots are immutable: the low six bits select one head/width, with slots 1 to 63; the quotient selects the exact base-36 tail. Its maximum is below 2^49 and is exactly representable when read as a JS number. Exhaustion never frees/reassigns a slot. The encoded storage classes separate integer, canonical 16-byte BLOB and odd-length UTF-16 escape BLOB from TEXT. The integer form is attempted before the canonical-ULID fallback, as the report states; some overlapping low ULIDs can therefore use integers without changing their logical id.

Physical `ORDER BY id` order changes with these storage classes. The independent sorted scan still contains precisely the original logical-id set. Inspection found no host-store range predicate or pagination cursor over encoded row ids: selections use equality, while frame pages order by unchanged LSN. `BrokerStorageAdapter.ts` still orders decoded output by recorded time and logical string id at its read boundary (line 405). No physical id ordering is exposed as a new public keyset. Native engine pagination was not rerun offline. A fresh round 1-layout store refuses through `HostLog.open` with **BrokerLogError**, naming layout v2 round 1, and the refused store does not acquire an `hds` table.

**4. G9 size: W0 PASS confirmed; production-shaped miss remains a miss.** I independently read both complete gzip intent logs, checked the uncompressed intent digests, dense command references and command ids, and counted the submitted operations: **434,768 commands, 4,468,284 assertions, 1,954 retractions in each profile**. Each receipt's returned assertion count also matches its command. Journal rows are excluded from this denominator.

The compressed W0 database, its original-hash record, and the compressed position map are already included in the builder's seal; there is no missing-original-path gap in the 9,420-entry manifest. I restored the W0 database into my own durable directory and verified SHA256 `18ea45f7166907c224c7256b0130b34034e51aa71712ff1159735ba2ac8b3b4d` against the sealed original-hash record. The ULID database remains at its original path, hash `352d601a358d3a5744919151f7173a3ea7db0cc17c0fac1f000a1f5a3ad4171d`, matching its seal. Both databases were queried using immutable read-only SQLite URIs, avoiding changes to the builder's WAL/SHM files.

| Actual retained database          | W0 deterministic ids | ULID-shaped diagnostic |
| --------------------------------- | -------------------: | ---------------------: |
| User assertions                   |            4,468,284 |              4,468,284 |
| Live facts / history              |    4,466,330 / 1,954 |      4,466,330 / 1,954 |
| Journal rows                      |            8,100,092 |              8,100,092 |
| Row id storage                    |          All INTEGER |               All BLOB |
| Head slots used                   |    1 (`000SQKS9/18`) |                      0 |
| Retained frames / bytes           |     110 / 67,969,168 |       110 / 67,969,168 |
| `page_count × page_size`          |      **969,883,648** |      **1,376,653,312** |
| B per submitted assertion         |       **217.059535** |         **308.094408** |
| 1.4 GB and 300 B combined verdict |             **PASS** |               **FAIL** |

Every per-object dbstat byte and payload total matches the respective seed manifest. The ULID file crosses SQLite's 1 GiB pending-byte lock page: its logical size includes one reserved 4,096-byte page absent from dbstat and the freelist. This is explained by the pinned SQLite amalgamation's `PENDING_BYTE_PAGE` definition and allocator skip (sqlite3.c lines 24152-24159, 79886 and 79904), not an omitted B-tree allocation. W0 is below that boundary. Accounting includes that page and reconciles exactly.

The seed invokes the shared W0 command plan and core deterministic generator, and G9's verdict code still uses completion, stable builds and the same 1.4 GB / 300 B bars. Its round 2 tail is explicitly 64 MiB, declared before measurement. `R2-PREDICTIONS.md` is present in `dfddd916`, before the indexed measured series. My fresh build matches **all 165 JavaScript artifact hashes** in the W0 seed manifest. Thus the W0 size number is not substituted from a ULID or manually imported fixture.

REPORT.md states the ULID miss plainly at lines 3, 150 and 247: approximately 8.09 B/fact above the bar, although under 1.4 GB. The temporary generated-id patch used for that diagnostic is disclosed; it is not used as the W0 product gate. This review confirms the retained size results and input counts; it did not create another 10k seed or qualify production traffic.

**5. G6/G7/G8 and evaluator:** the fresh HS01 suite passed **17/17** tests: G6 **50,000 comparisons / zero mismatches**; G7 **100,000 rows**, all own fields exact, **15,508 fallbacks**; 300,000 generated id cases plus named edges; retention/reopen tests; and bounded startup after more than 1 GB of frame churn. My fresh evaluator run passed **108/108**, zero failed/skipped/cancelled, from committed review base `7b52a205` containing the frozen product. `lab/bin/`, the evaluator tests and `lab/acceptance/` are byte-unchanged from the round 1 product, including verification authority/registry enforcement; no `--verify` bypass or weakening was made.

The final fresh G8 rerun passed **80 whole-process stops**, including 11 actual in-purge and 11 dictionary-growth barriers: **253 parent-observed ACKed operations, zero lost; 297 distinct feed positions, zero missing or duplicated**. The final process reopened and verified cleanly, with `sourceUnchanged:true`. Exact source, generated artifacts and original/instrumented worker hashes are retained in `kill80-final-94bd9563-9d24-4f3f-934a-36a607406738/`. This is a fresh rerun, separately identified from the builder's 255-ACK sample.

I also audited the builder's sealed G8 record: all 80 stopped processes, 11 actual in-purge and 11 dictionary-growth barriers, current worker source hashes, clean final verification, 255 parent-observed ACKs and 297 distinct feed positions, with no missing ACK positions. The first failed HS01 stage remains a failed stage in evidence; the successful stage is a separate source-bound receipt on `535459e2`. Exit zero alone was never used to accept these results.

## Evidence and verification audit

Own durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VHS01/round2/`. [evidence-round2.json](evidence-round2.json) indexes attempts; [SHA256SUMS-round2](SHA256SUMS-round2) seals the durable manifest. Bulky stores, including the restored W0 database, remain outside Git. The completed seal covers **171 files / 1,185,889,635 bytes**, with every regular file read twice and hashes compared. Dependency identity, exact commands, source inventories, generated artifact hashes, start/end times and offline/no-engine-slot identity are retained in each execution receipt.

Reproduction from the review worktree:

```sh
node lab/bin/heavy.mjs --label CX-VHS01-r2-independent -- \
  node lab/verify/HS01/round2/run.mjs independent \
  node_modules/.bin/vitest run --config lab/verify/HS01/round2/vitest.config.ts
```

This intentionally remains red on the numeric compatibility assertion until the product is fixed. The five other independent tests pass. G6/G7/retention use `lab/verify/HS01/vitest.config.ts`; recovery uses `node lab/verify/HS01/kill.mjs`; evaluator uses `node --test lab/bin/test/claim.test.mjs lab/bin/test/claim-round2.test.mjs`, all through the same heavy limiter and durable runner.

Failures/limits retained: my first id fixture accidentally generated duplicate head strings through right-padding; only my fixture was corrected, then rerun in a new attempt. My first size audit omitted SQLite's reserved lock page and failed; the original restored file/log remains, and the corrected audit reconciles the page using primary local source. One initial fresh 80-stop run completed without lost ACKs but its broad source-stability flag is false because my non-executed audit helper changed; it is retained separately and is not substituted for the final frozen run. No failed observation was overwritten or relabeled.

Result-producing locations were audited before commit:

| Location                                                        | Content                                                                                                                                   | Freshness                                                   | Binding                                                                                                                        |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `round2/review.test.ts`                                         | Independent expected suffix, raw numeric/object comparison, old-worker negative control, original id bytes, exact cuts and typed refusals | New stores/corpus per attempt; actual reopen                | Original Git source, current source inventory, exact frame and row inputs, head slots and marker/anchor                        |
| Fresh `layout.test.ts`, `id-codec.test.ts`, `retention.test.ts` | Actual worker equivalence, exact fields and SQLite id round trips, measured work and retained bytes                                       | New execution/output directory, raw logs/measurements       | Frozen package/test hashes and actual driver binding                                                                           |
| Fresh `kill.mjs` / `kill-child.ts`                              | Parent-held ACK expectations, reached SQL barriers, whole-process outcomes, recovered rows/receipts/claims and feed positions             | New stop store and 80 stops, final reopen                   | Current original/instrumented worker hashes, id recipe, actual child outcomes; earlier false-stability attempt retained        |
| `round2/audit.mjs`                                              | Sealed receipt/log hashes, source/commit match, actual complete intent counts/digests and readonly dbstat, independent arithmetic verdict | New audit reads of explicitly historical builder attempts   | Builder seals, exact source, original/restored database hashes, immutable read-only paths; no claim of a newly seeded database |
| Build comparison and evaluator                                  | 165 executed JS hashes match seed builds; 108 assertions/counters from evaluator tests                                                    | Fresh build and test run                                    | Committed product, source inventory, actual build outputs; evaluator/contract unchanged                                        |
| `round2/run.mjs`                                                | Records exit, log hash and source stability, with no semantic PASS synthesized                                                            | Unique attempt paths and start/end                          | Head, product diff guard, source and build inventories, driver hash, offline/no-slot identity                                  |
| `round2/seal.mjs` and this verdict                              | Integrity/indexing only; FIX-FIRST comes from the reproduced numeric defect                                                               | After writers/processes finish, all regular files read back | Evidence hashes, frozen product comparison, full pin audit; checksum equality is not a correctness oracle                      |

No acceptance file, evaluator behavior, package source or pinned file was changed by this review. The broader pin audit checks **247 pinned paths** against `257d4d20`; changed-pin old/new pairs are empty. No contract repin, promotion, merge, push or publication occurred.

Not performed: a new 10k/100k seed, live engines/replicas, native engine pagination, full root/G0/package reruns, NS concurrency/latency qualification, OS/power-loss qualification, erasure or migration implementation, deployment or production acceptance. Open action: restore the finite numeric worker policy and independently rerun that regression. The ULID-shaped 300 B/fact miss remains a separately disclosed production-shape limitation.
