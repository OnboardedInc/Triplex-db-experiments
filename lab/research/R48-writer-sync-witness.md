# R48: a writer-sync witness the evaluator can trust without the candidate's word

Planner: R48 (Opus 5.5, high). Date: 2026-11-09. Repository: /Users/sam/projects/triplex-db-2. Read-only on code; this file is the only
file written. No Docker, colima, slot or engine command was run. Goals and targets come only from `lab/SCOPE.md`, `lab/NORTH-STAR.md` and
`lab/TARGETS.md`; inherited files were read for code facts only.

North star: **P3** (the lag start and end must denote durable publication and a durable consumer record, TARGETS P3 items 1 and 4) and
**P2** (the ACK is sent only after the commit is durable and readable, TARGETS P2 item 1). Correctness is the floor: a fast commit that a
VM crash can erase is not a P2 commit.

Evidence labels, as in R44: `[S]` read in a lab source or branch (file and line), `[V]` measured by an earlier lab agent and retained,
`[E]` inference or external knowledge not yet checked in this VM. Every `[E]` the design rests on is a probe in section 9.1.

## 1. Answer

1. **The trustworthy durable claim is a kernel witness plus the WAL tail: option (b) joined with option (d).** A small trusted
   `sync-witness` container traces, from the shared VM kernel, every ext4 write, file sync and filesystem sync that touches the store
   directory, with the calling cgroup and CLOCK_MONOTONIC timestamps. The observer's WAL tail (already built) maps each commit to its WAL
   byte range. The normalizer then computes, per commit, a durable instant `D` = the exit of the first successful sync on the WAL inode,
   issued from the writer's own cgroup, that entered after the last write of that commit's frames. No candidate statement, no SQLite
   setting and no SQLite build is trusted.
2. **Option (a), enforced settings, cannot work.** `synchronous` is a per-connection runtime setting that is not stored in the file, a
   compile-time default is overridden by one `PRAGMA`, and anything loaded into the candidate process (a trusted SQLite build, an extension,
   an authorizer) shares its address space. The kernel-level variant (`chattr +S` on trusted-owned files) does enforce, but it has an mmap
   hole, costs an estimated 3x to 10x in commit latency, and supplies durability the candidate's design does not have.
3. **Option (c), crash consistency, cannot witness sync with process kills.** A SIGKILL of the broker or consumer container leaves the
   VM's page cache intact, so a `synchronous=OFF` writer survives it `[E]`. Only a guest-kernel crash discriminates, and it takes down
   every resident and both arms. Keep the G03 round 6 kills as recovery checks (class "process crash"); make a guest-crash campaign an
   optional one-time validation, off the P3 path.
4. **Option (d) alone is not evidence of sync.** WAL bytes are content; any byte pattern an honest FULL writer produces, a non-syncing
   writer can produce. The WAL tail supplies order, completeness, tamper detection (F11) and the frame offsets the witness needs.
5. **Cost in writer p99: about 5 to 60 us per commit `[E]`,** at most about 1.4% of the VM's idle 10-row commit p99 of 4.43 ms `[V]`
   and about 0.1% of the P2 bar of 50 ms. The gate measures it directly from kernel BPF run-time statistics, which are not subject to the
   ABBA noise V3 hit.
6. **What to build:** OBS01 round 9 (witness program, trace parser, the per-commit `D` join, seven refusal rules, replace round 8's
   unconditional F2 refusal with "refuse unless the witness is complete"); G03 round 7 (the one privileged trusted role in box policy,
   attach-before-candidate ordering, the E12 stream, the after-ACK kill point); claim.mjs (ACK-before-durable count must be zero; consumer
   lag ends at `max(U_c, D_c)`). One VM probe window (W0 to W4) comes first. Gates are in section 9.

## 2. What must hold

### 2.1 The claims at stake

| Claim | Where the contract asks for it | What "durable" must mean here |
| --- | --- | --- |
| C-ACK: every ACKed commit was durable before the ACK | TARGETS P2 item 1: "the ACK is sent only after the commit is durable and readable" | the commit's WAL frames were synced to the device before the driver received the ACK |
| C-PUB: the source's publication is a durable publication | TARGETS P3 item 1; R44 3.2 item 5 (visible means durable and readable) | the commit is durable no later than it becomes visible to new readers; otherwise a reader can see a commit a VM crash erases |
| C-REC: the consumer's "affected subjects known" record is durable | TARGETS P3 item 4: lag runs to the consumer's durable record | the consumer transaction holding the affected set and checkpoint was synced; lag ends no earlier than that sync |

The durability class is fixed by Q100r: guest flush becomes a host `fsync` without F_FULLFSYNC (Lima vz passes
`DiskImageSynchronizationModeFsync`), so a guest-durable commit survives a broker crash and a VM crash, and host power loss is not
claimed `[V]` (RULINGS-PENDING Q100r; EXP-G03 V-PROBES V1: ext4 on `/dev/vdb1`, `rw,relatime`, no `nobarrier`, device queue
`write back`). The witness proves the guest-side half: the guest issued and completed a flush that covers the commit. The host half stays
the Q100r premise.

### 2.2 Why the observer refuses today

OBS01 round 7 finding F2 showed the observer accepting a position from a writer whose connection was switched to `synchronous=OFF`, with
the WAL sync 401 ms after the positive read `[V]` (VERIFY-round7.md F2). Round 8 closed F2 by refusing every VM durable or P3
normalization unconditionally (`lab/observer/vm_normalizer.py:212-216` at bcbf21c4 `[S]`), and the reviewer showed that a start-time FULL
declaration cannot detect a later switch to OFF `[V]` (VERIFY-round8.md, "FULL at start, OFF after ready"). R44 3.2 item 5's inference
"visible implies synced" holds only for an honest FULL writer: G03's V2 observed it for SQLite 3.40.1 in one trusted image `[V]`, and the
candidate controls its own connection, its own SQLite binary (`require(workerData.driver)` in
`packages/qlever/src/broker/sqlite-worker.ts:8` `[S]`) and its own code.

### 2.3 Threat model

The candidate's roles (broker, consumer, readers) run as uid 10001 with `--cap-drop ALL`, `no-new-privileges`, a read-only root, a
private IPC namespace and no PID sharing (`lab/bin/box.mjs:12`, `:57-58` on the G03 branch `[S]`). The candidate may run any code in its
container: change `PRAGMA synchronous` at any moment, ship its own SQLite or VFS, write the WAL with `node:fs`, mmap the WAL, use
`O_DIRECT`, call `sync_file_range`, `syncfs` or nothing, ACK early, sync late, or behave differently at the start of a run. It cannot load
BPF programs, change mount options, write `/sys`, use FUSE or see the trusted containers' volumes. The F1 binding (round 8) already
refuses renames, replacements and identity changes of the main, WAL and SHM files.

## 3. Option (a): the trusted side opens first and the candidate inherits enforced settings

### 3.1 Inside SQLite: not possible

1. **No inheritance exists.** `synchronous` lives in each connection's pager; it is not written to the database header, the WAL header
   or the SHM `[E]`. The persistent settings in the file are things like `journal_mode=WAL`, page size and auto-vacuum `[E]`. A trusted
   connection that opened the file first changes nothing about the candidate's connection; a trusted connection holding
   `locking_mode=EXCLUSIVE` would only block the candidate.
2. **Compile-time defaults are only defaults.** `SQLITE_DEFAULT_SYNCHRONOUS` and `SQLITE_DEFAULT_WAL_SYNCHRONOUS` set the starting value
   of a new connection; one `PRAGMA synchronous=OFF` overrides it at runtime `[E]`. Removing the pragma at compile time means omitting the
   pager pragma group, which also removes controls the broker uses `[E]`; a candidate that wants another behavior simply loads another
   binary. The broker resolves its driver path at runtime (`packages/qlever/src/broker/log.ts:95`, `sqlite-worker.ts:8` `[S]`), and
   `better-sqlite3` compiles its own SQLite amalgamation.
3. **A trusted extension or authorizer in the candidate process is candidate-controlled.** `sqlite3_set_authorizer` can deny
   `SQLITE_PRAGMA`, and a VFS shim can force `xSync`, but both run in the candidate's address space, where candidate code can replace,
   unload or bypass them, or write the files without SQLite at all.
4. **A trusted broker image is ruled out.** R44 2.6 rejected a trusted prebuilt broker: the broker is the system under test for P2 and
   P3, and a build the evaluator owns would still run candidate JavaScript in the same process.

### 3.2 In the kernel: possible, but it substitutes rather than measures

1. **Mechanism.** The trusted side creates the store directory with the sticky bit, pre-creates `broker.db` and `broker.db-wal` owned by
   uid 0, mode 0666, and sets the ext4 synchronous-update flag (`chattr +S`, `FS_SYNC_FL`) on both. The candidate cannot clear the flag
   (only the owner or `CAP_FOWNER` can), cannot rename or unlink them (sticky directory), and every `write()` to them returns only after
   the kernel runs a full file sync `[E]`. A `sync` mount option on the volume is the same idea for the whole filesystem.
2. **Hole: mmap writes.** Stores through a writable shared mapping do not pass through the synchronous-write path `[E]`. The candidate
   must open the WAL read-write, so it can mmap it and write frames that readers see and no one syncs. Closing the hole needs the same
   kernel tracing as option (b).
3. **Cost.** SQLite writes each WAL frame as two `write()` calls (header, then page) `[E]`; a broker commit touches about 8 to 15 pages
   (frames row and index, marker, heads, claims, operations, recent and live rows with their unique indexes, `sqlite-worker.ts:61-74`
   `[S]`), so 16 to 30 synchronous writes. Each is a full `fsync` with a journal commit (the inode's mtime changes), against a measured
   VM `fdatasync` of 0.20/2.78 ms p50/p99 idle and 0.32/6.59 ms under read load `[V]`. Estimate: commit p50 3 to 9 ms, p99 20 to 100
   ms or more under load `[E]`, which puts the P2 bars (p50 10 ms, p99 50 ms) at risk. Checkpoints that copy pages into a `+S` database
   file slow down by the same factor.
4. **It measures the wrong system.** With `+S`, the evaluator supplies durability. A candidate whose design never syncs would pass, and
   its production deployment, which has no `+S`, would lose ACKed commits in a VM crash. The qualification must show the candidate's own
   design is durable.

**Verdict on (a): rejected.** Neither variant yields a trustworthy claim about the candidate.

## 4. Option (b): syscall and kernel evidence from the trusted side

### 4.1 Where to trace

Tracing syscalls (`sys_enter_fdatasync` and friends) by name is incomplete: `msync(MS_SYNC)`, `O_SYNC`/`O_DSYNC` writes and `io_uring`
fsync reach the same kernel path without those syscalls, and `io_uring` writes bypass syscall tracepoints `[E]`. Trace one level lower,
at the ext4 entry points every path goes through, all keyed by inode:

| Event | Hook | Fields recorded | Why |
| --- | --- | --- | --- |
| File sync | tracepoints `ext4:ext4_sync_file_enter` and `ext4:ext4_sync_file_exit` | dev, ino, parent dir ino, datasync, ret, cgroup id, ktime | `ext4_sync_file` is ext4's `fsync`; reached by `fsync`, `fdatasync`, `msync(MS_SYNC)`, sync writes and `io_uring` fsync `[E]`. With barriers on and a write-back cache it issues the device flush `[E]` |
| Filesystem sync | tracepoint `ext4:ext4_sync_fs` | dev, wait, cgroup id, ktime | `syncfs(2)` and `sync(2)` are durable too; counted only with `wait=1` and only from the writer's cgroup |
| Write | `fexit` on `ext4_file_write_iter` | ino, parent dir ino, start offset (`ki_pos - ret`), length, ret, cgroup id, ktime | single entry point for buffered, `O_DIRECT`, `splice`/`copy_file_range` and `io_uring` writes to ext4 `[E]` |
| mmap write | `kprobe` on `ext4_page_mkwrite` | ino, parent dir ino, cgroup id, ktime | detects frames written through a shared mapping; any hit on the WAL or database inode refuses |
| Truncate and hole punch | tracepoints `ext4:ext4_truncate_enter`, `ext4:ext4_punch_hole`, `ext4:ext4_zero_range` | ino, offset, length, ktime | WAL resets and truncation (`journal_size_limit`) for generation tracking; removing bytes of a witnessed frame refuses |

`sync_file_range` is deliberately absent: it neither flushes the device cache nor commits metadata, so it is not durability `[E]`.

**Filter in the kernel** by `(superblock dev, parent directory inode)` of the run's store directory. The trusted side creates that
directory on the per-run volume before any candidate starts, so both values are known before the first candidate write. All Docker
volumes share `/dev/vdb1` `[V]` (V1), so the device alone would also match the residents' writes; the parent inode separates them. The
`ext4_sync_file_enter` tracepoint carries the parent inode itself `[E]`; for the write and mkwrite hooks the program reads
`f_path.dentry->d_parent->d_inode->i_ino` through BTF.

**Timestamps** come from `bpf_ktime_get_ns()`, which is CLOCK_MONOTONIC. Q100q already requires zero time-namespace offsets for every
container whose instants are compared, so the witness's instants share the observer's and driver's domain `[E]`; the witness records its
own boot id and time-namespace inode under the same Q100q rule.

### 4.2 The per-commit rule

For a commit `c` that the WAL tail places at byte range `[o_c, e_c)` of WAL generation `g` (salts from the WAL header written at offset
0):

1. `W(c)` = the latest write-exit time among traced writes to the WAL inode that overlap `[0, e_c)` since generation `g`'s header write.
2. `D(c)` = the earliest exit, with `ret = 0`, of a sync `s` such that `s` entered at or after `W(c)`, and `s` is either an
   `ext4_sync_file` on the WAL inode or an `ext4_sync_fs` with `wait = 1` on the volume's superblock, **and** `s` was called from the
   writer role's cgroup.
3. Frame bytes in the WAL tail that no traced write covers, or any `ext4_page_mkwrite` on a bound inode, mean the bytes reached the file
   by an unwitnessed path: refuse.

Counts alone ("one fdatasync per commit") are not enough: a writer can sync before it writes, or sync a different file. The rule needs the
order (sync entered after the frames were written) and the binding (same inode, same writer cgroup).

**Checkpoint rule.** Before the WAL starts a new generation (a write at offset 0 with new salts) or is truncated, every database-file
write by the checkpoint must be covered by a successful database-file sync that entered after it and exited before the restart write. An
honest FULL SQLite does this `[E]`; a writer that skips it can lose checkpointed commits once the WAL frames are overwritten.

### 4.3 What the candidate can and cannot do against it

| Candidate action | Witness outcome |
| --- | --- |
| `synchronous=OFF`, or switching to OFF after startup | no covering sync: SYNC-MISSING for each such commit |
| `synchronous=NORMAL` (WAL syncs only at checkpoint) | `D` lands at the checkpoint sync, after the ACK: ACK-BEFORE-DURABLE for the broker; consumer lag ends at that sync |
| ACK first, sync shortly after | ACK-BEFORE-DURABLE (driver ACK receive instant earlier than `D`) |
| Sync before writing, or sync a different file | not covering: SYNC-MISSING |
| Write frames through mmap | MMAP-WRITE refusal |
| `sync_file_range` only | not a sync: SYNC-MISSING |
| `syncfs` with wait from its own container | accepted as covering (it is durable) |
| Rely on another container's or the kernel flusher's writeback | not from the writer's cgroup, or not a sync: SYNC-MISSING |
| Own SQLite build, own VFS, no SQLite at all | irrelevant: the rule reads kernel operations, not the implementation |
| Rename, replace or swap files | already refused by F1 (round 8) |
| Flood ext4 writes to overflow the trace buffer | lost events: TRACE-LOSS refuses the run (fails closed; the candidate only hurts itself) |
| Fake or delete trace records | impossible: BPF programs and the witness volume are outside its reach; it holds no `CAP_BPF` and Docker's default seccomp denies `bpf()` without it `[E]` |

Residual: an ACK sent less than one RPC hop (about 50 to 100 us `[V]`, V4 ping) before the sync completes is indistinguishable from an
honest ACK, because the driver's receive instant is the trusted bound. The commit is durable microseconds later; this is a timing
resolution limit, not a durability gap.

### 4.4 Capabilities, placement and cost

1. **Separate container, not the observer.** The observer parses candidate bytes (SQLite files and WAL chunks), which is an attack
   surface. `CAP_BPF` plus `CAP_PERFMON` lets a process read kernel memory, so the privileged part must be tiny and byte-blind: it never
   opens the candidate's files. The observer stays unprivileged and joins the witness stream in the normalizer.
2. **Profile:** `--cap-drop ALL --cap-add BPF --cap-add PERFMON`, `no-new-privileges`, read-only root, `--network none`, private PID
   namespace (kernel tracepoints are global; no `--pid container:` is needed), read-only bind of `/sys/kernel/btf`, the trusted cpuset
   core, 256 MiB memory cap, output to a trusted volume the candidate never mounts. Docker's default seccomp profile allows `bpf` with
   `CAP_BPF` and `perf_event_open` with `CAP_PERFMON` `[E]`; W0 checks this, and a pinned custom profile is the fallback. Kernel
   requirements: `CAP_BPF` (Linux 5.8 or later), BTF at `/sys/kernel/btf/vmlinux` and `fexit` support `[E]`.
3. **Program:** a pinned `bpftrace` image with a script of about 40 lines, or, if W0 shows `bpftrace`'s loss reporting is not
   machine-checkable, a libbpf C program of about 200 lines using a BPF ring buffer with a reserve-failure counter. Either way the
   script's hash and the attach time go into a start record, and a detach record closes the stream.
4. **Writer cost `[E]`:** a filtered-out event costs about 0.1 to 0.3 us; a recorded event about 0.5 to 1.5 us. A broker commit produces
   about 16 to 30 writes and one sync, so about 5 to 60 us of kernel time on the writer's CPU per commit. Against the VM's idle commit
   p50/p99 of 1.06/4.43 ms `[V]` that is at most about 6% of p50 and 1.4% of p99, and about 0.1% of the 50 ms P2 bar. The residents'
   ext4 writes each pay the filtered-out cost. The gate (W2) measures this from `kernel.bpf_stats_enabled` run-time counters per program,
   which give the added time directly; V3 showed that ABBA p99 comparisons at this scale swing from -43% to +12% `[V]` and cannot resolve
   a 1% effect.
5. **Evasion of the tracer itself:** none known from an unprivileged container. The candidate can detect that it is traced only
   indirectly, and behavior under tracing is the behavior qualified.

## 5. Option (c): crash consistency instead of a setting check

### 5.1 Process kill after ACK (G03 round 6 path)

The injector pauses the container, the observer snapshots, the evaluator SIGKILLs it and proves the cgroup gone, and a new container
resumes on the same volume (R44 5.3, Q100j; G03 round 6 `ns-fault.mjs` `[S]`). This kills processes, not the kernel. Data the writer
`write()`-ed without syncing is in the VM page cache and is still there when the new container opens the file, so a `synchronous=OFF`
broker passes a kill-after-ACK test `[E]`. SQLite documents the same: with sync off, an application crash is survivable, an OS crash or
power loss is not `[E]`. Process kills therefore test recovery logic, idempotent resume and lost-ACK handling, which matters for P2 and
P3; they do not test sync. Receipts from them carry the durability class "process crash".

### 5.2 Guest-kernel crash

An immediate guest reboot without sync (`sysrq b`) or a guest panic (`sysrq c`) drops the guest page cache; writes already handed to the
virtio device reach the host file under the vz Fsync/Cached mode and survive, because the host keeps running `[E]`. Dirty pages are
written back after about 5 to 30 s by default `[E]`, so a crash shortly after an ACK loses an OFF writer's commits with high probability.

Limits:

1. **It is a sample, not a per-commit witness.** It can catch a writer that never syncs, and it rarely catches one that ACKs a few
   milliseconds before syncing: at the modest average write rate the chance that a random crash lands inside a few-millisecond window is
   small.
2. **It gives no durable instant,** so it cannot repair the consumer's lag end (C-REC).
3. **It is disruptive.** It needs root in the VM, takes down both protected residents, both arms, the observer and the driver; ext4
   recovers every volume; Lima may treat a guest reboot as a stop `[E]`. The ACK record must reach the Mac before the crash (the
   evaluator already follows the driver's control stream through the Docker API, so ACKs received on the Mac are the checked set).
4. **It validates the class, not the candidate.** Its real value is checking the Q100r premise end to end: does a commit the witness
   calls durable survive a guest crash, and does one it calls unsynced get lost?

### 5.3 Block-level power-cut simulation

`dm-log-writes` under a dedicated volume records every write and flush and can replay the device to its state at any flush, which is
exactly "what survives a power cut at time t" for the guest `[E]`. It needs device-mapper and root in the VM, a volume placed on the dm
device, and it doubles write I/O. It is the strongest way to validate the witness without crashing the VM, and it is a VM configuration
change. Keep it as the alternative for the one-time validation if the orchestrator prefers no reboot.

**Verdict on (c):** keep 5.1 as a recovery check; make 5.2 (or 5.3) an optional one-time class validation; neither is the per-run
durable claim.

## 6. Option (d): WAL frame and checkpoint evidence the observer already reads

1. **What it gives.** The WAL tail and final readback (R44 3.3; OBS01 F11 checks) give the exact order of transactions, each commit
   frame's generation and byte range, salts, checksums, rewrites, resets and checkpoint rollovers, bound to file identity by F1.
2. **What it cannot give.** Nothing in WAL bytes records that a sync happened. With the default power-safe-overwrite setting SQLite does
   not pad commits to sector boundaries even under FULL `[E]`, and padding would be forgeable anyway. A checkpoint's effect on bytes is
   the same whether or not the database file was synced first.
3. **Its role in the recommended design.** It supplies `[o_c, e_c)` and the generation for the per-commit rule of 4.2, and it lets the
   normalizer detect WAL bytes no traced write produced. Without (d), the witness would know that syncs happened but not which commit
   each one covered.

**Verdict on (d):** necessary, not sufficient.

## 7. Comparison

| Criterion | (a) SQLite-level enforcement | (a') kernel `+S` enforcement | (b) kernel witness | (c1) process kill after ACK | (c2) guest crash or dm-log-writes | (d) WAL tail |
| --- | --- | --- | --- | --- | --- | --- |
| Independent of the candidate's word | no: runs in the candidate's process | yes, except mmap writes | yes | yes | yes | yes, but answers a different question |
| Detects `synchronous=OFF` | no | prevents it, except via mmap | yes, every commit | no (page cache survives) | yes, statistically | no |
| Detects ACK before sync | no | partly (write returns after sync; ACK timing unchecked) | yes, every commit, to one RPC hop | no | rarely | no |
| Gives a per-commit durable instant (consumer lag end) | no | no | yes | no | no | no |
| Binds to writer, files and commit range | no | files only | cgroup, inode, byte range, generation | container | run | files and frames |
| Measures the candidate's own design | n/a | no: the evaluator supplies durability | yes | partly | yes | n/a |
| Writer p99 cost | 0 | estimated 3x to 10x commit latency; P2 p99 bar at risk | about 5 to 60 us per commit, under 1.5% of VM p99 | 0 in lag runs (Q100j separates crash runs) | 0 per run; VM reboot or doubled writes in a one-time campaign | 0 extra (already paid; V3) |
| New privilege | none | trusted pre-creation of files | `CAP_BPF` and `CAP_PERFMON` in one byte-blind trusted container | none new | VM root | none |
| Disruption | none | none | none | per crash run | residents and both arms down, or a VM configuration change | none |
| Verdict | rejected | rejected | **per-run witness** | keep as recovery check | optional one-time class validation | **required companion of (b)** |

## 8. The recommended combination and the durable claim

### 8.1 Combination

1. **Every qualifying VM run:** (b) the sync witness on the broker store directory and the consumer store directory, joined with (d) the
   WAL tails and F1 identities. This is the only evidence that turns visibility brackets into durable ones.
2. **Crash runs:** (c1) as today, with the witness on, labelled "process crash".
3. **Once, optional, off the P3 path:** (c2) or (c3) with planted FULL and OFF writers and the witness on, to check that witnessed `D`
   predicts survival in this Lima/vz configuration. Q100r takes this as a premise today; the campaign would turn it into an observation.

### 8.2 How each claim is judged

| Claim | Rule | Outcome |
| --- | --- | --- |
| C-ACK (P2) | for every ACKed commit, `ackAtNs` (E1, driver HR) at or after `D(c)` | any violation is ACK-BEFORE-DURABLE, a correctness failure of P2, not a timing miss |
| C-PUB (P3 source) | for every commit, `D(c)` exists, and no positive poll ended before `D(c)` (`U(c) >= D(c)`) | a positive poll that ended before the sync returned saw a commit before it was durable: VISIBLE-BEFORE-DURABLE, a correctness failure. Lag start stays `L`, which only overstates lag |
| C-REC (P3 consumer) | the consumer transaction holding the checkpoint for position `p` has `D_c` | lag end = `max(U_c(p), D_c)`; a missing `D_c` makes that position NOT_ESTIMABLE and the run INVALID |

An honest FULL SQLite writer satisfies all three by construction: it writes the frames, syncs, then updates the WAL-index header
(G03 V2 `[V]`), so `D(c) < U(c)` and the broker ACKs after the publication.

### 8.3 Refusal codes (normalizer)

| Code | Condition |
| --- | --- |
| SYNC-MISSING | a commit with no covering sync from the writer's cgroup before run end |
| ACK-BEFORE-DURABLE | driver ACK receive instant earlier than `D(c)` |
| VISIBLE-BEFORE-DURABLE | source commit with `U(c) < D(c)` |
| CHECKPOINT-UNSYNCED | WAL restart or truncation while checkpointed database writes lack a covering database sync |
| UNWITNESSED-WRITE | WAL frame bytes no traced write covers, any `ext4_page_mkwrite` on a bound inode, or a write to a bound inode from a cgroup other than the writer's |
| TRACE-INCOMPLETE | missing start record, attach later than the first candidate start, lost events above zero, missing detach record, program hash or clock-domain mismatch |
| WITNESS-UNBOUND | the witness's (dev, inode) set or cgroup ids differ from the F1 file binding or the G03-inspected container cgroups |

Round 8's unconditional VM refusal is replaced by: refuse durable and P3 use unless the witness is complete (no TRACE-INCOMPLETE or
WITNESS-UNBOUND) and every judged commit passes the rules above. Every round-8 F2 negative must still refuse when replayed with its real
trace.

## 9. What to build, with gates

### 9.1 Probes first (one orchestrator-approved VM window, about 1 hour, no candidate code)

| Probe | Question | Pass |
| --- | --- | --- |
| W0 | Kernel and runtime facts: `uname`, BTF present, `fexit` attach to `ext4_file_write_iter`, the five ext4 tracepoints exist, a container with only `CAP_BPF` and `CAP_PERFMON` can load and attach under Docker's default seccomp, kernel lockdown mode, `bpf_ktime_get_ns` against the observer's `time.monotonic_ns` | every item recorded; attach succeeds with the stated capabilities only (or the pinned custom seccomp profile is named) |
| W1 | Planted writers, 1,000 ten-row commits each, in a trusted probe image: FULL; OFF; NORMAL; FULL switched to OFF after 500 commits; ACK 1 ms before sync; sync before write; sync of another file; `sync_file_range` only; `syncfs`; frames written through mmap; a neighbor container calling `sync` | FULL: 1,000/1,000 witnessed with `D < U` and `D < ACK`; each other mode yields exactly its code from 4.3 for every affected commit; `syncfs` accepted; the neighbor's sync never credited |
| W2 | Writer cost | added kernel time per commit from BPF run-time counters, p99 at most 100 us; writer commit p99 with and without the witness reported (ABBA, V3 shape), not gated, because V3 showed its noise exceeds the effect |
| W3 | Loss under load: 20 minutes, 256 readers, resident engines active, broker-shaped writer | zero lost events; witness container CPU under 0.1 core on the trusted core |
| W4 | Optional class check (only if the orchestrator approves a reboot): 10 guest `sysrq b` crashes with planted FULL and OFF writers | every witnessed commit survives; at least one unwitnessed OFF commit is lost; otherwise the class premise in Q100r is reopened |

### 9.2 Builders and reviewers

| Id | Work | Base | Gates | Depends on |
| --- | --- | --- | --- | --- |
| B8 **OBS01 round 9** | `lab/observer/vm_syncwitness.*` (the pinned trace program and a parser of its records); the per-commit join of 4.2 in `vm_normalizer.py` for the SQL01 and FD01 schemas; the codes of 8.3; replace the unconditional F2 refusal (`vm_normalizer.py:212-216`) with the complete-witness rule; witness start and detach records in the obs bundle | exp/OBS01-observer (bcbf21c4) | offline synthetic trace fixtures for every row of 4.3 and 8.3, each refusing with its exact code; FULL fixture accepts; planted-delay gates (100, 249, 251, 400 ms) still bracket within 1 ms with `D` included; parser fuzz (malformed, duplicate, out-of-order, foreign cgroup records); all round-8 negatives still refuse; then W1 replayed through the real normalizer in the VM | W0 |
| B9 **G03 round 7 additions** | box policy for one trusted `sync-witness` role with the 4.4 profile, kept separate from the candidate verifier, which still refuses any `CapAdd` (`box.mjs:57-58`); run order: create per-run volumes and store directories, start the witness with (dev, directory inode), wait for its attach record, then start candidate roles; pass candidate cgroup ids from inspect; stop the witness after the final readback; export stream E12 `sync-witness/1` (HMAC-chained, with lost-event counters); a broker C2 "after-ACK" kill point whose fault-witness/1 carries the witnessed `D` of every ACKed commit and the class "process crash" | G03 round 6 | isolation regressions: a candidate cannot read the witness volume, `bpf()` in a candidate returns EPERM, a candidate container with any added capability is refused; a run whose witness attaches after a candidate start is refused (TRACE-INCOMPLETE); a witness killed mid-run invalidates the run; P-TINY NS smoke with the witness on shows zero lost events | B8 parser format, W0 |
| B5 addition **CR-NS (claim.mjs)** | P2: ACK-BEFORE-DURABLE count over E1 and E12 must be zero; P3: consumer lag end `max(U_c, D_c)`; source VISIBLE-BEFORE-DURABLE count must be zero; durability class from the run's mount and device record | main | forgeries: an E12 stream with a dropped sync record, an extra sync from a foreign cgroup, a reordered pair; each refused with its code | B8 |
| R reviews | one Codex high reviewer for B8 and for B9; the B8 reviewer gets the planted-writer list of W1, not this note's conclusions | | ACCEPT | each |

Agent models follow the lab's memory rule: Codex builders at medium, Codex reviewers at high, Opus planners at high.

### 9.3 Effect on the chain

B8 runs beside B9 and joins at the NS.P3 first-PASS cell, as B6 did in R44 8.3. W0 to W3 fit in the next VM probe window. Nothing here
waits on W4. Until B8 and B9 pass, round 8's refusal stands and no VM run carries a durable or P3 claim.

## 10. Proposed rulings (rows for RULINGS-PENDING)

| Id | Ruling | Source |
| --- | --- | --- |
| Q108a (orchestrator) | **Writer durability is witnessed in the kernel, never declared.** A VM durable, P2 or P3 claim on the broker or a consumer store requires a complete `sync-witness/1` stream (E12) from a trusted byte-blind container holding only `CAP_BPF` and `CAP_PERFMON`, attached before any candidate role starts, with zero lost events, bound to the F1 file identities and the writer's cgroup. Candidate configuration, the observer's own `PRAGMA`, and SQLite build or version are never durability evidence | R48 4, 8 |
| Q108b (orchestrator) | **Per-commit durable instant.** `D(c)` is the exit of the first successful file sync on the WAL inode, or `syncfs` with wait on its superblock, from the writer's cgroup, entered after the last write of the commit's frames in its generation. P2 requires `ackAtNs >= D(c)` for every ACKed commit; the source requires `U(c) >= D(c)`; consumer lag ends at `max(U_c, D_c)` | R48 4.2, 8.2 |
| Q108c (orchestrator) | **Process kills are recovery tests, not sync tests.** Kill-after-ACK results carry the class "process crash"; no receipt infers sync from surviving a container kill | R48 5.1; Q100j |
| Q108d (orchestrator) | **Enforcing durability for the candidate is not allowed in qualification.** No `sync` mount, `FS_SYNC_FL`, trusted VFS or trusted SQLite in the candidate image; the qualified design must be durable by its own syncs | R48 3.2 |

## 11. Residual risks

| # | Item | Why it stays | Control |
| --- | --- | --- | --- |
| 1 | Host power loss | vz Fsync mode does not flush the Mac drive cache | unchanged: not claimed (Q100r) |
| 2 | The guest-to-host half of the class is a premise | the witness sees guest syncs only | optional W4 or the dm-log-writes campaign |
| 3 | ACK up to one RPC hop before sync completion | the driver's receive instant is the trusted bound | named resolution limit; the commit is durable microseconds later |
| 4 | A kernel or Docker update changes tracepoints or seccomp | W0 facts are per VM image | the witness start record binds kernel release and program hash; a change re-runs W0 and W1 |
| 5 | A second privileged trusted container | `CAP_BPF` plus `CAP_PERFMON` read kernel memory | byte-blind program, no network, no candidate files opened, pinned image, reviewed script under 200 lines |
| 6 | Lane X and lane D sources | their durability is engine-internal and their instants are TO and EI (R44 3.1) | out of scope here; the same witness can cover an engine's volume later |

## 12. Sources read

| Source | For |
| --- | --- |
| lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md (P2 and P3 measurement items) | goals and the durable definitions |
| .claude/worktrees/verify-obs6/lab/verify/OBS01/VERIFY-round7.md (F2) and VERIFY-round8.md | the defect and the current refusal |
| .claude/worktrees/obs01/lab/observer/vm_normalizer.py:205-219 (bcbf21c4), lab/bin/vm-observer.mjs:17 | refusal code, observer hardening |
| lab/research/R44 sections 2.5, 2.6, 3.1 to 3.6, 5.3, 5.5, 8, 9 | placement, bracket, fault injector, build list |
| lab/acceptance/RULINGS-PENDING.md Q100r; lab/NOTEBOOK.md lines 2095, 2107 | durability class, V1 and V3 numbers |
| .claude/worktrees/g03/lab/experiments/EXP-G03/V-PROBES.md, REPORT.md round 6; lab/bin/box.mjs:12, :57-58 | V1 to V5 results, fault injector status, candidate hardening |
| packages/qlever/src/broker/sqlite-worker.ts, log.ts; .claude/worktrees/fd01/packages/host/src/feed/ConsumerStore.ts:22-52 | broker and consumer store pragmas, driver loading |
