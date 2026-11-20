# Failover procedure

Priority 9 measures earlier ACK loss, time to the first new correct receipt, exact pinned reads and the planned write pause. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

The source uses PostgreSQL 17 physical streaming with `fsync=on`, `full_page_writes=on`, `synchronous_commit=on` and one named synchronous standby. PostgreSQL stores the second copy of the complete Datomic storage log, including index writes. The public write path uses the existing operation ID and performs no JDBC statement cancellation. Prevent app users from changing session durability or reaching PostgreSQL directly. Keep both hosts and their disks independent. [PostgreSQL 17 synchronous replication](https://www.postgresql.org/docs/17/warm-standby.html#SYNCHRONOUS-REPLICATION)

The two Datomic transactors share the same writable SQL cluster. B's transactor uses the two SQL addresses with pgJDBC's `targetServerType=primary`. The gateways use the existing Datomic Peer API. The reader is on B with its SQL reads pinned to B. Its ordinary reads still issue database work during the cut. The TypeScript ingress keeps one writer route and rejects replies from a sealed generation. The original operation ID resolves an ambiguous reply after rerouting. [Datomic HA](https://docs.datomic.com/operation/ha.html) · [pgJDBC connection options](https://jdbc.postgresql.org/documentation/use/)

1. Watch the current primary and named standby. On primary failure or a stalled synchronous commit, confirm the survivor's identity and recovery state before fencing. When the standby is unavailable, leave the primary up with its original synchronous settings.
2. Seal writer ingress. For a planned move, first check the live replay floor, drain requests, then stop the old transactor and capture the final source flush point.
3. Persist the attempt and cluster ID in an interlock outside the two old processes. Stop the exact old PostgreSQL and Datomic containers, verify their stopped states and check that both mount the interlock read-only. Both entry points refuse startup while the interlock exists. An unavailable management plane leaves ingress sealed.
4. Verify the survivor's cluster and timeline, then replay its locally durable receive point and all previously observed confirmed flushes. Promote and observe the next timeline.
5. Confirm the intended durability setting, observe the elected transactor and require a fresh synchronization from the B gateway. Open the same writer ingress to B. Continue pinned reads through B throughout. Rejoin an old database only after rebuilding or rewinding the storage as a standby with a new startup configuration. [PostgreSQL failover](https://www.postgresql.org/docs/17/warm-standby-failover.html) · [pg_rewind](https://www.postgresql.org/docs/17/app-pgrewind.html)

The lab's latch fences its own Docker processes via the management plane. An unreachable machine requires a separately reachable power controller or storage fabric. Pass its provisioned executable through `powerFence(executable)` as the third argument to `SyncPair`. The executable receives `fence` with a challenge and owner, then `observe` with its ticket. The observer must confirm that A cannot reach writable storage or restart as writer, and return the same cluster, epoch, owner IDs, challenge and ticket with `state: "isolated"` and `restartLatched: true`. This adapter is separate from the Docker drill. [Adapter](power-fence.ts)

The explicit single-copy mode restores write service after the first failure. Use strict two-copy mode when every new ACK must survive another machine loss. A third durable copy or a returned standby is required to keep both the protection and the recovery clock in that case.

| Timer                                         |                            Value | Reason                                                                                                |
| --------------------------------------------- | -------------------------------: | ----------------------------------------------------------------------------------------------------- |
| Health sample / misses                        |                       250 ms / 3 | Ignore one delayed probe and detect three consecutive failures.                                       |
| SQL stall / detection budget                  |                       2 s / 15 s | Separate a blocked sync commit from ordinary remote flushes, including detector delays.               |
| Admin command                                 |         1.8 s client, 1.55 s SQL | Bound a dead probe and leave room for transport. Only controller sessions use the SQL timeout.        |
| Fence / planned drain                         |                        8 s / 4 s | Bound management read-back and settled in-flight requests. An unproved fence leaves the route sealed. |
| Replay / promotion                            |                         5 s each | Admit a near-current survivor and verify a new timeline promptly.                                     |
| Datomic heartbeat / broker and peer           |                 5 s / 23 s total | Keep the documented heartbeat and allow time for peer discovery and recent log replay.                |
| SQL connect and host recheck                  |                         1 s each | Prefer prompt failover of new JDBC connections. No SQL socket deadline on commits.                    |
| WAL connection / sender and receiver / report |             2 s / 5 s each / 1 s | Bound reconnection and surface broken replication while ignoring ordinary link jitter.                |
| Ingress request / setup poll                  |                     15 s / 120 s | Bounded HTTP request outcome and a separately timed initial JVM or database startup.                  |
| Planned PostgreSQL stop / rewind              | 2 s shutdown grace / 15 s rewind | Allow a clean checkpoint on A and bound how long A may take to rejoin before the writer stays sealed. |

The planned procedure copies live and checks replay before the writer pause. The new primary opens after the fenced volume returns in a new container as the named synchronous standby. The 30-second observation starts when ingress closes and ends at the first verified two-copy receipt. Copy time grows with physical bytes and WAL generated during the copy. The pause includes the final WAL tail, filesystem scan and changed blocks during rewind, the new transactor's recent log replay, and peer rediscovery.

The lab allows 6 minutes to restore each prepared deep checkpoint. The fault injector budgets 5 seconds to find its SQL lock owner, 10 to see the Datomic SQL wait, and 7 to confirm an asymmetric WAL cut. Its lock can hold for 35 seconds so it remains in place until the abrupt stop. The oracle process has a 30-second budget for the small witness replay. The existing client polls pinned reads every 80 ms and resolves ambiguous writes every 130 ms for up to 150 seconds. That retry ceiling preserves outcomes even when a timing target is missed. [Fault driver](faults.ts) · [Existing client fixture](../../../../packages/datomic/test/ha1-account.ts)

Local entry point after building the Datomic TypeScript package:

```sh
node lab/bin/heavy.mjs --label DX-HASYNC1 -- node --import tsx lab/bin/engine.mjs ha1 --holder DX-HASYNC1 --slot auto --experiment hasync-smoke --people 8
```

The scheduled-load driver starts 900 ms before the cut and samples at five field saves and 50 pinned reads per second per system. It keeps offering for 1.5 seconds after routing, up to 90 seconds total. The caller deadline is one second. The 5.5-second wire deadline exposes late completions and still bounds outstanding requests. At most 32 saves and 64 reads are dispatched at a time per system. The raw stream distinguishes sender admission, gateway refusal and wire timeout.

The fleet role sampler waits 11 seconds between cgroup readings to cover two Datomic heartbeat intervals. Its PostgreSQL admin SQL budget is three seconds. After promotion, each native Datomic broker and its gateway share the usual 23-second readiness budget. The independent controller retains its own durable revocation and reads the power or storage interlock before returning isolation. [Fence](FENCE.md)

The local scale controller admits each engine invocation separately through the heavy runner. It retains one private checkpoint for the three drills at each rung and removes it after their resources have closed.

```sh
node --import tsx lab/experiments/EXP-DX1/hasync1/v2/scale-local.ts 740 6300 17000
```
