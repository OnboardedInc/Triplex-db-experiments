# Synchronous recovery and database moves

All seven Mac fault drills preserved every write that had already been acknowledged.
A new write arrived in 11.95 to 22.22 seconds.
Readers answered 1,234 times during those cuts, and the answers we checked stayed the same afterwards.
Both old writer processes refused to start after the switch.
A planned move paused writes for 9.18 seconds and reopened with both copies required for every reply.
After sudden loss, new writes have one durable copy until another standby returns.

**Priority 9.** The Mac runs were diagnostics with eight starting subjects and 1,280 facts per run. Full machine loss, standby-loss routing and bare-metal timings remain open. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md) · [Procedure and timeouts](PROCEDURE.md)

| Mac fault                                          | Earlier receipts kept | First new write (s) | Pinned reads during cut |
| -------------------------------------------------- | --------------------: | ------------------: | ----------------------: |
| Primary killed while updating the log pointer      |                 10/10 |               14.85 |                     171 |
| Primary killed after the log write, reply withheld |                   9/9 |               18.08 |                     210 |
| Primary killed with an index job writing           |                 17/17 |               22.22 |                     149 |
| Primary killed during one 2,000-fact import        |                 10/10 |               12.66 |                     142 |
| WAL from primary to standby cut                    |                   9/9 |               11.95 |                     141 |
| Standby replies to primary cut                     |                   9/9 |               20.15 |                     237 |
| Old primary and transactor restarted               |                   9/9 |               15.86 |                     184 |

The native feed matched the authored order and changes with zero duplicate saves. O-REPLAY compared real rows at each witness cut. The withheld write returned its original receipt. The interrupted import was absent on B before retry and published all 2,000 facts once after retry. A WAL-cut rerun with the new survivor check took 11.30 s and kept all nine earlier receipts. [Evidence and receipt audit](EVIDENCE.md)

| Mac saves outstanding | Grouping | Local → sync p50 (ms) | p50 ratio | p99 ratio | Elapsed ms/save ratio |
| --------------------: | -------- | --------------------: | --------: | --------: | --------------------: |
|                     1 | Off      |         10.83 → 11.90 |      1.10 |      0.76 |                  0.98 |
|                    16 | Off      |         55.12 → 40.21 |      0.73 |      0.70 |                  0.75 |
|                    64 | Off      |        170.89 → 98.01 |      0.57 |      0.79 |                  0.70 |
|                     1 | W1       |         12.31 → 12.46 |      1.01 |      3.41 |                  1.22 |
|                    16 | W1       |         54.12 → 57.29 |      1.06 |      1.70 |                  1.24 |
|                    64 | W1       |       149.49 → 157.86 |      1.06 |      0.71 |                  0.90 |

There were 256 saves per durability setting per cell. At depths 16 and 64, W1 averaged 7.53 saves per synchronous native transaction. The Mac controls varied sharply by block. At 0.089 ms RTT I predict +0.23–0.74 ms for an isolated save and +0.03–0.19 ms of service per save in groups of four to eight. [Cost driver](cost.ts) · [Bench predictions](BENCH.md)

**Planned move.** The live copy took 0.91 s while the source accepted writes. A rejoined as a read-only synchronous standby after rewind. All 15 earlier receipts survived, and 103 pinned probes succeeded during the 9.18 s pause. The inherited small move took 15.47–15.62 s. I predict 18–29 s at 16M and 21–38 s at 160M, with a small final WAL tail. Live precopy grows from an estimated 6–12 GB to 60–120 GB. Rewind scans and changed blocks, recent Datomic log replay and reconnects affect the pause. [Move driver](move.ts) · [Prior measurements](../ha1/PART2-MEASUREMENTS.md)

**Two-server campaign.** Predicted 66–84 minutes on the released, prepared pair. Parallel seeds establish 100,000 subjects per layout. The working budget is 85 minutes, with an 89-minute service cutoff. Bench execution is pending. A full machine-loss run needs an independent reboot-safe fence. [Commands, conditions and predictions](BENCH.md)

```sh
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts hasync-suite hasync-p9
```

Scoped TypeScript, 16 focused tests and the latch/route checks passed. The broader oracle suite had three failures in unchanged contract coverage and the HAM source hash. All started Mac volumes were removed. No acceptance pin moved. [Evidence index](EVIDENCE.md) · [Checksums](SHA256SUMS)

Part 2 records independent scheduled offers at five one-to-three-fact saves and 50 pinned reads per second per system. It seals the offer and outcome stream before resolving ambiguous saves under the original command IDs. Recovery clocks distinguish a newly offered on-time save from a recovered original or a late answer. [Schedule and recount](offers.ts)

The edited deep rungs target 100,549, 1,000,464 and 2,704,806 active facts, with three retire-and-replace revisions on every fifth subject. Timings distinguish rewind, promotion, broker readiness, peer synchronization and first-touch exact reads. [Scale driver](v2/scale-local.ts)
