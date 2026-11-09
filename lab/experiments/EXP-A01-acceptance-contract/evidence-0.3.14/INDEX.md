# Contract 0.3.14 evidence

Tested source `df4881217056137dfba549359cdc7a5a492b2f77`, merged main `55e7c524c002a044bb48a6ead724b3be8d34e7d7`. Builder results only; independent review pending.

- `validation-summary.json` and `validate.py`: actual content, freshness and source/slot/input binding checks.
- `authority-and-pin-review.json`, `pending-authority.md`, source diff and `rt01-pin-comparison.json`: original authority, all 243 pinned paths, changed core hashes, single moved active source pin and per-hunk workload review.
- `RUNS.json`: exact source-bound execution receipts, retained failures and disk preflight refusals.
- `G0-*-receipt.json`, capture metadata and SHA256SUMS: fresh G0 raw/object/build preimages, captured before the next lane build.
- `G0-xtdb-attempt1-*`: original unexpected-skip FAIL, never replaced.
- `DURABLE-SHA256SUMS`: 2642 files / 30,371,650 bytes at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-A01-0314`; every byte rehashed here. No dependency caches copied.
- `SHA256SUMS`: small repository evidence. Large raw output stays in the durable directory.

Standalone verify, 23 contract tests, 519/519 executed mutations (607 catalog; 88 retired), evaluator 108/108, and XTDB/Datomic/QLever full offline G0 pass. No live/performance acceptance or obligation closure is claimed.
