# Contract 0.3.13 review evidence

Raw output is retained outside Git at:

`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-0311/contract-0.3.13-attempt1/`

`RAW-SHA256SUMS` lists every relative raw path and SHA-256; `evidence-index.json` records the root, counts and total bytes. All raw outputs go there, including any file over 1 MB and all raw gate/oracle directories. The repository retains the report, actual review dispatch, scripts, small audited summaries and checksum indexes.

Raw evidence includes:

- `merge.log`, `merge-conflict.patch`: real current-main merge failure, never resolved by this reviewer.
- `*-results.json` and command logs: new candidate-only contract, evaluator, install, mutation and final regeneration observations.
- `mutations.json`, `mutation-reason-audit.json`: all 494 changed anchors, full child diagnostics, intended guards and fifteen-ruling coverage.
- `testkit-index.diff`: immutable single-hunk re-pin preimage.
- `G0-xtdb-*`, `G0-datomic-*`: actual current candidate G0 attempts, raw output and immutable content-addressed objects.
- `build-overwrite-audit.json`: three declaration files overwritten by the later Datomic build; first XTDB test still passed.
- `G0-xtdb-recapture-*`: justified XTDB evidence-capture rerun, linked to the first review G0; complete build bytes captured immediately.
- `G0-datomic-built/`, `G0-xtdb-recapture-built/`: actual built-file preimages checked against their own attempt manifests.

This is independent review evidence for an immutable candidate, not fresh live-engine qualification. The current-main merge is blocked, and standalone success is not a Q87 merged-tree PASS. Scripts recreate new scratch clones; use a new durable attempt path rather than overwriting retained runs.
