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

## Snapshot and history price

The native proof compared 120 queries per mode and complete row lifetimes. The source had 20 saves and 39 changes. Both paths reproduced 17 current facts. Only history retained superseded assertions, backwards and equal record clocks, earlier valid intervals and retirement identities.
On a separate matched pair of 48 people, the snapshot imported 192 current facts in two transactions. History imported 384 changes across 96 original saves and produced the same 192 current facts. Publication took 1.29 and 2.44 seconds locally, respectively. These shared-machine measurements price the two source shapes. [Pricing code](price.ts)
The strict-scope control rejected historical record time and accepted a valid-time correction with a fresh server clock. A changed retry, a gap, an altered frame policy and a malformed source group were rejected. A new cursor reconstructed the original target receipt. [Clock and retry checks](edges.ts)

## Live traffic and bench audit

The timing runner gives each live scope an independent process, named native database, fixed v3 offers, real compare-and-set saves and pinned touched-reader pulls. It verifies reachable row bytes against the deep seed and acknowledged edits. The loaded and control runs must have identical per-scope original offers, populated rosters and reader counts.
verifySnapshot reopens the import, folds the dense native feed at a fixed cut and compares every imported physical row and ID with the sealed source. The deep roster ranges from 106 to 904 facts per person. The queue probe includes its largest indivisible group and the 2,000-fact unpaced frame. The collision probe separately measures concurrent submission and a live save held in FIFO order after bulk transmission. It binds each native receipt, position, and complete row readback to the fresh scope. Five thin applicant widths also match O-DOMAIN. The fair-lane gate checks interleaved progress and a cold reader before and after import.
Every server scope receives the complete original v3 stream. The local two-scope interference probe partitions that stream by subject. Two approximately one-million-fact calibration imports measure deep and thin physical growth before large allocations.
The server controller binds a fresh attempt to the exact published source and built bytes, stack IDs, images, raw measurements and cleanup. It admits large runs using measured storage growth. Rate and ratios require complete coverage and at least 500 samples per side per scope. The local runner checks its source and native slot before and after each diagnostic.
The first longer local curve stopped during fixture seeding. The smaller fixture seeds the exact offered roster in 384-fact target batches and resolves an ambiguous setup response at its original content-bound command. Server preparation uses 2,000-fact batches.
A later setup lost its gateway connection before its measurement interval. Each local operating point can run in a fresh managed slot. File preflight also rejects numeric JSON tokens for exact integers before writing any target data. The source must carry the integer as a decimal string.
A concurrent-start regression observed two manifest writes in flight. Both account manifests now use the shared bulk permit. Their original command, actor, payload digest, position and historical clock are checked before the local session is recorded. The focused gate observed one in flight.
The overlapping-edit gate saves an interactive fact on the first imported person while both imports have work outstanding. It checks the original native receipt, exact old and new reader rows, later retirement identity, pinned history and final feed in each fresh account.
