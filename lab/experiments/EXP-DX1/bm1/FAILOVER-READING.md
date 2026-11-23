# Two-machine failover on bench 4 and server 2, November 23

## Repaired pair (`p9-pair-1123b`): lab `b03e806fd` on build `8ab832093`

Server A is server 2 and server B is bench 4, both under `taskset -c 0-11` with a 150-minute cap. Role A was ready at 20:38:39 UTC and role B started at 20:38:59 UTC. The repair ([PAIR-REPAIR.md](../hasync1/PAIR-REPAIR.md)) makes both cold copies in parallel with 8 workers, attaches the standby before A's transactor, streams WAL directly on TCP 25432, and turns autovacuum off. [Predictions](PREDICTIONS.md#bench-4-2026-11-23)

**Preflight.** The direct bulk probe ran at **683.2 MiB/s** (forecast 300–1,100), with an echo p50 of 0.098 ms. The overlay tunnel ran at 61.4 MiB/s and added 0.109 ms to p50.

### Case `b-235`: policy B at 235 saves/s, no acknowledged save lost

| Measure | Forecast | Measured |
| --- | --- | ---: |
| Acknowledged saves lost | 0 | **0** (`firstLoss` 0; 2,830 acknowledged before the fault, all present) |
| First exact read after the fault | within 0.35 s | 16.5 ms |
| Longest exact-read gap | within 1 s | 47.1 ms; 0 of 30,172 reads missed |
| First protected (two-copy) save after the fault | 4–9 min, almost all local copy and hash | **603.4 s (10.1 min)**, above the range |
| Catch-up of the rebuilt standby | 20–300 MB in under 10 s over `direct` | 0 bytes behind, synchronous 460 ms after attach, endpoint `direct` |
| Writes resume within 60 s (P9 bar) | missed by design | missed (`writes60s` false) |
| Cold copy per server, in parallel | 3–8 min | 594 s each (copy 133–139 s, hash 454–458 s) |
| Standby attach before offers | under 16 MB lag, synchronous within 30 s | 0 lag; synchronous with zero lag 141 ms after the request |

**Steps from the fault (ms):** detected 825 · sealed 876 · fenced 1,017 · prefix 1,121 · promoted 1,525 · replacement start 1,652 · replacement ready 585,515 · standby caught up 585,848 · synchronous 586,138 · broker ready 598,258 · peer ready 598,777 · routed 601,173. **97% of the 10 minutes is the replacement's local copy (131 s) and SHA-256 check of 126 GB (452 s), with 8 workers each.** Detection, fencing and promotion took 1.5 s, and the catch-up over the direct path took under 1 s. On a direct link, then, the time to the first protected save is the time to make and check a local copy. Skipping the full re-hash of an already verified staged seed would bring it to about 2.5 minutes.

Offers in the case: 145,580 (fate: 126,324 refused during the hold, 14,746 subject busy, 1,106 acknowledged by the new writer, 385 late, 202 pending, 148 expired at the sender). No acknowledged save was lost, and the read path stayed within its bars.

**North star P9:** no acknowledged save lost, writes resume within 60 s, a planned move within 30 s. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

### Case `move-235`: planned move at 235 saves/s, writes back in 14.1 s

**The planned move met the 30 s bar: the first save on the new route came 14.1 s after ingress sealed, with no acknowledged save lost.** The forecast was 20–65 s, with the 30 s bar likely missed.

| Measure | Forecast | Measured |
| --- | --- | ---: |
| Acknowledged saves lost | 0 | **0**: 4,146 receipts byte-identical on the survivor; 2,846 acknowledged before the move, 1,300 by the new writer |
| Write pause (seal → first save on the new route) | 20–65 s | **14.1 s**, inside the **30 s P9 bar** (`move30s` true) |
| First read / longest read gap | within 0.35 s / 1 s | 11.2 ms / 27.6 ms; 0 of 707 reads missed |
| Rewind and rejoin | small with vacuum off | rejoined 2.2 s after the seal |

**Steps from the seal (ms):** fenced 950 · prefix 1,041 · promoted 1,455 · rejoined 2,200 · broker ready 10,872 · peer ready 11,883 · routed 11,910 · first save 14,125. As in `a-235`, the transactor broker's start (about 9 s after promotion) is most of the pause. Offers: 7,117 (2,797 refused during the hold, 384 late, 137 expired at the sender).

### Case `a-235`: policy A at 235 saves/s; first failure measured, second-failure check stopped

**First failure: no acknowledged save lost, and writes resumed in 19.5 s.** The fault was the SIGKILL of A's PostgreSQL and transactor at 645.8 s into the case.

| Measure | Forecast | Measured |
| --- | --- | ---: |
| Acknowledged saves lost on the first failure | 0 | **0**: all 4,885 acknowledged receipts read back byte-identical (operation, position, `t`, record clock) from the survivor |
| First new (one-copy) save after the fault | 18–60 s | **19.5 s**, inside the **60 s P9 bar** |
| First exact read / longest read gap | within 0.35 s / 1 s | 21.8 ms / 37.4 ms; 0 of 976 reads missed |
| Cold copies in parallel | 3–8 min | about 600 s each |

**Steps from the fault (s):** detected 0.8 (3 missed probes) · sealed 0.9 · fenced 1.0 · prefix 1.1 · promoted 1.5 · durability alarm (1 copy) · broker ready 13.3 · peer ready 14.1 · routed 16.7 (`single-copy-after-fence`) · first new save 19.5. The broker start (about 12 s after promotion) takes most of the time to the first save.

**Second failure: the check stopped.** B's target and standby were killed at 673.6 s. The step that opens A's fenced old disk to read which one-copy saves it lacks then failed: `Error communicating with HOST tx2-ha1-38c47d73-active or ALT_HOST 10.231.0.1 on PORT 4334`. It tried to reach A's transactor, which the first fault had killed. The "roughly 700–2,050 one-copy saves absent from A's disk" forecast is therefore unmeasured. The case's own cleanup ran, and the run went on to `move-235`. **The HASYNC1 builder must make the old-disk check read PostgreSQL directly, or start its own peer, rather than reach the killed transactor.**

## First pair (`p9-pair-1123a`): not measured

**Priority 9 remained unmeasured on servers after this attempt.** No case reached its first offer. Case 1 failed on the driver's own error. Case 2 hit a harness deadline that cases 3–5 would hit too. The pair was stopped at 17:51 UTC during case 3, on the orchestrator's decision. [Evidence on the Mac](#evidence)

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

## Case 2, B-policy at 235 saves/s: not measured, setup deadline

**Not measured. The standby could not catch up before the setup deadline.** The case stopped at `hasync1/pair.ts` line 337 (`setSync`, `timeouts.setup`): "Deadline waiting for observed WAL acknowledgement mode", 1,529 s into the case, before any offer.

| Step | Elapsed in the case |
| --- | ---: |
| A (server 2): cold copy + hash | 0 → 712 s (limit 720 s) |
| A's PostgreSQL, transactor and write gateway start; B's copy begins | 697–712 s |
| B (bench 4): cold copy + hash | 712 → 1,409 s |
| B's standby: consistent, streaming from A | 17:47:42 UTC, at LSN `1D/13` |
| A's primary at the same moment | about `22/7A`, about 21 GB of WAL ahead |
| Deadline | 1,529 s (about 2 min after the standby started) |

While B copied, A's primary wrote about 29 MB/s of WAL. Each checkpoint covered about 540 MB of WAL every 18.7 s and wrote only about 20 buffers. The standby replayed at about 20 s of A's history per 6.5 s. Its WAL came through the SSH tunnel, measured at 49 MiB/s in preflight, while A kept adding about 29 MB/s. Catching up would have taken about 15–20 minutes. The setup deadline allowed about 2. Role B's log holds 175 lines of `channel 0: rcvd too much data … win 0`, which is SSH window overflow on the `-w` tunnel. A's transactor exited with "Heartbeat failed" during the case's cleanup.

**Cases 3–5 run the same setup, so they would fail the same way.** Case 3 (A-policy at 50/s) started at 17:50 UTC and was stopped at 17:51 UTC while A was copying. Bench 4 had made no container for it. Every owned container, volume, network and the `tun42` device on bench 4 were removed and checked absent. Server 2's driver stops role A and cleans its side.

**Repair proposed to the HASYNC1/INT1 builder:**

1. Make both cold copies at the same time. Each reads and writes only its own machine.
2. Attach B's standby before A's transactor starts, so the standby follows from the seed position instead of chasing 12 minutes of WAL.
3. Otherwise, raise `timeouts.setup` above the measured catch-up time.
4. Find what writes 29 MB/s of WAL on an idle primary with almost no dirty buffers, and whether the tunnel or `ssh -w` window handling should be replaced for bulk WAL.

## Finding: each case spends about 22 minutes copying before its first offer

Each case first makes a fresh working copy of the 126 GB seed on each machine and hashes every file (`hasync1/sunday-seed.ts` `coldCopy`). The two sides run one after the other:

| Step in case 1 | Elapsed |
| --- | ---: |
| A: copy + `sha256sum -c` of 1,452 files | 0.6 → 710.6 s (11.8 min) |
| B: copy + check | 710.7 → about 1,300 s (about 9.8 min; it was then refused at start-up) |

**A's 710 s sits against a 12-minute (720 s) cold-clone readiness limit, so one slow disk second fails the case.** Two changes would make it safe, and neither touches the measurement:

1. **Copy both sides in parallel.** Each copy reads and writes only its own machine's disks, so running them together halves the setup to about 12 min.
2. **Hash once, then copy.** The staged seed is immutable and was checked at staging, so `sha256sum -c` on every case's copy re-reads 126 GB. Checking only `global/pg_control` and the file list per case, or verifying with a parallel hasher (8 threads hashed the same 126 GB in 21 s on bench 4, with the page cache warm from the copy just received), puts the step well under the limit.

Until then, the limit should be raised to at least 18 min on hosts of this class.

## Launch finding: the documented command refuses on SMT hosts

`sunday.ts` `checkLocal` asserts `Cpus_allowed_list == 0-11`. Both servers run with SMT on (0–23), so the SUNDAY.md command stops with "The server profile needs cores 0 through 11". A local role A preflight on bench 4 showed it both ways at 16:57 UTC. Started under `taskset -c 0-11` it reached "Server A is ready for server B". This path does not use `stack/up.sh`, so pinning the launcher is safe. The wrapper is [`bench4-p9-b.sh`](bench4-p9-b.sh).

**Image IDs do not reproduce across hosts.** Rebuilding the same Datomic inputs with `--no-cache` gave `sha256:849a88cd…` against `0b1fcdf8…`. Role B deep-compares A's image IDs with its own. So server 2 loaded bench 4's build directory and `docker save` archive (2.47 GB) instead of building its own.

## Evidence

Bench 4's role B output (case directories with events, consoles and failures, `host.json`, `link.json`, `pair.json`) and its log are in `evidence/DX-BM1/bench4/failover/` on the Mac: `p9-pair-1123a-b.tar.zst` (19,207 bytes), the owner guard and `SHA256SUMS`, checked on both sides.

Running cost of bench 4 at 12:55 EST: about USD 1.30 (USD 1.09/hour from 15:47 UTC).
