# DX-B7 working state

North star: P1 concurrent pinned reads, P2 writer isolation, P3 notifications, P4 read cost.

- Step 1 committed: `7dd9877f`. Native cases complete on both layouts; 300 differential cases passed as three adjoining RNG-preserving 100-case shards. Experiment targets still missed.
- Step 2 is the current package source. VM matrix complete; both complete layouts and all 300 adjoining differential scenarios passed via `run-step-gates.sh step2 a`.
- Steps 3 and 4 are prepared ONLY in ignored `candidate/`; they are not the running package. An isolated in-memory helper passed 53,704 assertions after cache generation protection. Later verification bit-comparison changes still need fresh tests.
- Bulky captures/logs/JFR and candidate snapshots are under `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B7/`.
- Do not adopt the early timed-out mixed batches as whole-attempt successes. Their complete legacy/lean file slices are identified separately in `step1-gate-union.json`.
- Original profile A is empty. Profile B has unchanged gateway bytes, with partial harness startup byte binding documented in `PASS-AUDIT.md`.

Next: finish step 2 gates and commit. For step 3 apply candidate `reach.clj`, `entity_cache.clj` and selftest, but construct `main.clj`
from the current package with the connection-generation transformation; candidate main already contains step 4 notification calls.
Then run the VM matrix and full gates with `B7_DIFF_VERIFY=true`. Apply notification files only for step 4. The full report is committed last.
