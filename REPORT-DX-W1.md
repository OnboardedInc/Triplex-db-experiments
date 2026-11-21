# DX-W1 part 12

Base `666b625e5`. The paged owner head adds work to current and pinned reads.
The covering root puts the edited set beside the legacy rows so one owner scan can return both.
The isolated writer produces 23 records on first touch and 24 on a later save, versus 23 for today's writer.
The earlier paged version produced 29 and 26. Its 2,534 string bytes on a later save are the total, with 506 extra over control.
Application routes still use the existing writer and reader. The completed owner head has no server command.
All measurements here are Mac diagnostics. [Scope](lab/SCOPE.md) · [North star](lab/NORTH-STAR.md) · [Targets](lab/TARGETS.md)

## Current and pinned reads

In attempt `owner12-03`, four fresh reader JVMs each selected an identical 81-row fixture at the first and second edited cuts. Current and pinned row digests and ordinary journal bytes matched. The timed components below exclude the fixture's SHA-256 digest, which by itself took about 0.5 ms. The sums are per-sample before taking the median.

| Projection | Current p50 | Pinned p50 | Median components, current / pinned |
| --- | ---: | ---: | --- |
| Legacy | 0.549 ms | 0.551 ms | Owner ranges 44 / 52 µs, row decode 496 / 499 µs |
| Append retirement | 0.602 ms | 0.608 ms | Owner ranges 48 / 52 µs, row decode 540 / 562 µs |
| Paged head | 0.649 ms | 0.675 ms | Root 20 / 18 µs, legacy range 33 / 38 µs, pages 59 / 58 µs, pointer resolution 26 / 30 µs, row decode 499 / 497 µs |
| Covering head | 0.598 ms | 0.595 ms | Owner range 37 / 41 µs, root decode 16 / 16 µs, mask 18 / 18 µs, row decode 525 / 518 µs |

The covering format keeps at most eight edited live rows and eight superseded legacy IDs. It omits the rewritten page and its lookup key. The ninth distinct edit spills into the paged format. A person never touched keeps the legacy path and writes zero extra records. The headline field tape edits only the answer and note. The covering result is about that kind of narrow edit set. An ordinary person can exceed the limit.

Both legacy and covering reads still read the existing owner rows in EAVT. Covering reads remove the extra page seeks and per-edited-row searches. The wider owner scan and extra root bytes could cross a leaf boundary at scale. At a 1.65 ms reference read, the 10% budget is 165 µs. A single extra 0.78 ms miss under the part 9 write-cost model would cost 47% of that reference. That use of a writer fetch price is illustrative. It takes cold reader traces to establish either a gain or a regression at full size.

## Write amplification and index work

| Writer | Native records, first / later | Added UTF-8 string bytes, first / later | Single-transaction append buffer bytes, first / later |
| --- | ---: | ---: | ---: |
| Current | 23 / 23 | 2,055 / 2,028 | 2,568 / 2,557 |
| Append retirement | 23 / 23 | 2,105 / 2,081 | 2,438 / 2,414 |
| Paged head | 29 / 26 | 3,148 / 2,534 | 3,558 / 3,002 |
| Covering head | 23 / 24 | 2,342 / 2,305 | 2,683 / 2,895 |

These are plain one-field fixture saves. At 394 steady saves/s, paged adds 1,182 datoms/s (+13.0%) and 199 kB/s of added string data (+25.0%). Covered adds 394 datoms/s (+4.35%) and 109 kB/s (+13.7%). That is 4.26M or 1.42M extra datoms per hour before counting first touches. At the previously estimated 12.1% first-touch share, the means are 26.36 paged and 23.88 covered versus 23 current.
The index job trigger is size-sensitive. If trigger consumption tracked datoms alone, the observed 64-second gap between jobs at 394/s would become about 57 seconds paged or 61 seconds covered. If it tracked only the measured added string bytes, those gaps would be 51 or 56 seconds. Actual trigger use and settled disk bytes depend on index appearances, retractions, compression and reclamation. The earlier server arm saw 1.398 ms apply outside index-job debt and 2.793 ms during debt, with 0.993 and 1.571 SQL fetches/save respectively. There is no measured frequency or backlog improvement for this layout. Source: `ca01816ed:lab/experiments/EXP-DX1/prep1/CORE-SPLIT.md`.

The covering root saves two page datoms per one-page edit and 229 added string bytes per later save in this fixture. It copies edited row text into each historical root, so the bytes grow with width and live edit count. Shortening the retire mask with prefix encoding could save some bytes. Replacing the embedded row text with IDs alone would again make readers resolve each edited row. Settled PostgreSQL bytes and PostgreSQL WAL bytes need a matched indexed and collected run.

## Integration boundary

The isolated fixture publishes exact native row and journal proofs; the normal writer with the earlier non-authoritative witness still uses the legacy projection. Product Match and native query, index and feed access, creation after the switch, ordered ID reuse, product barrier6/rolling6 recovery, the thirteen removal routes and restored backup, deferred Publish and bulk import on a migrated person are separate gates for the authoritative layout. Until those gates pass, keep it isolated. The protected-row path must keep only sealed references in the covering root.

Rerun DX-CHK1's cold admission and lost-ACK campaign, fair quiet-account Publish plus imports on both sides of the publish cut, real-fair with sealed values, protected current/pinned and batched reads, rolling removal and backup restore under traffic, and its held-offer primary failover and replay. Run both credit modes, including people born after the switch and an import or deferred publish targeting an already migrated person. Verify the authoritative root was written, since the earlier witness also responds to `TX2_SUBJECT_OWNER_HEAD=1`. Checked the combination source at `f7a4f1b9d`; no combined result is adopted here.

## Evidence audit

- The isolated SQL fixture derives the root from the exact legacy or migrated basis. The native transaction compares its prior bytes or its initial legacy revision. The peer verifies exact root, version, retirement and page bytes against that transaction's durable report and checks the existing operation and claim binding.
- Each arm uses a fresh attempt-derived database, peers check exact current and pinned row digests on every sample, and the fixture compares exact ordinary journal bytes. Recovery verification matches receipts to completed synchronous SQL appends by database and native t, with the existing refusal and restart evidence. This is evidence for the earlier witness only.
- Record and string-byte counts read the single log entry at the exact acknowledged native t. Append bytes and sampled reads join on native t, database and the native apply interval. Missing I/O metadata is an unavailable result. No observation here becomes an acceptance verdict.
- Acceptance files and pins were left untouched. The first two attempts exercised the paged assertions before the new SQL fixture exposed native Java list conversion errors. Both failures and corrected preimages are preserved.

The two-saved-edit toy native probe returned zero SQL fetches and zero EAVT, AEVT, AVET and VAET segment loads for each arm at both native cuts in `owner12-04`. It gives a resident-cache control with no power to separate the designs at size.
