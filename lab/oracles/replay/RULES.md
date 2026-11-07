# O-REPLAY rules (0.3.2, conforms to ACCEPTANCE 0.3.6 and RULINGS through Q45)

Every semantic rule the oracle applies, with where it comes from. Status:

- **SOURCED**: stated in the acceptance contract (ACC 0.3.5, cited by table row id: section 4 and the tables
  decimalOps DO-*, decimalConversions DC-*, decimalScaleEvolution DS-*, wireRules WR-*, temporalRules TM-*,
  readShapeRules RS-*, journalRules JN-*, q33Rules, POSITION), RULINGS.md (cited Qn or Q21 AMB-nn), the
  pending Q43 rulings on EXP-O03's decisions (`RULINGS-PENDING.md`, cited Q43x, to compile in 0.3.6), the EXP-O02
  brief's implementation facts (cited "brief fact n"), a public doc, PLAN v1.1, or the orchestrator's
  correction message of 2026-11-07 (cited "OC-n").
- **Q21-DEFAULT**: an O-REPLAY 0.1 default that RULINGS Q21 keeps, with the citation in
  `lab/verify/O01/proposed_rulings.json`.
- **DERIVED**: follows from a sourced rule; the derivation is written here.
- **RULING-NEEDED**: `ORCHESTRATOR-RULING-NEEDED`. Sources are silent; the oracle uses the stated default.
  Rules added in 0.2.0 that are still open are marked **NEW**; rules added or changed in 0.3.0 (EXP-O03) are
  marked **O03**, and in 0.3.2 / 0.4.0 (EXP-O04) **O04**.
- **NOT-MODELED**: the oracle refuses (a typed `X-NOT-MODELED` answer, or a malformed-case exit 2 whose message
  starts `X-NOT-MODELED`) instead of answering. Never a confident answer it cannot derive.

Independence: no rule was inferred by running Triplex or by reading code under `packages/`. EXP-O02 used only
the contract, the rulings, the golden vectors, `docs/operational-primitives.md` and the brief's stated facts.
EXP-O03 added only ACC 0.3.3 to 0.3.5, RULINGS Q22 to Q36, the pending Q43 rulings and V-O02's findings
(`lab/verify/O02/VERIFY.md`, the verifier's probe cases).
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
| R-VAL-6 | datetime accepts any finite JS number, negative and fractional included; the earliest and latest accepted instant is unknown [`datetimeRange`, default none]. A datetime given as -0 is E-NEGATIVE-ZERO-INSTANT (R-VAL-10). | Q21-DEFAULT (R-VAL-6 confirm against Value.ts outstanding); -0: SOURCED Q30b |
| R-VAL-7 | A JSON number is accepted only if it reads back as written: its shortest round-trip binary64 rendering equals the given text in canonical form (same exact decimal value, so `1.50` reads back as `1.5`). `0.1` is accepted; `9007199254740993` (reads back as ...992) and `1e-400` are not. In a user JSON value (R-VAL-11) a failure is a value rejection; in the case's own channels (typed `number` value, datetime, instants, valid-time coordinates, blob size) it is a malformed case (exit 2): give the exact lexeme or `bits`. | SOURCED: Q33a (R-VAL-7a). The case-channel treatment: DERIVED (the case format names binary64 values exactly), **O03** |
| R-VAL-8 | Canonical json text: RFC 8785 style, keys by UTF-16 code units, no whitespace, ECMAScript numbers. User JSON cannot hold -0 (R-VAL-11); the guard runs before canonicalization, whose identity rule is unchanged. | Q21-DEFAULT; Q30a (guard before CanonicalJson) |
| R-VAL-9 | blob size is a finite non-negative whole number. | Q21-DEFAULT |
| R-VAL-10 | An instant given as -0 (`validFrom`, `validTo`, a datetime value) is rejected with E-NEGATIVE-ZERO-INSTANT (InvalidTripleError / invalid-value, `detail: "no-negative-zero"`), never turned into 0. | SOURCED: Q30b; wireRules WR-INSTANT. **O03** |
| R-VAL-11 | A user JSON value containing -0, a non-finite number, or a number that does not read back as written (R-VAL-7), at any depth of lists and objects and before duplicate keys collapse, rejects the command with E-INEXACT-JSON-NUMBER (InvalidTripleError / invalid-value, `detail: "inexact-json-number"`), never normalized. JSON that Triplex generates (`:_tx/change` journal facts) is not user JSON and never meets the guard; a number -0 assertion commits, journals and reads back bit-exact. | SOURCED: Q30a, Q33a, Q34c; wireRules WR-JSON. **O03** |
| R-DEC-0 | Every decimal attribute declares precision p and scale s (0 <= s <= p, p >= 1), from the case's `attributeDeclarations` or a schema release; a malformed declaration is a case error; a decimal written to an undeclared attribute is E-INVALID-VALUE. | SOURCED: ACC 4.0 decimal, Q18; R-DEC-0 ruled by Q33b |
| R-DEC-1 | Wire form `{"type":"decimal","value":"16.50"}` (optional inline precision and scale): optional `-`, no leading zeros, optional `.` with at least one digit, no `+`, no exponent. | SOURCED: Q33b (R-DEC-1) |
| R-DEC-2 | `-0` / `-0.00` decimal text is E-INVALID-VALUE, not normalized; computed decimal zero has no sign. | SOURCED: Q33b (R-DEC-2, consistent with Q30b) |
| R-DEC-3 | Fractional digits are counted on the value: more than s fractional digits is E-DECIMAL-FRACTION and more than p - s integer digits (p capped at 38) is E-DECIMAL-OVERFLOW (phase preflight at write), never rounded or truncated; `16.500` is 16.5 and fits scale 2. Output text has exactly s fractional digits plus `scale` and `precision`. There is no `storage` field: the stored form is the TDK1 key for every declaration (Q35b), a lane-side form, not an expected answer. | SOURCED: ACC 0.3.5 decimalRules.reject, DC-T2D; Q33b (R-DEC-3); Q35e; Q43a |
| R-DEC-4 | Kernel decimal arithmetic is exact and typed. add/sub: scale max(s1, s2), precision max(p1 - s1, p2 - s2) + scale + 1; mul: scale s1 + s2, precision p1 + p2; SUM: the inputs' maximum scale, precision 38; neg/abs keep the operand's type. Precision is capped at 38 (R-DEC-10); a result with more integer digits than precision - scale is E-DECIMAL-OVERFLOW (phase execution), never rounded or widened. Equality and order between decimals compare exact values (1.50 = 1.5). | SOURCED: decimalOps DO-ADD, DO-MUL, DO-SUM, DO-CMP (Q22) |
| R-DEC-5 | `divide(a, b, scale, rounding)` with rounding `half-even`, `half-up` or `down`: the exact quotient rounded once at the named scale (the only rounding, and only when named); b = 0 is E-DIVISION-BY-ZERO; beyond 38 digits E-DECIMAL-OVERFLOW. `a` is a decimal, `b` a decimal or an integer (so R-DEC-7's divide(SUM, COUNT, ...) is expressible). A bare `/` with a decimal operand is preflight E-DECIMAL-BARE-DIVIDE. `round(x, s, rounding)`: scale s, precision p - (s_x - s), E-DECIMAL-OVERFLOW only when a carry exceeds it; s = s_x returns x; s > s_x see R-DEC-11. | SOURCED: DO-DIV, DO-BARE-DIV, DO-ROUND (Q22); Q33b (R-DEC-5). Integer divisor: DERIVED |
| R-DEC-6 | Conversions. DC-I2D: `toDecimal(integer[, p, s])` exact, more than p - s integer digits E-DECIMAL-OVERFLOW; without (p, s) its type is (digits, 0). DC-D2I: `toInteger(decimal)` only when the fraction is zero, else E-DECIMAL-FRACTION (write `round(x, 0, rounding)` first). DC-D2N: `toNumber(decimal)` one correctly rounded binary64. DC-N2D: `toDecimal(number, p, s, rounding)` only, from the exact binary expansion, rounded once (2.675 becomes 2.67 at scale 2); `toDecimal(number)` without (p, s, rounding) is a malformed case. `toDecimal(decimal, p, s)` re-declares exactly (E-DECIMAL-FRACTION / E-DECIMAL-OVERFLOW). DC-IMPLICIT: no implicit conversion, E-MIXED-FAMILY. | SOURCED: decimalConversions (ACC 0.3.5); Q33b (R-DEC-6); Q43a |
| R-DEC-7 | AVG over decimals is preflight E-DECIMAL-AVG unless written `divide(SUM, COUNT, scale, rounding)`. With `convert: "toNumber"` it follows AG-AVG-CONV. | SOURCED: Q33b (R-DEC-7); ACC 0.3.5 decimalRules.avg; Q43b |
| R-DEC-8 | The type of a decimal literal with no declaration (expression operands): scale = written fractional digits, precision = max(1, integer digits + scale). A declaration replaces it at write. | SOURCED: Q43c (accepted) |
| R-DEC-9 | Rounding modes: `half-even` ties to the even digit, `half-up` ties away from zero (negative ties included), `down` toward zero. | SOURCED: Q43d (accepted) |
| R-DEC-10 | No target is declared inside an expression, so DO-ADD / DO-MUL / DO-DIV's "the target's declared precision or 38 digits" is 38 there; a write of the result is checked against the attribute declaration (R-DEC-3). | SOURCED: Q43e (accepted) |
| R-DEC-11 | `round(x, s, rounding)` with s > s_x is exact: x at scale s with zeros appended, never refused, subject only to the 38-digit limit (E-DECIMAL-OVERFLOW). Its precision is p + (s - s_x), capped at 38, so x's integer digits keep their room (DO-ROUND's "else p" would drop them). | SOURCED: Q43f (overrides 0.3.0's refusal). Result precision: DERIVED from Q43f |
| R-DEC-12 | `toInteger` of a whole decimal outside the core integer range is E-INTEGER-OVERFLOW (as CV-T2I's exact text). | SOURCED: Q43g (accepted) |
| R-DEC-13 | `toDecimal(number, p, s, rounding)` with more than p - s integer digits is E-DECIMAL-OVERFLOW. | SOURCED: Q43a; ACC 0.3.5 decimalRules.reject |
| R-DEC-14 | The error id of R-DEC-7 is E-DECIMAL-AVG (DatalogValidationError / decimal-avg-requires-divide, preflight). | SOURCED: Q43b; ACC 0.3.5 errorTable |
| R-DEC-15 | Scale evolution is NOT-MODELED: a case whose `attributeDeclarations` and schema releases declare one decimal attribute with different (precision, scale) (DS-WIDEN, DS-WIDEN-MIGRATE, DS-NARROW) is refused with exit 2 and an `X-NOT-MODELED` message. The oracle therefore never produces E-DECIMAL-NARROWING. | decimalScaleEvolution (ACC 0.3.5, Q35b) is not modeled yet |
| R-DEC-16 | E-DECIMAL-UNREPRESENTABLE is gone: ACC 0.3.5 compiled Q35e. A decimal beyond its declared or 38-digit precision, including number-to-decimal overflow, is E-DECIMAL-OVERFLOW; excess fraction digits are E-DECIMAL-FRACTION. E-DECIMAL-OVERFLOW has two phases: preflight for a written value, execution for a computed result. The 0.1 receipt category `decimal-unrepresentable` is no longer mapped. | SOURCED: ACC 0.3.5 errorTable, decimalRules.reject; Q35e; Q43a (resolves 0.3.0's pending conflict) |
| R-DEC-18 | DR-JSON-CONVERT: `toDecimal(json, p, s)` validates the JSON value, never rounding: a JSON number becomes decimal(p, s) (excess fraction digits E-DECIMAL-FRACTION, more than p - s integer digits E-DECIMAL-OVERFLOW); a boolean, null, array, object or non-decimal string is E-INVALID-VALUE; without (p, s) the case is malformed. A JSON number has two decimal readings (as written, its shortest rendering per Q33a; or its exact binary expansion): the oracle answers when both agree (json 1.5 at (2, 1) is 1.5; json 1.55 at scale 1 is E-DECIMAL-FRACTION) and is X-NOT-MODELED when they differ (json 0.1 at scale 1), for a JSON string holding decimal text, and for a rounding argument. | SOURCED: ACC decimalRouting DR-JSON-CONVERT (Q38d); V-O03 F2. Which reading: **O04 RULING-NEEDED** |
| R-DEC-17 | TDK1 order keys (Q35a) are NOT-MODELED here: query kinds `orderKey`, `decimalKey` and `tdk1Key` are refused (exit 2, `X-NOT-MODELED`). O-REPLAY answers values, never key bytes; O-TDK1 (`lab/oracles/decimal/`) is the key oracle. | ACC 0.3.5 tdk1, oraclePins O-TDK1 |
| R-LANE-1 | Each lane's accepted integer range: core and xtdb [-2^63, 2^63-1]; qlever [-2^59, 2^59-1]; `laneIntegerRanges` may override, but every lane contains [-(2^53-1), 2^53-1] and stays inside the core type. A written integer outside the lane's range fails the whole command with E-VALUE-OUT-OF-RANGE before any mutation. The lane is the case's `lane` or `cli.py --lane`. | SOURCED: ACC 4.0 LANE_INTEGER_RANGE; NUMERIC; Q1 (re-scoped) |
| R-LANE-2 | A retract-pattern value outside the lane's range is E-VALUE-OUT-OF-RANGE too. | SOURCED: Q33c |
| R-LANE-3 | Read-side constants are compared exactly whatever the lane; no stored value can exceed the lane's range. | DERIVED |

## Order and comparison (R-ORD, R-CMP)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-ORD-1 | Inside a family: integers, binary64 and datetimes numerically (exact rationals; -0.0 and +0.0 tie), decimals by exact value, booleans false < true, text and refs by codepoint, json by canonical text, blobs by content id (then the other descriptor fields). | SOURCED: ACC 4.5 CARD_MANY_ORDER |
| R-ORD-2 | Across families: boolean < integer < number < decimal < datetime < string < ref < json < blob. | SOURCED: ACC 4.5; Q14a; Q18 |
| R-ORD-3 | Entity ids order by codepoint everywhere (entityPage, find tie-break, includes); U+E000 sorts before U+10000. | SOURCED: Q21 AMB-15; Q8f |
| R-CMP-1 | Same family: exact comparison (CMP-SAME). | SOURCED: ACC 4.3 CMP-SAME |
| R-CMP-2 | `-0.0 = +0.0` as a predicate and as identity. | SOURCED: CMP-NEGZERO; Q14b |
| R-CMP-3 | integer vs number: `eq` false, `ne` true, ordered comparisons preflight E-MIXED-FAMILY (CMP-INT-FLOAT, Q14d). decimal vs integer or number: every comparison E-MIXED-FAMILY unless converted (CMP-DECIMAL-CROSS). An untyped bare-JSON string matches string and ref values (CMP-UNTYPED-STRING); an untyped number compares numerically with number and datetime and as a number elsewhere (CMP-NUMERIC-CONST). Every other cross-family pair (CMP-IDENTITY, CMP-BOOL-INT, string vs integer, ...): never equal, `ne` true, and every ordered comparison is preflight E-MIXED-FAMILY, not false. `compare: "datalog"` merges typed number and datetime (0.1 switch). | SOURCED: ACC 4.3 rows named; Q33d (R-CMP-3 remainder). **O03** |
| R-CMP-4 | E-MIXED-FAMILY is preflight: `find` checks the attribute's declared family against each typed constant before evaluation (an untyped string constant is accepted for string and ref attributes, an untyped number for number and datetime; any other ordered pairing fails); `aggregate` does the same when the query declares `varTypes`, otherwise on the first offending row. | SOURCED: ACC 4.7 phase; Q33d. DERIVED for the data-driven case |

## Arithmetic and aggregates (R-NUM, R-AGG)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-NUM-1 | integer + - * and unary minus / ABS are exact; a result outside [-2^63, 2^63-1] is E-INTEGER-OVERFLOW. | SOURCED: ACC 4.1 N-I-ADD, N-I-NEG |
| R-NUM-2 | binary64 arithmetic is IEEE 754 round-to-nearest-even, one rounding (CPython float); a non-finite result is E-NUMBER-OVERFLOW; signed zeros per IEEE. | SOURCED: N-F-ARITH, N-F-NEGZERO |
| R-NUM-3 | Division by zero (integer, or binary64 +0.0 / -0.0) is E-DIVISION-BY-ZERO. | SOURCED: N-I-DIV, N-F-ARITH; Q8c |
| R-NUM-4 | integer `/` truncates toward zero (-2^63 / -1 overflows); `rem` is a - trunc(a/b)*b. | SOURCED: N-I-DIV, N-I-REM |
| R-NUM-5 | `cast-int64` (CAST text to integer) accepts canonical decimal only; out of range is E-INTEGER-OVERFLOW, other text (`'+1'`, `'01'`, `'-0'`) E-INVALID-CONVERSION. | SOURCED: CV-T2I |
| R-NUM-6 | Mixing integer and number (or decimal with either) in arithmetic is preflight E-MIXED-FAMILY unless one operand is converted (`toNumber`, `toInteger`/`toInt64`, `toDecimal`). | SOURCED: N-MIXED; CV-NONE |
| R-NUM-7 | A non-numeric arithmetic operand is E-MIXED-FAMILY. | SOURCED: Q33e (R-NUM-7) |
| R-NUM-8 | `rem` is integer-only: a binary64 or decimal operand is preflight E-MIXED-FAMILY. | SOURCED: Q33e (R-NUM-8). Error id (the 4.7 preflight row for a wrong-family operand): DERIVED, **O03** |
| R-NUM-9 | `toNumber(integer)` rounds to nearest binary64, ties to even, once; `toInteger(number)` needs an integral value inside the core range (else E-INVALID-CONVERSION), -0.0 gives 0. | SOURCED: CV-I2F, CV-F2I |
| R-AGG-0 | Aggregate input rows are bindings: one row per (entity, distinct values of the matched attributes). Two equal-valued assertions on one entity are one row (SUM 10, COUNT 1); equal values on distinct entities are distinct rows. | SOURCED: Q21 AMB-09 (B); ACC 4.4 AG-SUM-I "bag of distinct bindings" |
| R-AGG-1 | COUNT counts distinct values; ungrouped empty input gives one row (COUNT 0, others null); grouped empty input gives no rows. | SOURCED: AG-COUNT, AG-EMPTY-UNGROUPED, AG-EMPTY-GROUPED |
| R-AGG-2 | integer SUM is the exact total; E-INTEGER-OVERFLOW only for a final total outside the integer range. | SOURCED: AG-SUM-I; Q8a; Q20 |
| R-AGG-3 | binary64 SUM is the exact rational total rounded once; all-(-0.0) input sums to -0.0. | SOURCED: AG-SUM-F; Q14c |
| R-AGG-4 | AVG over integers without conversion is preflight E-INTEGER-AVG (also over empty input when `varTypes` declares the variable integer). The conversion is `{"op":"avg","convert":"toNumber"}` (0.1 alias `integerAvg: "convert"`): binary64 of exact sum / count, rounded once. | SOURCED: AG-AVG-I, AG-AVG-CONV; Q8b; Q21 AMB-11 |
| R-AGG-5 | MIN/MAX stay in their family; mixed families or a non-numeric SUM/AVG are E-MIXED-FAMILY. | SOURCED: AG-MINMAX-TIES; CV-NONE; Q33e (R-AGG-5) |
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
| R-CMD-8 | Check precedence: operation validation in operation order (E-INVALID-VALUE, E-INEXACT-JSON-NUMBER, E-NEGATIVE-ZERO-INSTANT, E-DECIMAL-FRACTION, E-DECIMAL-OVERFLOW, E-VALUE-OUT-OF-RANGE, E-RESERVED) -> command claim -> preconditions -> retract liveness -> constraint enforcement. Cases must not depend on it (one fault per command). | Q21-DEFAULT |
| R-CMD-9 | Every rejection carries its ACC 4.7 id, tag, reason and phase. Faults that 4.7 does not name separately (unknown op, unknown retract id, duplicate retract, TripleLive without retract, missing field, empty pattern) map to E-INVALID-VALUE; a declared `hostAbort` is `host-abort` with no tag (host-defined). | SOURCED: ACC 4.7; Q15; Q21 (R-CMD-9); Q33f |
| R-CMD-10 | Race groups: committed members replay in receipt position order and must succeed; a rejected member must fail at some serialization point (`possibleCategories` lists the error ids). | DERIVED from OC-3 |
| R-CMD-11 | Nested transactions: every allocated position is its own cut; a failing member is rejected alone; an abandoned outer transaction is `hostAbort` on every member. | SOURCED: OC-2; PLAN C2.2 |
| R-CMD-12 | A retract-pattern whose `entityId` is a transaction entity of the scope targets journal facts and is E-RESERVED. | SOURCED: Q33f |
| R-CMD-13 | Erasure commands (an `erase` / `erasure` operation: ErasedValue markers, the erasure frontier, reproduction modulo erasure) are NOT-MODELED: the case is refused with exit 2 and an `X-NOT-MODELED` message. | Q24, Q31f not modeled yet. **O03** |
| R-ERR-1 | An expected error matches a receipt when its `_tag` equals the pinned tag and its reason equals the pinned reason or one of the listed alternatives (`reasonAlternatives` for E-CONSTRAINT and E-CURSOR); a receipt may also name the error id or an 0.1 category. | SOURCED: ACC 4.7 errorComparison |
| R-ERR-2 | Errors without a 4.7 row use `X-` ids with an explicit tag (or null) and the ruling that leaves them open: X-CYCLE (R-SUP-2), X-NO-POSITION (a cut names a command the oracle rejects), X-NOT-MODELED (R-JNL-6). X-READ-LIMIT and X-INVALID-BASIS are retired (Q33g, Q33h). | DERIVED (never invent a 4.7 reason) |

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
| R-RCP-1 | Committed positions per scope are unique and increase in stream order outside race groups; they need not be dense. A position is an integer or a coordinate (stream, epoch, offset, ordinal), one kind per scope, ordered lexicographically (integers as numbers). A committed receipt on a position the case lists in `abortedPositions` (for coordinates: on an aborted (stream, epoch, offset)) is a violation. | SOURCED: Q31c; ACC POSITION. **O03** (0.2.0 required density) |
| R-RCP-2 | Rejected receipts hold no position, txId or assertion ids. | SOURCED |
| R-RCP-3 | txIds and assertion ids are unique. | SOURCED |
| R-RCP-4 | `assertionIds` align with operations; unbindable ids become `unbound:<command>:<op>` and the case is marked diverged. | DERIVED |
| R-RCP-5 | Committed members of one physical group hold consecutive positions: consecutive integers, or for coordinates one (stream, epoch, offset) with consecutive ordinal components. | SOURCED: POSITION nested (Q31c); DERIVED from OC-2 for integers |
| R-RCP-6 | `unknown` outcomes must carry `resolvedOutcome`. | SOURCED: CR-FAULT |
| R-RCP-7 | A declared deterministic `clock` must equal the receipt instant; instants need not be non-decreasing. | SOURCED: OC-1; ACC 6.1 Clocks |
| R-RCP-8 | The oracle sorts committed positions per scope and uses its own dense ordinals for cuts: integer positions are their own ordinals (gaps allowed); coordinates get ordinals initialPositions + 1, + 2, ... in coordinate order. Aborted positions take no ordinal. `cutCatalog` shows each record's ordinal as `position` and its receipt `coordinate`; `receiptConsistency.positions` reports per scope the position kind, density (integers) and the aborted positions whenever they say something (dense integer receipts keep the 0.2.0 output shape). | SOURCED: Q31c, ACC POSITION oracle; positionDenseCases. **O03** |

## Cuts and history (R-CUT, R-HIST)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-CUT-1 | An event is known at cut (P, R) iff its position <= P and (R unbound or its instant <= R). R is independent of P. | SOURCED: ACC 6.1 R independent of P |
| R-CUT-2 | Visible at (P, R, V): arrival known, retirement not known, validFrom <= V < validTo. | SOURCED |
| R-CUT-3 | P beyond the latest committed position is E-UNAVAILABLE-CUT; a negative P, R or V is E-INVALID-VALUE (InvalidTripleError / invalid-value). | SOURCED: ACC 4.7 E-UNAVAILABLE-CUT; Q33h (R-CUT-3). **O03** |
| R-CUT-4 | A read basis (R or V) given as -0 is E-NEGATIVE-ZERO-INSTANT (`detail: "no-negative-zero"`), consistent with Q30b. | SOURCED: Q43h (overrides 0.3.0's X-NOT-MODELED) |
| R-CUT-5 | A cut may name its position as `{"coordinate": c}`: it resolves to the ordinal of the greatest committed position at or below c, so a cut inside an abort gap equals the cut just before the gap (FX-ABORT-GAP), and a cut at an interior ordinal of one engine transaction sees exactly the members up to it (FX-NESTED-CUTS). | SOURCED: Q31c (watermark = fully resolved prefix). **O03** |
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
| R-JNL-5 | Journal facts are queryable like ordinary facts: the `_Transaction` entity (id = txId) of each journaled commit has one `:_tx/changed-entity` ref per changed application entity and one `:_tx/change` json fact per change, recorded at the commit's position and instant and valid from the commit instant. `match` / `entityTriples` / `valueSupports` include them when the pattern names the journal (a `:_tx/` attribute, the `_Transaction` type or a transaction entity id); `journalFacts` lists them; `assertions` is the application relation only. Journal fact ids are synthetic (compare by entityId, attribute, value); `:_tx/change` carries the logical change content; retracting one is E-RESERVED. | SOURCED: brief fact 4; ACC 6.1 Outputs; operational-primitives; Q33g (R-JNL-5) |
| R-JNL-6 | The other envelope facts (`:_tx/position`, `:_tx/instant`, `:_tx/actor`, `:_tx/command-id`, `:_tx/correlation-id`, `:_tx/causation-id`, `:_tx/config-snapshot`) are not modeled: a pattern that could select them returns X-NOT-MODELED instead of a partial answer. | SOURCED: Q33g (R-JNL-6) |
| R-JNL-7 | An invalid `transactions` / `transactionsForEntity` limit (outside 1..1000, including 0) is E-CURSOR, PaginationCursorError / malformed, the same as `entityPage`. | SOURCED: Q33g (R-JNL-7). **O03** |

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
| R-PAGE-3 | `entityPage` limit is an integer 1..200, default 50; outside that it is E-CURSOR with reason `malformed`. | SOURCED: brief fact 3; Q33h (R-PAGE-3, from golden G10-CUR-01 E3) |
| R-PAGE-4 | Cursor continuation (`cursorFrom` or an oracle `cursor` token): an altered token is E-CURSOR `malformed`; another scope `other-scope`; another entity type, or an explicitly given basis that differs from the pinned one, `other-query`. A different page size is allowed. | SOURCED: brief fact 3; ACC CURSOR_TRANSITIONS permittedErrors; Q33h (R-PAGE-4) |
| R-SUP-1 | Live support of a value = the visible assertions with that (entity, attribute, value identity), in creation order. | SOURCED: C5.1, C5.5 |
| R-SUP-2 | Reachability supports: positive-length closure; supportCount = distinct node-sequence paths; a cycle on a from-to path is X-CYCLE. | SOURCED: packet workload 20. X-CYCLE tag: RULING-NEEDED (no 4.7 row) |

## Scale (R-SCALE)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-SCALE-1 | Configured-entity populations in closed form for any n <= 10m, width 1 or 10, re-derived from CONTRACT.md and checked against explicit replay for small n. | SOURCED: configured-entities-v1/CONTRACT.md |
| R-SCALE-2 | Value families of generated facts follow the O-CFG8 notation. | DERIVED |
| R-SCALE-3 | configFacts and receipt/journal/claim metadata counts are null. | SOURCED: O-CFG8 counts |

## Contract tables beyond section 4 (ACC 0.3.3 to 0.3.5; where each row lives)

| Table | Rows | Oracle rule |
| --- | --- | --- |
| decimalOps | DO-ADD, DO-MUL, DO-SUM, DO-CMP; DO-DIV, DO-BARE-DIV, DO-ROUND | R-DEC-4; R-DEC-5 |
| decimalConversions | DC-I2D, DC-D2I, DC-D2N, DC-N2D, DC-T2D, DC-IMPLICIT | R-DEC-6, R-DEC-3, R-NUM-6 |
| decimalScaleEvolution | DS-WIDEN, DS-WIDEN-MIGRATE, DS-NARROW | R-DEC-15 (NOT-MODELED) |
| decimalRouting | DR-REPO-ORDER, DR-NATIVE-ORDER, DR-RAW-ORDER, DR-DERIVED, DR-AGGREGATE (the oracle pins the exact value order and exact results every channel must reproduce; keys are O-TDK1's); DR-KEY-ARITHMETIC; DR-JSON-OPAQUE; DR-JSON-CONVERT | R-ORD-1, R-DEC-4, R-ENT-6; R-NUM-7; R-CMP-3, R-AGG-5; R-DEC-18 |
| wireRules | WR-JSON; WR-INSTANT | R-VAL-11; R-VAL-10 |
| wireRules | WR-X-ENCODINGS, WR-Q-SHADOW, WR-INTEGER-RANGE | engine encodings; the oracle pins the exact values they must reproduce (R-VAL-1, R-LANE-1) |
| temporalRules | TM-HALF-OPEN; TM-EMPTY-REJECTED | R-CUT-2; R-CMD-4 |
| readShapeRules | RS-RAW-LIFETIME, RS-RETIREMENT-CONTENT, RS-TIMELINE, RS-FIND-RANGE, RS-FIND-CONFLICT, RS-ENTITY-ORDER | R-HIST-1, R-HIST-3, R-ENT-7, R-ENT-5 (and AMB-16), R-ENT-5, R-ORD-3 |
| journalRules | JN-NEGZERO, JN-FIELDS, JN-STAGED, JN-ORDER | R-JNL-4 with R-VAL-11 (Q34c), R-JNL-1, R-CMD-7, R-JNL-2 |
| POSITION, positionDenseCases, positionRequiredCases | PO-LEXICOGRAPHIC-ORDER, PO-ORACLE-DENSE-ORDINALS, PO-NESTED-CUTS-DENSE, PO-ABORTED-LISTED; the oracle side of FX-NESTED-CUTS, FX-ABORT-GAP, FX-CRASH-APPEND-RESOLUTION (an `unknown` receipt resolved or not), FX-RESUME-AT-ABORT-GAP (`transactions(after)` from the gap's ordinal) | R-RCP-1, R-RCP-5, R-RCP-6, R-RCP-8, R-CUT-5, R-JNL-3 |
| q33Rules | R-VAL-7a, R-DEC-0 to R-DEC-7, R-LANE-2, R-CMP-3, R-NUM-7, R-NUM-8, R-AGG-5, R-CMD-9, R-CMD-12, R-JNL-5 to R-JNL-7, R-CUT-3, R-PAGE-3, R-PAGE-4 | the rule of the same id |
| comparisonRules (0.3.5) | CMP-CROSS-FAMILY-ORDERED | R-CMP-3 |

`tests/test_contract_section4.py` has one test per row of every table above (and per decimalRules key) and fails
when the contract gains a row without one, or when the oracle's error table keeps an id the contract dropped.
