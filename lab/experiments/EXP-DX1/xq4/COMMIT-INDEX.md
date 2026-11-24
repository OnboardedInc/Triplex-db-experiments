# XQ4: questions across subjects, step 1 (the commit-time index)

Branch `exp/DX-XQ4-commit-index`, from `exp/DX-INT1` `9e02cf1d2` with step 0 (`exp/DX-XQ3-id-lists` `1308d44d8`)
merged. Design: the private `research/2026-11-24-cross-subject-questions/DESIGN.md` (sections 7, 8, 10 to 13). Every
time on this page is from the Mac lab VM and is diagnostic; counts, differences and refusals are the result.

Everything is behind **`TX2_CROSS_INDEX=1`** (default off). With the option off no new function is reached, the new
routes answer 409 `IndexOff`, and the paired log of a deterministic workload is identical to the base gateway's (G8).

## What was built

| Part | Where | What it does |
| --- | --- | --- |
| Declaration | `cross_find.clj` `declare!`, `POST /v2/db/{db}/index-declaration`, `GET` the same path; SDK `declareIndexes`, `indexDeclaration` | Stores the declaration's JSON on the system entity `_triplex/index/declaration` with the fence `:triplex.ix/seq`. The four attributes (`:triplex.ix/declaration`, `:triplex.ix/seq`, `:triplex.ix/entry` indexed string cardinality many, `:triplex.ix/epoch`) are installed by the route, never added to `schema/schema` (the schema hash is unchanged). Refuses: option off (409 `IndexOff`), protected attribute (409 `ProtectedValueLookup`), `json` or `blob` (400 `ValueFamilyNotIndexable`), a reused code or attribute (409 `DeclarationConflict`), any removal or change of an existing attribute or type (409 `DeclarationConflict`), the covering owner head (409 `OwnerLayoutUnsupported`). |
| Entries | `cross_index.clj` `tx-ops`, called at the end of `storage/tx-data` | One `[:db/add "e:<entity>" :triplex.ix/entry key]` per fresh live row of a declared attribute; one `[:db/retract eid :triplex.ix/entry key]` per retired fact, its key computed from the fact's **stored** row text on the write gateway's peer (never the client's copy); a type entry when the peer lacks it; `[:db/cas decl :triplex.ix/seq s s]` on every save. The ops ride in the prepared `:ops`, so the general writer, the per-subject writer (through `render-ops`, which now addresses entries to the numeric owner, and its eligibility, which admits entry ops), retirement markers, the import encoding (`freshTexts`) and group commits all carry them. Stored functions are unchanged. |
| Peer catch-up | `storage/commit!` | When the write gateway's peer does not yet hold a retired fact's text (`IndexPeerBehind`), it syncs once and prepares again (2 s bound). |
| Group commits | unchanged code | The reference group path (`group/evaluate`, `materialize`) already nets an add and a retract of the same datom in one physical transaction; the gate proves it for an entry. The prepared PREP1 path (`TX2_PARALLEL_PREPARE`) declines saves carrying entry ops (its `small-op?` is unchanged), so they take the reference path. |
| Backfill and epoch | `cross_find.clj` `backfill!`, `POST /v2/db/{db}/index-backfill`; SDK `backfillIndex` | An offline reconciliation of every entity's entries with its live rows (adds missing, retracts extra; type entries only added), in batches of `batchDatoms` (default 4,000) each fenced by the declaration seq and each entity's revision; the head is checked before every batch and at the end (409 `BackfillRaced` if a save was admitted; nothing sealed). Restartable and idempotent. When sealed it writes `:triplex.ix/epoch` "code position" for every code (and `T:<type>`) that had none. `dryRun: true` reports the reconciliation without writing (G2). |
| Find | `cross_find.clj` `find!`, `POST /v2/db/{db}/find`; SDK `find` | The contract of design section 7.5: `from` a type (entries or ID pattern) or an ID prefix (with step 0's shape grammar), up to four ANDed conditions (`eq`, `in`, `range`, `prefix`, `exists`, `missing`), `project` up to four declared references, `result` `ids`, `count`, `countByValue`, `countDistinct` (`of` names the attribute), order by entity (asc or desc) or by the range attribute, limit 1 to 1,000, bounds (100,000 entries, 100 ms, 512 segment loads by default; caps 1,000,000, 1,000, 4,096) with a cursor and `stopped`, never an error on a bound. Bases: head, `atLeastPosition`, a recorded position (a commit boundary), a record time; any `validAt`. Every answer has `position`, `t`, `validAt`, `head`, `indexEpoch`, `trailingBy: 0`. One question per account at a time on **step 0's permit pool** (`ids/permits`, `ids/running`, `TX2_INDEX_QUERY_PERMITS`, default 1): 503 `IndexBusy` with `retryAfterMs`. |
| Removal guard | `erase.clj` `declare!` | Protecting an attribute that is declared is refused (409 `ProtectedValueLookup`). |
| Aging loader guard | `age1/src/triplex/age/native.clj`, `bulk.clj` | The loader refuses a database that declares the index (it writes rows directly and no entries). |
| Launchers | `stack/up.sh` (`DX_CROSS_INDEX`, passed to both gateways only when set), `v01/run.ts` (`--cross-index off|<declaration.json>`) | The S-2 card pair. |
| Server runners | `xq1/server.ts` `backfill`, `bench`, `verify`, `declare`; `xq1/declarations/deep-6.json`, `fields-k3.json`, `fields-k20.json` | S-1 and S-3, S-2's preflight, and a declaration without a backfill for the XQ2-shaped write pair. Not run (no server). |

### The key (as built)

```
value entry, open:    account ␁ code ␁ family+value ␁ O ␁ entity-local ␁ fact ␁ valid_from16 [␁ L]
value entry, closed:  account ␁ code ␁ family+value ␁ C ␁ valid_to16 ␁ entity-local ␁ fact ␁ valid_from16 [␁ L]
type entry:           account ␁ T ␁ entity-type ␁ entity-local
```

␁ is U+0001. Texts escape U+0000 to U+0002 as U+0002 followed by the character plus 3, which keeps byte order equal to
text order. Families: `s` string, `r` reference (target ID), `i` integer (sign, length, digits; any size), `n` number,
`d` datetime (16 hex digits of the IEEE bits, order-preserving, -0.0 written as 0.0), `b` boolean, and `j` / `x` for a
json or blob value of a declared attribute (no value: `exists` and `missing` see it; nothing else matches it). A text
over 200 characters is keyed by its first 200 (never splitting a surrogate pair) and marked `L`; a marked entry is
confirmed against its fact's row. Account token `:system` for `_triplex/` entities (request account `_system`, as in
step 0); an entity without an account prefix gets no entry.

### Where this differs from the XQ2 spike's form (`exp/DX-XQ2-index-cost` `c2c81a638`), and why

| | XQ2 spike | Step 1 as built | Why |
| --- | --- | --- | --- |
| Entry | One tuple datom per family `[account attribute value entity valid-from valid-to row-id]` | One composed string (above) | One attribute for every family; no 256-character limit (long texts are keyed by 200 and confirmed, never refused); open and closed intervals sort apart, so "valid now" never reads old closed entries of the same value (XQ2 read 80 extra of 1,860 in one case). |
| Retired fact's entry on the general writer | Computed from the stored row text inside the serial function (the function text changes with the option on) | Computed from the stored row text on the write gateway's peer; the stored functions are unchanged | The design's rule (stored functions unchanged); the text of a fact ID never changes, so the peer's copy is exact; a peer that lacks it syncs (`IndexPeerBehind`). |
| Group commits | Refused with the option on | Carried; the reference path nets an add and retract of one entry; PREP1's prepared path declines | Gate case `XQ4_GROUP_CANCEL` and G1 after 941 of 960 saves committed in groups of up to 8. |
| Fence, epoch, backfill | Not built | Built (declaration seq fence on every save, per-code epoch, offline reconciliation) | The design's contract. |
| Holder | Row's own entity (twin entity measured worse: 354 B against 214 B per entry, no writer-time gain) | Row's own entity | XQ2's numbers. |

## The independent review (`REVIEW-FABLE.md`, read at about 11:40), finding by finding

| # | Finding | Verdict | Evidence or reason |
| --- | --- | --- | --- |
| E1 / A4 | Every candidate's entity read, even for one filter | **Confirmed and fixed** | `find!` now answers from the index alone when the conditions allow: every `eq` and `in` and `from` (prefix, shape, ID pattern) are entity-ordered streams intersected by a merge; the entity number comes from the index datom (no lookup by ID); a single `range`, `prefix` or `exists` is answered from its scan with an in-request set (one entity read per candidate only on later pages of a value-ordered scan). Each answer states `indexOnly` and `entityReads`. Gate `XQ4_E1`: E1_COUNTS |
| E2 | "Not deleted" as a per-entity `missing` check | **Confirmed; answered by declaration, no code** | A `missing` condition needs the entity's own entries (stated). A declared positive flag (for example `:x/live` = true, boolean) is an `eq` and merges with no entity read (`XQ4_E1` "count two eq merged"). |
| B3 | Unbounded closed part for a past valid time | **Confirmed and fixed (bounded, not cached)** | The closed part is read lazily under the entry and time bounds (every index datom is counted where it is read). A page whose closed part alone exceeds the bounds stops with its cursor unchanged; raise the bounds (caps 1,000,000 entries, 1,000 ms) or ask nearer now. |
| E4 | Descending value order refused | **Confirmed and fixed** | `order: {by: <range attribute>, direction: "desc"}` scans with `rseek-datoms`. Gate: paged descending answer equal to brute force (`XQ4_E1`). |
| D5 | Regular-expression key split | **Confirmed and fixed** | Hand-written split on U+0001; the key tests pass (`cross-index-test`). Per-entry time not re-measured. |
| D6 / D7 / C4 | One question per account, 503 when busy; one permit for all accounts | **Confirmed and fixed (queue); the permit default stated** | Each account has a fair queue of one running question; the permits (`TX2_INDEX_QUERY_PERMITS`, default 1, shared with step 0's ID route) are taken fairly; 503 `IndexBusy` only after waiting the request's own time bound. With the default of 1 every account's index questions share one reader core: an option to raise. Step 0's route keeps its own per-account refusal (its `running` set); a find and an ID list of one account can now overlap, each holding a permit. |
| D1 | The backfill sends every pinned read of an indexed subject to as-of | **Confirmed and fixed** | `XQ4_D1`: after a backfill that added 2,393 entries, the original check keeps 0 of 200 subjects on the fast route; with the fix 200 of 200 before and after, rows identical. The check is installed from the index namespace (see "stored-function identity" below). |
| B2 | No fence before the first declaration | **Confirmed and fixed** | With the option on, the declaration entity with sequence 0 is installed when a scope is opened and before a save is prepared; every save carries the fence. Remaining gap: two gateways' very first saves before either installed it. |
| D3 | Entries invisible to frame bounds and the write budget | **Half confirmed: the budget sees them; frame bounds do not** | The entry ops are in `:ops`, which `write-policy/variable-us` prices: `XQ4_BUDGET` +12 ops, +540 µs estimated for 6 replaced values, rows unchanged. `group/bound-frame!` and the 96-row bulk cap count rows and bytes only: a 96-row frame can carry up to 96 value and 96 type entries. Not changed (it changes import frame sizes). |
| D2 | A gateway read of the stored row per retired fact on the general writer | **Confirmed, not changed** | One EAVT seek on the owner per retired fact on the write gateway (outside the single writer). On the per-subject writer it is the same datom the planner already reads. Computing it inside the commit function would change the stored function, which the design forbids. Not counted on the toy (warm): a server item in S-2 (gateway reads per save). |
| B4 | 503 `IndexPeerBehind` for a fact that never existed | **Confirmed and fixed** | After one catch-up, a fact still absent gets no index operation and the commit function refuses the save as before (409). |
| B5 | Accounts stored as facts get no entry, silently | **Confirmed and fixed** | The declaration is refused with 409 `AccountNotInEntityId` when any entity ID lies outside `acct/`, `_triplex/` and `_tx/` (four probes of the ID index). `XQ4_B5`: refused. |
| B6 | `from: {type}` by ID pattern finds nothing on loader data (no entity type on rows) | **Confirmed by reading; stated** | The type check reads rows' entity type. On the sealed 1 billion copy, list by `from: {prefix, shape}` (S-3's Q3 does). |
| B7 | No settlement frames and no 100-value save in the gate | **Half fixed** | 20, 50 and 100 replaced declared values in one save: +40, +100, +200 datoms exactly, 0 reads inside apply on and off (`XQ4_LARGE_SAVES`); the spike's 4 to 5 reads were not reproduced in this form (single samples there; the twin-entity and tuple arms differ). Publish settlement frames: not in the gate (the settlement writer is on `exp/DX-ACT4`/`ACT5`, not on this branch). |
| B8 | Cursor unsigned | **Confirmed and fixed** | HMAC-SHA256 under `TX2_INDEX_CURSOR_SECRET` (else a key made at start). An edited cursor is 409 `CursorMismatch`. Step 0's cursor is still unsigned. |
| C2 | `_system` "internal callers only" not enforced | **Confirmed; stated** | The gateway has no caller identity on any route; both routes accept `_system` from any caller, which reads only `_triplex/` entities (no business data). |
| B1 | Release-written values settle in the background | **Design rule, not built** | Until a settlement rule exists, no attribute a release writes may be declared (a declaration list for the product must leave them out). Not enforced in code: the gateway does not know which attributes releases write. |
| E3 | Declarations database-wide, 64 attributes | **Stated** | Per-account declarations need the key's code to be per account (the account token is already the key's first part), a declaration entity per account, and a per-account epoch and backfill (walking one account's IDs); the find route would read the account's declaration. About a day; not built. |
| A5 | Backfill at 1 billion under-predicted | **Confirmed in part and changed** | The backfill now walks business and system entities through the ID index (no journal entities), decodes only rows of declared attributes or listed types, and has no per-entity revision CAS (head checked before every batch and at the end). The indexing jobs that absorb the entries are unchanged. New prediction below (S-1). |
| A1 | The 0.6 to 1.0 ms conversion used whole-commit latency | **Accepted as stated by the coordinator** | Corrected 0.36 to 0.69 ms for three values on the general writer; S-2 is judged against the owner's bars (below). |
| F4 | A slow exact route for refused positions | **Next step, not built** | Positions before the epoch and inside grouped commits are refused here; an ID list then each subject's exact read would answer them. |
| String key against the spike's tuple on the real transactor | | **Not measured** | Not run on the spike's harness; the toy numbers here (XQ4_COST) are for the string form only. |

### Stored-function identity: a hazard this build found in the base

The stored commit and per-subject functions are identified by a hash of their code text, and that text contains
symbols generated at compile time (`or`, `and` and syntax-quote expansions) numbered by a counter shared with
everything compiled before them. My first build required the index namespace from `erase.clj` and `subject_save.clj`
and edited `pinned.clj`, all compiled before `commit.clj` or before the per-subject function: with the option off the
gateway produced different function identities (`:triplex.write/v-4882…` against the base's `v-007b…`), so it would
have installed new function versions on every existing database. Fixed by keeping every change out of what compiles
before those two (the erase check moved to `main.clj`, the per-subject writer resolves the index late, the pinned
check is installed from the index namespace). G8's paired log is now identical. **Any branch that edits a namespace
compiled before `commit.clj` or `subject_save.clj` has the same hazard;** the paired log hash is the test for it.

## Gates (toy, Mac, one ordinary heavy token per run, no lease)

GATES_TABLE

## Cost on the toy, in counts, beside the design's predictions

Twin scopes in one database server (one declared with `declaration-2`, one not), the same saves alternating which
goes first, 100 saves per cell, the transactor restarted before the measure (`XQ4_COST`, run `world2`). Keys on the toy
are about 66 characters (short IDs); production keys are about 120 to 130. Datoms and bytes are counts; apply time is
the transactor's own `api-ms`, diagnostic.

| Declared values replaced per save (writer) | Datoms per save off → on (design: +2k) | Log value bytes per save off → on (index bytes) | Reads inside apply per save, first touch off / on | Second save off / on | Apply ms median, first touch off / on (diagnostic) |
| --- | --- | --- | --- | --- | --- |
| 1 (per-subject) | 21 → 23 (+2) | 1,821 → 1,953 (+132; entries 132 B) | 0.02 / 0.02 | 0 / 0 | 1.13 / 1.15 |
| 3 (per-subject) | 25 → 31 (+6) | 2,804 → 3,233 (+429) | 0 / 0 | 0 / 0 | 0.72 / 0.78 |
| 6 (general) | 31 → 43 (+12) | 4,299 → 5,139 (+840) | 0 / 0 | 0 / 0 | 0.94 / 1.10 |
| 20, 50, 100 in one save (general, 5 saves each) | 59 → 99, 119 → 219, 219 → 419 (+2k exactly) | | 0 / 0 in all 15 | | noisy (2 to 8 ms either arm) |

Against the design's section 8.1 predictions: datoms exact (+2 per replaced value, +3 for "change from now", +n+1 for a
new entity with n values and a type entry, 0 for k = 0: `XQ4_G6`); log bytes +132 B per replaced value on 66-character
keys (design +250 to 400 B on 110 to 170-character keys, XQ2 290 to 410 B on production-length keys; consistent
per character); reads inside apply +0 (design +0 to 0.05; XQ2 +0.05 with spread 0.12 on a toy whose subjects span more
segments). The toy's cache holds every segment after the first cohort, so first-touch reads here say little: XQ2's
4,000 × 160 world is the better toy number, and S-2 the real one.

## Departures from the design, and why

1. **Retractions are computed from the retired fact's stored text, not from the entity's current entries.** The design
   (7.3) reads "the entity's current entries whose key ends with that fact ID" on the peer. In the code the key does not
   end with the fact ID (the design's own layout ends with `valid_from`), and a peer that has not seen the fact's
   creation would see no entry and miss the retraction while the serial point still accepts the save. A fact's row text
   never changes for its ID, so its key is a pure function of the text and the declaration; the peer reads the text
   (EAVT of the entity, then by ID in history), and a peer that does not hold it syncs once (`IndexPeerBehind`, 2 s).
   The client's copy of a retired row is never used (the gate's saves send deliberately wrong copies).
2. **Datetime has its own family letter `d`** (the design writes numbers and datetimes as `n`). `query/compare-op`
   never matches a number with a datetime, so one letter would let `eq 5.0` match a datetime of 5.0.
3. **json and blob values of a declared attribute get a valueless entry (`j`, `x`).** Without one, `exists` and
   `missing` would disagree with the rows. The declaration still refuses a json or blob family.
4. **Declarations only grow.** Changing or removing an attribute, a code or a type is refused (409
   `DeclarationConflict`), so no stale entry can ever be read under a reused code. Removal waits for step 4.
5. **The backfill is a reconciliation** (adds missing, retracts extra, per entity, fenced by the entity's revision and
   the declaration seq, head checked before every batch and at the end), so it is restartable and also serves as the
   G2 check (`dryRun`). Type entries are only added: an entity whose rows of that type were all retired before the
   backfill gets none, where a writer-built index keeps its candidate entry (pages verify candidates either way).
6. **The epoch is a position plus the `t` of its datom.** A question at exactly the epoch's position (the head when
   the backfill sealed) reads the database as of the epoch `t`, which holds the same rows; earlier positions are
   refused with the epoch position as `maximum` (the first answerable position).
7. **Order by entity with only a value-ordered condition** (`range`, `prefix`, `exists`) and `result: "ids"` is refused
   (400 `UnsupportedOperation`) instead of sorting an unbounded set; without `order` such a question pages in value
   order and the answer says so. Counts are unaffected. A value-ordered scan lists each entity once, at its least
   matching key, so pages never repeat an entity.
8. **`countByValue` and `countDistinct` take the attribute in `of`** (the design names no field). Their partial state
   travels in the cursor, capped at 10,000 values and 100,000 distinct targets (`stopped: "limit"` beyond).
9. **`from: {prefix, shape}`** accepts step 0's shape grammar, so the bench's Q3 lists subject roots without reading
   rows. `from: {type}` with an ID pattern reads each candidate's rows to verify the type (as `entityPage` does).
10. **The prepared (PREP1) group path declines saves carrying entries** rather than learning to render them; such saves
    take the reference group path, whose netting already cancels an add and a retract of one entry (gate case).
11. **The covering owner head is refused** at the declaration, at `find` and at commit with a declaration present
    (409 `OwnerLayoutUnsupported`), as the design says; it is not tested beyond the refusal.
12. **The brute force of G1 is Clojure in the gate JVM, not TypeScript.** It reads every row of the scope through
    `storage/read-rows` at the same basis and evaluates conditions on plain values with its own code; it shares no
    function with the index.
13. **S-3's old pin 87,002 cannot be answered** by the design's own epoch rule (it is before the backfill of the sealed
    copy). The bench pins the head and the epoch position instead; "far behind the head" needs saves after the epoch
    (the S-2 pair's copy has them).
14. **The aging loader refuses an indexed database** (design section 12) instead of learning to write entries.

## Server commands (none run; each needs the owner's approval of a rental)

All three run on one bare-metal server from a build of this branch (`DX_V01_BUILD_RECEIPT`), Docker at
`/var/run/docker.sock`, the sealed 1 billion copy stopped at `$AGED_PGDATA_SOURCE`. Total about 4 to 4.5 hours of one
server including copies, about $5 at $1.09 per hour.

**S-1. Backfill of the sealed 1 billion database, with exactness samples** (90 to 240 min: copy 7 min, start 2 min,
backfill 45 to 150 min, indexing job 30 to 90 min, samples 5 to 10 min; the review's estimate of 2 to 4 hours for the
first build is lowered by skipping journal entities, decoding only declared rows and dropping the per-entity CAS, but
the indexing jobs are not measured by anyone):

```bash
cp -a --reflink=auto "$AGED_PGDATA_SOURCE" "$PGDATA_COPY"   # a private copy; it becomes $BACKFILLED_PGDATA
sudo "$NODE22" --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq1/server.ts backfill \
  --commit "$COMMIT" --declaration lab/experiments/EXP-DX1/xq1/declarations/deep-6.json \
  --aged-bundle "$AGE_HANDOFF_JSON" --aged-bundle-sha256 "$AGE_HANDOFF_SHA256" \
  --pgdata-source "$AGED_PGDATA_SOURCE" --pgdata "$PGDATA_COPY" --out "$OUT/backfill" --verify-samples 1000
```

Predictions, written before any run: value entries 17.9 million ± 5% (the design's count for deep-6); type entries 0 to
5.7 million (one per task if the loader's tasks carry the entity type `Review`; the toy cannot say); stored bytes per
entry after the indexing job 230 to 330 B (XQ2: 274 B with production-length keys); backfill 25 to 75 min; samples: 0
mismatches in Q1 and Q2 for 1,000 sampled subjects in each of the ten accounts; the dry-run reconciliation after
sealing: 0 to add and 0 to retract. **Wrong if:** any sample mismatch or a non-zero dry run (stop: nothing ships); the
backfill and indexing job together over 4 hours (then online, per-account backfill becomes the first version's); bytes per entry over 600 B; value entries outside 17.0 to 18.8 million (the design's count is
wrong, which changes every size forecast).

**S-2. The save pair on the backfilled copy** (about 100 min, two arms of about 50 min). Preflight (2 min):
`server.ts verify --commit "$COMMIT" --declaration lab/experiments/EXP-DX1/xq1/declarations/deep-6.json --aged-bundle
"$AGE_HANDOFF_JSON" --aged-bundle-sha256 "$AGE_HANDOFF_SHA256" --pgdata-source "$BACKFILLED_PGDATA" --pgdata
"$PGDATA_COPY_V" --out "$OUT/verify"`. Then, each arm on its own copy of `$BACKFILLED_PGDATA` (remove the copied
`.triplex-v01-used` marker from each copy):

```bash
"$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" --out "$OUT/pair-<off|on>" --arm 1 \
  --age 1B --tape production-S --profile server-32 --credit-mode rolling6 --window-seconds 300 \
  --cross-index <off|lab/experiments/EXP-DX1/xq1/declarations/deep-6.json> \
  --jvm j21-g1 --write-jvm j21-g1 --tx-jvm j25-zgc --wal-directory "$SCORECARD_WAL_DIRECTORY" \
  --aged-bundle "$AGE_HANDOFF_JSON" --aged-bundle-sha256 "$AGE_HANDOFF_SHA256" \
  --pgdata-source "$BACKFILLED_PGDATA" --pgdata "$PGDATA_COPY_ARM"
```

The design's `--reader tuned --read-permits 12 --loads 235,394 --tape production-S-noburst` come from
`exp/DX-CARD2-reader-setting` and `exp/DX-S1-save-shape`, which are not on this branch: run S-2 from the merge of the
three, adding those flags. Predictions (on minus off, second half of each cell): datoms per save +1.5 to 2.5 (the toy
measured exactly +2 per replaced declared value, +0 for a save with none); log bytes per save +300 to 800 B (toy +132 B
per replaced value with short keys; XQ2 290 to 410 B with production-length keys); reads inside apply per save +0 to
0.05; commit p50 +0.05 to 0.4 ms, p99 +0 to 3 ms; stored rate unchanged. **The XQ2 writer-time slope (0.12 ms per
replaced value on the Mac general writer, a server estimate of 0.2 to 0.33 ms) puts a 3-value general-writer save at 0.6
to 1.0 ms, at or over the design's 0.5 ms line;** so the pair must also report apply time by writer and by k (the card
records the writer per save; k comes from the declared attributes in each save's rows). **Wrong if** any of section 6's
three numbers is crossed: more than 0.5 ms of writer time per save for 1 to 3 declared values, more than 0.2 extra
reads inside apply per first touch. **Judged against the owner's bars, as the review asks:** with the index on, save
median over 10 ms or p99 over 50 ms in a cell where the off arm is inside them, on repeated 600 s cells (`--window-seconds
600` where the card allows it, else two 300 s cells per load), with indexing-job time, segments written per job and
writer allocation stalls recorded from the transactor's metrics. The design's "p99 5 ms worse" clause is smaller than
the spread between runs at 1 billion (40.6 to 55.6 ms) and is not used. Then the value index moves to the feed-built
index (design section 6).

**S-3. The question bench** (40 to 60 min):

```bash
sudo "$NODE22" --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq1/server.ts bench \
  --commit "$COMMIT" --aged-bundle "$AGE_HANDOFF_JSON" --aged-bundle-sha256 "$AGE_HANDOFF_SHA256" \
  --pgdata-source "$BACKFILLED_PGDATA" --pgdata "$PGDATA_COPY_B" --reader tuned \
  --questions q1,q2,q3,q4,q5 --accounts 3,4 --pins head,epoch --valid now,minus30d --cold-and-warm \
  --quiet-account 7 --out "$OUT/bench"
```

Predictions: the design's section 8.3 table (first pages 1 to 5 ms warm, 8 to 50 ms cold; Q1 count 30 to 120 ms warm;
Q4 full count 0.15 to 0.5 s warm in pages; Q5 40 to 150 ms warm), the epoch pin within 1.2 to 4 times the head (the
copy has no saves after its epoch, so here it should equal the head), valid 30 days ago within 1 to 1.2 times now,
quiet-account pinned-read p99 ratio at most 1.15 beside a cold Q4 count. **Wrong as in the design's section 8.5:** a
first page above 20 ms warm or 100 ms cold at p99; counts slower than 1 µs per entry warm or 10 ms per 1,000 entries
cold; the quiet ratio above 1.25 and above its absolute bar.

**The XQ2-shaped write pair (about 1, 3 and 20 declared values per save, comparable with XQ2's page):** on a copy of
the fresh template, `server.ts declare --declaration lab/experiments/EXP-DX1/xq1/declarations/fields-k3.json` (and
`fields-k20.json` on a second copy; set `DX_XQ4_DATABASE` and `DX_XQ4_ACCOUNTS` for a copy without an AGE1 bundle),
then XQ2's `prep1/server.sh production-s` command with `DX_CROSS_INDEX=1` in place of `DX_ATTRIBUTE_INDEX` on each
declared copy and on an undeclared one (off), about 20 min each. Predictions against off: datoms per commit +5 to +6
(k3) and +30 to +34 (k20), as XQ2's; warm serial apply +0.36 to 0.69 ms (k3) and +2.4 to 4.6 ms (k20) (the corrected
conversion); reads per commit from 150 s +0 to 0.1; stored rate unchanged. Wrong if k3 apply is more than 1.0 ms over
off. Not dry-run: `prep1/server.sh` was not checked for passing `DX_CROSS_INDEX` through to `stack/up.sh`.

**The pairs still owed for the writer, from XQ2's numbers:** the general writer and the per-subject writer, index off
against on, k = 1 and k = 3, are inside S-2's card (one commit per subject's save mixes both writers). If the card's
per-writer split is too thin, run the save-size ladder of `exp/DX-S1-save-shape` with `DX_CROSS_INDEX=1` on the
backfilled copy (about 35 min), predicting +0.12 to 0.33 ms of apply per replaced declared value on the general
writer and no measurable change on the per-subject writer.

## What is not verified

- **Nothing on a server.** S-1, S-2 and S-3 were written, not run; every time on this page is the Mac's.
- **The hint options were not combined with the index.** `TX2_GENERAL_PREFETCH` (W3) and `TX2_SUBJECT_HINTS` (W4) are
  not on `exp/DX-INT1` or this branch. By reading their code: the index adds, inside apply, Datomic's redundancy check
  of `[owner :triplex.ix/entry key]` (EAVT of the owner, the entity whose rows the commit already reads) and the
  declaration's CAS (one datom every save reads, always cached); nothing reads AVET inside a transaction for a
  non-unique attribute. W4's lookup function names the owner's row and revision datoms but not the owner's
  `:triplex.ix/entry` range; W3's names the commit function's reads. So the entries cost nothing inside apply when the
  owner's entries share a segment with its rows (the toy: reads inside apply unchanged), and are **not hinted** when
  they do not. The fix, for whoever merges W3 or W4 with this: one more touch per owner in each lookup function,
  `(touch (d/datoms db :eavt owner (a :triplex.ix/entry)))`, and one of the declaration entity. Not built here (neither
  function is on this branch).
- **The existing heavy gates with the index on.** The production exactness gate and the loader-aged production gate
  build or reuse shared image tags and fixed ports and create their own scopes; they were not run with a declaration in
  their scope (the aging loader now refuses an indexed database by design). The option-off evidence for them is the
  paired log identity and the suites below.
- **Online backfill, uniqueness, Datalog with a variable entity, `match` routing, the roots query:** steps 2 and 4.
- **Bulk import frames:** the 96-row and 64 KiB frame bounds (`group/bound-frame!`, `write-policy`) count rows and
  request bytes, not entries; a 96-row frame of declared values carries up to 96 value entries and up to 96 type
  entries (+192 datoms) that no frame bound sees. The write budget estimator does see them (they are in `:ops`; gate
  `XQ4_BUDGET`). Not measured at full size.
- **Type entries are never retracted** (design section 12): a type list is a candidate list, verified per candidate.
- **Removal on request with a sealed scope** was gated unsealed (`XQ4_G3_SEALED=0`); the sealed variant is the same
  code path for the index (protected attributes are never keyed) but was not run.
