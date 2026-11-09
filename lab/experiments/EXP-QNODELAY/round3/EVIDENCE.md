# Round 3 evidence

Durable directory: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QNODELAY/round3/`.

- `final2.log`: final heavy-run command, 20 tests and 75 required-mode shape checks, exit zero observed separately; all source hashes rechecked.
- `final-summary.json`: compact final result; metadata/type-contract checks only.
- `source/`: exact tested source preimages (521 discovered scripts plus checker metadata/declarations and root command/report).
- `review-inputs/`: reviewer round-2 report, reproduction and inventory/evidence audit.
- `syntax.log`, `lint3.log`: final focused syntax and lint checks (zero errors, seven inherited warnings).
- Earlier logs preserve initial failures and source iterations; use only final2 for the final gate. `gate-final.log` is the ambient Node types failure.
- `qnodelay-timing-candidates`, `qnodelay-sinks`: initial timing-field and serialization searches; final source-inventory.json is broader and authoritative for discovery.

SHA256SUMS binds actual durable bytes, not performance or semantic acceptance. No engine lifecycle or workload run in round 3. Prior round evidence unchanged.
