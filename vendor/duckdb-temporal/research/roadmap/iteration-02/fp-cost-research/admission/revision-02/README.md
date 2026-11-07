# Revision02 research correction and source proof

Read **TRANSACTION-ADMISSION-ADDENDUM.md** and **CANDIDATE-DESIGN-PROOF.md** before the preserved revision01 REPORT. Request preparation must precede BEGIN/staging; merely checking before the final native SQL is insufficient. No production fix is selected or implemented.

- **TEST-SPEC-ADDENDUM.md** adds mandatory no-DB-entry/request snapshot/receipt/callback tests.
- **PRIMARY-SOURCE-ADDENDUM.json** independently verifies pinned DuckDB-Python Git blobs/SHAs, resolving the earlier string converter/ownership source gap without rewriting earlier failed retrieval evidence.
- **request_snapshot_model.py / request-snapshot-results.json** are untimed no-DB research models, not actual transaction acceptance.
- **REVISION-PROVENANCE.json** references the untouched22-entry revision01 manifest and exact unchanged production hashes.

Query-only normalization does not eliminate all existing TypedFact/Value staging callbacks. Post-fetch detection does not establish safe rollback under corrupted controls. Both limitations are explicit in the candidate proof; root must preserve/select precise semantics before authorizing implementation.
