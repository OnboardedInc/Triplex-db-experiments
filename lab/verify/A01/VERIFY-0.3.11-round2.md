# Contract 0.3.11 round 2 — CX-VA01-0311

**Verdict: ACCEPT for the contract delta at `3b46c8a07ff3c6285252736cc10e04267f7dbe1d`.** All four round-1 findings are closed in the generated contract/reference implementation. No new blocking finding was identified in that delta. The main merge preserves pending authority and does not change the imported evaluator code relative to its main parent. This accepts the contract for merge; it is not evaluator or engine qualification.

North star: correctness floor for P1 exact pinned answers and P3 continuation, with equal contract coverage for lane D. Scope/targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; procedure: `lab/PROTOCOL.md`.

Reviewed sources: round-1 implementation `36d74348df2dd224ec15e29856a04a4e8daa4a30`, round-1 review `ae3f09137e6216dfa2580ec1f00d7d6c06133c73`, fix `a6b3028`, merge `da79107aa3be440ff38012962b0ea161198411df` (main parent `8f1722612b05ceeabbd36041e8bed2ad6459bf0a`), final builder head `3b46c8a`. The builder's report was read, then checked against immutable Git blobs. Tests ran in a source-bound disposable copy under `lab/verify/A01/round2/`; the verifier branch's reviewed source was not replaced or edited.

## Findings closed

| Round-1 finding | Source in reviewed head | Independent result |
| --- | --- | --- |
| F1: real replay result wrappers | `lab/acceptance/build_contract.py:1628` | CLOSED. The comparator applies the row policy to `rows`, or independently to both `raw` and `snapshot`, while preserving wrapper metadata exactly. This works at direct and in-flight placements. Unknown/partial row-object shapes fail closed and are explicitly identified as uncomparable in `oracleAnswerRule`. |
| F2: Unicode recursive serialization | `lab/acceptance/build_contract.py:1622` | CLOSED. Recursive keys now use the same UTF-8 canonical form as `_canon`. Japanese, emoji, accented values and Unicode object keys compare correctly; composed/decomposed accents remain distinct. |
| F3: Datomic omitted from composition/receipt schemas | `lab/acceptance/build_contract.py:2156`, `:3156` | CLOSED. Both declarations include Datomic, and structured `composition.engineIds` is enforced in `composition_ok` and the O-CONTRACT runner. Pure Datomic and mixed compositions bind; an unknown engine in any assignment refuses. D image and A0 pins remain null. |
| F4: Q76c matrix defect record absent | `lab/acceptance/build_contract.py:966`, `:1038` | CLOSED. `KL-CORE-TAIL` appears in generated known limits and the rendered matrix document, and row 35 references it. It names the core SQL compiler defect, requires fixing it before lane use or typed refusal, and explicitly avoids claiming the current XTDB/QLever frontier paths use that compiler. Existing matrix cell maps are unchanged. |

The original 35-test reviewer script is byte-for-byte identical to the one committed in round 1 (SHA-256 `9f258188b525cd512dc2a515e8acf5745593c4de97b1ff23ea2ca14b48c370aa`). It now passes **35/35**, including all six previously failing assertions. [Output](round2/round1-reproductions.txt).

I added **23 independent variation tests**, all passing. They check BAG multiplicity, SET deduplication, ORDERED/PAGES order, independent raw/snapshot changes, exact cut/count/contract/query metadata, missing/extra wrapper fields, empty arrays, unknown shapes, exact prefix identity/count, later queries, exact command/state data, Unicode keys/values, code-point distinctions, mixed-engine identities, unknown engines in each assignment, all 153 Datomic image blockers, and the scoped rendered compiler record. [Source](round2/delta_variations.py), [output](round2/variations.txt).

One of those tests invokes the actual pinned O-REPLAY CLI on Unicode assertions followed by an erasure, producing **three actual in-flight answers**: aggregate, match, and entityTriples. Their complete replay payload compares equal to itself. Reordering an aggregate prefix's rows succeeds under BAG and fails under ORDERED. This goes beyond manually placing a synthetic object under `inFlight`. [Input](round2/real-inflight-case.json), [answer](round2/real-inflight-answer.json). The builder's additional real-payload suite independently reran **5/5** passing. [Output](round2/builder-variations.txt).

## Mutations and regeneration

The supplied extended mutation suite ran afresh against generator SHA-256 `60055e9f236733365c4e558412368b0a2934df8cb1d5e9479d45758971940ccf`: **344 run, 344 caught, zero misses**. Catalog: 425; 81 missing-anchor entries are retired, not counted as passing executions. The separately superseded historical status-only control remains excluded. All six added round-2 mutations were exercised and caught: disabled payload projection, ignored cut metadata, ASCII escaping at recursion, removal of Datomic from each schema, and removal of the scoped compiler record. [Full output](round2/negtest.txt).

I inspected the harness condition: a mutation counts as caught only when its subprocess exits nonzero and its output starts with `CONTRACT INVALID`; a mere output difference or emitted success flag does not count. The unmodified generator passes `--verify`, so these are not failures caused by an invalid baseline.

`python3 -I -B lab/acceptance/build_contract.py --verify` passes with all six artifacts byte-identical. [Start verification](round2/verify-start.txt). Transitive contract hash: `68304280363e5c602a2b343f405448c0d3e218dc4ff5de24af7cd8b219aebca7`. Generator and O-CONTRACT projection pins change as required by the fixes; no oracle, world, image or A0 pin is promoted.

The supplied Q47d pending-row/restoration regression **passes**, including byte-identical restoration of all six outputs. The post-suite generator verification also **passes**. [Q47d output](round2/q47d.txt), [final verification](round2/verify-final.txt).

The heavy mutation and generator runs use `node lab/bin/heavy.mjs --label CX-VA01-0311-R2-... -- <command>`; resource-wait messages are preserved in their logs. The 35/5/23 pure reproduction/variation suites each finish in under one second and use no engines. Disk free before these runs was 25,180,155,904 bytes, above 5 GiB. [Source/run identity](round2/source.json).

## Main merge and lane coverage

[delta-audit.json](round2/delta-audit.json) and its [audit script](round2/audit_delta.py) establish:

- All **157 obligation records**, their source-language memberships, and all **51 existing matrix cell maps** are unchanged from the round-1 authority. Only the scoped row-35 note and known-limit entry were added to the matrix data.
- Compiled rulings are unchanged. No pending rule silently gained authority.
- All **29 O-REPLAY hashes** still match the external `hashes.0.4.9.txt`, the reviewed commit's files, and the blobs at `f195f30af618d3f9b0525a864e913824a315cc8c`. O-REPLAY remains 0.4.9 with V-O04i; world/oracle pins are unchanged.
- Datomic still has **153 applicable obligations, zero pin-level closable, 153 blocked**. Every applicable obligation retains `image-unpinned:datomic`; the common per-surface obligations remain assigned to D. Its image/imageId and `A0-DATOMIC` remain null. No old X/Q exception transfers to D.
- The merge-only generated JSON differences are the pending-file input hash, pending IDs/hash, and transitive hash. The merge does not change obligation meanings or pin policy.
- Imported `lab/bin/` and `lab/config/` files are byte-identical to the merge's main parent. This round did not modify the separately authored E01 evaluator while resolving the contract merge.

The resulting pending list is **exactly main's list minus the same 50 compiled 0.3.11 rows**, in the same order. There are 29 rows with authority `none`, with no pending/compiled intersection: Q51b; Q72a–e/g; Q73a–b; Q78e; Q80a–c; Q81b–c; Q82a–e; Q83a–d; Q84a–e. Q83b/d's newer freeze requirements remain pending; they are not silently substituted for Q74b. Q78e still needs Sam's decisions on storage-layer tenancy and final dev-storage acceptability. The other rows await their corresponding later implementation/review/contract compilation; this delta does not resolve them.

## Evaluator integration boundary

A pure differential probe of the **imported** `lab/bin/claim.mjs:141` confirms that its JavaScript `recompute` still accepts only bare row arrays for CMP-BAG-ROWS. Given the same real replay aggregate payload, it returns `UNCOMPARABLE`, while CMP-EXACT-VALUE returns PASS. [Probe result](round2/merged-evaluator-probe.json). The fixed Python contract reference passes that same whole replay payload.

This is a remaining E01 integration gap, not a new change made by the contract fix: the imported evaluator is identical to the main parent, and the builder expressly makes no new qualification claim for it. Its row-payload handling must be aligned with the accepted reference before claiming executing Q75g support. The contract continues to block qualification on the executing gate, manifests, build specification, frozen writer trace, A0 entries and per-obligation verification. Accepting this contract delta neither clears those blockers nor certifies the imported evaluator as conforming to 0.3.11.

## Limits and handoff

No contract code was fixed by this reviewer. No main-checkout edits, engine/container lifecycle, package installation, package build, benchmark, full root pnpm check, full oracle recertification, or live Datomic/evaluator qualification was performed. Nothing was pushed or merged. The review accepts F1–F4's contract/reference fixes and the pending-authority merge at the exact head above; untested engine behavior and the separate evaluator integration remain outside that acceptance.

To reproduce, [prepare_snapshot.py](round2/prepare_snapshot.py) reconstructs the disposable tree from the exact reviewed commit. Run the supplied `negtest0311.py`, `q47d_test0311.py`, and generator `--verify` from that tree through the lab's heavy wrapper. Run its unchanged `lab/verify/A01/regressions_review0311.py` and `regressions_round2.py`, then this review's [delta_variations.py](round2/delta_variations.py). [merged_evaluator_probe.mjs](round2/merged_evaluator_probe.mjs) reproduces the separate integration observation without executing a qualification run. The disposable tree was removed after the final checks; the Git source and all logs/fixtures are retained.
