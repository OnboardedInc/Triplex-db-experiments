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

| Proposed treatment | Written difference vs solo K | Predicted sustained server K-equivalent records/s | Age-only at 180M |
| --- | --- | ---: | ---: |
| 64-wide burst, standard settings | Same categories and byte comparisons. Native t and wall timestamps are run-specific. | 12k | 4.17 h / $4.54 |
| 256-wide rolling, standard settings | Same. Enqueue refills each slot rather than draining it after every batch. | 20k | 2.50 h / $2.73 |
| 256-wide rolling, larger log/memory index buffers during load | Same. Index packing and job cadence may vary. Restore baseline before read/save measurements. | 22k | 2.27 h / $2.48 |
| 8 saves per physical group, standard settings | One shared native t and instant. Every member adds five group links and each replacement adds a retirement marker. Interior members replace position/max clock on the physical tx with a logical position link and their own clock. Added physical count is 3 per member plus edited width plus 2 per group. | 30k | 1.67 h / $1.82 |

These rates are unmeasured server priors, derived from the observed native-path headroom and amortized physical transaction count. One Mac arm uses identical command populations and an equal K-equivalent record denominator. For grouping, matching both bytes and physical totals would require a different tape, so report its additional physical records independently. Grouping changes AVET (logical position), VAET (refs), stock EAVT/AEVT and historical row traversal. Use solo K for the first server campaign until the group is qualified for the intended index workload. The first timed server prefix needs to replace these priors.
