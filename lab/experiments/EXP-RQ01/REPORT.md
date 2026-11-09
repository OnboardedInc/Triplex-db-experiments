# EXP-RQ01 — route-equivalence harness

Builder: CX-RQ01. Branch: `exp/RQ01-route-equivalence`. Base: `908ebada`.

North star: P1, one answer for a named basis, and P4, a current route must refuse
any basis it cannot answer exactly. Scope and measurements: `lab/SCOPE.md`,
`lab/NORTH-STAR.md`, `lab/TARGETS.md`. Design: R31 sections 2–5 and Q89a–h,
particularly Q89b/c/f. This is an offline correctness harness, not a promotion or
an independent verification of an engine.

## Implementation

`packages/testkit/src/route-equivalence.ts` exports a seeded commit/history and
basis generator, exact canonical row comparison, offline replay, the lane-owned
route-driver contract, `runRouteEquivalence`, and `makeRouteEquivalenceCases`.
Each default seed has six subjects and forty commits. Required operations are
assert, retract, cardinality-many, replacement and assert/retract within one
transaction, bounded valid-time corrections, future valid time and same-ms ties.
The generator supplies L/V/P/T/TP/H requests, boundary instants, position gaps,
future positions and a sampled TP×V product; full product is optional.

Drivers own reset/append, route forcing, eligibility and refusal declarations,
read observations, and purge/catch-up/cold-cache events. Every answering route is
compared with the reference and every other answer for that same immutable
request. Checks cover HE-1 through HE-7 plus observed route identity. Refusal is
an allow-listed typed Error, never an empty result with an ineligible flag.
Future positions must refuse; at least one route must answer nonfuture requests.
Repeated pinned requests are checked after append and each maintenance event;
latest and valid-only requests are re-evaluated against the new head. Observations
retain route, request, phase and answer SHA-256/count or refusal tag. All row
columns, duplicate rows, exact strings and negative zero participate in equality.

The default reference is explicitly `offline-fold-not-independent`. A caller can
supply `{ reference: { name, answer } }` for independent O-REPLAY. Offline fold
passing is not independent oracle qualification.

`packages/testkit/src/offline-route-fixtures.ts` provides clearly named semantic
models of XTDB A0 and cold/warm maintained generations, plus QLever Q1 replica,
Q2 overlay, Q3 source after eviction, Q5 outage source, and H1-disabled source.
`pendingRouteAdapters` documents the unimplemented SQL01 H1 and lane D adapters,
including the required forcing and refusal semantics. Models deliberately do not
claim to execute engine routing, actual retention or actual cache invalidation.

Lane entry tests are in `packages/xtdb/test/route-equivalence.test.ts` and
`packages/qlever/test/route-equivalence.test.ts`. XTDB additionally calls the
actual `makeXtdbStorageAdapter` with an offline SQL client that evaluates its
emitted temporal predicates. This covers A0 pulls; it does not execute SQL in an
XTDB engine, nor certify maintained/native/transaction routes. Adapter `history`
has no basis parameter, so historical basis coverage remains in the semantic
models rather than being represented as actual A0 historical reads.

Public exports remain dist-only. A minor testkit Changeset and README adoption
instructions accompany the new helpers. No dependency or lockfile changes.

## Required defect fixtures

- **SQL01 F1 reproduced:** forty assertions at T1/P1, ten retractions at T2/P2,
  then the identical `{recordedAt:T1, recordedPosition:P2}` request under outage.
  The pre-fix H1 selection fixture returns thirty before purge and forty through
  source fallback after its horizon passes P2. HE-1, HE-2 and HE-5 detect it.
  Inspiration is the actual review at `verify/SQL01:lab/verify/SQL01/VERIFY.md`
  F1, read through Git because the file is absent from this checkout. Mechanism
  and adaptation are documented next to the position-only selection. This is a
  fixture of the pre-fix algorithm, not execution of unmerged SQL01 code.
- **Known-failing Q89a / R31 D-C1:** B commits at T=1001, read X at T=1001, then
  staged A commits at the next position with T=1000. The identical named T read
  changes. The test requires HE-5 violations on every model route and rejects
  unrelated violations. It is neither skipped nor accepted as semantic success;
  an unexpected fix requires reviewing and updating this negative expectation.
- **Known-failing Q89c / R31 D-X1:** actual A0 adapter with the offline SQL client
  answers a future position. A negative test requires HE-1/HE-3/HE-5 violations. The
  positive adapter test uses an explicitly documented _driver_ future guard;
  this does not claim the product gap is repaired.

## Evidence and execution

The repeatable command is:

```sh
node lab/bin/heavy.mjs --label CX-RQ01 -- node lab/experiments/EXP-RQ01/gate.mjs UNIQUE_ATTEMPT
```

Each attempt records relevant source/controller/lockfile SHA-256 values before
and after, the actual command exits, source stability, seeds and reference type.
It runs all testkit tests, the two offline lane entry tests, testkit typecheck
and testkit build. It uses no engines or services.

Earlier failures are retained:

- Initial run: Vite attempted to write `.vite-temp` through a shared dependency
  symlink and was denied. Dependencies were subsequently linked inside owned
  local node_modules directories and config loading switched to runner mode.
- `evidence/test-r2.log`: 10 passing tests, four five-second timeout failures.
  The generated-seed cases now have an explicit thirty-second budget.
- `evidence/xtdb-r1.log`: incorrect working-root test selection found no tests.
- `evidence/r3/`: timed-out seed cases, missing local core dependency links and
  incorrect relative config paths. Typecheck/build passed, but the source changed
  during this attempt: `sourceStillMatches:false`. It is not passing evidence.
  The next attempt uses completed local dependency links, absolute lane configs,
  and the corrected timeout. Dependency versions and the lockfile are unchanged.

- `evidence/r4/`: source-stable execution; all 60 testkit tests, QLever's lane
  model test, typecheck and build passed. The XTDB negative expectation failed
  because the existing future-position defect also produces HE-5 after append,
  in addition to HE-1/HE-3. The final expectation requires all three violations;
  this strengthens the negative regression and changes no adapter code.

Final execution results are appended below after the commands complete.

## Boundaries and open work

At base `908ebada`, neither this worktree nor Git `main` has
`packages/qlever/src/broker`. The task's reference to broker routes on main does
not match the available source. I did not copy/import source from SQL01 or P2Q
worktrees, merge their branches, or claim their routes qualified. The QLever
lane entry currently executes semantic broker models. Binding the actual broker
fixture remains necessary when that implementation merges. SQL01 H1 and lane D
remain explicit pending adapters as requested.

No Q89a record-time contract change, Q89c product fix, Q89g public basis change,
Q89h initialization guard, live engine test, full independent O-REPLAY gate,
full-root `pnpm check`, performance measurement, or independent reviewer signoff
was performed. Current/as-of forcing for lane D remains unimplemented. The full
R31 generator's nested transaction ordinals, abort scheduling, claims-only writes,
clock rollback, compaction/index jobs and live scale profile are follow-up work;
the required operation families and a controlled late-stage D-C1 schedule are
covered offline.

## Final builder results

`evidence/r5/receipt.json`: **PASS**, `sourceStillMatches:true`. All actual exits
are zero: 60 testkit tests, three XTDB offline tests, one QLever model test,
testkit typecheck and testkit build. The two known-failure regressions remain
explicit assertions of the existing Q89a and Q89c defects; this does not close
those rulings. The F1 pre-fix fixture likewise intentionally produces violations.

`evidence/lint-r1.log`: zero warnings/errors on the five added TypeScript files.
`evidence/format-r1.log`: eight changed TypeScript/README/Changeset files pass
format checking. The final XTDB expectation was formatted after its adjustment.
`git diff --check` passes.

Full root package verification was attempted and **did not pass**:
`evidence/pack-r1.log` retains pnpm pack's rejection of bare `--store-dir`.
The second attempt uses the equivalent command-line `--config.store-dir` override
for the mandated project store (no global setting change). It stops at
triplex-sql with `ERR_PNPM_CANNOT_RESOLVE_WORKSPACE_PROTOCOL` because this isolated
worktree does not have that package's dependencies installed; see
`evidence/pack-r2.log`. I did not install unrelated packages or change the lockfile.

The changed package's focused check **passes**: `evidence/package-smoke.json` and
`evidence/package-smoke.log` bind the testkit tarball SHA-256, inspect its contents
for the new generated JS/declaration exports and exclude source/tests/caches, then
unpack it into a fresh consumer directory and execute the public harness exports.
That consumer produced 18,300 observations with zero violations. It uses existing
pinned core/Effect package links, not a clean registry install. Tarball and
consumer are retained under `.experiments/rq01-package-smoke` in this worktree.

No engines were started/stopped, no containers were touched, no heavy-slot
configuration was changed, no packages were published and no branch was merged
or pushed. All heavy commands used `lab/bin/heavy.mjs`; one early focused tsc
invocation ran directly before the wrapper-only gate was assembled and also
exited zero. This report and the retained failing attempts are part of the local
builder commit; a separate adversarial reviewer still needs to review it.
