# Time to the first protected save after a machine loss (policy B), and the second-failure check

**North star P9:** no acknowledged save lost, writes resume within 60 s, a planned move within 30 s. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md) · [Version 0.1](../../../V0.1.md)

## Summary

**96.8% of policy B's 603.4 s on November 23 was one step: the replacement's local copy of the 126 GB seed (131.4 s) and its SHA-256 check (452.0 s). The check was slow because it ran on one core.** The copy runs inside the PostgreSQL container, whose server placement is one core, so the eight SHA-256 workers shared it (279 MB/s). Two options, both off by default, remove that without dropping the check:

1. `TX2_HA2_COLD_CORES=0-11` runs each cold copy and its check on twelve cores, then puts PostgreSQL back on its own core.
2. `TX2_HA2_COLD_PIPELINE=1` checks each file right after copying it, reading it back from the disk itself, instead of copying all 126 GB and then re-reading all of it.

**Forecast with both: first protected save 80 to 170 s after the fault (central 115 s), against 603.4 s.** About 19.6 s of that is fixed work after the copy: fencing and promotion, the Datomic transactor's takeover, and the new writer. The forecast is derived from the November 23 phases and is not measured. The Mac shows only that the changes are correct.

**The second-failure check is repaired and ran at toy size under both policies** (results below). It now opens A's old disk the way an operator would after losing both machines: PostgreSQL ends recovery on it, a fresh transactor serves it, and the peer reads through that transactor.

**The 60 s bar under policy B needs a second copy that already exists when the first machine fails.** That is a third machine, which is option C at C's price (about $314 a month in the example sizing). Two machines cannot meet it at full size, because a whole-database copy has to be made and checked inside about 40 s.

## Policy B's promise (unchanged)

From `lab/V0.1.md`: "after a machine is lost, new saves are held until a second copy of the data exists. Reads continue. No confirmed save can be lost to a second failure." From [OWNER-DECISION.md](OWNER-DECISION.md): new saves "remain pending or are refused until a replacement has caught up"; a second failure "cannot erase a newly confirmed save because saves stayed pending".

Stated as the code must keep it:

1. A save is acknowledged after the loss only when the replacement is a complete copy. That means a base checked byte for byte against a known-good image, plus every WAL record up to the survivor's flush point, with synchronous commit to it confirmed.
2. Until then every offered save is refused or left pending, never acknowledged.
3. Reads continue on the survivor throughout.

Nothing below changes any of the three.

## Where the 603.4 s went (case `b-235`, November 23)

All times are from `steps` in the case's `sunday-observation.json`, in ms from the first SIGKILL.

| Step | At (ms) | Took | What it is |
| --- | ---: | ---: | --- |
| Detected | 825 | 0.82 s | three missed 250 ms probes |
| Sealed, fenced, prefix, promoted | 1,525 | 0.70 s | ingress sealed, latch written, survivor's WAL prefix checked, `pg_promote` |
| Replacement container start | 1,652 | 0.13 s | old container removed |
| **Local copy of the seed** | | **131.35 s** | 125,924,659,200 bytes, 1,452 files, 8 `cp` workers, 959 MB/s |
| **SHA-256 check of the copy** | | **451.99 s** | the same bytes re-read and hashed, 8 workers, 279 MB/s |
| PostgreSQL start on the copy | 585,515 | 0.52 s | the 12 MB of WAL since the seed replayed during start |
| Caught up, synchronous | 586,138 | 0.62 s | 0 bytes behind at attach; synchronous 460 ms after the request; direct path |
| Copy record checked | 586,198 | 0.06 s | |
| Transactor takeover (broker ready) | 598,258 | 12.06 s | B's standby transactor becomes active; the same 11.9 to 12.1 s after storage turns writable in `a-235` and the move |
| Peer ready | 598,777 | 0.52 s | the read gateway syncs to the new transactor |
| New writer gateway, routed | 601,173 | 2.40 s | `write-b` starts and the ingress opens |
| First protected save | 603,439 | 2.27 s | first commit through the new writer |

**Copy and check: 583.9 s (96.8%). Transactor and writer: 17.3 s (2.9%). Detection to replacement start: 1.7 s.** PostgreSQL start, catch-up and synchronous mode together took 1.2 s.

**What was named on the day, and what it cost in this case:**

| Named cause | On B's recovery path on November 23? |
| --- | --- |
| Serial copies (A's copy, then B's) | No. That was the set-up order of the first pair, repaired before `b-235` (both set-up copies ran at once). The replacement is one copy. |
| The SSH tunnel at 49 MiB/s | No. WAL streamed on the direct path (probe 683 MiB/s), and the replacement was 0 bytes behind at attach. |
| Autovacuum WAL | No. It was off. WAL from primary start to the first offer was about 1.4 MB. It returns in production after any bulk import that is not frozen ([PAIR-REPAIR.md](PAIR-REPAIR.md)). |
| The hash | Yes: 452.0 s, and the copy another 131.4 s. |

**Why the check took 452 s.** The cold copy is a shell script that runs inside the PostgreSQL container before the server starts ([sunday-seed.ts](sunday-seed.ts)). On the servers that container is pinned to one core: `pg: { ..., cpus: "1" }` in `jvm1/launch.mjs`. The eight workers ran BusyBox `sha256sum` (the pinned Alpine image has no other hasher) on that one core. 126 GB in 452 s is 279 MB/s, which is software SHA-256 on one core. Both servers' set-up copies show the same thing: hash 454.1 s and 458.0 s with the same placement. The copy (BusyBox `cp`, same core) ran at 959 MB/s. On the Mac (arm64, diagnostic) BusyBox SHA-256 runs at 194 MB/s on one core.

## What the check is for, and what it does not cover

**What it checks.** Every file of the working copy against the staged seed's manifest (`SHA256SUMS`, whose own digest is pinned in the private config), then the file count. The staged seed was checked once at staging.

**The fault it stops.** A damaged working copy must not start as a database. That covers:

- a seed file changed since staging (disk damage);
- a short, failed or misplaced copy;
- a missing or extra file.

Under policy B this matters directly: the replacement is the second copy that makes new saves protected. A damaged base would replay WAL onto damaged pages and pass for a second copy without being one. A second failure would then leave only that copy.

**What it does not cover:** bytes damaged after the check, the survivor's own disk, or the WAL (PostgreSQL checks each WAL record's own CRC on replay). **No other checksum covers the copy.** The cluster has no data page checksums (`Data page checksum version: 0`, the PostgreSQL 17 default; nothing in the lab passes `--data-checksums`). Page checksums would also be checked only when a page is read, and they do not cover `pg_xact` or the other SLRU files. The servers' filesystems do not checksum file data. So there is no checksum the storage layer already computed that could replace this one.

## What changed (all default off; no existing default changes)

| Option | What it does | Why it keeps what the check protects |
| --- | --- | --- |
| `TX2_HA2_COLD_CORES=<cpuset>` | Right after each cold-copy container starts, `docker update` gives it the named cores (`--cpuset-cpus`; on the Mac, where there is no placement, `--cpus` with the same count). As soon as PostgreSQL accepts connections, the container is put back on its own placement, and the driver checks that the placement matches the original exactly (`cold-cores` and `cold-cores-restored` in `steps`). Applies to both set-up copies and the policy B replacement. | Same script, same bytes, same check. Only the cores change, and only before the server serves anything. |
| `TX2_HA2_COLD_PIPELINE=1` | Each of the 8 workers copies a file and then checks that file at once. The check reads the file back with `dd iflag=direct`, which bypasses the page cache, so the kernel writes the file to disk first and the hash is of the bytes on the disk. The file-count check and the phase report stay. `cold-phases` reports `hash-ms=0`, and a `cold-pipelined copy-and-check-ms=` line gives the one combined phase. | The same digest is checked for every destination file, before PostgreSQL starts. It is stricter than the serial check, which read the disk only for files the container's 8 GiB memory limit had already evicted and read the rest from memory. |
| `TX2_HA2_CASES=b-235,a-235,...` | Server driver only: run just the named Sunday cases, so a short server run can measure one case. | Unset, every case runs as before. Unselected cases are reported as "not selected", not as failures. |

**Fixed, not an option: the second-failure check** (`SyncPair.inspectFirstDisk`). The old path could not run. Details are in the second-failure section below.

**The default copy script is byte-identical to `b03e806fd`.** It is now built from three parts that the pipelined form shares. Its SHA-256 (`64138b36…e403`, 1,994 bytes) is pinned in [recovery-options.test.ts](recovery-options.test.ts).

## What was not changed, and why

| Idea | Decision | Reason |
| --- | --- | --- |
| Skip the re-hash of the already verified staged seed (READINESS: "about 2.5 min") | Rejected | It removes the check. A seed file damaged since staging, or a bad copy, would start as B's second copy unnoticed. The two options above get most of the same time back and keep the check. |
| Trust a checksum the storage layer already computed | Not possible here | There is none (see above). Turning on data page checksums would cover relation pages, and only when they are read. |
| Let saves resume once the copy has caught up, with the full check finishing behind it | Rejected | It breaks clause 1 of the promise. A save acknowledged before the check ends could end up on a base that later fails the check, and a second failure in that window would leave it on a copy that is not a copy. With the pipeline the check also ends when the copy ends, so there is nothing left to run behind it. |
| Start the new transactor during the copy (would save about 12 s) | Rejected for 0.1 | The transactor must write to storage to take over, so PostgreSQL would have to accept commits on one copy during the hold. Ingress would still refuse saves, but any commit made then (for example, a gateway retrying an in-flight request) would be visible to readers. A client resolving an unknown outcome by reading could then count a one-copy commit as acknowledged. Today PostgreSQL itself holds every commit until the second copy exists. This would leave the ingress as the only guard. |
| A second copier container with its own cores | Not built | The same effect as `docker update` on the PostgreSQL container, with one more volume hand-off. |
| Rewind the old disk when the lost machine comes back (crash, reboot, network split) | Proposal | `pg_rewind` rejoined the old disk in 2.2 s in the planned move, so the first protected save would be about 20 s. That is not a machine loss, though, and the machine-loss path still needs the copy. Worth building as "try rewind, fall back to copy" if crashes and reboots turn out to be the common failure. |

## Correctness gates (Mac, lab VM, diagnostic times)

**PostgreSQL gate** ([repair-gate.ts](repair-gate.ts)) with two PostgreSQL 17 containers (the pinned image) and a never-vacuumed 432 MB, 1,292-file seed. It drives `SyncPair.open()` through both cold copies and synchronous attach, kills the primary under acknowledged inserts, promotes, rebuilds the replacement from the seed, and writes a protected insert that must replay on it. New step 6: the copy script in use must pass on the clean seed and must stop before PostgreSQL starts when one byte in the middle of the largest relation file of the seed is flipped.

| Run (evidence `evidence/DX-HA2/`) | Options | Acknowledged inserts lost after kill and promote | Replacement synchronous, protected insert replayed | Damaged byte | Replacement copy and check (diagnostic) |
| --- | --- | --- | --- | --- | --- |
| `gate-default-1128.json` | none | 0 of 40 | yes | refused (`1 of 161 computed checksums did NOT match`) | copy 1.21 s + hash 3.19 s on 1 CPU |
| `gate-options-1129.json` | both, cached read | 0 of 42 | yes | refused | 1.67 s combined on 4 CPUs |
| `gate-options-direct-1131.json` | both, final form (`dd iflag=direct`) | 0 of 42 | yes | refused | 2.20 s combined on 4 CPUs |

In every options run all three cold copies (both set-up copies and the replacement) recorded `cold-cores` and then `cold-cores-restored` with the original quota (1 CPU). The standby that cannot catch up still fails with its lag message.

**Unit tests:** [recovery-options.test.ts](recovery-options.test.ts) (6: default script pinned byte for byte, options off when unset, parsing and refusals, the pipelined script keeps every check, both phase reports parse), `sunday.test.ts`, `catch-up.test.ts` (vitest, 13 in all), and `supervisor.test.ts` (node:test, 7), all passing. The changed files typecheck with no errors.

SECOND_FAILURE_RESULTS

## What the 60 s bar asks of policy B

**Once the second copy exists, B needs about 19.6 s:** 1.7 s to detect, fence, promote and start the replacement, 1.2 s to start PostgreSQL and attach it synchronously, 12.1 s for the transactor takeover, and 4.7 s for the new writer and its first commit. That leaves about 40 s to make and check a whole copy.

| Where the second copy comes from | Time to have it, full size (126 GB) | Meets 60 s? |
| --- | --- | --- |
| Local staged seed, as on November 23 | 583.9 s measured | no |
| Local staged seed, both options | 60 to 150 s forecast; bound by the disk (126 GB written, 126 GB read back) or by eight SHA-256 cores | no |
| Empty disk: base backup from the survivor over the direct path | at least 126 s for the bytes at about 1 GB/s, then a check (`pg_verifybackup` is single-threaded); not measured | no |
| **A third machine already streaming WAL** | 0 s: it is a copy when the first machine fails; it needs only to catch up its last seconds and turn synchronous | **yes: about 20 to 25 s** |

**A copy that already exists is a third machine.** Run as an asynchronous standby, it gives B's promise unchanged and a first protected save in about 20 to 25 s. That is option C in all but the commit rule for healthy service. Option C waits for two standbys on every commit; this variant waits for one and lets the third trail by milliseconds. Its cost is C's cost: about $314 a month for the third machine in the example sizing ([OWNER-DECISION.md](OWNER-DECISION.md)), plus its disk sized to the database. It needs no keep-warm mechanism: the third machine is a standby replaying WAL, and nothing primes caches. So the 60 s bar under B is really a request for the third machine. Option C already plans it for 1.0.

**Without a third machine, the time grows with the database.** The fresh database holds 162 million facts in 126 GB. If size grows with records, 1 billion is about 0.8 TB (not measured), and its copy and check take several times as long. The same options also shorten policy A's exposure. At 235 saves/s, the one-copy window would fall from about 600 s (up to about 140,000 exposed saves) to about 60 to 150 s.

## Server run (needs two rented machines and the owner's approval)

No server is rented today. These are ready for the day a pair is. Use the pair set-up of [PAIR-REPAIR.md](PAIR-REPAIR.md) (direct path, firewall, guards, shared private config, images). Build from the `exp/DX-INT1` commit that contains this branch, set a new `tag`, and launch A first, then B within four minutes, as before. Only the `env` prefix is new. Both roles get the same options so that each `host.json` and log records them; role B drives the cases.

**Run 1, both options, the three required cases** (about 25 to 40 minutes; outer limit 150 minutes):

```sh
cd /var/tmp/triplex-p9-build/repository
sudo env TX2_HA2_COLD_CORES=0-11 TX2_HA2_COLD_PIPELINE=1 taskset -c 0-11 sh -ceu 'exec 9>/var/tmp/triplex-bm1/dx-bm1-day.lock; flock -n 9; export HA1_SUNDAY_FLOCK=1; exec timeout --kill-after=30s 150m "$1" --import tsx lab/experiments/EXP-DX1/hasync1/sunday.ts a "$2"' run /var/tmp/triplex-p9-build/tools/bin/node /root/p9/config.json
# server B, the same with role b:
sudo env TX2_HA2_COLD_CORES=0-11 TX2_HA2_COLD_PIPELINE=1 taskset -c 0-11 sh -ceu 'exec 9>/var/tmp/triplex-bm1/dx-bm1-day.lock; flock -n 9; export HA1_SUNDAY_FLOCK=1; exec timeout --kill-after=30s 150m "$1" --import tsx lab/experiments/EXP-DX1/hasync1/sunday.ts b "$2"' run /var/tmp/triplex-p9-build/tools/bin/node /root/p9/config.json
```

**Run 2 (optional), cores only, `b-235` only, to split the gain between the two options** (about 15 to 20 minutes): the same two commands with `sudo env TX2_HA2_COLD_CORES=0-11 TX2_HA2_CASES=b-235` in place of the `env` above, and a new `tag`.

### Predictions, written before any run

| Measure | Prediction | Wrong if |
| --- | --- | --- |
| Run 1 `b-235`: acknowledged saves lost | 0 | any |
| Run 1 `b-235`: reads | first within 0.35 s, longest gap within 1 s, none missed | any missed read or a gap over 1 s |
| Run 1 `b-235`: replacement `copy-and-check-ms` | 60 to 150 s (central 95 s) | over 200 s: the disk, not the CPU, bounds the copy, so more cores will not help and the next lever is less to copy. Under 30 s: check that the file count and phases are real |
| Run 1 `b-235`: **first protected save after the fault** | **80 to 170 s (central 115 s)** | over 250 s with `cold-cores` marks present; under 60 s (the copy or check was skipped) |
| Run 1 `b-235`: first protected save minus replacement ready | 17 to 22 s (19.6 s on November 23) | over 30 s: something new sits on the path after the copy |
| Run 1: set-up cold copy per server, both at once | 60 to 150 s each (594 s on November 23) | over 300 s |
| Run 1: `cold-cores-restored` for every cold copy, PostgreSQL back on core 1 | yes, every time | any copy without the restore mark |
| Run 1 `a-235`: first failure | 0 lost; first new one-copy save 18 to 25 s after the fault (19.5 s on November 23) | any loss; over 60 s |
| Run 1 `a-235`: **second failure, read through the repaired path** | all 2,800 to 2,950 saves acknowledged before the fault present on A's disk; all 1,700 to 2,300 one-copy saves absent; the old disk opens and its transactor serves within 20 to 90 s | any save from before the fault absent (A's disk lacked a synchronously acknowledged save); any one-copy save present (impossible unless WAL reached A); the read fails |
| Run 1 `move-235` | 0 lost; write pause 12 to 20 s (14.1 s on November 23) | any loss; over 30 s |
| Run 2 `b-235`: replacement copy / hash | copy 45 to 135 s; hash 55 to 75 s (452 s on one core; eight workers on eight cores) | hash over 150 s: the one-core explanation is wrong |
| Run 2 `b-235`: first protected save | 120 to 230 s (central 170 s) | over 300 s |

## Not verified

- **Every time above for full size.** Only the Mac gates ran, and their times are diagnostic. The forecast assumes the replacement's disk sustains at least about 2 GB/s of mixed reads and writes. The November 23 copy shows at least 0.96 GB/s each way on one core.
- **The repaired old-disk read at full size.** At toy size it ran under both policies (above). At full size it adds PostgreSQL crash recovery on A's disk and a transactor start with the server profile.
- **`dd iflag=direct` on the servers' Docker volume filesystem.** It works on the lab VM's ext4. If a filesystem refused direct reads, the check would fail and the copy would stop. It fails safe, and that would show up in set-up before any case.
- **An empty-disk replacement** (base backup over the network), a provider power cut, failover during a first vacuum pass, and policy C or the asynchronous third copy above.
- **The 12 s transactor takeover** is the same in A, B and the move. The toy readback's transactor log shows its likely cause: a starting transactor stays standby until it has seen the old heartbeat missed twice at the lab's 5 s `heartbeat-interval-msec` (standby, missed 1, active, 10 s apart in all), then starts. A shorter heartbeat would cut it in every policy. PROCEDURE.md keeps the documented 5 s on purpose, and this was not changed or measured here.
