# The paired version 0.1 failover run

For the Sunday two-server policy comparison on the staged full-size image, use [Sunday's role commands](SUNDAY.md) and [reading sheet](SUNDAY-READING.md).

From the clean published revision, supply the two released SSH targets through `BENCH_SERVER` and `BENCH_SERVER_B` and the dedicated private link through `HA1_LINK_A` and `HA1_LINK_B`. The host manifests must assign both machines to DX-HASYNC1. Build the exact revision on both hosts before the timed window. Choose a new tag for each run. [Scorecard rows](SCORECARD.md)

```sh
P9_AGE=fresh P9_SEAL_SHA256="$FRESH_SEAL_SHA256" \
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts hasync-suite "$TAG"
```

Use `P9_AGE=1B` with the independently sealed aged image and a new tag. The default `HA1_RECOVERY_POLICY=B` holds saves until a second copy is ready. `HA1_RECOVERY_POLICY=A` permits one-copy saves with an alarm. A planned move always uses two copies. `P9_OPTIONAL=0` exits after the four priority rows.

## Prepare before the window

Prepare the same integrated build under the controller's build root on both hosts with `lab/experiments/EXP-DX1/t1/bare-metal.sh --prepare`. Provision a read-only physical PostgreSQL 17 checkpoint of the integrated ten-account scope, with all ten 100,000-person accounts in one database. The existing compressed INT1 logical dump needs restoration and a physical backup before this run. Keep the original data untouched.

At `/var/tmp/triplex-ha1/p9-seeds/<age>`, place `legacy/` with the verified `pg_basebackup --manifest-checksums=SHA256` files on A. Use database and application role `moving`, and replication role `ha1stream`, as defined by the synchronous pair setup. Use the exact integrated code when opening the scope and installing its transaction functions before sealing the backup. Save the same `p9-seed.json` on both hosts. Its format is specified by [the seed decoder](../p9/seed.ts). Include the exact source revision, age, origin receipt digest, independently established record count, database scope and basis, system identifier, backup-manifest digest, byte count, and original known receipts. Supply the manifest's expected hash independently when dispatching. The observer reads the protected `storage-credentials.json` separately. Keep the credentials out of evidence. The controller binds the restored basis and native roster to the declared scope and checks the backup bytes again.

On A, allow space for the frozen image, the live copy and a replacement volume. On B, allow space for a full copy, WAL and archive. Before booking the window, time one restore and one base copy on the prepared files. Budget at most four minutes for each verification-and-local-restore and each initial remote copy. B also needs a fresh replacement copy within six minutes after promotion. If the 1B image cannot meet those setup bounds, give it a separate window with a different provisioning plan. No compatible staged physical images or copy timings have been verified for this handoff.

## First 30 minutes

The first phase runs a protected planned move, then a crash with a committed edit's reply held back. It reports all four rows and collects their compressed evidence before requesting another allocation. The worker is capped at 26 minutes. Allow up to four minutes for admission, transfer and verification with a prepared build.

| Row | Bar | Fresh ten-account forecast |
| --- | --- | --- |
| Acknowledged writes lost | 0 | 0 among the known seed receipts and every ACK observed during the drill. |
| Writes resume | At most 60 s | A 15–48 s. B 2–6 min with a prepared replacement host and a fast fresh copy. B can fail the bar. |
| Reads continue | Exact reads throughout | Zero missed 1-second caller deadlines in the scheduled cut and 0.1–1.0 s longest completion gap on a healthy reader. |
| Planned move | At most 30 s | 21–40 s. The copy precedes the seal. Rewind and reconnect can push this above 30 s. |

Forecast about 17–30 minutes for the priority phase under the documented setup bounds. On the aged run, expected acknowledged loss stays at zero and reads use the same checks. The 60- and 30-second bars stay fixed while B's copy and rewind may need longer. The host-loss drill stops the owned primary and transactor and observes the fence and surviving peer. Physical power isolation requires the independent interlock. [Fence](FENCE.md)

## Only if time remains

The controller starts the optional phase after collecting Priority 9. It first tries shared and dedicated PostgreSQL at 1, 4 and 10 systems, then edited 100,549- and 1,000,464-fact checkpoints with withheld reply, index interruption and planned move at each size. These comparison systems use the earlier one-copy recovery policy during the fault. The edited checkpoints use the selected recovery policy. The earlier 16M exploratory seed and save-cost runs remain in history. [Scale and resources](SCALE.md)

| Optional probe | Forecast |
| --- | --- |
| Shared cluster, last new save at 1 / 4 / 10 systems | 12–27 s / 11–34 s / 20–46 s |
| Dedicated clusters, last new save at 1 / 4 / 10 systems | 12–28 s / 13–38 s / 24–55 s |
| 100K / 1M recovery and planned pause | A 11–34 s across the two sizes, with B adding a replacement copy. Planned pauses 12–26 s. |
| Optional execution | About 22–45 min with prepared builds. Admission stops when the next cell cannot fit. |

The optional phase gets only the remaining budget after reserving four minutes for its collection, capped at 55 minutes. The full fresh forecast is 39–79 minutes. The scheduler allocates at most 89 minutes in total. A refusal or failed cell retains its first evidence. Mac clocks remain diagnostic.
