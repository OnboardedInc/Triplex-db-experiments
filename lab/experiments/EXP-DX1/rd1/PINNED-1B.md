# Pinned reads at 1 billion records: why they are forty times slower

**Status, 2026-11-23 evening: cause located by the 1 billion probe; two default-off options built and gated on the Mac; the 1 billion pair ran and fixed the old pin (19.4 → 468–479 reads/s, 0 wrong values); the tuned-reader arm (three reader cores, batches of eight, both options) ran at 12,376 reads/s and p99 72 ms at 256 seats near the head with no saves, explained below from its step records; an arm with the fixed save load running (DX-RD3) is published with its predictions.** Sources: the code at the scorecard commit `6770c37ba`, the fresh card's evidence and the 1 billion part 1 and 2 evidence (`score-1b-c-part1-2.tar.gz`, SHA-256 `e31c4adc…6056b`: the reader's request trace `gw-r.jsonl` with one cgroup CPU sample per second, its GC log and its JVM flags). Times from the Mac are diagnostic only. Sections marked *open* wait for tonight's run.

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

**What runs.** `v01/study-server.ts` with `DX_RD2_PINNED_PAIR=1`: the same prepared aged arms as the retirement and owner-head pairs (a new physical copy of the held stopped cluster per arm, no dump, the aged bundle's fresh-peer check on the stack's own network, the `server` profile with one reader core and its 1.5 GiB read cache). Arm `off` runs both options off; arm `on` runs both on (`DX_PINNED_SHORTCUT` and `DX_PINNED_CUT_LOOKUP`, which `stack/up.sh` passes to both gateways as `TX2_PINNED_SHORTCUT` and `TX2_PINNED_CUT_LOOKUP`). Each arm runs `rd1/pinned-ladder.ts`: the card's own read (`client.rows`, one subject's field 0, one exchange per read) at the old pin 87,002 and at the head minus 1,000, with 1, 16 and 256 seats, 60 s per step. Every old-pin read is checked against the seed's value; the ladder refuses a reader that does not run the requested options. After arm `on`, `campaign/pinned-comparison.json` puts both arms side by side. The off arm's old-pin rows reproduce the card's ladder; together the two arms give the three cases asked for (near the head; old pin, options off; old pin, options on), plus the near-head pin with the options on.

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

## The pair run on the 1 billion database (ran this afternoon)

Arms `off` and `on` at `dc34aa18d`, one reader core (cpu 6, 3 GiB heap, 1.5 GiB read cache), the head at 28,309,866. Reads/s, p50 and p99 per 60 s step; 0 wrong values and 0 errors in all twelve steps.

| Pin, options | 1 seat | 16 seats | 256 seats |
| --- | --- | --- | --- |
| Old pin 87,002, off | 19.4/s, 41.7 / 103.9 ms | 19.5/s, 782 / 1,171 ms | 20.2/s, 12,583 / 13,500 ms |
| Head − 1,000, off | 409.0/s, 1.53 / 13.6 ms | 310.0/s, 42.2 / 118.8 ms | 283.2/s, 852 / 1,237 ms |
| Old pin 87,002, on | 467.9/s, 1.37 / 14.3 ms | 478.9/s, 27.1 / 101.4 ms | 478.8/s, 516 / 881 ms |
| Head − 1,000, on | 770.7/s, 1.06 / 3.8 ms | 613.0/s, 23.4 / 79.9 ms | 534.7/s, 465 / 786 ms |

At the old pin, arm `on` answered 97.9 to 99.5% of subjects from the current database (27,513 of 28,076 at one seat; 28,838 of 28,984 at 256). Near the head it answered all of them from the current database. The forecast held in every cell.

## Why near-head reads fall with more seats

**The question.** With the options off, near-head reads fall from 409 to 283 reads/s as seats go from 1 to 256. Is that the single permit, the collector, or something the options avoid?

**Short answer: neither arm holds better in proportion.** Both lose the same share: off 409 → 283 (−31%), on 771 → 535 (−31%). The options halve the CPU each read costs, so the absolute loss is smaller (−126/s against −226/s), but the cause of the fall is shared.

**What rises is CPU per read, not waiting.** Each step's reader CPU comes from the cgroup counter (one sample per second) and its GC pauses from the reader's GC log:

| Near-head step | Reads/s | Reader CPU (cores) | CPU per read | GC pause share of wall time | Allocation per read | Young GC cost per MB freed |
| --- | --- | --- | --- | --- | --- | --- |
| off, 1 seat | 409 | 0.85 | 2.08 ms | 0.13 | 1.9 MB | 0.14–0.19 ms |
| off, 16 seats | 310 | 0.86 | 2.77 ms | 0.17 | 2.6 MB | 0.20–0.21 ms |
| off, 256 seats | 283 | 0.95 | 3.36 ms | 0.19 | 3.1 MB | 0.20–0.23 ms |
| on, 1 seat | 771 | 0.87 | 1.13 ms | 0.04 | 1.65 MB | 0.03 ms |
| on, 16 seats | 613 | 0.93 | 1.52 ms | 0.06 | 2.15 MB | 0.04–0.08 ms |
| on, 256 seats | 535 | 0.95 | 1.79 ms | 0.07 | 2.4 MB | 0.05–0.06 ms |

1. **The single permit only orders the work; it adds no CPU.** With one core and one permit, throughput is one divided by the CPU per read once the core is busy. The permit explains why the rate stops rising, not why it falls. At 16 seats the core is still 14% idle in the off arm and 7% in the on arm while requests wait, which is the permit's hand-over gap between one request and the next.
2. **The collector explains about a third of the rise in the off arm.** GC pause time per read goes from 0.32 ms to 0.67 ms (+0.35 of the +1.28 ms). In the on arm it goes from 0.05 to 0.14 ms (+0.09 of +0.66 ms).
3. **The rest is per-request work that grows with the number of requests in flight.** Allocation per read rises by 60% in the off arm and 45% in the on arm. One known part: the request trace writes a full record for every request slower than 50 ms. At one seat that is about 2.5 records/s; at 256 seats every request is written (about 280/s off, 530/s on). The Jetty threads waiting for the permit add scheduling on the same core. The size of each part is not measured.
4. **What the options avoid is the as-of view's collector cost.** The off arm's young collections cost 0.14–0.23 ms per MB freed; the on arm's 0.03–0.08 ms. Cheap young collections mean little survives; the as-of view keeps more objects alive across a collection. Which objects survive (history segments entering the cache, or the view's merge iterators) is not established. The probe saw the same direction inside the peer: 1.0 MB per near-head as-of read against 0.3 MB per current read.

**What this means for capacity.** Spreading the same requests over more cores does not remove the per-request growth, but it removes the queue of hundreds of requests on one core, which is where most of the growth appears. That is what the tuned arm tests.

## Tuned arm: three reader cores, batches of eight, both options on

**What runs.** `v01/study-server.ts` with `DX_RD2_PINNED_TUNED=1` and ladder `pinned-tuned`. It is admitted from the held aged copy exactly as the pinned pair is (`DX_RD1_PGDATA_SOURCE`, a new physical copy, no dump, the aged bundle's fresh-peer check on the stack's own network). One arm, one copy:

- **Reader:** the read study's tuned reader, `launchProfile("server", { readTuned: true, readCacheMiB: 3072 })`. Cores 5, 6 and 11; 9 GiB container, 6 GiB heap, 3 GiB read cache, `ActiveProcessorCount=3`, so three read permits. The writer keeps cores 2, 3 and 4. The transactor keeps its three (0, 7, 8) and PostgreSQL keeps core 1. The driver is pinned to cores 9 and 10 after the stack starts.
- **Read path:** both pinned options on (`DX_PINNED_SHORTCUT=1`, `DX_PINNED_CUT_LOOKUP=1`), the early filter (`DX_RD1_READ_FILTER=1`), and the read profile (`DX_RD1_READ_PROFILE=1`). The runner checks the reader's native settings (cache 3,072 MiB) and its write options (both options on) before the first read.
- **Ladder:** `rd1/pinned-ladder.ts` with 64, 256 and 1,024 seats, 60 s per step, at the old pin 87,002 and at the head minus 1,000. Each seat asks for one subject's field 0. The client sends reads that queue in the same turn together, up to eight subjects per `/read` exchange; each step records the exchanges and the mean batch. Every old-pin value is checked against the seed's value.

**Why a 3 GiB read cache.** The pair's reader had 1.5 GiB in a 3 GiB heap. Its collector ran mixed collections all through the near-head steps, which means old objects were being replaced. At 1,024 seats the ladder reads random subjects across all ten accounts, so the working set is wider than the pair's. 3,072 MiB is the read study's gated tuned profile (6 GiB heap, cache at half the heap). A larger cache needs a larger heap, and that memory would come from the transactor's share. Cache size does not limit CPU-bound reads: the 1 billion probe's repeat reads loaded 0 segments.

**Role caps on the 96 GB machine (89 GiB usable; the launcher keeps 10 GiB for the host).**

| Profile | Transactor | Writer | Reader | PostgreSQL | Sum | With 10 GiB host |
| --- | --- | --- | --- | --- | --- | --- |
| `server`, pair reader (1 core) | 30 GiB | 6 GiB | 5 GiB | 8 GiB | 49 GiB | 59 GiB |
| **`server`, tuned reader (this arm)** | 30 GiB | 6 GiB | 9 GiB | 8 GiB | **53 GiB (54,272 MiB)** | 63 GiB, fits |
| `server-32`, pair reader | 60 GiB | 6 GiB | 5 GiB | 8 GiB | 79 GiB | 89 GiB, fits exactly |
| `server-32`, tuned reader | 60 GiB | 6 GiB | 9 GiB | 8 GiB | 83 GiB | 93 GiB, over by 4 GiB; `launch.mjs` refuses it |

The tuned reader therefore runs with the `server` transactor (16 GiB cache). Combining it with `server-32` would need the transactor's container cut by 4 GiB.

**Command.** Build once at the commit below, as for the pair; the environment and the copy steps are the pair's.

```bash
COMMIT=64c70e549   # exp/DX-RD1-readers; contains origin/exp/DX-INT1 at ad9eafbbe
tuned_arm() {  # $1 = new scratch copy of AGED_PGDATA_SOURCE, $2 = new campaign directory, $3 = deadline in ms
  sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
    "AGE_JAVA=$AGE_JAVA" "AGE_DATOMIC_HOME=$AGE_DATOMIC_HOME" DX_RD2_PINNED_TUNED=1 \
    "DX_RD1_PGDATA_SOURCE=$AGED_PGDATA_SOURCE" DX_RD1_LADDER=pinned-tuned "DX_RD1_PGDATA=$1" \
    ${DX_DRY_RUN_FIRST_OFFER:+DX_DRY_RUN_FIRST_OFFER=1} \
    bash lab/experiments/EXP-DX1/v01/study-server.sh "$COMMIT" "$2" "$3" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" \
    "$SCALE1_TRANSFER_SHA256" 1B per-person-ordered j21-g1 "$AGE_HANDOFF_JSON" "$AGE_HANDOFF_SHA256" "" "" \
    j25-zgc "$WAL_DIR" j21-g1 rolling6
}
OUT=/var/tmp/triplex-pinned-tuned-1b; mkdir "$OUT"     # new
DEADLINE=$(( $(date +%s%3N) + 25 * 60 * 1000 ))
tuned_arm "$COPY_1" "$OUT/tuned" "$DEADLINE"          # 11–14 min; writes OUT/tuned/pinned-tuned/pinned-ladder.json
```

**Duration: 14 to 17 minutes with the copy** (copy 2–3 min; stack start and aged check 4–6 min; six 60 s steps 6 min; cleanup 1–2 min). Ceiling 25 minutes. A dry run to the first offer prints `DX-DRY-RUN first offer reached: pinned tuned`. If time remains, `DX_RD1_LADDER=pinned-tuned-repeat` on a new copy with the same `OUT/tuned` gives a second reading.

**Predictions, written before the run.** Closed loop, no think time, so by Little's law p50 is about seats ÷ reads/s. In the pair, p99 was 1.65 to 1.7 times p50 at 256 seats. Cost model: the pair's on arm spent 1.1 to 1.8 ms of CPU per single-subject exchange, of which the read itself is about 0.2 ms (probe). With eight subjects per exchange the fixed part is shared: about 2.4 to 4.4 ms per exchange, rising 35 to 50% with many exchanges in flight, so 0.4 to 0.8 ms of CPU per subject. Three cores at 0.95 give 3,600 to 7,100 subjects/s before GC on those cores and the batches that do not fill; the ranges below allow for both.

| Seats | Pin | Reads/s (subjects) | p50 | p99 | Mean batch |
| --- | --- | --- | --- | --- | --- |
| 64 | head − 1,000 | 2,500–4,500 | 14–26 ms | 30–70 ms | 7–8 |
| 64 | old pin | 2,300–4,200 | 15–28 ms | 30–75 ms | 7–8 |
| 256 | head − 1,000 | 2,800–4,800 (central 3,800) | 53–90 ms (central 67) | 90–155 ms (central 115) | 7.5–8 |
| 256 | old pin | 2,500–4,400 | 58–100 ms | 100–170 ms | 7.5–8 |
| 1,024 | head − 1,000 | 2,500–4,500 | 230–410 ms | 400–800 ms | 8 |
| 1,024 | old pin | 2,300–4,200 | 245–445 ms | 420–850 ms | 8 |

Old pin 5 to 15% below near head, as in the pair (479 against 535 at 256 seats), from the 1 to 2% of subjects read through the as-of view. Short-cut share at the old pin 97 to 99.5%. Wrong values and errors: 0 in every step.

**Is 256 readers at p99 ≤100 ms reachable with three reader cores? Probably not; narrowly missed at the central estimate.** With no think time, p99 ≤100 ms at 256 seats needs at least 256 ÷ 0.1 s = 2,560 reads/s even with no tail. With the pair's tail (p99 = 1.7 × p50) it needs about 4,350 reads/s. That is inside the predicted range but above its centre. What would reach it, with the same per-subject cost:

| Change | Predicted reads/s at 256 | Predicted p99 | Cost |
| --- | --- | --- | --- |
| Three reader cores, batch 8 (this arm) | 3,800 (2,800–4,800) | 115 ms (90–155) | — |
| Batch 16 instead of 8 | about 4,450 (+15–20%) | about 98 ms | client only; the 16-subject cap already exists in `pinnedFields` |
| Four reader cores | about 5,000 | about 87 ms | the fourth core has to come from the driver (move the client to another machine) or from the writer |
| Five or six reader cores | 6,300–7,600 | 57–69 ms | the driver's two cores, with the client on another machine |
| A second reader gateway, three cores of its own | about 7,600 | about 57 ms | three more cores and 9 GiB (63 + 9 = 72 GiB, fits on `server`); there are no free cores on the 12-core machine |
| Batch 16 and four reader cores | about 5,900 | about 74 ms | both of the above |

The transactor keeps its three cores in every row. On the 12-core machine every core is already assigned (transactor 0, 7, 8; PostgreSQL 1; writer 2, 3, 4; reader 5, 6, 11; driver 9, 10), so any extra reader core means moving the driver off the machine or taking one from the writer.

**Gate for the tuned read path (Mac, toy size, diagnostic times).** The live gate above, rerun with a fourth reader beside the three: both options on, the early filter, the read profile and three read permits (`TX2_READ_FILTER_EARLY=1`, `TX2_READ_PROFILE=1`, `TX2_READ_PERMITS=3`). The comparison gained the ladder's own read shape: field 0 by pattern, which is the only case the early filter acts on, in batches of eight task subjects, at every position from 1 to the head (23,814 more reference answers in the aged scope). Results, evidence `evidence/DX-RD1/rd2-shortcut-gate-09-tuned.tar.gz` (SHA-256 `3a9ca31655b1fe025a94d8ec6091574fd4de78c516bdee6924b979b449fa366d`):

1. **0 differences.** 30,960 reference answers from the reader with both options off, each compared with the on reader, the cut-lookup reader and the tuned reader: 92,880 comparisons, 14,901,208 rows. The tuned reader answered 1,522,752 subject reads from the current database and 235,976 through the as-of view, the same counts as the plain on reader.
2. **The ladder module with batches of eight** against the tuned reader, at the seed cut and near the head, 4 and 16 seats: 0 wrong values and 0 errors. Mean batch 4 at 4 seats and 8 at 16 seats, so batches form as designed.
3. **The first attempt failed with no difference found.** Run 08 (5 GiB container) stopped 20 minutes into the comparison with one `socket hang up` from a reader. That run did not record which reader or why. Run 09 added a watch on every reader process, the container's memory, and the reader and position named in any transport failure. With 6 GiB it ran to the end: no process exited, no memory kill, peak 2.1 GiB. Another builder's stack was running in the same lab VM during run 08. The cause of that hang-up is not known. Evidence: `rd2-shortcut-gate-08-hangup.tar.gz` (SHA-256 `dd18729512a32207fdd52ef81b813544d056a5de2dd20e03b7d7fa67082d2774`).

**Falsifiers.**

- **The capacity model is wrong** if near-head goodput at 256 seats is below 1,500/s or above 6,000/s.
- **Batching did not form** if the mean batch is below 6 at 256 seats; then the gain cannot be assigned to batching.
- **Something other than reader CPU limits the arm** if the reader cgroup stays below 2.0 cores at 256 seats while goodput is below 2,800/s. Look at the driver (cores 9 and 10) and the permit waits in `gw-r.jsonl`.
- **An option is not exact** if any read returns a wrong value or the gate below shows a difference; then it must not merge.

## The tuned arm's result, read from its step records

The tuned arm ran at 23:03–23:10 UTC on 2026-11-23 (`64c70e549`; evidence `evidence/DX-SCALE1/pinned-tuned-1b/pinned-tuned-1b.tar.gz`, SHA-256 `8beca2bc…301ac0`). Zero wrong values and zero errors in all six steps; mean batch 8.0 in every step.

| Step | Reads/s | p50 / p99 ms | Exchanges/s | Reader CPU (cores) | CPU per exchange | CPU per subject | Allocation per subject | GC pause share | Segment loads per subject | Object cache hit rate |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Old pin, 64 | 3,690 | 13.25 / 73.22 | 461 | 1.83 | 3.98 ms | 0.50 ms | 0.49 MB | 12.8% | 0.31 | 0.897 |
| Old pin, 256 | 10,599 | 20.10 / 83.46 | 1,325 | 2.01 | 1.52 ms | 0.19 ms | 0.23 MB | 9.7% | 0.10 | 0.957 |
| Old pin, 1,024 | 1,213 | 823 / 1,122 | 154 | 2.27 | 14.8 ms | 1.87 ms | 1.98 MB | 20.6% | 1.78 | 0.867 |
| Near head, 64 | 5,467 | 9.60 / 63.23 | 683 | 1.95 | 2.85 ms | 0.36 ms | 0.40 MB | 14.4% | 0.33 | 0.906 |
| Near head, 256 | **12,376** | **18.43 / 72.19** | 1,548 | **1.99** | **1.29 ms** | **0.16 ms** | 0.21 MB | 9.5% | 0.086 | 0.964 |
| Near head, 1,024 | 1,482 | 668 / 987 | 187 | 2.23 | 11.9 ms | 1.51 ms | 1.62 MB | 19.7% | 1.43 | 0.884 |

Sources: the ladder record (`pinned-ladder.json`); the reader's cgroup CPU, one sample per second (`gw-r.jsonl`, 388 runtime samples); its GC log (`gw-r-gc.log`, pauses and MB freed per 60 s step); Datomic's metrics callback, one record per minute (`StorageGetMsec`, `DeserializeMsec`, `ObjectCache`, `ObjectCacheCount`). The metrics minutes start about 10 s before each step, so the last two columns are within about 15% of the step's own values; the near-head 64-seat minute includes about 10 s of the old-pin 1,024-seat step.

### Why 256 seats gave 12,376 reads/s when the model said 3,800

The model said 0.4 to 0.8 ms of reader CPU per subject (2.4 to 4.4 ms per exchange of eight, rising 35 to 50% with many exchanges in flight) on three busy cores. Measured: **1.29 ms per exchange of eight, 0.16 ms per subject, on 2.0 of the 3 cores.** The model was wrong in three places, and the reader never became the limit:

1. **The base it scaled from carried one overloaded core's costs.** The model started from the pair's 1.1 to 1.8 ms per single-subject exchange. At 256 seats on one core and one permit, that figure included a full request-trace record for every request (every request was slower than 50 ms), 256 requests queued on one core, and young collections at 0.05 to 0.06 ms per MB. In the tuned arm the read profile (`DX_RD1_READ_PROFILE=1`) switches the ordinary request trace off for `/read`: `trace/handler` traces a profiled route only when the request carries a sample header, and the ladder sends none. The reader's trace holds 0 request records in all six steps (388 runtime samples and 7 metrics records only). Young collections cost about 0.037 ms per MB freed at 256 seats, and the queue was 32 exchanges against three permits, not 256 requests against one.
2. **Cost per exchange falls with more seats instead of rising.** Near the head it went from 2.85 ms at 64 seats to 1.29 ms at 256. The cause is the ladder's subject sequence, not concurrency: seat *s* reads subject `7919 k mod 100,000` in account `s mod 10` with *k* rising by one per round, so each round brings exactly ten new (account, subject) pairs and every other read repeats a pair that the seat ten places later read ten rounds earlier. New subjects per second are therefore 10 × reads/s ÷ seats: 854/s at 64 seats, 483/s at 256. Each new subject costs about 2.2 segment loads (1,790 loads/s against 854 new subjects/s at 64; 1,067 against 483 at 256), and each load costs 0.57 to 0.72 ms of deserialization (`DeserializeMsec` ÷ loads). At 64 seats deserialization alone used about one core.
3. **It priced every subject at a cold read.** The probe's 0.2 ms per current read was for subjects read once. At 256 seats the ladder reads each of about 29,000 (account, subject) pairs about 25 times in the 60 s step, so 96.4% of object-cache requests hit and the marginal subject in a batch costs about 0.1 ms.

**Corrected model.** Reader CPU ≈ exchanges/s × 0.9 ms (a cache-hot exchange of eight one-field subjects, collector included) + segment loads/s × 0.6 to 0.7 ms. It reproduces 2.0 cores at 256 seats (1,548 × 0.9 + 1,067 × 0.57 = 1.39 + 0.61). At 64 seats it gives 1.6 cores (measured 1.95), and at 1,024 seats 1.7 cores (measured 2.23; collector pauses were 20% of the wall there). **What limited 256 seats is not in the records.** The reader had about 0.7 cores of headroom beyond collector pauses. The driver, which runs 256 seats and 1,548 HTTP exchanges/s in one Node event loop on cores 9 and 10, was not sampled. The new arm records the driver's CPU and event-loop delay per window.

**What this means for P1.** The 12,376 reads/s at 256 seats depends on the ladder re-reading each subject about 25 times a minute. A product reader whose 256 seats each read a different, random subject among the million per account would miss the cache like the 1,024-seat step does: about 1.5 to 1.9 ms of CPU per subject, so 1,300 to 1,800 reads/s on three cores, below the 2,560 reads/s that p99 ≤ 100 ms needs with no think time. The new arm measures this case in its random windows (predictions there, from the same model with wider ranges), and its tape-pin window reads recently saved subjects, the product's pattern after a save.

### What collapses at 1,024 seats

**The object cache, through the ladder's reuse distance.** A pair is re-read ten rounds after its first read. That is 2,560 reads later at 256 seats (about 5,600 segments at 2.2 per subject) and 10,240 reads later at 1,024 seats (about 22,500 segments). The reader's 3 GiB cache held 6,100 to 6,400 segments all through (`ObjectCacheCount`; 3 GiB over about 0.5 MB per decoded segment). So at 1,024 seats nearly every read reloads its segments: 1.43 to 1.78 loads per subject against 0.086 to 0.10 at 256. Deserialization rose to 1.5 to 1.6 cores of the 2.2 used, allocation to 1.6 to 2.0 MB per subject, and collector pauses to 20% of the wall. CPU per subject rose about tenfold, and reads/s fell about eightfold.

The other candidates are ruled out by the records:

| Candidate | Evidence | Verdict |
| --- | --- | --- |
| Permits against queued threads | 1,024 seats ÷ 8 = 128 exchanges in flight, under Jetty's 512 threads. Three permits busy: 2.2 to 2.3 cores used against about 2.4 available outside pauses | The permits are full because each exchange costs 12 to 15 ms, not because waiting threads cost CPU |
| The request trace writing every slow request | 0 request records in `gw-r.jsonl` | Off in this arm |
| Batches no longer filling | Mean batch 8.0 at 1,024 | No |
| Client timeouts | 0 errors; p99 1.0 to 1.1 s against the 35 s client timeout | No |

**What the new arm can show of it:** nothing directly. It runs 256 seats only. Its tape-pin window reads a small hot set of recently saved subjects, the opposite case.

## The pinned arm with saves (DX-RD3): 256 seats with the fixed save load running

**Why.** P1's bar is 256 pinned readers at read p99 ≤ 100 ms with zero wrong values **with the fixed save load running**, and P2's is save p50 ≤ 10 ms and p99 ≤ 50 ms with those 256 readers running. The tuned arm had no saves in its windows.

**What runs.** `v01/study-server.ts` with `DX_RD3_PINNED_SAVES=1` and ladder `pinned-saves`. The admission is the tuned arm's: the held aged copy, no dump, the aged bundle's fresh-peer check on the stack's own network, the `server` profile, and the tuned reader exactly as measured (cores 5, 6 and 11; 3 GiB cache; three permits; both pinned options; the early filter; the read profile; batches of eight). The write gateway also reports storage reads per commit (`DX_V01_COMMIT_READS=1`, as the card sets for a production tape). There is one stack. Each window's first cut is the previous window's terminal, and every window is 90 s:

| Window | Saves (the card's own cell code, `adoptedArm`) | Reads (256 seats, `rd1/pinned-ladder.ts` `pinnedWindow`) |
| --- | --- | --- |
| `s-alone` | The card's 394 loaded cell on the production-shaped tape, shape S: 2,086 neighbour commits (23.2/s, one per subject's save, 850 subjects, 6 facts median, up to 115), plus the quiet account's 315 saves (3.5/s) | None |
| `s-near-head` | Same tape, relabelled so it writes new values | Head − 1,000 at the window's first cut, batches of eight |
| `s-seed-cut` | Same | The old pin 87,002, batches of eight, every value checked against the seed's |
| `s-tape` | Same | Each seat reads a subject this window's tape offered 0.2 to 20 s earlier, pinned at the position of that subject's last acknowledged save. Every field the sender recorded must come back with the same row ID, value and position, and a production subject must return no other field. One subject per exchange |
| `ref-random-near-head` | The unloaded 394 cell: the quiet account's 3.5 saves/s alone, the reference rate of the card's P1 line (the same stream generator, not byte-identical to that line's tape) | Each read takes an account and a subject **uniformly at random from all ten accounts × 100,000 subjects** (the whole population the reader serves), pinned at head − 1,000, batches of eight; the attribute, subject and pin bound checked as near-head reads |
| `s-random-near-head` | Shape S, as above | As `ref-random-near-head` |
| `ref-random-seed-cut` | Quiet stream | Random subjects at the old pin 87,002, every value checked against the seed's (the seed gives one for every subject) |
| `ref-near-head`, `ref-seed-cut`, `ref-tape` | Quiet stream | The re-reading ladder pins as in the S windows |

The S windows keep all of the card's checks on every commit: the predecessor check over every field the tape writes (AGE1's rows byte-exact against its replay tape), the journal and identity check per commit, the writer-path rule, the operation and claim check on every hundredth save, and the read-back of every written field at the terminal cut. The quiet account's own P6 reads (`readCell`, 64 seats) run in every window as in the card.

**Windows after the four S windows are isolated** (added 2026-11-23 evening at the orchestrator's request). Each runs only if its time plus two minutes of cleanup remains (4.5 minutes for a quiet-stream window, 5.5 for `s-random-near-head`). A fault in one is recorded in the summary as `failed` and skips the windows after it, without failing the arm or its seal, and its wrong values are recorded and printed, not thrown. The four S windows keep their published behaviour: a fault or a wrong value there fails the arm. The random windows and the trailing `ref-` ladder windows also send a read-profile header on every 16th exchange (every 128th for the ladder windows). The reader then traces those exchanges' Datomic io-stats and handler CPU. After each window the driver reads, from the reader's trace file, the sampled exchanges' summed io-stats (storage reads, object-cache hits) and handler CPU, and the once-a-minute Datomic metrics records that overlap the window, with the seconds of overlap (storage loads, decode milliseconds, object-cache requests and hits).

**Recorded per window** (`pinned-saves/pinned-saves.json`; each window's full `arm.json` and `operations.json` beside it):

- **Reads:** reads/s; p50 and p99; mean batch; the short-cut's current and as-of answers (the counter is process-wide); wrong values; errors.
- **Saves:** offered, receipts and latency (all commits); for S, the card's production metrics: stored against offered per commit and per row, expired, commit p50/p99 whole and second half, save completion, reads per commit, per-writer split; the quiet commits' p50/p99 and P6 reads.
- **Resources:** cgroup CPU in cores and memory at the window's end for the reader, writer, transactor and PostgreSQL; the driver's CPU and event-loop delay.
- **Tape pins:** subjects read, rows checked, skips for subjects not yet saved, and time from offer to read.

### Command (as the server driver; environment and copy steps exactly as the tuned arm)

```bash
COMMIT=<the commit that publishes this section>   # exp/DX-RD1-readers; contains origin/exp/DX-INT1 at 61a794c1d
BUILD=/var/tmp/triplex-pinned-saves-1b-build
sudo "$(command -v node)" --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/v01/build.ts "$COMMIT" "$BUILD"
cd "$BUILD/repository"
saves_arm() {  # $1 = new scratch copy of AGED_PGDATA_SOURCE, $2 = new campaign directory, $3 = deadline in ms
  sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
    "AGE_JAVA=$AGE_JAVA" "AGE_DATOMIC_HOME=$AGE_DATOMIC_HOME" DX_RD3_PINNED_SAVES=1 DX_W1_SERIAL_APPLY=0 PREP1_LOOKUP_EVERY=0 \
    "DX_RD1_PGDATA_SOURCE=$AGED_PGDATA_SOURCE" DX_RD1_LADDER=pinned-saves "DX_RD1_PGDATA=$1" \
    ${DX_DRY_RUN_FIRST_OFFER:+DX_DRY_RUN_FIRST_OFFER=1} \
    bash lab/experiments/EXP-DX1/v01/study-server.sh "$COMMIT" "$2" "$3" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" \
    "$SCALE1_TRANSFER_SHA256" 1B per-person-ordered j21-g1 "$AGE_HANDOFF_JSON" "$AGE_HANDOFF_SHA256" "" "" \
    j25-zgc "$WAL_DIR" j21-g1 rolling6
}
OUT=/var/tmp/triplex-pinned-saves-1b; mkdir "$OUT"     # new
# make COPY_1 (a new physical copy of the held stopped cluster, as for the tuned arm), then:
DEADLINE=$(( $(date +%s%3N) + 34 * 60 * 1000 ))
saves_arm "$COPY_1" "$OUT/saves" "$DEADLINE"          # writes OUT/saves/pinned-saves/pinned-saves.json
```

**Duration: 22 to 31 minutes for the four S windows and the two random near-head windows; ceiling 34 (deadline 34 minutes after launch, raised from 30 for the random windows).** Estimates:

| Step | Minutes |
| --- | ---: |
| Copy | 2–3 |
| Stack start and aged check | 4–6 |
| Each S window: predecessors for 850 subjects (14 reads of 64), 90 s of saves and reads, then resolution, journal, identity, claim checks and read-back | 2.5–3.5 (×4: 10–14) |
| Cleanup | 1–2 |

That makes 17 to 25 minutes for the S windows. Then `ref-random-near-head` (about 2 minutes) and `s-random-near-head` (about 3.5), so 22 to 31 minutes. `ref-random-seed-cut` and the three re-reading `ref-` windows (about 2 minutes each) follow only while their time plus cleanup remains, so the arm stops by the 34-minute ceiling either way. If the S windows run long, the reference windows are skipped and the summary says so. A dry run to the first offer prints `DX-DRY-RUN first offer reached: pinned pinned-saves` (about 8 minutes on its own copy). An arm stopped before its first save is set aside, and the same line can be rerun on a new copy with the same `OUT/saves`.

### Predictions, written before the run

Corrected model above. Closed loop, no think time. Additions for the save load:

- The reader ingests about 27 commits/s of novelty and serves the quiet account's P6 reads.
- PostgreSQL's one core serves both peers' segment reads.
- The driver's event loop carries the save sender beside the 256 seats.
- The transactor indexes at 256 MB of novelty, so at most one index adoption is likely across the S windows.

| Window | Reads/s (central) | Read p50 | Read p99 (central) | Current share | Reader CPU |
| --- | --- | --- | --- | --- | --- |
| `s-near-head` | 9,500–12,500 (11,000) | 19–27 ms | 70–120 ms (88) | ≥ 99.5% | 1.9–2.6 |
| `s-seed-cut` | 8,000–10,800 (9,500) | 22–32 ms | 80–130 ms (98) | 97–98.5% | 1.9–2.6 |
| `s-tape` | 800–2,600 (1,500) | 100–320 ms (170) | 160–600 ms (300) | 85–98% (a read goes to the as-of view when the subject's next save commits between the pin's choice and the read; 990 of the 2,086 commits re-save a subject within 20 s, and commits take tens of ms to seconds at 1 billion) | 2.0–2.7 |
| `ref-near-head` | 11,000–12,800 | 18–24 ms | 65–95 ms | 100% | 1.9–2.3 |
| `ref-seed-cut` | 9,500–11,000 | 20–28 ms | 75–100 ms | 97.5–98.5% | 1.9–2.3 |
| `ref-tape` | 1,200–2,800 (1,900) | 90–210 ms | 140–400 ms | 90–100% | 2.0–2.7 |

**Random subjects (the product's cache-cold case), from the corrected model.** A read of a random subject among 1,000,000 almost never finds its leaf segments in a 3 GiB cache. That cache holds about 6,200 decoded segments (about 0.5 MB each). The working set is the leaves of a million subjects at 1.4 to 2.2 distinct segments each, so 1.4 to 2.2 million segments, about 0.7 to 1.1 TB decoded. So each subject costs its loads: 1.4 to 2.2 loads (the tuned arm measured 1.43 and 1.78 when its reuse distance exceeded the cache, and about 2.2 for a subject's first read). Each load costs 0.6 to 0.9 ms of reader CPU including its collection, plus about 0.11 ms of the exchange's fixed cost. That is **1.0 to 2.1 ms per subject (central 1.5)**, on the 2.2 to 2.4 cores left outside collector pauses (the 1,024-seat steps used 2.23 to 2.27).

| Window | Reads/s (central) | p50 | p99 (central) | Storage loads per subject | Object-cache hit share (by request, branches included) | Decode CPU | Sampled storage reads per exchange of 8 | Current share |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ref-random-near-head` | 900–2,200 (1,400) | 115–285 ms (183) | 170–450 ms (270) | 1.3–2.3 | 0.78–0.90 | 1.2–2.0 cores | 10–18 | ≥ 99.9% |
| `s-random-near-head` | 850–2,100 (1,350) | 120–300 ms (190) | 180–480 ms (280) | 1.3–2.3 | 0.78–0.90 | 1.2–2.0 cores | 10–18 | ≥ 99.5% |
| `ref-random-seed-cut` | 800–2,000 (1,250) | 130–320 ms (205) | 190–500 ms (300) | 1.4–2.6 | 0.76–0.90 | 1.2–2.1 cores | 11–21 | 97–98.5% |

Mean batch 7.5–8; wrong values and errors 0.

**The 100 ms p99 bar at 256 seats is not met for random subjects** in any of the three; the model's central p99 is 270 to 300 ms.

**What the model says would meet it, so the server result can confirm or refute the sizing.**
- **The rate needed.** With no think time and p99 about 1.4 × p50 (the cache-miss steps showed 1.36 to 1.48), p99 ≤ 100 ms needs p50 ≤ 71 ms, so **about 3,600 reads/s** at 256 seats.
- **Cores.** At 1.5 ms per subject (1.0 to 2.1) that is 5.4 busy cores (3.6 to 7.6), so **about 7 reader cores (5 to 10)** at the 0.75 to 0.8 of a core each one gives outside collector pauses. On the 12-core machine that means a second reader with its own cores, or the reader on its own machine, beyond the three cores the tuned reader has.
- **Cache.** **No affordable cache size meets it.** A cache covering the working set would need 0.7 to 1.1 TB. A partial cache's hit share on leaves is about its share of the working set: 3 GiB gives under 0.5%, 12 GiB under 2%, which saves almost nothing.
- **What else would.** Fewer loads per subject (a subject's rows in fewer segments, as the covering owner head does for writes) or cheaper decoding.

**What would refute this sizing:**
1. Random reads at or above 2,800 reads/s on three cores, or storage loads per subject at or below 0.5. Then subjects share segments far more than modelled, the working set is much smaller, and a larger cache (12 to 24 GiB) could meet the bar. The next run would then be the same window with a 12 GiB reader cache.
2. Loads per subject within the predicted range but reader CPU per subject under 0.8 ms. Then decoding is cheaper than the 0.6 to 0.9 ms per load, and fewer extra cores are needed: 3,600 × CPU per subject ÷ 0.78 cores.
3. Reads/s well below the range (under 900) while the reader uses under 1.8 cores. Then storage latency (PostgreSQL's one core, or disk reads beyond its 8 GiB page cache) limits it, not reader CPU. The fix would then be storage-side, and the metrics minutes' `StorageGetMsec` will show it.

**Tape pins are one subject per exchange, read whole:** 1.3 to 2.5 ms of reader CPU per exchange (a single-subject exchange near the head cost 1.13 ms in the pair's one-seat step), on 2 to 2.7 cores. Wrong values and errors: 0 in every window.

**Saves.** Commit latency is measured from the scheduled offer to the acknowledgement in the driver.

| Window | Stored commits/s (offered 26.7: 23.2 S + 3.5 quiet) | Expired | S commit p50 | S commit p99 | Quiet commit p50 / p99 | Reads per commit |
| --- | --- | --- | --- | --- | --- | --- |
| `s-alone` | 25.5–26.7 | 0–100 | 25–120 ms | 0.25–3 s | 6–12 / 20–60 ms | 0.5–5 |
| `s-near-head`, `s-seed-cut`, `s-tape` | 25–26.7 | 0–150 | +0–25% over `s-alone` | +0–40% over `s-alone` | +0–30% over `s-alone` | Same as `s-alone` |
| `ref-*` (3.5/s quiet only) | 3.5 | 0 | — | — | 5–10 / 15–45 ms | — |

**P2's bar** (save p50 ≤ 10 ms, p99 ≤ 50 ms with 256 readers): **missed by the S commits**, whose median is a 6-fact save and two thirds of which take the general writer; **for the quiet account's 3.5/s, p50 ≤ 10 ms is likely met in every window (6–12 ms predicted), and p99 ≤ 50 ms is likely met in the `ref-` windows (15–45 ms) and borderline in the S windows (20–60 ms, plus up to 30% with readers).** For the reference tape alone, the current `server-32` card's part 1 at 1 billion (no readers) measured 6.18 / 21.38 ms.

**P1's bar** (read p99 ≤ 100 ms at 256 seats with saves): **met for the ladder's batched pins near the head and at the old pin** (central 88 and 98 ms; the old pin is the one at risk); **missed for pins at the tape's own positions** (central p99 300 ms), because those reads cannot share an exchange.

### What would show each prediction wrong

1. **Saves cost the reader capacity:** `s-near-head` below 9,000 reads/s or p99 above 130 ms while `ref-near-head` (or the tuned arm's 12,376 / 72 ms) holds. Then log ingestion, an index adoption, or PostgreSQL contention costs reads. Look at reader CPU and GC per window, the reader's `StorageGet` counts in `gw-r.jsonl`, and PostgreSQL's CPU.
2. **Readers cost the saves:** the S commit p99 in a read window above 1.5 × `s-alone`'s, or stored commits/s more than 5% below it. Check the driver's event-loop delay first. If its p99 is above 20 ms, the extra save time is at least partly the driver's, not the store's. The histogram includes its 10 ms sampling interval: an idle loop reads about 12 ms.
3. **The tape-pin model is wrong:** `s-tape` above 4,000 reads/s means a whole-subject single exchange costs well under 0.6 ms. Below 500 means something other than reader CPU limits it: reads pinned ahead of the reader waiting for publication (`BasisNotAvailable` in the failures), or the driver.
4. **The corrected model is wrong:** reader CPU per exchange in `ref-near-head` outside 1.0 to 1.6 ms, or the reader below 1.7 cores with the driver below 1.5 cores at 256 seats.
5. **Exactness:** any wrong value or error in any window. In particular, a tape pin that disagrees with the sender's record means a pinned read under concurrent saves on one subject is not exact (the Mac gates never covered concurrent saves on one subject). Then the options must not merge.

### Mac gate (toy size, timings diagnostic)

`rd1/saves-gate/` (`gate.sh`, `gate.ts`; one ordinary heavy token, one lab container, about 3 minutes):

- **The toy and its gateway.** It reuses the production aged toy (v01/production-aged-toy.ts): PREP1's aged-live container, 50 subjects per account with every task-0 field, aged by AGE1's own code at its load pin `5cda4ab20`. The gateway runs both pinned options, three read permits and the early filter.
- **The cells.** The driver runs three shape S production cells through the card's own production code (predecessor check, sender with rolling 6 credits, journal and identity checks, read-back), with `pinnedWindow` running beside them through the same window contract and `tapeCandidates` the server arm uses.
- **What the gate does not cover.** It does not run `adoptedArm`'s new `Alongside` parameter or `study-server.ts` `savesArm`. Both are bare-metal only and type-check clean, and their first execution will be the server run (the dry run stops before the windows).

Results:

**Run 03 passed at `0e5846260`, the code that publishes the random windows.** Evidence: `evidence/DX-RD1/rd3-saves-gate-03.tar.gz`, SHA-256 `079eea33a50118dc19f7c6cffca6ba3761818aefbcf93f8150b2594479b2f468`. Everything in run 02 below held again, and run 03 added three checks:

- **Random pins:** in `S-pins`, beside the three ladder kinds and 37 S commits, `random-near-head` (39,072 reads) and `random-seed-cut` (38,600 reads, every value checked against the seed's) drew subjects from all 10 accounts × 50 toy subjects, in batches of 8, with 0 wrong values and 0 errors. Every 16th exchange carried a read-profile header (305 and 301 sampled).
- **A planted wrong value in a random window:** in `S-planted`, `random-seed-cut` caught 17,496 of 17,488 timed reads, beside seed-cut 17,840 and tape pins 13,014.
- **The reader-record parser** (`readerRecords`) on a synthetic reader trace: it summed the io-stats and handler CPU of exactly the two sampled exchanges named (storage reads 3, cache hits 10, CPU mean 3 ms), skipped the unnamed one, and gave the two overlapping metrics minutes 30 s of overlap each. The toy gateway does not write a reader trace, so the parser has not read a real trace file; on the server it reads the reader's `gw-r.jsonl`, whose record shapes are the ones the read study already parsed.

The isolated-window handling in `study-server.ts` (a failed window recorded, later windows skipped, the seal kept) is bare-metal code and type-checks clean, but has not run.

**Run 02 passed at `e4f3aedc7`** (before the random windows). The toy was seeded at cut 61, and AGE1 replayed 300 saves (head 361). Evidence: `evidence/DX-RD1/rd3-saves-gate-02.tar.gz`, SHA-256 `d3333d07a1811a283f83deea66f1005e7ed25536439c3fe4ab0943dab0cf7b98`. Run 01 (`62551ef1…6fa35`) passed the same way, at the code before candidates were limited to the last 20 s.

1. **`S-alone`:** 37 of 37 commits durable. The predecessor check covered 242 seed rows and 69 of AGE1's rows, and the read-back matched 695 fields of 23 subjects.
2. **`S-pins`:** the three pin kinds ran at once, 8 seats each for 25 s, beside 37 S commits (all durable; read-back 695 fields), with **0 wrong values and 0 errors**:
   - old seed cut 61: 38,728 reads, batch 8, every value checked against the seed's;
   - near the head (393): 38,752 reads, batch 8;
   - tape pins: 31,581 reads of 15 subjects at their own save positions, 995,109 rows checked against the sender's records, one subject per exchange.

   The tape pins read subjects whose next save was in flight, so **pinned reads under concurrent saves on one subject were checked for the first time**. The short-cut answered 95.3% from the current database (one counter for all three).
3. **`S-planted`:** the same reads with one field value changed in each response. Every one was caught:
   - seed cut: 19,480 wrong of 19,472 timed reads (the count includes reads that finished after the window);
   - tape pins: 14,257 wrong of 14,249.

   The near-head pin is not value-checked, as in the tuned arm (AGE1 may have changed field 0 there); it checks the attribute, the subject and that the row is at or before the pin.

### First server execution: a fault before any window, fixed (2026-11-24 01:27 UTC)

**The fault.** Build `9376ece9c` stopped as it entered the window driver, before any window: `ReferenceError: Cannot access 'savesWindows' before initialization` at `savesArm` (`study-server.ts:305`), called from `study-server.ts:204` inside `sealedArm`. The window list was a module-level `const` placed after the runner's top-level loop. That loop awaits the whole arm, so the line declaring the list had not yet run when `savesArm` read it. The dry run stopped at the first offer, before `savesArm`, so it could not show this. The driver removed the stack and copy cleanly.

**The fix.**
- **The window driver moved to its own module.** It is now `v01/saves-arm.ts`. Its window list is that module's own constant, and every call it makes outside the module (the card's cell runner, the read window, the reader-record parser, cgroup counters, the aged cut, the dry-run stop) comes in as a parameter.
- **No other late declaration is left.** `study-server.ts` declares nothing at top level after its loop except hoisted functions (`containerCounters`, `openAged`, `verifyAged`, which the earlier arms already called from the same place).
- **The dry run now enters the window driver.** For this arm it no longer stops at the stack's first offer. It stops inside `savesArm`, after every window's settings are resolved and checked (names, pin kinds, sampling, minutes, cells, labels, folders, the isolated split), the aged cut is built, and every role's cgroup CPU and memory counters and the reader's trace file are read once. It prints `[DX-RD3] windows resolved …` and then `DX-DRY-RUN first offer reached: pinned pinned-saves lab/experiments/EXP-DX1/v01/saves-arm.ts:69`, without sending an offer. A dry-run stop is set aside like the others' (`study-server.ts` now sets aside on `FirstOfferReached` too).

**Mac harness** (`rd1/saves-gate/harness.ts`; runs `savesArm` itself, about 1 minute). Stubs:
- `adoptedArm` checks its arguments (folder, first cut equal to the previous window's terminal, 90 s windows, the tape setting, the label) and invokes the window's alongside run as the card does.
- `pinnedWindow` writes the sampled exchanges' request records and a metrics minute into a reader trace file.
- The cgroup counters and `firstOffer` are stubbed too.

Everything else runs for real: the window loop, the deadline arithmetic, per-window isolation, the driver CPU and event-loop records, `readerRecords` on that trace file, the result file and `sealedArm`. Seven cases passed:

1. **All ten windows inside `sealedArm`.** Each window started at the previous terminal, the eight sampled windows found 2 of 3 sampled exchanges with summed io-stats and one metrics minute, the result file was written, and the seal was called.
2. **An isolated window's read fails** (`s-random-near-head`). It was recorded as `failed`, the four after it were skipped, and the arm returned.
3. **An isolated window's cell fails** (`ref-random-near-head`). The same.
4. **A published window fails** (`s-tape`). The arm failed, no result file was written, and there was no seal.
5. **Wrong values.** In an isolated window they were recorded, not thrown. In a published window they were thrown after the result file was written.
6. **Deadlines.** With 3.6 minutes left, the four S windows ran and the six isolated ones were skipped. With 3 minutes left, the arm refused the first S window.
7. **The dry run.** With `DX_DRY_RUN_FIRST_OFFER=1`, the real `firstOffer` stopped after resolution, before any window or folder.

**Not run on the Mac:**
- The call site in `study-server.ts` (seven lines that build the context from the stack, the aged bundle and `containerCounters`). The next dry run executes it.
- The real `adoptedArm` cell at full size and the real reader trace. The gates cover their toy forms.

### The saves arm's result (`e02bf4edf`, 2026-11-24 ~02:00 UTC) and the random arm

**Result** (all 10 windows ran, 0 wrong values; evidence `evidence/DX-SCALE1/pinned-saves-1b-e02/`):

| Window | Reads/s | p50 / p99 ms | Saves stored/s | S commit p50 / p99 ms | Quiet p50 / p99 ms | Reader cores |
| --- | ---: | --- | ---: | --- | --- | ---: |
| `s-alone` | — | — | 23.08 | 11.52 / 55.55 | 10.62 / 48.90 | — |
| `s-near-head` | 8,960 | 23.81 / 112.13 | 23.08 | 8.06 / 64.77 | 4.77 / 35.07 | 1.90 |
| `s-seed-cut` | 8,879 | 22.91 / 99.33 | 23.07 | 7.46 / 52.48 | 5.50 / 29.18 | 2.03 |
| `s-tape` | 1,434.5 | 177.15 / 303.10 | 3.16 (the driver offered only 285 commits) | 282.62 / 1,105.92 | 241.66 / 605.54 | 2.59 |
| `ref-random-near-head` | 1,219.6 | 207.87 / 333.82 | quiet only | — | 5.63 / 9.41 | 2.09 |
| `s-random-near-head` | 1,216.6 | 207.87 / 323.58 | 23.07 | 7.90 / 55.81 | 4.19 / 22.53 | 2.14 |
| `ref-random-seed-cut` | 1,085.5 | 231.42 / 342.01 | quiet only | — | 5.98 / 20.73 | 2.14 |
| `ref-near-head` | 10,419.7 | 21.38 / 77.82 | quiet only | — | — | 1.99 |
| `ref-seed-cut` | 8,368.4 | 23.81 / 107.52 | quiet only | — | — | 2.06 |
| `ref-tape` | 3,445.7 | 68.61 / 137.22 | quiet only | — | 133.12 / 228.35 | 2.41 |

**The driver limited `s-tape` and `ref-tape`.** Its event-loop p99 was 169.87 and 89.65 ms, so falsifier 2 fired. In `s-tape` it offered only 285 commits; those two windows are not measurements of the store.

**For random subjects the model's mechanism held:**
- **Loads.** 1.76, 1.69 and 1.85 storage reads per subject from the sampled exchanges (14.10, 13.51 and 14.82 per exchange of 8; predicted 1.3 to 2.3, and 10 to 18 per exchange), against 0.06 to 0.09 for re-read subjects.
- **Rate and cache.** Reads/s inside 900 to 2,200 and cache share by request 0.78 to 0.80. No refuter fired.

**What holds the third core idle: the three permits waiting on storage round trips.** From the sampled exchanges of `ref-random-near-head` (859 sampled; Datomic io-stats per exchange):

| Measure | Value |
| --- | --- |
| Exchanges/s | 152.8 (13,752 in 90 s, mean batch 8.0) |
| Wall time each permit holds an exchange | 3 ÷ 152.8 = 19.6 ms |
| Handler thread CPU | 8.29 ms |
| Storage round trips | 14.1 `sql` reads taking 7.21 ms (`sql-ms`), about 0.51 ms each, issued one after another inside the permit |
| Decoding | 9.76 ms (`deserialize-ms`), partly on Datomic's read-ahead threads |
| Datomic API time | 209 ms (`api-ms`); this includes the wait for a permit behind 29 other exchanges in flight (256 seats ÷ 8 = 32) |
| Reader CPU from its cgroup | 2.09 cores ÷ 152.8 = 13.7 ms per exchange, of which 5.4 ms is outside the handler thread (collector, read-ahead decoding, Jetty I/O): CPU spent, not idle |

So each permit spends about 37% of its 19.6 ms (7.2 ms) blocked on PostgreSQL, and with three permits that leaves about 0.8 to 0.9 of the three cores idle.
- **Not the driver:** its event-loop p99 was 10.94 ms in this window.
- **Not PostgreSQL's core:** it used 0.31 cores.

**Permits above the core count should therefore fill the third core**, which is the random arm's first configuration.

**Corrected sizing.**
- **Cost per subject:** 13.7 ms of reader CPU per random exchange of 8, so 1.71 ms per subject all-in.
- **Rate needed:** p99 ≤ 100 ms at 256 seats needs about 3,600 reads/s (p99 was 1.6 × p50).
- **Cores:** 450 exchanges/s × 13.7 ms = 6.2 busy cores, so **about 7 physical cores**, with permits about twice the cores so that storage waits do not idle them.
- **Cache:** no affordable cache. Leaf hits are near zero at 1.7 to 1.9 loads per subject.

### The random arm: read permits above the core count (published 2026-11-23, before launch)

**Why permits and not cores or cache.**
- **Permits:** the evidence above says the third core idles on permit-held storage waits. So the first thing to test is permits, not cores.
- **More reader cores cannot be tested on this machine without stopping the saves.** All twelve cores are assigned: transactor 0, 7 and 8; PostgreSQL 1; writer 2, 3 and 4; reader 5, 6 and 11; driver 9 and 10. Six reader cores would take the writer's three, and `s-random-near-head` needs the writer to store 23 commits/s. The other 12 logical CPUs are the same physical cores' second threads.
- **A larger read cache cannot be tested within the `server` role caps either.** The launcher allows read caches of 32, 1,536 or 3,072 MiB. The reader's 9 GiB container already holds a 6 GiB heap with the 3 GiB cache. Changing that is launch code I could not gate by tonight's deadline. The evidence says it would not help: 1.7 to 1.9 loads per subject is the cold cost, and a 2 to 4× larger cache covers well under 1% more of a 0.7 to 1.1 TB working set.

**What runs.** The saves arm with `DX_RD3_WINDOWS=random` runs only `ref-random-near-head`, `s-random-near-head` and `ref-random-seed-cut` (90 s, 256 seats, batches of eight, every old-pin value checked against the seed's, each window isolated). `DX_RD3_READ_PERMITS=N` passes `TX2_READ_PERMITS=N` to the reader (`stack/up.sh`; `study-server.ts` checks the reader container carries exactly that before the window driver). Everything else is the tuned reader as measured: cores 5, 6 and 11; 3 GiB cache; both pinned options; the early filter.

**Two configurations, one stack and one copy each, in this order:**
1. **`p6`:** 6 permits on the 3 cores.
2. **`p12`:** 12 permits on the 3 cores. Launch it only if 18 minutes remain within the 40-minute ceiling.

The dry run enters the window driver as before. It now also checks the reader's permits and resolves the three random windows.

**Command** (environment, build and copy steps as for the saves arm):

```bash
COMMIT=<the commit that publishes this section>
random_arm() {  # $1 = new copy of AGED_PGDATA_SOURCE, $2 = new campaign directory, $3 = deadline in ms, $4 = read permits
  sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
    "AGE_JAVA=$AGE_JAVA" "AGE_DATOMIC_HOME=$AGE_DATOMIC_HOME" DX_RD3_PINNED_SAVES=1 DX_RD3_WINDOWS=random "DX_RD3_READ_PERMITS=$4" \
    DX_W1_SERIAL_APPLY=0 PREP1_LOOKUP_EVERY=0 \
    "DX_RD1_PGDATA_SOURCE=$AGED_PGDATA_SOURCE" DX_RD1_LADDER=pinned-saves "DX_RD1_PGDATA=$1" \
    ${DX_DRY_RUN_FIRST_OFFER:+DX_DRY_RUN_FIRST_OFFER=1} \
    bash lab/experiments/EXP-DX1/v01/study-server.sh "$COMMIT" "$2" "$3" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" \
    "$SCALE1_TRANSFER_SHA256" 1B per-person-ordered j21-g1 "$AGE_HANDOFF_JSON" "$AGE_HANDOFF_SHA256" "" "" \
    j25-zgc "$WAL_DIR" j21-g1 rolling6
}
OUT=/var/tmp/triplex-pinned-random-1b; mkdir "$OUT" "$OUT/p6" "$OUT/p12"   # one parent per configuration
T0=$(date +%s%3N)
random_arm "$COPY_1" "$OUT/p6/campaign" $(( T0 + 20 * 60 * 1000 )) 6        # make COPY_1 first, remove it after
# make COPY_2 only if at least 18 minutes remain before T0 + 40 minutes:
random_arm "$COPY_2" "$OUT/p12/campaign" $(( T0 + 40 * 60 * 1000 )) 12
```

**Correction (integration, after the run):** the block first gave both configurations one parent (`"$OUT/p6"` and
`"$OUT/p12"`). The seal records sit in `ladders/` beside each campaign directory (`rd1/prepared.ts` `ladderPaths`),
so the two shared `$OUT/ladders` and the second was refused at `rd1/prepared.ts:85` before any offer; the driver
reran `p12` under its own parent ([RD2-PROBE](../scale1/RD2-PROBE.md)). The block above gives each its own parent,
and the refusal now names the cause (`rd1/prepared.test.ts`, "two prepared campaigns need their own parent
directories").

**Duration: 14.5 to 18.5 minutes per configuration; ceiling 40 minutes for both.**

| Step | Minutes |
| --- | ---: |
| Copy | 2–3 |
| Stack start and aged check | 4–6 |
| `ref-random-near-head` | about 2 |
| `s-random-near-head` | about 3.5 |
| `ref-random-seed-cut` | about 2 |
| Cleanup | 1–2 |

Each window runs only if its time plus 2 minutes remains before that invocation's deadline. `p12` is skipped cleanly if fewer than 18 minutes remain.

**Predictions** (corrected model: 13.7 ms of reader CPU per random exchange of 8, the reader CPU-bound at 2.6 to 2.9 usable cores once permits exceed cores; p99 ≈ 1.6 × p50):

| Configuration, window | Reads/s (central) | p50 | p99 (central) | Loads per subject | Cache share | Reader cores |
| --- | --- | --- | --- | --- | --- | --- |
| `p6`, `ref-random-near-head` | 1,450–1,700 (1,580) | 150–175 ms | 240–290 ms (260) | 1.5–2.0 | 0.76–0.81 | 2.6–2.9 |
| `p6`, `s-random-near-head` | 1,400–1,700 (1,560) | 150–180 ms | 240–300 ms (265) | 1.5–2.0 | 0.76–0.82 | 2.6–2.9 |
| `p6`, `ref-random-seed-cut` | 1,300–1,550 (1,420) | 165–195 ms | 260–330 ms (290) | 1.6–2.1 | 0.75–0.80 | 2.6–2.9 |
| `p12`, each window | 0–10% above `p6` | | | Same | Same | 2.7–2.95 |

Other expectations:
- **Saves:** `s-random-near-head` stores 23.07/s, S commit p99 50 to 70 ms, quiet p99 20 to 40 ms.
- **Storage time per exchange** (`sql-ms`): 7 to 9 ms. PostgreSQL rises to 0.35 to 0.45 cores.
- **Handler CPU per exchange:** 8 to 10 ms.
- **Exactness:** 0 wrong values and 0 errors.
- **The 100 ms bar is not met in any configuration** (central p99 260 to 290 ms).

**What would show the sizing claim ("about 7 cores, permits about twice the cores, no affordable cache") wrong:**
1. **`p6` at or above 2,000 reads/s on 3 cores.** CPU per subject falls with concurrency below 1.35 ms, and fewer than 6 cores would meet the bar.
2. **`p6` under 1,350 reads/s with the reader under 2.4 cores.** The idle core is not permit-held storage waits but something permits cannot reach: a lock, the collector, PostgreSQL. More cores would then not scale linearly, and 7 is an underestimate.
3. **`p12` at or above 1.15 × `p6`.** Storage waits still idle cores at two permits per core, so the permit rule becomes about four per core. The core count stands.
4. **Cache share by request above 0.9, or loads per subject under 1.0.** The working set is smaller than modelled and a cache test is worth building.

### What is left out

- **The production tape at the card's other rates.** Only the 394 cell runs (shape S, the brief's load), and shape R does not run.
- **1,024 seats with saves.** Its collapse is explained above from the tuned arm's records.
- **Random subjects with the tape's own pins or at 1,024 seats.** The random windows (if they run) measure 256 seats near the head and at the old pin only.
- **The driver.** It runs on the same machine (cores 9 and 10) and in one event loop with the save sender; the arm records its load instead of removing it.
- **Separate effects of the two options.** The arm does not separate the short-cut from the cut lookup.
- **The reference windows** run only if time remains. Their stream is the card's quiet generator at 3.5/s, not byte-identical to the card's P1 line tape.

### Making the tuned reader a setting of the version 0.1 scorecard (not done now)

The scorecard is `lab/bin/scorecard.mjs` → `v01/run.ts` → `v01/adopted-server.ts`. What it would take:

1. **A card option** `--reader tuned` in `run.ts`, recorded in the card input and header, passed to `adopted-server.ts`. There it selects `launchProfile(profile, { readTuned: true, readCacheMiB: 3072 })`, which gives cores 5, 6 and 11, three permits, and a 9 GiB container with a 6 GiB heap and a 3 GiB cache, and adds `DX_PINNED_SHORTCUT=1`, `DX_PINNED_CUT_LOOKUP=1` and `DX_RD1_READ_FILTER=1` to the stack options. The writer moves to cores 2, 3 and 4. The driver loses core 11, keeping 9 and 10 (`clients.readers` becomes `"10"`).
2. **Client batching in the card's P1 ladder.** `readWindows` would need batches of eight (`pinnedFields`, as the read study's `study.batch` does), named in the card as a client setting. Without it, the card's P1 reads are one subject per exchange.
3. **The read profile.** Leave `DX_RD1_READ_PROFILE` off on the card: it switches the ordinary request trace off for `/read`. The card's slow-request trace would then return, and the pair showed it costs CPU at 256 seats. Either accept that cost (and predict it) or raise the trace's threshold for `/read` on the card only.
4. **Memory with `server-32`.**
   - **The conflict.** The transactor is 60 GiB, the writer 6, the reader 9 and PostgreSQL 8: 83 GiB of role caps plus 10 GiB for the host is 93 GiB, against the 89 GiB guard (`server32HostMiB`), so 4 GiB over. `launchProfile` also refuses `txCacheMiB` together with `readTuned` outright, so that assertion must change as well as the caps.
   - **What I would change, in this order:** cut the transactor's container from 60 to 57 GiB, keeping its 48 GiB ZGC heap, 32 GiB cache and 8 GiB direct, and cut the reader's container from 9 to 8 GiB, keeping its 6 GiB heap and 3 GiB cache.
   - **Why these and not the others.** The transactor's cache sets P2 at 1 billion, the reader's cache sets reads past 256 seats, and PostgreSQL's 8 GiB holds the page cache that its storage reads hit.
   - **The condition.** Both cuts need the measured peak memory of each role first. The new arm records every role's cgroup memory at each window's end, and the `server-32` card's records hold the transactor's. If the transactor's peak is over 57 GiB, take the 4 GiB from the 10 GiB host reserve instead, which needs the host's own peak.
5. **Gates and run.** The card's Mac toy with `--reader tuned`, the exactness gate (`shortcut-gate`), and a dry run of each part to its first offer. Then the card on bare metal.

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
- ~~The tuned arm's own path~~: ran on the 1 billion database at 23:03–23:10 UTC (results above).
- **How the per-read growth with seats splits** between the trace's slow-request records, Jetty scheduling and the allocation that rises with requests in flight; and which objects make the as-of view's young collections four times as expensive per MB.
- **Why gate run 08 hung up once** (above); run 09 passed with the same code and a larger container.
- **Whether 256 readers at p99 ≤100 ms holds with the save load running**, and for pins at the tape's own positions: the DX-RD3 arm measures it. Without saves the tuned arm reached it (72.19 and 83.46 ms), on a ladder whose subjects stay in the object cache.
- **The DX-RD3 arm's own path** (`study-server.ts` `savesArm` and `adoptedArm`'s `Alongside` parameter): type-checked, bare-metal only; its read windows and checks are gated on the Mac beside the card's production cells.
- **What limited the tuned arm at 256 seats**: the reader used 2.0 of its 3 cores and the driver was not sampled.
