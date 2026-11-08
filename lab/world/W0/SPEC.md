# W0: the frozen world definition (spec version W0-1.1.2, 2026-11-08)

W0 is a small synthetic world definition. It stands in for Onboarded's real world definition in every Triplex test: the P5
release sweep, the P3 dependency rules and the domain expectations of the 20 golden scenarios (`lab/TARGETS.md` sections 1.1,
6 and 6.1). It is not a Triplex feature. Two programs implement it from this file alone, a TypeScript reference kernel and the
stdlib-only Python oracle O-DOMAIN, and they must produce byte-identical outputs for every input. When they disagree, either one
of them has a bug or this file is ambiguous, and the ambiguity gets a named entry in section 14.

**Frozen once pinned.** W0-1.1.0 replaced W0-1.0.0 after the independent review V-D01 (`lab/verify/D01/VERIFY.md`, RULINGS Q40),
and W0-1.1.1 replaced W0-1.1.0 after its re-review (RULINGS Q44: small fixes, and R3 becomes a release scoped to listed
jurisdictions). W0-1.1.1 was pinned (contract 0.3.8). **W0-1.1.2 changes no meaning:** it writes in the readings A01 to A15 that
the two implementations had to choose where this file was silent (RULINGS Q53, Q57), and adds the golden cases C88 to C136 that
V-D01c's mutation review found missing. Cases C01 to C87, the three releases and the 100k fingerprint are byte-identical to
W0-1.1.1. A change of meaning still makes a new world (`W1`) with its own releases and cases.

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
15. Decided questions

## 1. Operations and files

**W0 defines six pure functions.** None reads a clock, a random source, the environment or anything outside its arguments.
"Now" is always the basis valid time.

| Operation | Signature | Output |
| --- | --- | --- |
| `evaluate` | `evaluate(world, release, basis)` | the subject's outputs (section 8) or an error |
| `resolveRelease` | `resolveRelease(activations, validTime)` | the hash of the release in force at that valid time, or an error |
| `reconcile` | `evaluate(world, resolveRelease(activations, basis.validTime), basis)` | the same output shape as `evaluate` |
| `affected` | `affected(release, worlds, writes)` | `{"affected": [<subject>, ...]}`: the subjects whose dependencies meet the writes, ascending (section 10) |
| `publish` | `publish(state, evaluations)` | `{"deliveries": [...], "state": ...}`: what the outbox delivers and its new state (section 8.8) |
| `receive` | `receive(state, deliveries)` | `{"applied": {"effects": [...], "projection": [...]}, "state": ...}`: what a work-item receiver applies (section 8.9) |

**Preview and activation use the same function.** A preview (GS.11, plan impact) is `evaluate` with a release that is not
active. An activated sweep (GS.10, P5) is `reconcile` after the activation fact exists. At one basis both give the same bytes
(case C31 against C20).

**Files in `lab/world/W0/`.**

| File | What it holds |
| --- | --- |
| `SPEC.md` | this file, the only normative text |
| `schema.json` | the attribute table of section 3 and the release parameter table of section 5, as data |
| `releases/R1.json`, `releases/R2.json`, `releases/R3.json` | the three releases (R3 carries a scope, 5.1) |
| `releases/index.json` | release name to content hash |
| `cases/*.json` | the 136 golden cases (section 11) |
| `expected-sha256.json` | case id to the SHA-256 of `canonicalJson(expected)`, so a harness compares output bytes with frozen bytes (11.1) |
| `validate.py` | a stdlib-only shape validator (`python3 -I validate.py`); it holds no rule logic |
| `SHA256SUMS` | the SHA-256 of every other file in this folder |
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

**`-0` is an integer token whose value is 0 (RULINGS Q53a, reading A02).** It is valid wherever 0 is and is written `0` in every
output (case C93); as a fact's `tx` it is 0, below 1, so `W0.E_BASIS` (case C94).

**An integer token has no length limit (RULINGS Q57b, reading A12).** A token of any number of digits is still an integer token.
Outside its range it is `W0.E_VALUE` as a value (5,000 nines as `payRateCents`, case C90) and `W0.E_BASIS` as a position (5,000
nines as `basis.tx`, case C129). An implementation must not fail on its language's limits: CPython refuses to convert more than
4,300 digits by default, and a JavaScript `Number` rounds above 2^53. The fields with a stated range are the `cents` and `minutes`
values, a fact's `tx`, the `basis.tx` of `evaluate`, `reconcile` and `affected`, and an activation's `tx`.

**The integers of `publish` and `receive` have no upper bound (A12, O-DOMAIN's fix-round reading).** A `seq`, a `done`, the
`basis.tx` of an evaluation record or subject state and a work item's `inputs` are compared, incremented and written exactly at
any length; only the lower bounds of 4.4 step 1 apply. A stored `seq` of 5,000 nines publishes `seq` + 1 = 10^5000 (case C130),
and a receiver at `done` 5,000 nines processes it (case C131). A TypeScript implementation needs `BigInt` for these fields.

**Instants compare as strings.** Because every instant has the same 27-character shape and a four-digit year, byte order of the
strings equals time order. Implementations compare instants as strings and never convert them to a native time type (a
JavaScript `Date` would drop the microseconds). Derived instants (section 6.1) may fall in 1999 or 2100 and still have four-digit
years.

**Dates use calendar arithmetic only.** No rule adds a duration to an instant. Every instant a rule produces is a date at
`T00:00:00.000000Z`.

## 3. Entities and attributes

**Six entity kinds, told apart by the id.** A local part is 1 to 32 characters from `[a-z0-9-]`.

| Kind | Id grammar | Example | Role |
| --- | --- | --- | --- |
| placement | `pl:<local>` | `pl:a` | the subject; one placement is one worker at one job |
| document | `<placement id>/doc:<local>` | `pl:a/doc:1` | owned by that placement |
| decision | `<placement id>/dec:<local>` | `pl:a/dec:1` | owned by that placement; an immutable reviewer or agent record |
| answer | `<placement id>/ans:<local>` | `pl:a/ans:1` | owned by that placement; ballast (below) |
| location | `loc:<local>` | `loc:nyc` | shared: many placements reference one location |
| jurisdiction | `jur:<local>` | `jur:ny` | shared: many locations reference one jurisdiction (RULINGS Q40b) |

**Placement attributes.**

| Attribute | Type | Cardinality | PII | Meaning |
| --- | --- | --- | --- | --- |
| `startDate` | date | one | no | first day of work |
| `section1AttestedAt` | instant | one | no | the worker signed I-9 Section 1 |
| `ssn` | text | one | yes | social security number as entered |
| `everifyStatus` | enum `pending`, `tnc`, `authorized`, `fnc` | one | no | E-Verify case status (`tnc` tentative nonconfirmation, `fnc` final nonconfirmation) |
| `everifyStatusAt` | instant | one | no | when the vendor reported that status |
| `everifySubmitResult` | enum `accepted`, `rejected` | one | no | the runtime's result of performing the `everify.submit-case` work item: a runtime-outcome fact (RULINGS Q40i) |
| `bgcStatus` | enum `pending`, `clear`, `consider` | one | no | background-check result |
| `payRateCents` | cents | one | no | hourly pay rate in cents |
| `baselinePayRateCents` | cents | one | no | the pay rate the placement was approved at |
| `weeklyMinutes` | minutes | one | no | scheduled minutes per week |
| `location` | ref to a location | one | no | work location |
| `documents` | ref to a document whose id starts with this placement's id + `/doc:` | many | no | identity and work-authorization documents |
| `decisions` | ref to a decision whose id starts with this placement's id + `/dec:` | many | no | reviewer decisions and agent proposals |
| `answers` | ref to an answer whose id starts with this placement's id + `/ans:` | many | no | ballast: the first answer of each answer chain |

**Document attributes:** `docType` (enum `passport`, `ead`, `visa`; one), `expiresOn` (date; one), `reverified` (boolean; one).

**Decision attributes:** `target` (enum `i9.section2`, `bgc.adjudication`, `pay.change`; one), `verdict` (enum `approve`,
`waive`, `reject`; one), `author` (enum `person`, `system`, `agent`; one). An agent-authored record is a proposal.

**Answer attributes (ballast):** `field` (text; one), `value` (text; one), `next` (ref to an answer owned by the same placement; one).

**Location attributes:** `jurisdiction` (ref to a jurisdiction; one), `localMinWageCents` (cents; one).

**Jurisdiction attributes:** `stateMinWageCents` (cents; one). The state floor sits two references away from the placement
(`S.location`, then `L.jurisdiction`), so the dependency index has to follow two hops (RULINGS Q40b).

**Ballast is rule-neutral (RULINGS Q40a).** The placement's `answers` attribute and every answer attribute are ballast: no rule
reads them, so they are in no read set, never in `dependencies`, never inputs, and a write to them affects no subject (case C57).
They exist so a generated world has the size and depth of a real subject pull: 50 to 2,000 facts over 3 to 6 hops (section 12.3).
Ballast is part of the schema, so the trace's commands can carry 5 to 50 facts without inventing attributes: an attribute that is
not in this section is `W0.E_UNKNOWN` (case C63), never silently dropped.

No other attribute exists. `schema.json` holds the same table as data.

## 4. The world, the basis, validation and errors

### 4.1 The basis

```
basis = {"tx": <integer 0 to 9007199254740991>, "validTime": <instant>}
```

**`tx` is the record-time position** of the read: the world holds what the store knew after committing transaction `tx`.
**`validTime` is "now"** for every rule. **Positions (RULINGS Q40f):** every `tx` in W0 (on a fact, an activation or a basis) is
the 1-based dense ordinal of committed Triplex transacts in the tenant's source-of-truth stream, in coordinate order. A lane's
position is a coordinate `(stream, epoch, offset, ordinal)` ordered lexicographically and not necessarily dense (RULINGS Q31c); the
ordinal counts only committed transacts, so aborted offsets take no number, and the first committed transact of the tenant is 1.
The same ordinal is supplied to the kernel and to O-DOMAIN. Every W0 rule compares positions only with `<`, `>=` and `max`, so the
choice matters only for the `inputs` arrays and the work item versions, which carry the integers themselves.

### 4.2 The world

```
world = {"subject": <placement id>, "facts": [<fact>, ...]}
fact  = {"e": <entity id>, "a": <attribute>, "v": <value>, "tx": <integer 1 to 9007199254740991>}
```

1. **The world is the store's answer at the basis.** It holds the facts valid at `basis.validTime` as recorded up to `basis.tx`.
   The store, not W0, applies bitemporal visibility, retroactive corrections and the supersession of stale vendor revisions.
2. **`tx` on a fact is the commit position of the transaction that asserted it.** Facts asserted in one command share one `tx`.
   This is the "commit order the store reports" that decision resolution uses (section 6.2).
3. **Allowed entities:** the subject, entities it owns (id starts with `<subject>/`), locations and jurisdictions. A document,
   decision or answer id always starts with its owner's id, so a world for `pl:a` cannot carry `pl:b/doc:1` (case C62).
4. **Reachable entities** are the subject; the documents, decisions and answers named by the subject's `documents`, `decisions`
   and `answers` facts; every answer named by a reachable answer's `next` fact; the location named by the subject's `location`
   fact; and the jurisdiction named by that location's `jurisdiction` fact. Every fact is validated (4.4), reachable or not;
   reachability only decides which facts the rules can read. A valid fact of an allowed but unreachable entity is read by no rule
   (case C44).
5. **Fact order in the array carries no meaning.** Outputs never depend on it, except which error is reported first (4.4).
6. **An erased value keeps its fact.** After a PII erasure the fact stays with its `e`, `a` and `tx`; only `v` becomes
   `{"erasedAt": ...}`. Per `lab/TARGETS.md` section 7 a store returns the marker at every basis once the erasure has published,
   including bases before the erasure, so outputs at old bases can change after an erasure (reproduction holds modulo erasure).

Notation used below: `S` is the subject. `S.x` is the value of the fact `(S, x)` or `⊥` (absent). `tx(S.x)` is that fact's `tx`.
For a many-cardinality attribute, `S.documents` is the set of its values.

### 4.3 Operation inputs (the `input` object of a case)

| Operation | Input object (exact keys) |
| --- | --- |
| `evaluate` | `{"basis", "release", "world"}`, where `release` is `"R1"`, `"R2"` or `"R3"` and names `releases/<name>.json` |
| `reconcile` | `{"activations", "basis", "world"}`, where `activations` is an array of `{"from": <instant>, "release": <hash>, "tx": <integer>}` |
| `affected` | `{"basis", "release", "worlds", "writes"}`, where `worlds` is an array of worlds with distinct subjects and `writes` is an array of `[<entity id string>, <attribute string>]` |
| `publish` | `{"evaluations", "state"}`, where `evaluations` is an array of evaluation records and `state` is an outbox state (section 8.8) |
| `receive` | `{"deliveries", "state"}`, where `deliveries` is an array of deliveries in arrival order and `state` is a receiver state (section 8.9) |

### 4.4 Validation and errors

**An invalid input yields `{"error": "<code>"}` and nothing else.** Checks run in the order below and the first failure wins.

**The input is one JSON text (RULINGS Q53a, Q57a, Q57c; readings A01, A11, A13).** Its bytes are UTF-8 with no byte order mark
and hold exactly one JSON value (RFC 8259) with optional whitespace around it. Each of these is `W0.E_SHAPE` in step 1:
- bytes that are not valid UTF-8 (case C92), or a leading byte order mark EF BB BF (case C91), although RFC 8259 section 8.1 lets
  a general parser ignore one and some decoders replace bad bytes with U+FFFD;
- a syntax error, a truncated text, or anything after the value;
- the tokens `NaN`, `Infinity` and `-Infinity`, which are not JSON (case C128).

Nesting depth is never an error: a value may nest to any depth, and an implementation must not fail on its recursion limit. A
fact's `v` of 2,000 nested arrays passes step 1 and is `W0.E_VALUE` in step 3 (case C132).

1. **`W0.E_SHAPE`:** the input is not a JSON object with exactly the keys of 4.3, or any of these kinds is wrong:
   - objects with exactly the listed keys: the input, `basis`, `world`, each fact, each activation;
   - arrays: `facts`, `activations`, `worlds`, `writes`; each write is a two-element array of strings;
   - strings: `basis.validTime`, `world.subject`, a fact's `e` and `a`, an activation's `from` and `release`, the `release` name;
   - JSON integer tokens (section 2, so `3.0` and `1e1` fail): `basis.tx`, a fact's `tx`, an activation's `tx`;
   - a fact's `v` may be any JSON kind here; its type is checked in step 3.

   **`publish` and `receive` (RULINGS Q44a).** Every object has exactly the keys that 8.8 and 8.9 list, with these kinds:
   - `publish`: `evaluations` is an array of evaluation records. A record's `basis` is an object `{tx, validTime}` with an integer
     token and a string; its `release` and `subject` are strings; its `workItems` is an array of work items. A work item's `id`,
     `key`, `kind`, `rule` and `version` are strings, `inputs` is an array of integer tokens and `payload` is an object. `state`
     has the arrays `items`, `pending` and `subjects`. An item state's `id` and `subject` are strings, `payload` is an object,
     `retired` is a boolean and `seq` is an integer token of at least 1. A subject state's `basis` is as a record's and its
     `subject` is a string. A delivery's `id`, `key`, `kind`, `rule`, `subject` and `version` are strings, `payload` is an object
     and `seq` is an integer token of at least 1.
   - `receive`: `deliveries` is an array of deliveries, each as in `publish`. `state` has the arrays `effects` and `projection`.
     An effect state's `done` is an integer token of at least 0, its `id` a string and its `waiting` an array of deliveries. A
     projection entry's `id` is a string, `payload` an object and `seq` an integer token of at least 1.
   - These integers have no upper bound (section 2, A12).
   - These two operations run no step after step 1. They trust that their records came from `evaluate`, `reconcile` and
     `publish`, so a value of the right kind is not checked further: a `validTime` is not parsed, a hash is not recomputed and an
     id is not matched against its work item. Case C84 gives a state without `pending`, case C85 a delivery with `seq` 0.
   - A payload, and every string these operations copy, may hold any JSON value, including number tokens with a fraction or an
     exponent and non-ASCII characters; section 9 item 7 says how they are written (A07).

   Also `W0.E_SHAPE`: an object with a duplicate key anywhere in the input, including inside a fact's `v` (case C66); a `release`
   name other than `R1`, `R2` or `R3`; two worlds in `affected` with the same subject (case C67). A string that has the right kind
   but a bad form (an instant that is not an instant, an unknown entity id) is left to the later steps.
2. **`W0.E_BASIS`:** `basis.validTime` is not a valid instant, or `basis.tx` is outside its range.
3. **For each world in array order** (one world for `evaluate` and `reconcile`). `affected` runs sub-steps 1 to 3 for one
   world before it starts the next (RULINGS Q53a, A04): an earlier world's cardinality clash wins over a later world's bad
   subject (case C96).
   1. `W0.E_UNKNOWN` if `subject` is not a placement id.
   2. For each fact in array order, reachable or not, these three checks in this order, and the first failing fact decides:
      `W0.E_UNKNOWN` if `e` is not an allowed entity (4.2 item 3) or `a` is not an attribute of that kind; `W0.E_VALUE` if `v` is
      not a valid value of the attribute's type (section 2), including a ref of the wrong kind or owner and an erased marker on a
      non-PII attribute, and any value of a JSON kind the type does not take (an array or object on a date, instant or cents
      attribute, cases C88 and C89); `W0.E_BASIS` if `tx` is less than 1 or greater than `basis.tx`. So a world whose first fact
      has a bad `tx` and whose second fact has a bad date gives `W0.E_BASIS` (case C43), and one fact with both a bad date and a
      bad `tx` gives `W0.E_VALUE` (case C112). A fact at `tx` = `basis.tx` is valid (case C107).
   3. `W0.E_CARDINALITY` if two facts share `(e, a)` for a one-cardinality attribute, or share `(e, a, v)` for a many-cardinality
      attribute. This runs only after every fact of the world has passed sub-step 2 (RULINGS Q53a, A03), so a later unknown
      attribute wins over an earlier duplicate (case C95).
4. **For `reconcile`, after the world, each activation in array order, one at a time (RULINGS Q53a, A05):** `W0.E_VALUE` if
   `release` does not match `^sha256:[0-9a-f]{64}$` or `from` is not a valid instant, then `W0.E_BASIS` if `tx` is less than 1 or
   greater than `basis.tx`, before the next activation is looked at (cases C97, C98). An activation at `tx` = `basis.tx` is valid
   (case C106). Then `W0.E_NO_RELEASE` if `resolveRelease` finds no release (5.4).

`writes` entries in `affected` are not checked beyond their shape: any entity and attribute strings are allowed.

## 5. Releases, hashing, diff and activation

### 5.1 The release document

```
{"name": <"R1", "R2" or "R3">, "rules": [<rule entry> x 11], "world": "W0"}
rule entry = {"id": <rule id>, "params": <object>}
           | {"id": <rule id>, "params": <object>, "scope": {"jurisdictions": [<jurisdiction id>, ...], "params": <object>}}
```

**The eleven rule entries appear in this fixed order:** `LIFE`, `I9S1`, `I9S2`, `EVSUB`, `EVSTAT`, `BGC`, `DOCEXP`, `MINWAGE`, `OT`,
`PAYCHG`, `PROP`. The order is the evaluation and trace order (section 8). One rule is one requirement.

**A scoped rule entry (RULINGS Q44b).** An entry with a `scope` applies `scope.params` to the subjects in its scope and its own
`params` to every other subject. A subject is in the scope when `jur(S)` (6.3), the jurisdiction its location references, is one of
`scope.jurisdictions`. The test compares ids only: the jurisdiction's own facts play no part. `scope.jurisdictions` is a non-empty
array of distinct jurisdiction ids in ascending order, and `scope.params` has the same keys and types as `params`. Reading
`S.location` and `L.jurisdiction` for the test adds them to the rule's read set (6.3). In W0 only R3's `OT` entry is scoped.

| Rule | Params | R1 | R2 | R3 |
| --- | --- | --- | --- | --- |
| `LIFE` | none | `{}` | `{}` | `{}` |
| `I9S1` | none | `{}` | `{}` | `{}` |
| `I9S2` | `businessDays` integer 1 to 10 | `{"businessDays": 3}` | `{"businessDays": 2}` (changed) | as R2 |
| `EVSUB` | `businessDays` integer 1 to 10 | `{"businessDays": 3}` | same | same |
| `EVSTAT` | `tncBusinessDays` integer 1 to 20 | `{"tncBusinessDays": 8}` | same | same |
| `BGC` | none | `{}` | `{}` | `{}` |
| `DOCEXP` | `leadDays`: object from document type to integer 0 to 365; the keys are the tracked types | `{"leadDays": {"ead": 0, "visa": 0}}` | `{"leadDays": {"ead": 90, "visa": 0}}` (changed) | as R2 |
| `MINWAGE` | `floorSources`: non-empty array of distinct strings from `jurisdiction.stateMinWageCents` and `location.localMinWageCents`, ascending | `{"floorSources": ["jurisdiction.stateMinWageCents"]}` | `{"floorSources": ["jurisdiction.stateMinWageCents", "location.localMinWageCents"]}` (changed) | as R2 |
| `OT` | `thresholdMinutes` minutes | `{"thresholdMinutes": 2400}` | same | params `{"thresholdMinutes": 2400}` with scope `{"jurisdictions": ["jur:j010", "jur:j020", ..., "jur:j100"], "params": {"thresholdMinutes": 2700}}` (changed from R2) |
| `PAYCHG` | `thresholdCents` cents | `{"thresholdCents": 500}` | same | same |
| `PROP` | none | `{}` | `{}` | `{}` |

**R2 changes exactly three requirements of R1:** the Section 2 due window (`I9S2`), the minimum-wage rule's floor sources
(`MINWAGE`, which changes its read set), and the expiry handling of one document type (`DOCEXP`, `ead` only).

**R3 changes exactly one requirement of R2, for listed jurisdictions only (RULINGS Q40i, Q44b).** `OT`'s threshold rises from
2,400 to 2,700 minutes for placements whose location's jurisdiction is one of the ten ids `jur:j010`, `jur:j020`, ..., `jur:j100`
(every tenth jurisdiction of the 100k population, 12.3); every other placement keeps 2,400. R3 is the narrow release, narrowed by
subject: the sweep finds the subjects R3 reaches through the reverse two-hop dependency index (jurisdiction, then its locations,
then their placements; section 10 item 7), not by re-running `OT` for everyone. At the 100k rung it reaches about 9.6% of
subjects and changes about 0.41% (12.4 item 4). The listed ids are those of the 100k rung; 12.3 says what they name at other rungs.

### 5.2 Content hash

`hash(release) = "sha256:" + lowercase hex of SHA-256 over the UTF-8 bytes of canonicalJson(release)` (section 9). The hashes
are in `releases/index.json`, and `validate.py` recomputes them. A release is immutable: changing a byte makes a different release.
A scope is part of its rule entry, so it is part of the hash: listing one more jurisdiction makes a different release.

### 5.3 Release diff

`diff(A, B)` is the list of rule ids, in release order, whose rule entries have different canonical JSON in A and in B.
`diff(R1, R2) = ["I9S2", "DOCEXP", "MINWAGE"]`, `diff(R2, R3) = ["OT"]` and `diff(R1, R3) = ["I9S2", "DOCEXP", "MINWAGE", "OT"]`.
A scope counts as part of the entry, so R2's and R3's `OT` entries differ. This is the definition tier of R18 section 3.1 item 3: a
sweep may skip a `(subject, rule)` pair whose rule is not in the diff and whose inputs did not change. A sweep from A to B may also
skip every subject outside the scope of every entry in `diff(A, B)` when each of those entries is scoped, its own `params` equal
A's params for that rule, and A's entry for that rule is unscoped (RULINGS Q48c, V-D01 N2), because such a subject then gets A's
params under B. R2 to R3 meets this: R2's `OT` entry is unscoped and R3's `OT` params equal R2's.

### 5.4 Activation

**Activation is a fact:** "this tenant uses release H from valid time F", committed at position `tx`. The activations passed to
`resolveRelease` are the tenant's activation facts visible at the basis.

`resolveRelease(activations, v)`:

1. Candidates are the activations with `from <= v` (string comparison; `from` equal to `v` is a candidate, case C105).
2. No candidate: `W0.E_NO_RELEASE`.
3. Pick the candidate with the greatest `from`; among equal `from`, the greatest `tx`; among equal `tx`, the greatest `release`
   string (byte order). The order of the keys matters: `tx` decides before the release string (case C103), and the release
   string only when `from` and `tx` are equal (case C104).
4. If the picked hash is not R1's, R2's or R3's: `W0.E_NO_RELEASE`, with no fall-back to another candidate (RULINGS Q53a, A06;
   case C99). Otherwise return it. Case C61 pins the equal-`from` tie.

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
- `J.x` is `(J, x)` where J is the value of the fact `(L, jurisdiction)`; it yields no pair when `S.location = ⊥` or when the world
  has no `(L, jurisdiction)` fact.

The pairs are instantiated from the reference values even when the referenced entity has no facts in the world, and whether or
not the pair's own fact is present, because a later write to that pair can change the output. Every pair is listed regardless of the order
in which a rule tests its conditions, so short-circuit evaluation never changes a read set.

**`jur(S)`** is the value of the fact `(L, jurisdiction)` where L is the value of `S.location`, or `⊥` when `S.location = ⊥` or the
world has no `(L, jurisdiction)` fact. **A scoped rule entry (5.1)** adds `S.location` and `L.jurisdiction` to the rule's read set,
and the `S.location` and `(L, jurisdiction)` facts, when present, to the input facts of each of its trace entries, whether or not the
subject is in the scope: the test reads them either way.

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

- **Read set:** `S.startDate`, `S.ssn`, `S.everifyStatus`, `S.everifySubmitResult`. **Input facts:** those four facts when present.
- **Due:** `endOfDay(addBusinessDays(S.startDate, businessDays))`, or `null`. The case must exist by the third business day.

| Row | Condition | Outputs |
| --- | --- | --- |
| 1 | `S.everifyStatus ≠ ⊥` | none (a case exists) |
| 2 | `S.ssn = ⊥` | task `everify.collect-ssn`, due as above |
| 3 | `S.ssn` is an erased marker | task `everify.ssn-erased`, due as above |
| 4 | `S.ssn` is not exactly 9 characters each in `0` to `9` | task `everify.fix-ssn`, due as above |
| 5 | `S.everifySubmitResult = accepted` | none (submitted; the vendor's first status has not arrived) |
| 6 | `S.everifySubmitResult = rejected` | task `everify.submit-rejected`, due as above |
| 7 | otherwise | work item `everify.submit-case` |

`everifySubmitResult` is written by the runtime writer class after it performs the `everify.submit-case` work item, so rows 5 and 6
close the loop from a published work item back to a fact (cases C52, C53).

### 7.5 `EVSTAT`: E-Verify case status

- **Read set:** `S.everifyStatus`, `S.everifyStatusAt`. **Input facts:** those two facts when present.

| Row | Condition | Outputs |
| --- | --- | --- |
| 1 | `S.everifyStatus = ⊥` or `pending` | none |
| 2 | `tnc` | task `everify.tnc`, due `endOfDay(addBusinessDays(dateOf(S.everifyStatusAt), tncBusinessDays))` or `null` when `S.everifyStatusAt = ⊥`; work item `notify.everify-tnc` |
| 3 | `authorized` | flag `everify-authorized` |
| 4 | `fnc` | task `everify.fnc`, due `null`; work item `notify.everify-fnc` |

The `tnc` and `fnc` notices are different kinds, so each has its own work item id. A corrected `everifyStatusAt` changes the `tnc`
notice's payload (its due time) and so publishes a new version of the same id (section 8.4).

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

### 7.8 `MINWAGE`: pay rate at or above the minimum wage, two hops away

- **Read set:** `S.startDate`, `S.payRateCents`, `S.location`, and per floor source: `jurisdiction.stateMinWageCents` reads
  `L.jurisdiction` and `J.stateMinWageCents`; `location.localMinWageCents` reads `L.localMinWageCents`. Under R1 the read set
  therefore reaches the jurisdiction through the location (two hops); R2 adds the location's own local floor.
- **Input facts:** every fact whose pair is in the read set.
- **Floor:** the greatest value among the present facts named by the floor sources: `(J, stateMinWageCents)` and, under R2,
  `(L, localMinWageCents)`. A city ordinance above the state floor applies under R2.
- **Due:** every task of this rule is due at `startOf(S.startDate)`, or `null`. Pay must be fixed before the first shift.

| Row | Condition | Outputs |
| --- | --- | --- |
| 1 | `S.payRateCents = ⊥` | task `pay.rate-missing` |
| 2 | `S.location = ⊥` | task `pay.location-missing` |
| 3 | no fact named by a floor source is present (no jurisdiction reference, no jurisdiction floor, and under R2 no local floor) | task `pay.floor-unknown` |
| 4 | `S.payRateCents >= floor` | none |
| 5 | otherwise | task `pay.below-minimum`; work item `notify.pay-below-minimum` |

### 7.9 `OT`: overtime

- **Read set:** `S.weeklyMinutes`; under R3's scoped entry also `S.location` and `L.jurisdiction` (6.3).
- **Input facts:** the `S.weeklyMinutes` fact; under R3 also the `S.location` and `(L, jurisdiction)` facts when present.
- **Threshold:** `thresholdMinutes` from the entry's `params`, or from `scope.params` when `jur(S)` is listed in the entry's scope.
  R1, R2, and R3 outside its scope: 2,400 minutes, which is 40 hours. R3 inside its scope: 2,700 minutes.

| Row | Condition | Outputs |
| --- | --- | --- |
| 1 | `S.weeklyMinutes = ⊥` | none |
| 2 | `S.weeklyMinutes > threshold` | flag `overtime` |
| 3 | otherwise | none |

Cases: C54 and C55 inside R3's scope, C86 outside it. The read set adds no dependency under R3, because `MINWAGE` reads
`S.location` and `L.jurisdiction` in every release.

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
  "workItems":    [{"id": ..., "inputs": [<integer>, ...], "key": <string>, "kind": ..., "payload": {...}, "rule": ..., "version": ...}, ...]
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

### 8.4 Work items (RULINGS Q36a, Q38f, Q40c)

- **Fields:** `kind` and `key` from the rule's table (`key` is `""` for unkeyed rules, d for `DOCEXP`), `rule`, `inputs` equal to
  the `inputs` of the trace entry with the same rule and key, `payload` from the table below, `id` and `version`.
- **The id names the work:** `"wi:" + lowercase hex of SHA-256 over the UTF-8 bytes of
  canonicalJson({"key": ..., "kind": ..., "rule": ..., "subject": S})`, with exactly those four keys. The id does not change with
  the release or the inputs.
- **The version names the content and is not a delivery identity:** `"wv:" + lowercase hex of SHA-256 over the UTF-8 bytes of
  canonicalJson({"inputs": ..., "payload": ..., "release": <release hash>})`, with exactly those three keys. Two deliveries can
  carry the same version (case C73).
- **Payloads** carry the values the rule decided on, never a PII value:

| Kind | Rule | Payload |
| --- | --- | --- |
| `everify.submit-case` | `EVSUB` | `{"startDate": S.startDate}`, or `null` for the value when the start date is absent (case C50) |
| `notify.everify-tnc` | `EVSTAT` | `{"dueAt": <the everify.tnc task's dueAt, an instant or null>}` |
| `notify.everify-fnc` | `EVSTAT` | `{}` |
| `bgc.order` | `BGC` | `{}` |
| `notify.pre-adverse-action` | `BGC` | `{}` |
| `notify.document-expired` | `DOCEXP` | `{"docType": d.docType, "expiresOn": d.expiresOn}` |
| `notify.pay-below-minimum` | `MINWAGE` | `{"floorCents": <the floor of 7.8>, "payRateCents": S.payRateCents}` |
| `notify.pay-change-approval` | `PAYCHG` | `{"baselinePayRateCents": S.baselinePayRateCents, "payRateCents": S.payRateCents}` |

- **Which work items reach the receiver** is decided by `publish` (8.8): each id carries a publication sequence, and the delivery
  key is `(id, seq)`.

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

**"Ascending" for strings is Unicode code point order (RULINGS Q57d, A14),** which equals the byte order of their UTF-8
encodings. It is not UTF-16 code unit order, which JavaScript's default `<` and `sort` use and which differs above U+FFFF: U+E000
sorts before U+1F600 by code point and after it by code unit, since U+1F600 is the pair D83D DE00. Every W0 value string is
printable ASCII, where the orders agree; the rule decides the order of the strings `publish` and `receive` copy unchecked. It
covers object keys (section 9 item 2), the sorts of `items`, `subjects`, `effects` and `projection`, the work item order within
a record (8.8 step 2) and the basis guard's `validTime` comparison (cases C133, C134).

### 8.8 The outbox: `publish` (RULINGS Q38f, Q40c, Q40d, Q40h)

`publish(state, evaluations)` returns `{"deliveries": [...], "state": <new state>}`. It is the expected outbox, so O-DOMAIN can
test a store's outbox and the receiver's view.

```
evaluation record = {"basis": {"tx", "validTime"}, "release": <hash>, "subject": S, "workItems": [<work item of 8.4>, ...]}
state             = {"items": [<item state>, ...], "pending": [<delivery>, ...], "subjects": [<subject state>, ...]}
item state        = {"id", "payload", "retired": <boolean>, "seq": <integer >= 1>, "subject"}
subject state     = {"basis": {"tx", "validTime"}, "subject"}
delivery          = {"id", "key", "kind", "payload", "rule", "seq", "subject", "version"}
```

An evaluation record is the `basis`, `release`, `subject` and `workItems` of one `evaluate` or `reconcile` output. The empty
state is `{"items": [], "pending": [], "subjects": []}`. In every output state `items` is ascending by `id`, `subjects` ascending
by `subject` (8.7), and `pending` in publication order.

**An input state is read by key (RULINGS Q53a, A08).** `publish` indexes the input's `items` by `id` and its `subjects` by
`subject`; when one appears twice, the later entry replaces the earlier one, and input order carries no other meaning. The
output re-sorts both arrays. `pending` keeps the input's order and appends this call's deliveries (case C101).

**Processing.** Evaluation records are applied one at a time, in array order:

1. **Basis order (Q40d).** The subject is the record's `subject`. Let A be the subject's stored basis. When A exists and the
   record's basis is older (its `tx` is less than A's, or equal with a `validTime` earlier than A's), the record is skipped: no
   delivery and no state change (case C77; an equal `tx` with an earlier `validTime`, case C122). Otherwise the record's basis
   becomes the subject's stored basis. An equal basis is not older, so a re-applied record goes through steps 2 and 3 and
   publishes nothing new (case C75); a second, different record at an equal basis is applied too (case C123).
2. **Publication (Q38f, Q40c).** For each work item W of the record, in `id` order, with I the item state of `W.id`:
   - no I: publish W with `seq` 1;
   - I is retired: publish W with `seq` = I.seq + 1, even when the payload equals I's (Q40h, case C78);
   - `canonicalJson(W.payload)` differs from `canonicalJson(I.payload)`: publish W with `seq` = I.seq + 1;
   - otherwise: nothing.

   The `id` order is a stable sort (RULINGS Q53a, A09): two work items with one id in a record, which `evaluate` never
   produces, keep their order in the record, and the second is compared with the item state the first left (case C102).
   `I.seq + 1` is exact at any length (section 2, case C130).

   Publishing appends the delivery `{id, key, kind, payload, rule, seq, subject, version}` to this call's `deliveries` and to
   `state.pending`: `id`, `key`, `kind`, `payload`, `rule` and `version` come from W, `subject` from the record (RULINGS Q44c), and
   `seq` is the new sequence. It sets I to `{id, payload, retired: false, seq, subject}`.
3. **Retirement (Q40h).** Every item state of this subject that is not retired and whose id is not among the record's work items
   becomes retired; its `seq` and `payload` stay. Other subjects' item states are never touched (case C124).

**Only live reconciles are published (RULINGS Q44c).** The records passed to `publish` are live reconciles: `reconcile` outputs
read at the store's position at that moment, with "now" as the valid time. They may arrive late or out of order; the basis guard
handles that (C77). A preview (GS.11: `evaluate` with a release that is not active) and an audit evaluation at a past valid time
are never passed to `publish`: the basis guard orders by `tx` first, so an audit read at a newer `tx` but an older valid time
would pass the guard and publish past payloads. With only live reconciles, one basis gives one record (one basis resolves one
release), which is why applying and skipping an equal-basis record cannot be told apart in practice; `publish` as a function
still applies it (case C123).

**What the outputs mean.**

- **The delivery key is `(id, seq)`.** A rollback R1, R2, R1 delivers three times with sequences 1, 2 and 3 (payload floors 1650,
  1700, 1650), and the receiver never suppresses the return to 1650 (case C73). A correction that is later reverted works the same
  way (case C74).
- **An unchanged payload publishes nothing,** whatever the release: an activation that changes no payload of an id leaves it alone
  (early cutoff, R18 X5; case C76).
- **Atomic persistence.** A store persists the new state, `pending` included, in the same write as its outbox records. `pending`
  holds published deliveries the receiver has not acknowledged; acknowledgement removes an entry and is outside W0. After a crash,
  every pending delivery is sent again with its original `(id, seq)`, and the re-evaluation that follows the restart publishes
  nothing new (case C75).
- **One atomic unit per subject (RULINGS Q42c).** The subject's basis guard, the retirement flags, each id's `seq` and latest
  payload, and the deliveries an evaluation produces form one unit, persisted in one write under the subject's compare-and-set. The
  guard advances on every applied record, including one with no work items and one whose payloads are all unchanged, so a later
  record with an older basis is skipped (case C82). A crash between any two of these transitions must leave either the whole old
  unit or the whole new unit; the store's crash-injection cases check that, and `publish` gives the expected unit on each side.

### 8.9 The receiver: `receive` (RULINGS Q42b)

`receive(state, deliveries)` returns `{"applied": {"effects": [...], "projection": [...]}, "state": <new state>}`. It is the
expected behavior of a work-item receiver, which sees deliveries in any order, with duplicates and gaps.

```
state         = {"effects": [<effect state>, ...], "projection": [<projection entry>, ...]}
effect state  = {"done": <integer >= 0>, "id", "waiting": [<delivery>, ...]}
projection    = {"id", "payload", "seq"}
```

The empty state is `{"effects": [], "projection": []}`; both arrays are ascending by `id`, and `waiting` is ascending by `seq`. A
receiver keeps two views of each id:

- **The projection** holds the latest state of the work item. It applies a delivery only when its `seq` is greater than the
  projection's `seq` for that id (or the id is new), and ignores lower and equal ones, so it never regresses (case C79).
- **The effects** need every transition in order (for example, one notice per change). An id's effect state starts at `done` 0.
  A delivery with `seq` <= `done`, or already waiting, is a duplicate and is ignored (deduplication by `(id, seq)`). A delivery with
  `seq` = `done` + 1 is processed, and then any waiting delivery whose `seq` is the next one, repeatedly, so one arrival can
  release several waiting deliveries (case C125). A delivery further ahead waits: nothing past a gap is processed until the
  missing sequence arrives (cases C80 and C81).

**An input state is read by key (RULINGS Q53a, A08),** as in 8.8: `effects` and `projection` are indexed by `id`, a later entry
replacing an earlier one, and the output re-sorts both by `id` (8.7).

**An inconsistent snapshot is kept as given (RULINGS Q57e, A15).** A seeded `waiting` list may hold entries at or below `done`,
or two entries with one `seq`; `receive` never repairs it. It re-sorts `waiting` stably by `seq`. Only a waiting entry with `seq`
= `done` + 1 is released, the first such entry in that order, and then the next `seq` is looked for. Entries at or below `done`,
and the second of two entries with one `seq`, stay waiting. An arriving delivery is a duplicate when its `seq` is at or below
`done` or an entry with its `seq` is waiting (case C135, which also pins A08 for `receive`).

Deliveries are taken in array order; for each, the projection step runs, then the effects step. `applied.projection` lists the
deliveries the projection applied and `applied.effects` the deliveries the effects processed, each in the order it happened. A
receiver persists its state atomically with its own effects, or its recipient is idempotent by `(id, seq)`; a restart carries the
state across unchanged (case C81). Case C83 pins both duplicate rules at once: arrivals 1, 1, 3, 3, 2 apply the projection for
seq 1 and 3 and process the effects for 1, 2 and 3, each once.

**Receivers exist from the first publication (RULINGS Q44d).** A receiver starts from the empty state before the first delivery
of any id, or is seeded with a state snapshot that matches the deliveries already acknowledged. A receiver that starts empty after
acknowledged deliveries were removed from `pending` would wait forever for seq 1, because nothing re-sends an acknowledged delivery.

## 9. Canonical JSON

**Every output, every release hash, and every work item id and version uses this one serialization.** Two implementations comply when their
bytes are equal.

1. UTF-8, no byte order mark, no whitespace outside strings, no trailing newline.
2. Objects: members sorted ascending by key in Unicode code point order (8.7), written `{"k":v,"k2":v2}`.
3. Arrays: elements in the order section 8.7 gives, written `[a,b]`.
4. Strings: `"` + content + `"`, with `"` written `\"` and `\` written `\\`. W0 strings are printable ASCII, so no other escape
   occurs in a W0 value; item 7 covers the other strings.
5. Integers: decimal digits, `-` only for negatives (none occur in W0 outputs), no leading zeros, no `+`, no fraction, no exponent.
6. Literals: `true`, `false`, `null`.
7. **Values that are not W0 values (RULINGS Q53a, A07).** `publish` and `receive` copy payloads, and the strings of ids, keys,
   kinds, rules, subjects and versions, without checking them (4.4 step 1), so the writer handles any JSON value:
   - an integer token is written as its integer: `-0` as `0`, and a token of any length keeps every digit (section 2);
   - any other number token, one with a fraction or an exponent, is written exactly as its source text: `1.65e3`, `1E3` and
     `1.50` stay as written, and `1.65e3` and `1650` are different values;
   - in a string, `"` is written `\"` and `\` is written `\\`; U+0008, U+0009, U+000A, U+000C and U+000D are written `\b`, `\t`,
     `\n`, `\f` and `\r`; every other character outside U+0020 to U+007E, U+007F included, is written `\u` and four lowercase
     hex digits, a character above U+FFFF as its UTF-16 surrogate pair (U+1F600 as `😀`) and a lone surrogate that
     arrived as an input escape as its own escape (`\ud800`); every other character, `/` included, is written as itself.

   Two payloads are equal for 8.8 step 2 when these bytes are equal (cases C100 and C136). Python's `json.dumps(x,
   ensure_ascii=True)` writes strings exactly this way; JavaScript's `JSON.stringify` does not (it writes non-ASCII characters
   as themselves, and `JSON.parse` has already lost a number token's source text), so a JavaScript implementation keeps number
   tokens from the input bytes and escapes strings itself.

Python produces items 1 to 6 with `json.dumps(x, sort_keys=True, separators=(",", ":"), ensure_ascii=True)`; for item 7 the
writer must also keep each non-integer number token's source text, which `json.dumps` cannot do alone (`validate.py` holds a
short writer that does). JavaScript produces items 1 to 6 with `JSON.stringify` over a copy whose object keys were inserted in
sorted order, recursively. That recipe relies on a W0 fact: no object key in any W0 output or preimage is an array index such as
`"7"`, which JavaScript would order first whatever the insertion order. A payload key that `publish` copies can be one (case C136
has `"9"` and `"10"`, which sort `"10"` first), so the item 7 writer emits keys in its own sorted order.

## 10. Affected subjects (P3, GS.06b)

`affected(release, worlds, writes)` returns the object `{"affected": [<subject>, ...]}`, listing ascending every subject s among
`worlds` whose `dependencies` under `release`
(computed from its own world as in 8.7) contain at least one pair of `writes`.

1. **This is the expected affected-subject set** of `lab/TARGETS.md` 1.1 P3 item 3 for one transaction, with `worlds` at the basis
   before the transaction and `writes` the `(entity, attribute)` pairs the transaction asserts or retracts.
2. **Before-only is enough.** Every rule-relevant reference attribute (`S.location`, `S.documents`, `S.decisions` and
   `L.jurisdiction`) is in the read set of some rule in all three releases. A transaction that changes which entity a subject
   reaches therefore writes a pair already in that subject's dependencies (re-pointing a location's jurisdiction marks every
   placement at the location, case C60), so the dependencies before the transaction catch every subject the after-state would add.
3. **Direct writes are included, ballast excepted.** Every placement, document and decision attribute other than ballast is in some
   read set in all three releases, so a write to a subject's rule-relevant facts always affects it. A ballast write affects nobody
   (case C57).
4. **Two hops.** A write to a jurisdiction's `stateMinWageCents` affects every placement at every location that references that
   jurisdiction, under every release (cases C58 and C59).
5. **The release matters.** Under R1 a write to `localMinWageCents` affects no one; under R2 and R3 it affects every placement at
   that location (cases C35 and C36). The depth-two pair `(J, stateMinWageCents)` is read under every release, the depth-one pair
   `(L, localMinWageCents)` only from R2 on.
6. **No valid-time filtering.** A correction to a past valid-time range still marks the subject; whether its current output changed
   is left to the re-run (RULINGS Q36e).
7. **The subjects a scoped release reaches (RULINGS Q44b).** The subjects R3 can change against R2 are those in its `OT` scope:
   `affected(R3, worlds, [[J, "stateMinWageCents"] for each listed J])` (case C87). A subject is in the scope exactly when its
   dependencies hold `(J, stateMinWageCents)` for a listed J, because every release's `MINWAGE` reads `J.stateMinWageCents` through
   `L.jurisdiction`, so a store finds the reached subjects through its reverse two-hop index (J, then the locations that reference
   it, then the placements at those locations). A subject outside the scope gets R2's `OT` params under R3, so its domain
   projection (12.1) cannot change. A write that moves a subject into or out of the scope writes `(S, location)` or
   `(L, jurisdiction)`, pairs the moved subjects already depend on, so item 2 still holds.

## 11. Golden cases

### 11.1 File format

```
{
  "id": "C01", "slug": "...", "title": "...", "op": "evaluate" | "reconcile" | "affected" | "publish" | "receive",
  "checks": [{"rule": <rule id>, "polarity": "positive" | "negative"}, ...],
  "identicalTo": <case id>      (optional: the expected bytes equal that case's),
  "synthetic": true             (optional: see below),
  "notes": [<derivation step>, ...],
  "input": {...}                or "inputBase64": "<base64 of the input bytes>",
  "expected": {...}
}
```

**A conforming implementation** runs `op` on `input` and produces bytes equal to `canonicalJson(expected)`. `notes` are the hand
derivation. A positive check means the rule emits at least one task, obligation, work item or flag in that case; a negative check
means it emits none. The expected outputs were derived by hand from this file, not by a program.

**The input is the bytes as written.** A harness hands the implementation the `input` value's bytes as they stand in the case
file, so tokens such as `-0`, `1.65e3`, raw UTF-8 and C66's duplicate key arrive unchanged; a parse and re-serialize would
rewrite them. Three more case forms exist from W0-1.1.2 on:
- **`inputBase64`** replaces `input` when the input is not a JSON text, so a case file cannot hold it: a byte order mark (C91),
  bytes that are not UTF-8 (C92) and a `NaN` token (C128). The input is the decoded bytes.
- **`synthetic: true`** marks a `publish` or `receive` case whose records `evaluate` never produces (readings A07 to A09, A14 and
  A15: cases C100 to C102 and C133 to C136). Its ids and versions are not hashes of anything, and its input states may be out of
  order or inconsistent on purpose. `validate.py` checks its shapes and output order only.
- **`expected-sha256.json`** gives, for every case, the SHA-256 of `canonicalJson(expected)` as this file defines it. A harness
  compares the SHA-256 of the implementation's output bytes with that entry instead of re-serializing `expected` with the
  implementation's own writer, so a writer defect shared by both cannot pass (V-D01c N1). `validate.py` recomputes every entry.

### 11.2 The 136 cases

| Id | Op, release | What it pins down |
| --- | --- | --- |
| C01 | evaluate R1 | a complete placement: every rule quiet, pay exactly at the floor, 2,400 minutes is not overtime |
| C02 | evaluate R2 | C01 under R2: same outputs, new hash, `localMinWageCents` joins the dependencies, absent local floor falls back to state |
| C03 | evaluate R1 | a new hire before the start date: pre-start flag, start obligation, Section 1, Section 2 and E-Verify tasks with due obligations, a background-check order |
| C04 | evaluate R1 | C03 after the start date moved a week: every due time and boundary moves, the order keeps its work item id and version |
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
| C19 | evaluate R1 | an `ead` and a `visa` expiring 2027-01-15 (two window obligations at 2027-01-16 midnight), no background check yet, pay 1600 below the 1650 state floor (two work items) |
| C20 | evaluate R2 | C19 under R2 (preview): the `ead` task opens 90 days early, the `visa` is unchanged; `bgc.order` keeps its id and payload (nothing to publish); the pay notice keeps its id with floor 1700 (a new version) |
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
| C34 | affected R1 | a state minimum-wage change at `jur:ny`: both placements at `loc:nyc`, no others |
| C35 | affected R1 | a local minimum-wage change at `loc:nyc` under R1: nobody |
| C36 | affected R2 | the same write under R2: both placements at `loc:nyc` |
| C37 | evaluate R1 | `weeklyMinutes` 10081: `W0.E_VALUE` |
| C38 | evaluate R1 | `payRateCents` written as `1650.0`: `W0.E_VALUE` |
| C39 | evaluate R1 | `payRateCents` 9007199254740992 (2^53): `W0.E_VALUE` |
| C40 | evaluate R1 | two `startDate` facts: `W0.E_CARDINALITY` |
| C41 | evaluate R1 | a fact committed after the basis: `W0.E_BASIS` |
| C42 | evaluate R1 | one evaluation with five work items (E-Verify submission, background-check order, expired document, pay below the floor, pay change needing approval) |
| C43 | evaluate R1 | two violations: the first fact's `tx` is after the basis, the second fact's date is invalid; the first failing fact decides: `W0.E_BASIS` |
| C44 | evaluate R1 | the only violation is an invalid date on an unreachable document: every fact is validated, `W0.E_VALUE` |
| C45 | evaluate R1 | a fact's `tx` written as `3.0`: `W0.E_SHAPE` |
| C46 | evaluate R1 | `PROP` against an older counting decision (pending) and an equal-position one (resolved) |
| C47 | evaluate R1 | a pay change rejected after the change: `pay.change-rejected` |
| C48 | evaluate R1 | no location: `pay.location-missing` |
| C49 | evaluate R1 | E-Verify `tnc` without `everifyStatusAt`: null due time and `{dueAt: null}` payload |
| C50 | evaluate R1 | E-Verify submission without a start date: `{startDate: null}` payload |
| C51 | evaluate R2 | the basis exactly at the `ead`'s R2 window start: the task opens |
| C52 | evaluate R1 | runtime outcome `accepted`: no new submission |
| C53 | evaluate R1 | runtime outcome `rejected`: `everify.submit-rejected` |
| C54 | evaluate R3 | inside R3's scope (`jur:j010`), 2,700 weekly minutes: no overtime; `OT` inputs include the location facts |
| C55 | evaluate R3 | inside R3's scope, 2,701 weekly minutes: overtime |
| C56 | evaluate R1 | C01's world plus ballast chains: identical bytes to C01 |
| C57 | affected R1 | a ballast write affects nobody |
| C58 | affected R1 | a jurisdiction floor write reaches placements at two locations (two hops) |
| C59 | affected R2 | the same write under R2: the same set |
| C60 | affected R1 | re-pointing a location's jurisdiction affects the placements at that location |
| C61 | reconcile | two activations with the same `from`: the greater `tx` wins |
| C62 | evaluate R1 | another placement's entity: `W0.E_UNKNOWN` |
| C63 | evaluate R1 | an attribute outside the schema: `W0.E_UNKNOWN` |
| C64 | evaluate R1 | an erased marker on a non-PII attribute: `W0.E_VALUE` |
| C65 | reconcile | an activation release that is not a hash: `W0.E_VALUE` |
| C66 | evaluate R1 | a duplicate key inside a fact's `v`: `W0.E_SHAPE` |
| C67 | affected R1 | two worlds for one subject: `W0.E_SHAPE` |
| C68 | evaluate R1 | `payRateCents` written as `1.65e3`: `W0.E_VALUE` |
| C69 | evaluate R1 | `payRateCents` -1: `W0.E_VALUE` |
| C70 | evaluate R1 | `payRateCents` written as `"1650"`: `W0.E_VALUE` |
| C71 | evaluate R1 | `basis.tx` written as `10.0`: `W0.E_SHAPE` |
| C72 | reconcile | an activation's `tx` written as `9.0`: `W0.E_SHAPE` |
| C73 | publish | rollback R1, R2, R1: pay notice sequences 1, 2, 3 (floors 1650, 1700, 1650) |
| C74 | publish | a correction and its revert: sequences 1, 2, 3 |
| C75 | publish | crash before delivery: pending deliveries keep `(id, seq)`, the re-evaluation publishes nothing |
| C76 | publish | an activation that changes no payload, during recovery: nothing published |
| C77 | publish | a newer-basis R2 record then an older-basis R1 record: the older one publishes nothing |
| C78 | publish | an FNC notice retired and then reappearing: delivered again with the next sequence |
| C79 | receive | reversed arrival: the projection ends on seq 2; effects process 1 then 2 |
| C80 | receive | a gap: effects stop at seq 1 while seq 3 waits |
| C81 | receive | restart mid-sequence: the missing seq 2 releases seq 3; a duplicate seq 1 is ignored |
| C82 | publish | an unchanged evaluation at a newer basis advances the guard, so a later older-basis record publishes nothing |
| C83 | receive | arrivals 1, 1, 3, 3, 2 from an empty receiver: projection applies 1 and 3, effects process 1, 2, 3 once each |
| C84 | publish | a state without `pending`: `W0.E_SHAPE` |
| C85 | receive | a delivery with `seq` 0: `W0.E_SHAPE` |
| C86 | evaluate R3 | outside R3's scope (`jur:ny`), 2,700 weekly minutes: still overtime under R3 |
| C87 | affected R3 | the subjects R3 reaches: placements at two locations of a listed jurisdiction, not the unlisted or unlocated ones |
| C88 | evaluate R1 | an erased marker on a non-PII instant: `W0.E_VALUE` (V-D01c P01) |
| C89 | evaluate R1 | an array as a `startDate`: `W0.E_VALUE` (P02) |
| C90 | evaluate R1 | `payRateCents` as a 5,000-digit token: `W0.E_VALUE` (P03, A12) |
| C91 | evaluate, bytes | a byte order mark before the input: `W0.E_SHAPE` (P04, A01) |
| C92 | evaluate, bytes | a 0xFF byte inside a string: `W0.E_SHAPE` (P05, A01) |
| C93 | evaluate R1 | `payRateCents` written `-0` is 0, written `0` (P06, A02) |
| C94 | evaluate R1 | a fact `tx` written `-0` is 0: `W0.E_BASIS` (P07, A02) |
| C95 | evaluate R1 | an unknown attribute after a duplicate: `W0.E_UNKNOWN` (P08, A03) |
| C96 | affected R1 | world by world: world 1's clash before world 2's bad subject (P09, A04) |
| C97 | reconcile | within one activation, value before basis: `W0.E_VALUE` (P10, A05) |
| C98 | reconcile | the world before the activations: `W0.E_VALUE` (P11, A05) |
| C99 | reconcile | a picked unknown hash: `W0.E_NO_RELEASE`, no fall-back (P12, A06) |
| C100 | publish, synthetic | opaque payload tokens: `1.65e3` kept and unequal to `1650`, `-0` written `0`, non-ASCII escaped (P13, A07) |
| C101 | publish, synthetic | an input state out of order with repeats: later entries win, outputs re-sorted (P14, A08) |
| C102 | publish, synthetic | two work items with one id in a record: stable order (P15, A09) |
| C103 | reconcile | equal `from`: the greater `tx` wins over the greater release string; C02's bytes (P16) |
| C104 | reconcile | equal `from` and `tx`: the greater release string; C01's bytes (P17) |
| C105 | reconcile | `from` equal to the valid time is in force; C01's bytes (P18) |
| C106 | reconcile | an activation at `tx` = `basis.tx`; C01's bytes (P19) |
| C107 | evaluate R1 | a fact at `tx` = `basis.tx` (P20) |
| C108 | evaluate R1 | `basis.tx` 0 and an empty world (P21) |
| C109 | evaluate R1 | `basis.tx` 2^53 - 1 (P22) |
| C110 | evaluate R1 | `basis.tx` 2^53: `W0.E_BASIS` (P23) |
| C111 | evaluate R1 | a fact `tx` of 2^53 + 1: `W0.E_BASIS` (P24) |
| C112 | evaluate R1 | one fact with a bad date and a late `tx`: `W0.E_VALUE` (P25) |
| C113 | evaluate R2 | a local floor below the state floor: the greater floor applies (P26) |
| C114 | evaluate R1 | `pos(D)` counts the subject's `decisions` fact: a fresh pay-change approval (P27) |
| C115 | evaluate R1 | an incomplete Section 2 record never counts (P28) |
| C116 | evaluate R1 | `PROP` uses the latest proposal (P29) |
| C117 | evaluate R1 | `reverified: false` is not reverified (P30) |
| C118 | evaluate R3 | a listed jurisdiction with no facts is in R3's scope (P31, V-D01 N1) |
| C119 | evaluate R1 | the basis at the start instant: no pre-start (P32) |
| C120 | evaluate R1 | a dashed SSN before an accepted submit result (P33) |
| C121 | affected R1 | worlds in descending order; C34's bytes (P34) |
| C122 | publish | an equal `tx` with an earlier `validTime` is skipped (P35) |
| C123 | publish | a second record at an equal basis is applied (P36) |
| C124 | publish | retirement touches only the record's subject (P37) |
| C125 | receive | arrivals 1, 4, 3, 2: seq 2 releases two waiting deliveries (P38) |
| C126 | evaluate R1 | a Saturday start: Section 2 due Wednesday's end (P39) |
| C127 | evaluate R1 | C19's facts reversed; C19's bytes (P40) |
| C128 | evaluate, bytes | `NaN` as a value: `W0.E_SHAPE` (A11) |
| C129 | evaluate R1 | `basis.tx` as a 5,000-digit token: `W0.E_BASIS` (A12) |
| C130 | publish | a stored `seq` of 5,000 nines publishes 10^5000 (A12) |
| C131 | receive | a receiver at `done` 5,000 nines processes 10^5000 (A12) |
| C132 | evaluate R1 | 2,000 nested arrays as a value: `W0.E_VALUE` (A13) |
| C133 | publish, synthetic | code point order for ids, subjects, payload keys and the guard's `validTime` (A14) |
| C134 | receive, synthetic | code point order for effects and projection (A14) |
| C135 | receive, synthetic | an inconsistent receiver snapshot kept as given (A15, A08) |
| C136 | publish, synthetic | the writer for opaque strings, numbers and array-index keys (A07) |

### 11.3 Scenario map

| Golden scenario | Where W0 covers it |
| --- | --- |
| GS.02 form submit, next task visible | `I9S1` and `I9S2` tasks (C03, C01) |
| GS.03 E-Verify webhook storm | `EVSTAT`; the store supersedes stale revisions before W0 sees them |
| GS.05 background-check burst | `BGC` (C12, C13) |
| GS.06b shared location wage change | `MINWAGE` and `affected` at one and two hops (C23, C34 to C36, C58 to C60) |
| GS.07 two reviewers, one I-9 | `final` in 6.2 (C17, C18) |
| GS.09 start dates move | `LIFE` and every start-based due time (C03, C04) |
| GS.10 and GS.11 activation and preview | `reconcile` against `evaluate` (C20, C31, C32, C61, C103 to C106); `publish` of the activated sweep (C73, C76, C77, C82) |
| P5 narrow release | R3's scope: the reached subjects (C87), inside and outside the scope (C54, C55, C86, C118) |
| GS.19b outbox and receiver | `publish` and `receive` (C73 to C85, C100 to C102, C122 to C125, C130, C131, C133 to C136) |
| GS.16 PII erasure | erased markers (C07) |
| GS.17 agent proposals churn | `PROP` and proposal isolation (C14 to C16) |
| GS.18 overdue I-9 dashboards | task `overdue` (C06) |
| GS.20 midnight expiry wave | `DOCEXP` boundaries (C19 to C21) |

## 12. Workload coverage: the seeded sweep population and its frozen floors

**A sweep of mostly no-op evaluations must not pass P5** (`lab/TARGETS.md` 6.1 item 6, RULINGS Q31i and Q36g). W0 therefore fixes
the population the P5 sweep and the release scenarios run on, states four floors that population must meet, and fixes the size and
depth of every generated world to P4's pull buckets (RULINGS Q40a). The generator parameters and the floors are frozen with the rest
of W0 and are reviewed independently before W0's hashes are pinned. Expected values here come from argument over the parameters and
from the golden cases; no evaluator is part of W0.

### 12.1 Terms

1. **In-scope subjects** (the TARGETS 6.1 item 6 term) are every placement of the generated population. This is not R3's release
   scope (5.1), which this section calls **the subjects R3 reaches**: the placements whose location's jurisdiction R3 lists.
2. **A rule fires for a subject** (under one release, at one basis) when it emits at least one task, obligation (including the
   `due` obligations of its own tasks), work item or flag.
3. **The domain projection of an output** is its `tasks`, `obligations` and `flags` arrays plus the set of `(rule, kind, key, payload)`
   of its work items. It leaves out `release`, work item versions and `inputs`, `trace` and `dependencies`, because those change
   with the release by construction. It keeps the payload, because a changed payload is a newly published sequence (8.8).
4. **A release changes subject s** when the domain projections of `evaluate(world_s, A, B)` and `evaluate(world_s, A', B)` differ,
   at the same basis B.
5. **Affected and changed are counted separately for R3 (RULINGS Q44b).** The affected subjects are the subjects R3 reaches
   (section 10 item 7): the sweep re-runs `OT` for each of them. The changed subjects are the affected subjects R3 changes. Every
   changed subject is affected; an affected subject whose weekly minutes are not 2,401 to 2,700 is re-run and does not change.

### 12.2 The four floors and the expected values at the 100k rung

| # | Floor (TARGETS 6.1 item 6) | Expected under W0-1.1.1 | Measured by V-D01 on W0-1.1.0 | Argument |
| --- | --- | --- | --- | --- |
| 1 | R2 changes at least 20% of in-scope subjects | 62.3% (I9S2 46.1%, DOCEXP 22.5%, MINWAGE 9.8%) | 62.293% | 12.4 item 1 |
| 2 | every rule fires for at least 5% of subjects, under R1, R2 and R3 | lowest is `MINWAGE` under R1 at 7.9% | 7.810% | 12.4 item 2 |
| 3 | work-location fanout is a seeded Zipf with s = 0.5 over 2,000 locations (Q36g) | largest location about 1,125 placements, mean 49.5 | largest 1,100, mean 49.54 | 12.5 |
| 4 | at least 1% of evaluations produce three or more work items | 1.65% under R1, 2.52% under R2 and R3 | 1.567% under R1, 2.459% under R2 and R3 | 12.4 item 3 |

1. **W0-1.1.1 changes no floor's measured value except `OT` under R3.** Floors 1, 3 and 4 do not involve R3's `OT` (it emits no
   work item), and the generator and R1 and R2 are unchanged, so V-D01's W0-1.1.0 measurements stand. Floor 2's lowest rule is
   `MINWAGE` under R1; scoping R3 raises `OT`'s R3 share from 12.8% to 16.6% (12.4).
2. **Floor 4 is the closest to its bar:** measured on W0-1.1.0 at 1.567% under R1 and 2.459% under R2 and R3, 0.57 points above the
   1% bar under R1. It fell from W0-1.0.0's 1.890% and 2.928% because a placement whose E-Verify submission the runtime reports as
   accepted no longer gets an `everify.submit-case` work item. The measured values sit 5.0% and 2.4% below the expected 1.65% and
   2.52%.
3. **The narrow release R3** is not a floor. Against R2 it reaches about 9,556 subjects (9.6%) and changes about 406 (0.41%), all
   through `OT` (12.1 item 5, 12.4 item 4). Measured on W0-1.1.1 (V-D01, O-DOMAIN and the TypeScript kernel agree): 9,497
   reached, 418 changed, 0 changed without being reached. Unscoped, as in W0-1.1.0, it reached all 100,000 and changed 4,291.

The expected values are means over the seeded draws. At N = 100,000 the standard error of each share is under 0.2 percentage points.
**The check that counts is the measured one** (12.7): the floors are judged on the actual population.

### 12.3 The population generator (parameters only)

**Sizes.** The 100k rung is the frozen reference: N = 100,000 placements, L = 2,000 locations and K = 100 jurisdictions. Every
rung uses L = N / 50 (RULINGS Q36h) and K = 4 x ceil(L / 80) (RULINGS Q44a), which keeps K a multiple of 4 and near L / 20: K is
12 at the 10k rung, 100 at 100k, 1,000 at 1m and 10,000 at 10m. Every other parameter is the same at every rung, and every formula
below uses L and K.

**Seed and draws.** The seed is the string `W0-pop-1`. For a field name f, a subject index i and a modulus M, `draw(f, i, M)` is
the first 8 bytes of SHA-256 over the ASCII bytes of `W0-pop-1/` + f + `/` + decimal(i), read as a big-endian unsigned integer,
modulo M. Every random choice uses its own field name, listed in the table below (RULINGS Q40g), so all choices are independent.

- **Weighted choice** over weights in basis points (summing to 10,000): `x = draw(f, i, 10000)`; pick the first option whose running
  total of weights exceeds x.
- **Uniform integer** in `[a, b]`: `a + draw(f, i, b - a + 1)`.
- **Zipf rank** over L locations with s = 0.5: weights `w_r = isqrt(10^24 div r)` for r = 1 to L, which is `floor(10^12 / sqrt(r))`;
  total T; `x = draw("loc.rank", i, T)`; the rank is the first r whose running total of weights exceeds x. `div` is integer division
  and `isqrt(m)` is the largest integer n with n x n <= m; both are exact with Python integers or JavaScript BigInt.

**Ids.** Placement i (0-based) is `pl:s` + i as 8 decimal digits. Location rank r is `loc:l` + r zero-padded to the number of digits
of L (`loc:l0001` is the largest at the 100k rung). Jurisdiction q is `jur:j` + q zero-padded to the number of digits of K, and to
at least 3 digits (`jur:j001` to `jur:j100` at the 100k rung, `jur:j001` to `jur:j012` at 10k). R3's scope therefore names
`jur:j010` to `jur:j100` at the 100k rung (10 of 100 jurisdictions) and `jur:j010` alone at 10k (1 of 12); at the 1m and 10m rungs
the ids have 4 and 5 digits, so R3 reaches no subject there. The P5 sweep runs at the 100k rung. A placement's only document is `<S>/doc:1`; its decision records are `<S>/dec:i1` and `<S>/dec:i2`
(target `i9.section2`), `<S>/dec:b1` (target `bgc.adjudication`) and `<S>/dec:p1` (target `pay.change`); its answers are
`<S>/ans:1` to `<S>/ans:n`.

**Jurisdictions and locations (RULINGS Q40b).** Jurisdiction q has `stateMinWageCents` 1200, 1500, 1650 or 1800 when q mod 4 is 0,
1, 2 or 3. Location rank r has `jurisdiction` = jurisdiction ((r - 1) mod K) + 1, and `localMinWageCents` 1850 exactly when
r mod 4 = 2. Because K is a multiple of 4 at every rung, a location's jurisdiction q satisfies q mod 4 = r mod 4, so every location
keeps the state floor W0-1.0.0 put on the location itself, and every local-floor location has state floor 1650. At the 100k rung
each jurisdiction serves L / K = 20 locations; where K does not divide L (the 10k rung), the first L mod K jurisdictions serve one
location more than the rest.

**Basis and valid time.** `validTime = 2026-11-04T12:00:00.000000Z` (the basis date 2026-11-04 is a Wednesday); `tx` is the position
of the last population command. Every population fact is valid from `2000-01-01T00:00:00.000000Z` with no end, except the scheduled
raise below, which is valid only from `2026-11-16T00:00:00.000000Z` and so is not in any world at B (RULINGS Q40i).

**Per-placement choices.**

| Choice | Fields | Options (weights in basis points) | Facts written |
| --- | --- | --- | --- |
| Start date | `start`, `start.u` | absent 200; pre-start 1800 (k uniform 1 to 14); in the Section 2 window 2000 (k uniform -4 to 0); settled 6000 (k uniform -365 to -5) | `startDate = addDays(2026-11-04, k)` |
| Section 1 | `s1` | present 8500; absent 1500 | `section1AttestedAt = 2026-11-01T15:00:00.000000Z` |
| SSN | `ssn` | absent 1000; valid 8730; dashed 180; erased 90 | valid: the 9 digits of 100000000 + i; dashed: the same digits as `DDD-DD-DDDD`; erased: `{"erasedAt": "2026-11-01T00:00:00.000000Z"}` |
| E-Verify status | `ev`, `ev.u` | absent 3000; `pending` 4000; `tnc` 500; `authorized` 2200; `fnc` 300 | `everifyStatus`; with it `everifyStatusAt = startOf(addDays(2026-11-04, -u))`, u uniform 0 to 20 |
| Runtime submit result | `evres`, only when the status is absent and the SSN draw is the `valid` option (not `dashed`, `erased` or `absent`; RULINGS Q53a, A10) | `accepted` 2000; `rejected` 500; absent 7500 | `everifySubmitResult`, written by the runtime writer class |
| Background check | `bgc` | absent 2000; `pending` 2000; `clear` 5000; `consider` 1000 | `bgcStatus` |
| Adjudication record | `bgcdec`, only when `consider` | none 4000; person approve 4000; person reject 1000; agent proposal (verdict approve) 1000 | record `dec:b1` |
| Section 2 records | `i9dec` | none 3400; person approve 4800; person waive 300; person reject 400; agent proposal only (verdict approve) 600; person approve then person reject 300; person approve then agent proposal (verdict reject) 200 | records `dec:i1`, then `dec:i2` for the two-record options |
| Location | `loc`, `loc.rank` | absent 100; present 9900 (rank by Zipf) | `location` |
| Pay | `pay`, `pay.d`, `pay.d.u` | absent 100; present 9900, with d: -1 600; 0 1000; uniform 1 to 199 2400; uniform 200 to 2000 6000 | `payRateCents` = the state floor of the location's jurisdiction + d, using 1650 without a location |
| Pay change | `chg`, `chg.u`, only when pay is present | c = 0 8000; uniform 1 to 500 600; uniform 501 to 1000 1000; uniform -1000 to -501 400 | `baselinePayRateCents = payRateCents - c` |
| Pay-change record | `chgdec`, only when abs(c) > 500 | none 5500; person approve after the change 3000; person approve before the change 500; person reject after the change 500; agent proposal (verdict approve) after the change 500 | record `dec:p1` |
| Scheduled raise | `fut`, only when pay is present | scheduled 200; none 9800 | a later `payRateCents` = pay + 100, valid from 2026-11-16T00:00:00.000000Z |
| Weekly minutes | `wm`, `wm.u` | absent 500; uniform 600 to 2400 7800; uniform 2401 to 3600 1700 | `weeklyMinutes` |
| Document | `doc` | none 500; `passport` 5000; `ead` 3000; `visa` 1500 | `documents = <S>/doc:1` and its `docType` |
| Tracked expiry | `doc.exp`, `doc.exp.u`, `ead` and `visa` only | missing 200; expired 1470 (e uniform -30 to -1); inside 90 days 2450 (e uniform 0 to 89); later 5880 (e uniform 90 to 730) | `expiresOn = addDays(2026-11-04, e)` |
| Passport expiry | `doc.pexp.u`, passport only | e uniform 365 to 3650 | `expiresOn = addDays(2026-11-04, e)` |
| Reverified | `doc.rev`, `ead` and `visa` only | true 1000; absent 9000 | `reverified = true` |
| World size | `size`, `size.u` | 50 to 200 facts 5000; 201 to 800 facts 3500; 801 to 2,000 facts 1500 (target T uniform in the bucket) | ballast, below |
| Hop depth | `hops` | 3 hops 4000; 4 hops 3500; 6 hops 2500 | ballast chain length h |

**Ballast (RULINGS Q40a).** Let F be the number of W0 facts in the placement's world at B: its own facts, its documents' and
decisions' facts, its location's facts and its jurisdiction's facts. The placement gets n = floor((T - F) / 3) answers, arranged in
chains of h answers: chain c holds answers (c - 1) x h + 1 to min(c x h, n); the placement's `answers` names each chain's first
answer; every answer except a chain's last has `next` naming the following answer; answer k has `field` "q<k>" and `value` "a<k>".
Each answer adds exactly 3 facts, so the world holds F + 3n facts, which is between T - 2 and T (F is at most about 35, below every
bucket's lower bound). The deepest answer is h hops from the placement, matching P4's hop mix (3: 40%, 4: 35%, 6: 25%); the
rule-relevant chain placement, location, jurisdiction is 2 hops.

**Command plan.** Each command is one transaction. Within one placement the commands keep this order, which fixes every
commit-order relation the rules use. A command with no facts is skipped and takes no position.

1. Jurisdiction: one command per jurisdiction, then location: one command per location (`jurisdiction` and any local floor).
2. Hire: `startDate`, `location`, `baselinePayRateCents`, `payRateCents` equal to the baseline, `weeklyMinutes` (those present).
3. Section 1: `section1AttestedAt`, `ssn`.
4. Background check: `bgcStatus`.
5. E-Verify: `everifyStatus`, `everifyStatusAt`.
6. Runtime outcome: `everifySubmitResult` (the runtime writer class, after it performed the submission work item).
7. Documents: `documents` and the document's facts.
8. Decision records, each in its own command that asserts the subject's `decisions` fact and the record's three facts together:
   the Section 2 records in option order, then `dec:b1`, then a pay-change record drawn "before the change".
9. When c ≠ 0, the pay change: `payRateCents` re-asserted at its final value.
10. A pay-change record drawn "after the change".
11. Ballast: one command per answer chain (its `answers` fact and its answers' facts, 3 to 18 facts).
12. The scheduled raise, valid from 2026-11-16.

**Reference positions (RULINGS Q40f).** Positions are dense from 1: jurisdiction q's command has position q, location r's has
K + r, then placement 0's commands in plan order, then placement 1's, and so on; `basis.tx` is the last position. A driver may
interleave placements differently (the background trace does). Domain projections do not change, but `inputs`, work item versions
and `basis.tx` match byte for byte only under the reference positions.

### 12.4 Expected rule frequencies (the argument for floors 1, 2 and 4)

All choices are independent, so each frequency is a product of the weights above. "Located with pay" is 0.99 x 0.99 = 0.9801.

| Rule | Fires when | R1 | R2 | R3 |
| --- | --- | --- | --- | --- |
| `LIFE` | start absent (2%) or pre-start (18%) | 20.0% | 20.0% | 20.0% |
| `I9S1` | not (Section 1 present 85% and SSN present 90%) | 23.5% | 23.5% | 23.5% |
| `I9S2` | Section 2 options none, waive, reject, proposal only, approve then reject: 34 + 3 + 4 + 6 + 3 | 50.0% | 50.0% | 50.0% |
| `EVSUB` | status absent (30%), except an accepted submission (30% x 87.3% x 20%) | 24.8% | 24.8% | 24.8% |
| `EVSTAT` | `tnc`, `authorized` or `fnc`: 5 + 22 + 3 | 30.0% | 30.0% | 30.0% |
| `BGC` | absent (20%), or `consider` (10%) with none, reject or proposal only (60%) | 26.0% | 26.0% | 26.0% |
| `DOCEXP` | a tracked document (`ead` or `visa`, 45%) not reverified (90%) | 40.5% | 40.5% | 40.5% |
| `MINWAGE` | pay absent (1%), location absent (0.99%), d = -1 (0.9801 x 6%); from R2 on also a local-floor location (25.1%) with d from 0 to 199 (34%) | 7.9% | 16.2% | 16.2% |
| `OT` | weekly minutes above the threshold: 2,401 to 3,600 under R1, R2 and outside R3's scope; 2,701 to 3,600 inside R3's scope (9.6% of subjects) | 17.0% | 17.0% | 16.6% |
| `PAYCHG` | pay present (99%), abs(c) > 500 (14%), and no fresh approve (70%: none, stale approve, reject, proposal) | 9.7% | 9.7% | 9.7% |
| `PROP` | a pending proposal: Section 2 (6% + 2%), background check (10% x 10%), pay change (0.99 x 14% x 5%) | 9.6% | 9.6% | 9.6% |

1. **Floor 1, R2 changes at least 20%.** Three independent sources change the domain projection:
   - `I9S2`: every placement with a start date (98%) and an open Section 2 task (none, reject, proposal only, approve then reject:
     47%) gets a due time one business day earlier, since `addBusinessDays(d, 2) ≠ addBusinessDays(d, 3)` for every d. Share 46.1%.
   - `DOCEXP`: every `ead` (30%) not reverified (90%) with an expiry date that has not passed (83.3%) moves its window obligation from
     `B` to `B` minus 90 days, or opens its reverification task early. Share 22.5%. An expired `ead` gives row 6 under both releases.
   - `MINWAGE`: a located placement with pay (0.9801) at a local-floor location (25.1%) with d from -1 to 199 (40%). With d from 0 to
     199 it falls below the local floor; with d = -1 it was already below the state floor and its notice payload's floor moves from
     1650 to 1850. Share 9.8%.
   - Union: 1 - (1 - 0.461) x (1 - 0.225) x (1 - 0.098) = **62.3%**.
2. **Floor 2, every rule fires for at least 5%.** The table above: the lowest is `MINWAGE` under R1 at 7.9%; under R3 the lowest is
   `PROP` at 9.6%.
3. **Floor 4, three or more work items in at least 1% of evaluations.** Five work item sources exist, at most one each, independent
   except that the pay-below-floor and pay-change sources both need a pay rate (the values below take that into account):
   - E-Verify, `EVSUB` row 7 or `EVSTAT` rows 2 and 4: 30% x 87.3% x 75% + 8% = 27.6%.
   - Background check, `BGC` rows 1 and 4: 20% + 10% x 10% = 21.0%.
   - Pay below the floor, `MINWAGE` row 5: 5.9% under R1, 14.2% under R2.
   - Pay change approval, `PAYCHG` row 5: 0.99 x 14% x 65% = 9.0%.
   - Expired document, `DOCEXP` row 6: 45% x 90% x 14.7% = 6.0%.
   - P(at least three of five): **1.65% under R1** and **2.52% under R2**. Up to five work items occur in one evaluation (case C42).
4. **R3 against R2 (the narrow release, RULINGS Q44b).** The affected and changed subjects are stated separately (12.1 item 5).
   - **Affected: about 9,556 subjects (9.56%).** A placement is reached when it has a location (99%) whose jurisdiction is listed.
     The listed jurisdictions `jur:j010` to `jur:j100` serve the 200 locations r with r mod 10 = 0, which carry 9.653% of the
     Zipf weight T (computed from the integer weights of 12.3), so 99,000 x 0.09653 = 9,556. Per jurisdiction: 12.5.
   - **Changed: about 406 subjects (0.41%).** Inside the scope only `OT` can differ, and it differs for weekly minutes 2,401 to
     2,700, which lose the overtime flag: 17% x 300 / 1,200 = 4.25% of the reached subjects, 9,556 x 0.0425 = 406. The minutes
     draw is independent of the location draws.
   - **Not reached: about 90,444 subjects.** Outside the scope R3's `OT` params equal R2's, so their domain projections cannot
     change; the sweep skips them (5.3) and publishes nothing for them.
   - `OT` fires under R3 for 17% - 0.41% = **16.6%** of subjects (the table above). Under unscoped R3 (W0-1.1.0) every subject was
     reached and 4,291 changed (V-D01).
   - **Measured (RULINGS Q48c, V-D01 N5):** 9,497 reached, 418 changed, 0 changed without being reached; `OT` fires under R3 for
     16.538% (V-D01's delta check of W0-1.1.1, reproduced exactly by O-DOMAIN and the TypeScript kernel). The expected and
     measured counts hold at the 100k rung only (V-D01 N3): R3's ids name one jurisdiction at 10k and none at 1m or 10m (12.3),
     so a narrow-release measurement runs at 100k.

### 12.5 Location and jurisdiction fanout and the GS.06b affected-subject counts

With s = 0.5 over 2,000 locations (RULINGS Q36g), a placement lands at rank r with probability `w_r / T`, about
`(1 / sqrt(r)) / H` with H = 87.994. Located placements number 99,000 in expectation, so location r holds about 1,125 / sqrt(r).

| Location rank | Expected placements | Affected by a write to `(L, jurisdiction)`, every release | Affected by a write to `(L, localMinWageCents)` |
| --- | --- | --- | --- |
| 1 (`loc:l0001`) | 1,125 (1.1% of the population) | 1,125 | none under R1; 1,125 under R2 and R3 |
| 2 | 796 | 796 | none under R1; 796 under R2 and R3 |
| 10 | 356 | 356 | none under R1; 356 under R2 and R3 |
| 100 | 112 | 112 | none under R1; 112 under R2 and R3 |
| 1,000 | 36 | 36 | none under R1; 36 under R2 and R3 |
| 2,000 | 25 | 25 | none under R1; 25 under R2 and R3 |
| mean over the 2,000 locations | 49.5 | 49.5 | none under R1; 49.5 under R2 and R3 |

A jurisdiction serves the 20 locations r with ((r - 1) mod 100) + 1 = q, so a write to its `stateMinWageCents` affects every
placement at those locations, under every release (two hops):

| Jurisdiction | Locations | Expected placements affected by one `stateMinWageCents` write |
| --- | --- | --- |
| `jur:j001` | ranks 1, 101, ..., 1,901 | 1,953 |
| `jur:j002` | ranks 2, 102, ..., 1,902 | 1,623 |
| `jur:j050` | ranks 50, 150, ..., 1,950 | 938 |
| `jur:j100` | ranks 100, 200, ..., 2,000 | 855 |
| mean over the 100 jurisdictions | 20 each | 990 |

**R3's scope** reaches the placements of the ten listed jurisdictions (section 10 item 7):

| Listed jurisdiction | Expected placements reached | Listed jurisdiction | Expected placements reached |
| --- | --- | --- | --- |
| `jur:j010` | 1,174 | `jur:j060` | 916 |
| `jur:j020` | 1,059 | `jur:j070` | 898 |
| `jur:j030` | 1,003 | `jur:j080` | 882 |
| `jur:j040` | 966 | `jur:j090` | 867 |
| `jur:j050` | 938 | `jur:j100` | 855 |
| all ten | **9,556** (the rows, each rounded, sum to 9,558) | changed among them (4.25%) | **406** |

1. **The affected set is exactly the placements reached** (section 10): through `(L, localMinWageCents)` and `(L, jurisdiction)` for
   a location write, and through `(J, stateMinWageCents)` for a jurisdiction write. Cases C34 to C36 and C58 to C60 pin this down,
   and C87 pins the R3 scope's reach.
2. **The local-floor ranks hold 25.1% of the mass:** with the integer weights of 12.3, the ranks with r mod 4 = 0, 1, 2 and 3 carry
   24.6%, 25.5%, 25.1% and 24.8% of T.

### 12.6 Expected world sizes per bucket (RULINGS Q40a)

A world's size is its fact count at B: F + 3n, between T - 2 and T, where T is uniform in the bucket and F (the W0 facts) averages
about 17 (from 6 to about 35; V-D01 measured at most 32). The rounding to a multiple of 3 costs 1 fact on average.

**A world can fall up to 2 facts below its bucket (RULINGS Q44a).** The bucket bounds the target T, not the world: with T at a
bucket's lower bound the world holds T - 2 to T facts, so a world drawn into the 50-to-200 bucket can hold 48 or 49 facts, and one
drawn into the 201-to-800 bucket 199 or 200. A driver that reports per-bucket latency assigns each world to the bucket it was drawn
into (its `size` draw), never by its fact count.

| Bucket (P4 weight) | Target T | Expected world size | Measured by V-D01 on W0-1.1.0 | Expected answers n | Hop depth |
| --- | --- | --- | --- | --- | --- |
| 50 to 200 facts (50%) | uniform 50 to 200 | 124 | 124.0 (50.10% of worlds) | 36 | 3 (40%), 4 (35%) or 6 (25%) in every bucket |
| 201 to 800 facts (35%) | uniform 201 to 800 | 499.5 | 499.6 (34.89%) | 161 | same |
| 801 to 2,000 facts (15%) | uniform 801 to 2,000 | 1,399.5 | 1,392.1 (15.01%) | 461 | same |
| all placements | | 446.8 | 445.4 | 143 | 4.1 on average (measured 4.10) |

A 100k sweep therefore reads about 44.7 million facts (measured 44,537,987; V-D01 F1 asked for 25 to 50 million; W0-1.0.0 read
1.6 million).

### 12.7 How the floors are checked

1. **Measured, not assumed.** Whoever generates the population (the P5 driver, O-DOMAIN, or an independent reviewer) evaluates every
   placement under R1, R2 and R3 at B and reports the four measured floors, R3's affected and changed counts and the per-bucket
   sizes, with the seed `W0-pop-1` and the spec version W0-1.1.2, which together fix the generator. A measured value below its bar
   fails closed. W0-1.1.2 changed no parameter of the generator, the releases or the rules, so W0-1.1.1's measurements stand.
2. **Fingerprint (RULINGS Q40g, Q44a).** The population fingerprint is six values: `basis.tx`, the fact count, the worlds digest and
   the R1, R2 and R3 output digests. It is pinned only after the O-DOMAIN author's independent generator reproduces the reviewer's.
   Every implementation computes it with this recipe, which is V-D01's:
   - **The basis** is `B = {"tx": <the last reference position of 12.3>, "validTime": "2026-11-04T12:00:00.000000Z"}`. The
     scheduled raise takes a position, so it counts toward `basis.tx`, but it is in no world at B.
   - **`world_i`**, for placement i (0-based, `S_i` = `pl:s` + i as 8 digits), is `{"facts": [...], "subject": S_i}`. Its facts are:
     for every one-cardinality pair `(e, a)` the placement's commands assert, the fact of the last assertion in plan order, with that
     command's position as `tx`; every `documents` and `decisions` fact; when the placement has a location of rank r, the facts
     `(loc, jurisdiction, jur, K + r)`, `(loc, localMinWageCents, 1850, K + r)` when r mod 4 = 2, and `(jur, stateMinWageCents,
     floor, q)`; and its ballast facts. The scheduled raise is not among them. The `facts` array is sorted ascending by the
     canonical JSON of each fact, compared as bytes.
   - **`F_i`** is the number of `world_i`'s facts that are not ballast: the world at B without its answers, and without the
     scheduled raise, which is not in the world. It gives n = floor((T - F_i) / 3) in 12.3.
   - **The fact count** is the sum over i of the number of facts in `world_i`.
   - **The worlds digest** is `"sha256:"` + lowercase hex of SHA-256 over `canonicalJson([world_0, world_1, ..., world_(N-1)])`,
     the worlds in placement order. Streamed, that is the bytes `[`, then `canonicalJson(world_0)`, then `,` and
     `canonicalJson(world_i)` for i = 1 to N - 1, then `]`.
   - **The output digest of release R** is the same construction over `canonicalJson(evaluate(world_i, R, B))` for i = 0 to N - 1,
     once each for R1, R2 and R3.
   **The 100k fingerprint** (V-D01's delta check of W0-1.1.1, reproduced exactly by O-DOMAIN and by the TypeScript kernel, and
   unchanged by W0-1.1.2): `basis.tx` 4,338,757; 44,537,987 facts; worlds
   `sha256:fec1d7cedee2b2f18c77e78210e4e9ed14fffb72e9629545155c7307e969c760`; R1
   `sha256:c1b2d410244121d64b476c2f99c32830ea1b1f536928c9d12b0e886132351a79`; R2
   `sha256:551bbbc479eecd15d4f5eb13698f61d20c09a900b7f83a2b10858fb2ba13b562`; R3
   `sha256:a595092272c16343b0dfe9c9db57fbcdd7556fbf8be40afbaed014710fceee2f`.
3. **Golden-case witnesses** for each mechanism:
   - floor 1: C03 against C26 (`I9S2`), C19 against C20 (`DOCEXP`, and the `MINWAGE` notice payload), C25 (`MINWAGE` under R2);
   - floor 2: every rule's positive cases in section 11.2 (`validate.py` requires one positive and one negative per rule);
   - floor 3: C34 to C36 and C58 to C60 for the affected sets at one and two hops;
   - floor 4: C42, one evaluation with five work items;
   - ballast and size: C56 and C57; runtime outcome: C52 and C53;
   - R3: C54 and C55 inside the scope, C86 outside it, C87 for the subjects it reaches.

## 13. Invariants

Implementations and test harnesses can check these on any input, not only the golden cases.

1. **Determinism.** The output is a function of the input bytes; shuffling `facts` changes nothing unless the input is invalid.
2. **Boundary completeness.** With the facts fixed and `v < v2`, the outputs at `v` and at `v2` differ (ignoring the `basis` echo)
   only if some obligation at `v` has `v < boundary <= v2`. Each obligation's boundary does change the output (a task turns
   overdue, a flag ends, a task opens).
3. **Proposal isolation.** Removing every proposal record (and its `decisions` fact) from a world changes only the `PROP` trace
   entries and tasks and the `dependencies` list.
4. **Erasure.** Replacing the SSN with an erased marker changes only `EVSUB`'s row and outputs: row 4 (bad format), 5 (accepted),
   6 (rejected) or 7 (submit) becomes row 3 (erased), and row 1 (a case exists) stays row 1. `I9S1` treats the marker as present.
   No output ever contains a PII value.
5. **Release isolation.** Evaluating under R1 and under R2 can differ only in `release`, work item versions, `dependencies` and the
   outputs (payloads included) and trace entries of `I9S2`, `DOCEXP` and `MINWAGE`; R2 and R3 only in `release`, work item versions
   and `OT`'s outputs and trace entry, and for a subject outside R3's scope only in `release`, work item versions and `OT`'s trace
   inputs. Work item ids never differ.
6. **Ballast neutrality.** Removing every ballast fact from a world changes no output (C56 against C01).
7. **Publication.** Per id, delivered sequences are 1, 2, 3 and so on with no gap and no repeat; a skipped record (older basis)
   changes nothing; the stored basis guard never moves backwards.
8. **Reception.** From a consistent state, per id, the projection's `seq` never decreases, and the effects process every sequence
   exactly once, in order. An inconsistent seeded snapshot is kept as given (8.9, A15).

## 14. Self-review: where two implementers could still differ, and the resolution chosen

| # | Place | Risk | Resolution |
| --- | --- | --- | --- |
| 1 | `1650.0` in a JSON world, `3.0` as a `tx` | `JSON.parse` returns 1650 or 3 and hides the fraction | Integer tokens are checked at the token level for every integer field (section 2, 4.4 step 1); the TypeScript kernel's fixture reader must see number tokens (for example the `JSON.parse` reviver's `context.source` where the runtime has it, or a small scanner). Cases C38, C45, C68, C71 and C72. |
| 2 | Integers above 2^53 - 1 | JavaScript rounds them on parse | In a range-checked field any such token is `W0.E_VALUE` (a value) or `W0.E_BASIS` (a position); in JavaScript it parses to at least 2^53, so `Number.isSafeInteger` detects it. Cases C39, C110, C111. The integers of `publish` and `receive` have no upper bound and need `BigInt` (row 61). |
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
| 19 | Which decisions feed `I9S2`, `BGC`, `PAYCHG` inputs | all decision facts | Only `countingFacts(T)` for the rule's own target, so proposals and other targets never change those work item versions. |
| 20 | Minimum-wage floor with two attributes | first present, or max | The greatest present value; equality passes (C01, C25). |
| 21 | Pay change direction | raise only | Absolute difference, strictly greater than the threshold (C29, C30). |
| 22 | Expiry window arithmetic | off by one day | `W = startOf(addDays(expiresOn, 1 - lead))`; with lead 0, `W = B` (C19, C20). |
| 23 | Activation ties | arbitrary pick | Greatest `from`, then `tx`, then release string (5.4). |
| 24 | Error precedence | per-fact order against one pass per check; which JSON kind failures are `E_SHAPE` | 4.4 lists every key's JSON kind for step 1; in step 3 the first failing fact decides, and within a fact the order is unknown, value, basis (C43). |
| 25 | Key and string ordering | UTF-16 against code points | All W0 strings are printable ASCII, where the orders agree. |
| 26 | Work item id and version preimages | key sets, number forms | The id hashes exactly four keys and the version exactly three, in canonical JSON (8.4); the validator recomputes every golden id and version. |
| 27 | `(epoch, position)` cursors | two integers against one | The adapter passes one order-preserving integer (4.1). |
| 28 | Erasure and old bases | expecting pre-erasure outputs | Reproduction holds modulo erasure (4.2 item 6). |
| 29 | Unreachable entities in a world | validate or skip | Every fact is validated; reachability only decides what the rules read (C44, C24); other placements' entities are `W0.E_UNKNOWN`. |
| 30 | Empty `expected` arrays | omit the key | Every key of 8.1 is always present; empty arrays are written `[]`. |
| 31 | Position integers | two order-preserving mappings give different `inputs` and work item versions | Both implementations use the oracle's dense ordinal (4.1). |
| 32 | Population draws | different hash input, field names, modulo handling or Zipf rounding gives a different population | `draw` is defined to the byte in 12.3, and every field is named in the 12.3 table (Q40g); the modulo bias is part of the definition; Zipf weights are `isqrt(10^24 div r)`. |
| 33 | "Fires" and "R2 changes" | counting trace entries, ids or dependencies as changes | Defined on the domain projection in 12.1. |
| 34 | Duplicate keys in a JSON object | parsers keep the last value; a scanner may reject | `W0.E_SHAPE` (4.4 step 1). |
| 35 | Population positions and valid times | different interleaves give different `inputs` and versions; a store could hide facts valid only later | Reference positions and valid-from 2000-01-01 are fixed in 12.3; other interleaves compare on domain projections only. |
| 36 | `affected` output shape | a bare list against an object | `{"affected": [...]}` (section 10). |
| 37 | Publication after an activation | the version changes with the release hash, so every work item looks new | The outbox compares canonical payload bytes, never versions; an unchanged payload publishes nothing; the delivery key is `(id, seq)` (8.8, RULINGS Q38f, Q40c). |
| 38 | Ballast and other unknown attributes | filter silently, or reject | Ballast is in the schema and read by no rule; any other attribute is `W0.E_UNKNOWN` (C63, Q40a). |
| 39 | The two-hop floor when a reference is missing | instantiate `J` pairs anyway | `J.x` yields no pair without `(L, jurisdiction)`; `(L, jurisdiction)` itself is always read when L exists (6.3, C24, C48). |
| 40 | `publish` with an equal basis | skip, or apply | Apply: equal is not older (8.8 step 1). For consistent records, where one basis gives one record because only live reconciles are published (Q44c), applying and skipping give the same deliveries and state, so no case can tell them apart; C75 shows a re-applied record publishing nothing. |
| 41 | Retired id reappearing with the same payload | compare payloads, so publish nothing | Always publish the next `seq` (C78, Q40h). |
| 42 | The basis guard on records that publish nothing | advance only when publishing | Advance on every applied record (C82, Q42c). |
| 43 | Receiver order, gaps and duplicates | regress the projection, re-apply an equal `seq`, queue a waiting `seq` twice, or apply past a gap | Projection applies only a higher `seq`; effects process in order and wait at a gap; `(id, seq)` duplicates are ignored, whether already processed or already waiting (8.9, C79 to C81, C83). |
| 44 | `receive` processing order within one delivery | effects first, or projection first | Projection step, then effects step, per delivery in array order (8.9). |
| 45 | A scoped rule entry | apply the scoped params to every subject; test the scope on the jurisdiction's facts; leave the location facts out of the inputs | `scope.params` apply exactly when `jur(S)` is listed, by id; everyone else gets the entry's `params`; the scope test adds `S.location` and `L.jurisdiction` to the read set and their facts to the inputs, inside the scope or not (5.1, 6.3, 7.9; C54, C55, C86). |
| 46 | Which subjects R3 reaches | re-run everyone because `OT`'s pair is in every placement's dependencies | The reached subjects are `affected(R3, worlds, [[J, "stateMinWageCents"] for each listed J])`, found through the reverse two-hop index (section 10 item 7, C87); affected and changed counts are separate (12.1 item 5). |
| 47 | Raw numeric tokens in case files | a JSON round trip rewrites `1.65e3` as `1650.0` and the case stops testing the exponent | Case files are written by hand; `validate.py` asserts the raw token text of every numeric-error case (C37 to C39, C45, C68 to C72). |
| 48 | Which evaluations reach `publish`, and when a receiver starts | a preview or a past-valid-time audit passes the tx-first guard and publishes past payloads; a late receiver waits forever for seq 1 | Only live reconciles are published (8.8, Q44c); receivers exist from the first publication or are seeded with a snapshot (8.9, Q44d). |
| 49 | `publish` and `receive` shape errors | default a missing `pending` to empty; treat `seq` 0 as a duplicate | Both are `W0.E_SHAPE` (4.4 step 1; C84, C85). |
| 50 | A01 input bytes | ignore a byte order mark (RFC 8259 8.1 allows it); replace invalid UTF-8 with U+FFFD | The input is one JSON text in UTF-8 with no BOM; anything else is `W0.E_SHAPE` (4.4; C91, C92). A TypeScript reader decodes with `TextDecoder("utf-8", {fatal: true, ignoreBOM: true})` and then rejects a leading U+FEFF. |
| 51 | A02 `-0` | reject it, or keep the sign | An integer token with value 0, written `0` (section 2; C93, C94). |
| 52 | A03 cardinality timing | report a duplicate as soon as it is seen | Sub-step 3.3 runs after every fact passed 3.2 (4.4; C95). |
| 53 | A04 `affected` validation order | check every subject, or every fact, across all worlds first | One world completely, then the next (4.4 step 3; C96). |
| 54 | A05 activation order | activations before the world; `tx` before `release` | After the world, one activation at a time, value before basis (4.4 step 4; C97, C98). |
| 55 | A06 unknown picked hash | fall back to the newest known candidate | `W0.E_NO_RELEASE`, no fall-back (5.4; C99). |
| 56 | A07 opaque values | `JSON.parse` turns `1.65e3` into 1650 and `-0` into 0; `JSON.stringify` writes non-ASCII raw | Section 9 item 7: integers as integers, other number tokens as source text, every character outside U+0020 to U+007E escaped (C100, C136). |
| 57 | A08 repeated or unsorted input state | first entry wins; keep input order | A later entry replaces an earlier one; outputs re-sorted; `pending` keeps order and appends (8.8, 8.9; C101, C135). |
| 58 | A09 two work items with one id in a record | unstable sort; compare both with the old state | Stable id order; the second is compared with the state the first left (8.8 step 2; C102). |
| 59 | A10 the `evres` draw | draw for any present SSN | Only for the `valid` SSN option (12.3); pinned by the fingerprint. |
| 60 | A11 `NaN`, `Infinity`, `-Infinity` | Python's `json` accepts them by default | Not JSON: `W0.E_SHAPE` (4.4; C128). |
| 61 | A12 long integer tokens | CPython's 4,300-digit conversion limit raises; JavaScript rounds | No length limit: range-checked fields give `W0.E_VALUE` or `W0.E_BASIS` (C90, C129); `publish` and `receive` integers are exact at any length (C130, C131). |
| 62 | A13 nesting depth | a recursive parser fails near 1,000 levels (RecursionError) | Any depth is valid JSON; the value is then checked as usual (4.4; C132). |
| 63 | A14 string order | JavaScript's UTF-16 code unit order | Unicode code point order, equal to UTF-8 byte order, for keys, ids, subjects and the guard's `validTime` (8.7; C133, C134). |
| 64 | A15 inconsistent receiver snapshot | repair it; drop entries at or below `done`; release both duplicates | Kept as given, re-sorted stably by `seq`; only `seq` = `done` + 1 releases (8.9; C135). |
| 65 | A harness that re-serializes `expected` | a writer defect shared by implementation and harness passes | Compare the output's SHA-256 with `expected-sha256.json` (11.1; V-D01c N1). |

## 15. Decided questions (RULINGS Q36, Q38f, Q40, Q42b, Q42c, Q44, Q48c, Q53 and Q57)

Every open question of the first draft has a ruling. None remains open.

1. **Work item identity (Q36a).** The id covers `(subject, rule, kind, key)` only; a separate version covers the release hash, the
   input positions and the payload; an unchanged payload publishes nothing. Implemented in 8.4. Q36a also made `(id, version)` the
   delivery key; Q38f replaced that with `(id, seq)` (item 9).
2. **Time model (Q36b).** Due times at midnight UTC with no holidays stay. This is a known simplification of a synthetic world; real
   deadlines run in the work location's time zone and skip federal holidays.
3. **E-Verify per status (Q36c).** Kept. W0 does not model status history, so it cannot flag an illegal transition.
4. **The later decision wins (Q36d).** Kept. Store-level compare-and-set (GS.07) already turns concurrent stale decisions into typed
   conflicts; a later decision that commits after seeing the earlier one is an intentional override.
5. **Dependencies without valid-time ranges (Q36e).** Kept for W0 v1. Static read sets over-approximate and never miss; the expected
   affected set is the subjects whose read set contains a changed pair (section 10), which both implementations compute the same way.
6. **Erased SSN (Q36f).** Kept: it produces `everify.ssn-erased` and blocks E-Verify submission (TARGETS section 7 marker semantics).
7. **Fanout (Q36g).** A seeded Zipf with s = 0.5 over 2,000 locations at the 100k rung, so the largest location holds about 1,125
   placements and the mean stays at 49.5 (section 12). This corrects TARGETS 6.1 item 6 and RULINGS Q31i, whose s = 1.0 put about
   12,100 placements at one location.
8. **Other rungs (Q36h).** They keep N / 50 locations and the same s, with K = 4 x ceil(L / 80) jurisdictions (Q44a). Only the
   100k numbers are frozen floors.
9. **Outbox transitions (Q38f, Q40c).** The version is content identity only; each id has a durable publication sequence; the
   delivery key is `(id, seq)`; `publish` is the fifth operation (8.8).
10. **Ballast (Q40a).** Rule-neutral answer chains bring generated worlds to P4's sizes and hop depths (section 3, 12.6).
11. **Two hops (Q40b).** The state floor sits on the jurisdiction, reached through the location (7.8).
12. **Publication order (Q40d).** Per subject, an older-basis record publishes nothing (8.8).
13. **Misreading coverage (Q40e).** Cases C46 to C72 add every must-add and should-add case of V-D01 F5.
14. **Positions (Q40f).** The 1-based dense ordinal of committed transacts in the tenant's source-of-truth stream (4.1).
15. **Generator (Q40g).** Every draw field is named (12.3). The population fingerprint is pinned only after the O-DOMAIN author's
    independent generator reproduces V-D01's.
16. **Retirement (Q40h).** A retired id that reappears publishes the next sequence (8.8).
17. **Narrow release and runtime outcome (Q40i).** R3 changes only `OT` (scoped by subject since Q44b, item 21);
    `everifySubmitResult` is the runtime's outcome fact; a few population facts are valid only from a later date (12.3).
18. **Receiver (Q42b, RULINGS-PENDING).** `receive` is the sixth operation (8.9).
19. **One atomic unit (Q42c, RULINGS-PENDING).** The per-subject outbox state is one unit and the guard advances on every applied
    record (8.8).
20. **Re-review fixes (Q44a).** C68 holds the raw token `1.65e3` and `validate.py` asserts every numeric-error token; C76 carries the
    real work item id and `validate.py` recomputes every delivery id and matches every version to a record; C83 pins both receiver
    duplicate rules; 12.7 states the fingerprint recipe; K = 4 x ceil(L / 80); 12.6 states that a world can fall up to 2 facts
    below its bucket; 4.4 lists the `publish` and `receive` shape rules, with C84 and C85.
21. **R3 narrows by subject (Q44b, amends Q40i).** R3's `OT` entry is scoped to ten listed jurisdictions, the scope is part of the
    content hash, the reached subjects come through the reverse two-hop index, and section 12 states affected and changed counts
    separately (5.1, 10 item 7, 12.4 item 4; C54, C55, C86, C87).
22. **Only live reconciles are published (Q44c).** A delivery's subject comes from the record; previews and past-valid-time audits
    never reach `publish` (8.8).
23. **Receivers from the start (Q44d).** Receivers exist from the first publication or are seeded with a state snapshot (8.9).
24. **Readings A01 to A10 (Q53a, Q53b).** The O-DOMAIN author's readings are written in as clarifications, each with a golden
    case (A10 is pinned by the fingerprint): A01 and A13 in 4.4, A02 and A12 in section 2, A03 to A05 in 4.4, A06 in 5.4, A07 in
    section 9 item 7, A08 in 8.8 and 8.9, A09 in 8.8 step 2, A10 in 12.3. They change no earlier case and no fingerprint value.
25. **Readings A11 to A15 (Q57a to Q57e).** The TypeScript kernel author's readings are written in the same way: A11 and A13 in
    4.4, A12 in section 2 (with O-DOMAIN's fix-round reading that `publish` and `receive` integers have no upper bound), A14 in
    8.7 and section 9, A15 in 8.9.
26. **V-D01 notes N1, N2, N5 (Q48c).** C118 is the R3 case with a listed jurisdiction that has no facts; the 5.3 skip rule needs A's
    entry to be unscoped; 12.2 and 12.4 record the measured R3 counts beside the expected ones.
27. **V-D01c coverage (W0-1.1.2).** C88 to C127 are V-D01c's proposed cases P01 to P40, re-derived by hand from this file; C128 to
    C136 cover the readings V-D01c proposed no case for and A12's integers. Every mutant of V-D01c's table A, and every
    kernel-relevant mutant of its table B, fails at least one of them.
