# AGE1 maintained load

The maintained import stopped at the last settled cut of 514,741,853 indexed records. Preserve this working database and the exact run artifacts.

The pre-run forecast was 18,000–26,000 records/s including maintenance, 5.58–8.06 more loading hours, and 330–390 GB at 1B. This run uses the recovered 477,456,017-record checkpoint, a 400 GB physical cap, six physical transactor cores, solo saves at depth 256, and named collection and vacuum between windows. Source `6d3d44641`. [Forecast and storage policy](PREDICTIONS.md)

| Window | Settled records | Records added | Elapsed seconds | Writing / maintained records/s | Transactor cores / 6 | Completed automatic indexes | PGDATA before → after maintenance GB | Net GB vs previous cut | Collected segments | Deleted TOAST rows |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Initial | 477,456,017 | 0 | 1403.1 | — / — | — | — | 164.703 → 164.707 | +0.000 | 4,749,920 | 48,895,673 |
| 1 | 493,326,633 | 15,870,616 | 1549.7 | 13,270.05 / 10,240.98 | 3.54 | 32 | 164.848 → 164.849 | +0.141 | 1,632,493 | 8,743,992 |
| 2 | 514,741,853 | 21,415,220 | 2373.5 | 11,927.62 / 9,022.51 | 3.43 | 44 | 165.737 → 165.738 | +0.889 | 2,628,312 | 14,439,748 |

The first write window verified 15,870,616 records in 1195.973 s. The write phase averaged 3.54 of six transactor cores. Including its drain, collection and vacuum, the first cycle delivered **10,240.98 records/s**. The rate excludes the one-time initial collection. That initial collection is included in total loading time.

The initial cleanup let the first write window advance by 15,870,616 records with 0.141 GB more occupied space before its next maintenance. This is evidence of page reuse. The full database projection still depends on later cycles. The next write window added 21,415,220 records while allocation grew by 0.888 GB before its maintenance.

At this checkpoint root had 461.45 GB free and spare had 268.19 GB free. Server 2 accrued USD 44.10 as of 2026-11-21 10:57 UTC. [Source-bound progress hash](evidence/age-v01-bulk-b-progress.sha256)

## Terminal result and custody

Window two delivered 11,927.62 records/s during its 1,795.431-second write phase, and 9,022.51/s across the full 2,373.5-second cycle. The rate guard stopped at the settled cut of 514,741,853 records, logical head 4,034,400 and native t 38,613,452. PGDATA was 165.74 GB under the 400 GB cap. The second cycle collected 2,628,312 retired segments and PostgreSQL recorded 14,439,748 TOAST deletions. Over both write windows, 37,285,836 records were added and post-maintenance allocation grew by 1.031 GB. The small growth relative to the writes shows PostgreSQL reused space in the second window. The two-window result leaves long-run space growth unmeasured.

Server 2 spent 1 h 30 min 6 s on this continuation including setup, both write windows, the initial and between-window maintenance, and cleanup. It cost USD 1.64. The prior 44 min 47 s ladder brings paid loading time to 2 h 14 min 53 s. At the second-cycle rate, reaching 1B would still take about 14.94 hours, exceeding the 16-hour combined limit. The 2-hour continuation milestone did not occur.

The native backup and restore measurement and the aged scorecard require a completed 1B cut. Both remain unmeasured. The source-bound 12,215,565-byte terminal archive is copied to the Mac, with the original and corrected qualifications, checked tapes, full timing and maintenance logs, final checkpoint and population ledger. The collection allowlist had zero omissions. [Archive and hold hashes](evidence/age-v01-bulk-b.sha256)

After shutdown the custody verifier hashed all 1,511 files and their permissions, covering 165,736,813,591 logical bytes and the PostgreSQL control file. It matched the stopped owned volume and terminal cleanup to the exact source, attempt, checkpoint, population and cycle hashes. A live recovery measurement of the held files remains open. [Stopped inventory](evidence/age-v01-bulk-b.sha256) · [Disposal handoff](HANDOFF.md#before-server-disposal)

## Extended continuation admission audit

- `stageExtendedLoad` checks the pinned hold bytes, original archived and live terminal/cleanup equality, state file digests and exclusive state copies, and the previous runtime network binding. The hold and previous attempt must agree on the source, slot, nonce, seed image, transfer and owned volume. Calibration must identify the same machine, database and seed. `age-host.ts` checks the stopped volume is unmounted from containers and compares a fresh inventory of all files and modes against the hold before starting PostgreSQL. The launcher verifies the archive and separate receipt against their pinned digests and stages the state in a new output parent.
- The pinned AGE1 loader verifies the stopped admission and historical cycles, then reads the native and logical cuts and indexed record count from the running database at admission. The controller's load-completion check requires a fresh admission, exact source, config and calibration hashes, the seed and database identities, the final checkpoint hash, and each phase artifact's bytes from the new attempt. No acceptance files or pins changed.

Pinned AGE1 `efd0c7560` failed the archived-cut entry probe with `ReferenceError: minimumRate is not defined`. The remaining check also encoded the retired one-cycle floor. The one-file derivative `d90b3728f` uses the same consecutive-cycle predicate at entry and after a completed cycle. The probe verified the exact archived cut and paid time, then exercised the 9,022.51/s admission, one slow cycle, equality at 6,500/s, two slow cycles and the original defaults. Synchronous durability, maintenance, storage, deadline and measurement code are identical to the published pin.

The extension launched at 11:10:20 UTC and admitted at 11:13:47 UTC. Admission retained all three archived cycle rows, including initial maintenance. The running attempt reported the exact 514,741,853-record start and began offering new writes. Root had 455.63 GB free and spare had 268.19 GB free at the launch observation. The upstream follow-up kept the loading profile unchanged. [Launch observation digest](evidence/age-v01-bulk-d-progress.sha256) · [Upstream bottleneck analysis](https://github.com/OnboardedInc/Triplex-db-experiments/blob/a0eee1ea1cfe85a45511854f658af08a5435685f/lab/experiments/EXP-DX1/age1/LOAD-READOUT.md)

The prepared measurement launch verifies the completed load's terminal state, live-attempt admission, seed and scope identities, phase nonce, final checkpoint, population, cycles and per-attempt artifact bytes. It stages independently checked copies in a new parent so `measure-loaded` may advance its checkpoint without altering the 1B load certificate. A focused fixture checked three adoptions and eleven refusals, including stale admission, swapped transfer and mismatched phase attempt. Live measurement and native restore are pending the 1B cut and the disk reservation.

<!-- extended progress -->

## Extended continuation progress

**The load reached the target and stopped by itself at 2026-11-22 03:18 UTC: 1,000,002,769 indexed records, native t 62,876,498, after 27 cycles.** PGDATA was 176,382,197,760 bytes after the last maintenance, under the 400 GB cap. The last three cycles delivered 8,187.09, 7,407.30 and 6,675.52 records/s including maintenance; cycle 26 was a short 565-second cycle that stopped at the target. The 1-billion-record load added 485,261,556 records over the 24 resumed cycles. Writing seconds for cycles 10 to 26 are derived as records added ÷ writing rate; completed index jobs and remaining hours were not recorded for them. The server then sat idle with no driver for about 36 hours. [Load evidence](evidence/age-v01-bulk-d-1B.sha256)

| Window | Indexed records | Added | Writing / cycle seconds | Writing / maintained records/s | Cores / 6 | Completed automatic index jobs | PGDATA before → after maintenance GB | Net GB vs prior cut | Collected segments | TOAST deletions | Hours remaining at maintained rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 3 | 538,928,597 | 24,186,744 | 1796.0 / 2410.7 | 13,467.03 / 10,033.06 | 3.71 | 50 | 166.367 → 166.358 | 0.621 | 2,810,703 | 15,937,050 | 12.77 |
| 4 | 560,986,309 | 22,057,712 | 1795.6 / 2366.6 | 12,284.31 / 9,320.45 | 3.53 | 45 | 166.827 → 166.819 | 0.460 | 2,670,357 | 14,930,108 | 13.08 |
| 5 | 582,550,309 | 21,564,000 | 1795.6 / 2369.4 | 12,009.11 / 9,100.97 | 3.47 | 44 | 167.308 → 167.300 | 0.481 | 2,640,079 | 14,625,508 | 12.74 |
| 6 | 603,875,613 | 21,325,304 | 1795.1 / 2375.2 | 11,879.73 / 8,978.39 | 3.51 | 44 | 167.721 → 167.713 | 0.413 | 2,631,639 | 14,806,075 | 12.26 |
| 7 | 625,297,697 | 21,422,084 | 1795.2 / 2416.1 | 11,932.83 / 8,866.34 | 3.51 | 44 | 168.198 → 168.190 | 0.477 | 2,623,291 | 14,812,618 | 11.74 |
| 8 | 646,510,949 | 21,213,252 | 1795.4 / 2393.8 | 11,815.16 / 8,861.81 | 3.51 | 44 | 168.634 → 168.627 | 0.437 | 2,588,561 | 14,688,052 | 11.08 |
| 9 | 667,215,213 | 20,704,264 | 1795.4 / 2407.1 | 11,531.84 / 8,601.33 | 3.52 | 43 | 169.075 → 169.068 | 0.441 | 2,578,373 | 14,791,133 | 10.75 |
| 10 | 688,010,673 | 20,795,460 | 1795.5 / 2439.9 | 11,582.03 / 8,522.93 | 3.53 | — | 169.519 → 169.512 | 0.444 | 2,608,495 | 15,182,557 | — |
| 11 | 708,557,989 | 20,547,316 | 1795.5 / 2435.7 | 11,444.01 / 8,435.76 | 3.51 | — | 169.921 → 169.914 | 0.403 | 2,578,811 | 14,930,793 | — |
| 12 | 729,140,129 | 20,582,140 | 1795.8 / 2452.1 | 11,461.55 / 8,393.80 | 3.50 | — | 170.425 → 170.419 | 0.505 | 2,563,704 | 14,775,108 | — |
| 13 | 749,655,233 | 20,515,104 | 1795.6 / 2464.4 | 11,425.22 / 8,324.59 | 3.53 | — | 170.883 → 170.877 | 0.458 | 2,584,936 | 14,902,894 | — |
| 14 | 770,225,933 | 20,570,700 | 1795.7 / 2490.2 | 11,455.41 / 8,260.63 | 3.51 | — | 171.294 → 171.288 | 0.411 | 2,574,874 | 14,967,060 | — |
| 15 | 790,614,213 | 20,388,280 | 1795.5 / 2496.0 | 11,355.32 / 8,168.37 | 3.53 | — | 171.803 → 171.798 | 0.510 | 2,594,361 | 15,098,537 | — |
| 16 | 810,976,793 | 20,362,580 | 1795.2 / 2508.9 | 11,342.67 / 8,116.02 | 3.50 | — | 172.218 → 172.212 | 0.414 | 2,565,951 | 14,929,953 | — |
| 17 | 831,325,049 | 20,348,256 | 1795.4 / 2517.8 | 11,333.61 / 8,081.70 | 3.51 | — | 172.646 → 172.641 | 0.429 | 2,565,238 | 14,909,254 | — |
| 18 | 851,419,169 | 20,094,120 | 1795.5 / 2530.5 | 11,191.22 / 7,940.86 | 3.49 | — | 173.137 → 173.132 | 0.491 | 2,537,161 | 14,724,647 | — |
| 19 | 871,570,449 | 20,151,280 | 1795.6 / 2532.3 | 11,222.46 / 7,957.66 | 3.56 | — | 173.585 → 173.580 | 0.448 | 2,558,164 | 14,825,776 | — |
| 20 | 891,287,309 | 19,716,860 | 1795.4 / 2534.5 | 10,981.97 / 7,779.33 | 3.50 | — | 174.017 → 174.012 | 0.432 | 2,528,774 | 14,693,000 | — |
| 21 | 911,050,893 | 19,763,584 | 1795.4 / 2548.4 | 11,008.19 / 7,755.34 | 3.54 | — | 174.482 → 174.477 | 0.466 | 2,561,569 | 15,100,088 | — |
| 22 | 932,298,497 | 21,247,604 | 1795.2 / 2577.8 | 11,835.69 / 8,242.45 | 3.65 | — | 174.952 → 174.947 | 0.470 | 2,594,644 | 15,607,355 | — |
| 23 | 955,865,429 | 23,566,932 | 1795.4 / 2849.4 | 13,125.96 / 8,270.80 | 3.80 | — | 175.440 → 175.434 | 0.487 | 2,759,003 | 17,690,111 | — |
| 24 | 977,336,289 | 21,470,860 | 1796.0 / 2622.5 | 11,954.60 / 8,187.09 | 3.64 | — | 175.928 → 175.924 | 0.491 | 2,679,121 | 16,406,187 | — |
| 25 | 996,229,329 | 18,893,040 | 1795.4 / 2550.6 | 10,522.80 / 7,407.30 | 3.41 | — | 176.368 → 176.364 | 0.440 | 2,444,783 | 14,311,463 | — |
| 26 | 1,000,002,769 | 3,773,440 | 352.1 / 565.3 | 10,716.44 / 6,675.52 | 3.19 | — | 176.382 → 176.382 | 0.018 | 485,988 | 2,814,380 | — |

After the first resumed collection, the next window added 22,057,712 records while allocated space moved by 0.469 GB before its own maintenance.

The seven resumed cycles added 152,473,360 indexed records in 4.65 h and 3.330 GB of occupied PGDATA. The startup followed a full-file custody census, so the first cycle includes storage state from those reads. The latest three complete cycles averaged 8,776.45 records/s with the same loading profile.

[Progress evidence](evidence/age-v01-bulk-d-progress.sha256)

<!-- end extended progress -->
