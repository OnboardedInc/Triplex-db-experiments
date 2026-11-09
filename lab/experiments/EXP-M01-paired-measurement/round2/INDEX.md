# M01 rebase round 2 evidence

- `tests.tap`: 52/52 offline tests, including the reviewer F1 fixture and version-2 history recompute counterexample.
- `historical-recompute.json`, `rebase-recompute.json`: older receipt outputs remain MATCH; their captured runs remain historical diagnostics.
- `typecheck.log`: targeted strict check, including the new helper/test; exited zero (permit waits only).
- `clean-install.log`: clean local clone's frozen offline dependency install with pinned pnpm and owned store.
- `clean-build-check.py`: exact clean-checkout validation script, run from the task worktree; extracts the prebuild line from the runbook, checks clean status and no prior dist, then executes it in runs/m01r2-clean with canonical shared heavy locks.
- `source-hashes.json`: old/new hashes of the changed harness source; no acceptance pins changed.
