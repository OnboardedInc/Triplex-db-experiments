# RT01 pin changes for contract 0.4.0

Final main-ref confirmation: **`2fbc4ff394810ac78cbc6a1051a32b7caa222116`** still has contract 0.3.13 and byte-identical authority/all 243 pinned paths; only `lab/NOTEBOOK.md` and `lab/STATE.md` advanced after the inventory. Retained as `pins1/main-ref-confirmation.json`.

Inventory taken against **main `3e403d80ce3e667fb2fb3e2a211accb484da6b23`**, contract **0.3.13**. RT01 parent is `472c2c2439922b52e33206510b6cecb0812206ed`; its fork with main is `59e07afb7a25dfb22bca60f8d769b74651aa835a`. Round 5 changes only an unpinned XTDB test and these handoff/evidence files. No acceptance, oracle, workload recipe, target, seed, offer schedule or performance window is edited by round 5.

The read-only [pin_inventory.py](round5/pin_inventory.py) inventories every `{path, sha256}` record, path-keyed SHA256 map/input and path-keyed pin object in current main's `obligations.json`, then expands its referenced SHA256SUMS manifests. It covers **302 direct pin references / 243 unique repository paths**, or **602 references / the same 243 paths** after manifest expansion. All path hashes/classifications and reference locations are retained in durable `round5/pins1/inventory.json`; all three index diffs are retained beside it. Images, Git tree identities and abstract schema placeholders are not file paths and are not silently converted into file pins.

## One pinned source path changed by RT01

| Path | Main 0.3.13 source and pin sha256 | RT01 source sha256 |
| --- | --- | --- |
| `packages/testkit/src/index.ts` | `cb89a55ced5426b8fa0af3523fbbeb73870e61e3622ebb42e8a78c3e67da8d28` | `995bc1ace5ebb9654a74e238b8860cb7e8f012a979c7c4cf86d03388efd935c7` |

Main has three active projections: `/oracleFilesPinned/O-TESTKIT/0`, `/caseSets/CS-U44/pinnedSourceFiles/0`, `/caseSourcesPinned/CS-U44/0`. The same hash also occurs in `/pinChanges0313/testkit`, the reviewed 0.3.13 pin metadata. The 0.4.0 builder must make its active projections and source validation agree with the **final integrated bytes**, while preserving the provenance of earlier reviews. The old `6001458f...` hash in RT01's earlier round reports belongs to its original base contract, not current main.

Per-hunk review below uses `testkit-main.diff`; main-side line numbers are bound to the SHA above. RT01-only changes are cross-checked against `testkit-RT01.diff` from the common fork.

| Hunk | Change and reason | Effect on measured workload / correctness cases |
| --- | --- | --- |
| `@@ -1744,8 +1744,8 @@` — `transact records provenance datoms` | Require absence of `:_tx/instant`, rather than its presence. R33/Q90e forbids a journal value containing its transaction's own decided instant. | **Correctness expectation changes.** Submitted write, actor, match request and case count do not change. This is not a frozen performance-trace change. The product's smaller/different journal representation changes physical storage/commit work and must be measured; this is not evidence of cost equivalence. |
| `@@ -1826,7 +1826,7 @@` — `conditional transactions are atomic and journal their changes` | Compare the assertion's default `validFrom` with `committed.stagedAt`, rather than `committed.instant`. R33 separates staging/default valid time from decision/record time. | **Correctness expectation changes.** Commands and parameters are unchanged; the comparison now admits the required distinct decision instant. No generator, row-count target, query mix or schedule is changed by this hunk. |
| `@@ -2621,8 +2621,8 @@` — `transaction journals cannot be retracted through ordinary writes` | Select the immutable `:_tx/position` datom for the forbidden-retraction probe because the instant datom no longer exists. | **One correctness request's target changes** from the instant metadata row to the position metadata row; the denied-write expectation remains. The case still performs the same number of operations. It does not alter the measured background/performance trace, but it is not a byte-identical correctness case. |
| `@@ -2886,14 +2886,8 @@` — exports | RT01 adds exports for `record-time-conformance`, `record-time-schedules` and `record-time-determinism`. The apparent removal of main's `routeEquivalence` / `routeHistory` exports is fork divergence: those were added on main after this branch forked. **Preserve those main exports at integration.** | Export additions make T1–T12 and schedule/determinism helpers available; they do not append to the existing 44 `triplesConformanceCases` or automatically run a measured workload. New correctness suites have their own declared inputs/denominators. Module/setup cost is not qualified by a source review. The main-only export removals are not an intended RT01 workload/API change. |

The runtime stamp/gate/encoder and journal fixes change product behavior and commit cost; they are not claims of workload equivalence. G6 still needs the live client-side A0 scope-wide stamp-scan measurement required by Q96b, in addition to other live qualification. The pinned workload recipes `packages/qualification/src/native/xtdb-workloads.ts` (`ff39d3f2fcb74ee2a318e8801a12680a4f9f366b4a7f5ed9e20e89d5ccd8a3d0`) and `packages/qualification/src/native/qlever-workloads.ts` (`9349878403ee468ce6b64922c648d88f598f799b1c65fc42a712aa47598e54da`) are byte-identical between main and this branch. The inventory finds no RT01-moved pin for the frozen trace/world/golden sources.

## Pending 0.3.14 must be composed, not overwritten

Observed review branch: `contract/0.3.14` at **`bed67f1f47914d519f73e6ea1ebdee098c9cb4ec`**, still in review. Its testkit source and active pin are **`2c26c678577f98a71003588c7c62b9a81ff6d109a033c72c521f295f4cb2ffdd`**. Relative to current main it adds `export { exactIntegerLimitCase, valueLimitCases } from "./valueLimits.js";` near line 12. That is a separate owner's export addition, not an RT01 deletion or authority to re-pin it here.

Preserve the 0.3.14 value-limit export, current main's route exports and RT01's three record-time exports; apply RT01's three correctness hunks. **Neither the bare RT01 hash `995bc1...` nor 0.3.14's `2c26c6...` is asserted to be the merged 0.4.0 hash.** Compute and review that hash from the final integrated source, after the pending contract's disposition. New record-time helper/property files also need whatever source closure the 0.4.0 owner selects; this report does not invent new pins or change their scope.

## Other literal main/branch pin differences are upstream-only

For completeness, the inventory also finds these eight paths with different/missing bytes in the old worktree. Every one is unchanged by RT01 from the common fork (or absent at both fork and branch). **They are not proposed RT01 re-pins, reversions or deletions. Retain current main.** In particular, do not copy this worktree's older acceptance files over main. There are no RT01 hunks or RT01 workload changes in these paths; their upstream contract changes remain their owner's authority.

| Path | Current main sha256 | Old worktree sha256 |
| --- | --- | --- |
| `lab/acceptance/RULINGS-PENDING.md` | `42f0ba89780694d876c7cb41d912a31ede858d8ef11a0ef5a916e58872c7339e` | `35cf55dfc06cf8f691814d478e06a972a71cba368907b38e7eac28e14187b91e` |
| `lab/acceptance/RULINGS.md` | `c2535ca27faefba04e85cb9e1456f6481a341a0433a205a204cf5ae1d41e1d59` | `b516dcd342a4872e017cbffe21a2e1a69e7b8c228bcb199357ea02a70f08650e` |
| `lab/acceptance/budgets.json` | `c7f72c715b74c4630ef13b6e62b8c8a387b4ec318f205044cdfd640166ca2dc2` | `c09b5257c08d050d9c99d8e1595cd4817b9c8c1337afba291109e7fd0c7a8159` |
| `lab/acceptance/build_contract.py` | `07c98812ec83fe8a7e32dd09418d40522b48b3dc53e2d5f3df6f7007288d98e5` | `914db3d15e91180e8b449fffeeb27b997dc10eb835fff66e10eca6517e985b59` |
| `lab/acceptance/load-contract.json` | `c37bb4499b0bceec0d020388ffab6f53db16433b27616e008f692860ace186c6` | `c54af6122604a7cbe49c4de41ba658f9076cea8701f90cc4e3583f1cad009428` |
| `lab/acceptance/oracle-contract.json` | `82b3b4e0e774553a38ab4750abb6fc61b2d89431aeb3002f7692d3124fa80fb9` | `a7ec2fe98f8bb066fe6ea55e89344905f5e9c760b076152f5377c414d18adbd0` |
| `lab/experiments/EXP-A01-acceptance-contract/evidence-0.3.13/authority-and-pin-review.json` | `b1f7dd9f18527b5f374b80ef2afe161d104781e273fe2d881c376f8ed890a26b` | absent |
| `lab/experiments/EXP-A01-acceptance-contract/evidence-0.3.13/testkit-index.diff` | `ff037fd9eb720d2e167d8a6e8452c52d97a73e91f554f43719cce613fddf3d3f` | absent |

No `lab/acceptance/` edit, contract generation, re-pin, oracle change, main merge or push was performed. The manifest inventory and hunk review are a source handoff, not a workload-performance or live-engine PASS.

## Round 6 addendum — marker CAS, 2026-11-09

The full pin inventory was refreshed against main `bb36862daf55b4f46a3cbf763f757c6341de4575` (contract 0.3.13): 302 direct / 602 expanded references, 243 paths. The sole RT01-moved pinned path and hashes in the table above remain unchanged. Round 6 changes no pinned path; preserve the pending 0.3.14 export integration already described above. Current immutable-main inventory and diffs are in durable `CX-RT01/round6/pins1/`.

The unpinned `packages/xtdb/src/XtdbStorageAdapter.ts` moves from live2 SHA256 `21c06369578fed274e64439c6c3ab10cfe66ffe44a5e519f1ee14640811c3735` to `9d5d81fcca365bc3195572aac6cc0233579e504a33c76f0017945bbe28dbc81f`. Per hunk: the new shared predicate reads the stamp by exact `_id`, scope and prior position; compact substitutes it for MAX(stamp); A0 substitutes the same predicate and reuses PostgreSQL parameters (four parameter entries become three). **Measured work changes**: the stamp branch becomes a key lookup, with no extra statement/round trip; A0 also sends one fewer parameter. The existing position aggregate, allocator/retry semantics, actual input facts, complete journal/receipt writes, workload recipes and offered schedules are unchanged. This is a candidate performance improvement, not a no-regression result.

The model/shape test and transport fixture adapt to that predicate; six independent SQL-interpreter CAS regressions add stale-stamp rejection, recomputation and key binding. They change correctness-test work, not offered performance inputs. Round-6 live admission stopped for G03 VM probes, so native plan/scan cost and fresh/10k G6 on this guard remain unqualified. See REPORT round 6 and its runbook; no contract generation or acceptance/oracle edit was performed.
