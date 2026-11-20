# Server predictions before execution

These are conditional engineering ranges for the W1 field-save workload, open-loop scheduled offer to durable ACK in milliseconds. Each account has 10,000 deep subjects in one shared database. One account writes in each solo window; the paired quiet account stays at 3.5 saves/s while nine neighbours write. All four arms keep the writer collector, storage durability, save semantics and sender placement fixed. A 60-second solo window at 3.5/s gives only 210 offers and a p99 based on the third-slowest observation.

| Arm | Solo 3.5/s p50 / p99 | Solo 23.5/s p50 / p99 | Solo 39.4/s p50 / p99 | Quiet p99 ratio with nine at 3.5/s / 23.5/s / 39.4/s |
| --- | --- | --- | --- | --- |
| Present | 6–10 / 58–82 | 5–9 / 27–43 | 5–10 / 30–65 | 1–1.8× / 18–45× / 20–60× |
| Candidate | 5–9 / 40–64 | 5–9 / 25–40 | 5–10 / 27–57 | 1–1.7× / 15–45× / 20–60× |
| Candidate with 128 MiB index threshold | 5–9 / 42–68 | 5–9 / 25–44 | 5–10 / 28–62 | 1–1.7× / 15–45× / 20–60× |
| Candidate with JIT threshold scaling 1 | 6–11 / 48–76 | 5–10 / 27–45 | 5–10 / 29–61 | 1–1.8× / 16–45× / 20–60× |

The reported 67 ms at 3.5/s and 33 ms at 23.5/s anchor the present solo tails. Their exact raw samples were unavailable when these ranges were written. The W1 shared-queue model puts the quiet p99 ratios above target when total arrivals reach 215 or 358.1/s. JVM changes can reduce intermittently long work, while the single serial queue can still dominate these ratios. Report ACK counts, misses and drain time beside the ratios. [W1 rate model](../w1/field/predictions.json)

At 3.5/s, gaps average 286 ms, against 43 ms at 23.5/s. Earlier Macs showed a gap-dependent WAL and wake-up cost. Faster compilation is one plausible cold-path mechanism worth flipping because it changes neither traffic nor durability. Keep heartbeat and peer TTL at 5 and 10 seconds. We have no live SQL-pool evidence tying a shrink timer to these arrivals. A sustained difference after compiled code has settled would weaken the JIT explanation. Compare latency by prior gap and time since restart, and inspect native and WAL timing before attributing the effect. A fixed-rate contrast also mixes read/cache locality, scheduler timing and small-sample variance. [Idle study](../t1/IDLE-10.md) · [JIT study](../t1/COLD-12.md)
