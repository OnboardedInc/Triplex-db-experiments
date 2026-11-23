# Pair repair for the two-machine failover run (November 23)

**North star P9:** no acknowledged save lost, writes resume within 60 s, a planned move within 30 s. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

The first paired run (`p9-pair-1123a`, launcher `sunday.ts` at INT1 `8ab832093`) made no offer. Each case spent about 22 minutes copying, and the standby then started about 21 GB of WAL behind a primary that wrote about 29 MB/s with no saves. This repair changes lab TypeScript only. The staged images, the package build and the build receipt of `8ab832093` stay as they are on both servers, so nothing is rebuilt. [Bench 4 reading](../bm1/FAILOVER-READING.md) · [Sunday plan](SUNDAY.md)

## Causes

### 1. The 29 MB/s of WAL is PostgreSQL's first vacuum of a never-vacuumed seed

**The staged seed was loaded and cleanly stopped without a vacuum, so the first start of every working copy runs an autovacuum pass over the whole 126 GB table.** Nothing in the SCALE1 seed builder runs `VACUUM`. The run sets `wal_log_hints=on` (needed for `pg_rewind`), so the first change to each heap page after a checkpoint writes an 8 KB full-page image. The vacuum touches every page once.

The server log matches a vacuum, not Datomic:

- **Datomic wrote nothing.** A's transactor log for the same window has only heartbeats: no index job, no log catch-up, `MemoryIndexMB` 0, `ObjectCacheCount` 0, `RemotePeers` 0. One heartbeat row every 5 s is a few KB/s.
- **WAL began within a minute of PostgreSQL's start.** PostgreSQL was ready at 17:11:54 UTC and the transactor started at 17:11:56. The first WAL-triggered checkpoint came at 17:12:51 with 531 MB of WAL. The autovacuum launcher starts its first worker within its one-minute nap.
- **The pattern is vacuum's ring buffer.** About 540 MB of WAL per checkpoint every 18.7 s (the default `max_wal_size` of 1 GB), yet each checkpoint wrote only about 20 of 262,144 shared buffers. Vacuum writes its own dirty pages from a small ring, so they never reach the checkpointer.

**Reproduced on the Mac (diagnostic).** A 397 MB table loaded with autovacuum off and cleanly stopped, then copied and started with `wal_log_hints=on`:

| First start | WAL in 90 s | Vacuum seen | Full-page images |
| --- | ---: | --- | ---: |
| autovacuum on | 292 MB | `autovacuum: VACUUM ANALYZE public.kvs` from about 45 s, heap 35,744 of 36,586 pages by 75 s | 37,178 (about one per heap page) |
| autovacuum off | 56 bytes | none | none |

**It is product behaviour, not a Datomic or test artefact.** Any database loaded in bulk and never vacuumed repeats it on first start. At the server's measured 29 MB/s, one pass over the 126 GB seed writes on the order of 90 to 126 GB of WAL and takes about 55 to 75 minutes. Every synchronous standby must receive and replay all of it. A standby attached during that pass waits behind it, and so does every protected save. The fix belongs in the seed builder and the bulk import: run `VACUUM (FREEZE, ANALYZE)` before the clean stop, or before a standby is attached. The same full pass returns later as an anti-wraparound vacuum when the table's transaction age passes `autovacuum_freeze_max_age` (200 million by default), unless the import freezes the rows.

**Reads on a never-vacuumed table write WAL too.** With `wal_log_hints=on`, the first read of a page whose rows have no hint bits sets them and logs a full-page image once per checkpoint cycle. That is smaller than the vacuum pass but continues during a case, and the same freeze at import removes it.

**The test now starts PostgreSQL with `autovacuum=off`** on the primary, the standby, the replacement and the rejoin. A database in service has already had its first pass. A 30-minute case at 235 saves/s adds far fewer rows than the 20% insert threshold of a 162-million-fact table, so autovacuum would not run during a case anyway. Each case records the seed table's vacuum state (`n_ins_since_vacuum`, last vacuum times, freeze age), the autovacuum worker count and `pg_stat_wal` at primary start and again before the first offer.

### 2. The set-up order put the standby behind before it started

`SyncPair.open()` copied A's seed (712 s, against a 720 s limit), then started A's transactor and write gateway, and only then started B's copy (another 697 s). A's primary wrote vacuum WAL the whole time. The standby then had `timeouts.setup` (2 minutes) at `pair.ts` `setSync` to reach synchronous mode.

### 3. The SSH tunnel bounds bulk transfer

Everything between the servers ran through one `ssh -w` tunnel. Its 32 MiB echo ran at 49.3 MiB/s with 175 `channel 0: rcvd too much data` lines, while a direct copy between the same servers ran at about 1 GB/s. A policy B failure rebuilds a standby, so the tunnel would bound the time to the first protected save after a failure whenever the catch-up WAL is large.

## Changes

| File | Change |
| --- | --- |
| `sunday-seed.ts` | The cold copy uses 8 workers for the copy and 8 for the SHA-256 check over disjoint parts of the same manifest. It still checks every byte and the file count. It prints `cold-phases copy-ms=… hash-ms=… kib=… workers=8`, which every case records. |
| `pair.ts` | **Sunday order:** A's and B's cold copies start together and get 20 minutes. The standby is attached and caught up, and synchronous mode is confirmed with zero lag, before A's transactor starts. **Catch-up:** `attachSync` waits on `catch-up.ts`, and the replacement after a policy B failure uses the same path. **Direct path:** WAL streaming, the rebuild and the rewind source use each server's direct address on TCP 25432 when the config has one. **`autovacuum=off`** for every Sunday PostgreSQL. |
| `catch-up.ts` | Samples the primary's flush position and the standby's replay position every second. After 20 s it computes a deadline of twice the projected catch-up time plus 30 s from the measured lag and closing rate, within a 20-minute cap. It fails at once if the standby applies no faster than the primary writes. The message gives the lag in MB, the elapsed time, the starting lag and both rates. |
| `sunday-case.ts` | Shortened case list (below). Immediately before the first offer it proves sync mode with zero lag and records the WAL samples. Each result has `steps`: every stage from the failure to the route change in ms. Policy B also records the replacement's copy phases, catch-up bytes and time, and endpoint. |
| `sunday.ts`, `sunday-config.ts` | Optional `lab` (launch commit) beside `commit` (the staged build). The driver checks that `lab` descends from `commit` and changes only `.ts` or `.md` files under `hasync1/` or `ha1/`; the images and package bytes are still checked against the build receipt. Optional `direct` addresses with a bulk probe in preflight, recorded in `link.json`. The time limits are now 146 minutes for A and 136 for B inside a 150-minute outer limit. |
| `ha1/stack.ts` | `Site.replicationAddress` (optional). |
| `repair-gate.ts` | The Mac gate below. |

### What each step from the failure to the first protected save records

`steps` in each `sunday-observation.json` lists, in ms from the fault (the first SIGKILL dispatch) or from the seal of a planned move: `detected`, `sealed`, `fenced`, `prefix`, `promoted`, then for policy B `replacement-start`, `replacement-ready` (local copy, hash and PostgreSQL recovery start), `standby-caught-up` (catch-up bytes, ms and rates), `standby-synchronous`, `replacement-synchronous`, `broker-ready`, `peer-ready` and `routed`. The first protected save is `summary.firstWriteMs`. Under `copy`, policy B also has `phases` (copy ms, hash ms, bytes) and `transfer` (WAL bytes applied, ms, MB/s, starting lag, endpoint `direct` or `overlay`).

## Transport

**Direct WAL streaming between the two servers, on ports the provider firewall opens for these two addresses only.** Each Sunday PostgreSQL publishes 5432 as port 25432 on its own server's routable address. The standby, the replacement and the rewind connect to the other server there. Datomic, JDBC and the HTTP gateways stay on the SSH overlay (0.109 ms extra at p50), which is not on a bulk path.

| Port | From | To | Used for |
| --- | --- | --- | --- |
| TCP 25432 | B | A | B's standby streams from A's primary; B's rewind source for a planned move |
| TCP 25432 | A | B | A's replacement streams from B after a policy B failure; A's rejoin after a planned move |
| TCP 28489 | B | A | Preflight 32 MiB bulk probe on the direct path |

**Expected rate:** 300 to 1,100 MiB/s for the 32 MiB echo, which runs both directions at once, against 49.3 MiB/s on the tunnel. In a case, WAL replay on one PostgreSQL core is the likely bound, at roughly 100 to 400 MB/s for full-page-image WAL. With vacuum off, the catch-up after a policy B failure is small, about 20 to 300 MB, so it should take under 10 s. The run records the probe in `link.json` (`direct.echoMiBps`) and every catch-up in `transfer`. If the direct path is unreachable, preflight fails before any case.

Without `direct` in the config, everything runs over the overlay as before. Use that only if the ports cannot be opened. The vacuum fix still removes most of the bulk WAL.

## Shortened run (150 minutes on both machines)

| Order | Case | Reserve to start | What it proves |
| --- | --- | ---: | --- |
| Preflight | Matching build, launch commit, seed, link and direct probe | (3 min) | Same images and package bytes on both servers; the direct path is up |
| 1 | `b-235`: policy B, abrupt loss of A's PostgreSQL and transactor at 235 offered saves/s | 34 min | No acknowledged save lost; reads continue on B; time to the first protected (two-copy) save, including a rebuild from A's local cold seed and catch-up over the direct path |
| 2 | `a-235`: policy A at 235/s, then a second failure | 26 min | No acknowledged save lost on the first failure; time to the first new one-copy save; one-copy saves absent from the old disk when B is lost as well |
| 3 | `move-235`: planned move, policy B, at 235/s | 24 min | No acknowledged save lost; write pause against the 30 s bar, including rewind and reconnect |
| 4, optional | `b-50` | 34 min | As case 1 at 50/s, if the time remains |
| 5, optional | `a-50` | 26 min | As case 2 at 50/s, if the time remains |
| Close | Seal and collect | (5 min) | |

**Each case still makes its own fresh copies on both servers**, now in parallel. Reusing one cold copy across cases would carry the previous case's promoted timeline, fenced disk or rewound files into the next one. A case would then no longer start from the identical verified seed on both sides, and a policy B rebuild needs an untouched local seed. Parallel copies make reuse unnecessary for the time limit.

A required case that has to be skipped for time counts as a failure. An optional one does not.

## Before launch (both servers)

1. **Firewall:** open the three paths above for the two servers' addresses only.
2. **Clear the stopped run's guard.** Confirm `docker ps -aq --filter label=tx2.holder=DX-HASYNC1` is empty. Then remove `/var/tmp/triplex-bm1/dx-p9-sunday.active` if it is still there.
3. **Check out the launch commit in the staged build** without rebuilding. `LAUNCH_COMMIT` is the full hash of the commit on `exp/DX-HASYNC1-sync-failover` whose subject begins "Publish the pair repair launch".

```sh
cd /var/tmp/triplex-p9-build/repository
sudo git fetch https://github.com/OnboardedInc/Triplex-db-experiments.git exp/DX-HASYNC1-sync-failover
sudo git checkout --detach LAUNCH_COMMIT
sudo git status --porcelain=v1 --untracked-files=all   # must print nothing
```

**Images:** keep the images that were loaded for `p9-pair-1123a`. Image IDs do not reproduce across hosts, so server A keeps the images it loaded from server B's `docker save`. Do not rebuild or reload them; `sunday.ts` compares both servers' image IDs and the package bytes with the build receipt of `8ab832093`.

4. **Edit the shared private config** (`/root/p9/config.json`, the same bytes on both). Keep `commit` as `8ab8320936b646eb5f18fa893966137ad768fc40` and the same `buildReceipt`. Set a new `tag` (for example `p9-pair-1123b`). Add `"lab": "LAUNCH_COMMIT"` and `"direct": {"a": "A_ADDRESS", "b": "B_ADDRESS"}` with each server's own routable IPv4 address. Bring up the tunnel and the SSH set-up as for `p9-pair-1123a`.

## Role commands

Start A first, then B within four minutes of A printing that it is ready. Both servers have SMT on, and `sunday.ts` requires cores 0 to 11, so both launch under `taskset -c 0-11`.

**Server A**

```sh
cd /var/tmp/triplex-p9-build/repository
sudo taskset -c 0-11 sh -ceu 'exec 9>/var/tmp/triplex-bm1/dx-bm1-day.lock; flock -n 9; export HA1_SUNDAY_FLOCK=1; exec timeout --kill-after=30s 150m "$1" --import tsx lab/experiments/EXP-DX1/hasync1/sunday.ts a "$2"' run /var/tmp/triplex-p9-build/tools/bin/node /root/p9/config.json
```

**Server B**

```sh
cd /var/tmp/triplex-p9-build/repository
sudo taskset -c 0-11 sh -ceu 'exec 9>/var/tmp/triplex-bm1/dx-bm1-day.lock; flock -n 9; export HA1_SUNDAY_FLOCK=1; exec timeout --kill-after=30s 150m "$1" --import tsx lab/experiments/EXP-DX1/hasync1/sunday.ts b "$2"' run /var/tmp/triplex-p9-build/tools/bin/node /root/p9/config.json
```

## Predictions, written before the run

| Measure | Prediction | Wrong if |
| --- | --- | --- |
| Direct bulk probe | 300–1,100 MiB/s | Under 150 MiB/s: the direct path is not what bounds or carries the WAL |
| Cold copy per server, in parallel | 3–8 min each (`copy-ms` + `hash-ms`); B's case set-up no longer waits for A's | Over 12 min: the disk, not one stream, bounded the serial copy, and parallel workers gain nothing |
| Seed vacuum state at primary start | `datomic_kvs` shows tens of millions of `n_ins_since_vacuum` and no vacuum after the load | A recent vacuum and few inserts since: the vacuum explanation is wrong |
| WAL from primary start to synchronous mode, vacuum off, no transactor | under 50 MB; no autovacuum worker | Over 5 MB/s: something other than vacuum writes it, and the case records which |
| WAL from primary start to the first offer (transactor and gateways up) | under 300 MB | Over 1 GB: reads setting hint bits on the never-vacuumed pages, or Datomic start-up writes, are larger than assumed |
| Standby attach | starting lag under 16 MB; caught up and synchronous within 30 s of both servers ready | Any catch-up failure message before the first offer |
| Before the first offer | sync with zero lag (standby flush and replay at or past the primary flush) | The zero-lag assertion fails |
| `b-235` | 0 acknowledged saves lost. First answer within 0.35 s, longest read gap within 1 s. First protected save 4–9 min after the fault, almost all local copy and hash; catch-up 20–300 MB in under 10 s over `direct`. **The 60 s bar is missed by design: policy B rebuilds before it accepts saves.** | Any loss; a catch-up over 60 s; a first protected save under 60 s, which would mean the rebuild was skipped |
| `a-235` | 0 lost on the first failure. First new save 18–60 s after the fault. After B is lost as well, every one-copy save after the fault is absent from A's disk and every earlier save is present (roughly 700–2,050 absent). | Any earlier save absent; first new save over 60 s |
| `move-235` | 0 lost. Write pause 20–65 s, including rewind (small with vacuum off) and reconnect; the 30 s bar may be missed | Any loss; rewind over 60 s |
| Whole run | 40–75 min for the three required cases with preflight and close; 60–130 min if both optional cases run | Over 150 min: the outer limit stops the run |

## Gate on the Mac (diagnostic, correctness only)

`repair-gate.ts` drives `SyncPair.open()` itself, with two PostgreSQL 17 containers (the pinned server image) and a small never-vacuumed Datomic-shaped seed in a host directory. It replaces only the container start so that the gate stops where the first transactor would start.

**Passed on `af8a01bd9`** (lab VM, pinned PostgreSQL 17 image, 600,000-row `datomic_kvs` seed of 432 MB in 1,292 files, never vacuumed). The typecheck of the changed files and `catch-up.test.ts` with `sunday.test.ts` (7 tests) also pass.

| Check | Result |
| --- | --- |
| Both cold copies at once, through `open()` | Both `cold-copy` marks with `cold-phases`, then `standby-caught-up` and `standby-synchronous`, all before the transactor start where the gate stops |
| Synchronous with zero lag before the first write | `sync|streaming`; standby flush, replay and the primary flush all at `0/E606240` |
| WAL with autovacuum off, primary start to synchronous | 27,096 bytes in 6.2 s; the seed table shows 600,000 inserts since vacuum and no vacuum, 0 autovacuum workers |
| Kill and promote under synchronous commit | 40 inserts acknowledged before the primary's SIGKILL, 40 present after promotion, 0 missing; new timeline 2 |
| Policy B rebuild from the cold seed | Copy 4.4 s and hash 6.6 s with 8 workers for 432 MB; caught up, synchronous with zero lag at `0/E60BF50` in 1.6 s; a protected insert then replays on the rebuilt standby |
| Standby that cannot catch up | `gate lagging standby: Standby cannot catch up: it applies WAL no faster than the primary writes it. The standby is 89.2 MB behind after 6 s (it started 41.3 MB behind); it applied 0.0 MB/s while the primary wrote 8.0 MB/s` |

Two earlier gate runs found a query the servers would have failed on (an ambiguous column in the WAL-source record), which is fixed. That record can no longer fail a case.

## Not proven

- **The Sunday order with Datomic on the Mac.** The gate runs `open()` up to the transactor, then kills and promotes with PostgreSQL inserts, rebuilds and catches up. The transactor, gateways and Datomic receipts after a failure run only on the servers (and in the combined check's policy B run on the Mac).
- **The direct path.** On the Mac both containers share one host, so the gate uses container names. Port publication and the firewall are first exercised in the server preflight.
- **Parallel copy speed.** It is measured only on the servers.
- **Failover while the first vacuum runs.** The test turns it off; production after a bulk import would carry it until the seed builder freezes the table.
- **Host or disk loss with an empty replacement** (a 126 GB base backup over the network), a provider power cut, and policy C, which needs a third machine.
