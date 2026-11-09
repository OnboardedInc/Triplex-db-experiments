# CX-VM01R round 2 — M01 rebase

**Verdict: ACCEPT for the requested F1/F2 correction scope.** Both round-one findings are resolved. No new high-severity finding. This accepts the offline grading/build handoff; it does not certify G03 integration, live calibration or NS acceptance.

North star: P1-P5 measurement validity, particularly correct timing admission for the first NS PASS. Goals/targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`.

Reviewed: `99d9641d4d6f385ab3b3fade7e9e78680a8850b4`, containing fix `07078eb9d5a8bed1fe82e77325f7ed12471e7679`. Comparison implementation: round-one `f45d479a313f2679db892ea8e773f0c6c0a27d76`. The verifier branch retains its round-one source and report; the new implementation was executed from a separate local checkout pinned to 99d9641d. No code under review was fixed or edited.

## F1 — resolved: separate paired and single-arm grading

Locations: `lab/bench/lib/paired.ts:397`, `lab/bench/lib/single-analysis.ts:13`, `lab/bench/lib/pair-analysis.ts:163`, `lab/bench/duet.ts:324` at the reviewed commit.

I replayed the **actual retained round-one counterexample**, rather than reconstructing it from the new tests: twelve identical-histogram A/A rounds, one `vm.psi.memFullShare=0.05` hard failure, valid accounting/calibration/placement. Results:

| Check | Independent observation |
| --- | --- |
| Old paired analysis vs new analysis without grading version | Full result objects equal |
| New version-2 paired analysis | GREEN; hard history explicitly records R01 / `vm-psi-mem-full` |
| New single-arm analysis of the same attempted rounds | RED; `timingEligible:false`; same retained hard history |
| Otherwise clean single-arm input | GREEN; `timingEligible:true` as a necessary noise predicate |
| Each of the 14 registered hard rules tripped separately | Timing refused; the corresponding rule remains in hard history |
| Missing active hard signal | Timing refused |
| One soft IO exclusion | AMBER; timing refused; excluded round not bridged (9 adjacent ratios remain) |
| Three-median preflight | Two adjacent ratios; UNGRADED |

The new helper derives history across all supplied attempted rounds before grading and calculates same-arm, equal-burst-phase adjacent `ln(p50_k/p50_{k-1})` values. It refuses mismatched identities and does not bridge excluded/unidentified rounds. `windowGrade` requires explicit sequential statistic provenance and hard-rule history for the `single-q100k` contract; the default paired contract retains its existing semantics. Fresh builder-suite cases also check mixed arms/phases, duplicate IDs, wrong noise identity, missing history and rejection of a duet statistic for single-arm admission.

I independently compared **216 old/new paired grade inputs**, spanning null/zero/low/borderline/high s_d, A/A/all/preflight statistic sources, exclusion fractions, amber signals and partition status. Every grade, reason, limit and s_d output matched. The version-2 paired result differs from the saved round-one result only by the intended grading-contract/history fields. Noise rules, default slot config, package source and lockfile are unchanged between f45d479a and 99d9641d.

Version-2 evidence recomputes MATCH. Changing its claimed hard history to an empty list produces MISMATCH. Both original saved receipts, checked against their round-one SHA256 identities, still recompute MATCH with the new implementation. Repeating each round-one recorded calibration-sample edit and rehashing the modified evidence produces MISMATCH for both. Those original offline receipts remain INVALID for protocol grading; MATCH does not establish a live engine observation or semantic PASS.

Evidence: `lab/verify/M01/round2/challenge.mjs`, `challenge-result.json`, `challenge.log`. The result binds the exact round-one input artifact's SHA256. All these checks executed afresh under the canonical heavy wrapper.

## F2 — resolved: clean-checkout prebuild works

Location: `lab/experiments/EXP-M01-paired-measurement/RUNBOOK-rebase.md:26` at the reviewed commit.

I created a separate local checkout at **99d9641d**, with an empty Git status, no root node_modules and none of core/testkit/XTDB/qualification/W0's dist directories. After a fresh frozen **offline** pnpm 10.11.0 install using the owned store, I extracted and executed the exact prebuild line from that checkout's runbook:

```sh
node lab/bin/heavy.mjs --label M01-window-build -- pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store --filter @triplex-build/triplex --filter @triplex-build/triplex-testkit --filter @triplex-build/triplex-xtdb --filter @triplex-build/triplex-qualification --filter @triplex-build/w0 build
```

Exit **0**. All five public `dist/index.js` outputs exist afterward. The checkout remains at 99d9641d with empty Git status; the lockfile SHA256 is unchanged. No sibling checkout's dist or dependency directory was copied. `TX2_LOCKS_DIR` explicitly names the canonical lab locks for the clone's heavy wrappers. The exact documented build label is retained in the log even though this reviewer initiated it. Host free space was 24,415,629,312 bytes before admission, above the 5-GiB floor.

Evidence: `lab/verify/M01/round2/clean-check.mjs`, `clean-result.json`, `clean-install.log`, `clean-build.log`, per-command result JSON and `clone.log`. The result binds target revision, initial absence/cleanliness checks, exact command, actual child exits and log SHA256 values.

## Q100l runbook and remaining G03 boundary

The runbook now makes the distinction explicit:

- Lines 5–7 label the two-arm procedure **reduced-reader paired calibration only**. It defaults to zero closed-loop readers plus probes and stays DIAGNOSTIC for the 256-reader timing bars. It does not claim two full NS arms fit this VM.
- Lines 57–65 require **one complete arm**, fixed writer trace and 256 readers for the future `measure_single`, with sequential same-arm calibration at equal burst phase. They account for the approximately six CPUs/7 GiB per full arm and reject the engine-only memory sum as capacity proof.
- Single-arm GREEN requires unbroken hard-rule history across all attempts. Paired GREEN cannot admit absolute timing. Three sequential preflight medians remain insufficient under the existing three-ratio minimum; the baseline/control arrangement is explicitly left for G03/orchestrator resolution rather than silently relaxing the requirement.
- Preflight deferral/lease release, 30-minute waits, HOST-NOT-QUIET, count bars in any window, unjudged noisy timing and VA12 treatment are documented as future runner/admission responsibilities. The helper does not purport to implement them.

The unchanged `s_d <=0.10` statement is still an unmeasured paired XTDB prediction, not a new single-arm threshold or verified result. No live dispersion result follows from these offline tests.

## Fresh checks, scope and evidence

The requested focused suite passed **52/52, zero failures/skips** from the pinned reviewed checkout. Command:

```sh
TX2_LOCKS_DIR=/Users/sam/projects/triplex-db-2/lab/locks NODE_OPTIONS=--experimental-strip-types node lab/bin/heavy.mjs --label CX-VM01R-R2-tests -- node --test lab/bench/test/bench.test.ts lab/bench/test/paired.test.ts lab/bench/test/noise.test.ts lab/bench/test/single.test.ts lab/bin/test/lab.test.mjs
```

`lab/verify/M01/round2/tests.tap` retains the actual TAP. The independent challenge ran under `CX-VM01R-R2-challenge`; `clean-check.mjs` invokes canonical wrappers for install and the exact runbook build. All commands completed with exit zero. Shared-permit waits are preserved. No failed reviewer attempt was replaced in this round.

`lab/verify/M01/round2/INDEX.md` maps artifacts. `source-bindings.json` records reviewed/baseline hashes and the unchanged-source checks. `SHA256SUMS` binds the durable copies under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VM01R/round2/`. All individual files and the evidence directory are below the bulky-evidence limits. The clean checkout remains in the verifier's ignored `lab/verify/M01/runtime/round2-clean/` for inspection.

## PASS / verdict / receipt audit (rule 9a)

| Reviewer boundary | Content | Freshness | Binding and limitation |
| --- | --- | --- | --- |
| `challenge.mjs` assertions and result | Full paired analysis equality, 216 grade comparisons, original F1 replay, 14 hard-rule checks, preflight/soft/missing-signal checks, version-2 and legacy recomputations/edits | Fresh process and in-memory variations in this round | Exact Git revisions, prior artifact/receipt hashes, reviewed module bytes; synthetic inputs claim no live slot |
| `clean-check.mjs` build result | Actual initial cleanliness/dist absence, extracted runbook command, child exits, required outputs and final cleanliness/unchanged lockfile | Newly created checkout and fresh install/build, no reused dist | Checkout HEAD 99d9641d, command/log hashes and canonical locks; build success is not semantic acceptance |
| 52-test TAP | Actual fresh node:test outcomes and exit zero | This round's invocation | Tests from 99d9641d, isolated temporary test locks/engine directories; offline only |
| Source/evidence manifests | Hashes of inspected source and retained artifact bytes | Read/copied after these executions | Named revisions/paths and durable root; no claim of live engine ownership or independent capture provenance |
| This ACCEPT verdict | F1 and F2 have concrete successful reruns, with paired compatibility and Q100l handoff checked | This review round | Scoped to fixes in 07078eb9/99d9641d; not an NS PASS, promotion or G03 release verdict |

The implementation's pure grading helper deliberately delegates trusted capture, complete attempted-round enumeration, ordered timestamps, actual source/build/slot/lifetime bindings, admission, count correctness and VA12 accounting to G03. This review did not establish those production properties by exercising synthetic noise summaries.

No `lab/acceptance/` file was edited; that tree is unchanged between f45d479a and 99d9641d. This review changes only its own report/tools/evidence. **No pinned source path moved, so there are no old/new pinned hashes to report.** No dependency or lockfile change, target-code fix, engine reservation, Docker/Colima command, resident lifecycle operation, live benchmark, main merge or push occurred.

Open work remains the explicitly documented G03 preflight/control arrangement and trusted runner/admission integration, followed by actual resource-admitted single-arm calibration and NS acceptance. I did not repeat the full round-one PAIR-off driver matrix, full `pnpm check`, live engine gates, independent oracle acceptance or the builder's optional targeted typecheck; none is claimed by this scoped ACCEPT.
