# O-REPLAY rules (0.2.0, conforms to ACCEPTANCE 0.3.1 section 4 and RULINGS Q1 to Q21)

Every semantic rule the oracle applies, with where it comes from. Status:

- **SOURCED**: stated in the acceptance contract (ACC 0.3.1, cited by table row id), RULINGS.md (cited Qn or
  Q21 AMB-nn), the EXP-O02 brief's implementation facts (cited "brief fact n"), a public doc, PLAN v1.1, or the
  orchestrator's correction message of 2026-11-07 (cited "OC-n").
- **Q21-DEFAULT**: an O-REPLAY 0.1 default that RULINGS Q21 keeps, with the citation in
  `lab/verify/O01/proposed_rulings.json`.
- **DERIVED**: follows from a sourced rule; the derivation is written here.
- **RULING-NEEDED**: `ORCHESTRATOR-RULING-NEEDED`. Sources are silent; the oracle uses the stated default.
  Rules added in 0.2.0 that are still open are marked **NEW**.

Independence: no rule was inferred by running Triplex or by reading code under `packages/`. EXP-O02 used only
the contract, the rulings, the golden vectors, `docs/operational-primitives.md` and the brief's stated facts.
The two implementation lines read for O-REPLAY 0.1 (OC-4: compiler.ts near 1397, the Constraint.ts
`newlyViolated` docstring) are unchanged sources.

## Values (R-VAL, R-DEC, R-LANE)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-VAL-1 | Nine families: string = codepoint sequence; integer = Python int in the core integer type [-2^63, 2^63-1]; number = binary64 raw bits; decimal = exact Fraction plus declared (scale, precision); boolean; datetime = binary64 bits, ordered as an exact rational; ref = entity id; json = JSON.parse result with original key order plus canonical text; blob = (content id, mimeType, size, filename?). | SOURCED: ACC 4.0 VALUE_KINDS |
| R-VAL-2 | Integers travel as canonical decimal text `^(0\|-[1-9]\d*\|[1-9]\d*)$`; `"01"`, `"+1"`, `"1.0"`, `"-0"`, text outside the core range and JSON numbers are E-INVALID-VALUE. | SOURCED: ACC 7.1 CS-TYPES8-NEG; Q21 AMB-14 |
| R-VAL-3 | Value identity (sets, conflicts, grouping, distinct count, Unique claimants, retract-pattern match) is family plus exact payload, except that binary64 -0.0 and +0.0 are one value (number and datetime). When supports differ only in representation, the reported representation is the support with the lowest (recordedPosition, op index); a single-assertion read returns the stored bits. Decimal identity is the exact value (1.50 = 1.5). | SOURCED: ACC 4.3 CMP-NEGZERO; Q14b; Q21 AMB-08 |
| R-VAL-4 | NaN, ±Infinity and lexemes that overflow binary64 are E-INVALID-VALUE. | SOURCED: Q8c; ACC 4.0 number |
| R-VAL-5 | Strings with a lone surrogate are E-INVALID-VALUE (values, entity ids, attributes, json keys). NFC and NFD stay distinct; nothing is casefolded or normalized. | SOURCED: ACC 4.0 string; CS-TYPES8 |
| R-VAL-6 | datetime accepts any finite JS number, negative and fractional included; the earliest and latest accepted instant is unknown [`datetimeRange`, default none]. | Q21-DEFAULT (R-VAL-6 confirm against Value.ts outstanding) |
| R-VAL-7 | A JSON number in a case (typed number value, json payload, datetime, coordinate, blob size) must read back as written: its decimal value equals the binary64 exactly or equals the binary64's shortest ECMAScript spelling. Otherwise the case is malformed (exit 2), never rounded: `9007199254740993` and `1e-400` are case errors, `0.1` is the binary64 0.1 (ACC 4.1 N-F-ARITH uses it as a literal). | SOURCED: brief ("a JSON number that is not exactly a binary64 value is an input error"); V-O01 R-VAL-7. **NEW RULING-NEEDED** (R-VAL-7a): the round-trip criterion that admits `0.1` |
| R-VAL-8 | Canonical json text: RFC 8785 style, keys by UTF-16 code units, no whitespace, ECMAScript numbers, `-0` written `0`. | Q21-DEFAULT |
| R-VAL-9 | blob size is a finite non-negative whole number. | Q21-DEFAULT |
| R-DEC-0 | Every decimal attribute declares precision p and scale s (0 <= s <= p, p >= 1), from the case's `attributeDeclarations` or a schema release; a malformed declaration is a case error; a decimal written to an undeclared attribute is E-INVALID-VALUE. | SOURCED: ACC 4.0 decimal, Q18. **NEW RULING-NEEDED**: the error for an undeclared decimal |
| R-DEC-1 | Wire form `{"type":"decimal","value":"16.50"}` (optional inline precision and scale): optional `-`, no leading zeros, optional `.` with at least one digit, no `+`, no exponent. | **NEW RULING-NEEDED**: the TS wire shape of the decimal kind is EXP-R01's |
| R-DEC-2 | `-0` / `-0.00` decimal text is E-INVALID-VALUE (like integer `-0`), not normalized. | **NEW RULING-NEEDED** |
| R-DEC-3 | Fractional digits are counted on the value: more than s fractional digits, or more than p - s integer digits, is E-DECIMAL-UNREPRESENTABLE, never rounded or truncated; `16.500` is 16.5 and fits scale 2. Output text has exactly s fractional digits plus `scale`, `precision` and `storage` (p <= 15: scaled integer value * 10^s; p > 15: order-preserving decimal string). | SOURCED: ACC 4.0 decimal / DECIMAL_RULES. Counting on the value: DERIVED, **NEW RULING-NEEDED** (confirm) |
| R-DEC-4 | Kernel decimal arithmetic is exact: add/sub result scale max(sa, sb), mul sa + sb; neg/abs keep the scale; SUM exact with the max scale. | SOURCED: Q18 (exact kernel arithmetic). Result scales DERIVED |
| R-DEC-5 | Decimal division is not modeled (case error). | **NEW RULING-NEEDED** (result scale and rounding not frozen) |
| R-DEC-6 | `toDecimal`: integer and decimal exact; binary64 to its exact binary expansion. `toNumber(decimal)` rounds once; `toInteger(decimal)` needs an integral value in range. | DERIVED from CV-I2F / CV-F2I; **NEW RULING-NEEDED** for toDecimal(number) |
| R-DEC-7 | AVG over decimals without conversion is not modeled (case error); with `toNumber` it follows AG-AVG-CONV. | **NEW RULING-NEEDED** |
| R-LANE-1 | Each lane's accepted integer range: core and xtdb [-2^63, 2^63-1]; qlever [-2^59, 2^59-1]; `laneIntegerRanges` may override, but every lane contains [-(2^53-1), 2^53-1] and stays inside the core type. A written integer outside the lane's range fails the whole command with E-VALUE-OUT-OF-RANGE before any mutation. The lane is the case's `lane` or `cli.py --lane`. | SOURCED: ACC 4.0 LANE_INTEGER_RANGE; NUMERIC; Q1 (re-scoped) |
| R-LANE-2 | A retract-pattern value outside the lane's range is E-VALUE-OUT-OF-RANGE too. | **NEW RULING-NEEDED** |
| R-LANE-3 | Read-side constants are compared exactly whatever the lane; no stored value can exceed the lane's range. | DERIVED |

## Order and comparison (R-ORD, R-CMP)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-ORD-1 | Inside a family: integers, binary64 and datetimes numerically (exact rationals; -0.0 and +0.0 tie), decimals by exact value, booleans false < true, text and refs by codepoint, json by canonical text, blobs by content id (then the other descriptor fields). | SOURCED: ACC 4.5 CARD_MANY_ORDER |
| R-ORD-2 | Across families: boolean < integer < number < decimal < datetime < string < ref < json < blob. | SOURCED: ACC 4.5; Q14a; Q18 |
| R-ORD-3 | Entity ids order by codepoint everywhere (entityPage, find tie-break, includes); U+E000 sorts before U+10000. | SOURCED: Q21 AMB-15; Q8f |
| R-CMP-1 | Same family: exact comparison (CMP-SAME). | SOURCED: ACC 4.3 CMP-SAME |
| R-CMP-2 | `-0.0 = +0.0` as a predicate and as identity. | SOURCED: CMP-NEGZERO; Q14b |
| R-CMP-3 | integer vs number: `eq` false, `ne` true, ordered comparisons preflight E-MIXED-FAMILY (CMP-INT-FLOAT, Q14d). decimal vs integer or number: every comparison E-MIXED-FAMILY unless converted (CMP-DECIMAL-CROSS). An untyped bare-JSON string matches string and ref values (CMP-UNTYPED-STRING); an untyped number compares numerically with number and datetime and as a number elsewhere (CMP-NUMERIC-CONST). Other cross-family pairs (CMP-IDENTITY, CMP-BOOL-INT): never equal, `ne` true, ordered false. `compare: "datalog"` merges typed number and datetime (0.1 switch). | SOURCED: ACC 4.3 rows named. Ordered comparisons of the other pairs returning false: Q21-DEFAULT (R-CMP-3 rest), **NEW RULING-NEEDED** whether they should also be E-MIXED-FAMILY |
| R-CMP-4 | E-MIXED-FAMILY is preflight: `find` checks the attribute's declared family against each typed constant before evaluation; `aggregate` does the same when the query declares `varTypes`, otherwise on the first offending row. | SOURCED: ACC 4.7 phase; DERIVED for the data-driven case |

## Arithmetic and aggregates (R-NUM, R-AGG)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-NUM-1 | integer + - * and unary minus / ABS are exact; a result outside [-2^63, 2^63-1] is E-INTEGER-OVERFLOW. | SOURCED: ACC 4.1 N-I-ADD, N-I-NEG |
| R-NUM-2 | binary64 arithmetic is IEEE 754 round-to-nearest-even, one rounding (CPython float); a non-finite result is E-NUMBER-OVERFLOW; signed zeros per IEEE. | SOURCED: N-F-ARITH, N-F-NEGZERO |
| R-NUM-3 | Division by zero (integer, or binary64 +0.0 / -0.0) is E-DIVISION-BY-ZERO. | SOURCED: N-I-DIV, N-F-ARITH; Q8c |
| R-NUM-4 | integer `/` truncates toward zero (-2^63 / -1 overflows); `rem` is a - trunc(a/b)*b. | SOURCED: N-I-DIV, N-I-REM |
| R-NUM-5 | `cast-int64` (CAST text to integer) accepts canonical decimal only; out of range is E-INTEGER-OVERFLOW, other text (`'+1'`, `'01'`, `'-0'`) E-INVALID-CONVERSION. | SOURCED: CV-T2I |
| R-NUM-6 | Mixing integer and number (or decimal with either) in arithmetic is preflight E-MIXED-FAMILY unless one operand is converted (`toNumber`, `toInteger`/`toInt64`, `toDecimal`). | SOURCED: N-MIXED; CV-NONE |
| R-NUM-7 | A non-numeric arithmetic operand is E-MIXED-FAMILY. | **NEW RULING-NEEDED** (4.7 has no other preflight reason) |
| R-NUM-8 | `rem` over binary64 is not modeled (case error). | **NEW RULING-NEEDED** |
| R-NUM-9 | `toNumber(integer)` rounds to nearest binary64, ties to even, once; `toInteger(number)` needs an integral value inside the core range (else E-INVALID-CONVERSION), -0.0 gives 0. | SOURCED: CV-I2F, CV-F2I |
| R-AGG-0 | Aggregate input rows are bindings: one row per (entity, distinct values of the matched attributes). Two equal-valued assertions on one entity are one row (SUM 10, COUNT 1); equal values on distinct entities are distinct rows. | SOURCED: Q21 AMB-09 (B); ACC 4.4 AG-SUM-I "bag of distinct bindings" |
| R-AGG-1 | COUNT counts distinct values; ungrouped empty input gives one row (COUNT 0, others null); grouped empty input gives no rows. | SOURCED: AG-COUNT, AG-EMPTY-UNGROUPED, AG-EMPTY-GROUPED |
| R-AGG-2 | integer SUM is the exact total; E-INTEGER-OVERFLOW only for a final total outside the integer range. | SOURCED: AG-SUM-I; Q8a; Q20 |
| R-AGG-3 | binary64 SUM is the exact rational total rounded once; all-(-0.0) input sums to -0.0. | SOURCED: AG-SUM-F; Q14c |
| R-AGG-4 | AVG over integers without conversion is preflight E-INTEGER-AVG (also over empty input when `varTypes` declares the variable integer). The conversion is `{"op":"avg","convert":"toNumber"}` (0.1 alias `integerAvg: "convert"`): binary64 of exact sum / count, rounded once. | SOURCED: AG-AVG-I, AG-AVG-CONV; Q8b; Q21 AMB-11 |
| R-AGG-5 | MIN/MAX stay in their family; mixed families or a non-numeric SUM/AVG are E-MIXED-FAMILY. | SOURCED: AG-MINMAX-TIES; CV-NONE. Tag choice for non-numeric SUM/AVG: **NEW RULING-NEEDED** |
| R-AGG-6 | `emptyAs` (COALESCE) is task-specific. | SOURCED: AG-PACKET-COALESCE |

## Commands and outcomes (R-CMD, R-ERR)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-CMD-0 | The oracle decides validity from command intent, order, preconditions and rules. Receipts bind txId, position, instant and assertion ids only. | SOURCED: OC-3; ACC 6.1 Outcomes |
| R-CMD-1 | A command whose `commandId` was committed earlier in the scope fails with E-COMMAND-COMMITTED carrying the original txId and allocates no position. | SOURCED: docs/operational-primitives.md "Causal transaction envelopes" |
| R-CMD-2 | `TripleLive` needs a matching explicit retract (else E-INVALID-VALUE); a non-live target is E-TX-CONFLICT. `EntityState` compares the recorded-live ids regardless of valid time; a mismatch is E-TX-CONFLICT. | SOURCED: operational-primitives "Compare-and-retract". Valid-time independence: Q21-DEFAULT |
| R-CMD-3 | Omitted `validFrom` = the transaction instant; omitted `validTo` = open; omitted `createdBy` = null. | Q21-DEFAULT (TK-JOURNAL assertion.validFrom === committed.instant) |
| R-CMD-4 | `validTo <= validFrom` is E-INVALID-VALUE. | SOURCED: Q21 AMB-12 (B) |
| R-CMD-5 | An explicit retract of a no-longer-live assertion is E-TX-CONFLICT [`retractNonLive`]; an unknown id, or the same id twice in one command, is E-INVALID-VALUE. | Q21-DEFAULT (operational-primitives "Retraction is the atomic comparison") |
| R-CMD-6 | Reserved namespaces are E-RESERVED (WriteError / reserved-namespace) for assert, retract (of an existing assertion or a journal fact) and retract-pattern: entity ids starting `_triplex/`; attributes starting `:triplex/` or `:_tx/`; entity types starting `triplex.` or equal to `_Transaction` [`reservedNamespaces`]. Other leading-underscore names are ordinary. | SOURCED: brief fact 2; V-O01 R-CMD-6 (TK-RESERVED); operational-primitives `_Transaction` / `:_tx/*`; Q21 AMB-14 |
| R-CMD-7 | `retract-pattern` applies in operation order over staged facts: it retracts the pre-state's recorded-live matches and this command's earlier asserts that match (value by identity), in creation order. An empty pattern is E-INVALID-VALUE. | SOURCED: Q21 AMB-06 (A), AMB-07. Empty pattern: Q21-DEFAULT (R-CMD-7) |
| R-CMD-8 | Check precedence: operation validation in operation order (E-INVALID-VALUE, E-DECIMAL-UNREPRESENTABLE, E-VALUE-OUT-OF-RANGE, E-RESERVED) -> command claim -> preconditions -> retract liveness -> constraint enforcement. Cases must not depend on it (one fault per command). | Q21-DEFAULT |
| R-CMD-9 | Every rejection carries its ACC 4.7 id, tag, reason and phase. Faults that 4.7 does not name separately (unknown op, unknown retract id, duplicate retract, TripleLive without retract, missing field, empty pattern) map to E-INVALID-VALUE; a declared `hostAbort` is `host-abort` with no tag (host-defined). | SOURCED: ACC 4.7; Q15; Q21 (R-CMD-9). The E-INVALID-VALUE mapping of operation faults: **NEW RULING-NEEDED** |
| R-CMD-10 | Race groups: committed members replay in receipt position order and must succeed; a rejected member must fail at some serialization point (`possibleCategories` lists the error ids). | DERIVED from OC-3 |
| R-CMD-11 | Nested transactions: every allocated position is its own cut; a failing member is rejected alone; an abandoned outer transaction is `hostAbort` on every member. | SOURCED: OC-2; PLAN C2.2 |
| R-CMD-12 | A retract-pattern whose `entityId` is a transaction entity of the scope targets journal facts and is E-RESERVED. | **NEW RULING-NEEDED** |
| R-ERR-1 | An expected error matches a receipt when its `_tag` equals the pinned tag and its reason equals the pinned reason or one of the listed alternatives (`reasonAlternatives` for E-CONSTRAINT and E-CURSOR); a receipt may also name the error id or an 0.1 category. | SOURCED: ACC 4.7 errorComparison |
| R-ERR-2 | Errors without a 4.7 row use `X-` ids with an explicit tag (or null) and the ruling that leaves them open: X-READ-LIMIT (R-JNL-7), X-INVALID-BASIS (R-CUT-3), X-CYCLE (R-SUP-2), X-NO-POSITION (a cut names a command the oracle rejects), X-NOT-MODELED (R-JNL-6). | DERIVED (never invent a 4.7 reason) |

## Constraints (R-CON)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-CON-1 | Enforcement applies when the command carries `meta.enforce` (or the case enforcement mode is `on`). It evaluates pre-state and post-state at every validFrom/validTo boundary and rejects only new or worsened violations; existing violations never block unrelated writes. | SOURCED: ACC 4.6 CN-NEW-OR-WORSENED; OC-4 |
| R-CON-2 | An entity is of type T at valid instant v when it has a live-at-v assertion carrying entityType T. | Q21-DEFAULT |
| R-CON-3 | Required, Cardinality (live assertions, equal-valued duplicates counted), Unique (one value identity claimed by two or more members; -0.0 and +0.0 are one value), ReferenceTarget. | SOURCED: CN-CARD-COUNT; PLAN C5.1; R-VAL-3 |
| R-CON-4 | A rejection is E-CONSTRAINT with `reason` = the rule kind (or `reasonAlternatives` when several kinds are violated) and the violation rows (code, entityType, attribute, validAt, actual, subject). | SOURCED: ACC 4.7 E-CONSTRAINT |
| R-CON-5 | A schema release yields Required, Cardinality max 1, Unique, ReferenceTarget. | SOURCED: docs/configuration.md |
| R-CON-6 | A card-one conflict that predates the enforcing write stays a conflict and reads per C5.3. | SOURCED: CN-PREEXISTING-CONFLICT |

## Receipts (R-RCP)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-RCP-1 | Committed positions per scope are dense and increase in stream order outside race groups. | SOURCED: ACC 6.1 Position accounting |
| R-RCP-2 | Rejected receipts hold no position, txId or assertion ids. | SOURCED |
| R-RCP-3 | txIds and assertion ids are unique. | SOURCED |
| R-RCP-4 | `assertionIds` align with operations; unbindable ids become `unbound:<command>:<op>` and the case is marked diverged. | DERIVED |
| R-RCP-5 | Committed members of one physical group hold consecutive positions. | DERIVED from OC-2 |
| R-RCP-6 | `unknown` outcomes must carry `resolvedOutcome`. | SOURCED: CR-FAULT |
| R-RCP-7 | A declared deterministic `clock` must equal the receipt instant; instants need not be non-decreasing. | SOURCED: OC-1; ACC 6.1 Clocks |

## Cuts and history (R-CUT, R-HIST)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-CUT-1 | An event is known at cut (P, R) iff its position <= P and (R unbound or its instant <= R). R is independent of P. | SOURCED: ACC 6.1 R independent of P |
| R-CUT-2 | Visible at (P, R, V): arrival known, retirement not known, validFrom <= V < validTo. | SOURCED |
| R-CUT-3 | P beyond the latest committed position is E-UNAVAILABLE-CUT; a negative P, R or V is X-INVALID-BASIS (tag ReadError). | SOURCED: ACC 4.7 E-UNAVAILABLE-CUT. Invalid basis: **RULING-NEEDED** (no 4.7 row) |
| R-HIST-1 | Raw lifetime: every assertion whose arrival is known at the cut, with complete retirement fields even when the retirement is after the cut. Ordinary `match`, `entityTriples` and `entityPage` answer in this contract (`raw`; `contract` names it). | SOURCED: Q21 AMB-01 (A) |
| R-HIST-2 | As-of snapshot: same membership, retirement fields null unless retractedPosition <= P and (R unbound or retractedAt <= R). `history.asOfSnapshot` and `match.snapshot` give it for repository as-of reads and native history helpers. | SOURCED: ACC 6.1 Outputs; OC-1 |
| R-HIST-3 | `assertionSnapshot` (O-HAM SnapshotAssertion, the native V-filtered helper): `live-at-valid` = visible rows; `known-at-valid` = arrival known and valid at V; `knownRetirement` = `{retractedAt, retractTxId, retractedPosition}` when known. | SOURCED: Q21 AMB-02, AMB-03 |

## Journal (R-JNL)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-JNL-1 | A record per committed position: txId, position, instant, actor, commandId, correlationId, causationId, configSnapshot (when given), changes, changedEntities. Every change carries op, tripleId, entityId, attribute, entityType?, value, validFrom, validTo?, recordedAt and assertionTxId; a retract also retractedAt and retractionTxId. | SOURCED: brief fact 1; Q21 AMB-05 |
| R-JNL-2 | Changes are in operation order with retract-pattern matches expanded in creation order (recordedPosition, op index) [`journalChangeOrder`]. | SOURCED: Q21 AMB-07 |
| R-JNL-3 | `transactions({after, limit})`: positions > after ascending, limit 1..1000 default 100, `next` = last returned position. `transactionsForEntity`: newest first, `snapshotPosition` on the first page, `beforePosition` exclusive. Internal writes appear as opaque records unless `journaled: false`. | SOURCED: operational-primitives |
| R-JNL-4 | The journal value of a binary64 -0.0 change is bit-exact -0.0. | SOURCED: Q21 AMB-04 (B) |
| R-JNL-5 | Journal facts are queryable like ordinary facts: the `_Transaction` entity (id = txId) of each journaled commit has one `:_tx/changed-entity` ref per changed application entity and one `:_tx/change` json fact per change, recorded at the commit's position and instant. `match` / `entityTriples` / `valueSupports` include them when the pattern names the journal (a `:_tx/` attribute, the `_Transaction` type or a transaction entity id); `journalFacts` lists them; `assertions` is the application relation only. Journal fact ids are synthetic (compare by entityId, attribute, value); retracting one is E-RESERVED. | SOURCED: brief fact 4; ACC 6.1 Outputs; operational-primitives. **NEW RULING-NEEDED**: valid time (taken as [commit instant, open)), ids, and the exact `:_tx/change` json content (the logical change here; compare count and membership) |
| R-JNL-6 | The other envelope facts (`:_tx/position`, `:_tx/instant`, `:_tx/actor`, `:_tx/command-id`, `:_tx/correlation-id`, `:_tx/causation-id`, `:_tx/config-snapshot`) are not modeled: a pattern that could select them returns X-NOT-MODELED instead of a partial answer. | **NEW RULING-NEEDED**: their value families and whether absent meta fields produce facts |
| R-JNL-7 | An invalid `transactions` / `transactionsForEntity` limit is X-READ-LIMIT with tag ReadError. | SOURCED: operational-primitives ("fail with ReadError"). Reason: **RULING-NEEDED** (no 4.7 row) |

## Entities and repository (R-ENT, R-PAGE, R-SUP)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-ENT-1 | An entity exists as type T at a cut iff a visible assertion on it carries entityType T. | Q21-DEFAULT |
| R-ENT-2 | Cardinality one: one distinct value -> value with its supports (Q14b representative); two or more -> conflict. Cardinality many: distinct values in ACC 4.5 order with supports. Absent optional -> missing property. | SOURCED: PLAN C5.1, C5.2; Q8e, Q8f; ACC 4.5 |
| R-ENT-3 | `get`/`getMany` decode every attribute and fail with E-CONFLICTING-VALUES listing every conflicted (entity, attribute); getMany keeps order, null for missing ids. | SOURCED: PLAN C5.3; Q21 AMB-13 |
| R-ENT-4 | Includes resolve at the same cut; conflicts propagate. | SOURCED: C5.3 |
| R-ENT-5 | `find` fails when an attribute its filter, order or include references is conflicted for any candidate, and (AMB-17 A) when a returned document contains a conflicted attribute; `select` projects documents, and a projection that omits the attribute succeeds. `count` returns no documents, so only filter attributes matter. Card-many predicates match when any element matches; a missing value fails every comparison except `missing`. | SOURCED: C5.3; Q21 AMB-17 (A). Card-many / missing: Q21-DEFAULT |
| R-ENT-6 | Order: present before missing, family rank (R-ORD-2), direction inside the family, entity id (codepoint) as tie-break. Ordering by a card-many property is E-INVALID-QUERY. | SOURCED: Q14a (R-ENT-6 per Q21) |
| R-ENT-7 | `timeline(entityId, prop)` at a basis lists every assertion of that attribute on the entity recorded at (P, R), with no V filter, as `{identity, value, recordedAt, knownRetirement: null \| {retractedAt, retractTxId, retractedPosition}}` plus recordedPosition, txId, validFrom, validTo. | SOURCED: Q21 AMB-02, AMB-03 |
| R-ENT-8 | `modelTimeline` (the 0.1 `timeline`): the model after each journaled position that changed the entity. `validTimeline`: half-open valid-time segments with models. | DERIVED |
| R-ENT-9 | `missingRequired` and `undeclaredAttributes` are reported beside the model; a missing required value does not fail the read. | Q21-DEFAULT |
| R-PAGE-1 | `find` pages: the ordered result split by `pageSize`, all at one cut. | SOURCED: docs/datalog.md snapshot-stable pages |
| R-PAGE-2 | `entityPage`: ids with a visible assertion carrying the entity type, codepoint order, complete visible bodies in the raw-lifetime contract; every continuation page reads the cut the first page captured. | SOURCED: G10.cursor.stable; Q21 AMB-01, AMB-15 |
| R-PAGE-3 | `entityPage` limit is an integer 1..200, default 50; outside that it is E-CURSOR with reason `malformed`. | SOURCED: brief fact 3. Tag and reason: from golden G10-CUR-01 E3, **NEW RULING-NEEDED** (4.7 CE-MALFORMED names token faults only) |
| R-PAGE-4 | Cursor continuation (`cursorFrom` or an oracle `cursor` token): an altered token is E-CURSOR `malformed`; another scope `other-scope`; another entity type, or an explicitly given basis that differs from the pinned one, `other-query`. A different page size is allowed. | SOURCED: brief fact 3; ACC CURSOR_TRANSITIONS permittedErrors. Basis change as `other-query` and page-size change allowed: **NEW RULING-NEEDED** (golden E1/E2 name reasons outside 4.7) |
| R-SUP-1 | Live support of a value = the visible assertions with that (entity, attribute, value identity), in creation order. | SOURCED: C5.1, C5.5 |
| R-SUP-2 | Reachability supports: positive-length closure; supportCount = distinct node-sequence paths; a cycle on a from-to path is X-CYCLE. | SOURCED: packet workload 20. X-CYCLE tag: RULING-NEEDED (no 4.7 row) |

## Scale (R-SCALE)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-SCALE-1 | Configured-entity populations in closed form for any n <= 10m, width 1 or 10, re-derived from CONTRACT.md and checked against explicit replay for small n. | SOURCED: configured-entities-v1/CONTRACT.md |
| R-SCALE-2 | Value families of generated facts follow the O-CFG8 notation. | DERIVED |
| R-SCALE-3 | configFacts and receipt/journal/claim metadata counts are null. | SOURCED: O-CFG8 counts |
