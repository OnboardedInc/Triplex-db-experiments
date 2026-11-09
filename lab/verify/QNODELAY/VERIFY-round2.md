# QNODELAY round 2: FIX-FIRST

Reviewer: CX-VQNODELAY. Builder head `80d16039` (`exp/QNODELAY-qlever-connection`) was merged into **verify/QNODELAY only**, merge `5c240a0a`. This review does not authorize promotion or a merge into main.

North star: P1/P4 host read latency, with transport correctness as the floor. Goals/targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; procedure: `lab/PROTOCOL.md`. Shared-resident timing remains **DIAGNOSTIC under Q91a**. Observations: 2026-11-09 04:33–04:38 UTC, Node v22.23.2, declared Undici 7.29.1.

**Verdict: FIX-FIRST for one remaining receipt-coverage defect.** The original abort/gzip findings are fixed in the tested cases, the QG1 mode propagation is fixed, and success/error lifecycle tests found no growing socket/FD leak. I found no response-byte, structured-error-chain or classifier difference between modes in the rerun matrices. **Do not flip the default yet**: the small shared-resident diagnostics still do not measure representative concurrent P1/P4, writer progress or connection/CPU/TLS cost on the admitted built-base profile.

## Finding R2-F1 — Medium: C8 timing summary still emits standalone mode-less JSON

Locations: `lab/experiments/EXP-C8-read-only-frontier/summarize-timing.mjs:17`–`:23`; checker coverage boundary at `lab/receipts/check-writers.mjs:10` and `:26`.

The C8 summary reads the newly mode-bearing `round-timing.mjs` report, then writes new JSON lines with `lane`, native total/phase timings and Datalog wall times, **dropping qleverConnectionMode**. It is an output producer outside the 29-file constructor inventory. The required receipt interface therefore does not cover this path. This is a surviving part of the original universal receipt-coverage request, not a new transport regression.

Reproduction, without engines:

```sh
node lab/verify/QNODELAY/round2/receipt-coverage.mjs
```

The fixture invokes the actual unchanged summarizer as a subprocess twice, once with an explicit keep-alive input and once with per-request. Each input has `lane: qlever`, the same fresh run identifier and known native/Datalog timings. Both standalone output objects retain the timings and omit the mode. `round2/receipt-coverage.json` retains input hashes and exact emitted objects. The C8 source hash is `5194ed4709d0d269396f1f874495d86b4a4bddc473e7be822b81cada9c24bcb4`.

Meanwhile the builder's shape checker succeeds: **41/41 listed shapes compile with mode and fail without it**, and its JS runtime implementation typechecks. The declaration negative fixtures also pass. Thus the tests prove the declared types and known constructor sites, but this actual omission does **not** fail the gate. It is never passed to a required receipt constructor or discovered by the inventory.

Proposed fix: serialize each C8 summary through the checked latency receipt boundary, preserving and validating the input's actual mode. Reject missing/unknown historical QLever modes instead of consulting today's environment. Add this producer to the inventory and add a regression proving two different input modes remain distinguishable in its outputs. Keep the coverage assertion scoped to a demonstrably complete set of producers; counting existing constructor calls alone does not establish that set.

## Original findings and independent reruns

| Area | Fresh result |
| --- | --- |
| F1 custom/default/pre-aborted signals and timeouts | Parity restored in the tested cases; same raw reason/error chains and same frozen P2Q classifier decisions |
| F2 QG1 direct/grid/P4 mode propagation | Actual extracted request writer now emits fixed keep-alive in both saved and returned metadata; summary preserves distinct per-request P4 mode; missing/mismatched inputs are refused |
| F3 gzip response decoding | Plain/chunked gzip, compressed HTTP errors, malformed gzip and decoded-size budget cases pass the shared matrix |
| Builder response/socket/receipt matrix | **42/42 tests passed**: 26 response cases, six connection tests, ten receipt fixtures |
| Reviewer prior matrix and P2Q catalog | All 15 response scenarios have parity; all **236 catalog mode-pairs** have equal structured chains and classifications |
| Local successful-request longevity | **10,000 per mode**, all fresh nonce-bearing contents checked; 10,000 per-request sockets, zero remaining open, flat numeric FD count 21 |
| Local failed-request longevity | **1,000 per mode**: 250 each HTTP 500, bad gzip, byte-budget and deadline; per-request accepted 1,000 sockets, zero open, FD count 21 at every checkpoint |
| Shared resident | 1,572 exact nonce/payload checks; 1,300 per-request calls opened 1,300 sockets, all closed; bounded FD observations |

The exact builder tests ran through an isolated reviewer Vitest config using the pinned installed dependency. No tests were edited. `builder-matrix-native.json` reports 42 passing, zero failing, success true; exit zero was separately observed. An initial Vite startup failed while trying to write its config cache in the shared dependency tree. That failure is indexed by `builder-matrix.log` and preserved byte-for-byte as durable `attempt1/builder-matrix-startup.log`; the final run used `--configLoader native` and did not write there.

The independent `transport.mjs` rerun retains the round-1 catalog's negative-control limitation: directly injecting synthetic `UND_ERR_INFO` into a socket is consumed as an informational event and eventually becomes a deadline **in both modes now**. Consequently **470/472** catalog observations preserve the originally expected identity/classification, and the aggregate check remains false with exit 1. All **332 positive transport-code observations** preserve their codes and classify true. All 236 keep-alive/per-request pairs, including the two informational-event cases, have identical cause chains/classifications. I did not turn this known runtime-injection boundary into either a fresh outage finding or a full catalog PASS.

The local success loop observed two bounded keep-alive sockets versus 10,000 distinct per-request sockets. Descriptor checkpoints were flat at 25 for keep-alive and 21 for per-request. The extra failed-request loop observed 252 accepted keep-alive connections (deadline cases require replacements), two open pooled sockets, versus 1,000 per-request connections and zero open; descriptors again stayed 25/21. These counts establish client lifecycle behavior, not resident-process FD accounting or kernel TIME_WAIT cost.

P2Q remains a separate branch. As in round 1, the independent catalog test executes the frozen exact classifier body/table with fixture constructors for absent broker-only classes and this branch's actual QleverHttpError. Integrated broker/native/Datalog behavior is not certified. Raw custom-abort Error/string classification still follows the unchanged built-in fetch contract; parity does not claim the separate P2Q typed-error integration has happened.

## Fresh diagnostic timings and raw-byte audit

Small sequential read-only literal SELECTs only on existing `qlever-dev`, `http://127.0.0.1:7070`; ABBA modes, payloads 16/2048 bytes, 64 measured + four warmup calls per comparison cell. Timing includes body decoding and dispatcher destruction. The resident container/start identity stayed unchanged. Endpoint, owner, image/config, co-running inventory and unchanged-source checks are retained. No data or engine lifecycle changes, exclusive slot, concurrent workload or writer traffic was introduced.

| Mode | Measured n | p50 ms | p99 ms | >=35 ms |
| --- | ---: | ---: | ---: | ---: |
| keep-alive | 256 | 13.190291 | 47.770375 | 128 |
| per-request | 256 | 3.509375 | 8.625333 | 0 |

An additional 1,024 measured + four warmup per-request calls had p99 **6.173291 ms**, zero >=35 ms observations. All **1,572/1,572** raw decoded responses match independently reconstructed nonce/payload expectations. The 1,300 per-request sockets all closed; two global keep-alive sockets initially remained and expired by the final observation. Longevity descriptor observations were 22, falling to 20 when those two sockets expired. Base/delta/touched-block counts remain explicitly null.

`evidence-audit.mjs` independently verified **172/172** round-2 builder manifest entries and **45/45** copied final source preimages against this checkout. It also hashed the 210 files in the selected Undici package and retained the exact dependency identities. Recomputing the builder's 520 response contents and excluding 40 warmups yields its reported figures exactly:

- keep-alive n=240, p50 13.671625 ms, p99 49.357584 ms, 120 stalls;
- per-request n=240, p50 4.347375 ms, p99 7.760791 ms, zero stalls.

These are historical builder observations, kept separate from this fresh review. The source client was executed directly using Node's TypeScript transform and a reviewer module resolver pointing at exact local Undici 7.29.1; no installation, package build or dependency tree mutation was needed. The default resolver still returns keep-alive when absent; explicit selection overrides the environment.

## Type gate, coverage scope and pins

The shape gate was rerun with its logic unchanged, using a reviewer copy with **four path-literal adaptations only**: compiler import, scratch output, scratch declaration import and tsc executable. This confines temporary writes to the reviewer directory. `writer-types2.log` contains the complete original writer/checker/declaration hashes and 41/41 result. The earlier path-adapted attempt hit a reviewer loader issue resolving the compiler through a symlink; it is retained as `writer-types.log`, not a candidate-code failure. The final copy imports the real pinned TypeScript 6.0.2 path. `tsc --noEmit -p lab/receipts/tsconfig.json` also completed with exit zero (`declarations.log`).

The bound shape coverage is real, but it does not discover mode-less serialization such as R2-F1. The bounded independent source search is saved as `round2/latency-source-inventory.txt` and `qlever-code-paths.txt`. I found no additional confirmed new omission beyond the C8 summary in this round; this is not a claim that every inherited diagnostic or third-party log parser has been qualified.

No acceptance file was edited. The same sole source pin is affected in this builder round, at `obligations.json/caseSets/CS-ENTRY/pinnedSourceFiles/1` and `obligations.json/caseSourcesPinned/CS-ENTRY/1`:

- Path: `packages/qlever/experiments/native-entry.ts`
- Round-1 hash: `39b11393379e443e17d5c5cd708671e7aa33ee5e16e781eace61081ae2dce74e`
- Round-2 hash: `0f78b5bfcf5d2198015bd6a0e9111a4c7d98fb6fd9022de468d047d90a8bca8d`
- Still-pinned contract hash: `c82ce6cfabfcf61ab9f5d76791146d167741420a3be07b92559026f987634b0f`

The independent acceptance-reference scan found the root package.json references are build-input rules, not another fixed source pin. Re-pinning remains the contract builder's job. Reviewer additions move no pinned source hashes.

## Evidence, commands and limits

Report: `lab/verify/QNODELAY/VERIFY-round2.md`. Tools, local fixture inputs, successful and failed logs/results: `lab/verify/QNODELAY/round2/`. Bulky fresh raw evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQNODELAY/round2/attempt1/`. `round2/SHA256SUMS` binds the report and all reviewer artifacts. Previous-round evidence is unchanged.

All expensive commands used `lab/bin/heavy.mjs`; available host disk was approximately 12 GiB before admissions. Representative final commands (from this worktree):

```sh
node lab/bin/heavy.mjs --label CX-VQNODELAY-R2-matrix-native -- node /Users/sam/projects/triplex-db-2/node_modules/vitest/vitest.mjs run --config lab/verify/QNODELAY/round2/vitest.config.mjs --configLoader native --reporter=json --outputFile=lab/verify/QNODELAY/round2/builder-matrix-native.json
node lab/bin/heavy.mjs --label CX-VQNODELAY-R2-transport -- node --import ./lab/verify/QNODELAY/round2/bootstrap.mjs --experimental-transform-types lab/verify/QNODELAY/round2/transport.mjs
node lab/bin/heavy.mjs --label CX-VQNODELAY-R2-live -- node --import ./lab/verify/QNODELAY/round2/bootstrap.mjs --experimental-transform-types lab/verify/QNODELAY/round2/live.mjs /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQNODELAY/round2/attempt1
node lab/bin/heavy.mjs --label CX-VQNODELAY-R2-types2 -- node lab/verify/QNODELAY/round2/check-writers-path-adapted2.mjs
node lab/bin/heavy.mjs --label CX-VQNODELAY-R2-receipt-coverage -- node lab/verify/QNODELAY/round2/receipt-coverage.mjs
node lab/bin/heavy.mjs --label CX-VQNODELAY-R2-error-leaks -- node --import ./lab/verify/QNODELAY/round2/bootstrap.mjs --experimental-transform-types lab/verify/QNODELAY/round2/error-leaks.mjs
node lab/bin/heavy.mjs --label CX-VQNODELAY-R2-evidence -- node lab/verify/QNODELAY/round2/evidence-audit.mjs
```

These attempt outputs are exclusive-create; use new names for reruns. JavaScript syntax checks and `git diff --check` passed. I did not fix implementation code, run real write/command/fault workflows against the shared engine, rebuild/repack, run the full package/root check, qualify HTTPS/proxies, measure resident FD counts, certify integrated P2Q, change the default, merge into main or push. The explicitly requested merge was into the reviewer branch only.

## PASS / verdict / receipt audit (rule 9a)

1. **`round2/transport.mjs`**: fresh per-run/per-request nonce checks precede accepted local results; server socket identities, descriptor snapshots and actual cause chains drive booleans. The exact frozen classifier/table and code-preservation conditions drive the catalog result; its false aggregate remains false. Before/end source hashes bind current client, runner, dependency entry/package and references. No engine or production PASS.
2. **Builder matrix via reviewer Vitest config**: unchanged tests use new UUIDs, local servers, controllers and full expected decoded bytes/error chains; 42 pass is local fixture acceptance only. The JSON report, exact test/source preimages verified against the builder, config and dependency hashes bind these observations. Initial runner failure remains separate. Tests do not certify a real slot or broker.
3. **`round2/live.mjs`**: every raw response is deep-equal to its fresh nonce and full expected payload before timing inclusion. Current socket events, source rehashes and before/after actual slot/container identity bind this attempt. Completed collection and quantiles are diagnostic; warmups and longevity cells are separated.
4. **`round2/error-leaks.mjs`**: each rejection must have the expected HTTP body nonce/error kind, fresh server-observed unique ID and current request accounting. Socket and descriptor checks use actual local observations. UUID/source/dependency hashes and end rehash bind this run. No inferred success from rejection alone.
5. **`round2/receipt-coverage.mjs`**: actual subprocess serializer and exact extracted grid writer receive fresh fixture inputs. Expected timing/body/hash fields are checked, mode omission/preservation is inspected, and hashes bind input/source bytes. QG1 missing-mode controls must throw. No database workflow or timing-performance verdict.
6. **Path-adapted shape checker and declaration check**: current source literals, exact declared inventory and compiler diagnostics determine the type-contract result; original source rehash checks remain. Adapted runner/compiler paths and outputs are retained. This checks 41 listed shapes, not all possible serializers or payload values.
7. **`round2/evidence-audit.mjs`**: validates checksums, exact copied source bytes, raw decoded contents/nonces/hashes and independently recomputed quantiles. Historical builder attempts and the new reviewer UUID are separate. Catalog-pair equality checks both classification and full serialized chain. Hashes bind bytes, not semantic acceptance; dependency inventory is an after-run byte snapshot, not a claimed historical full dependency capture.
8. **This FIX-FIRST verdict and manifests**: derive from the reproduced R2-F1 omission and retained gates. They confer no performance acceptance, complete catalog qualification or contract promotion.

Open follow-up: close R2-F1 and rerun the summary/type-coverage regression; retain the private-dispatcher implementation's successful parity/lifecycle evidence. A later admitted representative comparison must decide whether the default changes.
