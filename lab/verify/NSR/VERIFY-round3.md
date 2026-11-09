# CX-VNSR — EXP-NSR round 3

Verdict: **FIX-FIRST** on `46b3f361d5f0aefe51f0f28af030ba8e56b18a53`.
**F3's startup defects are fixed. F2 remains open** for runtime evaluation and replacement of the module hook.
This report stays within F2/F3; no additional findings are raised.

North star: trustworthy P1–P5 evaluator execution and storage admission, under `lab/SCOPE.md`,
`lab/NORTH-STAR.md`, `lab/TARGETS.md`. Offline review only. Candidate runtime and contract bytes match the
reviewed target; no implementation fixes were made.

## F2 — Medium, still open: the installed hook is replaceable; readable data can execute

Locations: `lab/bench/ns-driver/runtime-guard.mjs:24–44`,
`lab/bench/ns-driver/compile.mjs:36–38`, `lab/bench/ns-driver/launch-artifact.mjs:47–69`.

The resolved esbuild graph correctly rejects static package inputs. Ordinary constructor/aliased file loads,
worker creation and direct computed data-URL imports are refused by the generated launcher. However, the
runtime policy does not establish its claimed closed execution boundary for accepted fixture artifacts.

**A later synchronous hook can short-circuit the guard.** The accepted artifact obtains the module API with
`process.getBuiltinModule('module')` and installs another `registerHooks` pair. Its resolve/load hooks return
`shortCircuit:true` for the chosen outside-graph file or data URL. The earlier guard's `check` is not called.
The fixture module executes and writes the expected local marker; the exact launcher returns exit 0.
Both reproductions have **`manifest.externals=[]` and `manifest.files={entry.mjs:…}`**. Even the builtin API
access is therefore outside the manifest's import inventory, without being refused.

The file's text is supplied through the launcher's explicitly granted data path (`config.keyFile` points to
the fixture's `packages/candidate.mjs`). The matched control gives the ordinary constructor import that same
file-read grant: it is still refused with `NSR module outside graph`. The grant alone does not explain the
successful module load; the later hook changes the outcome. No executable, support script, manifest hash,
launcher flags or permission grants are altered after build.

**VM evaluation does not traverse the module hook.** Another accepted fixture imports `node:vm` and reads that
same granted data file, then calls `vm.runInThisContext(text, {filename})`. It executes the candidate marker
code and exits 0. Its graph contains only `entry.mjs` plus the declared fs/vm builtins. The paired outside-read
control is refused with `FileSystemRead`, showing that the successful case is specifically code evaluation
through an allowed data grant. It is script execution, not an ordinary imported module intercepted by the hook.

Reproduction: `round3/reviewer-artifacts.mjs`; primary results are `artifacts-2.log` and
`artifacts-2b5d2718-fc44-41bf-a065-8148b3df7227/results.json`. The three executing cases are
`vm-file-text-readable`, `replace-hook-file-module`, and `replace-hook-data-module`. They use harmless local
marker files and actual restricted Node processes. All candidate text, config, manifests, executable bytes,
support scripts, stdout and stderr are retained.

This does **not** demonstrate a normal-RPC exploit in the stock driver: its current source does not evaluate
answers or install later hooks. The builder explicitly disclaims a general hostile-JavaScript sandbox. The
remaining F2 issue is narrower: the supported build/launch path admits these loader fixtures, so its runtime
claim that every outside-graph module is refused is false, and its test coverage misses readable-code and
hook-replacement routes. The real main artifact remains statically package-free.

Proposed fix: make source eligibility and runtime enforcement agree. Reject or safely constrain code-generation,
VM and hook-registration capabilities, including builtin access through `process.getBuiltinModule`; ensure a
later hook cannot bypass the claimed policy. Alternatively, require an explicit trusted-source eligibility
gate for these capabilities and scope the runtime claim accordingly. Add these three executing fixtures and
the matched readable-file refusal as regressions before describing F2 as closed.

## F3 — closed for stable-layout startup preflight; later-WAL limit retained

The independent round-2 fixed-device database EIO and `nobarrier` WAL cases now refuse **before calibration**.
The direct EIO and direct-WAL controls remain active. Existing database/sidecar paths are checked after
realpath against the directory's filesystem, mount ID, mount device and inode device. The calibration
descriptor is checked too. Tmpfs file mounts and same-device file mounts are refused; a real durable hard link
still admits the same inode. Builder storage controls and the adapted independent cases all pass.

The requested later-WAL case was exercised explicitly: first admit a layout with no WAL, then create a WAL
modeled on another device. A fresh call refuses it with `device or file-mount mismatch`, before any fsync.
The old result remains a snapshot whose `storagePaths` has no WAL; it performs no continuous revalidation.
`ConsumerStore` still calls this preflight only before opening SQLite. Thus this review closes the original
startup mistakes, while retaining the builder's stated limitation on later path/mount changes and race-free
new-file/SQLite descriptor handoff. It does not certify lifetime storage enforcement or a live Linux mount.

## Requested loader controls and fresh checks

| Check                                                                | Independent observation                                                                                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static package input                                                 | Rejected by the actual resolved bundler graph.                                                                                                          |
| Destructured constructor, aliased createRequire, destructured Worker | Refused at runtime. A readable-candidate constructor control is specifically refused by the module guard.                                               |
| Direct computed `data:` import                                       | Refused with outside-graph error. The later-hook data-module variant executes (F2).                                                                     |
| `vm.Module` / `SourceTextModule`                                     | Both are `undefined` in the exact Node 24.18.0 launcher profile; actual VM-module construction was not exercised. No extra experimental flag was added. |
| `vm.runInThisContext` of file text                                   | Outside read denied; granted data-file text executes (F2).                                                                                              |
| `process.dlopen`                                                     | Refused with `ERR_DLOPEN_DISABLED` before loading the fake addon. No real native addon was compiled/executed.                                           |
| Child-process spawn of Node on the candidate file                    | Refused with `ERR_ACCESS_DENIED`, permission `ChildProcess`.                                                                                            |
| Host build / source controls                                         | Fresh host JS/declarations built; **14 source tests passed**. Linux storage properties are explicitly modeled on real Mac files.                        |
| Guarded NSR/P3M regressions                                          | **14 passed, 0 failed**, including builder runtime controls, guarded parity, canonical answers and planted delays.                                      |
| Builder evidence audit                                               | **1,044 files / 16,873,104 bytes** hash-match; 21 listed sources equal the exact target; changed pinned paths: none.                                    |
| Fresh main artifact                                                  | Executable SHA256 `ae4dccc256283d8d3078016f5efaa80b8dcaaf8c1869fb84747c6705882761f0`, equal to the builder's recorded artifact.                         |

Evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VNSR/round3/`.
Retention covers 536 files / 4,485,958 bytes, all copied bytes read back; 22 target-source files were verified.
Index and manifest: `round3/EVIDENCE.md`, `round3/SHA256SUMS`. Earlier round-3 artifact controls remain retained;
the second attempt adds the matched readable-file negative control. No failed attempt is relabeled.

## PASS / verdict / receipt audit

1. **`reviewer-artifacts.mjs`:** each UUID attempt builds real fixture input bytes, checks the actual artifact
   SHA against its manifest, runs the unchanged generated launcher, and compares exit/error/marker content
   with the case's expected result. Source, config/data files and all artifact/support hashes are retained.
   Successful candidate marker execution is an F2 counterexample, not a semantic PASS. These are offline
   loader fixtures, not engine-slot or NS-run measurements.
2. **`reviewer-storage.test.ts`:** fresh files, a real hard link, explicit Linux mocks and active EIO/barrier
   negative controls test current source. The later-WAL case records both the earlier snapshot and fresh
   refusal, never treating the old observation as proof about the new layout. Fixtures are retired only after
   their observations are recorded. No modeled admission is promoted to real Linux durability.
3. **`reviewer-checks.mjs`:** retains actual exits/stdout/stderr for the host build, source controls and the
   guarded regression suite in fresh paths. Test assertions supply content checks; exit zero alone is not NS
   semantic acceptance. Existing diagnostic P3M fixture receipts retain their original status.
4. **`reviewer-audit.mjs`:** verifies actual historical evidence bytes, matches sources to the exact target,
   checks no runtime/contract difference, enumerates pin changes, and rebuilds the main artifact in a fresh
   directory to compare executable hashes. Historical builder checks stay historical.
5. **Verdict and retention:** findings cite current source and fresh reproductions. The preservation manifest
   is computed from retained files with copy readback and source-change checks, binding target sources,
   executed reviewer tools and rebuilt host files. It asserts preservation only.

No candidate fixes, acceptance-contract edits, engine slots, Docker lifecycle, merge into main or push.
No actual Linux startup/mount calibration, VM qualification, full G0 or clean package-consumer run. Candidate
code was imported into this review branch from the exact target for execution; runtime bytes remain unchanged.
