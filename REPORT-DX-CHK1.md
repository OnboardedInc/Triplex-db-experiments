# DX-CHK1 combined Datomic gates

North star P1, P2, P3, P5, P6, P8 and P9. Correctness of concurrent exact reads, saves, replay, Publish, import and recovery in one application database. The Mac observations are diagnostic. [Scope](lab/SCOPE.md) · [Priorities](lab/NORTH-STAR.md) · [Targets](lab/TARGETS.md)

The baseline was INT1 commit `666b625e5`. Each run used one ordinary heavy token per heavy step and an owned SQL fixture on the lab VM. A separate reviewer can repeat the gates on the submitted branch. The physical scorecard and two-host cold-image drill are outside the Mac evidence.

## Main finding for tonight

The realistic scorecard configuration has no qualifying combined run on the pinned merge. These two commands reproduce the interface gap before boot or input processing.

```sh
node --experimental-transform-types lab/experiments/EXP-DX1/v01/run.ts --realistic-mix
node --experimental-transform-types lab/experiments/EXP-DX1/real1/server.ts measure --tx-jvm j25-zgc
```

The first returns `ERR_PARSE_ARGS_UNKNOWN_OPTION` for `--realistic-mix`. The second returns the same error for `--tx-jvm`. REAL1's server controller also sets `DX_JAVA=21` and its realistic workload does not use the rolling sender. V01's adopted driver takes the SCALE1 seal. V01 and REAL1 need to agree on the realistic seal, workload input, credit selection, mixed JVM readback and separate WAL device proof before this configuration has one executable scorecard entry.

The removal and append-retirement launch settings can coexist. A declared erasure policy excludes the optimized native marker for the entire protected scope, including a plain field. This was observed on the combined removal and read cases. The guard in `packages/datomic/gateway/src/triplex/gateway/subject_save.clj` requires an absent erasure fence. Send this boundary to W1 and ERASE2 if tonight's estimate assumes both the policy and the native marker for the one database. The guarded saves were exact.

## Runs

| Combination | Checks | Mac result and evidence run |
| --- | --- | --- |
| Rolling6, ordered writer, removal and retirement enabled | 24 ordered saves, same-person positions, pinned values, stored journal, erase marker, and an actual backup/restore. Fresh replay matched all 36 positions. | **Passed**, 13/13 removal routes. `removal-c`, source `1186423b3`. Protected saves used the erasure-fenced retirement path. |
| Rolling6, fair imports, quiet account and Publish | 27 exact saves, two quiet-account receipts on opposite sides of Publish, eight ordered import frames before and after Publish, full row comparison, release receipt and Python-oracle answer. Fresh replay matched 46 positions. | **Passed**, `fair-e`, source `f7a4f1b9d`. |
| Rolling6, three read cores, same-basis batches of eight, early filter, saves, retirement, removal and import | 21 immediate readbacks, 176 logical reads in 22 exact batches, four full import frames, the erasure marker at the pre-removal basis and 27 replayed positions. Live readback used a separate peer with a 32 MiB cache. | **Passed with typed frontier holds**, `read-c`, source `3e4548727`. Final run observed 11 import refusals, 31 immediate-read refusals and nine import-read refusals before exact settlement. |
| Cold admission ramp, rolling6, lost reply and resend | Rate-refused offer was absent before first resend under its original ID. The sender recovered the withheld durable reply. Resending returned the original receipt and produced one position per identity. Three live receipts, nine positions from zero. | **Passed**, `cold-a`, source `62c3ce805`. This exercised the ramp's rate refusal, not a full physical cold-start run. |
| Java 25 ZGC write gateway with the removal combination | Same 24 ordered saves and 36 replayed positions, all 13 routes. Running JVM's HotSpot flags and image/attempt read back. | **Passed**, `removal-zgc-a`, source `1186423b3`. |
| REAL1 realistic toy plus removal | One lean database with 5,600 people across 10 deep, one thin and 10 small accounts. Exact mixed-load seed, 24 saves on REAL1 predecessors, 101 replayed positions and all removal routes. | **Passed**, `real-removal-b`, source `a9e250d5c`. |
| REAL1 realistic toy plus fair import, quiet account and Publish | Same 5,600-person mix. 27 saves, eight import frames and one exact Publish. The two quiet saves bracketed Publish at positions 74 and 101. A new reader replayed 106 positions. | **Passed**, `real-fair-b`, source `f7a4f1b9d`. |
| Policy B, rolling6, append retirement | Killed owned primary storage and transactor, fenced and promoted, then held six offers until synchronous replacement. Six original ACKs, six same-ID reoffers, pinned readbacks, two-copy flush and 13 positions replayed on the survivor. | **Passed**, `failover-c`, source `f7a4f1b9d`. Two PostgreSQL containers in one VM with separate supporting roles. |
| Native append recovery, rolling6, serial revision and sampled lookups | 56 durable receipts with 50 immediate reads, one withheld response recovered, six real append refusals remained absent after restart, and original and ordered retired ID reuse were refused. A future basis was also refused. Fresh replay matched all 57 positions. Native readback checked 19 lookup samples. | **Passed**, `native-a`, source `f7a4f1b9d`; reducer `3e4548727`. |
| Tonight's realistic scorecard with rolling6, Java 25 ZGC transactor, Java 21 G1 writer and separate WAL | CLI and seal compatibility checked. No compatible Mac launch on the pinned branch or dedicated WAL device proof. | **Unverified as a combination.** |

## Reproductions and disposition

- **Initial removal replay, attempt removal-a.** Use a slash in the nonce portion of the SCALE1 operation ID, submit an ordered protected save, then query its operation. The feed and acknowledgement identify the save, while the path lookup returns `absent`. The builder explicitly requires path-segment IDs in `scale1/decision/plan.ts`. Fixed the DX-CHK1 nonce separator.
- **Removal resume, attempt removal-b.** Resume at the erase page's next native t after scheduling 24 rolling saves, then look for the trailing control save in only four native log rows. The erase event was present and the trailing control was outside the page. Updated ERASE2's combined call to follow every subsequent cursor to the control cut and scan each page for the removed value. The four-row page size and both original checks remain.
- **Fair-import launcher, attempt fair-a.** Add retirement and serial options to the HA1 `load-fair` gateway. The combined diagnostic built `-e -e TX2_SUBJECT_APPEND_RETIREMENT=1`, causing Docker to parse the setting as an image. Fixed the DX-CHK1 option splice.
- **Fair-import Publish replay, attempts fair-b and fair-c.** Publish at logical position 14 and query its journal at valid time 1. Native log and operation matched, while the journal query returned no position row at that valid time. Fixed the DX-CHK1 recount to fetch stored history at the exact recorded position without imposing an application valid-time selector. Exact position, command, clock and journal checks still apply.
- **Realistic removal seed, attempt real-removal-a.** REAL1 already contains six rolling control fields at the test's owner IDs. Overlay the same synthetic seed and the initial read sees 12 visible rows instead of six. The DX-CHK1 realistic case now uses the six actual REAL1 predecessors in the one database.
- **Policy B gateway launch, attempt failover-a.** `hasync1/pair.ts` emitted a dangling `-e` before the expanded `HA1_FLEET_HTTP=1` setting. Docker rejected the token as an image reference. The same splice is in the pinned Sunday branch path. Fixed the common argument list and retained the single `-e` on the legacy branch.
- **Policy B strict recovery witness, attempt failover-b.** After promotion and six resumed strict ordered saves, the legacy `first-reprotected` helper in `hasync1/pair.ts` authored a clock at the observed maximum `1800000000012`. Datomic returned `TRIPLEX_CLOCK`. The combined gate feeds the existing replacement-flush check the already verified ordered receipt. The legacy drill still uses its legacy witness.

- **Native reducer holder, attempt native-a.** The live PREP1 gate finished and emitted 56 durable receipts, but the reducer required holder `DX-PREP1`. The combined reducer now requires the DX-CHK1 holder, attempt-specific image tag and matching staged image, build and source hashes. The same native bytes then verified.
- **Import during a removal fence, attempts read-b and read-c.** Start a fair-credit import and an ordered replacement in the protected scope as a removal publishes. The first combined rerun aborted on `ErasureFrontierUnavailable`. The instrumented retry reproduced 11 refusals on the import route. Its bounded retry retained the same grant, command and rows, then journal and receipt checks rejected duplicates or missing frames. Send the underlying behavior to HA1 and ERASE2 for the production import policy. `load1/fair-campaign.ts` calls the import sender through `DatomicClient.transactCommand`, which currently surfaces this erasure refusal.
- **Physical cold driver.** `jvm1/cold-server.ts` hardcodes `creditModeSelection("barrier6")` at the sender. The Mac gate invokes the same ramp logic with rolling6. A physical ramp-and-rolling arm needs a setting owned by JVM1.

The full held 100,000-person Publish, fresh and 1B mixed-profile scorecards, separate WAL filesystem and two-host power loss require the prepared server inputs and topology. The Mac exercised the held Publish path at toy size and process loss within one VM. The playground API/browser and unfinished owner head were outside the combined runs. The latest combined Java 25 writer run repeated the 13-route case. Other matrix cells kept their normal Mac JVM.


## Reproduction commands

Use Node 22 and the assigned lab environment. Install with the lab store, build the referenced packages and leave Git clean before engine admission. Give each line its own output directory or use a fresh run name.

```sh
export TRIPLEX_DATOMIC_FAST_PATHS=save-wire
node lab/bin/heavy.mjs --label DX-CHK1 --   node --import tsx lab/bin/engine.mjs ha1 --slot auto --holder DX-CHK1   --experiment load-fair --diagnostic --combined fair
# Use the same command with read, cold or real-fair.

node lab/bin/heavy.mjs --label DX-CHK1 --   node --import tsx lab/bin/engine.mjs ha1 --slot auto --holder DX-CHK1   --experiment hasync-ack --diagnostic --combined failover

env DX_ERASE1_SUBJECT_WRITER=1 DX_ERASE1_ORDERED_IDS=1   node lab/bin/heavy.mjs --label DX-CHK1 --   node --import tsx lab/bin/engine.mjs erase1 --holder DX-CHK1   --run ledger-authority-regression --sealed-witness --credit-mode rolling6   --combined --people 12 --out FRESH_LABEL
# Add --realistic for the mixed seed.

env DX_JAVA=25 node lab/bin/heavy.mjs --label DX-CHK1 --   node lab/bin/engine.mjs build --lane datomic --holder DX-CHK1 --variant-receipt FRESH_RECEIPT
# Set DX_JAVA=25 and append --write-java25-receipt FRESH_RECEIPT to the removal gate.

env DX_CHK1_APPEND_GATE=1 python3 -B lab/experiments/EXP-DX1/prep1/manage.py   FRESH_OUTPUT rolling-recovery 5 1 1 0 1 1
python3 -B lab/experiments/EXP-DX1/prep1/read-rolling-recovery.py FRESH_OUTPUT FRESH_REDUCTION_JSON
```

## Result and receipt audit

- `chk1/replay.ts` opens a new SDK client at native t=0 after traffic settles. Every logical position through the exact terminal head must appear once, in order. It independently joins observed native t, operation ID, command, tx and record clock to each captured receipt and fetches the corresponding stored journal at that recorded position. The callers reconcile the full tested suffix against the expected number of live saves, imports, Publish or removal. Seed and enrolment entries before that interval are replayed as prefix continuity.
- `erase1` binds the regression and rolling overlap to the fresh nonce, content hashes, mounted gateway, Linux role IDs, exact reservation and database. The native 13-route suite retains positive controls and actual backup/restore. The rolling subset binds assertion and predecessor IDs, exact pinned values, same-person order, native erase marker and receipt replay. The archive restore occurs after the live journal audit because it reopens the earlier database.
- `chk1/campaign.ts` binds the membership fixture or REAL1 seed, writer identity, role IDs and policy readback to the attempt. Import frames have authored contents and source order. Publish checks its marker and receipt, then checks the exact pinned answer against the independent domain oracle. The cold result binds refused and withheld requests to the submitted IDs and rechecks the durable suffix.
- `chk1/read.ts` verifies the applied flags and early filter on the bound reader. It checks the seed IDs and original values, the exact erased marker after publication even at the same old cut, immediate reads of every rolling save and the independent full imported rows. It requires every logical batch and all replay receipts.
- `chk1/failover.ts` verifies owned role termination, the supervisor's fencing and replacement, the typed ingress hold and absence of held operation IDs, then reoffers the same inputs and compares their immediate pinned values and exact receipts. The surviving reader restarts at t=0. The rebuilt standby must have flushed the recovered prefix before its observed receipt is recorded.
- The PREP1 recovery reducer verifies the attempt owner, image and source bytes, append clock against the actual reply clock, exact mode, exact refusal and receipt denominators, lookup windows and full replay. An exit-zero alone cannot satisfy the reducer.
- Scoped TypeScript, shell and diff checks passed. The lab acceptance files were searched by changed path and previous digest. Two documents reference the engine manager by name. No matching acceptance content pin changed.

## Evidence

Archive checksums and member index are staged in `lab/experiments/EXP-DX1/chk1/`. The durable directory is the lab evidence root under `DX-CHK1`. Archives include first failures, successful checks and cleanup records. Mac latency figures carry no scorecard verdict.
