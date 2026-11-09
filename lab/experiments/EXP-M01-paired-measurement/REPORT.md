# EXP-M01 paired measurement protocol PAIR-0: report (saved by the orchestrator, 2026-11-08 01:16Z)

**Bottom line:** PAIR-0 is built and tested offline; the live A/A duet did not run because two 3.5 GiB XTDB slots can never fit beside both dev
residents (pool 11 GiB, residents 6.5, so at most 4.5 free: one slot; EXP-N01's A0 held s1 throughout) and all four heavy tokens were held
(V-X02, J01 x2, V-D01c, W01). Branch `exp/M01-paired-measurement` final 1e3c2b5 (main work 45a6fd4); raw archives compressed in
/Users/sam/Claude/Projects/triplex-db-2/EXP-M01/; receipt lab/experiments/EXP-M01-paired-measurement/receipts/PAIR-xtdb-20261108T010440Z-7fcef1.json.
No slot or lease taken; nothing left running.

## Results without engines (diagnostic)
| Run | Result |
| --- | --- |
| A/A through the PAIR gate (memory composition, development round sizes; FAILed by design) | s_d log p50 0.0142, log p99 0.2283 (5 usable rounds); slot bias at p50 0.9988 [0.9814, 1.0165]; window INVALID (R03, R06 excluded by calib-drift-vm, R04 by calib-drift-host); VM PSI cpu-some 0.24-0.32, neighbours 4.2 cores, hiccups up to 71.6 ms (VM) and 60.7 ms (driver); `duet.ts recompute` MATCH |
| A/B with a known effect (6 ms against 3 ms service) | FASTER_BY_TARGET at the 8-round look (98.2%): commitAll p50 ratio 1.693 [1.676, 1.723], read-probe p50 1.846 |
| Synthetic rounds (R22 model, rho 0.8, 660 commands, 100 reps) | p50 coverage 91-93% at true 1.0, 1.25, 1.6 at 8 and 12 rounds; A/A false positives 9% (8 rounds), 7% (12), matching R22; the procedure's own check 12.5% +- 2.3% |
| Throttled shares (lifetime, from status) | xtdb-dev 67%, qlever-dev 8%, xtdb-s1 1% (quota regime) |
Risks recorded before the live run: XTDB seeding ran about 120 facts/s while screening bursts offer 750 facts/s, so commitAll p50 may become
NOT_ESTIMABLE (fallback series `screening-r4`, 4x steady rate, no bursts, unruled); the calibration-drift rule excluded 3 of 8 offline rounds at
host load 17-21 (drifts 0.82, 0.81, 0.74 against [0.85, 1.18]), enough for INVALID; thresholds stay as pre-registered until a recording week.

## Built (per file)
paired.ts (pooled-quantile ratios with a round bootstrap, bit-identical to Histogram.merge; censor-robust quantiles; per-round log ratios, s_d,
slot bias, exact sign-flip to 16 rounds; A/A procedure check; decide() for superiority and hold with R22's too-noisy projection in log space;
round planner reproducing 0.28/0.39/0.17; window grade; synthetic generator). noise.ts and lab/config/noise.json (round plan aligned to the burst
period; host sampler; a read-only Python agent in the VM over one colima ssh session for /proc/stat, PSI, cgroup counters, calibration spin and
per-second hiccup maxima; pre-registered rules; the neighbour rule applies only once partitioned, else the window caps at AMBER). rounds.ts
(per-round committed, censored and all-offered commit histograms and the same for the read probe; per-second goodput and max; offered-list
digest). driver.ts (`--arm`, `--round-plan`, `--barrier-dir`/`--start-at-abs-ms`, open-loop read probe at 20/s, worker hiccup meter; NS mode
unchanged: offline regression 31,077 reads, 0 violations). hist.ts recordCorrectedUs. duet.ts (barrier-started drivers, recorder and calibration
per round, sequential looks in A/B mode, evidence with hashes, `recompute`). pair-analysis.ts (the one function producing stats, noise, checks).
gate.mjs PAIR gate (system and placement split per Q67g; lease; restart check; verdicts PAIRED_DECIDED, PAIRED_INCONCLUSIVE, INVALID_NOISE,
INVALID, FAIL; G0 runs the new tests). receipt.mjs REQUIRED.PAIR, pairVerdictOf, placementProblems, PAIR_LOOKS. engine.mjs cpuset regime
(`--cpuset-cpus`, no `--cpus`; quota slots keep identical config hashes), effective cgroup values in owner.json, status shows regime, throttled
share, VM PSI, pool admission refused under another holder's lease. heavy-lock.mjs acquireMeasureLease. slots.json xtdb s1 vCPUs 0-1, s3 2-3,
cpuset regime. wait-slot.mjs `--slots N`, `--lane`, `--after none`. Tests: bench 23/23, lab/bin 19/19, tsc clean.

## Receipt format (tx2-gate-receipt/1, gate PAIR, pair block tx2-pair-receipt/1) for contract 0.3.10
Top level: verdict, pairVerdictReasons[], counts, lease, isolation. pair: mode aa|ab, rounds, roundsPlanned, registeredLooks [8, 12, 18, 24],
claim, series, planSha256, noiseConfigSha256, composition, regime, devOverrides[], looks[], stoppedAfter, samples. pair.workload (shared, Q67g):
trace digest, seed, params, generatorSha256; rung, seededSubjects; schedule; offered.perRound with digests; probe settings. pair.arms.A|B: system
(composition, imageId, repoDigests, configSha256 without slot, publish, volume, cpuset) and placement (slot, container, containerId, startedAt,
endpoint, slotConfigSha256, regime, slotCpuset, effective cpuset, cpusetSize, cpuMax, cpuWeight, memCapBytes, nanoCpus, cores,
perCoreDenominator, throttled share start and end); contactedEndpoint. pair.evidence (each one JSON string with sha256, Q67f): analysis, rounds,
histograms `R<nn>.<A|B>.<metric>` (tx2-loglinear-hist/1: commitAll, commitCensored, commit, probeAll, probeCensored, probe), signals with exclusions
and rules, calibration (all unit times), accounting, placement, noiseConfig. stats (primary commitAll q0.5; p50, p99; metrics with per-round
ratios and the A/A block; planner), noise (aa, exclusions, rules, partitioned, windowGrade, counts, calibration.ref), checks.
Recompute (`node lab/bench/duet.ts recompute --receipt FILE`): verify every evidence hash and the noise config hash; round count a registered
look; accounting (commitAll = offered; commit + censored = commitAll; tallies; equal offered digests); calibration signals; re-apply rules;
pairedRatios over usable commitAll rounds; decide(), window grade, placementProblems; map to a verdict and compare. Unit tests run the round-8
counterexamples against recompute and each fails (made-up interval [0.1, 0.2], relabelled grade, committed-only histogram as commitAll, no
evidence, an edited evidence item).

## Author's decisions (ruled Q69)
A fourth verdict INVALID for protocol departures; A/B mode without interleaved A/A rounds (grade from all-round s_d, conservative); rounds use the
trace continuously (no per-round window randomization); gate default composition `public`, `public-queued` recommended for the live run. Merge after
EXP-N01's A0 releases s1 (s1 and s3 become cpuset slots and a running quota s1 would fail its config-hash check).
