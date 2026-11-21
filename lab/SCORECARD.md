# Datomic scorecard v0.1

The release scorecard adopts the held SCALE1 database with ten deep accounts of 100,000 people on Datomic and PostgreSQL. The server command accepts the fresh seal and the AGE1 identity for its 1B-record counterpart. Both runs use compact layout K with a queryable journal. Select the default per-person-ordered writer or a grouped replay. The default command includes the grouped P2 and P6 comparison. The [version 0.1 definition](https://github.com/OnboardedInc/Triplex-db-experiments/blob/fcfa01b9a4e0b01ab3659f693cff1321692cc529/lab/V0.1.md) and [target bars](https://github.com/OnboardedInc/Triplex-db-experiments/blob/cf738d13cee41ad27f4a092d36a550119257af4b/lab/TARGETS.md) govern both runs.

`node lab/bin/scorecard.mjs --plan` prints the allocation and cost. The [server handoff](experiments/EXP-DX1/v01/SERVER.md) gives the clean-build and unattended run commands. Each output directory contains `SCORECARD-v0.1.md` with nine ranked priorities, four standing correctness checks and links to the measured evidence. Use the [readiness table](experiments/EXP-DX1/v01/READINESS.md) for current integration gaps.

`PASS` requires the complete bar and checked evidence from the physical attempt. `FAIL` identifies a measured miss. `NOT MEASURED` identifies an unavailable or unqualified result and explains the gap. Mac runs display diagnostic numbers.

The adopted command records components of P1–P4 and P6–P8. P5 and P9 explain their current held-seed requirements in the card. The fixed-pace P8 arm uses the grouped writer.
