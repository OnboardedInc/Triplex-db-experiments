# CX-VNSR — EXP-NSR round 2

Verdict: **FIX-FIRST** on `76e6efd0ce3977bb21b3628df00ef4512a7f5265`.
**F1 is closed. F2 and F3 remain partially open**, with new reproductions of the original findings.
No additional out-of-scope findings are raised.

North star: correct, independently checkable P1 answer evidence and sound P1–P5 loader/durability boundaries.
Goals and bars remain `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. This is an offline review of F1–F3,
not NS qualification. Runtime code and acceptance bytes match the target unchanged.

## F1 — closed: canonical answer identity and complete request keys

Independent probes used four actual TCP reader loops, with distinct full requests including subject, basis,
shape/hops, route, loop tag and extra tenant/version fields. The expected answer's canonical bytes were authored
as a literal in the reviewer probe, rather than obtained from `answer.mjs` or the candidate's own answer digest.

- Equal answers, including differently ordered answer objects, compare equal across fresh random RPC IDs in
  every loop. Raw-wire hashes remain distinct.
- Every read retains the exact configured request and its full canonical request key. Each loop's first answer
  is sampled; the retained sampling flags follow the declared interval. RYOW, P4 and sweep pulls retain answers.
- Baseline: 124 reads, zero oracle digest mismatches. Mutation: 121 reads, exactly one mismatch, at **loop 3,
  sequence 1, sampled=false**. Independent recomputation from normal HR evidence rejects it with
  `oracle mismatch loop 3`. No unsampled candidate answer bytes are needed for this comparison.
- HMAC chaining and the terminal seal were independently checked on both attempts.

The driver still returns `DIAGNOSTIC`; it does not itself run B5's semantic qualification. The original defect
was lost evidence needed for that recomputation, and that defect is repaired.

## F2 — Medium, still open: destructured constructor admits runtime candidate loading

Location: `lab/bench/ns-driver/check-imports.mjs:55–69` (binding patterns are not covered by the reflective
property checks); `:19–31` (identifier spelling blacklist).

The exact original worker and aliased-createRequire cases are now refused. Computed `import(file)` is also
refused, as is the directly indexed constructor call control. However, the same runtime loader capability can
be obtained through a binding pattern:

```js
const { constructor: Compile } = function () {};
const task = Compile('return import("file:///.../packages/candidate.mjs")');
await task();
```

Reproduction: `round2/probes.mjs` creates a fresh source tree containing this entry and a harmless candidate
module. The checker accepts a manifest containing **only `entry.mjs`**. Executing that entry in a real Node
process imports the omitted candidate module, which writes the expected marker. Candidate execution and the
marker bytes are verified; this is not just an accepted AST with no demonstrated runtime behavior.

The present nine-file driver bundle remains package-free and loads. The defect remains the gate's false
negative, not an assertion that the current actual bundle contains this loader. The builder's statement that
reflective constructor access/runtime loaders are closed is too broad even for this small variation.

Proposed fix: cover binding-pattern access to constructor/prototype capabilities and conservatively reject
unresolved reflective loading. Define the allowed evaluator JavaScript subset explicitly; do not treat spelling
checks as a complete execution/import graph. Retain this executable fixture as an F2 regression control.

## F3 — Medium, still open: same-type file mounts escape flush-path validation

The original symlink-to-tmpfs case is fixed, and a modeled **tmpfs database-file bind mount** is refused even
when its parent is ext4. A real Mac hard link was also tried: both names have the same inode and link count 2,
and the modeled durable filesystem is admitted. That hard-link case did not yield a volatile-storage bypass.

Two related bind-mount cases remain. These are modeled Linux probes over real temporary files on this Mac,
**not actual Linux mounts or a Linux durability qualification**:

1. **Main database on a different ext4 device; calibration on its parent.**
   Location: `packages/host/src/feed/DurableFlush.ts:68–89`.
   Model the existing DB filename as an ext4 file mount on device `8:2`, with an ext4 parent on `8:1`.
   Explicit `fsync` of that DB's descriptor throws the modeled `EIO`, confirmed by a direct negative control.
   Nevertheless `assertDurableFlush` returns `guest-flush-host-power-loss-unqualified`, bound to `device:8:2`,
   after five successful fsync calls on `.nsr-flush-*` under the parent. The target is never calibrated.
   No path replacement or race is involved; the two devices remain fixed throughout the test.
2. **WAL mounted from ext4 with `nobarrier`; only its filesystem type checked.**
   Location: `packages/host/src/feed/DurableFlush.ts:49–53`, `:57–67`.
   Place the DB on ext4 device `8:1` and its existing `-wal` file on an ext4 file mount, device `8:2`, whose
   mountinfo options contain `nobarrier`. The sidecar check accepts the equal `statfs.type`, then checks only
   the main DB's mount/device. DB admission succeeds. Calling the same guard on the WAL filename directly
   is refused with `mount barriers unavailable`, showing the negative mount control is active.

Proposed fix: bind every DB/sidecar durability check to its actual mount/device and barrier/cache policy;
calibrate the device actually used, or conservatively refuse file mounts/cross-device paths that cannot be
calibrated safely. Filesystem-type equality is insufficient. The private-volume assumption can constrain the
allowed layout, but then this function must verify or refuse that layout rather than admit these paths.

## Fresh checks and evidence

Review evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VNSR/round2/`.
Index and hashes: `round2/EVIDENCE.md`, `round2/SHA256SUMS`. Tools: `lab/verify/NSR/round2/`.
Retention indexes 211 files / 4,518,197 bytes, all copied bytes read back, with 18 target-source files verified.

| Check                           | Result                                                                                                                                           | Evidence                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Exact driver bundle             | Nine files; package-free; copied entry loads; bundle SHA256 `086c3435e0ba059a6b78270face6c1aadf172aecea47eb5e7864c3a9c28b6340`                   | `probes-1.log`, `probes-b7481fea-4d0a-49bb-b6c8-1ae15a2d305f/bundle/` |
| F1 baseline and loop-3 mutation | Expected equal answer digests; exactly one unsampled loop-3 mismatch; independent oracle refuses it                                              | Same probe log, retained HR chunks and reviewer captures              |
| F2 loader controls              | Worker, createRequire alias, computed dynamic import and indexed-call controls refused; destructured constructor admitted and executes candidate | Same probe log and `loaders/` fixture                                 |
| Host package build              | Declared JS and declaration steps completed                                                                                                      | `step-0.*`, `step-1.*`, `check-results.json`                          |
| Source controls                 | Eight tests passed: four builder tests plus four independent file-mount/hard-link cases                                                          | `step-2.stdout`, F3 observation JSON files                            |
| NSR/P3M regression suite        | **12 passed, 0 failed**, including canonical encoding, separate candidate processes, parity, caps and planted-delay negatives                    | `step-3.stdout`, `nsr-fresh/`, `p3m-fresh/`                           |

The final source rerun also passed **8/8**, including the direct-WAL negative control (`source-control-2.log`).
The builder audit verified **268 files / 7,950,747 bytes**, with all 16 listed sources equal to the exact
target (`audit-1.log`). Changed pinned paths: **none**. Details are indexed in `round2/EVIDENCE.md`.
No full G0, clean consumer/release check, engine slot, Docker lifecycle or external
service was run. Actual Linux startup, file mounts, flush behavior, inode reservation under concurrent path
replacement, hardened VM wiring and native providers remain unverified.

## PASS / verdict / receipt audit

1. **`round2/probes.mjs`:** positive checks compare the actual copied bundle, executable marker bytes and
   observed HR contents with independent expected values. Fresh UUID directories and RPC IDs prevent reused
   observations; target and bundle digest plus actual fixture-input hash and explicit `offline-no-slot` bind
   the runs. HMAC chaining is checked. The digest oracle uses the complete configured request and a manually
   authored answer byte string; it does not adopt a candidate-reported correctness flag. The builder's own
   earlier `probes.mjs` is preserved but is not substituted for this independent four-loop test.
2. **`round2/durability.test.ts`:** fresh files and a real hard link accompany explicit Linux filesystem/device
   mocks. The EIO fault is exercised directly before the target calibration test; the WAL mount refusal is
   exercised directly too. Recorded admission classes are counterexamples to the guard, not acceptance PASS
   receipts. Temporary fixtures are retired after their observed values are retained in JSON.
3. **`round2/checks.mjs`:** executes the exact host build tools, source controls and NSR/P3M tests in fresh output
   directories; retains stdout/stderr and actual exits. Exit zero is only a check-execution result. The original
   P3M OFFLINE-PASS receipts stay diagnostic fixture artifacts, not independently qualified NS receipts.
4. **`round2/audit.mjs`:** reads and hashes retained builder bytes, checks source equality to the exact target,
   enumerates changed pin-dictionary paths, and asserts no target runtime/acceptance difference. Historical
   builder observations remain historical, not a fresh reviewer execution.
5. **Review verdict and retention:** findings cite the exact source locations and fresh reproductions above.
   The final manifest is produced from retained bytes with copy readback and source-change checks. It asserts
   preservation only, with no NS semantic PASS or actual-Linux durability claim.

Candidate code was brought into the review branch from `76e6efd0` for execution, resolving only the overlap in
the already copied review probe. Candidate runtime bytes are unchanged relative to that target. No fixes were
made; no merge into main or push. Changed contract-pinned paths: **none**. `lab/acceptance/` is unchanged.
