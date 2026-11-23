# Pinned reads at 1 billion records: why they are forty times slower

**Status: first answer with the 1 billion evidence, 2026-11-23.** Sources: the code at the scorecard commit `6770c37ba`, the fresh card's evidence and the 1 billion part 1 and 2 evidence (`score-1b-c-part1-2.tar.gz`, SHA-256 `e31c4adc…6056b`: the reader's request trace `gw-r.jsonl` with one cgroup CPU sample per second, its GC log and its JVM flags). Times from the Mac are diagnostic only. Sections marked *open* wait for tonight's run.

Measurement: aged scorecard part 2 at `6770c37ba` ([V01-AGED.md](https://github.com/OnboardedInc/Triplex-db-experiments/blob/182fb4482/lab/experiments/EXP-DX1/scale1/V01-AGED.md)). One-core read gateway, `server` profile. Pinned ladder at one seat: 18.12 reads/s, p50 44.80 ms at 1 billion; 606.43 reads/s, p50 1.18 ms fresh.

## The answer so far

1. **The two cards did not run the same read.** Both pin the ladder and the quiet account's reads at the SCALE1 seed cut, logical position 87,002 (`v01/adopted.ts` `readWindows` uses `seed.scope.cut`; `scale1/decision/observer.ts` `readCell` uses `scope.seedCut`). On the fresh card the seed cut is the head (arm `firstCut` 87,002), so the gateway answers from the current database, or from an as-of view at most 1,260 positions behind as the 3.5/s writer advances, over a database with almost no history. On the 1 billion card the head is 28,309,866 (arm `firstCut`), so every pinned read runs `d/as-of` at a point 28,222,864 positions behind the head, over a history index holding AGE1's 56 to 113 million retractions (each solo save retracts its 1 to 3 predecessor rows and the owner's previous `:triplex.entity/rev`).
2. **At 1 billion each pinned read costs about 37 to 45 ms of CPU on the reader's one core, whoever is read.** From the reader trace: during every read window the reader cgroup used 0.97 to 0.99 of its one core (97.4% user, 1.0% system, never throttled), and the time inside the read permit (`gateway.admitted-work`) summed to 0.95 to 1.0 of wall time. The **fastest** of 17,749 pinned reads took 36.4 ms inside the permit; p10 38 to 41 ms, p50 40 to 45 ms, p90 83 to 90 ms, in every minute of the ladder and of the quiet-account cells. No read was ever cheap, including people the ladder had already read in an earlier step. So the reader is **compute-bound, not waiting on storage**, and the cost is a floor paid by every as-of read, not a cost of the person's own edits.
3. **Each pinned read allocates about 65 MB at 1 billion against about 1 MB fresh.** From the GC logs: 1.14 to 1.39 GB/s of allocation at 18 to 21 reads/s (61 to 69 MB per read) at 1 billion, against 0.9 to 1.1 GB/s at 600 to 1,560 reads/s fresh (0.6 to 1.5 MB per read). At 1 billion the old generation stays at about 1.2 GB after every young collection (the 1.5 GiB object cache, full), with 652 mixed collections and 624 concurrent cycles in 25 minutes: long-lived objects (most likely cache entries) are replaced continuously. GC pauses took only 3 to 5% of wall time, so GC is a symptom, not the cause.
4. **The reader then serves reads one at a time.** The gateway admits reads through a semaphore with `TX2_READ_PERMITS` permits, default `availableProcessors`, which is 1 on the reader (`-XX:ActiveProcessorCount=1`, `cpuset.cpus.effective=6`). 1 ÷ 50 ms ≈ 20 reads/s is the ladder's flat 17.8 to 19.1/s from 1 to 256 seats. Because the reader is compute-bound, more permits on the same core would **not** help.

**The cause in one line:** at 1 billion, Datomic's as-of view of the 1 billion database makes every pinned read do about 40 ms and 65 MB of work on the reader's single core, independent of the person; the fresh card never paid this because its pin was its head.

## What exactly the 40 ms is: two candidates, and what separates them

| | **A. Segment churn: every read decodes index segments that do not stay cached** | **B. A walk inside the as-of view that grows with the database, not the person** |
| --- | --- | --- |
| Mechanism | An as-of read probes the history tree as well as the current tree (on the Mac toy below: 4 EAVT and 3 AVET probes against 2 and 1, and one extra leaf load per read once history exceeds the cache). If the segments an as-of read touches at 1 billion are large and many, and the 1.5 GiB cache cannot hold them, every read decodes them again. | Some probe in the read (scope, pin transaction, identity or row lookup) iterates many datoms on the as-of view, for example one that has to filter out entries added after the pin. Its cost would be the same for every person and grow with the history after the pin or in total. |
| Supporting | Continuous old-generation turnover (cache replacement) and 65 MB allocated per read. | The 36 ms floor for every person, including repeats; system CPU at 1% (little storage traffic for 19 reads/s). |
| Against | A floor that never drops for people read twice; on the toy an as-of read costs about two leaf decodes, not tens. | Nothing in the gateway's code walks a range: every lookup on the pinned path is a point lookup (`at-position`, `reach/select-db`, `scope/head-position`, `group-cut/interior`, `lean/live-texts`). |
| Same person read twice | Fast if the cache holds what the first read loaded | Still about 40 ms |
| 12 GiB object cache | Large gain if the working set then fits | No change |
| Datomic io-stats per read | Many `*-load` and `deserialize` per read | Few loads, but long `api-ms` |

**Decided:** compute-bound, about 37 to 45 ms per read, for every person. **Not decided:** A or B. Tonight's run measures both directly (per-read Datomic io-stats, a repeat arm, a 12 GiB cache arm and a CPU and allocation profile).

## The read errors and the quiet account's 2.5 s

- **The quiet account's reads are the same route.** `readCell` calls `client.rows` with basis `{recordedPosition: scope.seedCut}`, the ladder's as-of read. Their p50 of about 2.5 s is **queueing for the one read permit, not a slower route**: in the reader trace, from the first P6 cell on, the time inside the permit has p50 40 to 54 ms, and the wait for the permit has p50 2.3 to 3.6 s. The tape offers 64 reads/s from 64 seats; with about 20/s of capacity the seats pile up behind the single permit (64 ÷ 20 ≈ 3.2 s at full occupancy). The tape's latency is measured from the scheduled offer, so it includes that wait.
- **Their "errors" are missed offers, not failed reads.** `observer.ts` line 106 records "reader missed its offer" when a seat's previous read is still running at its next offer or the window has ended; line 133 records exceptions. At about 20 reads/s, 60 s returns about 1,200 reads; the card shows 1,001 to 1,306 returned per cell. The driver reports no error lines in the read gateway's log. Returned reads passed their exactness checks.
- **The ladder's 1,611 errors at 1,024 seats** are caught exceptions whose text is not kept (`adopted.ts` line 135). The ladder client times out at 35,000 ms (`new DatomicClient(peer.read, 35000)`), and in the trace the wait for the permit reached a p50 of 25.4 s with 1,024 seats queued, so these are almost certainly client timeouts. The gateway keeps serving requests whose clients have gone, so goodput fell to 11.17/s.
- **P4's 33,179 ms maximum.** Current pulls take the same read semaphore (`reach.clj` line 384); the first pull after the ladder most likely queued behind abandoned 1,024-seat requests. Its p50 and p99 (4.22 / 47.10 ms) match fresh, and current pulls read at the head, so they never pay the as-of cost.

## Why the fresh database does not show it

| Candidate | Verdict |
| --- | --- |
| Size of the history index | **Main cause, together with the pin being behind the head.** Fresh has almost no history; 1 billion has AGE1's 28.2 million solo saves with retractions. |
| The 28 million loader transactions | Part of the same thing: they are the history. Whether the per-read cost scales with transactions after the pin or with total history is *open* (tonight's recent-pin arm). |
| The loader's non-standard `:_tx/position` rows | **Not on this path.** They are journal rows on transaction entities; the pinned read decodes only the person's rows, and position lookups use `:triplex.tx/position`. |
| The people the loader edited being the ones read | **Not the main cause.** AGE1 edited 20,000 of each account's 100,000 people. The 36 ms floor holds for every read, so unedited people pay it too. Edited people may explain the slower mode (p90 about 85 ms, twice the floor); tonight's probe tags each read with whether the person changed after the pin. |
| The pin position (28.2 million behind the head) | The pin makes the read an as-of read at all. Whether a pin one save behind the head costs the same is *open*. On the Mac toy (history 10 times the cache) a pin near the head cost the same as an old pin. |

## Is it a property of the store or of this aged database?

**Most likely of the store with our read path: Datomic's as-of view over a large history, read on one core.** AGE1's saves have the product's datom shape (new rows, retracted predecessors, a new revision, one transaction per save; `age1/src/triplex/age/native.clj` `render`), so a database that reached 1 billion records through product saves would have a history index of the same kind and size. **Cannot yet conclude:** whether AGE1's high-rate loading (about 1,100 index jobs, 27 vacuum cycles) left the indexes in a shape that makes as-of reads costlier than slow organic growth would, and whether the cost tracks total history or history after the pin. If the cost tracks total history, every pinned read at 1 billion pays it, including pins near the head.

## Fixes, ranked

1. **Settings (existing code).**
   - `TX2_READ_PERMITS` above 1 on the one-core reader: **no gain expected** (compute-bound). It would only spread the queue.
   - Three reader cores (the read study's treatment, which also gives three permits): about three times, 50 to 60 reads/s, under either candidate. No cost per save.
   - Larger reader object cache: large gain only under candidate A. Tonight's 12 GiB arm measures it.
   - The read study's batches of eight and early filter: they cut exchanges and decode per row, not the as-of work, so little gain here.
   - Note that none of these is settable for the scorecard's aged arm without a code change: `stack/up.sh` does not pass `TX2_READ_PERMITS` into the gateway container, the server profile fixes the reader at one core, and the read study refuses any database other than the fresh seed.
2. **Code: answer unchanged people from the current database (recommended).** Every save that changes a person's rows sets their `:triplex.entity/rev` to the save's position in the same transaction. Read the revision from the **current** database first; if it is at or below the pinned position, nothing about that person changed after the pin, so the current rows are exactly the rows at the pin; answer through the current route, which at 1 billion costs what P4 and the fresh card cost (a few ms). Only people changed after the pin take the as-of route. Cost per save: none (the revision is already stored). Exactness: unchanged, provided every writer bumps the revision with every row change; this must be checked for all writers, including grouped saves and removal on request, before it ships. Checked so far: on the Mac gate the short-cut answered 48 of 60 people from the current database with 0 differences from the as-of route. Expected at 1 billion for this ladder, if about 20% of read people changed after the pin: 0.8 × about 2 ms + 0.2 × about 45 ms ≈ 11 ms per read, about 90 reads/s on one core instead of 18; close to the fresh card for pins near the head, where almost nobody changed. Tonight's probe measures this route on the real database.
3. **Code, larger: keep each person's row lifetimes in the current index.** Retire rows with a marker carrying the retiring position instead of retracting them, so a pinned read of an edited person reads only the current index. Records per save stay about the same (one marker replaces one retraction); current reads of heavily edited people slow down because they skip retired rows. Only worth it if tonight shows edited people dominate the remaining cost.

## Mac toy (diagnostic, not results)

Datomic 1.0.7745, dev storage, 100,000 owners with 10 rows each, 20,000 of them edited 15 times after the pin (300,000 saves), indexed, a fresh peer with a 32 MB object cache, Datomic io-stats per read:

| Read | ms per read | EAVT / AVET probes | EAVT leaf loads | Segments deserialized |
| --- | ---: | ---: | ---: | ---: |
| Current, unedited person | 5.18 | 2 / 1 | 0.86 | 1.04 |
| As-of seed cut, unedited | 7.70 | 4 / 3 | 1.86 | 2.09 |
| As-of near the head, unedited | 7.78 | 4 / 3 | 1.87 | 2.11 |
| As-of seed cut, edited | 7.29 | 4 / 3 | 1.85 | 2.05 |

An as-of read probes the current and the history trees and loads one more leaf per read, for edited and unedited people alike and for an old and a recent pin alike. The toy does not reproduce a 37 ms floor; the 1 billion database does something the toy does not, which tonight's run has to show.

## Tonight's run

*Being finalized: command, predictions and falsifier below in the next commit.* It is not launchable with settings only. It is one new probe (`rd1/pinned-probe.clj`, gated on the Mac against the gateway's own `storage/read-rows`) and a server wrapper (`rd1/pinned-probe-server.sh`) that starts PostgreSQL and a transactor on a scratch copy of the sealed cluster and runs the probe in a peer JVM shaped like the reader.
