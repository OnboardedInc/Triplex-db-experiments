# Post-batch persisted public-call characterization — complete raw handoff

Recorded 2026-10-30; final interpretation: **measured evidence and independent
recorded-data/derivation closure complete; residual regression signals unresolved.**
This is not item-2 acceptance, full speed recovery, complete storage performance,
a native-only experiment, or a universal speed claim. No source patch or timed
rerun was made after the campaign. All raw outcomes, including warmups, are retained.

## Findings

1. A, same native artifact: proposed versus hardened8b improves float256 paired
   medians by about 11%, and wide-float by about 24%. The empty `query_json`
   paired ratio is 1.0519 [1.0169, 1.0901], a declared investigation signal.
2. B, accepted item1 pair versus proposed item2 pair: residual descriptive signals
   remain for float256 `query` 1.0562 [1.0209, 1.0805], `query_json` 1.0850
   [1.0499, 1.0988], tiny-float JSON 1.0550 [1.0127, 1.0704], and wide-float
   query/JSON 1.1208/1.1191. These are not reclassified as recovered.
3. In separately instrumented profiles, proposed FE control reads are flat at
   6/query and 7/query_json for all seven shapes, including F=0,1,16,256,1024;
   hardened8b has 2F+2/query and 2F+3/query_json, accepted item1 zero reader calls.
   Counts support the batching mechanism; they do not prove an exclusive cause.
4. Every 168 campaign child process and all 11,760 outcomes passed captured exact
   rows/f64 bits/full counters/snapshot checks. Root independently rejoined the
   complete recorded provenance and exactly reconstructed all 1,176 paired rows,
   28 centres/CIs/round and load strata. The original downstream analyzer omission
   remains documented in [ROOT-CLOSURE-ADDENDUM.md](ROOT-CLOSURE-ADDENDUM.md).

## Frozen identities and admission

- Candidate PR head `ffc5241a13a6056c6f93b7f8342d9a44b32c0c1a`, prototype tree
  `06b32be1e5b229a31deb644a53af498ed53b3e15`, root tree
  `f37f4d2b9dd927828168a05cd20549d3f09d3bcf`, durable correctness checkpoint
  `ca9ce60e0fab8c2e06fa86950cc0421d671b38bc` supplied by coordinator.
- Candidate clean export manifest `eb52a0acd82a49d82e03c633793b8337e9c9c94cbab73a580227d3ec78e81b04`;
  all 267 entries verified before/after. Only the exact manifest and relevant
  first-party confined storage closures are published, not the full vendor mirror.
- Candidate typed store `25e9a4f178144070f85cbf1215dd1e12270ae0efbdd27be1dbf49ba9e76dcfdc`;
  unchanged FP reader `facfc51b6f42a21019d70fef05b2c813e3f6f81e53587c3b80bb09a1b26dfd5c`.
- Hardened wrapper `abe7424366b9d528fa1378c8e9d5f12e7f4e80d93a1c433712a76d916760c555`;
  accepted wrapper `7135d22e2da65717b51c4a511c3b5c6642e9c28b966ec92aca1756aa06782de6`.
- Item2 extension `480456248ffa53e453d41737a37cc2a2d54764ffbd449b9e6ea95f3d805d68b4`;
  accepted item1 extension `5b661f3843799cb97b5c7458f503eca9fefd0f58beb053bf22c740c05cb6270d`.
  Approved immutable originals were not overwritten; each confined source variant
  uses its fixed sibling `engine/build` artifact without ROOT/cap monkeypatches.
- Preparation43 manifest `89677d9140025972962530ac528883e80c1230d9a11bdc1a1f3e672eba830bea`;
  frozen study61 `357664ce0a6af25efc171f5687e917cf4cc4ffd2d37ea580bfc6e89ac4119a0a`;
  supplemental49 `a7ad6bae4fa956be81b4106830ea5ec5b60f001b7baaffcd686f2c344abcbbe8`;
  candidate admission `ad9bfc675cb9e335c1f189dcca58149068ebfa646e53ab26adb4c5c33006c1cb`.
- Four actual untimed role preflights × 14 controls = 56 exact public outputs,
  full rows/float bits/counters/snapshot metadata; no durations collected there.
  Preparation has 39 source-only adversarial checks and admitted-gate controls
  retain 16 further denials. All intentional failures/exit/stderr are preserved.
- Root separately created execution gate `ec59a66bebaf3902ad64798d7fef17454594c7473c7cfab80482275790acc469`,
  effective 23:30:30 UTC, only after correctness/admission/freeze review. Historical
  preflight/pending status receipts are retained as originally written, not updated.

## Method and exact endpoint

Same closed physical template: 320 facts/10 commits, bytes 4,206,592, SHA
`9a22f33e305134cb05f52cb4829039e14869073c76075042f9c7146208621183`;
logical history checksum `2fe50bd9fa8cd1a29fea8633241b602f6635f3235fd15f4f179489d76e31d642`.
Valid snapshot 10/known_at default resolves 10. This is the original physical
history, not a regenerated dataset. Setup/import/copy/open occurs outside the
public-call interval and is separately recorded in every process.json. There are
no timed writes/ingestion/migrations/durability tests. Caps, natural source ROOT,
normalization and all public admission/FP guards remain enabled and unchanged.

Each comparison uses 42 paired units (2 rounds × 21), 84 fresh separate processes,
sequential A then B. Balanced both first-load orders; random shared control order
within each pair; 14 controls (7 shapes × genuine public query/query_json).
Each process has 2 warm sweeps and 3 measured sweeps: 70 outcomes, 42 measured.
Total A+B: 11,760 outcomes = 7,056 measured + 4,704 warmups. One recorded attempt
per comparison; zero campaign timeout/failure/retry. The initial workdir/preparation
failures and intentional negative controls are retained, not counted as timings.

Each public-call interval is literally `t0=perf_counter_ns(); result=fn(request);
elapsed=perf_counter_ns()-t0`. **Python assignment may dispose the previous
`result` before the stop clock.** The method includes its own public guards,
validation/normalization, native invocation, fetch/result processing and JSON
formatting as applicable. The benchmark's external normalize/bitpacking/checksum
verification occurs **after** the stop clock. Shared control order limits but does
not remove previous-result lifetime/GC interactions. This is public call-return/
assignment latency, not a pure native or isolated method-body cost.

Ordinary Python 3.12.14, genuine pinned DuckDB 2.0.0/d54cbbe3df, same verified native
module, CPU8 affinity, DuckDB threads1, GC enabled, default supported FP state.
Actual optimize0/debugtrue/PYTHONOPTIMIZE0 and register snapshots recorded perprocess.
No exclusive CPU, host governor change, or complete environment isolation claim.
Root/other lanes held builds/native/DB/compression during the authorized quiet
window; only light static reads were coordinated. Source/runtime/template pins
and every stdout/stderr/process outcome remain in the bundle.

Per-process median of three technical repetitions becomes one paired ratio;
42 paired ratios are the units for the seeded 20,000-resample percentile interval.
Both rounds/load-order strata retained. No 7,056-independent-observation claim,
trimming, minimum selection, comparison pooling or prior-study sample pooling.
The predeclared investigation screen is median >1.05, lower CI >1, and both round
medians >1. This is an investigation convention, not a universal pass budget.
A 'not triggered' row is **not equivalence/no regression**; several sub-5% estimates
have intervals wholly above 1. Intervals are descriptive percontrol, not a
family-wise or cross-host guarantee. Ratio >1 means proposed is slower. Baseline/
proposed absolute medians are descriptive marginal medians, not the paired ratio.

## A — hardened8b+480456 → proposed+same480456

This isolates the selected wrapper implementation pair, **not only one tiny codec
function**: the change also includes Query snapshot/shared validation/private batch
work. Source first-party closures are published. Native bytes are fixed.

| Control | Rows/F | Baseline ms | Proposed ms | Paired ratio [95% interval] | Round 1 / 2 | First-load stratum ratios | Screen |
|---|---:|---:|---:|---|---|---|---|
| float256-query | 256/256 | 4.1401 | 3.6440 | 0.8901 [0.8613, 0.9166] | 0.8954 / 0.8898 | hardened8b=0.8898; proposed=0.8903 | not triggered |
| float256-query_json | 256/256 | 4.1246 | 3.7358 | 0.8869 [0.8577, 0.9315] | 0.8717 / 0.8923 | hardened8b=0.8923; proposed=0.8815 | not triggered |
| mixed64-query | 64/16 | 2.4406 | 2.4240 | 0.9959 [0.9610, 1.0392] | 0.9648 / 1.0059 | hardened8b=1.0003; proposed=0.9897 | not triggered |
| mixed64-query_json | 64/16 | 2.4527 | 2.4541 | 1.0007 [0.9809, 1.0461] | 1.0009 / 1.0005 | hardened8b=1.0330; proposed=0.9947 | not triggered |
| empty-query | 0/0 | 2.0391 | 2.0753 | 1.0056 [0.9629, 1.0641] | 1.0233 / 0.9898 | hardened8b=0.9898; proposed=1.0607 | not triggered |
| empty-query_json | 0/0 | 1.9296 | 2.0467 | 1.0519 [1.0169, 1.0901] | 1.0557 / 1.0516 | hardened8b=1.0355; proposed=1.0522 | SIGNAL |
| no_float64-query | 64/0 | 2.2373 | 2.3321 | 1.0348 [0.9806, 1.0760] | 1.0380 / 0.9991 | hardened8b=1.0019; proposed=1.0545 | not triggered |
| no_float64-query_json | 64/0 | 2.2010 | 2.3297 | 1.0447 [0.9992, 1.1175] | 1.0652 / 1.0365 | hardened8b=1.0365; proposed=1.0652 | not triggered |
| tiny_float1-query | 1/1 | 2.0080 | 2.0376 | 1.0085 [0.9762, 1.0454] | 1.0102 / 1.0068 | hardened8b=1.0068; proposed=1.0102 | not triggered |
| tiny_float1-query_json | 1/1 | 1.9650 | 2.0538 | 1.0184 [0.9925, 1.0850] | 1.0029 / 1.0292 | hardened8b=1.0076; proposed=1.0498 | not triggered |
| tiny_no_float1-query | 1/0 | 2.0283 | 2.0774 | 1.0491 [1.0115, 1.0795] | 1.0217 / 1.0626 | hardened8b=1.0427; proposed=1.0626 | not triggered |
| tiny_no_float1-query_json | 1/0 | 2.0221 | 2.1199 | 1.0242 [0.9708, 1.0817] | 0.9853 / 1.0321 | hardened8b=0.9701; proposed=1.0541 | not triggered |
| wide_float256-query | 256/1024 | 10.0548 | 7.7717 | 0.7572 [0.7397, 0.8045] | 0.7563 / 0.7581 | hardened8b=0.7521; proposed=0.7686 | not triggered |
| wide_float256-query_json | 256/1024 | 10.1200 | 7.8147 | 0.7619 [0.7442, 0.7947] | 0.7821 / 0.7480 | hardened8b=0.7736; proposed=0.7588 | not triggered |

## B — accepted item1+5b661 → proposed+480456

This compares whole approved version pairs with different feature/native versions;
no exclusive Python/native causal attribution follows from B.

| Control | Rows/F | Baseline ms | Proposed ms | Paired ratio [95% interval] | Round 1 / 2 | First-load stratum ratios | Screen |
|---|---:|---:|---:|---|---|---|---|
| float256-query | 256/256 | 3.4267 | 3.6226 | 1.0562 [1.0209, 1.0805] | 1.0392 / 1.0602 | accepted-item1=1.0746; proposed=1.0392 | SIGNAL |
| float256-query_json | 256/256 | 3.3056 | 3.5699 | 1.0850 [1.0499, 1.0988] | 1.1035 / 1.0509 | accepted-item1=1.0880; proposed=1.0783 | SIGNAL |
| mixed64-query | 64/16 | 2.3984 | 2.5116 | 1.0360 [1.0077, 1.0820] | 1.0615 / 1.0285 | accepted-item1=1.0615; proposed=1.0248 | not triggered |
| mixed64-query_json | 64/16 | 2.4027 | 2.4938 | 1.0235 [0.9902, 1.0550] | 1.0186 / 1.0284 | accepted-item1=1.0284; proposed=1.0125 | not triggered |
| empty-query | 0/0 | 1.9402 | 1.9924 | 1.0436 [0.9989, 1.0627] | 1.0432 / 1.0533 | accepted-item1=1.0627; proposed=1.0223 | not triggered |
| empty-query_json | 0/0 | 1.9741 | 2.0833 | 1.0419 [1.0029, 1.0724] | 1.0394 / 1.0596 | accepted-item1=1.0394; proposed=1.0444 | not triggered |
| no_float64-query | 64/0 | 2.1636 | 2.1998 | 1.0265 [1.0014, 1.0510] | 1.0130 / 1.0522 | accepted-item1=1.0285; proposed=1.0130 | not triggered |
| no_float64-query_json | 64/0 | 2.1275 | 2.2104 | 1.0206 [1.0095, 1.0624] | 1.0191 / 1.0310 | accepted-item1=1.0367; proposed=1.0162 | not triggered |
| tiny_float1-query | 1/1 | 1.9463 | 2.0049 | 1.0478 [1.0031, 1.0648] | 1.0528 / 1.0293 | accepted-item1=1.0528; proposed=1.0095 | not triggered |
| tiny_float1-query_json | 1/1 | 1.9911 | 2.0655 | 1.0550 [1.0127, 1.0704] | 1.0525 / 1.0576 | accepted-item1=1.0436; proposed=1.0643 | SIGNAL |
| tiny_no_float1-query | 1/0 | 2.1007 | 2.0606 | 0.9996 [0.9661, 1.0283] | 1.0016 / 0.9976 | accepted-item1=1.0025; proposed=0.9900 | not triggered |
| tiny_no_float1-query_json | 1/0 | 2.0060 | 2.0375 | 1.0317 [1.0003, 1.0622] | 1.0399 / 1.0007 | accepted-item1=1.0489; proposed=1.0164 | not triggered |
| wide_float256-query | 256/1024 | 6.8000 | 7.6575 | 1.1208 [1.1000, 1.1761] | 1.1196 / 1.1438 | accepted-item1=1.1074; proposed=1.1438 | SIGNAL |
| wide_float256-query_json | 256/1024 | 6.7581 | 7.6015 | 1.1191 [1.0966, 1.1509] | 1.1211 / 1.1120 | accepted-item1=1.1199; proposed=1.1183 | SIGNAL |

## Separate profiles — function counts and seconds diagnostic only

Three fresh profile processes, 14 controls each, 2 warm and 5 profiled calls each:
294 exact public results, 210 profiled/84 warm. Full per-function primitive/total
calls, self/cumulative **profiled seconds**, plus top-40 text are retained in every
`runs/profiles-*/CONTROL.json/.txt`. Profile seconds are not uninstrumented latency,
should not be subtracted from public timings, and are not exclusive-cause proof.

| Control | F | Accepted item1 reads/call | Hardened8b reads/call | Proposed reads/call |
|---|---:|---:|---:|---:|
| float256-query | 256 | 0 | 514 | 6 |
| float256-query_json | 256 | 0 | 515 | 7 |
| mixed64-query | 16 | 0 | 34 | 6 |
| mixed64-query_json | 16 | 0 | 35 | 7 |
| empty-query | 0 | 0 | 2 | 6 |
| empty-query_json | 0 | 0 | 3 | 7 |
| no_float64-query | 0 | 0 | 2 | 6 |
| no_float64-query_json | 0 | 0 | 3 | 7 |
| tiny_float1-query | 1 | 0 | 4 | 6 |
| tiny_float1-query_json | 1 | 0 | 5 | 7 |
| tiny_no_float1-query | 0 | 0 | 2 | 6 |
| tiny_no_float1-query_json | 0 | 0 | 3 | 7 |
| wide_float256-query | 1024 | 0 | 2050 | 6 |
| wide_float256-query_json | 1024 | 0 | 2051 | 7 |

## Chronology, closure and prior studies

A 23:31:11–23:32:12 UTC terminal PASS; B 23:32:51–23:33:51 UTC terminal PASS,
started only after A. Three profiles 23:34:22–23:34:24; original frozen analyses
23:35:10–23:35:15. All calls terminal before 23:35:15, with no source/raw mutation
or timed retry after a static downstream analyzer gap was reported. Captured
controller commands, start/end timestamps and one-attempt ledgers remain primary.
See root closure addendum for 53 closure negatives, two optimized denials, 140
altered-statistic negatives and 19 supplemental exact-JSON-type/range negatives.

The earlier 1.27× float-path observation, native v1 diagnostic, native v2 selected
study, and unchanged-source profiles remain separate, byte-exact in prior 961-file
publication manifest `ea19c83d4cbe64a19c45192612c542b000a828f0684c4858df193d7bfc524355`. The present bundle references that existing
publication and includes original persisted summaries as context; it does not
replace/reclassify/pool those studies. The original preparation55 closure likewise
remains byte-exact under `curated-preparation/`.

## Limits, publication and next action

The same physical small history is intentionally narrow: no large-history/write/
concurrency/storage-wide extrapolation. Captured checks are strong integrity and
recorded-process evidence, not retrospective independent kernel/OS observation.
Mechanism counts do not identify an exclusive cause of residual latency. Full
speed recovery and item-2 acceptance are **not** established. Coordinator will
renew focused primary-source research on residual cost before any proposed fix;
this lane will not patch sources or repeat timings without new authorization.

`INDEX.md` maps the complete source-only handoff. `SAFE-EXCLUSIONS.json` records
excluded runtime DBs/binaries/vendor mirror; originals remain locally unchanged.
Every selected file is strict UTF8 without NUL bytes; complete raw measurements,
full profiles (including diagnostic seconds), analyses, negatives, gates, admission,
source closures and captured progress are included. Source-only publication does
not pretend to be runnable without separately provisioned exact approved runtime,
physical template and artifact binaries. No Git/PR/Page/production source write
or Codex task occurred in this lane. No processes or quiet-window reservation remain.
