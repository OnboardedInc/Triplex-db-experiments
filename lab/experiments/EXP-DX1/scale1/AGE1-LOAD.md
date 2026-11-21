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

Running at the last checked cut of **667,215,213 records**, native t 46,237,120. Observation at 2026-11-21 15:55:17 UTC. Server 2 accrued USD 49.51. Root had 455.158 GB free, spare 264.858 GB. At the last completed cycle’s maintained rate of 8,601.33/s, the unfilled portion is 10.75 loading hours (USD 11.71).

| Window | Indexed records | Added | Writing / cycle seconds | Writing / maintained records/s | Cores / 6 | Completed automatic index jobs | PGDATA before → after maintenance GB | Net GB vs prior cut | Collected segments | TOAST deletions | Hours remaining at maintained rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 3 | 538,928,597 | 24,186,744 | 1796.0 / 2410.7 | 13,467.03 / 10,033.06 | 3.71 | 50 | 166.367 → 166.358 | 0.621 | 2,810,703 | 15,937,050 | 12.77 |
| 4 | 560,986,309 | 22,057,712 | 1795.6 / 2366.6 | 12,284.31 / 9,320.45 | 3.53 | 45 | 166.827 → 166.819 | 0.460 | 2,670,357 | 14,930,108 | 13.08 |
| 5 | 582,550,309 | 21,564,000 | 1795.6 / 2369.4 | 12,009.11 / 9,100.97 | 3.47 | 44 | 167.308 → 167.300 | 0.481 | 2,640,079 | 14,625,508 | 12.74 |
| 6 | 603,875,613 | 21,325,304 | 1795.1 / 2375.2 | 11,879.73 / 8,978.39 | 3.51 | 44 | 167.721 → 167.713 | 0.413 | 2,631,639 | 14,806,075 | 12.26 |
| 7 | 625,297,697 | 21,422,084 | 1795.2 / 2416.1 | 11,932.83 / 8,866.34 | 3.51 | 44 | 168.198 → 168.190 | 0.477 | 2,623,291 | 14,812,618 | 11.74 |
| 8 | 646,510,949 | 21,213,252 | 1795.4 / 2393.8 | 11,815.16 / 8,861.81 | 3.51 | 44 | 168.634 → 168.627 | 0.437 | 2,588,561 | 14,688,052 | 11.08 |
| 9 | 667,215,213 | 20,704,264 | 1795.4 / 2407.1 | 11,531.84 / 8,601.33 | 3.52 | 43 | 169.075 → 169.068 | 0.441 | 2,578,373 | 14,791,133 | 10.75 |

After the first resumed collection, the next window added 22,057,712 records while allocated space moved by 0.469 GB before its own maintenance.

The seven resumed cycles added 152,473,360 indexed records in 4.65 h and 3.330 GB of occupied PGDATA. The startup followed a full-file custody census, so the first cycle includes storage state from those reads. The latest three complete cycles averaged 8,776.45 records/s with the same loading profile.

[Progress evidence](evidence/age-v01-bulk-d-progress.sha256)

<!-- end extended progress -->
