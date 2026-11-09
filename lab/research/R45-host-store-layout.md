# R45: the broker's SQLite host store layout, bytes per fact for P4 and P5

Researcher: R45 (Opus 5.5, high). Date: 2026-11-09. Read-only on code; the only file written is this one. No engine, Docker, colima or
slot was touched. The evidence store was opened read-only (`file:...?mode=ro`); a 10% sample was re-encoded into throwaway SQLite files in
the scratchpad to measure the proposed layout (SQL in appendix A; the files were deleted afterwards, the SQL regenerates them in about a
minute). Goals and targets come only from `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.

North star: **P5** (a 100k-subject sweep needs a store that fits the disk and a working set that fits memory) and **P4** (current pulls
read H1's `live_rows`; TARGETS P4 bar: p50 <= 5 ms, p99 <= 25 ms, >= 1,100 pulls/s per core, bytes read flat as history grows). The change
also touches the **P2/P1 recovery floor**: today `HostLog.open` loads every frame ever written into memory, which at 100k is about 41 GB.

Code read: `.claude/worktrees/int-q/packages/qlever/src/broker/{sqlite-worker.ts, log.ts, broker.ts, BrokerStorageAdapter.ts, feed.ts,
frames.ts}`, `packages/core/src/store/{transactionMetadata.ts, TriplesLive.ts}`, `packages/w0/src/population.ts`; the P5B worktree's
`sqlite-worker.ts` diff and `REPORT-roundB.md`; R25 section 6, R34; `lab/acceptance/{RULINGS.md, oracle-contract.json, build_contract.py}`.

## 1. Summary

| Question | Answer |
| --- | --- |
| 1. What `recent_rows` is | Not a replica-dependent overlay. Every row version is upserted into `recent_rows` on every append, unconditionally, and nothing ever deletes from it (the purge deletes only `retired_rows`; overlay eviction is an in-memory list of LSNs). It is the broker's **history of record** for the "source fallback" reads (the code comment says so: "keep history in recent_rows for source fallback"). With or without a replica it is a full second copy of `live_rows` plus every retired version. Section 3. |
| 2. Why 28.9 rows per command | Not history and not retractions (839 retractions in 187,520 commands). It is the **Triplex journal**: each command writes 10.28 fact rows plus 18.63 journal rows on its `_tx/...` entity: 4 header rows (position, instant, actor, command id), 4.35 `:_tx/changed-entity` rows, and one `:_tx/change` row per change whose JSON value **embeds the whole fact again** (786 bytes average). Journal rows are 64% of rows and 71% of row bytes. Matches W0: 10.28 facts per command, 447 facts per subject, 4.47M facts at 10k. Section 4. |
| 3. Layout | Four changes, all keeping every accepted property: **A** drop `recent_rows` and serve the overlay and history reads from `live_rows` and `retired_rows` by position (retired rows are no longer deleted); **B** purge frames below a retention floor with a persisted CRC anchor, and open the log from the anchor; **C** a compact typed row (16-byte ids, interned entity, attribute, actor and entity-type ids, values inline) in `WITHOUT ROWID` tables clustered by entity, journal rows in their own table; **D** journal values that are pure functions of other stored rows (`:_tx/change`, `:_tx/position`, `:_tx/instant`) stored as references, accepted only when a write-time byte comparison proves the decode exact. Section 5. |
| Bytes per fact | Measured today: **5,656 B per asserted fact** (10.90 GB logical for 1,926,847 facts). Predicted: A 3,304; A+B 2,380; A+B+C about 555; **A+B+C+D about 259** (prototype measured 241.5 for rows, journal and dictionaries, plus 17.5 for heads, claims and operations). Page size does not matter (8 KB and 16 KB pages: -0.2% and -0.3%). Section 5.4. |
| 10k and 100k | Today: 25.3 GB and 252 GB. After A+B+C+D: **about 1.2 GB at 10k and 11.5 GB at 100k.** R34 assumed 100 B per fact (0.45 GB and 4.45 GB); round 1 lands at 2.6x that. Reaching R34's budget needs a round 2 journal change (one journal record per transaction, est. 150 to 195 B per fact, 6.7 to 8.7 GB at 100k) or a core change to the journal format. Section 5.4 and 5.7. |
| What P4 and P5 read | Both read only fact rows (`live_rows` by entity, `retired_rows` with `rpos > B`); neither reads the journal or frames. Compact rows cut bytes per row on disk from about 486 to about 50, so the P4/P5 working set at 100k drops from 252 GB (cannot be cached) to about 3.5 GB of fact rows and dictionary (4.8 GB with the id index). A read microbench on the real data: warm CPU per row is the **same** in both layouts (2.4 to 2.9 µs per row in raw mode), cold reads are **4.9x faster** compact (11.3 vs 2.3 µs per row). Do not expect a warm-CPU gain from the layout. Section 5.5. |
| 4. Re-verify and timing | Re-run the INT-Q gate set (QLever package 235, G0 QLever 1,388, SQL01 semantic 11/11, P2Q offline 873 plus storage 5, route harness 93/93, live broker 5/5, pack, evaluator) plus SQL01's kill and WAL-flip tests, which INT-Q did not rerun, and four new gates (layout equivalence, codec property, retention and recovery, bytes). Broker files are not pinned (INT-Q's scan of 243 pin paths found none), so the code can merge default-off without a contract version; the ruling text that names `recent_rows` (Q58c, Q58e inventory, checked by `build_contract.py`) is amended in 0.4.1 with Q101a. Build now; merge before 0.4.0 branches or right after it merges, never during its gate runs. Section 7. |
| 5. Builder | EXP-HS01, Codex medium, from main at contract 0.3.14; brief and gates in section 8. |

## 2. Evidence

**2.1 The store.** `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P5B/round2/b0-10k-01/store/broker.db`, P5B round 2 attempt
`bfe61ec5`, aborted at 187,520 of 434,768 reference commands (`prefix-audit.json`): 1,926,847 asserted facts, 839 retractions, 2,931 frames
(the seeder groups 64 commands per frame and per operation), replica detached. `page_count` 2,660,540 x 4,096 = 10,897,571,840 bytes
logical (the file is 10.85 GB; the rest sits in the 51.6 MB WAL). dbstat, read-only:

| Object | MB | Rows | Payload MB | Unused MB | B per asserted fact |
| --- | ---: | ---: | ---: | ---: | ---: |
| live_rows | 4,192.8 | 5,419,097 | 3,589.7 | 569.2 | 2,176 |
| recent_rows | 4,174.3 | 5,419,936 | 3,584.6 | 555.9 | 2,166 |
| frames | 1,780.2 | 2,931 (4,967 cells) | 1,776.2 | 2.1 | 924 |
| recent_id | 358.0 | 5,419,936 | 297.9 | 42.8 | 186 |
| live_id | 358.0 | 5,419,097 | 297.9 | 42.8 | 186 |
| heads | 20.5 | 632,339 | 16.1 | 2.5 | 10.7 |
| claims | 11.0 | 187,520 | 9.5 | 1.0 | 5.7 |
| operations | 2.1 | 2,930 | 1.7 | 0.4 | 1.1 |
| retired_rows and its 2 indexes | 0.6 | 839 | 0.6 | 0.0 | 0.3 |
| **Total** | **10,897.6** | | | | **5,656** |

`recent_rows` has exactly 839 more rows than `live_rows`: the retired versions. Rows are JSON text with all 21 column names spelled out
(sample in appendix B); no row overflows a 4 KB page (largest payload 960 bytes).

**2.2 The prototype.** The rows of 300 frames (positions 1,024,000 to 1,331,200: 19,201 commands, 550,902 rows, 195,498 user facts,
355,404 journal rows, about 10% of the store) were re-encoded with the sqlite3 CLI into two scratch files, inserted in commit order (the
order a live broker writes), 4 KB pages. Appendix A has the SQL. The P5B seed has a fixed clock (`recorded_at` is one constant) and no
`valid_to`, so the sample slightly flatters the time columns; section 5.4 adds a margin for that.

## 3. What each table is for and who reads it

| Table | Written by (all in the one `append` transaction unless noted) | Read by | Notes |
| --- | --- | --- | --- |
| `frames` | `append`: one row per commit group or epoch frame, payload = JSON commit group (rows as column arrays, priors, claims, subjects), CRC32C prev-chain, `committed_at` | `HostLog.open` (every frame since LSN 1, chain check, then `HostBroker.start` replays all of them); the replica applier (`framesAfterAsync`, commit frames after the replica's LSN); the feed (`LogFeed.poll` via `readFramesFrom`); the ACKED sidecar check (one frame); the P2Q verifier harness, `sqlite-broker.test.ts` and `broker-fixes.test.ts`, which use **all frames** as their independent oracle | Never purged. The log of record (Q58c). |
| `marker` | `append` (lsn, epoch, position, crc, size); `purge` (h) | every reader transaction (its snapshot marker), `append`'s chain check, `pin`, `purge`, `readWatermark` (feed), open's cross-check | One row. |
| `heads` | `append`: per written subject, its last position | `broker.check`: per-subject compare-and-set | Keyed by entity name text; 632,339 rows because every W0 answer node is an entity. |
| `claims` | `append`: commandId to (txId, position) | `broker.check` (claim conflict), `claim()` and `claimAsync()` lost-ACK resolution | Bug on main, fixed only on the P5B branch: every nested claim gets the group's last ordinal, not its own transact's position. |
| `operations` | `append`: operationId to receipt JSON | `commitGroup`: an idempotent resubmit returns the original receipt | |
| `pins` | `pin`, `unpin` (writer); deleted at open | `purge`: the horizon never passes the lowest pin | P5B adds leases (`expires`). |
| `live_rows` | `append`: every row with `retracted_position` null, upsert by (entity, id) | H1 `pull` (`pullAt`), used by the adapter when the replica is unreachable or detached and the basis is a position; P5B's `sweep`; EXP-QH1 (planned P4 path) | Clustered by (entity, id). |
| `retired_rows` | `append`: a retraction deletes the live row and inserts the retired version | H1 `pull` (`rpos > B`) | `purge` deletes rows with `rpos <= h`, 2,000 at a time. |
| `recent_rows` | `append`: **every** row version, upsert by (entity, id), with the frame LSN | `overlay` and `overlayAsync` (rows with `lsn > replica LSN` while a replica is attached); `fromLog` and `fromLogAsync` (when the overlay was evicted, and with `after = 0` for history and record-time reads when the replica is unreachable or detached); P5B's lab `readback` and `counts` ops | **Never deleted.** No index on `lsn`, so a scope-wide overlay or fallback read scans the whole table. |
| `live_id`, `recent_id`, `retired_id` | indexes | `selection.id` reads: retraction-target reads, reads by id | |
| `retired_rpos` | index | `purge` only | |
| `frames_commits` | partial index `WHERE kind=1` | the applier's `after` op | Tiny. |

**Why `recent_rows` is a full second copy during a seed with no replica.** The notebook's 08:40Z reading ("with no replica caught up
every row counts as recent") is not what the code does. `append` writes every row into `recent_rows` whatever the replica state, and no
code path deletes from it: `evict()` only shifts the in-memory `overlayFrames` list, and `purge` only touches `retired_rows`. The table
holds the latest version of every row id ever written, so it equals `live_rows` plus all retired versions, including the ones purge already
removed from `retired_rows`. Its purpose is the history path: when QLever is unreachable or detached, history and record-time reads call
`fromLogAsync(0, ...)`, which reads every version of the selected entities from `recent_rows`. A replica changes nothing about its size.

**What else the code shows that matters for scale.**
1. `HostLog.open` asks the writer worker for every frame from LSN 1 (`maxBytes: Number.MAX_SAFE_INTEGER`), structured-clones them to the
   main thread, re-encodes each to check the CRC chain, and `HostBroker.start` decodes every commit group again to rebuild `headPosition`
   (already in the marker), the aborted list (only in EPOCH_BEGIN frames) and the overlay. That is 1.78 GB at this prefix, about 4.1 GB at
   10k and about 41 GB at 100k held in memory at startup. A 100k broker could not restart. This is a recovery-floor defect, not only a
   size one.
2. Core's `transactions()` reads every `_Transaction` row in the store and filters by position afterwards, and `transactionByCommand`
   is an attribute-and-value query with no entity, so on the broker both scan the whole row table. They are O(total history) on every
   lane. Out of scope for R45, but every byte removed from the journal makes them cheaper.

## 4. Why 28.9 rows per command

**4.1 Counts.** `live_rows` grouped by attribute (one read-only scan):

| Rows | Count | Per command | Avg row bytes | Row MB |
| --- | ---: | ---: | ---: | ---: |
| User facts (pl:, loc:, jur:) | 1,926,008 | 10.27 | 485 | 934.6 |
| `:_tx/change` (one per assert or retract) | 1,927,686 | 10.28 | 786 | 1,515.8 |
| `:_tx/changed-entity` (one per distinct entity) | 815,323 | 4.35 | 522 | 425.9 |
| `:_tx/position`, `:_tx/instant`, `:_tx/actor`, `:_tx/command-id` | 750,080 | 4.00 | 506 to 517 | 382.9 |
| **Total live** | **5,419,097** | **28.90** | | **3,259.3** |

So each W0 command stores 10.27 facts and 18.63 journal rows. Journal rows are 64% of rows and 71% of row bytes. 1,926,008 + 839
retracted = 1,926,847 asserted facts, and 1,927,686 change rows = 1,926,847 asserts + 839 retracts: every count reconciles.

**4.2 Where they come from.** `metadataInputs` (`packages/core/src/store/transactionMetadata.ts:29`) writes, for every transaction:
`POSITION`, `INSTANT`, `ACTOR` and `COMMAND_ID` when present (plus correlation, causation and config snapshot when present), one
`CHANGED_ENTITY` per distinct entity, and one `CHANGE` per change whose value is the JSON of `transactionChangeFromTriple`: op, tripleId,
entityId, attribute, entityType, value, validFrom, validTo, recordedAt, assertionTxId, and for a retraction retractedAt and retractionTxId.
The change row is a second copy of the fact inside a JSON string inside a JSON row. The P5B seeder deliberately did not suppress the journal
(`isJournalSuppressed`), so the store measures what live traffic will store.

**4.3 Against W0.** `population.ts` builds one command per hire, Section 1, background check, E-Verify, runtime outcome, document and
decision record, plus one command per ballast chain of `h` answers (each answer is its own entity with `field`, `value` and `next`).
187,520 commands carry 1,926,847 facts: 10.28 per command, 447 per subject at 10k (434,768 commands, 4.47M facts), matching the P4 bucket
mean (0.5 x 125 + 0.35 x 500 + 0.15 x 1,400 = 447.5). The answer chains explain the 4.35 changed entities per command and the 632,339
heads. R34's 0.45 GB assumed R25's 95 bytes per row and one row per fact; it missed the journal (1.81 extra rows per fact), the second copy,
the frames and JSON rows.

## 5. The proposed layout

### 5.1 Principles

1. **One home per row version.** A row id lives in exactly one of `facts`, `history` or `journal` (the same invariant `live_rows` and
   `retired_rows` keep today: a retraction moves the row).
2. **Verify on write, fall back verbatim.** Every row is encoded, decoded and compared with the original before the transaction begins;
   any difference (a non-canonical id, a time column that does not match its transaction, a journal value that does not re-derive, a `-0`)
   stores that row's full JSON instead. Correctness never depends on the codec being complete, only on decode being a pure function of
   immutable stored bytes. The cost of a codec gap is bytes, never a wrong answer.
3. **Nothing else changes.** Frames keep their format, chain and `committed_at`; claims, operations, pins and the marker keep their
   meaning; the append stays one `BEGIN IMMEDIATE` transaction; readers keep one short transaction per pull or page behind the checkpoint
   gate.

### 5.2 Changes A to D

**A. Drop `recent_rows` and `recent_id`.** `recent(after, selection)` becomes `facts WHERE pos >= (after+1)*1024` union
`history WHERE rpos >= (after+1)*1024`, with the same selection. This returns exactly what `recent_rows WHERE lsn > after` returns:
`recent_rows` holds the latest version of each id, a live row's latest version was written at its assertion, a retired row's at its
retraction, and a row id is in one table only. Retired rows are no longer deleted by `purge`: `history` is the history of record that
`recent_rows` was. `purge` still moves `h`, so H1 eligibility (Q68b: H trails head by one hour, pins hold it) is unchanged; a read below
`h` still routes to the history path, which now reads the same tables. R25 6.2 measured the split layout flat with retained retired rows
(rows examined 1.00x from depth 1 to 10), because a pull reads `history WHERE entity=? AND rpos > B`, bounded by what changed after B.
Drop `retired_rpos` (only `purge` used it).

**B. Frame retention with a persisted anchor.**
1. `marker` gains `base_lsn`, `base_crc`, `base_end`: the last purged frame's LSN, CRC and end offset (initially 0, the segment seed, 32).
2. A `retention(holder TEXT PRIMARY KEY, lsn INT NOT NULL, expires INT) WITHOUT ROWID` table. The floor is
   `min(non-expired holder lsn, marker.lsn - tailFrames)`; the last frame is never purged (the ACKED check reads it).
3. `purgeFrames` runs on the writer connection between commit groups in its own `IMMEDIATE` transaction, at most 16 frames or 16 MB per
   call, deletes a prefix of frames below the floor and moves the anchor in the same transaction.
4. An `epochs(epoch INTEGER PRIMARY KEY, begin_lsn, previous_epoch, aborted TEXT)` row is written with each EPOCH_BEGIN frame, so the
   aborted-LSN list and the feed's epoch resolutions no longer need old frames.
5. `HostLog.open` verifies the chain from the anchor (first retained frame's `prev_crc` equals `base_crc`, its offset equals `base_end`),
   streams retained frames in pages instead of loading them all, and `HostBroker.start` takes `headPosition` from the marker and the
   aborted list from `epochs`.
6. `LogFeed.start()` returns the anchor cursor; a cursor below the anchor gets a typed `FeedRetentionExpired {requested, retainedFrom}`,
   never a silent skip. A durable consumer (FD01's host consumer store) and a replica applier register holders.
7. **Default `tailFrames = Infinity`** (keep everything, today's behaviour), so every accepted suite that uses frames as its independent
   oracle runs unchanged. P5B, QH1 and production configurations set a finite tail. A detached replica holds nothing; an attached QLever
   replica holds the LSN it would replay from after a restart, which without `--persist-updates` is its last durable index build, so for
   lane Q with a replica most frames stay until QLever generations (phase 2) give it a durable base. Frame payload compaction (round 2,
   5.7) matters for that case.

**C. Compact typed rows.**

```
ents  (eid INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE)        entity ids, ref targets, tx ids
attrs (aid INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE)
strs  (sid INTEGER PRIMARY KEY, s    TEXT NOT NULL UNIQUE)        created_by, entity_type only; never fact values
txs   (pos INTEGER PRIMARY KEY, tx INT NOT NULL, at INT NOT NULL) one per transact position: tx id (eid), instant

facts   (e INT, id BLOB, a INT, pos INT, t INT, v, vf INT, vto INT, c INT, y INT, sv INT, x BLOB,
         PRIMARY KEY (e, id)) WITHOUT ROWID          + UNIQUE INDEX facts_id(id)
history (e INT, rpos INT, id BLOB, a INT, pos INT, t INT, v, vf INT, vto INT, c INT, y INT, sv INT, x BLOB,
         PRIMARY KEY (e, rpos, id)) WITHOUT ROWID    + INDEX history_id(id)
journal (same columns as facts, PRIMARY KEY (e, id)) WITHOUT ROWID + UNIQUE INDEX journal_id(id)
```

| Column | Encodes | Rule |
| --- | --- | --- |
| `e`, `a` | `entity_id`, `attribute` | interned ids |
| `id` | the row id | the 16-byte binary form of a canonical 26-character ULID (core's `monotonicFactory`); any other id stays TEXT in the same column |
| `pos`, `rpos` | `recorded_position`, `retracted_position` | as is |
| `t`, `v` | `value_type` and its one non-null `value_*` column | `ref` stores the target's eid; `integer` keeps its decimal string; number, datetime, boolean, string and json inline; values are never interned, so erasure stays row-local |
| `vf` | `valid_from - recorded_at` | 0 for journal rows, a small integer for most facts |
| `vto` | `valid_to` | null for almost every row |
| `c`, `y` | `created_by`, `entity_type` | `strs` ids, null when null |
| `sv` | `schema_version` | null when 1 |
| derived | `recorded_at`, `tx_id`; in history `retracted_at`, `retract_tx_id` | from `txs(pos)` and `txs(rpos)`, verified at write |
| `x` | anything that does not round-trip | the row's full JSON; when present it is the row |

Routing: a row goes to `journal` exactly when the existing `isJournalRow` predicate holds (`entity_type === "_Transaction"` and
`entity_id === tx_id`); retired versions of any row go to `history`. Reads with an entity selection probe all three tables (an empty
B-tree probe costs one or two cached pages), so routing never changes an answer. Dictionary inserts (`INSERT OR IGNORE`) happen inside
the append transaction; the writer's name-to-id cache is updated only after commit (a failed write is already fail-stop). Readers resolve
ids by join or by a per-reader cache, which is safe because an id's name never changes once committed.

`heads`, `claims`, `operations`, `pins` keep their schema in round 1 (17.5 B per fact today; small). The append loop must also carry the
P5B claim fix: each nested claim records its own transact's position.

**D. Derived journal values.** Three journal attributes are pure functions of rows the store already holds:

| Attribute | Stored as | Decoded from |
| --- | --- | --- |
| `:_tx/position` | `t = 8`, `v` null | the row's own `pos` |
| `:_tx/instant` | `t = 9`, `v` null | `txs(pos).at` |
| `:_tx/change` | `t = 7`, `v` = the referenced triple id (16 bytes) | the referenced row's immutable columns (entity, attribute, entity type, value, valid from and to, recorded at, tx id) in `facts` or `history`, plus the change row's own transaction for a retract's `retractedAt` and `retractionTxId`, serialized in `transactionChangeFromTriple`'s key order |

At write time the codec derives the JSON from the same member's rows (an assert references a fresh row, a retract references the retired
version in `member.rows`) and stores the reference only when the derived string is byte-identical to `value_json`; otherwise the value is
stored verbatim. The derive function exists once, in the worker, and is used for both the write-time check and the read-time decode.

Two consequences to record for ER01-Q: erasing a fact value now also erases it from the journal's change rows (a protected copy fewer,
TARGETS 7.3), and a physical deletion of a fact row must leave a tombstone that the journal decode can still reference.

### 5.3 What does not change, and choices rejected

| Choice | Decision | Reason |
| --- | --- | --- |
| Page size | keep 4,096 | `VACUUM INTO` at 8 KB and 16 KB pages: 41.89 and 41.86 MB vs 41.98 MB (-0.2%, -0.3%). Larger pages add WAL bytes per commit (about 8 to 12 pages dirtied per commit) for no size gain; P2 ranks above P5. |
| `WITHOUT ROWID` clustered by entity | keep | A P4 pull and a sweep page read every row of each entity in a hop; clustering makes that one range scan. A rowid table with an entity index would scatter a subject's rows across commit-order pages. |
| Surrogate integer row id instead of the 16-byte id | reject | Saves about 8 B per row but loses clustering or adds a second index. |
| Interning string values | reject | Breaks row-local erasure; W0 strings average 5 bytes. |
| `VACUUM INTO` after a seed | optional | Insert-order slack is 11% (47.2 to 42.0 MB). Use it for a seeded baseline file, never on a live broker. |
| `auto_vacuum` | no | Frames freed by purge go to the freelist and are reused by the next appends; the file stops growing instead of shrinking. |
| `secure_delete` | flag for ER01 | Freed pages keep old bytes; erasure needs `secure_delete=FAST` or crypto-shredding of frame payloads (Q58e). |

### 5.4 Predicted bytes per fact and sizes

Facts: 4.467M at 10k (434,768 commands x 10.275), 44.5M at 100k (R34). Today's per-fact costs are from 2.1; the round 1 numbers are the
prototype's measured bytes per user fact plus today's heads, claims and operations.

| Layout | B per asserted fact | 10k | 100k | Basis |
| --- | ---: | ---: | ---: | --- |
| Today | 5,656 | 25.3 GB | 252 GB | dbstat (the abort forecast said 26.9 GB with WAL) |
| A: drop `recent_rows`, `recent_id` | 3,304 | 14.8 GB | 147 GB | dbstat minus 2,352 |
| A+B: frames purged to a 64 MB tail | 2,380 | 10.6 GB | 106 GB | minus 924, plus at most 0.07 GB |
| A+B+C: compact rows, journal values verbatim | about 555 | 2.5 GB | 24.7 GB | prototype c1 598 B with text ids, minus about 56 B for binary ids (20 B x 2.82 rows per fact), plus 17.5 |
| **A+B+C+D (round 1)** | **about 259** | **1.2 GB** | **11.5 GB** | prototype c2 measured 241.5 plus 17.5 |
| Round 1 plus `VACUUM INTO` after seeding | about 232 | 1.04 GB | 10.3 GB | measured 11% slack |
| Round 2, journal as one record per transaction | est. 150 to 195 | 0.67 to 0.87 GB | 6.7 to 8.7 GB | 5.7 |
| R34's assumption | 100 | 0.45 GB | 4.45 GB | R25's 95 B per row, no journal |

Round 1 measured components (c2, per user fact): facts 50.6 + facts_id 28.3 = **79** for the facts themselves; journal 81.0 + journal_id
51.4 = **132**; entity dictionary and its unique index **28.1** (W0's answer nodes make 0.43 entities per fact); `txs` **1.9**. Margin:
add 3 B per fact for `entity_type` and `created_by` columns the prototype simplified, and about 80 B per retraction once live traffic
retracts (1% corrections, superseded values). History grows with retractions only, as it should.

Write side: today a command writes about 9.5 KB of frame payload plus about 43 KB of JSON rows into two tables and two indexes; round 1
writes the same frame plus about 2.7 KB of rows. WAL bytes per commit fall about 4x, so checkpoint I/O falls with it. Commit latency is
dominated by F_FULLFSYNC (R42), so expect commit p50 and p99 unchanged or slightly better, not a P2 step change.

### 5.5 What the P4 current path and the P5 sweep read

| Reader | Today | Round 1 |
| --- | --- | --- |
| P4 current pull, replica detached or unreachable (H1, EXP-QH1) | `live_rows` by entity plus `retired_rows WHERE rpos > B`, JSON parse per row | `facts` by entity plus `history WHERE rpos > B`; never touches `journal` or frames |
| P4 current pull, replica attached | QLever rows plus the overlay from `recent_rows WHERE lsn > marker` | QLever rows plus `facts`/`history` by position after the marker |
| P5 sweep (P5B `sweep` op) | BFS over `live_rows` and `retired_rows`, 500 entities per statement, JSON parse, ref targets as strings | the same BFS; ref targets are eids, so the frontier needs no string lookups |
| History and record-time reads, replica down | every version from `recent_rows` | `facts` union `history` |

Read microbench (appendix A.3; 300 placement subjects, BFS over refs, about 440 rows per subject, better-sqlite3 12.10 raw mode,
Node 22.23, same host, single thread):

| Round | JSON layout, µs per row | Compact, µs per row |
| --- | ---: | ---: |
| 1 (first touch: JSON pages come from the 10.9 GB file) | 11.34 | 2.27 |
| 2 (warm) | 2.52 | 2.95 |
| 3 (warm) | 2.90 | 2.35 |

The layout does not make a warm read cheaper: the per-row cost is better-sqlite3 materializing about 10 values, not JSON parsing. It
makes the working set small enough to stay warm: at 100k the P4/P5 working set (facts and dictionary, 50.6 + 28.1 B per fact) is about
3.5 GB, 4.8 GB with the id index, against 252 GB today, which no host or VM cache holds. Two consequences:
1. **P4 throughput is at risk independent of layout.** A 447-fact pull costs about 1.1 to 1.3 ms of one reader thread in SQLite alone,
   about 800 to 900 pulls per second per core, below the 1,100 bar before IPC, the kernel and the main thread. EXP-QH1 should plan for
   raw-mode reads, columnar transfer from the worker, and lazy row objects. R34 risk 4 (decode-bound sweep) is the same finding.
2. **P5 at 100k is plausible on reads:** about 1,000 subjects per second per sweep worker, so four workers leave margin for the kernel.

### 5.6 How to measure

1. **Bytes per fact on a real seed** (the gate): seed W0 at 1k and 10k through the P5B round 2 host-store seeder (replica detached,
   `tailFrames` 1,024), then record in the receipt: dbstat aggregate per object, `page_count x page_size`, WAL bytes, `freelist_count`,
   row counts per table, and bytes per asserted fact with the seed manifest's submitted-assertion count as the denominator. Compare with
   the 5.4 table. 100k only after 10k lands within 15% of 259 B per fact and the disk check passes (11.5 GB plus the 5 GiB floor, per copy).
2. **Offline reproduction of this report:** appendix A against the retained P5B store, about two minutes per build.
3. **Read cost:** appendix A.3's BFS bench on the 10k store (cold after a page-cache purge is not possible on macOS without root, so
   report first-touch and warm separately), bytes read per pull from SQLite's `SQLITE_DBSTATUS_CACHE_MISS` or page counts per statement.
4. **History flatness** (TARGETS P4 item 2) stays EXP-QH1's measurement on the new tables.

### 5.7 Round 2 options (only if round 1's measured 10k number says 100k does not fit)

1. **Journal as one record per transaction** (est. 150 to 195 B per fact): store position, instant, actor, command id, changed entities and
   the meta-row ids once per transaction and synthesize the journal rows on read. Two open problems block it today: journal rows can be
   retired ("a later metadata retirement", `TriplesLive.ts` comment at `transactionAtBasis`), so the record needs per-row state; and a read
   by a journal row's id needs an index (about 51 B per fact) or a ruling that journal ids are found through their transaction.
2. **Frame payload codec:** encode commit-group rows with the same row codec (frames are 924 B per fact as JSON). Matters only while a
   replica holds frames; compress before Q58e's encryption.
3. **Change the journal at its source** (core, all three lanes): a `:_tx/change` that references the triple id instead of embedding the
   fact would remove the largest duplication on XTDB and Datomic as well (XTDB A0 is about 30 KB per command, R34). A cross-lane contract
   question for Sam, not a broker change.
4. Seed intent logs are a disk consumer outside the store: P5B's `seed.ndjson` is 5.5 KB per command, about 2.4 GB at 10k and 24 GB at 100k.

## 6. Correctness properties kept

| Property (accepted by) | Mechanism today | After R45 | Gate that proves it |
| --- | --- | --- | --- |
| Atomic, idempotent commit (P2Q, SQL01, INT-Q) | one `BEGIN IMMEDIATE` per frame writes frame, rows, claims, operations, heads, marker | the same transaction also writes dictionary rows, `txs` and journal rows; encode and verify happen before `BEGIN`, so the write lock is not held longer | SQL01 "publishes rows, claims, receipt, head and frame atomically across reopen"; G8 kill |
| Lost-ACK receipts | `operations`, `claims` | unchanged, plus the claim-ordinal fix | broker-fixes suite, SQL01 idempotency, new nested-claim regression |
| Durable, ordered feed (P3) | frames from LSN 1, CRC chain from the segment seed | frames from the anchor; chain from `base_crc`; typed refusal below the anchor; holders for consumers; default retention keeps all | SQL01 feed-restart schedules; new retention gate G8 |
| Pinned reads never block writers (P1) | one short read transaction per pull or page, checkpoint gate | unchanged; frame purge is chunked on the writer between groups, never inside a reader transaction | SQL01 checkpoint-round2 barriers, "four reader threads at fixed cuts stay exact while writers progress" |
| Exact rows at every cut (Q89i masking, H1 equals frame replay) | JSON rows | verified codec; decode is a pure function of immutable bytes | sqlite-broker "H1 equals frame replay at ordinal cuts", h1-route-equivalence, SQL01 routes-round2 (77,616 reads), new G6 |
| Overlay merge by id, latest version wins (Q58d) | `recent_rows` upsert | `facts` and `history` by position, one home per id | new G6 old-versus-new equivalence |
| Q89b record-time refusal on H1 | worker refusal | unchanged | h1-route-equivalence T and TP witnesses |
| Recovery after abrupt stop (80 SIGKILLs, zero ACKed loss; mid-WAL corruption detected) | marker and frame cross-check, ACKED sidecar | the same cross-checks from the anchor; open no longer loads the whole log | SQL01 `kill.mjs` and `flip-wal.mjs` (not rerun by INT-Q), new kill-during-purge |
| H1 availability (Q68b horizon, pins) | `h` moves, retired rows deleted | `h` moves, nothing deleted | h1-route-equivalence pin and purge cases |

## 7. Re-verification and timing

**7.1 Accepted gates to rerun** (the INT-Q set, from `lab/experiments/INT-Q/REPORT.md`, same commands and skip names):

| Gate | Expected |
| --- | --- |
| QLever package suite | 235 pass, 26 named live skips |
| G0 QLever (`lab/bin/gate.mjs`) | 1,388 pass, 76 exact expected skips |
| G0 XTDB | 1,218 pass, 137 skips (sanity: shared core untouched) |
| SQL01 semantic suite (`lab/verify/SQL01/{review,schedules,routes-round2,checkpoint-round2}.test.ts`) | 11/11, zero route mismatches |
| SQL01 durability (`kill.mjs`, `flip-wal.mjs`; not rerun in INT-Q) | >= 80 SIGKILLs, zero ACKed commits lost; mid-WAL flip refused |
| P2Q offline matrix and storage controls (`lab/verify/P2Q`) | 873 pass, 5 storage controls; its harness reads all frames, so it runs with default retention |
| Testkit route harness | 93/93 |
| Live QLever broker on qlever-dev | 5/5 (overlay path changed; diagnostic timings) |
| Lab pack gate (EXP-PACK) | pass |
| Evaluator Q87 on a committed tree | 108/108 |

Tests that read tables directly and need updating: `sqlite-broker.test.ts` and `broker-fixes.test.ts` read only `frames` (unchanged); the
P5B branch's `readback` and `counts` ops read `recent_rows` (P5B round 3 ports them).

**7.2 Contract.** The broker sources are not contract-pinned (INT-Q `pin-changes.json`: 243 pin paths scanned, no change, while INT-Q
edited every broker file), and the broker is default-off, so under Q62b and Q81c the code merges after independent review without a
contract version. Three contract texts name `recent_rows` and go stale: Q58c ("the overlay becomes a persisted recent_rows table", which
`build_contract.py` line 4493 checks for), the protected-copy inventory entry "broker recent_rows overlay" (`build_contract.py` 1314 and
4500, `lab/acceptance/oracle/test_observe.py` line 60), and Q58e's log-erasure text. Proposed rulings, for 0.4.1 with Q99 to Q101:

| Proposed | Ruling |
| --- | --- |
| R45-a (amends Q58c, Q58e) | The persisted overlay and the broker's history path are the H1 tables read by position: current rows asserted after L and retired rows retired after L. `recent_rows` is removed. The protected-copy inventory names the broker's facts, history and journal tables and its dictionaries (entity ids, attribute names, actors, entity types; never fact values). |
| R45-b | Frames below `min(registered holders, head - tail)` may be purged; the CRC chain verifies from a persisted anchor; a feed cursor below the anchor gets a typed `FeedRetentionExpired`; durable feed consumers and replicas register holders; suites that use frames as their independent oracle run with retention of all frames. |
| R45-c | `purge` moves H only; retired rows are history and are deleted only by erasure. Q68b's H1 eligibility is unchanged. |
| R45-d | Every stored row round-trips byte-exactly or is stored verbatim; derived journal values are accepted only on write-time byte equality. |
| R45-e | R34's forecasts use measured bytes per fact: 259 B predicted for round 1, replaced by the 10k receipt. |

**7.3 Before or after 0.4.0.** Build now, in parallel. 0.4.0 waits on RT01's live G2 and G6, which wait for host disk above 10 GiB, so it
is not imminent, and nothing in 0.4.0's queue (RT01, O-REPLAY 0.5.0, FD01, QNODELAY, M01, CHECKJS) depends on the broker's tables.
Merge round 1 default-off before 0.4.0 branches if it is accepted in time, otherwise immediately after 0.4.0 merges; never while 0.4.0's
G0 runs are in flight, since G0 QLever covers the broker. Wire FD01's consumer checkpoints as retention holders after 0.4.0 merges FD01
(round 1 ships the holder API and keeps all frames by default, so nothing breaks in between). EXP-QH1 and P5B round 3 both start on the new
layout, which is the reason to do this before either.

Disk note: the retained 10.9 GB P5B store is the largest single item on a disk with 8.4 GiB free. Keep it until the 10k receipt reproduces
section 5.4, then ask Sam whether to compress or delete it.

## 8. Builder brief: EXP-HS01 host store layout (Codex medium)

**North star:** P5 and P4 (bytes per fact, working set), with the P2/P1 recovery floor (bounded open). Correctness is the floor.

**Read first:** `CLAUDE.md`; `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; this file (R45) sections 3, 5, 6, 7; R25 section 6;
`packages/qlever/src/broker/{sqlite-worker.ts, log.ts, broker.ts, feed.ts, frames.ts}`; the P5B claim fix in
`.claude/worktrees/p5b/packages/qlever/src/broker/sqlite-worker.ts` (the `[EXP-P5B-R2]` claims line).

**Base:** a new worktree from `main` at contract 0.3.14 (`1de3e640` or later); branch `exp/HS01-host-store-layout`. Do not touch
`/Users/sam/projects/triplex-db`, ports 15442/17019, Docker or colima; use `lab/bin/heavy.mjs` for heavy commands and the lab pack gate.
No edits under `lab/acceptance/`.

**Do:**
1. Schema v2 in `sqlite-worker.ts` (section 5.2 C): `ents`, `attrs`, `strs`, `txs`, `facts`, `history`, `journal` and their id indexes;
   remove `live_rows`, `recent_rows`, `retired_rows`, their indexes and `retired_rpos`. Opening a v1 file throws a typed `BrokerLogError`
   naming the legacy layout (as the legacy segment refusal does); no migration tool.
2. The row codec in the worker: encode, decode, and a write-time round-trip check per row against the canonical column order, falling
   back to `x` (full JSON) on any difference; `Object.is` for numbers. Journal derivations for `:_tx/position`, `:_tx/instant` and
   `:_tx/change` (section 5.2 D) with byte-equality acceptance. One derive function, used for both directions.
3. `append`: dictionary `INSERT OR IGNORE` inside the transaction, writer cache updated after commit; facts and journal by
   `isJournalRow`; retraction moves the row to `history`; the claim-ordinal fix; `recent_rows` writes removed.
4. Reads: `pull` (H1) and `recent` on the new tables with unchanged results (section 5.2 A); `purge` moves `h` and deletes nothing;
   keep every op name and result shape the adapter and broker use.
5. Frame retention (section 5.2 B): anchor columns, `retention` and `epochs` tables, `purgeFrames` op on the writer, `HostLog` options
   `frameRetention: { tailFrames }` (default `Infinity`) and `retain(holder, lsn, ttlMs?)`/`release(holder)`; `HostLog.open` verifies from
   the anchor and pages through retained frames; `HostBroker.start` uses the marker and `epochs`; `LogFeed.start()` returns the anchor and
   below-anchor cursors fail with `FeedRetentionExpired`.
6. Tests listed under gates G6 to G9. Keep `[EXP-HS01] Why/Rejected` comments at each non-obvious choice.
7. `REPORT.md` in `lab/experiments/EXP-HS01/` with predictions beside measurements (section 5.4 table), the PASS/receipt audit table the
   lab requires, durable evidence in `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-HS01/`, and no self-promotion.

**Do not:** change the frame payload format, the CRC chain, positions, the commit-group decision logic, the adapter's routing, or any
public API shape; intern fact values; add a long-lived read transaction; implement round 2 options.

**Gates** (all in one source-frozen final attempt, receipts bound to source hashes):

| Gate | Pass condition |
| --- | --- |
| G1 build | qlever and core build, typecheck, lint, format, `git diff --check` |
| G2 package and G0 | QLever package 235 pass with the same 26 skip names; G0 QLever 1,388 with the same 76 skips; G0 XTDB 1,218 with 137 |
| G3 SQL01 | semantic suite 11/11, zero mismatches; checkpoint barriers pass |
| G4 P2Q | offline matrix 873, storage controls 5, harness with default retention |
| G5 route harness | 93/93 including the actual H1 driver |
| G6 layout equivalence (new) | one seeded command stream (asserts, retractions, replacements, valid-time edges, journal rows, nested groups, epochs) into the v1 worker (retained as a test-only reference copy) and the v2 worker; >= 50,000 generated reads across `pull` at cuts, `recent(after)` with entity, id and empty selections, history reads, `claim`, `operation`, `head` and feed pages; every answer byte-identical after canonical sort; plus SQL01's independent event-derived oracle on the v2 store; zero mismatches |
| G7 codec property (new) | >= 100,000 random rows including ids that are not canonical ULIDs, `-0`, +-2^53, large and small doubles, unicode and lone surrogates in strings, every value type, null versus absent columns, journal values that do and do not re-derive; every row decodes byte-identical; report the verbatim-fallback rate (expected 0 on the W0 seed) |
| G8 retention and recovery (new) | purge with holders and tail; reopen verifies from the anchor; ACKED check after purge; feed below anchor is typed; `kill.mjs` >= 80 SIGKILLs including during `purgeFrames` and during dictionary growth with zero ACKed loss; `flip-wal.mjs` refusal; open after purging 1 GB of frames reads only retained frames (assert bytes read and peak RSS) |
| G9 bytes (new) | W0 seed at 1k and 10k through the P5B round 2 seeder (run from its branch rebased on HS01, or vendored as a test tool), replica detached, `tailFrames` 1,024: 10k <= 1.4 GB logical and <= 300 B per asserted fact; dbstat per table and the 5.4 comparison in the receipt; free disk checked before start (needs 1.4 GB plus the 5 GiB floor) |
| G10 diagnostics (no bar) | commit p50/p99 against a v1 baseline on the same host and schedule (SQL01 schedules or the P2Q bench), report the ratio; appendix A.3 read bench on the 10k store, first-touch and warm |
| G11 pack and evaluator | lab pack gate passes; evaluator 108/108 on the committed tree |
| G12 live (diagnostic, when a slot allows) | live QLever broker 5/5 on qlever-dev with unique graphs |

**Review:** a Codex high reviewer gets the diff and sections 5 and 6 of this file, not the builder's report, and is asked first for any
read whose answer differs between v1 and v2 and for any codec input that decodes differently from what was written.

## 9. Risks and open questions

| Risk | Effect | Mitigation |
| --- | --- | --- |
| A codec gap stores many rows verbatim | bytes, not correctness | G7 reports the fallback rate; G9 fails above 300 B per fact |
| Journal derive drifts from core's `transactionChangeFromTriple` after a core change | rows stored verbatim from then on | byte-equality at write makes drift a size regression; G9 catches it |
| Physical deletion of a fact (erasure) breaks a derived journal row | journal decode fails | ER01-Q keeps a tombstone or re-materializes the change verbatim before deleting; flagged in R45-a |
| A replica attached without a durable base keeps all frames | lane Q with replica stays frame-heavy (924 B per fact) | QLever generations phase 2 or round 2's frame codec |
| Feed consumers not registered as holders lose their cursor | typed `FeedRetentionExpired`, never silent | default retention keeps all until FD01's holders are wired |
| Round 1 does not fit the 100k duet on the host (2 x 11.5 GB) | B2 waits | measure 10k first; round 2 option 1 or 3; or the VM pool disk |
| P4 per-core throughput (5.5) | P4 bar missed regardless of layout | EXP-QH1 owns it; raw mode and columnar transfer |

## Appendix A. Reproduction

**A.1 Profile and counts** (read-only, about two minutes each):

```sql
-- sqlite3 'file:<store>/broker.db?mode=ro'
SELECT name, pgsize, ncell, payload, unused FROM dbstat WHERE aggregate=TRUE ORDER BY pgsize DESC;
SELECT substr(entity,1,instr(entity,':')) ns, json_extract(row,'$.attribute') attr, count(*), sum(length(row))
  FROM live_rows GROUP BY 1,2 ORDER BY 3 DESC;
```

**A.2 Prototype c2** (run with the store opened `?mode=ro` and the CLI's working directory in a scratch folder; c1 is the same with text
ids, one table, `v = value_json` for json rows and no derived values):

```sql
PRAGMA temp_store=MEMORY;
CREATE TEMP TABLE s AS SELECT entity,id,pos,row FROM main.live_rows WHERE pos BETWEEN 1024000 AND 1331200;
CREATE TEMP TABLE x AS SELECT entity,id,pos, json_extract(row,'$.attribute') attribute, json_extract(row,'$.value_type') vt,
  json_extract(row,'$.value_string') vs, json_extract(row,'$.value_number') vn, json_extract(row,'$.value_boolean') vb,
  json_extract(row,'$.value_datetime') vd, json_extract(row,'$.value_json') vj, json_extract(row,'$.recorded_at') ra,
  json_extract(row,'$.valid_from') vf, json_extract(row,'$.valid_to') vto, json_extract(row,'$.created_by') cb,
  json_extract(row,'$.tx_id') tx, row_number() OVER (ORDER BY id) idn FROM s ORDER BY pos, id;
ATTACH 'c2.db' AS c;
CREATE TABLE c.ents(eid INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, type INT);
CREATE TABLE c.attrs(aid INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE c.actors(cid INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE c.txs(pos INTEGER PRIMARY KEY, eid INT NOT NULL, instant INT NOT NULL);
CREATE TABLE c.live(e INT NOT NULL, id BLOB NOT NULL, a INT NOT NULL, pos INT NOT NULL, t INT NOT NULL, v, vf INT, vto INT, c INT,
  x BLOB, PRIMARY KEY(e,id)) WITHOUT ROWID;
CREATE UNIQUE INDEX c.live_id ON live(id);
CREATE TABLE c.jrn( ...same columns... , PRIMARY KEY(e,id)) WITHOUT ROWID;
CREATE UNIQUE INDEX c.jrn_id ON jrn(id);
INSERT OR IGNORE INTO c.ents(name) SELECT entity FROM x ORDER BY pos, id;
INSERT OR IGNORE INTO c.ents(name) SELECT vs FROM x WHERE vt='ref';
INSERT OR IGNORE INTO c.attrs(name) SELECT DISTINCT attribute FROM x;
INSERT OR IGNORE INTO c.actors(name) SELECT DISTINCT cb FROM x WHERE cb IS NOT NULL;
INSERT OR IGNORE INTO c.txs SELECT DISTINCT x.pos, (SELECT eid FROM c.ents WHERE name=x.tx), ra FROM x;
-- rows: e, 16-byte monotonic id (unhex(printf('%032x', idn)) stands in for the binary ULID), a, pos, type code,
-- v (ref -> eid; position, same-instant datetime and json change values -> NULL as derived), vf - ra, vto, actor id;
-- journal rows (entity LIKE '\_tx/%') into jrn, the rest into live, in (pos, id) order.
```

Measured: c1 116,912,128 bytes (598 B per user fact); c2 47,206,400 bytes (241.5 B per user fact; live 9.88 MB, live_id 5.54, jrn 15.84,
jrn_id 10.06, ents 2.68 plus index 2.82, txs 0.36); c2 after `VACUUM INTO` 41.98 MB at 4 KB pages, 41.89 at 8 KB, 41.86 at 16 KB.

**A.3 Read bench.** For 300 placement subjects (`pl:` entities without `/`), BFS over ref values: JSON layout
`SELECT row FROM live_rows WHERE entity=?` with `.pluck()` and `JSON.parse`; compact layout `SELECT e,id,a,pos,t,v,vf,vto,c FROM live
WHERE e=?` with `.raw()` and in-memory `ents`/`attrs` maps building a row object. 132,244 and 131,529 rows (the compact sample lacks rows
recorded outside its position window). Results in 5.5.

## Appendix B. One stored row today (502 bytes)

```
{"id":"00Q2UO55000000000000000002","entity_id":"_tx/00ROJ727000000000000000001","attribute":":_tx/position","value_type":"number",
"value_string":null,"value_number":2048,"value_boolean":null,"value_datetime":null,"value_json":null,"recorded_at":1793783600000,
"recorded_position":2048,"valid_from":1793783600000,"valid_to":null,"created_by":null,"retracted_at":null,"retracted_position":null,
"retract_tx_id":null,"entity_type":"_Transaction","schema_version":1,"tx_id":"_tx/00ROJ727000000000000000001"}
```

Its information content in round 1: an entity id, a 16-byte id, an attribute id, a position, a type code and nothing else (the value is
the row's own position, the times and the tx id come from `txs`), about 30 bytes with record and cell headers.
