# Datomic scorecard v0.1

The release scorecard measures one Datomic database on PostgreSQL with ten deep accounts of 100,000 people. Run the same fixed writer tape and reader ladder on a fresh sealed database and on its 1B-record counterpart. The [version 0.1 definition](https://github.com/OnboardedInc/Triplex-db-experiments/blob/fcfa01b9a4e0b01ab3659f693cff1321692cc529/lab/V0.1.md) and [target bars](https://github.com/OnboardedInc/Triplex-db-experiments/blob/cf738d13cee41ad27f4a092d36a550119257af4b/lab/TARGETS.md) govern both runs.

`node lab/bin/scorecard.mjs --plan` prints the allocation and cost. The [server handoff](experiments/EXP-DX1/v01/SERVER.md) gives the clean-build and unattended run commands. Each output directory contains `SCORECARD-v0.1.md` with nine ranked priorities, four standing correctness checks and links to the measured evidence. Use the [readiness table](experiments/EXP-DX1/v01/READINESS.md) for current integration gaps.

`PASS` requires the complete bar and checked evidence from the physical attempt. `FAIL` identifies a measured miss. `NOT MEASURED` identifies an unavailable or unqualified result and explains the gap. Mac runs display diagnostic numbers.
