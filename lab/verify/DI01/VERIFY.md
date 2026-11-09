# CX-VDI01: EXP-DI01 adversarial review

**Verdict: FIX-FIRST.** One medium-severity finding blocks the requested typed-refusal check. No incorrect affected set, replayed effect, or non-atomic committed index/checkpoint was found in the completed checks listed below. This is an offline review, not live P3 qualification.

Reviewed branch `exp/DI01-dependency-index` at `7ae302bc` (implementation `96b9a259`, accepted FD01 base `731e10e4`). North star: P3 correctness under `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; affected-set comparison follows the brief's explicit O-DOMAIN-only decision. No subagents were launched.

## Finding F1 — Medium: reference-basis refusals are untyped

Locations: `lab/bench/lib/di01-refs.ts:33`, `:46`, `:51`, `:61`.

The shipped reader helpers construct plain `Error` objects for an unavailable or incorrectly reported pinned basis. In particular, `storageReferenceReader(handle, true)` with source head 5 and requested position 1 throws `Error("BasisNotAvailable")`; `memoryReferenceReader` receiving reported position 5 for requested position 1 throws `Error("Memory reference basis unavailable")`. Both have `name === "Error"`, no `_tag`, and no structured reason or requested/available basis. A message string is not a typed refusal. A caller handling a typed basis/retention refusal cannot classify these paths without parsing prose.

Reproduction: `runtime.test.ts`, test **GAP: shipped reference readers emit plain Error for an unavailable requested basis**. It invokes the actual helpers; it does not alter their implementation. Its assertions deliberately pass when this defect exists. The source of the storage refusal is the head-only guard, before `getByEntities` can run; the memory case rejects a mismatched reported basis. This establishes unavailable-basis error behavior, not a claim that an actual backend retention policy was exercised.

Proposed fix: use a shared tagged basis-unavailable refusal for these guard paths, preserving backend-provided typed expiration errors, and add a regression that requires the stable tag and verifies unchanged index/effects/checkpoint after unavailable/expired-basis refusal and reopen. Where a retention floor is available, include it and the requested basis. Do not catch the refusal and continue from a newer feed position. No fix was made in this review.

The separate expiry-seam test injects a tagged unavailable-basis error, verifies its propagation, verifies every durable snapshot field is unchanged across reopen, and retries the same page successfully. That confirms the consumer's abort boundary; it does not repair or qualify the helpers' own untyped refusal paths. Live feed/reference-retention integration remains unverified.

## Merged tree and mandatory gates

Merged accepted main `e09c2ff4` in a separate commit: **`aa34513a562a9a7512318f20e277ef2b02c060a8`**, parents `7ae302bc` and `e09c2ff4`. Two additive conflicts were resolved by retaining main's `durability` field and `DurableFlush` export, plus DI01's protected database access and `DependencyIndex` export. No consumer algorithm was changed for this review.

On that committed merged tree:

- `python3 -I lab/acceptance/build_contract.py --verify` was its own step: exit 0, byte-identical regeneration; transitive hash `145db3994dec0dcabc635d651b5edf1aa957e236e5f4346ab069dfca9583c220`.
- Evaluator: `node --test lab/bin/test/claim.test.mjs lab/bin/test/claim-round2.test.mjs`: **108 passed, 0 failed, 0 skipped**. Run admitted by `heavy.mjs`; raw log `evaluator.log`.
- Accepted lab PACK gate: **PASS**, fresh offline install, builds, tarballs, declarations, 25 isolated entry-point imports and CLI checks; `r2/pack/` retains the receipt and all command records. Registry cache bytes were seeded from `CX-VA01-040/npm-cache`; installed consumers and old dist were not reused.
- Literal root `pnpm pack:check`: **FAIL**, missing `package/dist/index.js` in the DuckDB tarball. The accepted lab gate explicitly excludes DuckDB; the upstream checker is unchanged. This is not an `effect@undefined` or ERESOLVE failure, and is not reported as a root-check pass.

The first fresh lab pack attempt used the older PACK cache and failed `ENOTCACHED` for `better-sqlite3`. Its complete attempt remains under `pack/triplex-pack-6Gs8oJ/`. The first W0 build invocation used `--store-dir` in a pnpm run context and was rejected as an unknown option; the successor uses `--config.store-dir=<owned store>`. Both first failures are retained. No network fallback or dependency/lockfile edit was used.

## Trace, restart and crash evidence

Reviewer `readback.py` does not import DI01's checker. It checks the committed small evidence manifest; validates every preimage in all three stage bindings; compares final source preimages to `git show 7ae302bc:<path>`; and verifies shared runtime/oracle bytes agree across the stages. It then reads every raw worker answer, request ordinal, logical group, trace comparison row and durable affected row.

Result: **438,140/438,140** positions agree between worker output, logical oracle result, reported expectation, reported observation and actual SQLite affected rows. Effects equal affected rows in both directions; checkpoint is 438140; there are 438140 delivery records. There are 662 full-world positions and 379108 positions differing from directly written subjects. None is inferred from a `MATCH` counter alone. Raw readback receipt: `readback-1/result.json`.

All **900 retained crash databases** independently equal the no-crash baseline after recovery. All 500 keyed-atomic pre-replay observations match the required whole old/new snapshot, including 100 stops at `after-effect` before checkpoint recording. The 100 keyed-split controls differ before replay; the 300 unkeyed-split controls expose 100 duplicate effects. All five dependency tables are included; `di_basis` is empty in this fixture and its inclusion is checked separately by the table-mutation test. These are process-stop/WAL tests, not host power-loss qualification.

Fresh executions on `aa34513a` completed as follows (all through the admitted `CX-VDI01-gates-r2` pipeline):

| Execution | Observed result |
| --- | --- |
| Unchanged FD01 host suite | 13/13 passed, including its original crash conformance |
| DI01 focused suite | 11/11 passed; original eleven-case oracle-control assertions were copied under the reviewer directory only to redirect their hard-coded evidence destination |
| Reviewer restart/overlap/expiry-seam/GAP tests | 3/3 assertions passed: two conformance tests plus one positive reproduction of F1 |
| Named consumer cases and boundaries | Nine affected fixtures matched; C67/C96 N/A; C19/C20 boundary checks matched |
| DI01 crash matrix | 900/900 trials completed; 500 atomic, 300 unkeyed split, 100 keyed split; 100 split atomicity rejections and 100 duplicate unkeyed effects |
| Independent delivery binding | 438140/438140 reconstructed feed digests equal the original `deliveries.digest` values |

`commands.ts` reads the pinned seed/trace/mapper/W0 generator sources, frozen seeds and separately bound overlay. It never imports the DI01 index or `Replay`. `feed-binding.py` independently implements assertion/retraction identity ordering and identity-only feed encoding in Python, then checks every actual SQLite delivery digest. It also reproduces the complete command-log SHA256: `2b41e3f5b9aacdd922b695b8cb9a1566b9fdfdbf924fd27d4b4fd4d2d79ee85a`. The digest sequence hash is `425bb6da86f5d7dfcab7c89792f7e5cd56d69793fa60c8ebb3a21745b2933df9`. This closes the seed-to-actual-feed-byte binding check without using the same page builder under review. The 225 MiB generated command stream remains durable outside Git.

Raw logs, fresh non-null source/build bindings, databases, and results are under `r2/`. `r2/gate-steps.json` binds each command's exact argv, timestamps, exit, output hash and committed merged HEAD. The controller intentionally records the known failing root pack check separately; its own final exit is not an aggregate conformance verdict.

## PASS audit (rule 9a)

The reviewed builder sites were inspected separately from their status strings:

| Site | Content check | Freshness and binding |
| --- | --- | --- |
| `ConsumerStore.apply/applyDerived`, DI01 deriver | Affected positions validated; prepared entry bytes and delivery digests checked; refs/read plans applied under the checkpoint transaction | CAS precedes derivation; only new deliveries derive; configuration binds V/release/plans. Trusted readers/derivers still require semantic gates; F1 is the refusal-type gap |
| `recordObligations` | Valid basis/timestamps; only newer basis replaces rule rows, including empty replacement | Durable subject watermark; transaction; gate compares actual due rows with fresh C19/C20 oracle output |
| Oracle bridge/partitioner | Worker results checked for sorted uniqueness, subject-slice membership and exact union; eleven cases compare with fresh unsplit answers | Fresh oracle processes, raw worker output, ordinals and encoded-input hashes; pinned source/release preimages |
| `di01.ts` cases and trace / `checkPosition` | Frozen cases and actual durable rows equal independent O-DOMAIN bytes; trace non-void direct-subject difference | Exact p−1/V/release and p writes; source/mapper/trace/overlay/command hashes; bound completed attempts only |
| `crosscheck` | Every instantiated pair equals kernel dependencies, no extra-pair allowance | All subjects at each selected cut and last cut; same source/build binding |
| `di01-crash.ts` / testkit atomicity audit | Pre-replay old/new snapshot, recovered baseline equality, split controls and actual duplicate effects | Actual stop/COMMIT interception; unique arm/point/trial files; input/method hashes; source/build binding |
| `di01-lag.ts` | Actual durable fanouts, 100k dependency checks, per-subject reruns; paired p99 derived from raw samples | Actual alternating pages/timers; reader interval separate; source/build binding. `predictionMet` is reported separately from semantic `MATCH`; no live timing acceptance inferred |
| GS seam / focused tests | Stored affected/checkpoint/rerun values, positive/negative witnesses; rejection and cache controls | Fresh fixture/process state, oracle source/basis and attempt identity. Unbound test diagnostics are not independent promotion receipts |
| Builder `audit.py` and inventory | Preimages, raw DB/worker/trace counts and timing; SHA256 inventory | Completed bound stages; retained first failures. Original audit does not independently reconstruct delivery digests; this review adds that check |
| Reviewer `readback.py` | Every worker answer and SQLite row; 900 final DBs and pre-replay snapshots | Original committed receipt/preimage bindings; new readback timestamps/script hash/merged HEAD; offline slot null |
| Reviewer command reconstruction / `feed-binding.py` | Independently constructs identity-only feed entries and compares every delivery digest; verifies complete command-log digest | Frozen generator source pins and seeds; no `Replay.add`, `DependencyIndex` or DI01 page builder imported; fresh command file and bound merged HEAD |
| Reviewer runtime and oracle controls | Raw-world oracle comparison, baseline/restart/overlap equality, refusal snapshot equality, concrete untyped-error reproduction; eleven unsplit/partitioned cases | Fresh owned files/processes and merged builds. GAP test success means a reproduced defect, not conformance |
| Reviewer `inventory.py` | Reads every retained non-cache file, SHA256 and full file/byte denominator; asserts stable size/mtime during each read | Runs after writers finish; exact owned root; script hash and completion timestamp; excludes itself to avoid recursion; byte inventory only, no semantic verdict |
| Reviewer gate controller / package gate / this verdict | Controller records actual exit/log hash; package PASS requires its own fresh content checks; this FIX-FIRST depends on the concrete F1 reproduction | All runs name committed merged HEAD and owned evidence. Controller exits are not used as substitute semantic acceptance; root/first failures remain explicit |

The new reviewer code creates no production consumer receipt or acceptance-contract ruling. A nullable `DI01_BINDING` permits diagnostic builder runs; only the explicitly bound completed stage evidence is used here.

## Pins, changes and limits

`lab/acceptance/` is byte-identical to accepted main `e09c2ff4`; it was not manually edited or regenerated. No DI01-delta path appears in the accepted acceptance files' pin inventory (`moved-pins.json` is empty). For transparency the merged `ConsumerStore.ts` hash is `22ef8081a975b3be504b694bf1b86ee2979c003c40436f48250d87483c7dc118`, versus DI01's pre-merge `e1f5e23c23e6970e63c697905acdeb3dd1ad1d4b8d790da43320a794fdd30f46`; feed index export hash is `944a7073f9da7a0016a038bd4c49577dfd2ae34a82754b31555d02f8fe4e85fd`, versus `ccd26e7c3841cb630a646d7db4a9829b40dd0de89ae6a9620dc004f55ea14c60`. The experiment's original four-path old/new list remains in `lab/experiments/EXP-DI01/changed-path-hashes.json`. No re-pin was manufactured.

Only the requested main merge and reviewer files were changed. No engine/slot/Docker lifecycle, native X/Q/D integration, actual retention compaction, full fresh 10k oracle trace, fresh 100k lag benchmark, full root `pnpm check`, PostgreSQL/native integration, publish, push, or merge into main was performed. Complete original trace/crash evidence was read back; fresh focused execution is identified separately. Valid-time-varying references, snapshot bootstrap, native erasure and live P3M integration remain outside the builder's offline claim.

Durable reviewer evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VDI01/`. Bulk raw evidence and caches stay outside Git. `SHA256SUMS` binds 4513 non-cache files / 336320001 bytes; its SHA256 is `919e81908d60da567c36cf898f57164e62bea77fca0a8b3150dc4cdf5e278a81`. The short evidence index also binds the inventory metadata.
