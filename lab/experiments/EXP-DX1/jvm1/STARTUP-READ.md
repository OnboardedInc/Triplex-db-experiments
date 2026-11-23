# One-time start-up read

**Owner's decision, 2026-11-23:** "Yeah you can add the one-time read. That's fine with me." A read of index data once, before the service admits traffic, then stopping, is allowed. Anything periodic, any reader after admission, replaying saves and synthetic saves stay out. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md) · [Cold-start reading, section B](COLD-START.md)

## What the first minute reads

Source: the two Saturday 32 GiB cache runs at 430 million records (`evidence/DX-BM1/bench3/bench3-cache32` and `bench3-cache32b`, three transactor cores, 394 offered). Every reply carries the transactor's own io-stats for its save, so the first minute can be split by index.

| First 60 s of the loaded window, by completion | cache32 | cache32b |
| --- | ---: | ---: |
| Saves completed | 20,345 | 18,843 |
| Distinct people among them | 17,309 | 17,309 |
| Storage gets (SQL) | 23,427 (1.15 per save) | 23,299 (1.24 per save) |
| EAVT segment loads | 18,285 | 18,285 |
| AEVT segment loads | 24,055 | 24,044 |
| AVET and directory segment loads | 0 | 0 |
| Save p99, first 30 / 60 / 120 s | 12.6 / 14.6 / 14.5 s | 13.6 / 15.8 / 15.7 s |
| Fifth minute: storage gets per save, p99 | 0.045, 660 ms | 0.045, 121 ms |

- **Every miss is the first save of a person.** That tape had no repeat until second 33. Per new person, the save loaded 1.06 EAVT leaves (the owner's identity, revision and current rows) and 1.39 AEVT leaves (`:triplex.entity/row` for the retraction of the old row, and the revision), and fetched 1.35 segments from storage. By second 45 every save was a repeat, and storage gets fell to zero until the first index adoption at 78 s.
- **Roots, directories and AVET were already resident.** Each save touched 75 directory nodes and 27 AVET nodes, all object-cache hits after the 300-second quiet cell. On a true cold start they load once, a few hundred segments. The log tail is replayed by the transactor before it announces "System started", so it is not a first-minute cost.
- **Bytes.** The transactor's storage gets averaged 19.3 KB (775 MB over 40,231 gets in the minute from 13 s, which also holds the first index job). The saves' own 23,400 gets are about 450 MB.
- **Where PostgreSQL served them.** `pg_stat_io` counted 148,000 shared-buffer misses (1.2 GB of 8 KB blocks) for client backends in the first 75 seconds, about 3.7 blocks per segment, with 15.3 s of read time: 0.10 ms per block. That latency is a device read, not a page-cache hit (a few µs). The Saturday harness did not sample cgroup device counters, so the device share is inferred, not measured. After 90 s PostgreSQL misses fell to 100 to 400 per 15 s.
- **The cost is in the transactor.** In the first 15 s each storage get cost 0.35 ms of SQL and 0.70 ms of decoding inside the serial apply, plus in-flight waits. Warming only PostgreSQL would remove the smaller part.

## What a start-up read has to cover

**The EAVT and AEVT leaves of the people who will be saved in the first minute, loaded into the transactor's object cache, plus the owner's EAVT leaf and AVET identity entry in the write peer's cache.** The fifth minute is cheap only because its people were saved in minutes one to four.

- **A full sweep does not fit.** At 1.35 segments and 26 KB per person, all one million people are about 1.35 million segments and 26 GB stored, more decoded. That exceeds the 32 GiB cache once decoded and would take minutes. It cannot meet the 60-second restart bar of priority 9.
- **The predictor available at a restart is the log tail.** People saved in the minutes before a restart are the people saved after it (the fixed workload's active set: half of reads target people written in the previous 60 s). The step reads the owners named by the last `window` seconds of the log, newest first.
- **A fresh copy has no such tail.** Its last transactions are the loader's, which name about 3,000 of a million people and almost none of the tape's. A start-up read on the existing cold trial would therefore read the wrong people and change nothing. The trial for this step restarts the JVMs after traffic, on the same storage.

## The step

[`startup-read.clj`](startup-read.clj), default off.

1. **Loaded only in its arms.** The launcher adds `-i /dxh1/startup-read.clj` to the transactor and the write gateway only when `DX_JVM1_STARTUP_READ_HOOK=1`. A thread starts only on a boot the runner marked with `startup-read-<role>.enabled` before starting the JVM, so the first boot, which carries traffic, has no reader.
2. **Runs once, after the transactor and gateways are up and before admission.** The runner writes the request after both gateways answer `/health`. The thread takes the request once, reads, writes `startup-read-<role>.report.json` and exits. Its fixed pool is shut down and joined. The runner opens admission only after both reports exist and `/proc/<java pid>/task/*/comm` shows no `tx2-sread` thread in either JVM; it checks again during and after the window.
3. **Reads through Datomic's public API.** `d/connect`, `d/log`, `d/tx-range` (from the newest transaction's instant minus the window), then per owner `d/datoms :eavt owner`, and in the transactor `d/datoms :aevt :triplex.entity/row owner` and `:triplex.entity/rev`; in the write peer the owner's `:triplex.entity/id` in AVET, through its own serving connection, which it keeps. The transactor releases its connection. Datomic is not modified and no decompiled code is used. Storage gets are counted with the same `datomic.measure.io-stats/with-io-stats` call the gateway already uses.
4. **Bounded.** A wall-clock limit (30 s on the server), a cap on scanned transactions (200,000) and owners (40,000), and a segment budget (150,000 segment loads, about 2.9 GB stored). The report gives the stop reason (`complete`, `segment-budget`, `time-limit`), owners selected and read, datoms, storage gets and segment loads by index, and the connect, select and read times.
5. **Leaves nothing running.** No PostgreSQL prewarm: it cannot select the active set's blocks inside a 100 to 176 GB relation, and the transactor's reads warm exactly those blocks on the way.

Time added to a restart counts against priority 9 (writes resume within 60 s). The runner reports stop, transactor ready, gateways ready, read done and first acknowledgement, each from the moment the JVMs stopped.

## Mac gate

One managed container: PostgreSQL, a transactor and an ordered numeric-owner subject writer. 500 people with 160 fields each, indexed into stored segments, 128 MiB transactor cache. Each arm saves 250 people (the active set), restarts the transactor and writer on the same storage, then saves the same 250 people and 50 never-touched people. Timings are diagnostic.

GATE_RESULT

## Server runs

`startup-server.sh` is the cold-start runner's restart campaign. It uses the same lock, sender core, physical copy, build receipt, seed pins, write-options checks (including the `subjectFunction` check, see below), journal verification and cleanup as `cold-server.sh`. Each arm: copy the stopped directory, start the stack, play the tape's first 120 s at 394/s unmeasured, stop the three JVMs (PostgreSQL keeps running), start them, run the read in its arms, then time 300 s of the same tape. The tape is `writeTape(100_000, 394, 0, false, 420)`: 47,280 offers before the restart (9,402 people) and 118,200 after (14,207 people). Arms: `today`, `today-cache32`, `startup-read`, `startup-read-cache32`; the commands run the matched 32 GiB pair. The 32 GiB profile is PREP1's: 48 GiB ZGC heap, 8 GiB direct, 60 GiB container, index parallelism 1; PostgreSQL 8 GiB, writer 6 GiB, reader 5 GiB. About 18 minutes per arm at 430 million records and 22 at one billion (the 176 GB copy takes about 7).

**Depends on the `subjectFunction` repair.** The write-options check is the same as `cold-server.ts` line 118, which stopped the Saturday cold trial before its first offer (`subjectFunction` null). The runner stops at the same place until that repair is on the one branch; carry it into `startup-server.ts` too.

### Fresh copy, 430 million records

Same inputs as the [cold-start command](SERVER.md#cold-first-full-load-window-at-235s), with a clean-build receipt for this commit.

```sh
DX_V01_BUILD_RECEIPT="$BUILD_RECEIPT" bash lab/experiments/EXP-DX1/jvm1/startup-server.sh \
  "$(git rev-parse HEAD)" "$OUT" "$SEED_DIR" "$IMAGE_SHA256" "$TRANSFER_SHA256" \
  "$STOPPED_PGDATA" "$PG_CONTROL_SHA256" "$WAL_MOUNT" --credit-mode rolling6 --arms today-cache32,startup-read-cache32
```

### One billion records, aged

The aged handoff is admitted exactly as DX-PREP1's `cache32-aged` mode at `cdc72d4d5` ([AGED-CACHE.md](https://github.com/OnboardedInc/Triplex-db-experiments/blob/d6e62fbe7/lab/experiments/EXP-DX1/prep1/AGED-CACHE.md)): the same `AGE_HANDOFF_JSON` and `AGE_HANDOFF_SHA256`, the same content checks, the live head must be AGE1's last save with its clock and claim, and every person the tape replaces has fields 0 to 2 checked at the aged head against the seed value or AGE1's replay bytes ([`startup-aged.ts`](startup-aged.ts), copied from `prep1/ceiling-seed.ts`). The source is the same held, stopped one-billion directory (`AGED_PGDATA_SOURCE`, never started; the harness copies it), with the database's original name. Same memory as `cache32-aged`. Needs about 200 GB free for the copy, 16 GiB on the WAL mount and at least 89 GiB `MemTotal`.

```sh
DX_V01_BUILD_RECEIPT="$BUILD_RECEIPT" bash lab/experiments/EXP-DX1/jvm1/startup-server.sh \
  "$(git rev-parse HEAD)" "$OUT_1B" "$SEED_DIR" "$IMAGE_SHA256" "$TRANSFER_SHA256" \
  "$AGED_PGDATA_SOURCE" "$(sha256sum < "$AGED_PGDATA_SOURCE/global/pg_control" | cut -d ' ' -f 1)" "$WAL_MOUNT" \
  --credit-mode rolling6 --arms today-cache32,startup-read-cache32 \
  --aged-bundle "$AGE_HANDOFF_JSON" --aged-sha256 "$AGE_HANDOFF_SHA256"
```

### Predictions, written before any run

Model: storage gets per save ≈ first touches per offer × 1.35 + a floor (0.045 late at 430M). First touches per offer come from the tape: after the restart the `today` arms see every person cold (0.334 per offer in the first 30 s, 0.263 in the first 60 s, 0.048 in the fifth minute); the read arms see only people not saved before the restart (0.102, 0.090, 0.029). JVM code is cold after the restart in both arms.

| 394 offered, 32 GiB cache | 430M today | 430M start-up read | 1B today | 1B start-up read |
| --- | ---: | ---: | ---: | ---: |
| Storage gets per save, first 60 s | 0.37 (0.25–0.60) | 0.14 (0.08–0.30) | 0.80 (0.45–1.3) | 0.55 (0.25–1.0) |
| Storage gets per save, fifth minute | 0.10 (0.05–0.20) | 0.08 (0.04–0.15) | 0.50 (0.25–0.95) | 0.48 (0.2–0.9) |
| Save p99, first 30 s | 2.5 s (0.8–8) | 0.6 s (0.15–3) | 6 s (1.5–20) | 3 s (0.5–12) |
| Save p99, first 60 s | 2.0 s (0.6–7) | 0.5 s (0.12–2.5) | 5 s (1.2–18) | 2.5 s (0.4–10) |
| Save p99, first 120 s | 1.2 s (0.3–5) | 0.4 s (0.1–2) | 3.5 s (0.8–15) | 2 s (0.3–9) |
| Start-up read, transactor | none | 8 s (4–15), 12,000–16,000 gets | none | 12 s (6–25), 13,000–20,000 gets |
| Start-up read, write peer | none | 6 s (3–15) | none | 10 s (4–25) |
| Stop to admission (priority 9 bar 60 s) | 30 s (15–50) | 42 s (25–65) | 35 s (18–60) | 50 s (30–80) |
| Stored per second, whole window | 394 (385–394), no expiries | 394, no expiries | 390 (360–394) | 392 (370–394) |

The one-billion columns assume DX-PREP1's aged forecast that late misses return with a 32 GiB cache (0.45 per save outside index jobs). The read cannot remove those; it removes only the restart's share.

**What would show this wrong:**

- **The read does not land where the save reads.** The start-up read arm's storage gets per save in the first 60 s stay above half the `today` arm's at the same size. Then the transactor's peer connection does not fill the cache its transaction function reads, or the log tail does not name the post-restart people. The Mac gate tests the first directly.
- **Reads drop but the tail does not.** First-minute gets fall by 2× or more and the first-30-second p99 falls by less than 1.5×. Then the post-restart backlog is compilation, the write peer or queueing, not storage reads, and more reading is not the fix.
- **Too slow for a restart.** The transactor's read hits its 30-second limit, or stop to admission exceeds 60 s at 430 million records. Then the step must shrink its window or owner cap, and the trade against priority 9 goes to the owner.
- **Something keeps running.** Any `tx2-sread` thread at or after admission, or any report without `poolTerminated`, fails the arm.

## What is not proven

- No server has run the step. The fresh and aged results above are forecasts.
- The Mac gate is a 500-person toy with a 128 MiB cache; its counts show the mechanism, not full-size cost or timing.
- The restart trial is a planned restart with PostgreSQL warm. A machine loss would also lose the PostgreSQL host's page cache if storage moved, and a failover to a standby transactor (priority 9 option B) is not tested here.
- The log-tail window equals the traffic before the restart (120 s). In production the active set and the right window are the workload's, not this tape's.
