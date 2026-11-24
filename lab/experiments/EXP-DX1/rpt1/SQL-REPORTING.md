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
   `P` (`/v2/db/{db}/ids`, XQ3, needs `TX2_ID_LISTS=1` on the reader) and read their whole history at `P` in batches
   (`/v1/db/{db}/read` with `entityIds`, `history`, `omitProtected`); (iii) in one SQL transaction: lock the watermark
   `G`, delete the account's rows, insert what was read, and if `G > P` read journal pages `(P, G]` and apply only that
   account's changes; set the account's fence to `max(P, G)`. The projector, which locks the same row, applies that
   account's journals only above the fence. The initial build is the same step for every account named by the
   operator (the store has no list of accounts), or a replay of the journal from position 0 for a database whose
   journal is complete.
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
   and refuses any change of an attribute it has seen marked `protected` that arrives with a value, so a gateway without this change
   cannot feed it.

A removal's own journal entry (`op: "erase"`) sets `removed_position` on the assertions it names, at the removal's log
position, so the copy can say "removed at position N" exactly as the store's marker does.

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

**Predictions (written before running):** (a) equal; (b) 0 differences; if the store records an assertion at a position
other than its journal's (a group commit's interior position or an import's own position), the facts comparison shows
it as a `recorded_position` difference and the projector must take the row's own position from the store; (c) equal;
(d) 0 protected occurrences, the control found at least once in the heap and once in the WAL; (e) 0; (f) on the Mac,
entries behind p99 under 50 and time behind p99 under 500 ms; (g) 0 differences.

## 7. Cost, forecast at 1 billion, and the server run

Filled in section 9 from the toy's measurements: rows and bytes per fact (heap, indexes, TOAST), projector CPU per
1,000 journal entries, read gateway requests and journal permit use per 1,000 entries.

**Where the projector reads.** It should read from its own read peer (the question reader of the cross-subject design),
not the read gateway that serves the 256 pinned readers: a journal page holds the single journal permit while it
renders (the wait itself does not hold it), and the rebuild reads whole histories, which would evict the product
readers' cache. Until that peer exists, one projector on the shared reader holds the journal permit for one page at a
time.

## 8. What this does not cover

Migrating the product's existing relational data into the store (not started). Derived values written from the feed,
grouped reports beyond SQL over these views, text search indexes. A materialised wide table (section 1). The real
Publish code path on the toy (settlement frames are simulated as XQ6's gate does).

## 9. Results

(Written after the gates run.)
