# AGE1 maintained load

The maintained import is running at the last settled cut of 493,326,633 indexed records.

The pre-run forecast was 18,000–26,000 records/s including maintenance, 5.58–8.06 more loading hours, and 330–390 GB at 1B. This run uses the recovered 477,456,017-record checkpoint, a 400 GB physical cap, six physical transactor cores, solo saves at depth 256, and named collection and vacuum between windows. Source `6d3d44641`. [Forecast and storage policy](PREDICTIONS.md)

| Window | Settled records | Records added | Elapsed seconds | Writing / maintained records/s | Transactor cores / 6 | Completed automatic indexes | PGDATA before → after maintenance GB | Net GB vs previous cut | Collected segments | Deleted TOAST rows |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Initial | 477,456,017 | 0 | 1403.1 | — / — | — | — | 164.703 → 164.707 | +0.000 | 4,749,920 | 48,895,673 |
| 1 | 493,326,633 | 15,870,616 | 1549.7 | 13,270.05 / 10,240.98 | 3.54 | 32 | 164.848 → 164.849 | +0.141 | 1,632,493 | 8,743,992 |

The first write window verified 15,870,616 records in 1195.973 s. The write phase averaged 3.54 of six transactor cores. Including its drain, collection and vacuum, the first cycle delivered **10,240.98 records/s**. The rate excludes the one-time initial collection. That initial collection is included in total loading time.

The initial cleanup let the first write window advance by 15,870,616 records with 0.141 GB more occupied space before its next maintenance. This is evidence of page reuse. The full database projection still depends on later cycles. The next write window will show whether it reused space freed by the first cycle.

At this checkpoint root had 461.52 GB free and spare had 269.08 GB free. Server 2 accrued USD 43.38 as of 2026-11-21 10:17 UTC. [Source-bound progress hash](evidence/age-v01-bulk-b-progress.sha256)
