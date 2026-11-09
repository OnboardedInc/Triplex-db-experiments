# Round 5 reviewer evidence

Verdict: scoped ACCEPT; see `../VERIFY-round5.md`. Candidate `9b1a9a59ad223fd0fb3e8ff0de4d0d15fed4dafc`; reviewer merge `49a701188c1be4ed31a49677c1bd8b4a2d1c1591`.

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQNODELAY/round5/`.

- `attempt1/source/`: exact candidate-only source/config preimages and existing-dependency symlink. Dependencies are not copied or hashed as source.
- `attempt1/reader-audit.json`, `builder-tests.*.log`, `declarations.*.log`: fresh 54-test/declaration results and 1,018-input audit. Suite/declaration assertions passed before the later reviewer collector failure.
- `review-attempt1.mjs`, `review-attempt1.log`: exact initial reviewer runner and its inline-probe quoting failure; retained unchanged. Attempt-1 raw fixtures/consumer outputs are also retained.
- `review.mjs`, `review.log`: corrected resumed collector, heavy label `CX-VQNODELAY-R5-resume`, observed exit zero. It revalidates candidate/audit bytes before reusing the passed suite, reruns consumer observations, tests the planted read and incorrect classification, checks defaults, replays historical arithmetic, and verifies all 2,093 builder manifest entries.
- `attempt2/result.json`: full result including 1,037 source/config hashes. Committed `result.json` contains the compact observations and points to that source list.
- `attempt2/fixtures/`, `qg1-*.{stdout,stderr}.log`: exact positive/malformed current-version inputs, report/load NDJSON and real summary subprocess output. Controller/oracle dependencies in complete-body units are synthetic; no real controller receipt is created.
- `attempt{1,2}/mutation-preimages/`, planted-guard logs, `attempt2/misclassified-guard.json`: exact direct-read source, actual failing guard test, and expected audit refusal despite an incorrect hash-matching non-reader classification. Plant removed from the source copy after successful collection.
- `notes.mjs`, `notes-result.json`, `notes.log`: nonblocking fail-closed final QG1 aggregate compatibility note.
- `pin-audit.py`, `pin-audit-result.json`, `pin-audit.log`: current candidate-delta inspection against object and dictionary pins plus all tracked contract-file references. No new affected pin.
- `seal.mjs`, `seal-result.json`, `DURABLE-SHA256SUMS`: byte manifest of durable source, fixtures, logs and results. No engine PASS implied.
- `SHA256SUMS`: compact committed artifacts and report bytes; verify from this directory with `shasum -a 256 -c SHA256SUMS`. Absolute durable entries can be verified with `shasum -a 256 -c DURABLE-SHA256SUMS`.

Initial command was `node lab/bin/heavy.mjs --label CX-VQNODELAY-R5-review -- node --import ./lab/verify/QNODELAY/round2/bootstrap.mjs --experimental-transform-types lab/verify/QNODELAY/round5/review.mjs`, before preserving the initial runner as `review-attempt1.mjs`. The resumed command substitutes label `CX-VQNODELAY-R5-resume` and uses the corrected `review.mjs`. Both retained their actual combined output logs.

These tools intentionally exclusive-create attempts/results; another run requires new paths. The initial helper is not rerunnable against the existing attempt directory. No raw evidence was overwritten or relabeled. All fixture timings are synthetic; the 120/240 versus 0/240 result is historical arithmetic replay, and the new reader explicitly refuses its legacy envelope rather than upgrading it.
