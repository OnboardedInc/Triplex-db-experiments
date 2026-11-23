# Production-shaped save tape on bench 4, November 23

## First launch at REAL2 `173f9d463`: refused before the first offer, at the stack's slot allowlist

**No offer was made.** `prep1/server.sh production` started at 19:17:10 UTC. The build passed (Java 21 and 25 images, unchanged IDs) and the seed adoption passed (`seed.json`, `plan.json`, `SEAL.sha256`). The first arm, `1-prodR-S`, then stopped at 19:18:08 UTC when its stack refused the slot name. The run's own `start.log` was empty because the check is a silent bash test. A stack-level dry run under `SHELLOPTS=xtrace` found the line:

`lab/experiments/EXP-DX1/stack/up.sh` line 258 at `173f9d463` allows only `^tx2-dxprep1-[a-f0-9]{8}-1-(ceiling|scale-(base|cache|wal-zgc)|barrier6|rolling(6|8|12|16)|rolling6(-tx5)?(-cache32)?|fresh(-zgc)?(6|12))-s$` for a prepared PostgreSQL copy. `tx2-dxprep1-…-1-prodr-s` is not in that list. `server.sh` (lines 447 and 113) already accepts `prod(R|S|S-394)(-cache32)?`.

**The REAL2 builder must add `prod(r|s|s-394)(-cache32)?` to that allowlist.** No container, copy or WAL directory remains; the arm's empty WAL directory was removed by its own cleanup. The read of each person's seeded fields, which the document flagged as never run on a server, was not reached.

The predictions stay as written in [PREDICTIONS.md](PREDICTIONS.md) for the repaired launch.
