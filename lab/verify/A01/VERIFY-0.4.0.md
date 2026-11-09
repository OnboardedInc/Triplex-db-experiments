# CX-VA01-040: contract 0.4.0 review

North star: the P1/P2 correctness floor and honest P3 measurement, under `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.

**Verdict: FIX-FIRST.** Two actionable findings remain. The required offline suites pass after an explicit W0 build, but the production O-CONTRACT runner has a stale pin, and G0 does not build or bind its W0 declaration dependency. No reviewed implementation was repaired.

Reviewed branch/head: `contract/0.4.0` at `4fa6192cf3b90ecc0f6f75ca018914d9590dd1eb`. Review branch: `verify/A01-040`. The Q87 merge is `40e24c0f613479d73a2f988a233dd82813d0542c`, with main `8c96ea90e6d51dd727bcaf41d23d8f83e4da8e87`, captured at 2026-11-09 12:02:13 UTC. The merged evaluator ran on that committed tree; main still named that same revision at completion.

## Findings

### F1 — P1: DF01 changes the O-CONTRACT projection without re-pinning its runner

Locations: `lab/acceptance/build_contract.py:6336` (late image assignment), `lab/acceptance/build_contract.py:5846` (earlier pin computation), and `lab/acceptance/obligations.json:4081` (stale generated runner pin).

DF01 merge `f3ed62112028440389710a86fbf5c82c2f91afda` changes `lab/acceptance/oracle-contract.json` from SHA256 `82b3b4e0e774553a38ab4750abb6fc61b2d89431aeb3002f7692d3124fa80fb9` to `6fae9baacf3c36902fed3704526d50ec3788b05d1eddf6287b3989fc5438b266`. Its `oracleRunners.O-CONTRACT.sha256` entry remains the old hash, both in the merge commit and at the reviewed head. This violates Q45a's same-commit re-pin requirement. The separate `artifacts.oracle-contract.json` hash is correct; checking only that map misses the defect.

The generator freezes the runner map before applying `DATOMIC_IMAGE_040`. Its later render includes the new image, while the earlier map stays stale. Consequently `--verify` reproduces the same inconsistent map and passes. The 108 evaluator tests use a distinct fixture O-CONTRACT runner (`lab/bin/test/claim-fixtures.mjs:43,147`), so they also pass. Production `prepareTrusted` compares the actual authority blob to this runner map and refuses a mismatch with `ORACLE-FILES` (`lab/bin/claim.mjs:1211`). That runtime consequence is from source inspection; this review does not claim an executing production qualification run.

Reproduction on either reviewed or Q87 merged source:

```sh
python3 -I -B lab/verify/A01/oracle-pin040.py
```

Observed: exit 1, with the stale expected hash and actual new hash. The broader history scanner also exits 1 and identifies precisely this missing re-pin. Evidence: `pin-history.json`, `oracle-pin-regression.log`, and `audit.log` under the durable evidence root.

Proposed fix: compute the O-CONTRACT runner hashes after all final image/contract assignments; validate the map against the exact rendered projection bytes. Rebuild the local DF01 integration so this derived re-pin lands with the merge, regenerate consumers, and add a production-runner content check plus an image-change/stale-runner negative control. Repeat the required committed-tree gates. A later passing regeneration alone does not repair the same-commit history requirement.

### F2 — P2: a fresh G0 fails because W0 is omitted from its build and manifest

Locations: `lab/bin/gate.mjs:47` (`lanePackages`) and `lab/bin/gate.mjs:250` (new CHECKJS step).

G0 builds/hashes core, host, testkit, the lane and qualification; it includes W0 only for NS/PAIR/GS. CHECKJS also checks imports of `packages/w0/dist/index.js` from `lab/bench/lib/composition.ts:88` and `lab/bench/lib/w0-world.ts:2`. In this fresh worktree that directory was absent after the successful lab pack gate, which explicitly excludes W0.

Reproduction: install the frozen dependencies in a fresh worktree using the owned store, run the lab pack gate, then run `node lab/bin/heavy.mjs --label <id> -- node lab/bin/gate.mjs G0 --lane xtdb`. No source mutation is required.

Observed first attempt: `G0-xtdb-20261109T114103Z-69a341` is **FAIL**, solely for CHECKJS exit 1 / TS2307 on those two W0 imports. All 1,289 tests pass with 140 expected skips. The receipt's build manifest omits W0. Building W0 explicitly makes CHECKJS and all three subsequent G0s pass. I retained 52 exact W0 dist files, their hashes, the actual prerequisite build command, and verified that those bytes stayed unchanged through the reruns. The initial FAIL remains a FAIL.

Proposed fix: add W0 to G0's declared build inputs and build-manifest hashing, then verify a fresh checkout without a prebuilt W0 dist. Keep the existing host dependency and NS/PAIR/GS behavior. The manual prerequisite used in this review does not fix the gate.

## Literal authority, pending rows and integration behavior

- The independent scan compares actual Git authority at `d4227396` with bytes at `4fa6192c`. Exactly Q98a-i, Q101a and Q104a are newly compiled. Their literal rule text, topic/basis, obligations/load consumers, RULINGS.md and ACCEPTANCE.md agree. Every one of the other 77 pending rows is preserved exactly.
- Q78e, Q86g, Q89, Q90, Q92, Q94a, Q95, Q98j, Q99, Q100, Q102, Q103 and Q105 remain pending. Q104a's Q100k reference does not compile Q100k. No new qualification, workload or numeric-bar authority is inferred.
- All 12 named candidate/review revisions checked by `test040.py` are ancestors, including final M01 `99d9641d` and CHECKJS `f72cd5ad`. I also read each review's verdict from its exact Git commit. NSR/P3M/FD01/DF01 accept offline scope; QNODELAY and M01 accept their scoped corrections; CHECKJS accepts coverage subject to oracle re-pins. None is a live engine or performance promotion.
- QNODELAY keeps keep-alive as the native default and preserves main's typed timeout/abort errors. The broker's existing connection behavior remains. The G0 QLever transport/parity tests pass.
- PAIR is still opt-in through an explicit round plan. The merge preserves the NS consumer path and M01 paired-path behavior, the union of benchmark tests, and both host/W0 dependencies for NS/PAIR. No live PAIR was run.
- FD01 `ConsumerStore.ts` and DF01 `gateway/feed.clj` are byte-identical to their accepted candidates. Effects, affected set and checkpoint remain within one SQLite BEGIN/COMMIT; crash/recovery tests execute in G0. DF01 still arms a wakeup before reading, decides on the durable log, and performs its final bounded read at expiry. Its native long-poll was inspected, not requalified against a live engine here.

## Pin coverage and per-hunk notes

The independent scan examines baseline acceptance JSON recursively (path/hash maps, nested path/hash records and generated references), generator AST path literals, and SHA256SUMS manifests: **266 referenced files**. It finds 17 changed references: seven source files, slots/image configuration, generated/ruling inputs and the two oracle manifests. The first-parent scan checks each previously live pin at every integration commit. Only F1 lacks a same-commit re-pin. Historical old-hash review records are not mistaken for current pins.

The seven reviewed source changes below are re-pinned in the integration commits. QNODELAY's five hunks add imports, receipt wrapping/mode metadata and wrapper closures; they do not change queries, data, schedule or the default. CHECKJS's two evaluator tests, three capacity oracles and final replay helper each add one comment line; executable tails are byte-identical. Hunk headers/diffs and per-hunk workload notes match the actual Git changes. NSR/FD01 and M01 move no pre-existing source pin.

| Source | Old SHA256 | New SHA256 | Hunk/workload review |
| --- | --- | --- | --- |
| `packages/qlever/experiments/native-entry.ts` | `c82ce6cfabfcf61ab9f5d76791146d167741420a3be07b92559026f987634b0f` | `0f78b5bfcf5d2198015bd6a0e9111a4c7d98fb6fd9022de468d047d90a8bca8d` | 5 receipt-metadata hunks; workload unchanged |
| `lab/bin/test/claim-round2.test.mjs` | `6aef70bd2448a6b37dc040d19d9ee219a4e4e5fdf78c8094e1bb66ec45104be9` | `4a5c65d1d26fd71996f8a0f6e8b765608d628abb74e69fbd7a4bf2348a22edc7` | 1 comment-only hunk; executable tail unchanged |
| `lab/bin/test/claim.test.mjs` | `62de70ed333c40f8662da5749179f985f9f8b961a6c10459a0dadfad5bceb476` | `b8352b989fcf5857cb8f4a4a3d3766ed1f61f46ba6b0760f8568060f3b8f819f` | 1 comment-only hunk; executable tail unchanged |
| `qualification/capacity/configured-entities-v1/oracle.mjs` | `5e4f92bf74fde4504c309d2888cc234013ceb2fbfc8bca7c06fff51cea054cd3` | `92c0378b8120aaa25fb7a16d8659aa1790141eba62aed8f7e7356213efe92e94` | 1 comment-only hunk; executable tail unchanged |
| `qualification/capacity/historical-assertion-metadata-v1/oracle.mjs` | `bc93f24c88365add1d215747cd95705a3c2a2b4fd1c6cdd7e347a014fb23b290` | `bbd656760719b67a3435419121b0b7df909a99ea9c1aba22d85ea1363cb6b08f` | 1 comment-only hunk; executable tail unchanged |
| `qualification/capacity/historical-assertion-metadata-v2/oracle.mjs` | `f661e8138d5194bbcbbe56eec9ec35f8766bc9938540192e7b0d92d04685721b` | `5ce6612714b2b7742c46e0599617d472b4bf18a352806e5d44a44577878c9649` | 1 comment-only hunk; executable tail unchanged |
| `lab/oracles/replay/selfcheck_fixtures/freeze-ham-reference.mjs` | `c533122597c940d69c8a101a1a175ba5e9d6ab62f1efdb2d5526c9f65a86a206` | `752aaa5c706c514ec265ed6865458fd6bd78795486764e200c088c3f52f53f28` | 1 comment-only hunk; executable tail unchanged |

DF01 image re-pin: `sha256:34fb9db10a278ff5614e7ac59788a2456329c75d098871ce1831465e243f2dcf` to `sha256:aecbac4c6712d70d17dfba7b50cabaaf727aef6b3e72ec1fe2000b5523b36bcf`, atomically at `f3ed6211`. It changes gateway implementation identity and requires new measurements; it does not alter the frozen workload. F1 lists the associated generated projection pin that was missed.

## Fresh gate results

All original-head rows below ran on committed `4fa6192c`, with tracked input bytes unchanged before/after each command. Heavy commands used the shared lab semaphore and the owned pnpm store; new admissions checked the 5 GiB host-free floor. Engine slots are null for G0; no engine was contacted.

| Check | Actual result | Evidence |
| --- | --- | --- |
| Separate generator `--verify` | PASS; six byte-identical outputs | `verify.log`, `verify.json` |
| Contract tests | 13/13 | `contract-tests.log` |
| New ruling/re-pin mutations | 34/34 rejected; baseline and canonical bytes checked | `mutations-results.json`, `mutations.log` |
| Broader pin-history content check | FAIL: exactly F1 | `pin-history.json`, `audit.log` |
| Direct production runner pin regression | FAIL: F1 | `oracle-pin-regression.log` |
| Mandatory evaluator | 108/108; zero fail/skip/cancel/todo | `evaluator.log` |
| Lab pack gate | PASS: 12 packages, 25 evaluated imports; declarations/runtime/CLI checks | `pack/triplex-pack-QKd0jS/receipt.json` |
| First XTDB G0 | FAIL: missing W0 declarations; tests 1289/1289, skips 140 expected | `G0-xtdb-20261109T114103Z-69a341` |
| XTDB G0 after explicit W0 build | PASS: 1289/1289, skips 140 expected | `G0-xtdb-20261109T114700Z-529bc7` |
| Datomic G0 after explicit W0 build | PASS: 1344/1344, skips 66 expected | `G0-datomic-20261109T115206Z-9e0a0c` |
| QLever G0 after explicit W0 build | PASS: 1513/1513, skips 79 expected | `G0-qlever-20261109T115628Z-679e55` |
| Q87 merged-tree separate `--verify` | PASS on `40e24c0f` | `merged-verify.log` |
| Q87 merged-tree evaluator | 108/108; zero fail/skip/cancel/todo on `40e24c0f` | `merged-evaluator.log` |

The mutation suite covers every new literal and its consumer, the seven listed source re-pins, the Datomic image and four policy controls. It does not detect the unrepinned derived projection; the independent content/history checks do. Passing suites do not supersede F1/F2.

My first explicit W0 prerequisite command used pnpm's unsupported `--store-dir` spelling for `run`; its exit-1 attempt is retained. The new attempt uses the lab's `--config.store-dir=...` form and succeeds. No failed attempt was relabeled.

## Q87 merge and reviewer changes

Main advanced while the offline gates ran. I merged exact main `8c96ea90e6d51dd727bcaf41d23d8f83e4da8e87` into this review branch, resolved only ACCEPTANCE.md/obligations.json generated conflicts using the unchanged 0.4.0 generator, and committed before testing. All **100 held main pending rows** survive literally. The implementation files for both findings and the four behavioral checks remain unchanged. This is a reviewer test merge, not a merge into main or an implementation fix. After Q87 finished, main advanced to `9b511f511ecdb507635a49c0344ee4ec408f6570`; the delta touches only `lab/NOTEBOOK.md` and `lab/agents/CODEX-PREAMBLE.md`. Those later bookkeeping commits were not merged or rerun; the exact tested main snapshot remains the one stated above.

The only acceptance-byte changes relative to `4fa6192c` are mechanical pending-file/projection changes below; no version, bar, oracle implementation or workload was changed. These old/new hashes satisfy the reporting requirement for the review merge itself.

| Q87 metadata path | Before SHA256 | After SHA256 |
| --- | --- | --- |
| `lab/acceptance/ACCEPTANCE.md` | `d85c3733a80c4d8641ac1ee8433efa6379bfc2e38b8638eb199c5588ec453ea9` | `d8c7e68174b6be46d7caedea03d45445c2769dae7a20a32002a642b46ae96945` |
| `lab/acceptance/RULINGS-PENDING.md` | `fce16f288ccce3032f5e30c7a7e41d1b985f89000a155200980a51720208b7eb` | `35a487c484e1d16b1478e124e24c9a41a347f99b43da5323eb11144e2a2dc61e` |
| `lab/acceptance/obligations.json` | `da52b44b621336afc115856484d5fcf6b6e0a58ff345f4c0d2d5b9776115c821` | `1d270d69aea640702fb5c7af1b5542fc4923d1428c4009320a47b34e78132355` |

## Evidence retention and PASS/verdict audit (rule 9a)

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-040/`.

The committed `evidence-0.4.0/SHA256SUMS` indexes **429 files / 35,307,069 bytes**, all reread after finalization. Raw objects, outputs, bindings, package tarballs/consumer inputs, W0 dist preimages and first failures remain outside Git. Dependency caches/node_modules are excluded from that manifest. Exact terminal G0 receipts, pin/merge summaries and the artifact audit are small Git copies under `evidence-0.4.0/`; original raw paths are retained beneath durable `gates/`. Only this review's four terminal receipt files were moved out of the default untracked lab/runs directory after durable and Git copies were byte-verified; raw run directories and objects remain.

Adoption locations in my tools:

1. **`review040.py:command`** creates new exclusive log paths, records the actual HEAD, command, start/end and log hash, and compares all tracked input hashes before/after. The actual heavy wrapper executes each gate; terminal receipts additionally bind its grant/owner. Exit alone is not a semantic PASS.
2. **`review040.py:mutations`** requires a fresh known-good copied generator to verify, then actual structured `CONTRACT INVALID` content/nonzero exit for every mutation. All copies live under lab/verify; canonical acceptance bytes must remain unchanged. **`audit`** checks literal Git authority, real file bytes and each exact parent/merge pin; its failed assertion is retained as F1.
3. **`oracle-pin040.py`** compares actual current runner bytes to declared hashes and records the exact HEAD. It fails here; no expected-failure label is converted into contract acceptance.
4. **`merge040.py`** preserves actual current-main pending rows, restricts conflict resolution to generated outputs, regenerates from the unchanged implementation and commits before Q87 execution. The exact source/main/merge identities and changed metadata hashes are retained.
5. **`retain040.py`** rereads expected TAP counts, contract/mutation results, package inputs/tarball/log hashes, all gate object bytes, contract hashes, source/slot/grant identities and time envelopes. The original failed gate stays FAIL. Extra W0 output bytes are retained and checked across all reruns. Its overall verdict is FIX-FIRST, not acceptance.
6. **`manifest040.py`** runs after collector stdout closes, rereads every final indexed byte/size and seals the manifest. It caught one provisional-manifest mismatch from the collector's then-open log; the old manifest and exact mismatch are retained. The final 429 entries all verify.
7. **This report's verdict** combines those fresh checks and source inspection against the exact reviewed/merged commits. It does not turn upstream scoped ACCEPT reviews or the passing evaluator fixtures into proof that the production runner pin is correct.

## Limits and handoff

Contract owner: repair F1's derived pin and atomic integration history, and F2's G0 build binding, then request independent re-review on committed source. There is no new policy question from this review.

No reviewed implementation fix, contract-policy change, live engine gate, native DF01 live rerun, PAIR calibration, performance/production qualification, package publication, push or merge into main was performed. The Q87 generated metadata refresh and explicit W0 prerequisite build are fully disclosed above. BUILD_SPEC/executing-admission and qualification blockers remain; the requested pending rulings remain pending.
