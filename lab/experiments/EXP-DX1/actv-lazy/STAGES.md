# Time to the first correct answer

The retained 10,000-person wage switch took 1,205.4 ms. Of those, 254.3 ms elapsed before native acknowledgement, 13.8 ms in receipt readback and 39.5 ms inside the cold read call. The remaining 897.9 ms span launching a process, loading its modules, opening its native connections, IPC and shutdown. The historical trace has one clock for that group. [Part 4 manifest](SHA256SUMS)

A new experiment opens a second process before Publish and gives it only a scope, a subject and a clock. It alternates that process with freshly launched ones. Each quiet or save-overlap case has four first answers and four repeats on each fixture. The 10,000-person fixture contains 40,898 compact W0 facts. The independent deep case contains 256 people and 31,482 facts. Python checks every returned answer at its actual native cut. The endpoint is receipt of the complete answer in the caller, before the child shuts down. [Collector](timing.ts) · [Reader instrumentation](timing-worker.ts) · [Reconstruction](stage-budget.py)

The quiet budgets below are arithmetic means in milliseconds. The rows within a column add to offer through receipt of the first correct answer. The release-discovery step queries native head and reads the winning account assertion at that position. There is no feed subscription or poll interval on this read path. The final check enforces erasure while the underlying world is being read.

| Mean stage (ms) | Earlier, compact, new | Earlier, compact, connected | Earlier, deep, new | Earlier, deep, connected |
|---|---:|---:|---:|---:|
| Publish to durable | 26.21 | 35.33 | 24.67 | 29.88 |
| Verify receipt | 5.15 | 5.89 | 8.16 | 5.59 |
| Launch runtime and parse entry point | 144.45 | 0.00 | 152.66 | 0.00 |
| Load application modules | 244.22 | 0.00 | 246.40 | 0.00 |
| Open native session | 148.70 | 0.00 | 153.00 | 0.00 |
| IPC and caller | 3.97 | 0.79 | 3.95 | 0.59 |
| Native head and pinned account lookup | 10.83 | 7.95 | 12.70 | 5.60 |
| Pre-read erasure check | 7.34 | 6.40 | 11.12 | 4.79 |
| Cache identity and lookup | 0.09 | 0.05 | 0.12 | 0.04 |
| Pull pinned subject and dependencies | 3.50 | 7.40 | 18.49 | 9.28 |
| Evaluate rules and serialize | 2.07 | 0.87 | 2.07 | 0.95 |
| Final erasure and admission check | 4.08 | 7.75 | 5.41 | 4.82 |
| Offer through answer | 600.61 | 72.43 | 638.73 | 61.55 |

Each first answer used one pinned subject-world pull. Connected reads paid zero process start, module load and connection setup on the user path. No publisher transaction is run by a reader. The final read-side check guards erasure. The memo step binds source generation, release, transaction, valid instant and subject. Repeating an exact pin can hit. A new transaction or business instant may require deriving again.

| Reader and workload | Native calls, miss / exact hit | Quiet median offer → complete answer, connected / new (ms) | Quiet median durable → complete answer, connected / new (ms) | Connected first call, quiet / overlapping save (ms) | Exact repeat in connected process, quiet (ms) |
|---|---:|---:|---:|---:|---:|
| Earlier, w0 | 7 / 4 | 67.8 / 589.2 | 35.8 / 563.0 | 29.3 / 38.7 | 7.7 |
| Earlier, act2-deep | 7 / 4 | 60.9 / 648.5 | 29.2 / 624.9 | 22.5 / 22.0 | 7.1 |

| Connected reader beside a submitted save | Native release ACK, quiet / contended (mean ms) | Publish overlap with submitted save (mean ms) | Actual read overlap with second save (mean ms) | Application socket queue on contended read (mean ms) |
|---|---:|---:|---:|---:|
| Earlier, w0 | 35.3 / 57.4 | 31.6 | 35.8 | 1.3 |
| Earlier, act2-deep | 29.9 / 57.0 | 30.8 | 21.3 | 0.7 |

The contention arm launches Publish when a separate writer actually transmits a 32-fact transaction and launches the read during another real save. Overlap is an upper bound on time attributable to that save. The transactions also pay their own native service costs. The second save’s setup is driver time and is excluded from the read-call comparison. Each fresh reader completed its startup after that save had returned.

| Guest CPU over the four paired windows | Busy across eight virtual cores | Time with at least one runnable task stalled | Native engine average cores consumed (three-core limit) | Throttled periods |
|---|---:|---:|---:|---:|
| Earlier | 6.7–8.5% | 6.4–8.1% | 0.45–0.58 | 0 |

The fresh-process budget supports the process-start hypothesis. Most of the deep call itself is pinned data access and freshness checks. Both paths learn the new release from the queried database position. The repeated guest samples leave spare CPU during these runs. The historical 1.205-second run has no CPU sample or backend queue trace, so its remaining 897.9 ms cannot be divided retrospectively. These local windows diagnose costs. They do not measure production p99.
