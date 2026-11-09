# EXP-RQ01 independent offline QA — CX-VRQ01

Verdict: **FIX-FIRST**. The targeted comparisons work, but the generated gate has
reproduced false acceptance and a conflicting reproducibility contract.

Reviewed builder: `exp/RQ01-route-equivalence` at `93ad96e61dc6e8898bba018ff6b8799454d28ab3`.
Reviewer branch: `verify/RQ01`. No reviewed implementation files were changed.

North star: P1 and P4 correctness: an exact named cut must yield the same answer on
all eligible routes, with explicit typed refusal elsewhere. Goals and targets:
`lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. Review contract: R31 section 4
and Q89a–h, especially Q89f. This is offline QA of the harness, not engine qualification.

## Method and evidence

Read the builder report and r5 receipt, R31 and Q89a–h. Execute source from the
review checkout; resolve the harness's sole runtime import to the unchanged core
SHA-256 implementation. The loader transforms TypeScript syntax only. No
reviewed source or dependency was installed, patched or copied from a sibling
worktree. Existing pinned Vitest is read from the main checkout; its config,
cache, output and all review tools live here.

`review.mjs` contains a separate small ledger model (it does not call the harness
fold or replay function). Each fault has a clean control run, then the fault on
only the `injected` route; the `control` route must remain clean. It measures
operation witnesses from actual writes and existing row identities, rather than
using index-modulo labels. Five seeds match the builder's r5 seed list.

Fresh commands:

```sh
node lab/bin/heavy.mjs --label CX-VRQ01-review-a2 -- node lab/verify/RQ01/run.mjs
node lab/bin/heavy.mjs --label CX-VRQ01-offline-lanes-a3 -- node lab/verify/RQ01/supplement.mjs
node lab/bin/heavy.mjs --label CX-VRQ01-offline-lanes-a4 -- node lab/verify/RQ01/lane-rerun.mjs
node lab/bin/heavy.mjs --label CX-VRQ01-offline-lanes-a5 -- node lab/verify/RQ01/lane-rerun-a5.mjs
```

First attempt: `first-attempt.md` and `evidence-a1/` retain the reviewer probe bug
and the three completed fault records. Corrected execution uses a new attempt;
no original failure was overwritten. All actual test/fault executions use the
shared heavy wrapper. No engines, containers, networking, performance or live
lane tests are involved.

## Findings

### F1 — High: generated bounded corrections change the subject

Location: `packages/testkit/src/route-equivalence.ts:194`, `:245`.

The case-6 "correction" retracts `row:index-1`, then asserts a new row on the
newly drawn `subject`, without preserving the old entity. With the current LCG,
the extra draw in case 5 changes parity, and case 6's subject necessarily has a
different parity. Every one of the five bounded edits per 40-commit history
therefore changes subjects. The supposedly same-transaction replacements in
case 3 also pick a new subject and only sometimes represent an actual replacement.

Reproduction: `review.mjs` measures same-subject, same-attribute replacements
against previously asserted rows, retains `replace-witnesses-<seed>.json`, and
runs a route that ignores only real same-subject bounded corrections. The same
fault is then exercised against an authored same-subject correction witness.
All five seeds have **zero** same-subject bounded edits. Seeds 1, 890 and 89 also
have zero same-subject replacements; seeds 42 and 891 have two and one,
respectively. At seed 42 / P=7168, the retract target belongs to `subject:1`
and the bounded replacement belongs to `subject:4`. The correction-ignoring
route passed all **12,390** generated observations, yet the authored witness
produced ten HE-1/HE-2 violations. See
`evidence-a2/real-correction-mutant-generated-pass.json` and
`evidence-a2/real-correction-mutant-witness-fail.json`.

Impact: a route can mishandle the exact retroactive-edit operation R31 requires
while passing the generated gate. Merely counting finite valid intervals does
not establish valid-time correction coverage.

Proposed fix: derive replacement entity/attribute from the actual retract target;
assert semantic operation witnesses in the generator tests, including a
same-subject bounded edit and its before/inside/after valid-time answers. Keep a
regression that the correction-ignoring route fails the default generated gate.

### F2 — High: required R31 histories and retention cuts are absent

Location: `packages/testkit/src/route-equivalence.ts:191`, `:261`, `:439`.

The generator emits eight fixed operation patterns, always at whole multiples
of 1024 with monotonically nondecreasing stamps. It has no nested committed
ordinal, claims-only/position-only transaction, explicit CAS abort or controlled
stage/commit inversion, and no clock rollback. Numeric holes created by adding
1024 are not evidence of an abort. `P_i + 1` requests are not committed interior
ordinal receipts. The D-C1 authored negative fixture covers one inversion outside
the generator; it does not make the generated histories cover that family.

The default purge occurs after append, at the new head in the offline fixture.
Requests were frozen before append and do not include that actual horizon or
its predecessor. No pinned/unpinned horizon is declared to the basis generator.
Only purge/catch-up/cold-cache events are available; an index-job event and
flush/compaction are not implemented (the latter needs a live adapter and is
outside this offline review).

Reproduction: inspect `evidence-a2/coverage.json`, including event-derived
`purgeHorizonAndPredecessor`, and compare its operation witnesses to R31 4.2–4.3.
The top-level labels L/V/P/T/TP/H all appearing does not prove these histories or
boundary shapes exist. The builder report acknowledges several omissions, but
Q89f requires the R31 harness, so those remain acceptance gaps.

Proposed fix: model the missing schedules and driver-recorded receipt/abort
identities explicitly; derive cuts from those identities and the chosen pinned
and unpinned horizons. Add a required coverage manifest and fail its offline
gate on any missing offline family. Keep engine-only events explicit as pending,
rather than treating a semantic no-op event as qualification.

### F3 — High: raw lifetime metadata conflicts with HE-5's byte equality

Location: `packages/testkit/src/route-equivalence.ts:123`, `:399`.

The fold updates every row's retirement fields when later commits retract it;
`replayRouteAnswer` filters membership at the requested cut but returns that raw
row without an as-of retirement mask. HE-1 therefore expects future retirement
metadata at an old cut, while HE-5 demands that every column stay identical.
Both honest model routes can match the reference exactly in every phase and
still acquire HE-5 failures after an ordinary later retraction.

Reproduction: start with one assertion at P=1024, read P=1024, append its
retraction at P=2048, repeat the original P=1024 request. Membership and value
are unchanged; the three retirement columns change. There are **eight HE-5
violations and zero HE-1/HE-2 violations**, on both honest routes across the four
post-append phases. See
`evidence-a2/retirement-metadata.json`.

This is distinct from D-C1's newly visible assertion. Existing O-REPLAY code
explicitly distinguishes raw lifetime (`AMB-01 A`) and as-of snapshots:
`lab/oracles/replay/views.py:163`, `:188`, and
`lab/oracles/replay/replay.py:230`. That is source context, not a fresh oracle run.
The default extension only asserts a new unrelated row, concealing this conflict
in the builder's passing generated cases.

Proposed fix: choose and name the result contract for each driver. Qualify the
immutable snapshot view using correctly masked retirement metadata; preserve
raw-lifetime equality separately where that API contract applies. Bind the
reference to that view and add an existing-row retraction extension regression.
Do not simply remove metadata comparison or bless every HE-5 failure as Q89a.

### F4 — Medium: the public gate succeeds with zero requested reads

Location: `packages/testkit/src/route-equivalence.ts:352`, `:465`.

`requests: []` is accepted, every phase loops over zero requests, and
`makeRouteEquivalenceCases(...)[0].run()` resolves with no observations or
violations—even when the fixture contains the known dropped-retraction route.
A caller-side route/shape filter can thus silently turn this required gate into
a success that exercised nothing.

Reproduction: `evidence-a2/empty-request-pass.json` and the corresponding entry
in the review receipt.

Proposed fix: reject empty request sets; assert nonzero observations and the
required coverage manifest before declaring a qualification case successful.

## Execution results

`run-a2/receipt.json`: every actual child exit is zero. Sources stayed unchanged;
all ten source hashes from the builder's r5 receipt match the reviewed checkout.
Node 22.23.2, Vitest 5.0.4. `evidence-a2/receipt.json` binds the review probe,
loader, source, seeds and resulting measurements. These are successful QA
executions that establish the findings, **not** a semantic ACCEPT.

### Requested fault injections

Each row below uses two routes, five phases, and a separate clean control with
zero violations. The bad route is always identified separately from the control.
The controls were asserted before the injected runs.

| Fault injected into one model route | Violations | Rules observed | Evidence |
| --- | ---: | --- | --- |
| Dropped retraction | 10 | HE-1, HE-2 | `evidence-a2/drop-retraction.json` |
| Omitted one of two rows committed in the same millisecond | 10 | HE-1, HE-2 | `evidence-a2/drop-same-ms-tie.json` |
| Future position answered with the available old state | 14 | HE-1, HE-3, HE-5 | `evidence-a2/future-old-data.json` |
| Empty answer plus an ineligible flag instead of typed refusal | 15 | HE-1, HE-3, HE-6 | `evidence-a2/empty-ineligible.json` |
| Same-subject valid-time correction ignored on one route | 10 | HE-1, HE-2 | `evidence-a2/ignore-correction.json` |

The future-position bad route also changes after the unrelated append, hence
its additional HE-5 reports. A separate empty-result probe returns **only**
`rows: []`, with no ineligible flag. It is also caught: ten HE-1/HE-3 violations,
zero HE-6; its clean control has zero violations. Evidence:
`run-a3/empty-without-flag.json` and its retained command log.

### Measured generator coverage

All five seeds produce 40 commits and all six subjects. Exact witness data,
requests per family, and boundary predicates are in `evidence-a2/coverage.json`.

| Seed | L | V | P | T | TP | H | Total requests |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 27 | 81 | 42 | 600 | 486 | 1,237 |
| 42 | 1 | 29 | 81 | 42 | 600 | 486 | 1,239 |
| 890 | 1 | 27 | 81 | 42 | 600 | 486 | 1,237 |
| 89 | 1 | 27 | 81 | 42 | 600 | 486 | 1,237 |
| 891 | 1 | 28 | 81 | 42 | 600 | 486 | 1,238 |

For every seed, measurements confirm every committed P; every stamp ±0.5 and
the stamp itself; every valid boundary ±1 and the boundary itself; now and an
omitted validAt; future position and record time; TP with T both earlier and
later than its P's stamp; and every subject's history at every committed P.
The required **actual** purge horizon 43008 and its predecessor 43007 are absent,
as are cuts backed by real interior commits and aborted attempts.

| R31 history family | Actual measured coverage per 40-commit seed |
| --- | --- |
| Single-fact assertions | 10 assertion-only transactions, including bounded and future rows |
| Groups of 5–50 assertions | 5 groups of 40 |
| Retraction of one fact | 15 transactions containing exactly one retraction; this includes replacements and same-transaction self-retraction |
| Group retraction | 5 groups of 10 |
| Cardinality-many then retract one | Present: the two assertions in each case-2 transaction are followed by retracting one; the broader live-peer witness metric reports 9/10/10/10/10 single-retraction transactions with surviving peers |
| Same-subject retract/assert replacement | 0/2/0/0/1 for seeds 1/42/890/89/891; not guaranteed per seed |
| Same-new-row assert/retract | 5 |
| Same-subject bounded valid-time edit | **0**; all five finite correction replacements change subjects |
| Future valid-time fact | 5 |
| Nested transactions/interior committed ordinals | **0** |
| Claims-only and position-only commits | **0** |
| Aborted CAS commit | **0**; spacing between positions is artificial |
| Controlled staging/commit inversion | **0** in generated histories; separately covered by the authored D-C1 negative test |

Clock control: 20 adjacent same-millisecond pairs, zero backwards clock steps,
no runtime-controlled stage/decide scheduler. Retention: three post-append
event names (purge, catch-up, cold-cache), no pinned/unpinned horizon schedule,
no Datomic index job and no XTDB flush/compaction. Full-product and live scale
profiles were not executed. Those counts establish **incomplete** R31 coverage.

### D-C1 is explicitly known-failing and guarded

`packages/testkit/test/route-equivalence.test.ts:94` names **known-failing Q89a /
R31 D-C1**. Fresh execution of the original test file passed **14/14 tests,
0 pending, 0 todo**, including that exact named case. Evidence:
`run-a2/original-tests.json` and `.log`.

The independent repetition produced **20 HE-5 violations**, one on every model
route at each post-append phase, with no other rule violations:
`evidence-a2/dc1-known-failing-Q89a.json`. Feeding the same case to
`makeRouteEquivalenceCases` rejects; it cannot become a positive equivalence PASS.

`guard-original/` executes a copy of the original D-C1 test body with only its
import paths adapted; it exits zero. `guard-repair/` changes only the late
commit's timestamp from 1000 to 1002, simulating the disappearance of that
failure. The original expectation then exits **1**, specifically
`expected 0 to be greater than 0`. Its wrapper asserts both the exit and that
exact assertion failure. It is an expected negative probe, not a failing
review execution and not an implementation repair. These two receipts confirm
that the current negative regression is active and an unexpected repair is
not silently accepted or skipped.

### Original offline lane tests

Attempts and actual outcomes are retained separately:

- `run-a3/`: the empty-without-flag probe passes; both lane suites initially
  fail discovery because the review worktree has no local `ulidx` link.
- `run-a4/`: resolving the already installed, lockfile-pinned ulidx 2.4.1 makes
  the original QLever model test pass; XTDB discovery still fails on its missing
  local `postgres` link. No XTDB tests ran in this attempt.
- `run-a5/`: **4/4 original lane tests pass**, 0 pending/todo: three XTDB
  tests (including the explicit Q89c / D-X1 negative expectation) and the QLever
  model test. Actual Vitest exit **0**, `sourceStillMatches:true`; the receipt
  binds all tracked core/XTDB/testkit inputs, the lane tests and the resolved
  dependency entry bytes. This is offline client/model evidence only.

No dependency was installed and no lockfile or node_modules directory was
changed. The added configs resolve the existing pinned external modules, while
all workspace aliases continue to select this review checkout's source.

`MANIFEST.json` seals every retained review artifact (excluding cache files and
the manifest itself) and verifies that the implementation still matches the
reviewed builder head. The report and all evidence are committed together on
`verify/RQ01`.

## Scope limits and open questions

No implementation fix, merge, push, publication, engine lifecycle change, live
route qualification, performance test, full root check, package build or clean
consumer install was performed. Actual QLever broker/H1 and Datomic routes
remain unimplemented in the reviewed adapter inventory; XTDB's lane test uses
an offline SQL client and a driver future-position guard. The builder labels
those boundaries honestly; its r5 receipt is historical evidence, not fresh
engine or independent O-REPLAY acceptance.

The orchestrator must resolve the raw-lifetime versus immutable-snapshot output
contract in F3 and retain the R31 coverage denominator in F2 before Q89f is used
as the general read-route promotion gate. Q89a remains a separate known product
failure; this review does not close it.
