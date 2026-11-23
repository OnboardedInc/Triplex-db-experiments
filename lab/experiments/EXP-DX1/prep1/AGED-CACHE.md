# The 32 GiB cache arm on the one-billion-record database

**North star P2.** Saturday's best writer arm, run once more on AGE1's sealed one-billion-record cut. This tests whether saves slow as the database grows, on real aged data. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## The first launch was refused, and why

The first launch, at `cdc72d4d5` on bench 4 on November 23, stopped before any offer at the live-head check (step 3 below). The SDK row decoder threw `Journal position payload must be null` on the journal of AGE1's last save, at position 28,309,866. [Driver's reading](https://github.com/OnboardedInc/Triplex-db-experiments/blob/25e147673/lab/experiments/EXP-DX1/bm1/AGED-CACHE-READING.md)

**The aged data is non-canonical, and the check was right to fail on it.** No product writer produces this row shape. The SDK (`rowText.ts`) and the gateway's own journal writer (`privacy.clj`) both write a version 2 `:_tx/position` row with a `P` header marker and a null `value_number`. AGE1's loader encoded every row with the gateway's test fixture encoder, `selftest/row-text`. That encoder writes the ordinary `-` marker and the position itself as `value_number`. All three of AGE1's write paths use it: product saves through `tape/input`, native single saves through `native/render` and grouped saves through `native/grouped-render`. So every AGE1 save carries one such row: positions 87,003 to 28,309,866, which is 28,222,864 rows. The SCALE1 seed's positions 1 to 87,002 were written through the SDK and are canonical. The gateway's Clojure reader ignores the stored payload and decodes these rows. The TypeScript SDK refuses them.

| Product read through the SDK | Touches AGE1's position rows? | Result on the 1 billion database |
| --- | --- | --- |
| Change feed (`getTransactionsAfter`, `/v2/db/…/transactions`) from any position before 28,309,866 | Yes, one per save | Throws |
| A transaction's journal (`/v2/db/…/journal`, `getTransactionRowsAtPosition`), for example a change's provenance | Yes, for any AGE1 transaction | Throws |
| Row sweeps (`decodeSweepRows`) that cover AGE1 journal entities | Yes | Throws (same check in `sweepRows.ts`) |
| A person's current rows, pinned (as-of) rows and history rows; by-id reads of business rows | No: business rows use the ordinary encoding | Decode. The live gate read 140 of them at the aged head through this branch's reader. |
| Feed from the aged head onward, and new saves | No: new rows are written by the product | Decode. The live gate made an ordered save after aging. |
| Removal on request | It rewrites journals in the gateway, which reads them in Clojure. The SDK side was not traced. | Not verified |

The database is valid for measuring saves and current and pinned reads of people. It is not valid for a feed or journal read that crosses AGE1's history, until the SDK accepts that shape. A safe decoder change exists, and it is published separately for the integration builder; see "SDK decoder change" below. The arm does not depend on it.

## What runs

| Setting | Value |
| --- | --- |
| Pin | `1bbaf54cdd2180ccaa2cd6ce961c05be49eefbc2` |
| Arm | `1-rolling6-cache32-S` only: rolling 6 credits, 32 GiB object cache, three transactor cores |
| Transactor | Java 25 ZGC, `-Xmx49152m`, `-XX:MaxDirectMemorySize=8192m`, 60 GiB container, `index-parallelism=1` |
| Other roles | PostgreSQL 8 GiB, writer 6 GiB, reader 5 GiB, same cores as Saturday |
| Tapes | The same four 300-second tapes as Saturday's `97aced1b1` cache32 arm: 3.5/s quiet only, then 394 offered; 3.5/s quiet only, then 620 offered |
| Counters | The same as Saturday: per-second SQL reads, cache counters, index jobs, apply, cgroup memory and CPU |
| Time cap | 45 minutes for the whole command (2,700 s), 40 minutes for the arm (2,400 s). The 176 GB copy happens inside the arm. |

The arm matches Saturday's run in everything but the database. Three choices follow from that:

- **No 235/s window.** Saturday's cache32 arm ran 394 and 620 only. Adding 235 first would warm the cache before 394 and add ten minutes.
- **No 16 GiB control.** Saturday's three-core 16 GiB numbers came from the three-rate rolling 6 run at a different commit (`c8f903ce1`). A control here would need a new arm and launch profile that has never run, and it does not fit the hour beside a second 176 GB copy.
- **No lookup trace.** `PREP1_LOOKUP_EVERY` does not exist on this base.

## What changed in the seed checks

The fresh seed checks all stay. Seed cut 87,002 is still checked against the SCALE1 image and transfer pins, the loader's final command and claim at 87,002, and the 40 membership rows at 87,002. The aged cut adds these checks, all before any offer:

1. **The handoff file.** `cache32-aged` takes the same `AGE_HANDOFF_JSON` and `AGE_HANDOFF_SHA256` pair the scorecard uses. The digest must match, in `server.sh` and again in the producer.
2. **The handoff's content.** The version is `triplex-age1-scorecard/1`. The source seed's manifest digest equals the SCALE1 image pin. Scope, database name and layout equal the seed's. The seed head is 87,002. The logical head equals 87,002 plus the replayed saves. The record count is at least one billion. The last operation and transaction IDs follow from the save count. The two embedded replay ledgers match their recorded digests.
3. **The live head.** The gateways must open the copy at exactly the handoff's logical head. The newest transaction must be AGE1's last save, checked field by field:
   - The transaction ID and position from the feed must equal the handoff's last transaction and head.
   - Every journal row must have that transaction as its entity and `tx_id`, entity type `_Transaction`, the head as its position and the handoff's last record clock.
   - There must be exactly one position row, typed `number`. Its payload is either AGE1's shape (`-` marker, value equal to the head) or the product's (`P` marker, null). Anything else is refused.
   - There must be exactly one command row, equal to the handoff's last operation.
   - There must be exactly one instant row, whose time equals the last record clock.
   - Every row other than the position row must also pass the SDK decoder, which must agree on ID, entity, attribute, type, string value, position, record clock and `tx_id`.
   - The claim on the last operation must resolve to that transaction.

   The journal rows are parsed column by column (`agedJournal` in `ceiling-seed.ts`). The proof is stronger than before: it now covers the position and instant rows and every row's binding, where the first version checked only the command row.
4. **Every predecessor the tape will replace.** Each person's field 0 and field 1 are read at the aged head. A row at or before 87,002 must still hold the seed's revision 0 value. A newer row must be byte-exact to AGE1's replay tape. Its position gives the save offset. The offset and the person give AGE1's ledger index (active sample or probe). The value, row ID and transaction ID must then match what AGE1's tape writes for that save.
5. **One arm, one database.** The producer refuses an aged seed outside `cache32-aged`, and `cache32-aged` without one.

## The aging loader left the tape's people ready to save

- **Which people AGE1 changed.** AGE1 edited the first task's fields 0–2 of a fixed sample in each account, at local index `floor(j × 99,998 / per-account)`, plus one probe person (99,998). About one in five of this tape's people falls in that sample. Their latest rows carry AGE1's values. The predecessor check above reads those rows at the aged head, so the tape retracts the actual current rows.
- **Revision and position.** AGE1 sets each owner's revision to its last save's position, which is at or below the aged head. The ordered writer requires `revision ≤ sourceK ≤ head`. The tape sends `sourceK = max(head, predecessor positions)`, which is the aged head.
- **Ordered identity.** AGE1's row IDs are `A…` and `B…` followed by digits. Its journal IDs are `_tx/T…`. The tape's new IDs are time-ordered ULIDs beginning `01`. The ordered identity check compares exact IDs inside the submitted interval, and AGE1's IDs fall outside it.
- **Verified on a live gateway.** The live gate below opened an AGE1-aged toy database on this branch's gateway. One ordered save on an AGE1-edited owner went through the ordered writer (`subjectOrderedIds`, subject function path) at the next position.
- **Record time after aging.** AGE1's record clocks run about a year ahead of wall time. The gateway gives a new save the previous clock plus 1 ms: 1,831,708,224,061 after AGE1's 1,831,708,224,060 in the gate. On the 1 billion database, new saves will carry record times after AGE1's last clock, not wall time.

## Live Mac gate (November 23, after the refusal)

One ordinary heavy token, one container, about seven minutes. Evidence is in `evidence/DX-PREP1/aged-live-2026-11-23.tar.gz`, SHA-256 `476276aa32da14ebb430f1b36c6ba2423156578557dcde8d471890bd360660dc`. Scripts are in `prep1/aged-live/`.

1. **Seed.** PostgreSQL, a transactor and this branch's write gateway, with the server writer's subject-save switches, took a SCALE1-shaped toy through the SDK. It has ten accounts, 50 people each with membership rows and three first-task fields, and a final loader command at cut 61.
2. **Age with AGE1's own code.** The gateway and transactor were stopped. A transactor with AGE1's gateway source at its load pin `5cda4ab20` was started. A separate JVM ran AGE1's `adopt/subject!` for 70 people and 300 saves of `tape/command` through AGE1's `storage/commit!`, with one probe save. Every receipt matched.
3. **Reopen.** A fresh transactor and gateway from this branch reopened the database, as the server does. Write options reported head 361 with the ordered writer on.
4. **Reproduce.** Decoding the last save's journal with the SDK threw `Journal position payload must be null`.
5. **Accept.** The arm's `scalePredecessors` passed through the live reader. It checked the loader claim at the seed cut, the 40 membership rows, the last-save journal proof and 140 field rows, 102 of them AGE1 edits.
6. **Refuse.** The same check refused seven tampered inputs: a changed value, a changed row ID, a shifted position, a changed seed value, a changed journal position payload, a changed journal command and a wrong handoff clock.
7. **Save.** One ordered save on an AGE1-edited owner was acknowledged at position 362 through the subject function, with `subjectOrderedIds`.

The archive also holds the offline gate repeated at the load pin. It used AGE1's fixture encoder for the last save's six journal rows: the refusal was reproduced, the rows were accepted, and four tampered versions were refused.

## First Mac gate (before the server launch)

One ordinary heavy token. Evidence is in `evidence/DX-PREP1/aged-gate-2026-11-23.tar.gz`, SHA-256 `17a97865396f9d28f167c7cb2a0e481d3ddcaa8c3b4c4a8d953f42a8869ae743`.

- **Accepts AGE1's own rows.** AGE1's replay tape, from `origin/exp/DX-AGE1-aged-database` `a0eee1ea1`, where `tape.clj` and `adopt.clj` are unchanged since the load pin `5cda4ab20`, computed the current rows of a toy adopted population: 70 people, 300 saves, three probe saves. It used `triplex.age.tape/expected-adopted` in the Datomic image (`aged_gate.clj`). The aged predecessor check accepted all 140 field rows: 103 AGE1 edits and 37 untouched seed rows.
- **Refuses tampered rows.** It refused a changed value, a changed row ID, a shifted position and a changed seed value (`aged-gate.mjs`).
- **Refuses a tampered handoff.** Unit tests cover a wrong pin and one changed byte under the original pin. They also cover re-pinned bundles with a moved head, a count under one billion, another scope, another seed manifest, a moved seed head, a wrong last operation, a wrong ledger digest and a wrong version. The fresh checks still refuse a row written after 87,002 (`ceiling-seed.test.mjs`, 4 of 4). The launch-profile and tape tests also pass, 8 of 8.
- **Not covered then:** it did not open a live gateway. That is the gap the server refusal exposed and the live gate above closes. `server.sh` itself is Linux-only and still runs only on the server.

## Predictions, written before the run

At 430 million records the 32 GiB cache covered this tape: 0.04 late SQL reads per save outside index jobs and under 0.001 inside. DX-W1's model puts the covering cache at 74 GiB at one billion. 32 GiB is 43% of that. If the model holds, misses come back, but fewer than with 16 GiB at 430 million. The copy also starts PostgreSQL and the page cache cold on a database 1.5 times larger, so the first minute will be worse than Saturday's.

| At 1B, three cores, 32 GiB | 394 offered | 620 offered |
| --- | ---: | ---: |
| Late SQL reads/save outside index jobs (Saturday 430M: 0.043) | 0.45 (0.20–0.90) | 0.55 (0.25–1.0) |
| Late SQL reads/save inside index jobs (Saturday: 0.0006) | 0.80 (0.40–1.40) | 0.95 (0.45–1.6) |
| Late mean apply ms outside → inside (Saturday: 0.30 → 0.48) | 0.9 → 1.5 | 1.0 → 1.7 |
| First 60 s SQL reads/save (Saturday: 1.48 then 0.94) | 2.0 then 1.4 | warm after 394 |
| Stored/s whole / second half (Saturday: 394.00 / 393.95; 620.00 / 620.01) | 393 / 394, no expiries | 540 / 550 (460–620), expiries likely |
| Second-half busy ACK p99 (Saturday: 521 ms; 709 ms) | 1,500 ms (300–6,000) | 8,000 ms (700–30,025) |
| Quiet loaded p99 (Saturday: 61.81 ms; 44.68 ms) | 75 ms (50–150) | 85 ms (50–200) |
| Quiet solo p99 (Saturday: 29.63 ms) | 35 ms | 35 ms |
| Peak transactor cgroup memory (Saturday: 51.2 GiB of 60) | 52–58 GiB | same |

**What would show the working-set model wrong:**

- **Too pessimistic.** Late reads stay at or below 0.10 per save outside jobs, 620 is stored in full, and second-half p99 at 394 stays under 1 s. Then 32 GiB still covers this tape at one billion. The writer's footprint tracks the people it touches, not total records, and the 74 GiB estimate is too high.
- **Too optimistic.** Late reads reach 1.0 per save or more outside jobs, Saturday's 16 GiB level at 430 million, while the heap has room. Then the misses do not scale like the model, or they do not come from the object cache: PostgreSQL buffers, the page cache or index-job rewrites. More cache would not be the fix.
- **Consistent with the model.** Anything between 0.2 and 0.9 outside jobs.

## Memory budget at one billion

Role caps total 79 GiB: transactor 60, PostgreSQL 8, writer 6, reader 5. The harness refuses a host with under 89 GiB `MemTotal`. A 96 GB (decimal) server is about 89.4 GiB, so roughly 10 GiB is left for the host and page cache.

- **A 48 GiB cache does not fit.** Saturday's 32 GiB cache needed a 48 GiB heap: the cache plus 16 GiB of working room for ZGC. A 48 GiB cache needs about a 64 GiB heap, 8 GiB direct and about 2 GiB native, so a 76 GiB container. Role caps would reach 95 GiB, more than the machine.
- **40 GiB is the most that fits, and it is not worth an arm.** It would need a 56 GiB heap and a 66–68 GiB container. That leaves about 2 GiB for the host, under the harness's 10 GiB guard, and ZGC with only 16 GiB spare risks long collections.
- **If reads come back near 1.0, do not add a bigger-cache arm here.** No cache that fits this server reaches the 74 GiB estimate. The better next step is the small owner head, which caps how much cold owner history the writer touches. A 128 GiB host could test 64–74 GiB if the owner wants the direct check.

## Command for the driver

Run after the scorecard, on the same server. Use a clean checkout of `exp/DX-PREP1-parallel-prepare` at the pin, and the same environment as Saturday's `cache32` job (`queue/cache32/prepare.sh`).

```bash
DX_BARE_METAL=1 node lab/bin/heavy.mjs --label DX-PREP1-cache32-aged -- \
  bash lab/experiments/EXP-DX1/prep1/server.sh cache32-aged "$CACHE32_AGED_OUT" 1bbaf54cdd2180ccaa2cd6ce961c05be49eefbc2 \
  "$SCALE1_IMAGE" 77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
  1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
  --pg-data "$AGED_PGDATA_SOURCE" --wal-mount "$SCALE1_WAL_MOUNT" \
  --aged-bundle "$AGE_HANDOFF_JSON" "$AGE_HANDOFF_SHA256"
```

- **`$CACHE32_AGED_OUT`** is a new absolute directory.
- **`$AGED_PGDATA_SOURCE`** is the stopped, held one-billion PostgreSQL 17 directory at the sealed cut, the scorecard's `AGED_PGDATA_SOURCE`. The harness makes its own copy inside the arm and never starts the source. Do not pass a scorecard scratch copy.
- **`$AGE_HANDOFF_JSON` and `$AGE_HANDOFF_SHA256`** are the scorecard's pair.
- **The database must keep its original name.** The handoff's `database` must equal the SCALE1 scope's database, because the gateways open it by scope. A restore renamed to `age-restore-<uuid>` is refused.
- **Free space.** The Docker volume filesystem needs more than the source size plus 32 GiB free, about 210 GB. The WAL mount and the evidence filesystem each need 16 GiB. Delete the scorecard's scratch copy first.
- **No containers may be running,** and the host needs at least 89 GiB `MemTotal`.
- **Collect** the output directory as Saturday's cache32 run was collected, with `day-evidence.py collect` and the pinned readout at this pin. The seed readback in the cell directory includes the aged proof: last save, claim and number of aged rows checked.

Expected duration is about 33 minutes: copy 6–7, start 2, offers 20, drains and collection 4. A refusal before offers costs only the copy.

## Other aged admissions

- **DX-JVM1 start-up read** (`origin/exp/DX-JVM1-settings` `54d4647a1`, `jvm1/startup-aged.ts`). It copies the first version's live-head proof, `lastText.map(decodeRowText)` at line 67, so it will stop the same way. The fix is in `prep1/aged-live/jvm1-startup-aged.patch`. It copies `journalColumns` and `agedJournal` and replaces the two lines. It applies cleanly with `git apply` at `54d4647a1`.
- **DX-W1 owner head pair, 1 billion line** (`origin/exp/DX-W1-commit-tail-reads` `db616801b`, `v01/study-server.sh`). Not affected. It admits the aged cut with AGE1's Clojure checker (`checkScorecard`), which decodes in Clojure. It decodes with the SDK only the SCALE1 loader's transaction at 87,002, which is canonical. Its feed starts at the aged head.
- **v0.1 scorecard** (`origin/exp/DX-V01-scorecard` `8cc32d380`). Not affected, for the same reasons: `checkScorecard`, an SDK decode only at 87,002, and the feeder starting at the aged head. A scorecard step that reads the feed or a journal from before the aged head would throw.

## SDK decoder change (separate commit, for the integration builder)

The commit after the handoff changes `packages/datomic/src/rowText.ts` and `sweepRows.ts`. A version 2 `:_tx/position` row may carry a non-null payload only if it equals its fixed-width position, and the row text header may then use the `-` marker. That is exactly the fixture shape. The row decodes to the same row as the canonical text. Any other payload is still refused, and the encoder is unchanged, so the product still writes only `P` and null. The arm's pin does not include it.
