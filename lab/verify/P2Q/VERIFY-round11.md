# P2Q round 11 — ACCEPT (default-off integration)

Reviewer **CX-VP2Q-11**, branch `verify/P2Q`. Reviewed builder **be588639** (product **561410d2**), merged into this branch at **9820507c14f0560779bccf92df5941f19324389c**. All producer receipts name that integration head and hash the actual review files, including then-uncommitted additions. No product code was changed by this review. Default-off remains unchanged.

**North star:** P1 exact-cut correctness and the P2 read-after-commit floor, under [SCOPE](../../SCOPE.md), [NORTH-STAR](../../NORTH-STAR.md), and [TARGETS](../../TARGETS.md). QLever timings are **DIAGNOSTIC under Q91a**. This verdict does not qualify performance or production deployment.

## Findings and verdict

**No remaining findings in the reviewed default-off integration scope.** Both round-10 findings are resolved. ACCEPT is conditional on retaining the real resolved-type inventory and service-specific descriptor guards; a private marker is construction provenance, not a substitute for semantic tests or review of newly authored operation translations.

1. **Foreign construction provenance is rejected.** The real native source-copy mutation and its separately compiled consumer still demonstrate the former counterexample: a public symbol read returns `{rows:[]}` at required position **6144**, with the broker head **2048**, without a basis or mask call. It cannot obtain native private provenance. The actual, unchanged construction test now fails on that exact symbol with `unconstructed read: Symbol(round10NativeRead)`. This is an intentional negative gate, never read acceptance. The two original inventory/policy tests still execute alongside it.
2. **Approved keys exist and enforce the basis.** Real native table mutations adding an ordinary string, a unique symbol, or a non-enumerable symbol preserve the compiler-resolved public keys at runtime. Actual Symbol references are compared in the producer, rather than their serialized descriptions. Each new method is callable, belongs to the native wrapper, and refuses required **6144** against actual published prefix **3071**, with reason `basis-not-reached` and replica `the QLever replica`. The separate consumer and implementation have empty compiler diagnostics. The previous missing-method TypeError is gone.
3. **The whole descriptor chain is checked.** Independent tests exercise **80 distinct service/extension combinations** across Triples, broker storage, Datalog, and native queries. They cover own/inherited/hidden/string/symbol entries, getters, class/prototype chains, deep inheritance, generic foreign constructors, and each other service's actual private wrappers. In particular, a legitimate own method cannot hide a raw or foreign method or getter at the same inherited key. Late assignment, property definition, and prototype changes on actual frozen services throw.
4. **Public/runtime read keys agree.** The real compiler resolves all four service contracts, and tests compare them with actual runtime surfaces: **14 Triples + 6 adapter + 2 executor + 2 native reads**. Native, Triples and executor full key sets agree exactly. The broker adapter omits only the explicitly optional, pre-existing non-read `validateConstraints` fallback hook; the test names this sole exception and requires its optional flag. No read key is excused. Direct, inherited and declaration-merged public-type additions are rejected by the actual implementation/type-coverage checks and the original inventory in isolated source copies.

Supported table entries are constructed by the wrapper; unsupported inherited/accessor/numeric table forms are refused. Broad/numeric key type controls execute under the real noEmit checker. An authored new operation still needs correct argument/basis translation and semantic coverage; these tests do not assert that arbitrary edits to the guard, exemptions, or answering continuation are safe.

## Fresh validation

Every test/typecheck ran through `lab/bin/heavy.mjs`, with the 5 GiB admission floor checked before each gate. All live engine traffic used **http://127.0.0.1:7070**. Local HTTP fault fixtures use their own ephemeral loopback ports and forward live engine requests only to that endpoint. No engine lifecycle action or exclusive reservation was used.

| Matrix | Adopted fresh result |
| --- | --- |
| Earlier offline rounds 4–7 | 802 passed / 816 total; 14 live-only skips |
| New snapshot, basis, pagination, history and construction | 37 passed / 43 total; 6 live-only skips |
| Foundation, durability, process locking, routing, outage, feed and independent source audit | 46 / 46, including 60 routing fuzz seeds and full outage-scale inputs |
| QLever package | 224 passed / 250 total; 26 integration skips |
| Focused core basis and KV store/query | 28 / 28 |
| Core standard noEmit | Passed, empty diagnostics |
| QLever/current-core source-alias noEmit, including round-10 key controls | Passed, empty diagnostics |
| Earlier live-enabled matrix | 54 / 54: 22 real-QLever cases and 32 repeated offline controls |
| New real-QLever snapshot/pagination/journal matrix | 7 passed / 14 total; 7 filtered cases |
| Independent resolved-type and whole-surface tests | 7 / 7, including 80 extension combinations |
| Real native foreign/string/symbol/hidden mutations | 13 positive assertions and 1 exact expected guard failure; 39 discovered cases, 25 filtered |
| Original inventory source copies | Baseline 2 passed; direct/inherited/merged each 2 passed plus 1 exact expected inventory failure |
| Actual installed-Undici catalog-addition control | 121 passed plus 1 exact expected missing-code failure / 122 total |

The readback independently compares **104 complete before/after payload strings**, including eight journal comparisons across actual later metadata retirement. It independently parses complete CRC-chained segment frames and checks the original and retired transaction-position tuples. Final readback additionally checks native payloads contain `first-0`, rather than accepting matching empty answers. The original **48 implicit/explicit policy observations** retain exact expected required cuts and actual basis calls. The symbol snapshot regression also checks typed future refusal and masking of the complete retirement tuple.

Commands used (gate-specific recipes and exact environments are retained in the producer receipts and controller source preimages):

```sh
node lab/bin/heavy.mjs --label CX-VP2Q-11-R11 -- node lab/verify/P2Q/scripts/round11-run.mjs
node lab/bin/heavy.mjs --label CX-VP2Q-11-R11-retry -- node lab/verify/P2Q/scripts/round11-retry.mjs <durable-attempt> foundation
node lab/bin/heavy.mjs --label CX-VP2Q-11-R11-retry -- node lab/verify/P2Q/scripts/round11-retry.mjs <durable-attempt> package
node lab/bin/heavy.mjs --label CX-VP2Q-11-R11-retry -- node lab/verify/P2Q/scripts/round11-retry.mjs <durable-attempt> independent
node lab/bin/heavy.mjs --label CX-VP2Q-11-R11-counts -- node lab/verify/P2Q/scripts/round11-counts.mjs <durable-attempt>
node lab/bin/heavy.mjs --label CX-VP2Q-11-R11-seal -- node lab/verify/P2Q/scripts/round11-seal-final.mjs <durable-attempt>
node lab/bin/heavy.mjs --label CX-VP2Q-11-R11-finalize -- python3 lab/verify/P2Q/scripts/round11-finalize.py <durable-attempt>
```

`<durable-attempt>` means the absolute attempt directory listed below, not a literal shell argument. Process-lock suites and the final process readback required inspection-enabled execution. The current full controller includes the corrected positive-count metadata; initial executed controller bytes remain under `preimages/`.

## First failures and reruns

All six rejected producer receipts remain immutable and separate from the 19 adopted gates:

- The sandbox denied process-list inspection. The first foundation attempt has 43 passes and three process-lock failures; the package attempt has 222 passes and two process-lock failures. Fresh runs with process inspection available passed the unchanged complete suites, **46/46** and **224/250** respectively. No failed assertion was skipped or converted to a pass.
- The failed package run left its runner and a fixture running after producing its failed JSON. A separately recorded abort verified the exact worktree/unique-fixture arguments, sent SIGTERM only to PIDs **44735, 44894 and 44888**, and observed all three gone. That failed attempt remains unqualified. This was not a signal used to obtain a passing run. The package's own `afterAll` removes its fixture directories; durable verifier states and original failure outputs remain retained.
- My first shadowing fixture used `Object.assign` over an inherited non-writable property, so construction failed before the guard ran. I corrected it to `Object.defineProperties`, retained the first 6-pass/1-failure receipt, and expanded the corrected run to include transfers of actual wrappers between all four service modules. All seven tests then passed, including all 80 combinations.
- Three inventory controllers incorrectly expected three positive cases where the selected set contains two positives and one intentional failure. I corrected only that expected positive count and reran the unchanged scratch assertions. Their original rejected receipts remain. The checked inventory failure and executable future-cut counterexample are unchanged.

The initial readback also refused to seal because I incorrectly required package logs to contain pgrep stderr; that fixture suppresses subprocess stderr. The original [readback script](scripts/round11-seal.mjs) is retained. The [final readback](scripts/round11-seal-final.mjs) checks the actual two named package failures and their missing-helper observation, and still requires the full successful inspection-enabled rerun. No producer output or receipt was edited.

## Evidence and operational readback

Durable attempt:

`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2Q-11/round11/6a1c7eee-fa7e-4601-b3c0-49cbd241c275/`

The committed [index](evidence-round11/INDEX.md) and [compact SHA256 manifest](evidence-round11/SHA256SUMS) anchor `SUMMARY.json`, `FINAL.json`, all 25 producer receipts, the scoped abort record, and the complete durable manifest. That full manifest covers **4,742 regular files**; **26 symlink targets** are separately inventoried. Source copies, raw outputs, state, and bulky evidence stay outside git.

The fresh final readback found **no owned test processes**, and none of **64 distinct recorded PIDs** in **620 durable fixture LOCK files** remained live. Host free space was **10,919,862,272 bytes**. The finalizer sends no signals and deletes nothing.

No `lab/acceptance/` edits were made. [source-hashes-round11.json](source-hashes-round11.json) records every old/new SHA256 for all seven builder-changed package/Changeset paths against `1096fb86`. The read-only acceptance search found no literal reference to those changed paths. The product and Changeset bytes remain exactly the builder's reviewed bytes; the contract is unchanged.

## PASS / verdict / receipt audit — rule 9a

| Decision site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `scripts/round11-gate.mjs` receipt `accepted` | Recounts actual JSON assertions, exact pass/fail/total denominators, aggregate consistency, exit semantics and precise expected-negative messages. Compiler gates require successful empty diagnostics. | Exclusive UUID gate/state/output directories; JSON start and output mtime must fall inside this producer interval. | Actual source hashes, lockfile and installed-Undici preimages before/after, explicit command/selected environment/cuts, builder and integration heads, and unique actual heavy-owner bytes before/after. |
| `round11-run.mjs`, `round11-retry.mjs`, `round11-counts.mjs` | Delegate semantic adoption to the strict gate; status output alone is not acceptance. Source-copy setup must succeed before dependent probes. | New attempt roots and separately named retries; rejected files are never overwritten. | Explicit selections, expected negatives, source-copy recipes, actual parent heavy PID and label. Initial and final verifier revisions are retained. |
| `tests/round11-types.test.ts` | Real production implementation and independent public/table coverage diagnostics; raw direct/inherited/merged additions must identify the missing method. Generic laundering is compiler evidence only. | Fresh compiler hosts/programs and source reads per variant. | Exact production contract/implementation mutations and current source aliases, hashed by the enclosing producer. |
| `tests/round11-surface.test.ts` | Actual compiler properties/runtime own keys, exact optional non-read exception, actual private function identities, all 80 descriptor routes, and frozen mutations. | Fresh actual services and model commit, isolated counters and objects. | Extracts the actual original guard; uses each real service predicate and actual wrappers from the other modules. |
| Retained construction, policy, native-copy and consumer tests | Exact refusals/required/observed/replica fields, complete tuple masks, actual Symbol identity equality, consumer diagnostics, and exact foreign guard failure. | Fresh source copies, model commits/publication, UUID scope/state and compiler programs. | Actual native factory/answering continuation and unmodified guard bytes; complete copied source and consumer preimages plus actual slot. |
| Existing rerun matrices | Preserve their semantic, oracle, transport, durability, full-payload, outage and feed assertions. Skips and expected-negative cases remain distinct. | Fresh fixture state, graphs and results in this review. | Exact selected files/source bytes, dependency lockfile and installed-Undici source identities, seeds/sizes, requested bases, endpoint, commands and actual heavy reservation. |
| `round11-log-parser.mjs` and `round11-seal-final.mjs` | Reopen receipts/logs/results, recount explicit gate specifications, inspect mutation/error bytes, compare 104 full payloads and independently validate chained log CRCs plus actual retirement tuples. | Current attempt only, verified timestamps/nonces, no reused summary output. | Exact retained source revisions, input/receipt/result hashes, transaction identities, producer owners and the seal's own source/owner bytes before/after. |
| `round11-finalize.py`, manifests and this report | Rehash sealed observations, check actual native values, source and log bytes, inspect exact owned processes and lock PIDs, then inventory every retained regular file. Report adopts only the selected bounded results. | Runs after the gates and seal; exclusive final/manifest outputs and fresh process/free-space observation. | Summary/self/source/result hashes, actual finalizer heavy owner, exact owned worktree/paths, complete byte manifest and separate symlink inventory. |
| Scoped failed-run abort record | Operational outcome only: exact commands/fixture arguments, failed JSON prerequisite, actual signals and all three PIDs gone. It produces no semantic PASS. | Fresh process listing and post-signal check; failed output already exists. | Explicit three owned PIDs and unique fixture/worktree arguments; no engine or unrelated process targeted. |

## Limits / handoff

No main-checkout edit or merge, push, package publish, deployment, dependency install, engine lifecycle operation, or contract re-pin. No root `pnpm check`, package packing/clean-consumer qualification, other-engine validation, production-scale workload, or performance acceptance is claimed. QLever typechecking uses current-core source aliases, not stale generated declarations. These focused results do not close the ten-goal or golden-scenario ledgers.

**Open questions:** none blocking the requested default-off integration. Performance, full release/package qualification, and any future operation's authored semantics remain separate work.
