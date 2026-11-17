North star: exact population, durable acknowledgements, and observable P2/P5 costs at 100,000 subjects.

These checks cover the changed code and the diagnostic harness. They do not grant a performance verdict on this busy host.

| Check | Result / retained log under `$EVIDENCE_ROOT/DX-T1/p14/` |
| --- | --- |
| Normal Datomic package tests | 382 passed, 52 external-service skips (`dat-unit-ports-2.log`); one inherited MaxListeners warning |
| Datomic package JS/declaration builds | Passed (`activation-build-direct.log`, `activation-types.log`) |
| W0 native-independent tests | 37 Vitest tests passed in four files (`w0-vitest.log`); 16 Node tests passed, four external-service skips (`w0-node-tests-2.log`) |
| Scale ingestion, native identity, phase anatomy, population policy | 24 focused tests passed (`reading-policy-unit.log`) |
| Activation receipt | Seven tests passed, including missing independent journal readback, wrong cuts and stale/foreign source/run/nonce (`activation-receipt-unit-5.log`) |
| Publication witness | Four tests passed with the existing read-only Mac boot identity query (`feed-witness-tests-2.log`) |
| New activation/seeding TypeScript entrypoints | No diagnostics (`activation-entry-types.log`) |
| Bench TypeScript | Diagnostic text equals the pre-change 48-line inherited baseline, with no new diagnostics (`bench-types-before.log`, `bench-types-after-2.log`); full bench typecheck is not clean |
| Focused checked-JS roots | Six roots clean (`checkjs-ports-2.log`) |
| Shell and embedded Python | Nine shells and 26 Python heredocs parsed; no Shellcheck installed |
| Physical Linux bootstrap | Inert plan and guarded platform selection checked; no installation, native cross-architecture image build or physical-server execution attempted |

Retained first failures: Turbo attempted the shared main checkout cache, so a direct build was used without expanding write scope (`activation-build.log`); an initial relative test executable path was wrong (`dat-unit-ports.log`); the first W0 oracle pool test found the S5-relative Python wrapper path, then passed after correction (`w0-node-tests.log`); one checked-JS invocation used the wrong positional syntax (`checkjs-ports.log`); sandboxed publication tests could not read the Mac boot identity and were rerun with only the required native access (`feed-witness-tests.log`).

The first native W0 clone completed the independent world/oracle/publication comparisons but correctly failed its final receipt because the controller omitted the full journal fold (`w0-clone.log`). The guard was kept strict and the controller now requests the missing readback. Its fresh rerun is indexed separately.

Full root `pnpm check`, `pack:check`, gateway-wide integration suites, and a 100k activation/performance verdict are not claimed. See [the content/freshness/binding audit](AUDIT-14.md).

Final focused regression: 17 tests passed across real-worker gzip drain, observed ACK guards, population policy and activation receipt (`drain-tests.log`); 19 W0 runtime/publication tests passed (`w0-drain-semantic.log`); the final focused JS root has no diagnostics (`forensics-checkjs-2.log`).
Bash 3 empty-array and inherited child EXIT-trap failures were preserved, then corrected with explicit child trap clearing (`activation-bash3-fixture-first.json`, `activation-bash3-2.log`). Distinct labels alone did not change recorder filenames; phase directories and graceful worker drains were then proved by the fresh 1k D attempt: all seven gzip shards validate and end with a successful final histogram.
Native content proof: fresh sealed 1k clone at c165501b and fresh seed/activation at 14f5297e each compare all 1,000 worlds, 1,000 independent Python outputs, 1,000 durable published states and the full journal fold. Earlier B/C content receipts are retained with tracing explicitly incomplete; neither replaces the final D recorder-health check.
The incomplete 100k reading is not a PASS: original report remains RUNNING, container OOMKilled/exit 1, complete offers/expirations and final model/oracle checks absent. Kernel source/cgroup binding confirms a guest-global OOM. All 18 completed-control phase counts and ACK p50/p99 match the observed-ACK tool within 0.001 ms (`ack-comparison-check.json`).

Final PG-attribution regression: nine native identity/bracket tests passed (`pg-bracket-unit-2.log`); focused checked JS passed (`pg-bracket-checkjs-2.log`). A preliminary invocation passed an unsupported `--files` option and was retained as a failed check. The 100k baseline has no qualified PG bracket within 35 seconds, so its aggregate ratio is unknown. No acceptance file mentions any of the 67 changed code paths (`pin-scan-14.json`); the contract is unchanged.
