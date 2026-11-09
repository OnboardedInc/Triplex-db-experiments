# VM publication observer (OBS01 round 6)

Evaluator tooling only. `engine.mjs` provisions the observer, fresh key, read-only
source mounts and private evidence directory. Candidate code cannot write them.
The standalone `vm_normalizer.py` has literal SQL01/FD01 schema profiles and no
candidate imports. It reconstructs every SQLite WAL commit, including consumer
frontier/effects/affected deltas, and maps source member positions to observed
publication intervals. Its output is evidence, not an NS verdict.

## Offline reproduction

Use a new durable output directory for every attempt:

```sh
node lab/bin/heavy.mjs --label CX-OBS01-R6-offline -- \
  python3 -B lab/observer/run_vm_offline.py \
  /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-OBS01/OBS01-round6/offline-next
```

`RESULT.json` pins the actual tested files; `SHA256SUMS` covers retained outputs.
The authenticated fixture retains raw chunks, copied parser, key, context and seal
for independent O-OBS authentication/re-execution. This tests the authentication
API, not a registered NS semantic protocol or contract selection.

## Controlled VM admission and overhead run

Check G03 ownership and host free space before admission. The probe checks again
before each round, requires more than 10 GiB free, and stops if G03/NSR/P-TINY
containers are running. Coordinate with G03; absence of a matching process name
alone is not a scheduling reservation. Never run beside its P-TINY smoke.

```sh
node lab/bin/engine.mjs observer-vm-status --holder CX-OBS01-R6
node lab/bin/heavy.mjs --label CX-OBS01-R6-vm -- \
  node lab/bin/engine.mjs observer-vm-probe --holder CX-OBS01-R6 \
  --image python@sha256:e48f59cdba69a3cbd9ed2cf0f348d90d45a8d350d98134cf1070bc106ee9ed90 \
  --out /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-OBS01/OBS01-round6/vm-next
```

The image must already exist; no mutable pull. This is a broker-shaped fixture,
500 commits per arm, ten scratch writes plus frame/marker, FULL synchronous,
writer CPU 4, observer CPU 5. It plans A/B/B/A on fresh volumes and computes
nearest-rank p99 from every sample. Either observed/baseline ratio above 1.05
fails; incomplete samples, missing seal/proofs or parser refusal refuse the run.
A successful fixture test still does not qualify the full NS workload, other
images, host power loss, clock ping-p99 or relay/reader/driver domains.

The one round-6 VM attempt has already been used. It refused on F20 after A/B;
its partial writer p99 increased 138.10%. Do not rerun it to replace this failure.
SQL01's `committed_at` is sampled before COMMIT; 43 stamps in that attempt were
more than 1 ms before the independently bracketed publication. A source/ruling
owner must resolve this conflict with the CR cross-check. Do not widen F20.

## Joining a future G03 run

Bootstrap/checkpoint databases before the observer window. Disable automatic WAL
checkpointing in the trusted test setup, and retain one WAL generation until
capture ends. The observer never changes pragmas on the source. SQL01 files must
have the marker/frames schema in `vm_normalizer.py`; FD01 must have its exact
checkpoints/frontier/deliveries/effects/affected columns, and specify `consumer`.
The source container and named volume must belong to the same holder.

Create a private JSON spec, replacing every placeholder with inspected identities:

```json
{
  "runId": "g03-unique-attempt",
  "durationSeconds": 120,
  "sources": [
    {"id":"broker","profile":"sql01","file":"broker.db","container":"OWN_BROKER","engineContainerId":"FULL_CONTAINER_ID","volume":"OWN_BROKER_VOLUME"},
    {"id":"consumer","profile":"fd01","consumer":"CONSUMER_ID","file":"consumer.db","container":"OWN_CONSUMER","engineContainerId":"FULL_CONTAINER_ID","volume":"OWN_CONSUMER_VOLUME"}
  ]
}
```

Supply an evaluator-generated fresh 32-byte key file outside candidate mounts.
The controller rejects key reuse, inspects source PIDs/container IDs, freezes code
and uses host PID/cgroup visibility with read-only mounts and no network.

```sh
node lab/bin/engine.mjs observer-vm-up --holder CX-G03 \
  --run-id g03-unique-attempt --spec /PRIVATE/spec.json --key-file /PRIVATE/key \
  --image python@sha256:e48f59cdba69a3cbd9ed2cf0f348d90d45a8d350d98134cf1070bc106ee9ed90 \
  --observer-cpus 5
```

Only start workload after this command reports ready: every store has completed
its first read-only poll. Capture the driver, reader and relay clock-domain
records separately, with their exact PID/attempt bindings; this command records
only observer and source PIDs. Each domain requires the same VM boot ID and zero
monotonic/boottime offsets; namespace inode equality is not required. Publication
brackets use actual last-old poll start/first-new poll end, with measured query
cost and poll period, never the requested 250 us as a precision claim.

End workload, then use the source owner's engine lifecycle to SIGKILL only its
own source containers, retaining their volumes and WAL. Graceful SQLite close can
checkpoint away evidence and will refuse capture. Allow the observer to record
cgroup disappearance before stopping. Do not stop shared residents.

```sh
node lab/bin/engine.mjs observer-vm-stop --holder CX-G03 --run-id g03-unique-attempt
node lab/bin/engine.mjs observer-vm-cleanup --holder CX-G03 --run-id g03-unique-attempt \
  --out /PRIVATE/observer-gone.json
```

Stop verifies seal/HMAC/controller pins and reruns the pinned parser through
O-OBS. Cleanup obtains the observer's own cgroup-gone readback, also after stop
has removed it; it requires the earlier exact path/container binding and a
helper's visible host cgroup tree. On failure retain evidence first, then use
cleanup. No repair, resume or reuse of the attempt. The ephemeral proof helper
is removed by the controller and is not itself a long-lived workload container.

Archive output, code, effective config, external evaluator key, witness/context,
exit/cleanup proofs and raw database/WAL files in evaluator-only durable storage;
verify complete SHA256 manifests before removing owned volumes through the
engine workflow. Finish VM work with `colima ssh -p triplex2 -- sudo fstrim -av`
and `docker context use colima`; retain their actual outputs. Keep DOCKER_HOST
bound to the private triplex2 socket throughout.

## Fail-closed boundaries

Rewritten WAL prefixes, WAL resets/checkpoints, incomplete/checksum-invalid frames,
unexpected schema, stale final readback, clock steps, missing initial poll,
inotify overflow and missing cgroup-gone proof refuse evidence. Current support
is one WAL generation and a stable main file, not arbitrary online checkpoints.
Inotify is a wake-up/corroboration source; only fresh read-only queries establish
visibility. An idle 10 ms fallback and scheduler noise may widen brackets; actual
periods and query costs remain in the evidence. Unsealed failure chunks may be
examined diagnostically but cannot become a sealed bundle or semantic PASS.

## Round 7: Q100s decision stamps (supersedes the F20 open question above)

The pinned parser classifies SQL01 `frames.committed_at` as a **decision** stamp.
Its check window is `[driver send, U + 5 ms]`. Explicit publication CR records
(`final.cr[].atNs`) retain `[L - 1 ms, U + 5 ms]`, regardless of any supplied
`kind` label. Lag still uses observer L/U. SQL01's millisecond stamp is mapped to
its realtime/monotonic uncertainty interval as before; it refuses if that entire
interval is outside the window. An interval overlapping a boundary cannot locate
the stamp more precisely than its stored resolution; its exact bounds are emitted
in `stampChecks`, not promoted to an exact timestamp.

A trusted driver adapter must include a raw `driver-send` event per offer in the
evaluator-authenticated observer stream, with `source`, `stream`, `operationId`,
`attemptId`, `atNs` (VM monotonic nanoseconds), `domain` (the driver's boot ID and
zero offsets), and the same `runId`. It must come from the evaluator's actual
driver send record, never a candidate response, receipt or candidate stamp. The
normalizer binds it to the decoded SQL01 member identity. Duplicate/missing,
stale, wrong-clock or mismatched sends refuse; a grouped commit must satisfy
every member's window. The round-6 VM collector does not synthesize these events;
a future G03 integration must supply them through trusted collection. Without
them normalization refuses. No candidate-selectable stamp classification exists.

The original round-6 unsealed attempt stays failed evidence. Its unmatched partial
A/B result on a busy host is **not a valid overhead estimate**. No VM measurement
was repeated for round 7; G03 round 5 owns matched-arm overhead measurement.

## Round 8: bound files and durable-use refusal

The collector holds a read descriptor for each observed main/WAL/SHM object.
Every poll checks its device/inode binding before and after querying. Tail and
final byte reads also compare their opened handles to those descriptors; unlink,
replacement, symlink, rename/delete events or a changed identity refuse. Newly
created ancillary files bind once; after binding, absence is a change. Raw poll,
WAL and final events include identities, independently checked by the parser.
Brackets still use the last negative start and the **first** positive end from
that bound file; later positive polls do not move the bracket forward.

`PRAGMA synchronous` is connection-local, not encoded in `broker.db` or its WAL.
A read-only observer connection's PRAGMA and a candidate configuration field
cannot prove the writer's synchronization. The pinned source state for an
**offline fixture** must therefore include `writerState` with scope
`evaluator-offline-fixture`, the actual fixture writer's `sqliteVersion` and its
connection-read `pragmas: {journal_mode: "wal", synchronous: 2}`. OFF/NORMAL,
missing state or implementation refuse. Fixture acceptance is visibility/parser
coverage only, not a Q100b/r durability receipt.

**Live VM durable/P3 normalization now refuses unconditionally** until an
independent writer/VFS sync-enforcement witness is integrated and qualified for
the exact writer, SQLite build, DB/WAL identities and commit range. This round
adds no such instrumentation and does not accept a magic candidate-reported FULL
flag as a substitute. The existing collector may retain visibility-only chunks;
it cannot seal them as durable/P3 evidence through this parser. This closes F2
by refusal, with the missing witness explicit. Future G03 integration must meet
this requirement as well as supply trusted driver-send records.

Decision sends after the matched first-positive U now refuse, even within U+5 ms.
Inverted stamp/window intervals also refuse before interval-overlap testing.

## Round 9: kernel sync witness (supersedes the round 8 unconditional refusal)

Authority: R48 (`lab/research/R48-writer-sync-witness.md`), rulings Q108a-d (pending in `lab/acceptance/RULINGS-PENDING.md`).
A VM durable, P2 or P3 claim is believed only when the kernel witnessed the writer's own sync. The candidate's `PRAGMA`, SQLite build,
config and the observer's read-only connection are never evidence. Round 8's "refuse every VM durable use" is replaced by
**refuse unless the witness is complete and every judged commit passes**. Live use with no witness still refuses (`F2 TRACE-INCOMPLETE`).

### Files

| File | Role |
| --- | --- |
| `vm_syncwitness.bt` | the pinned bpftrace program (trusted `sync-witness` container only); records W/M/F/S/T events with per-CPU sequence numbers |
| `vm_normalizer.py` | strict parser (`parse_witness`), per-commit join (`judge_witness`), the seven codes, the case/event contract below. One file because O-OBS reruns it alone |
| `vm_watch.py` | ships the finished trace, stderr and meta into the sealed bundle; binds each source's writer cgroup id; emits the witness clock domain |
| `vm_planted_writer.py`, `vm_syncwitness.py` | the eleven W1 planted writers and the offline judge/compare used for W1 receipts (and `stream-check` for W3) |
| `vm_w3_load.py` | W3 broker-shaped writer plus read-only pollers |
| `lab/bin/sync-witness.mjs` | witness container profile check and create arguments, observer hooks, probe windows; reached through `engine.mjs witness-vm-*` |

### What the normalizer requires (`case.witness`, set by the controller, pinned by the case hash)

`containerId`, `programSha256`, optional `kernelRelease`, `firstCandidateStartNs` (VM CLOCK_MONOTONIC read before the first candidate
starts), `stores{sourceId:{dir:[kernel dev, directory inode], cgroupId}}`, plus the observer's `metaPath/tracePath/stderrPath`, `pid`.
Raw events added to the stream: `witness-meta`, `witness-trace` chunks (contiguous offsets), one `witness-stderr`, one `witness-bind` per
source (observer stats the writer's cgroup directory: its inode is `bpf_get_current_cgroup_id()`), `domain` role `witness`, and optional
trusted `driver-ack` events (`source, stream, operationId, attemptId, atNs, domain`) for the P2 ACK check.

### Per-commit rule (Q108b)

For commit `c` at WAL bytes `[o_c, e_c)` of the live generation: `W(c)` = latest exit of a traced write to the WAL inode that starts below
`e_c`; `D(c)` = earliest exit of a successful `ext4_sync_file` on the WAL inode, or `syncfs`/`sync` with wait on its device, from the writer's
cgroup, that **entered** at or after `W(c)`. Positions gain `D` and `durableEndNs = max(U, D)` (consumer lag end; lag start stays `L`).

| Code | Raised when |
| --- | --- |
| `TRACE-INCOMPLETE` | missing/duplicate/late start or detach record, lost events (per-CPU sequence gap or count mismatch, or bpftrace "Lost N events"), unparseable line, attach after `firstCandidateStartNs`, program hash / kernel release / boot id mismatch |
| `WITNESS-UNBOUND` | traced (dev, directory inode) set differs from the case, writer cgroup id differs from the observer's stat, container id differs, bound files not on the witnessed device, WAL inode never written while other files in the directory were, a driver ACK that binds to no committed member |
| `UNWITNESSED-WRITE` | WAL bytes no traced write covers, `ext4_page_mkwrite` on the WAL/database inode, a write to either from a foreign cgroup, hole punch or zero range on them |
| `CHECKPOINT-UNSYNCED` | WAL restart (second header write at offset 0) or truncate while checkpointed database writes lack a database sync that entered after them and exited before the restart |
| `SYNC-MISSING` | a commit with no covering sync from the writer's cgroup |
| `ACK-BEFORE-DURABLE` | a driver ACK instant earlier than `D(c)` (strict; no tolerance) |
| `VISIBLE-BEFORE-DURABLE` | an SQL01 commit with `U(c) < D(c)` |

Several codes can hold at once: the message lists all, the exception's `code` is the first in the table order.

### Not covered / limits

- `W(c)`/restart ordering uses write **exit** times (the program records no write entry time): a restart write that overlaps its covering
  sync by microseconds is not distinguished. `sync_file_range` is deliberately not durability.
- One WAL generation per run (F11 still refuses resets). A truncate before rewriting is judged as a new generation.
- The trace is read whole by the normalizer (256 MiB observer budget); a long NS run needs a streaming reader first (W3 uses `stream-check`).
- `vm_syncwitness.bt` has **not attached anywhere**. Probe W0 is its first test; a failed attach stops the window.

### Probe window W0..W3 runbook (orchestrator-approved window only; not run in round 9)

Preconditions, all checked by `witness-vm-status` / `witness-vm-probe` and recorded as `NOT-RUN` if any fails: host free disk above
10 GiB, `node lab/bin/engine.mjs status` shows no exclusive slot reservation, no G03/NSR/P-TINY container running. Two images must
already exist in the triplex2 VM (no mutable pull): the pinned Python image (`python@sha256:e48f59cd...`) and a digest-pinned
bpftrace image; none exists there at the time of writing, so an approved pull of a pinned digest comes first.

```sh
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
node lab/bin/engine.mjs witness-vm-status
node lab/bin/heavy.mjs --label CX-OBS01-R9-w0w3 -- node lab/bin/engine.mjs witness-vm-probe \
  --out /Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01-R9/vm-w0w3 \
  --image python@sha256:e48f59cdba69a3cbd9ed2cf0f348d90d45a8d350d98134cf1070bc106ee9ed90 \
  --bpftrace-image REGISTRY/bpftrace@sha256:<pinned> --windows W0,W1,W2,W3 --minutes 20 --readers 256
```

The command removes its containers and volumes, then runs `colima ssh -p triplex2 -- sudo fstrim -av` and `docker context use default`
(outputs in `fstrim.json`, `context.json`). W2 sets `kernel.bpf_stats_enabled=1` in the VM for its duration and restores the prior value.
Per window: W0 facts and attach under default seccomp (`W0.json`); W1 eleven planted writers judged through `vm_syncwitness.py` (`w1-*`);
W2 per-commit added kernel time from `run_time_ns`/`run_cnt` deltas (gate p99 <= 100 us); W3 zero lost events (sequence check) and mean
witness CPU below 0.1 core. W4 (guest crash) is not implemented and needs orchestrator approval.
