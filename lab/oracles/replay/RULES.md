# O-REPLAY rules

Every semantic rule the oracle applies, with where it comes from. Status:

- **SOURCED**: stated in a public doc, a public type declaration, the acceptance contract, PLAN v1.1,
  RULINGS.md, or the orchestrator's correction message of 2026-11-07 (cited as "OC-n").
- **DERIVED**: follows from a sourced rule; the derivation is written here.
- **RULING-NEEDED**: `ORCHESTRATOR-RULING-NEEDED`. Documentation is silent. The oracle uses the stated
  default; when the default is a switch, the case can override it in `rules` (switch name in brackets).

No rule was inferred by running Triplex or by reading adapter or core implementation code. The only
implementation lines read were the two the orchestrator authorized for their rule (OC-4):
`packages/core/src/datalog/compiler.ts` around line 1397 (integer AVG) and the docstring of
`packages/core/src/Constraint.ts` `newlyViolated` (line 376).

## Values (R-VAL)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-VAL-1 | Eight families with exact representations: string = codepoint sequence; integer = Python int in [-2^63, 2^63-1]; number = binary64 raw bits; boolean; datetime = binary64 (JS number) bits, ordered as an exact rational; ref = entity id string; json = JSON.parse result with original key order plus canonical text; blob = (content id, mimeType, size, filename?). | SOURCED: `packages/core/src/Value.ts` field names; brief "exact representations" |
| R-VAL-2 | int64 travels as canonical decimal text `^(0\|-[1-9]\d*\|[1-9]\d*)$`; `"01"`, `"+1"`, `"1.0"`, `"-0"`, out-of-range and JSON numbers are invalid values. | SOURCED: Value.ts `Int64Decimal` declaration; ACCEPTANCE 6.1 CS-TYPES8-NEG |
| R-VAL-3 | Value identity (sets, conflicts, grouping, distinct count, Unique claimants) is family plus exact payload; binary64 by bits, so `-0.0` and `+0.0` are two values. | DERIVED from M-NEGZERO (ACCEPTANCE 4.3) and Q8d/Q8f. **RULING-NEEDED** whether a card-one attribute holding `0.0` and `-0.0` is a conflict |
| R-VAL-4 | NaN, ±Infinity, and decimal lexemes that overflow binary64 are invalid values. | SOURCED: Q8c "Triplex numbers are finite"; CS-TYPES8-NEG |
| R-VAL-5 | Strings with a lone surrogate are invalid (values, entity ids, attributes, json keys). NFC and NFD stay distinct; nothing is casefolded or normalized. | SOURCED: CS-TYPES8 / CS-TYPES8-NEG; spec item 11 "No casefolding" |
| R-VAL-6 | datetime accepts any finite JS number, negative and fractional included. The earliest and latest instant Triplex accepts is unknown [`datetimeRange`, default none]. | **RULING-NEEDED** (CS-TYPES8 names the bounds without values) |
| R-VAL-7 | json values follow JSON.parse: numbers become binary64 (so `9007199254740993` reads as `9007199254740992`, `1e400` is invalid), duplicate keys keep the first position and the last value. | DERIVED: the json payload is a JS value (Value.ts `Schema.Unknown`) |
| R-VAL-8 | Canonical json text: RFC 8785 style, keys sorted by UTF-16 code units, no whitespace, ECMAScript number text, `-0` written `0`. | **RULING-NEEDED**: Triplex CanonicalJson rules are not documented; the key order (UTF-16 vs codepoint) matters only for keys above U+FFFF |
| R-VAL-9 | blob size is a finite non-negative whole number (sizes above 2^32 allowed; negative rejected); filename optional. | SOURCED: CS-TYPES8 / CS-TYPES8-NEG. Whole-number requirement **RULING-NEEDED** |

## Order and comparison (R-ORD, R-CMP)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-ORD-1 | Inside a family: integers and binary64/datetimes numerically (exact rationals; `-0.0` before `+0.0`), booleans false < true, text and refs by codepoint, json by canonical text, blobs by (id, mime, size, filename). | SOURCED: Q8f; spec item 11 codepoint order |
| R-ORD-2 | Across families: integer < number < datetime < boolean < string < ref < json < blob. | **RULING-NEEDED**: Q8f says "then type family" without a rank; docs/datalog.md's Datalog page order (numbers/datetimes, booleans, text, null) is the inspiration |
| R-ORD-3 | Entity ids order by codepoint everywhere (entityPage, find tie-break, includes). JavaScript's default string sort (UTF-16) differs for U+E000..U+FFFF versus astral characters. | SOURCED: spec item 11; RULINGS Q8f |
| R-CMP-1 | Typed mode (default): values of different families are never equal and never ordered; `int64 1` vs `binary64 1.0`, `true` vs `1`, `"1"` vs `1` are distinct as filters and as group keys. | SOURCED: Q8d |
| R-CMP-2 | Predicate equality and ranges inside number/datetime use the numeric value, so `-0.0 = +0.0` as a predicate (identity still differs, R-VAL-3). | **RULING-NEEDED** |
| R-CMP-3 | Incompatible equality is false, incompatible inequality true, incompatible ranges false. A `datalog` comparison mode merges only number and datetime. | SOURCED: docs/datalog.md "Predicates", "Values and equality". Integer vs number in Datalog: Q8d default (distinct) |

## Arithmetic and aggregates (R-NUM, R-AGG)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-NUM-1 | int64 add/sub/mul/neg/abs are exact; any scalar result outside int64 is `integer-overflow`. | SOURCED: CS-NUMERIC rows; Q8a |
| R-NUM-2 | binary64 arithmetic is IEEE 754 round-to-nearest-even (CPython float). `-0.0 + 0.0 = +0.0`, `-0.0 * -1 = +0.0`, `+0.0 * -1 = -0.0`. A non-finite result is `number-overflow`. | SOURCED: OC-4; Q8c |
| R-NUM-3 | Division by zero (int64 or binary64) is `division-by-zero`. | SOURCED: Q8c |
| R-NUM-4 | int64 division truncates toward zero; `-2^63 / -1` overflows. | **RULING-NEEDED** |
| R-NUM-5 | CAST text to int64 accepts an optional sign and decimal digits; out of range is `integer-overflow`, other text `invalid-cast`. | SOURCED for the two CS-NUMERIC rows; accepted syntax **RULING-NEEDED** |
| R-NUM-6 | Mixed-family arithmetic is `type-mismatch`. | DERIVED from Q8d |
| R-AGG-0 | Aggregate input rows are Datalog-like bindings: distinct tuples of (entity, distinct visible values); equal-valued duplicate assertions on one entity form one row, equal values on two entities are two rows. | DERIVED: docs/datalog.md "count counts distinct public source values. The other numeric aggregates retain duplicate input rows" |
| R-AGG-1 | `count` counts distinct values; ungrouped empty input gives one row with count 0 and other aggregates null; grouped empty input gives no rows. | SOURCED: docs/datalog.md "Aggregation" |
| R-AGG-2 | int64 `sum` is the exact total; `integer-overflow` only when the final total is outside int64. | SOURCED: Q8a |
| R-AGG-3 | binary64 `sum` is the exact rational total rounded once; all-`-0.0` input sums to `-0.0`. | **RULING-NEEDED** (SQL leaves summation order unspecified; this is the order-independent choice) |
| R-AGG-4 | `avg` over int64 is a typed preflight `DatalogValidationError` ("Exact integer AVG requires an explicit conversion to number"), raised even for empty input. With explicit conversion (`integerAvg: "convert"`) it is binary64 of exact sum / count rounded once. binary64 `avg` is the exact mean rounded once. | SOURCED: OC-4 and core compiler.ts:1397; Q8b |
| R-AGG-5 | `min`/`max` stay in their family, ordered by R-ORD-1. Mixed families in one aggregate are `mixed-families`; non-numeric `sum`/`avg` are `non-numeric-aggregate`. | DERIVED: Q8d; docs/datalog.md "nonnumeric aggregate comparisons are typed preflight failures" |

## Commands and outcomes (R-CMD)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-CMD-0 | The oracle decides validity from command intent, order, preconditions and rules. Receipts bind txId, position, instant and assertion ids only; a disagreeing receipt is a mismatch and never enters the expected state. | SOURCED: OC-3 |
| R-CMD-1 | A command whose `commandId` was committed earlier in the same scope fails with `CommandAlreadyCommittedError` carrying the original txId, and allocates no position. | SOURCED: docs/operational-primitives.md "Causal transaction envelopes"; docs/agents.md 3.2 |
| R-CMD-2 | `TripleLive` needs a matching explicit `retract` in the same command (else invalid-operation); a non-live target is `TransactionConflictError`. `EntityState` compares the complete set of recorded-live assertion ids of the entity; a mismatch is `TransactionConflictError`. Recorded-live means not retracted, regardless of valid time. | SOURCED: Triples.ts `TransactionMeta.preconditions`, Triple.ts `EntityStatePrecondition`. "Regardless of valid time" **RULING-NEEDED** |
| R-CMD-3 | Omitted `validFrom` = the transaction instant [`validFromDefault`]; omitted `validTo` = open. Omitted `createdBy` = null [`createdByDefault`: `null` or `actor`]. `recordedAt` = receipt instant; `schemaVersion` = the adapter metadata the case declares. | validTo: SOURCED (Triple.ts nullable). validFrom and createdBy defaults **RULING-NEEDED**. schemaVersion: SOURCED tiny-v4 contract (XTDB codec Some(1)) |
| R-CMD-4 | `validTo <= validFrom` is invalid-operation [`emptyIntervalRejected`]. | **RULING-NEEDED** |
| R-CMD-5 | An explicit retract of an assertion that is no longer live is `TransactionConflictError` [`retractNonLive`: `transaction-conflict`, `invalid-operation`, `noop`]. Retracting an unknown id, or the same id twice in one command, is invalid-operation. | DERIVED from operational-primitives "Retraction is the atomic comparison"; **RULING-NEEDED** |
| R-CMD-6 | Reserved namespace: attributes starting `:_` and entity types starting `_` (for example `:_tx/*`, `_Transaction`) are rejected for assert, retract and retract-pattern [`reservedAttributePrefix`, `reservedEntityTypePrefix`]. Attribute syntax is not checked by default [`attributeSyntax`: `agents-md` applies the docs/agents.md regex]. | `_Transaction` / `:_tx/` reserved: SOURCED (operational-primitives; lab/research/R9 notes the reserved-namespace error). Exact prefixes and syntax enforcement **RULING-NEEDED** |
| R-CMD-7 | `retract-pattern` retracts every recorded-live assertion of the pre-state matching all given fields (value by identity), in creation order. An empty pattern is invalid-operation [`retractPatternEmptyRejected`]. | Matching fields SOURCED (Triple.ts `QueryRequest`). Pre-state, valid-time independence, order and empty pattern **RULING-NEEDED** |
| R-CMD-8 | Check precedence: operation validation (invalid-value, reserved-namespace, invalid-operation) -> command claim -> preconditions -> retract liveness -> constraint enforcement. | **RULING-NEEDED** |
| R-CMD-9 | Error tags: CommandAlreadyCommittedError, TransactionConflictError, ConstraintViolationError are documented. invalid-value, reserved-namespace, invalid-operation and host-abort have no documented tag; the oracle reports the category and compares the receipt's `category` when given, else marks `PASS-OUTCOME-ONLY`. | Tags SOURCED (Triples.ts error union). Others **RULING-NEEDED** (O-ERR) |
| R-CMD-10 | Race groups: committed members replay in receipt position order and must succeed; a rejected member must fail at some serialization point; a member that succeeds at every point is a FAIL. | DERIVED from OC-3 (serial order is a system fact; validity is not) |
| R-CMD-11 | Nested transactions: every allocated position is its own cut; members of a physical group validate against the state including earlier accepted members; a failing member is rejected alone; an abandoned outer transaction is declared with `hostAbort` on every member. | SOURCED: OC-2; PLAN C2.2 "A member that fails is rejected alone"; review r1 #6 |

## Constraints (R-CON)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-CON-1 | Enforcement applies only when the command carries `meta.enforce` (or the case enforcement mode is `on`). It evaluates pre-state and post-state at every validFrom and validTo boundary of every pre-state and post-state fact and rejects only violations that are new, or worsened (larger count) for cardinality and uniqueness. Existing violations never block unrelated writes or repairs. | SOURCED: docs/configuration.md "Atomic graph constraints"; OC-4 (Constraint.ts:376 docstring) |
| R-CON-2 | An entity is of type T at valid instant v when it has a live-at-v assertion carrying entityType T [`typeMembership`]. Retracting every fact of an entity therefore removes it from T. | **RULING-NEEDED** |
| R-CON-3 | Required: a member of T with no live value of the attribute. Cardinality: live assertion count above `max` (equal-valued duplicates count). Unique: one value claimed by two or more members of T. ReferenceTarget: a value that is not a ref to a live member of the target type. | SOURCED: rule names (Constraint.ts types), PLAN C5.1 (cardinality counts assertions). Exact predicates DERIVED |
| R-CON-4 | Violation detail reported: code, entityType, attribute, validAt, actual, subject (Unique: claimants and value identity). Receipt comparison checks the tag and, when present, the code set. | DERIVED from Constraint.ts `Violation`/`ViolationAt` field names |
| R-CON-5 | A schema release yields Required (required), Cardinality max 1 (cardinality one), Unique (unique), ReferenceTarget (ref with target). | SOURCED: docs/configuration.md "Employer.constraints yields ... required, cardinality, uniqueness, and reference-target rules". `max 1` DERIVED |

## Receipts (R-RCP)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-RCP-1 | Committed positions per scope are dense (from `initialPositions`+1 when declared) and increase in stream order outside race groups. Committed receipts carry txId, position, instant. | SOURCED: spec item 2 |
| R-RCP-2 | Rejected receipts hold no position, txId or assertion ids. | SOURCED: spec item 2 |
| R-RCP-3 | txIds and assertion ids are unique. | SOURCED: spec item 2; M-IDENTITY-COLLAPSE |
| R-RCP-4 | `assertionIds` align with operations, non-null exactly at asserts. Unbindable ids are replaced with `unbound:<command>:<op>` and the case is marked diverged. | DERIVED |
| R-RCP-5 | Committed members of one physical group hold consecutive positions. | DERIVED from OC-2 (one physical transaction serializes) |
| R-RCP-6 | `unknown` outcomes must carry `resolvedOutcome`; an unresolved or missing receipt fails. | SOURCED: CR-FAULT "zero unresolved outcomes" |
| R-RCP-7 | When the command declares a deterministic `clock`, the receipt instant must equal it. Instants are **not** required to be non-decreasing in position order. | SOURCED: OC-1 (each runtime supplies its own clock); tiny-v4 explicit runtime clocks |

## Cuts and history (R-CUT, R-HIST)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-CUT-1 | An event (arrival or retirement) is known at cut (P, R) iff its position <= P and (R unbound or its instant <= R). R is independent of P. | SOURCED: OC-1; O-HAM `known()` |
| R-CUT-2 | Visible at (P, R, V): arrival known, retirement not known, and validFrom <= V < validTo (null validTo = open). | SOURCED: spec item 5; docs/concepts.md (interval ends exclusive) |
| R-CUT-3 | Public cuts need non-negative R and V (`invalid-basis`); P outside 0..last is `unavailable-cut`. Self-checks may set `publicBasis: false`. | SOURCED: Temporal.ts `validateTemporalInstant` declaration |
| R-HIST-1 | Raw lifetime: every assertion of the entity whose arrival is known at the cut (all, without a cut), with complete retirement fields even when the retirement is after the cut. | SOURCED: spec item 6; docs/concepts.md (`history` includes retracted) |
| R-HIST-2 | As-of snapshot: same membership, retirement fields null unless retractedPosition <= P and (R unbound or retractedAt <= R). `match`/`entityTriples` return both contracts. | SOURCED: spec item 6; OC-1 |
| R-HIST-3 | O-HAM SnapshotAssertion view: `live-at-valid` = visible rows; `known-at-valid` = arrival known and valid at V, with `knownRetirement` only when known. | SOURCED: historical-assertion-metadata v1 MENU.md and v2 oracle |

## Journal (R-JNL)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-JNL-1 | A record per committed position: txId, position, instant, actor, commandId, correlationId, causationId, configSnapshot (present when given), changes. A change carries op, tripleId, entityId, attribute, entityType?, value, validFrom, validTo?, recordedAt; a retract also retractedAt, assertionTxId, retractionTxId. `changedEntities` lists the changed entities once each. | SOURCED: Triples.ts `TransactionRecord`/`TransactionChange`; operational-primitives `:_tx/*` facts; PLAN C6. Which optional fields appear on which op **RULING-NEEDED** |
| R-JNL-2 | Changes are in operation order, retract-pattern matches expanded in place in creation order [`journalChangeOrder`: `operation-order`, `asserts-then-retracts`, `retracts-then-asserts`]. | **RULING-NEEDED** (M-JOURNAL-ORDER needs the frozen order) |
| R-JNL-3 | `transactions({after, limit})`: positions > after ascending, limit 1..1000 default 100, `next` = last returned position. `transactionsForEntity`: newest first, `snapshotPosition` captured on the first page, `beforePosition` exclusive, `nextBeforePosition` when more exist. Internal writes appear as opaque records unless `journaled: false`. | SOURCED: Triples.ts page types; operational-primitives |
| R-JNL-4 | The journal value of a binary64 `-0.0` change is reported exactly (`-0`). C6 says `transactions()` keeps its "`-0` behavior" without stating it. | **RULING-NEEDED** |

## Entities and repository (R-ENT, R-PAGE, R-SUP)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-ENT-1 | An entity exists as type T at a cut iff a visible assertion on it carries entityType T. Every visible assertion on a declared attribute contributes, whatever its own entityType. | **RULING-NEEDED** (Repository contract EXP-R01 not frozen) |
| R-ENT-2 | Cardinality one: one distinct value -> value with its supports; two or more distinct values -> conflict; equal-valued duplicates are one value with several supports. Cardinality many: distinct values in canonical order (R-ORD-1) with supports. Absent optional -> missing property. | SOURCED: PLAN C5.1, C5.2; RULINGS Q8e, Q8f; spec item 7 |
| R-ENT-3 | `get`/`getMany` fail with `ConflictingValuesError` listing every conflicted (entity, attribute) among the requested entities; `getMany` preserves order and gives null for missing ids. | SOURCED: PLAN C5.3; CS-ENTITY |
| R-ENT-4 | Includes resolve at the same cut; a conflicted include attribute or conflicted included entity fails the read. Reverse refs list referring entities by id. | SOURCED: spec item 7; C5.3 |
| R-ENT-5 | `find` fails with `ConflictingValuesError` when an attribute it references (where, orderBy, include) is conflicted for any candidate; unreferenced conflicts do not affect it. Predicates on a cardinality-many property match when any element matches; a missing value fails every comparison except `missing`. | C5.3 SOURCED. Card-many and missing semantics **RULING-NEEDED** |
| R-ENT-6 | Order: present values before missing, family rank ascending, direction inside the family, entity id ascending as tie-break. Ordering by a cardinality-many property is `invalid-query`. | DERIVED from docs/datalog.md total order. **RULING-NEEDED** for the repository |
| R-ENT-7 | `timeline`: the model after each journaled position that changed the entity, at the cut's R and V. | **RULING-NEEDED** (repository `timeline` signature not frozen) |
| R-ENT-8 | `validTimeline`: half-open segments between the validFrom/validTo boundaries of the entity's recorded-visible assertions, model at each segment start. | DERIVED |
| R-ENT-9 | `missingRequired` and `undeclaredAttributes` are reported beside the model; a missing required value does not fail the read. | **RULING-NEEDED** |
| R-PAGE-1 | `find` pages: the ordered result split by `pageSize`; every page is read at the one cut. | SOURCED: docs/datalog.md snapshot-stable pages; spec item 9 |
| R-PAGE-2 | `entityPage`: ids with a visible assertion carrying the entity type, codepoint order, complete visible bodies (body order treated as a set). | SOURCED: Triples.ts `EntityPage` ("ordered by entity identity"); order by R-ORD-3 |
| R-SUP-1 | Live support of a value = the visible assertions with that (entity, attribute, value identity). | SOURCED: C5.1, C5.5 `values(attribute)` |
| R-SUP-2 | Reachability supports over one edge attribute: closure is the positive-length reachable set; supportCount is the number of distinct node-sequence paths (several equal-valued edge assertions are one edge, listed together); a cycle on a from-to path is a typed `cycle` error. | SOURCED: packet workload 20 projection text ("support count is the number of distinct node-sequence paths") |

## Scale (R-SCALE)

| Id | Rule | Status, source |
| --- | --- | --- |
| R-SCALE-1 | Configured-entity populations in closed form for any n <= 10m, width 1 or 10, re-derived from the generator rules in CONTRACT.md; unit tests check them against explicit replay of the generator for n in {1, 8, 101, 1001, 2501}. | SOURCED: configured-entities-v1/CONTRACT.md; S.dataset.target-population |
| R-SCALE-2 | Value families of the generated facts follow the O-CFG8 frozen notation: untagged JS numbers are binary64 (score, amount, rank, type-version), the tagged integer field is int64, instant is a datetime, group a ref. | DERIVED from tiny-v4 oracle.json notation |
| R-SCALE-3 | configFacts and receipt/journal/claim metadata counts are null (not predictable without ConfigStore internals). | SOURCED: O-CFG8 counts (null in the frozen oracle) |
