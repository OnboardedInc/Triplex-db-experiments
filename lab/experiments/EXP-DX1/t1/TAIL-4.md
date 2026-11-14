# CPU-placement tail comparison

Every primary commit over 50 ms in the frozen 300-second, 10,000-subject diagnostic; same source 04dd61f7, summary, quiet logging, TLS on, worker fallback and 192-MiB history. Largest exclusive causes are grouped across phases. Network includes dispatch and callback time. This is not a full verdict.

[Per-arm latency, swap, Mac CPU and bookends](CORE-256-A.md). No p99 improvement is claimed beyond bookend drift.

| Cause | A1 count / wall ms | isolated count / wall ms | A3 count / wall ms | isolated worst trace id |
| --- | ---: | ---: | ---: | --- |
| driver.queue.scheduler-late | 58 / 10388.8 | 18 / 1745.9 | 32 / 3398.8 | 484f2224a85f220c0000000000001e26 |
| driver.queue.subject | 113 / 23588.1 | 45 / 5388.7 | 68 / 6276.8 | 484f2224a85f220c0000000000001e1b |
| event-loop | 8 / 3368.8 | 1 / 124.5 | 1 / 89.4 | 484f2224a85f220c0000000000001c85 |
| gateway | 6 / 511.3 | 4 / 229.3 | 8 / 527.3 | 484f2224a85f220c0000000000000abe |
| gateway-queue | 0 / 0.0 | 2 / 129.7 | 0 / 0.0 | 484f2224a85f220c0000000000000b38 |
| network | 158 / 19247.5 | 19 / 1820.2 | 89 / 6871.1 | 484f2224a85f220c0000000000001e15 |
| peer-call | 0 / 0.0 | 0 / 0.0 | 2 / 119.4 | none |
| peer-wait | 168 / 13547.1 | 116 / 8891.0 | 123 / 8672.7 | 484f2224a85f220c000000000000026e |
| typescript | 24 / 1799.9 | 12 / 1093.4 | 11 / 874.6 | 484f2224a85f220c00000000000021b5 |
| typescript-gc | 0 / 0.0 | 1 / 146.8 | 0 / 0.0 | 484f2224a85f220c0000000000001c83 |

Totals: 535 commits, 218 commits, 334 commits.

1-baseline: MemAvailable min 5.563 GiB, max OOM/oom_kill 0
2-candidate: MemAvailable min 5.708 GiB, max OOM/oom_kill 0
3-baseline: MemAvailable min 5.855 GiB, max OOM/oom_kill 0

Old trigger e5eec63d709679d60000000000004354: 267.108-ms scheduler lateness overlaps eight Node GC pauses totaling 35.393 ms and fallback reach/oracle scopes. No CPU profile exists for that attempt: the rest cannot be assigned retrospectively. Fresh bound profiles identify fallback decode/checking on the writer and remove it with worker fallback; they do not identify every ambient writer task. Same-subject chains follow slow predecessors; scheduler lateness with spare slots is a benchmark writer-thread stall.
