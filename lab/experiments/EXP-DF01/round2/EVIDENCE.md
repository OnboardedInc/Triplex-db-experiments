# DF01 round-2 evidence

- `offline_verify.clj`: exact probe copied from `verify/DF01` d4f06d59; its assertions are unchanged.
- `attempt-before/`, `before.log`: fresh reproduction on the old loop, exit 1 on F1. Retained as failure evidence.
- `attempt-after-01/`, `after-01.log`: fresh fixed-loop suite, 16 tests / 171 assertions, zero failures/errors.
- `focused-tests.json`, `focused.log`: unchanged four TypeScript feed conformance tests, 4/4 pass.
- `G0.log`: fresh full gate `G0-datomic-20261109T081416Z-e9ae93`, 1,279/1,279, 66 expected skips.
- `SOURCE-SHA256.tsv` and `provenance.json`: source change hashes and exact copied-probe identity.
- `SHA256SUMS`: current round artifacts and the appended parent report; excludes itself and `index.log`.

Fresh G0 raw output, receipt and verified content-addressed preimages are retained under
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DF01/round2/` and indexed by `DURABLE-SHA256SUMS`.
Canonical G0 receipt is committed under `lab/runs/G0/`. No actual Datomic peer was started or used.
