# CX-M01R: merge EXP-M01 onto current main

North star: all P1-P5 NS cells depend on measurement validity (GREEN absolute windows and paired same-rung A0 comparisons). Goals/targets: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md; R43 sections 3.3 step 5 and 5.3 gap 4. Q99b remains pending.

## Result and provenance

Merged main `1a83095c` into `exp/M01-rebase`, starting at M01 `1e3c2b55`, without rewriting history. The resulting merge commit has both histories as parents; obtain its ID with `git log -1 --format=%H`. Read M01's brief and historical REPORT.md (also available in orchestrator commit `31db9cf9`), and R43. Main's entire lab/acceptance tree wins, byte-for-byte unchanged relative to the merged main. No contract version or pin edited. The acceptance pin audit found no changed pinned source path: the only acceptance references to changed harness paths are prose references to engine.mjs, not hashes. `rebase/source-hashes.json` lists old-main/new SHA256 for every carried harness path; `rebase/pin-audit.json` records the audit.

PAIR stays default-off: NS/GS do not invoke PAIR, canonical slots.json retains main's exact bytes/default hashes, and the new slots-pair.json plus TX2_SLOTS_FILE explicitly opts into cpuset s1/s3. The opt-in snapshot differs only in those two placements. Main's follower quota and optional cpuset remain intact; a follower of a measurement writer does not inherit its no-quota regime.

## Every textual conflict, per hunk

Git reported four conflicted files, nine marker blocks. No conflict was resolved by taking a whole file.

| File and marker block in merge order | Resolution and reason |
| --- | --- |
| driver.ts 1, shutdown/drain | Keep M01 probe stop/drain, round emission, censor finalization and hiccup shutdown. Also keep main's separate 300 s wait for commands already in flight before taking the feed target. Removing that wait would turn late commits into apparent feed gaps. Round finalization remains at M01's censor instant. |
| driver.ts 2, old feed shutdown | Drop M01's old early target/replay block. Keep main's later feed target (including currentPosition), 120 s catch-up, feedWind and replay after late growth is folded into the model. Guard those operations when PAIR has no feed, preserving normal NS behavior. |
| engine.mjs 1, imports | Keep Datomic staging/verification imports and spawnSync from main, add execFileSync for M01's read-only cgroup/PSI probes. |
| engine.mjs 2, Docker CPU flags | Keep main's follower identity labels, memory caps and optional cpuset in quota mode. Add M01's no-quota CPU flags only in explicit cpuset mode. Avoid duplicate/conflicting cpuset flags. |
| gate.mjs 1, functions inserted at same boundary | Retain both complete functions: M01 gatePAIR then main gateGS, each with its own return/closing brace. Neither gate replaces the other. |
| gate.mjs 2, validation/dry-run | Keep main's dry-run/OBL planning behavior and gate-specific lane rules, including Datomic for its supported gates. Add PAIR to accepted names and usage; PAIR remains X/Q only. |
| gate.mjs 3, dispatcher | Keep all main G0/G1/G2/NS/GS/G4 branches and insert PAIR explicitly before GS. |
| lab.test.mjs 1, test environment | Keep main's temporary engine directory and checkout-local TX2_CONFIG_DIR; these include M01's required isolation. |
| lab.test.mjs 2, appended tests | Keep both test groups, with separate closing braces: M01 placement/lease/verdict tests and main's writer guard, follower, cpuset parser, Datomic config-hash and resident tests. M01 tests use opt-in config; main's historical default-hash assertions remain unchanged. |

The other original M01 harness changes merged automatically: README, duet, histogram, noise/statistics/round modules and tests, wait-slot, heavy-lock, receipt rules, noise config. The automatic slots.json merge was deliberately replaced with main's bytes; M01 placement is now slots-pair.json. The original receipt remains immutable. Added lib.mjs TX2_SLOTS_FILE selection to make the CPU behavior opt-in. Full path/hash inventory is in rebase/source-hashes.json.

## Integration fixes and first failure

Main added follower and Datomic selftest admissions after M01. All three reservation paths now call the same assertMeasureAdmission check inside the pool critical section, so new neighbors cannot bypass the M01 lease. Tests cover another holder's refusal and the owner's admission. Strict VM cpuset parsing validates measurement CPU IDs; main's quota/follower behavior and eight existing X/Q effective-config hashes are exercised unchanged.

The first fresh offline gate attempt, `PAIR-xtdb-20261109T065415Z-3e0054`, failed before any rounds. Its retained stderr records sandbox EPERM when spawning the host noise probe, and a missing packages/w0/dist import introduced by main's W0 integration. The fix builds/binds W0 for NS/PAIR as well as GS; no sibling dist is borrowed. Retry uses a new run ID with --previous, and permission to read local host counters. It still uses memory, --no-vm and --no-lease: no engine slot or VM probe. The initial failure is retained, not relabeled as success.

## Offline verification

Dependency setup: pinned pnpm 10.11.0, frozen lockfile, offline install, explicit --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store; 605 packages, no downloads. No dependency/lockfile edit. Host disk was 38 GiB before admissions and 36 GiB after installation (above 5 GiB).

Commands use the shared heavy wrapper for suites and the offline memory gate. Node 22 uses NODE_OPTIONS=--experimental-strip-types so spawned TS drivers inherit it.

```sh
node lab/bin/heavy.mjs --label CX-M01R-final-offline -- node --experimental-strip-types --test lab/bench/test/bench.test.ts lab/bench/test/paired.test.ts lab/bench/test/noise.test.ts lab/bin/test/lab.test.mjs
node --experimental-strip-types lab/bench/duet.ts recompute --receipt lab/experiments/EXP-M01-paired-measurement/receipts/PAIR-xtdb-20261108T010440Z-7fcef1.json
```

The final focused suite passed **50/50**, zero skips: synthetic pair statistics and decisions, planted evidence edits refused by recompute, noise parsing/rules/round accounting, measure-lease acquisition/drain/refusal/release/stale recovery, disjoint cpuset/no-quota slots, main's follower/Datomic and default-hash regressions. The historical offline receipt recomputes **MATCH**; its recomputed verdict is INVALID, not a fresh measured PASS. Offline dry-run dispatch also preserves GS Datomic and OBL nonexecution while accepting PAIR. `git diff --check` is clean.

Fresh complete attempt: `PAIR-xtdb-20261109T070418Z-f081c3`, eight rounds, 1,366/1,366 correct reads, zero errors/violations, both arms offered/completed 63 writer operations and 652 probes. Gate build and duet steps exited zero; the build receipt records the reused direct-parent heavy grant. Expected gate verdict FAIL (absent engine identity), noise INVALID (all eight rounds excluded by signals-missing with --no-vm), primary NOT_ESTIMABLE. Fresh receipt recompute MATCH, with recomputed protocol verdict INVALID. This is successful offline pipeline verification, not a measured performance result.

The intermediate retry `PAIR-xtdb-20261109T070024Z-70518f` was stopped while replacing parent-permit handling; its queued build raced the stop and its child duet subsequently completed into raw DONE. No terminal gate receipt exists, so it remains unqualified. The fresh third attempt explicitly names it in --previous. Retained its raw output rather than adopting it. No child engine or service was started.

The wrapper regression now tests borrowing only the exact direct-parent token for the all-token lease, preserving the parent token until heavy.mjs exits and releasing the others. Gate step reuse extends main's Datomic parent-grant proof to all wrapped gates. This removes the nested-build/all-token deadlock without increasing capacity.

Targeted strict TypeScript check passed with `node node_modules/typescript/bin/tsc --noEmit --types node --target ES2023 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --skipLibCheck --strict lab/bench/driver.ts lab/bench/duet.ts`, under heavy.mjs. An initial optional invocation omitted --types node and failed with missing Node globals/types; its log is retained, and the corrected invocation exited zero.

All raw attempts, source/build content-addressed objects, logs and receipts are saved durably at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-M01R/`. `rebase/SHA256SUMS` binds every saved file, and `rebase/INDEX.md` explains the attempts. Committed review copies of the small receipts and TAP/recompute outputs are in rebase/. Bulky objects stay outside Git.

## PASS / verdict / receipt audit (rule 9a)

These are builder checks of the existing PAIR pipeline, not independent promotion certification. No code added here emits a new semantic PASS. The rebase carries these observation-to-verdict boundaries:

| Boundary | Content | Freshness | Binding and limit |
| --- | --- | --- | --- |
| driver.ts pairedAnalysis / RoundBook | Judge observed reads against expected model at driver-requested basis; all-offered and censored counts retained. | New process, unique scope and barrier/absolute start; per-round timestamps. | Arm, plan SHA, shared trace digest, requested basis and named histograms. A model check is not a complete independent NS oracle gate. |
| paired.ts decide / windowGrade; pair-analysis.ts analysePair | Ratios/bootstrap intervals, identified quantiles, noise exclusions, A/A s_d, accounting/calibration checks derive from retained rounds. | Round plan and sample timestamps from the current duet; no prior latency receipt is substituted. | Hashed config/plan and named A/B blocks. GREEN is a noise classification, not semantic acceptance. |
| duet.ts coordinator and evidenceOf | Both ready records must match subjects, trace and plan; retains histograms, signals, raw calibration, accounting and placement with hashes. | New run directory, driver lifetimes, barrier/go and sample times. | Content hashes cover exact analysis inputs; source/build/slot identity is the enclosing gate's responsibility. |
| gate.mjs gatePAIR | Builds/hashes public packages, checks slot ownership/config, contacted endpoints, image and A/A config equality, correctness, trace/accounting/calibration, registered look and placement; compares end container ID/start/cgroup. | Exclusive new run ID, new drivers/report path, live slot readbacks and start/end identities. | Source tree/diff, lockfile/toolchain/build/fixtures, selected slot-config bytes, slot owner and cgroups plus plan/noise hash. Memory lacks engine identities and must FAIL. This is not the independent evaluator's NS acceptance. |
| receipt.mjs pairVerdictOf / verdictOf and gate final write | Required identity fields and executed count fail closed before mapping pair decision/grade/departures to its PAIR verdict. | Current Run fields, exclusive append-only receipt creation. | Binds enclosing gate record; a shape check alone cannot certify source semantics. Missing placement produces FAIL, not PAIRED_DECIDED. |
| duet.ts recompute | Checks retained evidence/config hashes, accounting, calibration, exclusions and statistics/grade/verdict; planted numeric and evidence edits are refused by tests. | Re-evaluation runs now, but does not independently establish capture time. Historical MATCH stays historical. | Exact receipt evidence bytes; MATCH does not recollect slot ownership, prove genuine engine observations, or create a semantic PASS. |

Freshness and binding limitations are explicit: no live engine recollection or independently reviewed acceptance run occurred. Independent reviewer must inspect the source/slot chain and execute relevant source-bound gates before any promotion. The final cgroup readback now explicitly records a refusal when it cannot be read; missing evidence cannot stand for unchanged placement. The scope here is merge/offline compatibility, not independent PAIR acceptance.

## Live handoff / open questions

See RUNBOOK-rebase.md for full procedure, expected s_d and GREEN grading. Live XTDB s_d remains unmeasured; prediction p50 <=0.10 is not a result. Q99b, actual GREEN host/VM partitioning, two-slot reservation, and a seed-timed 75-minute window remain orchestrator decisions. No slot was taken, no residents stopped, no Docker/Colima operation, no live acceptance/NS bars, no evaluator integration/promotion, no merge into main and no push. No full pnpm check or external-service suite was run for this harness-only change.
