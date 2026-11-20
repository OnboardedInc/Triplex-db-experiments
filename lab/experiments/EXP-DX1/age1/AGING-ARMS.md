# Aging policy and rate priors

The old Mac probes each wrote 300,000 records in 15,000 matched saves. [Stage join](historical-stages.py) matches the peer request UUID to the transactor event and requires complete native t coverage. Timestamps use the same guest clock. P50 and p99 are per transaction in milliseconds and overlap across requests.

| Stage | Faster attempt | Slower attempt |
| --- | ---: | ---: |
| Core load rate, records/s | 20,097 | 4,132 |
| Core load elapsed, seconds | 14.928 | 72.600 |
| At least one peer request outstanding, seconds | 14.724 | 71.797 |
| Remaining load time, seconds | 0.204 | 0.803 |
| Peer submit to native report ms | 13 / 101 | 85 / 708 |
| Native apply ms | 0.126 / 2.61 | 0.711 / 47.3 |
| Native processing including queue and persistence ms | 4.33 / 58.6 | 37.5 / 287 |
| Native report to peer completion ms | 2 / 51 | 9 / 112 |
| Peer submit to future completion ms | 17 / 116 | 107 / 1,019 |

The published 4,115/s includes gaps between load segments and disk checks. The peer had at least one outstanding transaction for 99% of the extra 57.7 seconds in the slower core load. This locates the added wall time on the overlapped native request path. The previous logs lack a synchronized breakdown of scheduling, GC, network and fsync. The new generator times tape, encoding, enqueue, blocked await and exact ACK validation separately. [How Datomic measures transaction time](https://docs.datomic.com/reference/io-stats.html#relating-io-stats-to-transaction-time)

| Proposed treatment | Written difference vs solo K | Predicted sustained server K-equivalent records/s | Age-only at 570M K-equivalent records |
| --- | --- | ---: | ---: |
| 64-wide burst, standard settings | Same categories and byte comparisons. Native t and wall timestamps are run-specific. | 12k | 13.19 h / $14.38 |
| 256-wide rolling, standard settings | Same. Enqueue refills each slot rather than draining it after every batch. | 20k | 7.92 h / $8.63 |
| 256-wide rolling, larger log/memory index buffers during load | Same. Index packing and job cadence may vary. Restore baseline before read/save measurements. | 22k | 7.20 h / $7.84 |
| 8 saves per physical group, standard settings | One shared native t and instant. Every member adds five group links and each replacement adds a retirement marker. The native log also retains W1's explicit prior-revision retraction alongside Datomic's implicit one. Interior members replace position/max clock on the physical tx with a logical position link and their own clock. Added log count is 4 per member plus edited width plus 2 per group. | 30k | 5.28 h / $5.75 |

These rates are unmeasured server priors, derived from the observed native-path headroom and amortized physical transaction count. One Mac arm uses identical command populations and an equal K-equivalent record denominator. For grouping, matching both bytes and physical totals would require a different tape, so report its additional physical records independently. Grouping changes AVET (logical position), VAET (refs), stock EAVT/AEVT and historical row traversal. Use solo K for the first server campaign until the group is qualified for the intended index workload. The first timed server prefix needs to replace these priors.

## Small Mac fidelity results

Each arm used the same 1,072-save tape and 21,436 logical solo-K datoms. The standard rolling pipeline matched the burst's normalized native log. The grouped arm matched W1's native log with duplicate retractions retained. Current, historical and pinned reads, logical receipts and feed pages matched across the tested arms. All runtimes in the raw Mac logs are diagnostic.

| Arm | Log datoms for the tape | EAVT / AEVT datoms | AVET datoms | VAET datoms |
| --- | ---: | ---: | ---: | ---: |
| Burst and rolling, standard | 21,436 | 59,466 / 59,466 | 58,765 | 321 |
| Rolling, load settings | 21,436 | 59,466 / 59,466 | 58,765 | 321 |
| W1-shaped native groups | 28,135 | 65,111 / 65,111 | 57,028 | 4,622 |

The settled counts include the seed. All surveyed trees had three structural levels. The standard solo arms had 59 AEVT and 36 AVET leaves, while the load-settings arm had 60 and 35. Grouping had 66 and 37 and materially changed VAET cardinality. These runs establish record and logical behavior, with different directory packing across fresh databases. They leave sustained throughput and setting effects for bare metal. [Evidence manifest](P2-SHA256SUMS)
