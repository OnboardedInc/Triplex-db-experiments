# DX-W1 part 8

The full-size trace counts storage fetches but cannot tell which lookup caused each fetch.
The first candidate checks the same owner revision on Datomic's serial database value using the narrow revision index.
A separate option reuses decoded predecessor values when preparing the ordinary journal.
Both options start off. They preserve one database, the historical ID check, and durable receipts.

## Before the server run

| Offered saves/s | Writer | Apply mean | SQL reads/save | Durable ACKs/s in window |
| ---: | --- | ---: | ---: | ---: |
| 394 | Reference | 1.7–2.0 ms | 1.1–1.3 | 375–394 |
| 394 | Narrow revision and decode reuse | 1.5–1.85 ms | 0.9–1.2 | 385–394 |
| 620 | Reference | 1.8–2.2 ms | 1.1–1.4 | 430–510 |
| 620 | Narrow revision and decode reuse | 1.55–1.95 ms | 0.9–1.25 | 480–550 |

The estimates assume the revision probe can avoid roughly 0.15–0.30 SQL fetches per save. The measured 0.93 ms for 1.19 reads gives about 0.78 ms per removed fetch. A native row redundancy fetch can survive the change, so the prediction includes a small improvement and is falsified if it merely shifts EAVT reads into AEVT.

## Evidence audit

- The LOCAL gate compares exact feed bytes, pinned history, receipt/claim identity and conflict outcomes on fresh scopes, checks the native function selected in each process, and prints the fresh attempt and source. The image pins the gate and gateway bytes, and the engine binds the self-test reservation and cleanup. It gives no acceptance verdict.
- The sampled native observer measures the actual calls and records attempt, native t, db-before t, index/attribute category, calls and I/O. Reads that cannot be assigned remain outside the named lookup. It issues no receipt or verdict.
- The application returns receipts through the existing durable report checks. The native replacement still compares the committed revision before writing and leaves the duplicate, identity-history, erasure and function checks intact.
