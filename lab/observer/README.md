# EXP-OBS01 observer

North star: an independent evidence floor for P1–P5; goals and targets remain in
[`SCOPE.md`](../SCOPE.md), [`NORTH-STAR.md`](../NORTH-STAR.md), [`TARGETS.md`](../TARGETS.md).
Source design: R27 sections 2–7, 9–10; Q82a–e. Consumer pinned to O-OBS round 2 `463703d`.

This is collection and authenticated source decoding. It does **not** issue an O-OBS semantic PASS.
The evaluator must supply its own case context and reviewed protocol normalizers; the included
normalizer produces source samples, not the full protocol fields. Acceptance requires independent
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
`observer-witness` performs an additional host witness. The HTTP clock endpoint is read-only.

## Sources and representation

- All lanes: H1 engine cgroup v2 memory/current/peak/stat/events, CPU and I/O; H4 IPv4/IPv6 socket tables.
- XTDB: X1 healthz `/metrics`, preserving every gauge and every database label, including completed transaction IDs.
  XTDB has no active-query listing (R27 4.2); X6 logs/X7 spans and query diagnostics are not implemented here.
- QLever: Q1 `/metrics`, Q4 active-query dump at 250 ms, Q3 event log tail with inode/offset/rotation tracking.
  Default index is `triplex`, overridable by safe `--index-name`.
- Datomic source planning: D1 metrics-callback JSONL from `--transactor-metrics` relative to the read-only engine
  volume, and H5 `/proc/<pid>/task/*/{comm,stat}` for explicit `--gateway-pids`. Names are SUT-chosen labels;
  CPU and start times are kernel facts. The lab's current slots config has no exclusive Datomic slot, so this
  requires an orchestrator-provided lane/slot config and a preconfigured metrics callback. No D3 peer is provided.

The observer shares the engine's PID/network namespaces and host cgroup namespace. Engine data/cgroups/code/config/key
are mounted read-only. Only its private `/obs` output is writable; root filesystem is read-only, capabilities are dropped,
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

The gate extracts the consumer directly with `git show 463703d:...` into this worktree's ignored `runs/OBS01/oracle`,
then checks real collector output through its `authenticate()` and exercises corruption, omission, parser/key,
clock, repeat-run and resource-budget boundaries. Synthetic fixtures are transport tests, not vendor probes.
No package contracts changed, so package builds and `pnpm check` are outside this gate's scope.
