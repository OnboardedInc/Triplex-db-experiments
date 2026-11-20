# DX-SCALE1 handoff

Measure one shared Datomic commit pipeline first, followed by the same tenant-local writes through separate databases. The comparison holds the quiet account's offers and reader count fixed. [Targets](../../../TARGETS.md)

<!-- state -->
The new native seed `arm-p6-i1-seed-a` is running, with an execution ceiling of 08:50:37 UTC November 20. The detached queue `p6-live` advances from its terminal files to staggered and coincident field saves. The new campaign started at 00:49:50 UTC, seven minutes and 33 seconds after the previous queue freed the server. [Previous reader failure](evidence/arm-d19-i1-reader-b-diagnostic.md)
<!-- end state -->

With the dedicated destination set in `BENCH_SERVER`, this command shows the queue, bounded units and stage files.

```sh
node --import tsx lab/experiments/EXP-DX1/scale1/control.ts status
```

| Order | Population and layout | Work | Maximum per execution |
| --- | --- | --- | --- |
| 1 | Ten accounts of 10,000 in one database, then ten databases | Staggered and coincident field-save peaks with group commit off and on in the pooled database, then with group commit off in ten databases. | 8 h setup and up to 10 h per arm |
| 2 | Existing 10,000-person deep and thin zero arms | Commit stages, storage reads and transaction sizes. [Comparison](COMMIT-ANATOMY.md) | Archived result |
| 3 | 100,000 people in one database | Zero, bounded readers, guarded release and DELTA if its on-slot preflight verifies. | 8 h, 8 h, 10 h, 3 h |
| 4 | 90 accounts of 100 and ten of 2,000 in one database, then 100 databases | Idle footprint, sentinel load and restart | 4 h per layout |
| 5 | Ten accounts of 100,000 in one database | Serial seed, then zero, bounded readers and one guarded release as capacity allows. Seed progress and resource ceilings are recorded. | 24 h per execution |

Each detached arm has its own systemd unit, source, nonce, cgroup ceiling, disk floor and exact-prefix cleanup. The queue rechecks terminal and transfer files before advancing. The server clock is UTC. The first account is the quiet sentinel. The second performs the pooled release. For a loaded arm, 64 readers use two worker cores for ten minutes. The model checks every observation and the evidence retains one in 100, plus every error and mismatch.

The detached `triplex-scale1-p6-handoff` unit checks the seed’s terminal files before loading the published controller. The controller records freshly fetched branch heads before each arm. It measures group commit with the fixture’s existing account keys. Fair turns require verified ownership on nested task entities, which the frozen fixture does not supply. Source builds start between measured arms.

Use `control.ts collect TAG` after each terminal arm. Collection verifies manifest bytes, transfers summaries and anatomy within a cumulative limit of 500 MiB per item, and registers the attempt in the durable trace index. Raw archives remain compressed on the server. A failed item yields to the next independent item and stays eligible for retry.

ACT2 runs the 1,000-subject native preflight on each qualifying fresh stack before the large seed. Its release checks bind the public runtime, slot and attempt nonce. The two-account identity regression and 100,000-subject failure that prompted the preflight are documented in the [ACT2 report](../act2/REPORT.md).

The forecasts and their verified observations use the current item numbers in [PREDICTIONS.md](PREDICTIONS.md).
