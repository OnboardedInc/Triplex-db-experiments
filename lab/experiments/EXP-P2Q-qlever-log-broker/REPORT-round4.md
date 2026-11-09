# EXP-P2Q broker fix round 4 — CX-P2Q-R3

**Result:** F1's nested standard-client socket failure is fixed. The unchanged reviewer's real-HTTP matrix passes offline and against shared qlever-dev, including both clients, both surfaces, both response cut points and exact error-field assertions. This is builder evidence for separate review; default-off remains unchanged.

**North star:** P1 exact-basis reads and P2 read-after-commit correctness depend on distinguishing an unavailable replica from an unmet basis. Goals/targets remain [SCOPE](../../SCOPE.md), [NORTH-STAR](../../NORTH-STAR.md) and [TARGETS](../../TARGETS.md). No performance target is certified by these error-path gates.

## Source and fix

Base: `1b55d2e`, product code `03909d6`. Measured implementation: `5390fe8e8020435cea08480d51278cf8e25be393` on `exp/P2Q-qlever-log-broker`.

Read the complete `VERIFY-round4.md` and regression file in reviewer worktree `agent-aea2afc01cf3f010f` without editing that worktree or the main checkout. `lab/verify/P2Q/tests/round4.test.ts` is a byte-identical copy of the reviewer's file; the harness also matches. Import provenance, reviewer head and the test SHA-256 are retained in `evidence-round4/reviewer-import.json`.

Only product change: `packages/qlever/src/broker/errors.ts`, `isUnreachable`.

- Follow at most 32 distinct values through `.cause`, keeping a visited set to terminate cycles. Preserve the original cause objects.
- Recognize structured `UND_ERR_SOCKET`, `UND_ERR_CONNECT_TIMEOUT`, `UND_ERR_HEADERS_TIMEOUT` and `UND_ERR_BODY_TIMEOUT` codes, alongside the existing Node transport recognition.
- Stop at `BasisNotAvailable` and preserve HTTP status classification: HTTP 4xx is not an outage, HTTP 5xx is. Neither arbitrary TypeErrors nor the outer text “terminated” alone gains transport status.
- The existing native/Datalog SELECT request boundaries now recognize the standard fetch client's `TypeError("terminated") -> SocketError {code: "UND_ERR_SOCKET"}`. They retain `reason: "replica-unreachable"`, the requested basis, last successfully observed marker, replica, surface and original cause chain. An unreachable request does not claim a fresh marker observation.

No HTTP client implementation, answer wrapper, write/feed path, marker/incarnation guard, wait deadline, default setting or package contract was changed. The standard and fresh-connection clients remain distinct and both are exercised. No blind update replay or uncertain-outcome behavior changed.

Twelve new package controls exercise nested Undici/Node transport codes, original cause identity, ordinary TypeError/SyntaxError/decode errors, HTTP 400 and typed basis failures containing socket causes, HTTP 503, cyclic causes, and both sides of the 32-node bound.

## Gates and evidence

All evidence below is relative to [evidence-round4](evidence-round4/). Commands ran through `node lab/bin/heavy.mjs --label CX-P2Q-R4-suites -- python3 .../run-round4.py`, with process-inspection access already established as necessary by the prior round's lock-fixture failures. Node: v22.23.2. Host free disk was about 24 GiB before admission and remained above the 5 GiB floor. No install, dependency change or package rebuild occurred.

Each gate has a command/environment/source-hash receipt, measured code head, start/end, exit code and log SHA-256. All seven final receipts were read back: exit 0, `sourceStillMatches: true`, measured head `5390fe8`, and matching log hashes. The HTTP transport artifacts' exact reason/basis/replica fields were also read back and checked. Input hashes include QLever/core source, reviewer tests/harness, lockfile, TypeScript configuration, workspace aliases and the actual runner. Runtime tests use the existing source aliases and source/tsx subprocess fixtures. Output directories are distinct per gate, and the runner refuses to overwrite an existing gate receipt.

| Gate | Result | Evidence |
| --- | --- | --- |
| QLever offline package suite | 82 passed, 26 live tests skipped; 11 files passed, 4 skipped | `unit.json`, `unit.log` |
| QLever TypeScript | exit 0, using this checkout's existing core declarations | `typecheck.json`, `typecheck.log` |
| Unchanged reviewer real-HTTP offline matrix | 30 passed, 12 live cases skipped | `http-offline.json`, `.log`, `http-offline/` |
| Unchanged reviewer qlever-dev matrix | 12 passed, 30 offline cases filtered out | `http-live.json`, `.log`, `http-live/` |
| Original round-three reviewer regressions | 7/7 passed | `reviewer-regressions.json`, `.log`, `reviewer-regressions/` |
| Full verifier offline suites, 60 seeds | 72 passed, 18 live/filtered cases skipped; 12 files passed, 2 skipped | `verifier-offline.json`, `.log`, `verifier-offline/` |
| Light qlever-dev broker suite | 5/5 passed | `light-live.json`, `light-live.log` |

The offline matrix's transport cases assert required **1024**, observed **2048**, replica `the QLever replica`, and the correct native/Datalog surface. For both clients/surfaces it covers connection refusal, headers flushed then socket closed, partial JSON body then socket closed, and HTTP 503. HTTP 400 containing “connection”, a completed malformed SELECT response, and a successful empty result are negative/success controls. Unmet-basis cases require 4096 while observing 2048; both preserve `basis-not-reached` and issue zero answers.

The live matrix uses actual broker commits and marker probes: requested first commit **2048**, last observed marker **4095**. All twelve combinations of two clients, two surfaces and connect/header/body schedules pass exact field assertions. Each header/body interruption first obtains a real qlever-dev answer, then truncates only the fixture-owned proxy response. The four formerly failing standard-client cases retain the actual nested `TypeError: terminated` / `UND_ERR_SOCKET` chain. Raw socket events, forwarded request counts and causes are in `http-live/round4-live-{standard,fresh}-{native,datalog}-{connect,headers,body}.json`; offline counterparts are in `http-offline/`.

The 60-seed model run converged all 60 replicas with zero mismatches and zero stale gate accepts. It recorded 3,047 normal reads, 1,488/1,488 exact outage reads, 387 gate reads (62 accepted, 325 typed), 3,152 commits with zero failed/unknown, 306 regressions, 195 crash-reopens and 535 outage actions. Raw schedules are in `verifier-offline/check3-fuzz-summary.json`. These are bounded model schedules, not exhaustive interleaving coverage.

The original round-three two-second native default deadline and existing basis/HTTP/A0 controls remain covered. These results do not migrate the core error tags or claim full acceptance.

## Attempts, cleanup and limits

No gate failure or assertion relaxation occurred in this round. There was no retry against changed product bytes or reused evidence directory. Earlier rounds' first failures and receipts remain untouched. This round's logs retain the existing Vite extension warning; it does not prevent tests from running.

Live engine requests went only to `http://127.0.0.1:7070`. The injected failures affect fixture-owned loopback endpoints; tests explicitly reject another live endpoint. Unique fixture graphs/state directories were used. No resident was stopped/rebuilt, no exclusive slot was taken, and no default Docker daemon, unrelated service, forbidden checkout or forbidden port was used. Normal test cleanup is unchanged; retained state lives under Git-ignored `runs/broker/CX-P2Q-R4/`.

Final process inspection found no remaining worktree lock-holder fixtures or round-four heavy controllers. No process cleanup was needed. Cleanup and evidence-hash verification are recorded in `cleanup.txt` and `MANIFEST.json` (all 132 evidence files hashed). A report/evidence-only commit follows the measured implementation commit.

No main-checkout edit, merge, push, publication, default enablement, dependency installation, root `pnpm check`, pack/build gate, PostgreSQL/FoundationDB suite, browser/e2e run, matched benchmark, scale/concurrency/sweep or full golden-scenario qualification occurred. This is a scoped QLever runtime/error-path check, not performance or production-readiness evidence.

Open: separate adversarial review of this delta. Q72c's permitted default-off `ReadError` subclasses remain; Q67h's core tagged-error migration is still required before default enablement. No E-BASIS-NOT-AVAILABLE / E-REPLICA-UNAVAILABLE obligation is claimed closed. Earlier default blockers, including outage replay scalability and the core native facade, remain outside this round.
