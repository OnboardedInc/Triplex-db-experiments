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
