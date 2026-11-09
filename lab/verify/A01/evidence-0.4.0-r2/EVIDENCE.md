# Independent contract 0.4.0 round-2 evidence

Reviewer CX-VA01-040. Source tested: committed `8fd292918694f31eb970312ee600c8dad3d1b84a`, identical outside `lab/verify/A01/` to candidate `35cb04b55309c35c5dd120ee05b5c0ac8e5ad7fa`.

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-040/r2/`.

`SHA256SUMS` indexes 161 files / 3,632,709 bytes. Verify with `shasum -a 256 -c <absolute-path-to-this-directory>/SHA256SUMS` while in the durable root. Manifest SHA256: `0ef229aad841013b1fb9f675bfa4786091bf0a4d90d564b88f0101f2359abbc9`.

- `artifact-audit.json`: source-bound command results, fresh G0/W0 counts, builder-evidence integrity and scoped ACCEPT.
- `static-audit.json`: exact new rulings, literal pending-row preservation, runner hashes and one changed projection leaf.
- `history-audit.json`: eight unused historical gate receipts and thirteen still-pinned static provenance inputs from the defective interval. Read the report's distinction before interpreting these counts.
- `mutation-results.json`: seven specific negative controls with raw diagnostics and mutant source hashes.
- `w0-empty-before.json`: empty dist before the fresh G0; prior build retained locally without reuse.
- `G0-xtdb-20261109T125135Z-c026e9.json`: exact terminal receipt. Durable `gate/runs/` holds raw output and verified content-addressed objects; `w0-built/` holds all 52 outputs.
- Durable `*.log`, `*.json`, `tools/`, `review-final.py`, `seal.py` and `seal-attempt1.py`: closed logs, actual execution records/heavy grants, tool preimages and preserved first reviewer-tool failures.

See `../VERIFY-0.4.0-r2.md` for verdict, historical limitations and the rule 9a audit. These are offline checks, not engine/performance qualification.
