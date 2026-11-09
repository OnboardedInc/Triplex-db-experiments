# V-E01 brief: independent verification of the claim evaluator at exp/E01-claim-evaluator 2796455

## North star
The floor under every claim for all five priorities: no comparison or promotion can reach QUALIFIED unless the evaluator itself ran the
pinned oracle on the claimed candidate and the registered A0 control. Read lab/NORTH-STAR.md first.

## Commander's intent
EXP-E01 says it closed Codex round 8 findings 2, 6, 10 and 11 (Q67b, Q67e, Q67i, Q67j) in lab/bin/claim.mjs. Your job is to try to break
that claim, not to confirm it. Codex's history in this lab is that each new mechanism is first built as labels and checked as labels, and
the attack that works is "supply the label without the substance". Look for that. A verdict of ACCEPT means: you tried hard, with your own
counterexamples, and each fix holds for the cases it claims, and the report's list of what stays unprotected is complete and honest.

## Read
- lab/reviews/plan-v2-round8.codex.md (findings 2, 6, 10, 11 and their counterexamples) and lab/reviews/plan-v2-round8.responses.md.
- lab/acceptance/RULINGS-PENDING.md rows Q67b, Q67e, Q67i, Q67j and Q71a-c.
- lab/experiments/EXP-E01-claim-evaluator/REPORT.md, all of it (the last section is this round).
- `git diff ce908a8 2796455` on exp/E01-claim-evaluator, then the whole of lab/bin/claim.mjs at 2796455.

## Setup
`git -C /Users/sam/projects/triplex-db-2 worktree add /Users/sam/projects/triplex-db-2/.claude/worktrees/verify-e01 -b verify/E01 2796455`
Work only there. pnpm only with `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`. No Docker or engines are needed.

## Checks
1. **Tests are real:** rerun `node --test lab/bin/test/*.test.mjs` (expect 112/112). For each of the five new fixtures (RUN-ALIAS-DIST,
   RUN-BACKGROUND-HELPER, escaped process, bag comparator, RUN-PROMOTION) revert or weaken the fix it guards and show the test fails.
2. **Q67b identity:** with your own fixtures, show the identity changes when any of these change and the dist does not: a source runner
   outside dist, a dependency file in node_modules, a symlink target, the buildSpec, the lockfile, the toolchain. Find anything that affects
   execution and is not in the identity (environment variables, files read from outside the checkout, the cwd, argv). Check that two
   instances with equal identity can never be confused into running the wrong checkout.
3. **Q67e isolation:** try at least three tamper routes the fixtures do not cover (for example a SUT that edits the oracle copy between
   the re-hash and the read; a process that double-forks out of the group; a build that edits claim.mjs or lib.mjs and restores it before
   the end hash; a symlink inside a checkout pointing at the oracle copy). For each, say whether it is caught, and whether the report's
   "still unprotected" list already names it.
4. **Q67i comparators:** for each comparator the contract declares (exact, set, bag, ordered, diagnostic, error), build a pass and a fail
   pair and show `caseResultVerdict` and `compare` agree with the comparator's definition in lab/acceptance/ACCEPTANCE.md. Check
   CMP-ERROR's `cause` requirement (Codex finding 9) and say what claim.mjs does.
5. **Q67j promotion:** show no `kind:"promotion"` claim reaches QUALIFIED on any composition, through `qualify` or `admit`.
6. **No top-level QUALIFIED:** confirm `admit` is always DIAGNOSTIC and `qualify` always carries GATE-NOT-RUN, by reading every return path.
7. **Reference agreement:** rerun the claim_ref.py replay (59/59 on 0.3.9) and confirm the listed intentional divergences are the only
   ones.

## Limits
- Do not edit lab/bin/claim.mjs or anything under lab/acceptance. Your own tools and results go under lab/verify/E01/ on verify/E01.
- Never touch /Users/sam/projects/triplex-db or ports 15442 and 17019. Never send the user's email or personal details anywhere.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not spawn subagents.

## Return
Verdict ACCEPT, FIX-FIRST or REJECT; a per-check table; each finding with severity, cause (file:line), a reproduction command and a
proposed fix; your commit on verify/E01.
