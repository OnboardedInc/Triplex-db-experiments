# Pinned reads at 1 billion records: why they are forty times slower

**Status, 2026-11-23 evening: cause located by the 1 billion probe; two default-off options built and gated on the Mac; launcher published for the 1 billion pair.** Sources: the code at the scorecard commit `6770c37ba`, the fresh card's evidence and the 1 billion part 1 and 2 evidence (`score-1b-c-part1-2.tar.gz`, SHA-256 `e31c4adc…6056b`: the reader's request trace `gw-r.jsonl` with one cgroup CPU sample per second, its GC log and its JVM flags). Times from the Mac are diagnostic only. Sections marked *open* wait for tonight's run.

Measurement: aged scorecard part 2 at `6770c37ba` ([V01-AGED.md](https://github.com/OnboardedInc/Triplex-db-experiments/blob/182fb4482/lab/experiments/EXP-DX1/scale1/V01-AGED.md)). One-core read gateway, `server` profile. Pinned ladder at one seat: 18.12 reads/s, p50 44.80 ms at 1 billion; 606.43 reads/s, p50 1.18 ms fresh.

## The answer (after the probe on the 1 billion database)

1. **The two cards did not run the same read.** Both pin the ladder and the quiet account's reads at the SCALE1 seed cut, position 87,002. On the fresh card that is the head; on the 1 billion card it is 28,222,864 positions behind the head, so every pinned read runs on an as-of view.
2. **Nearly all of the cost is one lookup in our own read route, not the subject read.** `storage/read-rows` builds the as-of view first (`at-position`) and then calls `lean/rows`, whose `reach/select-db` calls `group-cut/interior`, which resolves the lookup ref `[:triplex.group/position 87002]` **on the as-of view** (`group_cut.clj` line 18 at `6770c37ba`). In the probe's CPU profile on the 1 billion database, 9,306 of 9,721 samples (95.7%; 98.9% of the samples inside `read-rows`) sit under that one `d/entid` call, in Datomic's index merge and filter iterators.
3. **Why it is slow: the view does not hold that position, and proving absence walks everything added after the pin.** `:triplex.group/position` is unique and only ever asserted, one value per grouped-save member. The pin 87,002 is a solo save, so the view has no member there. Datomic seeks the attribute's AVET range at 87,002 and filters each datom by the view's t; every following group position was asserted after the pin, so the filter rejects them one by one until the range ends. **The cost scales with the number of `:triplex.group/position` values above the pinned position that were asserted after the pin**: not with transactions in general, not with the subject's own retractions, and not with all retractions in a range. A pin near the head has few such values after it, which is why it is cheap (1.26 ms against 31.86 ms in the probe).
4. **Reproduced on the Mac (diagnostic):** a lookup ref for an absent position on an as-of view took 0.004, 0.48, 1.12 and 3.25 ms with 0, 10,000, 100,000 and 300,000 group positions asserted after the pin; the fixed lookup took 0.003 to 0.011 ms throughout. At about 30 ns per filtered datom on the server, 28 ms suggests roughly a million group positions after the pin in the aged database; that count has not been taken.
5. **This explains the rest of the evidence:** the same cost for every subject, edited or not, and for a repeat read (0 segment loads, 72 MB of short-lived allocation, all CPU); the reader CPU-bound at 0.97 to 0.99 of its core; and current reads and the reach route (P4), which run `select-db` on the current database, never paying it.
6. **The single read permit then serializes it.** `TX2_READ_PERMITS` defaults to the processor count, 1 on the reader, so 1 ÷ about 50 ms per read inside the permit gives the ladder's flat 18 to 19 reads/s.

**Correction:** earlier versions of this file leaned towards cold segment decoding (candidate A), then left A and B open. The probe settled it as B, compute that the cache cannot remove, and its profile located the compute in the cut lookup.

## The read errors and the quiet account's 2.5 s

- **The quiet account's reads are the same route.** `readCell` calls `client.rows` with basis `{recordedPosition: scope.seedCut}`, the ladder's as-of read. Their p50 of about 2.5 s is **queueing for the one read permit, not a slower route**: in the reader trace, from the first P6 cell on, the time inside the permit has p50 40 to 54 ms, and the wait for the permit has p50 2.3 to 3.6 s. The tape offers 64 reads/s from 64 seats; with about 20/s of capacity the seats pile up behind the single permit (64 ÷ 20 ≈ 3.2 s at full occupancy). The tape's latency is measured from the scheduled offer, so it includes that wait.
- **Their "errors" are missed offers, not failed reads.** `observer.ts` line 106 records "reader missed its offer" when a seat's previous read is still running at its next offer or the window has ended; line 133 records exceptions. At about 20 reads/s, 60 s returns about 1,200 reads; the card shows 1,001 to 1,306 returned per cell. The driver reports no error lines in the read gateway's log. Returned reads passed their exactness checks.
- **The ladder's 1,611 errors at 1,024 seats** are caught exceptions whose text is not kept (`adopted.ts` line 135). The ladder client times out at 35,000 ms (`new DatomicClient(peer.read, 35000)`), and in the trace the wait for the permit reached a p50 of 25.4 s with 1,024 seats queued, so these are almost certainly client timeouts. The gateway keeps serving requests whose clients have gone, so goodput fell to 11.17/s.
- **P4's 33,179 ms maximum.** Current pulls take the same read semaphore (`reach.clj` line 384); the first pull after the ladder most likely queued behind abandoned 1,024-seat requests. Its p50 and p99 (4.22 / 47.10 ms) match fresh, and current pulls read at the head, so they never pay the as-of cost.

## Why the fresh database does not show it, and store or aged database

- **The fresh database has no group positions after its pin**, because its pin is its head, so the lookup finds nothing to filter.
- **The aged database's cost comes from grouped-save positions written after the pin.** Any database where grouped saves (the grouped writer, `group.clj` `materialize`; AGE1's `native/grouped-render`) record many member positions after a pin shows it for that pin, whatever its size. It is a property of our read route on Datomic's as-of view, not of the 1 billion size, of the loader's non-standard `:_tx/position` rows, or of the subjects the loader edited.
- **Not established:** how many group positions the aged database holds after 87,002 (estimated at about a million from the time per filtered datom), and how many a product database would accumulate. Every grouped save adds one per member.

## The fix: two options, both off by default

| Option | What it does | Cost per save | Why it is exact | Expected effect at 1 billion |
| --- | --- | --- | --- | --- |
| **`TX2_PINNED_CUT_LOOKUP=1`** (`group-cut/member-at`) | When the pinned route has its request's current database (`pinned/*current*`, bound by `storage/read-rows`), resolve the group member at the pinned position on the current database and accept it only if its `:triplex.group/position` datom was asserted at or before the view's t. Otherwise the old lookup. | None | Group positions are unique and only ever asserted, each on a new member entity; no writer retracts or changes one (`group.clj`, `group_prepare.clj`, AGE1 `native.clj`). So the view holds a member at that position exactly when the current database holds it with an assertion at or before t. Unit test: equal to the view's own lookup for every position from 0 to 1,299 with 1,194 positions added after the pin. | Removes the walk: the probe's 31.86 ms per old-pin read should fall to about its near-head cost (1.26 ms) at any pin. |
| **`TX2_PINNED_SHORTCUT=1`** (`pinned/current-eid`, used by `lean/rows` and `reach/read-entity`) | A named subject is read from the current database when its `:triplex.entity/rev` is at or below the pinned position **and** none of its datoms in the current database was asserted after the view's t; every other subject keeps the as-of view. | None (the revision is already stored) | The second condition makes exactness independent of whether a writer remembered the revision: any assertion on the subject after the pin sends it to as-of. The only gap would be a transaction that changes a subject's logical rows with retractions alone; the audit below finds one such transaction, a fold without moves, and it changes no logical row. | After the cut lookup, an unchanged subject costs a current read (0.20 to 0.21 ms in the probe) instead of an as-of read (about 1 ms); 584 of 600 subjects qualified at the old pin in the probe. |

**Routes.** Both options apply to `/v1/db/{db}/read` pinned by `recordedPosition` or `recordedAt`, with one or many `entityIds`. The short-cut also applies to `/v2/db/{db}/reach` and `reach-many` (historical worlds), whose `select-db` already runs on the current database and never paid the walk. Unchanged and still exact: reads by row ID, scans without `entityIds`, history reads, held or staged handles, interior cuts of a group (they keep the group-cut slice), `/q` (Datalog across subjects), the journal and feed routes (transaction entities), and the legacy layout. Write options report `pinnedShortcut` and `pinnedCutLookup`; `/v2/admin/scan-stats` reports the short-cut's current and as-of answers.

**Both time axes.** A pin on record time (`recordedPosition`, or `recordedAt`, which `select-db` turns into a t and a position) is where both options act. A valid-time read with no record-time pin is already a current read, so there is nothing to do. A read pinned on record time and filtered on valid time receives exactly the subject's stored rows at the pin from either database, and the same `visible?` filter then applies the valid time, so the answer is the same. A valid-time correction is a recorded save, so a correction after the pin sends the subject to as-of. The short-cut is a record-time device and reaches valid-time reads only through their record-time pin.

## Audit: what each writer does to a subject between a pin and the head

The short-cut answers from the current database only when (a) the revision is at or below the pin and (b) no datom of the subject was asserted after the pin's t. A writer can therefore make it inexact only by changing a subject's logical rows **without asserting any datom on the subject**.

| Writer | File and function | Asserts on the subject? | Advances `:triplex.entity/rev`? | Short-cut |
| --- | --- | --- | --- | --- |
| Per-person ordered writer | `subject_save.clj` `compile-code` (`revision-update`: `[:db/cas owner :triplex.entity/rev revision final]`, or `[:db/add …]` with the narrow check), `render-ops` (new rows; `[:db/retract owner :triplex.entity/row …]` for predecessors) | Yes: rows and revision | Yes, to the save's position, same transaction | Falls back to as-of. Gated |
| General writer | `storage.clj` `tx-data` (`[:db/add "e:<entity>" :triplex.entity/rev (marker position)]` for every entity with a row in the save; `:triplex/assert`, `:triplex/retract`, born-retired markers), expanded by `commit.clj` `operation-code` | Yes | Yes, for every subject in the save | Falls back. Gated |
| Grouped saves | `group.clj` `materialize` (members' `tx-data`, plus `:triplex.entity/retired` markers on each retired row's subject); `group_prepare.clj` (`:triplex/retract` becomes a retraction plus a retirement marker; revision ops kept) | Yes: markers and revision | Yes, per member | Falls back; a pin inside a group uses the interior slice, not the short-cut. Gated |
| Native append and its recovery | `commit.clj` `operation-code` (append-only decision at the serial point); recovery finds the stored operation by `:triplex.tx/operation-id` | The append is a general or ordered save; a resend writes nothing | — | Exact. Gated: the resend was refused as already committed and the head did not move |
| Append-retirement option | `subject_save.clj` `render-ops` with `append-retirement?` (`[:db/add owner :triplex.entity/retired …]` instead of the retraction) | Yes: marker and revision | Yes | Falls back. Gated |
| Covering owner head | `owner_layout.clj` `update-code` (`[:db/add owner :triplex.owner/root …]`, `[:db/add owner :triplex.entity/rev final]`) | Yes | Yes | Falls back. Gated |
| Fold of a covered subject (owner head, merged at `3d4320155`) | `owner_layout.clj` `fold-code` and `fold!` (called before the reference writer acts on a covered subject, `storage.clj` `fold-touched!`, and on the subject writer's retry): retracts the root, moves each covered text from its version entity onto the subject (`[:db/add owner :triplex.entity/row text]`), retracts masked texts; `:triplex.owner/folded` goes on the transaction | Yes when the root held texts (the moves); **no** when it held none | **No**: the fold has no logical position and leaves the revision unchanged | With moves: falls back, exact. Without moves: answers from current and stays exact, because the fold changes no logical row (the masked texts were already excluded by the root's mask at the pin, and an empty root added nothing). **A fold after the pin cannot make the short-cut wrong.** Gated (add-only saves on covered subjects, which fold first) |
| Fair import frames | `write_policy.clj` (`writeClass` "import" schedules frames); frames are general or ordered saves | Yes | Yes | Falls back. Gated (one frame across two subjects) |
| Removal on request | `erase.clj` `apply-native!` writes only a transaction journal entity (with its own revision) and the claim; nothing on the subject. Values are masked at read time by `privacy/masked` against the erasure cut | No | No | Exact: the subject's stored rows do not change, and the same masking applies to rows from either database. Gated (second scope, see below) |
| Removal body cleanup | `envelope.clj` `erase-keys!`, `shred-published!`: key files for sealed bodies, outside the database | No database change | — | Exact. Sealed protection not gated |
| Valid-time corrections | An ordinary ordered or general save with new valid-time bounds | Yes | Yes | Falls back. Gated (a row moved from valid-from 0 to the seed valid time) |
| Aging loader | AGE1 `native.clj` `render` (`[:db/add owner-ref :triplex.entity/rev position]`, row adds and retractions), `grouped-render` (adds retirement markers, retracts the prior revision) | Yes | Yes | Falls back. Gated (the toy is aged by this code at its load pin `5cda4ab20`) |
| Excision | Not used by any product writer here (only a feed test) | — | — | Would remove datoms from every view alike |

**No writer needed a fix.** Every save asserts on each subject it changes; the one transaction that only retracts, a fold without moves, leaves logical rows unchanged.

## Gates (Mac, timings diagnostic)

**Unit tests** (`gateway/pinned_test.clj`, 4 tests, 14 assertions, all pass): an unchanged subject is answered from the current database; a subject saved after the pin, a revision above the pin, a row added without a revision, and a subject without a revision all fall back; the option off and a current view never short-cut; `group-cut/member-at` equals the as-of view's own lookup for every position from 0 to 1,299 with 1,194 group positions added after the pin.

**Live gate on a loader-aged toy** (`rd1/shortcut-gate/`: `gate.sh`, `container.sh`, `gate.ts`; one heavy token, one lab container, about 12 minutes; evidence `evidence/DX-RD1/rd2-shortcut-gate-07.tar.gz`, SHA-256 `0d5dff52c9087d3703af53e7ec573cfc685d816772d3b8c20e86a4161cad42fa`):

1. **Seed and age.** PREP1's SCALE1-shaped toy (ten accounts, 50 subjects, three first-task fields, loader command at cut 61) through this branch's gateway, then 300 saves by AGE1's own code at its load pin `5cda4ab20` (`prep1/aged-live/aged_live.clj`, unchanged).
2. **Every writer in turn,** each phase restarting the gateway with that writer's options, 17 saves (18 subject writes) at positions 362 to 378: per-person ordered (an AGE1-edited and an untouched subject), a resend of a committed save (refused as already committed; the head did not move), a valid-time correction (a row moved from valid-from 0 to the seed valid time), the general writer, an import frame across two subjects, four concurrent saves with grouped commit on, append retirement, the covering owner head on three saves, add-only saves on two covered subjects (folded first by the reference writer), and one more ordered save.
3. **Removal on request in a second scope.** AGE1's code at its load pin refuses to save into a scope with declared protection (`TRIPLEX_ERASURE_FRONTIER`), and protection must be declared before a scope's first save, so the removal ran in a second scope on the same server: 24 seed saves, two protected values, the pin at 26, an ordered save, the removal of one protected value, and one more save (head 29).
4. **Three readers side by side:** both options off (the reference), both on, and the cut lookup alone. **For every logical position from 1 to the head (378 and 29), every subject (1,021 in the aged scope: 500 tasks, 520 roots and the loader marker; 12 in the removal scope), both valid times (1 and the seed valid time plus 1), and every distinct record clock of any subject's row (378 and 28), the `/read` answers were compared, plus historical worlds (reach) for every task subject in batches of 16 at every fifth position: 7,088 reference answers, each compared with both treatment readers (14,176 comparisons, 10,653,258 rows): 0 differences.** The on reader answered 1,369,411 subject reads from the current database and 201,481 through as-of; the off reader none.
5. **The launcher's ladder module** in its toy size against the off and on readers: 0 wrong values and 0 errors at the seed cut and near the head; it refused a reader whose options differ from the arm's.

**Not covered by the gates:** concurrent saves on one subject; sealed protection; whether the four concurrent saves formed one physical group (the comparison covered every position either way); a native count of the folds; the 1 billion database.

## Launcher: the short pinned ladder on the 1 billion database

**What runs.** `v01/study-server.ts` with `DX_RD2_PINNED_PAIR=1`: the same prepared aged arms as the retirement and owner-head pairs (a new physical copy of the held stopped cluster per arm, no dump, the aged bundle's fresh-peer check on the stack's own network, the `server` profile with one reader core and Datomic's default reader cache). Arm `off` runs both options off; arm `on` runs both on (`DX_PINNED_SHORTCUT` and `DX_PINNED_CUT_LOOKUP`, which `stack/up.sh` passes to both gateways as `TX2_PINNED_SHORTCUT` and `TX2_PINNED_CUT_LOOKUP`). Each arm runs `rd1/pinned-ladder.ts`: the card's own read (`client.rows`, one subject's field 0, one exchange per read) at the old pin 87,002 and at the head minus 1,000, with 1, 16 and 256 seats, 60 s per step. Every old-pin read is checked against the seed's value; the ladder refuses a reader that does not run the requested options. After arm `on`, `campaign/pinned-comparison.json` puts both arms side by side. The off arm's old-pin rows reproduce the card's ladder; together the two arms give the three cases asked for (near the head; old pin, options off; old pin, options on), plus the near-head pin with the options on.

**Build once (about 5 minutes)** at `dc34aa18d`, as for the owner-head pair:

```bash
COMMIT=dc34aa18d   # exp/DX-RD1-readers; contains origin/exp/DX-INT1 at 3d4320155
BUILD=/var/tmp/triplex-pinned-1b-build
sudo "$(command -v node)" --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/v01/build.ts "$COMMIT" "$BUILD"
cd "$BUILD/repository"
```

**Environment.** The same values as the scorecard and the owner-head pair (`v01/AGED-SERVER-32.md`, `w1/SERVER-OWNER-HEAD.md`).

```bash
export AGE_HANDOFF_JSON=<aged-scorecard.json>   AGE_HANDOFF_SHA256=faab1bc5bca8e6303285101003e5a42fc82c8e99fe2eadacaf125259b575bbf2
export AGED_PGDATA_SOURCE=<the stopped held 1B cluster>   AGE_JAVA=<java 21>   AGE_DATOMIC_HOME=<datomic-pro-1.0.7745>
export SCALE1_IMAGE=<metadata directory>   SCALE1_IMAGE_SHA256=<...>   SCALE1_TRANSFER_SHA256=<...>
export WAL_DIR=<on the other NVMe>
pinned_arm() {  # $1 = off or on, $2 = new scratch copy of AGED_PGDATA_SOURCE, $3 = campaign directory, $4 = deadline in ms
  sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
    "AGE_JAVA=$AGE_JAVA" "AGE_DATOMIC_HOME=$AGE_DATOMIC_HOME" DX_RD2_PINNED_PAIR=1 \
    "DX_RD1_PGDATA_SOURCE=$AGED_PGDATA_SOURCE" "DX_RD1_LADDER=$1" "DX_RD1_PGDATA=$2" \
    ${DX_DRY_RUN_FIRST_OFFER:+DX_DRY_RUN_FIRST_OFFER=1} \
    bash lab/experiments/EXP-DX1/v01/study-server.sh "$COMMIT" "$3" "$4" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" \
    "$SCALE1_TRANSFER_SHA256" 1B per-person-ordered j21-g1 "$AGE_HANDOFF_JSON" "$AGE_HANDOFF_SHA256" "" "" \
    j25-zgc "$WAL_DIR" j21-g1 rolling6
}
```

**Timed run (28 to 33 minutes; ceiling 45).**

```bash
OUT=/var/tmp/triplex-pinned-1b; mkdir "$OUT"     # new
DEADLINE=$(( $(date +%s%3N) + 50 * 60 * 1000 ))
pinned_arm off "$COPY_1" "$OUT/pair" "$DEADLINE"   # 11–14 min
# remove COPY_1, make COPY_2 (about 2–3 min)
pinned_arm on "$COPY_2" "$OUT/pair" "$DEADLINE"    # 11–14 min; writes OUT/pair/pinned-comparison.json
```

Per arm: stack start on the copy and the aged fresh-peer check 4–6 min (as for the scorecard parts); six 60 s steps 6 min; cleanup 1–2 min. A dry run to the first offer works as for the owner-head pair (`DX_DRY_RUN_FIRST_OFFER=1`, one arm on its own new copy, about 8 minutes); it prints `DX-DRY-RUN first offer reached: pinned off` (or `on`). If an arm stops before its first read, its records are set aside and the same `pinned_arm` line can be run again on a new copy with the same `OUT/pair`.

**Predictions, written before the run.** Reads/s and p50 per step, one reader core. Sources: the card's ladder (old pin, 18.12/s and 44.80 ms at one seat), the probe (old pin 31.86 ms, near head 1.26 ms, current 0.20 ms inside the peer), the fresh card's head-pinned ladder (606/s and 1.18 ms at one seat over HTTP).

| Pin, options | 1 seat | 16 seats | 256 seats |
| --- | --- | --- | --- |
| Old pin 87,002, off | 17–23/s, p50 40–55 ms | 17–23/s, p50 0.7–0.95 s | 17–22/s, p50 11–15 s, no errors |
| Head − 1,000, off | 300–600/s, p50 1.5–3 ms | 400–900/s | 400–1,000/s |
| Old pin 87,002, on | 400–700/s, p50 1.2–2.5 ms | 500–1,200/s | 500–1,200/s |
| Head − 1,000, on | 400–700/s, p50 1.2–2.5 ms | 500–1,200/s | 500–1,200/s |

Short-cut share in arm `on` at the old pin: 95–99% of reads answered from the current database (584 of 600 in the probe). Wrong values and errors: 0 in every step.

**Falsifier.** Arm `on` at the old pin below 100 reads/s at one seat means the walk is not the whole cost or the option did not act (check `shortcut` counts in the step records and `pinnedCutLookup` in the write options). Any wrong value, or a gate difference, means an option is not exact and must not merge. Arm `off` near the head below 150/s at one seat would mean the HTTP route pays a cost the probe did not see.

**Gated on the Mac, not on a server.** `rd1/pinned-ladder.ts` ran in its toy size against live readers with both options off and on, and refused a reader with the wrong options (`shortcut-gate/gate.ts`). The `study-server.ts` pinned-pair path itself (stack start from a prepared copy, aged admission, sealed ladder evidence) needs bare metal and has not run; the dry run to the first offer is its admission check.

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

## The probe run on the 1 billion database (ran 20:12 UTC; results in the answer above)

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

- **The options' effect at 1 billion.** The cut lookup's gain is inferred from the probe's profile and the near-head pin; the short-cut's from the probe's short-cut arm, which read at the head and so never paid the walk. The launcher measures both together in arm `on`; it does not separate them (two arms fit the 30-minute slot, three do not). The Mac gate separates them for exactness only.
- **How many group positions the aged database holds after the pin** (about a million is an estimate), and how many a product database accumulates; the walk returns for any route that resolves an absent group position on an as-of view without the current database (none found besides `read-rows`; `storage.clj` `assert-subject-route!` does it only for the position-retired route).
- **The launcher's own path** (`study-server.ts` with `DX_RD2_PINNED_PAIR=1`): syntax-checked and built from the gated pieces, but bare-metal only; its first execution will be the server dry run.
- **Sealed protection** (envelopes and key shredding) and concurrent saves on one subject were not part of the gate.
- **The fold census.** The gate runs add-only saves on covered subjects, which the owner-head gate showed are folded first; this gate does not count the folds natively.
- Whether an organically grown 1 billion database behaves like AGE1's bulk-aged one (the cause now depends on grouped-save positions, which the scorecard's per-person ordered writer does not create).
