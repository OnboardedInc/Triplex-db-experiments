# V-C8 brief: independent verification of EXP-C8 (read paths never write) at exp/C8-read-only-frontier d9b2dc8

## North star
P1 first: many concurrent pinned reads that never block writers. A read that writes is the most direct way a reader blocks a writer
(XTDB: a COMMIT SYNC per recursion round; QLever: an update that empties the result cache). Read lab/NORTH-STAR.md first.

## Commander's intent
EXP-C8 claims no read entry point on either lane can write, that recursion answers are unchanged, and that budgets refuse typed and never
return a partial answer. Try to break each claim. Scope is C8's own commits on top of EXP-X02: `git diff bf1ad4d d9b2dc8` (620145c, d508c28,
0147c88, 6727da4, d9b2dc8). EXP-X02 itself is under V-X02; do not re-verify it.

## Read
lab/experiments/EXP-C8-read-only-frontier/REPORT.md and BRIEF.md (main), the diff above, lab/research/R10-read-only-recursion.md.

## Checks
1. **No read path writes.** Enumerate every read entry point on both lanes (Triples pulls and queries, query executor, Datalog, native
   SQL/XTQL/SPARQL, temporal queries, maintained queries, cursor pages, counts) and show each receives the read-only view. Look for any path
   that keeps a writable client (closures captured at construction, fallbacks, error paths, retries). Try to make a read write.
2. **The counter fails closed.** Feed engine-write-counter.ts statements it should count and ones it cannot classify (multi-statement
   strings, COPY, `BEGIN` without READ ONLY, a SPARQL update sent by GET or as a form field, `LOAD`/`CLEAR`); every unknown must count as a
   write or fail. Recompute the "0 writes" figures from the receipts' raw counter output, not from summaries.
3. **Answers unchanged.** With your own graphs (cycles, self-loops, diamonds, high fan-out, disconnected seeds, budgets exactly at and one
   past each limit), compare frontierClosure, reachFrom, closurePairs, ruleClosure and countSimplePaths with an implementation you write
   from the oracle's definitions. Confirm every budget refusal is typed and carries no partial answer.
4. **Datalog semantics.** maxDepth and the recursive call's tail constraint are kept on both lanes; the refused rule shape is refused typed;
   the transaction-overlay identity fix holds (staged facts visible to reads inside the same transaction).
5. **Removed mutators.** No remaining caller or export of the removed functions; note any leftover schema (tx_query_relations).
6. **Tests.** Rerun the unit and offline suites. Live checks only on qlever-dev (:7070) and only light ones; do not run XTDB gates on the
   shared xtdb-dev (it is overloaded and clean receipts wait for an exclusive slot).

## Limits
Own worktree: `git -C /Users/sam/projects/triplex-db-2 worktree add /Users/sam/projects/triplex-db-2/.claude/worktrees/verify-c8
-b verify/C8 d9b2dc8`. pnpm only with `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`. Docker only via
`DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock`; no slot, no container lifecycle. Do not edit packages/**; your tools go under
lab/verify/C8/. Never touch /Users/sam/projects/triplex-db or ports 15442 and 17019. Commits end with `Co-Authored-By: Claude Opus 5.5
<noreply@anthropic.com>`. Do not spawn subagents. Never send the user's email or personal details anywhere.

## Return
Verdict ACCEPT, FIX-FIRST or REJECT; a per-check table; each finding with severity, file:line, reproduction and proposed fix; your commit.
