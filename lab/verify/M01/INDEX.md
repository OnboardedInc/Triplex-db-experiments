# CX-VM01R evidence index

- `VERIFY-rebase.md`: verdict, findings, all four requested review questions, limitations and rule 9a audit.
- `comparison.json`: exact config/verdict/dry-run equality and stable projections of four fresh PAIR-off driver runs. Raw reports are SHA256-bound here.
- `main-harness.json`, `reviewed-harness.json`, `harness.diff`: all effective configs, hashes, Docker argument arrays and legacy fixtures; diff is empty after normalizing only generated config-directory paths.
- `main-dry-runs.json`, `reviewed-dry-runs.json`: 21 dispatch cases per revision. Original incomplete-snapshot failure is retained in `main-dry-runs-attempt1.json`.
- `focused-tests.tap`, `main-tests.tap`: fresh 50/50 reviewed and 31/31 common-main tests.
- `challenge2.json`: original MATCH, changed-sample refusal and rehashed MISMATCH for both receipts, plus the synthetic hard-rule GREEN input/output. `challenge.stderr.log` preserves the first fixture assertion failure.
- `driver-attempts.json`: first attempt, including zero-delay main reader timeout. `driver-attempts-2.json`: four complete comparison runs. Corresponding stderr/stdout logs and `offline-run*.log` retain command outcomes and heavy-permit waits.
- `comparison-attempt1.stderr.log`: first comparison treated phase-triggered overlay timestamps as invariants; final comparator explicitly excludes them while retaining frozen background offsets.
- `install.log`, `build*.log`: frozen offline install, runbook failures and successful corrected build.
- `references.json`, `R44-reference.txt`: authority/source hashes and numbered R44 section 5/6/Q100k/l excerpts.
- `prepare-baseline.mjs`, `compat-probe.mjs`, `run-offline.mjs`, `compare.mjs`, `challenge.ts`: reviewer tools. `runtime/` is ignored and reconstructible from pinned commits.
- `SHA256SUMS`: raw evidence manifest; paths resolve under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VM01R/`, not this directory. It binds 29 files from both snapshots' raw `runs/` directories, including the incomplete first attempt. No dependency caches or external engine state are archived.
