# Revision02 — request preparation must precede transaction entry

30 October 2026. **Research only; no production implementation selected.** This addendum supersedes the earlier report's insufficient “fresh pre-execute guard after request extraction” placement where that could mean only immediately before the final native SQL. The frozen22-entry revision01 and all its probe results remain unchanged.

## Corrected current-source trace

- In inherited `TemporalStore.query`, `_ready` and `_check_budget` precede BEGIN, but `_position` reads the DB before `_query` extracts caller Query fields.
- In typed `transact`, BEGIN is at580, clock/receipt/history changes are staged at582–603, and only then is optional evaluate passed to `_query` at604. `_query` reads Query fields at534–547.
- Therefore a Query descriptor that changes controls can make an inside-`_query` guard fail **after transaction entry/staging**. The surrounding exception path then attempts ROLLBACK under the rejected state. A guard at only the final SQL boundary is not sufficient pre-admission.

These facts refer to typed_store SHA256 `abe7424366b9d528fa1378c8e9d5f12e7f4e80d93a1c433712a76d916760c555` and unchanged legacy store SHA256 `10fe4928a74ac0230b07d4ea8871399651fcb82a54c43ffa94c47dfb350c6552`.

## Required candidate sequence

For **both** public query/query_json and optional evaluated transact:

1. Retain existing independent closed/readiness/FP admission and locks as appropriate; do not silently change closed/invalid-input precedence.
2. Before BEGIN, any position read, ledger/history read or staged command write, materialize and validate the Query's six fields into an owned immutable data-only record. Preserve Query/str subtype acceptance. Define explicitly that each field is evaluated once for this request snapshot; no original Query reference/getter is consumed later.
3. The program snapshot must be an exact base str with the same stored Unicode characters, not generic `str(obj)` or public Value text admission. Do not apply the512-byte Value cap to a Datalog program or move native grammar/AST admission into a different ad hoc parser.
4. Keep valid_at and supplied known_at exact signed i64, and retain the existing max_facts/max_rounds/max_work exact-integer limits. Keep known_at=None in the record. Resolve None against the actual transaction snapshot later; check known_at<=snapshot_position using only exact ints after acquiring that snapshot. Preparation must not pin knowledge time early or use a separate transaction.
5. Run a **fresh full FP check after all this callback-capable preparation**, then before budget/BEGIN/any DB operation. The record contains only program/int/None values, never a “checked FP” flag, context or token.
6. Execute/read/stage and evaluate using only that prepared Query data, without re-reading caller descriptors. After complete native execute/fetch returns, take another full FP check before result protocols/float packing. Keep the private exact-native/shared-admission result loop and final local-output check described in revision01.

This change requires a typed query override or equivalent factored transaction entrypoint; merely changing the existing `_query` body does not move request extraction ahead of inherited BEGIN. Legacy store.py is not to be edited as an incidental optimization.

## Exact program-character and ownership source proof

The initial pinned converter gap is now resolved by the independent batch-theory lane's saved primary files, independently read and hashed in this revision. Exact DuckDB-Python commit is `83c719961098611e769dc4bab0bda2bf149a2d1e`.

`TransformPythonParamList` passes each bound parameter to `TransformPythonValue`. Its String branch calls `TransformPythonString`, which uses `PyUnicode_AsUTF8AndSize` and constructs an owned C++ string from the returned pointer and explicit byte count. It does not dispatch the Python subtype's overridden `__str__`/encode. The parameter Value then owns/copies that string value; an external pointer is not retained by this wrapper. [Pinned pyconnection.cpp](https://github.com/duckdb/duckdb-python/blob/83c719961098611e769dc4bab0bda2bf149a2d1e/src/pyconnection.cpp), [pinned python_conversion.cpp](https://github.com/duckdb/duckdb-python/blob/83c719961098611e769dc4bab0bda2bf149a2d1e/src/native/python_conversion.cpp).

CPython3.12.14's explicitly invoked base `str.__str__(subtype)` reaches unicode_str→unicode_result_unchanged→_PyUnicode_Copy for a subtype, producing exact base Unicode with the same stored characters; exact str may be returned with a new strong reference. Generic `str(subtype)` can dispatch an override and is not equivalent. Keeping the exact Python snapshot strongly referenced until the call completes is sufficient; no Python object memory inspection or byte stub is needed. [Pinned CPython Unicode implementation](https://raw.githubusercontent.com/python/cpython/v3.12.14/Objects/unicodeobject.c), [Unicode C API ownership/lifetime documentation](https://docs.python.org/3.12/c-api/unicode.html).

This source argument establishes character/value preservation, not a promise that old repeated descriptor invocation counts are unchanged. The preserved decision should explicitly define one validated snapshot per call. Actual pinned-host integration should still verify overridden __str__/encode/length behavior, Unicode errors/NUL/non-ASCII, request subtypes and transaction ordering before accepting a fix.

## Scope warning: not every command callback is removed

Typed transact598–603 still dynamically reads `fact.v.carrier()` and fact fields inside BEGIN. TypedFact/Value subtypes and string command/retraction IDs have additional existing callback surfaces. Query-only preparation **does not remove all ordinary callbacks from staging**. Do not describe it as a completely callback-free transaction or amortize the FP state across those callbacks.

The narrow performance candidate can leave those existing paths/guards/lifecycle contract unchanged and enter its private result checked region only after the later full post-fetch guard. If root wants a stronger all-command pre-admission guarantee, it must separately select and validate exact command-parameter snapshots before BEGIN, preserving public subtype/callback/value semantics; that is not implemented or proved by this Query model.

## Cleanup boundary is unchanged

A nonconforming native callee returning corrupted controls remains different from a malformed cell under compatible controls. Post-fetch detection prevents wrapper float conversion but does not make automatic DB rollback/checkpoint safe in the rejected state. No silent repair, blind retry or postcommit rollback claim is added. The root-selected policy must explicitly preserve the trusted-callee/continuing-controls premise or separately define tainted/deferred cleanup and receipts before implementation.
