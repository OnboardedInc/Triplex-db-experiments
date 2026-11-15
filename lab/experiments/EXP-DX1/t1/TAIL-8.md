# Part 8 tail: original C beside final A

Default summary, full 10,000-subject pairs. Level, swap, Mac CPU and off controls for every row are in [VERDICT-8.md](VERDICT-8.md). Counts use every primary background command, no resends or probes. Largest observed cause is an exclusive group; overlapping work is correlation. Peer wait includes transactor, storage and messaging; summary has no native/JFR attribution.

| largest observed cause | C count / summed wall ms / worst trace | final A count / summed wall ms / worst trace |
| --- | --- | --- |
| peer-wait | 60 / 7397.245 / ca417150c8ed4544000000000000230b | 113 / 12070.289 / bb964bb05980d27400000000000022fc |
| network | 10 / 2212.500 / ca417150c8ed45440000000000002431 | 8 / 740.748 / bb964bb05980d274000000000000230e |
| driver.queue.subject | 11 / 1101.573 / ca417150c8ed454400000000000040c7 | 18 / 2252.979 / bb964bb05980d2740000000000000f0f |
| driver.queue.scheduler-late | 10 / 922.265 / ca417150c8ed454400000000000040cd | 5 / 444.533 / bb964bb05980d2740000000000002400 |
| gateway | 4 / 258.203 / ca417150c8ed45440000000000001217 | 0 / 0 / none |
| typescript | 1 / 207.622 / ca417150c8ed454400000000000040c9 | 0 / 0 / none |

Total >50 ms: C 96/7408; final A 144/7408. Final slowest primary 602.391 ms. This is not a proved improvement.

The final largest subject chain includes `bb964bb05980d2740000000000000f0f`, waiting behind `bb964bb05980d2740000000000000f0e` with four in flight and 32 slots. Its subject wait is 183.499 ms; prior scheduler lateness is 62.360 ms. The preceding peer-dominated outlier `bb964bb05980d2740000000000000f0c` overlaps 137.165 ms of the writer’s deferred publication scope. Source inspection shows that callback synchronously persists and reads back the SQLite witness (`DatabaseSync`, WAL/FULL), after a previous command’s ACK. Its 137.165-ms same-thread span covers almost the entire 138.346-ms lateness episode, with no GC overlap; this is benchmark apparatus blocking later offers. CPU versus filesystem/run-queue delay inside this callback is not split. The summary run has no CPU profile for the other residual waits. The queue is not an admission-slot shortage in this example.

Targeted full-level native findings in [NATIVE-8.md](NATIVE-8.md) locate four GC-free outliers at the transaction writer’s tail-descriptor future, concurrent with the Postgres socket. Collector/index settings were not proved to remove these waits; exact adoption/reset identity and WAL Sync boundaries remain missing. Current-layout median cost by fact band is associated with datom count, but compression timing below is the actual one-knob test.

Writer GC/heap and lateness over the exact primary window:

| observation | C | final A |
| --- | --- | --- |
| GC count / total / max ms | 1811 / 5082.407 / 71.153 | 1696 / 4750.755 / 74.980 |
| GC pauses >50ms / summed ms | 4 / 245.330 | 2 / 143.363 |
| writer heap used median / peak MiB | 529.758 / 1015.871 | 534.238 / 883.431 |
| lateness >50ms intervals / distinct episodes / union ms | 4 / 2 / 205.077 | 6 / 3 / 373.756 |

Final three lateness episodes are 138.346 / 71.454 / 163.955 ms; overlapping GC totals are 0 / 6.777 / 17.307 ms. The latter two include 19.425 / 25.049-ms client encoding spans, but their entire wall time is not explained by those spans. Earlier part-7 CPU profiles establish earlier GC stalls, not these new intervals. The full final pair therefore does not establish removal of writer stalls; its retained model/command/oracle history still occupies the writer heap. Moving the durable witness off this isolate must preserve its original captured timestamp, token/identity validation, durable readback and final drain; that fix was not implemented or timed in this part.
