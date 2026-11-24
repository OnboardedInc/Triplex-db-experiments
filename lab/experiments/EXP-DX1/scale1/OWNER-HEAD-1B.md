# Owner head pair on the 1 billion database

Build `85fc3a4bd` (`exp/DX-W1-ownerhead-fix`, based on INT1 `61a794c1d`; replaces `3d4320155`, whose summarizer refused the reference arm on the other machine), `w1/SERVER-OWNER-HEAD.md` section "The 1 billion pair (line 2)": reference arm (today's writer) then append arm (`TX2_SUBJECT_OWNER_HEAD=1`), each on a new physical copy of the sealed held cluster, 50 then 235 offered, 120 s each, 16 GiB transactor cache. Dry run of both arms to the first offer first. Runs after the server-32 card's assembly.

## Predictions and falsifiers, copied from the builder's document before launch

### Predictions for the 1 billion pair, written before the run

Late means the second 60 s of each 120 s window. Reference is today's writer; treatment is the owner head. Sources: the 1 billion card's part 2 at 16 GiB (fair turns, 90 s cells: 50.00 and 235.00 stored, 235/s all-save p99 3.8 s, a ceiling near 245–250 saves/s), the fresh pair's predictions above, and the Mac toy gate.

| Measure | 50 offered | 235 offered |
| --- | --- | --- |
| Stored/s, reference | 49.5–50, no expiries | 220–235 (expiries 0–1,500) |
| Stored/s, owner head | 49.5–50, no expiries | 230–235 (expiries 0–300) |
| Late SQL reads per save, reference → owner head | 1.0–2.0 → 0.30–0.80 | 1.2–2.5 → 0.40–1.0 |
| Late AEVT segment loads per save, owner head | under 0.20 | under 0.25 |
| Late mean apply, reference → owner head | 1.2–2.5 → 0.9–1.6 ms | 1.4–3.0 → 1.0–1.8 ms |
| Records per acknowledged save, reference → owner head | 23 → 25–26 | 23 → 25–26 |
| Saves on loader-edited people (whole window) | 80–130 of 6,000 (102 if AGE1 kept 2,000 active people per account) | 400–650 of 28,200 (513) |
| Late reads per save on loader-edited people ÷ on seed people, reference | 0.8–1.5 | 0.8–1.5 |
| Owner-head cut (treatment ÷ reference reads per save), loader group minus seed group | within ±0.20 | within ±0.15 |
| Treatment saves acknowledged without owner-head bytes, either group | 0 (the runner refuses the arm otherwise) | 0 |

- **Who is loader-edited.** AGE1 edited fields 0–2 of a fixed sample in each account (`floor(j × 99,998 / per-account)`, plus one probe person). AGE1's rung document gives 2,000 active people per account; at that count the serial tape touches 47 such people at 50/s and 132 at 235/s. The runner reports the actual counts (`ownerGroupPeople`); the groups come from the rows, not from this formula.
- **Folds and other writers.** The tape replaces one to three of fields 0–2, so no person reaches four root texts in 120 s: no fold at four is expected in either window, and no other writer runs. The toy gate covers both.
- **Migrated-person reads.** The bars and ratios in the table above (fresh) apply. The 1 billion card's reader returned errors for about two thirds of the quiet account's planned reads; if the sampler sees errors, the read comparison is UNJUDGED (60% likely), and the write-side rows above still stand.

### What would show the 1 billion predictions wrong

1. **The owner head does not cut reads at 1 billion:** late treatment reads per save at 235 above 0.8 × the reference's, or treatment AEVT loads above 0.3 per save.
2. **Loader-edited people behave differently under the owner head:** the late treatment ÷ reference ratio for the loader group differs from the seed group's by more than 0.25 at 235 with at least 150 late loader saves, or any treatment save on a loader-edited person is refused, conflicts or lacks owner-head bytes.
3. **The owner head does not add headroom near the ceiling:** treatment stores under 230/s at 235 while its late reads per save fall below 0.6; something other than reads limits the writer at 1 billion.
4. **The cache already covers the set:** reference late reads per save under 0.3 at 50; then 16 GiB is not standing in for a larger database at this tape, and the pair cannot separate the writers.
5. **The launch path fails:** either arm refused before its first save at the copy admission, the aged fresh-peer check or the treatment arm's seal check.


### Added with the fix commit, before launch

- The summarizer skips and counts other event kinds in the lookups file (`otherLookupFileEvents`). The read sampler pins its read at the saved position the same reader just returned and records subject and positions for any error.
- **Prediction:** 0 sampler errors in every window of both arms. Settled pinned p50 above the other machine's 0.76 ms is expected (these are now true pinned reads).
- **Falsifier:** any sampler error is a store defect, reported from `errorSamples` with the subject and positions.
- Layout: OUT is `/var/tmp/triplex-owner-head-1b/run/pair`; copies are under `/var/tmp/triplex-scale1/pgdata/`; the held source is on the spare NVMe. None contains another (`v01/pgdata.ts:83`). No dry run, by the orchestrator's choice of time.

## Result (01:29–01:49 UTC on 2026-11-24): both arms ran, the treatment arm's summary refused

Build `85fc3a4bd` (4 min), no dry run. The reference arm ran 01:29–01:39 and its summary passed. The append arm (`TX2_SUBJECT_OWNER_HEAD=1`) ran its 50 and 235 windows 01:39–01:49. Then `w1/serial/summarize.py` line 125 (`summarize`, from line 203) raised `AssertionError` on `assert stage["subjectSave"] == header["settings"]["observed"]["subjectFunction"]`. The call came through `v01/study-server.ts:182` and `rd1/prepared.ts:148`, so `retirement-comparison.json` was not written. The owner-head arm's saves likely report the covering writer's function where the header records the reference subject function; the builder must teach the summarizer the treatment arm's writer.

Raw window results from the arm files (all offered saves acknowledged):

| Arm | Offered/s | Saves | All-save p50 / p90 / p99 ms |
| --- | ---: | --- | --- |
| Reference (today's writer) | 50 | 6,000/6,000 | 5.15 / 12.16 / 27.39 |
| Owner head | 50 | 6,000/6,000 | 4.99 / 9.60 / 19.46 |
| Reference | 235 | 28,200/28,200 | 4.54 / 10.56 / 30.08 |
| Owner head | 235 | 28,200/28,200 | 4.64 / 9.02 / 31.10 |

The per-group reads per save, the sampler errors and the pass verdict come from the summary that refused, so they are not reported here. Evidence: `evidence/DX-SCALE1/owner-head-1b/oh-pair-1b.tar.gz` in the private evidence folder (SHA-256 `e3f9702f7707b461d8c9bbca5cb9b987b76eef70e263fffa2fc66e31c64af1db`), both arms' directories and logs.
