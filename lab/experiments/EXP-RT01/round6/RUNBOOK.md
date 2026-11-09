# RT01 marker-guard live handoff

North star: P1 exact pinned reads and P2 commit latency without changing atomicity or receipts. Scope/targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`.

**Do not run in the stopped window.** The 2026-11-09 08:09:39 UTC admission found CX-G03-V's `tx2-g03-f6d8ea5cba52162f-V3-writer` and `...-observer` VM-probe reservations. The s1 engine row itself was free; these were 128 MiB helper reservations without slot fields, not an observed 3.5 GiB XTDB exclusive. The dispatch explicitly permits stopping for G03's VM-probe window, so no RT01 resource was acquired. The original decision's conservative label is `exclusive reservation occupied`; the exact pool/status bytes and executed controller preimage are retained under `round6/admission1/` in durable storage. Future admission explicitly recognizes G03 VM helpers as well as engine exclusives.

Offline: 25/25 product phases, 1,112 product tests, 510/510 read matrix, 80/80 pending matrix, four publication proofs, both journal-clock encodings and eight SQL plan/model cases pass. No new guard was executed live, and the previous G6 failure is not cleared.

For the next **orchestrator-authorized** window, from this worktree:

```sh
node lab/bin/engine.mjs status
```

Require no engine exclusive or G03 VM-probe reservation, no other holder's retained/orphaned s1 volume/container, and host free disk at least 5 GiB plus the forecast history growth. Never park/unpark Datomic or reclaim another holder's state. `admit-live.mjs` repeats the check inside the heavy grant; stop again if occupied. The `admission1` stop remains immutable; the next controller uses `admission2`.

```sh
node lab/bin/heavy.mjs --label CX-RT01-r6-live -- node lab/experiments/EXP-RT01/round6/run-live.mjs
```

This prepared controller has **not been executed**. It:

1. Acquires a fresh xtdb-s1 through engine.mjs as CX-RT01 only after admission. It retains source/engine owner evidence and leaves G03 untouched.
2. Builds final core/testkit/XTDB and runs G2 on the changed guard. It stops at any gate failure.
3. Rechecks the retained pre-RT01 `59e07afb7a25dfb22bca60f8d769b74651aa835a` baseline artifacts from durable `live2/baseline/`; baseline XTDB resolves baseline core. G6 repeats four A/A calibrations (A0/compact × 10/5 facts, 150 samples per control), writes and hashes the rule before B, then runs fresh points followed by 10k points. Each A/B point uses ABAB 75-commit blocks, 150 samples per arm, matching declared inputs, fresh scopes and exact receipt readback/counts. The inherited rule is `max(Aleft/Aright, Aright/Aleft)-1` per metric; do not widen it after B.
4. Preloads actual public commits for each 10k point, one engine transaction each, with bounded parameterized batches. No synthetic history or huge literal VALUES. Checks the history disk forecast before admission. Record actual growth, not the earlier offline N/2N model.
5. Outside timing windows, probes position aggregate, old stamp aggregate, keyed stamp lookup and full new predicate; captures native EXPLAIN and EXPLAIN ANALYZE of the **SELECT form of each ASSERT predicate**. Direct EXPLAIN ASSERT is outside the pinned grammar. Inspect native scan rows/pushdowns before attributing latency; offline SQLite projection counts are not XTDB I/O counters.
6. Stops on the first correctness/transport/regression failure, retains all evidence, and in `finally` removes only the owned container/volume with engine.mjs. It then runs triplex2 fstrim, restores Docker context `colima`, and verifies owned resource absence. The cleanup helper never deletes another holder's resource.

All new attempts refuse existing output directories. Preserve a failed attempt; a later authorized retry needs new output names and an explicit reason. The earlier live2 G6 used the same service-input definition but a different guard. The new native-plan and whole-controller branches are prepared, syntax-checked code, not live acceptance. Raw evidence belongs at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round6/`; refresh the evidence index/manifest after controllers close their output streams.
