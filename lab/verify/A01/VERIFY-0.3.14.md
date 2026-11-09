# Contract 0.3.14 adversarial review — CX-VA01-0314

North star: correctness floor for P1–P5; exact public values and typed refusal before a per-subject commit. Goals and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`.

**Verdict: FIX-FIRST. Two reproducible integration defects remain in the opt-in QLever broker.** The literal contract compilation and source re-pin review pass. Required gate results are listed below; passing offline gates do not cover the two failed reviewer probes.

Reviewed builder tip: `bed67f1f`. Integration/re-pin merge: `a317c52b608f98ce2c200e0a2bbd6d1694729e4c`. Fresh final checks use reviewer source `549cb5c94644a1dc4b8075d711242cc18f8ae80f`, including current main at dispatch/check time `6ce5adb1f2228cae24d4bb20b5c681dd954d2c8f`. Both evaluator assertion files are unchanged. The main merges contribute notebook/state changes only. Product, acceptance, gate, and skip-list bytes are identical to the reviewed builder tip. No reviewed code was fixed.

## Findings

### F1 — P2 / medium: broker fails the GS12F typed integer-range refusal

**Locations:** `packages/qlever/src/broker/BrokerStorageAdapter.ts:727` (returned adapter omits `valueDomain`), `:532` and `:549` (packing rejects and wraps); `packages/core/src/store/TriplesLive.ts:120` (fallback domain).

With the broker enabled, `makeQleverStorageAdapter` returns the broker adapter before A0's `valueDomain: ValueDomains.qlever` declaration. The broker advertises integer support but supplies no domain. Core therefore preflights against the memory signed-64-bit range. A canonical integer outside QLever's narrower range reaches `packValue`, which throws `InvalidTripleError`; the broker converts it to `WriteError`. Callers cannot handle the promised typed validation error directly.

Fresh reproduction:

```sh
python3 lab/verify/A01/0314/run.py reproduce-F1 node_modules/.bin/vitest run merged-value-domain.test.ts --config lab/verify/A01/0314/vitest.config.ts
```

The real SQLite broker and public `Triples.transact` path are used, with a transport-identified offline replica fixture. A write of `576460752303423487` commits and its command receipt resolves. Writes of `576460752303423488` and `-576460752303423489` both return `_tag: WriteError`, whose cause is `_tag: InvalidTripleError`. The probe expected `InvalidTripleError` and fails. The broker position stays 2048 and no invalid-command receipt exists. A0 declares `qlever`; the broker domain is null. This is a typed-error regression, with no observed partial write or precision loss.

**Proposed fix:** declare `ValueDomains.qlever` on the broker adapter so public validation runs before the transaction, and preserve typed validation errors at the codec boundary. Add broker-mode coverage for `assert`, `assertBatch`, and `transact` at both exact integer boundaries and just outside them. The existing live GS12F QLever suite constructs the default A0 runtime; broker-off G0 does not cover this composition.

Evidence: durable `value-domain-frozen-753d1d96-a3ae-48a1-9b89-da8396f4afb0/command.log` and `p2q/observations.json`. The source is [merged-value-domain.test.ts](0314/merged-value-domain.test.ts).

### F2 — P2 / medium: valid maximum-depth JSON fails while packing the generated journal

**Locations:** `packages/qlever/src/broker/BrokerStorageAdapter.ts:532`; compare `packages/qlever/src/QleverStorageAdapter.ts:425` and `packages/core/src/ValueDomain.ts:261`.

GS12F grants generated `:_tx/` values a journal nesting allowance through `storedValueDomain`. A0 passes that domain to `packValue`; the broker still calls `packValue(input.value)` with the plain QLever domain. A valid user's JSON fits the declared maximum depth but its generated change envelope does not, so the transaction aborts with a generic write error. Declaring the broker's `valueDomain` alone does not fix this defect: the original user value is already valid in the QLever domain.

Fresh reproduction:

```sh
python3 lab/verify/A01/0314/run.py reproduce-F2 node_modules/.bin/vitest run broker-envelope.test.ts --config lab/verify/A01/0314/vitest.config.ts
```

The probe constructs nested JSON at depth 120 and at the advertised limit 128, independently requires both to pass `invalidValue(value, ValueDomains.qlever)`, and submits both through public `Triples.transact` on a real SQLite broker. Depth 120 commits and resolves its receipt. Depth 128 returns `WriteError` caused by `InvalidTripleError`, leaves the position unchanged and creates no receipt. The rejected value is the generated JSON object containing `op`, `tripleId`, `entityId`, `attribute`, and `value`, rather than the user's original `{next: ...}` object. The declared journal allowance is 16.

**Proposed fix:** encode broker rows with `storedValueDomain(ValueDomains.qlever, input.attribute)`, consistently with A0, while retaining the ordinary user admission limit. Add a broker-mode public write/receipt/readback regression at maximum JSON depth and verify that a depth beyond the public maximum still refuses typed.

Evidence: durable `envelope-probe-7f23613b-76a2-49ec-a255-47563cc684da/command.log`, `p2q/envelope-observations.json`, and its exact `p2q/probe-source.ts` preimage. Source: [broker-envelope.test.ts](0314/broker-envelope.test.ts). This supplemental reviewer file was untracked when executed; its copied bytes and SHA-256 are checked explicitly, alongside the committed SUT identity. It is committed with this report.

## Requested contract checks

1. **Literal authority and holds:** Q96a–d and Q97a–c match the original Git `RULINGS-PENDING.md` at `3e8afadd` character-for-character in the human ruling table and in the generated ruling text. Topic, literal rule and basis also match in both generated lane-rule policies. The captured pending authority is byte-identical to that Git blob. Every other pending row is preserved. All 54 pending IDs remain pending, including Q78e, Q86g, every Q89/Q90/Q92/Q95/Q98 entry, and Q94a. Q96d retains its original historical review-awaiting sentence; the separate `rulingReview0314` binds the completed `4155fda7` D1 review without broadening the host/profile conclusion. No requested hold is promoted.
2. **All pin forms:** the independent recursive scan covers keyed whole-file hashes, `{path|file, sha256}` records, case-source/pinnedSourceFiles projections, oracle maps, transitive input hashes, recursively followed pinned SHA256SUMS manifests and engine image pins. It finds 247 current referenced existing paths; the builder's base inventory has 243, before the four added authority/review inputs. No changed core package file's old or new whole-blob SHA appears anywhere in active acceptance Python/JSON/Markdown, and following checksum manifests adds no changed core pin. The package hash search finds only `packages/testkit/src/index.ts`. Historical GS12F receipts/source inventories and diagnostic paths are not active source pin declarations. Earlier notes that core needed re-pinning are unsupported by this contract's active pin graph.
3. **Atomic source re-pin and workload:** all three live projections — O-TESTKIT, CS-U44.pinnedSourceFiles, caseSourcesPinned.CS-U44 — and the changed testkit source occur together in merge `a317c52b`, which has both implementation and both review tips as parents. The only hunk adds `export { exactIntegerLimitCase, valueLimitCases } from "./valueLimits.js";`. Existing conformance bodies, data, schedules, measured operations and native workload files are unchanged by that hunk. No later product source edit occurs. The exact diff and all pin origins are retained in the independent audit. All 35 current transitive input hashes match the observed bytes; standalone regeneration confirms generated artifact/hash consistency. Image pins remain unchanged and match `lab/config/slots.json` for all three lanes.
4. **Conflict resolutions and defaults:** parent-by-parent diffs confirm runtime/index.ts contains the INT-Q ReadSurface/isTriplesRead exports and GS12F ValueDomain exports; StorageAdapter.ts contains both optional snapshotReadPolicy and valueDomain fields. The broker factory remains opt-in through an explicit option or QLEVER_COMMIT_PATH=broker plus a named broker directory; an absent/empty/marker setting keeps A0. The public optional-field conflict resolution is correct. F1 and F2 show that the combined broker path still needs GS12F integration work despite those correct textual resolutions.
5. **Early Q89b compatibility:** no contradictory compiled obligation was found. H1's worker refuses any present recordedAt, including zero, and HostLog maps that sentinel to H1BasisUnsupported. BrokerStorageAdapter bypasses H1 for history or record-time bases and uses the complete persisted source where necessary. G8.composition.watermark-routing requires eligibility and an eligible fallback; G7.composition.ack-and-routed-ryow requires exact RYOW by eligible routing, rather than every index answering every basis. The other temporal/snapshot obligations constrain the composition's answer. Q97a explicitly names exact-route refusal. Q89 remains pending. This review does not close Q89c's broader future-position behavior or treat an empty ineligible result as acceptance.

### Moved source pin

| Path | Previous SHA-256 | 0.3.14 SHA-256 |
| --- | --- | --- |
| packages/testkit/src/index.ts | cb89a55ced5426b8fa0af3523fbbeb73870e61e3622ebb42e8a78c3e67da8d28 | 2c26c678577f98a71003588c7c62b9a81ff6d109a033c72c521f295f4cb2ffdd |

The independent audit additionally records automatic version/input hash changes for RULINGS-PENDING.md, RULINGS.md, budgets.json, build_contract.py and load-contract.json, plus the three newly created authority/diff inputs. These are regenerated contract metadata, and their exact old/new hashes and origins are in durable `audit-b3ca8b54-9572-46ed-9d0b-c779d8ba8279/pins.json`. No source pin moved without its reviewed re-pin. The reviewer made no change to `lab/acceptance/`.

## Fresh required gates

All final required gates execute on frozen reviewer head `549cb5c9`; `--verify` is a separate invocation. Commands and raw bytes are retained, with fresh UUID attempts, timestamps, before/after source hashes and offline slot identity. First preliminary attempts are retained separately. No failure was rewritten as a pass.

| Gate | Fresh reviewer result |
| --- | --- |
| Standalone build_contract.py --verify | Six generated artifacts byte-identical, exit 0 |
| Contract tests | 23/23, OK |
| Mutations | 519/519 caught; 607 catalog, 88 retired anchors; all 21 new-ruling controls executed |
| Q87 evaluator | 108/108; zero failures, skipped, cancelled or todo; main 6ce5adb1 included |
| XTDB offline G0 | 1,223/1,223; 140 expected skips; zero unexpected/failures; G0-xtdb-20261109T061652Z-1883ce |
| Datomic offline G0 | 1,258/1,258; 66 expected skips; zero unexpected/failures; G0-datomic-20261109T061848Z-d271d6 |
| QLever offline G0 | 1,396/1,396; 79 expected skips; zero unexpected/failures; G0-qlever-20261109T062110Z-3322b6 |
| F1 reviewer probe | FAIL as expected for reproduced defect; both out-of-range values wrapped |
| F2 reviewer probe | FAIL as expected for reproduced defect; valid maximum-depth value aborted |

The first fresh mutation run on `bc9c1565` also caught 519/519 (607 catalog, 88 retired anchors). It is kept; the final run uses the frozen source above. Each of the seven new rulings has executed literal-weakening, missing-consumer and absent-compiled-row controls. A mutation counts only when the generator returns nonzero with CONTRACT INVALID; a crash is not a caught mutation.

Contract transitive hash: `266e66f537cd27f462a01f6bf18c9ee7be3f3915bc5bdb61c03554a41d55a718`. No obligation is closed or engine/performance acceptance granted. All G0 receipts are diagnostic offline runs with slot null.

## Evidence and verification audit

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-0314/`. [SUMMARY.json](0314/SUMMARY.json) indexes exact final execution directories, receipt/log hashes, source head and fresh G0 counts. [DURABLE-SHA256SUMS](0314/DURABLE-SHA256SUMS) seals all durable bytes. The durable manifest covers 2,012 files / 76,076,808 bytes. Raw/oracle/build directories remain outside git. Each G0's raw output, referenced objects and every built file were copied and rehashed immediately after that lane completed, before the next lane build. A later build cannot substitute for the captured build bytes.

[run.py](0314/run.py), [audit.py](0314/audit.py), both independent probes and [seal.py](0314/seal.py) are reviewer-owned. The final sealer rechecks raw semantic summaries and all retained checksum entries rather than accepting exit codes alone. Setup used pinned pnpm 10.11.0, frozen/offline with `/Users/sam/projects/triplex-db-2/.pnpm-store`. Every heavy command used heavy.mjs and started above 5 GiB host free space. No engine/container lifecycle operation or exclusive slot was used. G0 used the existing gate-local pnpm adapter; its unchanged package scripts, Vitest calls and expected skips are bound by the source inventory.

PASS/verdict audit before the report commit:

| Place | Content checked | Freshness | Binding |
| --- | --- | --- | --- |
| run.py execution facts and capture_g0 | Actual command exit/log digest; copied raw/object/build bytes checked against hashes; no semantic PASS is invented | New UUID directory, start/end, before/after tracked input equality | Exact Git head, command, all tracked source hashes, offline slot null; copy before subsequent build |
| audit.py assertions | Original Git ruling rows, consumers, holds, recursive pin graph, current input hashes, exact source diffs, all three testkit projections and image identities | Reads this review checkout and immutable base/merge objects in its own invocation | Exact Git blobs, path/hash origins and merge parents; no engine qualification |
| merged-value-domain.test.ts | Real successful boundary commit/receipt plus both actual erroneous typed results, position and missing receipts | Fresh unique scope and SQLite broker directory | Current reviewed product source, committed probe, recorded domain declarations; offline fixture |
| broker-envelope.test.ts | Domain-valid depths 120/128, actual successful control and failing generated envelope, positions/receipts | Fresh scope and SQLite broker directory | Exact supplemental probe preimage/hash plus committed SUT; no live engine claim |
| Inherited contract tests/mutations, Q87 and G0 | Their actual assertions and raw summaries; mutation refusal requires CONTRACT INVALID; G0 skips match reviewed names | New command executions/fixtures/receipts | Frozen source, copied oracle/build bytes and slot-null offline identity; unchanged evaluator assertions |
| seal.py and SUMMARY.json | Exact logs, all input hashes, gate exits plus unittest/TAP/mutation content; independent G0 raw Vitest/TAP/oracle count reconstruction and allowed skip names; both failed probes' structured observations; all durable hashes | Final executions after source commit, monotone start/end, retained first runs distinguished | Tested head/main ancestry, current source maps, exact copied probe preimage and offline slot null |
| This report's FIX-FIRST verdict | Two concrete observed regressions and the checks above | Uses this review's final attempts | Reviewed bed67f1f/product bytes and explicit tested head; no promotion or obligation closure |

The first pin-audit attempt stopped on a newly added path absent at the base commit. That setup failure is recorded in the tool transcript; no durable raw output or gate result is claimed for it. The reviewer tool now distinguishes new inputs and records them explicitly. A preliminary F1 probe was run before the probe source was committed; its later frozen execution is the evidence used for F1. No SUT fix or expectation relaxation occurred.

Not performed: code fixes; live G1+ or GS qualification; target-scale/performance runs; root pnpm check; package packing; physical power-loss, erasure or tenant-isolation qualification; external backend integrations; deployment, publishing, merge into main or push. The broader pending rulings stay pending. Open work: fix F1 and F2, add broker-mode GS12F coverage, and independently rerun the affected gates/probes before accepting this integration.
