# EXP-K01 round 2: R30 freeze protocol

North star: measurement speed for P1-P5 with faithful seed reuse. Scope and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. Builder CX-K01-R2; implementation source commit `a4b228e`. Independent review is still required.

## Result: G3 refused; no qualified golden or clone

The 500-subject live check ran on s1 after engine admission. It found two additional assumptions in R30 G3 that do not hold with the specified five-second observations. The gate was not weakened. No golden was published, no clone was certified, and E1 is **not ready**.

The seeded source completed 500 subjects, 26,635 assertions and 81 commands in **62.89 s** (command wall time). The first block cut produced block `00`, whose completed transaction matched the node gauge (`51471995`). Its source watermark was `52133232`, but compaction had already advanced both submitted and processed source gauges to `52134271`, with lag 0 and jobs 0. The first reading, 5.345 s after settle began, already showed only six live L1 tries across all five row-bearing seed tables. No L0 trie was observed.

All **27 readings**, through 139.924 s, retained that block/gauge mismatch and stable L1 digest. The immutable block watermark cannot catch up with the monotonically advanced source watermark. Waiting the remaining 15-minute timeout would not satisfy the predicate for block `00`. I explicitly terminated only the identified settle subprocess, retained its incremental observations and abort reason, and let the harness perform owned cleanup. This was an explicit aborted attempt, **not** an emitted semantic FAIL/PASS or completed timeout.

Pinned source supports the observed source-gauge movement: `references/xtdb/core/src/main/kotlin/xtdb/compactor/Compactor.kt:150-152` appends `SourceMessage.TriesAdded`; `database/Database.kt:379-387` exposes the source log's submitted position and the processed watcher position. Those are message offsets, not application transaction counts. R30 correctly separates completed transactions from source messages elsewhere, but G3's steady equality does not account for compaction after the block cut.

## Predictions and requested measurements

| Check | Outcome | Evidence |
| --- | --- | --- |
| T1 flagged stop | **NOT VERIFIED.** The seeded source's cleanup stop was not instrumented as a T1 receipt. A later isolated attempt was refused when lane D resumed; no result is inferred from cleanup. | `evidence/round2/T1-{up,down,status}.*`, `T1.log` |
| T2 unflagged stop | **Matches this observation:** exit 143, no OOM, 639 ms; no `Node stopped.` or component stop lines. The stop verdict correctly refused certification. No fivefold repetition was triggered because the predicted missing lines were observed. | `1794176273647-04-T2-stop.stdout` |
| T3 trie catalog versus live snapshot | **INCONCLUSIVE for the full prediction.** At the first five-second reading the catalog already exposed compacted L1 tries, not the predicted observable L0. No post-cut live-table observation completed, so stale post-cut live rows are not claimed for this run. | `singlecut/one-cut-probe.json.settle.json` |
| T4 empty checkpoint block | **NOT RUN:** strict G3 did not pass, so no second cut was issued. | same |
| T5 reference trie digest | **NOT RUN:** no reference start. | same |
| T6 one-cut copy plans before/after a write | **NOT RUN:** the diagnostic copy was refused before volume creation. Its query process was aborted while waiting on G3. | `singlecut/one-cut-probe.json` |
| T7 reference startup watermark | **NOT RUN:** no reference start. | same |
| Golden settle/copy/reference times | **Unavailable:** no golden copy or reference start occurred. | same |
| Clone time / C1-C8 verdict | **NOT RUN:** no qualified golden existed. | same |

Evidence paths in the table are relative to `evidence/round2/` unless already prefixed. The full unchanged seed manifest is retained in `singlecut/manifest.json`. `abort-settle-reason.json` identifies the actual signal, PID, time and reason; `live.log` and per-command result files retain the resulting nonzero exit and actual cleanup.

## Implemented changes

- Q83a's Log4j option is added **only to s1-s3**. Resident and follower options are unchanged. The option enters the effective config and golden key. The live no-flag diagnostic used a separate local config, retained as `no-flag-slots.json`.
- Stop proof requires exit 143, both XTDB stop lines, no forced halt/OOM, and a finite measured duration below ten seconds. Component stop lines are recorded. Missing/null duration fails, including a repeated stop on an already stopped container.
- Settle now issues two block cuts and uses published block rows, completed/source gauges, advancing upload time, per-table L0 observations, and stable block/trie catalogs with jobs 0 over three readings five seconds apart. It never uses live rows as its settle predicate. The strict G3 conditions remain in place and caused this refusal.
- The golden sequence waits for the query process to exit, proves a stop, checks both log tails offline and refuses nonempty `.tmp`, copies stopped bytes, then starts the source as a reference. Startup watermark, health, zero live rows, unchanged completed transaction/catalog and idle jobs precede C3-C8 fingerprinting and a second clean stop. The golden volume is never started. Failed attempts and intermediate settle observations are retained.
- Block queries enumerate actual published files and re-list immediately before each query. No absent/dense block probe or unlisted table-block query was used.
- Clone readiness includes the same startup checks. E1's plan uses symmetric settle/stop/offline/start steps, no pre-settle restart, equal window offsets after startup, and a 2.2.1 retest of the checkpoint/reference-start requirements. `engine.mjs offline` supplies G8 for the fresh arm.
- `round2-live.mjs` records command arguments, exit status, wall time and stdout/stderr. `round2-wait.mjs` waits without occupying a heavy token; engine.mjs still makes the authoritative reservation. The initial idle heavy-wrapper attempt was explicitly stopped before admission; its log is retained as `live-initial-wait.log`.

## Gates, cleanup and limits

- Focused unit gates: **40/40 PASS**, zero skipped (`unit.tap`). These include null/slow/invalid stop refusal and existing clone-evidence checks.
- Final TypeScript check: **exit 0** (`typecheck-final.log`). It ran through the shared heavy semaphore. Syntax checks of the engine and three round-2 runners and `git diff --check` passed.
- Fresh pinned-image toolcheck: **PASS**, including the actual offline parser against a valid tail, a corrupt-tail refusal and a nonempty `.tmp` refusal (`1794176273647-02-tools.stdout`). This is parser/tool evidence; it is not a successful offline check of the seeded source.
- Initial admission correctly refused 9.25 GiB reserved plus 3.5 GiB against the 11 GiB pool. The live run started only after admission. Engine work used the private endpoint, local config, heavy semaphore and holder CX-K01-R2. Host free space was above 28 GiB at preflight and stayed above the 5 GiB floor; no copy ran.
- **Owned source/clone/golden/diagnostic snapshot volumes retained: none, 0 bytes.** The no-flag and seeded s1 volumes were removed; the one-cut snapshot was never created. `cleanup-status.txt` shows no s1 container, holder or reservation. Existing retained s2 data and all shared residents were untouched by K01. Only the orchestrator changed lane D's lifecycle.
- No full monorepo check, package change, large-rung run, PAIR-0/E1, C9/C10, merge, push, publication or independent promotion is claimed. The golden/reference/clone path is implemented but **not live-qualified**.

## Open questions for the orchestrator / R30 revision

1. How should G3 prove adoption after fast L0-to-L1 compaction removes the L0 view before the first five-second sample? Disk evidence or a compacted descendant might suffice, but that is a new protocol decision.
2. Should G3 bind the block's watermark to an observation at its cut, then allow later compaction messages while requiring the second checkpoint block to match the final gauges? The current strict equality cannot hold after those source messages advance.
3. After that ruling, rerun T1 and T3-T7, make the golden and clone, and independently verify C1-C8 before proceeding to E1. PAIR per-arm manifests, the fixed-time P1 finish-block, the measurement window and Q74c's latency holds remain separate prerequisites.

## Q83d continuation (new attempt; historical refusal above retained)

Q83d now permits live trie coverage at any level. The implementation replaces accumulated L0 sightings with current per-table live coverage for the target block. A fast-compaction regression accepts L1/L3 coverage and rejects another block, missing tables, garbage tries and missing levels. The explicit completed/source watermark equalities, upload advancement, idle compactor and stable listing/digest checks remain intact. Three stable readings with the node source watermark irreversibly past the immutable target block now return an explicit refusal rather than spending the rest of the timeout.

The new attempt uses distinct `round2-q83d` evidence and seed paths; no first-failure artifacts are overwritten. T1 is captured before seeded work, and the golden/clone path is attempted before the sacrificial T6 diagnostic. Current focused unit result: 41/41 pass. Typecheck and live qualification are pending admission; final results follow below.
