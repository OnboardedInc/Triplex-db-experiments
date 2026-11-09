# A01-040-R2 evidence index

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/A01-040-R2/`. `SHA256SUMS` here lists every durable file except the pack consumer install and npm cache (dependency caches, not evidence). Verify with `cd <durable root> && shasum -a 256 -c <this dir>/SHA256SUMS`.

Gates ran on committed tree `a2b1271f7c302368c5a9b0eb12f597f04f17184d` (`gate-head.txt`), clean before and after each command.

- `verify-after-merge.log`: `--verify` as its own step right after the main merge regeneration. `verify-committed.log`: `--verify` again on the committed merge.
- `contract-tests.log` (16 tests), `mutations.log` (41 of 41 caught), `evaluator.log` (108/108; durable only).
- `f1-runner-pin-check.py/.log`: declared versus actual O-CONTRACT runner file hashes at 4fa6192c (mismatch), a853fe42 and HEAD (match).
- `pack-gate.log`, `pack-receipt.json`: lab pack gate; tarballs and command logs are durable only.
- `G0-*.json`, `g0-*.log`: the three offline G0 receipts, moved out of the untracked lab/runs after the durable copy was byte-compared, so the next gate saw a clean tree.
