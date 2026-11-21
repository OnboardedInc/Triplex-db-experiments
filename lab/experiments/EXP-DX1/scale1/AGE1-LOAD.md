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
