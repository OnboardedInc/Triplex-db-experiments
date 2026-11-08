# EXP-M01 paired measurement protocol PAIR-0 (measurement validity for P1-P5)

**North star:** every promotion decision on P1 to P5 compares a candidate with A0. On this saturated host single runs moved 2x to 3x, so no
verdict so far can be trusted beyond "same window, same slot". This experiment builds the protocol that turns "A is faster" into a decision
with a stated confidence. **Scope:** lab/NORTH-STAR.md, lab/TARGETS.md 1.1 and 2.1; lab/research/R22-noise-robust-benchmarking.md (the
design, complete); rulings Q60a-i in lab/acceptance/RULINGS-PENDING.md; Q26 in lab/acceptance/RULINGS.md.

## Commander's intent
Build PAIR-0 into the harness and measure the one number that replaces every assumption in R22's power tables: the per-round log-ratio sd
s_d of commit p50 and p99 in an A/A duet on this host. Done means a PAIR gate that runs two arms at once, a receipt that a reader can
recompute, and a measured s_d with its window grade.

## Point of view (R22 section 6.2 is the file-by-file plan)
1. `lab/bench/lib/paired.ts`: R22 section 8's `pairedQuantileRatio`, `signFlipP`, `decide`, plus a power planner; unit tests on synthetic
   blocks with known ratios (1.0, 1.25, 1.6) that check coverage and A/A false-positive rates.
2. `lab/bench/lib/noise.ts`: the section 4.1 recorder (host sysctl and vm_stat; VM /proc/stat, PSI and per-container cgroup counters through
   `colima ssh -p triplex2`), the calibration spin, the hiccup meter, per-round summaries and the pre-registered exclusion rules from
   `lab/config/noise.json` (new, hashed into receipts).
3. `lab/bench/lib/hist.ts`: `recordCorrectedUs` (diagnostic). `lab/bench/driver.ts`: `--arm A|B`, `--round-plan FILE`, `--start-at-abs-ms`,
   per-round histograms, a `commitAll` histogram with censored values (Q60d), an open-loop read probe, per-second goodput and max latency.
4. `lab/bin/gate.mjs` PAIR gate and `lab/bin/receipt.mjs` REQUIRED.PAIR (fields in R22 6.2); verdicts PAIRED_DECIDED, PAIRED_INCONCLUSIVE,
   INVALID_NOISE.
5. `lab/bin/engine.mjs` and `lab/config/slots.json`: a `cpuset` and `regime` per slot (Q60c), effective cgroup values in `owner.json`,
   throttled share and PSI in `status`. `lab/bin/heavy-lock.mjs`: a measure-lease holding every heavy token plus pool admission (Q60h).
6. Then the first action: an A/A duet on two XTDB slots in the cpuset regime, 8 rounds of 150 s, recorder on, using the screening series
   with a burst every 180 s (Q60g). Report s_d for commit p50 and p99, the slot bias, the A/A false-positive check and the window grade.

## Predictions (falsifiable)
- In a duet, s_d of per-round log p50 ratio is at or below 0.10 (R22's concurrent window medians correlated 0.985), so 12 rounds resolve 1.25x.
- Under the cpuset regime the throttled-period share of each arm is under 5% (it was 77% on the busiest quota slot).

## Boundaries
- Worktree branch `exp/M01-paired-measurement` from main (which now includes EXP-N01's driver work). Files: lab/bench/**, lab/bin/gate.mjs,
  lab/bin/receipt.mjs, lab/bin/engine.mjs, lab/bin/heavy-lock.mjs, lab/config/slots.json, lab/config/noise.json, tests, and
  lab/experiments/EXP-M01-paired-measurement/**. EXP-E01 changes only a 10-line `--dry-run` block in gate.mjs; keep your changes apart from it.
- Engines: the A/A duet needs two exclusive XTDB slots (2 x 3.5 GiB). The pool is full today; build and unit-test everything offline first,
  then poll for capacity with lab/bench/wait-slot.mjs and take the measure-lease only when two slots fit. Never stop another holder's engine,
  never touch the dev residents' cpusets without the lease, and release everything at the end. Docker only with
  DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock through lab/bin/engine.mjs; `colima ssh -p triplex2` for read-only probes only.
  Never touch /Users/sam/projects/triplex-db, ports 15442 and 17019, or Sam's default colima VM.
- pnpm only with `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`; never `pnpm config set`. Disk is tight (14 GiB free): keep raw
  samples compressed under /Users/sam/Claude/Projects/triplex-db-2/EXP-M01/.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Subagents, if any: Opus only, never fork.

## Report (return as text; the orchestrator saves it as REPORT.md)
What was built per file; test results; the A/A duet's s_d (p50, p99), slot bias, throttled shares, exclusions and window grade (or why it
could not run); the commands to reproduce; final commit hash.
