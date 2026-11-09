# EXP-DA02 brief: native Datomic Datalog and pull at a Triplex basis (toward G2)

## North star
The ORM-plus-native requirement (lab/SCOPE.md 1.3: Triplex works like an ORM on top, and raw native queries still make sense) on lane D,
and P1's basis semantics for native reads: every native answer is computed at the exact named basis (position, valid time, recorded
time) and reports it. Measured by G2 (71 native tasks, current and reopen, 142 executions) with every execution counted as
`datomic-datalog`. Read lab/NORTH-STAR.md first.

## Scope
lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md (4.1 item 5: the receipt records the surface language), lab/PROTOCOL.md. Design source:
/Users/sam/Claude/Projects/triplex-db-2/R29/R29-final-report.md section 5 (and 4.2 for the datoms). Builds on EXP-DA01's adapter
(branch `exp/DA01-datomic-adapter`). Inherited homebase files are for code facts only.

## Commander's intent
At the end, `makeDatomicNativeQueries(client, scope)` lets an author write ordinary Datomic Datalog and pull against a database value
at a Triplex basis, using a small Triplex rule set for "live facts at this basis", and a Datomic user reading the query and its trace
understands it without knowing Triplex internals. `node lab/bin/gate.mjs G2 --lane datomic` runs all 142 executions with no
UNSUPPORTED and as many PASS as the engine allows; every gap is named with its cause and a workaround plan. Lane D then stands on the
same native footing as XTQL and SPARQL for the golden scenarios.

## Point of view
1. **Same shape as the XTDB native surface.** Read `packages/xtdb/src/native/NativeQueries.ts:35-194`, `packages/xtdb/src/native/Sources.ts`,
   `packages/core/src/native/NativeQuery.ts`, and the authored task library `packages/qualification/src/native/xtdb-workloads.ts`. Keep
   the API (`select`, plus `pull`, with contract, input, builder, options), the basis resolution (`resolveNativeReadBasis`), the row cap
   (ask for maxRows + 1, fail without a partial answer), the timeout, the decode through the contract's row type, and the trace (phase
   steps, language `datomic-datalog`, mapping id `triplex-datomic/fact-entity-basis/1`, contract id).
2. **Context (R29 5).** `bind`, `attribute`, `facts()`, `recordedFacts()`, `history()` return Datalog fragments (rule invocations and
   `:in` variables); the gateway sends the rule set `%` with each query and runs it at `(d/as-of db t_P)` or the unfiltered current db
   when P is the latest position. Valid time and explicit recorded time enter as `:in` parameters, never as string-spliced literals.
   `$` stays available for raw Datomic idioms, documented as carrying no Triplex temporal guarantee (as XTDB documents for raw tables).
3. **C8 read-only and bounded.** Datomic Datalog can call any function on the peer's classpath. The gateway parses the query EDN and
   rejects every function symbol in a predicate or function clause that is not on an explicit allowlist (comparison, arithmetic on
   exact types, `str`, `subs`, `ground`, `missing?`, `get-else`, Triplex's own pure helpers); test that `datomic.api/transact`,
   `clojure.core/eval` and Java interop symbols are refused. Every query gets `:timeout`.
4. **Recursion** through the shared frontier loop with budgets (as `packages/xtdb/src/native/Reachability.ts` does), returning working
   relations to the query as `:in` collections; no recursive rules in G2 answers.
5. **Author the 71 tasks independently** in `packages/qualification/src/native/datomic-workloads.ts` (same rule as the XTDB library: no
   Datalog AST, compiler or expected answer enters the module). Register query path `datomic-native` in
   `packages/qualification/src/index.ts`; add `datomic` to G2 in `lab/bin/gate.mjs`; `caseLanguages` must count `datomic-datalog`.
6. **Exactness.** Results arrive tagged (R29 3); longs and entity ids stay strings or BigInt until the contract decodes them; the int64
   carrier never passes through Number (`hydrateNativeValue`).
7. **Measure as you go:** per task elapsed time (diagnostic, not a bar), and gateway io-stats for a sample of tasks (storage-tier
   reads per query), to feed EXP-DA03.
8. **Rejected:** the native attribute view (`[?w :i9/status ?s]` datoms) as the G2 surface (needs its own maintenance and eligibility
   rules; it is a later P4 arm); exposing the gateway's `/q` as an unauthenticated public endpoint (lab-only, bound to 127.0.0.1).

## Boundaries
- Worktree: `git -C /Users/sam/projects/triplex-db-2 worktree add /Users/sam/projects/triplex-db-2/.claude/worktrees/da02 -b
  exp/DA02-datomic-native main` (rebase onto DA01's branch until it merges). pnpm only with
  `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`.
- Files: `packages/datomic/**`, `packages/qualification/src/index.ts`, `packages/qualification/src/native/datomic-workloads.ts`,
  `lab/bin/gate.mjs` (datomic lane for G2 only), `lab/bin/receipt.mjs` (language tally only, if needed),
  `lab/experiments/EXP-DA02-datomic-native/**`. Do not edit `packages/core/**`, `qualification/workloads/**` (the packet and case files
  are the oracle), or `lab/acceptance/**`; obligations for the D-DATALOG surface are added by the orchestrator through the contract.
- Engine: `tx2-datomic-dev`, holder `EXP-DA02`; never park it. Image rebuilds only through `engine.mjs build` and `up --fresh` on the
  dev slot, reported. Never stop `tx2-xtdb-dev` or `tx2-qlever-dev`. Docker only via
  `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock` and engine.mjs. Never touch /Users/sam/projects/triplex-db or ports 15442
  and 17019.
- Heavy commands through `node lab/bin/heavy.mjs --label DA02 -- <command>`.

## Gates
1. `node lab/bin/gate.mjs G0 --lane datomic --exp EXP-DA02` PASS (includes the allowlist tests).
2. `node lab/bin/gate.mjs G2 --lane datomic --exp EXP-DA02`: 142 executions, zero UNSUPPORTED, every answer query `datomic-datalog`;
   report PASS count and each failure's cause.
3. `node lab/bin/gate.mjs G1 --lane datomic --exp EXP-DA02` still PASS 88/88 (the adapter is shared).
Receipts: the three gate receipts; `lab/experiments/EXP-DA02-datomic-native/receipts/` with per-task timings and the io-stats sample.

## Report
Write `lab/experiments/EXP-DA02-datomic-native/REPORT.md` and commit it. Result class; branch head; G2 counts by status and workload;
each failing task with its cause (engine semantics, translation, oracle disagreement) and a proposed fix; the allowlist and how it was
tested; three example tasks shown side by side in Datomic Datalog and XTQL for the "still makes sense" judgement; open questions for
DA03. Commits end with `Co-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>`. Code comments carry `// [EXP-DA02] Why: ... Rejected: ...`.
