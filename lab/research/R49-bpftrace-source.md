# R49: where the sync-witness bpftrace comes from

Planner: R49 (Opus 5.5, high). Date: 2026-11-09. Repository: /Users/sam/projects/triplex-db-2. Read-only on code; this file is the only
file written. Nothing was downloaded, pulled or installed; no Docker, colima, slot or engine command was run. Sources are web pages and
registry or GitHub metadata APIs (JSON listings, no artifacts).

Evidence labels, as in R48: `[S]` read in a lab source (file and line), `[W]` read on a cited web page, `[E]` inference or external
knowledge not yet checked in this VM. Every `[E]` that matters is a W0 item in section 7.

## 1. Answer

1. **Recommended: build one local image from the Ubuntu noble archive.** Base `ubuntu:24.04` pinned to its arm64 manifest digest, plus
   `bpftrace=0.20.2-1ubuntu4.3` from noble-updates (main) with its LLVM 18 libraries pinned to exact versions. Every byte is signed
   through the Ubuntu archive key chain, the same root of trust as the VM's own kernel. Download is about 29 MB (base) plus about 61 MB
   of `.deb` files. Pin = base digest + exact package versions + the `.deb` SHA256 values in section 5, then the resulting local image ID
   is what `--bpftrace-image` receives.
2. **Version 0.20.2 supports every construct the program uses on kernel 6.8** (table in section 3), with one required program change.
3. **Required change, found in this research: `nsecs` is CLOCK_BOOTTIME, not CLOCK_MONOTONIC.** Since bpftrace 0.12.0 the bare `nsecs`
   builtin reads `ktime_get_boot_ns`; the 0.20.2 reference guide says `nsecs()` "Defaults to `boot`". The program header, R48 and the
   normalizer (`vm_normalizer.py:31-32`, primitive `CLOCK_MONOTONIC`) all assume monotonic. Every `nsecs` in `vm_syncwitness.bt` must
   become `nsecs(monotonic)` (available since 0.19.0). The two clocks differ only by time the guest kernel spent suspended, so the
   error is usually zero, but it is a wrong clock, and W0's D<ack bracket only catches it if the offset is nonzero during the window.
4. **Rejected sources:** the upstream AppImage cannot run under the witness profile (it needs FUSE plus a user namespace; Docker's
   default seccomp denies `unshare` without `CAP_SYS_ADMIN`, and capabilities inside a new user namespace do not count for `bpf()`);
   the quay.io images are stale since 2023-11-15 and are not multi-arch; there is no current official upstream container image.

## 2. Facts the choice rests on

| Fact | Source |
| --- | --- |
| VM is aarch64 under Virtualization.framework | `~/.colima/triplex2/colima.yaml`: `arch: aarch64`, `vmType: vz` `[S]`; lab images are built `--platform linux/arm64` (`lab/bin/engine.mjs:133`) `[S]` |
| Kernel 6.8.0-117-generic, BTF present, BPF syscall, JIT, kprobes, ftrace syscalls on | given in the task (checked on the VM by the caller) |
| Witness runs as a container with `--entrypoint bpftrace`, `--cap-drop ALL --cap-add BPF --cap-add PERFMON`, read-only root, `--network none`, `no-new-privileges`, 256 MiB memory, `--pids-limit 64`, `/tmp` tmpfs 128 MiB, binds `/sys/kernel/btf` and `/sys/kernel/tracing` read-only, default seccomp | `.claude/worktrees/obs01/lab/bin/sync-witness.mjs:24-56`, `vm-observer.mjs:18` `[S]` |
| The image must be referenced by digest or local image ID (`@sha256:` or `sha256:`), runs as root inside the container, and is never pulled by the probe | `sync-witness.mjs:45-46,251-255`, `vm-observer.mjs:17` `[S]` |
| The witness sets `BPFTRACE_PERF_RB_PAGES=1024` | `sync-witness.mjs:54` `[S]` |

## 3. Features the program uses and the minimum bpftrace version

Program: `.claude/worktrees/obs01/lab/observer/vm_syncwitness.bt`.

| Feature in the program | Minimum version | Evidence |
| --- | --- | --- |
| `fentry:` / `fexit:` probe names | 0.20.0 (aliases of `kfunc` / `kretfunc`, PR #2844) | CHANGELOG `[W]` |
| Module-qualified form `fexit:vmlinux:fn` | documented as `fentry[:mod]:fn` in the 0.20.2 man page; `vmlinux` is the module name bpftrace prints for built-in functions `[E]` | man/adoc 0.20.2 `[W]`; W0 runs `bpftrace -l` per probe (`sync-witness.mjs:211`) |
| `args->field` on fentry/fexit and tracepoints | 0.19.0 made `args` a struct; `args->` kept "for backwards compatibility" (PR #2578). Canonical form is `args.field` | PR #2578 `[W]` |
| `retval` in `fexit` | kretfunc era; "Fix retval for kretfunc/fexit" landed in 0.20.0 (PR #2864) | CHANGELOG `[W]` |
| Function args readable in `fexit` (`args->iocb`, `args->sb`, `args->wait`) | documented for kretfunc in 0.20.2 | man/adoc 0.20.2 `[W]` |
| `tracepoint:ext4:*` and `tracepoint:syscalls:*` with `args->` fields | early (0.9.x) | reference guide `[W]` |
| `cgroup` builtin (`bpf_get_current_cgroup_id`, cgroup v2 only) | 0.9.x | 0.20.2 man: "ID of the cgroup the current task is in. Only works with cgroupv2." `[W]` |
| `nsecs` as CLOCK_MONOTONIC | **not provided by bare `nsecs`** (boot clock since 0.12.0, PR #1475). `nsecs(monotonic)` since 0.19.0 (PR #2718) | CHANGELOG and 0.20.2 reference guide `[W]` |
| `cpu`, `tid` builtins; per-CPU sequence `@n[cpu]++` | early; `++` on a map value is supported (atomic-add alignment fix in 0.21.0, PR #3045, does not affect correctness of the count on 0.20 `[E]`) | CHANGELOG `[W]` |
| Multi-key maps `@dir[a, b]`, `delete(@m[k])`, `clear(@m)` | early; `delete(@m[k])` is the 0.20 form (0.22.0 moved to `delete(@m, k)` and kept the old form deprecated) | CHANGELOG, PR #3472 `[W]` |
| Positional parameters `$1..$4` cast to `uint64` | early (0.9.1 fixes) | CHANGELOG `[W]` |
| `printf` with `%llu`, `%lld`, `%d` | early; no strict format-type change before 0.26 (sign mismatch became a warning there) | CHANGELOG `[W]` |
| `-o FILE`, `-q` | `-o` since 0.9.1 | CHANGELOG `[W]` |
| Output through BPF ring buffer with a loss counter and "Lost N events" | 0.18.0 (PR #2475); 0.20.2 creates the ringbuf from config `perf_rb_pages` and reports loss through `RingbufLossCounter` | PR #2475, `src/required_resources.cpp` and `src/bpftrace.cpp` at v0.20.2 `[W]` |
| `BPFTRACE_PERF_RB_PAGES` env var (power of 2) | 0.11.0; still read by 0.20.2 `parse_env()` | CHANGELOG, `src/main.cpp` v0.20.2 `[W]` |
| Maps printed at exit (the `@n[cpu]` dump the parser checks) | default behavior in 0.20; an option to suppress it only arrived in 0.22.0 | CHANGELOG `[W]` |
| `BEGIN` / `END` | non-uprobe implementation since 0.16.0 (PR #2264), so stripped binaries are not a problem | CHANGELOG `[W]` |
| Kernel side: fentry/fexit on arm64 | needs the arm64 BPF trampoline (Linux 6.0 or later) `[E]`; 6.8 qualifies | kernel history `[E]` |

**Map size limit to note:** 0.20.2's default `BPFTRACE_MAX_MAP_KEYS` is 4096 `[W]`. `@ino` holds every inode written in a witnessed
directory and the `tid`-keyed maps hold in-flight syncs; both stay far below 4096 for a SQLite store, but a full map silently drops
inserts in this version `[E]`. If W1 or W3 plants many files, set `BPFTRACE_MAX_MAP_KEYS` explicitly.

## 4. Candidate sources compared (arm64)

| | A. Ubuntu noble archive (recommended) | B. Upstream release `bpftrace-aarch64` (AppImage) | C. quay.io/iovisor/bpftrace | D. Debian trixie package on the lab's existing `python:3.13-slim` base | E. Ubuntu 26.04 or Alpine edge package |
| --- | --- | --- | --- | --- | --- |
| Version | 0.20.2-1ubuntu4.3 (noble-updates, main, published 2025-02-10) | 0.27.1 (2026-10-24); arm64 assets exist only from 0.27.0 (2026-09-10) | last push 2023-11-15 (`latest` = commit 3e368fa2, pre-0.20, LLVM 12) | 0.23.2-1 | 26.04: 0.25.0-1ubuntu1; Alpine edge: 0.27.1-r0 |
| arm64 | yes | yes (`bpftrace-aarch64`) | no evidence: single-arch manifests, no manifest lists; base Ubuntu 20.04 | yes | yes |
| Download size | base 28,940,126 B + about 60.8 MB of `.deb` (section 5) = about 90 MB; about 61 MB if an identical base already exists in the VM | 196,142,152 B (AppImage) | 49,970,966 B (`latest`) | about 60 MB of `.deb`, no base download if the pinned python image is trixie-based `[E]` | similar to A or D |
| Installed size added | about 262 MB (libllvm18 116 MB, libclang-cpp18 64 MB, libicu74 36 MB, libclang1-18 34 MB, bpftrace 3 MB, rest under 5 MB) | squashfs payload, larger once extracted `[E]` | n/a | about 270 MB `[E]` | similar |
| Provenance | `InRelease` signed by the Ubuntu archive key; apt verifies each `.deb` SHA256 against the signed index. Package in main, so Canonical security maintenance for 24.04 | GitHub-computed asset digest only (`sha256:ad1592...5672`). Release workflow (`release.yml`, `create-assets.sh`) makes no checksum, signature or attestation; built by Nix on a GitHub `ubuntu-24.04-arm` runner with FlakeHub cache | Quay tag digests only, no signatures, unmaintained | Debian archive key chain; python image is a Docker Official Image | Ubuntu or Alpine archive keys; Alpine edge and community repo get the shortest support |
| Runs under the witness profile | yes `[E]`, see section 6 | **no**: default runtime `appimage-type2-runtime` mounts squashfs through FUSE (no `/dev/fuse`, no devices allowed) and default AppRun `userns-chroot` needs a user namespace; Docker's default seccomp allows `unshare` only with `CAP_SYS_ADMIN`; and caps inside a child user namespace do not satisfy `bpf()`'s init-namespace check. Usable only by unpacking the squashfs into a custom image with `/nix/store` at the root, which is a second build pipeline | n/a | yes `[E]` | yes `[E]` |
| Features of section 3 | all, with `nsecs(monotonic)` | all, but 0.22 to 0.27 changed `delete`, integer typing (0.25, 0.26: literals default to `int8`, no automatic promotion) and output requirements (0.24 requires ringbuf). Program must be re-validated | `nsecs(monotonic)` missing before 0.19 is uncertain in that build | all with `nsecs(monotonic)`; `delete(@m[k])` deprecated form | 0.25+ typing changes as in B |

Why A over D: D saves about 29 MB of download, but puts a full Python runtime into the one container that can read kernel memory,
ties the bpftrace version to whatever Debian release the python digest happens to use, and uses a different signing root from the VM
kernel. A has a single purpose and the same root of trust as the kernel it traces.

## 5. Exactly what would be downloaded (option A, arm64)

Base image (Docker Official Image, read 2026-11-09 from the Docker Hub API):

| Item | Value |
| --- | --- |
| `ubuntu:24.04` manifest list digest | `sha256:fe81560990fae86dc4743202b2cb4d3df98d0bcf949173cecef15ce1127ef852` (last_updated 2026-10-29) |
| arm64 v8 image digest (pin this one) | `sha256:19cad59657037cffa0ac9a48107019b768900ff1071140965827513ac866bd5e` |
| Compressed size | 28,940,126 bytes |

Packages from noble / noble-updates, component main, arm64. The first five have exact SHA256 values from packages.ubuntu.com, which
mirrors the signed `Packages` index:

| Package | Version | `.deb` file | Bytes | SHA256 |
| --- | --- | --- | --- | --- |
| bpftrace | 0.20.2-1ubuntu4.3 | `pool/main/b/bpftrace/bpftrace_0.20.2-1ubuntu4.3_arm64.deb` | 931,628 | `38525fa2d1d8764c7844d76bfaf807fef2d9242673f81532396b5d147115499a` |
| libllvm18 | 1:18.1.3-1ubuntu1 | `pool/main/l/llvm-toolchain-18/libllvm18_18.1.3-1ubuntu1_arm64.deb` | 26,341,296 | `9fdecc60d0528466bfbbc141aefd2788ab3bc5459a9ff9c9261fe067a3af3b5c` |
| libclang-cpp18 | 1:18.1.3-1ubuntu1 | `pool/main/l/llvm-toolchain-18/libclang-cpp18_18.1.3-1ubuntu1_arm64.deb` | 13,166,642 | `f04cf0e22e25fb4706b2175a7c262c20caae8259b442816207fc68a142e63627` |
| libclang1-18 | 1:18.1.3-1ubuntu1 | `pool/main/l/llvm-toolchain-18/libclang1-18_18.1.3-1ubuntu1_arm64.deb` | 7,533,024 | `11d80aca24ad71a7d659870941456b4884970d3326afe640c571299f8a7f4e8e` |
| libbpfcc | 0.29.1+ds-1ubuntu7 | `pool/main/b/bpfcc/libbpfcc_0.29.1+ds-1ubuntu7_arm64.deb` | 622,586 | `61ac559c20b968a1857b1544a64d2126052c0ac7432b2675cf535fa95de10aca` |
| libicu74 | 74.2-1ubuntu3.1 | (noble-updates) | about 10.8 MB | take from the signed index at build |
| libxml2 | 2.9.14+dfsg-1.3ubuntu3.10 | (noble-updates) | about 0.74 MB | same |
| libdw1t64, libelf1t64 | 0.190-1.1ubuntu0.1 | (noble-updates) | about 0.32 MB | same |
| libbpf1 | 1:1.3.0-2build2 | (noble) | about 0.17 MB | same |
| libedit2, libbsd0 | 3.1-20230828-1build1, 0.12.1 series | (noble) | about 0.14 MB | same |

Total `.deb` download about 60.8 MB. The closure assumes the `ubuntu:24.04` base already carries libc6, libstdc++6, libgcc-s1, zlib1g,
libzstd1, liblzma5, libbz2-1.0, libtinfo6 and libmd0 `[E]`; the build must fail if apt wants anything not in this table.

Pinning, in order:

1. `FROM ubuntu:24.04@sha256:19cad596...bd5e` with `--platform linux/arm64`, as the datomic build does.
2. Limit apt sources to component `main` (every package above is in main), which also keeps the index download to a few MB.
3. `apt-get install --no-install-recommends --download-only` with every package at its exact version
   (`bpftrace=0.20.2-1ubuntu4.3 libllvm18=1:18.1.3-1ubuntu1 libclang1-18=1:18.1.3-1ubuntu1 libclang-cpp18=1:18.1.3-1ubuntu1 libbpfcc=0.29.1+ds-1ubuntu7 ...`).
   Pinning the LLVM libraries matters: bpftrace 0.20.2-1ubuntu4.2 was pulled from noble-updates because it linked against a newer
   LLVM 18 build and failed to start (LP #2097317); LP #2081848 (LLVM 18.1.8 backport) is still open.
4. Check the cached `.deb` SHA256 values against the table above (apt already checks them against the signed index; the table check
   makes a changed index fail closed), then `dpkg -i`, delete the apt lists and cache, and run `bpftrace --version` (expect `v0.20.2`).
5. Record in the lab: base digest, the package list with versions and SHA256, `sha256sum /usr/bin/bpftrace`, and the built image ID.
   Pass the image ID (`sha256:<64 hex>`) as `--bpftrace-image`; `pinImage` and `verifyWitnessProfile` accept that form
   (`vm-observer.mjs:17`, `sync-witness.mjs:45`).

Two caveats on the apt route. Older versions drop out of the live `-updates` index when superseded, so a rebuild later may fail
(it fails closed, which is correct; the pool keeps the files). snapshot.ubuntu.com would freeze the index, but its coverage of arm64
ports could not be confirmed (the ports snapshot URL returned 401). Canonical announced on 2026-06-03 that arm64 moves from
ports.ubuntu.com to archive.ubuntu.com, backported to 24.04; the keys and file names are the same either way.

## 6. Privileges under the R48 profile (option A)

1. **Root check:** 0.20.2 refuses unless `geteuid() == 0` ("bpftrace currently only supports running as the root user.") and has no
   capability check of its own `[W]`. The witness runs as uid 0 inside its container, so this passes; the effective privilege is only
   what the bounding set allows.
2. **`bpf()` and `perf_event_open`:** Docker's default seccomp allows `bpf` with `CAP_BPF` and `perf_event_open` with `CAP_PERFMON`
   (moby `default.json`) `[W]`. fentry/fexit programs need `CAP_BPF` plus `CAP_PERFMON` in the kernel `[E]`.
3. **Memlock:** 0.20.2 tries `setrlimit(RLIMIT_MEMLOCK, infinity)` and on failure logs an error line ("couldn't set RLIMIT_MEMLOCK
   ...") but continues `[W]`. Without `CAP_SYS_RESOURCE` this will fail if the container's hard limit is finite; on kernel 6.8 BPF memory
   is charged to the memory cgroup, so loading still works `[E]`. The parser only counts "lost N events" on stderr
   (`vm_normalizer.py:296-301`), so this line does not refuse the run, but W0 should expect it.
4. **Lockdown:** 0.20.2 exits if kernel lockdown is `confidentiality` `[W]`; W0 already records `/sys/kernel/security/lockdown`.
5. **Not yet checked, add to W0:** `kernel.perf_event_paranoid` (Ubuntu sets 4; whether Ubuntu's patch accepts `CAP_PERFMON` alone for
   tracepoint perf events on 6.8 is `[E]`); peak memory of bpftrace with LLVM 18 against the 256 MiB cap (cgroup `memory.peak`),
   including the ringbuf sized by `BPFTRACE_PERF_RB_PAGES=1024`; whether `/sys/kernel/btf/ext4` is absent (if ext4 were a module the
   `vmlinux:` qualifier would not attach).

## 7. Known bugs and limits relevant to this program

| Item | Affects 0.20.2 on arm64 / 6.8? |
| --- | --- |
| Bare `nsecs` is CLOCK_BOOTTIME | yes, every version since 0.12.0; fix by `nsecs(monotonic)` (section 1 item 3) |
| 0.20.2-1ubuntu4.2 failed to load libLLVM-18 (LP #2097317) | fixed in 4.3 by rebuilding against libllvm18 1:18.1.3-1ubuntu1; SRU verification was on amd64 only, so W0 is the first arm64 proof |
| LLVM-18 "too many arguments" (LP #2060766) | fixed in 0.20.2-1ubuntu4 (cherry-picked upstream LLVM 18 fixes) |
| fentry/fexit argument decoding fix (0.27.0, PR #5272) | the bug is narrow loads of sub-8-byte args from u64 slots, shown on s390 (big-endian). On little-endian arm64 a narrow load of `int wait` reads the correct low bytes `[E]`; the pointer args are 8 bytes |
| Ubuntu 0.20.2 ADT failure on ppc64el (LP #2106125) | not arm64 |
| cgroup id | `cgroup` is `bpf_get_current_cgroup_id()`, the kernel cgroup v2 id, unaffected by the container's cgroup namespace. No bpftrace bug found for it; only `cgroup_path` had a JSON fix in 0.20.0 |
| Sequence check cannot see a program that never ran | the kernel skips a tracepoint program when another kprobe/tracepoint BPF program is active on that CPU, and skips a fentry/fexit program on recursion (counted in the program's `recursion_misses`) `[E]`. The per-CPU sequence only detects records lost after the program ran. Low risk for process-context ext4 events; W3 could read `recursion_misses` per program from the VM host |
| Interleaving of `@n[cpu]++` and the `printf` read | only possible if a fentry program is preempted on its CPU, which needs full preemption (`preempt=full`) `[E]`; the failure mode is a sequence gap or duplicate, which the parser refuses (fail-safe) |

## 8. Sources

- Ubuntu package pages: https://packages.ubuntu.com/noble/bpftrace, https://packages.ubuntu.com/noble-updates/bpftrace,
  https://packages.ubuntu.com/noble-updates/arm64/bpftrace/download, https://packages.ubuntu.com/noble-updates/libllvm18,
  https://packages.ubuntu.com/noble-updates/arm64/libllvm18/download, https://packages.ubuntu.com/noble-updates/libclang-cpp18,
  https://packages.ubuntu.com/noble-updates/arm64/libclang-cpp18/download, https://packages.ubuntu.com/noble-updates/libclang1-18,
  https://packages.ubuntu.com/noble-updates/arm64/libclang1-18/download, https://packages.ubuntu.com/noble/libbpfcc,
  https://packages.ubuntu.com/noble/arm64/libbpfcc/download, https://packages.ubuntu.com/noble-updates/libxml2,
  https://packages.ubuntu.com/noble-updates/libicu74, https://packages.ubuntu.com/noble-updates/libdw1t64,
  https://packages.ubuntu.com/noble/libbpf1, https://packages.ubuntu.com/noble/libedit2
- Launchpad: https://launchpad.net/ubuntu/+source/bpftrace, https://launchpad.net/ubuntu/+source/bpftrace/+changelog,
  https://bugs.launchpad.net/ubuntu/+source/bpftrace/+bug/2097317, https://bugs.launchpad.net/ubuntu/+source/bpftrace/+bug/2081848,
  https://bugs.launchpad.net/bugs/2060766, https://bugs.launchpad.net/ubuntu/+source/bpftrace/+bugs
- Ubuntu archive and snapshots: https://ports.ubuntu.com/ubuntu-ports/dists/noble-updates/Release, https://snapshot.ubuntu.com/,
  https://discourse.ubuntu.com/t/ubuntu-for-arm64-graviton-packages-moving-to-archive/83707
- Docker Hub: https://hub.docker.com/v2/repositories/library/ubuntu/tags/24.04
- bpftrace upstream: https://github.com/bpftrace/bpftrace/releases, https://github.com/bpftrace/bpftrace/releases/tag/v0.27.1,
  GitHub releases API `repos/bpftrace/bpftrace/releases` (asset names, sizes, digests),
  https://raw.githubusercontent.com/bpftrace/bpftrace/master/CHANGELOG.md,
  https://raw.githubusercontent.com/bpftrace/bpftrace/master/.github/workflows/release.yml,
  https://raw.githubusercontent.com/bpftrace/bpftrace/master/.github/workflows/binary.yml,
  https://raw.githubusercontent.com/bpftrace/bpftrace/master/scripts/create-assets.sh,
  https://raw.githubusercontent.com/bpftrace/bpftrace/master/flake.nix, https://github.com/ralismark/nix-appimage,
  https://raw.githubusercontent.com/bpftrace/bpftrace/v0.20.2/man/adoc/bpftrace.adoc,
  https://raw.githubusercontent.com/bpftrace/bpftrace/v0.20.2/docs/reference_guide.md,
  https://raw.githubusercontent.com/bpftrace/bpftrace/v0.20.2/src/main.cpp,
  https://raw.githubusercontent.com/bpftrace/bpftrace/v0.20.2/src/bpftrace.cpp,
  https://raw.githubusercontent.com/bpftrace/bpftrace/v0.20.2/src/required_resources.cpp,
  https://github.com/bpftrace/bpftrace/pull/2475, https://github.com/bpftrace/bpftrace/pull/2578,
  https://github.com/bpftrace/bpftrace/pull/3472, https://github.com/bpftrace/bpftrace/pull/5272
- Quay: https://quay.io/api/v1/repository/iovisor/bpftrace/tag/?limit=30&page=1&onlyActiveTags=true,
  https://quay.io/api/v1/repository/iovisor/bpftrace/manifest/sha256:ceeff3fb27b644dcec07f0da4fd725a1209a07a0b1a12079b99c80324a3568b2
- Debian and Alpine: https://packages.debian.org/trixie/bpftrace, https://pkgs.alpinelinux.org/packages?name=bpftrace&arch=aarch64
- Docker seccomp: https://raw.githubusercontent.com/moby/profiles/main/seccomp/default.json
