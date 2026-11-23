# Pinned reads at 1 billion records: why they are forty times slower

**Status: interim answer, 2026-11-23 (first hour).** Code reading and the fresh card's evidence only. The 1 billion part 2 evidence had not reached the Mac when this was written. Sections marked *open* wait for that evidence or for tonight's run.

Measurement: aged scorecard part 2 at `6770c37ba` ([V01-AGED.md](https://github.com/OnboardedInc/Triplex-db-experiments/blob/182fb4482/lab/experiments/EXP-DX1/scale1/V01-AGED.md)). One-core read gateway, `server` profile. Pinned ladder at one seat: 18.12 reads/s, p50 44.80 ms at 1 billion; 606.43 reads/s, p50 1.18 ms fresh.

## The short answer

1. **The two cards did not run the same read.** Both cards pin the ladder and the quiet account's reads at the SCALE1 seed cut, logical position 87,002 (`v01/adopted.ts` `readWindows`, `requested = seed.scope.cut`; `scale1/decision/observer.ts` `readCell`, `scope.seedCut`). On the fresh card the seed cut *is* the head (arm `firstCut` 87,002), so the gateway answers from the current database, or from an as-of view at most 1,260 positions behind the head as the 3.5/s writer advances. On the 1 billion card the head is 28,309,866, so every pinned read runs on `d/as-of` at a point 28,222,864 positions (about 28.2 million physical transactions) behind the head.
2. **An as-of read has to consult Datomic's history index; a current read does not.** At 1 billion the history index holds AGE1's retractions: each save retracts its 1 to 3 predecessor rows and the owner's previous `:triplex.entity/rev`, about 2 to 4 retractions per save, about 56 to 113 million retractions in all. The fresh database has almost no history (the seed was bulk-loaded with no retractions). So the fresh card never measured an as-of read with real history behind it, and the current pull (P4), which reads at the head, did not slow down.
3. **The reader then does that history work one read at a time.** The gateway admits reads through a semaphore with `TX2_READ_PERMITS` permits, default `availableProcessors` (`admission.clj`). The reader JVM runs with `-XX:ActiveProcessorCount=1`, so it has **one read permit**, and everything inside the read, including Datomic's segment loads from PostgreSQL, happens while holding it. Throughput is therefore 1 ÷ (time per read) no matter how many seats wait: 1 ÷ 50 ms ≈ 20/s, which is what every ladder step shows (17.8 to 19.1/s from 1 to 256 seats).

## The two most likely causes of the 45 ms, and what separates them

Both start from point 2 above. They differ in where the 45 ms is spent.

| | **A. Storage-bound: cold history segments on every read** | **B. Compute-bound: Datomic's as-of work on the reader's one core** |
| --- | --- | --- |
| Mechanism | For each person the read probes the history tree for the entity's `:triplex.entity/row` and `:triplex.entity/retired` (EAVT) and its `:triplex.entity/id` lookup (AVET). The history EAVT leaves for 200,000 edited owners are spread over the whole entity range, so a probe for *any* person, edited or not, lands on a history leaf. The reader's object cache is 1.5 GiB (Datomic's default, half of the 3 GiB heap); the history trees are several GB. The ladder walks 100,000 people per account in a stride (`7919 n mod 100000`), so nearly every read misses and fetches segments from PostgreSQL, which has **one CPU** in the `server` profile and is shared with the writer and the transactor. | Each probe touches more segments or more datoms than the leaf count suggests, for example because the history index is split across intermediate-tier slices from AGE1's roughly 1,100 index jobs, so one as-of lookup merges several paths. The segments may be cached, but decoding and merging them costs about 50 ms of CPU on one core. |
| Reader CPU during the one-seat step | Mostly idle (waiting on PostgreSQL); well under one core | About one full core |
| PostgreSQL during the ladder | Steady segment reads, about 20 or more `datomic_kvs` fetches per second, many from disk | Few reads after warm-up |
| Same person read twice in a row | Second read fast (1 to 2 ms) | Second read still slow |
| More read permits (`TX2_READ_PERMITS=16`) on the same one core | Throughput rises several-fold until PostgreSQL's one core or Datomic's `readConcurrency` 8 limits it | No change |
| Larger reader cache (3 GiB) | Helps only once the history working set fits | No change |

**What the numbers already say.** The flat 18/s from 1 to 256 seats does **not** decide between A and B, because the single permit serializes waiting as well as computing. The one-seat p50 of 44.8 ms is paid by the median read, and about four in five people the ladder reads were never edited by AGE1 (AGE1 edited 20,000 of each account's 100,000 people), so the cost is not mainly the person's own revision depth. A favours this; B allows it. The 1 billion seal's cold first reads on a new peer point the same way: pinned reads cost 97.09 ms (recently edited person) and 72.64 ms (person idle for a year) against 47.86 and 41.05 ms for current reads, and an old-cut read 277.80 ms. A pinned read pays an extra cold path of about 30 to 50 ms even for an idle person.

**My first estimate is A, storage-bound, at about 60 to 70 percent confidence.** The deciding numbers are the reader cgroup's CPU time and PostgreSQL's block reads during the one-seat step. If the 1 billion evidence has them, this section will be updated from them.

## The read errors

- **Quiet account (P6), two thirds errored in every cell.** The quiet reads are the same pinned read (`readCell`, basis `scope.seedCut`). The tape offers 64 reads/s from 64 seats for 60 s (3,840 reads); a seat whose previous read is still running records `"reader missed its offer"` as an error. At about 20 reads/s capacity, 60 s returns about 1,200: the card shows 1,216 (50/s cell) to 1,306 (solo). **These are offered reads exceeding capacity, not wrong answers.** The returned reads passed their exactness checks. *Confirm the error strings from the driver's evidence.*
- **Ladder, 1,611 errors at 1,024 seats.** The ladder client has a 35,000 ms timeout (`new DatomicClient(peer.read, 35000)`). With 1,024 seats queued on one permit at about 18/s, a request waits about 55 s, so most time out (p99 was 34,603 ms, just under the timeout). The gateway keeps serving requests whose clients have gone, so goodput fell to 11.17/s. *Confirm the error type.*
- **P4's 33,179 ms maximum.** Current pulls use the same read semaphore (`reach.clj` line 384). The first pull after the ladder most likely queued behind abandoned 1,024-seat requests. Its p50 and p99 (4.22 / 47.10 ms) match fresh.

## Is it the store or this aged database?

**Most likely the store with our read path, not the aged database's oddities.** Unverified until tonight's run.

- **The loader's non-standard `:_tx/position` rows (PREP1 `AGED-CACHE.md` Question 1) are not on this path.** They are journal rows on transaction entities. The pinned read decodes only the person's rows; the gateway's Clojure decoder ignores that payload, and position lookups use `:triplex.tx/position`, not the journal row.
- **The 28.2 million loader transactions are solo saves with the product's datom shape**: new rows, retracted predecessors and a new `:triplex.entity/rev` per save (`age1/src/triplex/age/native.clj` `render`). A database that reached 1 billion records through product saves would have a history index of the same kind and size.
- **The edited people are partly the ones read**, about one in five, and those reads should cost more. That does not explain the median read.
- **The pin distance may not matter.** If Datomic has to consult the persisted history index for any as-of view, a pinned read one transaction behind the head pays the same cost as one 28 million behind. The seal's cold pinned reads cost 25 to 50 ms more than current reads; which cut they used is not yet checked. If true, P1 at 1 billion is slow for every pin, not only for old ones. *Open; tonight's run separates it.*
- **Cannot yet conclude:** whether AGE1's high-rate index jobs left the history index in more intermediate-tier slices than organic growth would; whether PostgreSQL's TOAST churn after 27 vacuum cycles makes segment fetches slower than on a database grown slowly.

## Fixes, first ranking (expected effects are estimates)

1. **Settings (existing code).**
   - `TX2_READ_PERMITS=16` on the reader. Under A, several-fold throughput at one core (roughly 60 to 150 reads/s, limited by PostgreSQL's one CPU and Datomic's `readConcurrency` 8); under B, none. No cost per save. Exactness unchanged.
   - Three reader cores and the read study's 3 GiB cache (`--read-cache-mib 3072`). Three cores also give three permits. Expect about three times under either cause, more under A if the history working set fits.
   - The read study's batches of eight and early filter cut exchanges and decode per row; they do not remove the history probe.
2. **Code: answer unchanged people from the current index (recommended).** Every save that changes a person's rows sets their `:triplex.entity/rev` to the save's position in the same transaction. Read the person's revision from the **current** database first. If it is at or below the pinned position, nothing about that person changed after the pin, so the current rows are exactly the rows at the pin; answer from the current index with no as-of view. Only people changed after the pin take the as-of path. Cost per save: none (the revision is already stored). Exactness: unchanged, provided every writer bumps the revision with every row change; to be verified for all writers, including removal on request, before it ships. Expected at 1 billion for this ladder: about 80% of reads at the fresh cost (about 1.2 ms) and 20% at today's cost, so about 10 ms mean and about 90 reads/s on one permit; for pins near the head nearly every person is unchanged, so close to fresh.
3. **Code, larger: keep each person's row lifetimes in the current index.** Retire rows by a retirement marker carrying the position instead of retracting them, so a pinned read of an edited person reads only the current index. Records per save are about the same (one marker replaces one retraction) and bytes fall slightly, but the current index keeps every revision, so current reads of heavily edited people slow down. Treat as a later option.

## Tonight's run

*Being written.* Leading candidate: the same aged pinned ladder with `TX2_READ_PERMITS=16` on the one-core reader, plus reader CPU and PostgreSQL block-read counters, and a second pin near the head. More permits separates A from B in one number, and the second pin tests whether pin distance matters. Whether it is launchable with settings only, the exact command, predictions and falsifier follow.
