# EXP-K01 live round 12 — count confirmed, missing side table refused

Builder CX-K01-R2. Tested head **aec5a715e9ddc2e8727abb691a0cb247e259b87a**, branch exp/K01-seed-clone. Run `runs/xtdb-seed/k01-r12-20261109T060004Z`; holder `CX-K01-R12-live`. North star: exact reusable seeds supporting P1–P5, with correctness before timing. Authority: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md and Q93a–c. No implementation or acceptance files changed.

**Result: STOPPED AT FIRST FAILURE.** Ran the exact LIVE-round12.md admission, numeric probe, fresh-source admission and 500-subject seed commands. The numeric probe passed. Source writes logged 500 subjects in **53.2 s**. Pre-freeze source pinning then exited **1** with a missing-table SQL planning error. No retry or repair; no freeze, golden, clone starts, E1 or further value-kind probes ran.

**Actual tx_assertions COUNT captured before cleanup: 61,384**, matching round 12's independent expected count. This is a new real engine observation, not the earlier offline reconstruction. The diagnostic captured six source COUNT results, then failed closed at the same missing table. Its overall result is explicitly **incomplete**, not a G0 PASS. No completed manifest existed, and none was synthesized.

## Exact first failure

Seed command:

```sh
node lab/bin/heavy.mjs --label CX-K01-R12-seed -- node lab/bench/xtdb-seed.ts --subjects 500 --seed ns-v2 --seed-batch-facts 400 --out runs/xtdb-seed/k01-r12-20261109T060004Z/seed
```

Command interval **2026-11-09T06:02:26Z–06:03:30Z**, exit 1. The write-loop log ends:

```text
[xtdb-seed 06:03:20] seed: 500 subjects in 53.2 s
...
PostgresError: Errors planning SQL statement:
  - Table not found: tx_native_relation_attempts
  - Column not found: scope_key
```

The preserved PostgresError has severity ERROR, SQLSTATE **08P01**, category **incorrect**, engine code **xtdb/sql-error**. Its detail repeats both planning errors and names `tx_native_relation_attempts` and `scope_key`. Full stderr/stack remains in `seed.log`.

Source context, not a repair: G0 derives its table list from adapter-source declarations; `packages/xtdb/src/native/Reachability.ts:164` declares this table separately from base adapter initialization. The actual engine reports it absent. No missing-table error was replaced by a zero count or an empty scan. G0 never completed the source D/Dprime pin, so xtdb-seed.ts did not reach the manifest write. A subsequent independent diagnostic COUNT against the same table also refused; it was not a gate retry and did not change the original result.

## Counts and manifest preservation before removal

The additional read-only capture script was prepared before seeding, guarded by the current s1 owner/holder, and retained as evidence. Its queries retain actual PostgreSQL wire column OIDs and raw text payload hex. It writes successful observations incrementally and retains `complete: false` plus the error if a later read fails. This preserves the requested evidence without adopting partial observations as acceptance.

After the seed command ended, before removing its volume, the script captured:

| Table | Actual COUNT text | Wire OID | Raw payload hex |
| --- | ---: | ---: | --- |
| tx_assertions | **61384** | 20 | 3631333834 |
| tx_attempts | 81 | 20 | 3831 |
| tx_claims | 81 | 20 | 3831 |
| tx_constraint_generations | 0 | 20 | 30 |
| tx_constraint_graphs | 0 | 20 | 30 |
| tx_meta | 1 | 20 | 31 |

These are fresh **post-refusal diagnostics** on the failed source volume, not separately captured values from G0's earlier reads. They confirm the corrected assertion count for this attempt. The diagnostic then reached the missing native table, retained its error, exited 1 and left the table inventory incomplete. Later tables, journal groups and scope-position detail were not captured; no values were inferred for them.

`manifest-preservation.json` was written immediately after the seed exited, while the source volume still existed. It records `exists: false` for `seed/manifest.json`. There is no completed manifest to copy because the pre-freeze pin failed. No partial manifest was fabricated or labeled complete. The planned preservation code would copy a completed manifest to durable external evidence before proceeding if one existed; that branch did not run.

The initial numeric-probe volume also had its six actual COUNT wire frames captured in `probe-counts.json` **before** it was removed. That capture completed, exit 0. Both source and scratch count evidence were preserved before cleanup.

## Native smoke checks and remaining targets

The exact runbook probe exited 0: I32, I64, F32 and F64 catalog/production raw frames for value 1, integer/float width inequality, and both mixed numeric-column production refusals. Their full catalogs, canonical witnesses and refusal assertions are retained in `wire.log`. Both s1 admissions reported healthy pgwire, **3.50 GiB**, **2 CPUs**, config prefix `13f5a70b3665`; engine logs identify **XTDB 2.2.0 [c6c1962]**. The acquired endpoint is port 5471.

| Target | Outcome |
| --- | --- |
| Numeric monotype/mixed-width smoke | Completed |
| Actual source counts | Six observations captured; whole capture incomplete at missing table |
| Source D/Dprime / completed manifest | Not completed |
| Freeze and golden copy | Not run |
| Two clone starts reproducing D and L | Not run |
| E1 fresh seed versus golden Dprime | Not run |
| Remaining value kinds / representations | Not run |
| Golden/clone times | Unavailable |

No full content admission or qualification was inferred from the successful numeric cases or matching assertion count. The 53.2 s write-loop duration is not a qualified golden/clone performance result.

## Disk, ownership, cleanup and evidence

`disk-before-seed.json` records **10,374,721,536 bytes free**, above the runbook floor **5,368,709,120 bytes (5 GiB)**. No disk-guard override was used. After cleanup, free space was **9,926,938,624 bytes**. Both source/probe heavy commands and count captures used heavy.mjs. Engine lifecycle ran only through engine.mjs and the private triplex2 socket.

The scratch and source used two fresh incarnations of managed `tx2-xtdb-s1` / `tx2-xtdb-s1-data`. After their evidence was captured, each cleanup ran:

```sh
node lab/bin/engine.mjs down --lane xtdb --slot s1 --holder CX-K01-R12-live --remove-volume
```

Both exited 0 and reported container/volume removal and reservation/slot-lock release. The final slot lock was absent, and the pool ledger had no matching holder/container reservation or retained volume. **No volume is kept; no golden was created.** No shared XTDB/QLever resident or Datomic lifecycle command was issued.

[evidence/live-round12/INDEX.md](evidence/live-round12/INDEX.md) indexes the approximately **35 KB** evidence. It contains handoff/runtime hashes, exact probe and capture source, raw counts, first-failure stderr, manifest absence, admission/ownership preimages, engine logs, cleanup logs and an explicit terminal receipt. SHA256SUMS verifies the files. All are below 1 MB and the raw directory is below 5 MB, so bulky external spill was unnecessary. Earlier attempts were not overwritten. Runtime source hashes remained unchanged throughout this attempt.

## PASS / verdict / receipt audit

* **Numeric probe:** assertions check real catalog/count/frame content and specific mixed-type refusal; fresh scratch writes/read deadlines and the guarded acquired s1 owner/endpoint bind this invocation. These assertions establish only the six smoke cases, not a G0 PASS.
* **Source pin:** the current attempt refused on an actual planning error before producing D/Dprime or a manifest. No historical pin, count or PASS substituted for it. Missing table does not become empty content.
* **COUNT diagnostics:** complete individual raw frames are retained with exact queries, encoded scope, endpoint and holder. They are fresh reads before cleanup, but refusal-only/diagnostic: the source capture stays incomplete and exits 1. Its matching 61,384 does not grant admission. No error/default path substitutes zero or promotes partial capture.
* **Manifest evidence:** records the actual file absence while the source volume existed. No completed artifact or content claim was invented.
* **Golden/E1:** not invoked or granted. No count/health/owner/copy diagnostic stands in for their content gates.
* **Attempt receipt and cleanup:** receipt records the original failure and separate capture failure, actual exits, source/log checksums, current owner preimages and unrun targets. Cleanup is operational evidence only; command logs and absent lock/ledger entries were checked. It does not qualify seed contents.

No implementation/pinned source moved; lab/acceptance remains unchanged. No offline suite was rerun or counted as live acceptance. Next work must resolve the missing-side-table behavior without weakening complete-content validation, then schedule a separate first-failure attempt for source pinning, freeze, two-start D/L, E1 and remaining native kinds.
