# EXP-P2X design note: per-subject commits and a log-ordered feed on XTDB 2.2.0

**North star:** P2 (small atomic idempotent per-subject commits, low latency), then P3 (ordered, resumable change feed).
**Code:** `packages/xtdb/src/XtdbStorageAdapter.ts` (`commitPath: "subject-stamp"`, default `"scope-counter"` = A0),
`packages/xtdb/src/CommitFeed.ts`, tests in `packages/xtdb/test/subject-stamp.test.ts`. Probes in `probes/`.

## 1. What changes, and why

| | A0 (`scope-counter`, today) | Candidate (`subject-stamp`) | Evidence |
| --- | --- | --- | --- |
| Order | dense counter: assert `MAX(position) = K` over the scope, write K+1 | the engine stamps each row with its own transaction's system time, inside the transaction | R16 3.4; R18 3.4 item 4 |
| Compare-and-set | scope-wide: any concurrent commit in the scope conflicts | per subject: `NOT EXISTS head(e) > K` for every entity read or written; a read not confined to known entities escalates to the scope head | R18 3.1 item 1 (record the read set) |
| Idempotency | claim read and assert by `scope_key` scan | claim read and assert by `_id`; a committed claim is final, so a duplicate costs one point read | R16 2.2, 2.4 |
| Other guards and receipt | `scope_key` scans of claims, attempts, assertions | `_id` point lookups | R7 via R18 3.4 item 7 |
| Feed carrier | Triplex journal rows only | journal rows, plus `METADATA` (scope, op, subjects, attributes, valid hull) and a `tx_feed` row with exact tuples, same transaction | R16 3.4 |
| Feed reader | `transactions({after})` reads every `_Transaction` row of the scope per page | one source-log tailer (O(window)), commit status by tx id in `xt.txs` | R16 3.2, 3.3 |
| Statements per one-subject commit | 8 | 8 (guards with the same handling share one `ASSERT`) | so the comparison measures engine work, not round trips |

## 2. Coordinates (RULINGS Q31c) and where each comes from on 2.2.0

A position is (stream, epoch, offset, ordinal), ordered lexicographically, not dense.

| Coordinate | Source on 2.2.0 | How it reaches the assertion rows inside the same transaction |
| --- | --- | --- |
| stream | the database's source log (one per XTDB database) | constant for a scope; the feed reads only that log |
| epoch | high bits of the tx id: `msgId = (epoch << 48) + offset` (`MsgIdUtil.kt:12-15 @ c6c1962`) | not in rows (the tx id is not readable inside a transaction); the feed reports it on every resolution and never reads across an epoch boundary, so an epoch change stalls the feed visibly instead of being mapped implicitly |
| offset | low 48 bits of the tx id. Rows carry the transaction's system time in epoch microseconds instead, evaluated by the indexer: `(CURRENT_TIMESTAMP - epoch) / INTERVAL 'PT0.000001S'` | `recorded_position`, `retracted_position`, the journal's position fact and its `value_identity`, the subject heads, the scope head, the attempt receipt and the feed row are all SQL expressions over that stamp in the same transaction, so they cannot disagree |
| ordinal | index of the Triplex transact inside the engine transaction (0 to 7) | known to the client before commit; added as a literal to the same expression |

**Packing.** Triplex positions are one safe integer, so position = `(stamp_us - 2020-01-01Z) * 8 + ordinal`. That stays exact until
2055-09; the adapter refuses commits from 30 days before the limit rather than overflow. Stream and epoch are not packed.

**Why the stamp's order is log order.** The tx id is not available inside the transaction, so the claim needs a proof:
1. XTDB resolves a database's transactions one at a time in log order (one `TxResolver` per database).
2. Each transaction's system time is the log timestamp, or the latest resolved transaction's system time plus 1 us when the clock has
   not advanced; an explicit system time earlier than or equal to the latest one is rejected (`TxResolver.kt:204-246 @ c6c1962`).
   Smoothing is against the resolved queue head, so it also holds with leader pipelining (comment at line 205).
3. DML runs with `currentTime = systemTime` (same lines), so `CURRENT_TIMESTAMP` in a statement is that system time.
4. Therefore stamps are strictly increasing in resolution order, which is log order. Aborted transactions also consume a system time
   but write no rows.
5. Measured: probe `p1-stamp-order` (320 concurrent commits): every stamp equals `_system_from` and `xt.txs.system_time` to the
   microsecond, all distinct, 319/319 strictly increasing in tx-id order.

## 3. What C1's basis rules need from a non-dense position

C1 lets a layer serve a basis only at "a position the layer holds exactly (latest publication, or for XTDB a physical commit
boundary)". With non-dense positions:

1. **A basis is any integer K, and it means "every commit with position at most K".** It is exact and repeatable once K is at or below
   a fully resolved prefix: by section 2 no later commit can receive a position at or below K. A K between two commits is the same
   cut as the lower commit (`floor(K)`), and a derived layer maps it there from the feed's ordered resolutions.
2. **The watermark is a fully resolved prefix, not the greatest position seen.** The tailer stops at the first transaction that is in
   the source log but has no `xt.txs` row yet, so a layer never claims a basis that a pending transaction could still enter. Aborted
   transactions of the scope are listed as resolutions, so the prefix accounts for every offset.
3. **No code may compute the next position as K+1.** Within one engine transaction ordinals are consecutive (K+1 is the next transact
   at the same offset), but after the last ordinal the next position jumps by at least 8. `transactions({after: p - 1})` still returns
   p first because nothing lies strictly between p-1 and p. Cursors resume from a feed `msg_id` (a log record start) or a position,
   never from arithmetic on either.
4. **`recordedPosition` keeps its meaning:** this commit's place in the scope's total order. Recorded time (`recordedAt`, the runtime
   clock) is still not monotonic in commit order, so C1's rule that explicit recorded time takes the exact path is unchanged.
5. **Epoch changes are explicit.** A cursor names its epoch through its `msg_id`. Packed positions keep their order across an epoch
   change on one node, because system time is smoothed against the latest completed transaction. A watermark in one epoch still does
   not satisfy a basis in another without C1's mapping, so the tailer stops at the epoch boundary.

## 4. ACK and read-your-own-write (RULINGS Q31e, TARGETS 4.1 item 6)

The ACK is the return of `transact`. It goes out after `COMMIT SYNC` returns, which is when the engine has applied the transaction
and it is readable (the source's own publication), plus one receipt point read that also yields the stamp. Read-your-own-write is by
routing: the returned position is a basis, and on all-XTDB the eligible reader is the same node. A read through the same client
already carries that client's latest await token. A reader in another process must pass the token or wait until its node's resolved
prefix reaches the position.

## 5. Feed consumption (TARGETS 1.1 P3 items 4 to 6)

One tailer per node reads `xt.source_log_msgs` from a record start; fan-out to subscribers is in Triplex (R16 3.3: 32 pollers on
`xt.txs` stalled commits). The consumer writes its affected-subject effects, keyed `(consumer, position, subject)`, and its checkpoint
(a log record start plus a processed flag) in one XTDB transaction. That transaction is fenced by an `ASSERT` on the previous
checkpoint. A page with only other scopes' records does not write: the consumer's own checkpoint transactions are records in the
same log, and writing for them would feed back on itself.

## 6. XTDB 2.2.0 behaviors found while building this (each shaped the code)

| Finding | Evidence | What the code does |
| --- | --- | --- |
| A VALUES cell that is an expression, rather than a literal or parameter, gets its own compiled projection, memoized under a key that holds the statement's whole parameter-type map. 200-row inserts with a stamp expression per row exhausted the 2 GiB heap, and ingestion stopped ("Ingestion stopped ... Java heap space"); the slot had to be recreated fresh. | `operator/table.clj:106-113 @ c6c1962` (the source calls it "quite heavyweight"); engine log stack in `emit_rows_table` / `lru_memoize` | stamped inserts are `INSERT ... SELECT <projection> FROM (VALUES <parameters only>)`: one stamp expression per column per statement, ordinals as parameters (probe `p8-insert-select`) |
| `xt.source_log_msgs` decodes records in batches of up to 1,024 and builds each record's message text whatever the `LIMIT`, so cost follows log bytes, not rows asked for | `log_tables.clj` `->cursor` | the tailer reads at most 8 MiB of log per poll, with a fallback read so a record larger than the window cannot stall it |
| A read reaching a record still being appended raised "Protocol message contained an invalid tag (zero)" once; every record decoded afterwards | probe `p7-log-decode` (300/300 decode) | an undecodable tail is treated as "not yet readable": the watermark does not move; a persistent failure surfaces after 500 polls |
| A `msg_id` upper bound of `epochStart + 2^48 - 1` returns no rows; `epochStart + 2^47` works | probe `p4-log-params` | reads end at `epochStart + 2^47 - 1` (128 TiB of log per epoch) |
| A lower bound that is not a record start fails ("expected record separator"), so `msg_id > x` cannot resume | R16 3.1, probe `p2-sql-details` | cursors are (record start, processed flag), read inclusively |
| `ASSERT` over a table that has never existed fails at planning | live test failure | `initialize()` declares the feed and consumer tables |

## 7. Open questions

1. **Core contract.** `nextCommitPosition` hands out a position before commit, but the engine fixes it at commit. The adapter therefore
   returns negative placeholders and rewrites `position` fields in the callback's result (`bindPositions`), failing closed if a
   placeholder escapes into a fact value. A core hook that binds positions after commit, or a tuple or bigint position type, would
   remove both the rewrite and the 8-ordinal packing.
2. **Mixed writers.** A scope must not be written by both paths at once. Switching a scope from A0 to the candidate is safe once no A0
   writer remains, because stamps exceed any dense counter.
3. **Engine crash between append and resolution.** This is covered by the deterministic falsifier and by a live run with a writer that
   dies after handing over its commit (sections F3 in the tests). An engine kill mid-resolution is not, because `lab/bin/engine.mjs`
   has no kill.
4. **Log volume.** The slot volume grew about 250 KB per Triplex commit (log plus storage) on 2.2.0. Both arms send the same eight
   statements, so this is the engine's encoding of parameterized statements in the source log, not the candidate. It decides what a
   source-log tailer reads (about 3 MB/s at 15 commits/s) and what 100k commits cost on disk (about 25 GB), which is why this
   experiment's history stopped short of 100k (REPORT). Worth a probe of statement shapes that shrink records (fewer, wider parameters).
5. **Costs not yet measured at scale:** `xt.txs` lookups and `METADATA` size at 1M+ transactions. The scope head's version chain read
   stayed flat to 8.7k versions (probe `p11-hot-head`: 6.5 ms against 4.7 to 5.5 ms). Both arms still scan by `scope_key` on the read
   path; that is P4 work.
