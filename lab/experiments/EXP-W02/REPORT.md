# EXP-W02 builder report

Builder: CX-W02 (Codex gpt-6.1-sol, medium). Branch: `exp/W02-gs-harness-v2`.
North star: the GS gate under P1-P5 and the correctness floor, measured against
`lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` 2.1 and 6. Design read: R37
sections 1-4 and Q94b-i, Q91a, Q92a/k, Q93a from the main checkout.

**Result: PARTIAL / NOT QUALIFIED. EXP-W02 is not complete and must not be promoted.**
The offline W0 stream/golden path and admission/claim checks are implemented. The
new live entry deliberately reports FAIL/UNQUALIFIED rather than claiming that
kernel agreement closes database, domain, product or fault obligations. There
were no live GS runs and no engine lifecycle actions. Nothing was merged to main
or pushed. No `packages/*` source, dependency manifest or lockfile was changed.

## Integration provenance

- Merged W01b `1d1919915f66573a9636f10ad48de7bb34ee3022` into this branch first.
  This includes the preceding harness/restart fixes and historical evidence;
  independent review of W01b remains the separate reviewer's task.
- Cherry-picked P5 source commits `7bc0601a5b6c322fc5b57f1fca58d0ff0dc8fa01`,
  `18640ea2` and `ef53738a` from `exp/P5-release-sweep`. They supply the W0 mapper,
  seed, fingerprint and composition helpers; their historical receipts remain
  historical. This branch does not claim their independent acceptance.
- Partial source extraction from K01 `776811666a4cf024d17bdffd94523c73927d5a1f`:
  `lab/bench/lib/g0.ts` is byte-identical to that commit. The full K01 commit was
  not cherry-picked: its engine lifecycle and unrelated verifier changes were
  intentionally excluded. The W02 adapter uses its shared `bounded` and
  `requireW0Fingerprint` functions with P5's `readW0Fingerprint`.

## Implemented and remaining

| Brief item | Implemented | Remaining / limitation |
| --- | --- | --- |
| C1 W0 vocabulary/population | `v2/generate.ts` supplies all 20 scenario IDs, using W0 population IDs, attributes, references and the P5 mapper; business operations contain no W01 attributes | These are initial overlay recipes, not complete reproductions of every original story. Actions requiring product paths are explicit unsupported schedules. Counts can be reduced to fit the rung. Original generators remain in the explicit `--legacy-diagnostic` path for inspection |
| C2 O-DOMAIN adapter | `domain.mjs` executes fresh `reconcile`, `affected`, `publish`, `receive` CLI requests; saves input/output hashes and oracle/world source identity; exact observed byte comparison; unknown operations and invalid W0 inputs refuse | Only live reconcile kernel-conformance samples are wired. Live affected/publish/receive observations and state-oracle comparisons are not integrated |
| C3 named domain claims | Every `spec.domain` entry must have a successful, fresh observation explicitly covering its index; omissions fail closed, including 01/05/06/09/17/18 | The actual scenario-specific checks (next task, exact affected sets, boundaries, proposal exclusion, overdue projection) remain unimplemented in v2. Generic kernel agreement intentionally covers **none** of those claims |
| C4 frozen background | Uses `generateTrace` unchanged: 2% active set, seeded Zipf 1.1, Poisson offers, bursts at 120 + k*600 s, P5 W0 mapping; 240 s window; separate background/overlay counts and source/stream hashes | Actual in-window maintenance is unobserved and fails closed. Background writes are not removed from negative witness subjects; witness validation must distinguish the streams. The diagnostic executor is serial and is not a P1/P2 performance implementation |
| C5 content admission | Fresh random scope per scenario; independent full population oracle artifact fixed before seeding; same measuring composition reads full W0 G0 before traffic; independent seed counts and oracle source hashes checked before/after; start/end store counts retained | Tested through the memory diagnostic, **not an engine**. Public XTDB route still needs its build/live qualification; Q/D position/count routes are absent. Shared G0's raw-table `admitG0` is retained but not called by the W0 adapter |
| C6 position bases | V2 uses receipt positions and the deterministic W0 valid-time clock; no v2 read uses recordedAt | Legacy diagnostic retains historical time-based pins. Public `TemporalBasis` does not expose position in this checkout: v2 uses P5's position-aware public backend adapter route, which still needs RQ01/live qualification |
| Three-lane entry | `run.mjs` dispatches to v2 with Node type stripping; GS parser accepts datomic; matching exclusive-slot owner and endpoint required; broker selection explicit and owned path bound | Datomic package, qualification registry and slot registration are absent in this checkout. QLever P5 `publicSweep` refuses as unqualified. No lane is silently replaced by XTDB |
| Q91a / receipt identity | Gate records slot, resident flag, co-running set and bound broker path; built-base/bounded-delta/touched-block counts required for qualification | Q counts are **null**, not guessed. QG1/measurement integration is still required. Co-running inventory is the existing gate's end observation, not a continuous set history |
| C7 CS-GS | Authored exact inventory: 20 scenario tags + 50 required cases, including 40 witness selectors and all ten numeric/common-basis/fault schedules; deterministic manifest regeneration | Inventory only, not a fully executable evaluator manifest. Full per-case operands, expected fault observations, witness polarity proofs and contract pinning remain open. Contract anchors were not hand-edited |

The gate refuses pre-0.4.0 receipts (Q94e), retired W01 generation, missing content
admission/counts and unqualified QLever layout. All live v2 scenarios currently
return FAIL/UNQUALIFIED regardless of kernel agreement. GS.03's signal-ack still
waits for W0-1.2; no invented oracle was added. GS.10/19 cannot use a harness-file
outbox as product evidence. Q94a still waits for Sam; no reduced-rung acceptance
or year-one performance claim is made.

## Validation

Evidence: `lab/experiments/EXP-W02/evidence/` contains append-only attempts with
raw stdout/stderr, exact argv/exits, source hashes and an unchanged-source check.
The captured attempt is `offline-2026-11-09T01-57-49-766Z-38786b`.
Its recorded source-file hashes still match the final implementation. The current
receipt script additionally asserts test/golden denominators in stdout; its
redundant final rerun was cancelled while still waiting for a heavy slot (no new
test commands executed), so those additional controller assertions have not run.
The 30/1/20/80 denominators below were inspected directly in the retained raw logs.

- W0 build: exit 0.
- Offline generator/expectation typecheck: exit 0.
- Existing lab + W01b runner + new W02 unit checks: **30/30**, zero skipped.
- Same-process G0 diagnostic: **1/1**. It seeds a 50-subject memory scope, compares
  a freshly generated full independent population fingerprint, and rejects wrong
  scope, wrong counts, changed expected digest and changed observed value bytes.
- **20/20** offline golden entries regenerated byte-identically at N=500; **80**
  initial/final sample-witness evaluations agree byte-for-byte with O-DOMAIN.
  These are two sampled subjects per scenario, not all generated witnesses, and
  they do not prove positive/negative polarity or live state correctness.
- CS-GS manifest byte-identical; all 70 contract inventory IDs present, no extras.
- Syntax checks and `git diff --check` passed.
- **Live-path typecheck: FAIL / unverified.** Missing this worktree's unbuilt
  `packages/xtdb/dist/index.js` produces TS2307 in inherited P5 `w0-public.ts:20`
  and consequential implicit-any diagnostics at line 37. The separate offline
  typecheck does not imply live-path type safety. No dependency cache or sibling
  build was copied to conceal this gap.

`FIRST-FAILURES.md` retains the earlier generator-serialization and compact-oracle
stdout mistakes and their fixes. Historical W01b evidence was not regenerated or
reclassified. `RUNBOOK.md` gives exact conditional live commands and lane blockers.
No full root `pnpm check`, package integration suite, engine qualification,
maintenance/fault injection, GS campaign or independent verification ran.

## PASS audit (preamble 9a)

Every new decision site and copied G0 PASS site is listed here. These are builder
checks, not independent promotion verification.

| Site | Content | Freshness | Binding / limit |
| --- | --- | --- | --- |
| `domain.mjs:runDomain` | Exact oracle output bytes; invalid W0 inputs refuse | New bounded Python CLI call per request; source identity rechecked afterwards | Request bytes hash + complete oracle/world source identity; returns data, not live acceptance |
| `domain.mjs:expectDomain` | Observed bytes exactly equal independent CLI bytes | Requires current run tag; invokes CLI anew | Driver endpoint, scope, source hash, recorded position; input basis must agree; prose/missing binding fails |
| `domain.mjs:requireDomainClaims` | Each named claim index requires an explicit successful comparison | Only current context's requests used | No implicit claim coverage from a generic check; v2 conformance samples cover zero product claims |
| `v2/expect.ts:expectation` | TS output bytes equal independent O-DOMAIN on each sample input | Fresh CLI evaluation while regenerating | Stream/source/seed/rung, input/output hashes, subject and phase retained; OFFLINE-ONLY, no polarity or live verdict |
| `v2/expect.ts` and `v2/cases.mjs` CLI `--check` | Full regenerated artifact bytes equal committed bytes | Regenerates in current invocation | Current generator/oracle/spec/contract inventory; generation can never pin the contract itself |
| `v2/admission.ts:admitWorld` | Full engine-route W0 fingerprint plus independent counts and oracle-source hashes | Reads through the already-open measuring handle before traffic, bounded; counts/sources rechecked | Actual handle endpoint and scopeName, population size, receipt position and W0 valid clock; returns MATCHING only on equality |
| copied `g0.ts:requireW0Fingerprint` | Requires independent rung/seed/source/invalid-world metadata and every fingerprint field | Fresh read supplied by caller | W02 caller performs read itself; never supplies an old receipt |
| copied `g0.ts:readG0` / `admitG0` | Full table field hashes with multiplicity, exact counts/scopes/position and W0 where applicable; compares pin D | Rescans with deadline on every admission | Expected/pin binding equality; W02 does not call this raw-table admission path; K01's independent review still applies |
| `lib/policy.mjs:gsRefusals` and GS gate | Rejects missing generation/admission/counts/layout/domain records | Current report only; existing gate binds execution/build/source | Refusal-only predicates; cannot independently certify a forged report; no scenario PASS is currently emitted by v2 |
| `v2/run.ts:execute` and run report | Records actual receipts/read bases/errors; unmet checks explicit | Fresh scope, seed, admission and attempt | Scenario verdict is **always FAIL/UNQUALIFIED** pending integration; DONE means controller completed, not semantic PASS |
| `check-offline.mjs` | Real command exits/raw log hashes; final revision also checks test denominators and golden/case output content | New attempt directory, timestamps, actual commands | Source hashes before/after; aggregate remains failed while live-types fails; OFFLINE-DIAGNOSTIC only |

P5's imported diagnostic implementation and reports retain their own audits. This
builder has not independently verified or promoted those imports. Next work is
live-path builds/typing, complete per-scenario state/domain/fault checks, Q/D
position/count adapters and Q91 instrumentation, then the separate review and
exclusive-slot campaigns. Keep GS OPEN until those gates and the pending rulings
are satisfied.

# Round 2 — offline checks and executable cases (2026-11-09 UTC)

Builder: CX-W02, continuing `b8a720f0`. North star remains the P1-P5 GS correctness
floor under SCOPE/NORTH-STAR/TARGETS; offline evidence does not measure the expected
load or close GS. The round 1 historical results and gaps above remain intact;
this section supersedes their **offline** implementation/typecheck status.

**Result: the requested round 2 offline work is implemented and verified. Live GS
qualification remains OPEN.** No agents were spawned, no engines or containers
were started/stopped, no ports were contacted, and no `packages/*` source,
manifest or lockfile was changed. No main merge or push occurred.

## 1. Live typecheck cause and fix

The imported P5 adapter statically imports XTDB's public built export. Round 1's
check script built only W0, leaving that module absent; the two implicit-any
errors were consequences of the unresolved import. The v2 tsconfig now includes
**all `*.ts`**, including the live entry and every new test. Nothing is excluded.

`build-public.mjs` reads the repository's own build recipes and runs the pinned
local tsdown/tsc binaries in dependency order: core, testkit, XTDB, qualification,
W0. It rejects other command forms. This avoids pnpm's build-parser rejection of
the install-only `--store-dir` argument. The actual offline install used pnpm
10.11.0, the owned store, `--offline --frozen-lockfile`, and zero downloads; no
shared node_modules symlink or sibling build is used. Both the explicit live
entry typecheck and the complete v2 tsconfig now pass.

A bounded `heavy.mjs --poll-ms` option (100 to 30,000 ms; default unchanged at
1,000 ms) was added after repeated setup starvation between other jobs. It calls
the same canonical semaphore and does not change capacity. The final receipt
binds its real parent-owned slot 3, label `CX-W02-r2-outcome-final`.

## 2. Six named claims and independent state checks

`Probe` records authored operations and actual outcomes separately. O-REPLAY
replays authored inputs, checks every command's committed/rejected outcome and
independent dense ordinal, checks receipt uniqueness, and supplies expected
visible worlds. The memory snapshot is compared on entity, attribute, exact
value, valid interval and assertion position. Engine-specific IDs, wall-clock
instants and unrelated metadata are not asserted equal. Only then does O-DOMAIN
compute the expected domain output from that independent world; the kernel runs
on the observed memory world. This probe refuses a non-memory composition.

Dedicated checks in `claims.ts` and `claims.test.ts` cover:

- **01:** Section 1 submit changes the next tasks on the first read at its returned
  position; the old position still has the old task.
- **05:** a clear background result removes the affected subject's background
  task; the negative subject's tasks stay unchanged.
- **06:** a jurisdiction wage update follows both references, produces exactly
  the independent affected set, reruns each once, and stores that set with its
  checkpoint in one write. Minimum-wage outputs match after the update.
- **09:** moved start dates change obligations and recompute the future boundary;
  the `dependencyState.nextTemporalBoundary` fixture is persisted and read back.
- **17:** an agent proposal cannot resolve Section 2; a later human decision can.
- **18:** persisted overdue projections match O-DOMAIN, and paging at the old
  projection position remains stable while decisions and a new projection land.

The scheduler/projection records here are explicit bench-side memory fixtures;
they do not certify the production `Triples.dependencyState` or maintained-view
implementation. The six cases exercise their named semantics over the complete
small authored fixture, not 5,000 or 100,000 subjects at production load.

Negative controls reject a changed observed pay rate, an invalid tail operation
without a partial commit, and a rejected valid command even when an old-position
snapshot would still match. The latter closes a vacuity found during the PASS
audit. Memory validation now checks integer representation/range and retractions
before mutation or position allocation, and supports EntityState CAS conflicts.

## 3. D and Q lane plumbing

The shared lane type and memory factory accept Datomic. The public D opener
selects `makeDatomicRuntime` from D's built public export and requires
`DATOMIC_URL`; it never substitutes X or Q. The D/Q sweep bridge uses the runtime's
public scoped StorageAdapter with internal `recordedPosition`, validates returned
positions and source heads, traverses references, and provides source counts by
feed entity enumeration plus history. Native count/read equivalence and its cost
still need live qualification; enumeration is not a tuned native aggregate.

`openScenarioLane` validates lane, endpoint, scope, attempt and source binding.
The real Q factory receives `QLEVER_COMMIT_PATH=broker` plus the owned directory;
an older public Q package lacking HostBroker refuses. Layout reads must return
fresh matching bindings and valid built-base/bounded-delta counts. The receipt
carries base/delta/touched-block counts, threshold, generation and broker path
before and after the case. The live entry accepts a reviewed `--layout-reader`
module, pins its source hash around each call, and the GS gate forwards that flag.

Every D and Q offline case goes through that same lane-selection function. Q's
controlled metadata reader is explicitly **OFFLINE-FAKE**, on its own memory
endpoint/scope, with separate before/after calls. Tests reject X-for-D substitution,
foreign/stale layout bindings, delta-only or over-threshold layouts, invalid heads,
and rows beyond the requested position. These results are not real QLever counts,
Datomic durability or RQ01 route-equivalence evidence. D's native package/slot and
Q's broker/generation/instrumentation integrations still gate live runs.

## 4. Offline fault and maintenance execution

The four consumer stop points execute actual interruption/resumption over stored
publication, receiver and checkpoint state: before effect, after effect before
checkpoint, after checkpoint, and after enqueue before delivery. Publication and
receiver bytes come from fresh O-DOMAIN `publish`/`receive` calls. The evaluation
basis comes from an independently checked memory subject, not a transported W0
case's unrelated position. Reopening validates the same source, receiver replay
produces exactly the expected visible effects, and the checkpoint resumes.

Lost ACK execution publishes, drops the client result, replaces the client,
resolves by commandId, and verifies original transaction/position plus a typed
duplicate rejection. Source endpoint/scope binding is checked on replacement.
`FeedReplica` actually rebuilds an immutable generation from the source feed;
a writer commits during the rebuild, an old pinned read stays identical, a basis
beyond the replica watermark routes to the source, and a later rebuild catches up.
These are logical offline models, not engine power loss, compaction, real QLever
index rebuilding, VM durability, or latency measurements. `fault-probes.json`
retains the executed schedules and observations.

## 5. CS-GS authoring and witnesses

The manifest now authors **70 executable members**: 20 scenario tags, 40 positive/
negative witnesses and ten additional required cases. Each member carries an
explicit W0 input fixture, parameters, expected observation and `case-driver.ts`
entry/argv. The driver consumes those authored initial facts; unknown IDs or
missing schedules fail. State, domain, numeric, common-basis, CAS, scope isolation,
slow-consumer and outbox schedules retain their independent observations.

The fixtures are deliberately small synthetic worlds, not the W0 population or a
performance campaign. Numeric boundaries include 1649/1650/1651 cents,
2399/2400/2401 minutes and a typed 2^63 rejection. Preview and activation evaluate
R2 at the same position/valid time and distinguish R1's obligations. Witnesses
check actual state/domain changes and unchanged negative subjects at named bases.
No contract manifest anchor was hand-edited; independent contract pinning remains
with the orchestrator/reviewer.

Each lane's exact result is **66 OFFLINE-MATCH, 4 BLOCKED, 0 FAIL, total 70**.
The blocked members are `GS-03-SUPERSEDED-REVISION` (W0-1.2 signal-ack unavailable),
`GS-16`, `GS-16-WITNESS-POS`, and `GS-16-WITNESS-NEG` (physical erasure/restore or
crypto-shredding absent). They remain in the denominator and do not count as
matches. Other offline matches certify only their authored fixture coverage,
not the entire scenario's product, load and failure obligations.

The new boundary witness exposed the old v2 passport fixture: W0 exempts passports
from expiry work. The generator and executable GS20 fixture now use an EAD.
Goldens were explicitly regenerated; the changed generator source hash starts a
new comparison series. No prior diagnostic artifact was re-anchored.

## Final verification and evidence

Final source-bound attempt:
`lab/experiments/EXP-W02/evidence/offline-2026-11-09T02-45-07-138Z-8af252/`.

- Public dependency builds, explicit live typecheck and complete v2 typecheck:
  exit 0.
- **48/48** lab, harness, claim, lane and fault regression tests; zero skips.
- **1/1** fresh same-process G0 admission diagnostic.
- **20/20** byte-identical regenerated offline goldens; **80** sampled oracle
  evaluations, plus the additional source-bound case-driver evaluations.
- All **70** members executed separately on each D and Q offline path, with the
  exact 66/4/0 split above; manifest regeneration byte-identical.
- Every command exit and content-denominator assertion passed. Tracked input
  hashes and all five built-package hashes stayed unchanged for the attempt.
- Syntax checks and `git diff --check` passed. No full root `pnpm check`, native
  engine integration, live GS, real maintenance/fault injection or independent
  review ran.

The final directory contains command stdout/stderr, `receipt.json`, complete D/Q
case results, `domain-probes.json`, `fault-probes.json`, and content-addressed
O-REPLAY input cases under `replay/`. Unit negative-control traces intentionally
include observed mismatches which their tests require to be rejected; they are
not database PASS receipts. A prior successful pre-outcome-hardening attempt
(`02-38-54-076Z-65db4c`) and the original failed attempt
(`02-33-16-151Z-e4cfec`) remain unchanged. `FIRST-FAILURES.md` distinguishes raw
captured failures from focused console notes. `RUNBOOK.md` contains current
exact offline and conditional live commands.

## Round 2 PASS audit (preamble 9a)

| Decision site | Content | Freshness | Binding and authority |
| --- | --- | --- | --- |
| `Probe.commit` / `expectedRows` | Expected O-REPLAY outcomes and independent dense ordinals match actual outcomes/positions; receipt assertion count and unique transaction IDs checked | Replays current authored command list in a fresh oracle call | Current attempt, memory-only source, source/build hash, exact input hash and command index; no native coordinate claim |
| `Probe.state` / `equal` | Exact canonical observed/expected selected state bytes; mismatches throw and remain in traces | New memory read and oracle result at each requested basis | Subject, position, valid time, endpoint, scope, attempt and source hash; `finish` rechecks source/build identity |
| `Probe.domain` | Kernel on observed state equals O-DOMAIN on independently replayed expected state | Fresh CLI call for each evaluation | Input/output comparison bound to checked state, named basis and oracle source identity |
| `reconcileClaim`, `affectedClaim`, `dashboardClaim` | Explicit task/obligation/proposal/boundary/affected/projection comparisons, durable record read-back and exact rerun sets | Current fixture observations; claim indices recorded only after successful comparisons | Actual fixture scope, subject list, source position, valid time and probe attempt; bench-side model only |
| `portableSweep.page` / `counts` | Validates source head, row positions, position eligibility, complete progressing feed enumeration, history counts and unchanged count head | Reads actual supplied source service on every invocation | Scoped service handle and exact requested position; not independently qualified on an engine |
| `openScenarioLane` / `requireLayout` | Returned source matches lane/endpoint/scope; layout fields, majority base and bounded delta checked | Invokes the supplied layout reader before/after, rejects old/foreign bindings | Exact attempt/source/scope/endpoint; fake reader labeled OFFLINE-FAKE, never live layout proof |
| Live layout-module wrapper | Requires reviewed module export and stable file hash around each observation | Calls module again for each observation | Owned lab module path and source hash; native correctness still needs external qualification |
| `consumerFault` | Publish/receive bytes match fresh oracle operations; stored final receiver/checkpoint state and exactly-once effects checked | Stops and resumes current memory client/consumer over persisted rows | Current source and checked evaluation basis; requested crash point must execute; logical fault model only |
| `lostAck` / `FeedReplica` | Original receipt resolution, duplicate rejection, real feed replay, pinned read identity, fallback and catch-up checked | Reopens/rebuilds current memory state | Same source endpoint/scope, actual positions/watermark and executed schedule; not engine durability or maintenance proof |
| `runCase` / `runCases` | Every known case executes its authored schedule and assertions; failures preserved; unsupported cases explicitly BLOCKED | Fresh source scope/attempt per member; source identity verified at finish | Manifest member, fixture, lane and independent oracle cases retained; OFFLINE-MATCH is not GS PASS |
| Updated `check-offline.mjs` | Checks actual exits, exact test and case denominators, zero failures, expected blocked count, golden/case output content | New attempt/logs and current command execution | Actual parent-owned heavy grant, node version, source inputs and five post-build package hashes, unchanged through the run |

Previously listed round 1 and copied G0 decision sites retain their limitations;
none is promoted by these offline fixtures. Remaining live admission depends on
Q94a/contract pinning, native lane builds and routes, real Q91 instrumentation,
engine-side faults/maintenance, product outbox/dependency/projection/erasure
integration and the independently reviewed scale-window campaigns. Keep GS OPEN.

# Round 3 — QA F1–F4 containment

Task: review `verify/W02` at `02e50d0`, fix the coverage/basis/fallback/setup
classes, copy its 33 mutation controls, and retain an honest offline result.
Read the review's complete VERIFY.md and original review.ts. The original program
is copied byte-for-byte at `controls/qa-original.ts`; `controls/round3.ts` preserves
its 33 substitutions and adds rejecting assertions for the formerly surviving
controls. Imports, evidence paths, baseline expectations and assertions changed;
no source observation is supplied to the independent expectation oracle.

## Changes

- **F1:** `requireSpecClaims` runs in `runCase` before an OFFLINE-MATCH can return,
  for scenario tags, witness members and scenario-associated extra schedules.
  The manifest reads the scenario spec afresh; every domain text must match an
  explicitly mapped text/index. Coverage requires the selected scenario's fresh
  claim record and executed successful check indices, including specific
  affected/rerun, boundary or projection checks where applicable. Unmapped text
  and missing executed evidence throw. GS.02 now records its own claim rather
  than borrowing scenario 1. Spec files are included in probe source identity.
  Integration tests mutate the spec text and remove executed evidence through
  the real driver. Neither can retain a match.
- **F2:** read answers now expose `reportedBasis` separately from source head.
  `checkedRead` records both requested and reported position/valid-time bases,
  endpoint and scope before rejecting absent/different metadata. V2 state,
  replacement/precondition, fault-state, fallback, live traffic and G0 reads use
  this boundary. Replica generation reads retain their selected filter basis.
  O-REPLAY still receives the caller's requested position and valid time. A test
  also spoofs matching metadata over latest-state contents and must fail the
  independent old-basis content comparison. The common-basis fixture now writes
  a reachable subject's pay rate after capture, verifies old/latest state differ,
  and records the ordered subject-list hash before comparing preview and sweep.
- **F3:** the required index-partition case now compares the returned fallback
  rows, caught-up replica rows, and old pinned rows before and after rebuild
  against fresh O-REPLAY at each requested basis. It uses the same canonical row
  comparator as the source route. A fallback event or watermark alone cannot
  satisfy the member. No packages/testkit source change or private package import
  was needed.
- **F4:** the Q factory unit test creates its own temporary fixture root and
  `runs/` directory before calling brokerEnv, and cleans up only that owned
  fixture. It cannot depend on another test file or an earlier run creating the
  worktree's runs directory. The path-containment check itself is preserved.

The stricter coverage check exposes missing implementations rather than adding
fictional claim records. On both memory/fake lane baselines, GS.03,08,10,11,12,
14,19,20 and their witnesses, plus GS-10-11-COMMON-BASIS and GS-19B-OUTBOX-CRASH,
now FAIL for missing executed domain claims (26 members). Forty other members
match; the original four capability gaps remain BLOCKED. This is the requested
fail-closed behavior, not completion of those domain/product schedules. In
particular this round does not implement supersession, release rollback/races,
historical explanation, tenant activation, boundary scheduling or physical erasure.
Existing direct state/kernel checks are retained as narrower diagnostics.

For GS.16, a durable fixture capability record and a checked subject read precede
explicit erasure refusal. The reviewer's wrong-current substitution now executes
and fails that integrity read. This expands the 33-control rejection denominator
without claiming that an unavailable erasure operation was exercised.

## Attempts and retained failures

Raw output remains outside git under the durable CX-W02 evidence root. Attempts
are create-only and preserve failures:

1. `round3-2026-11-09T03-08-42-775Z-423b09`: types/52 units/G0/goldens/manifest
   passed. The mutation child stopped after 29 rejected controls because the
   strengthened GS.10 fixture wrongly assumed the pay-rate change changed its
   `obligations` array. The old/latest discriminator now compares independent
   subject state instead. The assertion stopped before the wrong-basis injection;
   this attempt is not a 33-control success.
2. `round3-2026-11-09T03-10-44-232Z-308f01`: types, units and mutation import
   failed because a constructor parameter property is unsupported by the pinned
   strip-only TypeScript runtime. Replaced it with an explicit field assignment;
   no file was excluded from typechecking. G0/goldens/manifest still passed.

3. **Final:** `round3-2026-11-09T03-11-42-527Z-f863ca`, with mutation child
   `2026-11-09T03-11-55-094Z-d3f630`. All controller commands exited zero and
   passed their output-content assertions; source and five public-package build
   identities remained unchanged throughout. Actual parent-owned heavy grant:
   slot 2, label `CX-W02-R3-final2`. No engine slot/resident was acquired.

| Final check | Result |
| --- | --- |
| Full v2 types, live entry and tests included | exit 0 |
| Lab/W01b/W02 units including five new coverage/basis regressions | 53 pass, 0 fail, 0 skip |
| Same-process G0 test | 1 pass |
| Frozen generation | 20 byte-identical scenarios, 80 witness evaluations |
| CS-GS regeneration | byte-identical; contract untouched |
| D and Q baseline each | 70 members: 40 match, 26 missing-claim FAIL, 4 BLOCKED |
| Copied mutation campaign | 33/33 injected, 33/33 FAIL before missing-claim coverage |
| Added unknown spec claim / emptied fallback | both real scenarios FAIL |
| Background trace | all 20 match frozen trace mapper and contain burst events |
| Source/build identities | unchanged through final controller |

The final mutation assertions also reject a failure caused merely by the new
missing-claim gate. This prevents the 26 red baseline members from making a
corruption look detected when it was not. GS.10/11 wrong-basis substitutions now
hit an actual historical read and fail basis comparison. The extra spoofed-basis
unit test separately verifies content comparison at the requested position.

Evidence: [round3/INDEX.md](evidence/round3/INDEX.md) and
[round3/SHA256SUMS](evidence/round3/SHA256SUMS) index all 1,930 retained raw files
(21,529,925 bytes), including both failed controllers and their child outputs.
The manifest contains exact absolute durable paths and can be checked with
`shasum -a 256 -c SHA256SUMS`. No new bulky raw output is committed. Historical
round 1/2 tracked evidence is left unchanged. The original reviewer program copy
has SHA256 `8f4ce1fa95374ce45e53c56c1c9be835af5bbecdb5da4b8032ebf4484b332fb7`.

## Round 3 PASS / verdict / receipt audit (9a)

These are the changed or new decision sites. Earlier G0, oracle, lane-layout,
commit/outcome, fault and generation decision sites retain the round 2 audit and
their offline-only limits; none receives additional qualification here.

| Decision site | Content check | Freshness check | Binding check |
| --- | --- | --- | --- |
| Memory/public sweep `reportedBasis` producers | Expose the selector actually passed to the route, separately from current head; existing availability/row-position checks remain | Produced by each read invocation | Exact position/valid time and scoped route handle; an adapter report is not independent native-engine acknowledgement |
| `checkedRead` | Exact canonical requested/reported basis equality; absent metadata fails | Invokes route now and records its answer before checking | Endpoint, scope, subjects, requested and reported bases; nested under current attempt/source-bound case/live/G0 receipt |
| `Probe.read`, `state`, `compareRows`, `route` | Actual source/fallback/replica row bytes match fresh independent authored-command replay at requested cut; no latest-head substitution in oracle queries | Fresh read and O-REPLAY invocation for the current authored command prefix | Subject, requested P/V, exact replay input hash, probe attempt, endpoint/scope and source/build hash; `finish` rechecks identity before a match |
| `requireSpecClaims` | Exact spec-text mapping; selected scenario/index claim plus executed successful check indices and required check kinds; unknown/missing fails | Claim/check attempt and source hash must match this probe; claims produced only after current observations | Current manifest/spec, scenario and index; expected check names restrict unrelated generic kernel/publication checks; full source hash now includes spec bytes |
| GS.02 `reconcileClaim` record | Same independently checked next-task bytes as GS.01, with selected scenario identity | Current domain evaluation and check indices | Scenario 2, its spec index, attempt and observed basis; no scenario-1 alias |
| Common-basis schedule | Selected old/latest subject worlds must differ, preview/sweep bytes at old requested cut equal; R1/R2 distinction retained | Actual intervening write and new reads | Captured receipt position, valid clock, ordered subject-list hash and same source; does not satisfy unexecuted publication/race/rollback claims |
| Index-partition schedule / `FeedReplica` read recording | Returned fallback and rebuilt/current/old rows independently compared; watermark/event is supplemental, not acceptance | New fallback read and new feed generation in current fixture | Shared source, requested position/valid time, generation watermark and current probe; pure memory model |
| `runCase` final OFFLINE-MATCH branch | Executes all required spec claims before returning a match; throws become retained FAIL; explicit unavailable capabilities remain BLOCKED | Random scope and probe attempt per invocation; `finish` before match | Current manifest entry and scenario, authored fixtures, actual selected memory lane; all 70 retained |
| `coverage.test.ts` assertions | Real-driver unknown/missing claims fail for the specific reason; wrong/absent basis and spoofed latest contents reject | Fresh fixtures and temporary substitutions restored after each test | Selected case/subject and exact old basis; no engine acceptance |
| `controls/round3.ts` baseline assertions | Exact 70/40/26/4, exact failing and blocked ID sets, every baseline failure is missing executed coverage | Newly executed D/Q cases | Actual source before/after hashes and source-bound per-case traces; expected red diagnostics remain red |
| `controls/round3.ts` corruption assertions | All 33 have nonzero injection, FAIL, and no missing-coverage failure as substitute; extra claim/fallback controls fail | New case per substitution, fresh oracle expectations unchanged | Mutation mode, selected case, actual memory source/probe, raw observation traces; GS.16 limited to fixture integrity |
| `check-round3.mjs` controller receipt | Actual exits and specific test/golden/manifest/mutation output content checked; raw stdout/stderr digests retained | Create-only attempt, timestamps and actual child execution | Exactly one parent-owned heavy grant, exact argv, full source/build identity before/after; regression success never turns red GS members green |
| `evidence/round3/SHA256SUMS` inventory | SHA256 over every retained raw file | Computed after attempts finalized | Absolute durable paths and short index; integrity only, not semantic authority |

## Contract, verification limits and remaining work

`lab/acceptance/` is unchanged. Searched its JSON and pin inventories for every
changed path and old SHA256: **no changed file has a pinned content hash**, so
there are no pinned old/new hash deltas. Its only reference to a changed path is
the unpinned CS-GS execution entry `lab/scenarios/v2/case-driver.ts`; the manifest
still regenerates byte-identically and has not been re-authored or re-pinned.
No packages source/manifests, dependency lock, authority ref, merge or push changed.

No live engine, expected-load GS, native basis acknowledgement, Q layout count,
maintenance, physical erasure, real tenant isolation, product outbox/rollback or
scale-window campaign was run or qualified. Public route reports are adapter
metadata; native-engine correctness still requires the independent live campaign.
The legacy `requireDomainClaims` index helper remains a diagnostic helper, not the
v2 offline coverage authority; generic kernel/publication comparisons still do
not supply v2 scenario-specific claim records. The live scaffold still explicitly
returns FAIL/UNQUALIFIED. No full root pnpm check or independent round 3 review
ran here. Reviewer reruns remain required. GS stays OPEN, including the 26 newly
exposed missing-claim members and the four original capability gaps. RUNBOOK.md
contains the current exact regression command and conditional live commands.
