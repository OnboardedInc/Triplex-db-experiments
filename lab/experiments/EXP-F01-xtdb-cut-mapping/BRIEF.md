# EXP-F01 falsifier: can XTDB's own system time serve exact Triplex recorded cuts? (lane X)

## Commander's intent
Decide, with evidence, whether the XTDB projection can answer Triplex reads at a recorded cut by using
`FOR SYSTEM_TIME AS OF S`, where S is the system time XTDB itself assigned to the physical transaction that
committed position P (hypothesis H-X-CUT, narrowed after review: physical commit boundaries only). If it holds,
recorded-time travel on the projection is native and fast; if it fails on any edge, the projection must keep
logical position filtering and the plan changes. A wrong "yes" here would silently corrupt every historical read,
so look for the counterexample, not the confirmation.

## Point of view
- We never set system time (R1: client-set system time breaks after any abort, upstream #6209). S is read back
  after commit, e.g. `_system_from` of the `tx_meta` row version written in that transaction, or `xt.txs`.
- Known counterexample (review r1 #6): nested Triplex transacts inside one outer transaction produce several
  positions in one XTDB transaction; interior positions have no distinct system time. Confirm it, and measure how
  the existing adapter allocates positions (`XtdbStorageAdapter.ts:343`, `:486`, `:246`).
- Timestamps must be decoded as strings end to end; the Node driver's `Date` decoding truncates microseconds (R1).

## Cases (each with a raw-output receipt)
1. Single-position transactions: for every committed position P, the ledger state filtered by `recorded_position <= P`
   equals the state read `FOR SYSTEM_TIME AS OF S(P)` for all `tx_*` tables (compare full row sets).
2. Nested multi-position transaction: show which cuts are representable and which are not.
3. Distinct commits with identical Triplex `recordedAt` (same millisecond).
4. A CAS-conflict abort and a DDL statement between two commits: the mapping for committed positions stays exact.
5. Container restart and reopen; then many transactions and whatever compaction 2.2.0 triggers; mapping unchanged.
6. Microsecond round trip of S through the client.
7. The cost of looking up S for a given P by `_id` (point lookup) versus by predicate.

## Boundaries
Use an exclusive harness slot (`node lab/bin/engine.mjs up --lane xtdb --slot s1 --fresh`), release it when done.
Write test code under `packages/xtdb/test/falsifiers/` (or `lab/falsifiers/xtdb-cut/` if it does not fit the package
test layout) on branch `exp/F01-xtdb-cut-mapping` in your worktree. Do not change adapter behavior. Report with
verdict per case, receipts, and the exact recommended mapping query (or the reason none exists).
