# CX-VW02 — EXP-W02 independent offline review

**Verdict: FIX-FIRST.** Reviewed builder head
`24960cb7f936f5ed8539b8d5ed8eaa17aa67f277` on `exp/W02-gs-harness-v2`,
including W01b `1d1919915f66573a9636f10ad48de7bb34ee3022` and both W02 report
rounds. Review branch: `verify/W02`. Reviewer did not change the submitted code.

North star: the P1-P5 GS correctness floor. Goals and targets are from SCOPE,
NORTH-STAR and TARGETS; design is main checkout R37 sections 1-4 and rulings
Q94b-i, Q91a, Q92a/k and Q93a in `lab/acceptance/RULINGS-PENDING.md`.
The inherited homebase procedure was not used. This is an offline review, not a
GS promotion, native lane qualification, or acceptance of the imported P5/K01 work.

## Findings

### F1 — P1: offline matches bypass the named domain-claim requirement

**Locations:** `lab/scenarios/v2/case-driver.ts:30`, `:75`, `:98`, `:108`,
`:110`, `:127`; `lab/scenarios/v2/claims.ts:7`.

`runCase` initializes `OFFLINE-MATCH` and returns it after state comparisons
without requiring coverage of `entry.domainClaims`. It never calls
`requireDomainClaims` or an equivalent check. The helper itself rejects missing
claims, and the live scaffold uses it, but the executing offline path bypasses it.

Reproduction: `review.ts` substitutes an in-memory read of GS.01's spec with one
additional domain claim, without changing a source file. `caseManifest()` sees
two claims; the real `runCase('GS-01', ...)` still returns `OFFLINE-MATCH`, with
only the original claim recorded. See `results.json` → `checks.missingClaim`
and durable `missing-claim.json`.

The baseline is already affected without a modified spec:

| Scenario | Named claim not checked by its case | Observed status |
| --- | --- | --- |
| 03 | older vendor revision is superseded, current unchanged and journaled | OFFLINE-MATCH; `details.supersession = BLOCKED-W0-1.2`; no domain calls |
| 08 | affected set and re-run derived state after correction | OFFLINE-MATCH; no domain calls |
| 10 | all in-scope publications, in-flight R1 race, three rollback deliveries | OFFLINE-MATCH; only per-subject reconcile comparisons; no publication/race/rollback schedule |
| 12 | obligations and explanation at the specified historical basis | OFFLINE-MATCH; no domain calls |
| 14 | new tenant's first release activation evaluates its subjects | OFFLINE-MATCH; only a weeklyMinutes write and state reads |
| 19 | affected set through references | OFFLINE-MATCH; publication/receiver fixture runs, affected-set check absent |
| 20 | every expiring subject is actually re-run by the boundary schedule | OFFLINE-MATCH; two direct evaluations, no scheduler observation |

The special supersession member is correctly BLOCKED, but GS-03 and its witness
members can still match with that scenario's sole named claim absent. That is
not closed by counting the special member in the blocked denominator.

**Proposed fix:** define explicit claim IDs tied to spec content and the required
operation/observation; enforce complete coverage on every entry before a match.
Unknown or unsupported claims must fail closed or be explicitly BLOCKED. Keep
smaller state-only diagnostics separate from a full scenario match. Wire the
missing O-DOMAIN checks and actual observed schedules before removing blockers.
GS.02 also currently records its equivalent next-task check under scenario 1;
bind claim records to the selected entry rather than relying on that alias.

### F2 — P2: common-basis fixture cannot detect latest-state reads

**Location:** `lab/scenarios/v2/case-driver.ts:100`.

Between preview and sweep, the only write is `gs:release/activation`, outside the
placement's reachable world. There is no post-capture subject mutation. A source
that ignores the old position therefore returns identical bytes for this fixture.

Reproduction: replace reads inside `Probe.state` at a past position with reads
at the actual latest position, preserving requested metadata. `GS-10`, `GS-11`
and `GS-10-11-COMMON-BASIS` each perform **two** such wrong-basis reads and still
return `OFFLINE-MATCH`. The same mutation is rejected in GS-08 and GS-12, so the
control is capable of producing observable failures.

Evidence: `results.json` → `mutations` (`wrong-basis`); durable
`wrong-basis-GS-10.json`, `wrong-basis-GS-11.json`, and
`wrong-basis-GS-10-11-COMMON-BASIS.json`.

**Proposed fix:** mutate a selected subject's decision/rate/status after capturing
the common basis and before activation evaluation, assert that the latest answer
differs, then compare both requested-basis answers with independent old-basis
expectations. Include the ordered subject-list hash required by the schedule.

### F3 — P1: index-partition member ignores fallback result content

**Location:** `lab/scenarios/v2/case-driver.ts:81`.

The case awaits `replica.read` and discards its returned rows. It checks a fallback
event and watermark, then checks the source directly. A wrong fallback answer
therefore does not fail this required CS-GS member.

Reproduction: wrap `FeedReplica.read` so it executes the submitted implementation
(including its fallback event) and then returns `[]`. The wrapper executes once;
`GS-04B-INDEX-PARTITION` still returns `OFFLINE-MATCH`. See `results.json` →
`checks.wrongFallback` and durable `wrong-fallback.json`.

The standalone maintenance unit test does compare fallback contents; that does
not make the CS-GS case driver's ignored result into a checked observation.

**Proposed fix:** compare the actual fallback and caught-up replica rows with
O-REPLAY at the driver-requested position, and assert old pinned reads across the
rebuild. Keep the live 60-second outage, applicability, wait/fallback-share and
bounded catch-up obligations explicitly unqualified until exercised.

### F4 — P2: offline unit suite depends on an existing runs directory

**Locations:** `lab/scenarios/v2/lanes.test.ts:23`;
`lab/scenarios/lib/policy.mjs:9`.

Fresh checkout + offline install + public builds + the submitted unit command
produced **47/48**, zero skips. The Q factory test fails with ENOENT at
`realpathSync(.../verify-w02/runs)`. The sibling offline test creates that directory,
but Node executes test files independently, so it is not a setup dependency the
Q test can rely on. The following admission and case commands create it; existing
builder evidence was recorded in a prepared worktree.

Reproduction and actual stack are retained in `evidence/unit.stdout.txt` at test
40. This is a setup failure, not a QLever engine failure.

**Proposed fix:** each test owns and creates its required fixture directories
before calling `brokerEnv`; avoid depending on another test file or prior run.

## Fresh independent execution

Installed pinned pnpm 10.11.0 dependencies with the owned store, offline and
frozen lockfile, zero downloads. Built core, testkit, XTDB, qualification and W0
using the submitted build script, through the lab heavy semaphore. Host free disk
was above 5 GiB for the install/build/main review admissions. No engine was opened.

| Check | Fresh result | Evidence |
| --- | --- | --- |
| public dependency builds | exit 0 | build stdout/stderr |
| full v2 types, including live entry and all tests | exit 0 | types stdout/stderr |
| submitted lab + W01b + W02 unit selection | 47 pass / 1 fail / 0 skip | unit stdout; F4 |
| same-process G0 | 1/1 pass | admission stdout |
| v2 frozen goldens | 20/20 byte-identical; 80 witness evaluations | goldens stdout |
| CS-GS manifest regeneration | byte-identical; 70 exact inventory members | manifest stdout |
| all D memory-path members | 66 OFFLINE-MATCH / 4 BLOCKED / 0 FAIL | durable datomic-baseline.json |
| all Q fake-layout memory-path members | 66 OFFLINE-MATCH / 4 BLOCKED / 0 FAIL | durable qlever-baseline.json |
| mutation program | exit 0; 33 mutations plus missing-claim and wrong-fallback controls | adversarial stdout; results.json |
| reviewed inputs unchanged through main review | true | receipt.json and results.json |

The main review controller exits 1 because the first unit command failed; its
subsequent commands still execute and retain their actual exits. No green
aggregate is claimed. A follow-up rerun was canceled while waiting for a heavy
slot after host free disk dropped below 5 GiB (4.81 GiB; 5,040,220 KiB at the
check). No follow-up test or hash-audit command executed. Its empty stdout and
semaphore-wait stderr are preserved. No unrelated state was deleted to make it fit.

### Can each scenario reject a wrong outcome?

Each wrong-value mutation changes a returned `pl:p/payRateCents` after the seed,
while O-REPLAY receives the unchanged authored inputs. Every runnable scenario
rejects it at the state comparison. This proves a shared state comparator is
active; it does **not** prove each scenario's named domain claim is checked.

| Scenario | Wrong current value | Additional targeted observations |
| --- | --- | --- |
| 01 | FAIL | lost commit FAIL; added unchecked domain claim still MATCH (F1) |
| 02 | FAIL | next-task claim uses scenario-1 helper |
| 03 | FAIL | missed supersession is not executable; special case BLOCKED, enclosing scenario still MATCH (F1) |
| 04 | FAIL | lost commit FAIL; empty index fallback still MATCH (F3) |
| 05 | FAIL | dedicated re-evaluation fixture/unit check present |
| 06 | FAIL | exact two-hop affected set and reruns fixture present |
| 07 | FAIL | lost/misrouted commit causes CAS schedule failure |
| 08 | FAIL | lost commit FAIL; wrong basis FAIL; affected-domain claim absent |
| 09 | FAIL | boundary persisted/read back in bench-side fixture |
| 10 | FAIL | wrong basis still MATCH (F2); race/rollback/publication claims absent |
| 11 | FAIL | wrong basis still MATCH (F2) |
| 12 | FAIL | lost commit FAIL; wrong basis FAIL; historical explanation absent |
| 13 | FAIL | lost commit FAIL; no performance claim |
| 14 | FAIL | release-activation claim absent |
| 15 | FAIL | memory-only scope model; no physical tenancy claim |
| 16 | BLOCKED | no erasure outcome was fabricated or tested as semantic success |
| 17 | FAIL | lost commit FAIL; agent-decision exclusion fixture/unit check present |
| 18 | FAIL | persisted bench-side projection fixture/unit check present |
| 19 | FAIL | duplicate receiver effects FAIL at exactly-once comparison |
| 20 | FAIL | direct before/after evaluations; actual boundary scheduling absent |

Lost-commit controls misroute acknowledged assertion data to another subject,
keeping the successful receipt's assertion count plausible. All seven tested
cases reject the resulting outcome. Duplicate-effect control duplicates a stored
receiver effect; GS-19B rejects it at `exactly-once-visible-effects`, rather than
merely rejecting a malformed request. Current-value, lost-commit and wrong-basis
controls use the actual selected memory source; no oracle expectation is altered.

## Design and ruling checklist

**Q94b:** incomplete — F1. The six specifically requested new claim helpers
(01,05,06,09,17,18) have independent replay/world comparisons and oracle-backed
memory tests, but this is not complete coverage of the 20 specs. Missing claims
fail in the helper/live scaffold, but do not fail in the offline case entry.

**Q94c / Q92k:** verified offline generator property. For all 20 specs at N=500,
every background event equals a fresh call to frozen `generateTrace` followed by
`mapW0Trace`, byte-for-byte after the documented ordering. Each 240-second window
contains the 120-180-second burst. Overlay accounting is separate. The unit
vocabulary checks pass. Offline case fixtures execute neither that population
trace nor in-window engine maintenance; the live runner explicitly leaves the
maintenance check false. No expected-load/P1/P2 conclusion follows from fixtures.

**Q94d / Q93a:** the live path seeds a random scope per scenario, computes the
independent population expectation before seeding, calls `admitWorld` on the same
opened composition before `execute`, and records start/end store counts. Admission
compares fresh full population worlds/results plus counts/source bindings; it
does not grant on owner state or a last-command lookup. The 1/1 memory admission
test rejects wrong scope/counts/digest and changed observed bytes. This establishes
memory behavior and control flow only, not a native G0 result. The small CS-GS
fixtures do not represent an admitted W0 population; they are labeled accordingly.

**Q91a / lane D / broker plumbing:** the lane selector validates returned lane,
endpoint and scope; D uses its own public opener and DATOMIC_URL, and Q gets
broker selection plus an owned broker directory. Q layout checks require a built
majority base, nonnegative touched-block delta and a bounded delta. Before/after
layout bindings and counts are recorded. The existing tests reject X-for-D,
foreign/stale binding, delta-only/over-threshold layouts and future-position rows.
All 140 baseline members used this lane selector. Q observations are explicitly
OFFLINE-FAKE and D is memory; neither proves a native count/read/position route.
The GS gate records slot, resident flag and its end co-running inventory. Native
D slot/build/route and real Q generation/touched-block instrumentation remain open.

**Q92a:** fixture reads use named receipt positions and W0's deterministic valid
clock. The common-basis test is insufficiently discriminating (F2). The public
route remains an internal position-aware bench adapter pending its own RQ01/native
qualification; it is not evidence for a released public basis API.

**CS-GS:** exact inventory is present: 20 tags + 40 witness members + 10 additional
schedules, with no extra IDs, and regeneration is stable. All 70 execute on each
offline lane. Inventory completeness does not establish semantic coverage: F1,
F2 and F3 prevent that conclusion. The manifest's population witness-selector
strings are not evaluated by `runCase`; it uses synthetic pl:p/pl:n fixtures.
Positive witnesses for 10/11/19 also skip the general state-change assertion.
These narrower models must not be promoted as all required GS witnesses checked.

**Four blocked cases:** independently confirmed on both paths:
`GS-03-SUPERSEDED-REVISION`, `GS-16`, `GS-16-WITNESS-POS`,
`GS-16-WITNESS-NEG`. They stay in each denominator and never count as matches.
No missed-supersession or physical-erasure fault could be executed against an
absent capability. Their blocked status is the verified result, not semantic PASS.

**Q94e-i:** pre-0.4 evidence stays diagnostic; live v2 returns FAIL/UNQUALIFIED
with explicit missing state/domain/product/fault/maintenance checks. No product
outbox, real process loss, physical erasure, in-flight old-release race or rollback
publication was qualified here. Logical client restart, feed-rebuild and consumer
stop models were exercised, and their limits remain material. GS stays OPEN.

## W01b and historical evidence

Read W01b's cumulative harness changes and report, not just 1d191991's final
report-only diff. Its queued-writer/restart regression, blocked predecessor and
cause-classification tests all pass in the fresh unit run. The final W02 gate
retains the failed-build refusal before engine contact, the cause-preserving
diagnostics and the separated build/run heavy grants. No additional W01b defect
is asserted from static inspection. The proposed GS12 core patch remains an
unapplied patch artifact; its historical instrumented adapter proof is not a
native round trip or fresh verification in this review.

Read the final W02 attempt
`offline-2026-11-09T02-45-07-138Z-8af252` including its receipt, raw unit/admission/
golden outputs and D/Q case-result structures. It records the builder's 48/48,
1/1, 20/20/80 and 66/4/0 per lane. Those remain historical builder results.
Fresh reviewer execution is the table above. Earlier failures/abort receipts were
not removed or reclassified. No contract anchor was edited by this review.

## Evidence, reproduction and authority

Reviewer tools: `review.ts` (case baselines and mutations), `check.mjs` (command
capture), `followup.mjs` (unexecuted after cancellation). The exact commands and
raw hashes for the executed review are in `evidence/receipt.json`.

With >=5 GiB host disk free and a heavy grant, the main review command was:

```sh
node lab/bin/heavy.mjs --poll-ms 100 --label CX-VW02-offline-review -- node lab/verify/W02/check.mjs
```

The evidence directory is retained as the original attempt; do not overwrite it
with a rerun. Use a new evidence location/attempt before repeating the controller.
The mutation program independently generates a new durable raw directory each run.

Large raw evidence is outside Git at:
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VW02/2026-11-09T02-54-35-214Z-f27887/`.
It includes the two >1 MB baseline files, raw per-case replay inputs, mutant
results, all probe traces and the full review result. `evidence/results.json` is
the compact inspectable result; `SHA256SUMS` indexes durable raw bytes. No new
large raw oracle/gate directory is committed. The install/build products stay
local and ignored. Reviewed code and contract files remain unchanged.

### Reviewer decision-site audit (preamble 9a)

| New site producing a finding/result | Content | Freshness | Binding and limit |
| --- | --- | --- | --- |
| review.ts baseline assertions | exact 70 entries, 66/4/0 and exact blocked-ID set; real submitted runCase results | newly opened random memory scopes | submitted head, immutable source hashes, lane, source scope, oracle case IDs retained; diagnostic only |
| review.ts mutation assertions | nonzero mutation hits and exact expected case verdict/error; unmodified independent expectations | same new case invocation as each mutation | explicit mutation, selected case, actual Probe source/attempt, raw checks/outcomes; blocked16 has zero mutation and is not a reject proof |
| missing-claim control | manifest sees extra claim, real case still matches; helper separately rejects omissions | current in-memory spec read; no disk edit | claim list, returned claim records and actual case captured; proves missing enforcement |
| wrong-fallback control | submitted read executes, then [] is returned and the case still matches | one newly built/fallback replica | read hit count, returned case, actual fallback events; proves ignored contents |
| background equality assertions | all mapped event objects equal frozen generator output and contain burst events | regeneration in current process | spec seed/N/window/source and stream hashes; no live load claim |
| check.mjs command capture | actual exits and raw stdout/stderr hashes, including unit failure | timestamps and one real parent-owned heavy grant | current source before/after identity, exact argv and reviewed head; no aggregate PASS |
| VERIFY.md verdict | three reproduced semantic coverage gaps plus clean-setup failure | this retained review attempt | exact builder head and linked source/evidence; FIX-FIRST, never GS acceptance |
| SHA256SUMS | exact retained file-byte digests | generated over finalized evidence | paths and durable directory indexed; integrity inventory only, never semantic authority |

No pinned file is changed by the review, so there are no old/new pinned-file
hash deltas to report. `lab/acceptance/` is unchanged. No commit, merge or push of
the builder branch, engine lifecycle action, network lane run, full root check,
performance test or promotion occurred. The remaining questions are implementation
work for F1-F4, plus the already recorded native/product/rung qualifications.
