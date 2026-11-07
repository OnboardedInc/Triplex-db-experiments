# Candidate proof obligations for root selection

Research recommendation, not a selected implementation. Read with revision01 REPORT/TEST-SPEC and revision02 transaction addendum.

## Invariants

- **D (data, not permission):** prepared Query contains exact immutable str/int/None data, not a cached environment value, “good” flag or escaping capability. Each public call and reentrant public factory/codec still obtains its own current-state check.
- **Q (pre-transaction callback boundary):** Query getters/string snapshot/type/range validation occur before any BEGIN/position/ledger/history/staging operation. All original caller Query references are absent from the in-transaction executor. known_at=None remains unresolved until the actual transaction snapshot.
- **E (environment):** full predicate nearest/all masks/noDAZ/noFTZ is checked fresh after preparation and before DB entry, again after complete native fetch and before result protocols/float packing, and after local conversion before publication. Target ABI/read errors fail closed; ordinary sticky flags are allowed.
- **N (native provenance):** check exact fetched tuple/dict/list layers, exact string keys and exact typed payloads before their callbacks/protocols. Pinned native FromValue builds named structs as dicts, LIST as lists and primitive tag payloads through fixed native conversion branches; unexpected replacements are rejected, not coerced or handed an ambient permission. [Pinned native conversion source](https://github.com/duckdb/duckdb-python/blob/83c719961098611e769dc4bab0bda2bf149a2d1e/src/native/python_objects.cpp).
- **V (validation):** same carrier extractor and payload canonicalizer govern public and private paths; every cell retains all shape/null/tag/type/domain/UTF-8/cap/finite/bit-zero rules. Public f64 factory still masks-preflights. Direct query wire output does not construct a partially initialized Value or change cached public identity/hash/order.
- **A (atomic local output):** output remains local/non-escaping until all cells and final guard succeed; late errors publish no prefix and do not mutate raw input. Normal supported-state store exceptions still use unchanged precommit rollback/whole-command retry/receipts.
- **H (host and reentry):** ordinary callbacks remain possible and independently guarded. Known caller callbacks are outside Q/E checked execution; callbacks preserving the existing lifecycle controls are not prohibited. No GIL argument or GC disabling is used. Existing hostile midcall/finalizer control mutation remains unsupported; no new safety is claimed for it.

## Conditional argument

Q and D prevent a caller descriptor from invalidating a stale guard after BEGIN merely because `_query` was entered late. The fresh E check then gates DB entry on the current calling-thread state. Complete native fetch is another boundary and must be followed by E before N/V. Within the non-escaping exact-built-in conversion, V retains each original semantic check and finite/zero bit rule. Under unchanged H, the full predicate remains valid and implies masks, so repeating a foreign check for every f64 cell adds no result semantics; it can be replaced by the two local E boundary checks. A ensures errors remain dominant over already-built local rows. No proof step says “native output is trusted, so skip validation.”

This proof does not cover hostile midcall changes, nonconforming native control corruption, arbitrary custom Python result objects, all-command subtype callbacks, or postcommit rollback. If any of those is part of a desired guarantee, select and test its policy separately. Source character/ownership proof is in TRANSACTION-ADMISSION-ADDENDUM; old descriptor call-count equivalence is not claimed, so define snapshot semantics explicitly.

## No semantic drift through refactoring

A future implementation must factor one shape extractor and one payload normalizer and route both paths through them. The public reader choice remains guarded; only the immediately enclosed private result loop uses raw representation copy. Exact-native provenance defense is an additional internal precondition, not a new public subtype rejection. Keep Value text512-byte caps distinct from native/program16KiB term limits, i64 and clock decimal strings, and existing no-engine/root/caps/schema/close/migration behavior.

The standalone prototype only models shared payload admission. It is not the completed shared-carrier refactor or actual transaction implementation. The inherited BEGIN ordering must be changed at typed public transaction entry, not hidden behind a private `_query` guard.
