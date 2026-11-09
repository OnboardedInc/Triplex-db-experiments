# CX-QNODELAY round 2 evidence

Durable directory: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QNODELAY/round2`. 172 regular files, 3,584,910 bytes. Verify with `shasum -a 256 -c lab/experiments/EXP-QNODELAY/round2/SHA256SUMS`.

- `checks.json`: builder regression outcomes and source-manifest binding; no production verdict.
- `source/`, `source-manifest.json`: copied final changed/new code/config/test preimages. Sources were rehashed before report completion; package outputs are also in the tarball/live preimages.
- `package-final.json/log`: final package test execution (64 passed, 21 skipped). `parity-final.json/log`: 26-case parity matrix plus six connection tests. `decoded-budget.json/log`: strengthened highly compressible decoded-byte-budget fixture. `receipts-first.json/log`: 10 source/receipt fixtures.
- `writer-types-final.log`: required-field gate, 41 actual source-derived constructor shapes; all compile with mode and all fail without it; runtime JS/declaration fixtures checked. It binds checker/inventory/writer hashes and checks source stability. Earlier `writer-types*.log` failures remain.
- `build-final.log`, `typecheck.log`, `lock-check.log`, `lock-preservation.json`, `pnpm-normalized-lock.yaml`: build/typecheck and offline frozen dependency validation. Minimal lock contents equal pnpm's normalized graph; unrelated ordering changes were not retained.
- `live1/`, `live1.log`: fresh sequential read-only built-package diagnostic. 520 validated responses, 40 warmups excluded. 120/240 keep-alive stalls at >=35 ms; 0/240 per-request. Contains decoded result bytes, copied source/build/slot/helper/dependency/lock preimages and actual resident binding. It is DIAGNOSTIC, not P1/P4 admission.
- Package `.tgz`, `pack-check.json`, `packed-consumer/`, `packed-consumer.log`: archive entry/dependency inspection and fresh gzip response checks through extracted public exports, in both modes. Consumer symlinks point at local pinned dependencies and are not copied/checksummed as dependency trees.
- `parity-first`, `truncated`, `parity2`, `writer-types`, `writer-types2`, `build.log`: retained intermediate failures/nonfinal runs. A successful test JSON with nonzero runner exit is not adopted as a final gate.

Repository `review-inputs.json` identifies actual reviewed QA artifacts; `receipt-writers.json` inventories the changed producers; `changed-source-hashes.json` and `changed-pins.json` retain old/new bytes and the stale CS-ENTRY pin. The main `REPORT.md` has the round-2 changes, PASS audit, numbers and explicit unverified boundaries. Original round-1 evidence/manifests remain unchanged.
