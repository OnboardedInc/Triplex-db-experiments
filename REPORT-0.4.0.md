# Contract 0.4.0 — CX-A01-040

North star: the P1/P2 correctness floor and P3 measurement contract, with a source-bound seed map and a sound no-regression rule. Goals and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`.

## Result and scope

Contract 0.4.0 compiles **exactly Q98a–i, Q101a and Q104a** from the original pending file, preserved at `lab/experiments/EXP-A01-acceptance-contract/evidence-0.4.0/pending-authority.md`. The corresponding machine consumers appear in obligations.json and load-contract.json, and the literal rulings appear in RULINGS.md and ACCEPTANCE.md. All other pending rows are byte-preserved, including Q78e, Q86g, Q89, Q90, Q92, Q94a, Q95, Q98j, Q99, Q100, Q102, Q103 and Q105. Q104a's reference to Q100k does not compile Q100k. Qualification pins remain deferred to 0.4.1; BUILD_SPEC and executing admission blockers remain unresolved.

All requested candidate and ACCEPT-review revisions are ancestors. The M01 and CHECKJS review branches contained source-copy reviews rather than the final candidate ancestry, so explicit follow-up merges include their final candidate commits too. No RT01, CRNS, HS01, P2B, DI01 or G03 branch was merged. No engine was started, stopped or rebuilt by this builder.

| Integration | Candidate | ACCEPT reviews | Integration commit |
| --- | --- | --- | --- |
| NSR, including P3M and FD01 | 709a18f1 | bd0555df, 9df9aaf9, c20526eb | 95c30ea9 |
| Datomic feed | dcc8322d | c98bbff8 | f3ed6211 |
| QNODELAY | 9b1a9a59 | 1f59d223 | 52f8c0d2 |
| M01 | 99d9641d | 3a354133 | c033c628 plus 3b34d5c3 |
| CHECKJS | f72cd5ad | d4b0caa9 | 65940efa plus this final candidate/contract commit |

The first temporary DF01/QNODELAY integration commits were rebuilt locally when generator validation exposed DF01's changed image identity. The final reachable DF01 merge updates the image pin and generated projections atomically. Neither abandoned temporary commit is part of this branch's final history.

## Integration resolutions

QNODELAY's native client keeps **keep-alive by default** and accepts the explicit transport option. The existing broker fresh-connection client remains. G1 retains Datomic route fixtures, cleanup and equivalence checks while using the QNODELAY input parser. M01's PAIR stays opt-in; G0 runs the union of NSR/P3 and paired/noise/single-arm regressions, and NS/PAIR builds include both host and W0. CHECKJS directives coexist with the accepted receipt-parser imports; no parser boundary was discarded to resolve a comment conflict.

The M01 duet now reads its complete NS driver report from the actual path through `readLatencyRun`, with lane and expected transport mode. Its internal partial-round barrier/histogram protocol remains M01's diagnostic protocol. The QNODELAY inventory was reconciled to the integrated source tree; historical reviewer fixtures receive explicit non-production exemptions, and the duet is a declared parser reader. The receipt audit still checks imported parser calls and source hashes. The FD01 crash helper is included in the CHECKJS project; its runtime messages retain binding-name checks.

## Source pins and per-hunk workload review

The baseline scan records 261 existing contract-referenced files at d4227396. It covers literal path-to-hash maps as well as path/hash records and generated source references. NSR/FD01 and M01 change no existing source pin. DF01 changes the Datomic image pin separately, as listed below.

Every hunk is recorded with header, decision and reasoning in `evidence-0.4.0/*-repin-review.json`, with exact Git diffs and diff hashes. **None changes the measured workload**: no W0 population, generated commands, writer schedule, query workload or numeric bar changes. QNODELAY adds receipt metadata; CHECKJS adds comments only. Changes to an implementation or receipt schema still require new source-bound execution; historical measurements are not relabeled.

| Pinned source | Old SHA256 | New SHA256 | Hunk review |
| --- | --- | --- | --- |
| packages/qlever/experiments/native-entry.ts | c82ce6cfabfcf61ab9f5d76791146d167741420a3be07b92559026f987634b0f | 0f78b5bfcf5d2198015bd6a0e9111a4c7d98fb6fd9022de468d047d90a8bca8d | 5 hunks: imports; report wrapper/stamp; wrapper close; checks wrapper/stamp; checks wrapper close. Each metadata only, no workload change. |
| lab/bin/test/claim-round2.test.mjs | 6aef70bd2448a6b37dc040d19d9ee219a4e4e5fdf78c8094e1bb66ec45104be9 | 4a5c65d1d26fd71996f8a0f6e8b765608d628abb74e69fbd7a4bf2348a22edc7 | 1 comment hunk; assertions unchanged. |
| lab/bin/test/claim.test.mjs | 62de70ed333c40f8662da5749179f985f9f8b961a6c10459a0dadfad5bceb476 | b8352b989fcf5857cb8f4a4a3d3766ed1f61f46ba6b0760f8568060f3b8f819f | 1 comment hunk; assertions unchanged. |
| qualification/capacity/configured-entities-v1/oracle.mjs | 5e4f92bf74fde4504c309d2888cc234013ceb2fbfc8bca7c06fff51cea054cd3 | 92c0378b8120aaa25fb7a16d8659aa1790141eba62aed8f7e7356213efe92e94 | 1 comment hunk; executable bytes after the new first line unchanged. |
| qualification/capacity/historical-assertion-metadata-v1/oracle.mjs | bc93f24c88365add1d215747cd95705a3c2a2b4fd1c6cdd7e347a014fb23b290 | bbd656760719b67a3435419121b0b7df909a99ea9c1aba22d85ea1363cb6b08f | 1 comment hunk; no workload change. |
| qualification/capacity/historical-assertion-metadata-v2/oracle.mjs | f661e8138d5194bbcbbe56eec9ec35f8766bc9938540192e7b0d92d04685721b | 5ce6612714b2b7742c46e0599617d472b4bf18a352806e5d44a44577878c9649 | 1 comment hunk; no workload change. |
| lab/oracles/replay/selfcheck_fixtures/freeze-ham-reference.mjs | c533122597c940d69c8a101a1a175ba5e9d6ab62f1efdb2d5526c9f65a86a206 | 752aaa5c706c514ec265ed6865458fd6bd78795486764e200c088c3f52f53f28 | 1 final-candidate comment hunk; O-REPLAY/O-OBS maps and both manifests move with it. |

Datomic image: `sha256:34fb9db10a278ff5614e7ac59788a2456329c75d098871ce1831465e243f2dcf` → `sha256:aecbac4c6712d70d17dfba7b50cabaaf727aef6b3e72ec1fe2000b5523b36bcf`. This is DF01's accepted gateway implementation identity, not an engine benchmark or workload change. The original 0.3.13 image review remains immutable; the current image follows a separately recorded chain.

## Gates and retained failures

Durable command output root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-A01-040/`. Small contract tests, authority, diffs and byte-identical verification are indexed in `lab/experiments/EXP-A01-acceptance-contract/evidence-0.4.0/`.

- Contract tests: 13/13 at the current source. They check original literal authority, pending-row preservation, unchanged bars/workload, generated consumers, every pin/hunk, image chain, all exact accepted ancestors, original evaluator assertions and continued qualification holds.
- Contract mutations: 34/34 rejected, including one per new ruling, every source re-pin, the Datomic image, missing consumers and policy changes. The harness checks that canonical generated outputs remain byte-identical afterward.
- Required evaluator 108/108, lab pack gate, all three offline G0 gates and final post-integration static checks: **pending execution in this report revision**.
- First contract-test failures are retained as tests-attempt1/2/3.log: they exposed missing candidate ancestry and the final helper pin. tests-attempt4.log and tests-current.log record corrected checks.
- merge-check-attempt1.tap: 57/58, failed on stale receipt-reader inventory; no failed result is adopted.
- checkjs-attempt1.log: failed before dependency builds and exposed the unlisted FD01 crash helper. This attempt is retained, not counted as a PASS.

## PASS / verdict / receipt audit before commit

1. **Contract generator (`main`, `checks_040`, per-stage pin checks):** compilation succeeds only after literal pending-authority comparison, current file/diff hash checks, generated consumer checks, pending holds, image chain and inherited validation. Generated bytes come from this invocation; separate `--verify` recomputes all six outputs and compares exact bytes. This validates a contract, not an engine or acceptance result.
2. **Contract tests and mutation harness:** assertions compare actual current bytes with immutable base Git bytes, literal source authority and generated projections. Every mutation uses a freshly written isolated generator copy and must produce a nonzero `CONTRACT INVALID` result; the known-good baseline is checked separately. Canonical outputs are hashed before and after. No synthetic receipt is promoted to live evidence.
3. **Merged G1 input boundary and M01 full-report reader:** `readLatencyRun` checks actual input bytes, registered schema and homogeneous mode before consumers use results; G1's preexisting engineGate provides current run/slot/build binding. M01's existing process/round/source checks remain, and PAIR remains opt-in. No live verdict is claimed here.
4. **Receipt inventory audit:** source hashes and parser imports/calls are checked on this tree; synthetic historical probes are explicitly classified and do not become production evidence. It proves the documented source boundary, not arbitrary dataflow.
5. **Required evaluator, pack and G0 result adoption:** results will be adopted only from newly named attempts on the committed source, with expected counts and raw result/receipt content, source identity and gate/grant bindings checked. They will be appended below after execution; no historical PASS substitutes for them.

## Limits and handoff

This is builder integration and offline verification, not independent reviewer acceptance of 0.4.0. DF01 live dev-storage findings remain DIAGNOSTIC. P3 has no newly qualified live measurement, O-DOMAIN dependency closure, production observer or qualification pins. No live PAIR/no-regression run, real engine G1/G2, acceptance claim, publication, push or main-branch merge is performed. Q98j and all listed pending questions remain with their owners.

## Integration gate corrections after the first committed evaluator

`00589f842b99fe78fa9d2aff865d6b6202e8c2a6` passed the required evaluator **108/108**, zero failures/skips/cancellations/todo (`evaluator-attempt1.tap`). Further G0 integration exposed failures that were corrected afterward; a new committed-tree evaluator run will bind the corrected source as well.

CHECKJS's accepted list predates the other integrations. Added the newly integrated operational roots; retained accepted review artifacts use exact archival exclusions. Three NSR reviewer modules actually imported by current regressions are included, not excluded. The final count is **440 checked roots**. Seventy type-noise directives preserve binding-name checking; `checkjs-comment-proof.json` proves printer-equivalent executable code for each file against 00589f84. A parser-result type assertion in the feasibility verifier emits byte-identical JavaScript (`feasibility-type-proof.json`). No acceptance source pin changed in this follow-up. The duet's parser imports are below its shebang; the initial placement above it caused a real syntax error and is corrected.

First G0 receipts remain failures:

- XTDB `G0-xtdb-20261109T104608Z-c3ecdc`: 1,267 pass, 16 fail, 140 skip. CHECKJS failed, macOS boot-identity reads were sandbox-denied, and the duet shebang syntax failed the noise test module.
- Datomic `G0-datomic-20261109T105000Z-e204ff`: 1,330 pass, 14 fail, 66 skip. Same static/sandbox limitations; the source also changed during this diagnostic attempt. Its receipt is not adopted as qualified evidence.
- The first-attempt scheduler was stopped after Datomic to avoid scheduling another known sandbox-limited QLever attempt. Its active gate finished and released its own grant.
- `checkjs-attempt1` through `checkjs-attempt4` preserve diagnostics. **checkjs-attempt5 passed** with 440 roots and no diagnostics or suppressed binding errors.
- `merge-check-attempt2.tap`: parser/reader checks passed; overall 59/60 because CHECKJS root coverage was still missing. The next combined attempt follows the coverage correction.
- `mutations-inherited.log` is an optional aborted old-suite attempt, **NO VERDICT**: its source snapshot became obsolete during integration. The exact last temporary generator was retained as `inherited-mutation-aborted-source.py`; the own wrapper was terminated, no matching generator process remained, and its temporary worktree file was removed. The 34 new ruling/re-pin controls are the completed mutation gate.
- `pack-attempt1.log` records admission waiting only. That queued wrapper was stopped before execution to prevent simultaneous worktree dist rebuilds with G0; no packaging result was produced.

The final G0 attempts run with the permissions needed for the host boot-identity read. They still run offline, through the heavy semaphore, with the explicit owned pnpm-store wrapper. No clock source is mocked and no engine service is contacted.

### QLever parity integration correction

The second QLever G0 attempt, `G0-qlever-20261109T110446Z-a34da8`, retained **1,511 pass, 2 fail, 79 expected skips**. Both failures were the timeout classification assertions in `client-parity.test.ts`: main's integrated client deliberately wraps abort/timeout causes in `QleverRequestError`, while the accepted parity test's helper recognized only raw DOM exceptions. The product client and its default stay unchanged. The test classifier now recognizes `QleverRequestError.kind`, and each timeout scenario explicitly requires that public error class and `kind: "timeout"` in both transport modes. The full parity file passes **26/26** (`parity-fix.log`). This strengthens the public-contract assertion; no assertion is removed and the required 108 evaluator tests are untouched. No pinned source or measured workload changes.

For a uniform final source binding, the required evaluator, packaging and three G0 gates are rerun after committing this test/inventory-only correction. Earlier receipts stay attached to their actual commits.
