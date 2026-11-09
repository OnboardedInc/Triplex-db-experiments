# CX-M01R rebase report

Full report, conflict-by-hunk rationale, PASS audit, gates and open questions: [REPORT-rebase.md](lab/experiments/EXP-M01-paired-measurement/REPORT-rebase.md).

Result: merged main 1a83095c without history rewrite; PAIR default-off. Offline 50/50 tests and strict targeted typecheck pass; historical and fresh memory receipt recompute MATCH. No live slots/acceptance. [Runbook](lab/experiments/EXP-M01-paired-measurement/RUNBOOK-rebase.md) records the two-slot and 75-minute seed/partitioning prerequisites.

Round 2: F1/F2 fixed; 52/52 tests, targeted typecheck and the exact corrected clean-checkout prebuild pass. Paired R22 and single-arm Q100k grading are separate; Q100l handoff and preflight sample-count gap are explicit in the full report/runbook.
