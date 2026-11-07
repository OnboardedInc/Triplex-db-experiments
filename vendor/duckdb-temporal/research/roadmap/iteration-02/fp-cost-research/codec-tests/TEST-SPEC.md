# Selected-implementation codec acceptance specification

**Status: SPEC_UNRUN_PRODUCTION.** The ordinary probe accepted only the research prototype within its stated scope; it did not test a production batch. This specification does not authorize source edits or FP-state changes outside isolated children.

## A. Freeze shape, domain and call graph first

Record exact source, Python/runtime/DuckDB artifact, compiler, ABI and helper hashes. Observe the genuine pinned fetch envelope's actual types, not guessed typing annotations. Expected shape from source: fetchone tuple containing exact native-result dict; exact-string metadata keys; rows list / row list / carrier dict; five exact-string carrier keys; four disjoint exact payload types. Freeze metadata (`rows`, `rounds`, `derived_facts`, `work`) and any null rules rather than copying an arbitrary mapping with `dict()`.

The private region must exact-check each container before its protocols, and screen all key types before hashing/equality/lookups. It may be more restrictive than public factories only because its provenance is internal native output. Public ordinary str-subclass compatibility must pass unchanged. No generic `str()` normalization of arbitrary objects; test any selected explicit-base-str snapshot against pinned converter behavior and overriding `__str__`/encode methods.

Inspect shared validation: one payload/domain/canonicalization implementation must govern public admission and private exact native conversion, without a public skip flag/token. Instrument the shared validator in tests to confirm every valid cell and the first malformed late cell reach it. Compare actual returned canonical bits/decimal strings against public slow path and independent integer-bit expectations, not an evaluator reimplementation.

Run 59 explicit cases plus the 16,376 finite-pattern recipe and 480 key-order permutations from `carrier-fixtures.json`. Generate compactly; keep NaN/infinity/subnormal values as exact hex bits, never lossy JSON numbers. The fixture bytes may contain escaped surrogates as **rejection inputs**, not accepted UTF-8. Both infinities and signed quiet/signaling NaNs must reject; actual nonzero subnormal bits must not normalize to zero. Integer wire values remain canonical decimal strings; bool never becomes int; exact bool/int/float wrong-tag cross-products reject. All inactive payloads are exactly None, not merely falsy. Preserve 512 UTF-8-byte store cap, including 513-byte and 16,384-byte native-literal outputs.

## B. No data-dispatched callbacks before private rejection

Exercise exact root/rows/row/cell shape, missing/extra fields, dict/list subclasses, generator/tuple/custom iterable, mapping proxy, colliding custom key and str-subclass key, wrong tag, selected str/int/float subtype or conversion-protocol object, and inactive trap payload. Every trap is strongly held by the harness and counters are reset after construction (dict construction itself hashes keys). No repr/str of the rejected object may appear in diagnostics. Test empties and late bad shapes after 256 cells. Returned containers are new, not aliased mutable native rows. No iterator/partial prefix escapes. Restore healthy behavior after each rejection.

“No callbacks” here means rejected-input protocols. It is not a claim that GC, signals, traces or finalizers cannot occur. Do not disable them in production or silently narrow ordinary supported callbacks.

## C. Request snapshot before any DB work

For `query`, `query_json`, and evaluated `transact`, test each of program/valid_at/known_at/max_facts/max_rounds/max_work descriptors on an admitted Query subclass. A connection spy logs **all** budget/BEGIN/position/staging/query/COMMIT/ROLLBACK/close entries. A descriptor that returns after leaving bad controls must lead to fresh full-guard rejection before the first DB entry. A descriptor that raises must not provoke transaction cleanup before any transaction exists. Preserve/declare error precedence explicitly; do not replace arbitrary callback exceptions merely to make the test pass.

Each successful field is captured once and never reread after BEGIN; include getters which return valid data once then different/invalid data. Complete callback-capable materialization outside transactions, then full guard; use only the owned validated snapshot in DB parameters. Preserve valid_at/known_at signed64, optional known_at resolved against the transactional position, all existing cap bounds and failure behavior. A fresh pre-execute guard is also required after extraction and immediately before DB execution.

A public entry guard before the descriptors is not sufficient. A guard solely inside today's `_query` is not sufficient because outer query/transact have already opened/staged DB state. Do not declare ordinary descriptors unsupported.

## D. FP/control and reentry matrix

Execute 79 physical-control specs in child processes using inspectable pinned helper source. Build all floats before unmasking, save controls first, restore exact saved environment in finally **before DB cleanup**, and verify control restoration. The matrix covers independent x87/SSE rounding (including mismatches), all DAZ/FTZ combinations, 12 independent exception-mask bits and sticky inexact states. Unsupported controls reject before the raw bit reader or DB even for empty/no-float batches. Ordinary sticky flags are not a permission cache and are not cleared by admission readers; do not demand codec arithmetic comparisons preserve every incidental status bit.

Test success→bad-state rejection→restore→success, proving no cross-call cached permission. Test fresh full guard immediately after complete execute/fetch return, before result keys or float bytes. Test post-conversion/pre-publication guard. A synthetic external-return callback is a test seam, not a proposed public callback API.

Reenter independent public Value.float64/from_carrier/from_json/to_json and nested private conversions from ordinary public string callbacks and a GC callback, under supported controls; each public required guard remains fresh. No global/thread-local/contextvar skip flag survives successful, failed or nested conversion. Do not use private object-memory reads. This test does not promise safety from arbitrary FP-state changes inside a primitive or hostile native corruption.

## E. Error atomicity, cleanup and retry

Under supported controls, an invalid final carrier/domain/shape must return no SnapshotResult/JSON prefix. In a genuine evaluated command, verify the staged clock/receipt/assert/retract all roll back before COMMIT. Correct the input/program and retry the same whole command ID exactly once; close/reopen and compare the persisted state. Include a 513-byte output literal permitted natively but forbidden by the existing store boundary. A pure list converter cannot establish transaction acceptance.

A post-fetch guard detecting unsupported native-return state creates a separate lifecycle obligation. **Do not execute or assume safe ROLLBACK/COMMIT/close in that state.** If a stronger cleanup guarantee is selected, root must preserve a taint/deferred-cleanup/restore-and-reconcile policy and test its exact state/receipts on an actual confined store before accepting that guarantee. Retaining the existing continuous-supported-controls premise is an explicit alternative; then hostile bad-native-return cleanup stays outside the promise rather than being reported as safe. Query snapshots do not solve arbitrary TypedFact or asynchronous midcall control-changing hooks. Tests must not paper over the issue by restoring controls invisibly inside the production function. Ordinary caught exceptions under supported controls retain the old rollback path. A postcommit BudgetExceeded(committed_position) remains a committed receipt ambiguity to reconcile, never a reason for blind replay or a claim of rollback.

Preserve missing-engine persistence/reopen and explicit NativeUnavailable evaluation, all paths/symlink/WAL/spill confinement, schema/migration/clock/receipt formats, admission caps, existing public Value/hash/order behavior and close-restore-retry semantics. Run unchanged store/expression/FP/lifecycle suites on exact copied source/artifact before performance. No Python/SQL evaluator substitute or expanded cap/root bypass is allowed.

## F. Performance gate belongs to the registered persisted lane

Only after all outputs/errors/callback/transaction gates pass, rerun coordinator's exact matched persisted query/query_json design. Show accepted/hardened/proposed source pins, raw paired blocks, scopes, load order, counts, intervals, and all failures. The private conversion should make fenv reads O(1) in float cells while retaining O(cells) validation; verify no-float/tiny controls too. The ordinary probe's 2-read count is not a speedup claim, and native no-signal does not dismiss a wrapper regression. No rendered/UI/deployment claim follows from these tests.
