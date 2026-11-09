# M01 A/A scale-window runbook (CX-M01R)

North star: P1-P5 measurement validity, every NS cell; authority is SCOPE.md, NORTH-STAR.md and TARGETS.md. R43 sections 3.3 step 5 and 5.3 gap 4; Q60, Q69; Q99b remains pending. This is an orchestrator procedure, not evidence of a live run.

## Capacity and ownership prerequisites

PAIR-0 requires **two concurrent exclusive XTDB reservations**, s1 and s3, each 3.5 GiB, not one. One queue window may own the pair, but a literal single-slot grant cannot execute this protocol: do not put both arms on one slot or serialize them. With Datomic parked and QLever stopped, xtdb-dev 3 GiB + the pair 7 GiB = 10 GiB within the 11 GiB pool. With Datomic resident, this does not fit. Orchestrator must resolve the two-reservation grant before starting; no builder stops residents. Q69a permits the announced QLever outage only after all dependent work is quiescent. Do not touch the default VM.

Announce about 75 minutes in STATE, with the holder, exact source/build, two slots, stopped resident, restoration owner and deadline. Confirm host free disk >=5 GiB, pool/disk forecasts and no other slot/follower/probe; park Datomic through the orchestrator, and stop qlever-dev through engine.mjs under its actual owning holder. Retain its volume unless an explicit retention decision permits a fresh recreation. Never use force to take another holder's reservation.

The lease prevents new heavy work and writer/follower/Datomic selftest admissions; existing resident traffic still needs explicit quiescence. GREEN also requires VM partitioning: arms on 0-1 and 2-3, all non-arm containers on disjoint CPUs (normally 4-5). An unpinned xtdb-dev overlaps both arms even when idle and caps the window at AMBER. Arrange any resident pin/recreation as a separately authorized orchestrator action before the window; PAIR does not repin residents. A quiet host alone cannot fix this partition requirement.

## Prepare before the outage

Use Node >=22 with TypeScript stripping enabled (the lab's Node 24 also supports it), pinned pnpm 10.11.0 and the lab store. In the reviewed checkout, install/build and run the offline commands in REPORT-rebase.md before taking the lease. Select the opt-in slots file explicitly; default slots.json and all default effective config hashes are unchanged.

```sh
export TX2_CONFIG_DIR="$PWD"
export TX2_SLOTS_FILE="$PWD/lab/config/slots-pair.json"
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
export NODE_OPTIONS=--experimental-strip-types
node lab/bin/heavy.mjs --label M01-window-build -- pnpm --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store --filter @triplex-build/triplex-core --filter @triplex-build/triplex-testkit --filter @triplex-build/triplex-xtdb --filter @triplex-build/triplex-qualification build
```

Compare slots-pair.json against the current canonical slots.json immediately before use: only XTDB s1/s3 regime/cpuset may differ. Do not overwrite it from stale operational configuration. Do not change the noise rules mid-series. Freeze the rung before running; use the largest registered rung that fits the 75-minute seed budget. A 10k seed at the historical 120 facts/s can exceed the entire outage; request a longer window if the admitted rung cannot finish. Do not use `--subjects` to disguise a reduced rung as a qualified measurement.

## During the Q69a window (orchestrator only)

After the orchestrator has stopped QLever and parked Datomic, wait for two slots; inspect actual owner/config/cgroup readbacks. These commands are a template, with the granted holder and registered rung filled in by the orchestrator.

```sh
node lab/bench/wait-slot.mjs --after none --slots 2 --lane xtdb --need-gib 3.5 --max-h 0.05
node lab/bin/engine.mjs up --lane xtdb --slot s1 --holder M01-window --exp EXP-M01
node lab/bin/engine.mjs up --lane xtdb --slot s3 --holder M01-window --exp EXP-M01
node lab/bin/heavy.mjs --label M01-window -- node lab/bin/gate.mjs PAIR --lane xtdb --slots s1,s3 --holder M01-window --mode aa --rounds 8 --series screening-b180 --rung 10k --composition public-queued --seed-budget-s 1200 --exp EXP-M01 --run-kind calibration --raw-archive /Users/sam/Claude/Projects/triplex-db-2/evidence/M01-window
node lab/bench/duet.ts recompute --receipt lab/runs/PAIR/ACTUAL-RUN-ID.json
```

PAIR gate builds first using the wrapper's existing parent permit, then its measure lease borrows that exact direct-parent permit and acquires every other token. The wrapper keeps its permit until the gate exits; lease release returns the other tokens. This avoids nested-permit deadlock without exceeding the heavy limit. Prebuild through heavy.mjs as above; use the wrapper for the live gate too. s1/s3 must be absent or already owned with this exact opted-in config; do not add `--fresh` against unknown retained state.

Budget: preparation/readbacks 5-10 min, seed <=20 min, one warmup period + eight 180 s rounds =27 min, wind-down/recompute 5-10 min, restoration 5-10 min; approximately 62-77 min, not a promise. The template uses the smallest currently registered rung, 10k. A 1k rung is not registered in this driver. Therefore the approximately 75-minute window is conditional on fresh seed timing demonstrating that 10k fits; otherwise request a longer outage before running. Do not silently add a rung or change the contract. The seed budget bounds work but a paired-gate failure does not automatically restore the resident. Monitor elapsed time and preserve a failed attempt before restoration. Screening-r4 is allowed by Q69f only when the burst series makes commitAll p50 NOT_ESTIMABLE; it is a new comparison series and a new attempt.

Finally stop/remove only the two M01-owned slot containers via engine.mjs down (retain volumes per declared policy), verify reservations and the measurement lease are released, unset TX2_SLOTS_FILE, and restore qlever-dev through its actual holder and canonical configuration; verify READY and record IDs/config hashes. Unpark Datomic only after the orchestrator's capacity check. Retain raw archives with SHA256SUMS and record outage/cleanup outcomes, including failures.

## Prediction and grading

Prediction, not measured here: A/A per-round log commit p50 ratio s_d <=0.10; throttled-period share <5% per arm in cpuset regime. Report p99 s_d independently; M01 made no defensible live p99 prediction. Historical memory s_d (0.0142 p50, 0.2283 p99) is diagnostic and cannot stand in for XTDB.

`windowGrade` in lib/paired.ts is authoritative for implementation behavior: at least three usable rounds with identified p50; excluded share <=1/3; A/A p50 s_d at/below the default-round resolution limit (~0.28 for 1.25x at 12 rounds); zero usable amber signals; partitioned VM. Preflight-only s_d receives a 1.5 safety multiplier. Above ~0.28 is AMBER; above the 24-round limit (~0.39) RED; too few identified rounds UNGRADED; excessive exclusions INVALID. Missing host/VM/arm signals exclude rounds. Apply the exact hashed noise.json rules (memory pressure, pageouts, PSI, throttle/OOM/restart, drift/interference, hiccup, ELU, neighbor CPU), never latency-based exclusions. p99 additionally needs >=25,000 offered commands per arm and eight usable rounds to identify its interval.

Report s_d p50/p99, slot bias and interval, per-arm effective cpuset/cpu.max/cpu.weight, throttled shares, every exclusion and reason, correctness/accounting, grade and recompute MATCH. MATCH proves retained-evidence arithmetic, not fresh engine identity or independent acceptance. Absolute NS bars count only in GREEN windows; paired comparisons may be analyzed in GREEN/AMBER. This screening A/A does not close NS cells, change pending Q99b, supply a paired A0 at another rung, or constitute the separately reviewed gate/evaluator integration.
