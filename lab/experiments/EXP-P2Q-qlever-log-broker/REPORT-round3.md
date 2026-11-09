# EXP-P2Q broker fix round 3 — CX-P2Q-R3

**Result:** the remaining F1 answer-request outage defect is fixed on native SPARQL and Datalog. The unchanged reviewer regressions pass. This is builder evidence for separate adversarial review, not a promotion or default-enablement decision.

**North star:** a correctness floor for P1 exact-basis reads and P2 read-after-commit behavior: callers must distinguish an unreachable replica from a replica that simply has not reached the requested basis. Scope and targets remain [SCOPE](../../SCOPE.md), [NORTH-STAR](../../NORTH-STAR.md) and [TARGETS](../../TARGETS.md). This round addresses Q72c / Q67h's reason/field requirements only; the deferred core tagged-error migration remains open.

## Source and narrow change

Base: `c936b2a` (product code `957e3a3`). Implemented/measured code commit: `03909d656c87958077369353b6f368fbb419fee8`, branch `exp/P2Q-qlever-log-broker`.

Read the reviewer report and regressions from `3cf609a` with `git show`, and the main-checkout rulings read-only. The reviewer file `lab/verify/P2Q/tests/round3.test.ts` and its harness are copied byte-for-byte from that commit (verified with `git diff --exit-code 3cf609a --` on those two paths). The harness delta from the builder base is only the reviewer's optional output/state directory environment variables.

- Native broker reads route their source, relation SELECTs and final answer SELECT through a request-boundary classifier. Datalog broker reads do likewise for all answer, check, count, domain and recursive-materialization SELECTs after the basis gate. `isUnreachable` identifies transport failures and HTTP 5xx; existing typed `ReadError` failures pass through.
- The resulting `ReplicaUnavailable` has `reason: "replica-unreachable"`, `required`, `observed`, `replica`, `surface` and the original `cause`. `required` is the resolved read basis; `observed` is the last successfully observed marker, not a claim that an unreachable replica's current marker was read. The error class accepts these additional fields without changing existing probe/dependency callers.
- Classification happens at SELECT request boundaries, not around arbitrary builders or compilation. HTTP 4xx/query rejection and validation keep their existing behavior. A0 stays on its original wrapping path. An unattained basis remains `basis-not-reached`; no answer fallback, wait deadline, marker/incarnation guard, write/feed behavior or default setting changed.
- Relation working updates, their reconciliation and uncertain-outcome semantics are unchanged. Only their SELECT failures receive this classification. Delegated client methods keep the original client receiver.

The package's ten new tests cover both surfaces: ECONNRESET and HTTP 503 with exact basis fields/cause, HTTP 400 containing the word “connection” as a negative control, an existing `BasisNotAvailable` passed through unchanged, and A0 transport-error wrapping. The separate reviewer's seven-case file includes both originally failing native/Datalog regressions, the passing dependency-state control, and the actual default two-second unattained-basis wait.

## Fresh gates

Evidence is under [evidence-round3](evidence-round3/); paths below are relative to that directory. All suites ran through `lab/bin/heavy.mjs`. Node was v22.23.2. Host free space was about 27 GiB, above the 5 GiB admission floor. No dependency installation was needed.

The final process-access rerun uses `retry-runner.py`, retained beside its controller log. Each gate receipt binds its command, code head, source SHA-256 map, environment, start/end, exit code and log SHA-256. All five final gates report `sourceStillMatches: true` at `03909d6`; their exit codes and log hashes were read back and checked. `MANIFEST.json` hashes all 103 retained evidence files. Workspace Vite aliases resolve package source; the subprocess fixture uses tsx/source imports.

| Gate | Result | Receipt |
| --- | --- | --- |
| QLever offline package suite | 70 passed, 26 live tests skipped; 10 files passed, 4 skipped | `process-access-retry/unit.json`, `.log` |
| QLever TypeScript | exit 0 | `process-access-retry/typecheck.json`, `.log` |
| Unchanged reviewer round-three regressions | 7/7 passed, including both F1 cases | `process-access-retry/reviewer-regressions.json`, `.log` |
| Full verifier offline suites, 60 seeds | 42 passed, 6 live tests skipped; 11 files passed, 2 skipped | `process-access-retry/verifier-offline.json`, `.log` |
| Light qlever-dev broker suite | 5/5 passed | `process-access-retry/light-live.json`, `.log` (initial attempt also passed) |

The reviewer's native default-deadline control waited about 2004 ms, returned `basis-not-reached`, and issued zero answer requests (`process-access-retry/reviewer-regressions/round3-native-default-deadline.json`). Both outage regressions returned `replica-unreachable` (`round3-native-mid-answer-outage.json`, `round3-datalog-mid-answer-outage.json` in the same directory). Exact basis fields and original causes are additionally asserted by the package tests.

The final 60-seed model run recorded 3,056 normal reads; 1,698/1,698 exact outage reads; 379 gate reads (48 accepted, 331 typed), zero stale accepts; 3,156 commits, zero failed/unknown; 305 regressions, 204 crash-reopens and 600 outage actions. It recorded no mismatches. Raw schedules and per-seed convergence are retained at `process-access-retry/verifier-offline/check3-fuzz-summary.json`. These are bounded model schedules, not exhaustive interleaving or performance acceptance.

## First attempts and cleanup

- `focused.log` retains a command/config error before any tests ran: specifying both a package-relative config and `--root packages/qlever` doubled the config path. The full package invocation uses the existing working command `vitest run --root packages/qlever` and includes all new cases.
- The initial sandboxed package suite passed 68 tests and failed two existing lock-helper process-inspection cases. The initial verifier suite passed 40 tests and failed two corresponding process-lock cases. Their logs/receipts remain `unit.*` and `verifier-offline.*`; both attempts have stable source hashes. Typecheck, the seven reviewer regressions and the five light live cases already passed in that attempt.
- Process inspection proved an orphaned package fixture belonged to this worktree's failed attempt: tsx parent PID 55100 and Node holder PID 55110, with exact fixture path and stream directory `runs/broker/EXP-P2Q/fixes/dbdd98fa-6f9f-4499-a682-672fd632fded`. Those two exact processes were killed; no other process was targeted. Subsequent process scans found no matching worktree lock-holder fixture. `cleanup.txt` retains the final check.
- The explicit retry reason was to give the existing subprocess tests the process-inspection access unavailable inside the sandbox. The retry used a fresh evidence/state output directory per gate. It passed both offline suites without changing product or test assertions. Controller logs retain heavy-slot waits. Earlier files were not overwritten by the retry.
- Live work contacted only shared qlever-dev at `http://127.0.0.1:7070`, using the package tests' unique graphs. Normal fixture cleanup was used. No engine lifecycle action, exclusive slot, default Docker daemon, unrelated service or forbidden port was used. Source/state/evidence and first-failure receipts are retained; no forensic state was deleted to make a trial fit.

## Boundaries and open questions

No main-checkout edit, merge, push, publication, default enablement, dependency change, root `pnpm check`, package rebuild/pack check, PostgreSQL/FoundationDB integration, browser/e2e, full acceptance gate, matched performance benchmark or golden-scenario qualification was performed. This scoped SELECT error-classification change was tested against QLever source directly. No latency/throughput target or production-readiness claim is made.

Q72c still permits the default-off `ReadError` subclasses; Q67h's core `_tag` migration remains required before default enablement. No E-BASIS-NOT-AVAILABLE or E-REPLICA-UNAVAILABLE obligation is claimed closed. Prior N4 outage replay scalability and other accepted default blockers remain outside this round.

No new implementation question remains for F1. A separate reviewer must assess the committed delta and fresh evidence. The report/evidence-only commit follows the measured code commit.
