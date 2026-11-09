# EXP-P2Q broker fix round 6 — CX-P2Q-R3

**Result:** the inline transport-code allowlist is replaced by one source-audited decision table. The table, dependency guard and real-client matrix cover the missing host/network-down identities and the audited socket/DNS/Undici class. Final source-bound results are below. Broker mode remains default-off; separate adversarial review is still required.

**North star:** a correctness floor for P1 exact-basis reads and P2 read-after-commit behavior: callers must distinguish an unreachable replica, an unmet basis and a decode/query failure. Goals/targets remain [SCOPE](../../SCOPE.md), [NORTH-STAR](../../NORTH-STAR.md) and [TARGETS](../../TARGETS.md). No performance target is certified.

## Source and catalog

Base/report: `04c9976b`; prior product code: `c2d4aa06`. Product implementation: **`65edcc586c28e748029d79997273acfc20a26ed8`**. Final measured source, including the corrected socket fixture: **`7b2227e0530d9f8b207c83a9bb885943747f8762`**, branch `exp/P2Q-qlever-log-broker`. `git diff --exit-code 65edcc58 -- packages` is empty at the final measured head: the retry changes only its test fixture and runner.

Read the complete `VERIFY-round6.md` at the supplied reviewer worktree, without editing it or the main checkout. The only product files changed this round are `packages/qlever/src/broker/errors.ts` and the new `broker/transport-codes.ts`.

The single `QLEVER_ERROR_CODE_TABLE` records **118 decisions: 83 transport, 35 non-transport**. Every row has a source ID and reason; the header cites each pinned source. A derived exact-key Map is used by the existing bounded classifier; there is no second hand-maintained code list or message/prefix transport match.

Sources read directly and retained with hashes/license notices in [sources-round6](sources-round6/):

- Node **v22.23.2** [net](https://nodejs.org/download/release/v22.23.2/docs/api/net.html), [DNS](https://nodejs.org/download/release/v22.23.2/docs/api/dns.html#error-codes), and [errors](https://nodejs.org/download/release/v22.23.2/docs/api/errors.html) docs, plus that tag's libuv error constants, errno header and Node socket/DNS propagation source. The docs defer OS error identities rather than enumerating every platform's socket errno; the libuv source supplies the additional pinned errno catalog. `ENETRESET` is also included as the explicit user-required OS identity; it is not claimed to occur as a separate entry in this Mac runtime's libuv error map.
- All three installed Undici error modules, read from `node_modules/.pnpm/undici@{7.29.0,7.29.1,8.11.2}/node_modules/undici/lib/core/errors.js`, and their `docs/docs/api/Errors.md`. The actual built-in fetch runtime is **Undici 6.28.0**; its bundled `lib/core/errors.js` was read from this Node runtime's native source inventory and retained as well. No module was installed or updated.

The catalog groups are 29 socket identities, 14 libuv getaddrinfo identities, 21 additional DNS identities, 27 additional Node error decisions, and 27 Undici error decisions (duplicate codes use one canonical row). It covers the 24 documented DNS constants after resolving their actual runtime values, all pinned libuv `EAI_*` constants, and every error-code spelling in the pinned net/DNS docs. Node connection errors include the requested EHOSTDOWN, ENETDOWN, ENETRESET, ENOTCONN and EADDRNOTAVAIL alongside connection resets/refusals, reachability, address, shutdown and connection-allocation failures.

Undici transport decisions include socket/connect/header/body timeouts, abort, client closed/destroyed, proxy connection/TLS/SOCKS identities and incomplete response transfer. Base/argument/return-value/parser/header/body-size/request-length/HTTP-response/retry-policy/informational codes are explicitly non-transport; destroying a socket for a resource limit or normal informational reset is not sufficient to call it an outage. `catalog-audit.json` retains every decision and actual installed-module inventories/hashes.

Known non-transport code decisions, SyntaxError/QleverDecodeError, HTTP 4xx and typed basis failures dominate earlier positive indicators within the existing 32-node cause walk. Incomplete scans remain unclassified and cycles terminate. Exact codes, typed request errors and real abort/timeout exception identities remain the only positive evidence. No error message, stack, string conversion or arbitrary TypeError is consulted. No write/feed, basis/incarnation, wait-budget, HTTP-client implementation, schema or default changed this round.

## Coverage and upgrade guards

`transport-code-inventory.test.ts` independently reads every installed Undici errors module plus the actual bundled module. **Any new module code without a table decision fails**, including a newly introduced transport code; it is not silently assigned a non-transport default. A mutation-style control supplies `UND_ERR_NEW_TRANSPORT` and verifies that the inventory reports it missing. The guard is intentionally stronger than transport-only additions: new parser/validation/resource codes also require explicit review.

The package test also checks the pinned Node net/DNS documents and libuv DNS constants, table uniqueness/source/reason fields, and every one of the 118 decisions at root and nested depth. Non-transport entries additionally veto an attached socket cause. This is not a table-only coverage oracle: the installed source and retained pinned docs are independent inputs to the coverage tests.

`round6-codes.test.ts` enumerates all **83 transport entries × 2 injected depths × 2 real HTTP clients × 2 query surfaces = 664 cases**. It instruments the actual client-owned socket, injects one coded error at direct/nested depth after connection establishment, holds the fixture response open, and invokes the real exported client query. It asserts that the actual returned cause chain retains the injected code and that the query error has `replica-unreachable`, required **1024**, observed **2048**, replica `the QLever replica` and correct surface. Native source probes and the Datalog gate are independently controlled. The injected depths refer to the socket error; the standard client may add its own outer fetch wrapper. This is socket-layer error propagation, not a claim that every OS failure physically occurred on this host.

The original reviewer EHOSTDOWN/ENETDOWN pre-connect cases and every-depth predicate/surface checks remain unchanged. Its protected-depth matrix and message-observation tripwires remain unchanged. The sole adaptation to `round6.test.ts` is the AST inventory's expected exact lookup: `Map.get` replaces regex `.test`. Computed error access, message/stack access and coercion remain prohibited. Original reviewer bytes, hash and full adaptation diff are retained in `reviewer-import.json` and `round6-ast-lookup-adaptation.patch`.

## Final measured gates

Evidence paths below are relative to [evidence-round6](evidence-round6/). Final command:

`node lab/bin/heavy.mjs --label CX-P2Q-R6-final-suites -- python3 lab/experiments/EXP-P2Q-qlever-log-broker/run-round6-final.py`

| Gate at `7b2227e0` | Result | Receipt/log |
| --- | --- | --- |
| Catalog/client matrix + original round-six controls + round-five matrix/differential | **763/763 passed**, 4 files | `final/controls.json`, `.log`, `final/controls/` |
| Full QLever offline package suite, including independent inventory/upgrade guard | **224 passed**, 26 live cases skipped; 13 files passed, 4 skipped | `final/unit.json`, `.log` |
| QLever TypeScript | **exit 0** | `final/typecheck.json`, `.log` |
| Unchanged real-HTTP offline matrix | **30 passed**, 12 live cases skipped | `final/http-offline.json`, `.log`, `final/http-offline/` |
| Unchanged real-HTTP qlever-dev matrix | **12 passed**, 30 offline cases filtered out | `final/http-live.json`, `.log`, `final/http-live/` |

The 763 controls comprise the 664 new real-client cases, 28 original round-six cases, and 71 round-five cause/baseline cases. They include every inspectable depth 0–31 for the reviewer's 17-code list, all 252 protected-kind/depth chains through predicate and both surfaces, cycles/bounds, and dynamic zero-message/coercion-read tripwires. The 35 excluded code decisions are separately covered by the package root/nested/veto tests.

The unchanged HTTP offline matrix tests both clients/surfaces, connection refusal, headers/body truncation, HTTP 503, HTTP 400 containing “connection”, completed malformed results, success and unmet bases. Its outage fields are 1024/2048; unmet-basis controls require 4096 while observing 2048 and issue no answer. The live matrix uses actual broker commits/marker probes from **qlever-dev only at `http://127.0.0.1:7070`**, with required commit **2048** and observed marker **4095**. Header/body truncation occurs only on owned loopback proxy responses after acquiring a real engine answer. Raw events, errors and fields are retained.

Gates ran through the shared heavy-job limiter with Node v22.23.2 and existing process access for subprocess-lock tests. Host free disk was about 19 GiB before the first admission and about 15 GiB before the final admission, above the 5 GiB floor. Source-bound receipts retain exact commands, source/dependency hashes (including installed error modules), head, environment, start/end, exit and log hash. Runtime imports use the established source aliases. Per-gate/per-attempt directories are fresh; runners refuse existing gate receipts. All five final receipts were read back with exit 0, `sourceStillMatches: true`, head `7b2227e0` and matching log hashes. All 664 expected code/depth/client/surface tuples and their retained code/outage reasons, plus the final HTTP outage basis fields, were independently read back and checked.

## First failure and fixture correction

The first run at `65edcc58` passed 722 controls before the expanded worker failed with a V8 heap-limit error; `controls.json` records **exit 1**, not semantic acceptance. `controls.log` retains the complete heap/worker failure and partial results. The other first-run gates passed unchanged: package 224, typecheck, offline HTTP 30 and live HTTP 12. Those first files remain directly under `evidence-round6/` and were not overwritten.

Cause of the fixture problem: the initial table test repeatedly destroyed sockets before a request was running. This Node's bundled Undici explicitly treats pre-running `UND_ERR_SOCKET` differently in its client `onError` path, causing reconnect attempts under that artificial schedule; it did not expose the terminal code to the surface. The failure followed the last CLOSED case when the SOCKET schedule began. The worker exhausted its own heap and exited; no process was killed to conceal the result, and `ulimit -c` was zero. This is a fixture failure, not evidence of a wrong completed answer or a failure of the code table. The bundled retry-path source was inspected.

After that attempt's source-pin window completed, the fixture-only commit `7b2227e0` changed injection to one post-connect error, held the response open and set a two-second request budget. This exercises terminal request-error propagation and bounds any unexpected retries. No field/code assertion was relaxed, no heap limit or timeout was increased, and product bytes remained unchanged. All five final gates were rerun on the final source with fresh output/state directories. Heavy-slot waits and first failures are retained.

## Cleanup, limits and open action

Normal fixture cleanup remains active; socket instrumentation is restored in `finally`. State is retained in Git-ignored `runs/broker/CX-P2Q-R6*/`. Final process inspection found no remaining worktree lock-holder fixtures or round-six heavy controllers. All ten first/final receipts and log hashes were read back, including the retained first failure. Cleanup and hashes of all 1597 evidence files are recorded in `cleanup.txt` and `MANIFEST.json`. Source snapshots and license notices remain committed under `sources-round6/`.

No main-checkout edit, merge, push, publication, dependency install/change, default enablement, engine lifecycle operation, exclusive slot, actual host-network fault, default Docker daemon or unrelated service was used. No root `pnpm check`, package build/pack check, PostgreSQL/FoundationDB, browser/e2e, full earlier verifier/fuzz suite, matched performance run, scale/concurrency/sweep or complete golden-scenario acceptance was performed. The full QLever package suite and requested matrices were rerun; they do not certify those broader targets.

Open: separate adversarial review. The catalog is tied to the audited sources; unknown new dependency codes require review rather than automatic prefix admission. The singular cause walk does not inspect AggregateError `.errors` trees, and the 32-node fail-closed limit remains explicit. Q72c's default-off `ReadError` subclasses and Q67h's future core tag migration remain as before; no E-BASIS-NOT-AVAILABLE / E-REPLICA-UNAVAILABLE obligation, default blocker or production-readiness gate is claimed closed.
