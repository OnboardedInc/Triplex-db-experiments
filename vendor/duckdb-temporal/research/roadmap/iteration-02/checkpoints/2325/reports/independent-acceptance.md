# Independent guarded-batch acceptance handoff

**Candidate 01 is INVALID. Candidate 02 passes the covered independent checks below; this is not overall item2 or performance acceptance.** No production source edits were made by this lane. All execution used immutable source snapshots and acceptance-owned exact copies with their computed ROOT and original caps; no live writer source import, ROOT monkeypatch, external evaluator or fallback.

## Version and execution identity

- Decision was preserved before implementation at coordinator main `347aae5eae3daa1b5a454f820b88f1a79b094a47`.
- First snapshot manifest `f435849b82375249b787f7cf3b316e4e25df9c29b8e1710f949aeed33215cfa0`, typed source `180d814a8946ceb1b5ab90408d8ce1f6a66c05b04dbc252cd8b9261f24ef1f8b`.
- Corrected snapshot manifest `40b7118ba1090194240d97acf6f2f62ebfdee76d7584d329758dcff7002c2c8c`, typed source **`25e9a4f178144070f85cbf1215dd1e12270ae0efbdd27be1dbf49ba9e76dcfdc`**. All12 snapshot files verified before candidate02 imports and rechecked unchanged after tests.
- Frozen hardened8b public codec reference: `abe7424366b9d528fa1378c8e9d5f12e7f4e80d93a1c433712a76d916760c555`. Separate package/source copy, not two new paths sharing one validator.
- Trusted native item2 artifact: **`480456248ffa53e453d41737a37cc2a2d54764ffbd449b9e6ea95f3d805d68b4`**. Copied from immutable performance artifacts into each genuine-positive source root's normal engine/build path. Never overwritten or substituted with the ordinary implementation tree's older binary.
- CPython 3.12.14, assertions enabled/optimization0; DuckDB 2.0.0 runtime **`e7cda112749d860a36cb1524ff465cefecdb0acc5c4e2ff4510ecc1b6f6c061a`**, same pinned Python2 dependency used by the coordinator's bound-string probe. No installs.
- Inspectable isolated test helper source `99e769a597fc51ce2fdfecbabb05fe50bf10ff836c703f57d87902b209612e9c`, binary `6c78b77d812008249eff8798a5f540036227914e78e0d7c5b337b2650abd603c`. Test-only; never production linked. Binary/database files are execution inputs, excluded from textual publication.

## Candidate01: preserve the negative result, not just covered PASS counts

The initial covered set passed 282 checks and 137 isolated children. It **missed two real compatibility/lifecycle defects** found by the other reviewer:

1. A Query program descriptor can call public `store.close()` through the same-thread RLock. Candidate01 rechecked FP only, then attempted BEGIN on the now-closed connection in query, query_json and evaluated transact.
2. Public Value's nonzero f64 initialization unnecessarily rewrote payload, invoking a subtype descriptor setter twice. Frozen8b succeeds for a single-assignment subtype on nonzero/subnormal floats;01 fails.

`checkpoint-01-review-defects.json` independently reproduces both defects with 13 negative-control assertions. Three genuine store operations reach DB execution after close; three nonzero/subnormal float controls differ from frozen8b. String/bool/i64 and both-zero controls preserve their original behavior. All earlier01 PASS outputs remain untouched and must not be called an accepted candidate.

Candidate02 rechecks full `_ready()` after request materialization and preserves the baseline zero-only payload rewrite. `checkpoint-02-review-regressions.json` passes all 13 regression/control assertions: no DB execution after descriptor close, correct StoreError/unchanged receipt/clock state, and exact frozen8b subtype setter behavior including both zeros. No source was fixed by this acceptance lane.

## Candidate02 actual results

**298 covered independent checks plus137 isolated child processes passed; no further defect was observed in these covered paths.** The16,376 float cases and480 insertion-order cases are aggregate corpus checks, not extra test-method counts.

| Evidence | Actual checks |
|---|---:|
| `checkpoint-02-results.json` |207 |
| `checkpoint-02-additional-acceptance.json` |17 |
| `checkpoint-02-request-reentry-acceptance.json` |58 |
| `checkpoint-02-review-regressions.json` |13 |
| `checkpoint-02-nested-public-context.json` |3 |
| `checkpoint-02-controls.json` |137 isolated children |

The ordinary codec checks cover:

- 16,376 sign/exponent/fraction finite binary64 patterns against explicit integer-bit expectations **and** separately imported frozen8b public admission/wire conversion; actual signed zeros canonicalize, all nonzero bits—including subnormals—remain exact.
- 59 explicit domain fixtures, multiple signed quiet/signaling NaNs and infinities rejected; UTF-8/NUL/surrogate/512-byte boundaries; exact bool/int64/f64/tag distinctions and unused fields exactlyNone.
- 480 key insertion-order permutations;14 outer fetch/root and16 nested shape cases;61 wrong-payload,84 unused-nonnull,9 wrong-tag and9 counter cases. Applicable rejected-input protocol hooks remain uncalled. These counts are case categories, not proof against arbitrary interpreter hooks.
- Shared `_carrier_payload`/`_canonical_payload` used by public and private paths; 257 cells visited through a late exact-domain error. Direct private wire path does not construct temporary public Values. Public guards remain independently fresh.
- Two fresh full private environment reads at 0/1/256 float cells (call-count observation, not timing). Public factory/carrier/to_json/from_json retain 1/1/1/2 reads. Exact from_carrier/from_json/store-ready calls also execute their fresh guards inside an active private conversion; ordinary GC and public string-subclass reentry are separately covered.

Genuine normal-root store checks use the actual final native engine, not a Python evaluator:

- Query/query_json/evaluated-transact snapshot all six fields once before budget/BEGIN/position/staging. Program str subclasses preserve stored characters without overridden str/encode/len hooks.54 malformed fields reject before budget/DB; closed-store entry precedes callbacks.
- Ordinary Query-descriptor callbacks can complete a nested genuine public native query before the outer transaction. Nested known_at1 and post-staging outer evaluation known_at2 behave independently; ordinary public Value guards remain fresh.
- known_at=None resolves to the actual transaction/post-staging position; explicit old snapshots and future-known rollback checked.
- Store strings511/512 bytes pass;513 and16384 bytes fail with the existing store cap. Programs above512 and at40000 bytes remain accepted;65537 native program bytes reject. The native bound is65536, not the browser32768 bound; the harness corrected this assumption before any candidate execution.
- Under supported controls, native division errors and wrapper conversion errors roll back staged clock/receipt/assert/retract changes. All six late carrier/domain/shape faults return no prefix, preserve native input, roll back through genuine native queries, then permit corrected same-command retry, duplicate receipt handling and close/reopen verification.
- A separate exact source copy contains **no trusted artifact**. Real persistence/reopen succeeds, while query/query_json/evaluated command raise NativeUnavailable and preserve state. No engine-selection or path/cap bypass.

The 137 isolated children cover 79 independent x87/SSE rounding/DAZ/FTZ/mask/sticky configurations, 54 per-field/request-method control/exception cases and 4 cross-call/GC/public reentry/defensive-return cases. Every child preconstructs floats before unmasking, restores saved controls before cleanup, and records terminal status. Mode/request children use converter/public boundaries or DB-entry sentinels, not real bad-state DB operations. Normal supported-state actual DB acceptance is separately evidenced above.

## Frozen199 specification reconciliation

`checkpoint-02-spec-coverage.json` explicitly maps all 199 frozen spec IDs:

- **181 ACTUAL_PASS.**
- **15 defensive converter-boundary PASS / actual external corruption timing UNRUN.** The physical matrix and first converter guard reject before packing; this does not execute a nonconforming native callee at each named timing point. Arbitrary native-corrupted controls and safe automatic ROLLBACK/COMMIT/close remain outside the selected continuing-supported-host/trusted-callee promise. No false “no DB cleanup” or safe-cleanup claim.
- **3 SPEC_UNRUN_IN_THIS_LANE:** native expression-TYPE transaction rollback; bad-control-close lifecycle restore/retry; postcommit-budget receipt reconciliation. Coordinator/writer's unchanged13-method expression and56-child FP/lifecycle suites own that broader gate; do not count them as independently run here.

An initial mapping left 3 exact active-private public-guard contexts partial. It is preserved as `checkpoint-02-spec-coverage-initial.json`; the separately named nested-context results close those 3 cases without rewriting prior evidence. All199 are **not** reported as independent end-to-end passes.

## Remaining gates and handoff

Source/artifact pre/post hashes are unchanged. No timed benchmark was run; fixed guard counts are not a persisted speedup or regression result. The coordinator still owns unchanged full suites, independent migration/clean export, final source/artifact review, matched persisted performance, durable publication and overall item2 acceptance. UI/deployment/production readiness are unclaimed.

Useful files: `final-validation.json`, `runtime-receipt.json`, `checkpoint-02-spec-coverage.json`, `publication-manifest.json`, `SHA256SUMS`, and the distinctly named source/result/log sets. Runnable harnesses are independent of writer tests. Every production import is hash-gated to an immutable snapshot/copy; no accepted/original/frozen artifact was edited. **All independent test processes are terminal and CPU is released. Writes are released after manifest freeze.**
