# DX-SCALE1 handoff

Measure one shared Datomic commit pipeline first, followed by the same tenant-local writes through separate databases. The comparison holds the quiet account's offers and reader count fixed. [Targets](../../../TARGETS.md)

<!-- state -->
2026-11-19 21:15 UTC. The replacement 10k zero control, `arm-d19-i1-zero-b`, began at 21:14:11 UTC using `69220f279`. Its ceiling is 01:14:11 UTC November 20, followed by scoped cleanup. Its matched reader follows with a four-hour ceiling. The first reader sent all 77,838 reads at four ladder levels to the gateway and was cleaned at 21:04:42 UTC. Both original attempts are indexed. A second failure of item 1 stops the queue.
<!-- end state -->

With the dedicated destination set in `BENCH_SERVER`, this command shows the queue, bounded units and stage files.

```sh
node --import tsx lab/experiments/EXP-DX1/scale1/control.ts status
```

| Order | Population and layout | Work | Maximum per execution |
| --- | --- | --- | --- |
| 1 | 10,000 people in one database | Zero, then readers | 4 h each |
| 2 | 100,000 people in one database | Zero, readers, guarded release | 8 h, 8 h, 10 h |
| 3 | Ten accounts of 10,000 in one database, then ten databases | 1, 2, 5 and 10 live, neighbor bursts, all-ten burst and one release. A third pooled arm enables group commit for the matched all-ten burst. | 10 h per arm |
| 4 | 90 accounts of 100 and ten of 2,000 in one database, then 100 databases | Idle footprint, sentinel load and restart | 4 h per layout |
| 5 | Ten accounts of 100,000 in one database | Serial seed, zero, readers, one guarded release | 24 h per execution |

Each detached arm has its own systemd unit, source, nonce, cgroup ceiling, disk floor and exact-prefix cleanup. The queue rechecks terminal and transfer files before advancing. The original pair used `f0a80d99a748fcd9ccbe66eadcee50e84f5307a3`. The reader retry names the zero control on its corrected revision. The live plan records the exact public runtime for each arm, both layouts for items 3 and 4 and the single million-person seed for item 5. The server clock is UTC. The first account is the quiet sentinel. The second performs the release.

Use `control.ts collect TAG` after each terminal arm. Collection verifies manifest bytes, transfers summaries and anatomy within a cumulative limit of 500 MiB per item, and registers the attempt in the durable trace index. Every raw archive stays compressed on the server. An item’s second failed attempt ends the campaign.

ACT2 runs the 1,000-subject native preflight on each qualifying fresh stack before the large seed. Its release checks bind the public runtime, slot and attempt nonce. The two-account identity regression and 100,000-subject failure that prompted the preflight are documented in the [ACT2 report](../act2/REPORT.md).
