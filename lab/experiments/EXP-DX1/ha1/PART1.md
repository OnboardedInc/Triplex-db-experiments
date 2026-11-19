# Recovering and moving an account

- When the active transactor died, all three accounts had a new write receipt within 16.64 seconds. This took a second transactor sharing the same database storage.
- Restarting the write gateway took 4.46–4.55 seconds to a new receipt. Restarting the read gateway let writes through within 0.24 seconds. Pinned reads returned within 4.40 seconds.
- Restarting PostgreSQL on its original disk took 4.61–4.63 seconds to a new receipt. The four drills accounted for all 736 commands with zero lost or duplicated writes.
- Moves of 640 to 20,480 facts paused writes for 38.9–42.6 seconds. The neighbor kept writing. At the measured rate, checking a 16-million-fact account alone would take about 32 minutes.
- Removing the PostgreSQL primary and promoting its synchronous copy preserved all 121 previous receipts. A new write succeeded after 19.70 seconds. This requires a second durable copy.
- Local-only and synchronous commits had medians of 14.43 and 12.68 ms and 99th percentiles of 40.18 and 229.21 ms, with 60 writes per mode. The cost across two machines is still open.

The Mac VM ran synthetic accounts through the shipped TypeScript client, the legacy Datomic layout and its native log. Priority 9 requires zero acknowledged loss. Its time bar awaits the owner's seconds-or-minutes decision. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets §1.2](../../../TARGETS.md)

### Failures

Seconds from kill dispatch to a correct ACK for a command first offered after confirmed process exit. Each fault file also records the lower bound from kill completion. Each triple lists scopes 0, 1 and 2 in order. The read column uses the old pin. The feed column ends when the live cursor delivered the new write. Polling was every 160 ms after each response.

| Killed role | New receipt (s) | Pinned read (s) | Fresh feed entry (s) |
| --- | --- | --- | --- |
| Active transactor | 16.627 / 16.628 / 16.633 | 0.309 / 0.309 / 0.310 | 16.772 / 16.655 / 16.644 |
| Write gateway | 4.463 / 4.546 / 4.491 | 0.284 / 0.284 / 0.284 | 4.473 / 4.650 / 4.654 |
| Read gateway | 0.233 / 0.233 / 0.229 | 4.396 / 4.396 / 4.396 | 5.087 / 5.095 / 5.012 |
| PostgreSQL | 4.623 / 4.624 / 4.609 | 0.302 / 0.302 / 0.295 | 4.776 / 4.771 / 4.782 |

At kill completion, one ordinary write per scope still lacked a reply. The three writes pending at transactor loss received temporary `TransactionRejected` errors and eventually published once. The write-gateway and PostgreSQL retries recovered their original receipts, and the read-gateway cases received their ordinary ACKs. Of 36 additional requests held at the transport, 24 recovered their original receipts and all 12 withheld before forwarding published once. The three final scope counts were 243, 244 and 249. Only the read gateway kill caused pinned-read and feed poll errors. The complete replay matched every change and preserved order.

The surviving peer found the elected transactor automatically. The standby had a 560 MiB cap and each gateway a 672 MiB cap in this fixture. The drill restarted killed gateways at their original addresses and restarted PostgreSQL on its original volume. The TypeScript driver retained the operation ID, retrieved its receipt after ambiguity, retried the same valid payload, and resumed from its saved log cursor. [Datomic HA](https://docs.datomic.com/operation/ha.html)

### Moving and protecting storage

| Seed facts | Final backup bytes | Write pause | Full move | Neighbor writes during pause |
| ---: | ---: | ---: | ---: | ---: |
| 640 | 49,527 | 38.88 s | 59.55 s | 121 |
| 5,120 | 241,450 | 40.12 s | 58.36 s | 125 |
| 20,480 | 2,462,638 | 42.56 s | 61.99 s | 133 |
| 20,480 (repeat) | 2,462,270 | 41.80 s | 60.27 s | 131 |

The moving scope had a dedicated SQL database and login. A neighbor used a separate database on the same primary. A live backup and offline restore preceded the fence. Revoking the writer login and table writes, closing its sessions, and rejecting both a stale write and a fresh login made the final cut transferable. A read-only backup login captured the suffix. The client reopened the destination and checked its old facts, receipts and cursor before the first new write. The repeated 20,480-fact final restore copied 0 segments and reused 281. The first and second restores took 7.18 and 7.27 seconds. [Datomic backup and restore](https://docs.datomic.com/operation/backup.html)

**16 million facts.** Checking 20,480 restored facts across 128 people took 2.45 s of serial receipt, claim and value reads (19.2 ms/person). At that rate, 100,000 people take 31.9 minutes for those checks alone. Holding the other measured steps fixed gives a 32.6-minute pause and 32.9-minute full move. This scenario excludes extra transfer, index and history cost at scale. The backup grew 2.22 MB between the last two size rungs, versus 0.66 MB extrapolated from the first two. Full-scale timing needs the two-host run. Set `HA1_PEOPLE=100000` for the direct measurement.

An independent durable volume can keep one PostgreSQL primary's flushed WAL across compute loss. Its normal cost is the volume's durable flush latency, with fencing, attachment and recovery at failover. A synchronous PostgreSQL standby adds storage and compute and gates commit on remote durable WAL. Replication distance and flush latency can affect several SQL commits per Datomic receipt. Asynchronous shipping can lose an acknowledged suffix. With one required standby, its loss can stall commits. The promoted primary in this drill needs a replacement standby to protect its next writes. [Transactor write path](https://github.com/OnboardedInc/Triplex-db-experiments/blob/exp/DX-RE1-transactor/lab/experiments/EXP-DX1/re1/TRANSACTOR-NOTES.md) · [PostgreSQL 17 commit modes](https://www.postgresql.org/docs/17/runtime-config-wal.html#GUC-SYNCHRONOUS-COMMIT)

### Evidence and audit

- Engine admission, attempt headers and terminal observations bind a fresh nonce, slot, Git revision, executable hashes, read-back gateway bytes, image/container IDs, memory caps and verified removal. Source was `6fdc0ae2a` for sustained faults and two size rungs, `0d347ebe5` for replication and the 640-fact baseline, and `068815b67` for the instrumented repeat. [Evidence index](EVIDENCE.md) · [SHA256SUMS](SHA256SUMS)
- `ackProxy` saves the request and available response bytes. `Account.remember/pinned/checkEntry/verify` check immutable operation, record time, native t, logical position, claim, every surviving value and the full ordered feed against authored inputs. The failure drill requires verified process death, one normal write in flight per scope and positive post-fault reads and writes. [Failure driver](failures.ts)
- Move checks both listed cuts, full segment verification, vendor restore identity, source fencing, full destination content and neighbor progress. Replication checks the named standby, cluster identity, remote flush and replay LSNs, old-primary removal and a fresh destination write. The collector verifies archive bytes, campaign and trial nonces, source, sizes and cleanup. [Move](move.ts) · [Replication](replication.ts) · [Collection](control.ts)
- Offline checks cover the harness types, five negative or boundary tests and 98 existing client/feed tests. Two-server commands are prepared for failures, move and replication. The bench servers were unused. Whole-host power loss, a production-sized mixed fleet, a shared-store per-scope fence and protected-data restore remain unverified. [Bench commands](BENCH.md)
- The wider lab JavaScript check reports one inherited omission. `packages/datomic/test/report-revision-race.mjs` is missing from both its checked-file list and its exclusions. The test, checker and both lists match the starting revision byte for byte.
