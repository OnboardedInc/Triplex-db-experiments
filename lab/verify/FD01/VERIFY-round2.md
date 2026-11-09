# CX-VFD01 round 2: FIX-FIRST

North star: P3 correctness and trustworthy publication-to-durable-known lag, under `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` 1.1 P3 and Q98a–j. Offline review of **b60cce1e5acd3f9bf3a3ae4f697271867692eac2**, `exp/FD01-feed-contract`. No implementation fixes, engine operations, merges or pushes.

## Verdict

**FIX-FIRST.** Round 1's atomicity finding is fixed on the requested variants. Missing publication observations and incorrect lag claims against an independent publication record are now rejected. One remaining measurement issue is reproducible: equal clock labels do not establish a common clock origin. Two real Node processes produced an accepted **122.352749 ms** interval for an independently measured **402.365375 ms** publication-to-known interval. This crosses the 250 ms bar in the wrong direction.

The complete updated host feed suite freshly passed **13/13**, including its 900 crash trials and mandatory keyed/unkeyed split controls. This does not qualify a live lane, the missing source observer, or P3 with 256 readers.

## R2-F1 — Medium: clock-label equality accepts incompatible process clock origins

Locations at reviewed commit: `packages/core/src/feed/index.ts:179–209`, especially 195–209; `lab/bench/lib/feed.ts:124–125`; `packages/testkit/src/feed/index.ts:256–264`.

`publicationLagMs` verifies position identity, nonnegative intervals and equality of a caller-supplied `clock` string. `FeedConsumer` defaults that string to `"host-monotonic"` even though `now` is an arbitrary callback. There is no clock-origin observation or source-publication provenance in this check. Distinct labels fail, but separate clocks using the same default label pass.

Fresh reproduction: `round2/cross-process.mjs` starts a source observer process, then starts a consumer process later. Each samples its real `performance.now()` and its common-host `process.hrtime.bigint()`. The source publication sample is **297.671542 ms** on a process whose time origin is **1794203550612.462 ms**. The durable-known sample is **420.024291 ms** on a process whose origin is **1794203550892.475 ms**. Both samples use the accepted label `host-monotonic`. The unmodified helper returns **122.352749 ms**; common-host monotonic samples show **402.365375 ms**. No clock was changed, no database engine was involved, and the arithmetic is over real observations from two local processes.

The actual `FeedConsumer` also accepts deterministic fixtures with a late publication-map value or skewed durable clock: true publication 100, true durable knowledge 400, but supplied publication 200 or supplied durable knowledge 300. Both advance checkpoint 1 and emit 200 ms. Correct observations emit 300 ms; missing observations refuse progress and leave checkpoint 0. `auditFeedLag` likewise accepts a substituted publication observation and a matching understated claim.

Scope of the finding: these checks correctly compute the difference between the supplied records; they cannot prove those records came from the publication event. The builder explicitly defers the real source observer to P3M, and the existing driver has no observer integrated. Therefore this is a remaining **measurement-conformance boundary**, not evidence of a falsely promoted live receipt. It prevents accepting the stronger claim that the new seam rejects arbitrary later timestamps or cross-process skew.

Proposed fix: make the clock domain explicit and origin-bound, remove the permissive default when accepting external publication observations, and provide a shared capture/normalization primitive for both processes (for example, common-host monotonic `hrtime` observations with a bound host/boot domain). Reject incompatible relative origins unless a bound conversion is supplied. Bind per-position observations to the actual producer's publication record, rather than accepting an ACK/poll timestamp renamed as publication. Add this two-process counterexample and the late-map case to the source-observer integration gate. No library can infer an arbitrary callback's truth from a number and a string alone; the producer observation is part of the required evidence.

## (a) Atomicity variants: rejected as required

The independent `atomic-child.mjs` uses real SQLite files and abrupt exit 77. The parent reads effects, affected identities and checkpoint **before replay**, then invokes the unchanged round 2 `auditConsumerAtomicity` against independently authored whole-old/whole-new expectations. Five requested stop phases are exercised per implementation, once each; the original suite separately runs its 100-per-phase repetitions.

| Implementation | Observed result |
| --- | --- |
| One transaction, one writer connection | All five snapshots accepted |
| Checkpoint written first, effects later, both in the same transaction | All five snapshots accepted; statement order within a transaction is safe |
| `BEGIN` on A, checkpoint autocommitted through B, effects written on A | Rejected before first COMMIT and after-effect: checkpoint is durable while effects roll back |
| Checkpoint committed first, effects committed in a second transaction | Rejected after the first COMMIT and after-effect |
| Effects for message 1 committed with checkpoint still at message 0 | Rejected after COMMIT and after-checkpoint |
| `BEGIN IMMEDIATE` on two separate writer connections to the same SQLite file | SQLite refuses the second writer with `SQLITE_BUSY`; no crash observation or PASS is manufactured |

There were **25 actual abrupt stops** across the five runnable implementations plus one explicit lock-refusal case. Some individual stop phases produce a valid whole state even for a bad implementation; each bad implementation is rejected by at least one required phase. This is why the complete phase matrix matters. The original store implementation remains unchanged and uses one transaction.

Round 1 F1 is **closed for the tested offline contract**: its exact keyed-split control now fails before replay, and the new independently authored connection/order variants do not survive the full snapshot matrix. No actual lane crash/recovery or external effects were tested.

## (b) Publication provenance and clocks

The corrected actual consumer reports 300 ms for publication 100 / durable-known 400 despite record stamp 399. It rejects absent publication data before checkpoint advance. Core also rejects explicitly different clock labels. These parts of round 1 F2 are fixed.

Keeping the independent publication record fixed at 100 makes a later start visible: claims of 1, 200 and 260 for durable-known 400 are each rejected as `Lag differs from source publication interval`. Replacing the supposedly independent record with a later value, or relabelling incompatible process clocks identically, still succeeds. R2-F1 is the remaining issue. Source observer provenance and a common numerical time domain must be established outside plain interval arithmetic.

## (c) What the 300 ms control proves about 200 / 260 ms

The 300 ms fixture is exact, not a loose threshold assertion. A computed/reported 200 or 260 for its fixed 100→400 observations fails. Fresh negative probes reject both incorrect claims.

For **different, truthful intervals**, `auditFeedLag` accepts 200, 250, 260 and 300 and returns those exact values. That helper audits measurement integrity; it does not adjudicate the performance bar. The existing NS driver applies `p99Ms <= 250` at `lab/bench/driver.ts:908`, so 200 and 250 pass that comparison, 260 and 300 fail. This was checked by source inspection and deterministic interval probes, not a live benchmark or an execution of the full NS driver. The 300 fixture alone is not a regression test of the threshold boundary or a pooled p99. R2-F1 can nevertheless understate a true above-bar interval below that boundary.

## (d) ERESOLVE: offline metadata artifact, not the reported peer-range defect

The retained builder log at `CX-FD01/round2-pack/triplex-pack-rhW0cq/npm-cache/_logs/2026-11-09T05_39_09_616Z-debug-0.log` shows npm trying to resolve **effect@4.0.3**, a registry packument **cache miss**, then `Found: effect@undefined`. The root consumer requests exactly **4.0.3**, and the core peer is exactly **4.0.3**. I independently extracted all **13** tarball manifests: every Effect peer is exactly **4.0.3**. There is no contradictory Effect range in those bytes.

My minimal fresh offline consumer with the original core tarball, Effect 4.0.3 and an empty owned cache reproduces the same `ERESOLVE` / `effect@undefined`. This failure occurs because the offline resolver has no Effect metadata, not because 4.0.3 fails a 4.0.3 peer requirement. The error is an **offline cache/harness artifact**, not a demonstrated user-facing Effect peer incompatibility. It is not an OS filesystem-sandbox denial either.

A follow-up local dependency repack succeeded for Effect, then failed for ulidx because npm invoked its installed `prepare` hook (`simple-git-hooks`, absent) despite `--ignore-scripts`. That is a **reviewer harness failure**, retained separately; it does not establish any Triplex peer defect. The corrected probe creates tarballs without package hooks, but was not rerun after disk fell below the lab's 5 GiB threshold. Thus I have **not** proved a successful clean consumer installation, all 13 packages installing together, registry availability, or packed runtime/type behavior. The offline package gate remains unqualified; the specific peer-conflict interpretation is unsupported by the actual manifests and cache-miss evidence.

`record-final.log` retains a subsequent reviewer metadata-path typo (ENOENT), corrected before the successful final receipt. It is not counted as a gate outcome.

## Fresh evidence and reproduction

Durable root for this round:
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VFD01/round2-a98211df-51b4-4de0-8b71-5feaf66dc6a9/`.

| Path | Role |
| --- | --- |
| `source.json`, `subject/` | 43 exact Git b60cce1e preimages, including reviewed feed sources, tests, oracle and original mutator; SHA256s |
| `probes.json`, `*-{before,after}-*.db`, `consumer-*/` | Actual atomicity snapshots, helper lag probes and actual-consumer correct/late/skew/missing fixtures |
| `cross-process.json` | Real two-process clock-origin counterexample, including raw host-monotonic observations |
| `package-probe/` | First package experiment: cache-miss reproduction, Effect tarball, logs and retained failed ulidx repack |
| `review/` | Verifier tools, fresh baseline output, logs, peer-manifest extraction and review receipt |

Tools, compact test reports and `SHA256SUMS-round2` are in `lab/verify/FD01/round2/`. Manifest paths are relative to the durable root. Bulky source/cache/dependency artifacts remain outside Git. No acceptance file or pinned implementation path was changed by this review.

The worktree remains based on the round 1 review commit. The verifier exports exact b60cce1e objects into the durable subject directory and resolves reviewed imports there. It does not modify or execute mutable builder source, and does not change the main checkout. The already-installed main Vitest 5.0.4 binary is used read-only; Node is 22.23.2, SQLite is 3.51.3. This is source-level offline verification, not a package-build qualification.

Reproduction, while at least 5 GiB host space is free:

```sh
NODE_OPTIONS="--import=$PWD/lab/verify/FD01/round2/hook.mjs" node lab/bin/heavy.mjs --label CX-VFD01-R2-baseline -- node /Users/sam/projects/triplex-db-2/node_modules/vitest/vitest.mjs run --configLoader native --config lab/verify/FD01/round2/vitest.config.mjs
node lab/bin/heavy.mjs --label CX-VFD01-R2-probes -- node lab/verify/FD01/round2/probes.mjs
node lab/bin/heavy.mjs --label CX-VFD01-R2-cross-clock -- node lab/verify/FD01/round2/cross-process.mjs
```

Resource note: baseline/probe/package wrappers were submitted with about 5.1–5.2 GiB free. Free space fell below 5 GiB while jobs were queued. The final clock wrapper was inadvertently submitted after its displayed preflight was already below threshold; it completed a sub-second two-process check. This is a reviewer admission error, not a resource-qualified performance result. A start-time disk guard was subsequently added to the probe entrypoints; these guard additions postdate the recorded runs. No further heavy runs or package retries were started below threshold, and no unrelated data was removed to create room. Ordinary report/index writes are small metadata work.

## PASS / verdict audit (rule 9a)

| Result site | Content | Freshness and binding |
| --- | --- | --- |
| Original host Vitest baseline | Requires actual 13 passed / 0 failed, including 900 crash trials and fresh O-REPLAY test | Fresh report times and exact exported b60cce1e test path; reviewed aliases resolve to immutable source preimages; no engine/slot claims |
| `round2/probes.mjs` | Checks abrupt exit status, complete SQLite snapshots, valid/invalid atomic cases, exact lag values/errors and checkpoint outcomes | New files per implementation/phase and actual consumer mode; all 43 target-source hashes checked before and after; explicit deterministic clocks |
| `round2/cross-process.mjs` | Requires actual common-host elapsed >350 ms, accepted relative-clock lag <250 ms and nonnegative | Two newly started local processes and fresh samples; retains each origin, relative reading and common-host nanoseconds; calls reviewed helper |
| `round2/package-probe.mjs` | First stage requires exact ERESOLVE/undefined Effect; later stage fails rather than declaring success | New owned consumer/cache; original builder core tarball; failed prepare log retained; corrected tar-only runner is explicitly unexecuted |
| `round2/record.mjs`, receipt and manifest | Verifies baseline counts, source hashes, concrete atomicity rejections, clock counterexample and exact 13 peer manifests; records package-control incompleteness | Exact b60cce1e Git objects, per-round files, original tarball/log paths; checks reviewed sources unchanged; hashes retained bytes and copies current tools with guard changes identified |
| This verdict | FIX-FIRST follows the observed clock-origin undermeasurement, with atomicity closure and package interpretation kept separate | Narrow offline scope; no source observer, slot, live lane, performance or package-install PASS inferred |

No production code was fixed. No fresh G0/build/pack qualification, native feeds, live source publication observer, 256 readers, O-DOMAIN fanout, erase/excision/restore, engine crash recovery or end-to-end P3 latency was verified. The historical 11.112791 ms write p99 remains a component prediction miss and does not independently decide the 250 ms lag bar. Open work is a bound common clock/source-publication observer and its skew/later-record falsifiers, plus a clean package-consumer install with complete offline dependency bytes or authorized registry access.
