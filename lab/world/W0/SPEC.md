# W0: the frozen world definition (spec version W0-1.0.0, 2026-11-07)

W0 is a small synthetic world definition. It stands in for Onboarded's real world definition in every Triplex test: the P5
release sweep, the P3 dependency rules and the domain expectations of the 20 golden scenarios (`lab/TARGETS.md` sections 1.1,
6 and 6.1). It is not a Triplex feature. Two programs implement it from this file alone, a TypeScript reference kernel and the
stdlib-only Python oracle O-DOMAIN, and they must produce byte-identical outputs for every input. When they disagree, either one
of them has a bug or this file is ambiguous, and the ambiguity gets a named entry in section 14.

**Frozen.** Nothing in this file changes in place. A change of meaning makes a new world (`W1`) with its own releases and cases.

## 0. Contents

1. Operations and files
2. Value types
3. Entities and attributes
4. The world, the basis, validation and errors
5. Releases, hashing, diff and activation
6. Shared definitions used by the rules
7. The eleven rules (decision tables, read sets, inputs)
8. Output assembly
9. Canonical JSON
10. Affected subjects (P3, GS.06b)
11. Golden cases
12. Workload coverage: the seeded sweep population and its frozen floors
13. Invariants
14. Self-review: where two implementers could still differ, and the resolution chosen
15. Open questions

## 1. Operations and files

**W0 defines four pure functions.** None reads a clock, a random source, the environment or anything outside its arguments.
"Now" is always the basis valid time.

| Operation | Signature | Output |
| --- | --- | --- |
| `evaluate` | `evaluate(world, release, basis)` | the subject's outputs (section 8) or an error |
| `resolveRelease` | `resolveRelease(activations, validTime)` | the hash of the release in force at that valid time, or an error |
| `reconcile` | `evaluate(world, resolveRelease(activations, basis.validTime), basis)` | the same output shape as `evaluate` |
| `affected` | `affected(release, worlds, writes)` | the sorted list of subjects whose dependencies meet the writes (section 10) |

**Preview and activation use the same function.** A preview (GS.11, plan impact) is `evaluate` with a release that is not
active. An activated sweep (GS.10, P5) is `reconcile` after the activation fact exists. At one basis both give the same bytes
(case C31 against C20).

**Files in `lab/world/W0/`.**

| File | What it holds |
| --- | --- |
| `SPEC.md` | this file, the only normative text |
| `schema.json` | the attribute table of section 3 and the release parameter table of section 5, as data |
| `releases/R1.json`, `releases/R2.json` | the two releases |
| `releases/index.json` | release name to content hash |
| `cases/*.json` | the 42 golden cases (section 11) |
| `validate.py` | a stdlib-only shape validator (`python3 -I validate.py`); it holds no rule logic |
| `README.md` | how to use the folder |

## 2. Value types

**Every value is exact. No floating-point number appears anywhere in W0**, in inputs, outputs, releases or arithmetic. Sam's
numeric rule applies (`lab/research/SAM-pasted-numbers-2026-11-07.md`): money as scaled-integer cents, hours as integer minutes,
calendar dates as ISO dates, instants as ISO UTC strings with a fixed precision, and a hard error, never a silent conversion, for
anything outside the type.

| Type | JSON form | Exact domain |
| --- | --- | --- |
| `date` | string `YYYY-MM-DD` | a real proleptic Gregorian date with year 2000 to 2099 |
| `instant` | string `YYYY-MM-DDTHH:MM:SS.ffffffZ`, exactly 27 characters | UTC, microsecond precision, six fractional digits always present; the date part follows `date`; hour 00 to 23, minute 00 to 59, second 00 to 59 (no leap seconds) |
| `cents` | JSON integer token | 0 to 9007199254740991 (2^53 - 1) inclusive |
| `minutes` | JSON integer token | 0 to 10080 inclusive (the minutes in one week) |
| `boolean` | `true` or `false` | |
| `text` | string | 1 to 64 characters, each in U+0020 to U+007E (printable ASCII) |
| `enum` | string | one of the listed values, exact case |
| `ref` | string | an entity id of the stated kind (section 3) |
| `erased` | object `{"erasedAt": <instant>}` with exactly that one key | allowed only on attributes marked PII; it replaces the value after an erasure (`lab/TARGETS.md` section 7) |

**A JSON integer token** matches `-?(0|[1-9][0-9]*)` with no fraction and no exponent. `1650.0`, `1.65e3` and `"1650"` are not
`cents` even though some parsers turn them into 1650. An integer token outside the domain (`-1`, `9007199254740992`) is invalid.
Both are `W0.E_VALUE` (section 4.4).

**Instants compare as strings.** Because every instant has the same 27-character shape and a four-digit year, byte order of the
strings equals time order. Implementations compare instants as strings and never convert them to a native time type (a
JavaScript `Date` would drop the microseconds). Derived instants (section 6.1) may fall in 1999 or 2100 and still have four-digit
years.

**Dates use calendar arithmetic only.** No rule adds a duration to an instant. Every instant a rule produces is a date at
`T00:00:00.000000Z`.

## 3. Entities and attributes

**Four entity kinds, told apart by the id.** A local part is 1 to 32 characters from `[a-z0-9-]`.

| Kind | Id grammar | Example | Role |
| --- | --- | --- | --- |
| placement | `pl:<local>` | `pl:a` | the subject; one placement is one worker at one job |
| document | `<placement id>/doc:<local>` | `pl:a/doc:1` | owned by that placement |
| decision | `<placement id>/dec:<local>` | `pl:a/dec:1` | owned by that placement; an immutable reviewer or agent record |
| location | `loc:<local>` | `loc:nyc` | shared: many placements reference one location |

**Placement attributes.**

| Attribute | Type | Cardinality | PII | Meaning |
| --- | --- | --- | --- | --- |
| `startDate` | date | one | no | first day of work |
| `section1AttestedAt` | instant | one | no | the worker signed I-9 Section 1 |
| `ssn` | text | one | yes | social security number as entered |
| `everifyStatus` | enum `pending`, `tnc`, `authorized`, `fnc` | one | no | E-Verify case status (`tnc` tentative nonconfirmation, `fnc` final nonconfirmation) |
| `everifyStatusAt` | instant | one | no | when the vendor reported that status |
| `bgcStatus` | enum `pending`, `clear`, `consider` | one | no | background-check result |
| `payRateCents` | cents | one | no | hourly pay rate in cents |
| `baselinePayRateCents` | cents | one | no | the pay rate the placement was approved at |
| `weeklyMinutes` | minutes | one | no | scheduled minutes per week |
| `location` | ref to a location | one | no | work location |
| `documents` | ref to a document whose id starts with this placement's id + `/doc:` | many | no | identity and work-authorization documents |
| `decisions` | ref to a decision whose id starts with this placement's id + `/dec:` | many | no | reviewer decisions and agent proposals |

**Document attributes:** `docType` (enum `passport`, `ead`, `visa`; one), `expiresOn` (date; one), `reverified` (boolean; one).

**Decision attributes:** `target` (enum `i9.section2`, `bgc.adjudication`, `pay.change`; one), `verdict` (enum `approve`,
`waive`, `reject`; one), `author` (enum `person`, `system`, `agent`; one). An agent-authored record is a proposal.

**Location attributes:** `stateMinWageCents` (cents; one), `localMinWageCents` (cents; one).

No other attribute exists. `schema.json` holds the same table as data.

## 4. The world, the basis, validation and errors

### 4.1 The basis

```
basis = {"tx": <integer 0 to 9007199254740991>, "validTime": <instant>}
```

**`tx` is the record-time position** of the read: the world holds what the store knew after committing transaction `tx`.
**`validTime` is "now"** for every rule. A lane's position is a coordinate `(stream, epoch, offset, ordinal)` ordered
lexicographically and not necessarily dense (RULINGS Q31c). W0 needs only its order, so the adapter passes one integer per
transaction that preserves that order: the oracle's dense ordinal, which O-REPLAY already assigns by sorting coordinates. Every
W0 rule compares positions only with `<`, `>=` and `max`, so any order-preserving integer gives the same outputs except the
`inputs` arrays and the work item ids, which carry the integers themselves. The kernel and O-DOMAIN must therefore use the same
mapping, the dense ordinal, when they are compared.

### 4.2 The world

```
world = {"subject": <placement id>, "facts": [<fact>, ...]}
fact  = {"e": <entity id>, "a": <attribute>, "v": <value>, "tx": <integer 1 to 9007199254740991>}
```

1. **The world is the store's answer at the basis.** It holds the facts valid at `basis.validTime` as recorded up to `basis.tx`.
   The store, not W0, applies bitemporal visibility, retroactive corrections and the supersession of stale vendor revisions.
2. **`tx` on a fact is the commit position of the transaction that asserted it.** Facts asserted in one command share one `tx`.
   This is the "commit order the store reports" that decision resolution uses (section 6.2).
3. **Allowed entities:** the subject, entities it owns (id starts with `<subject>/`), and locations. A document or decision id
   always starts with its owner's id, so a world for `pl:a` cannot carry `pl:b/doc:1`.
4. **Reachable entities** are the subject, the documents and decisions named by the subject's `documents` and `decisions` facts,
   and the location named by its `location` fact. Facts of allowed but unreachable entities are valid and are ignored.
5. **Fact order in the array carries no meaning.** Outputs never depend on it, except which error is reported first (4.4).
6. **An erased value keeps its fact.** After a PII erasure the fact stays with its `e`, `a` and `tx`; only `v` becomes
   `{"erasedAt": ...}`. Per `lab/TARGETS.md` section 7 a store returns the marker at every basis once the erasure has published,
   including bases before the erasure, so outputs at old bases can change after an erasure (reproduction holds modulo erasure).

Notation used below: `S` is the subject. `S.x` is the value of the fact `(S, x)` or `⊥` (absent). `tx(S.x)` is that fact's `tx`.
For a many-cardinality attribute, `S.documents` is the set of its values.

### 4.3 Operation inputs (the `input` object of a case)

| Operation | Input object (exact keys) |
| --- | --- |
| `evaluate` | `{"basis", "release", "world"}`, where `release` is `"R1"` or `"R2"` and names `releases/<name>.json` |
| `reconcile` | `{"activations", "basis", "world"}`, where `activations` is an array of `{"from": <instant>, "release": <hash>, "tx": <integer>}` |
| `affected` | `{"basis", "release", "worlds", "writes"}`, where `worlds` is an array of worlds with distinct subjects and `writes` is an array of `[<entity id string>, <attribute string>]` |

### 4.4 Validation and errors

**An invalid input yields `{"error": "<code>"}` and nothing else.** Checks run in the order below and the first failure wins.

1. **`W0.E_SHAPE`:** the input object, `basis`, `world`, each fact, each activation and each write do not have exactly the keys and
   JSON kinds given in 4.1 to 4.3 (object, array, string; `tx` must be a JSON integer token); `release` is not `R1` or `R2`; two
   worlds in `affected` share a subject.
2. **`W0.E_BASIS`:** `basis.validTime` is not a valid instant, or `basis.tx` is outside its range.
3. **For each world in array order** (one world for `evaluate` and `reconcile`):
   1. `W0.E_UNKNOWN` if `subject` is not a placement id.
   2. For each fact in array order: `W0.E_UNKNOWN` if `e` is not an allowed entity (4.2 item 3) or `a` is not an attribute of
      that kind; `W0.E_VALUE` if `v` is not a valid value of the attribute's type (section 2), including a ref of the wrong kind or
      owner and an erased marker on a non-PII attribute; `W0.E_BASIS` if `tx` is less than 1 or greater than `basis.tx`.
   3. `W0.E_CARDINALITY` if two facts share `(e, a)` for a one-cardinality attribute, or share `(e, a, v)` for a many-cardinality
      attribute.
4. **For `reconcile`, each activation in array order:** `W0.E_VALUE` if `release` does not match `^sha256:[0-9a-f]{64}$` or `from` is
   not a valid instant; `W0.E_BASIS` if `tx` is less than 1 or greater than `basis.tx`. Then `W0.E_NO_RELEASE` if
   `resolveRelease` finds no release (5.4).

`writes` entries in `affected` are not checked beyond their shape: any entity and attribute strings are allowed.

## 5. Releases, hashing, diff and activation

### 5.1 The release document

```
{"name": <"R1" or "R2">, "rules": [<rule entry> x 11], "world": "W0"}
rule entry = {"id": <rule id>, "params": <object>}
```

**The eleven rule entries appear in this fixed order:** `LIFE`, `I9S1`, `I9S2`, `EVSUB`, `EVSTAT`, `BGC`, `DOCEXP`, `MINWAGE`, `OT`,
`PAYCHG`, `PROP`. The order is the evaluation and trace order (section 8). One rule is one requirement.

| Rule | Params | R1 | R2 |
| --- | --- | --- | --- |
| `LIFE` | none | `{}` | `{}` |
| `I9S1` | none | `{}` | `{}` |
| `I9S2` | `businessDays` integer 1 to 10 | `{"businessDays": 3}` | `{"businessDays": 2}` (changed) |
| `EVSUB` | `businessDays` integer 1 to 10 | `{"businessDays": 3}` | same |
| `EVSTAT` | `tncBusinessDays` integer 1 to 20 | `{"tncBusinessDays": 8}` | same |
| `BGC` | none | `{}` | `{}` |
| `DOCEXP` | `leadDays`: object from document type to integer 0 to 365; the keys are the tracked types | `{"leadDays": {"ead": 0, "visa": 0}}` | `{"leadDays": {"ead": 90, "visa": 0}}` (changed) |
| `MINWAGE` | `floorAttributes`: non-empty array of distinct location `cents` attribute names in ascending byte order | `{"floorAttributes": ["stateMinWageCents"]}` | `{"floorAttributes": ["localMinWageCents", "stateMinWageCents"]}` (changed) |
| `OT` | `thresholdMinutes` minutes | `{"thresholdMinutes": 2400}` | same |
| `PAYCHG` | `thresholdCents` cents | `{"thresholdCents": 500}` | same |
| `PROP` | none | `{}` | `{}` |

**R2 changes exactly three requirements:** the Section 2 due window (`I9S2`), the minimum-wage rule's location attributes
(`MINWAGE`, which changes its read set), and the expiry handling of one document type (`DOCEXP`, `ead` only).

### 5.2 Content hash

`hash(release) = "sha256:" + lowercase hex of SHA-256 over the UTF-8 bytes of canonicalJson(release)` (section 9). The hashes
are in `releases/index.json`, and `validate.py` recomputes them. A release is immutable: changing a byte makes a different release.

### 5.3 Release diff

`diff(A, B)` is the list of rule ids, in release order, whose rule entries have different canonical JSON in A and in B.
`diff(R1, R2) = ["I9S2", "DOCEXP", "MINWAGE"]`. This is the definition tier of R18 section 3.1 item 3: a sweep may skip a
`(subject, rule)` pair whose rule is not in the diff and whose inputs did not change.

### 5.4 Activation

**Activation is a fact:** "this tenant uses release H from valid time F", committed at position `tx`. The activations passed to
`resolveRelease` are the tenant's activation facts visible at the basis.

`resolveRelease(activations, v)`:

1. Candidates are the activations with `from <= v` (string comparison).
2. No candidate: `W0.E_NO_RELEASE`.
3. Pick the candidate with the greatest `from`; among equal `from`, the greatest `tx`; among equal `tx`, the greatest `release`
   string (byte order).
4. If the picked hash is neither R1's nor R2's: `W0.E_NO_RELEASE`. Otherwise return it.

In-flight reconciles finishing on the old release is runtime behavior: each reconcile resolves the release once, at its own basis.

## 6. Shared definitions used by the rules

### 6.1 Date functions

| Function | Definition |
| --- | --- |
| `startOf(d)` | the instant `d + "T00:00:00.000000Z"` |
| `addDays(d, n)` | the date n calendar days after d (n may be negative or zero), proleptic Gregorian |
| `endOfDay(d)` | `startOf(addDays(d, 1))`: "due by the end of day d" means due at the next midnight UTC |
| `dateOf(t)` | the first 10 characters of instant t |
| `weekday(d)` | ISO weekday of d, 1 = Monday to 7 = Sunday |
| `addBusinessDays(d, n)`, n >= 1 | step forward one calendar day at a time from d, counting each day whose weekday is 1 to 5, and return the day on which the count reaches n. d itself is never counted. There are no holidays. |

Examples: `addBusinessDays(2026-11-02 Mon, 3) = 2026-11-05 Thu`; `addBusinessDays(2026-11-06 Fri, 3) = 2026-11-11 Wed`;
`addBusinessDays(2026-11-07 Sat, 3) = 2026-11-11 Wed`; `addBusinessDays(2026-11-04 Wed, 8) = 2026-11-16 Mon`.

A missing date propagates: if a due time is built from `S.startDate` and `S.startDate = ⊥`, the due time is `null`.

### 6.2 Decisions, proposals and commit order

For subject S, with `D` ranging over `S.decisions`:

1. **Complete:** the world has all three facts `(D, target)`, `(D, verdict)` and `(D, author)`. Incomplete records are read (they
   are in the read sets) but never count as a decision or a proposal.
2. **Position:** `pos(D)` is the greatest `tx` among the four facts `(S, decisions, D)`, `(D, target)`, `(D, verdict)`, `(D, author)`.
   It is the commit order the store reports for that record.
3. **Counting decision:** complete and `author` is `person` or `system`.
4. **Proposal:** complete and `author` is `agent`. A proposal never satisfies a requirement, whatever its verdict.
5. **`final(T, m)`:** among counting decisions with `target = T` and `pos(D) >= m`, the one with the greatest `pos`; among equal
   `pos`, the one with the greatest entity id (byte order). `none` if there is no such decision. So conflicting reviewer decisions
   resolve by commit order: the later commit wins.
6. **`countingFacts(T)`:** for every counting decision with `target = T`, its four facts from item 2.
7. **`proposalFacts(T)`:** for every proposal with `target = T`, its four facts from item 2.

### 6.3 Read sets and inputs

**A read set is static.** Each rule lists the `(entity, attribute)` pairs it reads, written with these placeholders:

- `S.x` is the pair `(S, x)`.
- `D.x` is `(D, x)` for every value D of the subject's `decisions` facts.
- `d.x` is `(d, x)` for every value d of the subject's `documents` facts.
- `L.x` is `(L, x)` where L is the value of `S.location`; it yields no pair when `S.location = ⊥`.

The pairs are instantiated from the reference values even when the referenced entity has no facts in the world, and whether or
not the value is present, because a later write to that pair can change the output. Every pair is listed regardless of the order
in which a rule tests its conditions, so short-circuit evaluation never changes a read set.

**Inputs are positions.** Each trace entry has `inputs`: the distinct `tx` values of its input facts, ascending. Each rule states
its input facts. Input facts are always a subset of the facts whose pair is in the read set.

## 7. The eleven rules

**How to read a table.** Rows are tested top to bottom and the first matching row applies. Every keyed rule (`DOCEXP`, `PROP`)
applies its table once per item. `v` is `basis.validTime`. Task ids, obligation ids and work item ids are built in section 8;
a table names only the kind and, for keyed rules, the key. Every row number is reported in the trace.

### 7.1 `LIFE`: start-date lifecycle

- **Read set:** `S.startDate`. **Input facts:** that fact.

| Row | Condition | Outputs |
| --- | --- | --- |
| 1 | `S.startDate = ⊥` | flag `start-unknown` |
| 2 | `v < startOf(S.startDate)` | flag `pre-start`; obligation `start` at `startOf(S.startDate)` |
| 3 | otherwise | none |

### 7.2 `I9S1`: I-9 Section 1

- **Read set:** `S.startDate`, `S.section1AttestedAt`, `S.ssn`. **Input facts:** those three facts when present.
- **Due:** `endOfDay(S.startDate)`, or `null` when the start date is absent. Section 1 is due by the end of the first day of work.

| Row | Condition | Outputs |
| --- | --- | --- |
| 1 | `S.section1AttestedAt ≠ ⊥` and `S.ssn ≠ ⊥` (an erased marker counts as present) | none |
| 2 | otherwise | task `i9.section1`, due as above |

### 7.3 `I9S2`: I-9 Section 2

- **Read set:** `S.startDate`, `S.decisions`, `D.target`, `D.verdict`, `D.author`.
- **Input facts:** the `S.startDate` fact and `countingFacts("i9.section2")`.
- **Due:** `endOfDay(addBusinessDays(S.startDate, businessDays))`, or `null`. With R1's 3, a Monday start is due by the end of
  Thursday. With R2's 2, by the end of Wednesday.
- `f = final("i9.section2", 0)`.

| Row | Condition | Outputs |
| --- | --- | --- |
| 1 | `f.verdict = approve` | none |
| 2 | `f.verdict = waive` | flag `i9-section2-waived` |
| 3 | `f.verdict = reject` | task `i9.section2`, due as above |
| 4 | `f = none` | task `i9.section2`, due as above |

### 7.4 `EVSUB`: E-Verify case submission

- **Read set:** `S.startDate`, `S.ssn`, `S.everifyStatus`. **Input facts:** those three facts when present.
- **Due:** `endOfDay(addBusinessDays(S.startDate, businessDays))`, or `null`. The case must exist by the third business day.

| Row | Condition | Outputs |
| --- | --- | --- |
| 1 | `S.everifyStatus ≠ ⊥` | none (a case exists) |
| 2 | `S.ssn = ⊥` | task `everify.collect-ssn`, due as above |
| 3 | `S.ssn` is an erased marker | task `everify.ssn-erased`, due as above |
| 4 | `S.ssn` is not exactly 9 characters each in `0` to `9` | task `everify.fix-ssn`, due as above |
| 5 | otherwise | work item `everify.submit-case` |

### 7.5 `EVSTAT`: E-Verify case status

- **Read set:** `S.everifyStatus`, `S.everifyStatusAt`. **Input facts:** those two facts when present.

| Row | Condition | Outputs |
| --- | --- | --- |
| 1 | `S.everifyStatus = ⊥` or `pending` | none |
| 2 | `tnc` | task `everify.tnc`, due `endOfDay(addBusinessDays(dateOf(S.everifyStatusAt), tncBusinessDays))` or `null` when `S.everifyStatusAt = ⊥`; work item `notify.everify-tnc` |
| 3 | `authorized` | flag `everify-authorized` |
| 4 | `fnc` | task `everify.fnc`, due `null`; work item `notify.everify-fnc` |

Each status reached produces its own work item id, because the id includes the positions of the status facts (section 8.4).

### 7.6 `BGC`: background check

- **Read set:** `S.bgcStatus`, `S.decisions`, `D.target`, `D.verdict`, `D.author`.
- **Input facts:** the `S.bgcStatus` fact and `countingFacts("bgc.adjudication")`.
- `f = final("bgc.adjudication", 0)`.

| Row | Condition | Outputs |
| --- | --- | --- |
| 1 | `S.bgcStatus = ⊥` | work item `bgc.order` |
| 2 | `pending` or `clear` | none |
| 3 | `consider` and `f.verdict` is `approve` or `waive` | none |
| 4 | `consider` and `f.verdict = reject` | task `bgc.adverse-action`, due `null`; work item `notify.pre-adverse-action` |
| 5 | `consider` and `f = none` | task `bgc.adjudicate`, due `null` |

### 7.7 `DOCEXP`: document expiry and reverification (keyed by document)

- **Read set:** `S.documents`, `d.docType`, `d.expiresOn`, `d.reverified`.
- **Items:** one per value d of `S.documents`, keyed by d. **Input facts of item d:** the fact `(S, documents, d)` and d's
  `docType`, `expiresOn` and `reverified` facts when present.
- **No documents:** one trace entry with key `""`, row 0 and inputs `[]`.
- For a tracked type, `lead = leadDays[docType]`, the expiry boundary `B = endOfDay(d.expiresOn)` (the document is valid through
  its expiry date) and the window start `W = startOf(addDays(d.expiresOn, 1 - lead))`. With `lead = 0`, `W = B`.

| Row | Condition | Outputs |
| --- | --- | --- |
| 1 | `d.docType = ⊥` or `d.docType` is not a key of `leadDays` | none |
| 2 | `d.reverified = true` | none |
| 3 | `d.expiresOn = ⊥` | task `doc.expiry-missing` key d, due `null` |
| 4 | `v < W` | obligation `doc.window` key d at `W` |
| 5 | `v < B` | task `doc.reverify` key d, due `B` |
| 6 | otherwise | task `doc.reverify` key d, due `B`; work item `notify.document-expired` key d |

At `B` the open task turns overdue and the work item appears; this is the midnight expiry wave of GS.20.

### 7.8 `MINWAGE`: pay rate at or above the location's minimum wage

- **Read set:** `S.startDate`, `S.payRateCents`, `S.location`, and `L.a` for each `a` in `floorAttributes`.
- **Input facts:** every fact whose pair is in the read set.
- **Floor:** the greatest value among the present `L.a` facts for `a` in `floorAttributes`. R1 reads only `stateMinWageCents`.
  R2 also reads `localMinWageCents`, so a city ordinance above the state floor applies.
- **Due:** every task of this rule is due at `startOf(S.startDate)`, or `null`. Pay must be fixed before the first shift.

| Row | Condition | Outputs |
| --- | --- | --- |
| 1 | `S.payRateCents = ⊥` | task `pay.rate-missing` |
| 2 | `S.location = ⊥` | task `pay.location-missing` |
| 3 | no `L.a` fact is present for any `a` in `floorAttributes` | task `pay.floor-unknown` |
| 4 | `S.payRateCents >= floor` | none |
| 5 | otherwise | task `pay.below-minimum`; work item `notify.pay-below-minimum` |

### 7.9 `OT`: overtime

- **Read set:** `S.weeklyMinutes`. **Input facts:** that fact.

| Row | Condition | Outputs |
| --- | --- | --- |
| 1 | `S.weeklyMinutes = ⊥` | none |
| 2 | `S.weeklyMinutes > thresholdMinutes` (R1 and R2: more than 2,400 minutes, which is 40 hours) | flag `overtime` |
| 3 | otherwise | none |

### 7.10 `PAYCHG`: a pay change over $5 an hour needs approval

- **Read set:** `S.payRateCents`, `S.baselinePayRateCents`, `S.decisions`, `D.target`, `D.verdict`, `D.author`.
- **Input facts:** the `S.payRateCents` and `S.baselinePayRateCents` facts when present, and `countingFacts("pay.change")`.
- **Fresh approval only:** `f = final("pay.change", tx(S.payRateCents))`. A decision committed before the current pay rate was
  asserted does not approve it. A decision in the same transaction does.

| Row | Condition | Outputs |
| --- | --- | --- |
| 1 | `S.payRateCents = ⊥` or `S.baselinePayRateCents = ⊥` | none |
| 2 | `abs(S.payRateCents - S.baselinePayRateCents) <= thresholdCents` | none |
| 3 | `f.verdict` is `approve` or `waive` | none |
| 4 | `f.verdict = reject` | task `pay.change-rejected`, due `null` |
| 5 | `f = none` | task `pay.change-approval`, due `null`; work item `notify.pay-change-approval` |

Arithmetic stays exact in IEEE doubles, BigInt or Python integers alike: both operands are in 0 to 2^53 - 1, so the difference is
in -(2^53 - 1) to 2^53 - 1.

### 7.11 `PROP`: agent proposals wait for a human decision (keyed by target)

- **Read set:** `S.decisions`, `D.target`, `D.verdict`, `D.author`.
- **Items:** one per target T for which at least one proposal exists, keyed by T. **Input facts of item T:**
  `proposalFacts(T)` and `countingFacts(T)`.
- **No proposals:** one trace entry with key `""`, row 0, and as inputs every fact whose pair is in the read set.
- `p = ` the greatest `pos` among proposals with `target = T`.

| Row | Condition | Outputs |
| --- | --- | --- |
| 1 | a counting decision with `target = T` and `pos >= p` exists | none (a human decided at or after the latest proposal) |
| 2 | otherwise | task `review.proposal` key T, due `null` |

Proposal isolation follows: proposals change no output of any rule except `PROP` (invariant 13.3).

## 8. Output assembly

### 8.1 The output object

```
{
  "basis":        {"tx": <basis.tx>, "validTime": <basis.validTime>},
  "dependencies": [[<entity>, <attribute>], ...],
  "flags":        [{"name": ..., "rule": ...}, ...],
  "obligations":  [{"boundary": <instant>, "id": ..., "kind": ..., "rule": ...}, ...],
  "release":      <release hash>,
  "subject":      <world.subject>,
  "tasks":        [{"dueAt": <instant or null>, "id": ..., "kind": ..., "overdue": <boolean>, "rule": ...}, ...],
  "trace":        [{"inputs": [<integer>, ...], "key": <string>, "row": <integer>, "rule": ...}, ...],
  "workItems":    [{"id": ..., "inputs": [<integer>, ...], "key": <string>, "kind": ..., "rule": ...}, ...]
}
```

Every array has a defined order (8.7). Every output is written as canonical JSON (section 9).

### 8.2 Tasks

- **Id:** `S + "#" + kind` for unkeyed rules; `S + "#" + kind + "#" + key` for `DOCEXP` and `PROP`. Example:
  `pl:a#doc.reverify#pl:a/doc:1`. A task id does not contain the release, so one task keeps its id across releases.
- **`overdue`:** `true` when `dueAt` is not `null` and `v >= dueAt`; otherwise `false`.

### 8.3 Obligations

**An obligation is a future valid-time instant at which this subject's output changes with no new write** (the boundary timers
of R18 section 3.4 item 3). Three kinds exist:

| Kind | Made by | Id | Boundary |
| --- | --- | --- | --- |
| `start` | `LIFE` row 2 | `S + "#start"` | `startOf(S.startDate)` |
| `doc.window` | `DOCEXP` row 4 | `S + "#doc.window#" + d` | `W` |
| `due` | every task with `dueAt ≠ null` and `v < dueAt` | `<task id> + "@due"` | the task's `dueAt` |

A `due` obligation carries the task's rule. Every boundary is strictly greater than `v`.

### 8.4 Work items

- **Fields:** `kind` and `key` from the table (`key` is `""` for unkeyed rules, d for `DOCEXP`), `rule`, and `inputs` equal to the
  `inputs` of the trace entry with the same rule and key.
- **Id:** `"wi:" + lowercase hex of SHA-256 over the UTF-8 bytes of canonicalJson(preimage)`, where the preimage is the object
  `{"inputs": ..., "key": ..., "kind": ..., "release": <release hash>, "rule": ..., "subject": S}` with exactly those six keys.
- **Consequences:** evaluating the same inputs under the same release gives the same id, so the outbox deduplicates repeat
  evaluations (GS.19b). A new input position or a new release gives a new id.

### 8.5 Flags

`{"name", "rule"}`. Names: `start-unknown` and `pre-start` (`LIFE`), `i9-section2-waived` (`I9S2`), `everify-authorized`
(`EVSTAT`), `overtime` (`OT`). Each name comes from one rule only.

### 8.6 Trace

One entry per rule evaluation: unkeyed rules give exactly one entry with key `""`; keyed rules give one entry per item, or the
single row-0 entry when there are no items. `row` is the matching row number. `inputs` follows the rule's input facts.

### 8.7 Order of every array

| Array | Order |
| --- | --- |
| `dependencies` | the union of every rule's instantiated read set, distinct, ascending by entity id then attribute |
| `flags` | ascending by `name` |
| `tasks`, `obligations`, `workItems` | ascending by `id` |
| `trace` | by the rule's position in the release, then ascending by `key` |
| `inputs` | ascending integers, distinct |

"Ascending" for strings is byte order of their ASCII bytes (equal here to Unicode code point order and to JavaScript's default
string comparison, because every W0 string is printable ASCII).

## 9. Canonical JSON

**Every output, every release hash and every work item id uses this one serialization.** Two implementations comply when their
bytes are equal.

1. UTF-8, no byte order mark, no whitespace outside strings, no trailing newline.
2. Objects: members sorted ascending by key in byte order, written `{"k":v,"k2":v2}`.
3. Arrays: elements in the order section 8.7 gives, written `[a,b]`.
4. Strings: `"` + content + `"`, with `"` written `\"` and `\` written `\\`. W0 strings are printable ASCII, so no other escape occurs.
5. Integers: decimal digits, `-` only for negatives (none occur in W0 outputs), no leading zeros, no `+`, no fraction, no exponent.
6. Literals: `true`, `false`, `null`.

Python produces it with `json.dumps(x, sort_keys=True, separators=(",", ":"), ensure_ascii=True)`. JavaScript produces it with
`JSON.stringify` over a copy whose object keys were inserted in sorted order, recursively.

## 10. Affected subjects (P3, GS.06b)

`affected(release, worlds, writes)` returns, ascending, every subject s among `worlds` whose `dependencies` under `release`
(computed from its own world as in 8.7) contain at least one pair of `writes`.

1. **This is the expected affected-subject set** of `lab/TARGETS.md` 1.1 P3 item 3 for one transaction, with `worlds` at the basis
   before the transaction and `writes` the `(entity, attribute)` pairs the transaction asserts or retracts.
2. **Before-only is enough.** Every reference attribute (`location`, `documents`, `decisions`) is in the read set of some rule in
   both releases. A transaction that changes which entity a subject references therefore writes a pair already in that subject's
   dependencies, so the dependencies before the transaction catch every subject the after-state would add.
3. **Direct writes are included.** Every placement, document and decision attribute is in some read set in both releases, so a
   write to a subject's own facts always affects it.
4. **The release matters.** Under R1 a write to `localMinWageCents` affects no one; under R2 it affects every placement at that
   location (cases C35 and C36).
5. **No valid-time filtering.** A correction to a past valid-time range still marks the subject; whether its current output changed
   is left to the re-run.

## 11. Golden cases

### 11.1 File format

```
{
  "id": "C01", "slug": "...", "title": "...", "op": "evaluate" | "reconcile" | "affected",
  "checks": [{"rule": <rule id>, "polarity": "positive" | "negative"}, ...],
  "identicalTo": <case id>      (optional: the expected bytes equal that case's),
  "notes": [<derivation step>, ...],
  "input": {...},
  "expected": {...}
}
```

**A conforming implementation** runs `op` on `input` and produces bytes equal to `canonicalJson(expected)`. `notes` are the hand
derivation. A positive check means the rule emits at least one task, obligation, work item or flag in that case; a negative check
means it emits none. The expected outputs were derived by hand from this file, not by a program.

### 11.2 The 42 cases

| Id | Op, release | What it pins down |
| --- | --- | --- |
| C01 | evaluate R1 | a complete placement: every rule quiet, pay exactly at the floor, 2,400 minutes is not overtime |
| C02 | evaluate R2 | C01 under R2: same outputs, new hash, `localMinWageCents` joins the dependencies, absent local floor falls back to state |
| C03 | evaluate R1 | a new hire before the start date: pre-start flag, start obligation, Section 1, Section 2 and E-Verify tasks with due obligations, a background-check order |
| C04 | evaluate R1 | C03 after the start date moved a week: every due time and boundary moves, the order's work item id stays |
| C05 | evaluate R1 | no start date, no pay rate: `start-unknown`, null due times, no obligations |
| C06 | evaluate R1 | the basis exactly at the Section 1 due instant: overdue, and its due obligation is gone |
| C07 | evaluate R1 | erased SSN: Section 1 still complete, E-Verify submission blocked with `everify.ssn-erased` |
| C08 | evaluate R1 | SSN entered with dashes: `everify.fix-ssn` |
| C09 | evaluate R1 | valid SSN, no case yet: work item `everify.submit-case` |
| C10 | evaluate R1 | E-Verify `tnc`: due after 8 business days across a weekend, notify work item |
| C11 | evaluate R1 | E-Verify `authorized` and 2,401 minutes: two flags |
| C12 | evaluate R1 | E-Verify `fnc` and background check `consider` with no decision |
| C13 | evaluate R1 | background check `consider`, a person rejects: adverse action |
| C14 | evaluate R1 | proposal only: an agent approves the background check, which stays open, and `review.proposal` opens |
| C15 | evaluate R1 | the same proposal followed by a person's approval: both rules quiet |
| C16 | evaluate R1 | an agent-authored record with verdict `approve` on Section 2: not a decision |
| C17 | evaluate R1 | approve at tx 6 then reject at tx 8: the later commit wins |
| C18 | evaluate R1 | approve and waive in one transaction: greatest decision id wins |
| C19 | evaluate R1 | an `ead` and a `visa` expiring 2027-01-15: two window obligations at 2027-01-16 midnight |
| C20 | evaluate R2 | C19 under R2 (preview): the `ead` reverification task opens 90 days early, the `visa` is unchanged |
| C21 | evaluate R1 | the basis exactly at the `ead` expiry boundary: overdue task and expiry work item |
| C22 | evaluate R1 | untracked passport, reverified visa, `ead` with no expiry date |
| C23 | evaluate R1 | the location's state floor rises one cent above the pay rate |
| C24 | evaluate R1 | the location has no facts at all: `pay.floor-unknown`, and its pair is still a dependency |
| C25 | evaluate R2 | a local floor above the state floor applies under R2 |
| C26 | evaluate R2 | C03 under R2: Section 2 due one business day earlier, E-Verify unchanged |
| C27 | evaluate R1 | numeric maxima: 10,080 minutes, pay 2^53 - 1 cents against a baseline of 0 |
| C28 | evaluate R1 | pay change of +501 cents with an approval committed before the change: approval needed |
| C29 | evaluate R1 | pay change of exactly 500 cents: no approval needed |
| C30 | evaluate R1 | pay change of -501 cents approved in the same transaction: approved |
| C31 | reconcile | C19's world after R2 is activated: bytes identical to C20 |
| C32 | reconcile | a basis before R2's activation time: R1 applies |
| C33 | reconcile | no activation in force: `W0.E_NO_RELEASE` |
| C34 | affected R1 | a state minimum-wage change at `loc:nyc`: both placements there, no others |
| C35 | affected R1 | a local minimum-wage change at `loc:nyc` under R1: nobody |
| C36 | affected R2 | the same write under R2: both placements at `loc:nyc` |
| C37 | evaluate R1 | `weeklyMinutes` 10081: `W0.E_VALUE` |
| C38 | evaluate R1 | `payRateCents` written as `1650.0`: `W0.E_VALUE` |
| C39 | evaluate R1 | `payRateCents` 9007199254740992 (2^53): `W0.E_VALUE` |
| C40 | evaluate R1 | two `startDate` facts: `W0.E_CARDINALITY` |
| C41 | evaluate R1 | a fact committed after the basis: `W0.E_BASIS` |
| C42 | evaluate R1 | one evaluation with five work items (E-Verify submission, background-check order, expired document, pay below the floor, pay change needing approval) |

### 11.3 Scenario map

| Golden scenario | Where W0 covers it |
| --- | --- |
| GS.02 form submit, next task visible | `I9S1` and `I9S2` tasks (C03, C01) |
| GS.03 E-Verify webhook storm | `EVSTAT`; the store supersedes stale revisions before W0 sees them |
| GS.05 background-check burst | `BGC` (C12, C13) |
| GS.06b shared location wage change | `MINWAGE` and `affected` (C23, C34 to C36) |
| GS.07 two reviewers, one I-9 | `final` in 6.2 (C17, C18) |
| GS.09 start dates move | `LIFE` and every start-based due time (C03, C04) |
| GS.10 and GS.11 activation and preview | `reconcile` against `evaluate` (C20, C31, C32) |
| GS.16 PII erasure | erased markers (C07) |
| GS.17 agent proposals churn | `PROP` and proposal isolation (C14 to C16) |
| GS.18 overdue I-9 dashboards | task `overdue` (C06) |
| GS.20 midnight expiry wave | `DOCEXP` boundaries (C19 to C21) |

## 12. Workload coverage: the seeded sweep population and its frozen floors

**A sweep of mostly no-op evaluations must not pass P5** (`lab/TARGETS.md` 6.1 item 6, RULINGS Q31i). W0 therefore fixes the
population the P5 sweep and the release scenarios run on, and states four floors that population must meet. The floors and the
generator parameters below are frozen with the rest of W0 and are reviewed independently (V-D01) before W0's hashes are pinned.

### 12.1 Terms

1. **In-scope subjects** are every placement of the generated population. R1 and R2 have no scope rule.
2. **A rule fires for a subject** (under one release, at one basis) when it emits at least one task, obligation (including the
   `due` obligations of its own tasks), work item or flag.
3. **The domain projection of an output** is its `tasks`, `obligations` and `flags` arrays plus the set of `(rule, kind, key)` of its
   work items. It leaves out `release`, work item ids and `inputs`, `trace` and `dependencies`, because those change with the
   release by construction.
4. **R2 changes subject s** when the domain projections of `evaluate(world_s, R1, B)` and `evaluate(world_s, R2, B)` differ, at the
   same basis B.

### 12.2 The four floors and the expected values at the 100k rung

| # | Floor (provisional bar from TARGETS 6.1 item 6) | Expected value under this generator | Argument |
| --- | --- | --- | --- |
| 1 | R2 changes at least 20% of in-scope subjects | 61.7% | 12.4 item 1 |
| 2 | every rule fires for at least 5% of subjects, under R1 and under R2 | lowest is `MINWAGE` under R1 at 7.9% | 12.4 item 2 |
| 3 | work-location fanout is a seeded Zipf with s = 1.0 over 2,000 locations | the largest location holds about 12,100 placements | 12.3 and 12.5 |
| 4 | at least 1% of evaluations produce three or more work items | 2.0% under R1, 3.0% under R2 | 12.4 item 3 |

The expected values are means over the seeded draws. At N = 100,000 the standard error of each share is under 0.2 percentage points,
far inside every margin. **The check that counts is the measured one** (12.6): the floors are judged on the actual population.

### 12.3 The population generator (parameters only)

**Sizes.** The 100k rung is the frozen reference: N = 100,000 placements and 2,000 locations. Other rungs keep N / 50 locations
(200 at 10k, 20,000 at 1m, 200,000 at 10m) and every other parameter.

**Seed and draws.** The seed is the string `W0-pop-1`. For a field name f, a subject index i and a modulus M,
`draw(f, i, M)` is the first 8 bytes of SHA-256 over the ASCII bytes of `W0-pop-1/` + f + `/` + decimal(i), read as a big-endian
unsigned integer, modulo M. Every random choice below uses its own field name, so all choices are independent.

- **Weighted choice** over weights in basis points (summing to 10,000): `x = draw(f, i, 10000)`; pick the first option whose running
  total of weights exceeds x.
- **Uniform integer** in `[a, b]`: `a + draw(f, i, b - a + 1)`.
- **Zipf rank** over 2,000 locations: weights `w_r = floor(10^12 / r)` for r = 1 to 2,000, total T; `x = draw("loc.rank", i, T)`;
  the rank is the first r whose running total of weights exceeds x. Integer arithmetic only.

**Ids.** Placement i (0-based) is `pl:s` + i as 8 decimal digits (`pl:s00000000`). Location rank r is `loc:l` + r as 4 decimal digits
(`loc:l0001` is the largest). The only document of a placement is `<S>/doc:1`. Decision records are `<S>/dec:i1` and `<S>/dec:i2`
(Section 2), `<S>/dec:b1` (background check) and `<S>/dec:p1` (pay change).

**Locations.** Location rank r has `stateMinWageCents` 1200, 1500, 1650 or 1800 when r mod 4 is 0, 1, 2 or 3. It has
`localMinWageCents` 1850 exactly when r mod 4 = 2. That subset of ranks holds 25.0% of the Zipf mass (computed in 12.5).

**Basis.** `validTime = 2026-11-04T12:00:00.000000Z` (the basis date is 2026-11-04, a Wednesday); `tx` is the position of the last
population command.

**Per-placement choices.**

| Field | Options (weights in basis points) | Facts written |
| --- | --- | --- |
| `start` | absent 200; pre-start 1800 (k uniform 1 to 14, field `start.k`); in the Section 2 window 2000 (k uniform -4 to 0); settled 6000 (k uniform -365 to -5) | `startDate = addDays(2026-11-04, k)` |
| `s1` | present 8500; absent 1500 | `section1AttestedAt = 2026-11-01T15:00:00.000000Z` |
| `ssn` | absent 1000; valid 8730; dashed 180; erased 90 | valid: the 9 digits of 100000000 + i; dashed: the same digits as `DDD-DD-DDDD`; erased: `{"erasedAt": "2026-11-01T00:00:00.000000Z"}` |
| `ev` | absent 3000; `pending` 4000; `tnc` 500; `authorized` 2200; `fnc` 300 | `everifyStatus`; with it `everifyStatusAt = startOf(addDays(2026-11-04, -u))`, u uniform 0 to 20 (field `ev.u`) |
| `bgc` | absent 2000; `pending` 2000; `clear` 5000; `consider` 1000 | `bgcStatus` |
| `bgcdec`, only when `consider` | none 4000; person approve 4000; person reject 1000; agent proposal (verdict approve) 1000 | record `dec:b1` |
| `i9dec` | none 3400; person approve 4800; person waive 300; person reject 400; agent proposal only (verdict approve) 600; person approve then person reject 300; person approve then agent proposal (verdict reject) 200 | records `dec:i1`, then `dec:i2` for the two-record options |
| `loc` | absent 100; present 9900 (rank from `loc.rank`) | `location` |
| `pay` | absent 100; present 9900, with d chosen by `pay.d`: -1 600; 0 1000; uniform 1 to 199 2400; uniform 200 to 2000 6000 | `payRateCents = stateMinWageCents(L) + d`, using 1650 when the location is absent |
| `chg`, only when pay is present | c = 0 8000; uniform 1 to 500 600; uniform 501 to 1000 1000; uniform -1000 to -501 400 | `baselinePayRateCents = payRateCents - c` |
| `chgdec`, only when abs(c) > 500 | none 5500; person approve after the change 3000; person approve before the change 500; person reject after the change 500; agent proposal (verdict approve) after the change 500 | record `dec:p1` |
| `wm` | absent 500; uniform 600 to 2400 7800; uniform 2401 to 3600 1700 | `weeklyMinutes` |
| `doc` | none 500; `passport` 5000; `ead` 3000; `visa` 1500 | `documents = <S>/doc:1` and its `docType` |
| `doc.exp`, `ead` and `visa` only | missing 200; expired 1470 (e uniform -30 to -1); inside 90 days 2450 (e uniform 0 to 89); later 5880 (e uniform 90 to 730) | `expiresOn = addDays(2026-11-04, e)`; a passport gets e uniform 365 to 3650 |
| `doc.rev`, `ead` and `visa` only | true 1000; absent 9000 | `reverified = true` |

**Command plan.** Each command is one transaction. The background trace interleaves placements; within one placement the commands
keep this order, which fixes every commit-order relation the rules use:

1. Every location's facts, before any placement command.
2. Hire: `startDate`, `location`, `baselinePayRateCents`, `payRateCents` equal to the baseline, `weeklyMinutes` (those present).
3. Section 1: `section1AttestedAt`, `ssn`.
4. Background check: `bgcStatus`. Then E-Verify: `everifyStatus`, `everifyStatusAt`. Then documents: `documents` and the document's facts.
5. Each decision record in its own command, asserting the subject's `decisions` fact and the record's three facts together:
   the Section 2 records in option order, then `dec:b1`, then a pay-change record drawn "before the change".
6. When c ≠ 0, the pay change: `payRateCents` re-asserted at its final value.
7. A pay-change record drawn "after the change".

### 12.4 Expected rule frequencies (the argument for floors 1, 2 and 4)

All choices are independent, so each frequency is a product of the weights above. "Located with pay" is 0.99 x 0.99 = 0.9801.

| Rule | Fires when | R1 | R2 |
| --- | --- | --- | --- |
| `LIFE` | start absent (2%) or pre-start (18%) | 20.0% | 20.0% |
| `I9S1` | not (Section 1 present 85% and SSN present 90%) | 23.5% | 23.5% |
| `I9S2` | Section 2 options none, waive, reject, proposal only, approve then reject: 34 + 3 + 4 + 6 + 3 | 50.0% | 50.0% |
| `EVSUB` | E-Verify status absent | 30.0% | 30.0% |
| `EVSTAT` | `tnc`, `authorized` or `fnc`: 5 + 22 + 3 | 30.0% | 30.0% |
| `BGC` | absent (20%), or `consider` (10%) with none, reject or proposal only (60%) | 26.0% | 26.0% |
| `DOCEXP` | a tracked document (`ead` or `visa`, 45%) not reverified (90%) | 40.5% | 40.5% |
| `MINWAGE` | pay absent (1%), location absent (0.99%), d = -1 (0.9801 x 6%); under R2 also a local-floor location (25.0%) with d from 0 to 199 (34%) | 7.9% | 16.2% |
| `OT` | weekly minutes 2,401 to 3,600 | 17.0% | 17.0% |
| `PAYCHG` | pay present (99%), abs(c) > 500 (14%), and no fresh approve (70%: none, stale approve, reject, proposal) | 9.7% | 9.7% |
| `PROP` | a pending proposal: Section 2 (6% + 2%), background check (10% x 10%), pay change (0.99 x 14% x 5%) | 9.6% | 9.6% |

1. **Floor 1, R2 changes at least 20%.** Three independent sources change the domain projection:
   - `I9S2`: every placement with a start date (98%) and an open Section 2 task (none, reject, proposal only, approve then reject:
     47%) gets a due time one business day earlier, since `addBusinessDays(d, 2) ≠ addBusinessDays(d, 3)` for every d. Share 46.1%.
   - `DOCEXP`: every `ead` (30%) not reverified (90%) with an expiry date that has not passed (83.3%) moves its window obligation from
     `B` to `B` minus 90 days, or opens its reverification task early. Share 22.5%. An expired `ead` gives row 6 under both releases.
   - `MINWAGE`: a located placement with pay (0.9801) at a local-floor location (25.0%) with d from 0 to 199 (34%) falls below the
     local floor. Share 8.3%.
   - Union: 1 - (1 - 0.461) x (1 - 0.225) x (1 - 0.083) = **61.7%**.
2. **Floor 2, every rule fires for at least 5%.** The table above: the lowest is `MINWAGE` under R1 at 7.9%.
3. **Floor 4, three or more work items in at least 1% of evaluations.** Five independent work item sources exist, at most one each:
   - E-Verify, `EVSUB` row 5 or `EVSTAT` rows 2 and 4: 30% x 87.3% + 8% = 34.2%.
   - Background check, `BGC` rows 1 and 4: 20% + 10% x 10% = 21.0%.
   - Pay below the floor, `MINWAGE` row 5: 5.9% under R1, 14.2% under R2.
   - Pay change approval, `PAYCHG` row 5: 0.99 x 14% x 65% = 9.0%.
   - Expired document, `DOCEXP` row 6: 45% x 90% x 14.7% = 6.0%.
   - P(at least three of five) = S3 - 3 S4 + 6 S5, where Sk is the sum of the products of every k of the five probabilities:
     **2.0% under R1** (S3 = 0.0231, S4 = 0.0012) and **3.0% under R2**. Up to five work items occur in one evaluation (case C42).

### 12.5 Location fanout and the GS.06b affected-subject count

With s = 1.0 over 2,000 locations, a placement lands at rank r with probability `(1 / r) / H`, where H = H(2000) = 8.1784. Located
placements number 99,000 in expectation, so location r holds about 12,105 / r of them.

| Location rank | Expected placements | Affected by one `stateMinWageCents` write, R1 and R2 | Affected by one `localMinWageCents` write |
| --- | --- | --- | --- |
| 1 (`loc:l0001`) | 12,105 (12.1% of the population) | 12,105 | none under R1; 12,105 under R2 |
| 2 | 6,053 | 6,053 | none under R1; 6,053 under R2 |
| 10 | 1,211 | 1,211 | none under R1; 1,211 under R2 |
| 100 | 121 | 121 | none under R1; 121 under R2 |
| 1,000 | 12 | 12 | none under R1; 12 under R2 |
| 2,000 | 6 | 6 | none under R1; 6 under R2 |
| mean over the 2,000 locations | 49.5 | 49.5 | none under R1; 49.5 under R2 |

1. **The affected set is exactly the placements at that location** (section 10): every placement at L has `(L, stateMinWageCents)` in
   its dependencies under both releases and `(L, localMinWageCents)` under R2 only; no other placement has either pair. Cases C34 to
   C36 pin this down on four placements.
2. **The local-floor ranks hold 25.0% of the mass:** the ranks with r mod 4 = 2 contribute
   `(1/2) x (H(1000) - H(500) / 2) = 2.0445` of H = 8.1784.

### 12.6 How the floors are checked

1. **Measured, not assumed.** Whoever generates the population (the P5 driver, O-DOMAIN, or V-D01 independently) evaluates every
   placement under R1 and R2 at B and reports the four measured values with the generator's seed and parameter hash. A measured
   value below its bar fails closed and blocks the domain-dependent comparison it gates.
2. **Golden-case witnesses** for each mechanism:
   - floor 1: C03 against C26 (`I9S2`), C19 against C20 (`DOCEXP`), C25 (`MINWAGE` under R2, with C01 and C02 as the quiet controls);
   - floor 2: every rule's positive cases in section 11.2 (the `checks` field of each case lists them; `validate.py` requires one
     positive and one negative per rule);
   - floor 3: C34 to C36 for the affected set at one location;
   - floor 4: C42, one evaluation with five work items.

## 13. Invariants

Implementations and test harnesses can check these on any input, not only the golden cases.

1. **Determinism.** The output is a function of the input bytes; shuffling `facts` changes nothing unless the input is invalid.
2. **Boundary completeness.** With the facts fixed and `v < v2`, the outputs at `v` and at `v2` differ (ignoring the `basis` echo)
   only if some obligation at `v` has `v < boundary <= v2`. Each obligation's boundary does change the output (a task turns
   overdue, a flag ends, a task opens).
3. **Proposal isolation.** Removing every proposal record (and its `decisions` fact) from a world changes only the `PROP` trace
   entries and tasks and the `dependencies` list.
4. **Erasure.** Replacing the SSN with an erased marker changes only `EVSUB` (row 5 or 4 becomes row 3); `I9S1` treats the marker
   as present. No output ever contains a PII value.
5. **Release isolation.** Evaluating under R1 and under R2 can differ only in `release`, work item ids, `dependencies` and the
   outputs and trace entries of `I9S2`, `DOCEXP` and `MINWAGE`.

## 14. Self-review: where two implementers could still differ, and the resolution chosen

| # | Place | Risk | Resolution |
| --- | --- | --- | --- |
| 1 | `1650.0` in a JSON world | `JSON.parse` returns 1650 and hides the float | Integer tokens are checked at the token level (section 2); the TypeScript kernel's fixture reader must see number tokens (for example the `JSON.parse` reviver's `context.source` where the runtime has it, or a small scanner). Case C38. |
| 2 | Integers above 2^53 - 1 | JavaScript rounds them on parse | Any such token is `W0.E_VALUE`; in JavaScript it parses to at least 2^53, so `Number.isSafeInteger` detects it. Case C39. |
| 3 | Instant comparison | converting to `Date` drops microseconds; time zones | Instants compare as strings and are never converted (section 2). |
| 4 | Weekday and date arithmetic | local-time `Date` methods shift the day | Proleptic Gregorian arithmetic on dates only; JavaScript must use `Date.UTC` and `getUTCDay`. |
| 5 | Business-day counting | counting the start day, or a weekend start | The start day is never counted; a Saturday start counts from Monday (6.1 examples). |
| 6 | "Due by end of day" | 23:59:59.999999 against next midnight | `endOfDay(d)` is the next midnight and `overdue` is `v >= dueAt` (C06). |
| 7 | Overdue and obligation at equality | `>` against `>=` | Overdue at `v >= dueAt`; an obligation needs `boundary > v`. |
| 8 | Ties between decisions in one transaction | arbitrary pick | Greatest entity id in byte order (C18). |
| 9 | A decision's commit position | which of its facts counts | `pos` is the greatest `tx` of its four facts, including the subject's `decisions` fact. |
| 10 | Incomplete decision records | count, crash or skip | They are read (read set) but never count and never propose. |
| 11 | Agent-authored record with `approve` | treated as a decision | Any `agent` record is a proposal (C16). |
| 12 | Fresh approval for pay changes | `>` against `>=` on positions | `pos >= tx(S.payRateCents)`; the same transaction counts (C28, C30). |
| 13 | Pending proposal | which proposal and which decisions | `p` is the latest proposal's `pos`; any counting decision with `pos >= p` resolves the item. |
| 14 | Erased value semantics | presence against content | Presence tests treat the marker as present; `EVSUB` has its own row for it (C07). |
| 15 | Read sets under short-circuit | dynamic reads differ by test order | Read sets are static and instantiated from reference values (6.3). |
| 16 | Reference to an entity with no facts | no pairs, or pairs | Pairs are instantiated from the reference value (C24). |
| 17 | Keyed rules with no items | omit the trace entry | One row-0 entry with key `""` (C01). |
| 18 | `PROP` row-0 inputs | empty or all facts | Every fact whose pair is in the read set, which includes proposals' and incomplete records' facts. |
| 19 | Which decisions feed `I9S2`, `BGC`, `PAYCHG` inputs | all decision facts | Only `countingFacts(T)` for the rule's own target, so proposals and other targets never change those work item ids. |
| 20 | Minimum-wage floor with two attributes | first present, or max | The greatest present value; equality passes (C01, C25). |
| 21 | Pay change direction | raise only | Absolute difference, strictly greater than the threshold (C29, C30). |
| 22 | Expiry window arithmetic | off by one day | `W = startOf(addDays(expiresOn, 1 - lead))`; with lead 0, `W = B` (C19, C20). |
| 23 | Activation ties | arbitrary pick | Greatest `from`, then `tx`, then release string (5.4). |
| 24 | Error precedence | different first error | Fixed check order in 4.4; every error case has exactly one violation. |
| 25 | Key and string ordering | UTF-16 against code points | All W0 strings are printable ASCII, where the orders agree. |
| 26 | Work item id preimage | key set, number forms | Exactly six keys in canonical JSON (8.4); the validator recomputes every golden id. |
| 27 | `(epoch, position)` cursors | two integers against one | The adapter passes one order-preserving integer (4.1). |
| 28 | Erasure and old bases | expecting pre-erasure outputs | Reproduction holds modulo erasure (4.2 item 6). |
| 29 | Unreachable entities in a world | error or ignore | Allowed kinds are valid and ignored when unreachable; other placements' entities are `W0.E_UNKNOWN`. |
| 30 | Empty `expected` arrays | omit the key | Every key of 8.1 is always present; empty arrays are written `[]`. |
| 31 | Position integers | two order-preserving mappings give different `inputs` and work item ids | Both implementations use the oracle's dense ordinal (4.1). |
| 32 | Population draws | different hash input, modulo handling or Zipf rounding gives a different population | `draw` is defined to the byte in 12.3; the modulo bias is part of the definition; Zipf weights are `floor(10^12 / r)`. |
| 33 | "Fires" and "R2 changes" | counting trace entries, ids or dependencies as changes | Defined on the domain projection in 12.1. |

## 15. Open questions

1. **Work item ids include the release hash** (as the brief requires), so activating R2 gives every open work item a new id and the
   outbox publishes it again. A receiver that wants one notice per real-world event must deduplicate on `(subject, rule, kind, key)`.
   Is re-publication on activation the intended behavior?
2. **Due times are midnight UTC.** Real I-9 and E-Verify deadlines run in the work location's time zone and skip federal holidays.
   W0 has neither, by the brief's choice. Should a later world add a location time zone?
3. **E-Verify transitions are per status, not per edge.** W0 sees only the current status, so it cannot flag an illegal transition
   (for example `fnc` back to `pending`). Detecting those needs status history in the world.
4. **Later commit wins for conflicting decisions.** GS.07 expects compare-and-set to stop the second reviewer; when both commit
   anyway, W0 lets the later one win silently. A conflict flag would make that visible; W0 does not have one.
5. **Dependencies are entity and attribute pairs without valid-time ranges.** R18 X3 predicts the range-aware form re-runs fewer
   subjects after retroactive corrections; W0 keeps the coarser form so the oracle stays simple.
6. **An erased SSN blocks E-Verify submission** with its own task (`everify.ssn-erased`). That is a product choice for Sam, made here
   only so the output is defined.
7. **Location fanout.** TARGETS 6.1 item 6 says the largest location "holds hundreds of workers", but a Zipf with s = 1.0 over 2,000
   locations at 100k puts about 12,100 placements at the largest one (12.1%). W0 follows the stated parameters. If "hundreds" is the
   intent, s = 0.3 over 2,000 locations gives a largest location of about 340 (s = 0.4 gives about 630).
8. **Other rungs** keep N / 50 locations (12.3). Only the 100k rung's numbers are frozen floors.
