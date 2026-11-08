# V-X02 independent verification of exp/X02-xtql-parity (tip bf1ad4d): the XTQL native lane

**North star:** Sam's goal names two lanes, XTDB and QLever, each with its query language maintained; the XTDB lane's primary language is
XTQL with SQL as the named alternative (lab/SCOPE.md). Native queries must still "make sense" next to Triplex's ORM-like surface; that serves
P1 and P4 reads. **Scope:** lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md 4.1; lab/experiments/EXP-X02-xtql-parity/REPORT.md (the author's
claims); lab/research/R12-xtql-cookbook.md and R14-xtdb-correctness-hazards.md; RULINGS Q31d, Q39a (DECIMAL to BIGINT through a double) and
Q58a (native queries report their basis) in lab/acceptance/RULINGS.md and RULINGS-PENDING.md.

## Commander's intent
Decide PROMOTE, FIX-FIRST or REJECT for merging the XTQL/SQL native-language switch into main. PROMOTE means: every one of the 142 G2 native
tasks gives the same answer in pure XTQL and in pure SQL at the same pinned cut, both equal to an independent expectation; no task silently
falls back to a hybrid or to the other language; integer arithmetic is exact or fails typed; and with the switch unset, behaviour equals main.
Timeouts under the shared resident's load are a performance finding, not a correctness one; report them, do not let them decide the verdict.

## What to check
1. **Language purity.** Read the builders and the envelope: every XTQL task is bare `XTQL (...)` with XTQL `limit`, every SQL task is pure SQL,
   and `TRIPLEX_XTDB_NATIVE_LANGUAGE` is recorded in receipts. A task that can produce a hybrid statement is a finding.
2. **Equivalence.** For a sample of at least 40 of the 142 tasks spread over every builder, derive the expected answer yourself (from the
   fixture data or a small stdlib model) and compare both languages. Include the recursion tasks (depth unrolling to D <= 8 with a fixpoint
   check: build an input whose closure needs depth 9 and confirm a typed refusal, never a truncated answer).
3. **Hazards.** `= ANY` rejected by the SQL envelope; #6313 `(p) IS TRUE` in builders 09, 12, 13, 18 and reachability; #6345 edge sets above 100k
   refused; DECIMAL to BIGINT through a double (Q39a): find every path where a decimal or a large integer passes through such a cast, including
   `packages/core/src/datalog/compiler.ts:572`, and show with an input near 1e18 whether any answer is silently rounded.
4. **Exact sums.** Totals inside int64 never overflow spuriously; totals beyond it fail with the typed `integer-overflow` in both languages.
5. **Cuts and basis.** One pinned cut per task; a writer between calls stays hidden in both languages; say what basis each native answer
   reports today against Q58a.
6. **Switch unset.** Diff against main; run the package tests with the switch unset.
7. **Load.** Rerun the XTQL candidate G2 on the shared dev resident through lab/bin/heavy.mjs once; report timeouts per task and whether any
   timed-out task is one that also times out in SQL.

## Boundaries
Worktree branch `verify/X02` from `exp/X02-xtql-parity`. Write only `lab/verify/X02/**`. No edits to packages/, lab/acceptance, oracles. Engines:
the shared tx2-xtdb-dev resident on :5470 through lab/bin/heavy.mjs only; never recreate, stop or restart it; no exclusive slots. Docker only
with DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock through lab/bin/engine.mjs. Never touch /Users/sam/projects/triplex-db or ports
15442 and 17019. pnpm only with `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`. Commits end with `Co-Authored-By: Claude Opus 5.5
<noreply@anthropic.com>`. Subagents: Opus only, never fork.

## Report (return as text; the orchestrator saves it as lab/verify/X02/VERIFY.md)
Verdict and reason; checks 1-7 with evidence; findings ranked with reproducing commands and fixes; the equivalence sample table; final commit.

## Verdict (CX-VX02, Codex reviewer at high), saved by the orchestrator 2026-11-08 21:39Z
FIX-FIRST at bf1ad4d; evidence verify/X02 7392c0a (lab/verify/X02/VERIFY.md there). Parity is substantial: all 71 logical answers
recomputed independently, 142/142 current and reopen expectations equal. F1 the quantified-comparison guard
(packages/xtdb/src/native/ReadOnlySql.ts:83-85) checks raw characters, so `ANY/**/(ARRAY[1,2])` and `ANY ARRAY[1,2]` pass and return
empty answers; F2 an int64 overflow in inventory availability throws inside Effect.gen and escapes as a defect
(packages/qualification/src/native/xtdb-workloads.ts:456); F3 pre-existing (Q39a): Datalog exact arithmetic compiles DECIMAL to BIGINT and
rounds 1000000000000000004 to 1000000000000000000 with no error (packages/core/src/datalog/compiler.ts:572); F4 the native switch is
default-on (packages/qualification/src/index.ts:212), so unset behaviour changed. The exclusive-slot rerun is still outstanding. Ruled Q79.
