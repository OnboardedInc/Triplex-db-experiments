# CX-VDI01 round 3 evidence

Root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VDI01/round3-review/`.

- `binding.json`, `source/`, `reviewer-tools.json`: exact source/tool preimages, hashes and committed merged HEAD `fa827a3c524098829f9c28f3e03207245e331a44`.
- `source-proof.json`: actual target/merged code equality, four changed paths and their old/new hashes, unchanged prior conflict files and acceptance.
- `steps.json`, `gates.log`, `contract-verify.log`, `di01-suite.log`, `evaluator.log`: exact commands/exits/log hashes; separate contract verification, DI01 18/18, evaluator 108/108.
- `pack/triplex-pack-vSbkWQ/`: lab PACK PASS; 12 fresh packages, 25 isolated imports, new offline clean consumer, tarballs/command logs/receipt.
- `original-gap.log`: unchanged round-2 GAP test's expected single assertion failure because the tagged refusal replaces the old plain-error message.
- `reviewer-probes.log`, `probes/exact-gap.json`, `probes/exact-gap.db`: exact GAP inversion, shared class identity, zero BEGIN calls, unchanged state/reopen and identical-page recovery.
- `probes/row-matrix.json`, per-case databases: all five row-condition groups through seven rows, exact payloads, no write transaction on refusal, reopen equality and backend error identity.
- `GS06/`, `oracle-control-*/`: original suite assertions, with raw output redirected into reviewer-owned evidence.

The manifest excludes dependency installations, npm caches and bin symlinks. Its paths are relative to this round's durable root. Inventory metadata is bound separately to avoid recursion. This is scoped offline R2-F1 evidence; it contains no actual backend-retention or fresh full trace/crash/lag qualification.

Completed inventory: 150 non-cache files / 3139632 bytes. `SHA256SUMS-round3` SHA256: `8ed2227b4f0d77bbe014db6f93886fcfd9b1495eb61e856ca9bcfc6ecfe34422`. `INVENTORY.json` SHA256: `338b6fb61b81e61ccd960046321a759d7a8835083ab1658c1b0748cba44c1047`.
