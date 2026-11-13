# DX-T1 observation audit

North star: P2 latency under 256 readers. No acceptance contract, seed or semantic oracle is changed.

## Observation-to-result sites (preamble 9a)

| Site | Content check | Freshness check | Binding check | Meaning |
| --- | --- | --- | --- | --- |
| `lab/trace/report.mjs` `complete` | validates interval shapes and declared JFR bytes/export counts/SHA256; requires Mac/VM/Postgres collectors, writer trace IDs and every Node drain footer; reports missing data | unique run directory; timestamps compared with run start and final benchmark time | every record must match run/source/slot; worker/server descendants match each exact sending span; missing RPC receivers are errors | trace collection completeness only; never oracle PASS |
| `lab/trace/report.mjs` coverage numerator | exclusive interval union, unknown retained; truncation in any causal child excludes coverage numerator | only this attempt's matched roots | same trace ID and parent span; writer denominator checked separately | reported fraction, not a promoted verdict |
| `lab/bin/trace-store.mjs` `archive` | SHA256 reread of every copied destination file before source removal | exclusive destination; existing destination refused | catalog names the raw tree and run tag; reports remain | byte-verified local movement only |
| `lab/trace/finalize.mjs` output/exit | runs the report checks; gzip/parser/collection errors are retained | fresh raw filenames and footer required | run/source/slot manifest; hashes every raw file | nonzero on incomplete tracing; does not certify semantics |
| `lab/trace/cost.mjs` matched-cost output | DONE, complete seed, every background command committed; full arms require trace collection; actual level checked | new arm directories; source and producer-level manifests | identical code hash, frozen-trace digest, command counts, strict/local/200-second configuration | observed quantile changes only; no causal overhead PASS |
| T1 entrypoint frozen oracle copy | compares each file with Git object bytes; mismatch aborts | comparison repeated before each admission; historical source is deliberately immutable | fixed O-REPLAY commit and per-file SHA256/length manifest | executable-source verification only |
| Existing bench oracle/bar verdicts | unchanged comparators and expected-state inputs; wrappers preserve return/errors | existing gates retain their original attempt rules | existing source/receipt binding untouched | no new semantic PASS implementation |

`TRACE-REPORT.md` is generated from observations, including unknowns. Independent review still decides promotion.
The builder's unit/smoke/benchmark results are execution evidence, not independent certification.

## Pinned paths

A literal path scan of the sealed acceptance JSON/Markdown/Python/SHA256SUMS references found 0 changed pinned paths.
The acceptance files are unchanged. Old/new SHA256 values below are for review; no pin is updated here.

| path | base SHA256 | new SHA256 |
| --- | --- | --- |
| none | n/a | n/a |

## First failures retained

- `tx2-dxt1-smoke-a`: gateway reader-form error, no benchmark; raw output and automatic incomplete report retained.
- `tx2-dxt1-smoke-b`: preflight JVM initial/max heap mismatch, no benchmark; retained separately.
- `tx2-dxt1-smoke-c`: oracle PASS, 2,073,483/2,073,483 exact reads, but launcher shutdown lost JFR; Mac swap was denied.
  Its historical `complete:true` covered only Node trace checks in that source revision. It is not evidence of all-layer
  collection. The next source explicitly requires fresh, SHA256-bound JFR exports and the system collectors.

- `tx2-dxt1-smoke-d`: JFR startup option conflict (`filename` with `dumponexit=false`), before the benchmark.
  The controller died before cleanup. Recovery retained the startup log, removed only this prefix's resources, verified
  `recovery-remaining.txt` was empty and then removed its dead-owner lock. No latency or semantic result is claimed.

## First 10k pair and measurement corrections

- `tx2-dxt1-q8-a`: both 10,000-subject arms reached DONE; ladder oracle PASS and 2,799,041 exact reads, zero differences.
  The inherited 43-minute watchdog interrupted the automatic ladder renderer after all containers/volumes were removed.
  Raw traces are intact. A render-only recovery validates those original bytes, preserves prior derived revisions and
  keeps the original producer hash `c4c5b598`; this is not a new run or an independent promotion.
- The report now indexes timestamped events and sorts span candidates once per request. GC overlapping a peer wait stays
  an ambient overlay; it is not charged to TypeScript/gateway own work. Exact top-20 read retention is tested even below
  50 ms. New direct-client scopes include encoding/decoding; long synchronous scopes identify contention on other traces.
- Fresh `smoke-g` and the full `q8-b` pair completed on producer `0c1fa43b`; default full tracing was source-frozen.
  The normal package suite after the separate summary-retention fix has 187 passed, 51 skipped and nine tracing tests.

Worker RPC context now binds source/run/slot and the exact sending span across probe, replica and side/observer workers.
A real Worker test checks continuation and foreign-attempt rejection; a missing receiver makes the report incomplete.
Explicit RPC wait is partitioned by child spans; other event-loop readiness remains unmeasured, never inferred from GC overlap.
Off controls generate an explicit disabled view and index row, without a collection completeness claim.

- `tx2-dxt1-smoke-f`: full collection validated (88/88 coverage, 1,780,569 exact reads), but the independent oracle
  was ORACLE-ERROR because its executable root was misconfigured as an empty output directory. This is not semantic PASS.
  The T1 entrypoint now materializes the exact frozen O-REPLAY commit into its owned evidence tree and verifies every byte
  before admission; its 26 existing historical source files matched that commit exactly.

## Fresh default-level execution

- `smoke-g`: DONE, oracle PASS (50 reads / 2,953 entities), 1,860,191 exact reads; 84/84 commits covered.
- `q8-b`: both arms DONE with automatic finalization, no render recovery; source `0c1fa43b93562e3774b09e18c9e351decc0741da`.
  Ladder oracle PASS (53 reads / 2,671 entities), 3,534,578 exact reads, zero differences/errors.
  Writer trace matches 8,542/8,542; 8,540/8,542 meet 95% named-scope coverage (99.9766%); zero missing RPC receivers.
  Zero-reader arm: 8,532/8,533 coverage (99.9883%); oracle deliberately NOT-RUN there. All collectors validated.
- Combined compressed raw traces: 160,511,433 bytes (153.075 MiB). Every owned container/network/volume inventory is empty.
  The viewer was opened offline: filters, hover and overlays worked; no network requests or JavaScript errors.
- `cost-a`: off/full/full/off, four fresh 10k arms, 3,420 primary commands each, same source and frozen trace.
  Mean arm p50 14.860 -> 18.351 ms (+3.491 ms, 23.495%); p99 85.162 -> 103.610 (+18.448, 21.663%).
  This misses the cost aim. Combined overhead is not causally split among Node, gateway, JFR and PG logging.
  Both full arms have 3,711/3,711 traced commits covered; off views say disabled, not complete.
- Host quiet checks passed before/after q8-b and cost-a, but timestamped OS activity exceeded the heuristic in some phases.
  The reader client saturated in q8-b. These are diagnostic observations, not clean latency acceptance or promotion.
- After those measurements, summary was tightened to keep every commit step, including /begin and worker contexts.
  Default full behavior is preserved; the new summary revision has unit tests; its own fresh smoke is next. No 10k summary cost is claimed.
