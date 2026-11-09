# CX-VQG1: EXP-QG1 phases 0 and 1

**Verdict: ACCEPT as diagnostic phase-0 and phase-1 evidence only. No rebuild threshold, P1/P4/P5 qualification, or phase-2 admission is established.**

Reviewed builder commit `2fb0a49119440b14c93dde7f0ad4b994d70cd4c0` on `exp/QG1-qlever-generations`. Reviewer branch: `verify/QG1`. Review date: 2026-11-09 UTC (2026-11-08 local).

North star: P1 pinned concurrent reads, P4 current pulls, and P5 release activation. Goals and targets come from `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`; procedure from `lab/PROTOCOL.md`; experiment design from main checkout `lab/research/R35-qlever-delta-cost.md` and Q91a-d in `lab/acceptance/RULINGS-PENDING.md`.

The retained observations support the builder's limited result. The cold-query slope arithmetic is correct, the copy's eight sampled answer multisets are identical, the injected filler and persisted counts reconcile, and the two grids retain successful unchanged C8 controls. The evidence does **not** support a stable common rebuild threshold. There is one misleading diagnostic association between P4 timing and delta size, described below; it does not reverse the conservative conclusion or invalidate the raw data.

## Findings

### F1 — Medium, nonblocking for diagnostics: P4 screening uses the pre-C8 delta

Locations: `lab/experiments/EXP-QG1-qlever-generations/grid.mjs:156`, `:182`, `:200`, `:211`; `summarize.mjs:19`, `:80`; `REPORT.md:27`, `:48`.

The runner snapshots `before`, measures native queries, runs C8 with its writer, then runs P4, then snapshots `after`. The summarizer associates P4's timing with `before.deltaTriples.total`. This is correct for the earlier native-query fits, but is the wrong engine delta for the later P4 samples. There are no further writes in the P4 sampler, so the retained `after` count is the appropriate count for its pulls, subject to the documented exclusive-slot assumption.

Reproduction: inspect `grid-M-attempt2/N0.json`: the summary table's delta is 0, but C8 has taken the engine to 26,501 changes before P4. M/N10000 is labelled 36,518 while P4 runs at 62,397; U/N30000 is labelled 82,389 while P4 runs at 102,048. U's apparent N0 baseline already has 27,745 changes. Thus the reported isolated candidates are pre-control coordinates, not measured P4 delta thresholds or a true zero-delta P4 comparison.

Proposed fix: retain separate `nativeProbeDelta`, `c8StartDelta`, and `p4Delta` values, snapshot immediately before P4, and measure a genuine zero-delta P4 baseline before the first C8 writer. Recompute any future screening from the matching counts. Keep this run's original bytes and tables identifiable; do not relabel it as a rerun. This must be corrected before using these screens to select T. The current `qualifiedThreshold: null` conclusion remains correct.

### F2 — Low, future harness hardening: rebuild identity can compare missing result arrays

Location: `lab/experiments/EXP-QG1-qlever-generations/grid.mjs:306` (`sampledIdentity`); measured `source-attempt2/grid.mjs` has the same comparison.

`JSON.stringify(before.data?.res) === JSON.stringify(after.data?.res)` evaluates true when both result arrays are absent. This diagnostic flag alone does not require successful parsed, nonempty results, identical query bytes, or the same selected columns. Offline reproduction: `node -e 'console.log(JSON.stringify(undefined) === JSON.stringify(undefined))'` prints `true`.

Proposed fix: require valid successful result envelopes, expected nonempty row shape, identical query/selected-column bindings, and canonical multiset equality before emitting the identity observation. Preserve multiplicity. This does not invalidate the retained pair: this review checked the actual successful nonempty arrays, which match on both arms. No acceptance PASS is emitted by this field.

## Retained-byte replay

Evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QG1/`. The builder's committed `SHA256SUMS` matches **1,389/1,389 files**, **595,586,134 stored bytes**, with **no unlisted retained files** at review time. Reviewer output is in this directory; no bulky evidence was copied into Git.

Independent tools: [replay.py](replay.py), [expected.mjs](expected.mjs), [recover-probe.py](recover-probe.py). Results: [replay.json](replay.json), [expected.json](expected.json), [source-reconstruction.json](source-reconstruction.json), [safety.json](safety.json), [unit.log](unit.log). The replay imports none of the builder's decoding or audit code. It reads raw responses and independently parses the upstream persisted-envelope format.

The replay verifies **557 raw request/response pairs**: 37 phase-0 pairs and 260 per completed grid arm. HTTP status, response hashes, request ordering, named attempts, and grid ownership bindings are checked before those observations are used. All 224 grid native-query records (16 cells × 7 queries × cold/warm) match their raw response row counts, answer digests, and complete runtime trees.

### Phase 0

Recomputed canonical multisets from the actual raw responses, sorting serialized rows while retaining duplicate rows and lexical RDF terms. Each before/after request uses identical query bytes and falls on the correct side of request 20, the rebuild. All eight comparisons are nonempty and equal:

| Query | Before / after response ID | Rows |
| --- | --- | ---: |
| discover | 4 / 22 | 3 |
| base | 6 / 24 | 1 |
| c8base | 8 / 26 | 5 |
| c8edge | 10 / 28 | 5 |
| point | 12 / 30 | 1 |
| optional | 14 / 32 | 1 |
| predicate | 16 / 34 | 2 |
| object | 18 / 36 | 1 |

The copied persisted envelope independently decodes to **1,901,135 inserted + 38,058 deleted = 1,939,193 changes**. The base is one triple. The rebuild response reports successful swap and takes **5,308.984 ms**. These are sampled observations, with several LIMIT queries; they establish neither full-database equivalence nor the 200-read/five-basis Q89i set.

The receipt's executed probe hash is `5b486ae9b5ac86422f383860e223bb8e8c236c99aac68feea26c0a89c6438036`. The builder's retained formatted copies instead hash to `6cd71e8ab680db17c2dca39fbb2b7e6944bef398d25cc6e6b57a7f248f2feb71`. Initial reviewer replay stopped on that mismatch; [replay-attempt1.txt](replay-attempt1.txt) preserves the failure. Subsequent raw-byte replay explicitly records the mismatch rather than adopting the later source.

The reviewer then recovered the original source heredoc from the builder's execution log at command line 5325, shell-decoded it without execution, and obtained the **exact executed hash**. [phase0-probe-recovered.mjs](phase0-probe-recovered.mjs) and `source-reconstruction.json` preserve that recovery and its log hash. This is reconstructed source evidence, not invented original Git proof. It resolves the source-content mismatch for the sampled probe; it does not create a complete original source snapshot.

### Phase 1 injection accounting

For each update, independently parsed the emitted triple lines, required 21 fields per injected assertion, checked assertion-IRI encoding and unique identifiers, and checked the observed operation/difference counts. Every injected update's delta increase equals its emitted triple count. The cumulative counts below reconcile exactly with each prior cell's retained post-C8 delta and the next cell's pre-probe delta. Both arms inject the same numbers.

| Requested filler rung | Actual cumulative filler | M pre-probe / post-C8-P4 delta | U pre-probe / post-C8-P4 delta |
| ---: | ---: | ---: | ---: |
| 0 | 0 | 0 / 26,501 | 0 / 27,745 |
| 10,000 | 10,017 | 36,518 / 62,397 | 37,762 / 62,397 |
| 30,000 | 30,009 | 82,389 / 104,536 | 82,389 / 102,048 |
| 100,000 | 100,002 | 174,529 / 194,810 | 172,041 / 186,102 |
| 300,000 | 300,006 | 394,814 / 405,765 | 386,106 / 400,789 |
| 1,000,000 | 1,000,002 | 1,105,779 / 1,111,132 | 1,100,803 / 1,108,022 |
| 1,500,000 | 1,500,009 | 1,611,121 / 1,615,230 | 1,608,011 / 1,613,364 |
| rebuilt | incorporated in base | 0 / 26,501 | 0 / 28,989 |

The small overshoot comes from completing 21-field assertion rows, not truncating them. All **32 before/after persisted envelopes** independently match their full recorded counts, vocabulary lengths and byte lengths, with magic/version, vector divisibility and EOF checks. Counts include tombstones. All pre-rebuild bases are exactly 10,000,000 triples.

M and U remain synthetic physical-key arms. The trace does not prove M is a production ULID tail under ICU collation or that U is a semantically valid correction stream. Total-delta regressions cannot establish the exact per-block mechanism; update responses' affected-block counts are not exact deltas in the blocks touched by a measured SELECT.

### C8 and P4 content

**C8 checks content, not only counts.** The recorded test hash matches `packages/qualification/test/c8-reads-never-write.test.ts` in the reviewed commit. The test compares exact ancestor/shared-ancestor/self values and exact native closure targets, repeats those reads under load, requires actual reader progress and zero observed read-path updates, and tests a positive write-counter control. All 16 retained logs report one passed test and one skipped test; the runner selects QLever with its integration flag and URL 7071. The skip is the other backend. The measured runner removes reader/load overrides, preserving eight readers and an eight-second window.

The frozen paired C8 SELECTs return **zero rows in every phase-1 cell**. They are not evidence of a nonempty sub-100-ms C8 SELECT on the new seed. The full C8 test creates a fresh separate fixture, so its successful content assertions remain a different, useful diagnostic. Its minimal Vitest logs do not contain replayable raw read answers or the writer latency/throughput console observations; no writer-progress or P1 acceptance is inferred from the test pass.

**P4 source compares complete member multisets.** It sorts actual and expected fact members, compares the arrays and their SHA256 digests, and fails on mismatch at the named seed position 426 and fixed valid time 1700000000000. The reviewer independently regenerated the 20 expected subject multisets using the reviewed world generator, without opening a composition or engine. All **320 recorded actual digests/counts** agree with those regenerated expectations, and every stored p50/p99 recomputes from its 20 timing observations.

The actual decoded member arrays and P4 wire responses were **not retained**. Therefore the reviewer cannot independently recompute those 320 actual digests from observed members. This is a source-checked, same-generator diagnostic supported by stored digests, not an independent oracle replay. The P4 source copy was taken during the run, as disclosed; measured binding files do not have the final runner's stronger P4-script/seed-manifest/Node fields. No later runner metadata is adopted retroactively.

Both final rebuild joins compare equal nonempty raw answer multisets. Both F05 pairs contain exactly `[["\"after\""]]` before and after rebuild. This raw-byte check avoids relying on the measured runner's weaker substring predicate.

## Cost and threshold adjudication

Independent least-squares calculations reproduce the stored cold native-query fits (seven pre-rebuild points per arm):

| Arm / query | Slope ms / million actual pre-probe changes | R² |
| --- | ---: | ---: |
| M / join | 98.632184 | 0.951297 |
| U / join | 23.012793 | 0.802707 |
| M / base | 4.218954 | 0.760151 |
| U / base | 6.116380 | 0.517570 |

These are descriptive fits, correctly excluding rebuilt cells. Cold requests clear the query cache; they do not establish cold OS/file caches. Sequential growth, different C8 write totals, shared-host noise, no repeated cells, and missing exact touched-block counts prevent a causal per-block slope claim. The nominal IID OLS join-slope intervals are M 72.98–124.29 and U 9.90–36.13 ms/M, but IID errors are unestablished here; those intervals are illustrative residual uncertainty, not calibrated experimental confidence.

The builder's isolated-screen arithmetic also reproduces: M baseline sample maximum 273.066 ms gives a 300.372 ms ratio bar; U baseline 289.015 ms gives 317.917 ms. M's N10000 sample is below its bar and N30000 is above. U's N10000 is above but N30000 is below. The quoted 36,518 and 82,389 candidates are subject to F1's coordinate error. If re-labelled to the actual P4 coordinates, the isolated passing points are M 62,397 and U 102,048, relative to already nonzero baselines; they still are not qualified thresholds.

**No positive common threshold can responsibly be stated, even with a numeric confidence interval.** Under the additional unproven monotonicity assumption, M's adjacent observations merely suggest a diagnostic transition between its two tested P4 coordinates, 62,397 and 104,536. U contradicts that assumption at lower cells, so there is no common passing prefix beyond its baseline. Neither arm has a clean zero-delta P4 baseline, repeated subject order/randomized cells, production writer keys, the required complete rung, exact touched-block deltas, or the nonempty paired C8 SELECT criterion.

Each P4 “p99” is the largest of 20 pulls. Even for independent identically distributed pulls, the chance that this maximum reaches the population p99 is only `1 - 0.99^20 = 18.21%`; 299 IID observations would be needed for a 95% upper-coverage maximum. These matched subject pulls are not established IID observations in the first place. The sample maxima are also already above the absolute 25-ms P4 bar at N0. A threshold “with uncertainty” would conceal missing measurement conditions, not resolve them. The report's **none qualified** decision is correct.

## Shared-resident safety

Reviewed the builder execution log, runner/controller sources, engine lifecycle records, captured inspect object, startup scripts and cleanup artifacts. [safety.json](safety.json) binds the log hash and preserves the relevant command excerpts and four `CX-QG1` slot-acquisition events, all for `qlever-s1`.

The executed commands naming `tx2-qlever-dev` are read-only `ls`/`du` inventory, `docker cp tx2-qlever-dev:/data/. .../phase0-copy/`, and two `qlever-index --help` invocations. The copy direction is out of the resident. There is no observed resident UPDATE, rebuild, reset, stop, removal, or copy into its volume. The phase-0 inspect record names container `d0908bba...` / `/tx2-qlever-s1`, holder CX-QG1, private `/data` volume `tx2-qlever-s1-data`, and read-only `/seed` mount pointing at the captured copy. Probe and grid traffic use 7071, not 7070. The actual start script copies seed files into the separate slot volume.

This supports the no-shared-mutation claim within the retained execution trace; an offline review cannot prove the absence of unlogged actions. It does not claim the resident's state stayed unchanged while other agents wrote. The atomic persisted-file rename is confirmed in pinned QLever `DeltaTriples.cpp:648-672`; a whole copied envelope is not a claim of a globally frozen live-resident snapshot.

The final engine override rejects shared residents/other lanes before lifecycle work. Fresh targeted parser/override tests passed **4/4** ([unit.log](unit.log)); these use temporary local configurations, not a live Docker lifecycle. The unseeded default startup expression remains equivalent to the original. The retained cleanup receipt reports absent exclusive container/volume and released ownership. No engine was started, queried, stopped, or reserved by this reviewer.

## Verification and PASS audit

Fresh commands:

```sh
node --experimental-strip-types lab/verify/QG1/expected.mjs /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QG1 <new-expected.json>
node lab/bin/heavy.mjs --label CX-VQG1-replay -- python3 lab/verify/QG1/replay.py /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QG1 <new-expected.json> <new-replay.json>
node --test lab/experiments/EXP-QG1-qlever-generations/delta-count.test.mjs lab/experiments/EXP-QG1-qlever-generations/engine-options.test.mjs
```

Host free space was approximately 15.5 GiB at preflight. Full evidence hashing/replay used the heavy wrapper, including its queue wait; no exclusive engine slot was needed. Attempt 2 completed after recording the source mismatch; the final replay adds explicit input hashes and a clearer statistical field name, retaining attempt 2 separately. No evidence was overwritten or adopted from the builder's failed initial grid attempt.

Every reviewer location that turns observations into a verdict or evidence record:

- `expected.mjs`: writes generated expectations only. Content comes from full generated sorted members; new output required; input scope/basis fixed by the named seed manifest. It asserts no observed-answer PASS.
- `replay.py`: emits `result` only after raw-response hashes, request order, full phase-0 multisets, exact injection counts, snapshots, stored P4 digests against regenerated expectations, and numerical fits have checked. A new output path and current execution timestamps establish replay freshness; source/input hashes, named attempt paths, owner/container bindings and source identities establish the documented binding. It explicitly records the phase-0 retained-source mismatch and does not convert missing P4 raw members or late preimages into verified content.
- `recover-probe.py`: emits a source-reconstruction record only after shell-decoded heredoc bytes match the observed phase-0 receipt hash. Requires new output files; binds exact receipt/log bytes and original command location. It claims source recovery, not original Git proof or engine acceptance.
- `safety.json`: records the named log's hash and command excerpts with holder events. It is a bounded forensic inventory, not an absolute no-action PASS or a live state check.
- `VERIFY.md`: accepts only the diagnostic observations independently checked or explicitly limited above. It does not publish a performance PASS, qualify T, close an outcome goal, or admit phase 2.

No acceptance-pinned path was changed by this review; all reviewer changes are under `lab/verify/QG1/`. Builder change `lab/bin/engine.mjs` is not an input path in the checked-out contract pins; its old/new SHA256 values are `b2bb06172efd2791ec323285998e560ace543a38e022dff489c601d3c879c608` / `9e7f2daf9a52b3d617dbc193f2b2e6dccca7d530175a40ae1c38a16ab0c3e7b2`. No acceptance file, pin or contract version was edited. No implementation fix, dependency install, root `pnpm check`, package tarball check, full P1/GS run, P5 sweep, threshold rerun, generation router, merge or push was performed.

Open work: fix F1 before selecting T; retain actual P4 members/wire bytes with pre-execution source binding; use repeated cells and the real writer trace/key distribution; supply exact touched-block counts and a complete agreed layout/rung; then rerun the missing P1, Q89i and P5 gates. The current evidence is useful calibration, not proof those gates have passed.
