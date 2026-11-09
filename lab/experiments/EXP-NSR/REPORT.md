# EXP-NSR — NS driver / candidate split

Builder: CX-NSR. Branch: exp/NSR-bench-split. Base: d523f632 (EXP-P3M).

North star: every P1–P5 cell needs measurements captured by trusted driver code, outside candidate processes (Q86a).
Goals and bars: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md. Design: R44 sections 2, 3.4–3.5, 5.1, B1/B7;
pending Q100a/d/f/m. This report describes builder checks, not independent promotion or NS qualification.

## Implementation

- `lab/bench/ns-driver/driver.mjs`: trusted scheduled offers (ACK-independent), 256 closed reader loops by default,
  RYOW, P4 pulls, pinned sweep pulls, captured request bases, answer hashes and sampled bytes, event-loop hiccup meter.
- `rpc.mjs`, `schema.json`: ns-sut/1, one UTF-8 JSON line per TCP connection; exact envelopes, method/role/run/request
  binding, 1 MiB request and 16 MiB response limits, nesting cap, typed candidate errors and request timeout.
- `events.mjs`: fresh exclusive output directory, append-only HMAC-chained chunks, sequence and prior-HMAC continuity,
  run/source/input/slot binding and terminal seal. `controlEvent` emits hook notifications without any Docker access.
- `check-imports.mjs`, `build.mjs`: TypeScript-AST import-closure traversal, dynamic execution/import refusal, realpath
  boundary checks, package-free bundle copy and content manifest. The frozen trace generator remains the same source.
- P3M pure measurement moved to `ns-driver/p3.mjs`, with evaluator-owned FD01 validators in `feed.mjs`. The original
  monolith retains its public API through re-exports, plus candidate adapters/source recorder in `lib/p3.mjs`.
- `packages/qualification/workloads/ns-sut.ts`: long-lived broker/readers/consumer role server. Candidate provider
  loading happens only there. Role startup/shutdown and RPC transport are exercised in separate OS processes.
- Linux FD01 clock identity is now `{bootId, timeNs, primitive: CLOCK_MONOTONIC}`; hostname is absent. macOS keeps
  its distinct boot-bound diagnostic clock. Both equality implementations reject cross-boot/time-namespace comparisons.
- `assertDurableFlush`: Linux refuses tmpfs, overlay and unknown filesystem/device paths; requires a recognized
  filesystem, barriers, readable block-device cache mode and successful real fsync calibration. ConsumerStore invokes
  it before opening SQLite; NS broker entry invokes it before loading its provider. Calibration reports guest-flush
  durability with host power-loss explicitly unqualified.

## Boundaries and remaining integration

The split runner is deliberately DIAGNOSTIC and refuses live qualification. G03 owns hardened VM containers, separate
volumes/cgroups, role images, observer brackets and live resource admission. CR-NS owns independent recomputation.
The P3M sidecar timestamps remain CR and cannot become trusted publication evidence here.

`openNsRole(role, config)` is the candidate provider interface. The committed provider is an offline parity fixture,
not a newly qualified live lane composition. The fixture consumer gets feed pages over broker RPC; its source/metadata
file access is Mac diagnostic scaffolding, not the VM volume layout. A live provider must supply native lane commit,
read, feed and consumer behavior. The baseline contains no SQL01 `packages/broker` source; this change guards the NS
broker entry, and does not claim to change an absent SQL01 store constructor.

Linux refusal and two-hostname checks use mocked OS probes on this Mac; an actual Linux tmpfs startup and device flush
calibration are not verified. No engine slot, Docker lifecycle, deployment, acceptance-contract edit or production run.

## Gates and evidence

Builder checks completed; results below. Durable evidence root:
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-NSR/`.

First attempts remain: `offline-1.log` records sandbox refusal of `sysctl kern.bootsessionuuid` (eight failed checks,
three passed); `clock-flush-1.log` records two invalid ESM spy attempts. New attempts use distinct directories/logs.
The mocks were corrected to module-factory mocks; clock-dependent offline commands are rerun with boot-identity access.
`offline-2.log`: 11/11 checks passed, including seeded split/monolith equality, actual candidate role processes,
256 distinct completed fixture loops, P3M delay/negative fixtures, and raw feed contents. `clock-flush-2.log`: 2/2
mocked Linux identity/refusal checks passed. These are builder observations, not independently verified promotion.

G0 first attempt `G0-qlever-20261109T072300Z-84a267` completed FAIL: 1203 passed, 12 failed, 71 expected skips.
The initial pnpm shim duplicated the store option on the gate's build argv (pnpm reported `filepath.startsWith is
not a function`); its missing QLever/qualification builds and sandbox boot-identity failures remain in the receipt.
The initial module-spy failures are retained in that attempt. The shim is corrected to add the owned store only when
it is absent. The first receipt is retained unchanged.

## PASS / verdict / receipt audit (rule 9a)

1. **`runNS` result and HR seal (`driver.mjs`, `events.mjs`)**: emits only DIAGNOSTIC. Content is captured from actual
   RPC bytes and hashed, chunks are chained and keyed; freshness is exclusive directories/files and fresh request IDs;
   binding is the supplied attempt/source/input/slot tuple in every chunk. These bindings are caller-supplied and need
   evaluator validation; no candidate reply, seal or diagnostic result is an NS PASS.
2. **Moved `auditP3` (`p3.mjs`)**: checks byte-equivalent feed contents against a source prefix, complete resolutions,
   publication inventory, positions, receipt identities, checkpoint, samples and observed readers. Freshness checks
   runId and window instants; binding checks source/stream and publication/transaction coordinates. Its positive fields
   remain P3M offline/CR diagnostic arithmetic, never observer evidence. The monolith's existing OFFLINE-PASS/MEASURED
   receipt writer remains in `p3-driver.mjs`; no new qualification PASS route was added.
3. **`readerLevel`**: positive reader level requires per-second distinct completed loops for 99% of seconds and relay
   agreement within 10%, against supplied window bounds. The caller must bind retained HR/TO events to the attempt;
   absence of relay data fails. `runNS` does not turn requested loops or short fixture completions into qualified L256.
4. **Import manifest / bundle**: AST closure checks content and realpaths; files are read in the current invocation,
   hashed and copied to a fresh destination. This is a static dependency gate, not semantic acceptance.
5. **Durability admission**: actual startup checks occur before SQLite/provider opens, using the selected path's
   filesystem/mount/device and a fresh fsync probe; typed refusal precedes volatile store creation. A successful
   preflight is a guest flush-path observation, not proof of host power-loss durability.
6. **Builder tests and G0**: test assertions compare observed content and deliberately changed controls in fresh
   attempts. Existing G0 machinery binds builds/inputs and retains raw outputs. Builder results do not self-certify
   promotion; independent review remains required.

7. **Final evidence manifest / copied-object summary**: each SHA256SUMS entry was produced from retained file bytes
   and read back in the same invocation; every one of the final G0 receipt's 44 object references was checked against
   the copied CAS bytes. Freshness is the completed attempt's retained paths, not a reused PASS summary. Binding is
   the original receipt/run ID, its tested source c194baf7 and the explicit durable-root relative path. The manifest
   asserts preservation only; it does not upgrade any failed attempt or diagnostic into semantic acceptance.

## Contract / pins

No lab/acceptance file is edited. `pin-changes.json` lists changed paths found in contract pin dictionaries; currently empty. Final gate outcomes follow below.
P3M final-head check currently still resolves to d523f632; no newer P3M commit was available at the last check.

## Final builder result

Source tested: `c194baf7` (implementation `74111638`). Final evidence/report commit changes no runtime source.

| Check                                                                           | Result                                                                 | Receipt / durable evidence                                       |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Static driver closure, copied bundle import                                     | Eight evaluator files; no candidate package path; copied entry loads   | `bundle-c194baf7.json`, `bundle-c194baf7/manifest.json`          |
| Split / P3M diagnostic parity and P3M negative gates                            | 11 passed, 0 failed                                                    | `offline-2.log`, `attempt-2/`, `p3m-attempt-2/`                  |
| Two mocked Linux hostnames and volatile-filesystem refusal                      | 2 passed, 0 failed                                                     | `clock-flush-2.log`                                              |
| Final G0 (includes 2048 deterministic RPC envelope mutations and all NSR tests) | **PASS: 1220 passed, 0 failed, 71 expected skips, 0 unexpected skips** | `lab/runs/G0/G0-qlever-20261109T073657Z-30e916.json`, `g0-3.log` |
| Formatting / lint of new and changed implementation files                       | Passed                                                                 | Builder invocation; no runtime source changes after G0           |
| Offline package check                                                           | FAIL: CLI tarball lacks unbuilt `package/dist/index.js`                | `pack-1.log`, `pack/`                                            |

The second G0 attempt, `G0-qlever-20261109T073033Z-9a41f5`, had 1219 passes and one failure: the qualification
suite imported the not-yet-built XTDB dist package. `xtdb-build.log` retains that dependency build. The third attempt
reran the complete G0 on the same source and passed; the second receipt is also retained unchanged.

The final G0 is runKind **diagnostic**, scope **full**, with no engine slot. It is a complete builder G0, not an NS
performance/semantic qualification or independent promotion. Its host suite passed all 22 tests. Production durability,
Linux device calibration and VM placement remain unverified. The offline package check was run as required and did not
reach a clean consumer install; no package-readiness claim is made.

`SHA256SUMS` and `EVIDENCE.md` index the durable evidence root. Raw G0 outputs and their content-addressed objects are
copied under `repository-runs/`; every object bound by the final receipt was checked after copying. Test-owned temporary
artifacts from earlier gate attempts were recovered under `recovered-temp/`. No raw evidence over 1 MB is committed.

Changed contract-pinned paths: **none** (`pin-changes.json` is empty). The current contract's
`writerTrace.generator.frozen.sha256` is null, so equality with a frozen pin cannot yet be asserted. The bundle proposes
the unchanged generator source hash `201f721287b3d3f93e230dc310516369024bcba35cc9151f8c0f3ed3e7f342e4`; the contract
builder must pin it with DRIVER_PIN in the next contract version. `lab/acceptance/` remains byte-unchanged.

The last P3M-head check still returned `d523f632`; it is already an ancestor of this branch. There was no newer final
P3M head to merge. The orchestrator must incorporate later P3M fixes if that branch advances after this handoff.

Open integration: native lane `openNsRole` providers (this change supplies the RPC entry and parity provider), actual
Linux tmpfs/device startup tests, SQL01 constructor-level guarding when its absent source is integrated, G03 hardened
VM placement/observer wiring and CR-NS qualification. The P5 path here drives pinned pulls only; evaluation/outbox
publication is not an accepted P5 result. These limits are not hidden by the passing offline gates.
