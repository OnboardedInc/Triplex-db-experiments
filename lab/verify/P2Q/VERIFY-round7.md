# V-P2Q round 7 — CX-VP2Q-4

**Verdict: FIX-FIRST.** The source-audited catalog resolves the earlier transport-code finding, the dependency upgrade guard detects an injected addition, and the existing matrices pass. The new Q89c check finds a separate blocker: repository reads inside a transaction silently clamp a requested unpublished basis to the transaction's captured cut and succeed. Both nonempty results and an absent-entity result must instead use the typed refusal channel. No product code was fixed by this reviewer.

**North star:** P1 exact-basis reads and P2 read-after-commit correctness. Source goals/targets remain `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. This is a correctness review for default-off integration, not default enablement, performance or production acceptance.

## Source and integration

Exact target: `7b2227e0530d9f8b207c83a9bb885943747f8762`; builder report: `a1e390b`, read at the supplied builder-worktree path `lab/experiments/EXP-P2Q-qlever-log-broker/REPORT-round6.md`. Integration commit `efae52f0` merges the target into **verify/P2Q only**, atop `1317b0cb`. Main-checkout instructions and the current `lab/acceptance/RULINGS-PENDING.md` were read-only.

The sole add/add conflict was the round-six AST expectation: the classifier now calls `qleverTransportCodes.get`, rather than regex `.test`. I accepted that explicit lookup adaptation while retaining the prohibition on message/stack/coercion/computed accesses. Original/adapted verifier bytes and their full diff are retained in `evidence-round7/round6-original-reviewer.ts.txt`, `round6-target-adaptation.ts.txt`, `round6-ast-adaptation.patch`. No semantic error/basis assertion was relaxed.

The product delta from `c2d4aa0` consists only of `broker/errors.ts` and new `broker/transport-codes.ts`; the package adds the source inventory guard test. The inherited builder also adds the 664-case real-client matrix and source/license snapshots. No repository read-route, write/feed, marker/incarnation, deadline, HTTP client or default setting changed in this round. `product-delta.patch` retains the package diff, and `product-drift.patch` is empty: verifier product and benchmark sources match `7b2227e` exactly.

Gates use `lab/bin/heavy.mjs` and `scripts/round7-gate.mjs`, retaining command, source hashes, target/head, environment, Node version, free disk, start/end, exit status and log hash. Source aliases and source/tsx fixtures remain in use. Node: v22.23.2; host free disk was about 13 GiB at initial admission, above the 5 GiB floor. Queue waits were retained in controller output. No install was needed. New state is retained under Git-ignored `lab/verify/P2Q/state-round7/`.

## F1 — major: transactional repository reads silently substitute an older basis

**Location:** `packages/qlever/src/broker/BrokerStorageAdapter.ts:214-217`: when transaction state exists, `b = Math.min(state.sourceK, basis.recordedPosition)`. The future-basis wait/refusal at `:242` is additionally guarded by `state === undefined`. The three affected entry points share `queryRows`: `getByEntity`, `getByEntities` and `query`.

The user explicitly requested checking **Q89c**, whose current text is:

> A route that cannot answer a basis exactly fails with a typed error, never an empty result with a flag; every route waits then refuses for a future position (and, after Q89a, a future record time).

This is a newly requested rule check of an existing path; the catalog change did not introduce the clamp.

**Reproduction:** open an actual broker/runtime, commit one subject at position **2048**, leave the log head at 2048, and request position **6144**, beyond the resolved prefix. Execute each repository read via `adapter.withTransaction(...)`. All three calls succeed in roughly a millisecond, returning the one row from captured cut 2048. The requested future position is discarded. No typed error or wait occurs. The same three calls outside a transaction wait approximately the configured 40 ms and return `ReadError` / `reason: "basis-not-reached"` with required 6144. Both schedules use the same real broker implementation and model replica; no engine fault or source-code replacement is involved.

For an entity absent at captured cut 2048, a transactional read at unpublished cut 6144 also succeeds with an empty array, rather than failing. An empty successful value cannot distinguish “absent at that named basis” from “that basis cannot yet be answered.” The test requires an actual failure channel; adding a refusal flag to an empty successful result would not satisfy Q89c.

**Evidence:** `round7-q89c-{getByEntity,getByEntities,query}-{transaction,outside}.json` and `q89c.log`; the absent-entity case is `round7-q89c-empty.json` / `q89c-empty.log`, under `evidence-round7/`. The artifacts bind captured/requested positions, unchanged source head, elapsed time, success/error channel and returned row counts. The failing assertions are retained unchanged.

**Impact:** a caller requesting a named future cut receives an answer for another cut, including a false empty answer for an absent entity, while the API reports success. This is a basis/refusal contract failure; it does not demonstrate lost durable frames or a wrong answer at an otherwise valid historical cut.

**Proposed fix:** validate an explicit requested position before clamping or selecting data. Preserve the transaction's snapshot identity; when it cannot reconstruct the requested basis, use the deadline-aware typed refusal path required by Q89c. Do not relabel the captured view as the requested future cut, reopen the transaction at a later cut, or encode refusal in a successful result/flag. Keep tests for all three repository entry points, inside/outside a transaction, including the empty result case. No fix was made here.

Reproduce with fresh output paths:

```sh
node lab/bin/heavy.mjs --label CX-VP2Q-4-r7-q89c-repro -- env V_P2Q_OUT="$PWD/lab/verify/P2Q/evidence-round7/repro-new" V_P2Q_RUNS="$PWD/lab/verify/P2Q/state-round7" node_modules/.bin/vitest run --config lab/verify/P2Q/vitest.config.ts tests/round7-q89c.test.ts tests/round7-q89c-empty.test.ts
```

## Independent catalog/source audit

**PASS for the audited inputs.** I read the three actual installed `node_modules/.pnpm/undici@{7.29.0,7.29.1,8.11.2}/node_modules/undici/lib/core/errors.js` modules and their installed `docs/docs/api/Errors.md`, not just the builder's table. `tests/round7-audit.test.ts` independently parses actual `.code` assignments and their enclosing class names with the TypeScript AST. It checks semantic transport classes against the catalog and checks every documented code has a decision. The class inventories contain **23, 23 and 24** literal code assignments; the actual Node-bundled Undici 6.28.0 has **23**. Source paths, hashes, class/code/decision rows and documentation-code inventories are retained in `round7-source-class-audit.json`.

The catalog has **118 unique decisions: 83 transport and 35 non-transport**. Socket/abort/timeout/proxy/incomplete-transfer decisions agree with the inspected classes and docs; base/argument/parser/size/request-length/response/retry/informational codes are explicitly excluded. The prior EHOSTDOWN/ENETDOWN cases now pass, as do all 83 transport codes in the new real-client propagation matrix. This establishes coverage of the stated audited sources, not every conceivable future TLS/platform/library failure.

I independently opened the pinned Node [net documentation](https://nodejs.org/download/release/v22.23.2/docs/api/net.html#event-error_1), [DNS error-code documentation](https://nodejs.org/download/release/v22.23.2/docs/api/dns.html#error-codes), and [error identity documentation](https://nodejs.org/download/release/v22.23.2/docs/api/errors.html#errorcode). Net exposes socket/lookup errors; DNS documents its error constants; Node recommends using structured code identity over unstable message text. The docs do not provide a complete platform socket-errno list, so the builder's additional pinned libuv provenance is necessary.

The independent test also fetched **fresh exact-tag** `net.md`, `dns.md`, `errors.md`, `deps/uv/include/uv.h` and `deps/uv/docs/src/errors.rst` from the Node v22.23.2 source repository. All five byte hashes match the retained builder snapshots. All **24** documented DNS constants, resolved to this runtime's actual values, and **14** pinned `EAI_*` identities are covered. Explicit code spellings in net/DNS docs also have table decisions. URLs, byte counts, fresh/retained hashes and comparison rows are in `round7-fresh-node-source-audit.json`. This is fresh source verification, not acceptance of the report's provenance claims alone.

The prior no-message tripwires, 32-node depth/cycle controls, 252 protected-error/depth chains and exact error fields pass unchanged apart from the inspected regex-to-Map AST inventory adaptation. The 35 excluded catalog codes also pass the package root/nested/veto controls. Decode errors, HTTP 4xx and typed basis failures remain distinct from replica outages. The bounded singular `.cause` walk remains explicit; arbitrary AggregateError `.errors` trees and unbounded-depth recognition are not certified.

## Upgrade guard mutation

**PASS: the real guard rejects an added installed-source code.** I used an isolated test-worker setup to intercept only the read of the installed Undici 7.29.0 `lib/core/errors.js`, append a valid error-class source declaration carrying `UND_ERR_QA_ADDED_TRANSPORT`, and run the package's **actual** `transport-code-inventory.test.ts`. Dependencies and product files were not edited on disk.

The actual inventory test failed at `transport-code-inventory.test.ts:45` with `Unreviewed Undici code(s)` and the added identity. The other 121 package checks passed. `guard-mutated-config.log` and `.json` retain this **intentional exit 1**; `guard-mutation-readback.json` confirms the source interception and `modifiedOnDisk: false`. The unmodified control passes all 122 tests (`inventory.log`, `.json`). This verifies the actual installed-source gate, rather than merely calling a copied “missing codes” helper.

The first invocation attempted an unsupported Vitest CLI `--setupFiles` option and failed before tests ran. That command/configuration failure remains in `guard-mutated.log` / `.json`; it is **not** the successful guard demonstration. The corrected verifier-owned config is `scripts/round7-guard.config.ts`, with the same setup module and unchanged product/guard code. No existing attempt was overwritten. The guard covers its audited installed and bundled error modules; it is not a claim to detect arbitrary new identifiers placed anywhere in a dependency tree.

## Fresh gates

| Gate | Fresh result | Evidence under `evidence-round7/` |
| --- | --- | --- |
| All prior requested offline matrices, including 664 catalog/client cases | **793 pass**, 12 live cases skipped, 5 files | `matrices-offline.json`, `.log` and raw round-four/five/six artifacts |
| Unchanged qlever-dev HTTP matrix | **12/12 pass**, 30 offline cases filtered out | `http-live.json`, `.log`, `http-live/` |
| Actual package source inventory/catalog guard, unmodified | **122/122 pass** | `inventory.json`, `.log` |
| Independent installed/bundled class and fresh Node-doc audits | **2/2 pass** | `source-audit.json`, `.log`, `round7-*-audit.json` |
| Added-source mutation through actual inventory guard | **Expected refusal:** 1 failed / 121 passed, specifically the newly added unknown code | `guard-mutated-config.json`, `.log`, `guard-mutation-readback.json` |
| Q89c nonempty repository reads, inside/outside transaction | **3 pass, 3 fail**: only transactional routes succeed incorrectly | `q89c.json`, `.log`, `round7-q89c-*.json` |
| Q89c absent entity at unpublished transactional basis | **FAIL**: successful `[]` at an unavailable cut | `q89c-empty.json`, `.log`, `round7-q89c-empty.json` |

The 664 catalog/client cases use controlled socket-layer identities after connection establishment, with two depths, both exported HTTP clients and both surfaces. They do not claim every OS failure physically occurred. The twelve real-engine cases contact **only shared qlever-dev at `http://127.0.0.1:7070`**, use unique graphs, and assert required commit 2048 / last observed marker 4095. Response truncation affects owned loopback proxy connections only after a real engine answer has been acquired. No resident was stopped or recreated and no exclusive slot was taken.

## Evidence, cleanup and limits

All eight gate receipts report `sourceStillMatches: true`; log hashes are read back by `scripts/round7-summary.mjs`. `SUMMARY.json` inventories gate outcomes and individual cases, while `MANIFEST.json` hashes retained evidence. The initial CLI/config failure, expected upgrade-guard rejection and four Q89c assertion failures remain separate and intact; no failed assertion was weakened.

`DEPENDENCY-READBACK.json` compares all three installed Undici modules and the bundled error source with the independent audit hashes after the mutation worker ended, confirming no dependency bytes changed. Final process inspection (`final-cleanup.json`) found no worktree-owned lock-holder fixtures and retained an empty product-source diff. No process cleanup was needed. Prior rounds' state, original/adapted test sources and first failures remain retained.

No product fix, main-checkout edit, main merge, push, publication, dependency installation/change, default enablement, package build, typecheck, root `pnpm check`, full earlier fuzz/durability suite, full package suite, engine lifecycle action, actual host-network fault or unrelated service was used. Source auditing fetched only the generic public Node source/documentation URLs. No scale/concurrency/sweep/performance or complete golden-scenario target is certified.

Q72c's existing default-off `ReadError` subclasses remain permitted; Q67h's core tag migration and earlier default blockers remain outside this delta. The catalog finding is resolved for the audited class, but Q89c is explicitly in this review's scope and blocks **ACCEPT**. No E-BASIS-NOT-AVAILABLE / E-REPLICA-UNAVAILABLE obligation is closed.

**Open action:** remove silent future-basis substitution from transactional repository reads and rerun the Q89c negative controls. Until then, **FIX-FIRST** for default-off integration.
