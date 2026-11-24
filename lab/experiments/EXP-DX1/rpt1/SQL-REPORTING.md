# A reporting copy in PostgreSQL, fed from the store's journal (DX-RPT1, 2026-11-24)

Builder DX-RPT1, branch `exp/DX-RPT1-sql-reporting` from `origin/exp/DX-INT1` `9092eb79d`. Written before any code
(17:09 EST); section 9 holds the results once the gates have run. Mac work is correctness and counts at toy size; every
Mac time is diagnostic. Nothing runs on a server. All accounts stay in one Datomic database. Datomic is not modified.

## 0. The answer

**A SQL tool connects to a separate PostgreSQL database and reads one view per entity kind, one row per entity, one
column per attribute, holding exactly what the store holds at a stated position.** A projector process follows the
store's journal (the ordered change log every save writes), and applies each journal entry once, in the same SQL
transaction as the watermark that says how far the copy has got. Protected values are never copied: their columns are
present and always null. A reporting login sees only its own account's rows.

```
 saves ──► Datomic (one database, every account)
                 │  journal pages, read gateway, read-only, "omitProtected": true
                 ▼
        projector (TypeScript, its own process) ── one SQL transaction per page:
                 │                                     rows + retirements + watermark
                 ▼
  PostgreSQL "reporting" (its own instance, never Datomic's storage)
     rpt.facts        one row per assertion: account, entity, kind, attribute, typed value,
                      valid from/to, recorded position, retired position (the whole history)
     rpt.entities     one row per entity: account, entity, kind
     rpt.feed_state   watermark: position, store record time, applied time  ◄── same transaction
     report.<kind>    generated views: one row per entity, one column per attribute,
                      at the watermark (or a chosen position) and valid now (or a chosen instant)
     row-level security: a login granted account A reads only account A's rows
```

**Three queries a dashboard author writes** (logged in as account A's reporting login; no account filter needed):

```sql
-- 1. Tasks by status, now.
SELECT status, count(*) FROM report.task GROUP BY status ORDER BY count(*) DESC;

-- 2. Open tasks past due, with the assignee's name (a join across kinds by reference).
SELECT t.entity, t.due, s.name
FROM report.task t JOIN report.subject s ON s.entity = t.assignee
WHERE t.status IN ('pending', 'requires_action') AND t.due < now()
ORDER BY t.due;

-- 3. What this subject's record looked like on 1 October (valid time), as the store knew it then or now.
SELECT set_config('rpt.valid_at', '2026-10-01T00:00:00Z', false);
SELECT * FROM report.subject WHERE entity = 'acct/<account>/pl:00000012';
```

Every view also answers "through which position and time is this": `SELECT * FROM rpt.watermark;` gives the position,
the store's record time of the newest applied entry and when it was applied.

## 1. What the copy is

**A projector process and five tables in a schema `rpt`, plus one generated view per kind in a schema `report`.**

The projector reads `POST /v2/db/{db}/transactions` on the read gateway with `"bounded": true` (JRN1's bounded pages,
merged) and `"omitProtected": true` (new, section 3). Each page holds whole journals in position order; each journal
holds its `:_tx/change` records: `op` (`assert`, `retract`, `erase`), assertion ID, entity, attribute, kind, value,
valid interval and record time. This journal is the store's ordered change feed of record (TARGETS P3 must-have: "the
log of record is the feed"); the identity-only `/v1/db/{db}/log` feed carries no values, so it cannot feed a copy.

**Table shape: both (a) and (b), with (b) as views over (a).**

| | (a) narrow facts table | (b) per-kind wide tables, materialised | **chosen: (a) plus (b) as generated views** |
| --- | --- | --- | --- |
| What a dashboard author writes | joins and pivots by hand | `SELECT status, count(*) FROM task` | the same as (b) |
| History ("record on a date") | exact, both axes | lost unless every version is kept | exact, both axes, through the same views |
| "Valid now" | exact at query time | goes stale when a valid interval ends with no save (a future-dated value, a value valid until a date) | exact at query time |
| New attribute or kind | nothing to do | `ALTER TABLE ADD COLUMN` on a big table, plus a backfill | `CREATE OR REPLACE VIEW` (metadata only) |
| Changed value type | nothing to do | rewrite or second column | second column, `<name>__<type>` |
| Cost per query | the author's pivot | one row read per entity | one index probe per entity and referenced column |
| Cost per save | 1 row per assertion | 1 row update per entity changed, plus the facts table for history | 1 row per assertion |

The views compute each column with a scalar subquery against `rpt.facts` (account, entity, attribute), so PostgreSQL
evaluates only the columns a query names. When a kind has an attribute with several visible values at once (allowed by
the store), the view's column shows the most recently recorded one; the narrow table and `rpt.facts_visible` keep all
of them, and the gate counts such cells. The materialised wide table is the later step if view cost at 1 billion is too
high (section 7 gives the switch point); the narrow table stays its source either way.

**Tables (column types follow the store's own row columns, so equality with the store is column for column):**

| Table | Rows | Key | Purpose |
| --- | --- | --- | --- |
| `rpt.facts` | one per assertion, every account, the whole history | `(account, assertion_id)`; index `(account, entity, attribute, recorded_position)` | `value_type`, `value_string`, `value_number`, `value_boolean`, `value_datetime`, `value_json`, `valid_from`, `valid_to`, `recorded_position`, `recorded_at`, `retracted_position`, `retracted_at`, `removed_position` |
| `rpt.entities` | one per entity | `(account, entity)`; index `(account, kind, entity)` | the base of each kind's view |
| `rpt.feed_state` | one per database followed | `database` | the watermark: `after_position` (every journal at or below it applied), store record time of the newest, store head seen, applied time, epoch |
| `rpt.account_state` | one per account rebuilt | `account` | `fence_position`: the account's rows reflect the store at this position; journals at or below it are skipped for that account |
| `rpt.columns` | one per (kind, attribute, value type) | | the generated column's name, type, status (`live`, `pending`, `protected, not copied`) |
| `rpt.commits` | one per (journal, account touched) | | position, transaction ID, record time, number of changes: time series of saves |
| `rpt.grants` | one per reporting login | role name | the one account that login may read |

Journal rows themselves (the `_Transaction` entities) are not copied as facts; `rpt.commits` keeps their position and
time. Entities outside `acct/<account>/` (Triplex's `_triplex/` configuration, settlement documents) go under the
account `_system`, which no reporting login is granted.

## 2. Exactness and position

1. **One page, one SQL transaction.** The transaction first locks `rpt.feed_state` (`SELECT ... FOR UPDATE`) and checks
   that its `after_position` still equals the page's `after`; it then inserts the page's assertions, sets
   `retracted_position` on retired ones, records removals, and moves `after_position` to the page's `next` (the bounded
   page's own statement that every journal at or below it was considered). Commit or nothing.
2. **Exactly once.** A crash before the commit leaves the watermark where it was, so the page is read again; a crash
   after it moves the watermark, so it is not. An assertion inserted twice violates the primary key and stops the
   projector with `DuplicateAssertion` (never silently ignored); a retirement that finds no live row stops it with
   `MissingAssertion`. Both mean the copy is wrong, so the answer is a rebuild of that account, never a skip.
3. **Two projectors at once** serialise on the watermark row; the second finds `after_position` moved, discards its
   page and reads on from the new watermark. Nothing is applied twice.
4. **Readers see a consistent cut**: a page's rows and its watermark commit together, so any statement sees the copy at
   one watermark; a multi-statement dashboard uses `REPEATABLE READ`.
5. **The views state their basis.** `rpt.at_position()` is the session's `rpt.position` if set, else the account's
   watermark; a position above the watermark raises `NotYetReported` (no answer for a basis the copy has not reached).
   `rpt.at_valid()` is `rpt.valid_at` if set, else `now()`.
6. **Restart and faults.** Transactor restart, gateway restart, `503` while a removal is being applied: the projector
   retries the same request with backoff; nothing is committed in between. **Store behind the copy** (page `head` below
   the watermark, as after a restore to an older point): `StoreBehind`, the copy refuses to move and rebuilds every
   account it knows at a new epoch. **Feed declined** (`declined` on the page): `FeedDeclined`, rebuild.
7. **Rebuild of one account, saves continuing.** (i) read the store's head `P`; (ii) list the account's entity IDs at
   `P` (`/v2/db/{db}/ids`, XQ3, needs `TX2_ID_LISTS=1` on the reader), read their whole history at `P` in batches of
   100 (`/v1/db/{db}/read` with `entityIds`, `history`, `omitProtected`) and stage the rows in `rpt.rebuild_facts`
   (bounded memory, no lock held); (iii) in one SQL transaction: lock the watermark `G`, delete the account's rows,
   move the staged rows in, and if `G > P` read journal pages `(P, G]` and apply only that account's changes; set the
   account's fence to `max(P, G)`. The projector, which locks the same row, applies that account's journals only above
   the fence. The initial build is the same step for every account named by the operator (the store has no list of
   accounts), or a replay of the journal from position 0 for a database whose journal is complete. **Limit at size:**
   step (iii) holds the watermark for as long as it moves the account's rows in, so every account's lag grows by that
   time (toy: 44 to 148 ms; a deep account at 1 billion: minutes, section 7). The fix, not built: during the move the
   projector records that account's changes in a side table instead of skipping them, the move runs in short
   transactions, and only the replay of the side table takes the lock.
8. **Lag** is stated and measured: entries behind (store head on the page minus the watermark) and time behind (the
   gateway's `availableAt` on the page minus the journal's record time, plus the projector's own apply time), per page.

## 3. Removal on request: protected values never enter the copy

**Decision: protected attributes are never copied. Their facts are present with identity, valid interval and record
positions (the shape the store itself keeps after a removal), `value_type = 'protected'` and every value column null.
Each kind's view has the column, always null, and `rpt.columns` marks it "protected, not copied".** Copying sealed
values was considered and rejected: the sealed token is useless to SQL (no filter, sort or display works on it), and
copying anything protected brings in PostgreSQL's own log and backups (below), which no delete can reach.

**Why this proves the one outcome that must be impossible.** "A removed value is recoverable from the reporting copy"
needs the value to have been in the copy. The store allows removal only of protected attributes
(`erase.clj` `matches`: `EraseNotProtected`), and the store's protected set is fixed at declaration and immutable
(`privacy.clj` `register!`: `ProtectionPolicyMismatch`). So if no value of a protected attribute ever reaches
PostgreSQL, no removed value is ever in its tables, indexes, TOAST, write-ahead log, replicas or backups. Two layers
make sure none reaches it:

1. **The gateway does not send them.** New request field `"omitProtected": true` on the journal page route and the row
   read route (default absent: every other caller gets byte-identical answers). With it, inside the same verified
   removal cut the request already uses (`privacy/*cut*`), every row of a protected attribute leaves with its value
   columns null and `value_type` `"protected"`, and every `:_tx/change` record of a protected attribute leaves with
   `"value": {"type": "protected"}`. This happens where `privacy/masked` already replaces removed values with the
   marker, so it covers sealed values (never unsealed for this request) and removed ones. The answer echoes
   `"omittedProtected": true`.
2. **The projector refuses anything else.** It refuses a page or read without the echo (`ProtectedOmissionMissing`),
   so a gateway without this change cannot feed it; it refuses a removal marker arriving as a value (the marker is only
   ever on a protected attribute); it refuses any later change of an attribute it has seen marked `protected` that
   arrives with a value (`ProtectedValueArrived`); and a removal naming an assertion whose value the copy holds stops it
   (`RemovedValueWasCopied`). A database with a refusal stops being followed; it is never skipped past.

A removal's own journal entry (`op: "erase"`) sets `removed_position` on the assertions it names, at the removal's log
position, so the copy can say "removed at position N" as the store's marker does. A rebuild reads rows, not removal
entries, so after a rebuild `removed_position` is empty for removals at or below the rebuild's position (the value was
never in the copy either way).

**What PostgreSQL's own log and backups make impossible to guarantee, stated plainly.** For any value that IS in the
copy, deleting or updating its row does not remove the old bytes from: the write-ahead log segments still on disk
(until recycled after a checkpoint), archived WAL and point-in-time-recovery archives, base backups and snapshots,
streaming or logical replicas and their WAL, dead row versions in the table and its indexes and TOAST until `VACUUM`,
freed space inside pages after `VACUUM` (it is not zeroed), the operating system's page cache and swap, and server logs
that print statement parameters on error. No SQL command reaches all of these. That is why protected values are kept
out, and why it holds only while the protected attribute set is right.

**What the product must do:**

1. Declare every attribute that may need removal as protected before the first save into the account's database
   (protection cannot be added later). An undeclared attribute is ordinary data in both the store and the copy, and
   neither can remove it on request.
2. Do not back up the reporting copy and do not archive its WAL: it is derived and is rebuilt from the store
   (section 2, item 7). Keep `wal_keep_size` and replication slots minimal. If backups are wanted anyway, their
   retention is the longest time an ordinary (unprotected) value of a closed account can survive deletion.
3. Keep `log_min_error_statement` at `panic` or `log_parameter_max_length_on_error = 0` on the copy, so a failed
   projector statement never prints values into server logs.

## 4. Tenant isolation: row-level security on shared tables

**Decision: every row carries its account; the tables have row-level security; each reporting login is mapped to one
account in `rpt.grants`; views are `security_invoker`, so the policy applies to the person querying.** The policy is
`account = rpt.my_account()`, a `STABLE SECURITY DEFINER` function reading `rpt.grants` for `current_user`, which the
planner evaluates once and uses as the leading index key. A login cannot change its own account: it is not a member of
any other login, and `rpt.grants` is not writable by it.

**What the logins share:** the names of kinds and attributes (view and column names, `rpt.columns`) are the same for
every login, because the views are shared. Values are not. If an account's own attribute names must be hidden from
other accounts, that needs per-account views (not built).

**One schema per account was rejected for 100,000 accounts:** about 10 relations per account (tables, indexes, views
per kind) is 1 million relations in the catalog; every new attribute or kind becomes 100,000 DDL statements; every
backend's relation cache grows with what it touches; autovacuum walks a million relations; `pg_dump` and planning slow
down. Row-level security keeps one set of tables, and the account is the first column of every index, so one account's
query reads only that account's index range.

## 5. Schema changes

The projector records each new (kind, attribute, value type) in `rpt.columns` with status `pending` in the same SQL
transaction as the rows, then, in a separate transaction with `lock_timeout = 2s`, replaces that kind's view with one
more column (`CREATE OR REPLACE VIEW` adding columns at the end: metadata only, no table is rewritten). If a running
reporting query holds the view, the replacement waits at most 2 s, then gives up with `ViewBusy` recorded in
`rpt.columns`, the old view keeps answering (exact for the columns it has; the new values are in `rpt.facts` already),
and the next page tries again. A changed type gets a second column `<name>__<type>`; the old column keeps answering
for entities whose value still has the old type. A new kind gets a new view. A kind with more than 1,000 attributes is
refused for new columns with `TooManyColumns` (PostgreSQL's limit is 1,664 per row) and keeps its old view.

## 6. Gates (toy; counts are results; times diagnostic)

Stack: this checkout's gateway on the lab VM (`stack/up.sh`, ID lists and the sweep on), started from one pinned
Datomic image ID recorded per container; the copy's PostgreSQL in its own container `tx2-dxrpt1-*-rpg` on its own port;
every container and volume removed after each run.

| Gate | What | Pass |
| --- | --- | --- |
| (a) Store unchanged without the projector | the same workload on two databases of one stack, one followed by the projector and one not | the write gateway's per-route request counts equal; the stored journals equal (same count, positions, change records modulo fresh IDs and clocks); the projector sent no request to the write gateway |
| (b) Exact after the workload | corrections dated in the past, retirements, an import, settlement frames (a release's writes in frames, as XQ6's gate), removals on request, a transactor restart, a gateway restart; accounts `account-003`, `account-0031` (prefixes each other) and `account-009` (empty) | every row of `rpt.facts` equal to the store's history read at the watermark, column for column, and nothing missing or extra; every kind view equal to the store's rows at the watermark at three positions and three valid instants; SQL counts, filters and groups equal to the sweep route's answers for XQ6's question shapes |
| (c) Kill after every page | the projector killed (SIGKILL) at a random point of each page, restarted, for the whole run | final tables equal to a clean run's, row for row |
| (d) Removal | scan of every file under the copy's data directory (tables, indexes, TOAST, WAL) and of `pg_dump` output for every protected value written | 0 occurrences; a control value of an ordinary attribute is found (the scan works) |
| (e) Isolation | a login per account, every table and view, plus a direct read of another account's entity | 0 rows of another account |
| (f) Lag | saves of the production shape at 20 to 40 per second for 60 s while the projector follows | entries and time behind per page reported (diagnostic) |
| (g) Rebuild one account while saves continue | rebuild of `account-003` during saves to it and to `account-0031` | exact at the end as in (b) |

**Predictions (written before running; all met, section 9):** (a) equal; (b) 0 differences; if the store records an assertion at a position
other than its journal's (a group commit's interior position or an import's own position), the facts comparison shows
it as a `recorded_position` difference and the projector must take the row's own position from the store; (c) equal;
(d) 0 protected occurrences, the control found at least once in the heap and once in the WAL; (e) 0; (f) on the Mac,
entries behind p99 under 50 and time behind p99 under 500 ms; (g) 0 differences.

## 7. Cost, forecast at 1 billion, and the server run

### 7.1 Measured on the toy (counts exact; times diagnostic)

| What | Measured (run `full2`, defaults) |
| --- | --- |
| Bytes per fact, `rpt.facts` | **409 B** (heap 170 B, indexes 234 B, TOAST about 0) over 7,457 facts |
| Bytes per fact, every table of the copy | **542 B** (`rpt.entities` 59 B, `rpt.commits` 33 B, catalogue tables the rest) |
| Projector CPU | 131 ms per 1,000 changes (one process replaying 930 positions, 7,547 changes) |
| Feed read per replay | 5 journal page requests of up to 200 journals; the read gateway examined 930 position entries in 8 bounded pages (1 per position, no walk) |
| Rebuild of one account (344 entities, 2,475 to 2,629 facts) | read and stage 186 to 259 ms; the swap under the lock 44 to 148 ms |
| Apply per page while following 25 saves/s | p50 11.5 ms, p99 36.6 ms |

Storage loads caused by the feed read are not counted (the journal route reports entries examined, not segment loads).

**Where the projector reads.** It should read from its own read peer (the question reader of the cross-subject design),
not the read gateway that serves the 256 pinned readers: a journal page holds the single journal permit while it
renders (the long-poll wait itself does not hold it), and a rebuild reads whole histories, which would evict the
product readers' cache as a sweep does (XQ6 section 4.2). Until that peer exists, one projector on the shared reader
holds the journal permit for one page at a time.

### 7.2 Forecast at 1 billion records (predictions, not measured)

| Quantity | As built | With two changes not built (integer codes for account, kind and attribute; one unique index `(account, entity, attribute, assertion_id)` instead of the primary key plus the entity index) |
| --- | --- | --- |
| Copy size per 1 billion facts | **410 GB** (`rpt.facts`), **540 GB** all tables, plus 10 to 30% if real values are longer than the toy's | 220 to 300 GB |
| Initial build, journal replay | 1 billion changes at 7,000 to 14,000 changes/s per projector core: **20 to 40 hours**; only for a database whose journal is complete (the loader-built 1 billion copy's is not) | the same |
| Initial build, by account from the store | a deep account of R facts: reading at about 0.3 to 1 ms per entity (1 to 5 million entity IDs in account-003) is 5 to 80 min; staging at 50,000 to 150,000 rows/s is R / 100,000 s (100 million facts: 11 to 33 min); the swap moves the rows again (as long again) and holds the watermark meanwhile | swap in short transactions (section 2, item 7) |
| Steady lag at the card's load steps (50 / 235 / 394 / 620 saves/s, about 6 facts per save, so about 300 / 1,400 / 2,400 / 3,700 changes/s) | projector CPU 2 to 50% of one core; time behind p99 = feed delivery (30 to 50 ms at 256 readers, P3) + one page's apply (20 to 80 ms): **under 150 ms at 50 and 235, 80 to 200 ms at 394, 100 to 300 ms at 620**; journals waiting when a page is read p99 under 10 / 30 / 60 / 100 | the same |

What would show the forecast wrong: apply p99 above 200 ms per page at 394 saves/s (index inserts on a table larger than
memory dominate; then larger pages and `COPY` instead of `jsonb_to_recordset`, or the compact index); lag that grows
through a 300 s step instead of levelling off (the projector cannot keep up at all on one core); pinned-read p99 more
than 10% worse with the projector following than without at the same step (the feed read reaches the product readers:
move the projector to its own read peer).

### 7.3 The server run (needs the owner's approval of a rental; nothing is rented)

One bare-metal machine of the card's type ($1.09 per machine hour), the sealed 1 billion copy restored as the card does,
this branch's gateway (for `omitProtected`), the ID lists on. The copy's PostgreSQL in its own container on cores and a
disk directory the stack does not use.

```bash
cd "$REPO" && git checkout "$COMMIT"            # head of exp/DX-RPT1-sql-reporting
pnpm install --frozen-lockfile --store-dir "$PNPM_STORE"
(cd packages/core && pnpm run build) && (cd packages/datomic && pnpm run build) && (cd packages/reporting && pnpm run build)
sudo env DX_ID_LISTS=1 DEMO_ORIGINAL="$SEALED_CLUSTER" DEMO_HANDOFF="$AGE_HANDOFF_JSON" bash demo/server-up.sh --reset
#   prints DEMO READY head=28309866 records=1000251169 ...; READ and DB below come from /var/tmp/triplex-demo/ready.json
docker run -d --name tx2-dxrpt1-srv-rpg --cpuset-cpus "$RPG_CPUS" --memory 24g -p 127.0.0.1:18983:5432 \
  -e POSTGRES_PASSWORD="$RPG_PASSWORD" -v "$RPG_DATA_DIR":/var/lib/postgresql/data postgres:17-alpine \
  -c shared_buffers=8GB -c max_wal_size=16GB -c log_min_error_statement=panic
export RPT_PG_URL="postgres://postgres:$RPG_PASSWORD@127.0.0.1:18983/postgres"
H=$(curl -s "$READ/v1/db/$DB/basis" | jq -r .position.v)
node packages/reporting/dist/cli.js follow --reader "$READ" --database "$DB" --start "$H" --until-position "$H"
/usr/bin/time -v node packages/reporting/dist/cli.js rebuild --reader "$READ" --database "$DB" --account account-003 > "$OUT/rebuild.jsonl"
psql "$RPT_PG_URL" -c "SELECT count(*), pg_total_relation_size('rpt.facts') FROM rpt.facts" > "$OUT/size.txt"
# Steady: the card on the production-shaped tape at 50, 235, 394, 620 saves/s, 300 s each, 256 pinned readers, first
# with the projector following, then the same four steps without it (control). CARD_COMMAND is CARD2's card command;
# the step and window flags are written here as the card names them on the day.
node packages/reporting/dist/cli.js follow --reader "$READ" --database "$DB" --wait-ms 500 > "$OUT/follow.jsonl" & F=$!
"$CARD_COMMAND" --steps 50,235,394,620 --window-seconds 300 > "$OUT/card-with.jsonl"; kill $F
"$CARD_COMMAND" --steps 50,235,394,620 --window-seconds 300 > "$OUT/card-without.jsonl"
docker rm -f tx2-dxrpt1-srv-rpg; sudo bash demo/server-down.sh
```

**Predictions.** Rebuild of account-003: exact (a check to add to the runner, not built: the rows of 1,000 sampled
entities against the store's history at the rebuild's position); reading 5 to 80 min, staging 10 to 35 min, swap 10 to 40 min;
size 410 to 540 B per fact. Following: section 7.2's lag rows; pinned-read p99 and the P3 feed lag p99 within 10% of the
control at every step; 0 save errors.

**Duration and cost:** bring-up 3 to 12 min, rebuild 25 to 155 min, steady 40 min plus 5 min of warm-up, teardown 5 min:
**75 to 220 minutes, $1.36 to $4.00** at $1.09 per machine hour ($2.18 to $4.36 if billed by the whole hour).

## 8. What this does not cover

Migrating the product's existing relational data into the store (not started). Derived values written from the feed,
grouped reports beyond SQL over these views, text search indexes. A materialised wide table (section 1). The real
Publish code path (settlement frames are written as a release's writes, as XQ6's gate does). Per-account view names.

## 9. Results (2026-11-24, 18:03 EST)

**Every gate passed on the toy: 606 checks, 0 failures, in the default run and in a sealed-value run; the same in a run
with the per-subject writer's switches on.** Branch head before this page: `524371be8` plus the files listed in
section 10. Runs, each on a fresh stack of this checkout's gateway (source hash `c1bd5993…` in `full2`), every container
checked against the image ID recorded at the start (Datomic `sha256:21a67288…`, PostgreSQL `sha256:526f86d9…`; 0
mismatches in every run):

| Run | Setting | Checks passed | Failures |
| --- | --- | --- | --- |
| `full2` | defaults (general writer, unsealed protection) | 606 | 0 |
| `variant1` | sealed protected values, `TX2_SUBJECT_SAVE=1` | 606 | 0 |
| `variant2` | unsealed, `TX2_SUBJECT_SAVE=1`, `TX2_SUBJECT_NUMERIC_OWNER=1`, `TX2_SUBJECT_HINTS=1`, one-subject replacement saves added | 606 | 0 |
| `full1` | the first full run | 602 | 2: the request-count window included the save phase (a harness error), and the kill run's last view regeneration had not run (fixed: one start without a fault after the last kill, as after any crash) |

Gate by gate (`full2`):

| Gate | Result |
| --- | --- |
| (a) store unchanged | The followed and the control database's journals equal journal for journal (positions, every change record's op, entity, attribute, value and interval) modulo fresh IDs and clocks. The write gateway's request counts were identical before and after the journal reads, a kill-every-page replay and two concurrent projectors, and before and after a whole replay: the projector sent it nothing. |
| (b) exact | `rpt.facts` equal to the store's history, column for column, at the head (1,206 facts), at P_A (1,087) and P_B (1,130): 0 missing, 0 extra. Every kind view equal to the store's rows at 3 positions × 3 valid instants: 36 view comparisons, 1,653 entity rows, 0 differences (2 cells had two visible values, shown as the latest recorded, as the rule says). SQL over `rpt.facts_visible`, logged in as each account, equal to the sweep route for XQ6's 17 question shapes in 3 accounts at 9 bases: 459 comparisons, 2,259 IDs, 0 differences. The three dashboard queries of section 0 equal to the sweep's answers. Workload: creations, a subject with 200 attributes, protected values, corrections dated 10 days back, retirements, an import valid from 15 days back, a removal on request of five protected assertions, settlement frames, a changed value type, a new kind, a transactor restart and a read gateway restart while the projector followed. |
| (c) kill at every page | 36 projector processes, each killed by SIGKILL in its first page (12 after the fetch, 12 inside the SQL transaction, 12 after the commit), pages of 3 journals, a whole replay of 35 positions: tables equal to the clean copy row for row (facts, entities, commits, columns, watermark). Two projectors at once on one copy: 9 pages applied, 3 discarded because the other moved first, tables equal. |
| (d) removal | 18 protected values written (followed and control databases), 5 removed on request: **0 occurrences** in 2,362 files (122.9 MB: every table, index, TOAST and WAL file of four copies, after `CHECKPOINT`) and in `pg_dump` of the four copies; the control value of an ordinary attribute found 12 times, in all four databases' table files and in two WAL segments. In the copy: 9 protected facts, `value_type = 'protected'`, every value column empty, `removed_position` set by the feed on the 5 removed (2 after the two rebuilds of `account-003`, section 3); the view column `subject.identity_number` marked "protected, not copied". Same in the sealed run. |
| (e) isolation | One login per account (`account-003`, `account-0031`, `account-009`, names prefixing each other and one empty), 15 tables and views each: 1,599 / 1,111 / 1 own rows, **0 rows of another account**; reading another account's subject by ID: 0 rows; setting `rpt.account` changes nothing; `rpt.rebuild_facts` refused (no grant). |
| (f) lag (diagnostic) | 25 saves/s (creations of 2 to 12 values) for 30 s: 737 pages, 750 journals; journals waiting when a page was read p50 1, p99 1, max 5; **time behind p50 108 ms, p99 140 ms, max 168 ms** (most of it the read gateway's delivery on the loaded lab VM; apply p50 11.5 ms, p99 36.6 ms). `variant2`, half the saves one-value replacements: p50 167 ms, p99 227 ms, journals waiting p99 3. |
| (g) rebuild during saves | Two rebuilds of `account-003` while 895 saves ran (0 errors): one read at P = 785 while the projector moved to 797, caught up 23 changes inside the swap; one read at 849 while the projector was paused at 798, fence 849, the projector then skipped that account's journals up to 849. At the end (position 930): 7,457 facts equal to the store, 0 missing, 0 extra; views equal. |

Gateway suites (`rpt1/suites.sh`, image `sha256:21a67288…`): 76 tests, 71,176 assertions, 0 failures, 1 error:
`feed-test/http-route`, which errors on the base too (READINESS contradiction 8). The 4 new tests in
`omit_protected_test.clj`: protected rows and change records omitted; a sealed value never unsealed (the unseal
function throws if called); unbound or with no protection declared, nothing changes; the journal page path masks.

**Not verified:**

1. Anything on a server; every time above is the Mac's.
2. **The per-subject writer's journals**: its switches reached the gateway in `variant1` and `variant2`, but its own
   counter recorded no save (the SDK sends no per-subject plan without its client options), so every save in the gates
   went through the general writer, the import path or the removal path.
3. The real Publish code path; a Publish marker or a settlement document under `_system` reaching the copy.
4. The loader-built 1 billion copy (its journal is not complete below the aged head; the copy must be built from the
   store by account there).
5. A restore of the store to an older point (`StoreBehind` is coded, not exercised); `FeedDeclined`; `ViewBusy` under a
   long reporting query; `TooManyColumns`.
6. A real reporting tool (Metabase or similar) connected to the copy; the gates use SQL directly.
7. Segment loads caused by the feed read; the cost of views on a deep account.

## 10. Files

| File | What |
| --- | --- |
| `packages/reporting/src/projector.ts` | Follow, apply a page in one SQL transaction with the watermark, rebuild one account, view refresh, retry rules |
| `packages/reporting/src/source.ts` | The store reads (bounded journal pages, history rows, ID lists), all with `omitProtected` and its echo |
| `packages/reporting/src/schema.ts` | Tables, functions (`rpt.at_position`, `rpt.at_valid`, `rpt.position_at`, `rpt.my_account`), views, row-level security |
| `packages/reporting/src/views.ts` | Column names and the generated kind views |
| `packages/reporting/src/cli.ts` | The projector as a process (`follow`, `rebuild`), with the kill points of gate (c) |
| `packages/datomic/gateway/src/triplex/gateway/privacy.clj` | `*omit-protected*`: protected values omitted inside the verified removal cut |
| `packages/datomic/gateway/src/triplex/gateway/journal.clj`, `storage.clj` | `"omitProtected": true` on journal pages and row reads, echoed as `"omittedProtected": true`; absent, byte-identical |
| `packages/datomic/gateway/src/triplex/gateway/omit_protected_test.clj` | The omission's tests |
| `packages/datomic/src/index.ts` | Exports `decodeRowText` and `decodeRow` (additive) |
| `lab/experiments/EXP-DX1/rpt1/gate.sh`, `gate.ts` | The gates (a) to (g) and the cost run |
| `lab/experiments/EXP-DX1/rpt1/suites.sh` | The gateway suites from one image ID |

Evidence (private, compressed): `evidence/DX-RPT1/{full2,variant1-sealed-subject,variant2-subject-writer,full1,suites}-*.tar.gz`.
