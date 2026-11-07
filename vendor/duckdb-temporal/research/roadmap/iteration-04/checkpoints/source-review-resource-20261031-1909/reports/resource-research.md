# Item 4 execution-admission research — revision 001

2026-10-31 UTC. **Research only; all compiler, native loading, runtime, database, test and benchmark gates remain CLOSED.** No Codex task, source change, Git/Page mutation, limit change, privileged operation or test workload was performed. Only this new research directory was written. No goal3 controller/probe/backup/staging/safety-stopped material was read or reused.

## Decision

**The current evidence does not admit even one build under an aggregate-resource/capacity gate.** A single-process stage has a defensible *conditional per-process VM/CPU* design, but that is a different, narrower property—not an aggregate charged-memory limit, reservation, wall deadline, successful-build guarantee or permission. Reviewers must not substitute it silently for the existing gate.

The selected contract already says work/round/logical-byte limits are not memory/time bounds. This research does not change that contract, the protected source 52 baseline, exact DuckDB 2.0.0 / d54 target, unstable CAPIv2 requirement, strict-FP premise or held store-integration boundary.

## Fresh observations, not reservations

Read-call UTC brackets and returned chunk IDs are frozen in READ-CALLS.json. /proc/self files were read with shell builtins so “self” refers to the inspected bash, not a separate cat process.

| Observation | ENV-001, 17:51:19.682–17:51:20.028 | ENV-002, 17:57:10.444–17:57:10.751 |
|---|---:|---:|
| Kernel | 6.18.55 | not re-read |
| cgroup membership | 0::/ | 0::/ |
| Visible cgroup/cgroup2 mount records | none | 0 of 50 mount records |
| /sys/fs/cgroup | absent | absent |
| AS and CPU soft/hard limits | unlimited | unlimited |
| RSS soft/hard limits | unlimited | unlimited |
| NPROC soft/hard limits | 39792 | 39792 |
| MemAvailable, kB | 3539576 | 3541096 |
| MemTotal / SwapTotal, kB | 10206484 / 0 | 10206484 / 0 |
| CommitLimit / Committed_AS, kB | 5103240 / 14708296 | 5103240 / 14708312 |

CONTRACT-001 additionally observed UID/GID real/effective/saved/fs=1000, all capability sets zero, NoNewPrivs=1, Seccomp filter mode 2 in ENV-001, and overcommit_memory=0 (ratio 50, kbytes 0). Bash 5.2.37 help identifies ulimit/exec/wait as builtins; no setting was attempted. The current hard NOFILE = 16384 is a descriptor constraint, not a job-memory control. These are call-scoped observations, not attestations for a later launch.

MemAvailable estimates allocatable memory from several reclaimable/free categories; it neither allocates nor reserves it. Mode 0 uses heuristic overcommit; the observed CommitLimit is not a mode 2 admission promise. It would be incorrect to infer safe capacity from either the available-memory snapshot or Committed_AS arithmetic. [Kernel proc documentation](https://docs.kernel.org/filesystems/proc.html), [overcommit accounting](https://docs.kernel.org/mm/overcommit-accounting.html).

A cgroup namespace can display / for a hidden non-root cgroup; mountinfo describes only the current mount namespace. Therefore 0::/ and an absent cgroup filesystem establish **unobservability**, not “no limits,” “memory.max=max,” host-root membership or available ancestor headroom. No alternate namespace/root path, mount or privilege request was attempted. [cgroup_namespaces(7)](https://man7.org/linux/man-pages/man7/cgroup_namespaces.7.html), [proc_pid_mountinfo(5)](https://man7.org/linux/man-pages/man5/proc_pid_mountinfo.5.html).

## What Linux controls actually promise

- **AS:** process virtual address space; relevant allocation/growth calls fail when the enforced limit is exceeded. It is not RSS, page-cache, kernel-allocation or campaign accounting.
- **CPU:** per-process consumed CPU; the hard threshold delivers SIGKILL. It is not elapsed time.
- Limits survive exec and are inherited by forked children, but are separate per-process allowances. An unprivileged target cannot raise a lowered hard ceiling. Lowering below existing consumption does not evict existing usage.
- **NPROC:** real-UID thread count, with root/capability exceptions—not a job-tree counter.
- **RSS:** not an effective modern-Linux resident-memory limiter. FSIZE concerns individual file growth; NOFILE does not bound total files ever produced.

These are conditional kernel semantics, not proof that a requested setter is allowed by this sandbox. [getrlimit(2)](https://man7.org/linux/man-pages/man2/getrlimit.2.html). Fork creates another address space and resets child CPU-utilization counters; serial make jobs or per-process caps therefore do not establish a campaign sum. [fork(2)](https://man7.org/linux/man-pages/man2/fork.2.html).

A dedicated cgroup supplies hierarchical descendant accounting. memory.max is a charged-memory containment mechanism with possible temporary excess, not byte-perfect total-physical-memory coverage. memory.high throttles; memory.min protects existing usage subject to ancestors, not an unallocated reservation. Swap is separate. pids.max counts tasks; cpu.max is bandwidth. cgroup.kill addresses the subtree; populated=0 means no live subtree processes, not zero retained memory. Charges stay with their original cgroup until released; moving a task does not move prior charges. These controls are **not exposed or verified here**. [Kernel 6.18 cgroup v2](https://docs.kernel.org/6.18/admin-guide/cgroup-v2.html).

**Inference:** even nonoverlapping stages can accumulate or retain file-cache/output charges outside their live VM. Reads/writes populate the page cache, and page tables/kernel data are separate from user mappings. Thus “one process at a time, AS≤B” is not a proof of “campaign physical memory≤B.” [Kernel VM concepts](https://docs.kernel.org/admin-guide/mm/concepts.html).

## Could one nonoverlapping build stage be proven narrower?

**In principle, yes for a precisely limited process claim; not presently for the full gate.** A separately authorized launch design could, **if current policy allows the setters**, use the present shell builtins to set and read back finite soft=hard AS and CPU limits, then exec-replace the shell with one exact audited executable. exec replaces the image rather than adding a process. [execve(2)](https://man7.org/linux/man-pages/man2/execve.2.html).

For an ordinary unchanged non-root UID without exception capabilities, a successfully fixed NPROC = 1 ceiling is a candidate no-new-thread/child invariant because the target itself consumes one UID thread. It can also make a compiler fail rather than parallelize. This is a **proposal requiring review**, not a tested limiter. Credential/namespace invariants, setter success, launch overhead and any exceptional paths must be demonstrated in the authorized launch context; present Seccomp=2 reveals no filter contents or permission to set limits. A new custom filter/launcher is not authorized by this research. [seccomp(2)](https://man7.org/linux/man-pages/man2/seccomp.2.html).

No compiler executable/version/driver/frontend/linker behavior was probed; no numeric AS/CPU budget is justified. A driver can require helpers, and some “single-process” software creates threads. No claim is made that item4 can successfully build under NPROC = 1. A supervisor is another resource consumer and must not disappear from aggregate accounting by definition.

The tool schema exposes yield/poll waits, not a terminal deadline or kill-all-descendants contract. GNU timeout defaults to TERM, requires explicit KILL escalation for resistant commands, and foreground mode excludes children. Its mere installation is not a verified supervisor. A later design must establish actual termination/reaping, not equate “request returned,” “signal sent” or a reusable PID number with cleanup. [timeout(1), upstream GNU manual](https://man7.org/linux/man-pages/man1/timeout.1.html), [wait(2)](https://man7.org/linux/man-pages/man2/waitpid.2.html), [pidfd_open(2)](https://man7.org/linux/man-pages/man2/pidfd_open.2.html).

## Proposed separately reviewed future admission packet

This is a checklist for a new review, **not executable commands or authorization**:

1. **Scope/identity:** final adopted contract and peer closure; authorized isolated NEW source; frozen source/header/toolchain/flags/input/fixture identities; protected baseline untouched. One exact build stage, no loading or tests implicitly bundled.
2. **Named resource claim:** reviewers specify whether they require process VM/CPU containment, aggregate charged-memory containment, or actual reserved capacity. A narrower claim cannot discharge a stronger existing requirement.
3. **Supported enforcement evidence:** provider-supported job envelope or delegated cgroup with verified membership and effective ancestors; documented charged-memory/swap/task limits, launch-before-allocation coverage, accepted overshoot semantics, supervisor/log/output budgets and failure containment. If ancestors stay hidden, obtain an authoritative platform attestation rather than infer their values.
4. **Capacity decision:** current snapshots and requested caps are separate from any scheduler/exclusive/reservation guarantee. Identify which other work shares the envelope and how remaining capacity is protected; a computed minimum ancestor headroom is still only a snapshot. If required evidence is unavailable, remain blocked.
5. **Narrow-process alternative:** only if explicitly approved as a distinct claim, exact same-launch hard-limit readback; no-child invariant; trusted exact executable; conservative numeric limits justified independently; one outstanding stage; terminal exit/reap evidence before the next. It must not be used to route around an unsatisfied aggregate gate.
6. **Future failure/cleanup review:** independently reviewed control validation, expected setter/ENOMEM/CPU/timeout failures, artifact invalidation and terminal cleanup. All such validation is UNRUN now; failure must not fall through to an unbounded retry.
7. **Separate test admission:** freeze the built artifact and exact DuckDB host, then separately review native loading, thread/process needs, strict-FP checks, a tiny bounded fixture campaign and its aggregate envelope. A build pass is not a test pass or CAPIv2/semantic/store-integrated acceptance.

## Exact remaining unknowns

- Actual cgroup namespace root, effective ancestors, controller settings, shared usage, charge attribution and provider reservation/exclusivity policy.
- Whether current security policy allows each proposed setter/supervision primitive; no enforcement experiment was allowed.
- Exact compiler/toolchain image, its helpers/threads, full launch/exec transient overhead, numeric safe budgets and output/cache footprint.
- A supported terminal wall-time/whole-job cleanup guarantee and stable process identity/reaping contract.
- Final candidate/artifact identities and separately approved build/test campaign. This directory contains **zero implementation or execution results**.

## Evidence and freeze

The five specified item4 input hashes were unchanged on closing revalidation; see CONTRACT-INPUTS.sha256. REPORT.md, source inventory, call ledger, snapshots, tool-schema capture, shell-documentation summary and progress log form the frozen research corpus. FROZEN-MANIFEST.sha256 excludes itself and the later verification receipt. Public sources were summarized and linked, not downloaded or republished wholesale; their dynamic webpages have no claimed source-content hash. Only these local evidence files are frozen.

