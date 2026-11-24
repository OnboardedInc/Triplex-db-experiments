# Bounded journal routes and a field-history page (DX-JRN1, H11.3 and H11.8)

Branch `exp/DX-JRN1-journal-bounds`, from `exp/DX-INT1` `9e02cf1d2`. Gateway (Clojure) and SDK (TypeScript) only;
Datomic is not changed. Every new behaviour is asked for by the request or switched on by a setting; with neither,
every route answers exactly as before. Mac work at toy size; times on this page are diagnostic.

## What changed

| Piece | Where | Default |
| --- | --- | --- |
| `/transactions` with `"bounded": true`: a page examines at most `examineEntries` position entries and `examineMs` ms, then returns `examined`, `stopped`, `next`. A pinned page's walk ends at the cut's physical commit. | `journal.clj` `bounded-journals`, `position-end` | off (per request) |
| `/entity-transactions` with `"bounded": true` (lean layout): the walk runs newest first from the cut down, stops at `limit` matches or on the same bounds, and returns `nextBefore` | `journal.clj` `bounded-entity-positions` | off (per request) |
| Bound settings: `TX2_JOURNAL_EXAMINE_ENTRIES` (4096), `TX2_JOURNAL_EXAMINE_MS` (100). A request may ask for less, never more. | `journal.clj` | apply only to bounded requests |
| Counters: `journalExamined` in `/v2/admin/scan-stats` (calls, entries, max per route: `transactions`, `transactions-bounded`, `entity-transactions`, `entity-transactions-bounded`); the old routes count the index entries they realize | `journal.clj` | always (counters only) |
| History page: a lean history read of one entity with `historyPage {attribute, limit, before}` decodes only that attribute's rows, orders them newest first by (recorded position, row ID) after the usual visibility filter, and returns `limit` rows with `historyNext` | `storage.clj` `history-page`, `lean.clj` `history-entity` | off (per request) |
| `TX2_JOURNAL_PERMITS`: the journal permit count | `admission.clj` | 1 (unchanged) |
| SDK adapter option `boundedJournalPages` (or `TRIPLEX_DATOMIC_BOUNDED_JOURNAL=1`): `getTransactionsAfter` and `getTransactionPositionsByEntity` send bounded requests and follow the cursors to the caller's limit or the end | `DatomicStorageAdapter.ts` | off |
| `DatomicClient.historyPage(db, {entityId, attribute, limit, before, basis})` | `DatomicClient.ts` | new method |

## The cursor contract

1. A request opts in with `"bounded": true`; each page examines at least one and at most `examineEntries` position entries (capped by `TX2_JOURNAL_EXAMINE_ENTRIES`) and stops after `examineMs` (capped by `TX2_JOURNAL_EXAMINE_MS`), then answers with what it has.
2. The answer adds `examined`, `stopped` (`limit`, `end`, `entries` or `time`) and, for the feed, `next`; for an entity's journal, `nextBefore` when it stopped on `entries` or `time`.
3. Feed: send `next` as the next `after`. Every journal at or below `next` in (after, cut] has been considered (on `limit` it is the last returned position, as today; on a bound, the last physical position examined; on `end`, the cut).
4. Entity journal: send `nextBefore` as the next `beforePosition` (on `limit`, the last returned position, as today); every journal from `nextBefore` up to the previous `beforePosition` has been considered.
5. A page that stopped on `entries` or `time` may hold no journal and is not the end; only `end` (or reaching your own limit) is. Following the cursors gives the same journals in the same order as the unbounded route (gate below).

The cursor is exact because a physical commit holds only the journals after the previous physical position up to its
own (the invariant the feed already relies on to sort pages); resuming after the last physical position examined skips
nothing. Holding the permit is bounded per page; the caller releases it between pages by sending the next request.

**A reader of the feed (priority 3) is unaffected:** a reader that does not send `bounded` gets byte-identical answers
(the only change on its path is a counter). A reader that does send it and follows `next` gets the same ordered journals
with no gap (gate 1 compares every journal's ID, position, row texts and clock end over the whole feed), and resume from
a checkpoint is the same request it is today. A reader that sends `bounded` and treats a short page as the end would
miss journals; the SDK option never does that.

## Gate on a loader-aged toy (`jrn1/gate.sh`, Mac, one heavy token, 2026-11-24)

Toy: the SCALE1-shaped seed of PREP1's aged-live gate (positions 1 to 61) through this branch's gateway; then AGE1's
own code at its load pin (`5cda4ab20`) in its own peer JVM and transactor: 200 native single saves and 1,000 grouped
saves in groups of 8 (`native/age!`, `native/grouped-age!`, the bulk loader's renders, each save with the loader's
non-canonical position row), aged head 1,261; then a run of 3,000 position entries that yield no journal (positions
1,262 to 4,261, in the header shape of AGE1's native seed frames: position, transaction ID, record clock, no journal);
then one ordinary save at 4,262 through a fresh gateway. Evidence: `agents/OPUS-JRN1/runs-2026-11-24.tar.zst` (private; `runs/g1`, `runs/g2`, the suite arms).
Result: **DX-JRN1 GATE PASS.**

**Finding: the loader's saves pass the feed's filter.** All 1,200 aged saves came back as journals from the old route
(1,262 journals: 61 seed, 1,200 aged, 1 after the run). So on this toy the bulk loader's position rows do not make the
old page walk; the walk happens over position entries that yield no journal, or past a page's cut. Which of these the
1 billion copy has is not known from the Mac; the server probe below answers it (probe 2).

| Check | Result |
| --- | --- |
| 1. Whole feed, old route vs bounded pages (examine 1, 5, 64, 64, 4096 entries; limit 1000, 7, 1, 1000, 1000) | Equal in all 5: 1,262 journals each (positions 1 to 4,262, none from the run); 3,388 / 797 / 1,309 / 54 / 3 pages; most entries examined per page 1 / 5 / 64 / 64 / 3,034 |
| 2. Pinned pages (cut 61, 461, 1,261, 2,761, 4,262; after 0, cut minus 2, seed end minus 3; limit 50, examine 3) | Equal in all 15 |
| 3. Cost of a page that starts below the run (limit 100) | Run of 3,000 ahead: old route examined **3,001** entries for its one journal; bounded first page examined 256 (the request's bound), stopped `entries`, `next` 1,517; 13 bounded pages cross the run, none above 256. Run of 750 ahead: old **751**, bounded 256 per page, 4 pages. The old cost grows with the run; the bounded page's does not |
| 3b. Pinned page with its cut below the run (cut 61, after 58) | Equal answers; bounded walk examined 3 entries and stopped `end` at the cut's commit (the old walk continues inside Datomic's as-of filter, which its counter cannot see: 1.9 ms here, diagnostic) |
| 4. Entity journal, old lean route (limit 1001) vs bounded pages followed by `nextBefore` (examine 1, 7, 4096; limit 1001, 3, 1001), 5 entities × 3 cuts | Equal in all 45. Old route examined 3,387 / 386 / 311 entries at cuts 4,262 / 1,261 / 661 whatever the entity. The most-saved owner (25 journals) got its newest 20 in one bounded request (3,123 entries, `limit`); a twice-saved owner's newest 20 stopped on the 100 ms bound after 3,130 entries (diagnostic Mac rate, about 32 µs an entry), returning the start of the old answer and `nextBefore` |
| 5. Field history: `historyPage` (limit 1, 7, 10,000) followed by `historyNext` vs the unbounded history read filtered to the attribute and sorted newest first; most-saved and an idle owner; three fields and an absent one; at the head and pinned at 661 | Equal in all 48 (most-saved owner: 51 entity rows, 25 / 17 / 9 / 0 of the four attributes; pinned 27 rows) |
| 6. SDK adapter with and without `boundedJournalPages` (loader rows accepted): `getTransactionsAfter` at six (after, limit) pairs, `getTransactionPositionsByEntity` on two entities | Equal in all 8; at the default bound each bounded call took one request |
| Fake-gateway unit test (`packages/datomic/test/journal-bounds.test.ts`) | 2 of 2: the SDK's cursor loop gives the unbounded answer at bounds 1, 7 and 1000 over a 400-entry index with 5 journals (more than 300 requests at bound 1), only the first page waits |

| 7. The server probe (`probe.ts`) on the same toy (sealed head = aged head 1,261, `--far` 61) | Runs: newest 20 old 20 entries, bounded 20; from below the aged head the first bounded page returned 1,000 journals after 300 entries (`limit`, 4.3 MB, 59 ms diagnostic), the second the remaining 201 (`end`); entity journal of the most-saved owner 20 found in 1 to 2 pages, an idle owner's 1 journal in 2 pages (3,387 entries, at most 101 ms a page); field history page 25 rows, 20,701 bytes against 42,016 for the unbounded read |

The run repeated with the final code (`runs/g2`) and gave the same counts.

**The SDK's live suite** (`jrn1/suite.sh`, `DATOMIC_INTEGRATION=1`, packages/datomic, this branch's gateway with its
defaults in one lab container):

| Arm | Result |
| --- | --- |
| Plain, whole suite (files in parallel) | 482 passed, 9 failed, 1 skipped. Every failure is the environment: `strict-order` needs a gateway on 8526; `layout-differential` (300 scenarios) and `reach` (200) lost the toy transactor ("Transactor not available") while running in parallel; `history-grouping` needs lab packages and gateway settings this container lacks and fails the same way on the baseline gateway `9e02cf1d2` (seed command rejected); `route-equivalence` needed the testkit build. `journal-fast` (100 scopes of random feed pages and commands deep-equal to the original implementation) passed |
| Plain, sequential reruns | `route-equivalence` passed; `layout-differential` at 60 scenarios passed (18,996 comparisons) |
| Bounded: every adapter with `TRIPLEX_DATOMIC_BOUNDED_JOURNAL=1`, gateway `TX2_JOURNAL_EXAMINE_ENTRIES=2` | `journal-fast`, `route-equivalence`, `adapter`, `read-pins`, `layout-unsupported`, `concurrent-commits`, `journal-bounds`, `feed`: 32 tests passed (8 files once the testkit was built); `layout-differential` 60 scenarios passed. The gateway counted 1,732 and 602 bounded feed requests in the two runs, at most 2 entries each, so the cursors were followed constantly |

## Entity-to-transaction index: decision and cost

**Decision: written design, not built.** The bounded route makes an entity's journal safe (no request holds the permit
for more than its bound) but not proportional to the entity: on the toy a twice-saved owner still needs the walk over
every later transaction (3,130 entries did not reach it). An index fixes that.

**Design.** With each journal, assert one datom per changed entity: `[entity :triplex.entity/journal-position p]`
(long, cardinality many, not unique, no AVET). EAVT then lists an entity's journal positions in order, so the newest
`limit` below `beforePosition` is one reverse seek on `(entity, attribute, before - 1)`, and each position resolves to
its journal through the existing `[:triplex.tx/position p]` or `[:triplex.group/position p]` lookups; an as-of cut
hides later datoms by itself. Cost per read: proportional to the entity's own journals returned. A scope records the
first position written with the index (`:triplex.scope/entity-journal-since`); below it the read falls back to the
bounded walk, until a backfill (one datom per existing changed-entity row, run as a background import) closes the gap.

**Cost per commit.** One datom per changed entity per journal. AGE1's saves change one entity each: a native single
save is 12 + 4 × width datoms and a grouped member 16 + 5 × width (26,255 datoms for the toy's 1,000 grouped saves,
26.3 per save), so the index adds about 4 to 6% of datoms. In bytes, about 20 B in the log and about 10 to 20 B in
each of EAVT and AEVT after indexing, so about 40 to 60 B per changed entity per commit (estimate, not measured),
against several kilobytes of row texts in a save (well under 2%). Transactor work is one more datom per changed
entity (microseconds against the 10 ms p50 and 50 ms p99 commit bars). Not measured on a server.

**Why not built today:** it must be written by every journal writer (the product commit in `storage.clj`,
`subject_save.clj`, group materialization in `group.clj`, removal journals in `erase.clj`, and the loaders), each of
which checks its exact datom census (`group_prepare.clj`'s allowed attributes, the subject-save op checks, the layout
input audit and replay, the lab loaders' log comparisons); a default-off option across all of them, with the census
checks taught the new datom and a backfill, is not small and cannot be gated on the Mac in a day.

**A cheaper candidate to prove first:** every journal that lists an entity as changed also asserts or retires one of
that entity's rows, so the entity's own history rows (their `recorded_position` and retirement positions) name every
candidate journal; reading each candidate's changed-entity rows confirms it exactly. That needs no new writes and costs
what a history read of the entity costs. It is exact only if no journal lists an entity it did not touch (removal
journals and imported journals must be checked); W1 rejected inferring ownership without that check.

## More than one journal permit

The single journal permit (`admission/journals`) also serves `/command` and `/journal`, the receipt lookups a save's
lost reply depends on, so one long journal page delays receipts as well as the feed. With bounded pages each hold is at
most the examine bound (100 ms) plus writing at most `limit` journals; long polls wait before taking the permit. The
reads are on immutable database values, so two permits cannot change any answer. **Proposal (default unchanged):**
`TX2_JOURNAL_PERMITS=2` on the read gateway once the SDK and the console send bounded pages by default (an unbounded
request can still hold a permit for as long as it walks; with two permits, two such requests block everything).
Judge it on a server: P3 lag p99 and receipt lookup p99 with the card's 256 readers, permits 1 and 2, and reader
goodput (each permit can take one more core from the pull cohort). Not measured.

## The console

Left untouched. The console's own journal gate needs the DEMO1 toy stack (`demo/toy/up.sh` always serves on 28580
and uses the owner's toy working copy), so it was not run. What the new routes would remove: `fieldHistory`
(`examples/demo-mcp/src/store.ts`) could call `historyPage` instead of reading every row of the entity and filtering
afterwards; the entity journal built from feed pages since the sealed head could use bounded `entity-transactions`
pages with a page budget (still a walk until the index exists). The floor at the sealed head stays either way: below
it the SDK refuses the loader's non-canonical journal rows unless the compatibility option is on.

## Server probe for a 1 billion copy (not run; no server is rented)

Read-only, about 3 minutes, against a read gateway serving this branch on the 1 billion working copy (AGE1's sealed
cut, head 28,309,866 plus the console's later commits), nobody else using that gateway:

```
node --import tsx lab/experiments/EXP-DX1/jrn1/probe.ts http://127.0.0.1:<read-gateway-port> <db from the console connection file> \
  28309866 '<account-003 namespace>i9:00050000' '<account-003 namespace>i9:00000000' \
  --attribute :task/field-0 --far 87002 --entity-pages 200 --feed-pages 5 > jrn1-probe-1b.jsonl
```

Predictions (written before any run):

| Probe | Predicted | What would show it wrong |
| --- | --- | --- |
| 1. Newest 20 (`after` = head − 20, limit 20), three runs | Old route examined 20 to 32 entries (it realizes 32 at a time); bounded examined at most 20, `stopped` `limit`; same journals; store under 30 ms each | Old route over 1,000 entries (then non-qualifying entries sit near the head too) |
| 2. A page from below the sealed head (`after` 87,002, limit 1000), five bounded pages | From the toy: the loader's saves pass, so each page stops on `limit` with 1,000 journals after 125 to 1,000 entries (125 if every save is in a group of 8), store at most 150 ms | Pages stopping on `entries` or `time` with no journals: then the copy has a run of position entries that yield no journal (the brief's reading), which the toy did not reproduce |
| 3. Entity journal, newest 20, bounded pages to at most 200 pages; ordinary subject 50000 and the heavily saved subject 0 of account-003 | Every page at most 4,096 entries and about 100 ms store (the time bound); heavy: 20 found in 20 to 200 pages (about 1,412 journals over 28.2 million saves); ordinary: 0 found in 200 pages (its journals are at or below 87,002, about 28 million saves below the head) | Any page over 4,096 entries or over 250 ms store; the ordinary entity found within 200 pages (then it was saved after aging, or the walk is far faster than the Mac's 32 µs an entry) |
| 4. Field history of `:task/field-0` on the heavily saved task: `historyPage` limit 40 (three runs, the first cold) and the unbounded read (three runs) | 40 rows and a cursor; cold 1.5 to 5 s (it still reads all 2,844 row datoms of the entity, as G8's 4.0 s); warm 20 to 120 ms against 250 to 420 ms for the unbounded read (G8: 0.33 to 0.41 s); about 1/70 of the bytes | Warm page over 200 ms (then decoding was not the warm cost); cold page under 0.5 s (then G8's cold cost was not the index reads) |

`--old-below` additionally sends the old unbounded page from 87,002 with a 600 s client timeout; only on a gateway nobody
else uses, since if probe 2 shows runs without journals it will hold the journal permit for minutes.

## Not verified

- Anything at 1 billion records: the walk's mechanism on that copy, per-entry cost, store times (probe above).
- That the bulk loader's position rows never pass the filter (the toy says they do pass); the run of 3,000 entries is
  a construction in the shape of AGE1's seed frames, not data from the copy.
- The time bound under load: on the Mac an entity page reaches about 3,100 entries in 100 ms.
- Two journal permits (proposal only); the entity index (design only, cost estimated, not measured).
- The console (untouched; its gates not run).
