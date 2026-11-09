# CX-QG1 durable evidence

Root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QG1/`.

`SHA256SUMS` lists the retained files relative to that root. Large evidence stays outside Git.

- `phase0-copy/`: immutable captured base and persisted delta from the shared resident; no shared writes.
- `phase0-attempt1/`, `phase0-addendum.json`, `phase0-container.json`, `phase0-start.sh`, `phase0-server.log`: exact phase-0 requests/responses, sample comparison and rebuild observation.
- `seed-4000/`, `seed.log`: first complete seed, rejected for exceeding 10M.
- `seed-3950/`, `seed-attempt2.log`, `base-10m-attempt2/`: accepted construction input, original manifest and padded 10M N-Quads; not performance acceptance.
- `grid-M-attempt1/`, `grid-M.log`: first grid stopped on the metadata-shape parser, after N=0 passed C8. Its later update was not adopted.
- `grid-{M,U}-attempt2/`: eight cells per arm, response bytes, request metadata, before/after persisted envelopes, C8 logs and 20-subject P4 samples. `summary.json`, `N*.json`, `rebuilt.json`, `rebuild.json`, `f05.json` are diagnostic observations.
- `source-attempt1/`, `source-attempt2/`, `phase1-start.sh`: retained runner/controller preimages and actual startup script. The second source copy was made during the run; its note preserves that timing limitation.
- `server-{M,U}-attempt2.log`, `start-*.log`, `cleanup-*.log`: engine lifecycle and actual cleanup outcomes.
- `compression-*.json`, `small-file-compression-*.json`, compression helper sources: lossless-retention receipts. A `.gz` suffix replaces some completed uncompressed evidence files. Full decompressed bytes were checked before unlinking the quiescent source copy.
- `summary-final-reviewed.json`: 16-cell summary, descriptive fits and isolated sample-screen points; no qualified threshold.
- `change-receipt.json`, `cleanup-final.json`, `template-inventory-update-only.json`, `final-checks.log`: final source change hashes, cleanup observations, update inventory and targeted checks.

No file here is an independent acceptance PASS. The report lists the missing gates and the distinction between a test pass and performance admission.

`final-artifact-audit.json` records the retained-byte replay. `template-inventory.json` preserves the first false finding from matching a read-only SELECT; the corrected inventory selects the persist assembly. `built-public-packages.tgz` retains the built package bytes. Finalization shell preimages are retained separately.
