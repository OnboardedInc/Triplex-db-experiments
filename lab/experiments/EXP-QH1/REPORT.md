# EXP-QH1 — H1 owner-prefetched current pulls

**Implemented, default off; P4 CPU screen FAIL and final P2 tail guard FAIL. DIAGNOSTIC host work only. Not promoted.** Builder CX-QH1, branch `exp/QH1-h1-pulls`, base HS01 `2f7b42d6`. During the final check HS01 was actively adding round-2 retention/structured-ID code and tests (observed `dfddd916` then `e81c16df`), without a final R2 report/handoff. This branch remains on the tested round-1 base; the coordinated final-HS01 merge remains pending and will need codec/route verification. The currently observed head is recorded in the evidence index. No acceptance files, engine containers, main-checkout source, default Colima VM, or prohibited ports were changed.

North star: P4 with P2 as a guard, from [SCOPE](../../SCOPE.md), [NORTH-STAR](../../NORTH-STAR.md), and [TARGETS](../../TARGETS.md). Implementation follows R46 section 5 rather than the superseded brief's JSON-row/per-hop primary arm. Q105a/b are treated as task requirements, without changing their contract status.

## Implementation

- Compact `facts`, `history`, and `journal` now cluster by `(owner, entity, …)`. The owner dictionary key is the name before its first slash. Entity point reads constrain both owner and entity. Old v2 stores without the owner column refuse opening explicitly; there is no application migration. The diagnostic fixture-copy script is separate, refuses overwrite, and compares every old column both ways before dropping temporary tables.
- `wholePull` performs owner prefetch and recursive external-reference misses inside the reader worker's existing single read transaction. Cycles and duplicate owners are bounded. Clustering is a hint: it never determines which entities the caller considers reachable. The public per-hop BFS selects the actual reach from this superset.
- SQLite emits tuple text, ids as text/hex, and REAL payloads and numeric timestamps with `printf('%!.17g', …)`. Exceptional HS01 fallback envelopes remain embedded JSON with scalar exception tags. The main thread parses the transport text once, buckets tuples by entity, and decodes requested entities directly to `Triple`s. Nested JSON values still require their own value decode.
- The optional core `getEntityTriples` SPI keeps the public `T.entity`/`T.entities` signatures. The adapter registers it through the same read constructor and snapshot policy as its other read operations. Normal row paths remain available for transactions, record-time cuts, and ineligible H1 cuts.
- `currentRoute: "h1"` is default off. `withCurrentPull(root, body, position?)` owns an AsyncLocalStorage cache per invocation. It pins the first resolved position when omitted. Raw tuples are cached by position, so valid-time changes between hops reuse one worker operation. Root/scope/lifetime are implicit in the adapter and invocation. A cached cut survives a later horizon purge; a new pull at an expired cut falls back. Unexpected non-BFS selections get a new exact same-cut fetch.
- Direct adapter entity reads also try H1 before the replica when opted in. Read events name `h1`; whole-operation counters report worker frontier passes, rows, statements, and serialized tuple bytes. Public BFS hop counts are recorded separately. These bytes are a logical answer/prefetch measure, **not physical I/O or SQLite page bytes**. `getByEntities` uses one-pass bucketing on the normal row path.
- The decoder primitive fast path constructs its own plain two-field value object, retains exact kind/type/range/negative-zero/ref/string/storage checks, and delegates JSON/blob/unusual or bound-adjacent cases to the full checker. It does not trust a stored scalar merely because it is persisted.
- H1 initialization no longer requires a reachable replica. `broker-h1` composes the built public Triples service, requires an explicit owned store directory, and declares the host current-store assignment.

## Verification and limits

Fresh results and exact commands are indexed in `evidence-index.json`; raw artifacts remain under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QH1/`. First failures are retained. Execution receipts are command receipts, not semantic PASS certificates. Final source-bound attempts retain content-addressed source preimages, exact command arguments, before/after source hashes, log hashes, Node version, disk observation, and `slot: null`.

| Gate / check | Fresh result |
| --- | --- |
| Candidate package checks | Core **854/854**; QLever **257 pass / 29 expected integration skips**. Core/testkit/QLever/W0 build and typecheck pass after the optional-property declaration fix. The baseline build is fresh; its full package suite was not separately rerun before edits. |
| Packaging / static | **12 tarballs and a clean consumer install pass**; targeted format/lint/diff checks and all pinned O-REPLAY file checksums pass. Full root `pnpm check`, PostgreSQL and FoundationDB integration suites were not run. |
| SQL01 offline | **10 pass / 1 deliberately excluded live-engine test**. The first attempt failed writing its absent output directory; the unchanged semantic cases passed after directory setup. |
| RQ01 + prefetch/public API | Registered actual H1w fixture has zero route violations; purge-between-hops, external refs/cycles, duplicate ids, changing valid time, transactional fallback, T/TP fallback, and future empty/nonempty refusals pass. |
| Independent O-REPLAY | **100,000 completed fixture pulls, zero mismatches**; **90 distinct sampled root/cuts out of 180 prepared references**. This does not close W0 per-rung G4. |
| Codec / admission | **100,000 persisted values** agree with the row route and expected payload/rejection (**12,497 typed rejections**, final corrected counter); **100,000 constructed values** agree with full admission. Public -0 writes refuse. |
| Mutants | All four produce semantic nonzero failures; none emits timing or a successful oracle summary. |
| G0 | **Incomplete**: partial real-stack decomposition below; missing four-arm attribution remains open. |
| G5 10k reads-only | **FAIL**: single-client median **302.3 pulls/CPU-second**; four-client median **323.5**, versus 1,100 required and 1.2x screening margin. |
| G6 | **NOT RUN**: G0 incomplete / G5 failed; no writer-on, 100k, history-growth or expired-stage qualification. |
| G7 final frozen attempt | p50 delta **-0.088 ms** (passes +0.5 ms guard); p99 ratio **1.2025x** (**FAIL**, required <=1.1x). Earlier loaded-host attempts passed; they do not supersede the final failure. |
| VM / attached engine | **NOT RUN**: task is offline host DIAGNOSTIC; independent review and VM acceptance remain required. |

The final frozen suite is **7 passing semantic tests and 1 failed diagnostic writer-threshold test**, with `sourceStillMatches:true`. The later codec-only rerun corrects the diagnostic rejected-value counter; no product code or comparison rule changed. Independent review is still required.

The 100,000-pull O-REPLAY test is a **30-root regression fixture**, with owned and cross-owner refs, cycles, expiration, retractions, replacement, and an 80/15/5 position-cut mix. It is not a 10k W0 independent-oracle qualification. Oracle expected answers are regenerated by Python O-REPLAY 0.4.9, with receipt consistency, complete expected query counts, exact snapshot fields and IEEE-bit witnesses checked. Available reference cuts and actually sampled distinct cuts are reported separately.

The codec test persists 100,000 scalar values through the real worker/frame path and compares the columnar answer with expected values and the row route. It includes finite random IEEE doubles, MAX_VALUE, subnormals, safe-integer boundaries, int64 edge strings, Unicode, NUL and lone surrogates, and booleans. **QLever refuses -0 at the public write boundary before frame JSON**; this is tested separately. Raw `encodeCommitGroup` is not claimed lossless for unsupported -0 inputs, and this experiment does not change that frame format.

The full R46 G0 gate is **not closed**: the driver reports real-stack total/main/worker CPU and before/after arms, but it does not separately attribute SQLite step versus SQL encoding, transfer versus main parse, domain validation versus the rest of the kernel, or run all four W1K/W2K/W6K/W7 arms. Implementation began while the fresh baseline seed was running, so this is not the prescribed completed four-arm decomposition before product changes. Later measurements are exploratory diagnostics and do not override that missing gate.

G4's 100,000-pull fixture does not substitute for 100,000 W0 pulls per rung. Full 10k/100k writer-on P4, matched 1k-subject history depths 1/3/10, the 20%-expired stage, a full application P2 on/off guard, and VM acceptance remain open. No engine-attached run was attempted (the task requests offline host work). The host has no pinned CPU quota or GREEN/A/A qualification; arms were sequential rather than interleaved. Baseline per-bucket tables classify observed reach size; candidate tables use the authoritative W0 bucket draw. Overall sampled roots and answer hashes are comparable, but those bucket tables must not be treated as paired cohort comparisons.

## Predictions beside measurements

R46 predicts owner + whole operation + direct decode at 1,200–1,900 pulls per CPU second (single client, warm), 10–40% efficiency loss at four clients, p50 0.4–1 ms and p99 3–10 ms at 10k. The original brief predicts p50 1–2 ms, p99 8–20 ms and largest-bucket p99 15–35 ms. The P2 guard allows at most +0.5 ms p50 and a 1.1x p99 ratio.
| Quantity | Prediction / bar | Measured diagnostic |
| --- | --- | --- |
| Single-client efficiency | R46 1,200–1,900; bar >=1,100 | **309.9** on 10,000 pulls; 302.3 median across three rounds — prediction falsified |
| Four-client efficiency | R46 10–40% loss | **318.5** on 10,000 pulls; 323.5 median — no observed loss; sequential loaded-host windows are not a qualified ratio |
| Weighted single-client p50 | R46 0.4–1 ms; bar <=5 ms | **2.378 ms** on 10,000 pulls — exceeds prediction, within diagnostic bar |
| Weighted single-client p99 | R46 3–10 ms; bar <=25 ms | **14.282 ms** — exceeds prediction, within diagnostic bar |
| Largest-bucket p99 | Brief 15–35 ms; bar <=50 ms | **22.777 ms**, authoritative W0 bucket draw |
| Depth-10/depth-1 p99 and bytes | <=1.1x | Not measured |
| P2 commit p50 delta | <=+0.5 ms | **-0.088 ms** in final 350-commit-per-arm worker test |
| P2 commit p99 ratio | <=1.1x | **1.2025x — FAIL** |

The first 10,000-pull single-client arm consumed **3,227.0 µs process CPU/pull**: main **1,187.1 µs**, named workers **1,496.3 µs**, other/runtime residual **543.6 µs**. Each of the main and named-worker components alone exceeds the 909 µs total budget. The compact-row R46 synthetic cost does not reproduce through this implementation's real stack. Attribution within those components needs the missing full G0; repeated dictionary joins/encoding and kernel/adapter overhead are hypotheses, not established causes.

The baseline's corresponding first 10,000 pulls used 5,798.1 µs CPU/pull (172.5 pulls/CPU-second), p50 4.300 ms and p99 27.122 ms. **All 10,000 ordered sampled baseline/candidate answer hashes match**, including root, row count and public BFS hop count. This is a row-route equivalence observation, not an independent O-REPLAY result. Source-built arms ran sequentially, so no qualified speedup is claimed.

The 100k rung was not admitted: G5 already misses, G0 is incomplete, and extrapolating the measured 10k footprint to 100k would exceed available local headroom plus the 5 GiB reserve. No new database was created for that rung. H1d was not built; its write/maintenance tradeoff is deferred until the complete decomposition explains the remaining CPU.

The fresh baseline W0 seed verified **4,468,284 assertions** and reproduced HS01's separate size-target failure. This is a completed population/content observation, not a storage PASS. The candidate fixture is a closed-store copy with a column-by-column owner-key transformation; its receipt binds both database hashes and counts.

Per-core efficiency uses `pulls / (process.cpuUsage delta / 1e6)`; worker CPU is never added. Candidate thread counters are a breakdown only; the residual includes unnamed runtime/GC threads and measurement skew. Hashing/oracle work occurs outside timed windows. Throughput in these read-only windows does not measure writer contention. Throughput/capacity and per-round host load/calibration/RSS are retained.

## PASS / verdict / receipt audit (rule 9a)

1. `run.mjs`: emits execution observations, never a semantic PASS. Content is the actual command output hashed after close; freshness is a newly created UUID directory; binding is exact arguments, input hashes/source objects, Node/head/disk/slot, and before/after source comparison. Nonzero attempts remain nonzero.
2. `domain.test.ts`: admission equivalence requires the full check and fast decoder to agree for each generated constructed value, plus byte-bound edges. Fresh seeded values run against the loaded source; the controller binds that source and test file. This does not claim equivalence for arbitrary externally supplied object shapes: the fast helper constructs those shapes itself.
3. `codec.test.ts` and `public.test.ts`: count the completed 100,000-value corpus only after every expected value/row-route comparison; test public -0 refusal, malformed dictionary strings, exact timestamp doubles, duplicate ids, and one-operation multi-hop behavior. Fresh owned databases and UUID attempts prevent adopting prior rows. Source/slot/input binding is in the command receipt.
4. `route.test.ts`: RQ01 requires zero violations on the real H1w operation against the independent offline fold route fixture. Typed temporal/retention refusal, purge repeats, and adapter-cache behavior are checked. This route reference is explicitly **offline fold, not an independent oracle**. H1 triples are reconstructed from their observed values/metadata for comparison, not borrowed from the source answer.
5. `oreplay.test.ts`: a zero-mismatch count is emitted only after a new case/receipt file produces a successful fresh O-REPLAY result, every expected query exists, all 100,000 candidate answers compare exactly, and purge refusal is checked. Case/expected hashes, oracle source hashes, sampled cuts, seed, and paths are retained. It is bound to a 30-root fixture, not claimed to cover W0 rungs.
6. `mutants.mjs`: requires each child to exit 1 **and** show the expected semantic comparison/refusal assertion, with no timing or successful oracle summary emitted. Fresh directories and the source-bound control run prevent treating build/setup failure as a caught mutant. REAL rounding, external-ref misses, retraction, and past-horizon serving are exercised.
7. `writer.test.ts`: writes latency observations before asserting the thresholds, preserving a failing measurement. Identical ten-fact inputs and interleaved arm order bind the real v2 and owner-key workers; 350 post-warmup commits per arm are fresh. This is a storage-worker diagnostic, not complete application P2 acceptance.
8. `migrate-fixture.mjs`: requires all row counts and both directional EXCEPT comparisons to match before completing the owned fixture transformation; preserves the original database and refuses overwrite. Hashes bind source/destination bytes after close. No general migration PASS is emitted.
9. `bench.ts`: emits DIAGNOSTIC measurements only after complete read windows and unchanged built-artifact hashes. It checks 10,000 W0 roots, records all serving process CPU once, and retains sampled answer hashes. It does not emit a P4 PASS or infer equality merely from successful reads.
10. `pin-audit.mjs`: verifies acceptance is unchanged against the base and records old/new full-file hashes. It grants no authority to the candidate; contract-owner re-pinning remains separate.
11. `summarize.mjs`: checks both measured artifacts are time-contained in their exact terminal command receipts, each has unchanged built-byte hashes, and both sampled arrays contain exactly 10,000 entries before comparing them. It checks retained runtime bytes against measured hashes, explicitly records five regenerated nonexecuted declaration files, and hashes sealed raw artifacts. It emits DIAGNOSTIC, never acceptance. Dependency caches and the active collector are excluded; later audit receipts/preimages are bound separately in SHA256SUMS.
12. `static.mjs`: actually executes pin/diff/lint/format commands and requires each to return successfully. The first attempted stdin-based static command was a no-op (the wrapper closes child stdin), is explicitly invalidated in the index, and supplies no semantic evidence. `final-static-a2` has the complete real output and source preimages.
13. Report/index: test counts and semantic claims are taken from their fresh detailed logs/artifacts; command exit alone is insufficient. Historical or source-mutating development attempts are identified as such. The report makes no promotion or independently verified acceptance claim.

## Contract and retention

`lab/acceptance/` is unchanged. `pin-changes.json` lists old/new SHA-256 for every modified tracked product/bench source (including any contract-referenced file), so the contract builder can re-pin deliberately. The changeset covers the publishable core package; QLever remains private.

No raw evidence directory is committed. `SHA256SUMS` and `evidence-index.json` name retained logs, receipts, source preimages, oracle cases/results, measurements, seeds, and databases. Original failed attempts, fixture databases, and old compiled baseline modules remain retained. Large raw SQL01 stores/output are moved only after their command has terminated, with their durable paths recorded. No foundation was stopped and no data was deleted to admit a run.

## Follow-up

The failed CPU prediction needs the full four-arm decomposition before another performance design is selected. Integrate HS01's coordinated final head after its active R2 work finishes, adapting H1's tuple/id codec where required; rerun source-bound codec, route and public-API checks. Re-measure P2 tail latency in an A/A-graded window. W0-rung oracle coverage, history/expiration/writer-on profiles, 100k admission, independent review, and VM acceptance remain open. No goal or contract obligation is closed by this report.

---

# Round 2: where the CPU goes (measurement only, no design change)

**Result: DIAGNOSTIC. No product code changed. Builder Claude Sonnet 5.5 (high), branch `exp/QH1-h1-pulls`, base `65ffe2f2`.** North star P4 (>= 1,100 pulls per CPU second, all serving CPU, pending Q105a). Scripts: `lab/experiments/EXP-QH1/g0/` (`arms.mjs`, `arm.ts`, `abab.mjs`, `summary.mjs`, `stages.ts`, `profile.mjs`, `cpucheck.mjs`). Raw evidence (out of git): `/Users/sam/Claude/Projects/triplex-db-2/evidence/QH1-R2/`, manifest `R2-SHA256SUMS`, index `R2-evidence-index.json`. All numbers are µs of CPU per pull (thread counters, not wall time) on the 10k W0 store from round 1, 459 to 467 facts per pull, 5.1 public hops.

## Headline

| Fact | Number |
| --- | --- |
| Today's path (HS01 build, row route), ABAB median of 5 rounds | **7,154 µs = 140 pulls/CPU-s** (p50 5.8 ms, p99 27 ms) |
| Round 1 (`h1`), same rounds | **3,122 µs = 320 pulls/CPU-s**, ratio to today 0.444 (per round 0.35 to 0.46); second run 3,047 µs = 328/s |
| R46's microbench path reproduced on the same data (L0) | **712 µs = 1,405 pulls/CPU-s**, ratio to today 0.114 (R46: 0.12 to 0.135). R46's number reproduces. |
| R46's design carrying every field the kernel needs (L3), answers identical to round 1 | **1,248 µs = 801 pulls/CPU-s** (ratio to round 1 0.41) |
| Gap to the bar | 909 µs budget. Round 1 is 3.4x over. L3 is 1.37x over. |

Round 1 missed R46's prediction because its worker operation and answer text are about 2x more work than the one R46 priced, and its main thread is not lean (section 3). R46's own arm is not a valid shortcut: its tuple lacks valid-from, recorded-at, creator and transaction fields and its answers differ from the kernel's in 3% of pulls (970 of 1,000 core digests equal).

## 1. Four-arm decomposition (ABAB, per-thread CPU)

Arms are separate processes on byte-exact retained builds (`arms.mjs` records dist tree hashes equal to round 1's retained baseline/candidate builds). Rounds alternate order (forward, reverse, ...), every arm uses the same roots in a round, 3 segments x 500 pulls after 300 warmup pulls, one client. Host load average was 9.9 to 12.4 and a fixed 1M-iteration calibration loop ran 0.97 to 2.55 ms between arms, so **ratios are the result, absolute µs move about 1.3x**.

Arms (ladder from R46 to round 1): **baseline** = today; **rows** = round-1 build on the owner-keyed store with h1 off; **h1** = round 1; **L0** = R46 W7 shape (own-subtree text with 8-field tuples, external refs, one parse, lean Triples) on the real schema; **L1** = round 1's real worker operation + parse + bucket + BFS + lean Triples (no validation, no Effect); **L2** = L1 + the real `h1Rows` decoder; **L3** = R46 structure (no per-entity probes, no second refs statement, integers for timestamps, dictionary joins kept) with the full tuple, lean Triples built with `h1TupleId`, plain-JS BFS.

| Arm | Total µs | Main | Reader workers | Other threads | System share | Pulls/CPU-s | Ratio to today | p50 / p99 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| baseline | 7,154 | 2,809 | not reported by the build (about 3,500 by difference) | about 890 (ps) | 686 | 140 | 1 | 5.8 / 27.4 |
| rows | 6,366 | 1,763 | 3,647 | 795 | 517 | 157 | 0.89 | 4.8 / 20.1 |
| **h1 (round 1)** | **3,122** | **1,048** | **1,458** | **347** | 182 | **320** | **0.444** | 1.6 / 10.7 |
| L2 | 2,427 | 804 | 1,379 | 279 | 184 | 412 | 0.37 | 1.8 / 9.2 |
| L1 | 2,321 | 702 | 1,417 | 232 | 178 | 431 | 0.35 | 1.4 / 9.2 |
| L3 (second ABAB, 5 rounds) | 1,248 | 519 | 609 | 113 | 98 | 801 | 0.19 vs 6,482 | 0.7 / 4.0 |
| L0 | 712 | 235 | 433 | 32 | 75 | 1,405 | 0.114 | 0.4 / 2.3 |

L3 run: baseline 6,482, h1 3,047, L0 789, L3 1,248; per-round L3/h1 0.38 to 0.56 (median 0.41); L3 answers equal h1's on 1,000 of 1,000 fixed-root pulls by full-field digest (every Triple field, sorted by id). Four clients (3 rounds, c=4): baseline 5,960 µs (159/s), h1 2,697 (319/s, ratio 0.45), L2 2,651, L0 776 (1,080/s). Same as one client within noise: **no measurable efficiency loss at four clients** for any arm, so R46 prediction 4 (10 to 40% loss) is also not reproduced.

Round-1 path in paired ratios: baseline/h1 2.25 (5 rounds, 1.94 to 2.84), rows/h1 2.04, L2/h1 0.84, L1/h1 0.83, L0/h1 0.25. The owner-keyed row route (no h1) is only 0.89 of today's cost: the owner column alone does not help the row route.

### Where round 1's 3,122 µs goes

Stage numbers come from `stages.ts` (patched copy of the real `wholePull` with thread-CPU probes inside the reader worker; captured answers replayed through the real built adapter and `h1Rows` on the main thread; 300 roots, 7 interleaved repetitions, medians). That window was quieter than the ABAB rounds: its stage sum is about 2,400 µs against 3,122 µs in situ, so multiply stage numbers by about 1.25 to compare with ABAB.

```
round 1, one pull, stage window (thread CPU us)              in-situ ABAB total 3,122
|
|- READER WORKER (wholePull op)                      1,245   (in situ 1,458)
|   |- SQL json statements (facts+journal+history,   ~750
|   |    about 18 statements per pull, 3 owners)
|   |     single-owner facts variant, 618 total:
|   |       owner range scan ................   33
|   |       dictionary joins (e,a,tx,te,c,y,ref) 183
|   |       json_array + printf building ..... 402  (printf of timestamps alone 219)
|   |- per-entity eid lookups: 304 SELECTs ..... 252  (2 per visited entity, 152 entities)
|   |- second statement per table for refs ..... ~99
|   |- request/BEGIN/COMMIT/marker/gate ........  34
|   '- JS glue (text join, byteLength, names) .. ~110
|
|- TRANSFER, 86.6 KB text, 1 message ........ 12 to 76 main, about 10 worker
|
|- MAIN THREAD                                        about 1,050 in situ (replay: 794 + 110 receive)
|   |- JSON.parse of whole text ............... 148
|   |- bucket by entity ........................ 20
|   |- h1Rows (decode, per hop)  ............... 384
|   |     hex->base32 ids (62% blob ids) ..... ~195   (84,290 conversions per 300 pulls)
|   |     per-entity sort (localeCompare) .....  ~59
|   |     Number() of 3 text timestamps/row ..  ~39
|   |     domain check, fast path ..........   ~40   (0.085 us/row)
|   |     Triple + Option construction ...... ~50
|   '- adapter + Effect runs + BFS + ALS +      242
|        snapshot mask + readBasis per hop
|
'- OTHER THREADS (4 V8 platform/GC helpers)       240 (ps -M, 8.5%) to 347 (ABAB)
```

Top three CPU consumers per pull (round 1, stage window, thread CPU): **(1) reader SQL answer statements about 750 µs** (dictionary joins 183, JSON/printf build 402, rest other owners and tables); **(2) main parse plus decode into Triples about 550 µs** (parse 148, bucket 20, `h1Rows` 384 of which the hex-to-base32 id conversion alone is 195); **(3) adapter, Effect, kernel and receive about 350 µs** (242 replay remainder plus about 110 receive). Next: per-entity dictionary lookups 252 µs, V8 helper threads 240 to 347 µs, refs statements 99 µs. Scaled to ABAB: SQL about 940, parse+decode about 690, kernel about 440.

Today's path (profile shares only, profiler inflates CPU about 1.5x): main thread 2,745 busy µs per profiled pull = `invalidValue` domain check 296 to 321, Effect runtime 433, adapter 412, structured-clone deserialize and other native 550, GC 145; readers 4 x about 1,350 = the `rows` statement 620 to 640 per worker-share, dictionary `name`/`tx` lookups about 300, `unpackId`/`decodeRow` about 80. Helper threads about 890 µs per pull by `ps -M`.

## 2. R46 assumptions that did not hold on the real stack

| # | R46 assumption | Real stack, measured |
| --- | --- | --- |
| 1 | Compact + owner range + one worker op + SQLite text + lean decode costs 580 to 870 µs (1,140 to 1,720/s) | R46's own arm reproduces here at **712 µs (1,405/s)**. Round 1 is **3,122**. The difference is what round 1 does, not the layout: 17.7 statements and 304 eid probes per pull instead of 4, 15-field tuples instead of 8, mixed id forms, public per-hop kernel path. |
| 2 | One SQLite-built text with `%!.17g` doubles, no JS row decode in the worker | **True and implemented**: one `json_group_array(json_array(...))` per table per owner fetch, joined into one string, parsed once on main (cost 148 µs). But W0 has **zero REAL number rows** (`t=1`: 0 of 4,466,330 facts; 441 boolean and 1.47M ref ids are stored as REAL). `%!.17g` is therefore applied only to timestamps and `sv`: 4 printf calls per row, **219 µs in SQL plus about 39 µs of `Number()` on main**, to protect values that never occur in W0. The worker still runs JS per owner (eid probes, refs loop, `name()` lookups, about 110 µs glue + 252 µs probes). |
| 3 | Domain check costs 450 to 500 µs per pull and is the largest kernel cost | Round 1's fast path is hit: **135,669 `decodedPrimitiveValue` calls, 2 `assertValueInDomain` calls** (V8 precise coverage over 300 pulls). Cost **0.085 µs/row = about 40 µs per pull**. Not a top consumer now. On today's path the full check is about 300 µs (profile). |
| 4 | Main thread after change: 150 to 300 µs | **1,048 µs in situ**: parse+bucket 168, `h1Rows` 384, adapter/Effect/kernel 242, receive about 110, rest message and GC pressure. |
| 5 | Transfer: one string, 60 to 100 µs | **12 to 76 µs** main and about 10 worker for 86.6 KB (cached-text op minus ping, versus whole op minus ping). Negligible. |
| 6 | `process.cpuUsage()` includes workers (so do not add them) | **Confirmed, counted once.** `cpucheck.mjs`: 3 workers x 500 ms with main idle gives 1,512,736 µs process CPU against 1,502,316 µs named threads (0.7%); main 500 ms + 3 workers x 500 ms gives 2,008,890 against 2,000,907 (0.4%). In ABAB, total minus main minus named readers is always positive (32 µs for L0 to 347 µs for round 1) and matches the four V8 helper threads in `ps -M` (about 0.06 s per 1,000 pulls each at 4 threads for round 1). The first row of `cpucheck.json` (main only) shows 63 ms residual from worker start-up, shown as `countedOnce:false` and left as measured. |
| 7 | Other threads 0 to 208 µs per pull | **240 to 347 µs** for round 1 (8.5 to 11%), about 890 for today's path. Allocation volume is the driver (4 helper threads). L0 shows only 32. |
| 8 | Today's path costs 3.5 to 4.4 ms (W1K 225 to 285/s) | **7.15 ms (140/s)** on the real store, 1.7x R46's synthetic. Round 1's gain over today is 2.25x, not R46's 6 to 8x. |
| 9 | 10 to 40% loss at four clients | **None** (round 1 319/s at c=4, 320/s at c=1). |
| 10 | Mmap makes system time small | Reader `mmap_size` is 256 MB on a 2.6 GB store. System share is 5.8% for round 1, 9.6% for today's path, 5.1% for L3: not the limit. |

Other facts found: ids are stored in two forms (62% of tuples have BLOB ids converted by `idFromHex`); every row carries `c` = `p5-seed`; `y`, `x`, `sv` are NULL in W0; journal has 8.1M rows all under owner `_tx`, so every pull pays journal and history statements that return nothing; the `rows` arm shows the owner key does not speed the row route.

## 3. Recommended changes, ordered by CPU saved

Predictions use stage savings x 1.25 (load scaling) from round 1's measured 3,122 µs, cross-checked against the L3 measurement. They are predictions and can fail. "Measured" means an arm in this round already includes it.

| # | Change (not implemented) | Saves µs/pull | Cumulative µs | Pulls/CPU-s | Basis |
| ---: | --- | ---: | ---: | ---: | --- |
| 0 | Round 1 today | | 3,122 | 320 | measured |
| 1 | **Worker operation in R46 shape**: one statement per owner (+history), drop the second refs statement and the empty journal statements, cache name-to-id in the worker (no 304 probes), timestamps and `sv` as integers (keep `printf` only for REAL payloads) | about 1,000 to 1,150 | about 2,000 | about 500 | eid 252 + refs 99 + glue/extra statements about 200 + printf 219 + `Number()` 39, x 1.25; L1 to L3 measured workers 1,417 to 609 |
| 2 | **Whole-pull kernel surface** (one Effect run, no per-hop `readBasis`, mask, or `Option` re-bucketing; BFS in plain JS over parsed tuples) | about 450 | about 1,500 | about 660 | L2 to h1 measured +490; replay remainder 242 + receive 110 |
| 3 | **Cheaper main decode**: base32 id conversion by table/word (195 to about 30), skip per-entity sort when already ordered (59), no `Number()` on integer fields (39) | about 280 | about 1,250 | **801** | **Measured**: L3 = 1,248 µs, identical answers on 1,000 of 1,000 pulls |
| 4 | **Dictionary ids on the wire**, names resolved on main from a per-process cache (removes 7 joins, 183 stage µs, shortens text and parse) | about 220 to 300 | about 1,000 | about 1,000 | joins 183 + parse share, x 1.25 |
| 5 | **Cut allocation**: shared None/Options, columnar or typed arrays instead of 15-element JSON arrays, fewer short-lived Triples | about 150 to 250 | about 800 to 850 | about 1,200 to 1,250 | other threads 347 to about 120, main GC 165 (profile share) |

Reading: items 1 to 3 together are L3 (801/s, measured, exact answers). That is **below the 1,100 bar**; the 1.2x screening margin (1,320/s) needs items 4 and 5 as well, and items 4 and 5 are still predictions. If they fall short the remaining fallback is R46's per-subject document, which R46 measured at 247 µs per pull and +0.91 ms commit p50 (fails G7).

## 4. What was not done or not verified

- No design was implemented; arms L0 to L3 are measurement harnesses, not product routes. L0 and L3 build Triples without domain validation and L3/L0 BFS in plain JS, so they bound what a lean surface could do and are not a PASS path.
- Process-level interleaving (ABAB across processes, 3 x 500 pulls), not per-pull interleaving; host load swung 1.0 to 2.5 ms on the calibration loop. Stage numbers are one quieter window (7 interleaved reps), scaled by an assumed 1.25. Variants inside `h1Rows` were measured interleaved and agree with the real function (local copy mismatches: 0 over 50 pulls), but each is about +/-30 µs.
- `ps -M` resolution is 10 ms; used only for the thread-share cross-check. CPU profiles inflate CPU by about 1.5x and are used as shares only; native time is attributed to the calling JS function.
- 10k only, one client and four clients, no writer, no 100k rung, no history/expiry stage, no VM. The four-client ABAB has 3 rounds.
- Disk free was 4.3 GiB at the start (lab floor 5 GiB, no heavy run was started below it) and 10 to 12 GiB when runs began. Working stores are APFS clones of round 1's stores (`QH1-R2/store-baseline`, `store-candidate`); each broker open appended an epoch frame to the clones. Round 1's original stores were not opened by any run (one stats script opened the candidate original read-only and created an empty `-wal`/`-shm`; both were deleted).
- Q105a/Q99c are unresolved; all numbers count every thread of the serving process.

## PASS / verdict / receipt audit (rule 9a) for round 2

1. `arm.ts` answer comparison (cross-arm digests): content = sha256 over every Triple field sorted by id (`full`) and over entity/attribute/type/value (`core`); freshness = digests written by that process on its own warmup roots (fixed seed 4646, first 200 roots) in that run's JSON; binding = each result JSON records the arm name and sha256 tree hashes of the exact core and qlever dist it loaded, the store path, and `summary.mjs` compares only equal root positions. L0 is reported unequal (970 of 1,000) rather than excluded.
2. `summary.mjs`: emits medians, per-round ratios and equality counts only, no PASS or verdict; it reads only `r<round>-<arm>.json` files of the named run directory.
3. `abab.mjs`: refuses to start below 5 GiB free, treats any non-zero arm exit as failure and stops, keeps every stdout/stderr log and the schedule with load and free space.
4. `stages.ts`: probe points are applied by exact unique string replacement and throw if absent (content check of the patched worker); the local `h1Rows` copy is compared to the built `h1Rows` on 50 pulls (0 mismatches) before its variants are trusted; captured answers are keyed by root and the stub throws on an uncaptured root.
5. `cpucheck.mjs`: `countedOnce` is a 5% tolerance on observed counters computed in that run; its first row is false and reported as such.
6. `profile.mjs`: window bounds come from the arm result's own `hrtime` markers (freshness/binding to the same run); it prints shares, no verdict.
7. Coverage counts (fast-path hits) come from `NODE_V8_COVERAGE` over `QH1-R2/cov` for this run's build (arm root `arms/candidate`, dist hash in `arms.json`).
8. This report makes no acceptance, promotion or P4 PASS claim. `lab/acceptance/` is unchanged and no pinned file's hash moved.

---

# Round 3: round 2's changes built into the product H1 route

**Result: DIAGNOSTIC. Final c=1 677 pulls per CPU-second, c=4 661; the P4 bar (1,100) is not reached (1.6x short). Builder Claude Sonnet 5.5 (high), branch `exp/QH1-h1-pulls`, base `173831eb`.** Commits: `8beae888` (steps 1 to 3), `e2a9f785` (step 4 as briefed) and its revert `a77adeb7`, `4b066bc9` (step 4b and the worker cache key), and the commit carrying this section. Harness: `lab/experiments/EXP-QH1/g3/` (`arms3.mjs`, `arm3.ts`, `abab3.mjs`, `summary3.mjs`, `pooled.mjs`, `replay.ts`, `replay-compare.mjs`, `manifest.mjs`). Raw evidence (out of git): `/Users/sam/Claude/Projects/triplex-db-2/evidence/QH1-R3/`, manifest `R3-SHA256SUMS`, index `R3-evidence-index.json`.

## What was built

1. **Worker op in R46 shape** (kept). `wholePull` runs one statement per fetch over `facts UNION ALL journal UNION ALL history` (the journal branch costs one empty B-tree seek, not a statement), one statement for ref discovery, and no per-table second refs statement. The first touch of an owner by a requested root fetches the whole owner; refs found from rows are fetched by exact (owner, entity) unless their owner is already complete. A name-to-id cache replaces the per-entity eid probes (hits only, bounded at 200,000). Integer timestamps, offsets, schema versions and numeric payloads cross as JSON numbers; anything that is not an integer inside the safe range crosses as `printf('%!.17g')` text (Q105b). The answer is a list of per-fetch JSON texts (no concatenation). Statements per pull: 5.9 (round 1: 17.7).
2. **Whole-pull kernel surface** (kept). New public `Triples.reach(root, basis?)` returning `{ triples, hops }` and an optional `StorageAdapter.getReachTriples`. `TriplesLive` resolves the basis once, tries the adapter, and otherwise runs the same breadth-first walk over `entities` (`store/reach.ts`, also used by `KvTriplesLive`). The qlever adapter answers it with one worker operation, one Effect run, and a plain JS walk over the prefetched tuples; each entity is decoded (valid-time cut, read-side domain check, ordering) only when reached. Transactions, record-time cuts and expired cuts fall back to the per-level path. The per-hop route and `withCurrentPull` stay.
3. **Cheaper main decode** (kept). Base32 id conversion unrolled over four 32-bit words (0.14 us against 0.76 us, identical output on 300,000 random and edge ids), the per-entity sort skipped after an O(n) order check (ids of `[0-9A-Z]` compare identically by code unit and by `localeCompare`; anything else falls back to the real sort), no `Number()` on JSON numbers.
4. **Dictionary ids on the wire** (built, tested, measured, **reverted**; `e2a9f785`, patch retained). Rows carried entity, attribute, string and transaction-position ids; the main thread resolved names from a per-HostLog cache keyed by (writer epoch, SQLite `schema_version`) and fetched misses with one extra reader request; the worker's own name caches used the same key. Tests: hits, growth fetches only new ids, key change by schema DDL and by epoch drops the cache (here and in the worker), bound, and a fetch that cannot converge fails. It passed every gate and 100,000 pulls with zero mismatches, but did not save CPU (table below): on this workload every pull touches about 160 unseen entity names and 49 unseen transactions, so the cache never warms and the miss request costs what the removed joins cost.
4b. **Unguarded name joins** (kept; not in the brief). The per-name `CASE typeof(name)='blob'` guard (7 per row) was about 175 us of the 660 us row statement (standalone, 400 random W0 roots). The statement now runs unguarded; `json_array` raises on a blob name, and a failed fetch is rerun once with the guarded statement, so the exact-text behavior is unchanged. The worker's name caches are dropped when the (writer epoch, `schema_version`) key changes (`workercache.test.ts`; a no-sync mutant fails it).
5. **Cut allocation** (measured, **not kept**). Shared Options through Maps keyed by value (`s5`): +8% CPU per pull against 4b (paired median 1.082, n=8, every round above 1). Last-value memo of the Options (`s5b`): 1.03 (n=8), no saving. Columnar transfer, measured standalone before building (400 W0 roots): SQL +25 us, `JSON.parse` -26 us, no gain, so it was not built; typed arrays were not built. Patches for `s5`, `s5b` and step 4 are in `evidence/QH1-R3/steps-not-kept/`.

## Measurements (ABAB, own process per arm, per-thread CPU, all threads counted per Q105a)

Method as round 2: arms alternate order each round, same roots per round, 3 segments x 500 pulls after 300 warmup, today = HS01 build on the HS01 store, round 1 = retained round 1 build on the owner-keyed store, each step = a retained build (`evidence/QH1-R3/arms/<name>/arm.json` binds the dist tree hash). c=1 is five rounds and c=4 is three rounds for each step's own run; where two steps differed by a few percent, extra runs of 8 (c=1) and 6 (c=4) rounds were added and per-round ratios were pooled (`pooled.mjs`). Host load average was 8.9 to 12.4 and the calibration loop ran 1.7 to 2.7 ms, so **absolute numbers move about 1.3x between runs; the paired ratios are the result**. The `h1` arm keeps round 2's `onPull` counters (and its always-on `byteLength`); step arms run without them. Answers of every arm equal today's on 1,000 of 1,000 fixed-root pulls (c=1) and 600 of 600 (c=4) by full-field digest.

| Step | Build | c=1 us/pull | c=1 pulls/CPU-s | c=4 us/pull | c=4 pulls/CPU-s | Paired CPU ratio to previous kept step | Decision |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| today (HS01) | `baseline` | 5,589 | 179 | 6,558 | 152 | | |
| round 1 | `h1` | 2,799 | 357 | 2,992 | 334 | 0.499 of today (c=1, run `final`) | |
| 1 worker op | `s1` | 2,587 | 387 | 2,146 | 466 | 0.794 (n=5), c=4 0.720 (n=3) | kept |
| 2 whole-pull surface | `s2` | 1,904 | 525 | 1,848 | 541 | 0.736 (n=5), c=4 0.860 (n=3) | kept |
| 3 cheaper decode | `s3` | 1,640 | 610 | 1,552 | 644 | 0.888 (n=5), c=4 0.853 (n=3) | kept |
| 4 dictionary ids | `s4` | 1,595 | 627 | 1,233 | 811 | c=1 1.011 (n=13, 0.886 to 1.250); c=4 0.926 (n=9, 0.595 to 1.076) | reverted, no consistent saving |
| 4b unguarded names | `s4b` | 1,468 | 652 | 1,665 | 556 | c=1 0.927 (n=8, all below 1); c=4 0.952 (n=6) | kept |
| 5 Options via Maps | `s5` | 1,590 | 603 | 1,745 | 541 | 1.082 against `s4b` (n=8) | reverted, worse |
| 5b Options by memo | `s5b` | 1,616 | 587 | 1,483 | 653 | 1.030 against `s4b` (n=8) | reverted, no saving |
| **final** (= 4b + worker cache key) | `final` | **1,477** | **677** | **1,514** | **661** | 0.499 of round 1 (c=1, n=5), 0.528 (c=4, n=3); 0.273 and 0.248 of today | |

Each row's absolute numbers come from that step's own run (steps 1 and 2 share one run; 4, 4b, 5 and 5b rows are the 8-round and 6-round comparison runs, which have no `baseline` arm). Final p50 / p99: 0.87 / 4.2 ms at c=1 (bar: 5 / 25 ms), 1.85 / 6.2 ms at c=4. The c=4 columns show no efficiency loss against c=1, as in round 2.

**Where the CPU is now** (final build; V8 profiles used as shares only, per pull from the thread counters: main 515, reader workers 766, other threads 191 us; `prof-final-summary.json`): the reader's row statement is 78% of reader busy time (83 KB of tuple text per pull); `JSON.parse` of that text is 37% of main busy time (about 190 us); GC is 12% of main, the adapter's bucketing and walk 11%, the Effect runtime 7%, and the rest of decode (domain fast path, ids, tuples to Triples) about 10%.

## Gates

| Gate | Result |
| --- | --- |
| O-REPLAY-style answer equality, 100,000 pulls against today's path, full-field digest (every Triple field, keys sorted) | **0 mismatches** for `s1`, `s2`, `s3`, `s4` and `final`, each on its own retained build (`replay/*-compare.json`). Requests: seeded draws over all 10,000 W0 roots, 80% at the head with eight valid-time offsets (before valid-from, expired, future), 15% at the only W0 transaction instant as `recordedAt`, 5% one millisecond before it (empty answer); the two record-time cuts leave H1 and exercise its fallback. Today's reference run is `replay/ref-baseline.txt` (467 s). |
| Independent Python O-REPLAY, 100,000 pulls on the 30-root fixture with owned and cross-owner refs, cycles, expiry, retractions, position-cut mix | pass at the final state (`oreplay.test.ts`) |
| RQ01 route checks | `route.test.ts` passes with the raw worker route (`QH1w`) and a new route that calls `adapter.getReachTriples` (`QH1r`) registered beside `source`; the `INT-Q` `h1-read-routes` test passes |
| Mutants (real rounding, owner rule, retraction cut, purge horizon) | all four exit 1 with a semantic mismatch and no timing (patterns updated to the new worker source) |
| Precision (Q105b, ruling `no silent precision loss`) | `real.test.ts` writes 3,000 doubles (22 edges incl. 5e-324, MAX_VALUE, 2^53 neighbours, 1/3, and random IEEE bit patterns; -0 and non-finite are refused by the public write path) through `Triples.transact` and reads them back bit-exactly with `T.reach` and `T.entities`; a second test round-trips REAL record times and valid-from offsets bit-exactly through `getReachTriples`; `codec.test.ts` still compares 100,000 persisted values to the row route |
| Package suites | core 854/854; qlever 257 pass / 29 expected integration skips; SQL01 offline 10 pass / 1 excluded live-engine test (after creating its absent output directory, as in round 1) |
| Typecheck | core (three projects), qlever, and http, host, cloudflare, testkit, sqlite, postgres, xtdb, datomic, foundationdb, duckdb, w0, sql all pass |
| Static | `oxlint --deny-warnings` clean on the touched paths; `oxfmt` applied to the new files and to the changed files that were conforming at the base (`TriplesLive.ts` was not conforming at the base and is left as it was); `git diff --check` clean; O-REPLAY pins verified; `lab/acceptance/` unchanged |
| **P2 p99 ratio, H1 on vs off <= 1.10x** | **Not met on every run.** Seven runs of the round 1 worker diagnostic (350 matched 10-fact commits per arm, v2 worker against the owner-key worker, `writer.test.ts`), plus an A/A twin (a second copy of the baseline worker): candidate over baseline p99 1.080, 1.126, 0.882, 1.022, 1.122, 0.917, 0.862 (median 1.022, mean 1.001); twin over baseline 0.999, 0.953, 0.900, 1.050, 2.229, 0.846, 0.857. p50 delta -0.026 to +0.097 ms in every run (bar 0.5 ms). Two of seven single runs exceed 1.10, but the same-code control spans 0.85 to 2.23, so one run of 350 fsync-bound commits cannot resolve 1.1x. The measurable write-side cost is the owner interning and the wider key, about +0.03 ms p50 (+1%); no tail mechanism was found. This is a storage-worker diagnostic, not application P2. |

## Divergences from the brief

- **Step 4 was implemented as briefed, measured, and reverted** (no consistent saving), and an unbriefed change (4b) was kept because a standalone ablation showed the blob guards, not the joins, were the cost. Step 5 was not kept (Options sharing is slower; columnar had no standalone gain).
- **Source-level gates (RQ01, suites, typecheck, SQL01, mutants, P2) ran on the commit states `8beae888` (steps 1 to 3 together) and the final state**, not once per intermediate step. Per-step answer equality (100,000 pulls) and ABAB ran on each step's retained build.
- **The 100,000-pull gate compares against today's path by digest on the real W0 store**, with `recordedAt` cuts instead of position cuts (the public `TemporalBasis` has no position cut and today's path ignores one; position cuts are covered by the RQ01 routes).
- **`Triples.reach` is a public API addition** (minor changeset). It moves the pinned hash of `packages/core/src/store/Triples.ts` (referenced by `lab/acceptance/build_contract.py`, `obligations.json`, `golden/README.md`): old `7e5bd8c3e83e0d468912be4f01719d6bdd4f54c84c9bbc08ee0f10cdf05159c0`, new `da3515b5013feae546c08cc6865a4b517292a0f5fcb0f679340d5aba2b20060d`. The contract is unchanged; the contract builder must re-pin. All other changed paths, with old and new hashes, are in `pin-changes.json` (`pin-audit.mjs` now tolerates files added after the base).
- Absolute numbers are from a loaded host with all threads counted; no A/A-graded window. The `s5` and `s5b` patches are reconstructions against the final `h1.ts`, not the exact bytes of those builds (the builds themselves are retained).
- Harness edits after the final ABAB: lint and format only in `arm3.ts` and `replay.ts` (a spread merged, `new Array` replaced); no behavior change.
- The step 1 to 3 run `s12` and later runs used stores cloned from round 2's working stores (APFS clones; each broker open appends an epoch frame to the clone); no retained store was opened read-write.

## What did not run

No 100k rung, no writer-on window, no history-growth (depth 3 and 10) or 20%-expired stage, no per-bucket P4 table from the new route, no c=16, no engine-attached or VM run, no full application P2, no A/A-graded quiet window, no per-subject document fallback (not started, as instructed), no `rows` or L-arm re-run. Q105a is unresolved: every thread of the serving process is counted (other threads are 191 us, 13%).

## Ranked next changes (predictions, not measured)

1. **Shrink the tuple text** (about 83 KB per pull drives both the row statement and `JSON.parse`): carry the transaction (position, instant, name: about 30 bytes per row, 49 distinct per pull) and the entity name once per fetch instead of once per row, and send creator, schema version and valid-to only when they differ from the answer's default. Estimate 20 to 25% fewer bytes, about 100 us less SQL and 40 us less parse: about 1,300 us, about 770 pulls per CPU-s.
2. **Reduce other-thread CPU** (191 us) by cutting allocation at the source; sharing Options did not do it.
3. Items 1 and 2 together are still short of 909 us. The remaining evidence-backed route to the bar is R46's per-subject document (247 us per pull, +0.91 ms commit p50, fails G7), or a storage layout that stores the answer text in the form the reader emits it.

## PASS / verdict / receipt audit (rule 9a) for round 3

1. `replay.ts` and `replay-compare.mjs`: content = sha256 over every Triple field of the whole answer (sorted by id, keys sorted, Options expanded) and the row count and hop count per request; freshness = each digest file is written by the run that precedes its comparison and the comparison reads both files whole; binding = each line names request index and root, both sides derive the request from the index alone, and the arm's dist tree hash is in `arm.json`. A length difference or any differing line exits nonzero. The reference is the HS01 row route on the HS01 store, not an independent oracle.
2. `arm3.ts`, `abab3.mjs`, `summary3.mjs`, `pooled.mjs`: emit medians, per-round ratios and equality counts only, no verdict. `abab3.mjs` refuses below 5 GiB free and stops on a nonzero arm exit; answer equality uses the fixed warmup roots of each process (seed 4646, first 200 per arm per round) and `summary3.mjs` compares only equal positions.
3. `arms3.mjs`: refuses to overwrite an arm and throws unless the retained dist tree hash equals the worktree's, so an arm cannot run a later step's code.
4. `oreplay.test.ts` (updated for the new worker source): the zero-mismatch file is written only after the fresh Python O-REPLAY case passes with receipt consistency and every expected query present; the 100,000 candidate answers compare exactly; purge refusal is checked. Bound to the 30-root fixture.
5. `real.test.ts`: content = IEEE bit pattern equality of every value (`bits()` of the double, so -0 versus 0 and rounding are both caught) after a real write and a real read; freshness = new store per test; binding = values read by entity id from the answer of the stated route. The REAL-time test compares record time and valid-from bit patterns.
6. `h1decode.test.ts`: the fast id conversion equals the original over 300,000 ids; the ordered fast path equals the real sort over 20,000 random buckets with lowercase and punctuation ids; REAL text and integer fields decode to the same numbers.
7. `workercache.test.ts`: pulls rotate over every reader (eight per check, all must agree) so each reader's cache is exercised; a mutant with the sync call removed fails it (observed), so the test does reject the stale-cache defect.
8. `route.test.ts`: the new `QH1r` route reads through the adapter and takes record positions from the fixture's own rows, not from the answer under test; the test models the broker's durable publication after its direct log writes.
9. `writer.test.ts`: writes latency observations before asserting; the A/A twin shares the interleaving; assertion thresholds unchanged (a failing run stays failing).
10. `mutants.mjs`: unchanged logic; each child must exit 1 and show the semantic assertion text, with no timing emitted.
11. `manifest.mjs`: hashes each evidence file from its bytes at manifest time and excludes stores and dist trees (bound by `arm.json`); the manifest is written after the last run.
12. `pin-audit.mjs`: compares against the base commit and records old and new hashes; it grants no authority and `lab/acceptance/` is unchanged.
13. Gate scripts (`gates_final.sh`, `run_cmp.sh`): record exit codes only; the semantic verdicts above are read from the test logs, not from exit alone.
