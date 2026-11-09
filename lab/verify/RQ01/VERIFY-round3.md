# EXP-RQ01 round-three independent QA — CX-VRQ01

Verdict: **ACCEPT — merge the harness as the Q89f gate.** No blocking findings
remain in this offline review. Both round-two F2 counterexamples are repaired;
the original correctness, refusal, snapshot and nonempty-coverage checks remain
active. This accepts the reusable gate, not any engine or unwired route.

North star: P1 immutable named reads and P4 exact route admission. Goals/targets:
`lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. Review contract: R31 section 4,
Q89a–i and R-RCP-5/R-CUT-5's physical-group rules.

Builder head: `d5cd32e6` (`exp/RQ01-route-equivalence`), merged as explicitly
requested into `verify/RQ01` at **`c6ce697a`**. No source under review was fixed or
modified by the reviewer. New tools and evidence are in `lab/verify/RQ01/round3/`;
round-one and round-two reports/results remain historical and unchanged.

## Findings and closure

No new actionable defect was reproduced. The previous findings close as follows.

| Previous finding | Source and fresh evidence | Result |
| --- | --- | --- |
| RF1: invalid nested physical groups accepted | `route-history-grammar.ts:5`; generator validation at `route-equivalence.ts:435`; pre-use validation at `:175`, `:452`, `:575`, `:603` and `route-coverage.ts:39` | Closed. Generated pairs are 9216/9217 and 25600/25601; complete size, ordinal sequence, receipt/attempt binding and stream/position adjacency are required |
| RF2: custom append checked against a different purge plan | `makeRouteExecutionPlan` at `route-equivalence.ts:567`; actual event validation at `:802`; wrapper uses `result.plan` at `:847` | Closed. All driver cuts are frozen into one plan and become exact h/h-1 requests. The old explicit default request list rejects before reset |
| Original F1: cross-subject corrections | Independent ledger controls plus inherited regressions; five-seed coverage | Remains fixed: six same-subject replacements and three bounded corrections per default history |
| Original F3 / Q89i: later retirement metadata changes an old snapshot | Independent P/T/TP/H retraction tests, separate raw-lifetime run, packed public-consumer regression | Remains fixed; snapshot bytes stay identical, and raw lifetime is compared under its separate contract |
| Original F4: empty gate success | Explicit empty and filtered-to-empty requests | Both reject |
| D-C1 / Q89a negative regression | Fresh named test, independent known-failure run, exact original/changed-input assertion probes | Remains explicitly known-failing; it cannot become a positive gate PASS or silently disappear |

The source locations above are under `packages/testkit/src/`.

## Fresh verification

### Original suites: 95/95, no skips

`round3/suite-a1/receipt.json` and `tests.json`: **95 passed**, zero failed,
pending or todo. This includes all 91 testkit tests (original tests, inherited
review tests and new round-three cases), three XTDB offline-client tests and the
QLever model test. All required original fault and known-failure test names were
observed. The runner parses actual assertion results and reporter freshness;
exit zero alone is insufficient.

Every source hash in the builder's final `round3-a4/receipt.json` matches the
reviewed bytes, including its pinned tool entries. The suite receipt also binds
the review config/controller, unchanged package sources and dependency lock.
No historical builder PASS was substituted for fresh execution.

### Grammar: admission before use

`round3/probe-a1/generated-grammar.json` independently tests **405 profiles**:
seeds 1, 42, 890, 89 and 891 at every commit count from 16 through 96.
**380** complete histories are returned and independently checked for complete,
consecutive nested groups; **25** profiles that truncate a physical group reject
with `incomplete nested group`. The source calls grammar validation before the
generator returns, so no invalid generated value is handed to a fixture.

`round3/probe-a1/invalid-history-admission.json` contains **12 malformed-history
variants**, each rejected through **six entry points**: grammar validation,
folding, basis generation, coverage, execution planning and the runner. For all
72 rejection checks, fixture reset/read counts stay **zero**. Variants include:

- The old 1025-spaced nested pair, with mutually matching receipt/attempt positions.
- Incomplete groups, incorrect ordinals and group sizes.
- Missing or mismatched receipts/attempts, and duplicate decision order.
- Missing retract targets, duplicate assertions and an invalid valid-time interval.
- An aborted attempt incorrectly relabeled committed.

These are offline history-grammar checks; they do not claim application schema
validation or native transactor execution.

### Six planted wrong-answer faults

The independent ledger does not call the harness fold/replay or its snapshot
masker. Each original fault has its own clean control with zero violations, then
one injected route while the correct control stays clean.

| Fault | Violations observed | Rules |
| --- | ---: | --- |
| Dropped retraction | 10 | HE-1, HE-2 |
| Omitted one same-millisecond row | 10 | HE-1, HE-2 |
| Future position answered with old available data | 14 | HE-1, HE-3, HE-5 |
| Empty result/ineligible flag instead of typed refusal | 15 | HE-1, HE-3, HE-6 |
| Valid-time edit ignored on one route | 10 | HE-1, HE-2 |
| Row dropped only after the owning route's custom purge, exactly at its h/h-1 | **378** | **189 HE-1, 189 HE-2** |

Evidence: the five fault JSON files and `custom-cut-fault.json` in
`round3/probe-a1/`, plus its source-bound receipt. The generated-history variant
that ignores real corrections is also caught (3,734 violations). The original
bare-empty-without-flag regression passes in the 95-test suite.

The custom-boundary clean qualification run has zero violations. The injected
run has failures only on the bad route/cross-route comparison, only at 45056 and
45055. Correct routes have zero violations. The positive qualification wrapper
also rejects the injected run.

### Exact per-driver retention policies and coverage

The custom fixture deliberately declares different policies on two retired
routes; a third complete source supplies maintenance cuts:

| Route | Kind / cut ID | Declared horizon | Required P cuts |
| --- | --- | ---: | --- |
| X1-all-valid-time | position-retired / qa-custom-A | 45056 | 45056, 45055 |
| X6-cold | position-retired / qa-custom-B | 44544 | 44544, 44543 |
| X6-warm | complete / pinned | 21504 | 21504, 21503 |
| X6-warm | complete / unpinned | 45056 | 45056, 45055 |

Those are test policies, not claims about physical production XTDB retention.
The exact owning route IDs, cut IDs, horizons, pin flags and actual event echoes
are retained in `custom-cut-fault.json`. The old default explicit requests reject
before fixture reset. Pending retirement, wrong horizon and wrong pin echoes
also reject; missing policies, empty retired policies and duplicate cut IDs are
rejected. All required actual boundaries are observed.

The returned history, normalized append, policies and request objects are deeply
frozen. Coverage verifies their digest and exact byte equality to `result.plan`;
a different request list rejects. Standalone structural coverage has
`complete:false`, and `requireRouteCoverage` refuses without an exact plan.

`round3/probe-a1/coverage.json` retains complete measured manifests for all five
seeds, with sixteen history families and fourteen cut predicates. Each default
history has 40 commits, six replacements, three bounded corrections, two nested
interior members, two claims-only and two position-only commits, two abort
witnesses, two staging inversions, eighteen same-ms pairs and four backwards
staging-clock transitions. Actual request counts are:

| Seed | L | V | P | T | TP | H | Independent observations |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 25 | 86 | 40 | 600 | 516 | 17,752 |
| 42 | 1 | 25 | 86 | 40 | 600 | 516 | 17,752 |
| 890 | 1 | 22 | 86 | 40 | 600 | 516 | 17,710 |
| 89 | 1 | 23 | 86 | 40 | 600 | 516 | 17,724 |
| 891 | 1 | 24 | 86 | 40 | 600 | 516 | 17,738 |

Each measured boundary has its actual event echo and owning route. The driver
policy is a declared input contract; hidden engine behavior still requires the
real adapter and its own source-bound evidence. Pending index-job/flush/compaction
hooks remain pending and are not certified as physical maintenance.

### Q89i and D-C1 stay distinct

The independent existing-row retraction probes run P, T, TP and H requests under
`snapshot` and separately under `raw-lifetime`: **40 observations per contract,
zero violations**. The packed consumer additionally retrieves exactly forty
original IDs at an old cut after all forty are retired and requires all three
retirement fields to be null.

D-C1 remains a membership-change defect under Q89a: **20 HE-5 violations**, all
five model routes represented, no unrelated rule failures. The positive wrapper
rejects that case. `guard-original/` runs the exact builder negative test body
with only import paths adapted: one passing test, no skips. `guard-repair/` changes
only the late extension timestamp from 1000 to 1002: one failing test, actual
exit 1, specifically `expected 0 to be greater than 0`. The guard checks the exact
assertion and test identity, so an unrelated load failure cannot qualify.

### Fresh build, tarball and consumer verification

`round3/package-a1/receipt.json`: fresh normal builds of copied, byte-verified
core/SQL/testkit sources, including SQL's declaration step; all three packages
pack successfully. Required public dist exports, route-history-grammar and
route-coverage JS/declarations, resolved manifest versions, and absence of
source/test/node_modules leakage are checked. An unpacked consumer with no
project-source aliases/symlinks passes strict TypeScript and executes the public
API: **26,628 observations**, zero violations, all snapshot contract, plus the
forty-ID Q89i retirement-mask assertion. Tarball hashes and consumer-output hash
are retained. Core is freshly built/packed too; it is not borrowed project dist.

The original thirteen-package root controller was also rerun unchanged and
fails at triplex-sql's missing workspace dependency link, exactly as reported:
`ERR_PNPM_CANNOT_RESOLVE_WORKSPACE_PROTOCOL`, actual exit **1**. Supplying the owned
core relationship in the isolated fixture allows the identical SQL source to
build and pack. No introduced RQ01 package failure was found beyond this blocker.
The unvisited remainder of the repository-wide check and a clean registry install
remain **unverified**; no full-root package PASS is claimed.

No install, lockfile mutation or global configuration change occurred. Pnpm uses
the mandated store via `--config.store-dir` and offline mode. Owned source/build
and consumer trees remain locally retained but ignored; source-copy hashes, logs,
entries and the three tarballs are committed. All round-three reviewer semantic
and package probes passed on their first attempts; the expected root failure and
changed-input D-C1 failure are retained as such.

## PASS / verdict / receipt audit (rule 9a)

Every new code site that converts observations into acceptance or a receipt was
audited before commit. The audited decision chain is below; historical review
controllers are not rerun as current acceptance.

| Decision site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `round3/suite.mjs`: `content`, `passed`, exit and receipt | Actual reporter JSON must contain 95 passed assertions, zero failures/pending/todo and the named original/new regression cases | Exclusive attempt directory; reporter start and file mtime checked against this spawn | Before/after package/config/controller/lock hashes; all builder final input hashes match; exact command/head and offline heavy label recorded; no engine slot |
| `round3/probe.mjs`: all assertions, `caught`, validated/rejected profile statuses, `probesCompleted` and receipt | Clean controls are empty; all six faults have required rule/route witnesses; all profile/group/cut/plan and pre-reset rejection predicates checked; no label-only completion | Exclusive directory; every history, model and event is produced in this invocation | Exact source/controller/loader/lock hashes before/after; plan digests and actual request/event content retained; actual heavy parent PID, owner file and slot captured and unchanged; no engine slot |
| `round3/guard.mjs`: `content`, `exactFailure`, `matched`, exit and receipt | Exactly one named original test passes; changed-input test fails at the expected assertion; no skipped/todo test | Exclusive mode directories and reporter start after this spawn | Original test bytes unchanged; original/derived/controller hashes, exact transformation, command and merge head recorded; offline only |
| `round3/guard-run.mjs`: continuation/exit | Requires both audited guard modes to complete as expected | Each mode is newly executed in this admitted job | Exact committed controller; child receipts carry source, mode and command |
| `round3/package.mjs`: build/pack/assertion checks, `changedPackageVerified`, `fullRootPassed`, exit and receipt | Normal build and strict typecheck exits, actual tar entries/export maps/manifests, parsed runtime observations/contracts/violations and forty-ID retirement assertion; root failure remains a failure | Exclusive new workspace/dist/tarball/consumer directories; generated output comes from this run | Source-copy byte equality and before/after source/controller/config/lock hashes; exact commands, tarball/output hashes and head; correct offline heavy label and no engine slot; reused external dependencies are not separately requalified |
| `round3/seal.mjs`: final ACCEPT and artifact manifest | Requires all final receipt predicates plus both former counterexample closures, six actual fault witnesses, active D-C1, grammar/cut denominators and scoped packed-consumer success | Reads this round's exclusive outputs; verifies runtime-output freshness and final controller preimages | Recomputes source/output/tarball hashes, verifies no implementation delta from d5cd32e6, binds reviewed builder/merge identity and every committed review artifact |

All heavy commands used `node lab/bin/heavy.mjs --label ID -- COMMAND`: final
labels are `CX-VRQ01-round3-suite-a1`, `...probe-a1`, `...package-a1`,
`...guard` and `...seal`. Controllers refuse to overwrite their attempt directories.
`round3/MANIFEST.json` seals the report, tools and committed evidence. Raw logs
are retained verbatim; whitespace checks exclude raw logs.

## Limits and open work

**No open blocking question for the harness merge.** Actual broker/H1 and Datomic
route adapters, physical maintenance and independent O-REPLAY qualification remain
separate lane work. Q89a and Q89c remain known product defects. The existing XTDB
physical client is honestly labeled raw-lifetime; harness acceptance does not
claim that product adapter now implements Q89i snapshots.

No implementation fix, engine/container operation, live concurrency, performance
run, network/registry access, full-root `pnpm check`, publication, push or merge
into main was performed. Only the requested merge into `verify/RQ01` occurred.
Future read-route changes must supply the actual route adapters and truthful
retention declarations and run the full qualification case, not a narrowed
diagnostic scope. Those are the explicit boundaries of accepting this Q89f gate.
