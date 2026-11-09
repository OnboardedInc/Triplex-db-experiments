# Round 13 diagnostic smoke evidence

Durable root: /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-K01-R2/round13/20261109T061737

All raw output stays outside git. RAW-SHA256SUMS binds 99 files (206,902,402 bytes) across this smoke and the offline review attempts. Verify with `shasum -a 256 -c RAW-SHA256SUMS`.

The smoke directory contains complete native-wire row JSONL, source preimages, and observations/. The latter contains the immutable ledger.json (two ordered failures), source/fresh completed manifest.json, per-phase catalog/COUNT captures, D/Dprime/layout reads, owner snapshots and cleanup logs. Source hashes before/after the smoke match; the final offline code additionally fixes the missing hash helper and freezes catalog bytes immediately.

This is diagnostic evidence and grants nothing. Golden failed before copying into the slot; restart-1/restart-2 therefore concern the source volume, not a qualified clone. E1-comparison is diagnostic only. Both slot-volume removals and golden removal exited zero; cleanup-check.json records the subsequent shared-state checks. No volume is kept.
