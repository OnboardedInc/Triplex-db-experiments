# Contract 0.3.14 round 2 evidence

Tested source `e96bfc3bb91f10d53d052a82fc0ed36a7cd3e614`; main `833ea552be2abaa97c74a6864d392fea9351047b` included. Independent review remains pending.

Final results: standalone byte-identical verify; 23 contract tests; 519/519 executed mutations (607 catalog, 88 retired); evaluator 108/108; 19 broker integer/JSON/codec tests; runtime type fixtures; full offline G0 on XTDB, Datomic and QLever. No obligation closure, performance or live qualification.

- `validation-summary.json`, `validate.py`: exact result content, fresh timestamps, source/head/main/input bindings and retained G0 raw/object/build bytes.
- `source-and-hashes.json`: final frozen source inventory. `source-and-hashes-attempt1.json` retains the prior round-2 source.
- `pin-audit.json`: all 247 active paths, changed source old/new hashes and zero moved active pins. Acceptance remains byte-identical to bed67f1f. The earlier audit is retained separately.
- `G0-*-receipt.json`, capture metadata and per-lane manifests: final fresh G0s; exact builds captured before the next lane build.
- `attempt1-G0-*`: prior passing XTDB/Datomic and failing QLever build/typecheck attempt, never replaced by final results.
- `RUNS.json`: both attempt series, exact command/log receipts and before/after source observations. Only r2b final attempts qualify this builder gate result.
- `domain-type-mutation.py`: preliminary compile-time optional-field control, with original/mutant/restored hashes and actual TS2578 diagnostic retained in durable round2. It is not an engine VM qualification.
- DURABLE-SHA256SUMS-1, DURABLE-SHA256SUMS-2: 3959 files / 45,520,671 bytes at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-A01-0314`; every entry freshly rehashed. Earlier round-1 files are outside this manifest scope and retain their original manifests.
- `SHA256SUMS`: all small round-2 repository evidence. No dependency caches or bulky raw output copied to Git.
