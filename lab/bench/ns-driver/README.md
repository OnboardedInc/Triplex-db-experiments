# NS split (EXP-NSR)

North star: P1–P5 need a driver whose instants and captured answers candidate code cannot change.
Scope and bars are in `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`.

`driver.mjs` runs frozen trace offers, closed-loop readers (256 by default), RYOW, P4 pulls and pinned sweep pulls.
All candidate calls cross `rpc.mjs` (`ns-sut/1`, `schema.json`). `p3.mjs` and `feed.mjs` contain evaluator-owned P3M
measurement and FD01 content validators; `lib/p3.mjs` retains the candidate adapters and source recorder and re-exports
the moved audit for the historical monolith. `check-imports.mjs` walks the driver closure and emits a hash manifest.

Candidate processes start with:

```sh
node packages/qualification/workloads/ns-sut.ts --role broker --config /in/config.json
node packages/qualification/workloads/ns-sut.ts --role readers --config /in/config.json
node packages/qualification/workloads/ns-sut.ts --role consumer --config /in/config.json
```

The evaluator supplies `runId`, `provider` (candidate module exporting `openNsRole(role, config)`), role-specific
ports and stores. Broker startup requires a store path and durable-flush preflight; the provider owns actual backend
construction. Each provider returns only that role's RPC handlers plus `close()`. Feed consumers obtain pages from
the broker RPC, never by mounting the broker database. Fixture providers demonstrate this transport, not a production
composition. No stock lane provider has been qualified here.

The driver config contains `offline: true`, `binding` (`runId`, `sourceSha256`, `inputsSha256`, `slot`), `keyFile`,
`output`, `endpoints`, `readRequests` (driver-recorded subject/basis), scheduled `trace` offers (`atMs`, `command`),
optional `pulls` and `sweep` (`basis`, `release`, unique `subjects`). It writes HMAC-chained `ns-hr/1` chunks and a seal.
Keep the key and output volume private to the trusted container. Candidate answers and timings are cross-checks.
The P3M source-owned timestamps remain **diagnostic only**; qualification needs the independent observer brackets
and CR-NS recompute (R44 B2–B5). `readerLevel` requires per-second completed-loop and relay evidence; starting 256
loops alone never qualifies L256. Short offline fixtures deliberately have no qualified reader level.

`runNS` refuses live qualification; this change does not set up containers, slots, an observer, fault injection,
or contract pins. The G03 runner must supply those separately. Mac runs are DIAGNOSTIC.

Round 2 read evidence uses `answer-canonical/1` (specified in `schema.json`): the semantic answer digest
is independent of RPC IDs and formatting. Every read keeps that digest, its separate raw-wire digest,
and the canonical key for the complete driver-sent request, including configured shape/hops, route,
basis and any additional fields. `answer-policy` declares first-plus-every-16 sampling per loop by
default; all non-loop pulls retain bytes. No loop is excluded from sampling.

The import gate admits a restricted set of Node builtins needed for data IO, hashing, clocks and TCP.
Module, worker, VM and process-based runtime loaders are refused, including aliases. The sole child-process
capability is the literal macOS boot-ID sysctl in `clock.mjs`; other commands or aliasing are refused.
Runtime file reads supply config/key/clock data, never executable imports. This is a conservative closure
check for evaluator-authored code, not a general JavaScript security sandbox.
