# R28: isolating candidate builds and runs from the evaluator on this host (design for EXP-G03)

**Written:** 2026-11-08 by planner R28 (Opus 5.5, high). **Moves:** the floor under every claim for P1 to P5 (Q65f, Q67a, Q67e).
**Scope:** EXP-G03's isolation layer: where candidate code runs during qualification, what it can reach, how its answers leave, how it dies,
and how all of that enters the execution identity. Not in scope: the OBL case runner's semantics, the fault injector, PAIR-0 statistics.

## How to read this report

- **Evidence labels.** `[S]` read in the lab's source or on a lab branch (file:line at the named commit). `[W]` web primary document
  fetched 2026-11-08. `[V]` measured by an earlier lab agent and retained on a branch. `[E]` inference or expectation; every `[E]` that
  the design depends on is a probe in section 10.
- **Not done.** No Docker, VM or colima command was run; no repository file was edited; nothing was downloaded. Every flag below is text.
- **Code read.** `lab/bin/claim.mjs` at `exp/E01-claim-evaluator` 388209d (1,607 lines), `lab/bin/engine.mjs` and `lab/bin/lib.mjs` on
  main 95cb7f1, `lab/bin/agent.mjs`, `lab/config/slots.json`, `~/.colima/triplex2/colima.yaml` (read only), the DA00 branch's
  `lab/config/datomic/{Dockerfile,entrypoint.sh,transactor.properties}`, the E01 reports (round 1 to 3), V-E01 and its round 2 and 3
  re-tests on `verify/E01` 9242e99, R27 sections 0 to 2, R29 sections 0 to 2, RULINGS Q65f, Q67, Q75, Q78, Q80 to Q83.
- **Route names.** T1 to T8 are V-E01's tamper routes (`verify/E01:lab/verify/E01/v-e01.test.mjs:92-155`); F1 to F10 its findings. Routes
  this report adds are L1 (oracle laundering), N1 to N4 (network and resources) and D1 to D3 (outside the run). Section 1.3 defines them.

## 0. Answer

**Run every candidate process (build, case runner, gateway, measurement arm) in a hardened container inside the triplex2 VM, and run no
candidate process on the Mac during qualification. Detection on the Mac (claim.mjs today) becomes a second layer, not the guarantee.**

1. **The guarantee comes from absence, not from checks.** The candidate's containers hold only the contract's build inputs (never `lab/`),
   a read-only Linux pnpm store, read-only case inputs and tmpfs scratch. The evaluator, its git, the oracles, the A0 control, the evidence
   store, the run key and the Mac file system are not in the container's mount namespace at all, so T1, T3, T4, T5, T7, T8, F1, F2, F4, F7
   and F9 have nothing to act on. No bind mount of a Mac path is ever given to a candidate container; bytes go in and out through the Docker
   API (tar in, stdout and a trusted walker's JSON out).
2. **Killing is guaranteed by the kernel.** Each candidate container has its own PID namespace and cgroup. setsid and double fork change
   the session and the parent, not the namespace or the cgroup; `docker rm -f` kills the namespace's init and the kernel then SIGKILLs every
   process in it `[W]` (pid_namespaces(7)). The evaluator proves the kill by the container's cgroup directory being gone, read by R27's
   observer, which already mounts `/sys/fs/cgroup` read-only with the host cgroup namespace. This closes T2b, the one escape V-E01 left
   named.
3. **The network is one internal Docker network per arm,** holding the arm's candidate containers and one trusted relay that forwards to
   that arm's slot engine and nothing else. The default colima setup lets any container on a normal bridge reach every service on the Mac's
   127.0.0.1 through 192.168.5.2 `[W]` lima docs, including ports 15442 and 17019. An internal network without a gateway address closes
   that, the other arm's slot, the dev residents and the internet.
4. **One new route matters more than the old ones: L1, oracle laundering.** The candidate's checkout contains the pinned oracle files
   (prepareTrusted copies them from the claimed commit, `claim.mjs:1190-1192` `[S]`), and the SUT's PATH holds python3 (`claim.mjs:892,1014`
   `[S]`). A SUT that shells out to `python3 lab/oracles/...` prints the expected answer and passes every case without touching an engine.
   sandbox-exec does not stop it (reads are allowed); the container design stops it by copying only the contract's build inputs (no `lab/`)
   into an image without python3.
5. **sandbox-exec (option b) is not enough on its own** and must never stand in for G03: it cannot kill a setsid helper, it allows reading
   every file the user can read (L1, the run key, Sam's personal files), it has no memory or process caps, it is refused with exit 71 when
   the launcher is itself sandboxed (`verify/E01:lab/verify/E01/round3/sandbox-probe.json` `[V]`), and claim.mjs then silently falls back to
   detection only (`claim.mjs:1521` `[S]`). Keep it for the oracle children, which run trusted code on the Mac.
6. **Cost.** One-time per lockfile: a pinned `tx2-box` image and a Linux pnpm store volume (about 2 to 5 minutes with network, done by
   orchestrator tooling). Per build instance: about 20 to 45 s more than today (tar in, offline copy install, walker). Per case: about
   0.15 to 0.3 s (`docker exec` plus a process-list check). Per run: about 5 s for networks, relays, preflight and teardown. A claim with
   two instances and 200 case executions costs about 1.5 to 3 minutes more `[E]`. Memory: a build container needs about 2 GiB and a case
   runner 0.75 GiB from the 11 GiB pool, so a G03 run needs at least one dev resident parked.
7. **Outside the run, three routes stay open and must be on the named list:** D1 builders execute candidate code on the Mac during
   development with their own rights (writable main `.git`, `.pnpm-store`, the Docker socket); D2 every Docker socket holder is root in the
   VM, and colima mounts `$HOME` writable into the VM by default `[W]`; D3 a builder can move `refs/heads/main`. Two cheap controls shrink
   them: the evaluator runs from its own clone outside every agent's writable roots with the authority and evaluator commits passed as ids,
   and (recommended, an orchestrator VM change) colima's mounts are narrowed to one read-only directory.

| # | Question | Verdict | Confidence |
| --- | --- | --- | --- |
| 1 | Options and guarantees | (a) containers in triplex2 stop every T and F route that is about isolation, plus L1 and N1 to N4; (b) sandbox-exec stops writes and network but not T2b, L1, reads or resources, and is unavailable under a sandboxed launcher; (c) a second macOS user needs admin (rejected); (d) Apple `container` micro-VMs and a second VM need installs or budget outside the brief; gVisor is an optional later layer for builds | High for the route table; medium for (d) |
| 2 | Result channel | stdout of one `docker exec` per case, captured by the evaluator to a file with a byte cap and a timeout, hashed into the evaluator's store on receipt; build outputs and listings come from a trusted walker container over a read-only volume; no tar is ever extracted on the Mac | High |
| 3 | Engine reach | per-arm `--internal` network with no gateway address; the only other member is a trusted relay (R27's TO proxy, moved into its own container) whose single upstream is the arm's slot engine; offline cases run with `--network none` | High for the shape; the no-gateway option is a probe |
| 4 | Killing | `docker rm -f` per container; proof is the cgroup directory gone plus the network removal succeeding; a per-case survivor check (`docker top` must show only the runner's own two processes) fails the run closed | High |
| 5 | Identity | `execution-identity/2`: image id, image build-input hash, the toolchain read from the image, the store volume's listing hash, the canonical isolation profile (flags, mounts, env, limits, user, network shape), the daemon, containerd, runc and kernel versions; placement (container names, cpusets, slot) stays separate (Q67g) | High |
| 6 | Recommendation | section 4 (flags in 4.6), overhead in section 7, residual list in section 8 | |

## 1. What must hold

### 1.1 The rulings

- **Q67e:** builds and both arms run isolated from evaluator, oracle, evidence and control storage; oracle bytes run from an evaluator-owned
  read-only copy re-hashed before every invocation; offline verdicts stay DIAGNOSTIC.
- **Q75a to j:** evaluator integrity at start; trusted bytes read and copied before the first candidate process; pinned runners; the
  toolchain recorded per resolved binary with PATH pinned; lstat walks, modes, no outside links; a fresh HOME and TMPDIR per child;
  deletion of evidence detected; an honest unprotected list naming in-run restore, setsid, TOCTOU and "no filesystem or network
  isolation", each "until EXP-G03 isolates builds" (Q75a).
- **Q81a:** every case input re-checked at the end. **Q82c:** observer evidence is written by a sidecar that engine.mjs starts, under a
  per-run key the SUT never sees.

E01 round 3 implemented the detection side of all of these (`REPORT-round3.md` `[S]`); V-E01 round 3 accepted it "within its documented
detection boundary, not production qualification or arbitrary-code containment" (`VERIFY-round3.md` `[V]`). G03 is the containment.

### 1.2 What the evaluator trusts (the set candidate code must not be able to write)

| Thing | Where it lives today | Who can write it today |
| --- | --- | --- |
| Evaluator files (`claim.mjs`, `lib.mjs`, `gate.mjs`, `engine.mjs`, `heavy-lock.mjs`, `receipt.mjs`, `build_contract.py`; `claim.mjs:908` `[S]`) | main checkout `lab/` | any process as user sam; Codex builders cannot (not in their writable roots), but they can reach it through the VM (D2) |
| Git objects, refs, config, the poison marker (`.git/triplex-evaluator-poisoned.json`, `claim.mjs:910,927` `[S]`) | main `.git` | every Codex builder: `.git` is in `ALWAYS_WRITABLE` (`agent.mjs:32` `[S]`) |
| Oracle copies, case inputs, evidence store | evaluator temp dirs under `os.tmpdir()` (`claim.mjs:1507` `[S]`) | any process as sam |
| A0 registry and controls, contract | contract files at the authority commit | through git (refs) |
| Toolchain (`node`, `pnpm`, `python3`) | `~/.local/bin/node`, `/opt/homebrew/bin/pnpm` | sam |
| pnpm store | `/Users/sam/projects/triplex-db-2/.pnpm-store` (1.9 GiB) | every Codex builder (`agent.mjs:32` `[S]`) |
| Engine effective configs | `runs/engines/<lane>-<slot>/` (bind-mounted read-only into engines) | every Codex builder (`agent.mjs:33` `[S]`) |
| Pool ledger and slot locks | `lab/locks/` | every Codex builder |
| Observer bundles, run key, witness log (R27 2.5) | observer volume in the VM; key file on the Mac | orchestrator tooling; anyone as sam can read the key |

### 1.3 Routes

V-E01's routes, restated in one line each (`v-e01.test.mjs:92-155`, `VERIFY.md` `[V]`):

| Route | What the candidate does | Status at 388209d (detection only) |
| --- | --- | --- |
| T1 | SUT edits the oracle copy from inside its process group | detected (ORACLE-TAMPERED) |
| T2a | build double-forks a helper | killed (process group) |
| T2b | build helper calls setsid | **survives**; named |
| T3 | build rewrites `claim.mjs` | detected at the end of that run and before the next (Q75a); in-run restore named |
| T4 | T1 through a symlink made in its own checkout | detected |
| T5 (blob, a, b, c) | `git replace` swaps an oracle's or the contract's bytes | fixed by Q75b (replace refs ignored, blobs checked against object ids) |
| T6 | build plants files in the shared HOME | fixed by Q75f (fresh HOME per child) |
| T7 | SUT deletes an evidence object | detected (Q75i) |
| T8 | `git replace` on A0's source | fails closed |
| F1 | evaluator poisoned for later runs | detected (Q75a) |
| F2 | lazy oracle read after the build | fixed (Q75b) |
| F3 | toolchain identity is the evaluator's, not the child's; symlink targets; modes | fixed (Q75d, e) on the Mac toolchain; not hermetic |
| F4 | one HOME for all children | fixed (Q75f) |
| F5, F6, F8 | comparator shapes, CMP-ERROR cause, promotion kind | not isolation; out of scope here |
| F7 | evidence deletion undetected | fixed (Q75i) |
| F9 | evidence directory made unreadable, the evaluator throws | fixed (diagnostic return) |
| F10 | walkTree follows directory symlinks | fixed (Q75e) |

Routes this report adds:

| Route | What happens | Status at 388209d |
| --- | --- | --- |
| **L1 oracle laundering** | The SUT runs the pinned oracle from its own checkout (`lab/oracles/...` is in the claimed commit's tree, and pinned files are taken from it, `claim.mjs:1190-1192` `[S]`) with the python3 on its PATH (`claim.mjs:892,1014` `[S]`), or reads the evaluator's oracle copy or store, and prints the expected answer. Every comparison passes and no engine is exercised. | **not detected, not named** |
| N1 network to the Mac | A process in the VM reaches every Mac service bound to 127.0.0.1 through 192.168.5.2 (`host.lima.internal`), "including services that listen only on the host's 127.0.0.1" `[W]`; colima here runs `vmType: vz`, `gatewayAddress: 192.168.5.2` (`~/.colima/triplex2/colima.yaml`) `[S]`. For the Mac-side SUT today: the whole loopback and the internet. | open (no network isolation, named) |
| N2 reach another arm or a resident | The candidate talks to A0's slot engine or a dev resident and changes the control's or another agent's data. | open |
| N3 resources | A fork bomb, memory or disk fill slows or kills engines, residents and other agents; measurement arms are perturbed. | open |
| N4 engine as a pivot | The candidate asks an engine on a normal bridge to fetch a URL for it (QLever's `SERVICE` clause makes outbound HTTP requests, R10 2.7 `[S]`; SPARQL `LOAD` `[E]`), reaching N1's targets from the engine's network. | open |
| D1 development runs | Builders run candidate code on the Mac (`pnpm test`, gates) with the builder's rights: writable main `.git`, `.pnpm-store`, `runs/engines`, `lab/locks`, the Docker socket and network (`agent.mjs:32-33,75` `[S]`). | outside G03; partly named (Q82c's "one macOS user") |
| D2 Docker socket = VM root = `$HOME` | colima's default "$HOME is mounted as writable" `[W]` and `mounts: []` here `[S]`. `docker run -v /Users/sam:/h` from any socket holder writes anywhere in Sam's home, including the evaluator. | outside G03; not named |
| D3 authority ref moved | A builder runs `git update-ref refs/heads/main <commit>` in the shared `.git`; claim.mjs resolves `--authority-ref main` (`claim.mjs:1586` `[S]`) and reads the contract and oracles from that commit. | not named |

## 2. Options

### 2.1 (a) Containers inside the triplex2 VM

**Guarantees.** Separate mount, PID, network, IPC and UTS namespaces; a cgroup with memory, CPU and pids limits; no capabilities; no
privilege gain; read-only root; a non-root uid; the Docker default seccomp profile (blocks `unshare`, `mount`, `setns` without
CAP_SYS_ADMIN `[E]`). The candidate sees only what is mounted. The image digest is the whole toolchain (libc, node, pnpm, the shell).

**What it stops.** Every route whose target is a file or process on the Mac, because none is in the namespace; T2b by the PID namespace;
L1 by mounting only build inputs and shipping no python3; N1 to N3 by the internal network and the cgroup; N4 needs the VM egress rule
(H2, section 4.9) because the engine, not the candidate, makes the request.

**Per-run cost.** Section 7: about 20 to 45 s per build instance and 0.15 to 0.3 s per case, plus one-time image and store preparation.

**What it breaks or changes.**

| Item | Effect | Fix |
| --- | --- | --- |
| pnpm store hard links and clones | none on the Mac store: G03 never mounts it. The container store is a different file system from the workspace volume, so pnpm copies `[E]` | `--config.package-import-method=copy`; filtered install keeps the copy small (below) |
| The shared `.pnpm-store` | not used by G03. That is a gain: D1 lets any builder change it (`agent.mjs:32`) | a Linux store volume per authority lockfile, filled by orchestrator tooling with network, read-only to candidates |
| Platform packages | the Mac store holds only darwin variants (`@esbuild/darwin-arm64`, `@rolldown/binding-darwin-arm64`, `@oxlint/binding-darwin-arm64`, `lightningcss-darwin-arm64`, `@cloudflare/workerd-darwin-arm64`, `@tailwindcss/oxide-darwin-arm64` in `node_modules/.pnpm` `[S]`), so `pnpm install --offline` on linux/arm64 fails against it | `pnpm fetch` inside the box image (linux/arm64, glibc) fills the Linux store with the right optional packages |
| Native modules | `better-sqlite3` (in `onlyBuiltDependencies`, `pnpm-workspace.yaml`) is not a dependency of the five built packages (core, testkit, xtdb, qlever, qualification `[S]` package.json files), so a filtered install never builds it. rolldown and esbuild ship prebuilt per-platform packages, no compile | build only `--filter` the five packages' closure; if a later package needs a native compile, a trusted prebuild step fills a cache volume (keep compilers and python3 out of the runner image, L1) |
| Absolute paths | every instance is at `/work`, uid 10001, hostname `tx2-box`: `node_modules/.modules.yaml` and other install metadata stop varying with the evaluator's temp path | a gain for Q71a (installMetadataExclusions can be measured on two clean container installs) |
| SUT placement for measurements | the SUT moves from the Mac (through colima's ssh port forwarder) to the VM next to the engine: different latency and CPU contention; earlier Mac-placement receipts are not comparable | placement is recorded per arm (Q67g); both arms always use the same placement |
| VM budget | build 2 GiB, case runner 0.75 GiB, relay 64 MiB, from an 11 GiB pool where the three residents hold 9.25 GiB (`slots.json`, Q78b) | admit every box container through `withPool`/`admission` like a research probe; G03 runs park at least one resident |
| The evaluator needs the Docker socket | claim.mjs gains Docker calls through `lib.mjs dockerArgs` (always `-H unix:///Users/sam/.colima/triplex2/docker.sock`, `lib.mjs:136-139` `[S]`) | qualification runs are orchestrator runs outside any agent sandbox; a missing socket is ISOLATION-NOT-IN-FORCE (fail closed) |

### 2.2 (b) macOS sandbox-exec profiles

claim.mjs already has one (`claim.mjs:1000` `[S]`): `(allow default)(deny file-write*)` with the child's own directories re-allowed,
`(deny network*)`, `(deny mach-lookup)`, signals only within the sandbox; every descendant inherits it.

**What it stops.** Writes outside the child's directories (T1, T3, T4, T5, T7, T8, F1, F9), Seatbelt checking the resolved path for T4
`[E]`; all network, which also means a gate SUT cannot reach its engine until the profile allows one port (`(allow network-outbound (remote
tcp "localhost:<port>"))`; SBPL accepts only `localhost` or `*` as the host `[E]`).

**What it does not stop.**
1. **T2b.** A setsid helper keeps running after the run. It stays confined, but it uses CPU during later measurement arms, keeps any
   allowed engine port, and nothing on macOS lists "every process of this sandbox" for a kill `[E]`.
2. **L1 and reads.** `(allow default)` allows reading every file sam can read: the oracle copy, the evaluator's store with earlier
   expected answers, the run key (R27 2.5), Sam's mail and keys. A deny-reads-by-default profile is possible but large and brittle across
   macOS updates `[E]`.
3. **N3.** No memory, CPU or process-count limit beyond per-user ulimits.
4. **Hard-link write-through.** If pnpm falls back from clonefile to hard links, a write to `node_modules/...` inside the writable
   checkout changes the shared store inode; SBPL rules are path rules and allow it `[E]`.
5. **Availability.** `sandbox_apply: Operation not permitted`, exit 71, under a managed (sandboxed) launcher `[V]`; claim.mjs then runs with
   "detection only" (`claim.mjs:1521-1522` `[S]`). `sandbox-exec` is marked deprecated in its man page and its profile language is
   undocumented `[E]`.

**Cost.** Milliseconds per child. **Breaks.** Nothing in the build; engine access needs the port allowance.

**Use.** Keep it for the evaluator's own oracle children (trusted code, `writable: []`), and make "no effective sandbox" a reason that
keeps a run DIAGNOSTIC when no containment is in force, instead of a silent fallback.

### 2.3 (c) A separate macOS user

**Would stop.** File writes by POSIX permissions (if the repository and home are not group or world writable), T2b by
`pkill -KILL -u <user>` in a loop until none remain. **Would not stop.** Network (no pf rules without sudo), reads of world-readable
files, resources. **Needs.** `sysadminctl`/`dscl` and a way to run as that user (sudo, a launchd job): admin rights the agent does not have.
**Rejected** for this host; listed as the macOS-native alternative if Sam ever provisions one.

### 2.4 (d) Other credible options

| Option | What it adds | Why not now |
| --- | --- | --- |
| Apple `container` CLI (one lightweight VM per container, macOS 26 on Apple silicon; this Mac runs Darwin 25) `[E]` | a VM boundary per candidate and memory outside the 12 GiB colima budget | needs an installed, signed package (admin); its VMs reach colima's engines only through the Mac's forwarded ports; a second container runtime to pin and maintain |
| A second colima VM for candidates | a kernel boundary between candidates and engines | the brief allows one VM; engine traffic would cross two port forwarders, changing every latency |
| gVisor (`runsc`) as a Docker runtime in triplex2 | a user-space kernel between candidate and VM kernel (narrows R1 in section 8) | a VM-level install by the orchestrator; syscall-heavy builds slow down and network goes through gVisor's netstack, so it must never be used for measurement arms. A later option for build containers only |
| `userns-remap` in the VM's dockerd | container uid 0 is not VM uid 0 | the box already runs as uid 10001 with no capabilities; small gain for a daemon restart |
| Rootless Docker | no root daemon | colima runs a rootful daemon; changing it touches every lane |

## 3. Route-by-option table

P = prevented (the target is absent or the action is denied), K = killed with a kernel guarantee, D = detected after the fact (claim.mjs
388209d checks, which G03 keeps), X = not stopped, n/a = not an isolation route.

| Route | Today (388209d, fallback) | (b) sandbox-exec | (c) separate user | (a) containers (this design) | Notes for (a) |
| --- | --- | --- | --- | --- | --- |
| T1 SUT edits oracle copy | D | P | P | **P** | oracles run on the Mac; nothing of them in the box |
| T2a double fork | K (group) | K (group) | K (uid) | **K** | PID namespace |
| T2b setsid | **X** | **X** (survives, confined) | K (uid loop) | **K** | PID namespace and cgroup; proof by cgroup removal |
| T3 build rewrites evaluator | D (Q75a; in-run restore X) | P | P | **P** | evaluator not mounted |
| T4 symlink to oracle copy | D | P | P | **P** | the link target does not exist in the namespace |
| T5 git replace on authority | P (Q75b) | P | P | **P** | no `.git` in the box |
| T6 shared HOME | P (Q75f) | P | P | **P** | HOME is per-container tmpfs |
| T7 delete evidence | D (Q75i) | P | P | **P** | store not mounted |
| T8 git replace on A0 source | P | P | P | **P** | |
| F1 evaluator poisoned for later runs | D | P | P | **P** | |
| F2 lazy oracle read | P (Q75b) | P | P | **P** | |
| F3 toolchain identity | D (host tools recorded) | D | D | **P** | the image id is the toolchain |
| F4 one HOME | P | P | P | **P** | |
| F7 evidence deletion | D | P | P | **P** | |
| F9 evidence dir unreadable | D | P | P | **P** | |
| F10 outside links walked | P (Q75e) | P | P | **P** | the walker runs in a container; links resolve inside it |
| F5, F6, F8 | n/a | n/a | n/a | n/a | comparator and promotion fixes, E01 |
| L1 oracle laundering | **X** | **X** (reads allowed) | X (world-readable repo) | **P** | only build inputs enter; no python3 in the image (residual L1b, section 8) |
| N1 Mac loopback and internet | X | P (with a one-port allowance) | X | **P** | internal network, no gateway address; preflight probe |
| N2 other arm, residents | X | P (port allowance) | X | **P** | one network per arm; the relay has one upstream |
| N3 resources | X | X | partial | **P** (memory, pids, CPU; disk partial) | no per-volume disk quota (section 8, R7) |
| N4 engine as pivot | X | X | X | **X without H2, P with H2** | VM egress rule for engine containers |
| D1 development runs | X | X | X | **X** (outside the run) | shrunk by the evaluator clone (4.8) |
| D2 Docker socket holders | X | X | X | **X** (outside the run) | shrunk by H1 (narrow colima mounts) |
| D3 authority ref moved | X | X | X | **P** with 4.8 (commit ids passed explicitly) | |

## 4. The design for EXP-G03

### 4.1 Topology

```
 macOS host (user sam)                                   triplex2 VM (colima vz, 6 CPU, 12 GiB, cgroup v2)
 +-----------------------------------------+            +-----------------------------------------------------------------------+
 | evaluator clone (outside agents' roots) |  Docker    |  default bridge (engines, observers, relays' upstream side)          |
 |  claim.mjs qualify --authority <sha>    |  API over  |   tx2-xtdb-s1 ---- tx2-obs-s1 (R27: netns+pid of s1, /sys/fs/cgroup ro)|
 |   - prepareTrusted (git, Q75b)          |  the unix  |   tx2-xtdb-s2 ---- tx2-obs-s2                                          |
 |   - oracles: python children under      |  socket    |        ^ upstream (one ip:port each)                                  |
 |     sandbox-exec, on the Mac            |  only      |   tx2-relay-<run>-cand      tx2-relay-<run>-a0   (trusted, obs image) |
 |   - comparators, evidence store         |----------->|        | arm side                 | arm side                            |
 |   - tar in, stdout and walker JSON out  |            |  +-----+--------------------+  +--+-------------------------+        |
 |  no candidate process ever runs here    |            |  | tx2-run-<run>-cand       |  | tx2-run-<run>-a0         |        |
 +-----------------------------------------+            |  | --internal, no gateway   |  | --internal, no gateway   |        |
                                                        |  |  tx2-case-<run>-<n>  ro  |  |  tx2-case-<run>-<m>  ro  |        |
     (no bind mount of any Mac path into a              |  |  [lane D: tx2-dgw-<run>] |  |  [lane D: tx2-dgw-...]   |        |
      candidate container)                              |  +--------------------------+  +--------------------------+        |
                                                        |   tx2-build-<run>-<n>  --network none  (then removed)                |
                                                        |   tx2-walk-<run>-<n>   --network none, instance volume ro (trusted)  |
                                                        |   volumes: tx2-inst-<run>-<n> (rw at build, ro after), tx2-in-<run>  |
                                                        |            (case inputs, ro), tx2-pnpm-linux-<lock12> (ro)            |
                                                        +-----------------------------------------------------------------------+
```

### 4.2 Pieces and who owns them

| Piece | Trusted? | Image | Started by | Lifetime |
| --- | --- | --- | --- | --- |
| `tx2-box` image | yes | local build `FROM node:22.23.2-bookworm-slim@sha256:<pin>` (the Mac's node is v22.23.2 `[S]`), corepack-prepared `pnpm@10.11.0` (`package.json` `packageManager` `[S]`), user 10001, no python3, no compilers | orchestrator tooling (once) | pinned by image id in `slots.json` `box.imageId` with `buildInputsSha256`, as lane D does (R29 2.2) |
| `tx2-obs` image | yes | R27's pinned observer image (Python stdlib, psql) | orchestrator tooling | shared with R27 |
| Linux pnpm store `tx2-pnpm-linux-<lock12>` | yes | filled by `pnpm fetch` in `tx2-box` on a separate egress-allowed network, from the **authority's** lockfile | orchestrator tooling, never claim code | per authority lockfile; listing hash recorded |
| Instance volume `tx2-inst-<run>-<n>` | candidate-written during build only | n/a | evaluator | one run |
| Build container | candidate | `tx2-box` | evaluator | one build |
| Walker container | yes (evaluator script on stdin, trusted image, volume ro) | `tx2-box` | evaluator | one listing |
| Case runner | candidate | `tx2-box` | evaluator | one instance in one run |
| Arm network + relay | yes | `tx2-obs` | engine.mjs (new `arm up/down`) | one run |
| Lane D candidate gateway | candidate | `tx2-datomic` (trusted jars and JRE) with the instance's gateway source mounted read-only | evaluator | one instance |

The A0 control is built and run exactly like the candidate, in its own instance volume, runner and arm network: the two arms must have
the same placement (Q67g), and A0's commit is code that was never isolated either, so it gets no trust it has not earned.

A candidate whose lockfile needs a package the store lacks fails with BUILD-FAILED (offline). Adding a dependency is an orchestrator step
(fetch from main's lockfile after review), never something a claim triggers. That keeps the only networked install step on reviewed input.

### 4.3 What enters the box (inputs)

- **Build inputs only.** A new contract field `boxInputs` lists what is copied: every tracked file of each built package, every workspace
  `package.json` (pnpm validates the lockfile against all importers `[E]`), `pnpm-lock.yaml`, `pnpm-workspace.yaml`, the root `package.json`
  and root `tsconfig*.json`. **Never `lab/`**, `docs/`, `references/`. The evaluator writes this subset from its prepared snapshot
  (Q75b; `snapshotCommit`, `claim.mjs:1130` `[S]`) as a tar with fixed uid 10001, mode from git, mtime 0, and streams it with
  `docker cp - <seed container>:/work`. `runnerSha256` becomes the listing of this checkout after the build (Q67b, Q75e), so the identity
  still covers every executed byte. If G03 finds pnpm needs more files, the field grows; `lab/` stays out (L1).
- **Case inputs.** Copied once per run into `tx2-in-<run>` with the same `docker cp` path, named by sha256 (as `inputPath` does today,
  `claim.mjs:1242-1245` `[S]`), mounted read-only. The Mac copy stays the reference for Q81a's end check.
- **Environment.** Only an explicit `--env-file` written by the evaluator: `HOME=/tmp/home`, `TMPDIR=/tmp`, `LANG=C.UTF-8`, `TZ=UTC`,
  `SOURCE_DATE_EPOCH=0`, `CI=1`, `NODE_OPTIONS=` (empty), `npm_config_store_dir=/store`, `npm_config_offline=true`, the engine endpoint
  for the arm (`XTDB_URL=postgres://xtdb:xtdb@engine:5432/xtdb`, `QLEVER_URL=http://engine:7019`, `DATOMIC_GATEWAY_URL=http://gateway:8080`)
  and `TRIPLEX_*` integration switches. Nothing from the Mac's environment.

### 4.4 Result channel (question 2)

1. **Case answers: stdout of one `docker exec`.** The contract's run argv already prints the answer as one canonical JSON document on
   stdout (`build.json` notes on `exp/E01-claim-evaluator` `[S]`). The evaluator spawns `docker exec` with stdout and stderr going to files
   (as `childRunner` does, `claim.mjs:1011-1021` `[S]`), watches the stdout file size, and on receipt hashes the bytes into its write store
   (`writeStore`, `claim.mjs:1035` `[S]`). The channel is write-only in the sense that matters: bytes leave the namespace as the SUT writes
   them, the evaluator's copy is on the Mac, and nothing in the box can reach it afterwards.
2. **Limits (new contract fields under `boxSpec`, hashed into the identity).** `stdoutMaxBytes` 16 MiB per case `[E]` (O-REPLAY answers
   carry `state`; G03 measures the largest golden answer and sets the cap at 4x it); `stderrKeepBytes` 64 KiB (truncated, never a
   failure); `caseTimeoutMs` 120,000 (today's `runChild` default, `claim.mjs:1009` `[S]`); `buildTimeoutMs` 1,800,000 (`claim.mjs:1262`
   `[S]`). Over the cap: the evaluator stops reading, `docker rm -f` the runner, CASE-OUTPUT-TOO-LARGE. Timeout: `docker rm -f` the runner
   (killing the `docker exec` client does not kill the process in the container `[E]`), the case is FAIL, the next case gets a new runner.
3. **Build outputs and listings: a trusted walker, not the candidate.** After the build container is removed, the evaluator starts
   `tx2-walk-<run>-<n>` with the instance volume read-only and feeds it the evaluator's walker script on stdin (`node -`, script bytes
   hashed into the run record). It prints one JSON document: the lstat listing (path, kind, sha256, mode, the Q75e outside-link check
   relative to `/work`) and the bytes of every file under the declared `outputs`, base64, capped at 64 MiB. The evaluator recomputes the
   dist hashes from those bytes and writes build-manifest/2 and execution-identity/2 from them. Before trusting the walk it checks with
   `docker ps -a --filter volume=tx2-inst-<run>-<n>` that no other container mounts the volume.
4. **No archive is extracted on the Mac.** Nothing the candidate wrote becomes a file on the Mac except bytes in the content-addressed
   store, so a symlink or a `../` path in candidate output cannot reach the Mac file system (the F10 class).
5. **Measurement arms (PAIR-0).** The SUT reports nothing trusted: per-request events come from the trusted driver (HR), wire captures from
   the relay (TO) and engine evidence from the observer (EI, HO), all into R27's obs-bundle under the run key. The SUT's own timings are CR
   and are kept only for cross-checks (Q82a).

### 4.5 Engine reach (question 3)

1. **One internal network per arm:** `docker network create --driver bridge --internal -o
   com.docker.network.bridge.inhibit_ipv4=true`. `--internal` removes the default route and masquerading; without `inhibit_ipv4`, the
   bridge keeps a gateway address in the subnet and "communication with the gateway IP address (and thus appropriately configured host
   services) is possible" `[W]` (CVE-2024-29018 advisory summary). `inhibit_ipv4` leaves the bridge without that address `[W]` Docker
   bridge driver docs. Containers on the network still reach each other at layer 2. Whether dockerd accepts the two options together is
   probe P1 (section 10); if not, the fallback is a per-network iptables rule set by H2 that drops traffic from the subnet to the bridge
   address.
2. **Members:** the arm's candidate containers (case runner; lane D's candidate gateway) and the arm's relay, with network alias `engine`
   (and `gateway` for lane D's TS SUT to reach the candidate gateway). No dev resident, no other arm's relay, no observer.
3. **The relay** is R27's transport proxy (T1 pgwire, T2 HTTP) moved out of the engine's network namespace into its own container from
   the `tx2-obs` image. It sits on two networks: the arm network (listening on the engine port) and the default bridge (connecting to the
   one upstream address the evaluator read with `docker inspect` of the slot's engine). It refuses any other upstream. Because it is the only
   member that reaches anything, the SUT cannot bypass the proxy, which R27's in-netns placement could not guarantee (an engine attached to
   the arm network would also expose its port directly).
4. **Offline cases** (no engine needed) run with `--network none`. Builds always run with `--network none`.
5. **Preflight, every run (about 3 s):** the evaluator opens a canary listener on the Mac's 127.0.0.1 on a random free port (never 15442 or
   17019); a probe container on each arm network must fail to connect to `192.168.5.2:<canary>`, must fail to connect to the other arm's
   relay address and to each dev resident's container address, must fail DNS for a public name, and must connect to `engine:<port>`. Any
   other outcome: ISOLATION-NOT-IN-FORCE, the run is DIAGNOSTIC.

### 4.6 Exact flags (text, not run)

Every command is `docker -H unix:///Users/sam/.colima/triplex2/docker.sock ...` through `lib.mjs dockerArgs`. `<box>` is `tx2-box`'s
image id (`sha256:...`), `<obs>` the observer image id. Labels on everything: `--label tx2.managed-by=lab/bin/claim.mjs --label
tx2.run=<run> --label tx2.role=<role> --label tx2.arm=<cand|a0>`, so `reconcile` and teardown find them.

**Common hardening set `H` (every candidate container):**

```
--user 10001:10001 --cap-drop ALL --security-opt no-new-privileges=true
--read-only --tmpfs /tmp:rw,nosuid,nodev,size=1g,mode=1777
--ipc private --ulimit core=0 --ulimit nofile=8192:8192 --oom-score-adj 500
--hostname tx2-box --restart no --stop-timeout 1
--log-driver json-file --log-opt max-size=1m --log-opt max-file=1
--env-file <run>/box.env
```

(No `--pid` flag: the default private PID namespace is required, and the evaluator refuses a container whose `docker inspect` shows
`HostConfig.PidMode`, `NetworkMode` (other than `none` or the arm network), `Privileged`, `CapAdd`, `Devices` or a `Binds` entry other
than those it asked for. `--oom-score-adj 500` makes a candidate the VM OOM killer's first choice,
ahead of engines and residents `[E]`. No `--privileged`, no `--device`, no `-v` of any Mac path, no Docker socket.)

**Networks and relay (engine.mjs `arm up`):**

```
docker network create --driver bridge --internal -o com.docker.network.bridge.inhibit_ipv4=true \
  --label tx2.managed-by=lab/bin/engine.mjs --label tx2.run=<run> --label tx2.arm=cand tx2-run-<run>-cand
docker run -d --name tx2-relay-<run>-cand --network bridge --user 10002:10002 --cap-drop ALL --security-opt no-new-privileges=true \
  --read-only --tmpfs /tmp:size=16m --memory 64m --memory-swap 64m --cpus 0.25 --pids-limit 64 --restart no \
  -v tx2-obs-<run>:/obs -v <run-key volume>:/key:ro <labels> <obs> \
  python3 -I /opt/obs/relay.py --listen 0.0.0.0:5432 --upstream <slot engine ip>:5432 --protocol pgwire --bundle /obs/<run>
docker network connect --alias engine tx2-run-<run>-cand tx2-relay-<run>-cand
```

**Instance volume and inputs (evaluator):**

```
docker volume create --label tx2.run=<run> tx2-inst-<run>-<n>
docker create --name tx2-seed-<run>-<n> --network none -v tx2-inst-<run>-<n>:/work <box> true
docker cp - tx2-seed-<run>-<n>:/work  < <evaluator-written boxInputs tar>
docker rm tx2-seed-<run>-<n>
# the same three steps fill tx2-in-<run> with the case inputs named by sha256
```

**Build (candidate):**

```
docker run --name tx2-build-<run>-<n> --network none H \
  --tmpfs /tmp/home:rw,nosuid,nodev,size=256m \
  --memory 2g --memory-swap 2g --cpus 2 --cpuset-cpus <build cpus> --pids-limit 1024 \
  -v tx2-inst-<run>-<n>:/work:rw -v tx2-pnpm-linux-<lock12>:/store:ro -w /work <labels> <box> \
  sh -c 'pnpm install --offline --frozen-lockfile --store-dir /store --config.package-import-method=copy \
           --filter "@triplex-build/triplex-qualification..." --filter "@triplex-build/triplex-xtdb..." --filter "@triplex-build/triplex-qlever..." \
         && pnpm --filter @triplex-build/triplex build && pnpm --filter @triplex-build/triplex-testkit build \
         && pnpm --filter @triplex-build/triplex-xtdb build && pnpm --filter @triplex-build/triplex-qlever build \
         && pnpm --filter @triplex-build/triplex-qualification build'
docker wait tx2-build-<run>-<n>      # the evaluator runs docker kill at buildTimeoutMs
docker logs --tail 200 tx2-build-<run>-<n>   # stderr tail for BUILD-FAILED only
docker rm -f tx2-build-<run>-<n>
```

(The argv is E01's proposal, `lab/config/build.json` on `exp/E01-claim-evaluator` `[S]`, with the store path, the copy method and the
filters changed; it becomes the contract's `buildSpec` in the version G03 pins, which changes `buildSpecSha256`. `--pids-limit` counts
threads in cgroup v2 `[E]`, and node, tsc and pnpm workers each run about ten threads, hence 1024.)

**Walker (trusted):**

```
docker run --rm -i --name tx2-walk-<run>-<n> --network none H --memory 512m --memory-swap 512m --cpus 1 --pids-limit 64 \
  -v tx2-inst-<run>-<n>:/work:ro -w / <labels> <box> node --input-type=module - < <evaluator's box-walk.mjs> > <run>/walk-<n>.json
# cwd is /, the script imports only node: builtins and reads /work with lstat, so no candidate file is ever loaded as code
```

**Case runner (candidate), one per instance and arm:**

```
docker run -d --init --name tx2-case-<run>-<n> --network tx2-run-<run>-cand   (or --network none for offline cases) H \
  --tmpfs /tmp/home:rw,nosuid,nodev,size=64m \
  --memory 768m --memory-swap 768m --cpus 1 --cpuset-cpus <arm SUT cpu> --pids-limit 256 \
  -v tx2-inst-<run>-<n>:/work:ro -v tx2-in-<run>:/in:ro -w /work <labels> <box> sleep infinity
# per case:
docker exec -w /work tx2-case-<run>-<n> node packages/qualification/workloads/obl-case.ts --case /in/<sha256>.json --mode <mode>
docker top tx2-case-<run>-<n> -o pid,comm     # must list exactly docker-init and sleep (pids recorded at start)
# end of instance:
docker rm -f tx2-case-<run>-<n>
```

(`--init` puts Docker's tini at PID 1 with `sleep` under it; every exec'd process is a child of the namespace and listed by `docker top`,
which reads the container's cgroup and cannot be hidden from by renaming or setsid `[E]`. If the candidate kills PID 1, the container ends
and every later exec fails: the run fails closed, nothing escapes.)

**Teardown (evaluator, always, in a `finally`):**

```
docker rm -f $(docker ps -aq --filter label=tx2.run=<run> --filter label=tx2.role=case) ... build ... walk ... dgw
docker network rm tx2-run-<run>-cand tx2-run-<run>-a0     # fails while any endpoint remains: a second proof
docker volume rm tx2-inst-<run>-<n> ... tx2-in-<run>        # after the walker's listing is in the store
engine.mjs arm down --run <run>                             # relays; the obs volume is sealed and kept (R27)
```

### 4.7 Killing (question 4)

1. **Why nothing survives.** setsid makes a new session and process group; double fork reparents the grandchild to the namespace's init.
   Neither leaves the PID namespace or the cgroup, and leaving needs `setns`/`unshare` (CAP_SYS_ADMIN and seccomp) or a write to another
   cgroup's `cgroup.procs` (the container's cgroupfs is its own namespace and read-only under `--read-only` `[E]`). When the namespace's
   init dies, "the kernel terminates all of the processes in the namespace via a SIGKILL signal" and a later fork into it fails with ENOMEM;
   membership "cannot be changed thereafter" `[W]` (pid_namespaces(7)).
2. **What the evaluator checks.** (a) per case: `docker top` shows only the runner's own two processes, else CASE-SURVIVOR and the run is
   DIAGNOSTIC; (b) per container at teardown: `docker inspect` reports it absent; (c) the cgroup directory for the container id is gone,
   read by the slot's observer (R27: `--cgroupns host`, `/sys/fs/cgroup` read-only `[S]` R27 2.1), or, for a run with no slot, by a
   trusted one-shot probe (`docker run --rm --network none --cgroupns host -v /sys/fs/cgroup:/sys/fs/cgroup:ro <obs> ...`). A cgroup cannot be removed while it has
   live processes `[E]`, so absence is proof. The path depends on dockerd's cgroup driver (`/sys/fs/cgroup/system.slice/docker-<id>.scope`
   under systemd, `/sys/fs/cgroup/docker/<id>` under cgroupfs); probe P3 records which.
3. **Regression cases G03 must carry** (as fixtures, worded as checks of our own harness per PROTOCOL section 6): a build that starts a
   setsid helper writing a heartbeat; a case that double-forks and exits; a case that kills PID 1; a case that forks until `--pids-limit`;
   each must end with no cgroup and a DIAGNOSTIC or FAIL verdict as specified.

### 4.8 Evaluator side (D1 and D3)

1. **Its own clone.** The evaluator runs from a clone (not a worktree: worktrees share `.git`) at a path no agent has as a writable root,
   for example `/Users/sam/.tx2-evaluator/repo`, updated only by orchestrator tooling with `git fetch` of an explicit commit id from main
   and a check that the fetched tree id equals the one the orchestrator recorded. Its `.git` (refs, replace refs, config, the poison marker)
   is then out of every Codex builder's reach (`agent.mjs:32` makes the main `.git` writable for all of them `[S]`).
2. **Commit ids, not ref names.** `claim.mjs qualify` takes `--authority <40-hex>` and `--evaluator-commit <40-hex>`, and refuses a ref
   name (D3). Q75a's integrity check then compares the evaluator files with the blobs of that commit.
3. **Fail closed on missing containment.** A run that cannot establish the box (no socket, image id mismatch, preflight failure, a
   container inspected with a different isolation profile than the one recorded) carries ISOLATION-NOT-IN-FORCE and is DIAGNOSTIC. The
   Mac fallback (`localSut` with sandbox-exec or detection only) stays for development, always DIAGNOSTIC, as now.
4. **Detection stays.** Q75a, Q75i, Q81a and the oracle re-hash keep running; they now guard against the evaluator's own bugs and against
   D-routes, not against the candidate.

### 4.9 VM hardening the orchestrator should apply (recommended, not needed for the in-run guarantee)

- **H1, narrow the VM's mounts.** colima mounts `$HOME` writable by default `[W]`; this VM has `mounts: []` `[S]`, so it does. engine.mjs
  bind-mounts only files under `runs/engines/` (`engine.mjs:127-128`, `lib.mjs:22` `[S]`). Setting `mounts:` to that one directory, read-only, removes the
  "Docker socket or container escape equals write access to Sam's home" path (D2, R1). Cost: a VM restart by the orchestrator, and every
  engine.mjs bind mount must stay under that directory.
- **H2, no egress from tx2 containers.** A `DOCKER-USER` rule set in the VM (colima `provision:` script): accept established traffic,
  drop new connections from Docker subnets to anything outside Docker subnets, with one exception network (`tx2-egress`) for the store fetch
  and image builds. This closes N4 (QLever `SERVICE` or `LOAD` reaching the Mac's loopback or the internet) and is a second barrier for N1.
  Published ports (Mac to engine) are inbound and unaffected `[E]`; probe P2.
- **H3 (later), gVisor for build containers** (section 2.4).

### 4.10 Determinism and identity (question 5)

`execution-identity/2` replaces `/1` (`claim.mjs:1086` `[S]`) in the contract version G03 pins:

| Field | Value | Source |
| --- | --- | --- |
| `sourceTreeSha256`, `buildSpecSha256`, `lockfileSha256` | as `/1` | evaluator |
| `boxInputsSha256` | listing hash of the tar the evaluator streamed in | evaluator |
| `image` | `{id, buildInputsSha256, platform: "linux/arm64"}` | `docker image inspect`, slots.json pin |
| `toolchain` | `{node, pnpm, sh}` each `{path, sha256, version}` read by the walker inside the image | walker |
| `store` | `{volume, authorityLockfileSha256, listingSha256}` | walker over the store volume (once per store) |
| `runtime` | `{dockerServer, containerd, runc, kernel, cgroupVersion, cgroupDriver, storageDriver, seccomp: "default@<dockerServer>"}` | `docker version --format json`, `docker info`, walker's `uname -r` |
| `profileSha256` | sha256 of the canonical JSON of the hardening set H, limits, user, tmpfs sizes, read-only flags, network shape (`none` or `internal-arm`), env file bytes | evaluator, checked against `docker inspect` of each container |
| `mounts` | `[{target: "/work", kind: "volume", ro: true, listingSha256: runnerSha256}, {target: "/in", ro: true, listingSha256}, {target: "/store", ro: true, listingSha256}, {target: "/tmp", kind: "tmpfs", size}]` | evaluator |
| `runnerSha256` | listing of `/work` after the build (Q67b, Q75e) | walker |
| `configSha256` | the slot engine's effective config hash (`engine.mjs` `tx2.config-sha256` label) for engine cases; null offline | engine.mjs |

**Kept out of the identity and recorded as placement (Q67g):** run id, container and network names, cpusets, slot name, relay address,
start times. Two executions with equal identity differ only in placement.

**Determinism aids:** fixed `/work`, uid, hostname, `TZ=UTC`, `LANG=C.UTF-8`, `SOURCE_DATE_EPOCH=0`, umask from the image, no Mac
environment, an offline install from a read-only store. Q71a's install-metadata exclusions are measured on two clean container installs of
the same lockfile (G03 step 2).

## 5. Lane D (Datomic)

R29 runs the Triplex gateway, which is candidate code, in the engine container next to the transactor, with the gateway source baked into
the image (`COPY gateway/ /opt/gateway/`, `DATOMIC_EXT_CLASSPATH=/opt/gateway/src`, DA00 `Dockerfile` and `entrypoint.sh` `[S]`). For a
qualification run that placement gives candidate code the engine's data volume and the transactor's process, so G03 splits it:

1. **Transactor container (trusted):** the slot's `tx2-datomic-<slot>` started by engine.mjs in a transactor-only mode (an entrypoint
   switch), with `host`/`alt-host` set to the name the relay answers to (`transactor.properties` has `host=127.0.0.1`, `alt-host=127.0.0.1`,
   `port=4334`, `h2-port=4335` `[S]`; the peer learns the transactor address from storage `[E]`).
2. **Candidate gateway container `tx2-dgw-<run>-<n>`:** image `tx2-datomic` for the Datomic jars and JRE only, the instance volume mounted
   read-only with `DATOMIC_EXT_CLASSPATH` pointing at the instance's `packages/datomic/gateway/src`, hardening set H, `--memory 1536m`
   (gateway heap 1g, R29 2.3), on the arm network with alias `gateway`. Its relay forwards 4334 and 4335 to the transactor.
3. **The TS SUT** (case runner) reaches `gateway:8080` on the arm network, as XTDB and QLever SUTs reach `engine`.
4. **Residual (lane D only):** a peer reads dev storage through the transactor's H2 server with the storage password in its URI, and that
   password allows writes `[E]`. The candidate gateway can therefore write storage directly, bypassing the transactor. Durable-readback
   evidence on lane D is not trustworthy until storage moves to SQL with a read-only peer role (Q78a's later SQL arm) or the relay parses H2
   traffic and refuses writes. R27 already rates lane D's read-side evidence as weakest; this adds the write side. Open question 3.

## 6. Shared infrastructure with R27

| R27 piece | What this design reuses or changes |
| --- | --- |
| Observer sidecar per engine container, started by engine.mjs, never by builder code | unchanged; it also proves the kill (cgroup directory gone) |
| `tx2-obs` image, pinned | also the relay's image; one image to pin |
| T1/T2 proxy inside the observer, in the engine's netns | **moved** to the per-arm relay container; still TO (a different process and container from the SUT, R27 1.1); now the SUT's only path to the engine |
| Run key mounted read-only into the observer only | also mounted into the relay; never into any candidate container |
| Clock bridge from the Mac (uncertainty from an ssh forward, must stay under about 1 ms, R27 2.6) | SUT, relay, observer and an in-VM driver share the VM's CLOCK_MONOTONIC; the bridge is needed only for Mac-side events that carry no timing claim |
| Observer on its own core | conflicts with VM CPU budget for paired arms; open question 1 |
| Witness log written only by orchestrator tooling | unchanged; G03 adds the run's box records (image id, profile hash, teardown proofs) to it |

## 7. Overhead

| Step | Today (Mac, 388209d) | Box | Delta `[E]` |
| --- | --- | --- | --- |
| Image build `tx2-box` | n/a | once per base pin, 1 to 2 min with network | amortized |
| Linux store fetch | n/a | once per authority lockfile, 1 to 3 min with network | amortized |
| Write checkout | ~1 s, full tree (179 MiB tracked `[S]`) | tar of `boxInputs` (packages and root files, est. 20 to 40 MiB) and `docker cp` through the forwarded socket, 2 to 5 s | +1 to 4 s |
| Install | clonefile from the Mac store, 2 to 5 s | copy from a read-only volume, filtered closure (est. 200 to 500 MB), 5 to 20 s | +5 to 15 s |
| Package builds | Mac CPU | 2 VM CPUs (cpuset) | ±10 s |
| Walk and dist export | Mac walk, 3 to 10 s | walker container, 3 to 10 s plus 1 s start | +1 s |
| Containers created and removed | 0 | seed, build, walker, runner: about 0.5 s each | +2 s |
| Per case | node start | `docker exec` (4 to 6 API calls through the socket forward) and `docker top` | +0.15 to 0.3 s |
| Per run | 0 | two networks, two relays, preflight, teardown, cgroup proof | +5 s |

A claim with a candidate and an A0 instance and 200 case executions: about +1.5 to 3 minutes over today's run. If case counts grow into the
thousands, call the Docker Engine API over the unix socket from node (`http.request({socketPath})`) instead of spawning the CLI; that cuts
the per-case cost to about 30 to 60 ms `[E]` but needs the multiplexed exec stream decoder, so it is a later optimization.

**Memory and CPU per run** (pool 11 GiB, VM 6 CPUs): build 2 GiB (one at a time), runner 0.75 GiB per arm, relay 64 MiB per arm, lane D
gateway 1.5 GiB per arm. An OBL correctness run on one slot: slot 3.5 + runner 0.75 + relay 0.06 = about 4.3 GiB, plus a build at 2 GiB
before the runner starts. With the three residents at 9.25 GiB, one resident must be parked for any G03 run; a paired run (two slots, two
runners) needs all three parked.

## 8. Residual risks (the named unprotected list for EXP-G03)

| # | Risk | Why it stays | Control |
| --- | --- | --- | --- |
| R1 | A kernel or container-runtime escape gives VM root; with colima's default mount, VM root writes all of `$HOME`, the evaluator included | the box shares the VM kernel with engines | H1 narrows the blast radius to one read-only directory; H3 (gVisor) for builds later |
| R2 (D2) | Every Docker socket holder (orchestrator, planners, Codex builders through engine.mjs) is root in the VM and can tamper with a run in flight (exec into a runner, swap a relay) | the socket is shared lab infrastructure | H1; the run records every container's inspect output and refuses a profile mismatch; ACCEPTANCE 5.8's verifier re-run by a different agent (as R27 2.5) |
| R3 (D1) | Builders execute candidate code on the Mac during development with their own rights (main `.git`, `.pnpm-store`, `runs/engines`, `lab/locks`, socket, network) | G03 isolates qualification runs only | the evaluator clone and commit ids (4.8) keep that code away from the evaluator's own state; the Linux store is not the shared store |
| R4 (N4) | An engine on the default bridge can be made to fetch URLs (QLever `SERVICE`, SPARQL `LOAD` `[E]`) | engines need a normal network for published ports | H2 egress rule; probe P2 |
| R5 | Lane D: the candidate gateway holds the dev-storage password and can write storage directly | dev storage has one credential | section 5; lane D DR evidence stays refused until SQL storage with a read-only peer role |
| R6 | The relay and the observer parse candidate-controlled bytes (pgwire, HTTP); a parser bug could compromise trusted code that has bridge egress | trusted code must read the wire to produce TO evidence | stdlib-only Python, `-I`, no egress beyond the one upstream once H2 is applied; fail closed on unparseable traffic (R27 1.1) |
| R7 | Disk: the instance volume has no quota (overlay2 on ext4) `[E]`; a build can fill the VM disk shared with engines | Docker volume quotas need xfs project quotas | `buildTimeoutMs`; heavy.mjs's 5 GiB host floor and the pool's VM disk forecast count a build at its forecast; probe P6 measures a full build's volume size |
| R8 | CPU noise: box containers share the 6 VM CPUs with engines and residents | one VM | cpusets per arm; Q67g placement; residents parked for paired runs |
| R9 | L1b: a candidate that reimplements the oracle's semantics in TypeScript and never calls the engine passes correctness cases | isolation cannot tell computing from looking up | O-OBS engine evidence (Q82b: two agreeing sources that the engine executed the reads and writes) for any obligation where that matters; a contract question, not an isolation one |
| R10 | Image supply chain: the base image is trusted by digest from Docker Hub | no reproducible base | digest pin, local build with recorded inputs, `buildInputsSha256` in the identity |
| R11 | sandbox-exec, used for oracle children on the Mac, is deprecated and undocumented | Apple's tool | oracles are trusted code; its loss is a defense-in-depth loss only |
| R12 | Same-user reads on the Mac: anything running as sam can read the run key and forge an obs-bundle (R27 2.5) | one macOS user | unchanged from R27; candidates no longer run as sam on the Mac during qualification, which removes the candidate from this class |
| R13 | TOCTOU inside the evaluator between hashing and use | the evaluator is one process | only D-route actors can exploit it now, since no candidate process runs on the Mac; Q75a and Q81a end checks stay |

Corrections to the current list (Q75j, E01 round 3 limitations): "setsid can escape" and "no filesystem or network isolation" are closed
by G03 for qualification runs; L1, N4, D2 and D3 were not named and are added above.

## 9. Open questions

1. **CPU layout for paired arms (orchestrator, Q67g).** Six VM CPUs cannot give two 2-CPU slots, a dedicated observer core (R27) and a
   dedicated SUT core per arm. Two symmetric layouts: (i) slots {0,1} and {2,3}, arm SUT plus relay plus observer on {4} and {5}; (ii) slots
   {0,1} and {2,3}, SUTs on {4} and {5}, observers and relays unpinned at `--cpus 0.25` each. My pick is (i) because each arm then has a
   whole, equal envelope; it costs the observer's isolation from the SUT.
2. **Driver placement for NS and PAIR-0.** In the VM (one clock with the observer, but it competes for the arm's core) or on the Mac
   (plenty of CPU, but R27's clock bridge and the ssh port forwarder are back in the path, and the SUT then needs a listening port reached
   through the relay in the reverse direction). G03 needs a ruling before its first paired run.
3. **Lane D storage.** Accept R5 (no lane D DR evidence) until SQL storage, or add an H2-aware relay that refuses writes from peers? The
   second is more code in trusted parsing (R6).
4. **H1 and H2.** Both are VM changes only the orchestrator can make (a colima restart and a provision script). Approve them before G03's
   first qualifying run, or accept R1 and R4 on the named list for the first round.
5. **`boxInputs` scope.** Whether pnpm 10.11's frozen install accepts the workspace without the files outside packages (probe P5); `lab/`
   stays out either way.

## 10. Build plan for EXP-G03 and probes

**Probes first (one orchestrator-approved session, about an hour, one resident parked):**

| Probe | Question | Pass |
| --- | --- | --- |
| P1 | Does dockerd accept `--internal` with `inhibit_ipv4=true`; can two members talk; can a member reach the VM or 192.168.5.2 | create, members talk, both canary connects fail |
| P2 | With H2, does a QLever `SERVICE` to `192.168.5.2:<canary>` fail while published-port access from the Mac still works | as stated |
| P3 | cgroup driver and path; after `docker rm -f` of a runner holding a setsid heartbeat, the cgroup directory is gone and the heartbeat stops | as stated |
| P4 | `pnpm fetch` in `tx2-box` fills a store for the authority lockfile; `pnpm install --offline --frozen-lockfile --store-dir /store` succeeds with the store mounted read-only (pnpm may want to write store metadata `[E]`; fallback: a per-build writable copy of the store, about 20 to 40 s) | install completes, store listing unchanged |
| P5 | Filtered install plus the five builds succeed with `boxInputs` only; the dist listing equals a Mac build's dist listing apart from platform packages | as stated |
| P6 | Sizes and times: instance volume bytes, install and build seconds, `docker exec` overhead per case, peak memory of build and runner | numbers for section 7 |
| P7 | Two clean installs of one lockfile in the box: which install-metadata files differ (Q71a) | a list |

**Then G03's isolation layer (one builder round, one reviewer):**

1. `tx2-box` Dockerfile and its pin in `slots.json` (`box.image`, `box.imageId`, `box.buildInputsSha256`), built by orchestrator tooling.
2. `engine.mjs arm up|down --run <id> --arm cand|a0 --lane <l> --slot <s>`: the arm network, the relay, pool reservations, labels,
   reconcile; and `engine.mjs store --lockfile-commit <sha>` for the Linux store.
3. claim.mjs: a box executor replacing `runChild` for build and SUT (tar in, build, walker, runner, exec, survivor check, teardown, cgroup
   proof through the observer), `execution-identity/2`, `--authority`/`--evaluator-commit` as ids, ISOLATION-NOT-IN-FORCE.
4. Contract (a version after 0.3.11): `buildSpec` with container paths, `boxInputs`, `boxSpec` limits, `execution-identity/2`.
5. Regression fixtures, worded as checks of our harness: T1 to T8 rewritten for the box (each must now be prevented, not only detected),
   L1 (a SUT that tries `python3 lab/oracles/...` finds neither), N1 and N2 (connects fail), T2b and the PID 1 kill (section 4.7), output cap,
   timeout, and an inspect mismatch (a container started with an extra flag is refused).

## 11. Sources

- `[W]` colima default configuration, `embedded/defaults/colima.yaml`: "Colima default behaviour: $HOME is mounted as writable."
  https://raw.githubusercontent.com/abiosoft/colima/main/embedded/defaults/colima.yaml
- `[W]` Lima user-mode network: the host's loopback is 192.168.5.2, `host.lima.internal`, including services bound only to 127.0.0.1;
  `networkOpts.hostLoopback: false` (vz only) refuses it. https://lima-vm.io/docs/config/network/user/
- `[W]` Docker bridge driver options, `com.docker.network.bridge.inhibit_ipv4`. https://docs.docker.com/engine/network/drivers/bridge/
- `[W]` CVE-2024-29018 advisory summaries (internal networks: no default route, outgoing traffic dropped, the gateway address still
  reachable). https://scout.docker.com/v/CVE-2024-29018 and https://osv.dev/vulnerability/GHSA-mq39-4gv4-mvpx
- `[W]` Docker packet filtering and firewalls (DOCKER-USER, forwarding policy).
  https://docs.docker.com/engine/network/packet-filtering-firewalls/
- `[S]` lab sources as cited inline: `exp/E01-claim-evaluator` 388209d `lab/bin/claim.mjs`, `REPORT-round2.md`, `REPORT-round3.md`;
  `verify/E01` 9242e99 `lab/verify/E01/{VERIFY.md,VERIFY-round3.md,v-e01.test.mjs,round3/sandbox-probe.json}`; main 95cb7f1
  `lab/bin/{engine.mjs,lib.mjs,agent.mjs}`, `lab/config/slots.json`, `lab/acceptance/RULINGS.md` Q65, Q67, `RULINGS-PENDING.md` Q75 to Q83,
  `lab/research/R27-obs-evidence-sources.md` sections 0 to 2, `R29-datomic-lane-design.md` sections 0 to 2, `R10-read-only-recursion.md`
  2.7; `exp/DA00-datomic-bringup` `lab/config/datomic/{Dockerfile,entrypoint.sh,transactor.properties}`; `~/.colima/triplex2/colima.yaml`.
- `[W]` pid_namespaces(7): init termination kills the namespace; membership is fixed. https://man7.org/linux/man-pages/man7/pid_namespaces.7.html
- `[E]` statements about cgroup v2 pids counting threads, Seatbelt path resolution and SBPL
  network filters are from documentation I did not fetch in this session; probes P1 to P3 test the ones the design rests on.
