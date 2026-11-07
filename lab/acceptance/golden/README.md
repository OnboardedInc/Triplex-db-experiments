# Golden vectors (EXP-G01)

Status: **DRAFT-UNREVIEWED**, 2026-11-07. Written by EXP-G01. An independent reviewer checks every vector before
the orchestrator freezes them. Until then nothing here closes an obligation.

## 1. What these files are

- **Hand-derived expected answers** for the places where Triplex has two contracts that look alike and are not:
  raw assertion lifetime versus as-of snapshot metadata, write-time cardinality versus read-time decoding,
  documented journal facts, duplicate supports and card-one conflicts (PLAN v1.1 C5), card-many order (Q8f),
  int64 boundaries, aggregate overflow (Q8a, Q8b), half-open intervals and one cursor sequence.
- **No production behavior defined any expected value.** No Triplex runtime, KV runtime, engine or oracle was run,
  and the O-REPLAY oracle code was not read. Every value comes from the documents in section 6. The only code
  executed was arithmetic (`math.nextafter`, `fractions.Fraction`, IEEE bit spelling) and one expansion script that
  transcribes the documented tiny-v4 fixture into a table (section 4.4).
- **Where the documents do not decide, the vector says `"expected": "AMBIGUOUS"`** with every reading and its
  sources. Section 7 lists them; the orchestrator rules.

## 2. Files and counts

| File | Vectors | Main contracts |
| --- | --- | --- |
| `g9-tiny-v4-retirement.json` | 8 | G9.history.snapshot-metadata, G9.history.raw-lifetime-compat (the five failing tiny-v4 checks, two controls, the retained counterexample) |
| `g9-history-cuts.json` | 2 | both history contracts at cuts before, at and after a retraction; R bound and unbound; same-R control |
| `c5-duplicates-conflicts.json` | 9 | C5.1 to C5.5, G4.neg.conflict-not-false-absence, G1.schema.cardinality |
| `q8f-card-many.json` | 5 | Q8f order and collapse, supports, -0 |
| `c6-journal.json` | 6 | C6, G7.receipt.journal-complete, G7.write.command-idempotency, G7.write.atomic |
| `g9-half-open.json` | 3 | G9.temporal.half-open-intervals |
| `g1-int64.json` | 2 | G1.types.eight-type-roundtrip, G1.types.invalid-rejected |
| `g5-sum-overflow.json` | 13 | G5.agg.exact-overflow (Q8a, Q8b), G5.agg.shape-controls, G5.agg.full-support |
| `g10-cursor.json` | 1 | G10.cursor.stable |
| **Total** | **49** | |

Per contract (a vector counts once per contract it names):

| Contract or obligation | Vectors |
| --- | --- |
| G9.history.snapshot-metadata | 9 (G9-V4-01..06, 08; G9-CUT-01, 02) |
| G9.history.raw-lifetime-compat | 9 (G9-V4-01..07; G9-CUT-01, 02) |
| C5 (G4.neg.conflict-not-false-absence, G1.schema.cardinality) | 9 C5 vectors, plus Q8F-04 and G5-SUM-13 |
| Q8f card-many | 5 |
| C6 journal (G7.receipt.journal-complete) | 6 C6 vectors, plus C5-08 |
| G9.temporal.half-open-intervals | 3, plus C5-04, C5-05 |
| int64 boundaries (G1.types.*) | 2, plus Q8F-02, G5-SUM-07 |
| Q8a sum overflow, Q8b AVG, empty shapes | 11 (G5-SUM-01..11) |
| G10.cursor.stable | 1 |
| R.repo.entity-suite / R.repo.mutation-controls | every vector with an EP-REPO query or a `killsMutants` list |

## 3. Vector format

Each file: `{ format: "triplex-db-2/golden-vectors/1", file, status, derivation, vectors[] }`, plus optional shared
`fixtures`, `sharedSchema`, `constants`.

| Field | Meaning |
| --- | --- |
| `id` | stable vector id |
| `contracts`, `planContracts`, `rulings` | obligation ids (ACCEPTANCE section 7), PLAN contracts (C5.x, C6), rulings (Q8a...) |
| `killsMutants` | mutation controls (ACCEPTANCE 4.3) that must make at least one query of this vector FAIL |
| `lanes` | lanes the vector applies to; `receiptScope: "engine"` where one XTDB receipt serves both XTDB lanes |
| `scope` | always a fresh database scope per vector |
| `schema` | EntityTypes for EP-REPO queries; a ConfigStore release command C0 runs first (not listed; positions are symbolic so it does not shift anything) |
| `commands[]` | `id`, `instant`, `meta` (actor, commandId, correlationId, causationId, configSnapshot, enforce), `ops[]` in `TransactOp` form with a `label` on every assert, `expect` |
| `queries[]` | `id`, `surface` (EP-* of ACCEPTANCE 4.1), `call` (public API), `basis`, `historyContract`, `compare`, `expected` or `expectedError`, `citations`, optional `ambiguity`, `readings`, `note` |

**Clock.** A command's `instant` is the deterministic clock of a fresh runtime used for that one command
(the tiny-v4 convention). The receipt's `instant` must equal it, or the run is invalid, not failed.

**Rejected commands.** `expect.outcome: "rejected"` with `error`, `positionAfter` (the committed position is
unchanged), and `transactionByCommand: null` where stated. Atomicity is part of the expectation.

## 4. Symbols, rendering and comparison

### 4.1 Symbols bound from receipts

| Symbol | Binds to |
| --- | --- |
| `$id:<label>` | the assertion id the receipt (`TransactionResult.triples`) assigned to the assert op with that label, matched by (entityId, attribute, value). Where two ops in one command carry the same triple, the vector is symmetric in them, so either binding is valid. |
| `$tx:<cmd>` | the receipt `txId` of that command |
| `$pos:<cmd>` | the receipt `position` of that command. Positions must be dense and increasing (ACCEPTANCE 4.2 item 2). The tiny-v4 fixture uses the literal positions 1 to 7 the v4 worker asserted. |
| `$snapshot:<release>` | the ConfigStore snapshot id of that release |
| `$int64:<decimal>` | an exact int64 in the surface's declared exact representation (AMB-10) |
| `@<key>` | a rendering defined in the same vector (`renderings`, `records`, `bodies`) |
| `<fresh scope>` | the scope the harness created for the vector |

### 4.2 Rendering

- **Triple rows** (EP-TRIPLES) use the `TripleResponse` nullable shape of `packages/core/src/Triple.ts`: Option `None`
  becomes `null`, nothing else is transformed. `schemaVersion` is not compared (adapter metadata; tiny-v4 V2
  correction).
- **Native rows** (EP-NATIVE) use the logical field names of ACCEPTANCE 4.2 item 4 (`recordedAt`,
  `recordedPosition`, `retractedAt`, `retractedPosition`, `retractTxId`, ...). Each lane maps them through its declared
  contract. The `identity` column holds the assertion label (`A1` means `$id:A1`; tiny-v4 uses `0/present/0`).
  `basis.P` is an explicit position, which only the native contract accepts (reuse of a resolved basis,
  `packages/xtdb/README.md`); ordinary reads take R and V only.
- **`values(attribute)` rows** (C5.5): `{ entityId, value, assertionIds, supports }`; `assertionIds` compared as a set.
- **Repository documents** (EP-REPO) follow the R3 sketch: `$id` plus attribute names; an absent optional attribute is
  a missing property, never `null`; card-many is always an array; int64 values are `IntegerValue` objects
  (`Attribute.int64`); number values are plain numbers.
- **Snapshot retirement** in repository timelines is written as `knownRetirement: null | { retractedAt, retractTxId }`.
  The final field shape is open (AMB-02); the logical content is what is compared.
- **Numbers.** Where the sign or low bits matter, a number carries `"bits"` (16 hex digits, IEEE 754 binary64, big-endian).
  The comparator checks the bits, then drops the field. `-0.0` is written `-0.0` in JSON and carries bits
  `8000000000000000`.
- **Strings.** Non-ASCII text uses JSON `\u` escapes (U+10000 is `𐀀`). `codepoints` fields are reading aids
  and are dropped before comparison.
- **Raw values in ops.** Ops carry raw `TripleValue` objects. In `g1-int64.json` the invalid texts must be sent as raw
  objects, not through `integer()`, which would canonicalize `"01"` to `"1"`.

### 4.3 Comparison modes

| `compare` | Rule |
| --- | --- |
| `exact` | deep equality after rendering |
| `multiset-by-id` / `multiset-by-identity` | same rows, any order, matched by assertion id or identity label |
| `ordered` | same rows in the same order (journal `changes[]`, repository arrays, pages) |
| `fields ...` | only the listed fields are compared |
| `set` | membership only |

No vector depends on the order of `match`, `history`, `entity` or Datalog results, because no public document fixes it.

### 4.4 The tiny-v4 table

`g9-tiny-v4-retirement.json` holds the documented fixture as data: 8 commands (2 ConfigStore releases, 5 domain commands,
1 rejected Required command) and all 100 assertion versions with their recorded and retirement coordinates. It is a
transcription of `recipe.mjs` (`fields()`, `correctionOps`, `presenceOps`, `VALID`) and the v4 `worker.mjs` command
order and instants. The per-query rows list each returned assertion with its expected retirement fields explicitly;
the harness renders the remaining fields from the table and does not apply either contract rule itself.
Cross-check: the future-retirement rows at the six old cuts are 3, 3, 1, 1, 3 and 0, which with the four earlier
snapshots that had none reproduces the review's 11 rows across 10 snapshots.

## 5. The two history contracts, as these vectors apply them

```
                     assertion a: recorded at (Ra, Pa), retired at (Rr, Pr) or never

 raw lifetime        retractedAt = Rr, retractTxId = tx(Pr)     always, whatever the basis
 (ordinary history)  sources: ACC G9.history.raw-lifetime-compat, HAM resultContract, handoff README

 as-of snapshot      retirement fields = (Rr, Pr, tx)  iff  Pr <= P  and  (R unbound or Rr <= R)
 at cut (P, R, V)    otherwise null
                     a is recorded at the cut iff Pa <= P and (R unbound or Ra <= R)   (both inclusive)
                     a is live at the cut iff recorded, retirement not known, validFrom <= V < validTo
                     sources: ACC 4.2 items 5-6, G9.history.snapshot-metadata, xtdb README ctx.history(),
                              R6 3.1 knownRetraction, HAM v2 "inclusive P/R cut predicates"
```

Live reads under the snapshot contract always show null retirement, because a row whose retirement is known at the
cut is not live there. The difference shows in known-at-cut history reads, where retired rows appear with their
retirement only once it is known.

## 6. Citation keys

| Key | Source |
| --- | --- |
| ACC-4.2.2 .. ACC-4.2.11 | `lab/acceptance/ACCEPTANCE.md` 4.2, O-REPLAY specification item n (2 receipts, 5 visibility at a cut, 6 both history contracts, 7 entity models, 8 changes in write order, 11 arithmetic and order) |
| ACC-4.3 | ACCEPTANCE 4.3 mutation controls table |
| ACC-6.1, ACC-6.2, ACC-6.4 | ACCEPTANCE 6.1 CS-TYPES8 and CS-TYPES8-NEG, 6.2 CS-NUMERIC, 6.4 CS-ENTITY |
| ACC-CR-COUNTEREXAMPLE | ACCEPTANCE 5.2: the original counterexample runs with its original frozen expected answer |
| ACC-G1-TYPES, ACC-G1-CARD | statements of G1.types.eight-type-roundtrip, G1.schema.cardinality |
| ACC-G4-CONFLICT | statement of G4.neg.conflict-not-false-absence |
| ACC-G5-OVERFLOW, ACC-G5-SUPPORT | statements of G5.agg.exact-overflow, G5.agg.full-support |
| ACC-G9-RAW | G9.history.raw-lifetime-compat: ordinary history, match, entity and entities keep the raw lifetime; no global mask |
| ACC-G9-SNAP | G9.history.snapshot-metadata: the five checks pass through repository timeline, as-of reads and native history helpers |
| ACC-G10-CURSOR | G10.cursor.stable |
| G7-ATOMIC, G9-HALF-OPEN | statements of G7.write.atomic, G9.temporal.half-open-intervals |
| C5.1 .. C5.5, C6 | `lab/PLAN.md` v1.1 section 4 |
| Q1, Q8a .. Q8f, Q12 | `lab/acceptance/RULINGS.md` (Q8b as revised after the Codex review) |
| HANDOFF-46 | `handoffs/claude-native/README.md`: ordinary raw assertion-lifetime metadata is a compatibility contract distinct from the as-of snapshot target |
| HAM-RC | `qualification/capacity/historical-assertion-metadata-v1/reproducers.json` resultContract.rawLifetimeCompatibility |
| HAM-A-SEAM, HAM-SAME-R | same file, candidate A seam; commonFiniteFixture.sameTimeCapture |
| HAM-V2-INCL | `historical-assertion-metadata-v2/README.md`: inclusive P/R cut predicates, same-recorded-time distinction |
| XTDB-README-HIST, XTDB-README-BASIS | `packages/xtdb/README.md`: ctx.history() includes known retracted assertions and masks retraction metadata not known at the cut; a resolved basis can be reused |
| R6-3.1 | `lab/research/R6-xtdb-gap-analysis.md` 3.1: knownRetraction requires retracted_position <= P and, when R is given, retracted_at <= R |
| TINY-V4-CONTRACT | `qualification/capacity/configured-entities-v1/TINY-XTDB-CONTRACT-v4.md` |
| V4-WORKER, V4-WORKER-CHECK | `packages/qualification/experiments/configured-entities-v1/tiny-backend-v4/worker.mjs` (command order, instants, `snapshot()` and `compareRetirements`) |
| CFG8-RECIPE | `packages/qualification/experiments/configured-entities-v1/recipe.mjs` |
| V4-REVIEW, V4-REVIEW-P | `qualification/reviews/configured-entity-xtdb-tiny-v4-terminal-independent.json` (failed names, counterexample; semantics.P) |
| TEMPORAL-TS | `packages/core/src/Temporal.ts` TemporalBasis and ReadBasis |
| TRIPLE-TS, VALUE-TS | `packages/core/src/Triple.ts`, `packages/core/src/Value.ts` (Int64Decimal) |
| ATTR-INT64 | `packages/core/src/config/Attribute.ts` int64 handle |
| TRIPLES-TS, -HISTORY, -RECORD, -CHANGE, -FEED, -ENTITYPAGE, -ENTITYPAGE-DOC | `packages/core/src/store/Triples.ts` doc comments and types |
| ENTITYPAGE-TS | `packages/core/src/EntityPage.ts` request, snapshot, limit and cursor error reasons |
| ERRORS-CAC | `packages/core/src/errors/index.ts` CommandAlreadyCommittedError fields |
| CONSTRAINT-193, CONSTRAINT-NEWLY, CONSTRAINT-VISIBLE | `packages/core/src/Constraint.ts` evaluateFacts (counts assertions), newlyViolated (new or worsened at represented boundaries), visibleAt (half-open). Named by G1.schema.cardinality as the counting rule. |
| DOCS-OPS-ENVELOPE, DOCS-OPS-FEED | `docs/operational-primitives.md` causal envelopes, ordered transaction feed |
| DOCS-HOST-JOURNAL | `docs/host-integration.md`: retraction changes include the old typed value and the original assertion transaction |
| DOCS-AGENTS-HIST | `docs/agents.md` section 5: history includes retracted assertions; entity and match show facts visible at the basis |
| DOCS-DATALOG-AGG, -ORDER, -PAGINATION, -BASIS, -VALUES, -QUERY-SHAPE | `docs/datalog.md` sections |
| TK-* | `packages/testkit/src/index.ts` case names: IDENTITY "same-value facts in one batch keep distinct identities"; JOURNAL "conditional transactions are atomic and journal their changes"; ENTITY-HISTORY "entity transaction history is indexed, complete, and snapshot-stable"; AGG "datalog aggregates preserve duplicate rows and define empty and distinct results"; RESERVED, JOURNAL-RETRACT, HIST-CURSOR, CORRECTIONS by their names |
| R3-SKETCH-DOC, -FIND, -COUNT, -TIMELINE, -PREDICATE | `lab/research/R3-artifacts/api-sketch.ts` and `usage.ts` |
| R01-D5, PLANNER-SUPPORTS | `lab/experiments/EXP-R01-entity-core/BRIEF.md` (absent optional is a missing property, card-many always an array; support counts keep a value after one of two identical assertions is retracted) |
| REVIEW-R2-2.4, REVIEW-R2-2.6 | `lab/reviews/plan-review-r2.log` journal sections 2.4 and 2.6 |

## 7. Ambiguity register (orchestrator to rule)

| Id | Question | Readings | Where |
| --- | --- | --- | --- |
| AMB-01 | **Which contract does ordinary `Triples.match` / `entity` / `entityPage` follow at an explicit old R?** The five tiny-v4 checks were authored on `Triples.match` and expect null retirement fields; CR-COUNTEREXAMPLE requires the original counterexample to run with that original expected answer. G9.history.raw-lifetime-compat, the HAM result contract and the handoff README say ordinary match keeps the complete raw lifetime. Both cannot hold on the same surface. | A: ordinary match keeps raw lifetime; the five checks are re-homed to repository as-of reads and native history (G9.history.snapshot-metadata's own wording). B: ordinary match at an explicit R masks; raw lifetime applies only to `history` and reads without R. | G9-V4-01..06 Q1, G9-V4-08 Q1, G9-CUT-01 Q2/Q3/Q7, G10-CUR-01 page:d |
| AMB-02 | Shape of snapshot retirement metadata. | (a) Triple shape with `retractedAt`/`retractTxId` null (v4 target); (b) HAM v1 `SnapshotAssertion.knownRetirement {recordedAt, txId}`; (c) R3 timeline `retractedAt?` with no tx field; native rows also carry `retractedPosition`. | all EP-REPO timeline queries |
| AMB-03 | Does `Repository.timeline` at a basis list assertions retired before the cut, and does it filter by V? | derived: yes, lists every assertion recorded at the cut ("All assertions for one attribute"); V filter undecided (HAM known-at-valid applies V; R3 calls timeline "the only way to see intervals"). Fixtures keep V inside every interval so membership does not depend on it. | G9-CUT-01 T1..T3 |
| AMB-04 | Journal change value of a `-0.0` assertion. | A: `0` (C6 keeps today's bytes; legacy journal is `JSON.stringify`); B: `-0.0` (G1 bit-exact on every surface, M-NEGZERO). | C6-02 Q2 |
| AMB-05 | Full `TransactionChange` JSON. C6 demands byte-identical journals, but today's bytes (optional fields present or absent) can only be known by running the T0 build, which these vectors may not do. | Vectors compare documented fields only. Byte identity needs a separate T0-capture regression baseline, which is a different oracle class from these vectors. | C6-01, C5-08 Q4 |
| AMB-06 | Does `retract-pattern` see assertions staged earlier in the same transaction? | A: yes, both changes, assert first (review r2 2.6.2; Constraint.ts project order); B: no. | C6-03 |
| AMB-07 | Order of retract changes produced by one `retract-pattern` with several matches. | compared as a set until ruled | C6-04 |
| AMB-08 | Card-many binary64 `-0.0` and `+0.0`: one value or two, and in which order? | A: two bit-distinct values; B: one value under IEEE equality, sign undecided. | Q8F-05 Q1 |
| AMB-09 | SUM over two equal-valued assertions on the **same** entity. | A: 20 (supports, G5.agg.full-support); B: 10 (one binding row). COUNT is 1 either way. | G5-SUM-13 |
| AMB-10 | Datalog projection of int64 results. docs/datalog.md lists seven value types and says numbers project as numbers; int64 is not mentioned. | expected values are written `$int64:<decimal>`; the representation needs a ruling (decimal text, IntegerValue, bigint). | G5-SUM-* |
| AMB-11 | Syntax of the explicit int64-to-binary64 conversion Q8b requires before AVG. | values decided by Q8b; syntax undocumented | G5-SUM-11 |
| AMB-12 | Empty valid interval `validFrom == validTo`. | A: accepted and never visible; B: rejected as invalid. | G9-HO-03 |
| AMB-13 | `ConflictingValuesError` field names. | compare `_tag` and the set of `{entityId, attribute}` pairs until EXP-R01 fixes the shape | C5-* |
| AMB-14 | Typed error tags for invalid int64 text and reserved-namespace writes. | testkit pins only message text; O-ERR is TO-AUTHOR | G1-I64-02, C6-05 |
| AMB-15 | `entityPage` order for ids outside the BMP ("ordered by entity identity": codepoint or UTF-16?). | not exercised; G10-CUR-01 uses ASCII ids | none |
| AMB-16 | Range predicates on int64 in `Repository.find`. | A: supported (ACC 6.4 "range ... on every family"); B: not offered (R3 `Predicate` gives gt/lt only to JS-number model values; int64 models are IntegerValue). | G1-I64-01 Q7 |
| AMB-17 | `find` whose filter avoids a conflicted attribute but whose returned document contains it. | A: fails with ConflictingValuesError (the document decodes every attribute, as `get` does); B: succeeds, but no document shape exists for the conflicted attribute. | C5-03 Q8 |

Decided by the cited documents but worth a confirming glance:

- **R is inclusive** (HAM v2; M-CUT-OFF-BY-ONE): the retraction at R=200 is known at R=200 (G9-CUT-01 Q4, N5; G9-V4-03/04
  history rows).
- **A lateral change inside a pre-existing conflict commits under enforcement** (retract one conflicting value, assert
  another; the violation count stays 2), per `Constraint.ts newlyViolated` and C5.2 (C5-07 C5).
- **AVG with explicit conversion over int64 values whose exact sum leaves int64 is not an overflow** (Q8a applies to the
  final result, which is a binary64 in range; G5-SUM-11 case 2). G5.agg.exact-overflow's wording ("SUM and AVG ... whose
  exact total leaves" int64) can be read the other way.
- **`snapshot.recordedAt` of an `entityPage` that omits recordedAt is the reader clock**, derived from
  `EntityPage.ts prepareEntityPage` (G10-CUR-01).

## 8. Mutation-control coverage

| Mutant | Killed by |
| --- | --- |
| M-HALF-OPEN | G9-HO-01, G9-HO-02, C5-04, C5-05, G9-V4-* Q7 |
| M-DROPPED-SUPPORT | C5-02, C5-05, C5-08, C5-09, Q8F-04, G5-SUM-13 (once ruled) |
| M-FUTURE-RETIREMENT | G9-V4-01..05 and 08 (native and repository queries), G9-CUT-01 N4/N6/F3, G9-CUT-02 |
| M-INT64-ROUND | G1-I64-01, Q8F-02, G5-SUM-01, 03, 07, 11 |
| M-CUT-OFF-BY-ONE | G9-CUT-01 Q4/N5, G9-CUT-02, G9-V4-03/04 history rows, G10-CUR-01 |
| M-NEGZERO | C6-02 Q1, Q8F-05 Q2 |
| M-ICU-ORDER | Q8F-01 |
| M-MASK-RAW | G9-V4-07, G9-CUT-01 Q1, G9-CUT-02 Q3 |
| M-CONFLICT-PICK | C5-03, C5-04, C5-07, C5-08, C5-09 |
| M-IDENTITY-COLLAPSE | C5-01, C5-06, Q8F-01, G5-SUM-12 |
| M-JOURNAL-ORDER | C6-01, C5-08, C6-03 (once ruled) |
| M-CLAIM-IGNORED | C6-01 |
| M-CARD-MANY-DROP | Q8F-01..04 |
| M-STALE-PROJECTION | G10-CUR-01 (partial: pinned position only) |
| M-ENTITY-TYPE-SWAP, M-SCOPE-LEAK, M-DECORRELATE, M-STALE-REUSE | **not covered** here (outside this brief's minimum; CS-ENTITY, CS-SHAPE and G8 suites own them) |

## 9. Not covered

- The finite-nine O-HAM fixture itself (O-HAM already exists and is ACCEPTED-track); G9-CUT-02 is an independent same-R
  control, not a copy of it.
- Presence, deletion and cascade (policy-pending, Q9).
- Negation shape controls (CS-SHAPE), recursion, cancellation, load and scale.
