# DX-SCALE1 handoff

Measure one shared Datomic commit pipeline first, followed by the same tenant-local writes through separate databases. The comparison holds the quiet account's offers and reader count fixed. [Targets](../../../TARGETS.md)

<!-- state -->
The owner restarted the campaign with the ten-account native seed first. The pooled setup is `arm-p6-i1-seed-a`, followed by staggered and coincident field saves. The earlier stop below belongs to the previous queue.

The campaign stopped at 00:42:17 UTC November 20 (19:42:17 ET November 19) after item 1’s second failed reader. The first attempt missed local-replica coverage. The retry reached its 64 GiB observation limit at 00:39:48 UTC. Its stack was released at 00:40:24 UTC and the verified 11,090,251,343-byte raw archive completed on the server at 00:42:11 UTC. The server is free. Items 2–5 and their six new field-save executions are unstarted. The four compact transfers are indexed. [Failure evidence](evidence/arm-d19-i1-reader-b-diagnostic.md)
<!-- end state -->

With the dedicated destination set in `BENCH_SERVER`, this command shows the queue, bounded units and stage files.

```sh
node --import tsx lab/experiments/EXP-DX1/scale1/control.ts status
```

| Order | Population and layout | Work | Maximum per execution |
| --- | --- | --- | --- |
| 1 | 10,000 people in one database | Zero, then readers | 4 h each |
| 2 | 100,000 people in one database | Zero, readers, guarded release | 8 h, 8 h, 10 h |
| 3 | Ten accounts of 10,000 in one database, then ten databases | 1, 2, 5 and 10 live, neighbor bursts, all-ten burst and one release. A third pooled arm enables group commit for the matched all-ten burst. The six deep-live executions repeat the two peak alignments in pooled individual, pooled grouped and separate individual configurations. | 10 h per arm |
| 4 | 90 accounts of 100 and ten of 2,000 in one database, then 100 databases | Idle footprint, sentinel load and restart | 4 h per layout |
| 5 | Ten accounts of 100,000 in one database | Serial seed, zero, readers, one guarded release. If only seeding fits, the zero-offer fallback records growth and the resource limit. | 24 h per execution |

Each detached arm has its own systemd unit, source, nonce, cgroup ceiling, disk floor and exact-prefix cleanup. The queue rechecks terminal and transfer files before advancing. The original pair used `f0a80d99a748fcd9ccbe66eadcee50e84f5307a3`. The reader retry names the zero control on its corrected revision. The live plan records the exact public runtime for each arm, both layouts for items 3 and 4 and the single million-person seed for item 5. The server clock is UTC. The first account is the quiet sentinel. The second performs the release.

The detached `triplex-scale1-part4-handoff` unit checks both terminal receipts from the replacement pair before loading the integrated public controller. The continuation includes the all-ten-burst group-commit arm and closes on the second failure of any item. Source builds start between measured arms.

Use `control.ts collect TAG` after each terminal arm. Collection verifies manifest bytes, transfers summaries and anatomy within a cumulative limit of 500 MiB per item, and registers the attempt in the durable trace index. Every raw archive stays compressed on the server. An item’s second failed attempt ends the campaign.

ACT2 runs the 1,000-subject native preflight on each qualifying fresh stack before the large seed. Its release checks bind the public runtime, slot and attempt nonce. The two-account identity regression and 100,000-subject failure that prompted the preflight are documented in the [ACT2 report](../act2/REPORT.md).

The before-run forecasts for items 2–5 and their verified observations are in [PREDICTIONS.md](PREDICTIONS.md). The six field-save executions belong to item 3.
