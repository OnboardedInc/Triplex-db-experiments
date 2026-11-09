# DF01 round-3 evidence

The original and deadline-cut probes are byte-identical to reviewer commit `bedf7483`; the combined runner uses the actual current gateway.

- `before.log`, `attempt-before/`: retained timing-fixture miss (publication after expiry); not a qualifying predeadline counterexample.
- `before-02.log`, `attempt-before-02/`: valid predeadline window on old source; two content/checkpoint failures.
- `after-01.log`, `attempt-after-01/`: source-load failure (missing test delimiter), no semantic result adopted.
- `after-02.log`, `attempt-after-02/`: retained instrumentation/arity failure; not a passing result.
- `after-03.log`, `attempt-after-03/`: final 19 tests / 208 assertions pass, including a valid real-clock deadline probe.
- `focused-tests.json`, `focused.log`: unchanged four TypeScript conformance tests, all pass.
- `G0.log`, `G0-datomic-20261109T085657Z-6815e5`: 1,278/1,279; existing testkit timeout retained.
- `timeout-repro.log`: unchanged whole-file retry, 11 pass / 1 timeout. `timeout-case.log`: targeted case passed, 11 deliberately filtered skips; not a full-suite PASS.
- `G0-r2.log`, `G0-datomic-20261109T090324Z-69ac4b`: fresh complete G0 rerun, unchanged source/checks.
Canonical receipts are under `lab/runs/G0/`.
- `provenance.json`, `SOURCE-SHA256.tsv`: exact copied probe and source before/after identities.
- `SHA256SUMS`: current round artifacts and appended parent report; excludes itself and `index.log`.

Fresh G0 raw output, receipt and verified preimages are under
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DF01/round3/`, indexed by `DURABLE-SHA256SUMS`.
Previous report hashes are historical at their named commits; this round's index covers the current appended report.
No real peer, Docker command or engine slot was used.
