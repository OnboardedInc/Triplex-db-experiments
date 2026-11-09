# CX-VNSR-5 — EXP-NSR round 5

Verdict: **ACCEPT-OFFLINE** on `709a18f17eec40a7b6af17587a86578c2bf0af1c`.
Both round-4 findings, **R4-F1 and R4-F2, are closed for this offline macOS profile**.
No new high-severity finding was identified in this scoped review.

North star: correctness of the trusted P1–P5 evaluator launch boundary, under `lab/SCOPE.md`,
`lab/NORTH-STAR.md` and `lab/TARGETS.md`. This round reviews only the two prior findings, the grant ledger
and actual child environment. Node **24.18.0**, esbuild **0.23.1**. No implementation fixes were authored.
The exact builder commit was imported onto this reviewer branch as `5f4b0a83`; reviewed runtime bytes
remain identical to `709a18f1`.

## R4-F1 — closed: wildcard paths refused; output created exclusively; exact write grant

Locations: `lab/bench/ns-driver/launch-artifact.mjs:46`, `:49`, `:115`;
`lab/bench/ns-driver/layout-audit.mjs:15`.

The independent round-4 fixture body is replayed with its original `out*` output and sibling marker.
The launcher now throws **`NSR wildcard permission path refused` before spawning a child**, even though
the old output directory exists. The sibling marker is absent and the declared directory remains empty.
An absent `out*`, an output-parent `parent*`, and a layout-parent `layout*` are also refused before spawn;
the absent output paths are not created. This specifically exercises the original pattern-syntax defect.

Two ordinary launches use separate absent output leaves. Each is created by the launcher, receives
exactly `--allow-fs-write=<output>` with **no wildcard**, and contains only `inside` with exact expected
bytes `expected output`. In each child, writes to a sibling and a similarly prefixed `output-…-sibling-marker`
both return **`ERR_ACCESS_DENIED / FileSystemWrite` naming the actual target**. No outside marker exists.
Reading the output directory returns **`ERR_ACCESS_DENIED / FileSystemRead`**. Both populated-output
retries and a separate pre-existing empty directory return **`EEXIST` before spawn**.

The independent replay records **7 specific pre-spawn refusals and 2 successful restricted child runs**.
Evidence: `attempt-1/reviewer-refusals.json`, `reviewer-observations.json`, `wildcard/`, `envelope/`,
`output-a-result.json` and `output-b-result.json`.

## R4-F2 — closed: actual child environment equals the recorded minimal environment

Locations: `lab/bench/ns-driver/launch-artifact.mjs:89`, `:98`, `:122`, `:155`;
`lab/bench/ns-driver/layout-audit.mjs:23`.

The child fixture retains the round-4 environment/argv/CWD observation and adds real allowed/denied writes.
The reviewer parent supplies a deliberately different PATH, a sentinel, NODE_OPTIONS, NODE_PATH and a
conflicting macOS text-encoding value. No parent variable is spread into the child environment.

Both actual children report exactly these **7** environment keys, with **empty PATH**:

| Variable | Independently checked value |
| --- | --- |
| `PATH` | Empty string. |
| `NSR_BUNDLE_MANIFEST` | This launch's in-layout `manifest.json`. |
| `NSR_LAYOUT_SHA256` | This launch's external inventory SHA256. |
| `NSR_LAYOUT_ROOT` | This launch's fresh UUID layout. |
| `NSR_FRESH_OUTPUT` | This launch's exact separate output directory. |
| `NSR_DARWIN_BOOT_ID` | Actual host boot identity captured independently before launch. |
| `__CF_USER_TEXT_ENCODING` | Canonical current runtime UID, uppercase hexadecimal, with `:0x0:0x0`. |

Each complete actual `process.env` object equals **both** the on-disk layout receipt and independently
captured `spawn` options, as well as the reviewer's separately constructed expected object. The host PATH,
sentinel, NODE_OPTIONS, NODE_PATH and conflicting text-encoding value do not propagate. The macOS-added
runtime setting that defeated the builder's first attempts is now explicit, correct and recorded.

The fixture's actual argv, execArgv and CWD also equal the expected invocation. Both children report denied
child-process and worker permissions. The capture wrapper only records arguments; it does not alter
environment, flags, source, CWD or stdio. There is no tracing-library injection in this review.

## Grant ledger matches execution

Ledger: `lab/experiments/EXP-NSR/round5/PERMISSIONS.md`.
Implementation: `lab/bench/ns-driver/launch-artifact.mjs:109`, `:142`.

| Ledger entry | Actual child invocation / receipt | Reason checked |
| --- | --- | --- |
| `--permission` | Present exactly once in the complete expected execArgv. | Enable native application permission checks. This enables enforcement; it is not an extra authority grant. |
| `--allow-fs-read=<layout>` | Exactly one read flag, same layout in spawn, child and receipt. | Read the closed artifact, startup audit, manifests and declared evaluator data. |
| `--allow-fs-write=<output>` | Exactly one write flag, literal output path, same in spawn, child and receipt. | Create HR chunks and seal within the exclusively created write-only output. |

These are the only permission flags passed to the child. Both `--allow-*` flags have the matching explicit
reason in the receipt. The remaining interpreter arguments are the two inventoried `--import` modules,
audit first and guard second. The complete argv equality check would reject any unlisted permission flag;
it is not just a count or substring check. Actual parent/sibling write denial also tests grant behavior.

The ledger now explicitly distinguishes trusted Node/native runtime, external output, stdio and network
exceptions. The receipt records the executable/base, `ignore/pipe/pipe` stdio and unrestricted TCP exception;
the output is bound by its separate exact flag, environment and receipt path. This resolves round 4's
documentation question about literal whole-process closure without claiming that native runtime files
have disappeared or that Node restricts the network. These are scope statements, not new OS isolation proof.

The target's **8 envelope controls** were also rerun freshly: actual child environment/writes, output reuse,
literal output star, output-parent star, layout-parent star, changed write grant, extra environment key and
host PATH. Their expected positive bytes and specific negative errors all pass. The audit negatives return
the expected `excess filesystem write grant` or `excess runtime environment` errors.

## Evidence and limits

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VNSR-5/round5/`.
Index and checksums: `round5-review/EVIDENCE.md`, `round5-review/SHA256SUMS`.
The single fresh attempt completed all assertions normally. **19 target source/lock/document files** match
`709a18f1` before and after execution. The **683** builder evidence files also match their retained manifest;
that is preservation verification, not a fresh rerun of the builder's 16-test semantic suite.

Actual layout hashes, full receipt readback and artifact identity are checked for both independent children.
Separate config preimages were captured before each launch, and their bytes match `sourceConfigSha256`;
the subsequently changed working config is not substituted for either earlier input. Fresh layout UUIDs
differ, and both outputs were confirmed absent before the launcher created them.

Reproduction, into a new directory using pinned dependencies:

```sh
/opt/homebrew/opt/node@24/bin/node lab/bin/heavy.mjs --label CX-VNSR-5-R5-repeat --poll-ms 100 -- \
  /opt/homebrew/opt/node@24/bin/node lab/verify/NSR/round5-review/review.mjs \
  /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VNSR-5/round5/new-attempt
```

Heavy admission was used for execution and evidence hashing, with more than 5 GiB host disk free. Syntax
checks and `git diff --check` pass. Acceptance files and target implementation remain unchanged by this
review. **Changed pinned paths: none**; no old/new pin hashes need reporting or re-pinning.

No full G0, NSR/P3M semantic suite, package build/consumer check, native-open/descriptor retrace, Linux run,
G03 image/container/VM qualification, engine operation, performance result, merge into main or push.
The fixtures are offline launcher tests, without an engine slot or NS semantic acceptance claim. The Linux
environment branch was inspected but not executed. No open question remains for these two findings;
the ledger's G03/native-base/network integration obligations remain outside this review.

## PASS / verdict / receipt audit

1. **Source and summary (`round5-review/review.mjs`):** actual source/lock/document bytes match the exact
   target Git blobs before and after this attempt. The runtime/acceptance diff must be empty. The scoped
   ACCEPT-OFFLINE summary is emitted only after every content assertion and evidence hash check completes.
   Counts derive from actual observation arrays. It does not claim an engine slot or NS PASS.
2. **Refusal records (`refused`):** fresh fixture/config bytes and actual errors must match the specific
   expected refusal; captured spawn count must remain unchanged. The original wildcard case separately
   checks absent marker and empty declared output. Reuse tests use outputs actually created this attempt,
   plus a fresh deliberately precreated empty directory. No arbitrary failure is relabeled as a refusal.
3. **Child observations (`review.mjs`):** actual stdout must parse; exit 0 alone is insufficient. Complete
   environment, argv, grants/reasons, CWD and stdio match expected content and the receipt/capture. Actual
   outside-write and output-read error classes/resources, absent markers and exact inside bytes are required.
   Two fresh outputs and UUID layouts, sourceConfig preimages, artifact digests, full layout hashes and
   on-disk receipt readback bind every result to its actual source and inputs.
4. **Builder controls:** the executed control source is target-bound. Fresh fixture files, specific expected
   errors, actual child environment/receipt equality and exact output bytes are asserted by those controls;
   their eight-row result count is additionally checked. They are launcher regressions, not NS acceptance.
5. **Retention (`round5-review/retain.mjs`):** after child completion, enumerate regular durable files,
   retain reviewer sources, hash actual bytes and read every digest back. The manifest records preservation
   only. Historical builder files are checked against their original hashes without relabeling old outcomes.
6. **This verdict:** closes only the two source-bound round-4 findings on this offline Mac profile, using
   the actual fresh evidence above. It does not promote the documented runtime exceptions into verified
   whole-OS containment, Linux/G03 qualification or semantic/performance acceptance.
