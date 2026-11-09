# CX-VCRNS round 3: EXP-CRNS

**Verdict: ACCEPT for this scoped offline re-review.** The round-2 HIGH N01 is fixed. The original one-second substitution, interior reader gaps, missing planned writer events, candidate sampling declarations, and coordinated candidate window changes are refused in the checks below. No new high-severity finding was reproduced in this scope. This is not an NS acceptance PASS or a qualification of production evidence adapters.

North star: correct P5 live-traffic measurement throughout a release sweep; correctness remains the floor. Goals and targets come from `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`. Reviewed design: R44 section 4 and the proposed round-3 amendments. Scope: N01 and the requested window/gap/sampling variations, plus unchanged original evaluator behavior. I did not repeat a broad review of all other findings.

Target: `exp/CRNS-recompute` at **`cb1178d9d9ed1e45aedf25f3a546fa4a678d53d8`**. Evaluator SHA256: **`e689373eff850daf511b95423c9b88f545979595b4445abcad7d6a52de178c46`**. I read the round-3 report/finding-to-fix table, schema amendments, exact code changes, and retained test evidence.

Review base: merge commit `b8b0eb88cd381da4342801e94f1715c4ac796033` brings the exact target into the isolated `verify/CRNS` branch for committed-source integrity checks. Only the two copied round-2 reviewer fixture/test add/add conflicts required resolution, and the target versions were selected byte-for-byte. Earlier review commits and evidence remain in history. No implementation fix, builder/main-worktree write, acceptance edit, package/dependency change, engine/Docker operation, merge into main or push was performed.

## N01 and requested variations

All references below are at the reviewed target. The complete synthetic positive control has 100k expected subjects, a 100-second independently fixed sweep `[2s,102s)`, 64 correct loop completions in each second, 6,400 read completions, and its independently authored writer schedule. Activation/release, source/consumer bytes, sample minima, calibration and crash-companion inputs are complete before mutations. Tests never repair those expected inputs from the mutated observations.

| Probe | Fresh outcome | Relevant check |
| --- | --- | --- |
| Complete control | RECOMPUTED; P5 wallMs 100000 and traffic met true. | Full valid setup before refusal variants. |
| Original N01: keep only the first second and shorten the traffic segment | REFUSED: P5-LIVE-TRAFFIC-BAR; nested P5-TRAFFIC-COVERAGE-SHORT. The full sweep remains 100 seconds. | Exact sweep/traffic start and end equality at `lab/bin/claim.mjs:2256`. |
| First and last seconds present, nothing in between | Traffic met false: READER-LEVEL-MISMATCH. Accurate E8 rows for seconds 0 and 99 do not cover the other 98 seconds. | Every one-second period, not just first/last endpoints, at `lab/bin/claim.mjs:2261`. |
| Only interior second 50 missing | Traffic met false: READER-LEVEL-MISMATCH. 99/100 seconds is insufficient for this full-sweep check. | Reader share must equal 1, not merely 0.99. |
| Fully empty live reads/E8 | Traffic met false: READER-LEVEL-MISMATCH. | Nonempty, actual per-loop completion evidence. |
| One planned writer offer removed | Traffic met false: P5-WRITER-COVERAGE-SHORT. | Exact independently frozen relative-offset list at `lab/bin/claim.mjs:2265`. |
| Candidate declares a 100-second sampling period, 0.01 Hz rate, and two expected samples | First/last-only traffic still fails READER-LEVEL-MISMATCH. Candidate fields do not replace the evaluator sampling input. | Fixed supported period at `lab/bin/claim.mjs:2257` and actual E2-derived seconds. |
| Candidate supplies a calibration-like object in the traffic bundle | First/last-only traffic still fails READER-LEVEL-MISMATCH. The expected calibration argument stays byte-identical. | Candidate data cannot select the trusted argument. |
| Missing/non-one-second rate supplied in evaluator context | Traffic met false: P5-SAMPLING-UNBOUND for absent, zero, 0.5-second, 100-second and numeric-instead-of-string values. | Supported representation is exactly unsigned string `1000000000`. |
| Coordinated candidate start change: sweep and traffic both become the final second | REFUSED: P5-DURABILITY-UNBOUND. The unchanged independent callback rejects the substituted sweep start. | Mandatory verified-sweep authority at `lab/bin/claim.mjs:2150`. |
| Coordinated candidate end change: shorten sweep, traffic and supplied durable bracket together | REFUSED: P5-DURABILITY-UNBOUND. Equality among supplied fields cannot replace the independent expected end. | Same mandatory authority check. |
| Remove the independent sweep-verification callback | REFUSED: P5-DURABILITY-UNBOUND. | Missing authority does not produce a judged sweep. |
| Add candidate output containing different timing/rate fields | RECOMPUTED still measures the verified 100-second interval; no supplied override is used. | Candidate timing fields do not change canonical evaluator fields/context. |
| Valid sparse Poisson writer plan: only offsets 0 and 99 seconds | Passes with both scheduled offers and complete readers; removing one offer specifically fails writer coverage. | No invented one-write-per-second minimum. |

The source change closes the previous denominator gap: the full interval must be used, and missing interior periods cannot be hidden by retaining endpoints or declaring a slower sampling rate. R01–R06 and previous reviewer tests are also part of the fresh complete regression command.

Reproduce the independent scoped checks:

```sh
node --test lab/verify/CRNS/round3/review.test.mjs
node lab/verify/CRNS/round3/observe.mjs
```

Fresh reviewer result: **15/15 passed, zero failed/cancelled/skipped/todo; exit 0**, approximately 4.04 seconds. The original N01 also runs through `recomputeNS` after a valid positive control and requires its exact P5 refusal, so a helper failure or unrelated prerequisite is not used to close it.

## Bounds and trust boundary

The pure `nsP5Traffic` helper checks arithmetic and interval equality; it does not establish who produced its sweep argument. In the complete evaluator path, `verifySweepDurability` is mandatory and the test callback independently fixes the actual start/end and subject-list identity. Both coordinated bound forgeries are rejected against that unchanged authority. I did not substitute a candidate-written `true` callback for evaluator code and call the result trusted.

This acceptance depends on the interface's stated trust boundary: production normalization must take sweep start from trusted driver evidence and durable end/output visibility from independent observer evidence; the evaluator-owned callback must validate them against those records. Production source/WAL/fault decoders, callback implementation, authority-pinned calibration and collector provenance remain integration work as explicitly disclosed by the builder. The fixture uses synthetic JSON codecs and deterministic evaluator-owned oracle/durability stand-ins. This review confirms the guarded pure interface on those inputs; it does not qualify that future integration or enable an admission route.

## Original evaluator suites and existing verdicts

The two original evaluator suite files are byte-identical to `613ad05f`, before CRNS. Removing only the added CRNS section and new crypto import from an in-memory copy of current `claim.mjs` yields the exact original evaluator bytes. Existing admission/reference code is unchanged. The original tests include the reference-model executor-call/verdict comparison and document/qualification counterexamples, so their existing fixture verdicts are checked directly; I do not claim equivalence for every possible future input/environment.

Fresh complete command, submitted after checking about 18 GiB host free space and run through the shared heavy semaphore:

```sh
node lab/bin/heavy.mjs --label CX-VCRNS-round3-original -- node --test \
  lab/bin/test/claim.test.mjs lab/bin/test/claim-round2.test.mjs \
  lab/bin/test/claim-ns.test.mjs lab/bin/test/claim-ns-round2.test.mjs \
  lab/bin/test/claim-ns-round3.test.mjs lab/verify/CRNS/review.test.mjs \
  lab/verify/CRNS/round2/review.test.mjs \
  lab/verify/CRNS-opus/forgeries.test.mjs \
  lab/verify/CRNS-opus/forgeries-round2.test.mjs
```

**Fresh terminal result: exit 0; 257/257 passed, zero failed/cancelled/skipped/todo; test duration 230.393 seconds**, excluding the retained shared-heavy queue wait. Both untouched original evaluator suites (108 tests) and every current builder/copied-review test passed. The existing supported claim fixtures retain their verdicts.

Terminal output is retained in `round3/evidence/original-suites-attempt1.tap` and `.exit`, with source-bound counts in `round3/evidence/verification.json`. These are new reviewer outputs, not the builder's prior 257-test receipt.

## Evidence and audit

- `round3/evidence/reviewer-attempt1.tap`, `.exit`: all 15 fresh scoped checks, including positive controls and exact refusal reasons.
- `round3/evidence/observations.json`, `observe.exit`, `observe.stderr`: actual seven traffic-helper outcomes and three complete-evaluator outcomes, unchanged-context checks, raw-input/head hashes, source/tool hashes and fresh observedAt. No 100k-subject raw bundle is committed.
- `round3/evidence/original-suites-attempt1.tap`, `.exit`: complete fresh regression output, including shared-heavy queue wait and terminal result.
- `round3/evidence/verification.json`: independently checks terminal counts, actual refusals, fresh file times and source/test/contract identity.
- `round3/{probes.mjs,review.test.mjs,observe.mjs,record-verification.mjs}`: reviewer-only tools. `SHA256SUMS.round3` covers this report and the new artifacts. Earlier manifests apply to their named historical commits; they are not silently repointed to upgraded fixtures.

All new evidence is below the 1 MB individual / 5 MB directory limits. Raw TAP bytes are preserved. No historical attempt was overwritten or adopted as fresh.

Observation-to-verdict sites (rule 9a):

1. **Reviewer assertions/TAP:** content compares actual output with complete positive controls, exact refusal codes, immutable expected calibration/context, per-period samples and sparse Poisson membership. Freshness is a new Node execution. Binding is the exact reviewed evaluator, current fixture/test bytes, sealed synthetic attempt/source/slot/input identity and observed input/head digests. Test success is not NS PASS.
2. **`round3/observe.mjs`:** reruns the helper/evaluator, retains actual compact results, verifies context equality, and records target/source/tool hashes plus payload/head identities. Newly constructed fixtures and observedAt establish this attempt; no builder or previous reviewer result is read as a verdict.
3. **`round3/record-verification.mjs`:** checks actual TAP/exit content, all requested refusal outcomes, evaluatorIntegrity, exact target bytes, unchanged original code/suites/acceptance files and artifact times/hashes before emitting the scoped ACCEPT record. It certifies these offline observations, not production adapters or an NS obligation.
4. **This report:** N01 is closed by the fresh original regression and direct denominator/gap/rate/bound probes. The verdict is tied to the reviewed commit and checksummed artifacts; previous FIX-FIRST reports remain historical evidence.

## Handoff

No remaining high-severity finding in this requested scope. No implementation fix, acceptance cell, registry or existing claim was edited. **Reviewer-only changes relative to the target are under `lab/verify/CRNS/`; no pinned implementation or acceptance file changed**, so the reviewer has no old/new pin inventory to repin. The target evaluator remains the hash above; contract-owner amendments/pins and production evidence/calibration authority admission remain separate work.

No engine/VM run, real live-reader or 100k-subject workload, production decoder/oracle/collector qualification, `pnpm check`, package publication, main merge or push was performed. No human clarification is required for the scoped verdict.
