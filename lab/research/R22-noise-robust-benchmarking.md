# R22: Noise-robust benchmarking on the shared triplex-db-2 host

Written 2026-11-07 by research agent R22 (Sonnet xhigh); saved by the orchestrator. Evidence tags: **[S]** a cited source read, **[M]**
measured by R22 on this host on 2026-11-07, **[I]** inference. Scripts and outputs: `/Users/sam/Claude/Projects/triplex-db-2/R22/`
(`noise-acf.js`, `noise-long.js`, `power-sim.js`, `paired.ts`, `collect-vm.sh`, three `*-result-2026-11-07*.txt`). No repo edits, no
container started, no downloads (papers read through WebFetch).

## Answer
Stop comparing runs and compare paired rounds. Run A0 and the candidate at the same time (a "duet") on two identically configured slots,
each replaying the same trace window, for 12 rounds of about 150 s (24 at most). Compare pooled p50 and p99 per arm with a bootstrap that
resamples whole rounds, never single commands. Claim "faster by 1.25x" only when the 95% interval of A/B is at or above 1.25, claim "holds"
only when the upper bound of B/A is at or below a margin set in the brief (1.10 proposed), otherwise INCONCLUSIVE. A window is too noisy
when an A/A control in the same window shows 1.25x cannot be resolved within 24 rounds (log-ratio sd above 0.39; above 0.28 means 24 rounds
instead of 12), or when a pre-registered hard signal trips.

**Five findings that change the plan**
1. **Only simultaneous pairing cancels this host's noise [M].** Two concurrent processes' 5 s window medians correlate 0.985; window medians
   60 s apart in one process correlate 0.08; alternating blocks of 60 s or more share almost no noise.
2. **The `--cpus 2` quota is itself a noise source [M, S].** The busiest slot used 1.9 cores while 77% of its 100 ms periods were throttled.
   Measurement slots should use a cpuset and no quota.
3. **VM steal time is always 0 [M].** Working signals: guest PSI, cgroup counters, host memory pressure, a fixed-work calibration.
4. **A p99 claim needs about 25,000 commands per arm [M, I].** The frozen trace's steady rate is about 1.1 commands/s, so a 120 s window holds
   about 131 commands; no 95% interval for p99 exists below n = 299 [S]. Rounds must contain a burst (about 3,300 commands) or a screening
   profile must raise the rate.
5. **Host and pool are saturated [M].** Host load 11 to 15 on 12 cores, 1.65% idle, memory pressure level 2 (WARN), swap 27.5 of 28.7 GB;
   pool 11 of 11 GiB reserved by four containers, all four heavy tokens held.

## 1. Run order and pairing
```
sequential   A A A A A A | B B B B B B        noise differs per half; drift looks like effect
alternating  A B A B A B A B                  period of host noise can alias with the order
ABBA         A B B A | B A A B                cancels linear drift; needs noise slower than a block
RMIT         [B A][A B][B A]...               order randomized inside each round; blocks randomized
duet         A and B at the same time         cancels any noise both arms see together
```
| Design | Evidence | Verdict here |
| --- | --- | --- |
| Single or consecutive trials | Abedi and Brecht on EC2 traces: a single trial reported identical systems differing by up to 37.8% at 95% confidence; consecutive designs falsely flagged 4 to 15% of comparisons [S] | Stop |
| Interleaved trials | Fixed most false differences but fails when environment changes are periodic near the trial length; randomizing order per round fixed that [S] | Acceptable fallback |
| RMIT | Repeatable on EC2 traces [S]; Google Benchmark reports random interleaving cut variance 40% on average (their claim) [S]; Mytkowicz et al. and Maricq et al. say randomize setup and order [S] | Use the randomization in every design |
| Duet | Bulej et al. (ICPE 2020): CI width fell 2.3x to 12.5x (mean 5.0x) on ScalaBench and DaCapo, 23.8x to 82.4x on SPEC CPU 2017 against random interleaving at 99% bootstrap CIs; shuffling pairings removed the gain [S] | Primary design |

Duet caveats [S]: the arms compete, so in public-cloud examples a true 2.0x read about 1.3x (ratios compressed toward 1, anti-conservative for
"holds" claims); arms with different bottlenecks share interference less; it needs capacity for both arms at once.

**This host's noise [M].** Probe 1: two concurrent busy processes, 90 s, about 24 ms units (n = 3,416 and 3,412). Probe 2: one process, 600 s,
about 10% duty (n = 2,929).
| Quantity | Value |
| --- | --- |
| Unit-level correlation between concurrent units | 0.68 |
| Concurrent window-median correlation, 1 s / 5 s / 15 s | 0.944 / 0.985 / 0.999 |
| Same-process autocorrelation at lag 20 ms, 100 ms, 0.5 s, 1 s, 2 s, 5 s | 0.56, 0.25, 0.10, 0.075, 0.04, 0.01 |
| sd(log median) for 5, 15, 30, 60, 120 s windows (probe 2) | 0.062, 0.054, 0.048, 0.046, 0.034 |
| Lag-1 correlation of consecutive window medians, same windows | 0.64, 0.57, 0.37, 0.08, 0.27 (n = 5 at 120 s) |
| Fixed 140 ms task, 5 runs of 40 reps (host node, host python, 2 in-VM python): CV, max/min | 17 to 31%, 1.9 to 3.7x |
| Same runs: min across runs vs p50 across runs | min 130 to 143 ms (9% spread); p50 150 to 182 ms (21% spread) |
| 1 ms sleep overshoot in 4 s windows (host and VM) | p99 1.2 to 2.1 ms, p99.9 3.0 to 4.7 ms, max 3.8 to 8.6 ms |
Interpretation [I]: most variance is fast jitter that averages inside a block; the slow component is small in a calm 10-minute slice (sd of
60 s medians 0.046) and decorrelates within 30 to 60 s; the lab's "2x to 3x between runs" is regime change over hours (other agents' engines,
memory pressure, quota throttling). Only simultaneous pairing shares that regime; ABBA with blocks of 60 s or more shares almost none of the
fast noise.

**Defaults.** Rounds: minimum 8, default 12, maximum 24; one round is one measured block of about 150 s with both arms (the cluster bootstrap
is anti-conservative below 8 blocks: A/A false positives 11 to 26% at m = 4). Pairing unit: same trace window, same round, both arms; in a
duet both arms receive the same command (same `seq`, same scheduled time) but only whole blocks are independent. Randomize per round the
trace window (seeded, identical for both arms) and, in ABBA mode, ABBA or BAAB. A/A rounds: three in the pre-flight, then one per six
measured rounds (slot bias, noise sd, false-positive rate in the actual window). Same-engine ABBA is the fallback when one slot is free or the
arms differ only in the driver's composition: 60 to 120 s blocks, drop the first 15 s, randomize pair order. Replication level [S, I]
(Kalibera and Jones): all rounds share one engine process per arm, so process-level variance is a constant offset; for acceptance claims run
a second pair of container lifetimes with roles swapped (JMH's fresh fork per measurement).

## 2. Statistics for tail latencies
**Estimator.** r = q_A / q_B for q = 0.5 and 0.99 after merging each arm's per-round histograms; percentile interval from a cluster bootstrap
resampling rounds, 2,000 resamples, on log r. Commands inside a round are not independent; Kalibera and Jones: repeat at the highest level
with random variation and report an effect-size CI [S] (their Fieller interval is for means; tails need the bootstrap). Not the mean of
per-round p99 (about 130 commands per round makes it the second-largest value). The percentile bootstrap is too narrow at small n and poor for
quantiles at small n [S, Hesterberg 2015], hence the A/A false-positive simulation and `minBlocks = 8`. With randomized arm order and window,
a sign-flip test on per-round log ratios is exact for "no effect" (p50 only). Do not assume normality: Shapiro-Wilk rejected it for 99% of
CloudLab configurations; nonparametric CIs; CoV up to about 4% needs tens of repetitions, outlier-heavy configurations hundreds [S, Maricq].

**Planning formula for p50:** `K = ((1.96 + 0.84) * s_d / ln R)^2`, s_d = sd of the per-round log ratio (= sigma_B * sqrt(2 * (1 - rho)) in
the model); R = 1.25 gives ln R = 0.223.

**Monte Carlo [I]** (`power-sim.js`): per-round log slowdown sd sigma_B = 0.30 shared between arms with correlation rho (conservative; the
10-minute probe saw about 0.05); per command lognormal body sigma 0.5, base 12 ms, plus a 3% stall with exponential mean 40 ms, scaled by the
slowdown; candidate scaled by 1/R; 100 to 150 replications, 150 to 200 bootstrap resamples, Monte Carlo error about 2 to 4 points; n =
commands per arm per round (660 = steady 600 s window; 3,300 = 150 s round with one burst); rho 0 unpaired, 0.5 interleaved, 0.8 or 0.95
duet-like.

Power, probability the 95% CI excludes 1 at a true ratio 1.25 (p50 / p99):
| rho | n per round | 4 rounds | 8 | 12 | 20 | 32 |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 660 | 29 / 31 | 35 / 29 | 53 / 41 | 69 / 53 | 85 / 74 |
| 0.5 | 660 | 54 / 33 | 57 / 49 | 73 / 53 | 88 / 69 | 98 / 79 |
| 0.8 | 660 | 73 / 40 | 91 / 56 | 95 / 69 | 100 / 87 | 100 / 95 |
| 0.95 | 660 | 95 / 42 | 100 / 61 | 100 / 77 | 100 / 95 | 100 / 98 |
| 0.5 | 3,300 | 46 / 47 | 55 / 44 | 70 / 68 | 89 / 72 | n/a |
| 0.8 | 3,300 | 68 / 55 | 91 / 79 | 97 / 87 | 100 / 99 | n/a |
| 0.95 | 3,300 | 98 / 78 | 100 / 93 | 100 / 100 | 100 / 100 | n/a |
| any | 130 | p99 power never above 57% even with 32 rounds | | | | |
A/A false positives at n = 660: 4 rounds 11 to 26%, 8 rounds 5 to 15%, 12 rounds 6 to 11%, 20 or more 2 to 9%. 80% power for p99 at 1.25:
n = 660 about 35+ rounds at rho 0 to 0.5, about 16 at rho 0.8; n = 3,300 about 15 at rho 0.5, 10 at 0.8, 6 at 0.95. Certifying "at least 1.25"
needs the lower bound at or above 1.25 (point estimate about 1.25 times the half-width factor, about 1.4 at 12 rounds); a true ratio of 1.5
gives e.g. 96 / 77% at rho 0.8, n = 3,300, 12 rounds.

Distribution-free interval ranks for one sample (exact binomial):
| n | p50 95% CI ranks | p99 95% CI ranks |
| --- | --- | --- |
| 131 (120 s steady) | 55 to 78 | none; best coverage 73% |
| 299 | 133 to 168 | 289 to 299 (minimum n: 1 - 0.99^n - 0.01^n >= 0.95) |
| 657 (600 s steady) | 304 to 355 | 646 to 656 |
| 3,285 (one burst) | 1,587 to 1,700 | 3,241 to 3,264 |
| 10,000 | 4,902 to 5,099 | 9,881 to 9,920 |
Samples per arm: at least 25,000 commands pooled (about 250 tail samples) and at least 8 usable rounds before any p99 claim [I]. Sequential
looks at rounds 8, 12, 18, 24 with a 98.2% interval (Pocock, four looks, overall 0.05 two-sided: nominal 0.0182, z = 2.361) [S].

**Superiority, hold, multiplicity.** Superiority: lower bound of A/B at or above the claimed ratio. Hold (PLAN item 6 "improve or hold"):
upper bound of B/A at or below 1.10 (p50) and 1.15 (p99), to be confirmed. One primary metric per brief from its North star line at 95%;
others get non-inferiority checks only. Duet is anti-conservative for "hold": confirm important "hold" verdicts with a solo-versus-duet check.

**Coordinated omission.** Writers in `scheduler.ts` measure from `scheduledAt` and offer regardless of store speed (wrk2 and YCSB intended
start time) [S]. Gap 1, survivorship: the commit histogram holds only `outcome === "committed"`, dropping expired (30 s deadline), rejected
and unaccounted commands, so a candidate that sheds commands looks faster. Gap 2: closed-loop readers yield one slow sample per stall
instead of the samples an open stream would have produced, under-reporting read p99. HdrHistogram's `recordValueWithExpectedInterval` (README
moves "99.99% under 1 ms" to about 50%) and wrk2's corrected/uncorrected reporting (about 200x gap in its example) [S]. Fixes: (1) a
`commitAll` histogram recording expired, failed and rejected commands at their censor time, reported next to committed p99; (2) an open-loop
read probe at a fixed rate (e.g. 50/s Poisson) at every reader level, from intended time; (3) per-second goodput and per-second max latency;
(4) `recordCorrectedUs(value, expectedIntervalUs)` in `hist.ts` as a diagnostic only.

## 3. Noise control in colima (Lima, Virtualization.framework)
**This VM [M].** Profile `triplex2`: `vmType: vz`, 6 vCPU, 12 GiB, virtiofs, `portForwarder: ssh`. Ubuntu 6.8.0-117-generic aarch64, cgroup v2
(cpuset, cpu, io, memory, hugetlb, pids), PSI present, `python3` and `perl` present, no `node`. Containers are sibling cgroups under
`/sys/fs/cgroup/docker/<id>/`, `cpu.weight` 100, `cpu.max` `200000 100000` (`--cpus 2` from `engine.mjs`); some containers already had narrow
`cpuset.cpus.effective` (0-1, 2-3), so cpusets work and other agents use them. Apple M3 Pro, 6 performance and 6 efficiency cores; two colima
VMs share the host (`default` 4 vCPU / 6 GiB, `triplex2` 6 vCPU / 12 GiB): 10 vCPUs on 12 cores of which 6 are fast. `/proc/stat` steal is 0
after days of load 11 to 15 [M]; Virtualization.framework appears not to feed paravirtual steal [I].

**Throttling on the busiest slot [M].** 20 s delta on the 3.0 GiB container (xtdb-dev, while EXP-W01 GS.19 held a heavy token): 1.91 cores
used, 154 of 200 periods throttled (77%), 8.9 s throttled in 20 s; lifetime 90,375 of 138,808 periods (65%), later 97,003 of 150,816 (64%);
`memory.current` 98% of `memory.max`, `memory.events` `max` from 5,875 to 6,212. Other containers' lifetime throttled share about 0 to 7.5%.
Whole VM: 3.66 cores used of 6; guest PSI cpu "some" 22 to 25% (avg10 to avg300), load 6.4 on 6 vCPU. Why a quota hurts tails: the quota is
spent per 100 ms period and threads are throttled until the next one; smaller periods give more consistent latency [S, kernel doc]; Twitter
saw services at 40% of quota violating latency targets from bursts [S]; a multi-threaded JVM can spend its quota in milliseconds and stall
for the rest of the period [S, I].

| Knob | Mechanism | Isolates from other containers? | From host load? | Notes |
| --- | --- | --- | --- | --- |
| `--cpus N`, `cpu.max` | Hard cap per period [S] | No | No | Causes the throttling above |
| Smaller `--cpu-period` (min 1 ms) | Shorter worst-case stall, more overhead [S] | No | No | Mitigation only |
| `cpu.max.burst` | Bursts above quota [S] | No | No | Mitigation only |
| `--cpuset-cpus`, `docker update --cpuset-cpus` | Restricts vCPUs, changeable live [S] | Yes, if every other container is kept off those vCPUs | No | Kubernetes static CPU manager precedent [S]; set at creation because a running JVM will not re-read its CPU count |
| `--cpu-shares`, `cpu.weight` | Relative weight under contention [S] | Partly | No | Mapping is runc-version dependent (1024 shares about 39 linear, about 100 in runc 1.3.2+) [S]; read `cpu.weight` back |
| `nice`, `taskset` in the VM | Priority, affinity | `nice` is relative inside one cgroup [I] | No | Small |
| `--cpu-rt-runtime` | Real-time class | Needs daemon and kernel config [S] | No | Not available |
| Host `renice`/`taskpolicy` on the VM | Host priority | n/a | Possibly | Needs root [I]; out of scope without Sam |
Not controllable from inside the VM: host scheduling of vCPU threads (no pinning or priority API found [I]); migration to efficiency cores
(calibration drift is the only detector); host memory pressure (today 16 G in the compressor, swap 96%, `kern.memorystatus_vm_pressure_level`
2 [M]); host user-space load (59% user, 39% system, 1.65% idle; Lima helpers on the driver-to-engine path, share unmeasured [M]); non-lab
processes (Sam's default colima VM, Chrome, the Claude app).

**Recommended regime.** (1) Measurement slots use a cpuset and no quota: `cpuset` and `regime` in `slots.json`, effective `cpu.max`,
`cpuset.cpus.effective`, `cpu.weight` in the receipt; never mix regimes in one comparison; A0 re-measured under it. (2) Partition the VM during a
window:
```
vCPU:  0   1 | 2   3 | 4   5
       [arm A] [arm B] [dockerd, sshd, every other container]
```
(`docker update --cpuset-cpus 4-5` on cooperating `tx2-*` containers for the lease; other agents' engines slow for about an hour.)
(3) Measurement lease: take all `HEAVY_SLOTS` tokens and freeze pool admission (about 1 h). (4) Ask Sam about pausing the default colima VM
and other heavy host jobs during acceptance windows.

## 4. Window rejection
Signals per round at 10 s cadence (collector `R22/collect-vm.sh`, read-only, tens of ms of guest CPU; host: `sysctl -n vm.loadavg
kern.memorystatus_vm_pressure_level vm.swapusage`, `vm_stat`, `top -l 1 -n 0 | grep 'CPU usage'` at most every 30 s).
| Signal | Source | Ambient today [M] | Class | Provisional rule |
| --- | --- | --- | --- | --- |
| Host load average | `sysctl vm.loadavg` | 11 to 15 | record only | never discriminates here |
| Host CPU idle | `top -l 1` | 1.65% | record only | same |
| Host memory pressure level | `kern.memorystatus_vm_pressure_level` | 2 | hard at 4 | exclude at CRITICAL |
| Swap used | `vm.swapusage` | 96% | hard on growth | exclude if pageouts rise by more than 20,000 pages in a round |
| Compressor, decompressions | `vm_stat` | 16 G, 1.8e9 total | record | calibrate during the recording week |
| VM steal | `/proc/stat` | 0 | drop | unavailable |
| VM PSI cpu some | `/proc/pressure/cpu` | 22 to 25% | soft | amber above 40%, exclude above 60% |
| VM PSI memory full | same | about 0 | hard | exclude above 1% of round time |
| VM PSI io some | same | below 0.2% | soft | exclude above 10% |
| Throttled-period share per arm | cgroup `cpu.stat` | 0 to 77% (quota) | hard in cpuset regime | exclude above 5% on a cpuset arm |
| Memory limit pressure | `memory.events` | `max` events in thousands on one slot | hard | exclude if `oom_kill` rises, a container restarts, or `max` rises by more than 50 |
| Neighbor CPU | other cgroups' `usage_usec` | 1.75 to 3.7 cores | hard after partition | exclude if a non-arm container on an arm's cpuset exceeds 0.25 cores |
| Calibration drift | pre and post spin | min varies 9% | hard | exclude if post/pre min is outside [0.85, 1.18] |
| Interference index | p50/min of the spin | 1.1 to 1.36 | hard | exclude above 2.0 |
| Hiccup meter (1 ms sleep overshoot) | driver and VM | max 4 to 9 ms per 4 s | hard | exclude above 100 ms |
| Client event-loop use | driver ELU | existing | hard | above 0.9 (already INVALID) |
Rules are decided before looking at outcomes, applied to both arms of a round, logged by rule id; a window is INVALID if more than a third
of its rounds are excluded; thresholds are provisional until a 7-day passive recording at 10 s sets them at the 90th percentile of the
signals that predict the A/A spread.

**Outcome-based gate.** Per A/A round d_k = ln(p50_A / p50_B), s_d = sd(d_k):
| Target R | Rounds allowed | s_d limit |
| --- | --- | --- |
| 1.25 | 12 | 0.28 |
| 1.25 | 24 | 0.39 |
| 1.10 | 24 | 0.17 |
Above the 24-round limit the window is RED and discarded. The 3-round pre-flight catches only gross noise: use a safety factor of 1.5 on its
s_d and refresh from interleaved A/A rounds. The A/A mean of d_k estimates slot bias; if its interval excludes 0, swap roles with a restart
or correct for it.

**Calibration.** 20 units of about 20 ms fixed integer work before and after each round, on the host and in the VM (python via `colima ssh`,
about 0.45 s each); record min, p50, p50/min; reference = min of the first 5 pre-flight runs (stable within 9% while p50 moved 21%; minimum
timing is robust when noise is additive [S, Chen and Revels; BenchmarkTools]); hiccup meter during blocks (jHiccup [S]). MongoDB runs non-MongoDB
canaries beside every performance task and targets an experiment range (max - min) / median under 10% with 25 points per experiment; storage
and CPU-option changes cut their run-to-run variation from 20-30% to under 5% [S].

## 5. Prior art
| Source | What it gives | Use here |
| --- | --- | --- |
| Mytkowicz et al., ASPLOS 2009 | Setup bias; 133 papers, none adequate; setup randomization, causal analysis | Randomize order and windows; A/A check |
| Kalibera and Jones, ISMM 2013 | Level-wise repetition count r_i = ceil(sqrt(c_(i+1) T_i^2 / (c_i T_(i+1)^2))); effect-size CI for ratios; 20 to 30 at top level; ACF independence check | Round is the top level; size K from variance; ACF of d_k |
| Bulej et al., Duet (arXiv 2001.05811) | Concurrent pairing, 99% bootstrap CI | Primary design |
| Abedi and Brecht, RMIT (ICPE 2017) | Randomized interleaving on EC2 | Order randomization |
| Maricq et al., OSDI 2018 | 835 servers; nonparametric CIs; CONFIRM; randomize order | CI choice, sizing |
| Laaber et al., EMSE 2019 | Cloud CV 0.03% to over 100%; same-instance randomized test/control detected slowdowns of 10% or less | Same-host pairing |
| MongoDB (blog; Daly et al.; Ingo and Daly) | Canaries, range metric, noise reduction, change-point detection | Calibration, window gate; E-Divisive later |
| Chen and Revels (arXiv 1608.04295) | Noise-robust timing statistics | Minimum for calibration |
| Google Benchmark docs | Random interleaving; Mann-Whitney U needs at least 9 repetitions; affinity, governor, ASLR | Rounds at least 9 |
| JMH Forking sample | Fresh fork per measurement | Replication level |
| hyperfine README | Warm-up, outliers, relative comparison | Sanity only |
| HdrHistogram, wrk2, jHiccup | CO correction, intended-time latency, hiccups | Sections 2 and 4 |
| Hesterberg 2015 (arXiv 1411.5279) | Percentile bootstrap too narrow at small n | minBlocks and A/A calibration |
| Kernel docs (bandwidth, PSI, cgroup v2), Docker resource constraints, Kubernetes CPU manager, Luu on throttling | Throttling, PSI, cpuset precedent | Section 3 |
| Hoefler and Belli SC 2015; Schroeder et al. NSDI 2006 | Reporting rules; open vs closed workloads | Abstract level only |
Gap: no source measures database benchmarking on a macOS VM with a saturated host; MongoDB's EC2 work and Maricq et al. are closest.

## 6. Fit to the harness
**Keep:** open-loop writer latency from scheduled time; the mergeable log-linear histogram (0.79% buckets, JSON round trip); driver-recorded
bases; the ELU saturation check; a deterministic trace with seed and source hashes in the receipt. **Gaps:** `driver.ts` samples engine CPU %
and memory via `docker stats --no-stream` every second and records only host cpus and memory total (no load, PSI, throttling, calibration or
pressure); `gate.mjs` NS INVALID reasons cover only client saturation, incomplete seed, dev overrides and missing baseline; a run is one point
estimate per bar; the "matched zero-reader baseline" is a separate run at another time, so P1's writer ratio compares two noise states.

| File | Change |
| --- | --- |
| `lab/bench/lib/paired.ts` (new) | `pairedQuantileRatio`, `signFlipP`, `decide`, a power planner (sketch in section 8) |
| `lab/bench/lib/hist.ts` | `recordCorrectedUs`; no format change |
| `lab/bench/lib/noise.ts` (new) | Section 4 recorder, calibration spin, hiccup meter, per-round summary, exclusion rules |
| `lab/bench/driver.ts` | `--arm A|B`, `--round-plan FILE`, `--start-at-abs-ms` barrier; per-round histograms `histograms["R03.A.commit"]`; `commitAll` with censored values; open-loop read probe; per-second goodput |
| `lab/bin/gate.mjs` | `PAIR` gate: starts both drivers, owns the round plan and lease, binds both arms' identity with `layer()`, writes `pair`, `noise`, `stats`, `isolation`; verdicts `PAIRED_DECIDED`, `PAIRED_INCONCLUSIVE`, `INVALID_NOISE` |
| `lab/bin/receipt.mjs` | `REQUIRED.PAIR`: `pair.mode`, `pair.rounds`, both arms' `imageId`, `configSha256`, `cpuset`, `cpuMax`, `cpuWeight`; `noise.aa.sdLogP50`, `noise.exclusions`, `noise.calibration.ref`; `stats.p50`/`p99` with `lo`, `hi`, `mdr`; `noise.windowGrade` |
| `lab/bin/engine.mjs`, `lab/config/slots.json` | `cpuset` and `regime` per slot; effective cgroup values in `owner.json`; `status` prints throttled share and PSI |
| `lab/bin/heavy-lock.mjs` | `measure-lease` holding all tokens plus pool admission |
| `lab/config/noise.json` (new) | Thresholds, round budget, margins, hashed into the receipt |
Effort estimate (agent time): statistics 1 h (sketch done), recorder 2 to 3 h, histogram and `commitAll` 1 to 2 h, duet coordinator 4 h,
gate and receipt 3 h, lease 1 h, cpuset slots 1 h.

**Stop doing:** judging a bar from one run; comparing a candidate run with an A0 run from another time (including the separate zero-reader
"matched" run); running the reader ladder only in ascending order with one window per level (level confounded with time; alternate and
repeat); dropping non-committed commands from latency histograms; mixing quota and cpuset regimes or treating `docker stats` CPU % as
contention evidence; reporting p99 from windows under about 1,000 samples.

**Interactions:** RULINGS Q26 needs a `paired-rounds` mode next to `single-execution`; P1's writer ratio should alternate zero-reader and L256
rounds in one session [I]; P5 is one sweep per round, so 8 to 12 rounds of about 100 s per arm; absolute bars (p50 <= 10 ms, p99 <= 50 ms and
so on) are judged only in GREEN windows, otherwise "unjudged" (bar values unchanged).

## 7. Protocol PAIR-0
```
setup (once)
  declare claim in the brief: metric, direction, R = 1.25 or margin 1.10 / 1.15, K max 24
  take the measurement lease; partition vCPUs; arms up in cpuset regime; same seed
  preflight: host + VM signals, calibration reference, 3 A/A rounds of 60 s -> s_d, grade
  warm-up 120 s, both arms, same trace prefix (unmeasured)

round k (k = 1..K)   [calib 10 s][ duet block 150 s, 2 s settle ][calib 10 s]
  both drivers start at one absolute time; same trace window; arm roles fixed per container
  every 6th round is A/A; ABBA fallback randomizes pair order
  noise recorder at 10 s; exclusion rules applied after the round, both arms

looks at K = 8, 12, 18, 24  (98.2% CI)   -> verdict or continue
end: post calibration, receipt with both arms' identity, stats, noise, isolation
```
Steps: declare the claim and margins; take the lease and cpuset regime; bring up both arms with the same seed and verify cgroup values;
pre-flight and the window gate (RED: defer 30 min, retry up to 3 times); run rounds with exclusions; look at 8, 12, 18, 24; compute ratios,
the sign-flip p for p50, the A/A summary, and the verdict.
| Item | Default |
| --- | --- |
| Mode | Duet; same-engine ABBA fallback |
| Rounds | 8 minimum, 12 default, 24 maximum |
| Block | 150 s measured, 10 s calibration each side |
| Time per decision | about 45 to 50 min at 12 rounds (2 h if rounds wait for the frozen trace's 600 s burst period) |
| p99 claim floor | 25,000 commands per arm and 8 usable rounds |
| Superiority | lower bound of A/B at or above R |
| Hold | upper bound of B/A at or below 1.10 (p50), 1.15 (p99) |
| Verdicts | `FASTER_BY_TARGET`, `FASTER`, `SLOWER`, `EQUIVALENT_WITHIN_TARGET`, `INCONCLUSIVE_NEED_MORE_ROUNDS`, `INCONCLUSIVE_TOO_NOISY` |
P2 and P3 rounds must contain a burst (a screening trace with a burst every 180 s as a new comparison series per TARGETS 2.1 item 5, or
`--rate-scale 4`, about 660 commands per 150 s, needing 16+ rounds at rho 0.8). P1 and P4 reads: thousands per second, so between-round noise
dominates. P5: one sweep per round.

## 8. Sketch: paired bootstrap for p50 and p99 ratios
Tested on synthetic blocks (Node 22, the lab's `hist.ts` and `rng.ts`); file `/Users/sam/Claude/Projects/triplex-db-2/R22/paired.ts`. With 16
rounds of 660 commands at rho 0.8, a true 1.25x gave p50 CI 1.107 to 1.388 and sign-flip p = 0.0016; a true 1.6x gave p50 1.36 to 1.79 and p99
1.37 to 2.08 (`CANDIDATE_FASTER_BY_TARGET`).
```ts
import { Histogram } from "./hist.ts";
import { Rng } from "./rng.ts";

export interface PairBlock {
  id: string;
  a: Histogram;          // A0, all offered commands (expired and failed at censor time)
  b: Histogram;          // candidate
  excluded?: string;     // set only by pre-registered noise rules, never by looking at latency
}
export interface RatioCI { q: number; ratio: number; lo: number; hi: number; blocks: number; level: number; mdr: number }

const pool = (hs: Histogram[]) => hs.reduce((acc, h) => acc.merge(h), new Histogram());
const quantile = (h: Histogram, q: number) => h.percentileUs(q * 100) as number;

/** Pooled-quantile ratio A/B with a cluster (round) bootstrap percentile interval. */
export function pairedQuantileRatio(blocks: PairBlock[], q: number,
    { boots = 2000, level = 0.95, seed = 1, minBlocks = 8 } = {}): RatioCI | null {
  const use = blocks.filter((b) => !b.excluded && b.a.count > 0 && b.b.count > 0);
  if (use.length < minBlocks) return null;
  const ratioOf = (idx: number[]) =>
    quantile(pool(idx.map((i) => use[i]!.a)), q) / quantile(pool(idx.map((i) => use[i]!.b)), q);
  const rng = new Rng(seed);
  const all = use.map((_, i) => i);
  const logs: number[] = [];
  for (let k = 0; k < boots; k++) logs.push(Math.log(ratioOf(all.map(() => rng.int(use.length)))));
  logs.sort((x, y) => x - y);
  const at = (p: number) => logs[Math.min(logs.length - 1, Math.max(0, Math.floor(p * logs.length)))]!;
  const lo = Math.exp(at((1 - level) / 2)), hi = Math.exp(at(1 - (1 - level) / 2));
  return { q, ratio: ratioOf(all), lo, hi, blocks: use.length, level, mdr: Math.sqrt(hi / lo) };
}

/** Exact sign-flip test on per-round log ratios (valid because arm order per round is randomized). */
export function signFlipP(blocks: PairBlock[], q: number, { seed = 7, mc = 20000 } = {}): number {
  const d = blocks.filter((b) => !b.excluded && b.a.count && b.b.count)
    .map((b) => Math.log(quantile(b.a, q) / quantile(b.b, q)));
  const m = d.length, obs = Math.abs(d.reduce((s, x) => s + x, 0) / m);
  const rng = new Rng(seed), exact = m <= 16, n = exact ? 1 << m : mc;
  let ge = 0;
  for (let t = 0; t < n; t++) {
    let s = 0;
    for (let i = 0; i < m; i++) s += (exact ? (t >> i) & 1 : rng.int(2)) ? d[i]! : -d[i]!;
    if (Math.abs(s / m) >= obs - 1e-12) ge++;
  }
  return ge / n;
}

export type Verdict = "CANDIDATE_FASTER_BY_TARGET" | "CANDIDATE_FASTER" | "CANDIDATE_SLOWER"
  | "EQUIVALENT_WITHIN_TARGET" | "INCONCLUSIVE_NEED_MORE_ROUNDS" | "INCONCLUSIVE_TOO_NOISY";
export function decide(ci: RatioCI | null, target = 1.25, maxBlocks = 24): Verdict {
  if (!ci) return "INCONCLUSIVE_NEED_MORE_ROUNDS";
  if (ci.lo >= target) return "CANDIDATE_FASTER_BY_TARGET";
  if (ci.lo > 1) return "CANDIDATE_FASTER";
  if (ci.hi < 1) return "CANDIDATE_SLOWER";
  if (ci.lo > 1 / target && ci.hi < target) return "EQUIVALENT_WITHIN_TARGET";
  return ci.mdr * Math.sqrt(ci.blocks / maxBlocks) > target ? "INCONCLUSIVE_TOO_NOISY" : "INCONCLUSIVE_NEED_MORE_ROUNDS";
}
```
At 24 rounds with 2,000 resamples, merging costs about 0.5 to 1 s per statistic; call once per metric per look with `level: 0.982` for
Pocock; a non-inferiority check is `ci.hi` of B/A (arms swapped).

## 9. Open questions
1. Pool capacity: a duet needs two exclusive slots (7 GiB) while the pool is 11 of 11 GiB; which resident stops during a window?
2. May measurement slots move to cpuset with no quota (changes the slot definition, forces an A0 re-measure)?
3. May a screening profile use a burst every 180 s or `--rate-scale 4` as a new comparison series?
4. Margins: 1.25 superiority and 1.10 / 1.15 hold?
5. Absolute bars judged only in GREEN windows, "unjudged" otherwise?
6. RULINGS Q26: a `paired-rounds` execution mode for NS obligations.
7. Source of the 2x to 3x swings: a day-long A/A with the recorder on.
8. Client capacity in a duet: two drivers with four reader threads each; ELU above 0.9 at L256?
9. Is the host-to-VM ssh port forward a variance source (null echo test needs a container)?
10. Duet interaction bias: solo versus duet per arm.
11. Thresholds need a recording week.
12. Acceptance claims need two container lifetimes per arm with swapped roles (re-seed about 4 minutes at the smoke rung).
13. Do vCPU threads migrate to efficiency cores under load?
14. Can Sam's default VM and host jobs be paused for acceptance windows?

## First action
Run an A/A duet on two XTDB slots for 8 rounds of 150 s with the recorder on, to get a measured s_d for commit p50 and p99 in the current
regime; that number replaces every assumption in the power tables.
