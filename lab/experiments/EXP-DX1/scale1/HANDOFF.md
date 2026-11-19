# DX-SCALE1 handoff

Measure one shared Datomic commit pipeline first, followed by the same tenant-local writes through separate databases. The comparison holds the quiet account's offers and reader count fixed. [Targets](../../../TARGETS.md)

<!-- state -->
2026-11-19 21:10 UTC. The first reader attempt failed replica coverage. Its four completed ladder levels sent all 77,838 reads to the gateway. The stack was released at 21:04:42 UTC and the 388 MiB compressed trace was verified on the Mac. The next steps are a new 10k zero control and its matched reader, each with a four-hour ceiling. A second failure of item 1 stops the queue.
<!-- end state -->

With the dedicated destination set in `BENCH_SERVER`, this command shows the queue, bounded units and stage files.

```sh
node --import tsx lab/experiments/EXP-DX1/scale1/control.ts status
```

| Order | Population and layout | Work | Maximum per execution |
| --- | --- | --- | --- |
| 1 | 10,000 people in one database | Zero, then readers | 4 h each |
| 2 | 100,000 people in one database | Zero, readers, guarded release | 8 h, 8 h, 10 h |
| 3 | Ten accounts of 10,000 in one database, then ten databases | 1, 2, 5 and 10 live, neighbor bursts, all-ten burst, one release | 10 h per layout |
| 4 | 90 accounts of 100 and ten of 2,000 in one database, then 100 databases | Idle footprint, sentinel load and restart | 4 h per layout |
| 5 | Ten accounts of 100,000 in one database | Serial seed, zero, readers, one guarded release | 24 h per execution |

Each detached arm has its own systemd unit, source, nonce, cgroup ceiling, disk floor and exact-prefix cleanup. The queue rechecks terminal and transfer files before advancing. The original pair used `f0a80d99a748fcd9ccbe66eadcee50e84f5307a3`. The reader retry names the zero control on its corrected revision. The live plan records the exact public runtime for each arm, both layouts for items 3 and 4 and the single million-person seed for item 5. The server clock is UTC. The first account is the quiet sentinel. The second performs the release.

Use `control.ts collect TAG` after each terminal arm. Collection verifies manifest bytes, copies summaries and anatomy, and registers the attempt in the durable trace index. Raw traces stay compressed on the server when they exceed 2 GiB or the transfer would leave less than 5 GiB free locally. A capacity estimate and an observed resource limit are recorded separately. An item’s second failed attempt ends the campaign.
