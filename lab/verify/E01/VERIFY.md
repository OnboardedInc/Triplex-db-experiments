# V-E01: independent verification of lab/bin/claim.mjs

## V-E01 on exp/E01-claim-evaluator 2796455: FIX-FIRST (saved by the orchestrator, 2026-11-08 02:15Z)
**Verdict:** the four round-8 fixes (Q67b, e, i, j) hold for every case they claim, but the report's "still unprotected" list is
incomplete: two tamper routes need no process escape and are not named (a wrong candidate reaching `offlineVerdict` QUALIFIED; a build that
rewrites the evaluator so the next honest run returns top-level QUALIFIED with exit 0). Evidence: verify/E01 e7fca9f,
lab/verify/E01/ there (v-e01.test.mjs 23 tests, a "GAP" test turns red when fixed; t3-driver.mjs; mutations; reference-replay.json).

| # | Check | Result |
| --- | --- | --- |
| 1 | Tests are real | PASS: 112/112; 9 mutations each break their guard; dropping the runtime listing (M1w) leaves RUN-ALIAS-DIST green |
| 2 | Q67b identity | PARTIAL: changes with source runner, node_modules file, symlink text, linked external dir, lockfile, buildSpec; not with a file symlink's target bytes or the `node` on PATH |
| 3 | Q67e isolation | FAIL: caught T1, T4, T2a (double fork), T5-blob, T8; setsid (T2b) escapes and is named; T3, T5c, T6, T7 not caught and not named |
| 4 | Q67i comparators | PARTIAL: all 7 agree pass/fail; every non-exact comparator is UNCOMPARABLE on an O-REPLAY answer object; CMP-ERROR `cause` accepts any non-null |
| 5 | Q67j promotion | PASS (admitCore ignores kind, F8) |
| 6 | No top-level QUALIFIED | PASS with notes: 6 early-return and exception paths lack GATE-NOT-RUN; the floor lasts only while claim.mjs is intact (F1) |
| 7 | Reference agreement | PASS: 59/59, 10,712 executor calls, 63/63 documents DIAGNOSTIC |

- F1 High: evaluator files hashed only at start and end of one run, no reference (claim.mjs:1166, 1182-1186); a build that rewrites
  claim.mjs poisons every later run (shown: the next honest C2 run returned QUALIFIED, exit 0); an edit restored before the end hash goes
  unreported. Repro T3.
- F2 High: an unpinned COMPILED oracle is read lazily after candidate code ran, through git that honours replace refs (:1134/1140/1144,
  :495); `git replace` on the authority commit swaps lab/oracles/contract/cli.py; T5c: a wrong candidate reaches offlineVerdict QUALIFIED.
  Contract conflict: Q59e and the oracleRunners filesRule make claims on unpinned oracles DIAGNOSTIC, but contractBlockers (:355) and
  build_contract.py:1569-1570 accept COMPILED oracles. Repro T5.
- F3 Medium: toolchain.node is the evaluator's process.version while children run the first `node` on PATH (shown: v24.13.0 ran, identity
  said v22.23.2); a file symlink contributes only its link text; executionSha256 hashes the claimant's composition, which localSut never
  applies; file modes not hashed.
- F4 Medium: one HOME/TMPDIR for every child (:969); a file the candidate's build plants is visible to every A0 run. Repro T6.
- F5 Medium: row comparators need a top-level array but an O-REPLAY answer is {commandOutcomes, queries, state}, so CMP-SET-ROWS,
  CMP-BAG-ROWS, CMP-ERROR and CMP-PAGES are UNCOMPARABLE even on identical bytes (fails closed; no candidate can pass those cases).
- F6 Low: CMP-ERROR `cause` check is `!= null`. F7 Low: deleted evidence not detected (:1187 re-hashes only objects still present).
  F8 Low: admitCore never reads `kind`. F9 Low: early returns lack GATE-NOT-RUN; :1187 outside the try throws EACCES. F10 Info: walkTree
  follows directory symlinks (reads outside the checkout; walks pnpm links repeatedly).
- Named and holding: setsid escape, TOCTOU (not attacked), runtime re-hashed only between instances, no network isolation. The report's
  "double fork escapes" is wrong: double fork is killed (T2a); only setsid escapes.
- Rulings: Q75 (pending).

## Delta check of round 2 (CX-VE01-3, Codex reviewer at high) on 422c8d3: FIX-FIRST, one gap (saved by the orchestrator, 2026-11-08 21:49Z)
F1-F10 checks hold in new variations; 126/126 tests; reference replay 70/70 (13,840 calls). The remaining gap: a case input deleted or
rewritten after its final use is not detected (both variants end offlineVerdict QUALIFIED with only GATE-NOT-RUN / RUN-NOT-ON-GATE), and
the documented limitations do not name it. Evidence: verify/E01 9a1f51e (lab/verify/E01/VERIFY-round2.md, round2/attempt3/). Ruled Q81a.
