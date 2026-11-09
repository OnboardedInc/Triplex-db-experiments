# Contract 0.3.13 evidence

Final code: c3ea35374ff8cbd8b3a476c70368ea56f2713395. Atomic integration/pin merge: 260d46c715ddd6465894869eeceab08059fcf4ef. See ../REPORT-0.3.13.md for the PASS audit, pin table, per-hunk decision, failures, limits and exact invocations.

- authority-and-pin-review.json / testkit-index.diff / atomic-pin-proof.json: original dispatch-main rule text, applied amendments, retired rule history and the single reviewed pinned-source hunk.
- source-and-hashes.json: final tested source and input hashes. source-merge-pre-gates.json and source076f.json are earlier snapshots, not final-source proofs.
- validation-summary.json / validate-evidence.py: checks the final named attempt outputs and retained object hashes. Revalidation does not run fresh gates or grant engine acceptance. Run the script from this checkout; SHA256SUMS checks every saved file.
- Final passes: verify-final-source.txt, contract-tests-c3ea.txt, screening-js-c3ea.txt, negtest-final.txt, evaluator-final.tap, q47d-final.txt, G0-{xtdb,datomic}-final-receipt.json and matching final raw directories/logs.
- Preserved failures: build-attempt{1,2,3}.txt (generator bring-up), contract-tests-initial.txt (generated field collision), screening-js.txt (initial relative import), negtest-initial.txt (superseded/malformed mutation targets), evaluator-attempt1.tap and evaluator.tap (same 105/108 failed attempt), G0-datomic-attempt1-receipt.json/raw/log (testkit's unchanged 5,000 ms timeout). reviewer-regressions.txt retains the superseded pre-DA00 null-image assertion failure; it is not a passing gate.
- Earlier successful attempts and partial captures remain separately named. negtest-before-doc-fix.txt is only a prefix copied while the run was in flight, not a result. negtest.txt is the completed corrected pre-document-boundary run; negtest-final.txt is the final-source run.
- G0-resource-objects contains the immutable parent-heavy-grant preimage, verified against the receipt SHA. A reusable live lock pathname is not a retained preimage.
- owned-cache-cleanup*.json records worktree-only disposable dependency cleanup; pnpm lock/store and source stayed intact. install.txt records the frozen offline install.

Every new evidence file is below 1 MB; this entire directory is below 5 MB. Historical imported bulky DA01/INT-D evidence remains at the durable paths already indexed by lab/experiments/INT-D. No new bulky files were committed here.
