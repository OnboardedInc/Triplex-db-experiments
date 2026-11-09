# CX-VNSR: EXP-NSR adversarial review

Verdict: **FIX-FIRST**. Reviewed `05c26355dfc653520067bfb1006e07475187c813` on `verify/NSR`.
The candidate runtime and acceptance contract are unchanged by this review.

North star: correctness of the trusted P1–P5 measurements, especially oracle-checkable P1 read goodput and P3
durability. Goals and bars: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. Design: main-checkout R44
sections 2, 3.4–3.5, 5.1 and 8.2 B1/B7; Q100a/d/f/m in `lab/acceptance/RULINGS-PENDING.md`.

## Findings

### F1 — High: unsampled read evidence cannot be checked against an oracle answer

Location: `lab/bench/ns-driver/driver.mjs:77–78`; `lab/bench/ns-driver/rpc.mjs:118`.

`answerSha256` hashes the entire wire response, including the fresh random RPC `id`. Only loop 0 retains the
answer and wire bytes. Other loops retain neither that ID, response bytes nor a digest of the answer itself.
Identical answers at an identical driver-recorded request/basis consequently have different hashes. A later
CR-NS/O-REPLAY comparison cannot reconstruct those envelopes from the retained HR events. Arbitrary candidate
JSON formatting adds another obstacle to reconstructing the original wire bytes.

Reproduction: `probes.mjs` runs two real TCP reader loops against a deterministic fixture, first unchanged,
then with exactly one read result changed to `WRONG`. Both calls return `DIAGNOSTIC`. In the first run,
identical loop-1 answers have different hashes, and their events contain no response ID or answer bytes. In the
second run the changed loop-1 answer is likewise represented only by its envelope hash. The review fixture's
separate capture proves what was returned; that capture is absent from the driver's evidence.

Deferring semantic judgment to B5 is reasonable; discarding the information B5 needs is the defect. This is
not a claim that `DIAGNOSTIC` is an acceptance PASS. It prevents the intended by-key evaluation and makes the
requested changed-answer negative control impossible using only normal retained HR evidence.

Proposed fix: retain an evaluator-defined canonical digest of the parsed answer, separate from any raw-wire
digest, with the driver-recorded request/basis key. Retain reproducible sampled bytes according to the
declared coverage policy. Add controls proving equal answers compare equal across request IDs and changed
answers fail independent recomputation, including loops other than 0.

### F2 — Medium: import-closure check accepts runtime candidate loaders

Location: `lab/bench/ns-driver/check-imports.mjs:34–46`.

The check matches loader call spelling and allows every Node built-in. It does not follow worker entry URLs
or track aliased loader bindings. Both of these pass with a manifest containing only `entry.mjs`, then execute
the fixture's `packages/candidate.cjs` in a real Node process:

```js
import { Worker } from "node:worker_threads";
new Worker(new URL("./packages/candidate.cjs", import.meta.url));
```

```js
import { createRequire as cr } from "node:module";
const load = cr(import.meta.url);
load("./packages/candidate.cjs");
```

Reproduction: `probes.mjs` creates each fresh fixture, checks it, executes it, and verifies a harmless marker
written by the omitted candidate file. The ordinary static import, re-export, dynamic import, unaliased
require and type-only candidate-import controls are refused.

The current eight-file driver closure contains **no actual package dependency** on inspection, and its copied
bundle loads. These are false negatives in the claimed gate, not a claim that the present copied bundle
already includes candidate bytes. A future conditional loader could pass the gate while its dependency is
missing from the manifest; a source-tree execution can execute it. A package-free filesystem layout is a
separate defense and does not make this a complete import graph.

Proposed fix: reject runtime-loading capabilities the driver does not need, or resolve their bindings and
entry paths conservatively. In particular cover aliased `createRequire`, worker/fork/VM loaders and
TypeScript import-equals forms; reject unresolved loading rather than silently omitting it. Preserve these
two fixtures as regression controls.

### F3 — Medium: durability admission checks the parent, not the database target

Location: `packages/host/src/feed/DurableFlush.ts:25–26,56`; called by
`packages/host/src/feed/ConsumerStore.ts:21` and `packages/qualification/workloads/ns-sut.ts:21`.

Only `realpath(dirname(file))` is classified and calibrated. An existing database symlink in an ext4
directory can point to a tmpfs database: the directory and temporary calibration file pass, while SQLite
subsequently opens the volatile target. A database file mounted separately from its parent has the same
structural problem.

Reproduction: `durability.test.ts` creates a real database symlink and models Linux ext4/tmpfs/device probes
on this Mac. The direct tmpfs path is refused; the symlink path receives
`guest-flush-host-power-loss-unqualified`. The filesystem call log shows only the ext4 parent was inspected.
This is a modeled-Linux counterexample, **not an actual Linux/tmpfs execution**.

Proposed fix: classify and bind the actual database inode/path that will be opened, reject unsafe symlinks
and file mount crossings, and account for the SQLite sidecars. For new files, bind validation to safe file
creation/opening rather than a replaceable parent-only preflight. Add a Linux startup test for both direct
tmpfs and a durable-directory symlink into tmpfs.

## Verification and evidence

Durable review root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VNSR/`.
`EVIDENCE.md` and `SHA256SUMS` index 156 retained files (3,464,698 bytes), all copied bytes read back.
Retention also checked 31 target-source files against the reviewed commit. Committed review tools live under
`lab/verify/NSR/`. Commands use Node 24.18.0, pnpm 10.11.0 and the owned pnpm store. Heavy work uses `heavy.mjs`.

| Check                                             | Independent result                                                                                                                                                                                                                                                  | Evidence                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Present driver closure and copied bundle          | Eight files, no package dependency; copied entry loads. Bundle SHA256 `7c54495f086293f15f6f301e7d85849dc878be888ff149995af319bf847617a0`.                                                                                                                           | `probes-1.log`, retained bundle/manifest                           |
| Import gate negative controls                     | Worker and aliased-require candidate execution wrongly admitted; five direct import/loading controls refused.                                                                                                                                                       | `probes-1.log`, fixture marker files                               |
| Split/monolith parity, RPC caps and P3M negatives | Fresh **11 passed, 0 failed**. Actual candidate role processes; 256 distinct completed fixture loops; equal feed bytes and committed/lost-ACK accounting. Planted 100/249/251/400 ms cases preserved.                                                               | `offline-1.log`, `offline-1/`, `p3m-1/`                            |
| Changed candidate feed payload                    | Recomputed unchanged split feed/accounting agrees; changing one RPC feed attribute is refused with `Feed content/resolution mismatch at 0`. This validation works; F1 concerns unsampled reader-answer evidence.                                                    | `changed-feed-1.log`                                               |
| Candidate field ownership and changed read        | Candidate-supplied times/counts do not overwrite driver instants/loop IDs. One wrong loop-1 answer still completes; its unusable hash is F1.                                                                                                                        | `probes-1.log`, reviewer captures and HR chunks                    |
| Clock/refusal source checks                       | **3 passed**: original two-hostname, cross-boot/namespace and tmpfs/overlay controls; review symlink counterexample. Linux probes are mocked.                                                                                                                       | `source-tests-3.log`                                               |
| Exact declared package builds                     | Seven package builds completed, including CLI JS, declarations and executable.                                                                                                                                                                                      | `build-3.log`                                                      |
| Reported CLI tarball failure                      | **Setup for the specific missing entry**: original tarball lacks `dist/index.js`; after the declared build, offline npm archive has every required entry plus `dist/cli.js`. New tarball SHA256 `8ae3d5fcaf064042becf25de2a735a995b723d0ef65b953325784665e28ee216`. | `pack-cli-1.log`, `cli-pack-d67c3b18-2d12-4bac-8d24-a5a0101dc051/` |
| Historical full G0 claim                          | All 519 retained files and 44 CAS objects hash-match. Receipt is diagnostic, no slot, tested `c194baf7`; later target-commit differences are evidence/report files only. Its 1,220 pass / 0 fail / 71 expected skips are supported as historical builder results.   | `historical-evidence-1.log`                                        |

Parity here is the four-command seeded diagnostic fixture, including a lost ACK and an abort; it is not the
full performance workload or proof of a native live provider. The archive test isolates artifact generation;
it does not establish pnpm workspace dependency rewriting, clean consumer installation or release readiness.
The generator hash remains `201f721287b3d3f93e230dc310516369024bcba35cc9151f8c0f3ed3e7f342e4`;
the current frozen contract pin is null, so equality to a frozen contract pin is not claimed.

Initial review setup failures are retained: plain `--store-dir` was refused on pnpm exec/run, and the first
review durability model failed to canonicalize macOS `/var` to `/private/var`. The subsequent source test
corrected that model, and local build binaries ran the exact declared scripts. No production source was
changed to accommodate a failure. Review-tool formatting after these checks changed layout only.

## Scope and audit boundaries

No implementation fixes, engine slots, Docker/container lifecycle, external services, contract edits, merge,
push or production qualification. No actual Linux device calibration, Linux tmpfs startup or VM placement
verification. The full 1,220-test G0 is audited as historical evidence; it is not claimed as a fresh reviewer
execution. P5 evaluation/outbox publication and live providers remain builder-declared integration work.

PASS/verdict/receipt audit for this review:

1. `probes.mjs` assertions and observations: actual fresh fixture bytes, executed marker files and TCP
   response captures; fresh UUID directories and RPC IDs; the current checked bundle digest, supplied probe
   input hash and explicit `offline-no-slot` bind each run. The probe input hash is a fixture label, not a
   complete production-input attestation. No probe emits an NS acceptance PASS.
2. `durability.test.ts` and the source tests: compare direct refusal, the inspected paths and the returned
   class using fresh temporary files and explicit Linux mocks. They do not promote modeled probes to real
   Linux durability evidence.
3. `mutate-feed.mjs`: uses this review's newly executed parity artifacts, validates unchanged feed/accounting,
   and changes one retained RPC feed attribute. It intentionally aligns the source identity/timing controls
   to isolate content validation, and labels the result a recompute negative control, not a new run receipt.
4. `audit-evidence.mjs`: verifies all historical manifest bytes and receipt CAS objects, the exact tested
   commit and the absence of later runtime-source differences. Its output explicitly remains a historical
   audit, not fresh G0 execution. Contract pin dictionary matches are enumerated independently.
5. This verdict is based on the source locations and retained reproductions above. The evidence manifest
   asserts preservation after readback only; its hashes do not imply semantic acceptance.
6. `build.mjs` checks each exact declared build command's exit and the generated CLI entry files. Its
   completion message means build/artifact presence only. `pack-cli.mjs` checks the original archive's missing
   entry and the new archive's actual required entries, with a fresh output/cache directory and a tarball
   digest; its conclusion is limited to this setup failure. Neither claims a full consumer or release PASS.

Changed pinned paths: none. The review changes only `lab/verify/NSR/`; the acceptance contract is unchanged.
