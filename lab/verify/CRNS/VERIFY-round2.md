# CX-VCRNS round 2: EXP-CRNS

**Verdict: FIX-FIRST. R01–R06 are fixed; one HIGH finding remains in the new evidence-floor rule.** P5 can report its live-traffic bar met with 99 of a verified 100-second sweep's seconds missing. The qualifying-second denominator comes from the supplied traffic segment, not the complete sweep interval.

North star: trustworthy P1–P5 measurement, with correctness as the floor. Goals/targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; design: R44 section 4 and the explicitly proposed round-2 amendments. Scope: my previous findings and the new evidence floors. I did not perform another broad review of all O1–O29 or report lower-severity new issues.

Reviewed target: `exp/CRNS-recompute` at **`2cdb3d2f8f52087c87a8492597065143a4598d82`**. Evaluator SHA256: **`0ac41f01b4e2dbdd04db64654eb47310ea07346aaf90aada65a7ae829299f892`**. Read the round-2 report/finding table, schema amendments, retained evidence, and the original Opus review. The old Opus report/TAP is historical, not a fresh ACCEPT.

The isolated review branch incorporates the exact target with merge commit `29f2426e`; only the two copied reviewer fixture/test add/add conflicts were resolved, using the target versions byte-for-byte. This keeps the original review commit `93d2af9c` and evidence in history while letting evaluatorIntegrity check committed round-2 code. No builder/main-worktree write, implementation fix, acceptance edit, engine/Docker operation, dependency change, merge into main, or push was performed.

## R01–R06 verification

The builder-updated copied regressions are included in the fresh full-suite run. I additionally wrote independent round-2 variants in `round2/review.test.mjs`: **each has a RECOMPUTED positive control before mutation, keeps the trusted context unchanged, requires the finding-specific refusal code, and requires that aggregate P3 met is not true.** This avoids accepting an incidental failure caused by a stale WAL decode or missing setup.

| Finding | Fresh mutation and result | Status |
| --- | --- | --- |
| R01 | Begin with the complete positive P1 main/ladder/hot-set/straddle sample; remove main E2 reads. REFUSED includes READS-NOT-ESTIMABLE and reader-evidence refusal. | Fixed |
| R02 | Advance the final checkpoint 2→999, and regenerate retained synthetic WAL bytes so decoder equality is satisfied. REFUSED: NS-P3-ORDER-VIOLATIONS-MAX. | Fixed |
| R03 | Independently change all row epochs, or split affected/effect keys across consumer identities. Regenerate WAL bytes without changing trusted consumer/epoch pins. Each REFUSED: CONSUMER-IDENTITY-MISMATCH. | Fixed |
| R04 | Start with the valid sequential P4 control; shift all reads a year outside the unchanged measured interval. REFUSED includes READ-OUTSIDE-WINDOW. | Fixed |
| R05 | Start with the valid sequential P4 control; overlap only the first two requests while retaining both seconds of valid E8 completions. REFUSED specifically P4-SINGLE-CLIENT, rather than an incidental missing-reader-second failure. | Fixed |
| R06 | Remove all CR rows from an otherwise valid P3 fixture. REFUSED: CR-CROSSCHECK-MISSING. | Fixed |

`round2/evidence/observations.json` retains the seven actual mutant results (both R03 variants), positive-control statuses, payload hashes, and unchanged-context checks.

## N01 — HIGH: P5 floor accepts a self-selected subwindow with the rest of the live workload absent

**Locations at the reviewed commit:** `lab/bin/claim.mjs:2190`, `lab/bin/claim.mjs:2193`, `lab/bin/claim.mjs:1706`; integration call at `lab/bin/claim.mjs:2101`.

**Mechanism.** `nsP5Traffic` only requires the supplied during-sweep segment to lie *inside* the sweep. It passes that segment's own start/end into `nsReaderEvidence`. The latter computes the 99% denominator from that start/end. Nothing requires coverage of the complete sweep or an evaluator-pinned set of measurement windows. The baseline and schedule hashes are also matched to supplied segment fields, rather than receiving a frozen traffic-window plan, but this reproduction needs only the during-sweep truncation.

**Reproduction.** The new fixture pins a 100-second sweep `[2s,102s)` through an evaluator-owned durability callback that checks those exact times and the subject-list hash. The 100k subject list, activation/release identity, expected per-subject outputs, source/consumer data, bracket bounds, sample minima, independently sealed crash companion, and oracle callbacks are set before the mutation. The plan preimage is also hashed into both attempts' `inputsSha256`.

1. Control: provide all 100 seconds of live samples, with 64 loops each second, 6,400 correct read completions, and 100 writer events. RECOMPUTED; P5 traffic `met:true`.
2. Keep that same trusted context, source, full sweep and durable end. Retain only the first second's 64 read completions and one writer event. Change only the supplied traffic segment's end to 3 seconds and its declared reader rows to that retained second. Reseal the changed normalized event bundle with a new witnessed head, as in the review's other authenticated-input tests.
3. Result: **RECOMPUTED, no reasons; P3 aggregate met true; P5 wallMs 100000, subjects 100000, traffic met true**, with read p99 0.1 ms and writer p99 1 ms. The full sweep end remains 102 seconds. There is no live traffic evidence for seconds 3–102.
4. Contrast: keep the *same sparse events*, but set the traffic end back to the verified sweep end. `nsP5Traffic` returns `met:false, reason:"READER-LEVEL-MISMATCH"`. This isolates the denominator issue from hashes, timing arithmetic, correctness, activation or crash evidence.

**Why this is high severity.** The P5 requirement is a release sweep while live readers and the fixed writer trace continue. A bar computed on one healthy second cannot establish that traffic survived the other 99 seconds. The new floor rejects a wholly empty segment but still accepts missing required workload by shortening the interval over which the floor is evaluated. It would allow a stopped or unobserved live workload to look healthy when this arithmetic is integrated into admission.

This is a synthetic offline recomputation, **not an obtained acceptance PASS**. The interface remains disconnected from existing admission, as disclosed by the builder. The high finding concerns the evidence used to produce an unrefused result and a true P5 bar.

**Proposed fix.** Take expected traffic intervals and schedule membership from evaluator-owned frozen inputs. Derive the during-sweep completion denominator from the independently verified sweep interval; alternatively require a pinned set of windows whose exact union covers the required interval. Reject gaps, omitted rounds and shorter replacement windows. Reconcile raw reader completions and expected writer offers over that complete scope; matching two supplied schedule-hash strings is insufficient. Bind the no-sweep comparison interval to the frozen plan too. Add a required regression for a 100-second sweep with 99 seconds missing while the supplied segment claims one second. Do not change the latency thresholds.

Reproduce:

```sh
node --test lab/verify/CRNS/round2/review.test.mjs
node lab/verify/CRNS/round2/observe.mjs
```

Reviewer test result: **12 tests, 11 passed, one failed, no skipped/todo/cancelled; exit 1**. The only failing assertion is `CX-VCRNS-R2-N01`, which requires the sparse live-workload case to be refused. Its failure is retained as evidence, not marked TODO or relabelled success. The test takes about 1.8 seconds; no engine or long workload is run.

## Evidence-floor coverage and limits

Missing main offers/reads/source/brackets/consumer/fault-list/readers/window/noise/cross-check properties refuse. Missing required source/WAL decoders, minima, identity/role/clock-width context, command map or crash companion also refuse. Empty P5 live read, writer or reader-evidence arrays cannot satisfy its floor. Full-interval sparse P5 events refuse correctly. **Partial missing P5 workload with a shorter supplied window is the counterexample.**

P3's sample minima, storage kind, expected consumer/epoch and role list now come from the trusted context. R01–R06's previously absent content checks are present and exercised. I did not find another high-severity issue in this scoped pass. This does not independently qualify production decoders, oracle implementations, OS witnesses or future run-plan integration; the fixture uses deterministic evaluator-owned stand-ins and synthetic JSON source/WAL codecs.

## Existing evaluator verdicts and full-suite check

The two original evaluator suite files are unchanged from `613ad05f`, the parent of the first CRNS implementation. Removing only the added CRNS block and the new crypto import from an in-memory copy of current `claim.mjs` leaves the same original evaluator bytes. Existing admission/reference logic was not edited; fixture verdict preservation is checked by the original suites, including their reference-model executor-call/verdict comparison. This does not claim equivalence over every possible future input or environment.

Fresh full-suite command (after checking about 11 GiB host free space, through the shared heavy semaphore):

```sh
node lab/bin/heavy.mjs --label CX-VCRNS-round2-original -- node --test \
  lab/bin/test/claim.test.mjs lab/bin/test/claim-round2.test.mjs \
  lab/bin/test/claim-ns.test.mjs lab/bin/test/claim-ns-round2.test.mjs \
  lab/verify/CRNS/review.test.mjs lab/verify/CRNS-opus/forgeries.test.mjs
```

**Fresh result: exit 0, 213/213 passed, zero failed/cancelled/skipped/todo; duration 200.581 seconds.** This includes the unchanged 108 original evaluator-suite tests and all builder/copied-review round-2 tests. The terminal result is retained in `round2/evidence/original-suites-attempt1.tap` and `.exit`; source-bound counts are recorded in `round2/evidence/verification.json`. These are fresh reviewer executions, not the builder's 213-test receipt. The supported existing claim fixtures retain their verdicts.

## Artifact index and provenance

- `round2/evidence/reviewer-attempt1.tap`, `.exit`: seven repaired-finding variants and five floor controls/regression cases; 11 passing tests and N01 failing.
- `round2/evidence/observations.json`, `observe.exit`, `observe.stderr`: freshly recomputed old findings and complete compact N01/control results, payload/head hashes, exact evaluator and tool hashes. The 100k raw bundles stay in process memory; no bulky evidence is added to git.
- `round2/evidence/original-suites-attempt1.tap`, `.exit`: fresh full 213-test command, including both original evaluator suites and copied reviewer assertions.
- `round2/evidence/verification.json`: independent metadata checks over actual terminal outputs, source/test/acceptance identities, failure names and raw observed results.
- `round2/{fixtures.mjs,review.test.mjs,observe.mjs,record-verification.mjs}`: reviewer-only tools. The expected context is created before mutation; fixture sealing does not repair observations or derive new trusted floors.
- `SHA256SUMS.round2`: checksum manifest for the new round-2 artifacts and this report. The original `SHA256SUMS` remains a historical manifest for commit `93d2af9c`; the builder-upgraded copied fixture/test files have changed since that old commit. I did not overwrite old evidence or claim that manifest describes today's fixtures.

All new evidence remains below the 1 MB individual / 5 MB directory limits. Raw failing Node TAP is retained byte-for-byte, including whitespace-only diagnostic indentation; authored source and Markdown have a separate whitespace check.

## Verdict/receipt audit (rule 9a)

1. **`round2/review.test.mjs` assertions/TAP:** content comes from current function output, exact required codes, positive controls and the verified 100-second versus supplied one-second contrast. Freshness is a new Node execution with retained terminal exit/counts. Binding is the exact reviewed evaluator and fixture bytes, unchanged expected context, input digest, and newly sealed payload/head. Passing old findings is not an NS PASS; the new required-behavior assertion remains failing.
2. **`round2/observe.mjs` records:** calls the evaluator anew, retains actual complete compact results, context equality, plan/subject preimage hash, payload/head digests, source/tool hashes and observedAt. It never copies the earlier review or builder status into its result. Source, attempt, slot and inputs are those of the explicitly synthetic fixture.
3. **`round2/record-verification.mjs`:** validates observed output content, exact exit/count/failing-test names, evaluatorIntegrity, byte-equal target source, original suite/contract bytes, and metadata hashes. Freshness checks the artifacts' times against this run's first log and the current tool versions. Binding includes the reviewed commit, committed review base and current source/test/tool hashes. Its verdict records this review's FIX-FIRST; it creates no acceptance receipt.
4. **This report:** fixes R01–R06 only on the above fresh, code-specific evidence and bases FIX-FIRST on N01. The checksummed report/evidence are bound to the reviewed commit; historical TAP remains historical.

## Handoff and unverified work

No code under review was fixed. No acceptance cell, verifier registry or existing claim was edited. **Reviewer changes relative to the target touch only `lab/verify/CRNS/`; no pinned implementation/contract file hash changed.** Target evaluator SHA256 remains the value above; no reviewer repin is required. The builder's round-2 evaluator change still needs its own contract-owner pin/integration work.

Next: bind P5's evidence denominator and schedule coverage to the full trusted scope, then rerun N01, repaired regressions and the complete existing suites on committed source. Production collector, source/WAL decoder, oracle and run-plan qualification; engine/VM durability; real 100k-subject/live-reader acceptance; and `pnpm check` were not performed in this offline evaluator review. No human clarification is needed to reproduce the finding.
