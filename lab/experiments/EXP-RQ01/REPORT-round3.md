# EXP-RQ01 — fix round 3

Builder CX-RQ01, branch `exp/RQ01-route-equivalence`, base `2043232b`.
Review: CX-VRQ01 `verify/RQ01` at `14722ac`, `VERIFY-round2.md`, FIX-FIRST.
North star: P1 immutable named reads and P4 exact route admission. Goals and
measurements: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. Design: R31
section 4, Q89a–i and the integer physical-group rule R-RCP-5/R-CUT-5.
This is offline builder evidence, not independent acceptance or engine qualification.

## RF1: validate the history, not nested labels

`validateRouteHistory` runs before generated histories return, before planning,
folding, basis generation and coverage measurement. It validates increasing safe
integer positions, finite clocks, unique assertions and valid retract lifetimes,
assertion fields, unique attempt/order identities, committed receipt binding,
CAS-abort outcomes and proposed writes, and complete nested groups. Attempted
histories require a matching receipt for every committed member.

The chosen representation is integer positions. Each callback declares its full
size; every member has ordinal 1..size, consecutive integer receipts and contiguous
stream membership. The generated pairs are now **9216/9217** and **25600/25601**,
not the previous 1025-spaced pairs. A generation count that truncates a physical
group (for example 25) fails loudly. The coverage checker counts interior members
only after the complete grammar has passed; a remainder modulo 1024 is not proof.

The old invalid pair is reconstructed with mutually matching receipt/attempt
positions and must still fail generation-use/coverage before any fixture reset.
Other negative cases cover incomplete groups, incorrect ordinals/sizes, missing
or mismatched receipts/attempts and invalid retract targets. This grammar is the
offline history representation, not a replacement for application schema or
engine transaction validation.

Bare extensions to attempted histories receive an explicit logical attempt and
receipt in the frozen execution plan; the fixture and reference consume that same
append. These are model identities, not native engine receipts. This keeps every
member of the extended model valid without changing its position, instant or
write content, including the deliberately late Q89a assertion.

## RF2: one driver-derived execution plan

Every route declares its retention kind and a planner returning its actual cut
IDs, horizons, purge events and pin modes. A position-retired route cannot declare
an empty policy. The runner copies and deeply freezes one plan containing the
history, normalized append/attempt, route policies and exact request objects,
with a SHA-256 digest of those bytes.

Default requests include P cuts h and h-1 for **every** declared route cut,
including custom cuts independent of the default append. Explicit request lists
missing any required boundary fail before reset/read. Identical declarations may
share an event, but their owning route IDs remain bound in the plan. Complete
stores may declare no cuts; complete-store maintenance is omitted only in an
explicit diagnostic scope. Position-retired stores' cuts remain mandatory there.

The runner executes this exact plan. Purge callbacks receive owning routes and
cut ID and must report the actual applied horizon and pin mode. Pending or
mismatched retirement events reject rather than qualify. Other engine-only
index/flush/compaction events remain pending, without pretending they executed.

The wrapper passes `result.plan` and its exact history/requests into
`requireRouteCoverage`; it never regenerates a default horizon. Coverage checks
the digest and equality of its inputs with that plan. Without a plan,
`measureRouteCoverage` is structural-only and cannot report completion;
`requireRouteCoverage` refuses. Per-route boundary witnesses, cut IDs, digest and
actual event results remain in the receipt.

The copied/adapted reviewer boundary witness now has two position-retired routes
with **45056/45055** and **44544/44543** custom cuts, plus default maintenance cuts
from the remaining complete route. A bad route drops a row only after its own
custom retirement event, and only at its h/h-1. The clean full qualification run
must have zero violations; the injected run must expose HE-1 on the bad route and
HE-2, with no failures on the correct routes or at other positions. Old default
requests are required to reject instead of silently missing the custom cut.

## Review copies and compatibility

`reviewer-round2/probe.mjs` and `boundary.mjs` are unchanged copies from the
read-only reviewer checkout. Their source/copy hashes and reviewer commit are in
`provenance.json`. Their original false-PASS assertions remain historical and are
not executed as current acceptance. The new round-3 test file and measured
`retention-probe.mjs` adapt those probes into rejecting regressions.

Round-one subject identity, Q89i metadata and empty-request fixes remain active.
The original and independent D-C1 cases remain explicitly known-failing under
Q89a; no metadata comparison is removed. XTDB's actual offline physical driver
still identifies raw-lifetime rows, and product Q89c/Q89i repairs are not claimed.

## Execution and retained attempts

Commands use `node lab/bin/heavy.mjs --label CX-RQ01-... -- COMMAND`. Every gate
attempt owns a new output directory and records its actual parent heavy-slot
owner, exact commands, source hashes, fresh JSON test reports, coverage token and
built output hashes. It now parses all test assertions/counts and checks the
expected new regression identities plus the original Q89a case; exit zero alone
is not a passing content check.

- `round3-tsc-a1.log`: an initial TS narrowing error (`row` possibly undefined)
  was found and fixed. No PASS is claimed for that attempt.
- `round3-a1/`: source-stable failure, 90/91 testkit assertions passed; the custom
  fault fixture mistakenly activated route one's drop at route two's cut as
  well. Its assertion and coverage command correctly failed. The injection now
  activates only for the owning route. All artifacts are retained.
- `round3-a2/`: every command/content check passed, but source stability failed
  while stricter receipt/write validation was completed. This is retained as a
  failed admission to PASS, not adopted as final evidence.

- `round3-a3/`: every command/content check passed, but source stability again
  failed while the final applied-status and correct-owner audit checks were
  completed. It remains nonqualifying. No source changed during the final a4 run.

Final execution results appear below.

## PASS/verdict/receipt audit (rule 9a, before commit)

No code in this round promotes an engine, performance result or independent
O-REPLAY verdict. Pure helpers claim properties of their explicit in-memory
inputs; filesystem source/admission binding belongs to the audited controllers.

| Decision site                                                                         | Content checked                                                                                                                                                                                                                                                                                                          | Freshness checked                                                                                                                    | Binding checked                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `route-history-grammar.ts` return, generator return, fold/reference input acceptance  | Complete group size, ordinal/position adjacency, every receipt/attempt, writes/lifetimes/abort identities; old physically invalid pair rejects                                                                                                                                                                           | Validation runs on each newly generated/planned/folded input; no prior receipt is consulted                                          | Receipts bind attempt IDs, positions and instants; group identity/size and all members are validated. No slot or source-execution claim in this pure helper                                                                                                      |
| `makeRouteExecutionPlan` return/digest                                                | Both histories validate; policies are declared and nonempty for retired stores; every actual h/h-1 is present; IDs/events/horizons are valid                                                                                                                                                                             | Creates new deep immutable copies and invokes each policy on this invocation's append/history                                        | Canonical digest binds exact history, append, logical append attempt, owning route policies and request bytes. No independent-source or engine claim                                                                                                             |
| `runRouteEquivalence` observations and violations                                     | All row columns versus the named snapshot/raw reference, pairwise equality within contracts, typed eligibility/refusal, basis/route echoes, availability, HE-5 and actual retirement echo; nonzero required shape reads                                                                                                  | Reset and every callback run in this invocation; frozen requests repeat after actual events, not a regenerated plan                  | Every observation records route, contract, phase and request; result retains immutable plan/digest. Fixture events are model evidence only unless a real adapter supplies stronger proof                                                                         |
| `measureRouteCoverage.complete`, `requireRouteCoverage`, positive case wrapper return | Validated semantic witnesses and all cut predicates, exact per-route retention boundaries; no completion without a plan; no case return with violations                                                                                                                                                                  | Wrapper checks the plan returned by this just-completed run, never default horizons after execution                                  | Plan digest recomputed; history and request bytes must equal that plan. Controller supplies source/heavy binding; standalone structural data cannot qualify                                                                                                      |
| `retention-probe.mjs` return/assertions                                               | Clean control has zero failures; omitted custom cuts reject; bad owner produces HE-1/HE-2 only at its custom h/h-1; correct routes stay clean                                                                                                                                                                            | New histories and fresh independent fixtures/retirement sets in each call                                                            | Pinned controller plus returned plan digest, actual cut/event context, exact wrong-answer requests and rules; caller's admitted attempt binds source                                                                                                             |
| `coverage.mjs passed:true` / output                                                   | All five complete seed manifests, nonzero answering shapes, zero route violations, plus the actual custom-cut fault/control probe                                                                                                                                                                                        | Refuses an existing output; computes all records in this call; carries the parent's unique attempt token                             | Exact result plans feed coverage; parent checks source/build bytes and real admission; output is offline model evidence                                                                                                                                          |
| `gate.mjs child content`, `coverageContent`, final `passed` / exit / receipt          | Parses actual fresh test JSON, all assertions passed, zero failed/pending/todo, nonzero counts and required regression names; silent successful tsc; fresh normal build; all five coverage contents and per-route actual retirement witnesses; custom mutant/control conditions. It does not trust the child's PASS flag | Exclusive output directory, per-spawn start/mtime checks, reporter start time, fresh build mtime, unique nonce echoed by coverage    | Before/after hashes of all local core/testkit/XTDB/QLever source inputs, tests/configs/controllers/lock and tool entries; built-tree hashes stable; actual heavy parent PID/slot/owner read and verified unchanged; exact commands/head retained; no engine slot |
| `package-smoke.mjs content`, `passed` / exit / receipt                                | Required public tar entries, no source/test/cache leakage, unpacked dist bytes equal the current build, fresh consumer JSON has nonzero shape coverage/observations, zero violations, snapshot contract, exact 40 original IDs and all three post-cut retirement fields masked                                           | Exclusive package directory, new tar/consumer, per-consumer start/mtime checks and nonce; never reuses an existing attempt directory | Source/controller/lock/dependency manifest and borrowed core/Effect dist hashes before/after; tarball/output and exact built-tree hashes; actual heavy admission unchanged. Existing dependencies are reused, not freshly qualified packages                     |
| Round-3 tests / assertions                                                            | Independent physical adjacency scan; invalid-history controls; custom wrong answer versus clean control; missing plan/request and wrong/pending event rejections; prior faults remain active                                                                                                                             | Vitest creates fresh fixtures in this invocation; fresh per-attempt JSON report is verified by gate                                  | Tests and fixtures are in the source hash set, all named assertions/content are parsed, actual gate admission recorded                                                                                                                                           |

The first three failed gate receipts are evidence that the aggregation rejects both
content failures and a source change even when all child commands exit zero.
Raw tool logs and original review copies are retained without rewriting their bytes.

## Limits

No engine/container operation, live concurrency, benchmark, independent O-REPLAY
run, full-root check, deployment, publication, merge or push. No new agent was
spawned. Actual broker/H1 and Datomic adapters remain pending. The declared
retention policy is a driver contract: this harness checks its executed hooks
and returned boundary evidence, not hidden engine behavior. Model event echoes
are explicitly labeled model-applied. No application schema or native engine
correctness promotion follows from passing these offline gates.

## Final gate results

**PASS:** `evidence/round3-a4/receipt.json`. All six commands exit zero and pass
content checks: **91/91 testkit tests, 3/3 XTDB offline tests, 1/1 QLever model
test (95 total)**, TypeScript, normal package build and measured coverage. Test
JSON reports have zero failed, pending or todo assertions. Required physical-group,
custom-boundary and original known-failing Q89a regression identities are present.
All five seeded histories validate and pass measured R31 coverage.

`sourceStillMatches`, `distributionStillMatches`, `admissionStillMatches` and
`coverageContent` are all true. The final controller binds 184 input paths, the
built output tree and actual **offline heavy slot 4**, holder
`CX-RQ01-round3-a4`; it reserved no engine slot. The receipt has a fresh per-attempt
token and exact child commands, reporter/output hashes and start times.

The measured custom-cut probe rejects the old explicit default request set,
returns zero clean-control and correct-route violations, and catches **189 HE-1
plus 189 HE-2** wrong-answer observations from the single planted bad route.
Every violation names its actual h/h-1; no other positions fail. Its retained
per-route boundary witnesses are:

| Route model                                              | Declared horizon | Boundary reads  |
| -------------------------------------------------------- | ---------------: | --------------- |
| X1-all-valid-time, injected position-retired test policy |            45056 | 45056 and 45055 |
| X6-cold, second position-retired test policy             |            44544 | 44544 and 44543 |
| X6-warm, complete-source maintenance policy              |  21504 and 45056 | Each h and h-1  |

These test policies do not claim those production XTDB routes physically retire
rows that way. They exercise the generic per-driver contract. Applied event
horizons and owning routes are retained in `coverage.json` and the main receipt.

`evidence/round3-lint-final.log`: zero warnings/errors on fourteen changed source,
test and controller files. Final formatting and source-whitespace checks are
recorded separately; original review copies and raw logs keep their original bytes.

Repository-wide package verification was retried offline and remains **blocked**
at triplex-sql's missing workspace dependency link:
`ERR_PNPM_CANNOT_RESOLVE_WORKSPACE_PROTOCOL`, actual exit 1, retained in
`evidence/round3-root-pack.log`. No unrelated dependency installation or lockfile
change was made. The pinned store is supplied with `--config.store-dir`, because
pnpm pack rejects the bare spelling; offline mode is enabled and no global
configuration is changed. Focused package verification is recorded separately.

Focused package smoke: **PASS**, `evidence/round3-final-package-smoke.json` and
`.log`, including 31,325 fresh consumer observations, zero violations, all six
shapes, snapshot contract, exactly the forty original assertion IDs and all three
post-cut retirement fields masked. Pack and consumer exits are zero; content,
source, build and real admission bindings are all true. Every unpacked dist file
matches the normal build byte-for-byte, including grammar/coverage JS and types.
The controller, testkit source and borrowed core/Effect dist preimages are hashed;
this is not a new qualification of those borrowed dependencies. Fresh tarball and
consumer remain under `.experiments/rq01-package-smoke-round3-final`.

The PASS audit above was completed before this commit. Independent round-3 review
is still required. No engines were started or changed, no source/dependency
installation occurred, and no branch was merged or pushed.
