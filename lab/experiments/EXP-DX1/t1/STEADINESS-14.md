North star: distinguish P2 stalls from test-bed interference using the original saved observations.

The full [51-row guest I/O table](STEADINESS-12.md) already covers every F/H ACK over 100 ms and the unioned writer-lateness episodes. Its derived JSON was checked again against the committed part-12 seal: `p12/steadiness-b.json`, SHA256 `3fdac282e34de90f08e790c7ea5379ee46f0381fc9b5927a95b4862c39b426f3`. This is a historical evidence recheck, not a new latency measurement.

| Pair | ACKs >100 ms | Additional unioned writer stalls | Guest epoch steps | Observed whole-arm swap-out page increase |
| --- | ---: | ---: | ---: | ---: |
| F (`p9-final-a-ladder`) | 33 | 2 | 35 | 0 |
| H (`p10-final-b-ladder`) | 15 | 1 | 0 | 0 |

Each original row reports driver/PG write bytes, unassigned guest write bytes, flush count/time, queue and overlapping guest clock-step intervals. Unassigned bytes identify no particular writer; they may include kernel/background activity. The preceding five-second windows are coarse overlaps and do not establish causation.

The saved host observations have no measured host-to-guest monotonic bridge or per-process Mac I/O identities. Consequently a trustworthy per-stall table naming other Mac writers cannot be recovered from those bytes. The sampled cumulative swap-out counter did not increase in either whole arm; that does not exclude swap-ins or other host storage traffic. F's stepped epoch clock invalidates old wall-clock joins; ACK durations and guest boot-clock correlations remain usable. No host attribution has been invented or retroactively qualified.
