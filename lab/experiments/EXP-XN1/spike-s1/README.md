# XN-S1 native XTDB floor spike

Diagnostic only, under PROTOCOL 0b. No Triplex package is imported, called, or changed.
The copied wire encoder comes from EXP-P2X2's F3 transport; idle connection expiry during long lock waits was corrected and covered by three local regression tests; `wire.mjs` adds named
Parse-once prepared statements for X1. Four worker threads are used only by X3.
Raw evidence belongs in `/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S1/`.
`REPORT.md` records the completed runs, limitations and exact commands.

Run from this worktree. The slot must first be admitted with:

```sh
node lab/bin/engine.mjs up --lane xtdb --slot s1 --holder XN-S1 --exp EXP-XN1 --cpuset-cpus 4,5
node lab/bin/heavy.mjs --label XN-S1-seed -- node lab/experiments/EXP-XN1/spike-s1/read.mjs seed
lab/experiments/EXP-XN1/spike-s1/reads.sh immediate
lab/experiments/EXP-XN1/spike-s1/rest.sh
lab/experiments/EXP-XN1/spike-s1/inline.sh
node lab/bin/engine.mjs down --lane xtdb --slot s1 --holder XN-S1 --note 'XN-S1 spike completed; retain diagnostic data'
```

`rest.sh` waits for the final immediate-read output, forces flush/settling, runs the
second read pass, correctness checks, commits, history and coupling measurements.
Each timed run acquires the shared `locks/measure` mkdir lock in `common.mjs`,
releases it in `finally` and signal handlers, and has a 14-minute deadline.
Warmup and seeding run outside the timed lock. After the retained interrupted attempts, this run resumed reads with `reads.sh settled3` and X2/X3 with `commits.sh`; the report records that chronology. Outputs use exclusive creation:
use a new evidence directory for a fresh attempt rather than overwriting results.

Read outputs verify every returned document byte against the deterministic generator.
The SQL `IN` result is treated as an unordered set. Quantiles use nearest rank.
Engine CPU is the `usage_usec` cgroup delta; host CPU is Node's process CPU delta,
which includes its worker threads. Docker observation processes are outside that
host-client CPU number. `docker stats --no-stream` snapshots cover all running
containers before and after each timed case, not a continuous quiet-host proof.
