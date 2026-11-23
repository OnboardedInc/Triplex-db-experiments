# Live-first fair import on bench 4, November 23

**North star P8: an import beside live accounts at 3,000 facts/s or more, with every live account's read and save p99 within 1.5× of its matched baseline (the quiet account may instead hold its loaded commit at 50 ms).** [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

LOAD2 `fcd416793` (`load1/NEIGHBOURS-SERVER.md`): rolling 6, one importer credit, the yield rule, 32- then 40-fact frames, one fresh copy of the template, WAL on the second NVMe. Run from 18:12:48 to 18:46:54 UTC. Its stack-level dry run was ADMITTED twice. **Exactness held in both arms:** `importGrantsBesideLiveQueue` was 0, the yield rule held back 16,841 and 37,565 times, and the launcher completed with exit 0. [Builder's predictions](PREDICTIONS.md) · [Reading tool](https://github.com/OnboardedInc/Triplex-db-experiments/blob/fcd416793/lab/experiments/EXP-DX1/load1/neighbours_reading.py)

## Against the forecast

| Measure | Yield 32, forecast | Yield 32, measured | Yield 40, forecast | Yield 40, measured |
| --- | --- | ---: | --- | ---: |
| Verified facts/s, whole (second half) | 2,920 (2,740); 2,750–3,100 | **3,059 (2,752)** | 3,330 (3,140); 3,100–3,550 | **2,553 (2,231)**, below range |
| Busy save p99, whole, worst account | 65–75; 45–110 ms | 62.4 ms | 75–90; 50–130 ms | 163.3 ms, above range |
| Busy save p99, second half | about 78; 50–110 ms | 103.7 ms (worst account 111.3) | about 86; 55–130 ms | **336.9 ms** (worst 340.4) |
| Quiet loaded commit p99, whole | about 45; 38–55 ms | 37.9 ms (alone 23.8) | about 52; 42–60 ms | 45.9 ms (alone 9.3) |
| Worst read ratio, whole | at most 1.4× | 1.23× | at most 1.4× | 1.35× |
| Slowest 1% within 6 s of an adoption, second half | 50–80% | **1%** | 50–80% | **0%** |
| Slowest 1% share waiting for a credit, second half | under 60% | 88% | under 60% | 94% |
| Index adoptions per import cell | 9–11 | 11 | 11–13 | 9 |

**Against the bar.** Yield 32 met 3,000 facts/s over the whole window (3,059) but not in the second half (2,752). Its quiet account stayed under 50 ms (37.9 ms). Its busy second-half ratio is 8.18× against a clean 15.0 ms second-half baseline, so the 1.5× bar is missed. Over the whole window its busy ratio reads 0.09× only because the control cell's first half had a cold spell (busy p99 704 ms). Yield 40 missed both the rate and the busy bar.

**Falsifier 1 fired for yield 40:** its second-half busy p99 was above 150 ms. **Falsifier 5 fired for both arms:** fewer than 40% of the slowest 1% fell within 6 s of an adoption while the tail stayed above 60 ms. Something other than the post-adoption spell sets the second-half tail.

## What sets the second-half tail: transactor ZGC allocation stalls at the next index job's start

The reader lists every single-writer stall of 100 ms or more and the collector stalls that end inside it.

- **Yield 32, import cell.** Busy saves stalled 173, 254 and 246 ms at 164.6, 191.3 and 218.2 s. Each came 7.2–7.5 s after an adoption, which is the start of the next index job. In each, ZGC allocation stalls of 166–251 ms ended inside the stall on the writer, indexer, log and other threads. The writer thread had 4 allocation stalls (659 ms in total, max 246 ms). The slowest 1% then waited for a credit for 166 of their 189 ms.
- **Yield 40, import cell.** The same pattern: 373 and 176 ms at 221.5 and 254.3 s, 7.4 s after adoptions, with allocation stalls of 172–361 ms inside them.
- **The control cells show it without any import.** Yield 40's control second half has a busy p99 of 203.5 ms. Its writer had 7 allocation stalls (2,177 ms in total, max 520 ms), at 80–82 s after adoptions. Yield 32's control had a 226 ms writer stall.
- **The post-adoption spell (spell A) is still there but no longer sets the tail.** A frame's first apply after an adoption took 27.9 ms (32 facts) and 42.2 ms (40 facts) on average, with 56 and 89 SQL reads per frame in that first second, falling to 0.00 and 0.40 after 15 s.

This settles the open question in `NEIGHBOURS-SERVER.md` §8.1: **the job-start stalls (spell B) are ZGC allocation stalls on the transactor's heap.** The yield rule removed most of the credit-queue amplification of spell A. That rule is the reason the first half of yield 32 ran at a 41 ms busy p99 with 3,365 facts/s. What remains is collector stalls, which the yield rule cannot reach. The builder's own next step names the heap: test the 48 GiB heap in the fewer-index-jobs arm.

## Not established

- **Autovacuum and WAL rate in the measured window.** This run's evidence does not hold the PostgreSQL server log. Only the last 80 log lines reached `unit.log`, at teardown, and there is no `pg_stat_wal` sample. `log_autovacuum_min_duration=0` was set, so the log would have shown any vacuum, but it was not kept. This copy of the never-vacuumed template was started with autovacuum on (the default). Bench 4 samples `pg_stat_progress_vacuum` and the WAL position every 10 s from the next fresh-copy run on.
- **The optional third arm** (memory index 512m/1536m, `b847b5480`) was not run.

## Evidence

On the Mac: `evidence/DX-BM1/bench4/bench4-fair-yield/` holds `summary.tar.zst` (3,474,588 bytes) and `raw.tar.zst` (103,073,017 bytes, 75 files), checked member by member against `TRANSFER.json`. They include `prep1-gc-tx.log` and `tx-jvm.log` (summary), and `prep1-native.ndjson` and `tx.jsonl` (raw).

Running cost of bench 4 at 13:55 EST: about USD 3.35 (USD 1.09/hour from 15:47 UTC).

## Heap arm: the same import with the 32 GiB transactor cache (48 GiB heap), LOAD2 `96b16e759`

**The collector stalls are gone, and every forecast held.** The run (`load1/HEAP-ARM-SERVER.md`) used yield, 32-fact frames, one importer credit, rolling 6 and `--tx-cache 32768`, with a control cell then an import cell on one fresh copy. It ran from 19:21:03 to 19:38:09 UTC. Its stack-level dry run was ADMITTED. The launcher exited 0, `importGrantsBesideLiveQueue` was 0, and the yield rule held back 11,828 times.

| Measure | Forecast | Measured |
| --- | --- | ---: |
| Writer ZGC allocation stalls, import cell | 0–2, none over 150 ms | **0** (no thread stalled; no single-writer stall ≥ 100 ms) |
| Writer allocation stalls, control | 0 | **0** |
| Control busy second-half p99 | 9–14 ms | 9.7 ms |
| Import busy second-half p99 | 30–50 ms (about 3.3× the control) | **45.1 ms** (4.6× the control; worst account 47.2 ms) |
| Quiet loaded commit p99, whole | 25–40 ms | 39.0 ms (second half 46.2) |
| Verified facts/s, whole (second half) | 3,150–3,500 | **3,321 (3,094)** |

**Against the P8 bar.** The import clears 3,000 facts/s in both halves, and the quiet account stays under 50 ms. The busy accounts' second-half ratio is 4.90× against a clean 9.9 ms baseline, so the 1.5× bar is still missed. The worst second-half read ratio is 1.59×. Over the whole window the busy and read ratios read 0.03× and 0.10× only because the control's first half had a cold-start spell (busy p99 1,770 ms, all of it waiting for a credit).

**What sets the tail now: the post-adoption spell (spell A).** 97% of the slowest 1% of second-half saves fall within 6 s of an index adoption. Those saves wait 28 ms for a credit and 23 ms in the transactor queue behind slow post-adoption frames. Settled busy saves apply in 0.65 ms with 0.04 SQL reads per save. So the bigger heap removed spell B (the collector), which today's first run showed set the 24 GiB tail. The remaining tail is index adoption itself. That is the fewer-index-jobs arm's target (11 adoptions in 300 s against 2 in the control).

**Autovacuum and WAL were not captured for this run.** The sampler's file was not executable, so it never started. This was found and fixed before the next run. Evidence: `evidence/DX-BM1/bench4/bench4-fair-heap/` on the Mac, with `prep1-gc-tx.log`, `tx-jvm.log`, `prep1-native.ndjson` and `tx.jsonl`.

## Filler: the heap arm with fewer index jobs (`--memory-index 512m,1536m`), LOAD2 `0f12be1de`

**Fewer adoptions cut the busy tail again, and the import ran faster than forecast.** The run went from 20:19:26 to 20:37:39 UTC, on one fresh copy with control then import cells. The dry run was ADMITTED, the launcher exited 0, `importGrantsBesideLiveQueue` was 0, and the yield rule held back 7,815 times.

| Measure | Forecast | Measured |
| --- | --- | ---: |
| Index adoptions per 300 s import cell | 5–7 | 6 (control: 1) |
| Writer allocation stalls | 0–1 | 0 (no thread) |
| Busy second-half p99 | 35–55 ms (heap arm 45.1) | **36.4 ms** (worst account 38.2) |
| Quiet loaded p99, whole | 30–45 ms | 32.5 ms |
| Verified facts/s, whole (second half) | 3,300–3,550 | **3,671 (3,454)**, above range |

**Against the P8 bar.** The import clears 3,000 facts/s in both halves, the quiet account stays under 50 ms, and the worst second-half read ratio is 1.46×. The busy accounts' second-half ratio is 3.05× against a 12.9 ms baseline, so the 1.5× bar is still missed. 99% of the slowest 1% fall within 6 s of an adoption, so what remains is the post-adoption spell. The control's first half again had a cold-start spell (busy p99 1,828 ms).

**Autovacuum ran through the measured cells:** 72 of 76 samples had a worker, and WAL grew 3,219 MB in 12.6 minutes (about 4.3 MB/s). Like the production tape and the heap arm, this run measured the never-vacuumed fresh copy during its first vacuum.

Evidence: `evidence/DX-BM1/bench4/bench4-fair-memidx/` on the Mac, with the collector log, traces and `pg-sampler.log`.
