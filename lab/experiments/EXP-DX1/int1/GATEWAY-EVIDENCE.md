# Gateway memory study

The paths in [GATEWAY-SHA256SUMS](GATEWAY-SHA256SUMS) are relative to the durable `evidence/DX-THIN1/int1` directory. Run `shasum -a 256 -c GATEWAY-SHA256SUMS` in that directory. The earlier integrated results have a separate [evidence index](EVIDENCE.md).

| Raw directory | Population and observations |
| --- | --- |
| `p3-baseline-deep-a` | 2,000 deep people, 40 active. Both native gateway JVMs were sampled after the complete seed and again after all 40 reads and writes. |
| `p3-baseline-thin-a` | 10,000 thin people, 200 active. The same two phases ran on a separate reservation and fresh SQL volume. |

Each phase's compressed histogram contains every JVM class and the independent count and byte totals. The profile JSON carries the JVM start time, heap usage before collection, live weighted peer cache, histogram digest and heap-dump digest. The raw heap dump was deleted inside its slot. Shallow heap bytes and Datomic cache charge overlap. The phase file records scope, reader heap and external buffers, gateway ID and row-cache gauges, RSS, threads and SQL disk. Each first-read row identifies its subject, task class, observed rows, route, requests and duration. The original receipts, actor, record-time cut and Python replay are alongside each run.

The full population arms also take four unforced samples during cold import. Each sample binds the durable count and position to its scope and slot. For a validated cold read, the raw latency row records the number and body bytes of actual HTTP responses, time to headers, worker time, and the gateway duration when supplied.

On the physical queue, the first wide case measures 200 previously unread deep people in a separate fresh scope after saving its wide measurements. Their source ordinals represent the 10,000-person distribution: 20, 160, 6, 12 and 2 people with 4, 5, 10, 11 and 34 tasks. The collector recomputes membership, p50/p99, original receipt binding and Python replay. `inspect-profiles.ts DIR...` independently checks the measured JVM histogram totals, peer charges, process identities and cold-read samples.
