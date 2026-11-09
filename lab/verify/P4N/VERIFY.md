# EXP-P4N round 1 — CX-VP4N independent review

**Verdict: FIX-FIRST.** The product changes passed the offline checks below, and the retained throughput numbers reproduce. The P2 guard can pass an actual guard violation, its statistical evidence does not establish Q104a compliance, and the GREEN label is weaker than the brief's segment rule. Fix the harness and its claims before treating this round as fully verified. No product correctness defect was reproduced. This verdict does not reject the measured throughput shortfall or require building (c').

Reviewed branch/tree: `exp/P4N-current-path` at `04b896fddfb361a0fe9ead75b9a6198ea655e7f7`, reviewed on `verify/P4N`. Kept arm: `sbe`, identified by the builder as source `df83c34f`. All reviewer additions are under `lab/verify/P4N/`; code under review and `lab/acceptance/` were not edited. No Docker or engine slot was used.

## Findings

### F1 — S2: the P2 guard succeeds without enforcing the p50 bar or measurement resolution

Location: `lab/verify/QH1/p2guard.test.ts:120` (also lines 97–115).

The only assertion is `expect(result.regression).toBe(false)`, where `regression` is exclusively a p99 condition. A +1 ms commit p50 regression therefore passes the stated +0.5 ms guard when p99 is unchanged. Neither `resolvable` nor the declared minimum round/sample counts is asserted.

Reproduction: run `p2guard-inadequacy.test.ts` with the reviewer config. It imports the **unmodified** guard, supplies deterministic matched latencies (off/twin p50 1 ms, on p50 2 ms, all p99 100 ms), and observes its success. The second assertion confirms p50 delta +1 ms and p99 ratio 1. This is explicitly synthetic test evidence, not a performance result. `final-tools/command.log` retains both passing tests. Independently, the fresh real `p2-real` attempt passes while reporting `aaBand=0.145553`, `resolvable:false`.

Proposed fix: enforce the p50 criterion, reject or mark inconclusive an unresolvable window, and validate the minimum sample/round requirements before issuing a guard verdict. Add these negative tests to the guard's own suite.

### F2 — S2: the P2 result is not a reproducible Q104a/PAIR-0 measurement

Location: `lab/verify/QH1/p2guard.test.ts:68` (bootstrap), `:90` (band), `:118` (retained output).

The script pools commit triples across all rounds, resamples individual triples, and sets its band to the largest absolute round-level twin ratio departure or pooled bootstrap endpoint departure. It does not obtain the band/window grade from M01 PAIR-0 or compute its per-metric log-ratio standard deviation. The result discards the raw matched latency triples, so a verifier cannot recompute the historical bootstrap interval from the retained evidence. Round counts and aggregate quantiles do not recover those inputs.

Q104a's actual text requires the PAIR-0 grading over at least three A/A rounds, giving s_d per metric, and applies Q100k's window grade. This checkout's frozen acceptance files predate Q104a; the current main-checkout ruling was read without modification and its exact excerpt, file hash and main HEAD are retained in `q104a-authority.json`.

Reproduction: `audit.mjs` reproduces the published point ratio `6.995541 / 6.964709 = 1.0044268899`, the custom band `0.0776338547`, `regression:false` and `resolvable:true`. The five A/A round ratios give log s_d `0.0542239131`; that is a different statistic from the custom max-deviation band. There are no raw commit samples in `p2/p2guard.json`, so **[0.986753, 1.033594] was inspected, not independently recomputed**. The displayed lower-bound comparison is arithmetically correct, but calling the whole measurement Q104a-compliant is unsupported.

Proposed fix: retain per-round raw matched triples and source/attempt bindings, use the accepted predeclared PAIR-0/window method, and rerun under a new attempt ID. Keep the historical result as a diagnostic. The existing interval includes 1 even with a zero band; this finding does not establish a historical regression.

### F3 — S2: GREEN is pooled across arms and segments against a retrospective minimum

Location: `lab/experiments/EXP-P4N/g4/summary4.mjs:35`, `:112–129`; `lab/experiments/EXP-P4N/BRIEF.md` section 4.3 items 1–3.

The brief requires an established quiet reference and grades each segment within +10% of it. The implementation instead selects the smallest probe anywhere in the directory and grades the median of all before/after probes across every arm in a round. One arm's favorable probe can thus mask another arm's slow segments. The throughput calculation then uses all batches, independently of these labels.

Reproduction: `audit/audit.json` and the exactly regenerated summaries show `fin-c1` round 0 labeled GREEN although **13 of 20 segments** have at least one probe over the +10% threshold; the maximum is 1.2853x the directory minimum. Every `sb-c1` round is GREEN despite 5–10 failing segments out of 20. All `sb-c4` rounds are GREEN, including a probe at 1.5852x. These are real retained inputs, not fabricated examples.

The label does reproduce the report's looser directory-relative round convention; it does **not** establish the brief's GREEN eligibility. The report's explicit diagnostic status and admission of host load prevent these labels from becoming a throughput PASS.

Proposed fix: rename this diagnostic label to describe the median/minimum convention, or implement and retain the brief's independent quiet baseline and per-arm, per-segment eligibility. Keep loaded diagnostic totals separately and do not use them as GREEN-only estimates.

## Verified observations

| Check                       | Reviewer result                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Builder manifest            | All **742** listed files hash correctly.                                                                                                                                                                                                                                                                                                                                          |
| Retained replay             | Fresh comparison of all **100,000** candidate/reference lines: **zero mismatches**. This is historical round-3 row-reference equality, not a freshly generated large-store oracle.                                                                                                                                                                                                |
| Fresh Python O-REPLAY       | **100,000 pulls, zero mismatches**, 30-root fixture, 90 unique root/cut pairs; oracle source and case/output hashes retained in `units/oreplay.json`.                                                                                                                                                                                                                             |
| Fresh persisted-value codec | **100,000** comparisons, including **12,497** matching typed rejections. REAL/extreme-double and valid-from property suites pass.                                                                                                                                                                                                                                                 |
| Sum type pairs              | Fresh `validfrom.test.ts` passes >20,000 finite edge/random pairs and asserts integer+integer, integer+REAL, REAL+integer, REAL+REAL were all observed. This is sampled coverage, not an exhaustive floating-point proof.                                                                                                                                                         |
| Dictionary threshold        | New test compares complete Triples at max id **256** and **257**, including cache repeats, used-entry selection, long metadata and lone-surrogate names. Answers match.                                                                                                                                                                                                           |
| Shared reply port           | New tests pass 256 concurrent actual pulls with differing expected answers; 300 controlled out-of-order replies/errors; an abandoned consumer; retired timeout followed by a late reply; and worker failure with all 31 pending requests rejected. No cross-request result was observed. Consumer cancellation here means abandoning the wait, not interrupting SQLite execution. |
| Measured/committed worker   | Current source's embedded worker equals both retained `sbe` and `sbf` workers exactly. Retained `sbe`/`sbf` runtime JS for `sqlite-worker`, `h1`, and `log` is byte-identical.                                                                                                                                                                                                    |
| Statistical mechanism       | Analytical two-round synthetic data gives the expected cluster-bootstrap endpoints and exact A/A and half-CPU paired ratios. Changing only the quiet probe changes grades, never CPU estimates or intervals. The probe is a grade, not a divisor.                                                                                                                                 |
| Retained summaries          | Seven complete summaries regenerate exactly, including twins and seeded two-level intervals. Absolute estimates use total pulls / total process CPU; paired estimates bootstrap matched rounds then each arm's batches. These statistics match the script's comments; the brief's requested median-over-rounds absolute statistic was not implemented.                            |

Final-series absolute numbers (all batches, diagnostic):

| Arm |   c | Pulls/CPU-second | 95% interval         | Twin estimate [interval]      |
| --- | --: | ---------------: | -------------------- | ----------------------------- |
| sbe |   1 |         725.5099 | [696.4120, 751.2687] | 734.4069 [690.7896, 767.6401] |
| sbe |   4 |         735.8703 | [685.4105, 775.0183] | 761.0522 [743.2586, 779.9783] |

These support the reported approximately 726–736 diagnostic result, below 1,100. They do not establish a quiet-host maximum. Port reuse's failure of the brief's every-round <0.97 retention rule is correctly disclosed; keeping it needs an explicit orchestrator deviation rather than an assertion that the rule passed.

Fresh real P2 rerun: point p99 ratio **1.02998**, script interval **[0.92064, 1.16751]**, band **0.14555**, p50 delta **-0.04379 ms**, `regression:false`, **`resolvable:false`**. It is a new loaded storage-worker diagnostic, not a replacement for round 1 or an application P2 acceptance.

## Executed checks and evidence

Evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP4N/`. `SHA256SUMS` indexes the durable files; `evidence-index.json` names the attempts. Every check below ran through `node lab/bin/heavy.mjs --label CX-VP4N-… -- node lab/verify/P4N/run.mjs <attempt> <command>`. Receipts bind the reviewed HEAD, tracked source hashes, command, timing, heavy holder and log hash; all completed checks report `sourceUnchanged:true`. Final reviewer-tool tests additionally bind their untracked tool bytes. Engine slot is null because all checks are offline.

- `units`: QH1 config, nine unit files: **23 passed** (h1decode, validfrom, codec, domain, public, real, workercache, reach-cut, oreplay).
- `route`: `route.test.ts` as a separate command: **2 passed**.
- `mutants`: all four actual mutants exit 1 with the required semantic mismatch and no timing output.
- `contract-verify`: `python3 -I lab/acceptance/build_contract.py --verify` as its **own step**, byte-identical, exit 0.
- `evaluator`: unchanged `node --test lab/bin/test/claim.test.mjs lab/bin/test/claim-round2.test.mjs`: **108/108 passed** on committed product tree `04b896fd`.
- `audit`: manifest, retained builds, replay, seven summaries, custom P2 arithmetic and pin verification, exit 0.
- `p2-real`: fresh five-round, 1,050 commits/arm/round guard run, test passes with the unresolvable result above.
- `final-tools`: final formatted reviewer suite: **8 passed in 3 files**, including the synthetic counterexample. Earlier attempts remain retained.
- Reviewer tools: targeted oxfmt and `oxlint --deny-warnings` clean after removing one unused reviewer-test variable.

No root `pnpm check`, package-wide build, service integration, VM acceptance, fresh large-store 100,000-pull replay, throughput rerun, live writer/read workload, ULID-shaped store, or (c') implementation was performed. The legacy 350-commit `writer.test.ts` is not in the builder's 25-test suite and was not used as P2 evidence. Dependencies were installed offline with the frozen lockfile and the required private pnpm store.

## Pins and contract

`git diff 365fe188 -- lab/acceptance` is empty. The four product source hash moves in `pin-changes.json` all match their old Git bytes and current bytes. None is referenced by this frozen contract; no contract pin was updated. Inherited QH1 round-4 changes are outside this round's base comparison.

| Path                                               | Old SHA-256 at 365fe188                                          | New SHA-256                                                      |
| -------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| packages/qlever/src/broker/BrokerStorageAdapter.ts | 69a23658e7eff91426fca9ab6464a231d909485296d48c25804208c7750f7b35 | 9141a7b514baf223113514d986f946f697aa36036645157324f61729914ac710 |
| packages/qlever/src/broker/h1.ts                   | 6cd2374846f6ae50be716c366875ba69289eb9dc7f2c42fdc6ba77b83e767353 | f53ec0c0d47bc40586989a63773f01d40149b9fc9e27fc8a06164a0ee43c7d2b |
| packages/qlever/src/broker/log.ts                  | d9dc9d924fc5d410906506f9616d3b59e456d343de473294adc2978f0f15a502 | 36d8fa642d1e169478db9a19b8a77a0ddd9db6f31226e145df2dea7c6050775a |
| packages/qlever/src/broker/sqlite-worker.ts        | 4a577f924f10bd8ceb34ef60a90bf38a6a64bb8bf299335c8dbbc9020174018f | b9b0e6b036695922b1205e69111ed99de8b0be1a26cf9649648aed9a902277c0 |

## Rule 9a: reviewer PASS/verdict/receipt audit

1. `adversarial.test.ts`: content assertions compare full Triples, exact embedded worker bytes and request-specific results/rejections; every test creates fresh owned state or a fresh controlled worker; imports bind current product source and named retained arms. Passing samples do not prove arbitrary schedules.
2. `summary.test.ts`: fresh synthetic raw files have analytically known expected CPU, cluster endpoints and twin ratios; it invokes the reviewed summary file. Only this controlled statistical behavior is accepted.
3. `p2guard-inadequacy.test.ts`: explicitly synthetic input and clock, freshly generated; imports the unchanged guard; checks that the known violating p50 result was accepted. Its PASS certifies a reproduced defect, never a P2 performance pass.
4. `audit.mjs`: hashes actual historical bytes against the committed manifest, checks retained tree/run hashes, all replay lines, exact regenerated summaries, P2 arithmetic and old/new source pins. Historical evidence is never relabeled fresh. P2 raw-sample/bootstrap verification is explicitly false.
5. `run.mjs`: records real exit/status, before/after source hashes, HEAD, command, time and log hash. It grants no semantic PASS; test assertions and inspected artifacts supply those. Offline heavy-token observations are recorded; no engine identity is claimed.
6. This report's FIX-FIRST verdict uses the reproduced counterexample and retained source locations above. Existing-suite PASS counts were read from fresh logs, mutants from semantic outcomes, contract byte identity from its separate step, and evaluator from the full 108-test terminal summary. The limitations and unresolved rulings are retained explicitly.

Open decisions: correct or rename GREEN grading; repair and rerun the Q104a P2 evidence; explicitly authorize or drop the port-reuse retention-rule deviation. No fix, merge, push, promotion or contract rewrite was performed.
