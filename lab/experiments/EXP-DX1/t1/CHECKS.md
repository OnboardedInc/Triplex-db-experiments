# DX-T1 checks

Final implementation: `f6893eca95524bb4ecd715f442e8bcb23b8169c4`; full pair and four-arm cost producer: `0c1fa43b93562e3774b09e18c9e351decc0741da`.

The normal Datomic package test command passed 187 tests, skipped 51 external-service integration tests. Nine tracing tests cover HTTP and real-worker propagation, nesting, foreign attempts, summary retention, deterministic read sampling, exact phase top-20, failures and recorded-fixture reports. The Datomic build/declaration and no-emit type check passed. Five new JavaScript roots passed the lab binding checker; touched recorder/report modules passed lint.

`smoke-h/gateway-trace-tests.log` records 3 tests / 14 assertions / zero failures and includes a real JFR dump/hash check. `smoke-h` independently replayed 53 reads / 3,625 entities with oracle PASS, and all 1,963,797 model-checked reads matched. Its 84/84 writer traces satisfy scope coverage.

The benchmark-wide TypeScript command still fails in untouched `audit-traffic.ts`, `round2.ts` and `hs01-seed.ts`; no changed file appears in its final diagnostics. Root checkjs has historical errors and omitted old roots. A full root `pnpm check`, browser application suite and opt-in backend suites were not run. The public tarball checker excludes the private Datomic package and was not run.

The generated full-pair viewer passed an offline browser check: commit/read filters, hover and overlapping events worked; no HTTP requests or JavaScript errors. Receipt and screenshot: `tx2-dxt1-q8-b-ladder/viewer-qa.json` and `viewer.png`.

Fresh run report and raw SHA256 manifests were reread successfully for smoke-g/h, q8-b zero/ladder and all four cost arms. Every corresponding owned resource inventory is empty and the measurement lock is absent. The archive tool was tested on a disposable fixture: bytes preserved, reports left in place, existing destination rejected. No actual experiment evidence was archived or deleted.

Receipts are under `~/Claude/Projects/triplex-db-2/evidence/DX-T1/checks/`. Original failed attempts remain. Checksums below bind the observed files; a successful process exit alone is never a semantic verdict.

| receipt | bytes | SHA256 |
| --- | ---: | --- |
| `summary-checks.log` | 5507 | `acd2cafce17087cee79724e04be022a57efcc98e74fb3a86bd3134c2bd6c0248` |
| `package-types-last.log` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `checkjs-trace-final.log` | 81 | `98ae74c45b82c8aaea43b6fc50e51c1786be6096454e6ded67cdc891d9ddabe2` |
| `bench-types-final.log` | 4589 | `9bdc5be8f7bcded236b5926abe6dbeb6a2d015fb32e379c0117ab898a693d50f` |
| `checkjs-first.log` | 251990 | `ed411cf171ec641013c389e07292cb782398e945f33061858afbea3a5d732d1c` |
| `lint-summary.log` | 91 | `f5a3ba7e531f6f35bd9ec8c9d75032dd5624948576983044191e69d0337ed2e0` |
| `verify-final.mjs` | 1904 | `e1db762dbc431d45070eea56e2ea051653f444a5dc4654c7b691029f372a19e2` |
| `verify-final.json` | 1957 | `6e61a1dd24b7359bea33e5b86093499b5735e75d11bc9467818198752505b73e` |
| `pin-audit-final.json` | 57 | `30caddebb72baa45a27e3a22eeba55e440ec002027adb6bcbc82392e627c694f` |
| `store-test.json` | 94 | `747442cf641f47266f9227165daeb4ee5f71dbfba89bd0e135b01d9aab8384e7` |
