# triplex-db-2 acceptance contract

Version 0.1.0-draft, 2026-11-07. Produced by EXP-A01. **Status: DRAFT, not frozen.** It freezes as 1.0.0
after orchestrator review and adversarial review round 2. Until then no closure computed from it is final.

## 0. How to read this file

- **One obligation = one binary fact about the system.** Each has an id (for example
  `G4.neg.correlated-not-exists`), a statement, the lanes it applies to, named cases, an oracle, a public
  entrypoint, a scale and concurrency profile, a closure rule over receipts, and a status.
- **Every status starts OPEN.** No receipt produced in this checkout exists yet. Inherited homebase results are
  listed in section 9 as reference only and close nothing.
- **The machine form is `obligations.json`.** It is generated, together with sections 7 and 8 of this file, by
  `python3 -I lab/acceptance/build_contract.py`. Edit the generator, never the generated blocks.
- **The load contract is `load-contract.json`** (v0, with CALIBRATE markers and the calibration procedure).
- **The capability matrix is `capability-matrix.md`** (operator by value type by surface by engine).
- **Design-agnostic.** Obligations name observable behavior at public boundaries. They never name a physical
  layout (ledger plus projection, index tables, a QLever log of record). The physical design may change without
  editing this contract.

## 1. What "done" means

**Done is one integrated candidate tree on which every section closes for every lane.**

```
                       done(T)  =  AND over lanes { xtdb-xtql, xtdb-sql, qlever-sparql }
                                    AND over sections { G1 .. G10, R, S, L }
                                      closed(section, lane, T)
                                   AND integrated verification receipt on T (5.6)

  closed(section, lane, T) = AND over obligations O with section in O.goals and lane in O.lanes
                               closed(O, lane, T)

  closed(O, lane, T)       = every closure rule of O holds over the VALID acceptance receipts for
                               (O, lane or engine, T)        <- validity = V1..V16 (5.1)

   receipts --> [ validity V1..V16 ] --> [ closure rules CR-* ] --> obligation --> section --> lane --> done
                  fails closed on any        binary, per rule         CLOSED only if every obligation is
                  missing identity, skip,                             CLOSED; one OPEN keeps the goal OPEN
                  wrong endpoint, stale build
```

- **Three lanes, counted separately.** `xtdb-xtql` (XTQL through `select`), `xtdb-sql` (SQL through
  `selectSql`), `qlever-sparql`. The two XTDB lanes share one engine and one write path.
- **Receipt scope.** An obligation with receipt scope `lane` needs its own receipt per lane, with every read
  substep traced in that lane's language. Scope `engine` (writes, recovery, foundation) needs one receipt per
  engine; one XTDB receipt serves both XTDB lanes.
- **Sections.** G1 to G10 are the ten goals of `wiki/goals.md`. R is the ORM and raw-query requirement of
  `lab/PLAN.md` section 1. S is the 10m-entity / 100m-fact scale target. L is the 256 to 1024 client load target.
- **Cross-goal obligations.** An obligation can belong to several sections (for example `PKT.full142` belongs to
  G2, G3, G4, G5 and G9). It is defined once, under its first section, and listed under the others.

## 2. Counting rules for languages

- **A read substep has exactly one language.** XTQL lane: `native.select`. SQL lane: `selectSql` or
  `selectSqlWithReachability`. SPARQL lane: the QLever native query. Repository reads count for every lane of the
  engine only when the obligation's receipt scope is `engine`; for `lane` obligations the repository substeps are
  recorded, and the native substeps must be in the lane's language.
- **A hybrid task counts for neither XTDB language.** Today 3 packet tasks are hybrid and 57 are SQL-only
  (R6 2.2), so `xtdb-xtql` needs 60 new XTQL recipes before `PKT.full142` can close for it.
- **Host post-processing.** Allowed only as a declared normalization step that reads no data (for example BigInt
  subtraction of two returned sums), recorded in the trace. A host step that fetches data, filters, sorts or
  joins makes the task hybrid. Open question Q3 in the report asks whether to ban host steps entirely.
- **142 named executions per claimed language.** 71 tasks times current and reopen, each with its own case id.

## 3. Machine schema of `obligations.json`

Top level (format `triplex-db-2/acceptance-obligations/1`):

| Key | Type | Meaning |
| --- | --- | --- |
| `version`, `status` | string | contract version; DRAFT until frozen |
| `lanes` | string[] | `xtdb-xtql`, `xtdb-sql`, `qlever-sparql` |
| `engineOfLane` | map | lane to engine (`xtdb`, `qlever`), used for `engine` receipt scope |
| `sections` | {id,title}[] | G1..G10, R, S, L |
| `receiptValidity` | {id,rule}[] | V1..V16 (section 5.1) |
| `closureRules` | map id to text | CR-* (section 5.2) |
| `oracles`, `entrypoints`, `profiles`, `caseSets`, `mutationControls` | maps | shared definitions (section 4) |
| `statusAlgorithm` | map | the formulas of section 1 |
| `obligations` | object[] | see below |

Each obligation:

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | stable id, `<section>.<area>.<slug>` |
| `goals` | string[] | sections it counts toward; first is its home section |
| `title`, `statement` | string | the obligation in plain words |
| `lanes` | string[] | lanes it applies to |
| `receiptScope` | `lane` or `engine` | whose receipt closes it |
| `cases` | {set, select, executions?, also?} | case set id, the selected subset, exact execution count when fixed |
| `oracles` | string[] | oracle ids; only oracles with status ACCEPTED can close (5.2) |
| `entrypoints` | string[] | public entrypoints the cases must go through |
| `profile` | string | scale and concurrency profile |
| `closure` | {rules[], params{}} | closure rule ids, all must hold; params such as modes, execution counts, CALIBRATE thresholds |
| `mutationControls` | string[] | mutants that must be killed (CR-MUTANT-KILL) |
| `sources` | string[] | where the obligation comes from |
| `grounding` | `grounded`, `derived`, `policy-pending` | `derived` = inferred from a source rather than stated; `policy-pending` = cannot close until a policy is frozen |
| `notes` | string or null | caveats |
| `status` | map lane to OPEN or CLOSED | all OPEN in this version |
| `definitionSha256` | string | hash of the defining fields; receipts must carry it (V14) |
| `needsNewOracle` | string[] | oracles that do not exist yet |
| `caseSetStatus` | string | EXISTS, TO-AUTHOR, POLICY-PENDING, DRAFT |

**Minimal receipt fields the closure rules read.** `lab/bin` (EXP-000) produces receipts; to be evaluable against
this contract a receipt must also carry: `contractVersion`, `obligationIds` with their `definitionSha256`,
`lane` and `engine`, `runKind` (`acceptance`, `calibration`, `diagnostic`, `mutation`, `verifier`), `mutationId`
and patch hash for mutation runs, per-case results `{caseId, mode, status, oracleId, rawResultSha256,
languages[]}`, executed, skipped, unsupported counts, and the V1 to V16 identities.

## 4. Shared definitions

### 4.1 Entrypoints, profiles, case sets

The full text of every entrypoint (`EP-*`), profile (`P-*`) and case set (`CS-*`) is in `obligations.json`.
Summary:

| Entrypoint | Surface |
| --- | --- |
| EP-TRIPLES | public `Triples` service over the lane Runtime |
| EP-REPO, EP-WRITER | entity repository `Repository<Model>` and `Writer` / `commit` (core entity subpath, EXP-R01) |
| EP-NATIVE | the lane's native surface: XTQL `select`, SQL `selectSql`, SPARQL native query |
| EP-RAW-HATCH | documented raw escape hatch through Triplex, no helper fragments |
| EP-RAW-WIRE | direct engine protocol with no Triplex code (pgwire, SPARQL 1.1 Protocol) |
| EP-RESOLVE | operation resolution for unknown outcomes |
| EP-EXPLAIN | public plan capture |
| EP-PKG, EP-CLI | packed tarballs in a clean consumer; the `triplex` CLI |
| EP-ENGINE-OBS | engine-side observation only (metrics, logs, active queries, container stats) |

| Profile | Meaning |
| --- | --- |
| P-STATIC | no engine |
| P-TINY | fresh scope, at most 1,000 entities, current and reopen (and engine restart where stated) |
| P-TINY-CONC | P-TINY plus a writer between calls and 16-way races |
| P-HEAVY | exclusive slot, real long-running work (at least 1m entities or a declared synthetic query) |
| P-FAULT | exclusive slot with fault injection and restart |
| P-RUNG | 10k, 100k or 1m rung |
| P-SCALE-10M | the target dataset of `S.dataset.target-population` |
| P-LOAD | `load-contract.json` levels on P-SCALE-10M |

### 4.2 Oracles

**Rule: every case names an oracle that imports no production visibility, constraint, projection, hydration
or codec code.** The KV runtime (O-KV) runs as a regression participant only and never closes anything alone
(review r1 finding 5).

| Oracle | Status | What it is |
| --- | --- | --- |
| O-EVT | EXISTS | `qualification/workloads/event_oracles.py`, packet answers from immutable events |
| O-REPLAY | TO-BUILD | new independent Python event-replay oracle, specified below |
| O-HAM | EXISTS | finite-nine historical assertion metadata oracle (v1, v2) |
| O-CFG8 | EXISTS | configured-eight fixture oracle |
| O-STR, O-COLL | EXISTS | frozen codepoint-order arrays (string-order-v1, collation tiny control) |
| O-SHAPE | TO-AUTHOR | frozen expected answers for negation and aggregate edge shapes |
| O-ERR | TO-AUTHOR | frozen expected typed error per negative case |
| O-TESTKIT | EXISTS | authored expectations inside the unchanged44 cases |
| O-OBS | TO-AUTHOR | observation protocol for cancellation, drain, connections, lifecycle |
| O-SPEC | TO-AUTHOR | TypeScript type witnesses against packed declarations |
| O-KV | EXISTS | KV runtime, regression participant only |

**Oracle lifecycle.** TO-BUILD or TO-AUTHOR, then BUILT, then ACCEPTED after an independent review recorded in
the commit. Only an ACCEPTED oracle, with its file hashes pinned in the contract version, can close an
obligation.

**What O-REPLAY must compute** (the later oracle experiment builds it; this is its specification):

1. **Inputs.** The command stream (ordered commands with operations, typed values in canonical encoding,
   entity ids and types, valid intervals, preconditions, meta: actor, commandId, correlationId, causationId,
   configSnapshot), enforcement mode and constraint rules, schema releases, and the ACK receipts from the
   system under test. Receipts are the only system-provided input: outcome, txId, position, instant and the
   assertion ids assigned per operation.
2. **Receipt consistency.** Positions dense and increasing per scope, instants non-decreasing in position order,
   ids unique, rejected commands hold no position. An inconsistent receipt fails the run.
3. **Expected command outcomes.** Committed, or the expected typed failure: CommandAlreadyCommitted with the
   original txId, TransactionConflict, Required, Cardinality, Unique and ReferenceTarget violations, reserved
   namespace, invalid value.
4. **Assertion relation with complete metadata.** id, entityId, attribute, exact typed value (int64 as a Python
   int, binary64 as IEEE bits, text as a codepoint sequence, datetime, ref, json in canonical and original key
   order, blob descriptor), validFrom, validTo, recordedAt, recordedPosition, createdBy, entityType,
   schemaVersion, txId, retractedAt, retractedPosition, retractTxId.
5. **Visibility at a cut** (scope, P, optional R, V): recorded-visible and not retracted at the cut, valid at V
   under half-open `[validFrom, validTo)`.
6. **Both history contracts.** Raw lifetime (complete retirement fields) and as-of snapshot (retirement fields
   null unless `retractedPosition <= P` and, when R is bound, `retractedAt <= R`).
7. **Entity models.** Per EntityType at a basis: cardinality-one value or the conflict outcome, cardinality-many
   arrays in the specified order, absent optional as a missing property, includes resolved at the same basis,
   timelines.
8. **Transactions.** Records per position with meta fields and changes in write order.
9. **Cursors.** Expected page sequences at a fixed basis for a declared order key and page size.
10. **Supports.** Live support counts per value and per derived fact, reachability supports for DAG cases.
11. **Arithmetic and order.** Exact int64 with overflow detection, IEEE binary64, codepoint string order. No
    casefolding.
12. **Analytic scale counts.** Population counts for the scale generator without materializing the dataset.
13. **Self-checks before ACCEPTED.** Reproduce the O-HAM finite-nine and O-CFG8 tiny-v4 expectations, and the
    O-EVT cut semantics on the packet events where the domains overlap; unit tests for every rule above.

Decisions the oracle needs and nobody has made yet are listed as open questions in the report (conflict rule
for equal duplicates, card-many order, partial-sum overflow, AVG type, division by zero).

### 4.3 Mutation controls

**A suite that cannot fail proves nothing.** Each mutant is applied only to the system under test (build flag or
patch, its hash recorded), never to an oracle or case file. CR-MUTANT-KILL requires at least one FAIL per mutant
on the same candidate tree.

| Mutant | Fault it injects |
| --- | --- |
| M-HALF-OPEN | validTo inclusive or validFrom exclusive |
| M-DROPPED-SUPPORT | retracting one of two supports removes the value |
| M-FUTURE-RETIREMENT | snapshot reads leak retirements recorded after the cut |
| M-INT64-ROUND | int64 passes through binary64 |
| M-ENTITY-TYPE-SWAP | two EntityType labels swapped |
| M-STALE-PROJECTION | projection one publication behind while reporting the latest basis |
| M-CUT-OFF-BY-ONE | P-1, or R treated as exclusive |
| M-NEGZERO | -0.0 becomes +0.0 |
| M-ICU-ORDER | locale collation instead of codepoint order |
| M-SCOPE-LEAK | scope predicate dropped on one path |
| M-MASK-RAW | snapshot mask applied to the raw lifetime contract |
| M-CONFLICT-PICK | card-one conflict resolved by arbitrary pick |
| M-IDENTITY-COLLAPSE | same-value assertions in one batch share one id |
| M-JOURNAL-ORDER | transaction changes reordered |
| M-CLAIM-IGNORED | duplicate command commits twice |
| M-DECORRELATE | negation helper omits correlated re-binding |
| M-STALE-REUSE | reused result not invalidated |
| M-CARD-MANY-DROP | one card-many element dropped |

The first six are the ones the brief requires; all eighteen are killed by `R.repo.mutation-controls`, and each
is also attached to the obligations it most directly protects.

## 5. Closure rules and loophole bans

### 5.1 Receipt validity (every receipt, every rule)

| Id | A receipt is valid only if |
| --- | --- |
| V1 | it was produced by `lab/bin` in this repository and stored append-only at `lab/runs/<gate>/<run-id>.json`, raw output under `runs/<gate>/<run-id>/` |
| V2 | its source tree identity includes uncommitted and untracked changes and equals the candidate tree (or passes the carry-forward rule, 5.5) |
| V3 | the gate built first and recorded the sha256 of every built `dist` file it imported, produced in this run from that tree |
| V4 | lockfile sha256, Node and pnpm versions are recorded |
| V5 | the engine image digest equals the pin (XTDB `a6a42650...`, QLever `37d5ede1...`) or a named repaired image declared in this contract version; engine config hash recorded |
| V6 | the endpoint actually contacted equals the slot's endpoint; never 15442, 17019 or a homebase host |
| V7 | gate script, oracle files and case-set files hash to the values pinned for this contract version, and every oracle used is ACCEPTED |
| V8 | fixture content hash and a fresh scope id are recorded |
| V9 | raw results were retained and hashed before any assertion |
| V10 | executed count equals declared count; skipped, unsupported and not-implemented are all 0; errors only where a case expects them |
| V11 | for lane receipts, every read substep records its language and it is the lane's language |
| V12 | `runKind` is `acceptance` |
| V13 | a verifier receipt from a different agent reproduces the result on the same tree |
| V14 | the obligation's `definitionSha256` in the receipt equals the one in the current contract version |
| V15 | the run was admitted by resource admission; co-runners and peak memory, CPU and disk recorded; not BLOCKED_CAPACITY |
| V16 | no acceptance receipt for the same obligation, lane and tree failed; first failures are retained and cannot be outvoted |

### 5.2 Closure rules

| Rule | Holds when |
| --- | --- |
| CR-PASS-ALL | every declared case runs in every declared mode, each result PASS against the named oracle, executed ids equal the declared set |
| CR-COUNTEREXAMPLE | the original counterexample runs with its original frozen expected answer (oracle hash unchanged since the first recorded failure) and passes; the raw counterexample text is unedited |
| CR-MUTANT-KILL | each listed mutant, on the same tree, makes at least one case FAIL; the unmutated suite passes |
| CR-OBSERVE | every required O-OBS level is evidenced and joined to one request or connection identity within the stated bounds; uncertainty fails |
| CR-FAULT | every fault point injected the stated number of times (3 unless stated); post-state equals O-REPLAY through every listed access path; zero ACKed commands lost; zero unresolved outcomes |
| CR-STATIC | positive witnesses compile, negative witnesses fail with the expected diagnostic, against packed declarations |
| CR-SCALE | dataset counts verified by independent count queries and O-REPLAY analytic counts; capacity-admitted; correctness subsample passes with zero tolerance |
| CR-PERF | each named CALIBRATE threshold frozen in a calibration receipt that predates acceptance; three independent runs all meet it |
| CR-METRICS | every listed metric present, measured, bound to dataset and build identity |
| CR-LOAD | `load-contract.json` at its frozen version: calibration predates; every invariant and threshold met in each required run |
| CR-MATRIX | every capability cell with a non-empty required-by list is EXACT with a passing receipt; KNOWN-LIMIT cells have empty required-by, a retained counterexample receipt and a raw-guide entry |
| CR-PROVENANCE | the raw recipes' authoring manifest lists only the raw-query guide and engine docs as inputs, and the author differs from the lane's repository and projection authors |

**CALIBRATE outside the load contract.** Obligations with CR-PERF (drain bounds, deadline grace, deep-page cost,
latency ratios) follow the load contract's calibration rules (`load-contract.json` `calibration`): frozen
create-only before acceptance, on a control build, never loosened afterward.

### 5.3 Goal status algorithm

```
for each lane L, candidate tree T:
  for each obligation O with L in O.lanes:
      key  = L if O.receiptScope == "lane" else engineOfLane[L]
      R    = acceptance receipts for (O.id, key) that pass V1..V16 on T (or carry forward, 5.5)
      closed(O, L, T) = R non-empty  and  every rule in O.closure.rules holds over R
                        and O.grounding != "policy-pending"
  for each section S: closed(S, L, T) = all closed(O, L, T) for O with S in O.goals
done(T) = all sections closed for all lanes  and  integrated verification receipt (5.6)
```

A `policy-pending` obligation keeps its section OPEN until a later contract version freezes the policy and
replaces the obligation's statement with the policy's cases.

### 5.4 Loophole bans

Each of these is a way a goal could look closed while the system does not meet it. Each is banned, and the
validity rule or closure rule that enforces the ban is named.

| # | Loophole | Ban | Enforced by |
| --- | --- | --- | --- |
| B1 | **Skips.** A live test skipped because `XTDB_INTEGRATION` or `QLEVER_INTEGRATION` was unset, a case filtered out, or zero tests ran. | A skip is a FAIL. Executed ids must equal declared ids. | V10, CR-PASS-ALL |
| B2 | **Unsupported markers.** "unsupported", "not implemented", a capability flag set to false, or a typed refusal of a shape the obligation requires. | Counts as FAIL. Refusing a required shape never closes an obligation, even when the refusal is correct and typed. | V10, R.native.fragment-equivalence, CR-MATRIX |
| B3 | **Lowered thresholds.** A CALIBRATE value set or later changed to make a run pass. | Thresholds are frozen in a create-only calibration receipt before acceptance, respect the hard floors and ceilings in `load-contract.json`, and may only be tightened. A changed profile is a new named profile; the original remains the acceptance profile and its failures stay. | CR-PERF, CR-LOAD, L.calibration.frozen |
| B4 | **Stale builds.** Typecheck of new source while executing old `dist`, or a dirty tree identified only by a dirty flag. | The receipt binds the full tree including uncommitted changes and the hashes of the `dist` files actually imported, built in the same run. | V2, V3 |
| B5 | **Wrong endpoints.** A run against the homebase (15442, 17019), another slot, or an engine started from a different image. | The contacted endpoint must equal the slot's; the image digest must equal the pin. | V5, V6 |
| B6 | **Hybrid-language tasks counted for one language.** A task whose driver is SQL and final read XTQL counted as XTQL. | A hybrid task counts for neither XTDB language; host steps that touch data make a task hybrid. | V11, PKT.full142 |
| B7 | **Calibration runs as acceptance.** | `runKind` must be `acceptance`; calibration, diagnostic, probe and author-preview runs close nothing. | V12 |
| B8 | **Inherited homebase receipts.** Anything in `qualification/reviews`, `.devloop`, the handoff, or another machine. | Only receipts produced by `lab/bin` in this repository count. Section 9 is reference only. | V1 |
| B9 | **Oracle or expected-answer edits.** Rewriting an oracle, casefolding, re-sorting a returned page, or filtering engine output to manufacture a pass. | Oracle and case files are hash-pinned per contract version; a change after a first failure is a new case version and the original stays required; every change needs a verifier review recorded in the commit. | V7, CR-COUNTEREXAMPLE |
| B10 | **KV as the oracle.** Agreement between the lane and the KV runtime. | KV is a regression participant only; every obligation names an independent oracle. | 4.2 |
| B11 | **Rerun until green.** | Any failing acceptance receipt on the same tree keeps the obligation open on that tree. | V16 |
| B12 | **Subsets and shrunk fixtures.** Running 140 of 142, or a smaller fixture with the same name. | Case sets are hash-pinned with exact execution counts. | V7, V10 |
| B13 | **Branch composition.** Two branches each green, never verified together. | Done is computed on one integrated tree with an integrated verification receipt. | 5.6 |
| B14 | **Scale inflation.** Counting repeated tiny scopes, RDF wrapper triples, journal rows, presence or structural facts as entities or domain facts. | One scope; entities and facts counted by the definitions in `S.dataset.target-population`, other populations reported separately. | CR-SCALE |
| B15 | **Load accounting tricks.** Counting drain completions as in-window goodput, success-only percentiles, logical clients reported as connections, uncounted rejections, latency measured from dispatch instead of scheduled offer, stale reads counted as correct. | The load contract's metric definitions and zero-tolerance invariants. | CR-LOAD |
| B16 | **Policy by omission.** Declaring "no cascade" or "no presence policy" to close G9. | `policy-pending` obligations cannot close until a frozen policy replaces them with cases. | 5.3 |
| B17 | **Engine swap.** Closing a goal on a repaired or reconfigured engine without saying so. | A repaired image must be declared in the contract version; every engine-scope receipt is rerun on it. | V5 |
| B18 | **Mutating the oracle side.** A mutant that edits expected answers. | Mutants apply only to the system under test; oracle and case hashes must be unchanged in mutation receipts. | CR-MUTANT-KILL |

### 5.5 Carry-forward rule

**A receipt made on tree T0 still counts on a later tree T1 only if nothing it executed changed.** The gate
rebuilds on T1 and recomputes the hashes of every `dist` file in the receipt's import record; if they, the engine
digest and config, the fixture, the oracle, the case set, the gate script and the obligation's definition hash
are all byte-identical, the receipt carries forward. Otherwise the obligation is rerun on T1. This keeps the
10m scale and load runs from being repeated after an unrelated change, without letting stale code count.

### 5.6 Integrated verification receipt

The done claim also needs, on the same tree T: G0 (typecheck and pure tests), `G1.found.unchanged44` for both
engines and `PKT.full142` for all three lanes executed fresh on T (no carry-forward), by the verifier role.

### 5.7 Change control

- **Freezing.** This draft freezes as 1.0.0 after review. From then on each receipt names the contract version.
- **Adding** an obligation, case or mutant is a minor version. It opens the affected sections again.
- **Weakening or removing** an obligation, lowering a hard floor, or replacing an oracle is a major version that
  needs a written reason and the orchestrator's ruling, with Sam as the final authority; the original
  definition and its failures stay in the history.
- **Policy-pending obligations** are replaced, not deleted, when their policy is frozen.

## 6. Case set specifications for new suites

Case sets marked TO-AUTHOR in `obligations.json` are built by later experiments. The ones below are specified
here because their content decides what the obligation means.

### 6.1 Value types (CS-TYPES8, CS-TYPES8-NEG, CS-WIDEN)

**CS-TYPES8, one assertion per value, read on four surfaces, three modes.**

| Family | Edge values |
| --- | --- |
| string | `""`, ASCII mixed case `A E c z`, NFC `U+00E9` and NFD `e U+0301` as distinct values, `U+E000`, `U+10000`, `U+1F600`, quote, backslash, CR, LF, a 64 KiB text |
| integer (int64) | 0, 1, -1, 2^53-1, 2^53+1, 2^59-1, 2^59, -2^59, -2^59-1, 2^63-1, -2^63 |
| number (binary64) | 0.0, -0.0, 0.1, 0.30000000000000004, 1.0000000000000002, 2^53 as a double, 5e-324, 2.2250738585072014e-308, 1.7976931348623157e308, -1.5, 3.0 (stays in the number family) |
| boolean | true, false |
| datetime | 0, a negative instant, a fractional-millisecond instant, the earliest and latest instant Triplex accepts |
| ref | a ref to an entity of the same type, of another type, and to an entity created in the same command |
| json | object with unsorted keys `{"b":1,"a":2}`, nested arrays and objects, non-ASCII text, 1e300 |
| blob | descriptor with and without filename, size 0, a size above 2^32 |

**CS-TYPES8-NEG, each must be rejected atomically.** Lone surrogate in text, NaN, +Infinity, -Infinity,
non-canonical int64 text (`"01"`, `"+1"`, `"1.0"`), integer outside int64, invalid datetime, json that does not
parse, blob descriptor with a negative size.

**CS-WIDEN, later writes must not change earlier exact reads.** int64 9007199254740993 written first, then in
the same attribute or physical column a whole-number float, a text value (through an untyped attribute), and for
QLever an invalid typed literal through the raw wire; re-read the first value on every surface.

### 6.2 Numbers and errors (CS-NUMERIC, CS-ERRORS)

**int64 scalar.** 2^62 + 2^62 (overflow), (2^63-1) + 1 (overflow), -2^63 - 1 (overflow), ABS(-2^63) and
-(-2^63) (overflow), 2^32 * 2^31 (overflow), 3037000499^2 (exact), 3037000500^2 (overflow), CAST of
`"9223372036854775808"` (overflow) and `"-9223372036854775808"` (exact), (2^59-1) + 1 (exact 2^59).

**int64 aggregate.** SUM [2^62, 2^62] (overflow), SUM [2^62, 2^62, -2^62] (exact 2^62 by the exact-total rule,
see open question Q8), SUM [2^58, 2^58, 2^58] (exact 3 * 2^58, crosses 2^59), COUNT over no rows (0), AVG over
int64 (result type per O-ERR).

**binary64.** sums whose IEEE result differs from a 49-bit-mantissa result, -0.0 preserved through + 0.0 and
* -1, division by zero, overflow to infinity (rejected or typed error per O-ERR).

**Cross-family and groups.** int64 2^53+1 versus binary64 2^53 (not equal), int64 1 versus binary64 1.0 (per the
rule frozen from the testkit equality cases), boolean true versus int64 1 (distinct), text `"1"` versus int64 1
(distinct), as filters and as group keys.

**Errors.** Invalid query text, unbound variable, contract decode mismatch, row limit exceeded, timeout,
cancellation, unsupported-shape refusal, read-only refusal, unavailable cut, unknown scope. O-ERR fixes the
expected typed error for each; a success with partial rows always fails.

### 6.3 Fault points (CS-FAULT)

**Every durable step the lane's write protocol declares is a fault point**, in addition to the engine points
below. The lane must publish its write state machine; an undeclared step found later is a contract defect and
adds a case.

| Engine | Fault point | Source |
| --- | --- | --- |
| XTDB | kill the client after BEGIN, before COMMIT | R6 experiment 10 |
| XTDB | kill the engine during COMMIT SYNC | R6 experiment 10 |
| XTDB | drop the connection after COMMIT, before ACK (`SHOW AWAIT_TOKEN`) | R4 3.7 |
| XTDB | kill the engine in the middle of a recursion round | R6 finding 4 |
| XTDB | kill the engine during compaction or GC | benchmark-contract maintenance phase |
| QLever | update timeout during the mutation phase (R2 probe B shape) followed by a successful update | R2 1.8 |
| QLever | kill after persistence, before snapshot publication (R2 probe C shape) | R2 1.8 |
| QLever | kill during index rebuild | R2 1.7, review r1 finding 15 |
| QLever | kill during projection or boundary maintenance | review r1 finding 8 |
| QLever | drop the connection after HTTP 200, before ACK | R2 1.8 |
| both | kill the writer process at each declared durable step | review r1 finding 7 |

Access paths verified after each fault: XTDB `_id` lookup and column-predicate scan; QLever subject scan (SPO),
predicate-object scan (POS) and object scan (OPS); plus the repository, the native surface in every language of
the engine, and the raw recipe.

### 6.4 Entity suite (CS-ENTITY)

**Schema.** At least three EntityTypes (for example Person, Org, Membership) that together use all eight value
families, cardinality one and many, required, optional, unique, a ref with a target type, and a reverse ref.
Two schema releases (v2 adds an optional attribute and a constraint).

**Command stream phases.** Create; correction (retract plus assert); card-many add and remove; facts with
future validTo that cross a boundary later; retraction; with enforcement off, equal and unequal card-one
duplicates and overlapping intervals; presence toggles (convention only, until the policy is frozen); two
distinct commits sharing one recorded instant; one nested transaction holding two positions; the v2 release.

**Cut catalog.** Every phase's position, recorded instants between and at commits, valid instants at, just
before and just after every boundary, frozen after the ACKs from the receipts.

**Repository operations at each cut.** `get`; `getMany` including missing ids (association preserved);
`find` with equality, range, membership and ref predicates on every family, `include`, order, `limit` and cursor
continuation; `timeline`; `at(basis)` for current, past R, past V and both. Expected conflict outcomes are
typed errors.

**Modes.** Current, reopen, engine restart. **Sizes.** A deterministic hand-built core (at most 200 entities)
plus a seeded generated variant (seed recorded) for broader coverage.

### 6.5 Raw recipes (CS-RAW-RECIPES)

**The raw-query guide is a deliverable of the lane, written for a developer who knows only XTQL, SQL or SPARQL.**
It must document: the physical names (tables and columns, or graphs, classes and predicates), how to select the
scope, how to express current, as-of position or recorded time, and valid-instant reads, the conflict indicator,
the exact-value channels where the engine's native types are lossy (for example int64 beyond +/-2^59 on QLever),
and every KNOWN-LIMIT cell of the capability matrix with its counterexample.

**Query classes, each in each lane language.** Point by id; attribute equality; range; order and page;
ref join; reverse ref; anti-join; grouped aggregate; history of an entity at a basis; interval at a valid
instant; journal and receipt lookup by commandId.

## 7. Obligations by section

Generated from `build_contract.py`. Every status is OPEN.

<!-- BEGIN GENERATED OBLIGATIONS -->

### Goal 1. Eight exact value types, schemas, cardinality, uniqueness, references

**`G1.found.unchanged44`: Unchanged44 on the lane foundation.**
- Statement: The unchanged 44-case shared conformance suite passes against the lane engine's Triples foundation in current and reopened form: 44 named cases per mode, 88 executions, zero skipped.
- Lanes: all three; one receipt per engine (both XTDB lanes share the XTDB receipt).
- Cases: CS-U44 (all), 88 executions; case set EXISTS.
- Oracle: O-TESTKIT (EXISTS).
- Entrypoints: EP-TRIPLES. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"]}.
- Sources: wiki/goals.md:20-23; lab/research/R4-codebase-harness-map.md 5.3; lab/PLAN.md 5.4 G1.
- Notes: KV runs the same cases as a regression participant (packages/testkit/test/fixtures.test.ts); its agreement closes nothing.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G1.types.eight-type-roundtrip`: Eight value types round-trip exactly on every surface.**
- Statement: Every case of CS-TYPES8 (one assertion per value family string, number, integer/int64, boolean, datetime, ref, json, blob, including the listed edge values) reads back bit-exact through Triples, the repository, the lane's native surface with a schema-derived contract, and the documented raw recipe, in current, reopen and engine-restart modes.
- Lanes: all three; one receipt per lane.
- Cases: CS-TYPES8 (all); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-TRIPLES, EP-REPO, EP-NATIVE, EP-RAW-HATCH. Profile: P-TINY.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL with {"modes": ["current", "reopen", "engine-restart"]}.
- Mutation controls: M-INT64-ROUND, M-NEGZERO.
- Sources: wiki/goals.md:9; lab/research/R6-xtdb-gap-analysis.md goal 1; lab/reviews/plan-review-r1.response.md B5 step 3; lab/research/R2-qlever-capabilities.md 4.1; lab/research/R1-xtdb-capabilities.md Q3.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G1.types.invalid-rejected`: Invalid values are rejected atomically.**
- Statement: Every case of CS-TYPES8-NEG (lone surrogate, NaN, +/-Infinity, non-canonical int64 text, integer outside int64, invalid datetime, malformed json or blob descriptor) is rejected with the specified typed WriteError; the committed position is unchanged, no receipt or claim exists, and no partial row or triple is visible through any access path.
- Lanes: all three; one receipt per engine (both XTDB lanes share the XTDB receipt).
- Cases: CS-TYPES8-NEG (all); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD), O-ERR (TO-AUTHOR).
- Entrypoints: EP-TRIPLES, EP-WRITER. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"]}.
- Sources: lab/research/R4-codebase-harness-map.md 3.6; lab/research/R6-xtdb-gap-analysis.md goal 1.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G1.types.storage-widening-safe`: Later writes never change an earlier exact read.**
- Statement: After the heterogeneous writes of CS-WIDEN (whole-number floats, text and int64 in attributes that share physical storage; invalid typed literals), every previously written value still reads back bit-exact on every surface, current and reopen.
- Lanes: all three; one receipt per lane.
- Cases: CS-WIDEN (all); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-TRIPLES, EP-REPO, EP-NATIVE, EP-RAW-HATCH. Profile: P-TINY.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL with {"modes": ["current", "reopen"]}.
- Mutation controls: M-INT64-ROUND.
- Sources: lab/research/R1-xtdb-capabilities.md Q3 (union columns reach Node as JSON numbers); lab/research/R2-qlever-capabilities.md 4.1 (invalid typed literal becomes a plain string); lab/reviews/plan-review-r1.codex.md finding 12.
- Grounding: **derived**.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G1.types.native-parameters`: Native parameters keep exact values.**
- Statement: Parameters of every value family bound into a native query in the lane language (including -0.0, int64 extremes, text containing quote, $$ and ;) reach the engine with their exact value and type, current and reopen.
- Lanes: all three; one receipt per lane.
- Cases: CS-PARAMS (all); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-NATIVE. Profile: P-TINY.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL with {"modes": ["current", "reopen"]}.
- Mutation controls: M-NEGZERO.
- Sources: wiki/problems/native-number-parameters.md; wiki/status.md:159-169.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G1.schema.required`: Required is enforced atomically.**
- Statement: With enforcement on, a command that leaves a Required attribute missing at any represented valid-time boundary is rejected with the typed constraint error and no residue; the same command with the attribute present commits.
- Lanes: all three; one receipt per engine (both XTDB lanes share the XTDB receipt).
- Cases: CS-CONSTRAINTS (required); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD), O-ERR (TO-AUTHOR).
- Entrypoints: EP-TRIPLES, EP-WRITER. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"]}.
- Sources: wiki/goals.md:9; lab/research/R6-xtdb-gap-analysis.md 3.1 (Required rejection, no residue).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G1.schema.cardinality`: Cardinality-one is enforced with the specified counting rule.**
- Statement: With enforcement on, a second live overlapping assertion for a cardinality-one attribute is rejected; the counting rule (assertions, including duplicate equal-valued assertions, per packages/core/src/Constraint.ts) matches O-REPLAY; cardinality-many keeps every live value.
- Lanes: all three; one receipt per engine (both XTDB lanes share the XTDB receipt).
- Cases: CS-CONSTRAINTS (cardinality); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD), O-ERR (TO-AUTHOR).
- Entrypoints: EP-TRIPLES, EP-WRITER, EP-REPO. Profile: P-TINY.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL with {"modes": ["current", "reopen"]}.
- Mutation controls: M-CARD-MANY-DROP.
- Sources: wiki/goals.md:9; lab/reviews/plan-review-r1.codex.md finding 13 (Constraint.ts:193 counts assertions).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G1.schema.unique`: Uniqueness holds under concurrent writers.**
- Statement: A unique attribute value can be live on at most one entity at any valid instant; a second writer is rejected with the typed error; in a 16-way race for the same value exactly one command commits.
- Lanes: all three; one receipt per engine (both XTDB lanes share the XTDB receipt).
- Cases: CS-CONSTRAINTS (unique); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD), O-ERR (TO-AUTHOR).
- Entrypoints: EP-TRIPLES, EP-WRITER. Profile: P-TINY-CONC.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"]}.
- Sources: wiki/goals.md:9; lab/PLAN.md 3.2 item 1 (uniqueness enforcement).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G1.schema.reference-target`: Reference targets are enforced at represented boundaries.**
- Statement: With ReferenceTarget rules supplied, a ref must target a visible entity of the required EntityType at every represented valid-time boundary of the source fact; same-batch forward references are admitted; a violating command is rejected atomically.
- Lanes: all three; one receipt per engine (both XTDB lanes share the XTDB receipt).
- Cases: CS-CONSTRAINTS (reference); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD), O-ERR (TO-AUTHOR).
- Entrypoints: EP-TRIPLES, EP-WRITER. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"]}.
- Sources: wiki/research/presence-reference-deletion-requirements-v1.md (Temporal references row); packages/core/src/Constraint.ts.
- Notes: Temporal coverage against presence intervals is a separate, policy-pending contract (see G9.presence.explicit).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G1.schema.release-derived-contracts`: Contracts derive from the active schema release.**
- Statement: Repository model types and native helper contracts are derived from the active ConfigStore release (Attribute/EntityType handles), not from hand-written TypeExpr; after a v1 -> v2 release the derived contracts change accordingly; every read reports the schema snapshot it used.
- Lanes: all three; one receipt per lane.
- Cases: CS-SCHEMA-RELEASE (all); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD), O-SPEC (TO-AUTHOR).
- Entrypoints: EP-REPO, EP-NATIVE. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"]}.
- Sources: handoffs/claude-native/README.md:31-35; lab/research/R6-xtdb-gap-analysis.md goal 1 and goal 10; lab/research/R4-codebase-harness-map.md 1.4.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

### Goal 2. Expressions, arithmetic boundaries, specified error semantics

**`PKT.full142`: Native packet: 142 named executions in the lane language.**
- Statement: All 71 packet tasks run in current and reopened form (142 named executions) on the lane's native surface; every read substep is traced with the lane's language and only that language (a hybrid task counts for neither XTDB language); host post-processing is allowed only as a declared normalization step with no data access, recorded in the trace; answers equal expected_rows and O-EVT.
- Lanes: all three; one receipt per lane.
- Cases: CS-PKT71 (all), 142 executions; case set EXISTS.
- Oracle: O-EVT (EXISTS).
- Entrypoints: EP-NATIVE. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"], "languagePurity": true}.
- Sources: wiki/goals.md:20-23; lab/reviews/plan-review-r1.codex.md finding 4; lab/reviews/plan-review-r1.response.md decision 4; lab/research/R6-xtdb-gap-analysis.md 2.2.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G2.arith.int64-overflow`: int64 arithmetic is exact or a typed overflow.**
- Statement: On the repository and on supported native fragments, int64 +, -, *, unary minus, ABS and CAST from text are exact inside [-2^63, 2^63-1] and raise the specified typed overflow error outside it; no result wraps. Cases include values near 2^53, 2^59, 2^62 and 2^63.
- Lanes: all three; one receipt per lane.
- Cases: CS-NUMERIC (int64-scalar); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD), O-ERR (TO-AUTHOR).
- Entrypoints: EP-REPO, EP-NATIVE. Profile: P-TINY.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL with {"modes": ["current", "reopen"]}.
- Mutation controls: M-INT64-ROUND.
- Sources: wiki/goals.md:10; lab/research/R6-xtdb-gap-analysis.md goal 2 (scalar + and * use addExact); lab/research/R2-qlever-capabilities.md 4.1 (60-bit integers wrap).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G2.arith.binary64`: binary64 arithmetic and comparison are IEEE exact.**
- Statement: On the repository and supported native fragments, binary64 values and the results of +, -, *, / and comparisons are bit-exact IEEE 754 (including -0.0 and subnormals); NaN and infinities are never stored; division by zero and invalid casts follow O-ERR.
- Lanes: all three; one receipt per lane.
- Cases: CS-NUMERIC (binary64); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD), O-ERR (TO-AUTHOR).
- Entrypoints: EP-REPO, EP-NATIVE. Profile: P-TINY.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL with {"modes": ["current", "reopen"]}.
- Mutation controls: M-NEGZERO.
- Sources: wiki/goals.md:10; lab/research/R2-qlever-capabilities.md 4.1 (49-bit mantissa, 13 digits).
- Grounding: **derived**.
- Notes: Division-by-zero and invalid-cast semantics need a frozen rule in O-ERR; Triplex does not state one in the sources read.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G2.expr.cross-family-comparison`: Comparisons across numeric families follow the specified rule.**
- Statement: Equality and order between int64 and binary64 values follow the specified exact rule (2^53+1 is not equal to 2^53 as binary64), and typed identities stay distinct (boolean true vs int64 1, text '1' vs int64 1) on the repository and supported native fragments.
- Lanes: all three; one receipt per lane.
- Cases: CS-NUMERIC (cross-family); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"]}.
- Sources: testkit 'datalog equality predicates compare numeric values as numbers', 'datalog equality keeps identity bindings string-typed'; lab/research/R2-qlever-capabilities.md 4.1 (comparison converts to double).
- Grounding: **derived**.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G2.errors.typed-taxonomy`: Errors surface as the specified typed errors.**
- Statement: Every case of CS-ERRORS (invalid query text, unbound variable, contract decode mismatch, row limit exceeded, timeout, cancellation, unsupported-shape refusal, read-only refusal, unavailable cut, unknown scope) yields the specified typed error with the original cause retained, and never a success with partial rows.
- Lanes: all three; one receipt per lane.
- Cases: CS-ERRORS (all); case set TO-AUTHOR.
- Oracle: O-ERR (TO-AUTHOR).
- Entrypoints: EP-REPO, EP-NATIVE. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"]}.
- Sources: wiki/goals.md:10; lab/research/R6-xtdb-gap-analysis.md goal 2 (no error taxonomy); lab/research/R4-codebase-harness-map.md 3.8.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G2.strings.codepoint-supported`: Codepoint string order on the supported surfaces.**
- Statement: Repository queries and supported native fragments order, range-filter and page text in Unicode codepoint order: the frozen string-order-v1 arrays (ASCII A,E,c,z; original-cut continuation c,z; Unicode codepoint order; > U+E000) and the tiny collation control pass unchanged, current and reopen.
- Lanes: all three; one receipt per lane.
- Cases: CS-STR (supported); case set EXISTS.
- Oracle: O-STR (EXISTS), O-COLL (EXISTS).
- Entrypoints: EP-REPO, EP-NATIVE. Profile: P-TINY.
- Closure: CR-COUNTEREXAMPLE + CR-MUTANT-KILL with {"modes": ["current", "reopen"]}.
- Mutation controls: M-ICU-ORDER.
- Sources: wiki/goals.md:47-64; wiki/problems/qlever-native-string-order.md; lab/research/R5-qlever-semantic-blockers.md 3; lab/research/R6-xtdb-gap-analysis.md goal 10.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G2.strings.codepoint-raw`: Codepoint string order on the unrestricted raw surface.**
- Statement: The original raw counterexamples (tiny control `ORDER BY STR(?l) STR(?e)`, its two ranges, and the IRI page-sample class), and their SQL and XTQL ports over the documented raw dataset, return the codepoint answers of O-STR and O-COLL.
- Lanes: all three; one receipt per lane.
- Cases: CS-STR (raw); case set EXISTS.
- Oracle: O-STR (EXISTS), O-COLL (EXISTS).
- Entrypoints: EP-RAW-HATCH, EP-RAW-WIRE. Profile: P-TINY.
- Closure: CR-COUNTEREXAMPLE with {"modes": ["current", "reopen"]}.
- Sources: wiki/goals.md:47-64; lab/research/R5-qlever-semantic-blockers.md 1 and 5.5 (needs NoICU build or engine repair); handoffs/claude-native/START-HERE.md:28-34.
- Notes: For qlever-sparql this is expected to need engine repair (R5 S2 NoICU build). Whether raw STR order is inside the done condition is open question Q1 in REPORT.md; this contract keeps it required.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

Also counted in this section: `R.raw.capability-required-cells`.

### Goal 3. Useful plans, costing, preconstruction admission, recursion

**`G3.plan.explain`: Plans are captured for every query.**
- Statement: Every repository query and native read can return its engine plan and the Triplex route chosen (for example projection versus exact ledger path); the acceptance receipts for CS-QMIX record the plan of every executed query.
- Lanes: all three; one receipt per lane.
- Cases: CS-QMIX (all); case set TO-AUTHOR.
- Oracle: O-SPEC (TO-AUTHOR).
- Entrypoints: EP-EXPLAIN, EP-REPO, EP-NATIVE. Profile: P-TINY.
- Closure: CR-PASS-ALL.
- Sources: wiki/goals.md:11; lab/research/R6-xtdb-gap-analysis.md goal 3 (no plan or cost capture).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G3.plan.access-path-at-scale`: Point and selective reads use key-bounded access at 10m.**
- Statement: At P-SCALE-10M the point, getMany, selective equality and reverse-reference classes, on the repository and in the lane language, resolve through a key-bounded access path named in the captured plan, and their latency does not grow with dataset size beyond the calibrated ratio between the 1m rung and 10m.
- Lanes: all three; one receipt per lane.
- Cases: CS-QMIX (point,getMany,selective-filter,reverse-ref); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE, EP-EXPLAIN. Profile: P-SCALE-10M.
- Closure: CR-SCALE + CR-PERF with {"thresholds": {"p99LatencyMsPerClass": "CALIBRATE", "latencyRatio10mOver1m": "CALIBRATE"}}.
- Sources: wiki/goals.md:11; lab/research/R1-xtdb-capabilities.md Q7 (only _id indexed); lab/reviews/plan-review-r1.codex.md finding 11.
- Grounding: **derived**.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G3.admission.preconstruction`: Expensive queries are refused before construction.**
- Statement: Every case of CS-ADMIT (reachability over its row or round budget, a SPARQL group with more EXISTS clauses than the planner budget allows, an unbounded cross product, a result beyond maxRows) is refused with the typed admission error before the engine builds the expensive structure: zero scratch rows or graphs created, no planner memory above the calibrated bound, and the engine stays available.
- Lanes: all three; one receipt per lane.
- Cases: CS-ADMIT (all); case set TO-AUTHOR.
- Oracle: O-ERR (TO-AUTHOR), O-OBS (TO-AUTHOR).
- Entrypoints: EP-REPO, EP-NATIVE, EP-ENGINE-OBS. Profile: P-HEAVY.
- Closure: CR-PASS-ALL + CR-OBSERVE with {"thresholds": {"plannerMemoryBytes": "CALIBRATE"}}.
- Sources: wiki/goals.md:11; lab/reviews/plan-review-r1.codex.md finding 1; lab/research/R6-xtdb-gap-analysis.md goal 3; lab/research/R2-qlever-capabilities.md 3.3, 6.5.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G3.cost.budget-honored`: Admitted queries stay inside their declared budget.**
- Statement: Every admitted query records its estimated cost and its actual rows, memory and time; on CS-QMIX at P-SCALE-10M no admitted query exceeds its declared budget, and a query whose actual cost crosses the budget is stopped at the budget with a typed error rather than run to completion.
- Lanes: all three; one receipt per lane.
- Cases: CS-QMIX (all); case set TO-AUTHOR.
- Oracle: O-OBS (TO-AUTHOR), O-ERR (TO-AUTHOR).
- Entrypoints: EP-REPO, EP-NATIVE, EP-EXPLAIN. Profile: P-SCALE-10M.
- Closure: CR-PASS-ALL + CR-OBSERVE.
- Sources: wiki/goals.md:11 (costing).
- Grounding: **derived**.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G3.recursion.scalable`: Recursion is correct and bounded on every topology at scale.**
- Statement: Recursive reads over chain, tree, diamond, cycle, high-fanout and skewed-hotset topologies (including a 100k-edge chain of depth 50) return O-REPLAY answers in the lane language (XTQL authors its own rounds, no SQL), record rounds and engine transactions per read, leave zero scratch residue, and meet the calibrated latency at the 1m rung and at P-SCALE-10M.
- Lanes: all three; one receipt per lane.
- Cases: CS-RECURSION-TOPO (all); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE. Profile: P-SCALE-10M.
- Closure: CR-PASS-ALL + CR-PERF with {"thresholds": {"p99LatencyMsPerTopology": "CALIBRATE"}}.
- Sources: wiki/goals.md:11; qualification/benchmark-contract.json topologies; lab/research/R6-xtdb-gap-analysis.md goal 3.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

Also counted in this section: `PKT.full142`, `S.packet.coresident`.

### Goal 4. Completed absence and negation at coherent cuts

**`G4.neg.correlated-not-exists`: Correlated negation is correct on the supported surfaces.**
- Statement: The flat and nested correlated NOT EXISTS controls (two revision rows and a later-order relation, expected only `two`), and their EXISTS, MINUS and OPTIONAL plus !BOUND variants and the latest-revision case, return the O-SHAPE answers through the repository and supported native fragments in the lane language.
- Lanes: all three; one receipt per lane.
- Cases: CS-SHAPE (negation); case set TO-AUTHOR.
- Oracle: O-SHAPE (TO-AUTHOR), O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE. Profile: P-TINY.
- Closure: CR-COUNTEREXAMPLE + CR-MUTANT-KILL with {"modes": ["current", "reopen"]}.
- Mutation controls: M-DECORRELATE.
- Sources: wiki/problems/native-correlation.md; lab/research/R5-qlever-semantic-blockers.md 1, 5.4; lab/research/R6-xtdb-gap-analysis.md experiment 5.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G4.neg.correlated-not-exists-raw`: Correlated negation is correct on the unrestricted raw surface.**
- Statement: The original raw correlated NOT EXISTS controls (flat and nested, unedited text) and their SQL and XTQL ports over the documented raw dataset return only `two`.
- Lanes: all three; one receipt per lane.
- Cases: CS-SHAPE (negation-raw); case set TO-AUTHOR.
- Oracle: O-SHAPE (TO-AUTHOR).
- Entrypoints: EP-RAW-HATCH, EP-RAW-WIRE. Profile: P-TINY.
- Closure: CR-COUNTEREXAMPLE with {"modes": ["current", "reopen"]}.
- Sources: wiki/problems/native-correlation.md; lab/research/R5-qlever-semantic-blockers.md 5.5 (C5 engine patch); lab/reviews/plan-review-r1.codex.md finding 14.
- Notes: For qlever-sparql this needs an engine repair (R5 C5). Open question Q1 in REPORT.md.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G4.cut.task-wide-fixed`: One cut per multi-call task under a concurrent writer.**
- Statement: Each multi-call task pins one captured position for all its calls; a writer committed between two calls of a task does not change that task's answer; the next task sees the writer; explicit earlier cuts inside a task never exceed the task position.
- Lanes: all three; one receipt per lane.
- Cases: CS-PKT-MULTICALL (all); case set TO-AUTHOR.
- Oracle: O-EVT (EXISTS), O-REPLAY (TO-BUILD).
- Entrypoints: EP-NATIVE. Profile: P-TINY-CONC.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL with {"modes": ["current", "reopen"]}.
- Mutation controls: M-CUT-OFF-BY-ONE.
- Sources: lab/research/R6-xtdb-gap-analysis.md finding 1, 2.6, experiment 2; packages/qualification/experiments/qlever-task-basis.ts.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G4.neg.conflict-not-false-absence`: Conflicts never read as absence.**
- Statement: With enforcement off, for every case of CS-CONFLICT (equal duplicates, unequal duplicates, overlapping intervals, partial repair, retirement of the last remaining support) the repository raises the typed conflict outcome on read; repository filters, joins, aggregates and negation never report a definite absence or a single value for a conflicted attribute; the documented native and raw recipes return the conflict indicator or the full value set.
- Lanes: all three; one receipt per lane.
- Cases: CS-CONFLICT (all); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE, EP-RAW-HATCH. Profile: P-TINY.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL with {"modes": ["current", "reopen"]}.
- Mutation controls: M-CONFLICT-PICK, M-DROPPED-SUPPORT.
- Sources: lab/reviews/plan-review-r1.codex.md finding 13; lab/reviews/plan-review-r1.response.md B4.
- Grounding: **derived**.
- Notes: The raw half depends on the B4 representation still under review round 2.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

Also counted in this section: `PKT.full142`, `R.native.fragment-equivalence`.

### Goal 5. Full-support aggregates, typed groups, empties, exact overflow

**`G5.agg.shape-controls`: Aggregate edge shapes keep their specified answers.**
- Statement: An empty maximum group stays absent, a grouped empty SUM produces no row, an ungrouped empty sum follows the packet rule (COALESCE to 0 where the task says so), and tied int64-maximum winners are all kept, on the repository and supported native fragments.
- Lanes: all three; one receipt per lane.
- Cases: CS-SHAPE (aggregate); case set TO-AUTHOR.
- Oracle: O-SHAPE (TO-AUTHOR), O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE. Profile: P-TINY.
- Closure: CR-COUNTEREXAMPLE with {"modes": ["current", "reopen"]}.
- Sources: wiki/problems/native-correlation.md (three passing edge controls); lab/research/R6-xtdb-gap-analysis.md goal 5.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G5.agg.full-support`: Aggregates count supports, not deduplicated values.**
- Statement: Aggregates over duplicate-valued assertions follow the specified set, pair and witness semantics (equal values on two assertions, the same value on two entities, RDF plain-triple deduplication): counts and sums equal O-REPLAY on the repository and supported native fragments.
- Lanes: all three; one receipt per lane.
- Cases: CS-SUPPORT (all); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE. Profile: P-TINY.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL with {"modes": ["current", "reopen"]}.
- Mutation controls: M-DROPPED-SUPPORT, M-IDENTITY-COLLAPSE.
- Sources: wiki/goals.md:13; testkit 'datalog aggregates preserve duplicate rows and define empty and distinct results'; lab/reviews/plan-review-r1.codex.md finding 13.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G5.agg.typed-groups`: Group keys keep typed identity.**
- Statement: Group keys and HAVING comparisons keep typed identity (boolean true, int64 1, binary64 1.0 per the specified rule, text '1' are distinct groups) on the repository and supported native fragments.
- Lanes: all three; one receipt per lane.
- Cases: CS-NUMERIC (groups); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"]}.
- Sources: wiki/goals.md:13; testkit 'datalog having preserves typed group and aggregate equality'.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G5.agg.exact-overflow`: Aggregate overflow is exact or a typed error.**
- Statement: SUM and AVG over int64 inputs whose exact total leaves [-2^63, 2^63-1], and totals that cross +/-2^59, return the exact value or the specified typed overflow error on the repository and supported native fragments; never a wrapped value.
- Lanes: all three; one receipt per lane.
- Cases: CS-NUMERIC (int64-aggregate); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD), O-ERR (TO-AUTHOR).
- Entrypoints: EP-REPO, EP-NATIVE. Profile: P-TINY.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL with {"modes": ["current", "reopen"]}.
- Mutation controls: M-INT64-ROUND.
- Sources: wiki/goals.md:13; lab/research/R6-xtdb-gap-analysis.md finding 2 (LongVector SUM wraps); lab/research/R2-qlever-capabilities.md 4.1.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

Also counted in this section: `PKT.full142`, `G4.neg.conflict-not-false-absence`.

### Goal 6. Cancellation, deadlines, resource ownership, cleanup

**`G6.cancel.observed-drain`: Native cancellation is observed down to drained engine work.**
- Statement: Cancelling a genuinely long read in the lane language produces evidence for every O-OBS level joined to one request: caller settlement, transport cancellation sent and acknowledged, the engine no longer running that statement within the calibrated bound, and healthy reuse of the same connection.
- Lanes: all three; one receipt per lane.
- Cases: CS-CANCEL (read); case set TO-AUTHOR.
- Oracle: O-OBS (TO-AUTHOR).
- Entrypoints: EP-NATIVE, EP-REPO, EP-ENGINE-OBS. Profile: P-HEAVY.
- Closure: CR-OBSERVE with {"thresholds": {"drainBoundMs": "CALIBRATE"}}.
- Sources: wiki/goals.md:14; wiki/problems/cancellation-observation-levels.md; lab/research/R6-xtdb-gap-analysis.md goal 6; lab/research/R2-qlever-capabilities.md 6.4.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G6.deadline.enforced`: Deadlines are enforced end to end.**
- Statement: A read that exceeds its timeoutMs returns the typed timeout within the deadline plus the calibrated grace, and the engine work drains as in G6.cancel.observed-drain; a non-interruptible engine operation (for example a QLever sort) is either prevented by admission or drained within the bound.
- Lanes: all three; one receipt per lane.
- Cases: CS-CANCEL (deadline); case set TO-AUTHOR.
- Oracle: O-OBS (TO-AUTHOR), O-ERR (TO-AUTHOR).
- Entrypoints: EP-NATIVE, EP-REPO, EP-ENGINE-OBS. Profile: P-HEAVY.
- Closure: CR-OBSERVE with {"thresholds": {"deadlineGraceMs": "CALIBRATE", "drainBoundMs": "CALIBRATE"}}.
- Sources: wiki/goals.md:14; lab/research/R2-qlever-capabilities.md 6.4.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G6.cancel.preaborted-no-work`: A pre-aborted request does no engine work.**
- Statement: A request cancelled before dispatch issues zero engine statements, observed engine-side, and returns the typed cancellation.
- Lanes: all three; one receipt per lane.
- Cases: CS-CANCEL (preaborted); case set TO-AUTHOR.
- Oracle: O-OBS (TO-AUTHOR), O-ERR (TO-AUTHOR).
- Entrypoints: EP-NATIVE, EP-REPO, EP-ENGINE-OBS. Profile: P-TINY.
- Closure: CR-OBSERVE.
- Sources: lab/research/R6-xtdb-gap-analysis.md goal 6 (native-query.test.ts); packages/qlever/experiments/native-entry.ts unavailable-cut-and-preaborted-query-reject.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G6.cleanup.scratch-zero`: No scratch residue after reads, cancels and crashes.**
- Statement: After normal reads, after cancellation in the middle of a recursion round, and after engine crash, restart and documented recovery, every scratch relation of the lane (XTDB tx_native_relations, tx_native_relation_attempts, tx_query_relations, constraint scratch; QLever native scratch and receipt graphs and derived nodes) holds zero rows for finished work, and every working-outcome-unknown is resolved.
- Lanes: all three; one receipt per lane.
- Cases: CS-SCRATCH (all); case set TO-AUTHOR.
- Oracle: O-OBS (TO-AUTHOR).
- Entrypoints: EP-NATIVE, EP-REPO, EP-RESOLVE, EP-ENGINE-OBS. Profile: P-FAULT.
- Closure: CR-FAULT with {"repetitionsPerFaultPoint": 3}.
- Sources: lab/research/R6-xtdb-gap-analysis.md finding 4, goal 6; lab/research/R4-codebase-harness-map.md 3.1, 4.1.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G6.ownership.bounded-connections`: Connections and engine work are bounded and released.**
- Statement: Engine connections per process never exceed the declared pool caps, across 100 open-use-close cycles and under 1024 logical clients; after close the engine-side connection count returns to its baseline and no background work continues.
- Lanes: all three; one receipt per lane.
- Cases: CS-LIFECYCLE (bounds); case set TO-AUTHOR.
- Oracle: O-OBS (TO-AUTHOR).
- Entrypoints: EP-TRIPLES, EP-REPO, EP-NATIVE, EP-ENGINE-OBS. Profile: P-TINY.
- Closure: CR-OBSERVE.
- Sources: wiki/goals.md:14; wiki/problems/load-liveness.md (separate pools, default 20 connections); lab/reviews/plan-review-r1.codex.md finding 2 (logical clients versus connections).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G6.resource.memory-failure-contained`: A resource failure does not take the engine down.**
- Statement: A read that would exceed the engine's memory budget is refused or fails with a typed error; writes and other reads keep working within the calibrated window without a manual restart; any restart the design needs is the documented recovery path and is counted in the receipt.
- Lanes: all three; one receipt per lane.
- Cases: CS-ADMIT (memory); case set TO-AUTHOR.
- Oracle: O-OBS (TO-AUTHOR), O-ERR (TO-AUTHOR).
- Entrypoints: EP-REPO, EP-NATIVE, EP-ENGINE-OBS. Profile: P-HEAVY.
- Closure: CR-OBSERVE with {"thresholds": {"availabilityWindowMs": "CALIBRATE"}}.
- Sources: wiki/problems/recovery.md (2GiB read OOM, ingestion unavailable); wiki/problems/qlever-planner-memory.md; lab/research/R2-qlever-capabilities.md 6.5.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

### Goal 7. Atomic writes, receipts, migration and evolution, recovery

**`G7.write.atomic`: Commands are all-or-nothing on every access path.**
- Statement: Every multi-operation command in CS-WRITE and every fault point in CS-FAULT that targets a write leaves either the complete command or nothing, as seen through every listed access path (XTDB _id lookup and column predicate; QLever subject, predicate-object and object scans); a later successful write never publishes a partial earlier one.
- Lanes: all three; one receipt per engine (both XTDB lanes share the XTDB receipt).
- Cases: CS-WRITE (atomic); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-TRIPLES, EP-WRITER, EP-RAW-WIRE. Profile: P-FAULT.
- Closure: CR-PASS-ALL + CR-FAULT with {"repetitionsPerFaultPoint": 3}.
- Sources: wiki/goals.md:15; lab/reviews/plan-review-r1.codex.md finding 7; lab/research/R2-qlever-capabilities.md 1.8 probes A and B.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G7.write.command-idempotency`: A command id commits at most once.**
- Statement: A duplicate commandId, sequentially and in a 16-way concurrent race, commits exactly once; every other attempt gets CommandAlreadyCommitted with the original transaction id; transactionByCommand returns that transaction.
- Lanes: all three; one receipt per engine (both XTDB lanes share the XTDB receipt).
- Cases: CS-WRITE (idempotency); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD), O-ERR (TO-AUTHOR).
- Entrypoints: EP-TRIPLES, EP-WRITER. Profile: P-TINY-CONC.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL with {"modes": ["current", "reopen"]}.
- Mutation controls: M-CLAIM-IGNORED.
- Sources: handoffs/claude-native/README.md:41; lab/research/R4-codebase-harness-map.md 3.4, 4.4; packages/qlever/test/storage.test.ts (16-way command test).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G7.write.preconditions-cas`: Preconditions and concurrency never lose an update.**
- Statement: TripleLive and EntityState preconditions reject stale commands with TransactionConflictError; under concurrent conflicting writers no acknowledged update is lost and replay-safe retries produce the O-REPLAY final state.
- Lanes: all three; one receipt per engine (both XTDB lanes share the XTDB receipt).
- Cases: CS-WRITE (preconditions); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD), O-ERR (TO-AUTHOR).
- Entrypoints: EP-TRIPLES, EP-WRITER. Profile: P-TINY-CONC.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"]}.
- Sources: lab/research/R4-codebase-harness-map.md 2.3, 3.5.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G7.receipt.journal-complete`: Receipts and journal are complete and ordered.**
- Statement: Every acknowledged command has a transaction record whose position, instant, actor, commandId, correlationId, causationId, configSnapshot and ordered changes equal O-REPLAY; journal entries cannot be retracted through ordinary writes; reserved namespaces reject ordinary writes atomically; every ACK has a durable operation receipt.
- Lanes: all three; one receipt per engine (both XTDB lanes share the XTDB receipt).
- Cases: CS-WRITE (receipts); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-TRIPLES, EP-WRITER, EP-RESOLVE. Profile: P-TINY.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL with {"modes": ["current", "reopen", "engine-restart"]}.
- Mutation controls: M-JOURNAL-ORDER.
- Sources: handoffs/claude-native/README.md:41; lab/research/R9-core-plumbing.md (journal tier); lab/reviews/plan-review-r1.codex.md finding 10; testkit cases 29-32, 34, 36, 39.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G7.write.unknown-outcome`: Unknown write outcomes resolve before any retry.**
- Statement: When the client is killed after submit, the connection drops during commit, or the engine times out the request, the caller gets the typed unknown-outcome error with its operation id; resolution through the operation id returns a definitive committed or absent outcome; no retry happens before resolution; the final state holds the command exactly once or not at all.
- Lanes: all three; one receipt per engine (both XTDB lanes share the XTDB receipt).
- Cases: CS-FAULT (lost-ack); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-TRIPLES, EP-WRITER, EP-RESOLVE. Profile: P-FAULT.
- Closure: CR-FAULT with {"repetitionsPerFaultPoint": 3}.
- Sources: handoffs/claude-native/START-HERE.md:35-43; lab/research/R4-codebase-harness-map.md 3.7, 4.4; lab/research/R2-qlever-capabilities.md 1.8 probe C.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G7.recovery.crash-restart`: Crash, restart and re-read of every old cut.**
- Statement: For every engine fault point in CS-FAULT (XTDB during COMMIT SYNC, after commit before ACK, mid recursion round; QLever between permutation mutations, after persistence before snapshot publication, during index rebuild, during projection maintenance), after restart and the documented recovery: every ACKed command is present, every unACKed command is resolved, every frozen cut re-reads identically through the repository, the native surface in every language of the engine, and the raw recipe, and all access paths agree.
- Lanes: all three; one receipt per engine (both XTDB lanes share the XTDB receipt).
- Cases: CS-FAULT (engine-crash); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-TRIPLES, EP-REPO, EP-NATIVE, EP-RAW-WIRE, EP-RESOLVE. Profile: P-FAULT.
- Closure: CR-FAULT with {"repetitionsPerFaultPoint": 3, "ackedCommandsLostMax": 0}.
- Sources: wiki/goals.md:15; lab/reviews/plan-review-r1.codex.md finding 7; lab/reviews/plan-review-r1.response.md B1; lab/research/R6-xtdb-gap-analysis.md experiment 10.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G7.recovery.backup-restore`: Backup and restore reproduce every read.**
- Statement: A stopped backup and a restore into a fresh engine reproduce every frozen cut on every surface, and the restored engine accepts new writes at the next position.
- Lanes: all three; one receipt per engine (both XTDB lanes share the XTDB receipt).
- Cases: CS-FAULT (backup-restore); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-TRIPLES, EP-REPO, EP-NATIVE. Profile: P-FAULT.
- Closure: CR-PASS-ALL.
- Sources: qualification/benchmark-contract.json separatePhases (backup, restore); lab/research/R6-xtdb-gap-analysis.md goal 7 (recovery.mjs).
- Grounding: **derived**.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G7.migration.schema-evolution`: Schema evolution with live data, concurrent clients and resumable backfill.**
- Statement: For each case of CS-MIGRATION (add an optional attribute, add a constraint over existing data, change an attribute's type-version, move an attribute to a new physical mapping), with old and new clients running concurrently: reads at bases before the release use the old mapping and after it the new one, a backfill killed midway resumes to the O-REPLAY final state, old cursors continue or fail with the typed cursor error, and history is preserved.
- Lanes: all three; one receipt per lane.
- Cases: CS-MIGRATION (all); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-WRITER, EP-NATIVE. Profile: P-TINY-CONC.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen", "engine-restart"]}.
- Sources: wiki/goals.md:15; lab/reviews/plan-review-r1.codex.md finding 12; lab/reviews/plan-review-r1.response.md decision 12.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G7.migration.valid-writes-never-rejected`: Valid Triplex writes are never rejected for the physical design.**
- Statement: Every write that O-REPLAY classifies as valid Triplex (untyped facts, facts without entityType, values that violate a projection column type, writes during a migration) is accepted, and every surface still reads it correctly.
- Lanes: all three; one receipt per engine (both XTDB lanes share the XTDB receipt).
- Cases: CS-MIGRATION (valid-writes); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-TRIPLES, EP-WRITER, EP-REPO, EP-NATIVE. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"]}.
- Sources: lab/reviews/plan-review-r1.codex.md finding 12; lab/reviews/plan-review-r1.response.md decision 12; lab/NOTEBOOK.md R9 decisions (never reject a valid write).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

Also counted in this section: `S.restart.at-scale`.

### Goal 8. Bounded reuse, transactional publication, maintained supports

**`G8.publish.coherent`: Every read sees one coherent publication.**
- Statement: Under concurrent commit groups, every read's answer equals O-REPLAY at the basis the read returned; no read mixes two publications of ledger, projection, schema or index state; delayed maintenance never yields an answer inconsistent with the returned basis.
- Lanes: all three; one receipt per lane.
- Cases: CS-PUBLISH (coherence); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE, EP-RAW-HATCH. Profile: P-TINY-CONC.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL.
- Mutation controls: M-STALE-PROJECTION.
- Sources: wiki/goals.md:16; lab/reviews/plan-review-r1.codex.md finding 8; lab/reviews/plan-review-r1.response.md B2.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G8.publish.basis-honesty`: Requested bases are honored and returned bases are true.**
- Statement: A read at a requested basis is answered at exactly that basis or fails with a typed error, never silently at another; the returned basis is the basis used; after a command is ACKed at position P, the writing client's next latest-basis read returns a basis at or after P.
- Lanes: all three; one receipt per lane.
- Cases: CS-PUBLISH (basis); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE, EP-TRIPLES. Profile: P-TINY-CONC.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL.
- Mutation controls: M-STALE-PROJECTION, M-CUT-OFF-BY-ONE.
- Sources: lab/reviews/plan-review-r1.codex.md finding 8 (ACK and read-your-writes); handoffs/claude-native/README.md:43-48.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G8.publish.valid-boundary`: Valid-time boundaries take effect without new writes.**
- Statement: When a fact's validFrom or validTo boundary passes with no new command, reads at valid instants beyond the boundary reflect it on every surface, both before and after any maintenance the design runs.
- Lanes: all three; one receipt per lane.
- Cases: CS-PUBLISH (boundary); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE, EP-RAW-HATCH. Profile: P-TINY-CONC.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL.
- Mutation controls: M-HALF-OPEN, M-STALE-PROJECTION.
- Sources: lab/reviews/plan-review-r1.codex.md finding 8 (valid-time boundaries without commands).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G8.reuse.bounded-keyed`: Reuse is bounded, correctly keyed and invalidated.**
- Statement: Every reused derived result (closures, maintained queries, projection segments, caches) is keyed by scope, position, recorded and valid time, definition hash and schema release; its size stays within the declared cap; answers equal a run with reuse disabled; an affecting write invalidates it for later bases; hit rate and rebuild cost are recorded.
- Lanes: all three; one receipt per lane.
- Cases: CS-REUSE (all); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE. Profile: P-TINY-CONC.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL.
- Mutation controls: M-STALE-REUSE.
- Sources: wiki/goals.md:16; lab/research/R6-xtdb-gap-analysis.md goal 8 (nothing proven for native).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G8.support.alternate-maintained`: Maintained supports survive partial retraction.**
- Statement: Removing one of two supports keeps a derived fact; removing the last support removes it; this holds for packet workload 20 and for CS-SUPPORT-DAG (depth beyond 3, at least 1,000 nodes, incremental deletions), and for two identical assertions where one is retracted.
- Lanes: all three; one receipt per lane.
- Cases: CS-SUPPORT-DAG (all); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE, EP-RAW-HATCH. Profile: P-TINY.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL with {"modes": ["current", "reopen"]}.
- Mutation controls: M-DROPPED-SUPPORT.
- Sources: wiki/goals.md:16; lab/research/R6-xtdb-gap-analysis.md 2.2 (workload 20 length-3 bound); lab/reviews/plan-review-r1.codex.md finding 13.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G8.support.maintenance-cost`: Maintenance cost and lag are measured and bounded.**
- Statement: At the 1m rung and at P-SCALE-10M, engine rows or triples written per domain fact (ledger, projection, journal, indexes separately), maintenance work per valid-time boundary and maintenance lag are recorded, and lag stays within the load contract's freshness bound.
- Lanes: all three; one receipt per lane.
- Cases: CS-SCALE-SAMPLE (maintenance); case set TO-AUTHOR.
- Oracle: O-OBS (TO-AUTHOR).
- Entrypoints: EP-ENGINE-OBS, EP-REPO. Profile: P-SCALE-10M.
- Closure: CR-METRICS + CR-PERF with {"thresholds": {"maintenanceLagMs": "load-contract.freshnessBoundMs"}}.
- Sources: wiki/goals.md:16; handoffs/claude-native/README.md:123-127 (write amplification separately).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

Also counted in this section: `S.maintenance.correct-during`.

### Goal 9. Bitemporal intervals, presence, corrections, lineage, deletion, cascades

**`G9.temporal.half-open-intervals`: Half-open valid intervals on every surface.**
- Statement: Valid intervals are [validFrom, validTo) with null meaning open-ended, exact at fractional-millisecond boundaries and at the boundary instants themselves, for every surface, current, reopen and engine restart.
- Lanes: all three; one receipt per lane.
- Cases: CS-TEMPORAL (valid); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-TRIPLES, EP-REPO, EP-NATIVE, EP-RAW-HATCH. Profile: P-TINY.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL with {"modes": ["current", "reopen", "engine-restart"]}.
- Mutation controls: M-HALF-OPEN.
- Sources: handoffs/claude-native/README.md:46-48; lab/research/R6-xtdb-gap-analysis.md 2.5 (half-open boundary checks).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G9.temporal.recorded-cuts`: Recorded-time and position cuts are exact.**
- Statement: Reads by recordedAt between commits, at an instant shared by two distinct commits, at interior positions of a nested multi-position transaction, after corrections, and around aborted transactions (before and after) equal O-REPLAY; ordinary reads take R and V only, exact P appears only in native contracts and pagination; any mapping to engine time is proven by these cases before use.
- Lanes: all three; one receipt per lane.
- Cases: CS-TEMPORAL (recorded); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-TRIPLES, EP-REPO, EP-NATIVE. Profile: P-TINY-CONC.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL with {"modes": ["current", "reopen", "engine-restart"]}.
- Mutation controls: M-CUT-OFF-BY-ONE.
- Sources: handoffs/claude-native/README.md:43-48; lab/reviews/plan-review-r1.codex.md finding 6; lab/reviews/plan-review-r1.response.md decision 6; lab/research/R1-xtdb-capabilities.md Q1.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G9.history.raw-lifetime-compat`: Ordinary history keeps the raw lifetime contract.**
- Statement: Ordinary Triples.history, match, entity and entities keep their raw assertion-lifetime contract (complete retractedAt, retractedPosition and retractTxId) exactly as O-REPLAY computes it; no global mask is applied.
- Lanes: all three; one receipt per engine (both XTDB lanes share the XTDB receipt).
- Cases: CS-HAM9 (raw-lifetime); case set EXISTS.
- Oracle: O-REPLAY (TO-BUILD), O-HAM (EXISTS).
- Entrypoints: EP-TRIPLES. Profile: P-TINY.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL with {"modes": ["current", "reopen"]}.
- Mutation controls: M-MASK-RAW.
- Sources: handoffs/claude-native/README.md:46-48; qualification/capacity/historical-assertion-metadata-v1/reproducers.json resultContract.rawLifetimeCompatibility.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G9.history.snapshot-metadata`: As-of snapshots hide retirements not yet known.**
- Statement: The five failing tiny-v4 checks, the finite-nine fixture and the same-R control pass through the repository timeline and as-of reads and through the native history helpers in the lane language: retirement fields are null until the retirement is known at the cut (R and P) and equal O-REPLAY after.
- Lanes: all three; one receipt per lane.
- Cases: CS-CFG8 (retirement-metadata-target), also CS-HAM9; case set EXISTS.
- Oracle: O-CFG8 (EXISTS), O-HAM (EXISTS), O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE. Profile: P-TINY-CONC.
- Closure: CR-COUNTEREXAMPLE + CR-MUTANT-KILL with {"modes": ["current", "reopen"]}.
- Mutation controls: M-FUTURE-RETIREMENT.
- Sources: wiki/goals.md:17; lab/research/R6-xtdb-gap-analysis.md 3.1; qualification/reviews/configured-entity-xtdb-tiny-v4-terminal-independent.json.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G9.corrections.preserve`: Corrections preserve what was previously recorded.**
- Statement: A correction (retract plus assert) keeps the earlier value visible at earlier recorded cuts and both versions in history, on every surface, current, reopen and restart.
- Lanes: all three; one receipt per lane.
- Cases: CS-TEMPORAL (corrections); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-TRIPLES, EP-REPO, EP-NATIVE, EP-RAW-HATCH. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen", "engine-restart"]}.
- Sources: wiki/goals.md:17; testkit 'historical corrections preserve what was previously recorded'.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G9.lineage.supporting-assertions`: Answers trace to their supporting assertions.**
- Statement: Every repository read and native helper row can return the ids and transaction ids of the assertions that support it, and they equal O-REPLAY's supports; packet lineage tasks (workload 16) are covered by PKT.full142.
- Lanes: all three; one receipt per lane.
- Cases: CS-ENTITY (lineage); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"]}.
- Sources: wiki/goals.md:17 (proof lineage); handoffs/claude-native/README.md:34 (assertion identity).
- Grounding: **derived**.
- Notes: 'Proof lineage' is read here as assertion-level provenance; confirm (open question Q6).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G9.presence.explicit`: Presence follows a frozen policy.**
- Statement: Explicit presence facts toggled true -> false -> true preserve domain facts and reference targets; configured-entity membership at a cut follows the frozen presence policy on every surface.
- Lanes: all three; one receipt per lane.
- Cases: CS-PRESENCE-DELETE (presence), also CS-CFG8; case set POLICY-PENDING.
- Oracle: O-REPLAY (TO-BUILD), O-CFG8 (EXISTS).
- Entrypoints: EP-REPO, EP-NATIVE, EP-RAW-HATCH. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"]}.
- Sources: wiki/research/presence-reference-deletion-requirements-v1.md; qualification/capacity/configured-entities-v1/CONTRACT.md.
- Grounding: **policy-pending**.
- Notes: Triplex has no presence policy; the convention part is grounded in configured-eight, the policy is not.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G9.deletion.entity`: Entity deletion keeps its contract and history.**
- Statement: The existing delete contract holds (retract the entity's current facts in one command, reject scheduled facts, retain history), and interval-local deletion follows the frozen deletion policy with preserved history and replay and reopen evidence.
- Lanes: all three; one receipt per lane.
- Cases: CS-PRESENCE-DELETE (deletion); case set POLICY-PENDING.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-WRITER, EP-TRIPLES. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen", "engine-restart"]}.
- Sources: wiki/research/presence-reference-deletion-requirements-v1.md (Entity deletion row).
- Grounding: **policy-pending**.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G9.cascade.restrict-detach-cascade`: Restrict, detach and bounded cascade.**
- Statement: Restrict, detach and bounded reverse cascade follow the frozen cascade policy: deterministic receipts, bounded newly removed endpoints, legal cycles that do not seed deletion, alternate supports, and atomic refusal when a cascade exceeds its budget.
- Lanes: all three; one receipt per lane.
- Cases: CS-PRESENCE-DELETE (cascade); case set POLICY-PENDING.
- Oracle: O-REPLAY (TO-BUILD), O-ERR (TO-AUTHOR).
- Entrypoints: EP-REPO, EP-WRITER. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"]}.
- Sources: wiki/research/presence-reference-deletion-requirements-v1.md (Restrict, detach and cascade row); wiki/goals.md:17.
- Grounding: **policy-pending**.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

Also counted in this section: `PKT.full142`, `G4.cut.task-wide-fixed`, `G8.publish.valid-boundary`.

### Goal 10. Public TypeScript and schema integration, scope, cursors, lifecycle, capabilities, consumers

**`G10.pkg.clean-consumer-slice`: Packaged vertical slice in a clean consumer.**
- Statement: From packed tarballs in a clean consumer outside the workspace: a write, a repository read, an authored native read in the lane language, history, a receipt, a cursor continuation and a reopen all equal O-REPLAY against the lane engine; the CLI inspects the same database and reports the same data.
- Lanes: all three; one receipt per lane.
- Cases: CS-SLICE (all); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-PKG, EP-CLI. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"]}.
- Sources: wiki/goals.md:18; lab/reviews/plan-review-r1.response.md B5 step 6; wiki/status.md:127.
- Notes: Whether the CLI must support XTDB and QLever is open question Q7.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G10.pkg.type-witnesses`: Public types are derived from the schema.**
- Statement: Against the packed public declarations: Repository<Model> types derive from EntityType (unknown attribute key is a compile error, cardinality-many is an array, absent optional is a missing property, int64 is the tagged integer type, refs carry their target type), and native contract types derive from schema handles; every positive witness compiles and every negative witness fails.
- Lanes: all three; one receipt per lane.
- Cases: CS-TYPEWITNESS (all); case set TO-AUTHOR.
- Oracle: O-SPEC (TO-AUTHOR).
- Entrypoints: EP-PKG. Profile: P-STATIC.
- Closure: CR-STATIC.
- Sources: lab/NOTEBOOK.md decision D5; lab/research/R3-artifacts/api-sketch.ts; wiki/status.md:30-37 (public type witnesses).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G10.scope.isolation`: Scopes never leak.**
- Statement: Two scopes on one engine with identical entity ids: the repository, the native helpers and the documented raw recipe for each scope return only that scope's data, current and reopen.
- Lanes: all three; one receipt per lane.
- Cases: CS-SCOPE (all); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE, EP-RAW-HATCH, EP-RAW-WIRE. Profile: P-TINY.
- Closure: CR-PASS-ALL + CR-MUTANT-KILL with {"modes": ["current", "reopen"]}.
- Mutation controls: M-SCOPE-LEAK.
- Sources: lab/reviews/plan-review-r1.codex.md finding 9; lab/reviews/plan-review-r1.response.md B3; packages/qlever/experiments/native-entry.ts scope-isolation.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G10.cursor.stable`: Cursors are complete, snapshot-stable and cheap.**
- Statement: Cursor pages are deterministic and traverse the complete snapshot with no duplicate or skipped row under concurrent writes; a cursor issued at P1 continues at P1 after the publication advances; historical cursors intersect recorded time; at P-SCALE-10M page 10,000 costs no more than the calibrated multiple of page 1.
- Lanes: all three; one receipt per lane.
- Cases: CS-CURSOR (all); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE, EP-TRIPLES. Profile: P-TINY-CONC.
- Closure: CR-PASS-ALL + CR-PERF with {"modes": ["current", "reopen"], "thresholds": {"deepPageCostRatio": "CALIBRATE"}}.
- Sources: testkit cursor cases; lab/reviews/plan-review-r1.codex.md finding 8; lab/research/R6-xtdb-gap-analysis.md goal 10 (OFFSET is O(offset)).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G10.cursor.compatibility`: Cursors survive restarts, releases and rebuilds.**
- Statement: A cursor issued before an engine restart, a client reopen, a schema release change or a projection rebuild either continues correctly or fails with the typed cursor error naming the reason; it never returns rows from another basis.
- Lanes: all three; one receipt per lane.
- Cases: CS-CURSOR (compatibility); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD), O-ERR (TO-AUTHOR).
- Entrypoints: EP-REPO, EP-NATIVE. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen", "engine-restart"]}.
- Sources: lab/reviews/plan-review-r1.codex.md finding 1 (cursor compatibility); lab/reviews/plan-review-r1.response.md decision 12 (old cursors route to the ledger).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G10.capabilities.truthful`: Advertised capabilities are true.**
- Statement: Every capability the runtime advertises has a passing case and every capability it does not advertise is refused with a typed error; the advertised set equals the lane's EXACT rows of the capability matrix.
- Lanes: all three; one receipt per lane.
- Cases: CS-CAPS (all); case set TO-AUTHOR.
- Oracle: O-ERR (TO-AUTHOR), O-REPLAY (TO-BUILD).
- Entrypoints: EP-TRIPLES, EP-REPO, EP-NATIVE. Profile: P-TINY.
- Closure: CR-PASS-ALL.
- Sources: wiki/goals.md:18; lab/research/R6-xtdb-gap-analysis.md goal 10 (Capabilities.none).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G10.lifecycle.open-close`: Open, close and reopen are clean.**
- Statement: initialize is idempotent across restarts, close releases every connection and background task (engine-side observed), the native provider shares or declares its pool, and reopen after close works.
- Lanes: all three; one receipt per lane.
- Cases: CS-LIFECYCLE (lifecycle); case set TO-AUTHOR.
- Oracle: O-OBS (TO-AUTHOR).
- Entrypoints: EP-TRIPLES, EP-REPO, EP-NATIVE, EP-ENGINE-OBS. Profile: P-TINY.
- Closure: CR-OBSERVE.
- Sources: wiki/goals.md:18; wiki/problems/load-liveness.md; lab/research/R4-codebase-harness-map.md 2.1 (initialize on every start).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G10.native.entry-checks`: Native entry checks in the lane language.**
- Statement: The native entry checks pass fresh, current and reopen, with every read check executed in the lane's language (XTQL versions of the SQL-only checks for xtdb-xtql, SQL versions of the XTQL-only checks for xtdb-sql, the 11 SPARQL checks for qlever-sparql).
- Lanes: all three; one receipt per lane.
- Cases: CS-ENTRY (all); case set EXISTS.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-NATIVE. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"], "languagePurity": true}.
- Sources: lab/research/R6-xtdb-gap-analysis.md 2.5; lab/research/R4-codebase-harness-map.md 5.4.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`G10.native.read-only-and-safe-params`: Native reads cannot write and parameters cannot inject.**
- Statement: Native read surfaces refuse every write form (multi-statement, modifying CTE, SPARQL UPDATE, comment-boundary escapes) with a typed error and no engine mutation, including recursion helpers under a read-only role; bound parameters containing quote, $$, ; and newlines are data.
- Lanes: all three; one receipt per lane.
- Cases: CS-ENTRY (read-only,safe-parameters); case set EXISTS.
- Oracle: O-ERR (TO-AUTHOR), O-OBS (TO-AUTHOR).
- Entrypoints: EP-NATIVE, EP-ENGINE-OBS. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"]}.
- Sources: lab/research/R6-xtdb-gap-analysis.md finding 4, 2.5; packages/xtdb/src/native/ReadOnlySql.ts.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

Also counted in this section: `G1.schema.release-derived-contracts`, `G2.strings.codepoint-supported`, `G2.strings.codepoint-raw`, `G7.migration.schema-evolution`, `R.raw.capability-required-cells`.

### R. Entity API (the ORM) and raw queries make sense

**`R.repo.entity-suite`: Entity suite against the independent oracle.**
- Statement: Every case of CS-ENTITY (section 6.4) passes through the repository and writer on the lane: all eight types, cardinality one and many, optional, refs and includes, history and timeline, corrections, conflicts with enforcement off, presence, at current and past bases, current, reopen and engine restart; expected answers come only from O-REPLAY.
- Lanes: all three; one receipt per lane.
- Cases: CS-ENTITY (all); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-WRITER. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen", "engine-restart"]}.
- Sources: lab/PLAN.md 1 (done condition item 4); lab/reviews/plan-review-r1.codex.md finding 5; lab/reviews/plan-review-r1.response.md decision 5.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`R.repo.mutation-controls`: The entity and history suites kill every mutant.**
- Statement: Each mutation control in the catalog makes at least one case of CS-ENTITY, CS-TEMPORAL or CS-HAM9 fail on the lane, with oracle and case files unchanged.
- Lanes: all three; one receipt per lane.
- Cases: CS-ENTITY (all), also CS-TEMPORAL,CS-HAM9; case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-WRITER, EP-NATIVE. Profile: P-TINY.
- Closure: CR-MUTANT-KILL.
- Mutation controls: M-HALF-OPEN, M-DROPPED-SUPPORT, M-FUTURE-RETIREMENT, M-INT64-ROUND, M-ENTITY-TYPE-SWAP, M-STALE-PROJECTION, M-CUT-OFF-BY-ONE, M-NEGZERO, M-ICU-ORDER, M-SCOPE-LEAK, M-MASK-RAW, M-CONFLICT-PICK, M-IDENTITY-COLLAPSE, M-JOURNAL-ORDER, M-CLAIM-IGNORED, M-DECORRELATE, M-STALE-REUSE, M-CARD-MANY-DROP.
- Sources: lab/reviews/plan-review-r1.codex.md finding 5; lab/reviews/plan-review-r1.response.md decision 5; lab/experiments/EXP-A01-acceptance-contract/BRIEF.md (mutation controls).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`R.raw.parity`: Raw queries return what the entity API returns.**
- Statement: For every query class of CS-RAW-RECIPES (point by id, attribute equality, range, order and page, ref join, reverse ref, anti-join, aggregate, history at a basis, interval at a valid instant, journal and receipt lookup), a raw query written only from the published raw-query guide returns the same answer as the repository at the same basis and as O-REPLAY, in the lane language, through both the raw hatch and direct wire access.
- Lanes: all three; one receipt per lane.
- Cases: CS-RAW-RECIPES (all); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-RAW-HATCH, EP-RAW-WIRE, EP-REPO. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"]}.
- Sources: lab/PLAN.md 1 (raw queries must make sense); lab/reviews/plan-review-r1.response.md B3 (raw-query dataset and scope contract).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`R.raw.guide-only-authoring`: Raw recipes are authored from the guide alone.**
- Statement: The raw recipes used by R.raw.parity were authored by an author whose inputs were only the raw-query guide and the engine's own documentation, recorded in an authoring manifest with input hashes.
- Lanes: all three; one receipt per lane.
- Cases: CS-RAW-RECIPES (all); case set TO-AUTHOR.
- Oracle: none (provenance check).
- Entrypoints: EP-RAW-WIRE. Profile: P-STATIC.
- Closure: CR-PROVENANCE.
- Sources: lab/PLAN.md 1 ('has never read Triplex source').
- Grounding: **derived**.
- Notes: Only partly machine-checkable: the manifest is checkable, the author's prior knowledge is not. Open question Q5.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`R.raw.capability-required-cells`: Required capability cells are exact on the raw surface.**
- Statement: Every capability-matrix cell whose required-by list is non-empty is EXACT for the lane with a passing receipt; every KNOWN-LIMIT cell has an empty required-by list, keeps its original counterexample receipt and is documented in the raw-query guide.
- Lanes: all three; one receipt per lane.
- Cases: CS-CAPS (all); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD), O-SHAPE (TO-AUTHOR), O-STR (EXISTS).
- Entrypoints: EP-RAW-HATCH, EP-RAW-WIRE, EP-NATIVE, EP-REPO. Profile: P-TINY.
- Closure: CR-MATRIX.
- Sources: lab/reviews/plan-review-r1.codex.md finding 14; lab/reviews/plan-review-r1.response.md decision 14.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`R.native.fragment-equivalence`: Helper fragments state and enforce their equivalence conditions.**
- Statement: Each supported native helper (correlation re-binding, order keys, conflict-aware fragments, recursion helpers) states its equivalence conditions; a static check refuses an authored query outside them with a typed error naming the condition; generated cases inside the conditions agree with O-REPLAY; a refusal never closes an obligation that requires the refused shape.
- Lanes: all three; one receipt per lane.
- Cases: CS-FRAGMENT-EQUIV (all); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD), O-ERR (TO-AUTHOR).
- Entrypoints: EP-NATIVE. Profile: P-TINY.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"]}.
- Sources: lab/research/R5-qlever-semantic-blockers.md 5.4; lab/reviews/plan-review-r1.codex.md finding 14.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

Also counted in this section: `G10.pkg.type-witnesses`.

### S. Scale: 10m distinct entities, 100m active representative facts

**`S.dataset.target-population`: The target dataset exists and is counted.**
- Statement: One database scope holds 10,000,000 distinct application entities and 100,000,000 active representative domain facts written through public writes (representative profile, 10 facts per entity), and a second dataset holds 10,000,000 entities at 1 fact each (sparse profile); counts of configured entities, domain facts, structural facts, assertion versions and retirements, config facts, journal, claim and receipt metadata, maintenance relations and engine rows or triples are reported separately and match independent count queries and O-REPLAY analytic counts; every command is ACKed with a receipt and no outcome is unresolved.
- Lanes: all three; one receipt per engine (both XTDB lanes share the XTDB receipt).
- Cases: CS-SCALE-SAMPLE (counts); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-WRITER, EP-TRIPLES, EP-NATIVE. Profile: P-SCALE-10M.
- Closure: CR-SCALE with {"distinctEntities": 10000000, "activeDomainFacts": 100000000, "profiles": ["representative-10", "sparse-1"], "singleScope": true}.
- Sources: wiki/goals.md:40-46; handoffs/claude-native/README.md:123-127; qualification/benchmark-contract.json; qualification/capacity/configured-entities-v1/CONTRACT.md; qualification/load-waves/five-surface-point-rate16-v1/plan.json fixture.countMeaning.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`S.rungs.ladder`: Each rung passes before the next opens.**
- Statement: Rungs 10k, 100k, 1m and 10m are climbed in order; each rung is admitted by capacity forecast and passes S.correctness.query-families before the next rung is admitted; a failing or blocked rung keeps S open.
- Lanes: all three; one receipt per lane.
- Cases: CS-SCALE-SAMPLE (per-rung); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE. Profile: P-RUNG.
- Closure: CR-SCALE.
- Sources: lab/PLAN.md 3.5; qualification/capacity/configured-entities-v1/CONTRACT.md (admission stages).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`S.correctness.query-families`: All query families are correct at 10m.**
- Statement: At P-SCALE-10M, for both profiles, the nine query families (point, selective filter, join, anti-join, recursion, aggregate, historical, interval, pagination) run on deterministic sampled parameters and on complete-count queries, on the repository and in the lane language, and every answer equals O-REPLAY with zero tolerance.
- Lanes: all three; one receipt per lane.
- Cases: CS-SCALE-SAMPLE (families); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE. Profile: P-SCALE-10M.
- Closure: CR-SCALE with {"samplesPerFamily": "CALIBRATE"}.
- Sources: qualification/benchmark-contract.json queryFamilies; qualification/capacity/configured-entities-v1/CONTRACT.md.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`S.capacity.admitted`: Scale runs fit the admitted envelope.**
- Statement: Before each rung the run is admitted with a forecast of peak memory and disk that includes rebuild or compaction overlap, delta growth during rebuild, pre-GC growth, WAL, backups, replay peaks and host-side clients; observed peaks stay within the envelope; an over-budget rung is BLOCKED_CAPACITY and S stays open; no deletion of evidence or budget increase converts a failure into a pass.
- Lanes: all three; one receipt per engine (both XTDB lanes share the XTDB receipt).
- Cases: CS-SCALE-SAMPLE (capacity); case set TO-AUTHOR.
- Oracle: O-OBS (TO-AUTHOR).
- Entrypoints: EP-ENGINE-OBS. Profile: P-SCALE-10M.
- Closure: CR-SCALE.
- Sources: qualification/benchmark-contract.json capacityRule; lab/reviews/plan-review-r1.codex.md finding 15; lab/reviews/plan-review-r1.response.md decision 15.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`S.metrics.reported`: Scale metrics are measured and reported separately.**
- Statement: At each rung and at 10m: bytes per entity and per fact, write amplification (ledger, projection, journal, indexes separately), history separately, ingest rate, cold and warm latency p50, p90, p95 and p99 per family (at least 10,000 observations per qualified population), rebuild or compaction time, restart time, peak RSS per resource owner and peak disk.
- Lanes: all three; one receipt per lane.
- Cases: CS-SCALE-SAMPLE (metrics); case set TO-AUTHOR.
- Oracle: O-OBS (TO-AUTHOR).
- Entrypoints: EP-ENGINE-OBS, EP-REPO, EP-NATIVE. Profile: P-SCALE-10M.
- Closure: CR-METRICS.
- Sources: qualification/benchmark-contract.json measurements; handoffs/claude-native/README.md:123-127; lab/PLAN.md 3.5.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`S.maintenance.correct-during`: Maintenance at 10m keeps reads correct.**
- Statement: Compaction, index rebuild and projection maintenance at P-SCALE-10M complete, and reads during and after them equal O-REPLAY; their duration is recorded.
- Lanes: all three; one receipt per engine (both XTDB lanes share the XTDB receipt).
- Cases: CS-SCALE-SAMPLE (maintenance); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE, EP-ENGINE-OBS. Profile: P-SCALE-10M.
- Closure: CR-SCALE.
- Sources: qualification/benchmark-contract.json separatePhases (maintenance); lab/research/R2-qlever-capabilities.md 1.7.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`S.restart.at-scale`: Restart at 10m.**
- Statement: An engine restart at P-SCALE-10M becomes available within the recorded time and every sampled old cut re-reads identically.
- Lanes: all three; one receipt per engine (both XTDB lanes share the XTDB receipt).
- Cases: CS-SCALE-SAMPLE (restart); case set TO-AUTHOR.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE. Profile: P-SCALE-10M.
- Closure: CR-SCALE + CR-METRICS.
- Sources: qualification/benchmark-contract.json separatePhases (restart).
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`S.packet.coresident`: The packet passes with the target dataset resident.**
- Statement: PKT.full142 passes in a separate scope on the engine that holds the P-SCALE-10M dataset, so the packet's plans are qualified at target scale.
- Lanes: all three; one receipt per lane.
- Cases: CS-PKT71 (all), 142 executions; case set EXISTS.
- Oracle: O-EVT (EXISTS).
- Entrypoints: EP-NATIVE. Profile: P-SCALE-10M.
- Closure: CR-PASS-ALL with {"modes": ["current", "reopen"], "languagePurity": true}.
- Sources: wiki/goals.md:11 (no target-scale plan qualification).
- Grounding: **derived**.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

Also counted in this section: `G8.support.maintenance-cost`.

### L. Load: 256 logical clients, 512 and 1024 stress

**`L.calibration.frozen`: The load contract is calibrated and frozen before acceptance.**
- Statement: A create-only calibration receipt freezes the load-contract version hash and every CALIBRATE value, respecting every hard floor and ceiling, before any acceptance run; calibration runs never count as acceptance.
- Lanes: all three; one receipt per lane.
- Cases: CS-LOAD (calibration); case set DRAFT.
- Oracle: O-OBS (TO-AUTHOR).
- Entrypoints: EP-REPO, EP-NATIVE, EP-WRITER. Profile: P-LOAD.
- Closure: CR-LOAD with {"level": "calibration"}.
- Sources: qualification/benchmark-contract.json calibration; lab/reviews/plan-review-r1.codex.md finding 2; lab/reviews/plan-review-r1.response.md decision 2.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`L.accept.256`: 256 logical clients with steady writes at 10m.**
- Statement: At 256 logical clients on the representative P-SCALE-10M dataset, with the writer floor, the frozen query mix and maintenance overlapping the window, three independent runs per lane each meet every threshold and invariant of load-contract.json.
- Lanes: all three; one receipt per lane.
- Cases: CS-LOAD (256); case set DRAFT.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE, EP-WRITER. Profile: P-LOAD.
- Closure: CR-LOAD with {"level": 256, "runs": 3}.
- Sources: wiki/goals.md:40-46; lab/PLAN.md 1 (done condition item 3); lab/reviews/plan-review-r1.codex.md finding 2.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`L.stress.512`: 512-client stress under the frozen overload policy.**
- Statement: At 512 logical clients the overload policy holds in three runs per lane: zero wrong answers, rejections typed and counted, the writer floor met, admitted correct goodput at or above the calibrated fraction of the 256 goodput, outstanding work within the pending limit.
- Lanes: all three; one receipt per lane.
- Cases: CS-LOAD (512); case set DRAFT.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE, EP-WRITER. Profile: P-LOAD.
- Closure: CR-LOAD with {"level": 512, "runs": 3}.
- Sources: wiki/goals.md:40-46; lab/PLAN.md 1.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`L.stress.1024`: 1024-client stress under the frozen overload policy.**
- Statement: The L.stress.512 conditions hold at 1024 logical clients in three runs per lane.
- Lanes: all three; one receipt per lane.
- Cases: CS-LOAD (1024); case set DRAFT.
- Oracle: O-REPLAY (TO-BUILD).
- Entrypoints: EP-REPO, EP-NATIVE, EP-WRITER. Profile: P-LOAD.
- Closure: CR-LOAD with {"level": 1024, "runs": 3}.
- Sources: wiki/goals.md:40-46; lab/PLAN.md 1.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

**`L.recovery.after-stress`: The system recovers after stress.**
- Statement: After each 1024 stress window, a 256 acceptance window that starts within the calibrated recovery window passes every L.accept.256 threshold, with zero outstanding work and connection counts and engine memory back within the calibrated band of their pre-stress baseline.
- Lanes: all three; one receipt per lane.
- Cases: CS-LOAD (recovery); case set DRAFT.
- Oracle: O-REPLAY (TO-BUILD), O-OBS (TO-AUTHOR).
- Entrypoints: EP-REPO, EP-NATIVE, EP-WRITER, EP-ENGINE-OBS. Profile: P-LOAD.
- Closure: CR-LOAD with {"level": "recovery", "runs": 3}.
- Sources: lab/reviews/plan-review-r1.codex.md finding 2 (recovery after stress); lab/reviews/plan-review-r1.response.md decision 2.
- Status: OPEN on every listed lane (no fresh acceptance receipt exists).

<!-- END GENERATED OBLIGATIONS -->

## 8. Counts

Obligations per section and lane (an obligation in several sections is counted in each; the last row counts
distinct obligations).

<!-- BEGIN GENERATED COUNTS -->

| Section | xtdb-xtql | xtdb-sql | qlever-sparql | of which policy-pending | of which derived |
| --- | ---: | ---: | ---: | ---: | ---: |
| G1 | 10 | 10 | 10 | 0 | 1 |
| G2 | 8 | 8 | 8 | 0 | 2 |
| G3 | 7 | 7 | 7 | 0 | 3 |
| G4 | 6 | 6 | 6 | 0 | 1 |
| G5 | 6 | 6 | 6 | 0 | 1 |
| G6 | 6 | 6 | 6 | 0 | 0 |
| G7 | 10 | 10 | 10 | 0 | 1 |
| G8 | 7 | 7 | 7 | 0 | 0 |
| G9 | 12 | 12 | 12 | 3 | 1 |
| G10 | 14 | 14 | 14 | 0 | 0 |
| R | 7 | 7 | 7 | 0 | 1 |
| S | 9 | 9 | 9 | 0 | 1 |
| L | 5 | 5 | 5 | 0 | 0 |
| distinct obligations | 88 | 88 | 88 | 3 | 10 |

<!-- END GENERATED COUNTS -->

## 9. Inherited evidence (reference only, closes nothing)

| Inherited result | Where | Relevant obligations |
| --- | --- | --- |
| XTDB unchanged44 v5, translated142 v3, native142 v7 | `qualification/reviews/xtdb-final-combined-independent.json` (raw terminals absent) | G1.found.unchanged44, PKT.full142 (SQL) |
| QLever native142 v5 at planner100, entry11 | `qualification/reviews/qlever-combined-final-functional-independent.json`, `qlever-native-entry-final-independent.json` | PKT.full142, G10.native.entry-checks |
| configured-eight tiny v4: 47 pass, 5 fail | `qualification/reviews/configured-entity-xtdb-tiny-v4-terminal-independent.json` | G9.history.snapshot-metadata |
| QLever public string v6: native 2/11, translated 2/9 | `qualification/reviews/qlever-public-string-v6-terminal-independent.json` | G2.strings.* |
| XTDB native 16 RPS control: 480 correct, 6/6 writers | `qualification/reviews/xtdb-writer-rate16-control-v1-independent.json` | L.* (hard floors only) |
| QLever native-only 16 RPS: 448 correct, 32 deadlines, 0/6 writers | `wiki/problems/load-liveness.md` | L.* |

These bind their own as-run sources on another machine (`handoffs/claude-native/README.md:58-60`). R6 section 1
lists what is and is not present in this checkout.
