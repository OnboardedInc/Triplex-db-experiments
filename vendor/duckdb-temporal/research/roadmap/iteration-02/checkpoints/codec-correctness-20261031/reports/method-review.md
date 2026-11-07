# Codec-method preparation — terminal bounded static review

**Assessment: no known remaining must-fix in the locked corrected revision02.** The original source-proof findings are preserved, not erased. This assessment permits root to make its own method-freeze decision; it is **not** candidate admission, correctness, timing/profile authority, a performance result or item2 acceptance.

Selected corrected source: `/tmp/temporal-roadmap-research/iteration-02/residual-performance-codec/revision-02/`.

| Locked input | SHA256 |
|---|---|
| codec_gate.py | `c16253fe358df26f9635ccd7925d519ae59cae3cb950251620b5d562eb868cca` |
| test_no_engine.py | `641671af7a6e9a6355fbde6d11c571d67d038d2e6b5fccc8f619beac90849e22` |
| REVISED-SOURCE-LOCK.json | `597112334c0d56ec85a9b5eade9c46b835ee839a94a5cf04f0afc57565572a58` |
| Recorded455-control receipt | `a3a2d113a7bf522959b6e33cbe4dfacc223e57ce06bb1ab75a2b4cd295fa7767` |
| Unchanged common.py | `fe194ca6821ffe63b3443233a3f815adb6fed729f4083f87fc5cc108570ac8e9` |
| Unchanged admit_candidate.py | `5a82c603fbd08441ce6e223654ca7fadd2da59b70b413d51c57baf0607adad9e` |

All15 source/seven method-input hashes independently join the lock and455 receipt (`SOURCE-IDENTITY-V2.json`). The selected C1-P+C2 decision is `55bb41d35b005760ace90ea0c504302d4aeacddc075b8e887c152abf03ad1686`; test alignment `889ae1359763d6ae7b37a58ecc2f7a3a8746b635d0213d843c2d7bb8b936ee5e`. Their durable-before-writer publication was reported by root; this reviewer made no Git/remote call.

## Reported defects and resolution

`REVIEW-V1.md`, `FINDINGS-V1.json`, `first-audit-v1/`, and the exact old gate/common/source425 snapshot remain unchanged. Original gate `dbd48d09…` admitted three negative specimens: helper `_` or metadata `_` collided with the baseline wire's local `_`; a generic helper type parameter `_TAG_NAMES` changed domain-name resolution despite identical body AST. A separate preserved specimen also showed added declarations before the unchanged future import were erased before module comparison. No actual application code was executed to expose these; scope/placement consequences follow pinned language rules. The actual root-reported candidate names/no-generics were never implicated.

The corrected gate closes them:

- `codec_gate.py:61–79,86–105` conservatively reserves token/AST identifiers/bindings across nested/local/import/argument scopes, NFKC-normalized spellings and builtin names, including unused bindings. Three normalized new names must remain distinct. It does not try permissive alpha-equivalence.
- `:112–122` requires a plain nongeneric helper, empty type_params and every FunctionDef header field except approved name/body to match, then checks identical after-key body AST.
- `:133–143` preserves the original future-import prefix and rejects every added helper/metadata declaration before it.
- The proof explicitly records `compiler_or_import_validity_proven:false`. AST parsing is not full compiler/import correctness; that remains a required root correctness precondition. No executable application code object was generated or evaluated here.

The requested builtin screen found **no extra hole**: original/final private-name checks reject `frozenset` and representative dunder declarations. Those negative results are preserved.

[CPython3.12.14 name-resolution rules](https://raw.githubusercontent.com/python/cpython/v3.12.14/Doc/reference/executionmodel.rst) establish function-wide local binding; [generic-function rules](https://raw.githubusercontent.com/python/cpython/v3.12.14/Doc/reference/compound_stmts.rst) explain type-parameter scope; [future-statement rules](https://raw.githubusercontent.com/python/cpython/v3.12.14/Doc/reference/simple_stmts.rst) constrain declaration placement. These are narrow language-level inferences, not application runtime observations.

## Own corrected replay and recorded controls

Own replay source was checkpointed before execution and used only copied pure-stdlib gate/common modules plus saved source strings. `corrected-replay-attempt-01/results.json` is first-pass **PASS11/11**: three valid synthetic shapes (including reported actual identifier layout, explicitly NOT actual candidate correctness) and eight expected denials, covering all preserved failures and builtin/dunder checks. Actual exit/stdout/stderr and source checkpoints are retained. No actual method executor or application source was imported/evaluated, and no real authorization files were created.

Owner455 controls were **inspected/hash-bound, not rerun**:439 denials/16 FAKE positives, including original425 and new scope/header/placement regressions. Original425, pre-placement450 and the first false admissions remain separately preserved by owner/reviewer. They do not become feature, DB, FP or benchmark passes. Own settings byte-identity assumption stop remains in `INHERITED-FIRST-ATTEMPT.json`; only intended label fields differed and the corrected text comparison passed. It is not a method defect.

## Retained experiment and admission boundaries

See `REVIEW-V1.md`/`INHERITED-IDENTITY-V2.json` for complete call-graph/delta assessment. No other change was found beyond the selected source gate/test/freezer corrections:

- Current baseline is **AE typed25e9a4/FP92169/native480456**, not FFC/facfc. Eleven actual baseline source/artifact files hash-match. A compares AE→codec with SAME480456; B accepted item1+5b661→same codec480456, a separate broader pair.
- Public `_carrier_payload` definition source remains verbatim; private after-key tail preserves both selected lookups/order and shared canonical/domain logic. Exactly two direct literal-string frozensets and one private wire call substitution are allowed. Exact-dict/all-exact-str admission remains BEFORE key equality. Rest normalized module AST, FP reader/native/legacy/schema/browser hashes, source caps/readiness/Query snapshot/knownNone/transactions stay protected. This is no general semantic or hostile-mutation proof.
- Root must supply actual immutable typed SHA/helper/metadata names, candidate snapshot/correctness receipts. Source-only admission verifies/copies the narrow closure and context rechecks it before store/DB/FP observation/timers/import. Root confinement and fresh paths remain; no ambient permission or FP cache/repair was introduced.
- Controller/execution/outer/worker/freeze_study/progress/verify retain reader strictv2 bytes; validation changes only profile labels and analyzer only ratio label. Schedule/settings are exact under intended label mapping; controls/runtime pins/template receipt are byte-identical. Full actual outer-controller-child exit/status/type/timeout/error/raw-sidecar/provenance/outcome closure remains mandatory.
- Same closed320 facts/10 commits,14 controls,42 pairs/comparison/two rounds, CPU8/threads1/default FP/GC, caps512/256/32/512/16MiB, original assignment/disposal endpoint and checks-after-stop, two warm/three measured sweeps, process-median/paired bootstrap/strata remain. No retries/trimming/pooling/seed/order selection or new program512-byte cap.
- One immutable initial gate can conditionally authorize separate profiles ONLY after strict complete terminal A/B. Do not edit its hash/flag after timings. Root/owner still must separately capture actual outer runner exits. No method setup/authority is inferred from elapsed time or synthetic positives.

## Remaining limits / next root-owned stages

At recorded inspection all real candidate/gates/runs and preparation freeze were absent. Root now decides freeze, then separately actual correctness-gated admission, four genuine untimed roles/56 full outputs, final source/preflight freeze and quiet/timing authority. No permission is supplied here. Freezer active-output exclusions/progress snapshot/closed post-exit byte readback remain necessary; no still-changing stdout self-capture is acceptable. The only extra freezer changes select the exact455 receipt and preserve `.synthetic-text` evidence.

Nine missing-gate CLI negatives stop at the first absent preparation gate, not every later dynamic stage. Synthetic equal durations/shared estimator checks are not independent statistical reconstruction or proof of i.i.d./family-wise/equivalence/universal recovery. Runtime/source/mapping/FP/thread receipts will be snapshots, not historical or continuous attestation. Compiler/import/full app/FP/reentry/codec/store correctness and actual result relations remain root obligations; AST gate11/455 controls cannot substitute for them.

Only own stdlib source/text/byte/AST operations and bounded synthetic source-gate probes ran. No app/store/DuckDB/project-native/FP reader/API, real admission/freezer/preflight/test suite, timing/profile or bootstrap was executed by this lane. No method/application/reader/working-tree/Git/Page/remote mutation or child worker. Prior frozen reviews/raw stay unchanged. **Static review ownership released after own source-only manifest readback; no process or approval remains pending.**

Own publication guard note: first manifest assembly stopped on reviewer-owned common/codec_gate bytecode caches from an earlier pure-gate import. No manifest/checksum existed yet. `FIRST-OWN-FREEZE-FAILURE.json` preserves the stop and exact cache hashes; caches are explicitly excluded, not silently published as text or deleted. No method/app/probe was rerun to address this publication-only issue.
