# Deep and thin zero-reader commit anatomy

The deep control’s reported commit p99 was 87.04 ms (90% interval 82.43–94.21 ms, 56,505 commits). The thin p3r control was 36.11 ms (38,826 commits). The exact nearest-rank p99 from the deep ACK ledger was 86.74 ms. Both runs used replica-worker receipt capture and the worker journal. Their source revisions and host boot IDs differ. Deep offered 9.56 primary saves/s across its trace. Thin offered 6.57/s. The comparison describes these runs and does not isolate population, offer rate or source revision.

| ACK path stage, milliseconds | Thin p99 | Deep p99 |
| --- | ---: | ---: |
| Scheduled offer to transact call | 3.65 | 10.44 |
| In the queue behind the same subject, included above | 2.53 | 5.43 |
| Transact call to return | 32.13 | 57.18 |
| Transact call to gateway start | 3.47 | 11.64 |
| Inside gateway | 28.95 | 35.95 |
| Peer wait, included in gateway | 26.47 | 34.56 |
| Serial transactor tx-with, included in peer wait | 6.59 | 8.55 |
| Return from gateway to transaction return | 3.51 | 3.44 |
| Transaction return to durable ACK publication | 0.05 | 4.05 |

The gateway joins cover 56,505 deep and 38,821 thin ACKs. Each stage uses its own p99. For the slowest 1% of complete ACKs (566 deep and 389 thin), the stages are additive by mean. Deep spent 79.41 ms before calling transact, 90.21 ms before the gateway started, 43.57 ms in the gateway and 8.04 ms between gateway exit and transact return. Thin spent 8.38, 1.75, 47.77 and 2.21 ms respectively. The same-subject wait contributed 48.85 ms of the deep pre-call mean. The pre-gateway boundary includes local preparation, client or socket scheduling, transport and dispatch. These traces leave the long waits within that boundary unresolved. Deep p99 was 98.68 ms during bursts and 42.29 ms in steady periods. Thin was 37.88 and 29.35 ms respectively.

| Writer kind | Thin serial SQL reads/commit (n) | Deep serial SQL reads/commit (n) |
| --- | ---: | ---: |
| Person | 0.277 (15,666) | 0.856 (22,754) |
| System | 0.278 (11,518) | 0.640 (16,844) |
| Agent | 0.283 (3,878) | 0.672 (5,581) |
| Runtime | 0.271 (7,759) | 0.654 (11,326) |
| All | 0.277 (38,821) | 0.733 (56,505) |

One quarter of deep commits issued at least one SQL read, versus 12.9% of thin commits. Native SQL-read time p99 rose from 0.70 to 1.54 ms. Across all matched primary receipts, deep transactions asserted 5 facts and retired 5 at the median, with 1,034 application-operation JSON bytes. Thin asserted 9 and retired 1, with 1,485 bytes. These bytes omit the gateway envelope and native representation. Deep visits to the EAVT and AEVT indexes averaged 40.14 and 33.43 per commit. Thin averaged 22.06 and 10.14. The higher read counts and more retired rows are consistent with GROWTH's replacement-cost mechanism. The trace does not identify which reads retrieved predecessors, and the largest tail delays lie outside measured serial storage. The forecast of 75–190 ms at 100,000 people is still an item 3 measurement.

The deep transactor logged 78 completed adoption pauses during command offers (p95 5.83 ms), versus 69 thin (p95 6.98 ms). They overlapped 52 deep and 34 thin transactions, with zero overlapping transactions in either slowest percentile. The slowest commits also included no-SQL cases.

DEEPTAIL aligned the recovered archive’s JVM pauses with the fifty longest request chains. Forty-two hit one of six write-gateway Serial GC pauses directly. Eight waited behind an affected save on the same subject. The SDK’s `/begin` request accounts for delays before the `/transact` handler. Twenty-four of those fifty fell in the history test and twenty-six outside it. For the first 900 seconds the exact p99 was 30.99 ms deep (10,751 saves) and 32.84 ms thin. Excluding the explicit history phases and index requests gives 59.65 ms deep and 32.38 ms thin by the rated histogram. These are filtered observations with their original queue and cache state. The confirmed archive SHA-256 is `095971d5126cf567a7db3ff15c3fc718656bf98541a66ea0b05136c4c9bd54bb`. [Review response](REVIEW.md)

The comparator verifies source, slot and boot on gateway and transactor spans. It joins unique successful gateways to their actual primary commands and timestamps. It also verifies both hashes of each complete receipt journal and matches serialized operations by acknowledged position. [Analysis hashes](evidence/p6-commit-anatomy.sha256)
