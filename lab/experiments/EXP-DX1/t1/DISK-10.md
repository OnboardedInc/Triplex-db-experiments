# tx2-dxt1-p10-disk-a

Source 0d95e5721572bbafaa54630aa6265d188d8e3d26; summary tracing; disk trial, one uninterrupted session. Authoritative offer-to-finish remains the verdict. ACK-only retains lateness; corrected also subtracts actual lateness and is diagnostic.

| arm | original p50/p99 ms | ACK-only p50/p99 | corrected p50/p99 | lateness p50/p99 ms | swap GiB | Mac CPU p50/p99 % | >50 burst/growth/sparse |
| --- | --- | --- | --- | --- | --- | --- | --- |
| tx2-dxt1-p10-disk-a-1-zero | 10.586/43.640 | 10.102/42.883 | 9.867/41.665 | 0.002/3.646 | 6.286 | 14.700/108.700 | 10/0/12 |
| tx2-dxt1-p10-disk-a-2-baseline | 12.955/68.450 | 12.344/67.653 | 12.007/64.627 | 0.003/7.929 | 5.230 | 37.500/499.700 | 29/0/60 |
| tx2-dxt1-p10-disk-a-3-candidate | 11.550/48.611 | 10.957/48.062 | 10.629/47.408 | 0.002/5.140 | 4.784 | 17.800/328.200 | 10/0/23 |
| tx2-dxt1-p10-disk-a-4-baseline | 11.642/47.791 | 11.112/47.363 | 10.739/46.226 | 0.002/4.946 | 4.394 | 16.200/102.400 | 11/0/17 |

Controls are the two baseline rows in this table. Report a gain only when it exceeds their drift. A zero-reader row is context for the loaded disk trial, not a matched semantic-oracle PASS. Raw byte seals are next to this report.

Separation is not confirmed and stays opt-in. The candidate's 23 sparse-phase slow commits exceed the zero-reader 12 by 11 (target at most three); closing placement control has only 17. Candidate p99 48.611 ms is above closing control 47.791. The opening control was busier: 37.5% median non-VM CPU versus 17.8/16.2%, with swap draining. The apparent gain against the average control is smaller than bookend drift (1.313-ms p50, 20.659-ms p99). All three loaded oracles pass. Root-disk uses the existing separate durable guest ext4 device, not RAM; it still shares the host physical SSD. No extra tmpfs memory, PG data movement, WAL preparation or default layout change is justified by this result.
