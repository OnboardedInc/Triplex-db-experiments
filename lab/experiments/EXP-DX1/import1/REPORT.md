# DX-ACT1 · Import beside live accounts

The snapshot lane brings in current facts a whole source group at a time. The history lane keeps each original save and both of its clocks.
A durable target command identifies the export and its first source ordinal. Restart recovers the original stored receipt before advancing the local cursor.
The scheduler admits one bulk transaction at a time. A live save can meet at most that transaction’s remaining service. A storage stall can extend it.
The small native history run recovered after three process kills around the 90% checkpoint, including a lost acknowledgement.
The full-scale decision needs a 16-million-fact deep import and a 4.5-million-person thin import, each beside nine live accounts.
The provisional bars are 3,000 imported facts per second and each other account’s read and commit p99 within 1.5× baseline.

North star P8. Section 1.2 sets the provisional bars. The branch contains the exact touched-reader implementation from e758c440 and the deep generator from 7bc49e10. [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md) · [Scope](../../../SCOPE.md)
A strict live scope owns its record clock. A versioned history-import scope has immutable non-strict clocks. Each source transaction supplies its clock to a scope-bound Effect. Values, valid intervals and actual native retraction identities stay in the public journal.
The import is additive. Live transactions continue through the normal path and imported retractions address only assertions in the sealed source map. A snapshot supplies facts known at the export cut. A history export supplies ordered groups, stable assertion references and explicit clocks.
Audit of durable claims and progress. ImportRun checks the stored manifest, command identity, digest, native position, ordered change bytes, assertion IDs, retirement IDs and both clocks. Target commits precede the full-sync SQLite cursor and ID-map transaction. Recovery rechecks the last target claim. Each trial opens new account namespaces and binds them to its exact export.
The independent proof supplies native identities and receipts to O-REPLAY, then compares the full feed, complete row lifetimes, position and time queries, and the touched reader. An incomplete group, missing target receipt or mismatched source stops progress. Local timings are diagnostic. Server measurements and independent review are pending.
