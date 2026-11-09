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

In progress. Durable evidence root:
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-NSR/`.

First attempts remain: `offline-1.log` records sandbox refusal of `sysctl kern.bootsessionuuid` (eight failed checks,
three passed); `clock-flush-1.log` records two invalid ESM spy attempts. New attempts use distinct directories/logs.
The mocks were corrected to module-factory mocks; clock-dependent offline commands are rerun with boot-identity access.
G0 first attempt was started in the sandbox and is retained as historical attempt evidence, not acceptance.

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

## Contract / pins

No lab/acceptance file is edited. Final changed-pin inventory and gate outcomes will be added after the runs finish.
P3M final-head check currently still resolves to d523f632; no newer P3M commit was available at the last check.
