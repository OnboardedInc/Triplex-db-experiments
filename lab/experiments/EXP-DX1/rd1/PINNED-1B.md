# Pinned reads at 1 billion records: why they are forty times slower

**Status: answer with the 1 billion evidence and tonight's run, 2026-11-23.** Sources: the code at the scorecard commit `6770c37ba`, the fresh card's evidence and the 1 billion part 1 and 2 evidence (`score-1b-c-part1-2.tar.gz`, SHA-256 `e31c4adc…6056b`: the reader's request trace `gw-r.jsonl` with one cgroup CPU sample per second, its GC log and its JVM flags). Times from the Mac are diagnostic only. Sections marked *open* wait for tonight's run.

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

**Decided:** compute-bound, about 37 to 45 ms per read, for every person. **Not decided:** A or B. **Lean: A, about 60%**, because on the Mac (toy 2 below) none of the lookups on the pinned path walks the history after the pin, while each history leaf decoded costs about 3 MB of allocation. Tonight's run measures both directly (per-read Datomic io-stats, a repeat arm, a 12 GiB cache arm and a CPU and allocation profile).

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

## Mac toys (diagnostic, not results)

**Toy 1.** Datomic 1.0.7745, dev storage, 100,000 owners with 10 rows each, 20,000 of them edited 15 times after the pin (300,000 saves), indexed, a fresh peer with a 32 MB object cache, Datomic io-stats per read:

| Read | ms per read | EAVT / AVET probes | EAVT leaf loads | Segments deserialized |
| --- | ---: | ---: | ---: | ---: |
| Current, unedited person | 5.18 | 2 / 1 | 0.86 | 1.04 |
| As-of seed cut, unedited | 7.70 | 4 / 3 | 1.86 | 2.09 |
| As-of near the head, unedited | 7.78 | 4 / 3 | 1.87 | 2.11 |
| As-of seed cut, edited | 7.29 | 4 / 3 | 1.85 | 2.05 |

An as-of read probes the current and the history trees and loads one more leaf per read, for edited and unedited people alike and for an old and a recent pin alike.

**Toy 2.** 50,000 owners, then 400,000 transactions after the pin, one save each (a position on the transaction, a new revision, one row replaced), indexed, 256 MB cache. Every point-lookup shape the gateway uses on the pinned path (identity lookup, the owner's rows and revision, a scope value, the pin transaction's position, a position lookup, a reverse AEVT seek from the pin) cost under 0.1 ms on the as-of view, apart from history leaf loads: the owner's rows and revision each cost about 3 ms and 1.9 MB when their history leaf was not cached (0.6 loads per probe, about 3 MB allocated per leaf decoded). So none of these lookups walks the transactions after the pin.

**Gateway route on the Mac.** `storage/read-rows` itself (the probe below, against a scope written through the SDK) makes 18 EAVT, 12 AEVT and 1 AVET index probes per current read and 26, 12 and 3 per as-of read.

Neither toy reproduces a 36 ms floor. If candidate A holds, the 1 billion read decodes about 20 leaves of toy-2 size per read; tonight's io-stats count them.

## Tonight's run (45 minutes on the rented server with the sealed 1 billion cluster)

**Not launchable with settings only.** The scorecard's arms cannot change the reader (see the settings fix) and do not attribute a read. The run uses two new files at `0688bd00f` on `exp/DX-RD1-readers`: `pinned-probe.clj` calls the gateway's own `storage/read-rows` (from the scorecard checkout, so the code under test is `6770c37ba`'s) in a peer JVM, with Datomic's io-stats, thread CPU and allocation per read; `pinned-probe-server.sh` copies the sealed cluster, starts PostgreSQL (`postgres:17-alpine`, the scorecard's pinned digest, 8 GiB, `shared_buffers=2GB`, core 1) and one transactor (cores 0, 7, 8) on the copy, waits until the transactor is active, runs the probe twice, removes the containers, network and copy. Nothing touches the sealed source. **Gated on the Mac:** the probe against a lean scope written through the SDK (shortcut 48 of 60 from the current database, 0 mismatches); the wrapper end to end in the lab VM on a stopped PG17 cluster with Datomic's SQL storage (copy, start, transactor takeover, both passes, JFR, PostgreSQL counters, cleanup).

**Arms**, each on new people in the one-seat ladder's order (account 0, person `7919 n mod 100000`):

1. `pinned`: 600 reads at position 87,002, cold.
2. `pinned-repeat`: the same 600 again.
3. `current`: 600 reads at the head.
4. `pinned-recent`: 600 reads 1,000 positions behind the head.
5. `shortcut`: 600 reads by the revision short-cut, each checked against the as-of route.
6. `pinned-twice`: 600 people, each read twice in a row.
7. `concurrent`: 16 threads for 60 s on the same one core.

Pass `reader`: one core (`--cpuset-cpus 6`, `-XX:ActiveProcessorCount=1`), 3 GiB heap, Datomic's default 1.5 GiB cache, as the scorecard's reader. Pass `bigcache`: the same core, 16 GiB heap, 12 GiB cache, new people. Each pass records a JFR CPU and allocation profile, a GC log, and PostgreSQL block reads and cgroup CPU before and after.

**Command** (as the server driver, from the scorecard build checkout; paths in angle brackets are the driver's):

```bash
cd "$BUILD/repository"                       # checkout at 6770c37ba, the code under test
git fetch origin exp/DX-RD1-readers
mkdir -p <RD2_DIR>                           # new private directory outside the evidence folder
for f in pinned-probe.clj pinned-probe-server.sh; do
  git show 0688bd00f:lab/experiments/EXP-DX1/rd1/$f > <RD2_DIR>/$f
done
sudo env "PATH=$BUILD/tools/bin:$PATH" NODE="$BUILD/tools/bin/node" RD2_REPO="$PWD" \
  RD2_PGDATA_SOURCE=<the held, stopped 1 billion cluster the scorecard copies from> \
  RD2_PGDATA_COPY=<a new path on the root NVMe> RD2_OUT=<a new evidence directory> \
  RD2_PROBE=<RD2_DIR>/pinned-probe.clj bash <RD2_DIR>/pinned-probe-server.sh
```

Defaults: database name of the SCALE1 scope (`RD2_DB`), pin 87,002 (`RD2_PIN`), 600 reads per arm (`RD2_ARM`), Datomic image `tx2-datomic:1.0.7745-da00` (Java 21, the reader's). Expected time: copy about 3 min (176 GB at the measured 1.2 GB/s), PostgreSQL and transactor takeover 1 to 3 min, reader pass about 6 min, bigcache pass about 6 min, copy removal about 1 min: **about 17 to 25 min**, cap 40. Peak extra disk: one 176 GB copy. Send back `RD2_OUT` as one archive.

**Predictions, written before the run.**

| Measure (pass `reader` unless named) | Prediction | What it would mean if wrong |
| --- | --- | --- |
| `pinned` p50, thread CPU, allocation | 38 to 55 ms; thread CPU at least 80% of wall; 45 to 80 MB per read; route `as-of` for all | Under 15 ms: the scorecard's slowness came from its stack (writer load, peer novelty, GC competition), not from the read itself |
| `current` p50 | 1 to 5 ms, under 3 MB per read | Over 20 ms: the cost is the 1 billion database at any cut, not the as-of view |
| `pinned-twice`, second read | **A:** under 10 ms. My lean is A at about 60%, from toy 2 (no point lookup walks the history; the cost is leaf decoding) | Second read as slow as the first: candidate B, work the cache cannot remove |
| io-stats on a cold `pinned` read | **A:** at least 8 leaf loads (`*-load`) and `deserialize` per read, `sql` at least 5 | Under 3 loads with 40 ms of CPU: B |
| `pinned-recent` p50 | Within 30% of `pinned` (cost tracks total history, as on toy 1) | Under half of `pinned`: the cost grows with the history after the pin, so recent pins are cheap |
| `shortcut` | Answered from the current database for 70 to 90% of people; 0 mismatches; mean 5 to 15 ms | Any mismatch: the revision rule is not exact on this database and the fix must not ship as designed |
| `concurrent`, 16 threads on one core | 18 to 26 reads/s | Over 40/s: waiting, not CPU, dominates, and more read permits would help |
| `bigcache` `pinned` p50 | Within 25% of `reader` if each person's segments are distinct; under 20 ms if reads share segments | — |
| PostgreSQL block reads during `pinned` | TOAST reads well above zero per read only under A | — |

**Falsifier of the main claim** (the as-of route costs about 40 ms of CPU per read at 1 billion): `pinned` p50 under 15 ms on one core with `current` similar. Then the scorecard's number came from its environment, and the next step is the scorecard's reader under load, not the read path.

## What is not established

- Whether the 40 ms is leaf decoding (A) or a walk the cache cannot remove (B), and which index it is in.
- Whether the cost tracks total history or history after the pin, so whether recent pins at 1 billion are slow too.
- Which share of the ladder's people AGE1 edited after the pin (the probe tags every read).
- That every writer bumps `:triplex.entity/rev` with every row change, including grouped saves and removal on request (needed before the short-cut ships).
- Whether an organically grown 1 billion database behaves the same as AGE1's bulk-aged one.
