# EXP-P2Q broker fix round 5 — CX-P2Q-R3

**Result:** the decode-message false positive is fixed by removing all message-text transport recognition. Requested final-source gates and the reviewer controls are recorded below. This is builder evidence for separate review, with the broker still default-off.

**North star:** P1 exact-basis reads and P2 read-after-commit correctness require reliable distinctions among outages, unmet bases and query/decode failures. Goals/targets remain [SCOPE](../../SCOPE.md), [NORTH-STAR](../../NORTH-STAR.md) and [TARGETS](../../TARGETS.md). These are correctness/error-path gates, not performance acceptance.

## Source and implementation

Base/report: `cb61b66`; previous product code: `5390fe8`. Structured-identity fix: `f38647652facbebf3b289eaf0ad08654f0916456`. Final code, including the fail-closed traversal-bound safeguard: **`c2d4aa0692f543f392572efa5cc2e722cf1c159f`**, branch `exp/P2Q-qlever-log-broker`.

Read the full reviewer `VERIFY-round5.md` and its controls at the supplied read-only `agent-aea2afc01cf3f010f` worktree. The fix has three parts:

1. `broker/errors.ts` no longer reads or matches error messages. It recognizes exact allowlisted Node/Undici codes, `QleverRequestError` identity, real DOM `AbortError` / `TimeoutError` identities, and HTTP 5xx. Bare strings and arbitrary TypeError/Error messages such as “connection”, “ECONNRESET”, “fetch failed”, “deadline”, “aborted” and “terminated” are insufficient.
2. Within the bounded singular `.cause` walk, `BasisNotAvailable`, HTTP status below 500, `SyntaxError`, and typed `QleverDecodeError` take precedence over transport indicators at any earlier visited node. The walk inspects at most 32 distinct nodes and detects cycles. A positive indicator is accepted only if the chain ends or closes an inspected cycle; an unvisited suffix at the depth bound returns unclassified, because it could hide a protected error. Node-32 socket recognition, node-33 refusal, cycles and the 32-cause-access bound remain tested.
3. Both clients emit a `QleverDecodeError` (still a TypeError) for a completed response without SELECT bindings. Actual standard-client request aborts/timeouts are wrapped using request-signal state in `QleverRequestError`, preserving the original cause. The fresh-connection client's own abort/timeout branches emit that same typed identity. Both classes are exported alongside the existing client errors. No prose determines the category. Existing native/Datalog answer wrappers retain their reason, required/observed marker, replica, surface and cause handling.

No write/feed implementation, basis/incarnation guard, wait deadline or default setting changed. Working-update reconciliation and uncertain-outcome semantics are unchanged. Native/Datalog outages retain `replica-unreachable` with the resolved requested basis and last successful marker observation; unmet bases remain `basis-not-reached`.

## Controls and explicit fixture adaptations

The reviewer's direct `TypeError("Cannot decode the connection field")` and nested `SyntaxError("Invalid JSON in connection field")` negative assertions are unchanged. Predicate/native/Datalog cases all pass; both surfaces retain ordinary `ReadError` with original-cause identity. The exact baseline differential also passes: nested decode is false before/after, and the old direct-decode true is now false (`final/controls/round5-baseline-differential.json`).

`round4.test.ts` and `round5-delta.test.ts` are copied unchanged. `round5.test.ts` has one documented expectation adaptation: `aggregate-fetch-wrapper` previously expected true only because the outer TypeError said “fetch failed”. The new explicit user requirement prohibits that evidence. Neither node in its singular cause chain has transport identity, so it now expects false on predicate/native/Datalog. No `.errors` tree traversal was added; bare/mixed aggregate `.errors` controls remain false. Aggregate `.cause` pointing to a structured socket remains true. This is a policy adjustment, not a claim that every original reviewer expectation was unchanged. Original reviewer bytes, SHA-256s and the complete adaptation diff are retained in `reviewer-import.json`, `*.reviewer-source.txt`, and `*.adaptation.patch`.

Older package and verifier outage mocks now attach actual `ECONNRESET` / `ECONNREFUSED` codes instead of expecting text-only errors to count as transport. Their success/refusal/basis assertions are unchanged. Those input-shape adaptations are committed in the package fix tests, answer-error tests, verifier harness and round-three fixtures; they do not alter historical reports/receipts at earlier commits.

The new package request-error tests cover negative prose controls, exact code/DOM/class identities, protected nested errors after an early transport code through the last inspected depth, a protected suffix beyond the bound, and both native/Datalog boundaries. Real loopback requests test actual caller aborts with an opaque Error reason and actual request timeouts through both HTTP clients. The tests do not claim exhaustive custom AbortSignal-reason support.

## Final-source gates

Evidence paths below are relative to [evidence-round5](evidence-round5/). All runs use `lab/bin/heavy.mjs`, Node v22.23.2, installed workspace tools and source aliases. Existing subprocess tests use process-inspection access established in earlier rounds. No installation or package build was needed. Host free disk was about 22 GiB before the first admission and about 20 GiB before final admission, above the 5 GiB floor.

Final command: `node lab/bin/heavy.mjs --label CX-P2Q-R5-final-suites -- python3 lab/experiments/EXP-P2Q-qlever-log-broker/run-round5-final.py`.

| Final code `c2d4aa0` gate | Result | Receipt/log |
| --- | --- | --- |
| Reviewer cause/decode controls plus exact baseline differential | 71/71 passed | `final/controls.json`, `.log`, `final/controls/` |
| QLever offline package suite | 102 passed, 26 live cases skipped; 12 files passed, 4 skipped | `final/unit.json`, `final/unit.log` |
| QLever TypeScript | exit 0 | `final/typecheck.json`, `.log` |
| Unchanged real-HTTP offline matrix | 30 passed, 12 live cases skipped | `final/http-offline.json`, `.log`, `final/http-offline/` |
| Unchanged real-HTTP qlever-dev matrix | 12 passed, 30 offline cases filtered out | `final/http-live.json`, `.log`, `final/http-live/` |

The HTTP offline matrix covers both standard/fresh clients and native/Datalog, connection refusal, headers-only and partial-body truncation, HTTP 503, HTTP 400 containing “connection”, completed malformed SELECT responses and empty success. Transport cases assert required **1024**, observed **2048**, replica `the QLever replica` and surface; original cause chains are retained in raw artifacts. Its unmet-basis controls require 4096 while observing 2048 and send zero answers.

The live matrix contacts only shared qlever-dev at `http://127.0.0.1:7070`, using actual broker commits/marker probes. Every transport case requires first commit **2048** while last observing marker **4095**. Header/body cut cases first acquire a real engine answer and truncate only the fixture-owned proxy response. All field assertions and cut schedules are unchanged from the reviewer file; raw events and causes remain in `final/http-live/`.

Every gate receipt retains exact command/environment, measured Git head, source SHA-256 map, start/end, exit status and log SHA-256. All five final-source receipts were read back: exit 0, `sourceStillMatches: true`, measured head `c2d4aa0`, and matching log hashes. Both formerly failing decode shapes and all final HTTP transport fields were also read back and checked. Inputs include the actual runner, core/QLever source, lockfile, compiler/alias configuration, tests and oracle/harness files. Distinct per-gate and per-attempt directories prevent overwriting evidence; both runners refuse existing gate receipts.

## Retained first run and additional safeguard

All seven first-run gates passed at `f386476`, with stable source hashes: 71 controls, 101 package tests (26 live skipped), typecheck, 30 HTTP offline cases, 12 HTTP live cases, the full verifier offline suite (143 passed / 18 skipped), and 5 light broker live cases. Their receipts/logs/output remain directly under `evidence-round5/`, separate from `final/`.

After that complete source-pin window, source review identified the depth-limit safeguard: an early positive code must not override an unknown suffix that could contain a protected error. The final commit adds a focused regression and refuses incomplete scans. This was an additional hardening change, not a failed-gate retry or an assertion relaxation. The five requested gates above were rerun on the final commit with fresh output/state directories. The supplemental 143-test full verifier run and five-case light broker suite are evidence for **`f386476` only**, not fresh full-suite certification of `c2d4aa0`.

## Cleanup and limits

No failing gate, overwritten attempt, dependency change, engine lifecycle action, exclusive slot, main-checkout edit, merge or push occurred in this round. First-run evidence, original reviewer controls and prior rounds' first failures remain retained. Vite's existing extension warning remains in raw logs. State is retained under Git-ignored `runs/broker/CX-P2Q-R5*/`. Normal test fixture cleanup is unchanged; injected socket failures affect owned loopback endpoints, not engine processes. No default Docker daemon, forbidden checkout or forbidden port was used.

Final process inspection found no remaining worktree lock-holder fixtures or round-five heavy controllers; no process cleanup was needed. All seven first-run receipts and five final-source receipts were read back with stable source and matching log hashes. Cleanup and hashes of all 397 evidence files are retained in `cleanup.txt` and `MANIFEST.json`. The report/evidence-only commit follows the final measured implementation commit.

No root `pnpm check`, package build/pack check, PostgreSQL/FoundationDB suite, browser/e2e, matched benchmark, scale/concurrency/sweep or complete golden-scenario qualification occurred. No performance, production-readiness, promotion or default-enablement claim is made.

Open: separate adversarial review. Q72c's permitted default-off `ReadError` subclasses remain; Q67h's core error-tag migration and earlier default blockers (including outage replay scalability and the core native facade) remain outside this round. No E-BASIS-NOT-AVAILABLE / E-REPLICA-UNAVAILABLE obligation is claimed closed.
