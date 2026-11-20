# Two-server synchronous failover campaign

Priority 9 requires zero earlier acknowledged loss, reads during recovery, new writes within 60 seconds, and a planned pause within 30 seconds. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

From the clean published experiment worktree, the orchestrator supplies the two assigned SSH targets through `BENCH_SERVER` and `BENCH_SERVER_B` and their dedicated IPv4 link through `HA1_LINK_A` and `HA1_LINK_B`. Existing HA1 SSH credentials and the dedicated host manifests are required with role `DX-HASYNC1`. Use a new tag for each attempt.

```sh
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts hasync-suite hasync-p9
```

A hosts the initial PostgreSQL primary, Datomic transactor and write gateway for the fault and move cells. B hosts the standby SQL copy, standby transactor, surviving gateway and observer. The synchronous cost cells use B as initial primary for both group settings. Both checked-out builds are bound to the published revision and container images. The relay alters only the WAL link for the two directional faults. No periodic traffic keeps JVMs, connections, scopes or caches warm between trials.

The campaign builds the legacy checkpoint on A and the strict lean checkpoint on B in parallel, using 16,045,255 canonical facts each with exact typed references. PostgreSQL verifies both backup manifests. Each trial restores the appropriate checkpoint, confirms its identity and rereads all seed receipts before and after the test. The fault witnesses use independent replay and exact ordered feed and pinned reads. Seed receipt equality and physical backup verification cover the scale fixture.

The budget assumes both servers are released and bootstrap artifacts are prepared. The worker allows 57 minutes for the parallel seeds and uses an 89-minute service ceiling. A seed miss stops the campaign with partial evidence. Earlier quiet imports delivered 4,578–4,669 facts/s on one server, so two serial seeds risk exhausting the allocation. Storage assumptions are 6–12 GB per checkpoint and 80–180 MB/s effective base-copy rate. Allow about 40 GB free per host for its checkpoint, the active copy and WAL. [Earlier loader measurements](https://github.com/OnboardedInc/Triplex-db-experiments/blob/530f435d2/lab/experiments/EXP-DX1/load1/PART3.md)

| Probe                                                 | Prediction                                                        | Expected observation                                                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Both deep checkpoint builds                           | 43–56 min                                                         | ≥9,550 combined facts/s, with the live index and backup check in the seed budget                                                |
| Mid-commit, held ACK, index job and 2,000-fact import | 18–40 s to a new write                                            | Zero earlier ACK loss, no duplicate position or feed gap, zero changed pinned answers. One-copy service until a standby returns |
| Block WAL A → B and block reports B → A               | 19–45 s                                                           | No ACK from the blocked connection. Both directions show distinct positive trap evidence                                        |
| Restart old PostgreSQL and transactor                 | 18–42 s                                                           | Both startup guards refuse the fenced incarnation                                                                               |
| Remote flush at depth 1, with or without W1           | +0.23–0.74 ms per save, about 1.02–1.15× median                   | Two sequential remote flushes on the ordinary append path at 0.089 ms same-site RTT                                             |
| Remote flush at depth 16 / 64 without W1              | +0.23–0.74 ms of service per save before native batching          | About 1.02–1.15× elapsed time per save under the same queue mix                                                                 |
| Remote flush at depth 16 / 64 with W1                 | +0.03–0.19 ms of service per save at 4–8 logical saves per append | About 1.01–1.08× elapsed time per save if groups reach that size. Compare observed native transaction membership                |
| Planned 16M / 160M move                               | 18–29 / 21–38 s to a new protected write                          | Precopy and seed checks complete before the pause. Only the replay tail, rewind and peer transition are inside it               |
| Whole 100k campaign                                   | 66–84 min                                                         | 12 complete stages with cleanup and an evidence archive below 1 GiB                                                             |

Cost ratios are forecasts for this topology, and separate elapsed time per save from caller latency while other saves are outstanding. A queued save sees native serialization, batching and scheduling. The upper move forecast at 160M exceeds 30 seconds. The server suite tests 16M first. [W1 grouping](https://github.com/OnboardedInc/Triplex-db-experiments/commit/6756ed177) · [Prior recovery and copy measurements](../ha1/PART2-MEASUREMENTS.md)

The suite stops dedicated processes through the management channel. A whole-host power test needs an independent fence that survives loss of A. Two-copy durability for every new write after losing A needs a replacement durable standby.
