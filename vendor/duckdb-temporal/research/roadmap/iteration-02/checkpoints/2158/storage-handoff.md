# Frozen storage implementation handoff

30 October 2026. **All five assigned production-source write ownerships are released.** The coordinator may integrate/review them. No source changes are planned by this worker.

## Implemented scope

- Public read-only, fail-closed target-specific FP environment binding, independent of the optional evaluator.
- Masks-only preflight before initial Python f64 bit extraction; exact finite/zero checks; immutable cached canonical bit identity/hash/order; unchanged public Value construction/wire/carrier shape.
- Full supported-control guard at typed-store, connection/migration, inherited readiness, codecs and close/checkpoint boundaries. Closed-close idempotence, no host repair and real no-engine persistence preserved.
- Real hash-pinned item2 store harness plus isolated reproducible FP/no-engine/lifecycle/error-atomicity tests and inspectable source-only helper.

Selected design details, fresh CPython/glibc citations and limitations are in **FP-IMPLEMENTATION-FINDINGS.md**. The prior SIGFPE and diagnostic pickle evidence remain unchanged; no production pickle was added.

## Actual verification

| Check | Result |
|---|---|
| FP guard/Value/codec/no-engine/lifecycle |7 unittest groups,56 isolated children pass; controls restored; ABI independently compiled/checked; no skips |
| Unchanged typed units, real native present |19 run:18 pass,1 existing absence-arm skip |
| Unchanged typed units, genuine native absent |19 run:17 pass,2 existing native-only skips; normal persistence and unavailable-evaluate rollback execute |
| Unchanged legacy units |23/23 pass; largest observed disposable fixture4,468,736bytes |
| Real item2 store, final normal-a artifact |13/13 pass,11 runtime fault rollback/reopen/retry subcases and18 structural/operator cases;0 failures/errors/skips |
| Source AST + tracked whitespace check |Pass |
| Protected legacy/schema/old-test/adapter fingerprints |All6 unchanged |

The exact final normal-a extension is `/tmp/temporal-roadmap-research/iteration-02/native-integration-final/build-normal-a/temporal_datalog.duckdb_extension`, SHA256 `480456248ffa53e453d41737a37cc2a2d54764ffbd449b9e6ea95f3d805d68b4`. It is byte-identical to the earlier approved artifact, but the final rerun uses the final approved path and frozen current storage source. `expression-store-final.json` records exact copied inputs, fixed confined ROOT and genuine native feature gate. No evaluator substitution, normal-project artifact replacement or confinement/cap relaxation was used.

**SOURCE-MANIFEST.json** pins the five exact source files, mirrored under `source-checkpoint/`. **VALIDATION-STATUS.json**, **FP-COVERAGE.json** and **PROTECTED-FINGERPRINTS-FINAL.json** pin the actual checks. The common selected contract remains SHA256 `56c7b0c54670d95c4b012e925e8d931963951129663f49f94e58d6ed76950180`.

## Coordinator integration and remaining boundaries

Root has acknowledged the needed source-copy dependency and explicit hash-pinned harness invocation in its verifier. `ROOT-INTEGRATION-NOTES.md` preserves the narrow requested changes; no root-owned verifier/docs/build files were edited here. Runtime helper binaries and DB/copy trees are intentionally excluded from the publication manifest. The helper's inspected source is pinned; ephemeral suite helper binary hashes were not captured and are not claimed.

These are bounded local storage checks, not the coordinator's global item2 acceptance, performance signoff or production certification. Compatible controls are required through connection/caller codec lifecycle. Existing admitted identity is stable, but new Python f64 admission rejects unmasked controls; unknown target/ABI/read failure fails closed. Already decoded/later encoded external JSON cannot be repaired, and hostile midcall state changes/finalizers remain unsupported. Failed close does not roll back prior commits; postcommit BudgetExceeded requires receipt reconciliation rather than blind retry.
