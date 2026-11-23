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
3. **Reads through Datomic's public API.** `d/connect`, `d/log`, `d/tx-range` (from the newest transaction's instant minus the window; an owner is an entity whose revision or row the transaction retracted), then per owner `d/datoms :eavt owner`, and in the transactor `d/datoms :aevt :triplex.entity/row owner` and `:triplex.entity/rev`; in the write peer the owner's `:triplex.entity/id` in AVET, through its own serving connection, which it keeps. The transactor releases its connection. Datomic is not modified and no decompiled code is used. Storage gets are counted with the same `datomic.measure.io-stats/with-io-stats` call the gateway already uses.
4. **Bounded.** A wall-clock limit (30 s on the server), a cap on scanned transactions (200,000) and owners (40,000), and a segment budget (150,000 segment loads, about 2.9 GB stored). The report gives the stop reason (`complete`, `segment-budget`, `time-limit`), owners selected and read, datoms, storage gets and segment loads by index, and the connect, select and read times.
5. **Leaves nothing running.** No PostgreSQL prewarm: it cannot select the active set's blocks inside a 100 to 176 GB relation, and the transactor's reads warm exactly those blocks on the way.

Time added to a restart counts against priority 9 (writes resume within 60 s). The runner reports stop, transactor ready, gateways ready, read done and first acknowledgement, each from the moment the JVMs stopped.

## Mac gate

One managed container: PostgreSQL, a transactor and an ordered numeric-owner subject writer. 500 people with 160 fields each, indexed into stored segments, 128 MiB transactor cache. Each arm saves 250 people (the active set), restarts the transactor and writer on the same storage, then saves the same 250 people and 50 never-touched people. Timings are diagnostic.

**Passed again on the merged commit** `d2e888d4b` (one branch at `88d76e4f4` plus the repaired scope open; `evidence/DX-JVM1/startup-read-07`, clean tree, passing log `selftest-48.log` SHA-256 `51cc046d46c5f648a91bfbb4e0b7c2a59f584867aa4002eaeb91b1e7913e36f1`, `summary.json` `3fcff783396a34bd144f9c0ad25c21c285e01a94eb1ee082eee44270613b5e8b`; logs 1 to 47 are refusals while another builder held the slot). Same counts as below: storage gets per save on the saved people 0.936 without the read and 0.024 with it, 300 of 300 exact reads in each arm, both readers selected exactly 250 owners (transactor 254 segment loads in 8.6 s, write peer 144 in 4.6 s, diagnostic), no reader thread at or after admission, ready to admission 9.1 s.

**First passed on the sixth attempt** (`evidence/DX-JVM1/startup-read-06`, one ordinary heavy token, `selftest-1.log` SHA-256 `c775bcfd34010a1b6fb5e142b078bafe42d83e544cafa4f52820976663407d77`, `summary.json` `b6924f1b55c24a2dd526c73d3edbd164695ac787f5ae97b9c88de51b8d5cd488`). The staged reader, entry script and driver are byte-identical to this commit; only the summary check in `startup-mac.py` changed afterwards, as described below.

| After the restart, 250 saved people again plus 50 never-touched | No read | One-time read |
| --- | ---: | ---: |
| Storage gets per save, saved people | 0.936 | 0.024 |
| EAVT / AEVT segment loads per save, saved people | 0.452 / 0.456 | 0 / 0 |
| Storage gets per save, never-touched people | 1.22 | 0 |
| Exact reads at each receipt | 300 of 300 | 300 of 300 |
| Owners selected from the 20-second log window, transactor / write peer | — | 250 / 250 |
| Segment loads by the read, transactor / write peer | — | 226 / 141 |
| Reader threads at the report, at admission, after the window | — | none, none, none |
| Restart to ready / ready to admission (diagnostic) | 30.9 s / 0 s | 28.9 s / 2.5 s |

- **The read lands where the save reads.** A peer connection opened inside the transactor JVM fills the object cache the transaction function reads: storage gets on the saved people fell 39-fold.
- **The selection is exact.** Both readers named exactly the 250 owners saved before the restart and not the seed, which was outside the window. The first attempt at this named 500, because each save's new journal entity also carries owner attributes; the step now selects an entity only when the transaction retracted its revision or row, which only an existing owner does.
- **The never-touched people warmed too.** They sit next to saved people in the same index leaves (500 people of 160 fields fill a few hundred leaves). My first summary required them to stay cold; that check was wrong for this layout and was replaced by the exact-selection check. At full size, with about one leaf per person, the forecast below assumes neighbours share little.
- **Earlier attempts** (all retained): 01 the bundle ran a launcher entry point; 02 stopped for a code change; 03 seed commands of 2,560 facts timed out on the one-CPU container; 04 and 05 found that `d/datoms` returns an iterable without `count` and that pool tasks swallowed the error; both are fixed and the report now lists task failures.

## Server runs

`startup-server.sh` is the cold-start runner's restart campaign. It uses the same lock, sender core, physical copy, build receipt, seed pins, write-options checks (including the `subjectFunction` check, see below), journal verification and cleanup as `cold-server.sh`. Each arm: copy the stopped directory, start the stack, play the tape's first 120 s at 394/s unmeasured, stop the three JVMs (PostgreSQL keeps running), start them, run the read in its arms, then time 300 s of the same tape. The tape is `writeTape(100_000, 394, 0, false, 420)`: 47,280 offers before the restart (9,402 people) and 118,200 after (14,207 people). Arms: `today`, `today-cache32`, `startup-read`, `startup-read-cache32`; the commands run the matched 32 GiB pair. The 32 GiB profile is PREP1's: 48 GiB ZGC heap, 8 GiB direct, 60 GiB container, index parallelism 1; PostgreSQL 8 GiB, writer 6 GiB, reader 5 GiB. About 18 minutes per arm at 430 million records and 22 at one billion (the 176 GB copy takes about 7).

**Scope open, as repaired on the one branch** (`ef4513658`, [launch fixes](../int1/LAUNCH-FIXES.md)). The held copies were sealed by an older build and hold no ordered per-person function under this build's name, which stopped the Saturday cold trial at the write-options check. The runner uses the same `openColdWriter` as `cold-server.ts`: it opens the scope once before the traffic that precedes the restart (that open installs the function, at no logical position), and again after the restart in every arm, after the gateways answer and before the start-up read. Both opens are outside the timed 300-second window and inside stop-to-admission, the same in both arms; `observed.json` reports the second as `scopeOpenSeconds`, and `scope-open-*.json` records the function before and after.

### Build once

Build the published commit (the commit whose subject starts "Publish" on `exp/DX-JVM1-settings`) during staging, then run both commands from the build's checkout. The runner refuses a source or image that differs from the receipt.

```sh
COMMIT=<publish commit>
BUILD=/var/tmp/triplex-jvm1-startup-build
sudo "$(command -v node)" --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/v01/build.ts "$COMMIT" "$BUILD"
cd "$BUILD/repository"
```

### Fresh copy, 430 million records

Same inputs as the [cold-start command](SERVER.md#cold-first-full-load-window-at-235s): the SCALE1 metadata directory and pins, the stopped full-size directory and its `global/pg_control` SHA-256, and the separate WAL mount. Two arms, about 18 minutes each; the runner's work cap is 46 minutes.

```sh
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  bash lab/experiments/EXP-DX1/jvm1/startup-server.sh \
  "$COMMIT" "$OUT" "$SEED_DIR" "$IMAGE_SHA256" "$TRANSFER_SHA256" \
  "$STOPPED_PGDATA" "$PG_CONTROL_SHA256" "$WAL_MOUNT" --credit-mode rolling6 --arms today-cache32,startup-read-cache32
```

### One billion records, aged

The aged handoff is admitted exactly as DX-PREP1's `cache32-aged` mode at `cdc72d4d5` ([AGED-CACHE.md](https://github.com/OnboardedInc/Triplex-db-experiments/blob/d6e62fbe7/lab/experiments/EXP-DX1/prep1/AGED-CACHE.md)): the same `AGE_HANDOFF_JSON` and `AGE_HANDOFF_SHA256`, the same content checks, the live head must be AGE1's last save with its clock and claim, and every person the tape replaces has fields 0 to 2 checked at the aged head against the seed value or AGE1's replay bytes ([`startup-aged.ts`](startup-aged.ts), copied from `prep1/ceiling-seed.ts`). The source is the same held, stopped one-billion directory (`AGED_PGDATA_SOURCE`, never started; the harness copies it), with the database's original name. Same memory as `cache32-aged`. Needs about 200 GB free for the copy, 16 GiB on the WAL mount and at least 89 GiB `MemTotal`.

Two arms, about 22 to 25 minutes each (the 176 GB copy takes about 7, and the predecessor check reads fields 0 to 2 of the tape's 15,838 people); the runner's work cap is 54 minutes.

```sh
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  bash lab/experiments/EXP-DX1/jvm1/startup-server.sh \
  "$COMMIT" "$OUT_1B" "$SEED_DIR" "$IMAGE_SHA256" "$TRANSFER_SHA256" \
  "$AGED_PGDATA_SOURCE" "$(sudo sha256sum "$AGED_PGDATA_SOURCE/global/pg_control" | cut -d ' ' -f 1)" "$WAL_MOUNT" \
  --credit-mode rolling6 --arms today-cache32,startup-read-cache32 \
  --aged-bundle "$AGE_HANDOFF_JSON" --aged-sha256 "$AGE_HANDOFF_SHA256"
```

### Why the no-read arm is so far below Saturday, and what the arm proves

The restart campaign forecasts 0.37 storage gets per save in the no-read arm's first minute; Saturday's cold runs measured 1.15 to 1.24. Almost all of that gap is the tape, not the restart:

- **Saturday's tape cycled through new people.** Its first 60 seconds held 17,309 distinct people in about 20,000 saves, with no repeat before second 33, so nearly every save was a first touch.
- **This campaign's tape repeats a hot set.** `writeTape(100_000, 394, …)` gives 6,232 distinct people in the 23,640 offers of its first minute even from a cold start: 0.264 first touches per offer, which at 1.35 gets per first touch is the same 0.36 as the no-read arm's 0.37. Run cold from a copy, this tape's first minute would read about as little as the restart arm does.
- **The restart itself does not lower the count.** After the restart both object caches are empty, so the no-read arm pays one storage read set per person on that person's first save, exactly as from a copy. Keeping PostgreSQL running and the 120 s of traffic before the restart make each of those reads cheaper (the blocks are in shared buffers or the page cache rather than on disk), not fewer.
- **How much the log tail covers.** In the 120 s before the restart the tape saves 9,402 people, about five saves each. Of the 14,207 people saved in the timed 300 s, 7,771 (55%) were among them, and those people receive 89.3% of the timed window's saves (89.4% in the first minute, 89.3% afterwards; 89.5% for the nine busy accounts). The other 10.7% of saves go to 6,436 people the log tail does not name; they stay cold in both arms.

**What the arm proves.** That a restart in the middle of traffic whose saves mostly continue with the same people (here 89%) gets its first minute back to near the fifth minute's read rate, at a stated read time inside or outside the 60-second restart bar. That covers the cases where traffic after a restart is the traffic before it: retries and queued saves after an outage (the webhook storm of scenario 3), forms in progress, the fixed workload's active set (half of reads go to people written in the previous 60 s).

**What it does not prove.** It says nothing about a restart followed by traffic for people who were not active just before it: a new import, a different account waking up, a batch that starts after the restart. Those people are first touches in both arms, and the step does nothing for them; on Saturday's tape every first-minute save was such a person. How much of real post-restart traffic goes to people saved in the preceding minutes is a property of Onboarded's workload that this trial does not measure; the step's benefit is that share of the restart's extra reads, and no more.

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
