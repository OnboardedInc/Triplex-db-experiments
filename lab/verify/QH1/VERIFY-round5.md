# CX-VQH1 — EXP-QH1 round 5

**Verdict: ACCEPT-OFFLINE. No remaining finding in the requested F1 scope.** XTDB, Datomic and non-broker QLever now capture one native committed position per public pull and carry that cut through every level. Their hooks offer no position inside a transaction, preserving staged reads. The previous three adapter reproductions return the whole old graph; independent controls demonstrate that removing the hooks restores the mixed answer.

Reviewed builder head `0225ece6`, product `7c5253dcc0091bf78ed9c54eff459a89d7bcd9bf`. Merged the requested builder head into `verify/QH1` before execution: **`7de765e6952a249f83df83e7a96a80364c9393f6`**. Every execution below identifies that committed merge tree. Product bytes match `7c5253dc`; this review adds only files under `lab/verify/QH1/` and makes no product fix.

North star: the exact-cut correctness floor for P1/P4 in [SCOPE](../../SCOPE.md), [NORTH-STAR](../../NORTH-STAR.md) and [TARGETS](../../TARGETS.md). Scope is the remaining F1 on these three in-scope adapters. Inherited SQLite, PostgreSQL, DuckDB and Cloudflare adapters remain outside this review. This verdict does not qualify a live engine, a performance bar, a release or an acceptance-contract obligation.

## Mechanism reviewed

| Adapter | New hook | Exact cut used by the reader |
| --- | --- | --- |
| XTDB | `packages/xtdb/src/XtdbStorageAdapter.ts:586–589` delegates to `committedPosition()` outside a transaction | Reads the scope's `tx_meta.position` once; each level's SQL includes assertion-position and retirement-position bounds through `cutConditions`. |
| Datomic | `packages/datomic/src/DatomicStorageAdapter.ts:350–353` delegates to `committedPosition()` outside a transaction | Reads the gateway basis's **logical position** once; every level sends `basis.recordedPosition`. Gateway `read-db`/`at-position` applies the corresponding `d/as-of` value after checking availability. It does not rely on the record timestamp or a fresh unpinned request-time value. |
| Non-broker QLever | `packages/qlever/src/QleverStorageAdapter.ts:484–485` delegates to `position()` outside a transaction | Reads the meta position once and updates `observedPosition`; every level receives the same assertion/retraction order-key bounds. The normal explicit-position guard therefore adds no second position query. |

All three return `Effect.succeed(undefined)` when their own transaction context is present. They do not substitute the transaction's staged `currentCommitPosition` for its existing snapshot. The new methods add no lock, semaphore acquisition, held snapshot handle or serialized read section: they select the current transaction context and otherwise perform the existing read-only position request. Existing transaction/write machinery is unchanged. This is a source-level assessment of the new methods, not a measurement of native-engine contention.

The shared `TriplesLive.reach` behavior is unchanged from the verified round-4 fix: it invokes the hook once before the direct attempt and uses the resulting resolved basis for that attempt and every `entitiesAt` fallback level. These three adapters have no `withCurrentPull` context of their own. The broker's separate context semantics remain unchanged.

## Reproduction and independent checks

The builder's `round5-native.test.ts` passes in the fresh QH1 run. The three ported reproductions use each adapter's real hook, require the old graph, count hook calls, check every native request's cut, check the post-commit empty graph and transaction behavior, and retain a no-hook control. The two previously verified broker controls also pass. The builder accurately discloses that its pre-fix run stops at a missing-hook assertion; I added a stronger semantic sensitivity control.

[round5-review.test.ts](round5-review.test.ts) adds **18 fresh tests** using the actual adapters and public `T.reach` with deterministic native-response fixtures:

- **Twelve closure cases:** each adapter; commits after the root or after the intermediate entity; current recorded state or `recordedAt: 1000`. Both commits share timestamp 1000. The graph is three levels: `root -> a -> b`, `b = 1`. The second commit retracts the root reference and replaces the leaf with 2. Every fixed pull returns the whole old graph with three hops. The next pull returns the new empty root closure.
- These cases count **actual native position requests**, rather than calls to a wrapper around `pullPosition`: XTDB's meta query, Datomic's `basis`, or QLever's position query. The first pull makes exactly one, all three level requests carry cut 1, and the subsequent pull makes one additional position request. This also checks that QLever's availability guard does not introduce another position query.
- The same twelve fixtures with the hook removed return the mixed graph ending in value 2, have zero position captures and have no cut on their level requests. Native fixture selection depends on the SQL/SPARQL predicate or forwarded Datomic basis, not an answer that ignores the requested cut.
- **Three staged-read cases:** the real adapter transaction context returns no pull position before and after staging two assertions with `adapter.insert`; public `T.reach` sees the exact old graph plus the staged reference and value 7. No additional native position request occurs inside the transaction callback. The callback deliberately rolls back after its assertions, so this is not a native committed-write or durability claim. Datomic's fixture interprets the real staged wire payload and held handle.
- **Three position-failure cases:** a failed native position request gives a typed `ReadError` before any level is answered; it does not fall back to an unpinned pull.

Raw observations include exact requested entity sets, captured cuts, native position-query counts and returned closure values. They remain under the authoritative `r5-qh1-final-…` attempt named below. These are offline adapter/native-request fixtures, not live XTDB, Datomic or QLever executions.

### Tests detect the wrong answer without the hook

[round5-prefix.config.ts](round5-prefix.config.ts) runs the twelve closure assertions with the **exact three adapter modules from `febcd098cf52b8c7bbf3956df46741b985d42550`** substituted by a Vite pre-transform. Product files on disk stay unchanged; the loaded old source preimages are retained. The other six cases are deliberately deselected for this control.

Result: **12/12 semantic failures** at the returned-closure equality assertion, with the observed leaf value 2 instead of 1. There is no preliminary hook-presence assertion in these cases, so these are not missing-method or setup failures. The same twelve cases pass with the fixed modules. This establishes that the green fixed-tree result depends on the new behavior and that the fixtures can observe F1. It is an in-memory module control, not a claim to rebuild the entire old repository.

## Fresh required runs

Evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQH1/`, attempts prefixed **`r5-`**. [round5-evidence-index.json](round5-evidence-index.json) names commands and attempts; [R5-SHA256SUMS](R5-SHA256SUMS) binds retained bytes. Every heavy command used `lab/bin/heavy.mjs` with host free space observed above 5 GiB. Integration flags were explicitly zero for native package/QH1 runs. No engine slot or live service was used (`slot: null`).

| Gate | Fresh result / authoritative attempt |
| --- | --- |
| Core | **859 passed / 60 files**, `r5-core-1c0b9ffd-606a-49c3-86c6-e762599c213b` |
| QLever | **257 passed / 29 expected skips**, `r5-qlever-a76063d8-c48e-423d-be91-0c03c85c1a68` |
| XTDB offline | **65 passed / 90 expected skips**, `r5-xtdb-final-8b5bfbff-0e69-4e6b-90b7-a287988f6bcd` |
| Datomic offline | **119 passed / 16 expected skips**, `r5-datomic-final-7975a1a1-471a-4520-9c0b-2b0706bae222` |
| Final QH1 semantic suite, including `round5-native` and reviewer additions | **47 passed / 11 files**, `r5-qh1-final-89735f25-c6d9-495c-a232-e1d51ab3bd79` |
| Independent reviewer cases alone | **18 passed**, `r5-reviewer-7b8253f7-dcd9-427b-a186-9cc47170e005` |
| Exact pre-hook module control | **12 semantic failures / 6 deliberately skipped**, expected exit 1, `r5-prefix-control-1d691c82-3b9d-4764-a562-da1593c07691` |
| Four prescribed mutants | All four exit 1 with the required semantic failure, no timing or oracle-success artifact, `r5-mutants-final-d13f17a9-ac12-4f33-9f71-0ca1b78fc460` |
| `python3 -I lab/acceptance/build_contract.py --verify`, own step | **PASS**, byte-identical regeneration, `r5-contract-verify-67bfe8a3-d64b-45ed-9f41-c40eb07150b2` |
| Evaluator `claim.test.mjs` + `claim-round2.test.mjs` | **108 passed / 0 failed**, `r5-evaluator-88c568e8-0f77-4e26-9712-9423805e6c48` |
| Retained evidence/source/pin audit | **140/140 R5 manifest entries match**, source and complete pin-delta checks hold, `r5-audit-ceaf08ac-d20e-4a6d-97b9-775c07c127ce` |

All authoritative receipts above have **`sourceStillMatches: true`** and identify the committed merge tree, exact command, source hashes, actual Node version, time bounds and log hash. Initial XTDB/Datomic/QH1/mutant executions also passed, but their broad source inventories changed while reviewer-only files were being added; the stable-source final attempts above supply their acceptance evidence. Those earlier attempts are preserved. Product and original gate sources never changed during this review. Core and testkit were built normally before subprocess consumers ran; generated files were not hand-edited.

QH1 invocations exclude the separate `writer.test.ts` timing diagnostic and the historical round-3/round-4 reviewer files that intentionally assert the old defect or absence of the native hooks. They use the corrected `reach-cut.test.ts` and `round5-native.test.ts`, plus the new semantic controls. The initial builder-set QH1 run also passed **29 tests / 10 files**. The final 47-test count is that set plus the 18 reviewer additions.

## Pin and scope audit

[round5-audit.mjs](round5-audit.mjs) independently verifies every R5 retained manifest hash; product identity against `7c5253dc`; exactly the three intended adapter changes since `febcd098`; unchanged acceptance files; and every old/new hash, changed product/bench path and acceptance reference in `pin-changes.json`. It also verifies that `TriplesLive.ts`, broker adapter, H1 decoder and SQLite worker are byte-identical to round 4's product `365fe188`. No other pinned path silently moved.

| Pinned path | Old SHA-256 | New SHA-256 | Status |
| --- | --- | --- | --- |
| `packages/xtdb/src/XtdbStorageAdapter.ts` | `9eeed8e4e096b9245350780ccbfc99cff562a82d9097d6633a9d77b6b0dc5377` | `6ea85e9b771d16eee7f74a41f985568ff08851b9757b60f6f950010779d6a1f7` | New round-5 movement, disclosed in the builder report; contract builder must re-pin. |
| `packages/core/src/store/Triples.ts` | `7e5bd8c3e83e0d468912be4f01719d6bdd4f54c84c9bbc08ee0f10cdf05159c0` | `da3515b5013feae546c08cc6865a4b517292a0f5fcb0f679340d5aba2b20060d` | Earlier round-3 movement, unchanged this round and still awaiting re-pin. |

Old hashes are relative to the declared base `2f7b42d6`; the XTDB old hash also matches the pre-round-5 source. The contract remains unchanged. This reviewer moves no pinned/product file. Passing `--verify` is regeneration evidence, not permission to adopt the new source hashes or promote the implementation.

## PASS / verdict / receipt audit (rule 9a)

1. **`round5-review.test.ts`:** content is exact old/mixed/new closure assertions, three-level cut traces, actual native request counts, staged values and typed refusal with zero answering reads. Freshness is new per-variant fixture and runtime state; raw observation files are written only after assertions in the current attempt. Binding is the real adapters/core, parsed SQL/SPARQL cuts or forwarded Datomic basis, explicit input graph/commit schedule, source-hashed test bytes and command receipt. No fixture result is represented as a live-engine result.
2. **`round5-prefix.config.ts`:** content is the exact Git preimage of each named adapter, retained in the fresh control attempt; binding is the full old commit, exact module IDs and source/command receipts. The twelve returned-answer assertion failures establish sensitivity, not exit 1 alone. Only the named modules are substituted in memory.
3. **`round5-audit.mjs`:** content requires every recorded file hash, source equality, full changed-path set and old/new pin/reference agreement. Freshness is a new audit of retained bytes, explicitly not a rerun of the builder's gates. Binding is the committed R5 manifest and exact Git/source paths. It does not edit or authorize the acceptance contract.
4. **Reused runner and required gates:** `review-run.mjs` emits command observations, never exit-only semantic PASS. New UUID directories, before/after source hashes, actual closed log bytes, HEAD/tree/command/Node/time and `slot: null` bind fresh attempts. Reviewer preimages are retained. Required suite counts and mutant semantic failures were inspected in terminal logs. `--verify` is regeneration only; evaluator checks are not QH1 promotion evidence.
5. **Report/index/checksums:** ACCEPT-OFFLINE follows the corrected observations and the independent pre-hook semantic failures. The index preserves all attempts and identifies stable-source authoritative executions. Checksums are computed after completion. Native skip counts and the absence of live execution remain explicit. No P1/P2/P4 or release obligation is closed.

## Limits and remaining work

No live XTDB, Datomic or QLever engine, public native committed-write journey, native contention/latency measurement, VM gate, fresh large W0 replay, CPU ABAB, P2 diagnostic, full root `pnpm check` or additional package-consumer/typecheck campaign was performed. Native request fixtures model the documented cut behavior and do not independently qualify the engines. The new native position round trip has not been performance-qualified.

No product fix, acceptance edit, main-checkout write, engine/container operation, subagent, push or merge into main occurred. The requested merge was only into `verify/QH1`; raw bulky evidence remains outside Git. Remaining work is live-engine qualification where required, deliberate contract re-pinning, and the previously open performance goals. F1 is closed within this round's stated offline scope.
