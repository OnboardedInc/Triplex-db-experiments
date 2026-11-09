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
