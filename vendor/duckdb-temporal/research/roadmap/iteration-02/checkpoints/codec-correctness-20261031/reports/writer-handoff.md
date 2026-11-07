# C1-P+C2 candidate-01 — implementation ownership released

**31 October 2026 UTC. Scoped implementation/checks only; item2 is not accepted.**

## Exact source

Candidate: `/tmp/temporal-roadmap-research/iteration-02/residual-codec-implementation/candidate-01/source`

269-file full `EXPORT-MANIFEST.json` SHA256:
`31ad9fd0f6ca7b7613830723181ca222302c56d38172bd744b7d7f2636dbc500`

The only owned application/test changes, already present in the working source:

| File | SHA256 |
|---|---|
| `storage/typed_store.py` | `57869b41ffa95eb19ff4a34fe842652c4c658dff81230c6257556a355387d1fd` |
| `storage/tests/test_batch_codec.py` | `ad3a3895491b67fea69f645aca021568ba3e9453a1620e0233995f4c0ab14f9a` |
| NEW `storage/tests/test_native_codec_keys.py` | `ab6cb5bf4fcd2e249e2a181203a2dbb7efff2242624fdb22cf130fdc71add7ca` |

The entire public `_carrier_payload` function remains verbatim; its source-segment SHA256 is `605a108aa1c70a4e813ac75b6837df005c9782dcbf6330d51338ec7a1da9c95e`. New `_native_carrier_payload(value)` has exactly the after-key tail AST, ignoring only its documented precondition docstring. Its single application call is immediately after unchanged `_native_keys(cell, _NATIVE_CARRIER_KEYS)`. The only metadata additions are exact-string `_NATIVE_RESULT_KEYS` and `_NATIVE_CARRIER_KEYS` frozensets, each used once at its existing private admission site. Domain/type/float/NULL/generator/container/guard/query/lifecycle logic is unchanged.

Only `test_shared_validation_late_fault_counts_and_no_alias` changed in the old batch suite: retain256 private shape/domain calls,2 full FP reads/no Value construction, and add zero public shape calls. All its other checks remain.

## Actual checks and preserved limits

All11 captured commands exited0/no timeout; no application failure, correction or second candidate. Raw commands, UTC, stdout/stderr hashes and logs are under `candidate-01/checks/`; strict readback is `candidate-01/ACTUAL-CHECK-SUMMARY.json`.

- New codec:13 methods pass, once at default hash seed and then unchanged at seeds0,1,42,123456789. Each run covers the same93,600 public protocol parity cases/28,080 triggered actions,2,784 direct private no-hook rejections plus1,392 converter rejections,960 carrier-order/fresh-key variants,48 root variants, domain/NULL/type/error-order/alias/no-prefix cases, both sensitivity controls, and literal source/AST/callgraph invariants. Repetitions are not additional unique cases.
- Retained batch:11 methods pass; retained79 physical +36 getter child specifications,16,376 finite-bit recipes, actual native evaluated-command rollback/reopen/retry/receipts and GC/public-reentry guards. The unchanged harness checks each child internally but does not print separately retained115 child records.
- Current FP:7 methods and all56 captured child settings/exits/restoration records pass; exact settings closure independently read back.
- Current reader:16 methods and all79 captured child settings/exits/restoration records pass, including true native6/query and7/query_json reads for all existing shape cases.
- Legacy:23 methods pass.
- Typed/migration:19 methods reported,18 passed including both genuine native methods; the one no-native absence-arm skip remains accurately recorded as inapplicable with native present. That exact existing method separately passed with no skip in `candidate-01/no-engine-source`, a second269-source mirror frozen before import with all source hashes identical and naturally absent extension. No missing native test is counted as a native pass.

No FP modes were changed in the parent/controller, no ROOT/cap/trusted-path patch, no artifact/path trust bypass. Children retain their original restoration-before-cleanup discipline. Approved480456 was copied only to this worker's candidate mirror; protected working native5b661 was never overwritten.

## Protected readback and evidence

Before edits, all268 current exporter-selected files exactly matched AE reader baseline manifest `441d6564e20734b21dbc9ce043bd960520deed261d5a437662cbaa53b634f2c7`. After all checks, all269 frozen source hashes and all266 non-owned baseline live source hashes still close. Both source mirrors remain identical to their269-file manifest. Current FP remains `92169be543692ff30a1824fa0add9cdb7e3139c864bdef8fdc5d1b0ec9710164`; approved normal native remains `480456248ffa53e453d41737a37cc2a2d54764ffbd449b9e6ea95f3d805d68b4`; protected working native remains `5b661f3843799cb97b5c7458f503eca9fefd0f58beb053bf22c740c05cb6270d`.

Evidence: `BASELINE-CLOSURE.json`, `STATIC-REVIEW.json`, `candidate-01/CLOSURE.json`, `candidate-01/CLOSURE-AFTER-TESTS.json`, `candidate-01/SOURCE-DIFF.patch`, `candidate-01/NO-ENGINE-CLOSURE.json`, and strict actual-check summary/logs. `source_closure.py` and `close_evidence.py` use only stdlib/data readback.

## Next coordinator integration

1. Accept the three-file handoff after independent source/actual QA. The writer has released ownership and will make no more source changes without a new explicit handoff.
2. Add `python3 -B storage/tests/test_native_codec_keys.py` to the offline `verify_expressions.sh` path; no exporter edit is needed because `storage/tests/*.py` is selected automatically. Coordinator owns docs and verifier.
3. Preserve coherent code/evidence checkpoints in the existing draft PR/private research-reference and Page using coordinator-only authority, then run independent QA and root full clean-export aggregate/direct native/core/header/browser/expression and required sanitizer gates. Those are **UNRUN by this worker**, not implied by these scoped passes.
4. Only after actual correctness and exact frozen source/artifact admission, execute the separately declared untimed macro/preflight/quiet timing/profile plan. No macrobenchmarks, profile/performance gate, source/ref/PR/Page operation, deployment or Codex/user-computer operation occurred here.

No speedup, whole-fenv preservation, hostile mutable-graph atomicity, full OS resource containment or item2 acceptance follows. Existing trusted-callee/continuous-supported-controls/cleanup caveats remain. Items3–10 stay queued.
