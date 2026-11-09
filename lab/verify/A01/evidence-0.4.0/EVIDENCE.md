# CX-VA01-040 evidence

Verdict: **FIX-FIRST**. See [the review](../VERIFY-0.4.0.md).

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-040`.

`SHA256SUMS` indexes 429 files (35,307,069 bytes); all final entries were reread. Verify from the durable root with `shasum -a 256 -c <worktree>/lab/verify/A01/evidence-0.4.0/SHA256SUMS`.

- `artifact-audit.json`: terminal counts, gate/source/contract/grant and package content checks; original FAIL retained.
- `pin-history.json`, `literal-pin-audit.json`, `oracle-pin-regression.log`: independent authority/pin scan and F1 reproduction.
- `verify*`, `contract-tests*`, `mutations*`, `evaluator*`: fresh original-head commands and bindings.
- `pack/`: fresh tarballs, installed-consumer inputs, command records and logs. Dependency installations/caches are excluded from the manifest.
- `gates/`: four terminal G0 attempts, exact raw directories and all referenced content-addressed objects. Small byte-identical receipts are also committed here.
- `explicit-w0-*`: failed prerequisite spelling, corrected command, 52 built files and hashes supplementing the incomplete gate binding.
- `merge*`, `merged-*`: exact current-main test merge, mechanical regeneration, separate committed-tree verify, and Q87 108-test evaluator.
- `review-tools/`: exact retained collector/verifier preimages.
- `manifest-attempt1-SHA256SUMS`, `manifest-initial-check.json`: provisional manifest and the single late-closing collector-log mismatch; final manifest verifies all entries.

No raw evidence or first failure was discarded. Only this review's terminal untracked lab/runs receipt files were moved after exact copies were verified; original raw run directories/objects remain in the worktree as well.
