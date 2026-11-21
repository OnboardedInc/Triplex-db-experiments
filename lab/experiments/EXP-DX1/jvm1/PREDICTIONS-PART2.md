# Java 25 server forecasts, written before the timed arms

P1 exact pinned-read p99, P2 scheduled offer to durable ACK, P6 quiet-account save p99 relative to alone, and P7 resident bytes per untouched person. One database, one 10-account seed of 10,000 deep people per account. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

| Arm | Transactor pause p99 / max (ms) | Writer pause p99 / max (ms) | Reader pause p99 / max (ms) | Pinned read p99 (ms) | JVM CPU (cores total, solo / busy) | Peak JVM cgroup sum (GiB) |
| --- | --- | --- | --- | --- | --- | --- |
| Java 21 G1, two-core writer | 30–100 / 80–230 | 17–47 / 40–140 | 18–75 / 45–160 | 12–60 | 1–2.3 / 3–6 | 9–15 |
| Java 25 G1, same memory | 25–95 / 65–210 | 15–44 / 35–130 | 17–73 / 40–150 | 12–60 | 1–2.3 / 3–6 | 9–15 |
| Java 25 ZGC, larger memory | 0.05–0.8 / 0.3–5 | 0.03–0.5 / 0.2–4 | 0.03–0.7 / 0.2–4 | 10–55 | 1.2–3 / 3.5–7 | 14–26 |
| Java 25 G1 at ZGC's memory | 23–92 / 55–200 | 15–44 / 35–130 | 16–70 / 40–150 | 11–58 | 1–2.4 / 3–6 | 10–22 |

| Arm | Solo 3.5/s save p50 / p99 (ms) | Solo 23.5/s save p50 / p99 (ms) | Solo 39.4/s save p50 / p99 (ms) | Quiet p99 ratio, nine at 23.5 / 39.4 |
| --- | --- | --- | --- | --- |
| Java 21 G1, two-core writer | 5–10 / 48–82 | 5–9 / 25–48 | 6–12 / 33–240 | 15–45× / 20–65× |
| Java 25 G1, same memory | 5–10 / 45–80 | 5–9 / 25–48 | 5–12 / 32–235 | 15–45× / 20–65× |
| Java 25 ZGC, larger memory | 5–11 / 35–73 | 5–10 / 24–47 | 5–12 / 29–220 | 13–45× / 20–65× |
| Java 25 G1 at ZGC's memory | 5–10 / 42–79 | 5–9 / 24–47 | 5–12 / 30–230 | 14–45× / 20–65× |

These are forecasts based on the prior JVM pause distributions, active CPU, sealed high-rate ACKs and W1 queue evidence. Short ZGC pauses can coexist with a longer concurrent cycle, higher CPU demand or stalled allocations. Any stall, OOM, missing save or changed durability disqualifies that arm from a clean comparison. The shared transactor and PostgreSQL can still dominate the quiet-account ratio. The pinned reads are bounded probes alongside the unchanged write schedule. The figures do not price a rated 256-reader load. [Part 1 forecasts](PREDICTIONS.md) · [W1 model](../w1/field/predictions.json)

## Allocation headroom and the memory bill

| Role | Largest archived post-GC occupancy (MiB) | Largest net growth between GC events (MiB/s, intervals ≥50 ms) | ZGC initial / soft / hard / cgroup cap (MiB) | Reclaim budget after 1 GiB heap reserve at observed burst rate |
| --- | ---: | ---: | --- | ---: |
| Transactor | 5,120 on the ten-account pilot, at its old heap cap | 1,879 on the older deep archive | 256 / 8,192 / 10,240 / 14,336 | 2.18 s |
| Writer | 1,724 on the deep archive | 1,980 on the deep archive | 256 / 4,096 / 6,144 / 8,192 | 1.72 s |
| Reader | 2,616 on the deep archive | 2,044 on the deep archive | 256 / 5,120 / 7,168 / 9,216 | 1.73 s |

The archived writer's ZGC arm measured 54.00 JFR-weighted MiB/s and 2.536 MiB per ACK over 5,110 saves. The same measured window had a 404 MiB maximum post-collection sample, 37 minor/major cycles, 0.669 s maximum cycle, and zero writer allocation stalls. These numbers are from the shared Mac. The heap after a collection is a live-set proxy. Between-collection growth includes background work, is rounded, and misses concurrent reclamation. The transactor and reader lack ZGC recordings. Actual live set, allocation and reclaim duration under ten-account ZGC must satisfy the budget together. The old transactor reading hit its heap ceiling, so it may understate the live set under pressure. The table provides a refutable starting size and cannot guarantee zero stalls. [TAIL1 archive and measurements](https://github.com/OnboardedInc/Triplex-db-experiments/blob/cabdb286f0236dd12119dd1dfcbab9e32b25b9f0/lab/experiments/EXP-DX1/tail1/MAC.md)

The ZGC and same-sized G1 arms reserve 37 GiB across PostgreSQL and the three JVMs versus 24 GiB for the first two arms, plus client and OS memory in either case. The 13 GiB difference equals about 139,586 bytes per seeded person at this rung if divided evenly. That is reserved capacity. The shared Mac's ZGC writer used 701 MiB more peak residency than the two-core G1 writer, on one 10,000-person seed. The marginal P7 resident-byte slope requires matched population sizes with the active set held fixed. Neither the reservation nor the single-size measurement establishes that slope. [P7 target](../../../TARGETS.md) · [Integrated live-set archive](../int1/P5-EVIDENCE.md)

The integration census now has 10,000- and 30,000-person Java 21 checkpoints at the same 200-person active set. The natural RSS increased by about 11,683 bytes per added untouched person in the transactor, 39 in the writer and 930 in the reader, about 12,651 across the three JVMs on this shared Mac. The transactor's committed heap rose by 211 MiB while its object-cache charge was steady. This is a two-cut reference slope for that older collector and layout. The ZGC slope still depends on its committed heap and page uncommit behavior at corresponding cuts. [Integration census](../int1/P5-EVIDENCE.md)
