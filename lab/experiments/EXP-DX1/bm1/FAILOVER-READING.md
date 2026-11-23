# Two-machine failover on bench 4 and server 2, November 23

**North star P9:** no acknowledged save lost, writes resume within 60 s, a planned move within 30 s. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

Run: `hasync1/sunday.ts` at INT1 `8ab832093` ([SUNDAY.md](../hasync1/SUNDAY.md)), tag `p9-pair-1123a`. Server A is server 2 and server B is bench 4. Both started under `taskset -c 0-11` (see below). Seed: the fresh SCALE1 template at cut 87,002, staged on both machines with manifest digest `291bf0b0…` and system identifier `7710454239949164583`. Role A started at 16:59:45 UTC and role B at 17:00:16 UTC. [Predictions written before the run](PREDICTIONS.md#bench-4-2026-11-23)

## Preflight

| Measure | Forecast | Measured |
| --- | --- | --- |
| Tunnel cost on TCP echo p50 | 0.15–1.5 ms | 0.109 ms (loopback 0.038 → overlay 0.146 ms; p95 +0.107 ms) |
| Bulk echo, 32 MiB both ways | 60–220 MiB/s | **49.3 MiB/s**, below the forecast (loopback 542 MiB/s) |

**The SSH tunnel bounds bulk transfer, not the link.** Direct copies between the same two machines today ran at about 1 GB/s.

## Case 1, B-policy at 50 saves/s: not measured

**Not measured. The driver's chmod on the template made the staged seed unreadable, and no offer was made.** After verifying bench 4's copy of the fresh template, the driver ran `chmod -R a-w` on it to protect it. The staged seed copy kept mode 0400 on `global/pg_control`. Bench 4's target PostgreSQL then panicked at 17:22:41 UTC with `could not open file "global/pg_control": Permission denied` (exit 139). The case failed with "Deadline waiting for PostgreSQL 17 target" at 1,431 s. The modes were restored with `chmod -R u+w` at 17:24 UTC. Template and seed both re-verify to the original tree digest `fc501b6a…`, which covers mode, uid and gid. Server 2's side was unaffected. The orchestrator decided not to re-run this case, because case 2 tests the same policy at 235/s.

Forecast for this case: zero ACKs lost; A's standby rebuilt in 3–12 min; first protected ACK in 4–13 min.

## Finding: each case spends about 22 minutes copying before its first offer

Each case first makes a fresh working copy of the 126 GB seed on each machine and hashes every file (`hasync1/sunday-seed.ts` `coldCopy`). The two sides run one after the other:

| Step in case 1 | Elapsed |
| --- | ---: |
| A: copy + `sha256sum -c` of 1,452 files | 0.6 → 710.6 s (11.8 min) |
| B: copy + check | 710.7 → about 1,300 s (about 9.8 min; it was then refused at start-up) |

**A's 710 s sits against a 12-minute (720 s) cold-clone readiness limit, so one slow disk second fails the case.** Two changes would make it safe, and neither touches the measurement:

1. **Copy both sides in parallel.** Each copy reads and writes only its own machine's disks, so running them together halves the setup to about 12 min.
2. **Hash once, then copy.** The staged seed is immutable and was checked at staging, so `sha256sum -c` on every case's copy re-reads 126 GB. Checking only `global/pg_control` and the file list per case, or verifying with a parallel hasher (8 threads read the same 126 GB in about 21 s on bench 4), puts the step well under the limit.

Until then, the limit should be raised to at least 18 min on hosts of this class.

## Launch finding: the documented command refuses on SMT hosts

`sunday.ts` `checkLocal` asserts `Cpus_allowed_list == 0-11`. Both servers run with SMT on (0–23), so the SUNDAY.md command stops with "The server profile needs cores 0 through 11". A local role A preflight on bench 4 showed it both ways at 16:57 UTC. Started under `taskset -c 0-11` it reached "Server A is ready for server B". This path does not use `stack/up.sh`, so pinning the launcher is safe. The wrapper is [`bench4-p9-b.sh`](bench4-p9-b.sh).

**Image IDs do not reproduce across hosts.** Rebuilding the same Datomic inputs with `--no-cache` gave `sha256:849a88cd…` against `0b1fcdf8…`. Role B deep-compares A's image IDs with its own. So server 2 loaded bench 4's build directory and `docker save` archive (2.47 GB) instead of building its own.

Running cost of bench 4 at 12:30 EST: about USD 0.85 (USD 1.09/hour from 15:47 UTC).
