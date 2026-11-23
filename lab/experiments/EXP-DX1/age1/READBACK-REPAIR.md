# Restore readback repair for the 1B seal

**The 1B `measure-loaded` attempt passed backup, verify and restore, then failed at the restore readback because no transactor ran on the restored copy. This change starts one there, and adds a resume command that finishes that attempt without repeating the backup, verify or restore.** [Server note](../scale1/V01-AGED.md) · [Scorecard handoff](SCORECARD-HANDOFF.md)

## Cause

- A Datomic peer finds its transactor through a location row that the transactor writes into storage.
- A native restore copies the database, not that row. The restore went into the separate copy PostgreSQL, and the harness started only one transactor, on the primary storage.
- So `restore-check` (`d/connect` on the restored copy) failed with `:db.error/read-transactor-location-failed`. The Mac gate reproduces this exactly.
- A second finding from the gate: a transactor prints `System started` about ten seconds before it writes its location row, and it listens on its port only after that row exists. A peer started on the startup line fails with the same error. Both new start paths wait for the port.

## The change

| File | What it does |
| --- | --- |
| `readback.mjs` | `startRestoreTransactor` starts a transactor on the restored copy: vendor template, the primary's host, the primary's port plus one (4335), heap `-Xms512m -Xmx2g`, memory index 256 MB, object cache 256 MB. It refuses an occupied port, waits until the port listens, and on stop checks the port is closed. Its properties and raw log stay in a private temporary directory that stop removes. A copy of the log with the password removed goes into the attempt evidence as `restore-transactor.log`. |
| `server.mjs`, normal path | After the restore: start that transactor, run the unchanged `restore-check` peer, stop the transactor, then seal. A future `measure-loaded` needs no resume. |
| `server.mjs resume-readback CONFIG ATTEMPT` | Finishes the failed attempt. Re-checks its evidence, reruns only the cheap reads, then runs the readback, seal and scorecard cut exactly as the normal path does. |
| `readback-pins.json` | Digests of the failed attempt's 20 evidence files, its configuration, properties, run spec, basis t, head and record count. |
| `resume-host.mjs` | The server command. Starts the two retained PostgreSQL clusters and the measurement transactor, runs `resume-readback`, then does what the host harness does after a seal. Leaves nothing running. |
| `readback-gate.mjs` | The Mac gate below. |

The peer code is unchanged: `src/`, `packages/datomic` and `scorecard.mjs` are byte-identical to `d90b3728f`, the source the server ran. This branch carries `d90b3728f`'s one-file change, so every `age1` code file equals that commit except the new files and `server.mjs`.

### What resume-readback does, in order

1. **Admits the new checkout** with the same admission as `measure-loaded`.
2. **Proves this is the failed attempt and the same run.** The 20 retained evidence files must match their pinned digests. The failed `config.json` must match its recorded digest. The resume configuration may differ from it only in the checkout, the renewed process IDs and the new settings file path.
3. **Re-applies the normal path's checks to the retained logs.** Rung windows, five cold cells and structure at t 62,888,918. Backup `:succeeded`. Verify complete with no missing or unreadable segments at that t. Restore `:succeeded` of `age-restore-b7d76c53-…` at basis-t 62,888,918. The readback failed with `read-transactor-location-failed` and emitted nothing.
4. **Checks the held cluster live.** `inspect` must show t 62,888,918, head 28,309,866, the recorded native database ID and a finished rung. The `rung` peer replays its frozen result, which must equal the failed rung.
5. **Checks the restored copy and backup.** `restore-location` must show the same data directory, the same storage as the restore PostgreSQL. `list-backups` on the retained backup must list t 62,888,918. No backup, verify or restore runs.
6. **Runs the readback.** Starts the restore transactor, runs the unchanged `restore-check`, stops the transactor. The readback must return t 62,888,918 and head 28,309,866.
7. **Seals.** The `seal` and `scorecard-cut` peers run on the held cluster as in the normal path. `sealed.json` and `aged-scorecard.json` are written by the same code. `sealed.json` reuses the failed attempt's cold cells, structure and copy figures and adds a `resume` record. That record names the failed attempt and its file digests, and says the copy times come from the vendor JVM uptime in the failed attempt's GC logs: backup 816.2 s, verify 1,376.3 s, restore 2,031.5 s. `hours` counts both runs and excludes the idle gap.

### What resume-host does on the server

1. Checks the failed run's records: exit 1, clean cleanup, identity, configuration and properties digests. Both clusters must be cleanly stopped, with no containers or Java processes running. No seal or handoff may exist yet.
2. Recreates the recorded bridge network with the same addresses. The primary's address is inside the pinned properties. Starts the held cluster on its volume and the restored copy on its directory, with the original PostgreSQL settings. Sets the same two role passwords the original start sets.
3. Starts the measurement transactor with the failed run's own `sql.properties` and the `-Xms1g -Xmx5g` profile. Waits until it listens, then writes a new settings file and a resume configuration.
4. Runs `server.mjs resume-readback`, pinned to cores 7, 9 and 10 as before.
5. Repeats the host harness's post-seal steps. It checks the handoff with a fresh peer (`scorecard.mjs export`), then writes `handoff.json`. It stops the transactor, sets the scorecard role passwords, stops the held cluster cleanly, then writes `aged-pgdata.json` with the stopped inventory.
6. Stops and removes both containers and the network. The held cluster, the restored copy and the backup are retained.

## Mac gate (toy size, timings diagnostic)

Evidence: `evidence/DX-AGE1/readback-gate-b.tar.gz`, SHA-256 `de1d2e4a4a78fc98c75bf9f06a3a1914c0d36e9e1255563cb4f83978179756eb`, run at `50f9f2db2` under one ordinary heavy token.

| Step | Result |
| --- | --- |
| Toy database: 400 people in four transactions, 58 renames, indexed | t 1405, 1,205 datoms |
| `backup-db`, `verify-backup` | succeeded, no missing segments |
| `list-backups` | `(1405)`; the server's parsing accepts it |
| `restore-db` into a separate PostgreSQL database as `age-restore-<uuid>` | succeeded |
| Peer read of the restored copy before the repair | **`:db.error/read-transactor-location-failed`**, as on the server |
| `startRestoreTransactor` (the function `server.mjs` calls), primary still running on 4334 | listened on 4335 after about 19 s |
| Peer read of the restored copy at its basis | t 1405, 1,205 datoms, 400 names, person 7's renamed value: all equal to the source |
| Stop | port closed; private directory removed; kept log has no password; a new peer fails again |

The retained 1B evidence on the Mac (the server's compact archive) was also run through `failedAttempt` and `sameRun`. It accepted the pinned attempt: t 62,888,918, head 28,309,866, 1,000,251,169 records, 6,018,339 segments. It refused a changed configuration field, a changed evidence digest and the other attempt directory.

**Not proven on the Mac:**

- `server.mjs` and `resume-host.mjs` are Linux-only and have not run end to end.
- The unchanged `restore-check` peer needs an AGE1 checkpoint, so the gate read the toy copy with its own peer script.
- **A toy bundle cannot pass either consumer.** Both the scorecard pin's `checkScorecard` (`8cc32d380`) and the cache arm's handoff check (`cdc72d4d5`) require at least one billion records and the SCALE1 seed pins. The producer (`writeScorecard` and the `scorecard-cut` peer) refuses under one billion too. So no toy bundle exists that their code would accept. The bundle the resume writes comes from the same unchanged producer that both consumers were written against.

## Server command

Run on Server 2 as root, with nothing else running. `$C` is the commit that publishes this file. The paths are the ones the failed run used.

```bash
B=/var/tmp/triplex-scale1; BUILD=$B/build-28e5e59ee0194fd79e859eb40139630cb86cdb14; NODE=$BUILD/tools/bin/node
git -c credential.helper= clone --no-checkout https://github.com/OnboardedInc/Triplex-db-experiments.git $B/age-source-$C
git -C $B/age-source-$C checkout --detach $C
cd $BUILD/repository && sudo env DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1 PATH=$BUILD/tools/bin:$PATH \
  timeout 3600 /usr/bin/flock -w 900 $B/exclusive.lock $NODE lab/bin/heavy.mjs --label DX-AGE1-resume-readback -- \
  $NODE $B/age-source-$C/lab/experiments/EXP-DX1/age1/resume-host.mjs \
  $B/age-v01-bulk-c $B/age-source-$C $BUILD/repository $B/age-v01-bulk-d
```

The last line prints `resume-sealed` with the handoff path and SHA-256, the seal SHA-256 and the stopped inventory. These feed the scorecard and the cache arm:

- `AGE_HANDOFF_JSON` = `$B/age-v01-bulk-c/rung/1000000000/aged-scorecard.json`
- `AGE_HANDOFF_SHA256` = its digest
- `AGED_PGDATA_SOURCE` = the held cluster directory, `config.dataMount`

Progress goes to `$B/age-v01-bulk-c/resume-<time>-status.log`. The runner log is `resume-<time>-runner.log`.

### Predictions, written before the run

| Step | Prediction |
| --- | --- |
| Start both clusters and the transactor | 1–3 min. Both clusters were stopped cleanly, so no crash recovery. |
| Admission, `inspect`, `restore-location`, frozen `rung` | 2–4 min; t 62,888,918, head 28,309,866 |
| `list-backups` | under 1 min; lists 62,888,918 |
| Restore transactor start | 15–60 s to listen on port 4335 |
| `restore-check` on the cold restored copy | 1–4 min; t 62,888,918, head 28,309,866 |
| `seal`, `scorecard-cut`, `du` of the 6.0 M-segment backup | 3–10 min. `du` is the unknown. |
| Fresh-peer handoff check, stop, role passwords, clean stop | 2–4 min |
| Stopped inventory of the held cluster | about 3 min (the safety-copy check took 170 s for two trees) |
| **Total** | **about 20 min (12–40 min); hard cap 60 min** |
| Bundle | `physicalT` 62,888,918, `logicalHead` 28,309,866, `records` 1,000,251,169, the original database name, `version` `triplex-age1-scorecard/1` |

**What would show this wrong:**

- The readback returns another t or head, or the restored copy cannot be read with the transactor running. Then the restore itself is suspect, and the copy must not be sealed.
- `scorecard-cut`'s live datom count differs from 1,000,251,169. Then the held cluster changed after the failed attempt.
- The run passes 40 min. Most likely cause: `du` over 6 million files, or a cold first read of the restored copy.

## It refuses when

- Any of the 20 pinned evidence files, the failed `config.json` or `sql.properties` differs from its recorded digest. Also when the failed attempt directory is not `b7d76c53-…`.
- The resume configuration differs from the failed one beyond the checkout, process IDs and the new settings file. Also when the checkout is unclean, or its peer, gateway or scorecard code differs from `d90b3728f`.
- A seal, `handoff.json` or `aged-pgdata.json` already exists. Also when either cluster was not stopped cleanly, or containers or Java processes are running.
- The recorded network's primary address is not the one in the pinned properties.
- The held cluster's live t, head, native database ID or frozen rung differs from the failed attempt's.
- The restored copy is in another data directory, the backup does not list t 62,888,918, or port 4335 is in use.
- The readback, seal or scorecard cut differs from the recorded cut. All of these stop before any bundle is written. Only `seal` writes anything first, the checkpoint's closed rung, and it runs after the readback.

If it refuses after starting the clusters, it still stops and removes both containers and the network.

## If the readback had to be dropped

**The question was whether the consumers would take a bundle that says the readback did not run.**

- **Neither consumer checks the readback.** The bundle has no readback field. `checkScorecard` at `8cc32d380` and the cache arm's check at `cdc72d4d5` both verify the version, seed pins, scope, head, record count, ledger digests and a fresh live peer, but not the readback.
- **The only producer refuses it.** `writeScorecard` requires `restore-readback.log` with a matching event.
- **So a bundle without a readback needs a changed producer.** It would pass both consumers unnoticed, so stating the readback as not run would rely on a note, not a check.
- **This is not needed now.** The gate shows a real readback works once a transactor runs on the restored copy.

## Notes for the driver

- **No `age-host.ts` change is needed for the resume.** For a future `measure-loaded` at this commit, `age-host.ts` must accept the new source: it allows only its pinned AGE1 sources. `bulk-loaded.json` must also carry the same source, as before.
- **The restore transactor runs inside the `server.mjs` process tree.** It shares the runner's cores (7, 9, 10) and is stopped before the seal.
