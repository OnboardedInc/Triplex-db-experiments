# Part 7 tail and writer stalls

Quiet closing: source 7e8ccd81, summary, 7,408 primary commands; swap 4.679 GiB, Mac non-VM CPU median 12.2%; same-session off p50/p99 bookends 11.007/45.569 and 10.745/41.412 ms. All groups below are exhaustive for primary commits over 50 ms. Counts are requests; summed wall is not disjoint machine time. Named largest exclusive intervals locate waits, not the closed engine internals.

| largest observed cause | commits | total request wall ms | total largest-cause ms | worst request ms | worst trace ID |
| --- | ---: | ---: | ---: | ---: | --- |
| peer-wait | 60 | 7397.245 | 5988.566 | 966.488 | ca417150c8ed4544000000000000230b |
| network | 10 | 2212.500 | 1274.342 | 447.285 | ca417150c8ed45440000000000002431 |
| driver.queue.subject | 11 | 1101.573 | 852.100 | 230.380 | ca417150c8ed454400000000000040c7 |
| driver.queue.scheduler-late | 10 | 922.265 | 634.679 | 181.774 | ca417150c8ed454400000000000040cd |
| gateway | 4 | 258.203 | 116.271 | 102.677 | ca417150c8ed45440000000000001217 |
| typescript | 1 | 207.622 | 132.482 | 207.622 | ca417150c8ed454400000000000040c9 |

Total over 50 ms: 96/7408, wall sum 12099.408 ms; all-primary p99 55.647 ms. The largest wait remains peer-to-transactor/storage. Summary does not identify transactor queue/CPU, storage reads/syncs or gateway JVM pauses separately.

| primary scheduler-late trace | interval ms |
| --- | ---: |
| ca417150c8ed454400000000000040cd | 132.307 |
| ca417150c8ed454400000000000040ce | 126.487 |
| ca417150c8ed454400000000000040cf | 76.174 |
| ca417150c8ed4544000000000000242b | 72.568 |

Closing GC: 1811 events, 5082.407 ms total observed duration, maximum 71.153 ms. Lateness has 4 per-command intervals / 407.535 ms; union 2 episodes / 205.077 ms. This recorder predates GC-kind fields, so collection kinds remain unrecorded, not guessed.

[Part 6 profiles](TAIL-6.md) put 60–85% of sampled points in GC during the prior 174–247-ms writer stalls and 67/68 points in postMessage for the 90-ms stall. Those were different, busy-host attempts. Current wall overlays are not new CPU-profile proof of every stall.

[Broadcast retry](BROADCAST-7.md) shows the exact wire cost reduction, with full GC/count/heap/ratio observations and no demonstrated tail improvement. [Journal trial](MODEL-7.md) shows a smaller heap and shorter GC events, but its closing control was disk-refused; no fixed-tail or controlled latency win is claimed. Oracle/source binding remains valid for the completed individual arms.

Remaining retained writer graphs include oracle command inputs and duplicate-receipt history. Reads already spill to a worker. Journal mode relocates expectation-model inputs to framed bytes, replays the unchanged model after drain and verifies both archive and original hashes; it does not remove observations or shorten phases. V8 writer-only tuning and a shared-core two-transactor layout remain unmeasured.

Recorded-byte v3 counts 4 measured writer GC events over 50 ms / 245.330 ms total in C. Those pauses can overlap scheduler/commit waits; their duration is not added to a wall-time budget or treated as proof of every stall.
