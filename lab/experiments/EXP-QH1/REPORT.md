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
