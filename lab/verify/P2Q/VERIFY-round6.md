# V-P2Q round 6 — CX-VP2Q-4

**Verdict: FIX-FIRST.** Structured-only classification fixes the decode-message false positives, and all prior HTTP/cause matrices now pass. The transport-code coverage is incomplete: both exported clients propagate real socket error identities `EHOSTDOWN` and `ENETDOWN`, but the classifier omits them. Native SPARQL and Datalog consequently lose `replica-unreachable` and the required basis fields for those errors. No product fix was made by this reviewer.

**North star:** P1 exact-basis reads and P2 read-after-commit correctness depend on distinguishing a transport outage, an unmet basis and a query/decode failure. Goals/targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. This is a correctness review for default-off integration, not default enablement or performance acceptance.

## Source and integration

Reviewed exact code `c2d4aa0692f543f392572efa5cc2e722cf1c159f` and builder report `04c9976`, read at the supplied builder worktree's `lab/experiments/EXP-P2Q-qlever-log-broker/REPORT-round5.md`. Integration commit `554eb6f6` merges the target into **verify/P2Q only**, atop `72010a6`. Main-checkout instructions were read-only. No engine lifecycle operation occurred.

There was one add/add conflict, confined to `tests/round5.test.ts`: `aggregate-fetch-wrapper` formerly expected an outage because the outer TypeError said “fetch failed”, while its AggregateError held socket details only in `.errors`, outside the singular `.cause` chain. The new explicit structured-only requirement makes that old expectation invalid. I accepted the builder's single expectation change to false, with its explanatory comment. Original reviewer bytes, adapted bytes and the complete diff are retained in `evidence-round6/round5-original-reviewer.ts.txt`, `round5-builder-adaptation.ts.txt` and `round5-expectation-adaptation.patch`. No other assertion was relaxed. The inherited model/round-three mocks now carry actual errno codes rather than prose-only outage descriptions, as documented by the builder.

The package delta from `5390fe8` has four source files (`QleverClient.ts`, `broker/http.ts`, `broker/errors.ts`, `index.ts`) and three package test files. It adds structured request/decode identities, exports them, replaces client abort/timeout errors with typed request errors, and makes the cause classifier code/identity-only with protected-error precedence and a fail-closed 32-node limit. No write/feed, marker/incarnation, basis-wait or default-setting change was found. `product-delta.patch` retains the package diff; `product-drift.patch` is empty: verifier product and benchmark sources equal `c2d4aa0` exactly.

Runtime tests use the established source aliases. Gates run through `lab/bin/heavy.mjs` and `scripts/round6-gate.mjs`, retaining source hashes, exact command, target/head, Node version, environment, free disk, start/end, exit status and log hash. Node was v22.23.2; host free space was about 19 GiB, above the 5 GiB floor. State stays under Git-ignored `lab/verify/P2Q/state-round6/`. No dependency installation was needed.

## F1 — major: two supported OS transport codes are missing

**Location:** `packages/qlever/src/broker/errors.ts:98`, the exact-code allowlist. Consumers are `native/NativeQueries.ts:158` and `QleverQueryExecutor.ts:251`. The fresh client's underlying request errors propagate unchanged through `broker/http.ts:92` (`req.on("error", reject)`); the standard fetch client preserves the socket errno in the failure's cause chain.

**Reproduction:** emit a structured `EHOSTDOWN` or `ENETDOWN` error on the real client-owned `net.Socket` during its connection to a fixture-owned loopback HTTP endpoint. Keep the basis gate successful at required 1024 / observed 2048. Both exported clients are exercised through both public query surfaces. No OS network fault is induced: these are controlled socket-layer errno injections, not a claim that the host or qlever-dev actually went down.

This installed Node runtime's `util.getSystemErrorMap()` identifies both errors: `EHOSTDOWN` (-64, “host is down”) and `ENETDOWN` (-50, “network is down”). Its bundled `_http_client` `socketErrorListener` passes the same error to `emitErrorEvent(req, err)`. `round6-runtime-error-audit.json` retains that actual runtime source snippet, system mappings and the bundled Undici code inventory. These are supported structured transport identities, not prose-only lookalikes.

All **eight** real-client cases (two codes × two clients × two surfaces) preserve the injected errno but return plain `ReadError` with no `reason`, `required`, `observed` or `replica` fields. Standard-client example:

```text
ReadError, reason absent
  cause: TypeError("fetch failed")
    cause: Error { code: "EHOSTDOWN", message: "opaque" }
```

Fresh-client example:

```text
ReadError, reason absent
  cause: Error { code: "ENETDOWN", message: "opaque" }
```

**Expected:** `replica-unreachable`, required 1024, observed 2048, replica `the QLever replica`, correct surface, original cause retained. The precise code is available, but it is not in the allowlist. A second independent matrix places each code at every depth 0–31; all depths miss classification in the predicate and both surfaces. The fifteen currently allowlisted codes pass that same matrix.

Evidence: `round6-client-{standard,fresh}-{native,datalog}-{EHOSTDOWN,ENETDOWN}.json`, `round6-depth-EHOSTDOWN.json`, `round6-depth-ENETDOWN.json`, `variations.log`, under `evidence-round6/`. The test does not replace the exported client's `query` implementation with a synthetic error: it temporarily instruments `net.Socket.prototype.connect`, schedules destruction with the coded error, invokes the actual client, and restores the method in `finally`. The native source-position fixture and Datalog basis gate are controlled independently. Other processes and the shared engine are unaffected.

**Impact:** a genuine network/host-down identity cannot be classified using the promised outage representation; clients lose basis-aware retry/error handling depending on the OS errno. No successful partial/stale answer or durability loss was observed.

**Proposed fix:** extend or normalize the structured transport-code coverage for supported runtime/platform socket errors, including at least `EHOSTDOWN` and `ENETDOWN`, while retaining exact matching, protected-error precedence and bounded/cycle-safe traversal. Audit the code set against the two exported clients' runtime paths; do not restore message matching. Retain the real-client and all-depth regression cases. No fix was made here.

Reproduce with fresh output destinations:

```sh
node lab/bin/heavy.mjs --label CX-VP2Q-4-r6-repro -- env V_P2Q_OUT="$PWD/lab/verify/P2Q/evidence-round6/repro-new" V_P2Q_RUNS="$PWD/lab/verify/P2Q/state-round6" node_modules/.bin/vitest run --config lab/verify/P2Q/vitest.config.ts tests/round6.test.ts
```

## Fresh gates

| Gate | Result | Evidence in `evidence-round6/` |
| --- | --- | --- |
| Round-four offline HTTP and round-five cause/differential matrices | **101/101 pass**, 12 live cases skipped | `matrices-offline.json`, `.log`, `round4-http-*.json`, `round5-*.json` |
| Round-four live qlever-dev HTTP matrix | **12/12 pass**, 30 offline cases filtered out | `http-live.json`, `.log`, `http-live/` |
| New independent code/depth/protected/message/client checks | **18 pass, 10 fail**; two missing-code depth tests and eight real-client cases are F1 | `variations.json`, `.log`, `round6-*.json` |
| Package answer, transport and request-error files | **42/42 pass**, including four real loopback abort/timeout cases | `package-focused.json`, `.log` |

The live matrix ran only against shared qlever-dev at `http://127.0.0.1:7070`, with unique fixture graphs. Both client implementations and native/Datalog pass connect-refused, headers-only truncation and partial-body truncation with exact required/observed/replica/surface assertions (requested commit 2048, observed marker 4095). Proxy truncations happen only after acquiring a real engine answer. No engine was stopped or rebuilt. The round-five cause matrix is offline by design; its actual live transport schedules are the round-four HTTP matrix, not an invented second live workload.

## Requested audit disposition

**No message-text path in the decision predicate: PASS.** An AST audit of the actual `isUnreachable` initializer finds only property access to `has`, `add`, `status`, `code`, `name`, `test`, `cause`, with calls limited to the visited set and the exact-code regex. There is no computed property access, `.message`, `.stack`, `String(...)`, template coercion or error string conversion. Dynamic tripwires for message/stack getters, `toString` and `Symbol.toPrimitive` at all 32 inspectable depths produce **zero reads**, across 64 positive/negative chains. `round6-no-message-observation.json` retains the AST inventory and every outcome. Error constructors still format diagnostic messages after classification; this audit concerns the category decision, not suppression of human-readable diagnostics.

**Every transport code at every depth: NOT ESTABLISHED / F1.** The fifteen explicit allowlisted codes pass at every root-relative depth 0–31 through the predicate and both surfaces, retaining exact basis fields and cause identity. `EHOSTDOWN` and `ENETDOWN` fail at every one of those depths and in real exported-client socket propagation. This falsifies complete transport-code coverage; the runtime Undici inventory is retained for further audit, not certified wholesale as transport or fully covered merely because it was enumerated. Some Undici/parser/resource/validation codes describe non-transport failures and must not be blindly admitted.

The documented traversal limit remains **32 distinct cause values**, not unbounded recognition. An otherwise positive chain whose suffix cannot be inspected is refused, including when its first node carries a transport code. Cycles terminate via the visited set. “Every depth” in the passing bounded matrix means all 32 inspectable positions; no arbitrary-depth transport guarantee is claimed or achievable with this limit.

**Decode, HTTP 4xx and typed basis distinctions: PASS for the bounded/fail-closed matrix.** At every depth 0–31, plus 32, 33, 64 and 1,000, seven protected kinds remain non-outages despite an earlier or attached positive transport code: SyntaxError, QleverDecodeError, HTTP 400/401/404/429, and BasisNotAvailable. All **252** chains pass the predicate and both query surfaces with zero outage misclassifications (`round6-protected-depths.json`). Direct typed basis failures preserve identity; arbitrarily wrapped ones are not promoted to replica outages. Beyond the bound these results mean conservative refusal, not discovery of the hidden leaf. The existing unmet-basis controls still return `basis-not-reached` with no answer request.

Both formerly failing round-five decode shapes and the exact baseline comparison now pass. Ordinary TypeError prose, bare strings, HTTP 4xx and completed malformed SELECT responses remain distinct. Aggregate `.errors` trees are still outside the singular cause walk; the adapted aggregate control explicitly records that boundary. No test treats message text alone as transport evidence.

## Evidence, cleanup and limits

All four source-bound gate receipts report `sourceStillMatches: true`. `scripts/round6-summary.mjs` reads back each log hash and writes `SUMMARY.json`; `MANIFEST.json` hashes retained evidence files. First failures remain intact, with no retry or assertion change after observing F1. The only expectation adaptation was the explicit structured-only policy change recorded at integration.

Final process inspection found zero worktree-owned lock-holder fixtures; `final-cleanup.json` records that check, retained state/evidence and an empty product-source diff. No process cleanup was needed. The socket prototype instrumentation is restored in `finally` within each isolated test worker. No engine or unrelated process was targeted.

No product edits, main-checkout edits, main merge, push, publication, default enablement, dependency change, package build, typecheck, root `pnpm check`, full package suite, full earlier verifier suite, engine lifecycle operation, exclusive slot or actual host networking change occurred. No scale/concurrency/sweep, performance target, production-readiness or complete golden-scenario acceptance is certified. This review retained the original/adapted verifier source and did not rewrite historical evidence.

Q72c still permits default-off `ReadError` subclasses; Q67h's core tag migration and previously accepted default blockers remain outside this delta. F1 concerns the absent permitted reason/fields for actual transport identities, not that deferred tag migration. No E-BASIS-NOT-AVAILABLE or E-REPLICA-UNAVAILABLE obligation is closed.

**Open action:** complete the structured transport-code mapping and rerun F1 plus the unchanged negative controls. Until that passes, the delta remains **FIX-FIRST** for default-off integration.
