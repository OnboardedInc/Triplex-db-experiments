# CX-VNSR-5 — EXP-NSR round 4

Verdict: **FIX-FIRST** on `155c1be96008f58bf0f7d8a0de7c06417555d83b`.

North star: correctness of the trusted P1–P5 evaluator boundary, under `lab/SCOPE.md`,
`lab/NORTH-STAR.md` and `lab/TARGETS.md`. Offline macOS review, Node **24.18.0**, esbuild **0.23.1**.
No implementation or contract fixes were made. The three round-3 executing file-text cases now encounter
real permission denials. The output boundary still has a reproducible path-pattern defect, and the
requested environment closure is not implemented.

## R4-F1 — Medium: a literal output directory containing `*` broadens the write grant

Location: `lab/bench/ns-driver/launch-artifact.mjs:44`, `:102`.

`config.output` is canonicalized and checked empty, but its characters are inserted unescaped into
Node's permission pattern. A valid, fresh directory named `out*` produces `--allow-fs-write=.../out*/*`.
Node treats the earlier `*` as a wildcard too, granting writes to sibling `outside/`.

Fresh reproduction: `round4-review/review.mjs` builds a single trusted fixture artifact that writes the
fixed text `outside output marker` to `wildcard/outside/marker`. Its declared output is the separate,
empty `wildcard/out*` directory. The unchanged reviewed launcher returns **exit 0**; the startup audit
passes, the marker has exactly those bytes, and `out*` stays empty. No manifest, hook, permission flag,
layout file or candidate response was altered after construction. All three retained attempts reproduce
this. See `attempt-3/wildcard-result.json`, its config, artifact, layout and external receipt.

This is a supported-layout correctness counterexample, not a claim that the stock driver evaluates RPC
data as code. The evaluator config is trusted; an ordinary legal directory name still must not enlarge
its grant. The standard stock-driver runs wrote only their expected output files.

Proposed fix: reject `*` anywhere in paths interpolated into a Node filesystem grant (including parent
components), or construct a separately owned canonical output path that cannot contain pattern syntax.
Add this exact sibling-write negative control. Validate the actual write envelope as well as the read
envelope; the current audit only probes the latter.

## R4-F2 — Medium: the child inherits the full host executable search path

Location: `lab/bench/ns-driver/launch-artifact.mjs:120`.

The launcher's otherwise explicit environment copies `process.env.PATH`. A fixture run through the
unchanged build and launch path prints its actual environment and argv. Its PATH contains host tool,
home-directory, package-manager and temporary Codex directories outside the layout. The stock-driver
spawn captures show the same requested environment. See `attempt-3/envelope-result.json` and
`attempt-3/launches.json`. This fails requested check 3 even though child-process permission remains
denied; the reproduction does not assert those named directories are readable or executable.

Proposed fix: omit PATH or set it to an evaluator-owned in-layout value; the launcher already invokes
Node by absolute path and grants no subprocess creation. Add an assertion over the child's actual
environment. Specify the necessary runtime/output/stdio exceptions explicitly: argv[0] names the trusted
Node executable outside the layout, `NSR_FRESH_OUTPUT` and the write flag name the separate output,
and fd 0 is `/dev/null`. A literal “no outside path whatsoever” condition cannot pass this design without
those evaluator-approved exceptions. This review does not change that condition or the frozen contract.

## Requested layout checks

| Check | Fresh observation |
| --- | --- |
| Opened set and inventory hashes | A stock artifact ran once unchanged and once with native `open`/`openat` tracing. All **8** layout files were actually opened and each SHA256 matched the external receipt; the receipt file list exactly matched the directory. No application-input hash mismatch or extra application-input read was observed. The literal whole-process condition needs runtime exceptions, described below. |
| Links resolve inside layout | Both stock layouts contain **8 regular files and zero links**. The builder's fresh symlink control is refused by the startup audit. No link target outside the layout was accepted. |
| Environment, argv and inherited files | **Fails as written**: actual host PATH, Node executable and separate output paths are external. Spawn explicitly uses `ignore/pipe/pipe` rather than inheriting arbitrary parent descriptors. An uninstrumented stock-process `lsof` snapshot shows fd 0 `/dev/null`, stdout/stderr sockets, Node/libuv queues, pipes, root-directory descriptors and local fixture TCP; no candidate/input regular-file descriptor was observed. These are a timed snapshot and launch-option inspection, not a trace of every descriptor from exec onward. |
| Round-3 cases | All **13** original cases rerun, with only the three formerly successful cases' expected result changed. Those three now have exact `ERR_ACCESS_DENIED`, `FileSystemRead` errors naming their actual existing candidate files, with no marker. Some older cases stop earlier at the secondary hook; the complete table below records that distinction. |
| Outputs only in output directory | Normal stock run: HMAC chunk `00000000.json` and `seal.json` only; traced successful write opens resolve to that output. **Fails for the wildcard-directory fixture** in R4-F1. Parent-created artifact/layout/receipt files are launcher preparation, not child output. stdout/stderr are explicit observation channels. |

The traced stock process records **33 open/openat calls**, including failures and directories.
`attempt-3/opened-set.json` retains every observed requested/resolved path, flags and descriptor result,
plus full SHA256 comparisons. Every readable layout file is present: `driver.mjs`, `runtime-guard.mjs`,
`layout-audit.mjs`, `manifest.json`, `metafile.json`, `config.json`, `run-key`, `inventory.json`.
Successful output opens are write-only and are excluded from the pre-run input inventory.

Two other regular files were opened by macOS/Node native runtime activity:
`/Library/Preferences/Logging/com.apple.diagnosticd.filter.plist` and `~/.CFUserTextEncoding`.
Their hashes are recorded but **they are not inventoried layout files**. The exact-process descriptor
snapshot additionally records the Homebrew Node executable and its dynamic-library mappings. Thus an
unqualified assertion that every whole-process file is in this layout is false on this Mac. `LAYOUT.md`
already treats the Node executable/base as trusted runtime dependencies; this review accepts that as a
stated scope limitation, not proof of whole-OS filesystem closure or evidence that candidate text was read.
An isolated, pinned base is still a separate G03 obligation.

Tracing uses the reviewer's `opens.c` interposer injected only into the traced child via
`DYLD_INSERT_LIBRARIES`. Driver/support bytes, permission grants and CWD remain unchanged. The injection
adds an external measurement library and is **not** presented as the exact production environment.
The separate uninstrumented run and envelope fixture use the unchanged generated launch profile.
Interposition observes these native entry points, not every dyld mapping, native OS API or possible
filesystem syscall. It supplies the actual observed opened set; it is not an exhaustive OS-wide proof.

## Round-3 outcomes, without relabeling secondary refusals

| Original case | Fresh round-4 outcome |
| --- | --- |
| `static-import` | Resolved bundler input refusal; no child launched. |
| `constructor` | Secondary hook: `NSR module outside graph`. |
| `constructor-readable-file` | Secondary hook: `NSR module outside graph`. |
| `createRequire-alias` | Secondary hook: `NSR module outside graph`. |
| `destructured-worker` | Permission denial: `ERR_ACCESS_DENIED`, `WorkerThreads`. |
| `computed-data-import` | Secondary hook: `NSR module outside graph`. |
| `vm-module-availability` | Diagnostic exit 0: `Module` and `SourceTextModule` both `undefined`. No module constructed. |
| `vm-file-text-denied` | Permission denial: `ERR_ACCESS_DENIED`, `FileSystemRead`. |
| `vm-file-text-readable` | Permission denial: `ERR_ACCESS_DENIED`, `FileSystemRead` naming candidate; no execution. |
| `process-dlopen` | Native loading disabled: `ERR_DLOPEN_DISABLED`. |
| `child-node` | Permission denial: `ERR_ACCESS_DENIED`, `ChildProcess`. |
| `replace-hook-file-module` | Permission denial: `ERR_ACCESS_DENIED`, `FileSystemRead` naming candidate; no execution. |
| `replace-hook-data-module` | Permission denial: `ERR_ACCESS_DENIED`, `FileSystemRead` naming candidate; no execution. |

Full exits, stderr, config, original candidate files and built artifacts are retained in
`attempt-3/round3-cases/`. This closes the three specific round-3 readable-file counterexamples offline.
It does not turn the other cases into permission-model denials when they did not reach that check.
The fresh nine builder filesystem controls also all return their expected refusals, with their intact
layout baseline executing normally.

## Evidence, reproducibility and limits

Durable raw root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VNSR-5/round4/`.
Index and checksums: `round4-review/EVIDENCE.md`, `round4-review/SHA256SUMS`.
Attempt 1 established the counterexample and traced opened set; attempt 2 added direct child-envelope
and uninstrumented descriptor observations; attempt 3 retains exact reviewer-source preimages and checks
the acceptance diff before writing its summary. All completed normally; earlier observations remain
retained. No failed attempt is changed to a success.

Reproduce into a **new** evidence directory with Node 24, the pinned dependency installation and clang:

```sh
/opt/homebrew/opt/node@24/bin/node lab/bin/heavy.mjs --label CX-VNSR-5-repeat --poll-ms 100 -- \
  /opt/homebrew/opt/node@24/bin/node lab/verify/NSR/round4-review/review.mjs \
  /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VNSR-5/round4/new-attempt
```

The helper finishes successfully only when its assertions observe the known output-boundary defect;
its exit 0 means reproduction completed, **not acceptance**. Boot-identity sysctl and localhost fixtures
need the same host capabilities as the reviewed launcher. Heavy admission was used, with more than 5 GiB
host disk free. No engine or Docker lifecycle, network research, provider or real engine was used.

17 target source/lock files match `155c1be9` before and after execution. All **785** builder evidence files
match the builder's retained SHA256SUMS; those results remain historical. Both fresh stock runs emit
`DIAGNOSTIC`, and their actual HR chunk sequence, binding, HMAC bytes and seal are independently verified.
The stock artifact SHA256 is `cb897c06d59e8c90a37cb0486f258e87d5be85f1fd572a3bea8089b2b59c6217`.
No source/contract differences from the target were introduced. **Changed pinned paths: none**;
there are no old/new pinned hashes to re-pin. Added files are reviewer tools, report and evidence index only.

Syntax checks and `git diff --check` pass. No full G0, NSR/P3M semantic regression suite, package build,
Linux/container/VM run, actual G03 image, storage lifetime guarantee, performance result, merge or push
is claimed. Review remains bounded to this offline layout task.

## PASS / verdict / receipt audit

1. **Source checks and summary (`review.mjs`):** compares current bytes with `git show 155c1be9:<path>`
   before and after this invocation; captures Node and actual esbuild versions. A real empty target diff
   is required for `acceptanceChanged:false`. The summary counts actual retained prior-case and builder
   control rows. No engine slot exists: config explicitly binds `offline-no-slot`.
2. **Original-case adaptation (`round3-cases.mjs`):** generates fresh real files, validates each built
   artifact digest against its manifest, and compares actual exit/error/marker observations with the
   case's expected content. The three changed expectations require exact permission class and candidate
   pathname, not merely nonzero exit. Final executed source preimages and all fixtures are retained.
3. **Builder-control assertions:** source bytes equal the reviewed target; fixtures and layouts are freshly
   constructed in this attempt. Exact permission or inventory errors, absence of candidate execution,
   baseline completion and actual receipt hashes are checked. No NS semantic PASS is emitted.
4. **Stock layout and HR assertions (`review.mjs`):** fresh UUID layout, fresh empty output and run ID;
   verifies actual complete layout names and hashes against this launch's external receipt, then actual
   chunk binding, sequence, prior HMAC, HMAC recomputation and final seal. Native trace must be active,
   cover all eight layout files and show expected writes. Runtime exceptions are recorded explicitly.
5. **Counterexample/envelope observations (`review.mjs`):** fresh fixture artifacts use the unchanged
   launcher; envelope bytes come from the child itself. The wildcard result requires exact marker content
   outside the declared output, successful audit/exit, and an actually empty declared directory. It is a
   failure of the claimed property, not a new PASS. Spawn options, actual artifact identity and receipt
   bind each result to this attempt. `lsof` status/output are retained as snapshots, without upgrading
   them to proof of every inherited descriptor.
6. **Native tracer (`opens.c`):** reports requested paths, actual opened-descriptor paths and flags from
   real open/openat calls. It emits observations only. Hash comparison and scope classification happen
   in the reviewer; no native log line itself constitutes a verdict or receipt.
7. **Retention (`retain.mjs`) and this verdict:** after review children finish, enumerate only regular
   retained files, hash actual bytes, copy the manifest and read every digest back. Executed reviewer
   sources are retained. The manifest asserts preservation; findings rely on the fresh content checks
   above. The FIX-FIRST verdict does not certify NS outcomes, arbitrary native-code containment or G03.

Open question for the evaluator owner: define explicit Node/base, separate-output and stdio exceptions
for the literal checks 1 and 3. The two implementation findings can be fixed without changing acceptance
files or treating Node's secondary module hook as the primary boundary.
