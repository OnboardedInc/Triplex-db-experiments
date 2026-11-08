# V-P2Q round 5 — CX-VP2Q-4

**Verdict: FIX-FIRST.** The round-four HTTP matrix's nested-socket defect is fixed. A required negative control still fails: a TypeError with no transport cause is classified as `replica-unreachable` when its decode-error message contains “connection”. Following causes now also introduces that false positive for a nested JSON decode error, on both native SPARQL and Datalog. No product fix was made by this reviewer.

**North star:** P1 exact-basis reads and P2 read-after-commit correctness require callers to distinguish replica outages, unmet bases and query/decode failures. Goals and targets remain `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`. This is a correctness delta review for default-off integration, not default enablement or performance acceptance.

## Source and method

Target code: `5390fe8e8020435cea08480d51278cf8e25be393`; builder report: `cb61b66`, read at the supplied builder-worktree path `lab/experiments/EXP-P2Q-qlever-log-broker/REPORT-round4.md`. Integration commit `ed5b5b4` merges the requested code into **verify/P2Q only**, atop round-four verifier head `716bd6e`. No conflict resolution or product edit was needed.

The product delta from `1b55d2e` is confined to `packages/qlever/src/broker/errors.ts` and the new `packages/qlever/test/broker-transport-errors.test.ts`. Other branch additions are historical report/evidence, the runner and a byte-identical copy of the already present verifier HTTP matrix. The predicate now follows up to 32 distinct `.cause` values, stops cycles, checks structured Undici codes and retains the prior message heuristic. No HTTP client, query wrapper, write/feed code, marker/incarnation guard, wait budget or default changed. `evidence-round5/product-delta.patch` retains the package diff. `product-drift.patch` is empty: verifier product/benchmark sources equal `5390fe8` exactly.

The original `tests/round4.test.ts` was rerun unchanged. New independent tests are `tests/round5.test.ts` (23 error shapes through the predicate and each answer surface, plus a traversal-access bound) and `tests/round5-delta.test.ts` (executes the exact old predicate body after TypeScript transpilation and compares it with the current import). Synthetic answer-boundary tests are explicitly separate from the real-HTTP matrix; they are not claimed as errors emitted by qlever-dev's parser.

Gates run through `lab/bin/heavy.mjs`, with source-hash/command/target/head/environment/time/status/log-hash receipts from `scripts/round5-gate.mjs`. Runtime imports use the existing source aliases. Node: v22.23.2. Host free disk exceeded 22 GiB, above the 5 GiB floor. Shared heavy-slot waits are retained in the run's controller output. No install or engine lifecycle operation was needed. New retained state is Git-ignored under `lab/verify/P2Q/state-round5/`; prior attempts/evidence remain untouched.

## F1 — major: decode text is treated as transport evidence

**Location:** `packages/qlever/src/broker/errors.ts:91-97`, especially the unanchored `connect` alternative at `:93`. Both broker request boundaries consume the result: `native/NativeQueries.ts:158` and `QleverQueryExecutor.ts:251`.

Two independently authored answer-error inputs have no socket/transport cause:

```ts
new TypeError("Cannot decode the connection field")
new TypeError("terminated", {
  cause: new SyntaxError("Invalid JSON in connection field"),
})
```

**Expected:** an ordinary `ReadError`, preserving the original cause and remaining distinct from `ReplicaUnavailable`. **Observed:** both native SPARQL and Datalog return a `ReplicaUnavailable` with `reason: "replica-unreachable"`, required 1024, observed 2048 and replica `the QLever replica`. The only match is the substring “connect” inside the decode message's word “connection”. No connection attempt or transport failure occurred in these synthetic error paths.

This is the task's “TypeError with no transport cause must stay a ReadError” negative control. It is also contrary to the predicate's own stated distinction between transport failures and decode errors. Ordinary TypeError/SyntaxError controls without that substring pass; HTTP 4xx and the existing completed malformed-SELECT response controls remain distinct. The finding is specifically a false positive for error text, not a claim that every decode failure is misclassified.

**Delta attribution:** the direct TypeError false positive already existed before this round. The nested SyntaxError case is introduced by the cause walk: executing the exact `03909d6` predicate reports **false**, while `5390fe8` reports **true**. `round5-baseline-differential.json` retains that comparison and the old source SHA-256. The current negative assertions were left failing; none were weakened to match observed behavior.

**Impact:** callers receive a retryable replica-outage representation for a deterministic decode/data failure. This is an error-classification defect, not a stale successful answer, incorrect basis value, lost durable frame, or new default-enable claim.

**Reproduction:** from this verifier checkout, use fresh output directories to preserve existing evidence:

```sh
node lab/bin/heavy.mjs --label CX-VP2Q-4-r5-repro -- env V_P2Q_OUT="$PWD/lab/verify/P2Q/evidence-round5/repro-new" V_P2Q_RUNS="$PWD/lab/verify/P2Q/state-round5" node_modules/.bin/vitest run --config lab/verify/P2Q/vitest.config.ts tests/round5.test.ts tests/round5-delta.test.ts
```

Evidence: `variations.log` retains six failures (two error shapes × predicate/native/Datalog); `delta.log` retains the differential failure. Raw outcomes are `round5-{predicate,native,datalog}-type-decode-no-cause.json`, `round5-{predicate,native,datalog}-nested-json-decode.json`, and `round5-baseline-differential.json`, under `evidence-round5/`.

**Proposed fix:** require transport-specific evidence for decode/type errors. Remove or narrow broad prose matches such as bare `connect` so a decoded field name is insufficient; preserve recognized structured transport codes, actual fetch/socket/abort/timeout forms, HTTP status precedence and typed-basis behavior. Retain both false-positive regressions alongside the real socket tests. No implementation change was made here.

## Fresh results

| Gate | Result | Evidence under `evidence-round5/` |
| --- | --- | --- |
| Unchanged round-four real-HTTP offline matrix | **30/30 pass**, 12 live cases skipped | `http-offline.json`, `.log`, `round4-http-*.json` |
| Unchanged qlever-dev HTTP matrix | **12/12 pass**, 30 offline cases filtered out | `http-live.json`, `.log`, `http-live/round4-live-*.json` |
| Independent cause-walk variations | **64 pass, 6 fail**; all failures are F1 | `variations.json`, `.log`, `round5-*.json` |
| Exact baseline differential | **FAIL**: nested decode false → true | `delta.json`, `.log`, `round5-baseline-differential.json` |
| Builder's answer-error and transport-error unit files | **22/22 pass** | `package-focused.json`, `.log` |

The independent matrix checks reason, required/observed basis, replica and surface for every expected transport result, plus original-cause identity. Direct typed basis failures preserve identity. Native and Datalog unmet-basis controls in the unchanged HTTP matrix still return `basis-not-reached`, require 4096 while observing 2048, and issue zero answer requests.

## Requested variation disposition

| Variation | Observed result and interpretation |
| --- | --- |
| Socket at node 32 | Classified unreachable on predicate and both surfaces; exact basis fields and original cause preserved. |
| Socket at node 33 and node 10,001 | Not inspected beyond the documented bound; ordinary `ReadError` on both surfaces. Intentional bounded-recognition limit, not an unbounded traversal claim. |
| Traversal access bound | A chain of 1,000 getter-backed wrappers reads exactly 32 cause properties. |
| Self-cycle and two-node cycle without transport | Terminates and stays ordinary `ReadError`. |
| Cycle containing a recognized socket within the bound | Terminates and returns `replica-unreachable` with basis context. |
| AggregateError with transport `.cause` | Recognized, including through both answer surfaces. |
| Fetch-style TypeError wrapping an AggregateError | Recognized through the existing `fetch failed` outer signal. |
| Bare AggregateError with only `.errors`, or mixed HTTP/socket `.errors` | No `.errors` traversal; ordinary `ReadError`. This is a measured scope limit of the singular cause walk, not proof of arbitrary aggregate-tree support. Mixed errors are not assumed to mean only transport failed. No built-in-client outage failure was demonstrated by these synthetic shapes. |
| Default DOM AbortError / TimeoutError; nested AbortError; structured Undici body timeout | All classify as transport failures on both surfaces, with required/observed/replica and original cause. These are synthetic exception-shape tests; this round does not qualify every custom AbortSignal reason. |
| Plain TypeError `terminated`; ordinary JSON error; malformed SELECT result | Stay ordinary `ReadError`. |
| Decode errors containing “connection” | **FAIL F1**, directly and through nested causes. |
| Wrapped HTTP 400 with a socket cause | Stays distinct; HTTP 503 is classified unreachable. |
| Direct typed BasisNotAvailable with socket cause | Preserved by identity and retains `basis-not-reached`; generic wrappers around it are not promoted to replica outages. |

## Cleanup, evidence and limits

All five gate receipts report `sourceStillMatches: true`; their log hashes are read back by `scripts/round5-summary.mjs`. `SUMMARY.json` inventories the gates and individual outcomes; `MANIFEST.json` hashes the retained evidence files. First failures are retained; there was no test assertion relaxation, retry or product edit. The seven failing assertions are the six F1 variations and the exact baseline differential.

The live matrix contacted only shared qlever-dev at `http://127.0.0.1:7070`, through its unique fixture graphs and verifier-owned loopback proxy. No resident was stopped or recreated, no exclusive slot was used, and injected socket loss affected only the proxy response. Final process inspection is retained in `final-cleanup.json`; no worktree-owned lock-holder fixture remains and product-source drift is empty. State and all prior failures remain retained.

No product edits, main-checkout changes, main merge, push, publication, dependency change, build, typecheck, root `pnpm check`, full package suite, new scale/performance benchmark, full golden-scenario acceptance or default enablement occurred. The broader earlier-round suites were not rerun in this narrow task; the requested real-HTTP matrix and focused error files were rerun fresh. This round's cause variations exercise the public native facade and exported Datalog executor with controlled error-producing clients; they do not claim the two synthetic F1 strings were emitted by qlever-dev itself.

Q72c's existing default-off `ReadError` subclasses remain permitted. Q67h's core tag migration and the previously accepted default blockers remain outside this delta; no E-BASIS-NOT-AVAILABLE or E-REPLICA-UNAVAILABLE obligation is closed. F1 is about choosing the wrong permitted reason, not that deferred tag migration.

**Open action:** fix the decode-message false positive and rerun the unchanged socket matrix plus the added negative controls. The nested-socket fix works for the demonstrated real HTTP failures, but the required error distinctions do not yet support **ACCEPT** for default-off integration.
