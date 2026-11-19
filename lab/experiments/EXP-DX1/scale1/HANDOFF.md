# DX-SCALE1 handoff

Measure one shared Datomic commit pipeline first, followed by the same tenant-local writes through separate databases. The comparison holds the quiet account's offers and reader count fixed. [Targets](../../../TARGETS.md)

<!-- state -->
2026-11-19T21:07:07.545Z · Collected arm-d19-i1-reader-a with service result success, 0 physical-scope report(s) and verified cleanup.
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

Each detached arm has its own systemd unit, source, nonce, cgroup ceiling, disk floor and exact-prefix cleanup. The queue waits for terminal and transfer files and rechecks them before advancing. The immutable runtime for the first pair is `f0a80d99a748fcd9ccbe66eadcee50e84f5307a3`. The detached controller uses operator `be8e783534c4cfb047e433c3d1d12ac566e49028`. Its plan records the exact public runtime for each subsequent arm. Its plan includes both layouts for items 3 and 4 and a single million-person seed for item 5. Source preparation starts between timed arms. The server clock is UTC. The first account on the ordered roster is the quiet sentinel. The second performs the release.

Use `control.ts collect TAG` after each terminal arm. Collection verifies manifest bytes, copies summaries and anatomy, and registers the attempt in the durable trace index. Raw traces stay compressed on the server when they exceed 2 GiB or the transfer would leave less than 5 GiB free locally. A capacity estimate and an observed resource limit are recorded separately. An item’s second failed attempt ends the campaign.
