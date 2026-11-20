# Loader forecasts before the first server run

Use a fresh tag on the two assigned, released machines. The [HA1 controller](../ha1/BENCH.md) checks the public revision, build, assignments and leases before starting. PostgreSQL and the native writer run on A, the gateway on B, and the public TypeScript client on A. Each arm gets one new physical database. Every importing and live tenant in that arm uses that same database. Local clocks measure durations; the database log supplies transaction order.

| Experiment | Predicted confirmed business facts/s | Operator command |
|---|---|---|
| Quiet deep snapshots, 100,000 then 1,000,000 subjects | 6,500 at about 16M facts (41 min); 5,800 at about 160M (7 h 40 min). | `HA1_BENCH_HOURS=48 node --import tsx lab/experiments/EXP-DX1/ha1/control.ts load-quiet pair-load-quiet` |
| One importer with 50, 235 and 390 aggregate offered small saves/s and a quiet reader/writer | At 128/500/2,000 facts per frame respectively, 1,500/3,200/4,500 fps at 50/s; 450/1,200/2,000 at 235/s; 0/200/600 at 390/s. | `HA1_BENCH_HOURS=12 node --import tsx lab/experiments/EXP-DX1/ha1/control.ts load-live pair-load-live` |

The initial quiet prediction discounts the Mac bookended row-codec speedup against the old 4,578–4,669 fps server seeds. The large-rung allowance prices index and garbage-collection pressure. The live forecast assumes grouping recovers some of the estimated 150–200 ungrouped commits/s capacity at the two higher offered rates. Continuous runnable saves can drive import to zero. Each server arm reports admitted and missed offers alongside goodput; missed saves disqualify a throughput claim. Clocked ingestion includes receipt verification and FULL cursor advancement. Full database readback runs after the timed window, and its cost is reported separately.

The quiet worker regenerates the deep source by ordinal, verifies all source frames, and reconciles each original claimed receipt, ordered native feed and stored rows at a common final position. The live campaign runs a 60-second open-loop window for each rate and width between two controls. Ten writing namespaces share the database with the importer and a quiet account offering five saves and five pinned reads per second. This is a diagnostic real-rate workload separate from the frozen acceptance trace.
