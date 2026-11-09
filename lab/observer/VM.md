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
| `vm_normalizer.py` | strict parser (`parse_witness`), per-commit join (`judge_witness`), the codes (nine since round 10), the case/event contract below. One file because O-OBS reruns it alone |
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
(Round 10: that exit is exact for file syncs only; for syncfs/sync `D` is the syscall exit and a second bound `D_lower` exists.)

| Code | Raised when |
| --- | --- |
| `TRACE-INCOMPLETE` | missing/duplicate/late start or detach record, lost events (per-CPU sequence gap or count mismatch, or bpftrace "Lost N events"), unparseable line, attach after `firstCandidateStartNs`, program hash / kernel release / boot id mismatch |
| `WITNESS-UNBOUND` | traced (dev, directory inode) set differs from the case, writer cgroup id differs from the observer's stat, container id differs, bound files not on the witnessed device, WAL inode never written while other files in the directory were, a driver ACK that binds to no committed member |
| `UNWITNESSED-WRITE` | WAL bytes no traced write covers, `ext4_page_mkwrite` on the WAL/database inode, a write to either from a foreign cgroup, hole punch or zero range on them |
| `CHECKPOINT-UNSYNCED` | WAL restart (second header write at offset 0) or truncate while checkpointed database writes lack a database sync that entered after them and exited before the restart |
| `SYNC-MISSING` | a commit with no covering sync from the writer's cgroup |
| `ACK-BEFORE-DURABLE` | a driver ACK instant earlier than `D(c)` (strict; no tolerance) |
| `VISIBLE-BEFORE-DURABLE` | an SQL01 commit with `U(c) < D(c)` |

Round 10 changes this section: `D(c)` is an interval for syncfs/sync, two codes are added, and the codes below are listed in primary-code order
(see "Round 10"). Several codes can hold at once: the message lists all, the exception's `code` is the first in the order of the Round 10 table.

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
Per window: W0 facts and attach under default seccomp (`W0.json`; round 10 adds the R49 checks listed under "Round 10"); W1 eleven planted writers judged through `vm_syncwitness.py` (`w1-*`);
W2 per-commit added kernel time from `run_time_ns`/`run_cnt` deltas (gate p99 <= 100 us); W3 zero lost events (sequence check) and mean
witness CPU below 0.1 core. W4 (guest crash) is not implemented and needs orchestrator approval.

## Round 10: split publication, detach coverage, syncfs interval, trace clock (fixes the round 9 review, R49 items)

Builder rules for every item are the round 9 review `lab/experiments/EXP-OBS01/VERIFY-round9.md` (F1 to F5) and research R49
(`lab/research/R49-bpftrace-source.md`). Nothing here ran in a VM: W0..W3 are still NOT RUN and the bpftrace image is not built.

### The nine codes, in primary-code order

The exception's `code` (and `primary` in W1) is the first code that holds in this order; the rest are listed as `also`.

| # | Code | Raised when | New in round 10 |
| --- | --- | --- | --- |
| 1 | `TRACE-INCOMPLETE` | as round 9 and round 11 (see below), plus: the witness attached after the first observation (first poll start); detached before the last trusted final readback, observation or tailed WAL chunk; detached after the observer's `end`; a final readback without an integer `atNs`; a syncfs record whose ext4 interval lies outside its syscall | extended |
| 2 | `WITNESS-UNBOUND` | as round 9, plus: a publishing SQL01 commit with no bound `U`; a driver ACK whose member appears in more than one published frame | extended |
| 3 | `PUBLICATION-SPLIT` | a SQL01 marker advance and its frame are not in the same transaction (either order); a marker that does not name its transaction's last frame; a marker ahead of an empty frames table (`read_state`); a marker lagging the last frame | new (F1) |
| 4 | `UNWITNESSED-WRITE` | as round 9 | |
| 5 | `CHECKPOINT-UNSYNCED` | as round 9 | |
| 6 | `SYNC-MISSING` | as round 9 | |
| 7 | `ACK-BEFORE-DURABLE` | a driver ACK instant earlier than `D_lower(c)` (a proven violation) | redefined (F5) |
| 8 | `VISIBLE-BEFORE-DURABLE` | an SQL01 commit with `U(c) < D_lower(c)` (a proven violation) | redefined (F5) |
| 9 | `DURABILITY-UNPROVEN` | an ACK or `U` inside `[D_lower(c), D_upper(c))`: the run is refused, but nothing is proven violated | new (F5) |

`PUBLICATION-SPLIT` refuses even without a witness (the offline-fixture mode): it is a property of the SQL01 history, not of the kernel trace.
A consumer of the receipts must not count `DURABILITY-UNPROVEN` as an ACK-before-durable or visible-before-durable violation.

### F1: logical publication, split commits (fail closed)

SQL01's contract is atomic: `frames` insert and `marker` update in one transaction. The normalizer now checks it per reconstructed transaction
(`publication_split`, `marker_advance`, `new_frames`). A marker advance is a change of any of `lsn, epoch, position, crc, size`; a horizon-only
update (`h`) is not a publication and not a split; rewriting an existing frame row (the fixtures set `committed_at` after the fact) is not a new frame.
When a split is found the run refuses `PUBLICATION-SPLIT`; the join still runs so the other codes appear next to it (the reviewer's fixture also raises
`VISIBLE-BEFORE-DURABLE`). The join binds every frame-bearing commit to its frame's logical position `(epoch, lsn)` and that position's real `U`, whether
or not the commit moved the marker; a marker advance binds to the position it names; no source commit silently loses its `U`. A position's published
`D` is the latest `D` over every commit that carries a piece of it, so `durableEndNs` cannot precede the payload's durability. A driver ACK for a member
is checked against every commit of that member's publication (the commit that added the member's frame, found through the frame's decoded members, not
through a row delta). `read_state` refuses a marker ahead of an empty frames table (`marker.lsn != 0` with no frames).

### F2: witness coverage of the observation interval

`witness_context` now requires, in the observer's CLOCK_MONOTONIC domain (the witness clock record joins the same-boot check): trace `attach <=` the earliest
poll start; trace `detach >=` the latest of every poll end, every `final` readback `atNs` (each must be an integer: a missing one refuses) and every tailed WAL
chunk `atNs`; and `detach <=` the observer's `end`. Otherwise `TRACE-INCOMPLETE`. A detach record and gap-free per-CPU sequences prove completeness only inside the
trace's own interval; this binds that interval to this attempt's observations. The controller already stops the witness after `finals-done`; the judge no longer relies on that order.

### F3: W1 compares the whole refusal

`vm_syncwitness.compare` checks, per mode (tables in `vm_planted_writer.EXPECTED_CODES`, `GLOBAL_CODES`): the complete set of codes the run raised, its primary code,
the run-level (not per-commit) codes, and every commit's outcome. A positive mode (`full`, `syncfs`) must raise nothing. Expected sets: `off`, `sync-other-file`,
`range-only`, `neighbor-sync`, `full-then-off`: `{SYNC-MISSING}`; `normal`, `ack-early`: `{ACK-BEFORE-DURABLE}`; `sync-before-write`: `{ACK-BEFORE-DURABLE, SYNC-MISSING}`;
`mmap`: `{UNWITNESSED-WRITE, SYNC-MISSING}` (no write records exist for an mmap writer, so every commit also lacks a covering write; W1 confirms or refutes this in a real kernel).

### F4: one validation state machine for the whole file and the stream

`vm_normalizer.WitnessScan` holds the sync-witness/1 grammar and loss rules. `parse_witness` feeds it a whole trace; `vm_syncwitness.stream_check` (probe W3)
feeds it line by line without keeping events. Any nonzero `@n[cpu]` count for a CPU with no records, a duplicate or missing start/detach, numeric and timestamp
rules, per-CPU sequence and time order, line shape and bpftrace error/lost stderr refuse identically (same messages), and invalid UTF-8 or `\r` refuse.
Memory of the streaming path is one `{seq: ts}` map per CPU (about 0.3 GB for a 20-minute W3 at 100 commits/s on the host; the whole-file path is unchanged).

### F5: syncfs timing is an interval (orchestrator decision)

| | R48 4.2 (as written) | Round 9 (as built) | Round 10 (this rule) |
| --- | --- | --- | --- |
| file sync (`ext4_sync_file`, fsync/fdatasync/msync/O_SYNC/io_uring) | `D` = exit of the first successful sync that entered at or after `W(c)` | same | same: `D_lower = D_upper =` that exit; ACK/`U` strictly earlier than it is a violation |
| `syncfs(2)` / `sync(2)` | `D` = exit of the successful `ext4_sync_fs(wait=1)` | one instant: the syscall exit, also used as proof of ordering (false violations) | **interval** `[D_lower, D_upper]`, below |

For syncfs/sync the program records the syscall entry and exit and, when the `ext4_sync_fs(wait=1)` entry probe fired, that call's entry and exit
(`S|cpu|seq|enter|ts|cg|dev|wait|ret|fsenter|fsexit`; `fsenter = fsexit = 0` when not recorded). Then:

- `D_upper` = the **syscall exit**. Durability is granted only at `D_upper` (positions' `D`, `durableEndNs = max(U, D_upper)`, W/D joins).
- `D_lower` = the `ext4_sync_fs(wait=1)` **entry** if recorded, else the **syscall entry**.
- `ACK-BEFORE-DURABLE` / `VISIBLE-BEFORE-DURABLE` fire only when the ACK or `U` is **before `D_lower`** (proven violation).
- An ACK or `U` in `[D_lower, D_upper)` raises `DURABILITY-UNPROVEN` (refuses the run; not a violation). At or after `D_upper` it passes.
- A commit's interval over several eligible syncs is `[min D_lower, min D_upper]`; the reported `via` is the sync with the earliest `D_upper`.
- A sync is eligible only when its **syscall entry** is at or after `W(c)` (R48's "entered after the last write"); a write between the syscall entry and the ext4 entry
  is therefore not credited to that syncfs (`SYNC-MISSING`), the conservative side. Failed (`ret != 0`), `wait=0`, other-cgroup syncs never count.
- Reviewer fixture `review_round9.py` `test_syncfs_syscall_boundary_must_not_change_r48_D`: expectation changed only for this decision (one `S` with no ext4
  entry, `U = ACK = 250` inside `[110, 300)` now reports `DURABILITY-UNPROVEN` with `D = 300`, `D_lower = 110`, not the two violations).

### R49: the trace clock, W0 checks and the image recipe (code and runbook; nothing run)

1. **Clock.** Bare `nsecs` in bpftrace is CLOCK_BOOTTIME. Every timestamp in `vm_syncwitness.bt` is now `nsecs(monotonic)` (15 sites).
2. **W0 clock step.** Superseded by round 11 (below): the observational comparison described here (50 lines at 20 ms, tolerance 100 ms, slack 1 ms) is now only a transport
   sanity check. The statement that "a boot-clock offset is the VM's suspended time, which is far larger" was wrong: the offset is the guest's accumulated suspend time, which is
   zero or tiny on a fresh unsuspended VM, so an observation cannot always tell the clocks apart. The clock primitive is now proven from the compiled program.
3. **W0 checks.** (a) `kernel.perf_event_paranoid` is recorded and a tracepoint is attached under only CAP_BPF + CAP_PERFMON; if that fails W0 refuses naming the level and the witness
   never gets CAP_SYS_ADMIN. (b) the witness cgroup's `memory.peak` and `memory.events` `oom_kill` are read before detach: refuse above **80%** of the 256 MiB cap or on any OOM kill. (c) ext4 built in:
   `/sys/kernel/btf/ext4` must be absent and every `bpftrace -l` probe (now including `fentry:vmlinux:ext4_sync_fs`) must list by its exact name. (d) `BPFTRACE_MAX_MAP_KEYS` is set explicitly
   (65536; the profile check refuses anything outside 16384..4194304 and a missing `BPFTRACE_PERF_RB_PAGES`) and the value is recorded in `W0.json` and in the witness meta (`maxMapKeys`).
4. **Image.** `lab/observer/bpftrace-image/Dockerfile` is the R49 recipe (arm64 `ubuntu:24.04@sha256:19cad596...`, `bpftrace=0.20.2-1ubuntu4.3`, LLVM 18 at `1:18.1.3-1ubuntu1`,
   `libbpfcc=0.29.1+ds-1ubuntu7`, apt version pins, `.deb` SHA256 check, closed package list). **Not built**: a build downloads about 90 MB and waits for Sam's approval. Open item: R49 gives
   `libbsd0` only as "0.12.1 series", so the build takes `--build-arg LIBBSD0_VERSION=<exact arm64 version>` from the signed index and fails without it.

W0 runbook additions: the probe container for the clock step and the tracepoint attach test use the same `--bpftrace-image` (the locally built image ID, not a pull); the steps run before the attach session and
all land in `W0.json` (`verdict.checks.{clock,clockTransport,perf,memory,ext4,mapKeys,attach}`). Preconditions are unchanged (free disk above 10 GiB, no exclusive slot, no G03/NSR/P-TINY container).

## Round 11: tail timing, per-ACK classification, clock proof from the program (fixes the round 10 review R10-F1 to F3)

Nothing here ran in a VM; W0..W4 are still NOT RUN and the bpftrace image is not built.

### R10-F1: every WAL tail is timed or the run refuses

In a witnessed run (VM and offline-synthetic witness mode) every `wal` event must carry `atNs` as a nonnegative `int` (a bool, string, float, null, list or missing
value is not one) inside this attempt's clock interval: at or after `lower` (the case `startedNs`, and in VM mode the run start) and at or before `upper` (the observer `end`).
Every chunk then counts toward the detach coverage bound (`last_seen`). Failure is `TRACE-INCOMPLETE` ("WAL tail chunk ... lacks a trusted timestamp" or "outside this attempt's
clock interval"). Nothing is dropped from the coverage set any more. The offline fixture without a witness is unchanged (it has no kernel trace to cover).

### R10-F2: each ACK is classified on its own

Per commit, with `[D_lower, D_upper)` from the sync records: if any ACK is `< D_lower` the commit gets `ACK-BEFORE-DURABLE`; if any ACK is in `[D_lower, D_upper)` the commit
also gets `DURABILITY-UNPROVEN`, once, whether or not another ACK was proven early. ACK order and duplicates do not matter. Primary stays `ACK-BEFORE-DURABLE`; `DURABILITY-UNPROVEN` is listed in `also`.
A commit has exactly one publication bound `U` (`commit_views` binds the commit to one logical position's real `U`), so there are no multiple `U` values per commit to classify; the
`U` test was already independent of the ACK tests. Several commits of one publication are each classified on their own (run-level counts are per commit).

### R10-F3: the clock primitive is proven from the program

Orchestrator decision: observation cannot prove which clock a timestamp used (equal clocks, or separation smaller than the transport delay), so W0's clock step passes only on
`clockPrimitiveVerdict` (`lab/bin/clock-proof.mjs`, pure, unit-tested):

1. **Bind.** The harness hashes the pinned `vm_syncwitness.bt` (read before and after the step, must be equal); the same bpftrace image computes `sha256sum` of the mounted file; both must match.
   `bpftrace --version` of that image must print exactly `bpftrace v0.20.2`.
2. **Emit.** (Round 15: the flag is `-d`, see "Round 15" at the end; `-d all` below was wrong for 0.20.2.) The same image runs `bpftrace -d all /program/vm_syncwitness.bt 1 2 3 4` (placeholder positional arguments, which change only constants) with a 120 s kill.
   **Flag relied on: `-d all`** (the `-d STAGE` debug option of the 0.20 series, which prints the AST, the LLVM IR before and after optimisation, and the BPF disassembly without running the program).
   **This is not verified:** R49 does not document bpftrace's debug options, and no bpftrace or network was available offline. The flag is the single constant `COMPILE_FLAGS`.
   If 0.20.2 rejects it the output is empty and W0 refuses (fail closed). The dump is written to `<W0 out>/w0-compiled-program.txt` (it can exceed 1 MB: durable evidence, not git).
3. **Parse and assert.** `parseCompiledHelpers` reads helper calls in three formats: LLVM IR `call ... inttoptr (i64 <id> to ...)(...)`, BPF disassembly `call <id>` and verifier-log
   `call bpf_name#<id>`. Every `bpf_ktime_get_ns` (id 5) is allowed; `bpf_ktime_get_boot_ns` (125), `bpf_ktime_get_coarse_ns` (160), `bpf_ktime_get_tai_ns` (208) and `bpf_jiffies64` (118), by id or by name in any
   stage, refuse; a helper name that disagrees with its id refuses; an unrecognised `bpf_ktime_get_*`/`bpf_jiffies*` name refuses; an empty dump, a dump with no helper calls, a dump that did not terminate, or fewer
   `bpf_ktime_get_ns` calls than the `nsecs(monotonic)` sites in the source (15) refuses. The source must contain only `nsecs(monotonic)` time reads. Helper ids are from the Linux uapi header, written from memory (not verifiable offline).
   The parser tests use samples **constructed** from those formats, labeled as such in `test_engine.mjs`; replace or add a recorded sample when W0 captures a real dump.
4. **Observational check = transport sanity only** (`clockVerdict`, `vm_clockcheck.py`). The helper now stamps each line with local CLOCK_MONOTONIC (before and after) bracketing a local CLOCK_BOOTTIME read.
   The verdict is `INCONSISTENT` (value ahead of the receipt by more than 1 ms, backwards, lagging more than 100 ms, malformed or missing), `CONSISTENT` (fits monotonic and the local separation, lower bound
   `boot - after`, exceeds `tolerance + slack - minimum hop`, so a boot reading is excluded) or `INCONCLUSIVE` (everything else, in particular a separation not larger than the measured uncertainty; also no CLOCK_BOOTTIME
   reference). `INCONCLUSIVE` is never a pass. `judgeW0` records it as `clockTransport` and blocks W0 only on `INCONSISTENT`; `checks.clock` is the program proof alone; `clockIdentity` in the verdict says which proved what.

## Round 12: the clock proof is fail-closed (fixes the round 11 review A1, A2 and the UAPI gap)

Supersedes steps 2 and 3 of "R10-F3" above. `clockPrimitiveVerdict` (`lab/bin/clock-proof.mjs`) now passes only when all of this holds:

1. **Every process completed.** `bpftrace --version`, `sha256sum`, the BTF read and the compile each have exit status 0 (an integer), no signal, `timedOut === false` and no spawn error. A missing, null, nonzero,
   killed or timed-out status refuses, and a failed compile's output is kept only as a diagnostic (its sections and calls are not counted).
2. **One representation, complete.** Judged: the per-probe BPF bytecode disassembly (`dis`, the last form bpftrace produces for the program it loads; not the LLVM IR, which precedes the optimiser and BPF backend,
   and not the verifier log, which exists only after a kernel load and is cut at the log buffer size). Each section starts at a `Disassembly of section <name>:` line, holds only `N: ...` instruction lines and
   ends with an `exit` instruction; there must be at least as many sections as the source has probe blocks (15). The marker spelling and instruction spellings are the proof's own convention, **constructed and
   unverified until W0 records a real dump**; if bpftrace prints something else the section check refuses (fail closed), and the first W0 run settles the real format.
3. **Every call accounted for.** Inside the sections each line that is a call in any spelling (`call bpf_x#5`, `call bpf_x`, `call 5`, `call 0x7d`, raw bytes `85 00 00 00 05 ...`, `(85) call 125`, LLVM
   `call ... inttoptr (i64 5 ...)`) must parse to one helper id, else the proof refuses with UNPARSED-CALL (`callx`, `call pc+N`, two call tokens on a line, bytes and mnemonic that disagree, and any
   call-like token that matches no form included). Each id must be on `HELPER_ALLOW_LIST` (the helpers the .bt source needs, derived construct by construct and checked against the source by `sourceHelperNeeds`);
   a ktime/jiffies/clock helper other than `bpf_ktime_get_ns` refuses; any other helper refuses. Calls in other stages never count; a clock helper named or called anywhere in the output still refuses.
   The per-site count (`bpf_ktime_get_ns` calls in the sections at least the 15 `nsecs(monotonic)` sites) is a secondary sanity check.
4. **Helper ids from the running kernel.** The same pinned image runs `base64 -w0 /sys/kernel/btf/vmlinux` (read-only mount, entrypoint override); `lab/bin/btf-helpers.mjs` is a strict BTF reader (header, contiguous sections,
   string section, every type record, ENUM and ENUM64) that extracts `enum bpf_func_id`. W0 refuses if the BTF is unreadable, the enum is missing or ambiguous, a needed helper name is absent, or two needed names share an id.
   The enum is written to `<W0 out>/w0-bpf-func-id-enum.json`; the BTF itself is identified by its sha256 and size.

## Round 13: threat model for the clock proof, and what W0 gates on (pending ruling Q109a)

**Pending ruling Q109a (orchestrator, recorded here and in `lab/experiments/EXP-OBS01/REPORT.md` Round 13; not yet ruled by Sam).** The compiled dump is produced by the lab-trusted witness image
(pinned Ubuntu bpftrace 0.20.2) from the lab-pinned `.bt` source. No candidate can write or shape it. The clock proof therefore does not have to survive adversarially constructed dumps.
It supersedes the Round 12 list above as to what GATES. The W0 clock step (`clockPrimitiveVerdict`, `lab/bin/clock-proof.mjs`) passes only when all of these hold:

1. **Static source check.** Every time read in the pinned `.bt` is `nsecs(monotonic)` and there is at least one. A bare `nsecs`, `nsecs(boot|tai|sw_tai)`, `nsecs_*`, `jiffies`, `elapsed`, `strftime`, `time(`, `ktime*` or `uptime` refuses (`sourceTimeSites`).
2. **Identity and clean processes.** The image's `sha256sum` of the mounted `.bt` equals the harness's hash of the pinned file (and the analysed text hashes to it); `bpftrace --version` prints exactly `bpftrace v0.20.2`;
   the version, hash, BTF-read and compile processes each exit 0 with no signal, timeout or spawn error (A1, unchanged).
3. **Dump recorded in full, strictness-only scan.** The compile output is non-empty, is written whole to `<W0 out>/w0-compiled-program.txt` (hash `dumpFileSha256`; the verdict carries `compiledSha256` of the text it scanned),
   and contains no forbidden clock helper NAME token anywhere (any stage, comment, stderr, any letter case): `bpf_ktime_get_boot_ns`, `ktime_get_boot`, `bpf_ktime_get_coarse_ns`, `bpf_ktime_get_tai_ns`, `bpf_jiffies64`
   and `BPF_FUNC_ktime_get_boot_ns`, `BPF_FUNC_ktime_get_coarse_ns`, `BPF_FUNC_ktime_get_tai_ns`, `BPF_FUNC_jiffies64` (`FORBIDDEN_CLOCK_TOKENS`, a case-insensitive substring match).

**DIAGNOSTIC, not gating.** The round 12 structured parser (per-probe sections, allow-list, UNPARSED-CALL, helper ids from the kernel BTF `enum bpf_func_id`, per-site count) still runs and its result is in the verdict as
`diagnostic: {pass, reasons, adopted}` (and the existing `sections`, `helperCalls`, `forbidden`, `unparsedCalls`, `helperIds`). It never changes `pass`. A later round may make it gating once a real W0 dump is stored as a golden file and reviewed.
A numeric helper call without a name token (for example `call 125`) therefore does not block W0; the diagnostic reports it. The first W0 run's dump and diagnostic are what the reviewer reads to decide that promotion.

## Round 15: first live W0..W3 (triplex2 VM; results in `lab/experiments/EXP-OBS01/REPORT.md` "Round 15: live W0-W3")

- **Compile flag.** bpftrace 0.20.2 `-d` and `-dd` take no argument; `COMPILE_FLAGS=['-d']`. `-d` prints the AST after five passes and then the one LLVM IR module that is loaded (the same text as `-dd`'s "After optimization");
  there is no BPF disassembly in this version. The real dump is stored as `lab/observer/golden/` (see its `MANIFEST.json` for the hash, exact command and the structured parser's diagnostic verdict).
- **Harness fixes found live** (none changes a gate): the witness runs `sh -c 'exec bpftrace -q -B none "$@" > /witness/trace.txt'` (bpftrace buffers `-o FILE` output even with `-B none`, so the `SW1|B|` attach record never appeared);
  the witness and the one-shot bpftrace containers start with `--ulimit memlock=-1:-1` (removes the `ERROR ... RLIMIT_MEMLOCK` line the normalizer rightly treats as TRACE-INCOMPLETE; no capability added);
  the writer cgroup is found under the VM's cgroupfs driver (`/sys/fs/cgroup/docker/<id>`) as well as `docker-<id>.scope`; the ext4 listing check accepts bpftrace 0.20.2's `kfunc:`/`kretfunc:` spelling of `fentry:`/`fexit:`;
  a refused window keeps its partial facts (`W0-partial.json`) and the next window still runs.
- **Probe command** (one window per invocation keeps each result file small and lets a refusal stop only its own window):
  `node lab/bin/heavy.mjs --label OBS01-W -- node lab/bin/engine.mjs witness-vm-probe --out <new dir> --image sha256:e48f59cdba69a3cbd9ed2cf0f348d90d45a8d350d98134cf1070bc106ee9ed90 --bpftrace-image sha256:06f6223590f518a903c90d7dec383a2ee9fa669f80000013b5a004d2a2efbf25 --windows W0` (then W1, W2, `W3 --minutes 20 --readers 256`), with `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock` and `DOCKER_CONFIG` set to the image evidence's docker-config; images are given by local image ID (no pull).

## Round 16: IR dump reader, resized W1, ABBA and W4

- **IR dump reader (diagnostic, Q109a).** `lab/bin/ir-dump.mjs` reads the real 0.20.2 `-d` output (five ASTs, one LLVM IR module): one module; the last AST's `call: nsecs` nodes all have `identifier: monotonic`; every `define` is closed and maps to one source probe
  (`fentry`/`fexit` print as `kfunc`/`kretfunc`) with the source block's own `nsecs(monotonic)` count; every call line is one direct call, either a constant helper `inttoptr (i64 N to ptr)` or an allow-listed `@llvm.*` intrinsic (`lifetime.start/end.p0`, `bpf.pseudo`, `memset.p0.i64`),
  anything else is UNPARSED-CALL; every helper id is in the kernel enum and on the allow-list; any other clock helper is refused; total `bpf_ktime_get_ns` calls equal the source sites and the AST count. `clockPrimitiveVerdict` uses it for dumps with a `; ModuleID` module and keeps the round 12
  disassembly reader for dumps that carry `Disassembly of section` markers (the constructed fixtures). `lab/observer/test_round16.mjs` first checks the golden file's hashes (whole file, stdout, stderr, scanned text) and then runs the reader on it and on crafted variants. It never changes `pass`.
- **W1** re-run on the 8 CPU / 20 GiB VM: `--windows W1`.
- **ABBA** (`--windows ABBA [--abba-commits 2000] [--abba-rounds 3] [--aa-rounds 3]`): writer commit latency (`vm_fixture.py`, ten-row FULL commits, CPU 4) with the witness off (A) and on (B, CPU 5, zero-loss stream check). Schedule per round r: A/A round `A A`, then ABBA round `A1 B1 B2 A2`, each arm a fresh volume.
  Analysis (`lab/bin/abba.mjs`, Q104a): at least 1,000 commits per arm; at least three A/A rounds; band = max(widest A/A deviation, exp(2 s_d) - 1) of the p99 ratio; B/A p99 with a 95% circular-block bootstrap (block 50, 2,000 draws); verdict OVERHEAD-RESOLVED (lower bound above 1 + band),
  NO-OVERHEAD-ABOVE-TARGET (upper bound below 1.05 and band below 5%) or INCONCLUSIVE (band not below the 5% target, or the interval straddles). Reported, never gated (R48 9.1 W2).
- **W4** (`--windows W4 [--w4-trials 10] [--w4-rehearsal]`): ten guest crashes (`echo b > /proc/sysrq-trigger`), FULL and OFF writers in separate alternating trials, the witness trace and the writer's ACK lines streamed to the host, the store read back with `docker cp` after the guest is back
  (the harness starts the VM with `colima start -p triplex2 --activate=false` if it stayed down; the docker context stays `default`), judged on the host by `vm_w4_judge.py` with the W1 per-commit rule. Pass: every witnessed commit survives and at least one unwitnessed OFF commit is lost.
  **A guest crash kills every container in the VM**, so a real W4 refuses unless nothing else is running (the shared residents must be parked by the orchestrator) and runs a guest `sync` first. `--w4-rehearsal` runs the same pipeline with a writer SIGKILL instead of the crash and never passes.

## Round 17: W4 evidence handling (fixes R16-F1 and R16-F2; offline, no guest crash run)

- **Trace prefix rule (R16-F1).** `vm_w4_judge.read_trace` now applies the prefix form of the `finish()` rules after the grammar scan: every CPU's sequence numbers are exactly `1..max`, timestamps are nondecreasing in sequence order, nothing happened before the attach record,
  and the witness's own stderr (`witness-stderr.txt`, now required) reports no lost events or errors. A crash may remove the suffix (detach record, final counters, a cut last line); it cannot excuse a hole inside what was received. Any violation refuses the trial with `TRACE-INCOMPLETE`.
- **Collection receipt (R16-F2).** The W4 collector container (read-only volume, the writer's uid) prints a receipt from the recovered volume itself: the directory listing and the size and sha256 of `broker.db` and `broker.db-wal`. The harness records it with each file's `docker cp` status in `collection.json`
  (`w4-collection/1`). The judge accepts the copies only if every listed file was copied cleanly with exactly the receipted size and sha256, and accepts an absent file only if the receipt's listing shows it absent (the main database must always exist). Codes: `COPY-FAILED`, `COPY-INCOMPLETE`,
  `COLLECTION-RECEIPT-INVALID`, `WAL-ABSENCE-UNPROVEN` (empty WAL handed in with no receipt).
- **Refused trials are no evidence.** A refused trial reports no counts; `aggregate` lists it, fails, never counts its commits as lost or surviving, and also fails any trial without a verified collection record.

## Round 18: END reconciliation and present-empty WAL (fixes R17-F1, R17-F2)

`vm_w4_judge.prefix_problems` reconciles a detach record and final counters when they DID arrive: the detach timestamp may not precede any received event, every CPU with records needs a final count equal to its received records, and a count for a CPU with no records must be zero (a half-received END is refused); without a detach record only the observed prefix counts.
`judge_trial` keeps `b''` (a present empty file) and `None` (no local file) distinct when it verifies the collection receipt; a receipt row with size 0 and the empty-file hash is a present, empty WAL, not a missing one. A live W4 rehearsal (writer SIGKILL, no crash) with the collector receipt ran on the VM: `lab/experiments/EXP-OBS01/round18/`.
