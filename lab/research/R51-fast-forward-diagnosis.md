# R51: what lanes X and D are doing wrong, and the design that jumps to the bars (orchestrator, 2026-11-09 night)

**North star.** All five priorities (`lab/NORTH-STAR.md`), bars in `lab/TARGETS.md` section 1. Done means P1 to P5 all meet their bars
on lane D (Datomic on Postgres storage) or on lane X (native XTDB). Written under `lab/PROTOCOL.md` section 0b (fast-forward mode).

## 1. The five mistakes

| # | Mistake | Evidence | Cost |
| --- | --- | --- | --- |
| 1 | **Every engine is used as a row table behind a chatty row-at-a-time adapter interface.** The core asks the adapter for one claim, one row, one entity level at a time. | `packages/core/src/store/TriplesLive.ts:252-480` (claim read, `getById` per retract, then the adapter reads the row again in `retract`); `lab/bench/lib/composition.ts` pull = one call per hop | Datomic commit: begin, claim, 2 reads per retract, transact, release = 6 or more HTTP round trips. XTDB commit: 8 statements and 3 point reads, about 25 of 33 ms (EXP-XN1 brief section 1). A pull is 3 to 6 sequential round trips. |
| 2 | **The Datomic gateway asks the transactor on every read.** `sync-db` calls `d/sync` with no argument for every request, reads included. | `packages/datomic/gateway/src/triplex/gateway/main.clj:10,89-92` | It cancels the property the lane was chosen for (reads never touch the writer). Each read pays a transactor round trip, and 256 readers load the one transactor. P1 cannot pass like this. |
| 3 | **Each Triplex fact is about 9 Datomic datoms, read back through the entity API.** A read touches about 20 attributes per fact, several of them refs that need another lookup. | `storage.clj:37-58` (`fact-map`), `:134-149` (`raw-row`) | A 450-fact pull is about 9,000 lazy attribute lookups. The EXP-DN1 brief predicted 250 to 700 pulls per CPU-second against a bar of 1,100; it is likely lower. Record-time bases use the history route, which scans every fact the subject ever had, so cost grows with history (P4 flatness). |
| 4 | **XTDB's own floors sit at the bars before our code adds anything.** One node, one JVM for reads and the indexer, two fsyncs per commit, a SQL query per read. | R16 1.2 (85 to 124 queries/s on about 1.1 CPUs; commit service 17 ms to 90-112 ms with 4 readers); P2X2 F3 (pipelined 10-fact commit 5.8 to 7.7 ms p50); R16 1.1 (followers need Kafka) | P4 needs 1,100 pulls per CPU-second and a pull is at least one query: R16 measured about 100 queries per CPU-second on a loaded host. P1 needs writer p99 within 1.25x at 256 readers in the same JVM. Statement cuts (EXP-XN1) fix P2 p50 only. |
| 5 | **The loop optimised review rounds, not the path to a number.** Lane D has zero P1 to P5 measurements after two days. Accepted work sits on 20 unmerged branches. OBS01 took 18 rounds. | `lab/SCORECARD.md` section 1 (all OPEN); `git worktree list` | Fixed by PROTOCOL 0b: spikes first, one review at the end. |

## 2. What the workload is, and what that implies

A command writes 5 to 50 facts about one subject and a person waits for it. A read pulls one subject's whole world at one basis:
on the frozen benchmark about 450 facts in about 95 entities on average, most of them requirement entities shared by the 500 subjects
of one account (`lab/bench/lib/world.ts`). The store is therefore tuned for two coarse operations, each of which must be one round
trip that the engine answers from one snapshot:

```
 commit(command)  ->  1 prefetch round trip (claim + rows to retract) + 1 transaction        P2
 pull(root, basis) -> 1 round trip; the engine walks the refs itself at one snapshot           P1, P4, P5
                      and returns rows that were encoded once, at write time
```

Lane Q reached 1,130 pulls per CPU-second only after it stopped decoding rows per read and served pre-built per-owner documents
(`EXP-P4N/ROUND2-STATUS.md`). Lanes D and X start from that lesson instead of rediscovering it.

## 3. Why Datomic is the lane that can jump

Datomic's process model is the shape TARGETS section 4 asks for, already built:

```
 writers --> gateway W (peer) --> transactor (serial, one log write per tx) --> Postgres (WAL fsync)
                                        | pushes each committed tx to every peer
                 +----------------------+----------------------+
                 v                                             v
        gateway R1 (peer, own CPUs)                   sweep peer (own CPUs)
        immutable db values in process:               one as-of value for 100k pulls
        any basis t, no locks, no transactor
```

| Priority | What Datomic gives natively | What we must stop or add |
| --- | --- | --- |
| P1 | Reads run in the peer on an immutable value; a second peer process shares nothing with the write path but storage | Stop `d/sync` on reads. Read gateways on their own CPUs, separate from the write gateway and the transactor. |
| P2 | One serial transactor, one storage write per transaction | 2 round trips per command instead of 6+. Fewer datoms per command if the spike shows datom count sets latency. |
| P3 | Every peer is pushed each transaction in order (`tx-report-queue`), and the log is readable by range | Already built (EXP-DF01). Lag is one long-poll plus one SQLite write. |
| P4 | An index seek in a warm peer is microseconds; `as-of` gives any past basis on the same index | One datom per row holding the row already encoded for the wire, grouped under its entity; the pull walks refs in the peer; an entity cache in the peer keyed by basis validity. |
| P5 | One `as-of` value shared by every sweep worker; a separate peer for the sweep | A batch pull endpoint that returns shared entities once per page. |

XTDB has none of the three structural pieces (reads in another process, pushed transactions, microsecond point reads). Reaching P4 and
P1 on lane X means building a write-through multi-version cache server in front of XTDB, which is Datomic's peer rebuilt by us. Lane X
therefore gets one decisive floor measurement now (EXP-XN1 spike S1) and lane D gets the build.

## 4. Lane D target design (EXP-DX1)

1. **Row datoms.** A new attribute `:triplex.entity/row` (string, cardinality many) on the entity. Its value is the row encoded once by
   the TypeScript adapter: a fixed-width header (row id, valid-from, valid-to, ref target) followed by the row's compact JSON. Assert
   adds one datom; retract removes that datom. The existing reified fact datoms stay as the system of record for queries and history.
2. **Reach in the peer.** `POST /v2/db/{db}/reach` walks refs breadth-first over row datoms at one db value and writes the JSON parts
   straight to the response. The gateway never decodes or re-encodes a value. The adapter exposes it as `getReachTriples`
   (`Triples.reach`, merged from EXP-QH1).
3. **Basis to db value, exactly.** Position P: the db `as-of` the transaction whose `:triplex.tx/position` is P (existing rule).
   Record time R: the db just before the first transaction whose running maximum recorded-at exceeds R, valid only while record times
   never regressed (a flag in the scope). Anything else declines and the adapter falls back to the existing path.
4. **No transactor on reads.** Reads use `(d/db conn)`; a read that names a position the peer has not seen waits on `(d/sync conn t)`
   (local) or a 1 ms poll, never the 10 ms sleep.
5. **Two round trips per commit.** The core passes the command id and the ids it will retract as a hint; the adapter's first request
   returns the snapshot handle, the position, the claim and those rows; the transact request releases the handle.
6. **Equivalence is the safety net.** A property test replays random command sequences and compares the fast route with the existing
   history route at random bases (position, record time, valid time). Any difference fails; declining is allowed.
7. **Later, measured first:** an entity cache in the peer (versions valid from fill until the first transaction that touches the
   entity), per-subject compare-and-set inside a transaction function, and a lean fact encoding if datom count sets commit latency.

## 5. Predictions (written before any spike result)

| Measure | Prediction | Bar |
| --- | --- | --- |
| Datomic transact, about 40 datoms, Postgres storage, quiet | p50 3 to 6 ms, p99 under 25 ms | commit p50 10, p99 50 |
| Datomic transact, about 260 datoms (today's shape with option C) | p50 5 to 12 ms | same |
| Peer pull over row datoms, 95 entities, 450 rows, id-to-entity cached | 0.3 to 0.7 ms CPU, so 1,400 to 3,000 pulls per CPU-second | 1,100 |
| Same with the entity cache | under 0.15 ms CPU | 1,100 |
| Writer p99 with a saturated reader peer on other CPUs | within 1.25x of no readers | 1.25x |
| Commit visible on a second peer | p50 under 5 ms, p99 under 30 ms after the writer's ACK | feed lag p99 250 ms |
| XTDB one-document `_id` query on a quiet 2-CPU node | 300 to 800 queries per CPU-second | 1,100 pulls |
