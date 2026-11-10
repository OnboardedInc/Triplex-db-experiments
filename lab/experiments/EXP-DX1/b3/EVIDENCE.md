# DX-B3 evidence index

All bulky evidence is retained at `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B3`. Verify `evidence-SHA256SUMS` from that directory; paths are relative to it. This immutable seal covers 2954 files. The manifest SHA256 is `681c2bf893ef60512f0e7fbcf04b1ee890f705acc047234597525d1cf560b197`. `CHECKSUM-VALIDATION.json` records a second readback with no mismatches; its SHA256 is `a4a7e4a4dc8f1efdcede0ceac41e35cef1b449b21665638d65768544dc03e888`.

- Final measurements: `bench-1794270094390-083990e2-6dc5-4146-b347-eb15cfcf3c0a/result.json`, raw serial/burst/reader/RYOW observations and `burst-wait-breakdown.json`.
- Final preimages: `m5-source-20261109-192133/`, including source/build SHA256 manifest, head, working-tree patch and pre/post-run checks.
- First performance miss: `bench-1794268877201-f6e8fefe-1c41-4c20-9e1e-d55b22a07b05/`; source `m4-source-20261109-190116/`.
- Final functional gate: `logs/dxb3-m5-finalgates.log` (203 passed, one permitted existing failure). Package typechecks: `logs/dxb3-m5type-*.log` (all nine exit 0).
- Native tail evidence: `tx2-dxb3-m5final/transactor-2026-11-10.log` and `measurement-metrics-summary.json`.
- Owned resource readback: `CLEANUP.json` (no containers, networks or volumes).
- First failures and superseded diagnostic source/stack attempts remain in `logs/`, `first-suite-oracle/`, source snapshots and earlier stack directories. The failed native-schema setup query was corrected before the final timed attempt.

`MEASUREMENTS.json` is a small diagnostic extract. `source-hash-changes.json` records edited code hashes; no acceptance contract was changed. These are author-run gates and measurements, not independent qualification or a scorecard PASS.
