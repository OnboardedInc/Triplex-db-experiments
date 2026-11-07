# Private managed-writer experiment

Run offline lifecycle and mocked boundary checks with:

```sh
python3 experiments/qlever-managed-writer/run_tests.py
```

The runner writes an evidence receipt and retains every synthetic fixture under
`.qlever/managed-model/`. It does not contact Docker or QLever. Process-death
tests use actual child-process exit, while a file-backed model preserves separate
mutable, published and durable native-worker states. Two processes contend on an
actual `fcntl.flock` lock. These results do not establish native write atomicity.

`broker.py` admits one trusted prepared native modification at a time across all
scopes. The worker supplies a canonical global lock path, preventing two broker
configurations from accidentally creating independent locks for one dataset.
Every intent and resolution is append-only, hash chained and fsynced. The broker
never automatically truncates, deletes or repairs a journal. A torn journal holds
the worker closed. Cancellation or an uncertain/error response forces close,
snapshot sync and reload before any next native modification.

Marker lookup, attempted-footprint lookup and complete payload proof are separate
selectors. A join that produces no complete-proof row cannot be mistaken for
marker absence. Missing marker plus orphan facts is inconsistent. Missing marker
plus no footprint authorizes a new attempt only after the old native epoch was
closed and the persisted snapshot reloaded. Unknown operations have no such
proof and cannot be replayed by this broker.

`native_worker.py` is an opt-in adapter for a future dedicated owned copy under
`.qlever/managed/`. It rejects the current development/candidate container names,
current data mounts, unpinned images, unfenced updates, mismatched loopback ports
and resource caps above its provisional 2 GiB/two-CPU trial profile. It requires a
broker-only native access token and `--persist-updates`; it never logs the token.
It also requires a direct `qlever-server` executable with exactly one `-i triplex`
and `-p 7019`, working directory `/data`, one exact native token option and
automatic restart disabled. Alternate forms, duplicates and wrapper executables are rejected,
preventing a worker from writing another snapshot while the broker syncs a stale
file.
Importing or constructing it starts no process. No native trial has run.

Journal format 2 stores bounded operation/attempt identity, logical/request
digests, expected row count/digest and operation-scoped selectors. It retains
neither the native MODIFY body nor expected fact rows. Recovery fetches only
the operation's native rows and checks an order-independent digest that retains
duplicate contributions. Resolutions also store only count/digest metadata.
Old full-request model journals remain retained and are rejected by this format;
there is no automatic rewrite or migration.

Provisional limits are 8 KiB combined selectors, 10,000 proof rows, a 1 MiB
expected normalized proof, a 32 MiB ephemeral native MODIFY and a 16 MiB
coordinator journal. The last still needs qualified retained segmentation and
recovery at command scale. Never truncate history or turn the coordinator into
another fact log. `journal_cost.py` runs three concurrent offline sizes and
records actual coordinator bytes separately from a full-request serialization
estimate; its timings are model costs, not native QLever latency.

The design checkpoint is [DESIGN.md](DESIGN.md). Goal 7 remains open. Real native
mid-mutation cancellation, writeback failure, rename-before-ACK death, token
bypass prevention, public runtime integration and physical durability require
separately admitted copied-container trials after the query-layout wave.

[NATIVE-PACKET.md](NATIVE-PACKET.md) describes the runnable, offline-prepared
three-case harness, its concrete resource and token fences, and the exact
execution command. `native_faults.py --prepare` creates only request evidence,
private tokens and Compose files; it makes no Docker or native calls. Execution
requires a separately registered owner profile and an exclusive native slot.
