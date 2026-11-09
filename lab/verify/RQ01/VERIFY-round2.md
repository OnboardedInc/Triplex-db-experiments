# EXP-RQ01 round-two independent QA — CX-VRQ01

Verdict: **FIX-FIRST**. Round-one F1, F3 and F4 are repaired. F2 remains incomplete:
two reproductions still let a coverage claim succeed without the required input
content or the actual executed retention cuts.

North star: P1 immutable named snapshots and P4 exact route admission. Goals and
targets are `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; review design is
R31 section 4 and Q89a–i. This is offline harness and package QA, not engine or
independent O-REPLAY qualification.

Reviewed builder: `2043232b` on `exp/RQ01-route-equivalence`. Explicitly merged into
`verify/RQ01` as `99d02e8b`. The merge has the required commit trailer. All new
review tools/results are under `lab/verify/RQ01/round2/`; no implementation fix
was made. Historical round-one evidence is unchanged.

## Remaining findings

### RF1 — High: the nested-ordinal coverage witness accepts invalid physical groups

Locations: `packages/testkit/src/route-equivalence.ts:255` and
`packages/testkit/src/route-coverage.ts:92`.

At every reviewed seed, the first generated nested callback has integer receipt
positions **9216 and 10241**, and the second has **25600 and 26625**. Each pair is
labeled ordinal 1/2 of one callback, but its integer positions differ by **1025**.
The coverage checker only asks for a larger position, a larger declared ordinal,
and a nonzero remainder modulo 1024. It counts both pairs as nested witnesses
and returns `complete:true`.

R31 4.2 explicitly calls for interior cuts of nested transactions and cites
R-CUT-5 / FX-NESTED-CUTS. The receipt rule implementing that case is
`lab/oracles/replay/RULES.md:140` (R-RCP-5): committed members of one physical
group have consecutive integer positions, or one coordinate offset with
consecutive ordinal components. These inputs use integer positions, and satisfy
neither representation. General permission for gaps between transactions does
not permit gaps inside one physical group.

Reproduction: `round2/probe.mjs` independently groups generated commits by
`nested.callback`, checks consecutive integer receipt positions, and also calls
the public `requireRouteCoverage`. See `round2/probe-a3/coverage.json`:
all **ten** generated callback pairs across five seeds fail the physical-group
check while every coverage manifest reports two nested witnesses and completion.
The full 83-test suite also accepts those histories.

Impact: R31's nested physical-transaction family is still not established; the
receipt turns labels and increasing positions into an unsupported coverage PASS.

Proposed fix: generate integer members consecutively inside each physical group,
or model explicit `(stream, epoch, offset, ordinal)` coordinates and their exact
mapping. Validate the complete group, receipts and interior membership before
counting it. Add a negative regression rejecting the current nonconsecutive pairs.

### RF2 — High: custom extension coverage checks a different purge plan

Locations: `packages/testkit/src/route-equivalence.ts:703`,
`packages/testkit/src/route-coverage.ts:168` (default horizons).

The runner derives the real unpinned purge horizon from `options.extension.position`.
The positive wrapper then calls `requireRouteCoverage(options.history,
options.requests)`, whose horizon calculation always uses the **default**
`head + 2048`. The actual extension/horizon is not passed to that check.

Reproduction:

1. `history = generateRouteHistory(42)` (head 40960).
2. `requests = generateRouteBases(history)` (contains the default horizon 43008).
3. Supply the otherwise valid custom extension at **45056** (`head + 4096`).
4. Run `makeRouteEquivalenceCases({ history, requests, extension, fixture })[0].run()`
   without a diagnostic scope, so this is the full qualification wrapper.

It resolves with zero violations. Its real purge event has horizon **45056**,
but neither **45056 nor 45055** is a P request in the observed run. The separately
computed default coverage manifest says `complete:true`. Evidence:
`round2/probe-a3/custom-horizon-false-pass.json`. A stronger wrong-answer
witness uses the product offline fixture: a route dropping a row only at the
actual h/h-1 passes the qualification wrapper. Requesting those two cuts exposes
**24 HE-1/HE-2 violations**, with a clean complete-request control at zero. See
`round2/boundary-a1/receipt.json`.

Impact: a caller using the supported custom append and an explicit generated
request list can pass the required gate without the actual retention boundary
reads. This is the same acceptance gap F2 was intended to close, despite the
default plan now being correct.

Proposed fix: freeze one execution plan (extension, horizons, request objects),
measure that exact plan and pass it to the wrapper/receipt coverage check. Reject
any missing actual h/h-1 requests. Do not regenerate a separate default plan to
certify an already executed case. Add this custom-extension regression.

## Round-one findings and requested checks

| Check | Fresh result |
| --- | --- |
| F1: corrections preserve subject and attribute | Repaired: independent ledger scan finds six same-subject replacements and three bounded corrections per seed, zero cross-subject replacements |
| F2: every R31 history kind and retention cut | Partly repaired: all top-level shapes, claims/position-only/abort/staging metadata and default horizons now appear; RF1 and RF2 prevent accepting the full coverage claim |
| F3 / Q89i: existing-row retirement | Repaired: independent snapshot reads at P, T, TP and H keep exact bytes after append; 80 observations, zero violations. Separate raw-lifetime run has 80 observations and zero violations |
| F4: empty and filtered-to-empty | Repaired: both reject before reset/read; independently counted resets=0 and reads=0 |
| D-C1 remains known-failing Q89a | Active: 30 HE-5 violations on all five model routes, no other rules; the positive wrapper rejects it |
| Five planted route faults | All caught, each clean control has zero violations |
| Original test suites | 83/83 tests passed, zero pending/todo/skips, including the original named D-C1 regression and all 19 adapted review cases |

The original suites execute this review checkout's source, with existing pinned
Vitest/Effect/ulidx/postgres modules and locally owned caches. No dependencies
were installed. `round2/suite-a1/receipt.json` records content checks, output
freshness, unchanged source bytes, and matching hashes for **every** input in the
builder's `round2-a3/receipt.json`. Historical builder PASS was not adopted as a
fresh reviewer result.

### Independent planted-fault results

The model is derived from this reviewer's original ledger, with explicit
contracts/scopes and an independently written Q89i retirement mask. It does not
call the harness fold/replay or its snapshot masker. Each case uses one correct
control route and one injected route.

| Fault | Violations | Rules |
| --- | ---: | --- |
| Dropped retraction | 20 | HE-1, HE-2 |
| Omitted one of two same-millisecond rows | 20 | HE-1, HE-2 |
| Future position answered with available old state | 29 | HE-1, HE-3, HE-5 |
| Empty result plus ineligible flag instead of refusal | 30 | HE-1, HE-3, HE-6 |
| Valid-time correction ignored on one route | 20 | HE-1, HE-2 |

Evidence: the five named fault JSON files in `round2/probe-a3/` and its receipt.
The builder's separate bare-empty-without-flag regression also passed in the
fresh 83-test suite. Each independent control was asserted clean, and no
violation was attributed to the correct control route.

### Coverage denominator

The builder's measured manifests report sixteen history families and fourteen
cut predicates over seeds **1, 42, 890, 89, 891**, each with 40 commits. Independent
write/identity checks confirm six replacements and three bounded edits per seed.
The following are the actual request counts in the independent runs:

| Seed | L | V | P | T | TP | H |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 25 | 88 | 40 | 600 | 528 |
| 42 | 1 | 25 | 88 | 40 | 600 | 528 |
| 890 | 1 | 22 | 88 | 40 | 600 | 528 |
| 89 | 1 | 23 | 88 | 40 | 600 | 528 |
| 891 | 1 | 24 | 88 | 40 | 600 | 528 |

Default pinned/unpinned horizons **21504 / 43008** and their predecessors are
present in actual P observations for all five seeds. Receipt and abort identities,
staging clocks and coverage counters are retained in `round2/probe-a3/coverage.json`.
However, measured label completion is not semantic completion: RF1 invalidates
the nested family and RF2 demonstrates missing cuts under a supported plan.
Engine index jobs, flush and compaction remain explicitly pending in the product
fixture; nothing in this review promotes model events into physical engine work.

### D-C1 cannot silently turn into a passing negative regression

`round2/guard-original/` executes the builder's exact D-C1 test body with import
paths adapted. Exactly one test passes; none are skipped. `round2/guard-repair/`
changes only its late extension timestamp from 1000 to 1002. Exactly one test then
fails, specifically `expected 0 to be greater than 0`, with actual child exit 1.
The guard controller checks the exact test identity, assertion content, counts,
fresh output and source binding; an unrelated loader failure would not qualify.

The repair probe changes fixture input only. It does not repair Q89a in the
implementation. The independent positive-wrapper rejection is retained separately
in `round2/probe-a3/dc1-Q89a.json`.

## Package-check investigation

The repository-wide package controller was rerun unchanged, offline, with output
owned here. It reproduces exactly the builder's first blocker at **triplex-sql**:
`ERR_PNPM_CANNOT_RESOLVE_WORKSPACE_PROTOCOL`, because its core workspace dependency
is not linked in the isolated worktree. Actual exit is **1** and is retained;
there is no full-root package PASS.

To check beyond that blocker, the review controller creates a new owned workspace
containing byte-verified copies of this checkout's **core, SQL and testkit**
source/manifests/configs. It links only already installed pinned external modules
and the owned core package. It performs fresh normal builds, including SQL's
separate declaration-emitting build step, packs all three packages, unpacks them
into a new consumer, and uses their **public dist export maps**. The consumer has
no source aliases or project-source symlinks; its core is also freshly built and
packed, rather than borrowed from another checkout.

The successful scoped check verifies required files (including route-coverage JS
and declarations), absence of source/test/node_modules leakage, resolved workspace
and catalog manifest versions, strict consumer TypeScript compilation, and actual
runtime result content: **26,922 observations**, zero violations, snapshot
contract on every observation. It binds tarball and consumer-output SHA-256 values,
source-copy hashes, command exits and before/after source hashes. Evidence:
`round2/package-a4/receipt.json`, `entries.json`, `consumer-types.log`,
`consumer-runtime.log`, and the three retained tarballs.

Conclusion: the reproduced first blocker is environmental; the identical SQL
package packs after its local workspace relationship is supplied. **No additional
RQ01 packaging failure was found** in fresh builds, tarballs, public exports,
types or runtime consumption beyond that blocker. This does **not** certify the
unvisited remainder of the thirteen-package root check or a clean registry
installation. The harness still has RF1/RF2 semantic failures regardless of this
scoped package success.

No install, lockfile mutation or global configuration change occurred. Pnpm uses
the mandated project store through `--config.store-dir`; offline mode uses
`--config.offline=true` (pack rejects a bare `--offline`). Fresh source/build and
consumer trees remain locally under the owned package attempt, excluded from the
commit as declared in `round2/.gitignore`; source-copy hashes, logs, manifests and
tarballs are committed. No original archive or unrelated state was deleted.

## Retained unsuccessful or superseded reviewer attempts

- `round2/probe-a1/`: five fault probes completed, then the review controller
  accidentally combined one fixture's reset/append with another fixture's routes.
  Its control assertion failed (38415 violations instead of zero). The exact
  controller preimage, failure note and completed fault outputs are retained.
  Corrected semantic execution is `probe-a2/`; this was a reviewer setup
  failure. A final `probe-a3/` run also corrects its descriptive heavy-job label
  from a1 to the actual attempt label. The a2 preimage and result remain retained.
- `round2/package-a1/`: fresh core/SQL/testkit builds succeeded. The review shim
  passed an unsupported bare `--offline` option to pnpm pack, so no package
  acceptance is claimed. The controller/shim preimages and actual exits remain.
- `round2/package-a2/`: the root blocker was reproduced and all three packages
  packed. The review controller had run only SQL's tsdown step, omitting the
  declaration-emitting second half of its normal build script. Tarball inspection
  correctly rejected missing SQL declarations. Its controller preimage, builds,
  tarballs, logs and receipt remain. The next attempt uses the complete normal
  SQL build; no product source change was made.
- `round2/package-a3/`: all scoped package content checks passed, but the receipt
  retained a descriptive heavy-job label from a1. Its exact controller preimage
  and successful outputs are preserved. Final `package-a4/` repeats the fresh
  pipeline with the actual admission label; no product source changed.

## Commands and retained artifacts

All heavy work used `node lab/bin/heavy.mjs --label ID -- COMMAND`. The final
commands were `suite.mjs` (label `CX-VRQ01-round2-suite-a1`), Node with the retained
`source-loader.mjs` plus `probe.mjs` (`CX-VRQ01-round2-probe-a3`), `guard-run.mjs`
(`CX-VRQ01-round2-guard`), Node with that loader plus `boundary.mjs`
(`CX-VRQ01-round2-boundary-a1`), and `package.mjs`
(`CX-VRQ01-round2-package-a4`). Exact child commands/exits are in their receipts.
Every output directory is exclusive; these tools refuse to overwrite retained
attempts. A new rerun must use a new attempt directory and bind its controller.

`round2/MANIFEST.json` seals the final report, review tools and committed evidence,
checks the final receipts against their source bytes, and confirms no delta in
the reviewed implementation relative to `2043232b`. It also records the scope of
locally retained, ignored build/consumer trees. Raw logs are preserved verbatim;
whitespace checking excludes those raw logs.

## PASS/verdict/receipt audit (rule 9a)

Before commit, audit every new executed decision site, not just the top-level
shell exit. Historical round-one tools and copied builder receipts are not new
acceptance decisions in this round.

| Decision site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `round2/suite.mjs`: `content`, `passed`, `process.exitCode` and suite receipt | Parses actual JSON: 83/83 passed, zero failed/pending/todo, expected fault/regression names present, every assertion passed | New exclusive output directory; checks reporter start time and output mtime against this spawn | Before/after hashes of reviewed package sources, exact config/controller/lock inputs; all builder a3 input hashes matched; exact command and merge head recorded; no engine slot |
| `round2/probe.mjs`: each `assert`, `caught`, `unexpectedlyPassed`, `probesCompleted` and receipt | Clean controls must be empty; injected runs must have the specified rules/routes; correction identity and actual request/event predicates are checked; false-pass fields record observed defects, not acceptance | New exclusive `probe-a3` directory, histories and outcomes generated in this invocation | Before/after hashes of generator, coverage, fixtures, reviewed tests, probe, loader, dependency lock; exact seed/request/extension definitions in pinned controller, head and offline heavy label recorded |
| `round2/guard.mjs`: `content`, `exactFailure`, `matched`, exit and receipt | Parses exactly one named test; original passes; changed-input negative fails at the precise expected assertion; zero pending/todo | Exclusive per-mode directories; reporter start time must follow this invocation | Original test bytes must remain identical; original/derived/controller SHA-256, exact command, merge head and transformation recorded; offline only |
| `round2/guard-run.mjs`: mode continuation/exit | Delegates success only to both audited guard modes, stops on any failure | Runs each new mode once in this admitted job | Exact guarded controller is committed; child receipts carry source, command and mode |
| `round2/package.mjs`: package assertions, `checks`, `changedPackageVerified`, `fullRootPassed`, exit and receipt | Checks actual normal build exits, required tar contents/exports and resolved manifest versions, strict consumer type result, and freshly written runtime rows/contract/violations; root failure is kept as failure, not promoted to a PASS | Each attempt has a new exclusive directory, fresh copied sources, empty dist/consumer/tarball directories | Source-copy SHA-256 equality, before/after source/controller/config/lock hashes; exact child commands, output/tarball hashes and merge head; no engine slot |
| `round2/boundary.mjs`: assertions and false-pass receipt | The actual offline fixture wrongly qualifies a boundary-specific bad route; adding actual h/h-1 reads catches HE-1/HE-2 and the complete-request control stays clean | Exclusive output directory and newly generated history/requests each run | Before/after generator/coverage/fixture/controller hashes; exact custom horizon, actual event context, offending request objects, source head and offline heavy label retained |
| `round2/seal.mjs`: report verdict and sealed receipt | FIX-FIRST must be supported by the retained RF1 and RF2 counterexamples, not an exit-zero claim | Seal reads this round's receipts and outputs; checks their exact source preimages | Seal checks unchanged reviewed implementation, hashes every committed artifact and binds the reviewed builder/merge identities |

## Boundaries and open questions

No implementation fix, network/registry access, engine/container operation,
performance measurement, live concurrency, live route qualification, full-root
`pnpm check`, publication, push or merge into main was performed. Q89a and Q89c
remain explicitly known product gaps. Q89i's harness snapshot contract is
implemented; the existing XTDB physical adapter remains honestly classified as
raw-lifetime. Actual broker/H1 and Datomic route adapters remain pending.

The orchestrator should settle RF1's physical-group representation and require
coverage of the exact execution plan in RF2 before accepting the harness as Q89f's
required gate. Q89i's raw-lifetime/snapshot interpretation is resolved and is no
longer an open question from round one.
