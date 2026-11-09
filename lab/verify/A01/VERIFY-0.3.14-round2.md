# Contract 0.3.14 round-2 adversarial review — CX-VA01-0314

North star: P1/P2 correctness floor, exact values and typed refusal before claims. Goals and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`.

**Verdict: FIX-FIRST. F1 and F2 are fixed, and the required domain field rejects an actual omitted-field assignment. A new integration-corpus regression remains (F3), and the required current-main merge/Q87 validation is blocked by contract-file conflicts (B1).**

Reviewed builder tip: `651fdb77`. Fresh source tests use reviewer head `3618dd8372cd9f79fb4219359dd0dfaa577be5fd`, which includes the reviewed tip and builder's previously merged main `833ea552`. The current main merge attempted at `aa1225b14080f7496261cbf2332eee93adcb2a45` conflicts. Its exact inputs and unresolved output are retained; the merge was aborted without resolving or editing the reviewed contract. No product, contract, assertion, timeout or skip-list fix was made by this reviewer.

## Findings

### F3 — P2 / medium: adding the Datomic domain breaks the existing integration codec matrix

**Location:** `test/integration/test/value-domains.test.ts:187`; introduced by the new catalog key at `packages/core/src/ValueDomain.ts:107`. The keyed test loops are at `:219`, `:224`, `:228` and `:389`.

The codec table is declared as `Record<keyof typeof ValueDomains, ...>`. It has entries for the previous eight domains but none for the new `datomic` key. The unchanged loops enumerate the now nine-entry catalog and call `codecs[key]`. The Datomic endpoint round trip, typed invalid-value rejection, and dense-array/journal-depth checks consequently call undefined. TypeScript reports TS2741: Property 'datomic' is missing.

Reproduction (run through the reviewer collector/heavy wrapper):

```sh
python3 lab/verify/A01/0314-round2/run.py reproduce-F3 node_modules/.bin/vitest run --root test/integration --config "$PWD/test/integration/vitest.config.ts" test/value-domains.test.ts -t datomic
```

The full focused file ran 39 tests: 35 passed and four failed. Three are the missing Datomic codec failures; the fourth is an existing memory accepted-endpoints test timing out after its unchanged 5 seconds. That timeout is retained and is not attributed to the catalog change. A separate Datomic-only result is recorded below. A source typecheck also reports the exact missing-key diagnostic at line 187; its broader diagnostics include missing package builds/type context, so it is corroboration of F3, not a full integration typecheck result.

**Proposed fix:** add an actual Datomic codec mapping and boundary coverage to this exhaustive corpus, using its real encode/decode path and typed domain handling. Keep the test exhaustive and preserve its invalid-value expectations. Do not add an identity function, skip the new domain, narrow the catalog enumeration, or reuse memory as an unverified stand-in. Rerun this file and the integration typecheck. The existing three G0 lanes do not execute this cross-package integration file.

### B1 — current-main merge readiness / P2: pending-ruling metadata conflicts block the requested Q87 condition

**Locations:** `lab/acceptance/RULINGS-PENDING.md:125` (new pending rows follow this tail), `lab/acceptance/obligations.json` (input/pending/transitive metadata), and `lab/acceptance/ACCEPTANCE.md:7` (generated hash/rendering).

Merging current main at `aa1225b1` into the reviewed source returns nonzero and conflicts in all three files. Main carries Q99a–e, Q99-S1, Q100a–p and Q100-S1; the reviewed tip predates them. Main also still has Q96/Q97 pending where the contract branch has correctly compiled them. Choosing either whole conflict side would either lose the newly added pending rows or revive compiled rows as pending; generated hashes also differ.

Exact reproduction: merge `651fdb77` into the existing reviewer branch, then `git merge --no-commit --no-ff aa1225b1`. The retained `merge-main/merge.json`, both Git input preimages and `conflicts.diff` identify the actual attempted heads and all three conflicts. No current-main merged candidate was produced. The evaluator pass below is explicitly a reviewed-source result, and does not satisfy current-main Q87.

**Proposed fix:** the contract builder merges current main, retains every newly authored Q99/Q100 row verbatim as pending (including the Sam rows), preserves Q96a–d/Q97a–c as compiled, regenerates the contract artifacts, and reruns standalone byte verification, contract tests/mutations and the unchanged evaluator suite on that exact merged head. None of Q99/Q100 should gain compiled authority during this reconciliation. This is required before this review can certify the requested merge condition.

The preamble's explicit boundary applies: “Never edit lab/acceptance/ (rulings, generated files, pins, the contract version) unless your task is a contract version.” This is a reviewer task, so the unresolved contract reconciliation was preserved and returned to its builder.

## F1/F2 and compile-time controls

- **F1 closed on the reviewed source.** The original reviewer reproduction is unchanged. Both A0 and the broker report domain `qlever`. A valid `2^59−1` public transaction commits and resolves its command receipt. `2^59` and `−2^59−1` return `InvalidTripleError` directly; broker positions are unchanged and no invalid receipt exists. Source inspection confirms explicit broker `ValueDomains.qlever`, public preflight uses the required adapter domain, and the codec preserves InvalidTripleError.
- **F2 closed on the reviewed source.** The original depth-120/depth-128 reproduction is unchanged. Both valid public JSON transactions commit and resolve receipts. The broker now uses `storedValueDomain(ValueDomains.qlever, input.attribute)`, matching A0; user JSON retains the public 128 limit and generated `:_tx/` envelopes get the existing 16-level allowance. The package G0 also executes the builder's 19 added public integer/JSON/codec cases, including all three write entry points and depth-129 typed refusal.
- **Independent omission planted.** The reviewer creates a complete StorageAdapterService assignment outside product source and runs the actual TypeScript compiler: exit 0. A second fixture removes only valueDomain through object rest and assigns the resulting object to the same SPI: nonzero with TS2741, “Property 'valueDomain' is missing ... but required”. No @ts-expect-error is used in this independent control. The actual interface source is unchanged before/after; both exact fixture preimages, command lines, logs and hashes are retained. This verifies the new requirement directly, rather than relying solely on the builder's optional-field mutation or spelling check.

## Adapter/domain inventory

The independent TypeScript AST inventory scans 1,044 tracked `.ts` files, records 19 explicit property declarations and 62 StorageAdapter provider calls, and retains each file/line/expression. Providers that wrap or spread an actual factory result inherit that declared domain. Static counts alone are not used as semantic acceptance.

| Active implementation or fixture | Actual declaration / behavior |
| --- | --- |
| XTDB, XtdbStorageAdapter.ts:541 | ValueDomains.xtdb; existing concrete signed-64-bit domain |
| QLever A0, QleverStorageAdapter.ts:446 | ValueDomains.qlever; existing signed-60-bit domain |
| QLever broker, BrokerStorageAdapter.ts:740 | ValueDomains.qlever; added declaration plus typed/stored codec changes |
| Datomic, DatomicStorageAdapter.ts:311 | ValueDomains.datomic; explicit named signed-64-bit profile with the same admission limits/kinds as its prior memory fallback; no widened range or empty domain |
| SQLite, SqliteAdapter.ts:716 | ValueDomains.sqlite; unchanged |
| PostgreSQL, PostgresqlAdapter.ts:628 | ValueDomains.postgres; unchanged |
| Cloudflare, CloudflareAdapter.ts:657 | ValueDomains.cloudflare; unchanged |
| DuckDB, effect-storage.ts:221 | ValueDomains.duckdb; unchanged |
| FoundationDB, FdbKvBackend.ts:617 | Physical KV domain derives from ValueDomains.foundationdb with actual configured/subspace caps; unchanged |
| Internal KV transaction view, KvTriplesLive.ts:258 | KvBackendService, not StorageAdapterService; propagates physical backend domain with the intentional memory default |
| In-memory KV, InMemoryKvBackend.ts:274 | Separate physical KvBackendService API still permits omission; KvTriplesLive/hexastore use their existing memory-domain default. It is not a missing declaration on the required StorageAdapter SPI |
| Core pre-claim mock, value-limits.test.ts:19 | Explicit memory domain; matches the memory-range claim/transaction witness |
| Core initialization-failure mock, runtime.test.ts:226 | Explicit memory domain; fails initialize before operations, without pretending to be another backend |
| Integration test double, value-domains.test.ts:234 | Uses each actual enumerated catalog domain for public preflight; the codec-table defect is F3 |
| Testkit | Produces conformance effects, not a StorageAdapter factory; reads the supplied adapter domain. Its KV fallback remains the existing memory profile |

No new production adapter uses undefined, an empty object, an unchecked cast, or an unlimited stand-in for its required domain. The read-only intermediate broker view explicitly omits non-read fields from its intermediate check, then the complete returned adapter supplies and checks the mandatory domain. Historical standalone probes such as lab/scenarios/12-audit-march-3/probe.ts still contain casted partial objects and old ./src copy-relative imports; they are archival recipe inputs outside the active package fixtures, not newly qualified adapters. This review does not claim all historical recipes have been migrated.

Datomic's named profile is structurally derived through the shared domain constructor; its generic `sources` fallback still names the KV codec. That metadata is not used as proof of live Datomic representability. No live Datomic boundary qualification is claimed here; the missing real integration codec coverage must be repaired under F3.

## Pins and pending rulings

The independent scan re-enumerates all active JSON hash maps and path/file records, case-source projections, checksum-manifest expansions, transitive inputs and image pins. **247 referenced paths; zero moved active pins against bed67f1f; zero old/new whole-blob hash hits for the changed round-2 package files in active acceptance Python/JSON/Markdown.** The testkit index and its three pin projections are unchanged. All 35 recorded contract inputs match current source bytes. `lab/acceptance/` at this tested source is byte-identical to the reviewed tip and bed67f1f, with contract hash `266e66f537cd27f462a01f6bf18c9ee7be3f3915bc5bdb61c03554a41d55a718`. Therefore the round-2 source fix has no old/new moved-pin pair to report, and no re-pin is made by the reviewer.

The newer Q99/Q100 rows are preserved byte-for-byte in the retained main-side preimage. They are absent from the reviewed source's compiled ruling list and are not compiled by this review. Their preservation in an actual merged candidate remains B1, not a completed merge claim. The original 54 pending IDs remain intact at the reviewed source; no obligation is closed.

## Fresh gates and limits

Every completed source gate below runs at frozen reviewer head 3618dd83. The current-main merge attempt is a separate retained failed integration step. A source pass is not relabeled as a merged-main pass.

| Gate | Fresh independent result |
| --- | --- |
| Standalone build_contract.py --verify | Six artifacts byte-identical; separate invocation, exit 0 |
| Contract tests | 23/23, OK |
| Contract mutations | 519/519 caught; 607 catalog, 88 retired anchors; all seven new ruling triples executed |
| Evaluator on reviewed source | 108/108, zero failed/skipped/cancelled/todo |
| Q87 on branch merged with current main | NOT VERIFIED — B1 conflicts prevent the merged candidate |
| Original independent F1/F2 reproductions | 2/2 passed |
| Omitted-domain compiler control | Baseline compiles; actual omission rejects TS2741 |
| XTDB offline G0 | 1,223/1,223; 140 expected skips; zero unexpected/failures; G0-xtdb-20261109T071713Z-ae459c |
| Datomic offline G0 | 1,258/1,258; 66 expected skips; zero unexpected/failures; G0-datomic-20261109T072047Z-43cc8b |
| QLever offline G0 | 1,415/1,415, including 19 new broker cases; 79 expected skips; zero unexpected/failures; G0-qlever-20261109T072541Z-667fa9 |
| Focused integration value-domain file | FAIL: 35 passed, 3 Datomic codec failures and 1 separate unchanged 5-second memory-test timeout |
| Datomic-only integration reproduction | FAIL: the 3 codec cases fail, public preflight passes; 35 nonselected tests skipped; 423 ms, no timeout |

The first integration test command used a root-relative config path that Vitest resolved under --root twice, so it found no config. The corrected command uses an absolute config path. Both attempts are retained; the setup failure is not counted as a product defect. The narrow standalone tsc command also emits missing build/Node context diagnostics; only the exact missing Datomic Record key is cited. No source or timeout was changed to obtain these results. The final checksum validator was requeued while waiting for a heavy permit: its first wrapper exited 143 without running the validator, then the supported 100 ms polling mode admitted the same validation under the unchanged four-job limit. The completed seal checked all 14 named executions and records currentMainMerged:false.

## Evidence and observation-to-verdict audit

Durable round-2 root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-0314/round2/`. The short [SUMMARY.json](0314-round2/SUMMARY.json) and [DURABLE-SHA256SUMS](0314-round2/DURABLE-SHA256SUMS) index and seal actual execution logs/receipts, both main merge inputs and conflict output, planted compile fixtures, pin/provider inventory, raw G0 output, object preimages and built files. The durable manifest seals 2,014 files / 81,258,118 bytes. Bulky evidence stays outside git. Original round-1 evidence and verdict remain immutable.

All G0s use offline slot null and bind the exact source/build/fixture/oracle bytes. Each build was copied and rehashed immediately after its lane completed, before the next lane build. Setup used pnpm 10.11.0 with the absolute owned store, frozen/offline and unchanged lockfile; only missing integration workspace dependencies were linked/installed. Heavy commands used heavy.mjs and entered above 5 GiB free; shared contention waits remain in their logs. No engine lifecycle, exclusive slot, unrelated service, global cache or forbidden port was used.

| Result-producing location | Content | Freshness | Binding |
| --- | --- | --- | --- |
| run.py and capture_g0 | Actual exits/log hashes and copied raw/object/build bytes; execution facts alone grant no semantic acceptance | Fresh UUID attempts, start/end and unchanged before/after source maps | Frozen source head, exact commands, tracked source bytes and offline slot null |
| Original F1/F2 probes | Real public writes, typed errors, exact values/receipts and JSON limits | New UUID SQLite scopes | Current reviewed code and unchanged committed probes |
| domain-required.py | Real compiler baseline and actual missing-field TS2741; no expected-error directive | Newly written fixtures, separate compiler processes | Exact fixture/interface bytes, hashes and commands; product source never changed |
| inventory.mjs and pins.py | Repository AST provider/domain records; every pin origin, actual base/current hash and transitive input bytes | Fresh invocations read this checkout | Current source and immutable bed67f1f Git objects; no live backend qualification |
| Contract/evaluator/G0 suites | Actual assertions and raw unittest/TAP/Vitest/oracle output; mutations must emit CONTRACT INVALID | Fresh executions and fresh gate receipts | Exact source, oracle/build preimages and slot-null offline identity; evaluator is explicitly source-only |
| Existing integration corpus and type compiler | Actual exhaustive lookup failures and precise TS2741 missing-key diagnostic | New source-bound executions; failed first setup retained | Existing unchanged test source plus reviewed catalog change; separate timeout not attributed to F3 |
| seal.py/SUMMARY.json | Rechecks exits and semantic log content, domain fixtures, exact input/log/raw/build hashes and G0 skip/count reconstruction; verifies attempted main is not an ancestor | Final completed attempts, with timestamps and source equality | Tested/reviewed identities, exact merge conflict inputs and currentMainMerged:false |
| This FIX-FIRST verdict | F1/F2 closure, concrete F3 regression and actual B1 merge limitation | This review's independent fresh results | Reviewed 651fdb77 and tested 3618dd83; no merge acceptance or obligation closure |

Not done: code/test/contract fixes; a conflict-resolved current-main merge; current-main Q87 qualification; full root check, full integration typecheck or package packing; live G1+/GS, target-scale/performance, physical power-loss, erasure or tenant-isolation qualification; deployment, publishing, merge into main or push. Open work: fix F3 using the real Datomic codec, reconcile the pending-ruling merge through the contract builder, and independently verify the corrected merged source before ACCEPT.
