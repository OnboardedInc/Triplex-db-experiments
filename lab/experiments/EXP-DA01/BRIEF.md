# EXP-DA01 brief: the Triplex storage adapter and Datalog executor on Datomic (to G1)

## North star
Correctness floor for goal 7 (atomic writes, receipts, recovery) and the preconditions of P2: a per-scope atomic, idempotent commit with
lost-ACK resolution and read-your-own-write, proven by the unchanged 44-case conformance suite in two openings (G1 88/88 plus the
complete suite). P2's latency is not measured here (EXP-DA03 does that); a fast commit that fails G1 is worth nothing. Read
lab/NORTH-STAR.md first.

## Scope
lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md (sections 3 and 4.1), lab/PROTOCOL.md. Design source:
/Users/sam/Claude/Projects/triplex-db-2/R29/R29-final-report.md sections 3 and 4 (the mapping, one commit, reads, workarounds). Builds on
EXP-DA00 (branch `exp/DA00-datomic-bringup`, merged or rebased onto). Inherited homebase files are for code facts only.

## Commander's intent
At the end, `makeDatomicRuntime({ url })` is a Triplex runtime that passes `node lab/bin/gate.mjs G1 --lane datomic` with 88 of 88 case
executions and the complete suite, on `tx2-datomic-dev`, with a rerun (`--previous`) that also passes. Every Triplex fact is a Datomic
fact entity exactly as R29 4.2 describes, every commit is one Datomic transaction carrying its Triplex position, tx id, recorded-at and
operation id, and a lost acknowledgement resolves to the original outcome. EXP-DA02 can then add native queries over the same datoms,
and EXP-DA03 can measure P1 to P4 on a correct adapter.

## Point of view
1. **Mirror the XTDB adapter's contract, not its SQL.** Read `packages/core/src/storage/StorageAdapter.ts:20-88`,
   `packages/core/src/Triple.ts:76-98`, `packages/xtdb/src/XtdbStorageAdapter.ts` (staging, `persist` at :188-331, `withTransaction`
   at :333-485, `initialize`), `packages/xtdb/src/index.ts`, and `packages/xtdb/src/codecs.ts`. Same staging model: rows, claims and
   retractions collected in a TransactionState; one gateway `transact` call at the end; nested callbacks as savepoints with the same
   conflict rule.
2. **Schema and commit exactly as R29 4.2 and 4.3.** One Datomic database per scope (`s-<32 hex of sha256(scope)>`, full scope stored and
   compared). Scope-wide `[:db/cas scope :triplex.scope/position K K+1]` (the XTDB A0 arm's semantics; per-subject CAS is EXP-DA03).
   Claims and fact ids and operation ids as `:db.unique/value`, so duplicates abort the transaction instead of upserting. Subjects and
   attribute entities by tempid upsert, never by lookup ref inside the transaction that creates them (Jepsen: lookup refs resolve against
   db-before). One `:db/cas` per entity per transaction (Jepsen: two identical CaS both succeed). Retraction retracts `:f/live` and adds
   `:f/retracted-in`; an assertion retracted in the same commit is written without `:f/live`.
3. **Positions.** `nextCommitPosition` returns K+1 inside the transaction; the gateway keeps an in-memory P-to-t map per database
   (rebuilt at startup from `:triplex.tx/position` on the AVET index). `currentCommitPosition` is the latest position. Recorded-at:
   store it on the transaction entity when every row of the commit shares one timestamp; if core passes different timestamps within one
   transaction, store a per-fact `:f/recorded-at` instead and say which case occurs in G1.
4. **Reads (R29 4.4).** Latest basis: the unfiltered current db. Past position: `(d/as-of db t_P)`. `validAt` and explicit `recordedAt`
   by predicates and the tx annotations. `getById` and `history` through `:f/id` and `:f/subject`. Inside `withTransaction`: the db
   value the transaction started from, held by the gateway under a transaction handle with a TTL, extended by `d/with` over the staged
   tx-data; probe first that `d/with` accepts that value on 1.0.7745; if it does not, fall back to a TS overlay like
   `packages/xtdb/src/query/overlay.ts` and record why.
5. **Lost ACK.** Every commit carries an operation id. On timeout or transport loss: poll `GET /v1/db/{db}/operation/{id}` (gateway does
   `d/sync` then the AVET lookup) until the resolution deadline, then `TransactionOutcomeUnknown` with the same fields as
   `packages/xtdb/src/XtdbStorageAdapter.ts:319`. A resend with the same operation id that hits the unique conflict resolves to the
   original receipt.
6. **Query executor for Triplex Datalog.** Translate patterns, predicates, `not`, `or` and non-recursive rules to Datomic Datalog over
   the fact entities (the QLever compiler `packages/qlever/src/compiler.ts` is the closest template for a non-SQL target; datascript in
   `references/datascript` is a semantics reference). Datomic's `:find` returns a set: bind fact ids (or use `:with`) so bag semantics
   match Triplex, then do aggregation, compute, having, order and pagination in TypeScript over exact values (the numbers rule: exact
   arithmetic in the TS kernel). Recursion through the shared frontier loop with budgets (C8), not recursive Datomic rules. Every query
   carries `:timeout`.
7. **Exactness.** Values per R29 4.6: integer as `:db.type/long`, number and every instant as `:db.type/double`, json canonical text,
   blob as hash plus canonical metadata; reject non-canonical integers and non-finite numbers before sending. Add `-0.0` and int64 bound
   cases to the adapter tests.
8. **Qualification wiring.** Register backend `datomic` and query path `datomic-datalog` in `packages/qualification/src/index.ts`; let
   `packages/qualification/workloads/lab-conformance.ts:39` accept `lab/locks/datomic-*`; add `datomic` to G1 in `lab/bin/gate.mjs`;
   add `"datomic"` to `lab/bench/lib/triplex.ts:22` only if a typecheck needs it. Test databases created by G1 are deleted after the run
   through the gateway's test-only delete.
9. **Rejected:** a shared database with a scope attribute on every fact (weaker isolation, every query filters, native queries less
   clear); native per-attribute datoms as the source of truth (loses fact identity and supports; it is a later P4 arm); a classpath
   transaction function for the commit (not needed for scope-wide CAS; DA03 adds one for per-subject CAS).

## Boundaries
- Worktree: `git -C /Users/sam/projects/triplex-db-2 worktree add /Users/sam/projects/triplex-db-2/.claude/worktrees/da01 -b
  exp/DA01-datomic-adapter main` (rebase onto DA00's branch until it merges). pnpm only with
  `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`.
- Files: `packages/datomic/**` (TS and gateway), `packages/qualification/src/index.ts`, `packages/qualification/workloads/lab-conformance.ts`
  (lane regex only), `lab/bin/gate.mjs` (datomic lane for G1 only), `lab/config/g0-expected-skips.json` (datomic live tests only; gate
  change, flag it), `lab/experiments/EXP-DA01-datomic-adapter/**`. Do not edit `packages/core/**`, `packages/testkit/**`,
  `lab/acceptance/**`; if core must change, stop and report why.
- Engine: `tx2-datomic-dev` (shared resident, holder `EXP-DA01`); never park it yourself. Rebuilding the image (gateway source changed)
  goes through `engine.mjs build` and `up --fresh` on the dev slot only; say in the report every time you did it. Never stop
  `tx2-xtdb-dev` or `tx2-qlever-dev`. Docker only via `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock` and engine.mjs. Never
  touch /Users/sam/projects/triplex-db or ports 15442 and 17019.
- Heavy commands through `node lab/bin/heavy.mjs --label DA01 -- <command>`.

## Gates
1. `node lab/bin/gate.mjs G0 --lane datomic --exp EXP-DA01` PASS.
2. `node lab/bin/gate.mjs G1 --lane datomic --exp EXP-DA01` PASS: 88/88 executions (current and reopen), complete suite PASS; then a
   second run with `--previous <first run id>` PASS.
3. Adapter live tests under `DATOMIC_INTEGRATION=1` mirroring the XTDB transaction-boundary tests (staged reads, savepoint rollback,
   identity reuse rejected, lost ACK resolved through the operation id, transport hang returns an identifiable unknown outcome within
   budget, duplicate command returns the original tx id, concurrent commits on one scope give one CAS conflict and a replay).
Receipts: both G1 receipts, the live-test output, `lab/experiments/EXP-DA01-datomic-adapter/receipts/` with datoms per commit (for
5, 10 and 50 facts), databases created and deleted, and the `d/with` probe result.

## Report
Write `lab/experiments/EXP-DA01-datomic-adapter/REPORT.md` and commit it. Result class; branch head; G1 counts and first failures if
any; which R29 mapping choices held and which changed (with the case that forced it); datoms per fact and per commit; open questions
for DA02 and DA03. Commits end with `Co-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>`. Code comments carry
`// [EXP-DA01] Why: ... Rejected: ...`.
