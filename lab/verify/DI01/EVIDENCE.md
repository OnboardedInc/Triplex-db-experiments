# CX-VDI01 evidence index

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VDI01/`.

- `contract-verify.log`, `evaluator.log`: separate committed-merged-tree contract verification and 108/108 evaluator suite.
- `readback-1/result.json`: independent readback of all 438140 original trace positions and all 900 original crash databases; `readback.log` retains the command output.
- `r2/pack/triplex-pack-5GLk4h/`: accepted lab PACK gate PASS, 12 packages and 25 isolated imports; fresh offline consumer, tarballs, receipt and 69 command records/logs.
- `r2/root-pack.log`, `r2/root-pack/`: literal upstream `pnpm pack:check` failure on missing DuckDB dist, retained separately.
- `r2/fd01.log`, `r2/di01-unit.log`: 13 FD01 and 11 DI01 tests passed.
- `r2/reviewer-runtime.log`, `r2/runtime/`: restart/overlap and expiry-seam snapshots; concrete plain-Error refusal reproduction in `untyped-refusal.json`. The GAP test deliberately passes when the defect exists.
- `r2/fresh/binding.json`, `r2/fresh/preimages/`, `r2/fresh/cases/`, `r2/fresh/crash/`: fresh bound nine-case/boundary and 900-trial DI01 runs against the merged build.
- `r2/commands.jsonl`, `r2/feed-binding.json`, associated logs: full frozen command stream and independent Python comparison of all 438140 actual delivery digests.
- `r2/gate-steps.json`, `gates-r2.log`: exact commands, timestamps, exits and log hashes on committed merged HEAD `aa34513a562a9a7512318f20e277ef2b02c060a8`.
- `reviewer-source/`, `reviewer-source.json`: exact reviewer tool preimages and hashes.
- `pack/triplex-pack-6Gs8oJ/`, `pack.log`, `build-w0.log`, `gate-steps.json`, `gates.log`: retained first cache-miss and reviewer command-option failures. `install.log` records the successful frozen offline workspace install.

Original builder evidence remains under sibling `CX-DI01/`; the source report and committed builder manifest identify it. Reviewer raw evidence was not written into that builder directory. The control copied from `di01-oracle.test.ts` changes import paths/evidence destination only.

`SHA256SUMS` here uses paths relative to the durable reviewer root. It includes raw observations, tarballs, generated consumer inputs/lockfiles, source/build preimages and failed attempts, and excludes dependency installations, npm caches and bin symlinks. `INVENTORY.json` in the durable root records the denominator and manifest SHA256. The inventory's own outputs are excluded to avoid recursion. No engine slot was used.

Completed inventory: 4513 files / 336320001 bytes; manifest SHA256 `919e81908d60da567c36cf898f57164e62bea77fca0a8b3150dc4cdf5e278a81`. Inventory JSON SHA256 `f2081a51ef733de9c35f0cf3a9e22b1c6d716fdd4065af1e6d4b73310cef8ac5`.
