# ID lists: step 0 of questions across subjects (XQ3, 2026-11-24)

**The read gateway can now list every entity of one ID kind in one account, exactly, at the head, at a pinned position
or at a record time, from the AVET index Datomic already keeps for the unique `:triplex.entity/id`. Nothing is written
per save and nothing is backfilled. Triplex's `entityPage`, `match` on a type and `ConfigStore.load` can page through
it instead of scanning every fact.** Everything is off by default: without `TX2_ID_LISTS=1` the route does not exist
(the gateway answers 404 `NotFound` exactly as before), and without the SDK's `idLists` option the adapter and Triplex
behave exactly as before. Branch `exp/DX-XQ3-id-lists`, from `origin/exp/DX-INT1` `9e02cf1d2`. Design: option E1 and
section 7 of the private design of 2026-11-24 (`research/2026-11-24-cross-subject-questions/DESIGN.md`).

## 1. The contract as built

`POST /v2/db/{db}/ids` on any gateway (the read gateway in practice), when `TX2_ID_LISTS=1`.

```json
{ "account": "account-003", "prefix": "pl:", "shape": "pl:{8 digits}",
  "basis": { "recordedPosition": 87002, "validAt": 1795000000000 },
  "result": "ids", "limit": 1000, "order": "asc", "cursor": null,
  "bounds": { "entries": 100000, "ms": 100, "segments": 512 } }
```

| Field | Meaning |
| --- | --- |
| `account` | Required (400 `AccountRequired`). `[A-Za-z0-9_-]{1,64}` (else 400 `InvalidValue`). The range read is `acct/<account>/<prefix>`; the account `_system` reads `_triplex/<prefix>` (Triplex's reserved entities, for `ConfigStore`). |
| `prefix` | Text after the account's base, at most 512 characters, no control characters (400 `InvalidValue`). Default empty: every ID of the account. |
| `shape` | Optional. Matched against the ID after the account's base (so `pl:{8 digits}` keeps subject roots and drops `pl:00000001:p0`). Closed grammar: `{N digits}` (1 to 32), `{digits}`, `{segment}` (one or more characters other than `:` and `/`); every other character literal. Unknown tokens: 400. |
| `basis` | Optional `recordedPosition` or `recordedAt` (resolved by the pinned reads' own `reach/select-db`), `validAt` (echoed and bound into the cursor; an ID list has no valid-time axis). No basis: the gateway's head. A future position waits up to `basisWaitMs` (1 to 2,000 ms, default 500), as every pinned read does. |
| `atLeastPosition` | "At least my receipt": wait on the peer (at most `basisWaitMs`) until its head is at or after it, then answer at the head; 409 `AtLeastTimeout` with the peer's head when it does not arrive. Refused (400) together with a pinned basis. It uses RD4's `at-least/await!` when that namespace is on the branch (`requiring-resolve`; checked: see section 3) and the same wait locally until then. |
| `result` | `ids` (default) or `count`. Anything else: 400 `UnsupportedOperation`. |
| `limit` | 1 to 1,000, default 100. |
| `order` | `asc` (default, `seek-datoms`) or `desc` (`rseek-datoms` from the least string above the range). |
| `cursor` / `after` | `cursor` continues a page; `after` (a full entity ID inside the range) starts after a known entity, which is how Triplex's own `EntityPageCursor` resumes. Not both. `after` outside the account: 409 `AccountMismatch`. |
| `bounds` | `entries` examined (default 100,000, cap 1,000,000), `ms` (default 100, cap 1,000), `segments` (default 512, cap 4,096). Reaching one returns what was found and a cursor, never an error. |

**The answer.** `position` (the position the whole answer is exact at; with a record time, the position of the resolved
database value), `t`, `head`, `validAt`, `trailingBy: 0`, `ids` or `count` and `countExact`, `examined`,
`segmentsLoaded`, `ioReads`, `scanMicros`, `stopped` (`end`, `limit`, `entries`, `time`, `segments`) and `next` (null
exactly when `stopped` is `end`). A page that fills its limit peeks at the next entry, so a last full page says `end`.

**The cursor** binds the database name, the account, a hash of the request (base, prefix, shape, order, result), the
Datomic `t` and position of the first page, the valid time, the last key examined and the running count. Another
database, account or request: 409 `CursorMismatch`; a different basis with a cursor: 409 `CursorMismatch`; a key
edited to point outside the range: 409 `CursorMismatch`. Isolation does not depend on the cursor being honest: every
walk starts inside `acct/<account>/<prefix>` and stops at the first ID outside it, and every returned ID is checked
against the account (a failure would be a 500 `AccountLeak`, never a filter).

**Admission.** Its own pool, `TX2_INDEX_QUERY_PERMITS` (default 1, 1 to 64), beside `admission/reads` and
`admission/journals`, taken after the basis is resolved (a wait for a position never holds a permit), with at most one
running request per account. A second request of the same account: 503 `IndexBusy` at once; no free permit within the
request's `ms` bound: 503 `IndexBusy`. Both carry `retryAfterMs`. The SDK waits and retries (40 attempts by default).

**What an answer means.** "An entity with this ID existed at the stated position." In the lean layout an entity gets
its ID datom with its first row (`storage/tx-data`), so this is "an entity that had a fact recorded at or before the
position", whether or not the fact is still live. The legacy layout also gives reference targets an ID
(`storage/upserts`); the lean layout does not (seen on the toy: the design's "wk:" reference targets have no ID).
Callers that need "has a fact of type T visible at the basis" read the page's rows, as `entityPage` does.

**Removal on request.** A subject whose protected values were removed keeps its ID, and the route returns it exactly as
before the removal. That is right: removal on request removes protected values; it does not remove the subject or its
other facts, an entity ID is never a protected value (protection is declared per attribute), and the route never
returns a value. The removal's own journal entity (`_tx/erase-<uuid>`) is outside every account and `_triplex/`.

**Refusals that apply to this route:** 400 `AccountRequired`, 400 `InvalidValue`, 400 `UnsupportedOperation`,
409 `AccountMismatch`, 409 `CursorMismatch`, 409 `InteriorPosition` (a position inside a group commit or inside a
multi-position transaction; with the group's position as `maximum`), 409 `IrregularScope`, 409 `LayoutUnsupported`
(a scope whose rows version `select-db` declines), 409 `BasisNotAvailable` (a position beyond the head after the wait,
or a cursor's database value this peer has not reached), 409 `AtLeastTimeout`, 503 `IndexBusy`.

### Departures from the design, each with its reason

1. **Off means absent, not 409 `IndexOff`.** The task asks for every option off by default with byte-identical
   behaviour; before this branch `POST /v2/db/{db}/ids` answered 404 `{"code":"NotFound"}`, and with the option off it
   still does (checked byte for byte). The design's `IndexOff` belongs to the declaration and find routes of step 1.
2. **One option, `TX2_ID_LISTS`,** not `TX2_CROSS_INDEX`: the ID list writes nothing, so it should be switchable
   without the commit-time index of step 1.
3. **`after`** (an entity ID) beside the opaque cursor: Triplex's `EntityPageCursor` already holds the last entity and
   the position, so the adapter resumes by key instead of keeping the route's cursor.
4. **The shape is matched after the account's base** (as the design's example `prefix "pl:"`, `shape "pl:{8 digits}"`
   needs); my first build matched it after the prefix, which the toy gate caught.
5. **The segment bound does not bind on the toy.** Datomic's `io-stats` (`with-io-stats` around each walk of 64
   entries) attributed no storage read to the AVET walk, cold or warm, with `index-range` and with `seek-datoms` (two
   runs). The entries and time bounds are therefore what bound a page; storage reads were counted in PostgreSQL instead
   (section 4). Why io-stats sees nothing here is not established (a guess: segment loads for an index walk happen on
   Datomic's prefetch threads).
6. **The time bound can be overrun by one storage step.** The clock is read after every entry, so a page stops at the
   first entry past its bound; cold, that entry can wait for one storage read. On the toy one such step took about
   26 ms (5 ms bound: stopped after 187 entries at 31.1 ms), so "no permit held longer than its bound plus 10 ms" is
   **not met cold on the Mac**; warm it holds. On bare metal a segment read is predicted at 1 to 3 ms.
7. **Position 0** (the scope before its first commit) is answered (empty) through `storage/at-position`; `select-db`
   has no row for it.

## 2. What Triplex's interfaces now do (all with the SDK option `idLists`; without it, nothing changes)

```ts
makeDatomicRuntime({ url, idLists: {
  types: {
    Subject: [{ account: "account-003", prefix: "pl:", shape: "pl:{8 digits}" }, /* one range per account */],
    ...configStoreIdLists,                     // ConfigStore's five record types under _system
  },
  refuseScans: true,      // optional: a read by pattern naming no entity and no listed type fails, never scans
  matchFactLimit: 10_000, // optional, the default
} })
```

| Interface | With `idLists` |
| --- | --- |
| `DatomicClient.listIds(db, request)` | One page of the route, returned unchanged (validated: account echoed, `trailingBy` 0, `next` null exactly at `end`). `listIdsPage` waits out `IndexBusy`. |
| `Triples.entityPage` (listed type) | New optional SPI member `StorageAdapter.getEntityPage`; `TriplesLive.entityPage` uses it when the adapter answers. The adapter walks the type's ranges in ID order at the page's position, reads the candidates' rows at the page's basis exactly as `getByEntities` does, keeps entities with a visible fact of the type, and stops at limit + 1. Same page, same entities, same rows, same cursor string as the scan (gate below). Inside a transaction, and for types not listed, the scan answers as before. |
| `Triples.match` with an `entityType` and no entity (listed type) | Bounded: the type's IDs page by page, their rows, filtered by the pattern; more than `matchFactLimit` facts: `DatomicMatchNeedsPaging` (a `ReadError`, `code` `MatchNeedsPaging`) instead of a scan. |
| Any other read by pattern naming no entity, with `refuseScans` | `MatchNeedsPaging` instead of a scan (journal reads of `_Transaction` keep their own route). |
| `ConfigStore.load` | Unchanged code: its five `match({ entityType })` reads become five bounded ID lists under `_system` when `configStoreIdLists` is spread into `types`. |
| Constraint enforcement inside a transaction | Unchanged (a transaction's reads must see its staged rows); step 4 of the design. |
| The console (`examples/demo-mcp`) | **Left unchanged.** Its own workaround (ID discovery from the refs) would be replaced by `configStoreIdLists`, but its gates reset the owner's toy and serve on 28580; checking it needs a toy stack of its own under other names and ports, which `demo/toy` does not offer today. Not a small change. |
| The Publish census | **Not built.** The place: `lab/experiments/EXP-DX1/notify1/census.ts` `installCensus(db, subjects)` takes the account's subject list from its caller (the loader's roster), and `actv-lazy/join/account.ts` reads it back through `roster`. The ID list with `shape: "pl:{8 digits}"` is exactly that list at a stated position; feeding it in changes the census's own verification (its members hash), so it is not small. |

## 3. Gates (Mac, toy size, one ordinary heavy token each; counts exact, times diagnostic)

| Gate | Result |
| --- | --- |
| **G1, gateway** (`ids_test.clj`, memory database, 4 accounts whose names prefix each other plus `_triplex/` entities, 5 commits) | 16,460 assertions, 0 failures: 11 prefix and shape cases × 3 accounts × 6 positions (0 to 5) × limits 1, 4, 1,000 × asc and desc, each page sequence equal to a brute-force pass over every `:triplex.entity/id` datom of the same as-of value; counts in pages of 3 entries exact; five record times resolved to their positions; `atLeastPosition` |
| **G1, through the store** (`gate.ts`, a toy stack with the route on; 3 accounts × 45 subjects, placements, tasks; values changed, every fact of some tasks retired, a configuration release, protected values saved and removed on request; 18 commits) | **PASS, 1,654 checks, 0 failures** (run `gate-6` on this page's code, after `gate-5` on the earlier per-chunk clock; both identical). Route: 750 page sequences (10 positions from 0 to the head × 25 account/prefix/shape cases × 3 limit/order cases), 4,516 pages, 34,500 IDs, each equal to the owners of every row the store's own history read returns at that position; 17 record-time bases equal at their stated positions. Triplex: 72 `entityPage` chains (7 types including 3 ConfigStore types and an unlisted one, 4 record times, limits 1, 9, 200; 863 pages) byte-equal to the stock scan, cursors included; 20 `match` comparisons equal; `ConfigStore.load` equal; `refuseScans` refuses an attribute scan and keeps entity reads; a match over its fact limit refused |
| **Removal on request** (same run) | Five subjects' protected values removed (erasure sequence 1, 5 identities, position 18): the subject list before (position 17) and after (18) identical, the five subjects listed, no protected value in the answer |
| **G4 isolation** | Gateway: crafted prefixes (`../account-004/`, `pl:../../account-004/pl:`, `/`, `ÿ`, `￿`) stay in the account; `account-003` never lists `account-0031` or `account-03`; 10 malformed accounts refused; control characters refused; `after` in another account 409; cursors replayed with another account, another request, another basis or an edited key 409. Store: 15 crafted requests and 2 cursor replays, all as expected |
| **G5 bounded work** | Every page examined at most its entry bound (bounds 3 and 4 in the gateway test, 1, 7 and 64 on the stack: 0 pages over); a cursor always continued to the exact count (205 of 205 at bounds 1, 7, 64). Count toy: a burst of 8 full counts of one account with one of another: 1 of the 8 ran (400,003, exact) and 7 got `IndexBusy`; the other account's count ran (300,000, exact); afterwards a request found the permit free; gateway counters 4 requests, 7 refusals. Permit released after every page (`availablePermits` back to its count, no running account). Time bound: see departure 6 |
| **G8 off equals before** | Gateway: with `TX2_ID_LISTS` off the route answers `404 {"code":"NotFound"}` byte for byte, as `9e02cf1d2` does. SDK: without `idLists` the adapter has no `getEntityPage` and `query` is the unchanged `queryRows`; `TriplesLive.entityPage` takes the unchanged scan when the member is absent. Suites: see below |
| RD4 hook | With RD4's `at_least.clj` copied beside this branch's gateway, `ids/at-least-await` is RD4's `await!` and the ID test passes: when RD4 lands on the one branch, nothing here changes |

**Suites run for G8** (evidence `DX-XQ3/suites-1/`, private):

| Suite | Result |
| --- | --- |
| Gateway selftest (`triplex.gateway.selftest`, with this branch's namespaces loaded, option off) | 28 tests, 54,110 assertions, 0 failures |
| ID list gateway test with RD4's `at_least.clj` beside it | 16,461 assertions, 0 failures (one more: the wait is RD4's `await!`) |
| SDK unit suite (`packages/datomic`, `vitest run`, after building its lab dependencies) | 450 passed, 53 skipped (the readiness page: 446 / 53; the 4 new are `id-lists.test.ts`) |
| SDK type check (`packages/datomic`, `tsc --noEmit`) | Clean |
| Core unit suite (`packages/core`, 62 files including ConfigStore, Constraint, Releases, Lifecycle, EntityValidation, KvTriples with `entityPage`) | 863 passed |
| Core type check (`pnpm run typecheck`) | 6 errors, identical with this branch's two core files reverted to `9e02cf1d2`: all in files this branch does not change (`Derivation.ts`, `Overlay.ts`, `EntityCodec.ts`, `Pagination.ts`, `canonical.ts`, `writeEventUtils.ts`) |
| SDK integration tests that pin reads (read-pins, reach, adapter, route-equivalence, record-time-peer), on a stack with the route on and the SDK option off | 5 files, 20 passed (RD4 ran the same set at 19 passed, 1 skipped, on `9e02cf1d2`; `history-grouping` left out, it fails on both) |

## 4. Scan counts (design section 9 item 4, the ID route)

Toy: one lean scope on a stack of this branch (PostgreSQL storage, separate transactor and gateways, lab VM). Account
`account-007` holds 400,000 IDs under `pl:`: 100,000 subjects and 200,000 placements (`:p0`, `:p1`) written before
position 2, then 100,000 placements `:q0` written after it, interleaved among the old ones; `account-008` holds 300,000.
The IDs were written as bare identity datoms by `seed-ids.clj` (no rows) and indexed before any read. "Cold" is the
read gateway just restarted (empty object cache; PostgreSQL's own cache stays warm); "warm" repeats the same page.
**Storage reads** are PostgreSQL index scans of Datomic's table (`datomic_kvs`, one per segment get), read 11 s apart
around each page, minus the idle baseline of 2 per interval (departure 5: Datomic's io-stats attributed none).
Runs `counts-2` and `counts-3`; times are diagnostic.

| Page (`prefix "pl:"`) | At | Entries examined | Storage reads | Scan ms (two runs) |
| --- | --- | ---: | ---: | --- |
| First page of 100, cold | head (3) | 100 | 3 | 21.4, 20.9 |
| First page of 100, warm | head | 100 | 0 | 0.8, 0.3 |
| Page of 100 from the middle, cold (after the first) | head | 100 | 1 | 21.1, 23.0 |
| First page of 1,000, cold | head | 1,000 | 2 | 24.4, 18.8 |
| First page of 1,000, warm | head | 1,000 | 0 | 12.4, 1.4 |
| Page of 1,000 from the middle, cold | head | 1,000 | 2 | 18.5, 13.8 |
| First page of 100, cold | old pin (2) | 100 | 8 | 24.5, 29.7 |
| First page of 100, warm | old pin | 100 | 0 | 0.4, 4.7 |
| Page of 100 from the middle, cold | old pin | 100 | 1 | 11.2, 23.0 |
| First page of 1,000, cold | old pin | 1,000 | 6 | 46.9, 33.5 |
| First page of 1,000, warm | old pin | 1,000 | 0 | 14.7, 11.1 |
| Page of 1,000 from the middle, cold | old pin | 1,000 | 1 | 14.5, 17.8 |
| 1,000 subjects with `shape "pl:{8 digits}"`, warm | head / old pin | 3,997 / 2,998 | not measured | 12.2 / 13.9 |
| Count of the whole range, cold | head | 400,000 | 62 | 1,055 (2 pages, time bound 1 s), 838 |
| Count of the whole range, warm | head | 400,000 | 0 | 677, 422 (242 in `counts-1`) |
| Count of the whole range, cold | old pin | 300,000 (walk passes 400,000) | 67 | 857, 1,097 |
| Count of the whole range, warm | old pin | 300,000 | 1 | 230, 249 |

**What they say.** About 6,400 IDs per storage read along the range (400,000 in 62 reads), so a page of 1,000 costs at
most one or two reads once the walk is under way; the first page after a restart pays about 3 reads at the head (the
index's root and directories) and 6 to 8 at an old pin (an as-of walk also opens the history tree, as RD1 found for
pinned subject reads). Warm, 0.6 to 1.7 µs per entry examined at the head and 0.8 µs at the old pin (Mac VM). At the old
pin the walk passes the 100,000 later IDs it must hide; that costs reads and time in proportion (67 against 62 reads),
not a multiple. Shapes cost what they examine: a page of 1,000 subjects examines about 4,000 entries here (3 placements
per subject); on the 1 billion database about 2,800 (1.8 placements per subject).

## 5. The server command (for the day a machine is rented)

Build the branch at `$COMMIT` (head of `exp/DX-XQ3-id-lists`) as the demo is built (`demo/README.md`, "Run it
against the 1 billion database"), on one rented server with the sealed 1 billion cluster. The demo stack gets the route
through the environment (`demo/server-up.sh` passes it to `stack/up.sh`); nothing else changes. The runner only reads.

```bash
cd "$REPO" && git checkout "$COMMIT"
sudo env DX_ID_LISTS=1 DEMO_ORIGINAL="$SEALED_CLUSTER" DEMO_HANDOFF="$AGE_HANDOFF_JSON" bash demo/server-up.sh --reset
#   prints DEMO READY head=28309866 records=1000251169 t=62888918
sudo node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq3/server.ts \
  /var/tmp/triplex-demo/ready.json "$OUT/xq3-1b" account-003
sudo bash demo/server-down.sh
```

**Duration.** The bring-up as the demo's (a byte copy of the 176 GB cluster, start, identity checks; I did not time
it). The runner: 3 to 10 minutes (two read-gateway restarts, four subject walks of 100 pages, two walks of every ID of
the account).

**What it does.** For the head and then position 87,002: restart the read gateway (cold), list every subject of
account 3 in pages of 1,000 (`prefix "pl:"`, `shape "pl:{8 digits}"`, bounds 100,000 entries, 1,000 ms, 4,096
segments), again warm, record whether the list is strictly increasing, all of the shape, and exactly the seed's
roster `pl:00000000` to `pl:00099999` (recorded, not thrown, so a wrong guess about the roster does not cost the run),
then list every ID of the account in pages of 1,000 and tally the kinds (`pl:`, `i9:`, `sec:` and so on). Every page's
examined entries, scan time, gateway time and client time go to `server.jsonl`.

**Predictions** (written before any server run; from the toy counts above and the design's section 8.3, which predicts
3 to 15 ms cold and under 2 ms warm for a first page of 100 subjects, and 30 to 90 ms warm and 0.2 to 0.8 s cold for
the count of 100,000 subjects among about 280,000 `pl:` IDs):

| Measure | Prediction |
| --- | --- |
| Subjects at the head and at 87,002 | Exactly 100,000, in order, 100 pages, at both (the seed's subjects all exist at 87,002; the aged saves added none) |
| Entries examined for the subject walk | 270,000 to 290,000 at each position (about 2.8 `pl:` IDs per subject) |
| Warm subject walk, store time | 0.1 to 0.35 s in all (0.4 to 1.2 µs per entry), 1 to 4 ms per page of 1,000 |
| Cold subject walk, store time | 0.3 to 1.0 s in all; first page 5 to 30 ms; later pages 1 to 10 ms (30 to 90 storage reads at 1 to 3 ms each on NVMe) |
| At 87,002 against the head | 1.0 to 2.5 times the head's time, warm and cold |
| Every ID of the account | 1 to 5 million IDs; `pl:` 270,000 to 290,000 and `i9:` 540,000 to 600,000 (design: about 570,000 tasks); warm walk 1 to 6 s at the head; the same kinds and counts at 87,002 except kinds the aging loader created |
| Refusals | None (`IndexBusy` 0 for one client; no page over 100,000 entries examined) |

**What would show them wrong.** Any subject count other than 100,000 or an ID out of order: the route is not exact at
that size, and nothing built on it may ship (stop). Warm cost above 3 µs per entry, or a cold subject walk above 3 s:
the AVET range read is slower than both the design and the toy assume, and pages must shrink or the design's
"shorter keys" fallback applies. A walk at 87,002 more than 10 times the head's: the as-of view far behind the head is
expensive (the design's section 8.5 rule), and lists at old positions need another route. A first cold page above
100 ms: the design's first-page bar for the index routes is at risk.

## 6. Not verified

- **Nothing ran on a server.** Every time above is the Mac's; the server section is a prediction.
- **The segment bound does not bind** wherever io-stats reports no reads for the walk (it reported none on the toy);
  the reason is not established. Storage reads were counted only on the toy, in PostgreSQL.
- **The time bound overruns cold by one storage step** (25 to 31 ms against a 5 ms bound on the Mac); on bare metal
  not measured.
- **The legacy layout** is not gated (the gateway test and the toy gate are lean scopes). Its reference targets also
  get IDs, so its lists would include them.
- **Positions inside a group commit** are refused (409 `InteriorPosition`), not answered; group commits are off by
  default. Imported rows with explicit older positions: the route answers at the physical cut, as every pinned read
  does; not gated.
- **Several read gateways** behind one URL: a cursor carries its Datomic `t`, and a peer that has not reached it syncs
  for up to 2 s, then refuses 409 `BasisNotAvailable`. Not tested with two read peers.
- **The console** is not switched to `configStoreIdLists`; **the Publish census** is not fed from the list (section 2).
- **The SDK's integration suites** ran only the five files that pin reads, on a stack with the route on; not the whole
  integration set, and not with `idLists` on (the toy gate covers that path).
- **Inside a transaction** (constraint enforcement), reads by type still scan; `refuseScans` and the fact bound apply
  only outside one.
- An account literally named `_system` cannot list `acct/_system/` (that token is Triplex's reserved range).
