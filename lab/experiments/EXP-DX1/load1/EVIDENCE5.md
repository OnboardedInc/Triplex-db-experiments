# DX-HA1 part 5 evidence

- Overnight bare-metal input is DX-BM1's durable `overnight/i13-1` (source `bd2ce3bf9957af8da948a44d353e68aa06ae9c5a`, slot `loadtailn19`, nonce `127f6fa9-b88d-4733-b00e-d91e540e8f7d`). Its independent reconciliation covers 32,400 offers from the five arms.
- The same-scope attribution is under `DX-HA1/load5/i13-1/overnight.json` in durable evidence. It retains per-save stage matches, native transaction times, long log-path parks, GC, and index intervals. Index adoption overlaps are process-wide and retain their own basis identity.
- To replay, extract the raw archive's `import/load-tail-<nonce>/` members into a fresh directory and add `attempt.json`, `cleanup.json` and `observations.json` from the summary. Run `node --import tsx lab/experiments/EXP-DX1/load1/overnight.ts <extracted-directory> <original-i13-1-directory>`.
- Attribution audit. The analyzer checks exact request, terminal, archive, JFR original hashes and event counts, original offer tape hashes and summaries, nonce, source, slot, scope, process clock/boot and matching database/transaction identifiers. It reports historical observations, without issuing a new verdict or receipt.
