# EXP-OBS01 observer

North star: an independent evidence floor for P1–P5; goals and targets remain in
[`SCOPE.md`](../SCOPE.md), [`NORTH-STAR.md`](../NORTH-STAR.md), [`TARGETS.md`](../TARGETS.md).
Source design: R27 sections 2–7, 9–10; Q82a–e. Current screening consumer: O-OBS `23e2273`; earlier round-2 receipts remain pinned to `463703d`.

This is collection and authenticated source decoding. It does **not** issue an O-OBS semantic PASS.
The evaluator supplies its own case context and frozen protocol specifications. The default
normalizer produces source samples; the round 2 compiler also derives five protocol record shapes. Acceptance requires independent
verifier recollection. A shared macOS user can still read another process's key.

## Start, witness, stop, retain

All container lifecycle goes through `engine.mjs`, which uses the private triplex2 daemon.
Only exclusive slots held by the invoking holder can acquire observers. No resident configuration changes.
Heavy engine runs use `heavy.mjs`; check host free disk >=5 GiB before admission. The observer adds
128 MiB reserved memory and a configurable output budget (64 MiB by default), plus 8 MiB for tooling and receipts.
`--max-bundle-bytes` accepts 16 MiB through 1 GiB; the full budget enters pool admission. It stops unsealed if its bounded byte budget is exhausted.

Resolve a Python image once with `engine.mjs observer-image --image python:3.13-slim`, then give
`observer-up` the returned immutable `python@sha256:...` reference. The evaluator supplies a fresh
32-byte binary key in an evaluator-owned file outside the bundle. Never put a production key in Git.

```sh
node lab/bin/heavy.mjs --label OBS-run -- node lab/bin/engine.mjs up \
  --lane xtdb --slot s1 --holder OBS-evaluator --exp EXP-OBS01 \
  --cpuset-cpus 0,1 --observation-sources
node lab/bin/engine.mjs observer-up --lane xtdb --slot s1 --holder OBS-evaluator \
  --image 'python@sha256:REPLACE_WITH_RESOLVED_DIGEST' --observer-cpus 5 \
  --run-id run-unique --receipt-id receipt-unique --key-id evaluator-key-id \
  --key-file /absolute/evaluator/run.key
node lab/bin/engine.mjs observer-down --lane xtdb --slot s1 --holder OBS-evaluator
node lab/bin/engine.mjs observer-retain --run-id run-unique --holder OBS-evaluator
node lab/bin/engine.mjs down --lane xtdb --slot s1 --holder OBS-evaluator \
  --note 'retained EXP-OBS01 diagnostic state'
```

`--observation-sources` publishes an observer clock port on loopback at slot port +10000.
For QLever it also enables `/metrics` and the per-query event log **only in that slot's generated script**.
`observer-up` requires digest pinning, a running engine with the clock forward, and disjoint engine/observer CPU sets.
Other pinned containers and observer reservations are checked under the pool lock. Unpinned exclusive engines refuse;
existing unpinned dev residents can still contend for CPU, so this does not establish physical CPU isolation from residents.
New engine admissions cannot overlap an admitted observer. The writer cannot stop or replace an engine with an observer attached.

`observer-up` launches a host tooling watcher: it appends authenticated stream heads to an independent host
`runs/engines/observers/witness.jsonl` every 10 s and samples the clock every second. Witnesses are fsynced.
The observer cannot mount or write that log. `observer-down` stops the sidecar, witnesses final heads, removes
its container, releases its reservation, and retains output, code, configuration, failures and stop metadata.
Unsealed output stays unqualified. `observer-retain` writes evaluator context ingredients outside the observer's mount;
it does not select a protocol, case, contract, expected result or threshold. The evaluator independently retains and pins those.

Clock samples record actual host send/receive and VM observer times. RTT above 2 ms is rejected and recorded outside the bundle.
An empty bridge refuses in O-OBS; rejected samples are never replaced by manufactured zero-RTT samples.
`observer-bridge --lane ... --slot ... --holder ...` performs an additional sample, and
`observer-witness` performs an additional host witness. The persistent nonce clock endpoint is read-only; `/clock` remains available for diagnostic comparisons.
Send time is taken after connect and immediately before the nonce write; reply time is taken after the complete, nonce-checked reply.
The interval midpoint and half-RTT remain conservative bounds, not exact clock synchronization.

## Sources and representation

- All lanes: H1 engine cgroup v2 memory/current/peak/stat/events, CPU and I/O; H4 IPv4/IPv6 socket tables.
- XTDB: X1 healthz `/metrics`, preserving every gauge and every database label, including completed transaction IDs.
  XTDB has no active-query listing (R27 4.2). X6 tails the slot-only DEBUG log; X7 retains raw OTLP protobuf spans.
  Optional observer-only commands collect finish-block replies and read-only count-query transcripts.
- QLever: Q1 `/metrics`, Q4 active-query dump at 250 ms, Q3 event log tail with inode/offset/rotation tracking.
  Default index is `triplex`, overridable by safe `--index-name`.
- Datomic source planning: D1 metrics-callback JSONL from `--transactor-metrics` relative to the read-only engine
  volume, and H5 `/proc/<pid>/task/*/{comm,stat}` for explicit `--gateway-pids`. Names are SUT-chosen labels;
  CPU and start times are kernel facts. The lab's current slots config has no exclusive Datomic slot, so this
  requires an orchestrator-provided lane/slot config and a preconfigured metrics callback. No D3 peer is provided.

The observer shares the engine's PID/network namespaces and host cgroup namespace. Engine data/cgroups/code/config/key
are mounted read-only. Only its private `/obs` output is writable; root filesystem is read-only, all capabilities except `DAC_READ_SEARCH` are dropped,
and no Docker socket is mounted. The SUT container receives neither the output mount nor the run key.

An `obs-bundle/1` has envelope, dense per-stream chunk headers, per-stream exact-header-byte SHA256 chains,
HMAC-SHA256 headers, authenticated final seal, clock bridge and normalized source views. Every header covers the
lossless sample frame, including monotonic interval, SHA256 and base64 of raw source bytes. Exact source bytes
are additionally retained at `objects/<sha256>.bin`. HTTP captures preserve received status/header/body bytes,
including transfer encoding; no HTTP result is reconstructed from parsed metrics. File snapshots preserve bytes.
Tails frame inode/offset/rotation plus exact new log bytes. Framing is necessary because O-OBS concatenates chunks
before running its pinned parser and does not pass header timestamps. This is an explicit representation choice
within `obs-bundle/1`, not an unframed vendor stream. The normalizer validates frame hashes, clocks, HTTP status,
Prometheus syntax, source encodings and proc tables. Decimal metric spelling and labels are retained without float conversion.
Detected tail rotations refuse continuous normalization; no continuity claim is made across truncation or missing sources.

`normalized/sources/*.json` are conveniences; O-OBS reruns the external, hash-pinned normalizer from raw chunks.
They cannot substitute for protocol-specific provenance/case bindings, transport corroboration or source coverage.
Observer raw bytes, logs, code snapshots and normalized views belong in erasure-copy inventories.

## Checks

```sh
node lab/bin/heavy.mjs --label CX-OBS01-gate -- node lab/observer/gate.mjs
```

The gate extracts the consumer directly with `git show 23e2273:...` into this worktree's ignored `runs/OBS01/oracle`,
then checks real collector output through its `authenticate()` and exercises corruption, omission, parser/key,
clock, repeat-run and resource-budget boundaries. Synthetic fixtures are transport tests, not vendor probes.
No package contracts changed, so package builds and `pnpm check` are outside this gate's scope.


## Round 2: transport and protocol records

Observed exclusive slots publish their normal engine port through the observer's transparent TCP proxy
(18090 inside the shared netns). The native measured port is unpublished. The additional read-only XTDB port
cannot mutate the database. This prevents a host adapter from bypassing T1/T2 to call native admin writes.
`--diagnostic-direct` publishes an explicit native bypass for A/A cost measurements; those profiles cannot
establish the transport completeness floor. Neither the proxy nor the OTLP endpoint accepts arbitrary evidence
records: they record actual forwarded TCP bytes or the engine's vendor span payloads. Vendor spans remain
engine assertions and need independent transport/kernel corroboration where required.

`--observation-features all|none|logs|spans` controls slot-only source configuration; the default is `all`.
`--observer-streams` selects a source subset for isolated overhead diagnostics. `--enable-probes` adds private
host-tooling commands: `observer-command --action finish-block`, `--action count --relation NAME --label LABEL`,
and `--action scan --marker TEXT`. Commands are written to the observer-only mount; the SUT has no command path.
Counts run in an explicit read-only transaction and retain the complete wire transcript. The byte scanner
records file names, sizes, SHA256 and hit counts. It does not decode compressed vocabularies or freed blocks.
The single added read/search capability reads engine-owned 0600 files through a **read-only mount**; it grants
no write override. Observer logs, spans, proxy captures and archives are additional erasure inventory locations.

An evaluator can pass `--protocol-spec /absolute/spec.json`, mapping stream IDs to a protocol specification.
The observer compiles and snapshots a separate standalone parser per selected stream **before** starting collection.
Retention records the external parser path/hash. O-OBS replays those exact parsers against authenticated raw chunks.
Case fields select the relation, observation window, expected control inventory, declared owners and resource envelope;
observed counters, statements, counts, sockets and peaks always come from raw source bytes.

| Protocol | Implemented derivation | Boundary |
| --- | --- | --- |
| NO-MUTATION | X1/Q1 exact counter delta plus independent T1/T2 write classification | Counter incarnation/labels must match; successful read control required; TLS/unknown client frames refuse |
| PREABORT | X6/Q3 statement starts and T1/T2 request starts | Frozen exact controls once each; unexpected statements, log gaps and ambiguous background queries refuse |
| SCRATCH | X4 observer read-only before/after counts | Exact integer result and successful complete reply; unresolved outcomes refuse |
| CONNECTIONS | H4 IPv4+IPv6 server sockets by declared port | Engine baseline and close bound supplied by evaluator; does not discover all application owners |
| RESOURCE | H1 engine cgroup memory peak and allocated file blocks | Engine-only diagnostic; sampled disk is a lower bound and does not prove full application cost |

The remaining nine protocol names explicitly refuse incomplete sources. In particular, CANCEL cannot infer caller
ACK/reuse from a cancel frame; WORK cannot infer zero writes/bytes from scan rows; ACK-ORDER/WATERMARK/FAULT-TRANSITIONS
need composition-specific independent publication/route witnesses. ERASURE-SCAN needs per-location controls, encoding-aware
and freed-block coverage. No protocol record is accepted as a client-authored pass-through.

The wire decoder preserves fully parsed client requests if a cancelled server reply is truncated, records
`serverDecodeError`, and never interprets that truncation as successful cancellation. Independent count queries reject
incomplete replies. SQL classification adapts EXP-C8's conservative offline mechanism, while respecting quoted literals.
The OTLP decoder follows the pinned [trace schema](https://github.com/open-telemetry/opentelemetry-proto/blob/v1.5.0/opentelemetry/proto/trace/v1/trace.proto)
and [common schema](https://github.com/open-telemetry/opentelemetry-proto/blob/v1.5.0/opentelemetry/proto/common/v1/common.proto).
Integer attributes and fixed64 timestamps remain exact Python integers. XTDB span SQL can omit comments, so request tags
alone do not establish span correlation.

`engine.mjs archive-volume --lane LANE --slot SLOT --holder HOLDER --destination /absolute/archive --remove-volume`
requires the holder's retained, quiescent volume. A pool-admitted utility reads it through a read-only mount, creates a TAR
and per-file SHA256 inventory, reads the archive back, compares a second source scan, then optionally removes that owned
volume through the ordinary engine teardown path. First-failure source/evidence remains in the archive.

## Round 3 resident screening

`engine.mjs observer-resident --lane xtdb --slot dev --holder NAME --run-id ID --key-file FILE
--spec CASE --image DIGEST` admits a short-lived observer without taking an exclusive slot, changing a
resident, or adding published ports. It shares the resident PID/network namespaces, uses its own capped
CPU/memory, mounts engine data read-only, and removes only its own container. Tiny native fixtures are
restricted to `obs01r3_*` relations and 1–64 width-1 entities. It does not discover or mutate other tenants.
Its clock is a real separate-interpreter round trip in the VM, including process startup. The measured
uncertainty is retained; this coarse diagnostic reference does not meet the <=1 ms qualification floor.

`protocol_extra.py` replaces the nine unconditional parser refusals with source-derived field paths:
exact analytic result columns; native EXPLAIN work counters; native cancellation/reuse packets; process/OOM
and caller probes; maintenance events/checkpoint lag; flattened C1 eligibility readbacks with actual route
intervals; publication/ACK/readback fields; post-client-crash native markers; and per-location byte/encoding
controls. Paths emit only observed fields. Missing fields remain absent; a parsed field object is never
accepted as a substitute for source bytes. Equal SQL on two requests cannot borrow a single-request fence.

**This does not provide complete live witnesses for all fourteen protocols.** Native resident telemetry
lacks several required fields and independent corroboration. In particular, CANCEL still needs native drain,
transport ACK and coverage; ACK/WATERMARK need composition-specific independent publication/eligibility
sources; WORK needs all four counters; MAINTENANCE needs durable consumer lag; erasure needs full physical
inventory and decoders. Read the round-3 ledger rather than inferring support from a protocol-name registry.
The UTF-8/UTF-16LE/UTF-32LE decoder profile covers only those named encodings, not FSST or freed blocks.

`run_round3.mjs ATTEMPT [COMMA-SEPARATED-PROTOCOLS]` collects fresh resident bundles. `check_round3.py`
selects a genuinely O-OBS-delegated obligation, includes its required thresholds, and retains exact context,
records and missing-source diagnostics. `screen_cli_round3.mjs` retains the pinned CLI's actual exit statuses
and two context-guard negatives for each selected real bundle. The round-3 consumer is `23e2273` and the
contract is the retained 0.3.12 snapshot from `f5e7a41`; neither is silently replaced by a moving branch tip.

Deferred scale-window invocations and their prerequisites are in
[`SCALE-WINDOW.md`](../experiments/EXP-OBS01/round3/SCALE-WINDOW.md). No frozen NS driver/reset manifest or
complete physical scanner is supplied by this change, and no exclusive or Datomic run occurs in round 3.
