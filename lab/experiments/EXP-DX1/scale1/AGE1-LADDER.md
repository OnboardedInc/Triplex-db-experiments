# AGE1 bulk ladder

The first completed solo window wrote 16,364,356 verified records in 828.154 seconds. Its whole-window rate was 19,760.04 records/s and the final steady samples averaged 15,242.78 records/s. The forecast was 7,000–9,500. The 8- and 24-save grouped arms are still pending.

The pinned collector at `acd350e92` reports zero index jobs for the solo arm. The raw `:update/create-index` events show same-scope starts and finishes with `next-t` and duration. The library logs the physical database identifier with a UUID suffix. The collector requires an exact match to the unsuffixed logical database name, so it rejects those events before pairing. The transactor's matching PID, bounded phase clock, starting and ending transaction t, and ending index basis are present in the retained evidence. [Pinned filter](https://github.com/OnboardedInc/Triplex-db-experiments/blob/acd350e927515b7c4d99f134f8600ea8de4d63f8/lab/experiments/EXP-DX1/age1/bulk-metrics.mjs#L54)

The pinned continuation still requires its own qualifying calibration. Keep its original result and raw log slices. Any independent index count will be reported beside the pinned result. The fresh scorecard follows the ladder regardless.
