# Sunday paired failover run

**Superseded on November 23 by the [pair repair](PAIR-REPAIR.md):** parallel cold copies, a standby synchronous before the transactor, measured catch-up, direct WAL streaming and a 150-minute run. The role commands below are the old ones.

Start at 05:00 local on November 22 if both machines are released. Use the fresh one-database checkpoint, with ten 100,000-person accounts, 162,456,470 current facts and logical cut 87,002. The run uses the ordered field writer, Java 21 G1 and the INT1 `server` launch settings. It exercises abrupt database and transactor process loss while the host can still be fenced over SSH. A provider power cut is outside this drill.

## Before the window

1. Take the DX-HASYNC1 Sunday change into `origin/exp/DX-INT1`. Its base is `8ae07b227690fd760aa5fd8cec9055c3147170da`. Use the resulting full commit and build it on both servers before 05:00. Follow the [INT1 clean build](../v01/SERVER.md#build-ahead-of-the-allocation). Set `NODE` to the prepared Node binary and start in that build's `repository`. Both servers must have the same pinned PostgreSQL 17 and Datomic images, Node 22 with the built SDK, cores 0–11 available and at least 340 GiB free on the Docker data filesystem in addition to the cold image. Allow 15–40 minutes before the window for the clean builds. Keep both Docker daemons idle for this run.
2. Put one byte-identical cleanly stopped PostgreSQL data directory on each server. Preserve the whole directory including its original WAL and flatten any WAL symlink into `PGDATA/pg_wal` in the staged image. The stop must be clean, with no `postmaster.pid`, recovery signal or backup label. Use the existing `datomic` database and role, local superuser socket access, and host `scram-sha-256` access for the `datomic` and `postgres` roles through the disposable Docker networks. The seed needs the original loader scope and strict record clocks. Keep the staged directory immutable. Allow 3–12 minutes per host to verify and stage a local 126 GB copy before the window. If the stopped copies do not have identical bytes, stage a verified matching pair before starting the clock.
3. From inside the staged `PGDATA/`, use the command below on the source copy and transport its manifest alongside the data. Take the SHA-256 of `SHA256SUMS` independently and obtain the database system identifier with `LC_ALL=C pg_controldata .` from the matching PostgreSQL 17 binary. Put the original pinned SCALE1 `image.json` and `transfer.json` in `origin/<original transfer tag>/` alongside `PGDATA/` and `SHA256SUMS`. The image and transfer digests come from the original handoff. The large logical dump stays where it is.
4. Prepare Linux TUN on both hosts, then enable OpenSSH `PermitTunnel point-to-point` for the dedicated driver account on A. Permit the pinned SSH key on B to reach that account on A over port 22. The account needs non-interactive sudo for the A-side Docker controls and the readiness/release files. Validate the SSH configuration, host key and sudo before 05:00. Use a reserved private overlay IPv4 pair and an unused TUN index from 20 to 99. A and B each open one point-to-point interface for the campaign. PostgreSQL uses 5432, Datomic uses 4334, and the HTTP gateways use 28480 and 28481 solely on those overlay addresses. The echo probe uses 28489. Allow these TCP paths on the local TUN interface and keep provider ingress at SSH22. [SSH tunnel option](https://man.openbsd.org/ssh#-w) · [SSH server tunnel permission](https://man.openbsd.org/sshd_config#PermitTunnel)
5. Create the existing queue lock parent `/var/tmp/triplex-bm1` on both hosts. Give each driver the same private, root-readable JSON file via `P9_CONFIG`. It contains `tag` (new lowercase run ID, 6–36 letters, digits and hyphens), `commit`, `root` (short absolute output parent, same on both), `buildReceipt` (absolute path to the clean build's `BUILD-v0.1.json`, same on both), `scope` (the original image's `scopes[0].name`), `seedSha256`, `cluster` (system identifier as a string), `facts` (162456470), `seedOriginTag`, `seedOriginSha256`, `seedOriginTransferSha256`, `tunnel` (integer), `a` and `b` (each with `address` and `seedDirectory`), and `ssh` (with `user`, A's `target`, and the absolute `identityFile` and `knownHosts` on B). Use dedicated bench credentials. Keep the file and archives private.

```sh
find . -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum > ../SHA256SUMS
sha256sum ../SHA256SUMS
```

## Role commands

Start A first. Start B when A prints that it is ready, within four minutes. Use the prepared absolute `NODE` and `P9_CONFIG` on each host. Both commands take the physical-admission lock and have a 239-minute outer limit. Keep their terminal output.

**Server A**

```sh
sudo sh -ceu 'exec 9>/var/tmp/triplex-bm1/dx-bm1-day.lock; flock -n 9; export HA1_SUNDAY_FLOCK=1; exec timeout --kill-after=30s 239m "$1" --import tsx lab/experiments/EXP-DX1/hasync1/sunday.ts a "$2"' run "$NODE" "$P9_CONFIG"
```

**Server B**

```sh
sudo sh -ceu 'exec 9>/var/tmp/triplex-bm1/dx-bm1-day.lock; flock -n 9; export HA1_SUNDAY_FLOCK=1; exec timeout --kill-after=30s 239m "$1" --import tsx lab/experiments/EXP-DX1/hasync1/sunday.ts b "$2"' run "$NODE" "$P9_CONFIG"
```

Server B controls only this attempt's Docker objects on A, runs traffic against both servers and closes the campaign. Both roles seal a compressed evidence archive with a SHA-256 sidecar under the configured output root. A driver failure preserves its staging output. A surviving `dx-p9-sunday.active` guard means the handoff needs review. Use the owner record and per-attempt IDs to check the exact owned containers, networks and volumes before clearing it. A failed case keeps its first evidence. The next case only begins after verified cleanup.

## Order, predictions and time

Each row starts with two new work directories copied and checked from the staged local image. A and B each verify the local physical bytes before PostgreSQL starts. The working WAL and table data use the same Docker data filesystem. The first standby follows the original WAL timeline over the SSH overlay. After a B-policy fault, A builds a new standby from its original staged image and catches up on B's promoted timeline. This measures recovery with a ready cold seed and a working replacement host. An empty replacement has to transfer a base backup as well. The 32 MiB echo measures both directions together, so it does not establish one-way base-backup throughput. [PostgreSQL synchronous replication](https://www.postgresql.org/docs/17/warm-standby.html#SYNCHRONOUS-REPLICATION)

| Order | Case | Forecast before the run | Reserved |
| --- | --- | --- | ---: |
| Preflight | Matching build, seed metadata, queue and link | 2–8 min. Tunnel adds 0.15–1.5 ms to TCP echo p50 against loopback. Bulk echo 60–220 MiB/s. | 10 min |
| 1 | B at 50 offered saves/s | Zero ACKs lost. 0 exact-read deadlines missed, first answer within 0.35 s and longest gap within 1 s. Rebuild and verify A's standby in 3–12 min. First new protected ACK in 4–13 min. About 12,000–39,000 offers in the hold, mainly refused. | 42 min |
| 2 | B at 235/s | Zero ACKs lost. Same read forecast. First protected ACK in 4–14 min. About 56,000–197,000 offers in the hold, mainly refused. | 42 min |
| 3 | A at 50/s, then second failure | Zero ACKs lost on the first failure. Same read forecast. First new ACK in 18–55 s. Roughly 150–440 new ACKs absent if B's disk is then unavailable. | 35 min |
| 4 | A at 235/s, then second failure | Zero ACKs lost on the first failure. Same read forecast. First new ACK in 22–65 s. Roughly 700–2,050 new ACKs absent if B's disk is then unavailable. | 35 min |
| 5 | Protected planned move at 235/s | Zero ACKs lost. Same read forecast. Writes pause 25–65 s. Rewind, reconnect and candidate replay are on the clock. | 32 min |
| 6 | Returning writer, optional | The original transactor and PostgreSQL fail to restart as writers. A fresh container using the old disk also refuses. Repeat B's receipt and read checks. | 28 min |
| Close | Seal and collect | 2–8 min. Verify each archive against the SHA-256 sidecar. | 10 min |

Total reservation including the optional case is 234 minutes. Local restore and verification are forecast at 3–12 minutes per host per arm. Initial catch-up and service startup get another 2–5 minutes, and receipt readback and cleanup 1–4 minutes. The forecasts are scheduling assumptions. B holds new saves until it can prove a synchronous flush. Protected promotion can complete before clients can save. A reopens first, records a durability alarm and keeps the original writer fenced.

The sender schedules 50 exact pinned reads/s across all ten accounts and runs the declared open-loop save rate. All offers have a one-second caller deadline and a 5.5-second wire timeout. The run records whether each offer was sent and when it answered. A sealed route returns a definite refusal before forwarding. A disconnect or late reply can leave the caller pending. The SDK must keep the command and resend the same ID and payload. The measurement sends each scheduled offer once so it can count what happened during the gap. It verifies the actual ACK stream by ID and original position, Datomic transaction time and recorded clock. [SDK resend contract](SDK-RETRY.md)

For Policy A, B continues to serve saves for at least eight seconds after its first new ACK. The test seals ingress and kills B's PostgreSQL and transactor. With both transactors stopped and B's data process down, it opens the old fenced A disk in PostgreSQL recovery with no upstream. It asks that copy for every earlier and one-copy receipt. The test leaves the staged checkpoint unchanged. Any reported loss is absence from A when B's disk cannot be used. B's disk is retained through the observation and is never erased to manufacture a loss.

The fault start is the first SIGKILL dispatch. The planned start is when ingress seals. The stop for either is the first confirmed save issued on the new route. First read, longest exact-read gap and caller misses are reported separately. Sync probes poll at 250 ms; three missed probes allow for a transient delay. The fence has 8 s because positive proof is required before promotion. PostgreSQL promotion has 5 s. Datomic heartbeats run every 5 s and broker readiness gets 23 s for several heartbeats and reconnect. Cold clone readiness gets 12 min for copying and hashing the full image. The B replacement gets a further 2 min to replay retained WAL, and planned rejoin gets 4 min including rewind. The move still fails its 30-second bar whenever its measured pause exceeds it. [PostgreSQL rewind requirements](https://www.postgresql.org/docs/17/app-pgrewind.html)

Use the [one-page reading sheet](SUNDAY-READING.md). Keep the SSH numbers beside the HA numbers so we can identify the cost of the tunnel. The two-machine allocation can compare A and B. C needs a third data machine in a separate failure domain.
