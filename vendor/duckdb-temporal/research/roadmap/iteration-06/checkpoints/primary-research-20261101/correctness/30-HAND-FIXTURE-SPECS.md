# New tiny hand-derived cancellation/recovery fixture specifications

**MATHEMATICAL SPECIFICATIONS ONLY.** No tuples, database, query, generator, harness, token, protocol trace or fault was constructed/executed. These examples are not an execution plan, injection recipe, SQL script or retry authorization. Each alternative is a source/contract case for later independent review; every empirical check remains UNRUN.

Notation: public success means one entire accepted result. A private prefix is not public output. Values and relation names below are newly selected tiny hand data, not copied old fixtures. Transaction/cancel ordering is an assumed specification boundary, not an observed schedule.

## H01 — small join and admission before expansion

Let R={(r1,a),(r2,a)} and S={(s1,a),(s2,a),(s3,b)}, where r/s identifiers are unique witnesses. The equijoin on the second field has exactly four witness pairs: (r1,s1),(r1,s2),(r2,s1),(r2,s2). The Cartesian candidate domain has 2×3=6 pairs. This is hand mathematics, **not DuckDB's actual physical work counter**.

A project admission rule whose declared unit is all candidate pairs and whose cap is 5 must reject the six-pair expansion before materializing that domain. It must not execute first and then return a prefix of four/five candidates. A cap of 6 admits the mathematical domain but does not prove an elapsed-time or engine-memory bound. If the project instead charges hash probes or another unit, it must name that different unit and derive a different oracle, not silently call it “six operations.”

For an illustrative flat logical row charge of 16 bytes (a specification convention, not an engine/ABI observation), the five input rows charge 80 bytes and four staged output rows charge 64 bytes. A policy retaining both simultaneously must account for at least those 144 logical bytes plus any separately declared candidate/index charges. No physical object size or RSS follows.

## H02 — cancel before known submission

Given H01 admitted but a source-proven NOT_SUBMITTED state, cancellation linearizes before submission. Required outcome: no engine query was submitted, no public success, and no transaction side effects. This can support a terminal not-started cancellation only because the premise includes definite absence of submission. If absence is unknown, the correct result is UNKNOWN, not zero calls.

## H03 — cancel with a private join prefix

Use H01; the private candidate buffer contains its first two correct output pairs, but no public result is committed. Cancellation is then acknowledged by the query owner and rollback/read-only cleanup is acknowledged. Required public success rows: none. The private prefix is discarded; a count of completed/consumed work cannot be fabricated as zero. A prefix plus a non-success footer is not complete success.

Contrast: if any ordinary consumer already accepted those two rows as final, the no-partial-publication property has failed even if the database transaction subsequently rolls back correctly.

## H04 — recursive frontier, duplicate derivations and a cycle

Use directed edges {(a,b),(a,c),(b,d),(c,d),(d,b)}, with set reachability from a including the zero-length path. A visited-set frontier specification gives F0={a}, F1={b,c}, F2={d}, F3=empty; the complete result is exactly {(a,a),(a,b),(a,c),(a,d)}. The duplicate derivation of d and the cycle back to b add no result row.

If cancellation wins before public publication, even after F1 is internally known, public success rows are none. A “one round” cancellation boundary is not a constant-work proof for scaled fanout; inner edge-expansion units must be bounded separately. A next-frontier cap of 1 must refuse the prospective two-element F1 before publishing or over-materializing it; it must not return only b as a successful closure. No recursive query or frontier was run.

## H05 — autocommit preserves an earlier independent commit

Initial committed store B={base}. An earlier independent autocommit operation adding unique value u101 is known committed. A second operation that would add v202 is cancelled before its own commit, with terminal cancellation and rollback acknowledged. Expected committed store: {base,u101}; v202 absent. Rolling back the earlier independent commit is wrong. This does not assume the selected engine's default transaction mode; the fixture explicitly declares it.

## H06 — explicit transaction owns both writes

Initial B={base}. One explicit transaction privately adds u101, then begins a cancellable operation adding v202. Under a selected **whole-transaction rollback** policy, cancellation plus acknowledged full rollback must leave exactly B, not u101 alone. Under a deliberately different statement-only policy, u101 might remain private in an active transaction; that state must be called ACTIVE, not generally reusable/fully rolled back. The future contract must select a policy before judging this fixture.

## H07 — cancellation versus irreversible commit

One atomic operation would add both u101 and v202 to B. If cancellation wins before commit and rollback is acknowledged, expected committed store is B. If commit wins and its outcome is acknowledged, expected committed store is B∪{u101,v202}; a later cancel cannot justify “undone.” Neither a singleton addition nor a success prefix is legal.

If the response is missing at that boundary, both B and the fully updated store may be compatible with the observer's information. Required outcome: UNKNOWN transaction/publication, no blind replay, no healthy-reuse assertion. This is an indeterminate-history specification, not permission to inspect or retry an actual operation.

## H08 — recovery itself fails or remains unacknowledged

Assume query cancellation is terminal but the selected rollback/cleanup path reports failure or lacks a terminal acknowledgment. Required disposition: no public success, transaction/store health UNKNOWN or explicitly RESTART_REQUIRED under policy. A local rollback-state marker or destructor return cannot replace the missing recovery evidence. “Restart-required” is a quarantine label here, not a restart instruction.

## H09 — lost query response with only a cancellation request

Only an invocation and cancel request are known; no query terminal response is available. Required outcome: IN_FLIGHT/UNKNOWN, not CANCELLED, COMPLETE_FAILURE, zero work or COMPLETE_SUCCESS. Source/input hashes and an outer-process failure do not resolve the missing engine history. No generator, timeout or action token is supplied by this case.

## H10 — stale cancellation after connection reuse

Logical query q1 completes, but a cancellation caller for q1 is still outstanding when q2 would acquire the same connection. A late context-level interrupt can target the currently active epoch unless the adapter's ownership protocol rules it out. Required source acceptance: do not claim q2 is safely admitted/reusable until that stale-caller possibility is closed. An interrupt reset alone is not an epoch proof. No thread or signal action is run or prescribed.

## H11 — complete failure is not terminal cancellation

A source-proven pre-admission shape/budget error is a complete ordinary failure before submission, with no public rows and no transaction started. It must not be counted as engine-acknowledged cancellation. Conversely, a carrier/runtime/connection error after possible submission cannot pass by matching an expected semantic failure; its terminal/recovery status remains separately required.

## H12 — completion control and exactly-once public result

Use H01's exact four-pair join result or H04's exact four reachability pairs as the hand oracle. COMPLETE_SUCCESS requires the entire appropriate set, correct witness identity/duplicate policy, acknowledged permitted transaction outcome and one publication. A second publication, omitted row, extra derivation, prefix, unknown outcome or unacknowledged recovery is not a pass. These mathematical results do not certify general query correctness, all possible schedules, engine accounting, or response time.

## Required review evidence, not a test campaign

For each future selected case, the source review would identify its declared transaction mode, admission bound, cancel/commit/publication boundary, terminal evidence, expected complete public result, expected persistent footprint, and health disposition. Any unavailable observation stays unavailable. No dynamic schedule/injection/harness, compiler/runtime, machine observation, source implementation or empirical authorization is added by this document.
