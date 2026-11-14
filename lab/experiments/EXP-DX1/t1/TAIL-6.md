# Writer stalls and commit tails, part 6

The full profiled pair captures the benchmark writer as the source of some independent late offers while capacity is free. Other commits then wait behind the same subject. This is benchmark scheduler/worker transport contention, alongside product and engine waits; it is not an engine admission queue. Largest-span grouping identifies an observed interval, not hidden internal CPU work.

[Host and controls for reference](REFERENCE-6.md), [profiled diagnostic](NATIVE-CONTEXT-6.md), [same-session core comparison](CORES-6.md). Do not compare reference and later absolute latencies as a causal speedup: swap and host CPU changed.

## Profile evidence

Full recorder plus 1-ms writer/JVM sampling; no native file logs; source cc625642. Loaded swap median 11.819 GiB (4.960–12.063), Mac non-VM CPU median/p99 64.9/302.9%; off controls 13.208/56.667 and 10.789/43.306 ms. Samples are points, not exclusive CPU time; >3-ms gaps remain unknown.

| trace | late offer ms | sampled writer work | unknown gaps >3ms |
| --- | ---: | --- | ---: |
| cc795c670fc4390c000000000000421c | 247.464 | 142/205 GC; 26 decodeValueColumns; 9 persistCaptured | 7 |
| cc795c670fc4390c000000000000421d | 191.380 | 101/162 GC; 26 decodeValueColumns; 9 persistCaptured | 4 |
| cc795c670fc4390c0000000000004200 | 174.418 | 125/145 GC; 5 postMessage | 3 |
| cc795c670fc4390c0000000000004201 | 168.546 | 122/143 GC; 5 postMessage | 3 |
| cc795c670fc4390c00000000000023a4 | 90.108 | 67/68 postMessage; one timer sample | 3 |

The snapshot broadcast copies the same retained receipt cohort to every reader worker every 100 ms. The implemented delta protocol sends only the new exact suffix and keeps the same 2,000-item/hour expiry, order and pins. Golden unit comparisons retain the exact snapshot suffix; the combined 1,000-subject oracle passes with delta. The separate 200,000-world differential validates the product composition, not the benchmark worker wire. Its isolated loaded timing has not run: disk admission refused it before any container existed. It remains opt-in (`--reader-basis-wire delta`), so no fixed-tail or latency gain is claimed. GC/persistence bursts are still present; moving the witness behind the bar does not make its writer-thread contention disappear.

## Every commit over 50 ms, grouped by largest observed cause

Counts below are exhaustive groups for the reported commits, including warmup and all measured phases; phase-level rows remain in each automatic COMMIT-ANATOMY.md. Total wall sums request durations, not disjoint elapsed machine time.

### tx2-dxt1-p6-reference-a-ladder

default summary, 7,408 commits; reference host/context above; 568/7408 commits over 50 ms.

| largest cause | count | total wall ms | total cause ms | worst trace |
| --- | ---: | ---: | ---: | --- |
| peer-wait | 364 | 38118.665 | 27638.440 | dd6dfdc2d07cb3660000000000002559 |
| driver.queue.subject | 95 | 17522.437 | 12984.777 | dd6dfdc2d07cb36600000000000006c3 |
| network | 52 | 6524.956 | 3800.129 | dd6dfdc2d07cb366000000000000419f |
| driver.queue.scheduler-late | 38 | 5615.827 | 2971.319 | dd6dfdc2d07cb36600000000000041b2 |
| typescript | 15 | 1550.470 | 762.199 | dd6dfdc2d07cb36600000000000041a0 |
| gateway | 4 | 287.073 | 157.520 | dd6dfdc2d07cb366000000000000226a |

### tx2-dxt1-p6-native-a-ladder

full profiling, 7,408 commits; diagnostic host/context above; 640/7408 commits over 50 ms.

| largest cause | count | total wall ms | total cause ms | worst trace |
| --- | ---: | ---: | ---: | --- |
| peer-wait | 335 | 32684.168 | 22009.410 | cc795c670fc4390c00000000000024ef |
| driver.queue.subject | 119 | 14864.931 | 9322.232 | cc795c670fc4390c000000000000420d |
| network | 84 | 9684.624 | 5145.909 | cc795c670fc4390c0000000000004202 |
| driver.queue.scheduler-late | 48 | 5218.150 | 2686.771 | cc795c670fc4390c0000000000004200 |
| transactor | 21 | 2478.991 | 1854.783 | cc795c670fc4390c000000000000298e |
| typescript | 20 | 1415.450 | 501.368 | cc795c670fc4390c00000000000007e2 |
| gateway-gc | 7 | 425.057 | 219.186 | cc795c670fc4390c00000000000021c9 |
| gateway | 6 | 411.638 | 128.592 | cc795c670fc4390c0000000000002dc4 |

### tx2-dxt1-p6-cores256-a-1-baseline

full binary, first same-session core baseline; CORES-6.md; 68/3530 commits over 50 ms.

| largest cause | count | total wall ms | total cause ms | worst trace |
| --- | ---: | ---: | ---: | --- |
| peer-wait | 43 | 2769.248 | 1892.640 | 09ee3ce727adceab0000000000001f40 |
| driver.queue.subject | 13 | 920.426 | 655.482 | 09ee3ce727adceab0000000000000976 |
| gateway | 5 | 311.215 | 181.420 | 09ee3ce727adceab000000000000167f |
| transactor | 4 | 222.141 | 153.183 | 09ee3ce727adceab00000000000001f1 |
| driver.queue.scheduler-late | 2 | 158.346 | 93.168 | 09ee3ce727adceab000000000000096d |
| network | 1 | 51.687 | 22.061 | 09ee3ce727adceab00000000000016b1 |

### tx2-dxt1-p6-cores256-a-2-candidate

full binary, two-core candidate; CORES-6.md; 33/3530 commits over 50 ms.

| largest cause | count | total wall ms | total cause ms | worst trace |
| --- | ---: | ---: | ---: | --- |
| network | 10 | 629.996 | 395.965 | 5878fe523cdd416e0000000000001a3d |
| peer-wait | 9 | 528.893 | 267.631 | 5878fe523cdd416e00000000000018bf |
| driver.queue.subject | 5 | 275.170 | 187.404 | 5878fe523cdd416e00000000000018c2 |
| typescript | 3 | 240.299 | 134.663 | 5878fe523cdd416e0000000000001a26 |
| driver.queue.scheduler-late | 2 | 128.553 | 81.467 | 5878fe523cdd416e000000000000042d |
| transactor | 2 | 112.132 | 60.778 | 5878fe523cdd416e0000000000001c17 |
| gateway | 1 | 67.544 | 24.579 | 5878fe523cdd416e00000000000001ff |
| gateway-queue | 1 | 55.806 | 24.650 | 5878fe523cdd416e00000000000018be |

### tx2-dxt1-p6-cores256-a-3-baseline

full binary, closing same-session core baseline; CORES-6.md; 36/3530 commits over 50 ms.

| largest cause | count | total wall ms | total cause ms | worst trace |
| --- | ---: | ---: | ---: | --- |
| peer-wait | 21 | 1271.003 | 866.492 | 1cd203a6c1f2e3d70000000000000100 |
| driver.queue.subject | 6 | 403.724 | 253.760 | 1cd203a6c1f2e3d7000000000000091e |
| transactor | 4 | 269.256 | 150.060 | 1cd203a6c1f2e3d700000000000002cc |
| network | 2 | 171.846 | 88.414 | 1cd203a6c1f2e3d70000000000001b76 |
| gateway | 2 | 117.080 | 56.222 | 1cd203a6c1f2e3d700000000000001fe |
| driver.queue.scheduler-late | 1 | 57.461 | 26.044 | 1cd203a6c1f2e3d7000000000000046a |

Closing full-pair tail and before/after verdict are unmeasured until disk admission permits that pair. The core diagnostic has 68/33/36 over-50-ms commits in A/B/A; its drop cannot establish a repeatable tail improvement against the 32-commit bookend drift.
