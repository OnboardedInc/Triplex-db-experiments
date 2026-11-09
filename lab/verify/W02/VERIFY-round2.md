# CX-VW02 — EXP-W02 review round 2

**Verdict: ACCEPT-OFFLINE.** This accepts the harness's offline fail-closed behavior,
including its red missing-claim results. It does not close GS or qualify a native
engine, product path, performance result, or contract version.

Reviewed builder `2e09b37e` after merging it into `verify/W02` at
`8a8c51d6c474f60d26c5370e2b39c16b5c6ba1da`. The merge contains no reviewer fixes
to the submitted implementation. Round 1 remains intact at `VERIFY.md` and its
original evidence paths. North star: P1-P5's GS correctness floor, under SCOPE,
NORTH-STAR and TARGETS; this review follows the current lab protocol and Q94b-i,
Q91a, Q92a/k and Q93a. Read builder report round 3 and its durable evidence index.

## Results

Fresh independent execution used the actual merged harness, local built public
packages, pinned Node 22.23.2 and a real parent-owned heavy grant. Package sources
and lockfile did not change in the builder fix; the existing local builds were
hashed before and after this review, rather than replaced with sibling builds.

| Check | Fresh independent result |
| --- | --- |
| Complete v2 typecheck, including live entry and tests | exit 0 |
| Lab, W01b and W02 unit selection | 53/53 pass, zero skips |
| Same-process G0 diagnostic | 1/1 pass |
| Frozen goldens | 20/20 byte-identical; 80 witness evaluations |
| CS-GS regeneration | byte-identical; all 70 required members retained |
| Full offline set on each of X, D and Q | 40 OFFLINE-MATCH, 26 FAIL, 4 BLOCKED; 70 total |
| Original mutation families | 33/33 injected and rejected before missing-claim enforcement |
| Original extra unknown-claim and empty-fallback controls | both reject through the real driver |
| Additional basis metadata controls | 20/20 reject through the real driver |
| Additional unmapped spec-text controls | 10/10 reject, including witness/shared-reference entries |
| Removed, stale-attempt or foreign-source claim evidence | 3/3 reject |
| Latest contents with spoofed matching old-basis metadata | rejected by independent O-REPLAY contents |
| Source and public builds through controller | unchanged |

The full set is **210 case executions**: 120 matches, 78 intentional missing-claim
failures and 12 capability blocks. No red member is converted to PASS to make the
regression campaign green. The controller's success means that these exact
expected outcomes and negative controls occurred. X/D use memory compositions;
Q uses memory plus explicitly OFFLINE-FAKE layout metadata. No database endpoint
was contacted.

All 33 controls must show a nonzero actual substitution, return FAIL, and fail
for something other than `required-domain-claim`. This prevents an already red
baseline member from making an undetected corruption appear detected. The GS.16
wrong-current control now checks the source fixture after its capability record
is written; that is fixture integrity, not an executed erasure operation.

## F1-F4 disposition

**F1 closed for offline containment.** `case-driver.ts:136` calls
`requireSpecClaims` before a match. Its input comes from the selected scenario's
current spec text via `cases.mjs:19`, including for witnesses and the associated
extra schedules. `claims.ts:136-146` maps exact text/index, requires a fresh
scenario/index claim record and successful executed check indices, and checks
the evidence's attempt/source identity. An added or changed unmapped claim
throws; unsupported implemented-claim mappings cannot pass via an empty prefix
list. Generic legacy `requireDomainClaims` index assignments do not satisfy this
v2 authority. GS.02 now records scenario 2 rather than scenario 1.

The exact text table is an explicit supported-mapping guard, not an independently
authored replacement requirement list. The runtime requirement list is read from
the specs. Spec files are also included in `probeSourceIdentity`. Independent
controls append unknown text to eight scenario specs, a witness's parent spec and
the shared-reference schedule's parent spec; all fail. Separate controls remove
executed evidence or change its attempt/source; all fail. No reviewed file was
edited to execute these controls.

**F2 closed for offline reads.** `read.ts:5-12` records requested position/valid
time, the separately reported answer basis, endpoint, scope and source head, then
rejects absent or unequal metadata. `Probe.read` is used by state, replacement
and CAS precondition reads; fault persisted-state reads and fallback use the same
boundary. Live scaffold and G0 population reads also use it. Replica generation
reads record the cut actually used by their `visibleRows` filter.

Every baseline case has read observations: 531 per lane, 1,593 total. Every
recorded baseline basis pair is present and equal. Additional controls corrupt or omit reported position
or valid time through all 20 scenario entries; each retains the mismatch and
fails before coverage. The common-basis fixture at `case-driver.ts:106-115` now
mutates reachable subject state after capture and asserts old/latest states
differ. Original wrong-basis controls for GS.08,12,10,11 and the common-basis
extra all reject. A separate control supplies latest contents with a matching
old-basis metadata echo: the requested-basis independent state comparator rejects
it. Reported metadata is not treated as proof of answer contents.

These are adapter/memory observations, not independent acknowledgements of a
native engine's actual cut. Native route equivalence and engine observation
remain separate live work.

**F3 closed for offline contents.** `case-driver.ts:84-88` checks actual returned
fallback, caught-up replica and old pinned rows using `Probe.route`; the latter
gets expected rows from a fresh authored-command O-REPLAY case and uses the same
exact canonical row comparator as the source route. The emptied fallback control
now rejects at `route:pl:p`, rather than passing on its fallback event/watermark.
The normal member still matches. No live partition/maintenance claim follows.

**F4 closed.** `lanes.test.ts:22-27` creates and cleans up its own temporary fixture
root and its own runs directory. It no longer depends on another test file
creating the worktree runs directory. All 53 tests pass in this rerun.

No new blocking harness finding was reproduced in this review.

## The 26 missing-claim failures per lane are build work

These are **26 case members**, representing **11 distinct spec claim slots in
eight scenarios**, not 26 different business rules. A case throws at its first
missing claim; later slots in GS.10 and GS.19 must also be implemented, even
though their current stack identifies index 0 first. Each scenario below has
three failed members: its tag and its POS/NEG witness members. Two named extras
add the remaining failures.

| Scenario and source | Failed members per lane | Spec claim slots and work still required |
| --- | --- | --- |
| 03 — `case-driver.ts:77` | GS-03, GS-03-WITNESS-POS, GS-03-WITNESS-NEG | **03:0** Older vendor revision acknowledged superseded, no current-value change, journaled. Current case only changes everifyStatus and notes unavailable supersession. Add W0-1.2 signal-ack semantics, the older-after-newer schedule and an independent acknowledgement/current/journal comparison. The separate supersession member remains BLOCKED. |
| 08 — `case-driver.ts:104` | GS-08, GS-08-WITNESS-POS, GS-08-WITNESS-NEG | **08:0** Corrected subjects' derived state is re-run. Current case checks corrected data and an old cut, but makes no O-DOMAIN call. Compare the affected set, actual re-run set and post-correction reconciliation at the required cuts. |
| 10 — `case-driver.ts:106` | GS-10, GS-10-WITNESS-POS, GS-10-WITNESS-NEG, **GS-10-11-COMMON-BASIS** | **10:0** Evaluate every in-scope subject at the activation cut and compare published work items through the atomic outbox. **10:1** Observe in-flight reconciles completing on R1 during R2 activation. **10:2** Rollback R1→R2→R1 yields three deliveries with the correct payloads and publication sequences. The existing one-subject reconcile/common-cut fixture is partial evidence; it executes none of those full publication/race/rollback checks. |
| 11 — `case-driver.ts:106` | GS-11, GS-11-WITNESS-POS, GS-11-WITNESS-NEG | **11:0** R2 preview equals GS.10's activation sweep at the same activation basis. Current fixture does compare two O-DOMAIN-backed reconciliations at a common cut, but it is an isolated one-subject model with an activation fixture row; it is not a linked GS.10 activation/sweep observation. Bind preview and actual sweep to one source, captured basis and exact ordered subject scope, compare every output, then add its executed claim evidence/mapping. |
| 12 — `case-driver.ts:117` | GS-12, GS-12-WITNESS-POS, GS-12-WITNESS-NEG | **12:0** Obligations and why/explanation at `(R_past, 2026-03-03)`. Current case checks state history only and makes no O-DOMAIN call. Supply the historical valid-time fixture and compare the actual explanation bytes with independent reconciliation/explanation expectations. Keep cross-engine repeatability a separate native obligation. |
| 14 — `case-driver.ts:119` | GS-14, GS-14-WITNESS-POS, GS-14-WITNESS-NEG | **14:0** New tenant's first release activation evaluates its subjects. Current case only changes weeklyMinutes and reads state; no O-DOMAIN call or tenant activation exists. Add the tenant-scoped activation/evaluation schedule and exact subject/output comparison. Physical tenancy still needs its native work. |
| 19 — `case-driver.ts:124`, `faults.ts:11` | GS-19, GS-19-WITNESS-POS, GS-19-WITNESS-NEG, **GS-19B-OUTBOX-CRASH** | **19:0** Exact dependency affected set, including referenced entities. No affected-set observation exists in this scenario. **19:1** Work-item payloads and publication sequences under W0. Existing fresh publish/receive comparisons and duplicate replay test are useful partial checks; they do not cover the committed stream's changed versus unchanged publications, sequence progression, and product atomic outbox. Add those observations and independently expected set/sequence comparisons, retaining each crash schedule. |
| 20 — `case-driver.ts:125` | GS-20, GS-20-WITNESS-POS, GS-20-WITNESS-NEG | **20:0** Every expiring subject actually re-runs at the boundary and gains the re-verification obligation. Current case directly evaluates before/after a date change without observing a scheduler. Add a no-write boundary schedule, exact due/re-run subject set and independent output comparison. |

**Count:** 3+3+4+3+3+3+4+3 = 26 per lane. Every failed baseline member has the
expected spec claim and lacks the selected scenario's complete executed claim
record/mapping. No baseline failure is a type/import/basis/content/setup error.

It would be inaccurate to describe all 26 as having zero O-DOMAIN calls. In
particular GS.10/11,19,20 already run narrower independent kernel/publication
checks. What is missing is complete evidence for their named scenario claims.
Adding a claim record or a required-prefix mapping alone is not the fix: the
missing observed schedules and comparisons above must exist first. GS.11's
remaining refusal is conservative; the useful new common-cut diagnostic should
be retained when its activation/sweep binding is implemented.

## Four capability blocks per lane

The exact set is unchanged:

- GS-03-SUPERSEDED-REVISION: W0-1.2 signal-ack unavailable.
- GS-16, GS-16-WITNESS-POS, GS-16-WITNESS-NEG: physical erasure/restore or
  crypto-shredding capability unavailable.

They stay in all denominators and never count as matches. No erasure or
supersession semantics were invented to clear them.

## Evidence and reproducibility

Reviewer source is `review-round2.ts`, adapted from the original reviewer control
program with changed expected outcomes, plus `extra-round2.ts` and
`check-round2.mjs`. The original review scripts/results remain unmodified.
The review ran:

```sh
node lab/bin/heavy.mjs --poll-ms 100 --label CX-VW02-round2 -- node lab/verify/W02/check-round2.mjs
```

The new controller creates a fresh durable attempt and records exact argv, raw
stdout/stderr digests, source/build identities, real parent grant, timestamps,
and explicit content/denominator checks. `round2/controller-index.json` points to
its receipt and the independently generated campaign directory.
`round2/results.json` contains compact baseline/control observations;
`round2/gaps.json` lists the exact spec text for all 11 missing claim slots and
the 26 failed member IDs per lane.
`round2/SHA256SUMS` indexes the complete durable raw files. All >1 MB files and
large replay directories remain outside Git beneath
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VW02/`.

The builder's final attempt at `round3-2026-11-09T03-11-42-527Z-f863ca` and child
`2026-11-09T03-11-55-094Z-d3f630` were inspected as historical evidence. They were
not adopted as fresh reviewer execution. Their two earlier failures remain
preserved. This review adds new evidence and does not re-anchor older attempts.

## Reviewer decision-site audit (9a)

| New result/verdict site | Content | Freshness | Binding and authority |
| --- | --- | --- | --- |
| review-round2 baseline assertions | Exact 70/40/26/4 per lane, exact blocked/failed IDs and missing-claim reasons; every recorded basis pair present/equal | New runCase scopes on each of three memory lanes | Actual merged head, source hashes, lane/scope/attempt and full raw cases retained; red cases remain red |
| original 33 substitutions and extra controls | Nonzero hits; exact FAIL and specific non-coverage failure; unrelated missing coverage cannot count as detection | New case per substitution, expectations untouched | Selected mutation/case/source/probe, raw outcome/check/read traces; GS16 is fixture integrity only |
| extra-round2 basis/spec/evidence assertions | Actual driver rejects absent/wrong position/wrong valid time, unmapped text and missing/stale/foreign evidence; spoofed metadata cannot hide wrong contents | Fresh fixtures; temporary substitutions restored | Exact selected case, requested/observed read metadata, spec input or evidence mutation, source-bound Probe checks |
| check-round2 controller | Actual exits, test counts, golden bytes, manifest and completed control denominators; raw hashes | Create-only attempt with current command execution | Exact source/build before/after, real heavy grant and merged head; regression success is not GS PASS |
| SHA256SUMS | Exact retained file-byte digests | Finalized new attempts only | Absolute durable paths; integrity inventory, no semantic authority |
| ACCEPT-OFFLINE verdict | Prior F1-F4 controls reject; full case distribution honest and gaps enumerated | This independent attempt | Builder 2e09b37e and unchanged merged implementation; accepts offline containment only |

Only reviewer tools, results and this report are newly authored here. No pinned
path is changed by the reviewer, so there are no old/new pinned hash deltas.
The builder fix also leaves `lab/acceptance/` unchanged. No contract edit,
main merge, push, native engine lifecycle action, native count/basis test, real
maintenance/partition, physical erasure, product outbox/tenant qualification,
expected-load campaign or full root pnpm check occurred. Those qualifications,
the 26 missing-claim members and four capability blocks remain open work.
