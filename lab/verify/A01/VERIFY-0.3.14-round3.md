# Contract 0.3.14 round-3 adversarial review — CX-VA01-0314

North star: the P1/P2 correctness floor, exact values and typed refusal before claims. Goals and targets come from `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.

**Verdict: ACCEPT for the named candidate merged with frozen main `bb36862d`. F1–F3 and B1 are closed at that merge. The original integration file remains FAIL (38/39); its memory timeout reproduces in the same-test GS12F predecessor. A literal same-file main baseline is unavailable.**

Reviewed candidate: `d117cdb349b100fe4451bfcfb422cb95b2db3d58`. The tested reviewer head is `c4eedaa5ccad4655a66db9b807de77e20d0c028e`. It includes the candidate and main `bb36862daf55b4f46a3cbf763f757c6341de4575`, current when this review froze its source. Both merges were clean. Product packages, integration tests, acceptance files, gate code and configuration at the tested head are byte-identical to the candidate. Reviewer changes are tools, fixtures and evidence under `lab/verify/`; no reviewed code, assertion, skip list or contract was repaired.

## Findings revisited

- **F1 closed:** the unchanged original reproduction commits the valid QLever signed-60 endpoint and resolves its command receipt. Both A0 and the opt-in broker declare `ValueDomains.qlever`. Positive and negative values just outside that domain return `InvalidTripleError`, without advancing the broker head or creating a receipt. There is no fallback `WriteError`.
- **F2 closed:** the unchanged original reproduction commits both depth-120 and depth-128 user JSON and resolves their receipts. Broker packing still selects `storedValueDomain(ValueDomains.qlever, attribute)`, so generated journal envelopes receive the declared allowance while user values keep their public bound.
- **F3 closed:** `test/integration/test/value-domains.test.ts:197` now uses Datomic's actual `packValue -> encodeRow -> decodeRow -> decodeValueColumns` path. Its stored-journal branch also selects Datomic's real codec. All four selected Datomic integration cases pass; the exhaustive `Record<keyof typeof ValueDomains, ...>` remains intact and the full integration typecheck passes. Production packing validates the named Datomic domain, its adapter selects the stored attribute domain and preserves typed refusal, and gateway decoding validates the actual stored row. The 19 public lane-D boundary cases are checked in Datomic G0, including assert/assertBatch/transact, literal signed-64 endpoints and refusals outside them, depth 128/129, receipts/readback and direct SPI refusal. These use a local HTTP fixture and the real client/adapter; they do not qualify native Datomic storage or durability.
- **B1 closed for the frozen merge:** main's pending rows are preserved verbatim. Q99a–e, Q99-S1, Q100a–p, Q100-S1 and Q101a remain pending, with their exact IDs and no Q99/Q100 truncation. The generated contract contains 78 pending IDs. Q96a–d and Q97a–c remain compiled; the earlier Q78e/Q86g/Q89/Q90/Q92/Q94a/Q95/Q98 pending groups remain pending. The fresh evaluator executes 108/108 on the actual merged head, satisfying Q87 for this frozen main.

The independent omitted-domain control again compiles a complete StorageAdapterService assignment, then removes only `valueDomain` through object rest and assigns to the same interface. The actual compiler rejects the latter with TS2741, “Property 'valueDomain' is missing”. It uses no expected-error directive and changes no product source. The fresh AST inventory scans 1,052 tracked TypeScript files, records 19 explicit domain properties and 65 adapter provider calls. XTDB, QLever A0, broker, Datomic, DuckDB, SQLite, PostgreSQL and Cloudflare retain their concrete named domains; FoundationDB derives its physical limits from its concrete profile. The KV factory still propagates its physical backend domain, with the existing memory default on the separate KV-backend API. Testkit consumes the supplied adapter; active test doubles use their actual enumerated or memory fixture domain. No new placeholder was introduced. Only Datomic production files changed since round 2; the earlier domain inventory's implementation reasoning remains applicable. Historical casted partial lab recipes are not newly qualified adapters.

## Memory timeout: what the comparison establishes

**Known failure, P3/test budget:** `test/integration/test/value-domains.test.ts:314`, “memory accepted endpoints survive journal, callback, get and receipt without conversion”. The fresh original file is still **FAIL, 38/39**, with this sole test exceeding its unchanged 5000 ms limit. The four Datomic cases pass. This is not a full integration PASS.

There is a material problem with the requested literal main baseline: main `bb36862d` has neither this integration file nor `ValueDomain.ts`. Its KV runtime does not support integer values. Calling this an already failing main test would be inaccurate.

The reviewer therefore preserved the exact test body, `valid` generator and nesting helper from the committed file in a reviewer-owned fixture, and compared it with real archived runtime sources. TypeScript AST extraction requires those three components to match the historical GS12F test at `f8d1c3da0a871f4c9c724ebae09e380dbb9222a8` byte-for-byte. The memory domain constructor is unchanged there; its only subsequent catalog change is the Datomic entry. The body SHA256 is `071c2e9b56e4667eca1d58dfdbce832bdb565f82dc88a7a66c425c0e8728f09d`; fixture SHA256 is `b014e599afe4a8935154dce1b75a30f84970a668533cdd9f73ad5169bb0357ff`. The fixture uses one worker, the same value sequence and assertions, and a 5000 ms limit.

| Actual runtime / unchanged workload | Fresh result |
| --- | --- |
| Reviewed merged head | 5000 ms timeout |
| Historical GS12F `f8d1c3da`, same committed test body and generator | 5000 ms timeout |
| Frozen main `bb36862d`, transplanted same workload | `WriteError: KV runtime does not support integer values`; not a timeout |
| Historical runtime, separate explicit 30000 ms completion diagnostic | Pass, process duration 7.04 s |
| Reviewed runtime, separate explicit 30000 ms completion diagnostic | Pass, process duration 9.35 s |

This demonstrates that the timeout exists in the GS12F input before the contract and F1–F3 repairs; it is not introduced by round 3. It does **not** establish that the original file times out on main: that file is absent, and the identical transplanted workload encounters main's unsupported-integer behavior. The longer-limit runs establish eventual completion of the same assertions only. They do not replace either original 5-second failure, certify a performance comparison, or change any requested gate's result. Shared heavy-job contention is retained in the logs, so these durations are not a controlled performance measurement.

Reproduce using `run.py` with the original integration command below, or the committed `memory-{branch,historical,main}.config.ts` fixtures. The exact historical/main core archives, all file hashes before/after, root compiler configs, dependency links, test preimages, actual commands and logs are retained. The same pinned Effect 4.0.3, ulidx 2.4.1 and Vitest 5.0.4 toolchain is used; the package/core manifest and workspace catalog agree across these sources. Early snapshot setup failures (missing inherited compiler config, then missing local ulidx link) ran zero tests and are preserved separately. No failed setup attempt counts as a timeout or product defect.

**Proposed follow-up:** profile this large endpoint/journal workload and give its test a justified budget or reduce the implementation's cost while preserving all endpoint assertions. This review leaves that existing GS12F test-budget issue open; it does not invent a product latency bar. The literal same-file main comparison cannot be verified from a main tree that lacks the test and feature.

## Pins and pending authority

The fresh audit walks active JSON path/hash maps, file records, case-source projections, checksum-manifest expansions and transitive inputs, alongside whole-blob hash searches for changed product files and the contract's image-pin validation. It finds 247 referenced paths and no moved product-source pin or old/new whole-file hash hit for the changed source files. All 35 transitive input hashes match actual bytes. Historical testkit pin projections are unchanged; no image pin moved.

“No active pins moved” needs the builder's stated qualification **product-source pins**. Two generated contract-input identities changed since round 2, and are correctly regenerated and already documented by the builder:

| Input path | Old SHA256 | New SHA256 |
| --- | --- | --- |
| `lab/acceptance/RULINGS-PENDING.md` | `a68a15db304eebadd1a05d34b363fc957d95e805d68a627326fd59edb8a3a237` | `9ff9fc9a0041d271205e2a019d57e53c23cfba9b392e60d68e1a256df6f71f3c` |
| `lab/acceptance/build_contract.py` | `6f533cc044d3620dafdd4e96b57a7fd5b71bd8179abb7ca93daeaf1af7c87639` | `259b0c2985985fbdf2c79d1ad6379c2adb6d919d45611b63bf7002502d2499e6` |

The pending additions and suffix-preserving parser/self-check do not change a measured workload, threshold or obligation. They do not silently promote pending prose. The current transitive contract hash is `b679f42872ebc6625a43b2ebe8a2769a72f0782fde1aa85c4a9a7d21aa3b5254`. The reviewer made no re-pin or acceptance edit.

Main advanced after this review froze: `ec77f679` adds pending Q100q/r, followed by further main activity recorded in each execution's `main` field. Those later additions are outside this tested merge. This verdict does not approve a future merge or its regenerated metadata; the builder must preserve later pending rows during the next reconciliation. The fixed source/main identities above, rather than a moving ref name, define this review.

## Fresh execution results

Every listed semantic result is independently executed on `c4eedaa5`, with unchanged tracked source before/after. The standalone verifier was its own command, not a side effect of regeneration.

| Check | Result |
| --- | --- |
| `python3 -I -B lab/acceptance/build_contract.py --verify` | Six generated artifacts byte-identical; second regeneration byte-identical |
| `python3 -B lab/experiments/EXP-A01-acceptance-contract/regressions/test0314.py` | 24/24 |
| `python3 -B lab/experiments/EXP-A01-acceptance-contract/regressions/negtest0314.py` | 520/520 caught; zero misses; 608 catalog / 88 explicitly retired anchors; literal/consumer/compiled-row controls for all seven newly compiled rulings |
| `node --test lab/bin/test/claim.test.mjs lab/bin/test/claim-round2.test.mjs` | 108/108 on the frozen current-main merge |
| Original F1/F2 reproductions | 2/2 |
| Independent omitted-domain compiler control | Complete assignment passes; omission rejected with TS2741 |
| `node_modules/.bin/tsc --noEmit -p test/integration` | Pass |
| Datomic-only exhaustive integration selection | 4/4; 35 nonselected tests skipped |
| Original full integration value-domain file | FAIL: 38 pass, sole 5000 ms memory timeout |
| XTDB full offline G0 | 1223/1223; 140 expected skips, zero unexpected; `G0-xtdb-20261109T082321Z-f33e39` |
| Datomic full offline G0 | 1277/1277; 66 expected skips, zero unexpected; `G0-datomic-20261109T083413Z-adabe2`; includes all 19 new boundary cases |
| QLever full offline G0 | 1415/1415; 79 expected skips, zero unexpected; `G0-qlever-20261109T083756Z-58c466` |

The original full-file command is `node_modules/.bin/vitest run --root test/integration --config "$PWD/test/integration/vitest.config.ts" test/value-domains.test.ts`. Datomic-only adds `-t datomic --reporter verbose`. Each command is invoked via `python3 lab/verify/A01/0314-round3/run.py <label> ...`, which uses the required heavy wrapper. The first full integration typecheck failed on a missing local DuckDB-to-core workspace link, then passed after restoring that package.json-declared dependency link. No lockfile or package manifest changed. Necessary dependency package builds and all setup failures remain separately indexed.

## Evidence and observation-to-verdict audit

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-0314/round3/`. Committed [SUMMARY.json](0314-round3/SUMMARY.json), [DURABLE-SHA256SUMS](0314-round3/DURABLE-SHA256SUMS) and the [index](0314-round3/INDEX.md) bind the actual attempts. Large raw output, source archives and copied build artifacts remain outside git. The completed sealer independently validates 19 required executions and seals 2,046 durable files / 121,507,649 bytes. Original round-1 and round-2 failures/reviews remain immutable.

| Result-producing location | Content check | Freshness check | Binding check |
| --- | --- | --- | --- |
| `run.py` / `capture_g0` | Actual exit, log digest and retained raw/object/build bytes; no semantic promotion from exit alone | Unique attempts, start/end, before/after source equality; new canonical G0 receipt | Frozen head, exact command and tracked input bytes; offline slot null |
| Original F1/F2 probes | Real public writes, typed errors, exact values, broker positions and command receipts | New UUID broker/SQLite scopes | Unchanged committed probes and the reviewed implementation |
| `domain-required.py` | Actual baseline compiler success and missing-field TS2741; exact fixture/log digests | Newly created independent fixtures and compiler processes | Actual required interface source hash; unchanged product source |
| `inventory.mjs` / `pins.py` | Actual AST declarations/providers, all pin origins and old/current bytes, exact pending rows and 35 inputs | Fresh checkout reads | Immutable base/main Git objects and current source; inventory alone grants no backend PASS |
| `prepare-timeout.mjs` and inline comparison runners | AST-equal test/generator/helper, actual Vitest result and explicit limit; setup failures stay failures | New archived-source snapshots, attempts and before/after checks | Exact runtime commit/archive/file hashes, fixed workload/domain bytes, common pinned toolchain and config/link records |
| Contract tests/mutations, evaluator, integration corpus/compiler and G0 | Actual unittest/TAP/Vitest assertions, CONTRACT INVALID for mutation catches, complete expected counts/skips and precise failure content | New executions after the frozen source; new G0 IDs | Exact test/contract/oracle/build preimages, source identity and offline slot; no native engine claim |
| `seal.py`, summary and manifest | Rechecks actual semantic content, expected failures, fixture/interface/log/input hashes, G0 raw counts/skips, every retained object/build byte and archive identity | Final named completed attempts; capture after each G0 before the next lane build | Candidate and frozen-main ancestry, exact tested head, source stability and explicit failed original integration result |
| This verdict | F1–F3/B1 conclusions plus the unreclassified 38/39 failure and unavailable literal main baseline | This round's independent evidence | Only the named candidate and frozen merge; no future-main, engine or target qualification |

Heavy commands entered with at least 5 GiB host disk free and used the lab's admission mechanism. G0s are full offline diagnostics with no engine slot; each build is captured and rehashed before the next lane builds. No engine lifecycle, resident restart, forbidden port, global cache, deployment, publish, main edit, merge into main or push occurred.

Not done: product/test/contract fixes; a full root check or package packing; native Datomic boundary or power-loss/durability qualification; live G1+/GS, target-scale/performance, erasure or tenant-isolation qualification; validation of main changes after the frozen merge. Open: the unchanged GS12F 5-second memory test budget and ordinary reconciliation with subsequently added pending rulings.
