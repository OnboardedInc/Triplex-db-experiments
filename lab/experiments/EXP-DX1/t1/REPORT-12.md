No new v3 verdict is claimed: the prescribed recovery pools have fewer than 500 commits, and the host and disk gates also refuse them.
The ACK accessor now drives every commit bar; the old finish clock remains reported, and saved C/A/F/G/H values reproduce within .001 ms.
Historical H’s ACK tail is 48.242 ms against 50, but its 90% interval [44.342,51.171] crosses the bar; its medium burst is 10.303 [10.111,10.431] against 10.
H’s loaded bands, writer ratios, recovery and lag remain unjudged under the 500-commit rule; they are never promoted by their point estimates.
Four-subject history growth is the default, with matching 1k engine fingerprints at depths 1/3/10 and exact pinned/gateway/replica comparisons.
Early JVM compilation is selected for v3; it gained 3.111 ms at a 250-ms gap beyond .915-ms drift in the full-trace diagnostic, without a warm-up default.
Six CPUs gained 1.616 ms at zero readers, but its loaded gain was within drift and reader capacity fell sharply; eight CPUs stays the default.
The checked-row prototype gained .301 ms against .725-ms drift, so it stays opt-in; no per-fact default is adopted from the CPU micro alone.
Clock-map cleanup, yielding large-body encoding, smaller product cache budgets and writer retention/look-up fixes are built; their individual latency costs remain unpriced.
The 1k/10k exactness and observed 16-GiB fit proofs pass; 100k admission/first-reading tools are built, but two native counters and the requested v3 pairs remain owed.

H context is historical summary tracing, swap 4.017 GiB and loaded Mac CPU median 13.7%; same-session off-before/after ACK p50/p99 are 9.447/43.104 and 9.392/39.894 ms (CPU 12.6/14.7%). These are not controls for part-12 interventions.

| Target | Built / measured result | Evidence / limit |
| --- | --- | --- |
| A | Common receipt ACK; driver all-primary/burst/P4 bars; seeded intervals, counts and fail-closed eligibility; unchanged frozen trace and specified v3 phases; four-subject growth; authorized TARGETS wording. | [Every H bar, counts and intervals](VERDICT-12.md). Exact L256 counts 2,149 (1,261/682/206); L1024 740; recovery 497/497/487/486/474/489/482. No rate/phase relaxation. |
| B.1 | 300 sealed payloads, byte-identical candidate encoding; medium CPU micro 0.9025→0.4825 ms for checked rows, combined .4077. Live row ABBA below rejects adoption. | [PER-FACT-12.md](PER-FACT-12.md). Micro: swap13.773 GiB, Mac CPU351.1→467.0%, not durable latency. Pack/batch/body native A/Bs and gateway parsing are owed. |
| B remainder | Assigned-clock entries consumed once; receipt getter cached; body encoding yields after a synchronous snapshot; 16/8/32/4-MiB product budgets with trace sizes; resend-only copies and O(1) growth lookup. | Benchmark predecessor override remains256 MiB. Growth still on writer; GC-affinity/ledger-isolate trials not done. |
| C | S5 generation-bound ID memo capped2,097,152/512MiB; actual guest admission, one population table, corrected watchdogs, affected baseline windows, quiet cache metrics and first-reading script. | [READINESS-12.md](READINESS-12.md). Exact adoption boundaries and independent gateway storage reads unavailable; index-job/tx-with statistics are not substitutes. No 100k run. |
| E | Two confirming v3 pairs not admitted. | Gate: swap12.209GiB, Mac CPU median30.9%, elevated pressure/busy apps; free19.730GiB vs47-GiB spill reservation; required recovery pools under500. Exit75, no containers. |
| D | F/H original seals checked: 33/15 ACKs over100ms plus2/1 unioned scheduler stalls; F35 guest clock steps, H0; per-stall Mac alignment unqualified. | [51 rows, I/O and limits](STEADINESS-12.md). Whole-arm swap-out deltas0; coarse overlap is not cause. Root-image WAL/discard-off experiment owed; default unchanged. |
| F | E6 completed; full 8/6/8 comparison rejected six; compilation events observed and early thresholds selected. | [COLD-12.md](COLD-12.md), [CPUS-12.md](CPUS-12.md). Finite5000-prefix trials had RYOW carry-over; clean post-warm-up gap-order comparison owed. No warmer/sentinel built or enabled. |

All new native timings below use ACK/summary, early compilation, current layout, strict server clock and `pending` split reads. Controls are within each listed session; Mac context is whole-arm, never an exact guest-phase join.
| CPU arm | zero primary p50/p99 ms | loaded primary p50/p99 ms | L256 all-commit p50 ms (n46) | zero swap GiB / CPU%; loaded swap / CPU% |
| --- | --- | --- | --- | --- |
| 8 before | 9.914/123.192 | 10.383/129.465 | 14.655 | 11.833/32.5;11.348/36.6 |
| 6 candidate | 8.266/122.402 | 8.504/121.834 | 12.799 | 12.193/47.8;11.872/51.9 |
| 8 after | 9.851/60.589 | 10.362/65.521 | 12.735 | 12.760/31.3;12.619/32.1 |
Zero median gain/drift1.616/.063ms; loaded .896/1.920ms. L256 goodput36,215/16,722/39,480 pulls/s; G256/G64 .896089/.807517/.943350 (bar≥1, all point misses). Read p99 8.063/16.639/7.359ms.
Whole-machine P4 17,821/21,154/18,320 correct weighted pulls/s exceeds4,400; flatness1.0294/1.0000/1.0735 meets1.1. All loaded all-primary tails miss50ms. Sparse write/recovery/lag bars stay unjudged; engine-byte flatness unknown. Full counts/intervals are in CPUS-12.
The three loaded diagnostic pairs have49,952,272 correct model reads, zero errors, and three oracle PASS results (53 sampled reads each, zero mismatches, exact receipts). They are not substitutes for E. Sampled guest headroom≥4.531GiB and OOM counters0; 293 source preimages and all six raw7408-command ACK cohorts checked.

| Row ABBA / summary, zero readers | ACK p50/p99 ms | swap GiB / Mac CPU median% | same-session control |
| --- | --- | --- | --- |
| baseline before | 9.070/44.876 | 12.549/27.5 | baseline bookend |
| row candidate1 | 9.079/51.615 | 12.502/31.5 | mean bookends9.433/58.817 |
| row candidate2 | 9.184/48.636 | 12.478/27.1 | same |
| baseline after | 9.795/72.759 | 12.392/30.8 | closing bookend |
P50 gain.301/drift.725ms; p99 gain8.692/drift27.883ms: neither exceeds drift. All four3420-command arms are DONE with exact model/RYOW reads; oracle NOT-RUN for zero readers. The original report-only control-selector failure was fixed and replayed on sealed bytes, not rerun measurements.
Early compilation: full level, threshold0.1, swap13.452GiB/CPU211.9%; adjacent plain controls13.360/225.9 and13.421/191.4. At100/250/500/1000 ms gaps service gains3.314/3.111/3.528/5.184ms versus drift.753/.915/2.045/.674; n=150 each, diagnostic/unjudged. At50ms it was worse; no loaded extrapolation. Effective flags and JFR events checked.
The supplied cold investigation attributes a 1-s pause’s test-bed cache cost1.8ms to writer 0.7/messaging 0.5/transactor 0.3/gateway+HTTP 0.3, plus storage 0.7 ms; these were not newly remeasured or masked here. F3 remains unqualified because858/1995 sampled prefix RYOWs crossed into gap measurements.

Validation: current Datomic354 passed/52 external skips; earlier unchanged core861 passed and all-fast-path Datomic346/51; builds/declarations/types passed. Native-d: full1k grouping,200k differential/4994 writes/zero differences, then oracle PASS. [Gate scopes and retained failures](CHECKS-12.md), [content/freshness/binding audit](AUDIT-12.md).
The first grouping gate’s transport timeout and paired empty-settle finalization failure were fixed without relaxing the60s index criterion, extending a phase, or inventing observations. Captured pathological GC attribution fell2082/2238→8.111/3.860ms with identical output; full render16.377s. This saves report time, not commit time.
Disk: failed uncited raw spill/captures compressed losslessly with decoded SHA checks; free19.678→22.666GiB,18.636GiB after the final trial. Raw evidence stays private. Only `lab/TARGETS.md` moves an authority-pinned path: full old/new SHA256 and the already-lagging authority pin are in [PINS-12.md](PINS-12.md); acceptance unchanged.
Still owed: sanctioned recovery-count correction; two gated v3 pairs; isolated pack/batch/body and loaded row trials; gateway parser; exact adoption/peer-I/O counters; clean finite-warm-up gap study; root-WAL diagnostic; remaining writer offload/GC work. No keep-warm mechanism,100k run, push or foreign cleanup.

```sh
node --import tsx lab/bench/rescore.ts --run OLD --baseline ZERO --output NEW.json --clock finish --windows legacy
bash lab/experiments/EXP-DX1/t1/v3.sh tx2-dxt1-next-v3  # refuses current sparse plan/host/disk
node lab/bin/heavy.mjs --label DX-T1 -- bash lab/experiments/EXP-DX1/t1/cold-study.sh six-loaded tx2-dxt1-next-cpus
DX_COMPILER_POLICY=early node lab/bin/heavy.mjs --label DX-T1 -- bash lab/experiments/EXP-DX1/t1/session.sh perfact-row-floor tx2-dxt1-next-row
bash lab/experiments/EXP-DX1/t1/first-100k.sh --plan  # no 100k execution in this task
```
Canonical outputs: `~/Claude/Projects/triplex-db-2/evidence/DX-T1/<tag>/` (trace.html, Chrome JSON, trace/raw, tables); committed small run reports/indices/seals under `t1/runs/`. [Evidence and reproducible checksums](EVIDENCE-12.md). No root-check/pack PASS is claimed.
