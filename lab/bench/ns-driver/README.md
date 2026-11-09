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

Round 3 supersedes the former AST/loader-name checker. `build.mjs` uses the installed, lockfile-pinned
esbuild dependency of tsx to emit **one** `driver.mjs` artifact and retain esbuild's own `metafile.json`.
Every resolved input is realpath-checked; `packages/` and outside-root inputs fail the build. Remaining imports
in that artifact must be Node builtins, explicitly listed in its manifest. `bundleSha256` is now the hash of
the actual executable artifact bytes (`ns-driver-bundle/2`), rather than a source-list hash.

Build and execute through the generated trusted launcher (Node 24):

```sh
node lab/bench/ns-driver/build.mjs /owned/driver-artifact
node /owned/driver-artifact/launch-artifact.mjs /owned/driver-artifact /in/config.json
```

The launcher verifies executable/bootstrap hashes and starts a fresh Node process with `--permission`,
no worker/subprocess grants, exact config/key/artifact read grants, and only driver-output write access.
The mandatory synchronous runtime hook refuses every file/data module except the hash-checked single
artifact and allows only the Node builtin dependencies declared by the bundler. Thus unresolved reflective
or computed imports fail at execution, irrespective of spelling. The source runner refuses to run without
the guard. `driver-runtime` HR events record the actual artifact hash and permission state.

On macOS the trusted launcher reads boot identity before starting the restricted child; it passes that
identity as data, so the driver never needs subprocess permission. Inputs and output must have separate,
non-overlapping paths; in particular use `key-<id>` rather than `<id>.key` beside an output named `<id>`, to
avoid Node 24's overlapping permission-grant behavior. No broad parent-directory grant is substituted.
The artifact directory must remain trusted/read-only in the VM layout. This loader/permission policy is
part of trusted-driver execution, not a claim to sandbox arbitrary hostile JavaScript or replace G03 isolation.
