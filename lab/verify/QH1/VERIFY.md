# CX-VQH1: EXP-QH1 rounds 2–3

**Verdict: FIX-FIRST.** Reviewed `7965540b857cc2ea063a79f227410edd0ef3fab2` on `verify/QH1`, including product commits `8beae888` and `4b066bc9`. One high-severity correctness defect: the new public `Triples.reach` fallback can combine different commit cuts. This is independent of the already disclosed P4 miss (677 versus 1,100 pulls/CPU-s). No product code was fixed or changed by this review.

North star: the exact-cut correctness floor for P1/P4 in [SCOPE](../../SCOPE.md), [NORTH-STAR](../../NORTH-STAR.md), and [TARGETS](../../TARGETS.md). This is an offline code/evidence review, not promotion or engine-attached qualification.

## F1 — High: fallback reach does not capture a commit position

**Location:** `packages/core/src/store/TriplesLive.ts:562–567`; related basis selection at `packages/qlever/src/broker/BrokerStorageAdapter.ts:280–287`.

`resolveTemporalBasis` fixes valid time and optional record time, but supplies no `recordedPosition`. When `getReachTriples` declines the request, `reachBy` calls `entitiesAt` separately for every level with that unresolved position. The QLever row route resolves `broker.head()` on each call unless a transaction or explicit `withCurrentPull` context already pins it. The outer snapshot policy does not install such a context: it checks availability and masks retirement metadata, but does not freeze the answering continuation's basis.

Reproduction uses real public writes, with a scheduling hook after the real root read returns (the hook preserves every returned byte):

1. Commit position 2048: `root -> target`, `target.value = 1`.
2. Start `T.reach(root, { validAt: 2000 })`, with H1 off. After the root level, atomically retract that root reference and the old target value, and assert `target.value = 2` in position 3072.
3. The pull returns `root -> target` together with `target.value = 2`. No commit cut contains this graph: at 2048 the value is 1; at 3072 the root has no reference and the closure is empty.
4. The same result occurs with H1 enabled and `recordedAt: 1000`, when both public commits have timestamp 1000. This request deliberately takes the record-time fallback. A fixed timestamp does not disambiguate same-instant commits.

The committed reproduction is [review-adversarial.test.ts](review-adversarial.test.ts), test `public commits alone reproduce the fallback's mixed-cut closure`. It uses `T.transact` for both commits, not private log or publication mutations. Additional direct-log boundary cases reproduce both paths; an explicit position-2048 `withCurrentPull` control returns the coherent old value 1. The opt-in whole-worker current route itself was not shown to mix cuts.

Fresh observed witnesses, including both positions and returned fields:
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQH1/public-witness-0f644d26-e271-490f-8548-d2eb0f95977c/mixed-cut-witness.json`.

**Proposed fix:** capture a backend-appropriate exact record position once for the entire public pull, preserving transaction/staged-read semantics, and thread it through the direct attempt and every fallback level. Apply the same guarantee to the new KV implementation (`packages/core/src/kv/layers/KvTriplesLive.ts:712–720` also supplies only the resolved time; that backend was inspected, not separately reproduced here). Add a commit-between-levels regression requiring a whole old or whole new graph, including same-timestamp commits and the record-time fallback. The current reviewer tests intentionally assert the defective result so a green reproduction is evidence of F1, not semantic acceptance of `reach`.

## Requested checks

### 1. Full-field equality and independence

The retained 100,000-pull equality observation is supported for the stated static W0 fixture. I rehashed all **849** R3 manifest entries, required exactly 100,000 sequential request indices in the reference, compared all five candidate files (`s1`, `s2`, `s3`, `s4`, `final`) line by line, and obtained **zero mismatches** for each. I independently recomputed their retained core/QLever dist tree hashes and checked `arm.json`. The R2 manifest also authenticates `arms/arms.json`; its baseline dist hashes recompute and its QLever package resolves to its own retained baseline core.

The reference imports the retained HS01 build, which has neither `reach` nor H1, and runs a hand-written BFS over its public `T.entities` row route. It does not call the candidate H1 decoder/worker or use candidate answers as expectations. Both sides use the same index-derived request function, canonicalize every enumerable public Triple field (including Option JSON representations), sort by ID, and compare digest, row count and hop count. The digest is SHA-256 truncated to 128 bits. It validates field equality on these inputs, not arbitrary IEEE patterns or output-array ordering.

This is **row-route equivalence, not an independent Python oracle**. The report accurately distinguishes it from the separate fresh Python O-REPLAY fixture. The 80/15/5 mix is 80% current recorded state with varying valid times, 15% at the only W0 record instant, and 5% just before it. Public `TemporalBasis` has no position field; replacing those historical requests with an ignored position field would have been unsound. The record-time requests intentionally exercise fallback. The static workload does not exercise a writer between BFS levels, so it cannot refute F1.

`route.test.ts` freshly passed with both QH1w and QH1r registered. Its fixture supplies actual position cuts and covers the horizon/refusal cases; the fixture's offline fold is a route reference, not an independently implemented database oracle. QH1r reconstructs record position from the fixture's ID map because public Triples omit that field; it independently checks values and other observed fields but does not prove that an echoed position came from the adapter. The separate Python fixture freshly completed 100,000 pulls, zero mismatches, with its stated 30-root coverage.

Retained store clones are explicitly excluded from the builder's manifest, as disclosed. I did not reopen or mutate those stores, or claim a fresh rerun of the five large W0 comparisons. Current-tree source tests and new boundary reproductions are separate fresh executions.

### 2. Step 4b unguarded names

No additional wrong-answer input was found for the fast-statement/guarded-rerun change. Each removed guard only replaces a BLOB dictionary value with NULL. If that projected value is a BLOB, SQLite `json_array` throws `JSON cannot hold BLOB`; the guarded statement reruns in the same production reader transaction. Other errors are rethrown. Projected non-BLOB values have identical expressions on both paths. Packed IDs are still explicitly converted to hex.

The reviewer matrix isolates all six dictionary projections (`e.name`, `a.name`, `ref.name`, `c.s`, `y.s`, `te.name`) using lone-surrogate names. For each, a fresh worker with only the guarded rerun replaced by a sentinel fails with that sentinel, establishing that the fast statement actually triggers the rerun. The unchanged worker preserves the complete original verbatim envelope. The invalid surrogate ref payload is rejected by the read-side value-domain check, as required, rather than accepted as a valid ref. Metadata names preserve their original bytes. The existing dictionary/public and 100,000-value tests also pass.

This is a targeted input matrix plus expression/transaction inspection, not a proof for corrupt or externally rewritten SQLite files.

### 3. Q105b precision

The existing tests freshly pass for 3,000 finite IEEE samples through public `T.transact` -> `T.reach` and `T.entities`, including subnormals, MAX_VALUE, fractions and values around 2^53. The 100,000-value codec corpus still agrees with expected values/rejections and the row route. Integer-kind strings beyond 2^53 retain the existing exact-domain acceptance/rejection behavior; this review does not broaden QLever's integer range. Public -0 and non-finite refusal remains in force.

The additional reviewer test checks REAL `recordedAt`, REAL `validFrom`, REAL `validTo`, and numeric `2^53 + 2` by IEEE bits through **both public read APIs**, rather than only the adapter's direct method. It passes. The SQL integer shortcut is limited to safe integers; other numeric fields retain `%!.17g` transport. No new precision loss was observed.

### 4. Contract pin audit

The report explicitly says the contract builder must re-pin `packages/core/src/store/Triples.ts`. Its reported hashes recompute:

| Path | Old SHA-256 | New SHA-256 |
| --- | --- | --- |
| `packages/core/src/store/Triples.ts` | `7e5bd8c3e83e0d468912be4f01719d6bdd4f54c84c9bbc08ee0f10cdf05159c0` | `da3515b5013feae546c08cc6865a4b517292a0f5fcb0f679340d5aba2b20060d` |

I matched the complete changed `packages`/`lab/bench` path set against `pin-changes.json`, recomputed every old/new hash against base `2f7b42d6`, and rescanned all acceptance files for references. This is the only changed path referenced there; no additional pinned path silently moved. `lab/acceptance/` is unchanged relative to that base and throughout this review. Standalone `build_contract.py --verify` passes; that regeneration result does **not** grant authority to the new un-repinned API. This review adds no product/pinned-path changes.

### 5. P2 interpretation

I recomputed p50/p99 from all 350 retained raw latencies per arm in each of the seven runs. The candidate exceeds 1.10 in **2/7** runs; candidate ratios and A/A ratios match the report, including A/A range **0.846–2.229**. With the quantile index used here, about four observations determine p99. The assertion that one such run cannot reliably distinguish a 10% effect on this host is supported. A median near 1 and a noisy control do not establish non-regression; both failed attempts remain failures.

“No tail mechanism found” is supportable as a limited investigation result, not evidence that no mechanism exists. R3 mostly changes read work; this diagnostic compares the older v2 writer with the owner-key writer and performs no concurrent H1 reads. It therefore cannot measure reader/writer interference or a true application H1-on/off guard. The report's explicit storage-worker/application distinction is necessary.

**Measurement to settle it:** freeze the exact same source/builds, trace, hot set, cache/retention state and resource profile; run randomized balanced A/A and A/B blocks with the application's matched live readers and open-loop writer trace. Retain scheduled-offer-to-durable-ACK latencies and maintenance/queue/fsync observations. Use at least tens of thousands of commits per arm across multiple blocks (hundreds of tail observations), with enough predeclared repetitions for a block-aware one-sided confidence bound on the p99 ratio to resolve 1.10 and the p50 delta to resolve +0.5 ms. Require an A/A window that itself resolves the 10% margin; if it does not, report inconclusive and improve control instead of averaging away failures. Preserve per-size-band/progress/correctness checks. A diagnostic-only writer repeat cannot close application P2.

## Fresh execution receipts

All raw reviewer artifacts are under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQH1/`. [evidence-index.json](evidence-index.json) lists exact attempts; [SHA256SUMS](SHA256SUMS) binds their bytes. Each runner receipt records original HEAD/tree, command, Node version, free disk, source hashes, log hash, time interval and `slot: null`. Every heavy command used `lab/bin/heavy.mjs`; no new run was admitted below 5 GiB free. No Docker/engine lifecycle operation, engine reservation, prohibited port, main-checkout edit, merge or push occurred.

| Check | Result / authoritative attempt |
| --- | --- |
| Core suite | **854 passed**, `core-a3-b5183c7a-b3e1-40b0-8968-c70ac602c70e` |
| QLever suite after core build | **257 passed / 29 skipped**, `qlever-final-cdef05f8-22b8-4092-9fa8-988f4a7ddd9f` |
| QH1 semantic suite incl. `route.test.ts`, REAL, codec, replay and reviewer cases | **19 passed / 9 files**, `qh1-final-e79f0e8e-38b4-452b-bbc6-29a691f9a2ec` |
| Reviewer cases with durable public-commit witness | **6 passed**, `public-witness-0f644d26-e271-490f-8548-d2eb0f95977c` (passing boundary reproductions prove F1 exists) |
| Four prescribed mutants | **4 semantic rejections**, exit 1 each, no successful oracle/timing artifact; `mutants-45ff8f0e-3d59-4ecb-a999-d364ab90d567` |
| Contract `--verify`, its own command | **PASS**, `contract-verify-df7bd63e-4322-4fed-9617-d9e88ad43390` |
| Evaluator `claim.test.mjs` + `claim-round2.test.mjs` | **108 passed / 0 failed**, `evaluator-5befccf5-e8cb-4cd6-af17-83a94298cc75` |
| R3 hashes, retained comparisons/builds, baseline and pin/P2 audit | All asserted checks hold, `evidence-final-9902ed3c-784a-4a75-9852-bf7a16e825e7` |
| Reviewer tools | `oxfmt`, `oxlint --deny-warnings`, `git diff --check` clean |

All authoritative receipts above have `sourceStillMatches: true`. Product/contract source stayed at the reviewed committed bytes. Earlier failed attempts remain: pnpm run-option rejection; doubled Vitest config paths; QLever subprocess failures before core dist existed; first reviewer fixture errors (replica initialization stub, unpublished head, invalid fixture tx ID, and expected surrogate-ref rejection). These are setup/test-development failures, not product findings. `qlever-a4` passed but its broad source set changed while reviewer tools were being edited; the unchanged-source `qlever-final` supersedes it for binding. The install used the frozen lockfile and owned pnpm store; its log is retained. Core dist was generated by the normal build, never hand-edited.

## PASS / verdict / receipt audit (rule 9a)

1. **`review-adversarial.test.ts`:** content is exact returned closure/value/metadata assertions, including IEEE bits, the no-single-cut public-commit witness, guarded-rerun sentinel controls and a coherent pinned control. Freshness is a new owned UUID store/worker for each case; the final witness is written only after assertions from this run. Binding is to loaded committed product source, explicit roots/cuts/operations, source-hashed test/helper bytes and the command receipt. Public-write reproduction changes only scheduling, not read bytes. These tests certify observations/defect reproduction, not product correctness or performance acceptance.
2. **`review-evidence.mjs`:** content requires every listed R3 hash, exact line counts/equality, recomputed retained build hashes, baseline linkage/hash, full pin-delta coverage and recomputed quantiles. Freshness is a new audit attempt reading the retained bytes now; it explicitly does not relabel historical benchmark/replay runs as newly executed. Binding is manifest path + actual file bytes, R2/R3 arm manifests and exact source base/current hashes. No store mutation or authority is granted.
3. **`review-run.mjs`:** emits command observations, not semantic PASS. Content is actual closed log bytes and result; freshness is a new UUID directory and start/end interval; binding is reviewed HEAD/tree, arguments, Node, source hashes before/after, `slot: null` and log hash. Final runs also retain the reviewer tool preimages. Earlier version receipts hash tracked source only; original committed product bytes remain reconstructable from HEAD. Dependency qualification is not claimed beyond the frozen install/lockfile.
4. **Existing required gates:** semantic assertions and detailed counts were inspected, not inferred from exit zero. The mutant runner requires the named semantic failure and absence of timing/oreplay success. The independent Python corpus checks expected query coverage/content before emitting zero mismatches. Fresh attempt fixtures and before/after source receipts bind these executions to the reviewed tree. `--verify` is contract regeneration only, not a semantic/promotion verdict.
5. **This report/index/manifest:** FIX-FIRST follows the independently reproduced mixed-cut values. Test counts come from the fresh terminal logs; hash/P2 statements come from asserted byte/latency audits. The index identifies every earlier attempt, and SHA256SUMS is computed from retained files after completion. No P4/P2 or contract obligation is closed.

## Remaining work and limits

Fix F1 and rerun the commit-boundary tests with coherent expectations, including transaction behavior and KV/backend fallbacks. Contract re-pinning remains the contract builder's task. Application P2 and P4 qualification remain open. This review did not rerun the large W0 performance arms, a fresh 100,000-pull W0 reference/candidate generation, live engines/VM, writer-on NS windows, history-growth/100k rungs, package-consumer checks, full root `pnpm check`, or PostgreSQL/FoundationDB integration. No fix or automatic promotion was attempted.
