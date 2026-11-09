# P2Q round-11 evidence

Reviewer CX-VP2Q-11. Verdict: **ACCEPT for default-off integration**; Q91a timings are DIAGNOSTIC.

- Builder: `be588639` (product `561410d2`). Tested integration head: `9820507c14f0560779bccf92df5941f19324389c`.
- Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2Q-11/round11/`.
- Attempt: `6a1c7eee-fa7e-4601-b3c0-49cbd241c275/`.
- `SUMMARY.json`: 19 adopted gates, six retained rejected producer receipts, 104 independent complete-byte comparisons, 80 extension controls, native mutations and CRC-checked metadata retirement records.
- `FINAL.json`: final source/result/case readback, native payload witnesses, actual heavy owner, free space and owned-process quiescence.
- `SHA256SUMS` inside the durable attempt: complete 4,742-file byte manifest. `symlinks.json` separately records 26 link targets.
- `preimages/`, `final-verifier-source/`, `native-scratch/`, `inventory-scratch/`, `states/`: retained actual source revisions, isolated mutations and owned fixture state.
- Each named gate directory contains immutable `receipt.json`, `command.log`, `vitest.json` where applicable, and case observations.
- `sandbox-failed-package-abort.json`: exact failed-run/fixture shutdown; never semantic acceptance.

The adjacent committed `SHA256SUMS` is compact: its paths are relative to the durable root above, and it anchors the complete manifest, summaries, 25 producer receipts and abort record. Raw outputs and source copies remain outside git.

See [VERIFY-round11.md](../VERIFY-round11.md) for exact denominators, first failures/retries, verdict audit, limitations and commands. Original rejected readback source is retained as `scripts/round11-seal.mjs`; `scripts/round11-seal-final.mjs` is the adopted readback.
