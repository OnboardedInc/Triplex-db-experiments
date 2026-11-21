# DX-BM1 bench handoff, November 19

## Third rental for rolling credits

**Ready at 09:32:53 EST on November 21, 19m53s after billing began.** The charge at 11:43 EST was about USD 2.73 at USD 1.09/hour. The 24-hour ceiling is 09:13 EST on November 22. Ubuntu 24.04, Docker, Node 22.23.2, pinned PostgreSQL 17 and Datomic Java 21 and 25 images are installed. The second NVMe is mounted at `/mnt/triplex-bench3-wal` for WAL. SMT is enabled and all 24 CPU policies read back `performance`, matching Server 2. The new SSH host key is pinned in the operator's private known-host file.

The direct transfer took 12m32s, about 167 MB/s on average. The sender used idle I/O priority, nice 19 and a 300 MB/s cap. The stopped source path was outside all live container mounts. The receiver compared every file and directory with the published inventory, including 125,923,989,950 bytes across 1,452 files and logical cut 87,002. Both original SCALE1 metadata files match their published digests. The source key directory and receiver's temporary authorized key were removed and independently checked. The pristine copy stays under `bench3/verified-seed`. Evidence is under `evidence/DX-BM1/bench3/ready`. [SCALE1 custody](https://github.com/OnboardedInc/Triplex-db-experiments/blob/921f90944857938c2c207afb349d992dd4d55e83/lab/experiments/EXP-DX1/scale1/HANDOFF.md) · [Checks](COLLECTORS.md) · [SHA-256 manifest](SHA256SUMS)

The first control preflight refused the metadata directory name before any offers. Its launcher placed the original bytes under their published attempt name and retried on one disposable clone. The retry closed at 09:46 EST. It used the six-credit barrier, Java 25 ZGC on three transactor cores, a 16 GiB cache, Java 21 gateways, separate WAL and synchronous commit. All four 90-second cells independently reconciled the planned offers and durable native journal. [Before-launch forecasts](PREDICTIONS.md)

| Offered saves/s | Forecast ACKs/s | Bench 3 ACKs/s | Server 2 ACKs/s | Bench 3 durable / offered | Expired | Quiet p99 alone → loaded | Quiet ratio |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 394 | 330–360 | 344.81 | 345.80 | 31,279 / 35,460 | 4,181 | 54.97 → 313.29 ms | 5.70× |
| 620 | 350–380 | 374.37 | 365.13 | 34,145 / 55,800 | 21,655 | 17.98 → 61.24 ms | 3.41× |

The rates reproduced within forecast. Quiet ratios exceeded the earlier host's 3.35× and 2.29× in both cells. The publisher recorded 31,033 and 33,693 ACKs during the measured windows. Later durable ACKs remain separate. No replans occurred. The Mac copy `evidence/DX-BM1/bench3/bench3-control` contains 1,884,839 summary bytes and 12,424,590 raw bytes. [Checksums](SHA256SUMS)

The published rolling command and forecasts arrived while the control was running. The queued `triplex-bench3-rolling-main.service` started preparing at 09:46:09 EST, immediately after the control's scoped cleanup. Producer `c8f903ce1142772751328b88d972cc527ca46dfc` runs barrier 6, rolling 6 and rolling 12 in the `server` profile. Each arm has three matched five-minute quiet and loaded pairs. Rolling 8 and 16 have separate published single-arm selections. Check `/var/tmp/triplex-bm1/STATUS` and `bench3/rolling-main.log`. [Published forecasts](https://github.com/OnboardedInc/Triplex-db-experiments/blob/cb5e3cf7a2083b97f0a3fbc0d699a082a0940657/lab/experiments/EXP-DX1/prep1/ROLLING-CREDITS.md)

Barrier 6 closed after all six five-minute cells and owned-volume cleanup. Rolling 6 also completed and its exact compact result is on the Mac. Rolling 12 completed the main unit. Rolling 8 began at 11:40:56 EST. The rolling-16 unit waits for rolling 8 to verify and clean up. The compact checkpoints are on the Mac and raw capture stays on the bench until each campaign closes. [Barrier result](ROLLING-READING.md#barrier-6)

## Final priority-Publish run

**Server 1 can be deleted as of 02:04:56 EST on November 21. Its estimated charge through that time was $68.27 at $1.09/hour since Wednesday 11:27 EST.** The benchmark and cleanup ended at 01:58:26 EST. The container, volume and network inventory for this run is empty, no containers are running, and the second NVMe is unmounted. STATUS reads `item=queue state=deletion-ready since=2026-11-21T07:04:56Z next=orchestrator`. The orchestrator owns provider deletion and billing continues until then.

**All 90 receipt-only Publishes at 25,000 deep people met one second.** First-correct p99 at 3.5 and 39.4 saves/s beat my forecast ranges of 70–160 and 125–650 ms. The 23.5/s reading was inside 90–325 ms. The native order check proved both crossing orders and the refusal after three external conflicts. The separate collector verified the six 64-person preflight offers and then all 90 full-run offers, with zero stale responses. The 25k fixture loaded in 30.55 min and independently verified 3,988,500 source facts in another 0.87 min at cut 2,117. [Forecasts](PREDICTIONS.md) · [Collector audit](COLLECTORS.md)

| Offered saves/s | First correct ms p50 / p99 | Native ACK ms p50 / p99 | Within 1 s | Saves queued or active at Publish min / median / max | Save ACKs/s in window | Saves still pending at window end + 1 s |
| --- | --- | --- | --- | --- | --- | --- |
| 3.5 | 19.83 / 36.72 | 15.61 / 32.60 | 30/30 MET | 0 / 0 / 0 | 3.50 | 0 |
| 23.5 | 36.45 / 112.20 | 30.64 / 105.92 | 30/30 MET | 0 / 1 / 8 | 23.38 | 0 |
| 39.4 | 56.74 / 84.21 | 49.04 / 77.45 | 30/30 MET | 437 / 1,355.5 / 2,426 | 25.39 | 2,527 |

At peak, Publish waited at most 48.02 ms for an active save. The 5,911 peak-window saves eventually acknowledged, with a 119.67 s save p99 including queueing. All 12,456 scheduled live saves across the screen and treatment blocks drained. The per-Publish save count and every deadline row are in `full/collected.json`. P99 is the maximum of each 30-offer sample. The repeated test ran one deep account in one database, one Publish in flight every five seconds, two fresh-read connections to one read gateway and zero background readers. The 100k priority timing remains unjudged. It used INT1 `0196b9952e496c883a24b9ed05ef17fa886dfb00` including ACT1 `acc0f5c39` with the benchmark harness from `c0efc1700`. All three JVMs used Java 21 G1 and one pinned physical core each. Absolute pause logs and per-save stage clocks are in the bundle. The prior three preflight refusals preserve the missing gateway nonce, reused evidence prefix and invalid scope. None reached a timed offer.

The bench retains the staged erasure inputs, original sealed ten-account campaign, cold JVM1 copy, final Publish output and raw traces under its existing experiment directories. The fresh Publish PostgreSQL volume was removed after readback and timing. The Mac holds the checked copies under `evidence/DX-BM1/day-n21/publish-priority`. The summary is 4,403,750 bytes, the raw archive 96,936 bytes and the transfer manifest 1,568 bytes. Both archives were checked member by member. The earlier append, Java, cache, import and erasure bundles are under `evidence/DX-BM1/day-n20`. Server-only cold database files and physical fixtures would be lost on deletion. [Sizes and earlier evidence locations](APPEND-TAIL-READING.md) · [SHA-256 manifest](SHA256SUMS)

**Erasure.** The 128-person run verified a durable ACK at 81.78 ms for 416 aged identities, a verified marker at 94.37 ms and 128-body cleanup at 1.13 s. The first two full starts refused a busy loopback port and a moved image tag. The immutable attempt sealed 16,045,255 facts before losing the transactor heartbeat. The recovery verified the protected stage and sealed its unguarded counterpart, then failed the shutdown assertion because a loopback listener was still reachable. Neither full-stage erasure window began. [Full disposition and evidence](#erasure-stage-disposition)

**Failover.** The coordinated two-server failover suite moves to next week. It required both servers at once and was outside the final single-server run. This handoff contains no new failover reading.

## Earlier Saturday handoff

**Ready for the orchestrator since 00:59:15 EST on November 21. Server 1 cost about $67.09 as of 01:00 EST at $1.09/hour since Wednesday 11:27 EST.** The last benchmark ended at 00:52:10. STATUS reads `item=queue state=handoff-ready`. No benchmark containers or erasure listeners remain and the second NVMe is unmounted. It retains the ext4 filesystem for later work. The orchestrator owns the two-server failover window and release.

The control, separate WAL, transactor ZGC, fair turns and combined tapes verified. The combined arm had zero expiries and 393.97 saves/s at 394 offered. Quiet p99 was 7.93 ms solo and 33.98 ms loaded. The 4.28× ratio exceeded 1.25×. No priority-Publish rerun launched. The original ACT1 cut 11,669 survives as census and readback evidence. Its cleanup removed the physical volume, and a fresh seed would exceed the 90-minute limit before the three single offers of the pinned command. No further erasure run is queued. [Append readings](APPEND-TAIL-READING.md) · [Erasure disposition](#erasure-stage-disposition)

The bench retains `day-n20-prep1-tenant/campaign` with the original sealed inputs, the cold JVM1 copy, the full erasure staging directories and raw append traces. The Mac's `evidence/DX-BM1/day-n20` contains compressed copies for `prep1-tail`, `prep1-tail-syscall`, `prep1-tail-remaining`, `prep1-tail-combined`, `erasure-small`, `erasure`, `erasure-retry`, `erasure-image` and `erasure-recovery`. It also holds the earlier Java, cache, storage and pacing campaigns. Each completed append bundle includes the cause ledger for every physical call over 20 ms. The PostgreSQL and key-store files remain only on the server. [Sizes and paths](APPEND-TAIL-READING.md) · [SHA-256 manifest](SHA256SUMS)

**North star.** DX-ACT1 measures durable guards for 100k W0 subjects with 256 live readers. The published P5 target specifies 64. P1–P4 use one full v3 pair and both tracing-off controls. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

The three sender arms completed and their bundles and checksummed COMPARISON.md are on the Mac under evidence/DX-BM1. The new sender measured 41.705 ms all-primary p99 with 38,826 correct receipt reads. The older 73.78 s activation omitted durable guards. Its historical seed cut is valid. Later writes make its current head unsuitable for a fresh guarded activation.

Batch p3 launched at 13:03 EST at f37731a7. Native schedules passed 13/13. The narrow-full run verified all 100,000 seed worlds, then R1 refused an invalid later world for subject 6011. Baseline and sweep had written the same answer references at 4,341,356 and 4,344,665. The second private clone independently reproduced those duplicate facts. Its stage was stopped at 13:46 and cleaned. The standard release was deferred with the narrow comparison. O-DOMAIN independently accepted the seed and reproduced W0.E_CARDINALITY at the live head from the captured gateway responses. `bm1/replay-cardinality.py` reproduces both readings from `subject-6011-basis-wire.json` under evidence/DX-BM1/drv1a/guarded-schedules. A fresh 100k seed takes about 3¼ hours including readback, followed by about three hours for the guarded series.

**The bench was released at 18:48:15 EST on November 19 (`FREE 2026-11-19T23:48:15Z`).** The named pair’s teardown found zero owned containers and networks. Both tracing-off bookends returned 0. All seven sealed `p3r` bundles are on the Mac. The separate guarded activation trigger entered its waiting state five seconds after handoff.

The first pair attempt refused physical core 8 before any offers. Batch `p3r` ran from 13:53:48 to 18:48:15 EST on `11cb89fe0d5a7ddd74d0dbeee53313425ab34a6e`. Each arm submitted and checked all 38,826 primary receipts. The loaded driver reached DONE, matched 143,900,955 model observations and finished independent replay in 34m33s. At 18:42:10 the operator stopped its post-run viewer after securing the raw checksums and native oracle output, leaving time for the normal closing bookend. The original pair controller therefore records exit 1. Reproduction of its bars and both 90% intervals uses the captured same-session inputs. Six saturated reader workers make performance ineligible. [Per-bar readings](REPORT.md)

On the Mac, `evidence/DX-BM1/drv1a/p3r-handoff-confirmation.log` records the FREE line, empty inventories, control exits and deferred state. The original bundles are under `evidence/DX-BM1/tx2-dxt1-bm1-p3r-*`. The complete viewer, Chrome trace, commit anatomy and SHA256SUMS are under `evidence/DX-BM1/drv1a/offline-render/tx2-dxt1-bm1-p3r-pair-ladder/`. The original bundle links to them as `recovered/` and retains `BM1-RENDER-INTERRUPTION.json`. The trace index carries a separate `-viewer` row for this reconstruction. `evidence/DX-BM1/drv1a/p3r-final-reading.json` records both arm bindings, complete ACK observations, the independent replay and the ineligible pair qualification.

Set `BENCH_SERVER` to the SSH destination in the brief. Poll every 10 to 15 minutes while timing is active.

```sh
bench() {
  ssh -n -F /dev/null -i "${DX_BENCH_KEY:-$HOME/.ssh/triplex_bench_ed25519}" \
    -o IdentitiesOnly=yes -o ForwardAgent=no -o BatchMode=yes \
    -o StrictHostKeyChecking=yes "$BENCH_SERVER" "$@"
}
bench 'sudo -n cat /var/tmp/triplex-bm1/STATUS'
bench 'systemctl show triplex-bm1-p3r-queue triplex-bm1-p3r-pair -p ActiveState -p Result -p ExecMainStatus'
bench 'sudo -n tail -n 24 /var/tmp/triplex-bm1/day-p3r/logs/queue.log'
bench 'sudo -n find /var/tmp/triplex-bm1/day-p3/logs -name "*.exit" -o -name "remaining.txt"'
bench 'sudo -n tail -n 8 /var/tmp/triplex-bm1/day-p3/logs/guarded.log'
```

Collect published bundles from the Mac. The script validates the transfer manifest and actual bytes before indexing the evidence. The report archive retains the W0 HTTP corpus, observation chunks and oracle transport copies. The extracted directory includes summaries, traffic windows and logs. Partial failures and their cleanup logs are retained. `raw-transfer.txt` records raw archives over the 4 GiB transfer limit.

```sh
while IFS= read -r tag; do
  bash lab/experiments/EXP-DX1/bm1/collect.sh "$BENCH_SERVER" "$tag" || \
    printf 'Collection failed for %s\n' "$tag" >&2
done < <(bench 'sudo -n find /var/tmp/triplex-bm1/bundles -mindepth 2 -maxdepth 2 -name TRANSFER.sha256 -printf "%h\n" | sed "s|.*/||" | grep -E "^tx2-dxt1-bm1-(p3r?-|act[0-9a-f]{9}-activation-a$)" | sort')
```

A terminal failure with missing bundles or a nonempty `remaining.txt` requires checking its corresponding `logs/<item>-cleanup/cleanup.log` and run output before release. The retained November 18 seed volume belongs to its original attempt and is outside the scoped day teardown.

## Overnight queue

The November 19 evening dispatch replaced the deferred SCALE1 handback. Its server trigger, installer and Mac relay and collector were retired before the overnight items. The 18:48:15 EST FREE line records the afternoon handoff. The current queue owns the allocation.

Item 0 began at 19:01:16 EST on ACT2 `6eb4a3e3831f9352d0f56495cd5c881c81a30f9d`. Its 1k gate took 143.889 s and its scoped cleanup finished at 19:06:26. The published launcher refused the one-account 100k workload at the population check. The verified summary and 297,236-byte raw archive are under `evidence/DX-BM1/overnight/i0`.

Item 1 began at 19:12:21 EST, group `grpw1a`, W1 `502c8897deb9af8233d72dfc6cc2d62f601f0fca`. The separate systemd ceiling stops the unit by 23:11:31 EST. ACTAUDIT moved both 100k DELTA commands out of the queue until the publisher proves the deadline and durable output. After the original group run, the revised order is the 64-person ACT1 joined Publish preflight, enhanced quiet pulse, CEIL field-rate probe, thin/deep match, size ledger, four reader blocks, predecessor lookup, HA1 fixed-frame same-database import and two INT1 thin rungs. IMPORT1 is removed. ACT2’s audited command now requires `--delta-audit 2`. The clock-only sample transfers and replays correctly. Admission waits for a matching two-mode native output and a runnable seed budget. ACTREVIEW2 says FIX FIRST on the joined command at `befa95acf`. The preflight runs all six small cells and records the actual early or late ingress. The 100k command remains held. The native command seeds its own empty scope and has no external loader input. The separate field-rates campaign belongs to the other server. Each new long run requires a small verified producer output. [Collector audit](COLLECTORS.md) · [Predictions and outcomes](PREDICTIONS.md)

```sh
bench 'cat /var/tmp/triplex-bm1/STATUS'
bench 'sudo -n tail -12 /var/tmp/triplex-w1/grpw1a/campaign.log'
bench 'systemctl show triplex-w1-grpw1a -p ActiveState -p Result -p ExecMainStatus'
```

**Final overnight release was 00:04:43 EST on November 20 (`FREE 2026-11-20T05:04:43Z`).** The reviewed ACT1 attempt at `ec996c073` with writer `cd2151749` was the last item. The independent inventory showed no owned containers, networks or volumes. The supervisor `bm1n19-campaign-v17.service` exited successfully after the terminal bundle sealed. The Mac copy contains all transferred summaries and raw archives at a combined transfer under 1 GiB per item.

```sh
bench 'systemctl show bm1n19-campaign-v17.service -p ActiveState -p Result -p NRestarts'
bench 'sudo -n tail -15 /var/tmp/triplex-bm1/night-n19/campaign.log'
bench 'sudo -n find /var/tmp/triplex-bm1/night-n19/bundles -mindepth 2 -maxdepth 2 -name TRANSFER.json'
BENCH_SERVER="$BENCH_SERVER" python3 lab/experiments/EXP-DX1/bm1/night-client.py collect i1-1
```

The first W1 arm and its raw rows are on the Mac under `evidence/DX-BM1/overnight/i1-individual-first`. Its checkpoint watcher matched both the native controller and its launcher and refused to pause either. The first stack had already cleaned up when the result was collected. The grouped stack was released at cutoff, with the individual evidence sealed by 23:12:24 EST. A narrower watcher checks the grouped arm only after its last timed offer and allows capture only if 18 minutes remain before the original deadline. CEIL and predecessor require the pooled checkpoint. SIZE and READERS can also use the 10,000-subject deep thin/deep arm after exact readback and a sealed PostgreSQL snapshot from that arm. The fallback changes the resident population for those two diagnostics and is recorded in their inputs.

Transfer keys are `i14` for the joined 64-person proof and terminal inventory, `i6` for corrected DELTA if admitted, `i7` for READERS, `i8` for enhanced pulse, `i9` for thin/deep, `i10` for predecessor, `i11` for CEIL, `i12` for SIZE, `i13` for same-database import, and `i5` for the two INT1 rungs. The last digit is the attempt number. Maximum allocations are 30 minutes for the joined preflight, four hours for the enhanced pulse, one hour each for CEIL, thin/deep, SIZE and predecessor, 40 minutes for READERS, two hours for HA1 and five for INT1. The cutoff covers preparation, preflight and retries. Ineligible items advance to the next one. Check `STATUS` for the exact release timestamp. The Mac collector transfers only archives below 1 GiB.

### Evidence checks

- `held-seed.py` binds the completed four W1 phases, the native process and its start ticks, the arm nonce, scalar seed cut, all ten accounts and immutable population digest. Its stop hook resumes only that exact parent. `group-probes.mjs` derives Q-PULSE from the original quiet receipts. Its supplemental phases have new command IDs, exact account membership, scheduled offers, hashed rows, pinned reads and durable operation checks.
- `overnight.py` accepts W1 group or thin observations from the public revision, scoped arm identities, matched population and native result files. Import stages check same-attempt bindings and manifest bytes. The solo checker checks the R1 setup reference and the R2 and R3 releases, source, nonce, exact 100k roster, 90 offers and the actual loaded-output hash. The guarded and integrated rungs require their native result bytes and matching source/slot identities. Each terminal state retains failures and an independent scoped inventory.
- `night-archive.py` seals the actual terminal and request, all selected summary bytes and the compressed archive. `night-client.py` rechecks archive size and hash, every extracted summary member, timestamps and bindings. The recovered-viewer index in `trace-store.mjs` requires the original interrupted slot, exact input hashes and every derived export. It preserves the original attempt's catalog entry.
- `registerNightPreflight` binds both archive checksums, native source, slot and nonce across the initial request, verified status and two proof files. It checks the raw sample count and decompressed digest, the actual large-launch refusal and the empty owned-resource inventory.
- `probes/native.py` reopens each PostgreSQL clone at the same checked cut. `foreground.mjs` checks the mounted world, scheduled intents, new receipts and same-cut reads. `local-replica.mjs` checks every local observation before spill and after reopening the spill. `read-probe.mjs` requires exact Node parent, gateway trace, database and native T, and verifies the native recording bytes, source, slot, nonce, baseline tape and load dose. The storage attribution stays unjudged unless the nested counters reconcile with a known first/repeated lookup and native totals. Standalone guard cleanup binds each requested child back to bytes from the same prepared public checkout. `registerNightBundle` rechecks the exact request, terminal state, freshness and receipt hashes against both archives and every extracted summary member.

The server joined smoke at `befa95acf` was collected under `evidence/DX-BM1/overnight/i14-1`. Its replay retained the original early save clocks and checked all 12 responses. The final reviewed component preflight under `i17-1` used the published 64-person producer and its matching collector. The Mac copy's `recovered/component-reconciled.json` checks 30 exact answers and 757 ordered effects. The separate settlement gate stopped on a generic rejected-write message. Neither 100k seed started. The published command has no external loader input. Recollect any terminal bundle with the same `night-client.py collect` command and its key.

The matched study is sealed under `evidence/DX-BM1/overnight/i9-1`. All 7,092 write rows join their gateway trace by trace ID and native T. The deep checkpoint restored at the witnessed cut. SIZE verified 50 additional receipts before the lean transaction-log route refused. READERS restored the seed and stopped at the missing group-format input before the first block. Predecessor held for a 100k seed. Their evidence keys are `i12-1`, `i7-1` and `i10-1`. Both early joined launches are retained as `i15-1` and `i15-2`. Their replacement uses `i17-1`, with a single reviewed native admission and the same checks as the previous launch.

HA1 completed at 23:54:04 EST. The five raw offer tapes and exact p99 replay are under `i13-1/recovered`. The WFIX native smoke at `882df5487` produced all five active option records and 75 receipts, now reconciled under `i16-1/recovered`. The full pulse did not fit its four-hour limit. INT1 at `61d071669` stopped at 00:00:29 EST before its first database opened because the native launch could not find `lab/bench/lib`. The first stopped status and both inventories are in `i5-1`. Neither capacity rung spent time seeding.

## Sealed seed queue

The bench resumed at 00:17:32 EST on November 20 as `bm1n20-single-seed.service`. The inner `triplex-scale1-arm-d7-bm1-single-n20.service` executes the public SCALE1 `a072629eb` single-account decision seed and owns its own cleanup. It uses the verified two-frame loader. The current lease covers the seed, the next ACT1 native preflight and the clone-based probes. The earlier FREE line is historical.

The verified seed sealed at 01:43:12 EST. The PostgreSQL image stays in the SCALE1 attempt directory and its SHA-256 is `e6b23c1f5b377a01997c40cba27ecc15932345008ea09404e579b955a1091e89`. The Mac copy `single-n20/seed` contains the verified transfer, exact terminal proof and checkpoint metadata. `bm1n20-after-seed-v3.service` started ACT1 from `dfa7a506c` at 01:43:24 and CEIL at 01:45:45. The small joined and settlement evidence is in `overnight/i27-1`. The long gate ended at the shared `local-before` location save in `join/gate.ts`, before any 100k offers. W0 `classify` supplies `""` for locations and jurisdictions. `join/account.ts:1053` passes that string through `owner ?? undefined`, while `notify1/journal.ts:185` correctly requires an owned reconcile when it gets a defined owner. Wait for a published repair. The retry uses an additional native shared-scope replay before scale and advances ahead of remaining probes at the next free slot.

```sh
bench 'sudo -n cat /var/tmp/triplex-bm1/STATUS'
bench 'sudo -n cat /var/tmp/triplex-scale1/decision/attempts/arm-d7-bm1-single-n20/STATUS.json'
bench 'sudo -n tail -1 /var/tmp/triplex-scale1/decision/attempts/arm-d7-bm1-single-n20/seed-progress.jsonl'
bench 'sudo -n tail -20 /var/tmp/triplex-bm1/single-n20/after-seed.log'
BENCH_SERVER="$BENCH_SERVER" BM1_TRACE_INDEX="$PWD/lab/bin/trace-store.mjs" \
  python3 lab/experiments/EXP-DX1/bm1/night-client.py collect-seed
BENCH_SERVER="$BENCH_SERVER" BM1_TRACE_INDEX="$PWD/lab/bin/trace-store.mjs" \
  python3 lab/experiments/EXP-DX1/bm1/night-client.py collect i27-1
```

The seed estimate is 42 min ingest, 38 min verification and 5–8 min sealing. The three-hour seed ceiling is independent of the probe budgets. The after-seed supervisor waits for stack teardown, checks the full native SCALE1 receipt and SHA-256s and reopens a separate copy per probe arm. Its admission order is ACT1 `i27` (4 h), CEIL `i18` (1 h), predecessor `i19` (1 h), pulse `i20` (75 min), GROWTH `i21` (1 h), SIZE `i22` (45 min), the READERS writer probe `i24` (45 min), RD1's new short pairs `i28` (2 h) and INT1 `i26` (4 h). Those ceilings include setup and cleanup. If the seed check fails, the independent thin rung can begin while the original is preserved. ACT1 has its own unqualified fixture and seeds its separate empty scope after the joined and settlement checks. The four reader-block scopes are separate from the restored deep scope. The three short reader pairs in RD1 `7affa420c` use fresh 10k scopes and matching zero arms. A separate 1k pair proves the real report and collector before those comparisons. Collect an item's terminal bundle by substituting the corresponding key above. See STATUS for the live owner and FREE time.

The first CEIL, predecessor and pulse restores timed out in the seven-minute serial `pg_restore`. Their archives and cleanup inventories are in `overnight/i18-1`, `i19-1` and `i20-1`. At 02:06 EST, `bm1n20-after-seed-v4` from `a5c7aab80` took over while pulse finished. It started CEIL attempt 2 at 02:11:28. The queue uses the same verified dump as a seekable input, gives only the untimed restore four setup CPUs and seals its stopped PGDATA once for later probes. Every timed arm still checks the copied bytes and native cut before its own small gate. Only the exact pre-offer serial timeout gets a retry. The original outcomes and transfers remain intact under attempt 1.

CEIL attempt 2 sealed the shared native restore and reopened it. The four real seed stamp rows then exposed BM1's incorrect field name. The Datomic codec emits their exact integer text in `value_string`. `overnight/i18-2` retains the error and the copied-file proof. The collector now checks the exact placement roster, integer type and decimal text before offering a save. CEIL's two attempts issued zero saves.

Predecessor and pulse attempt 2 exposed the same stamp-field mistake before offers. These are in `overnight/i19-2` and `i20-2`. At 02:24 EST `bm1n20-after-seed-v5` adopted the last early attempt and launched GROWTH with the published stamp fix at `dfed2a8b1`. GROWTH's two actual 50-save tapes and collector summaries completed before the full blocks. Their read counts are in the predictions and the stable small proof is `single-n20/preflights/growth-server-small.json`.

TAIL1 specifies the exact SCALE1 zero-B archive `095971d5126cf567a7db3ff15c3fc718656bf98541a66ea0b05136c4c9bd54bb`. The file is absent from this bench's two evidence roots. TAIL1 `9f8865e84` reproduced its matched analysis byte for byte in `single-n20/matched-tail-replay` from the original `overnight/i9-1` transfer. It bound 7,092 offers and receipts to the original clocks. Forty-nine of the 50 slowest post-start deep saves spent most of their time in peer wait beyond their own evaluation, and the active write gateway limits a single continuous pause within those waits to 29 ms. The transactor has only GC rollups. Exact individual pause attribution remains unresolved.

ERASE1's `stage` prepares two distinct aged cohorts with exclusive journal transactions and interleaves their edits during ingest. Its `check` binds their actual assertion IDs, nonce, source and cut. The SCALE1 pack groups unrelated people in shared frames and cannot supply that staging file. An ERASE1 run needs its own stage or a reviewed producer that can reuse this seed.

GROWTH’s first full control in `i21-1` was recovered from the original hashed native archive. It recorded 2,250 ACKs, 373 SQL reads and 153.0 ms ACK p99. Reconcile errors came from integer grouping keys changing to strings after JSON serialization. The missing candidate failed on a stale writer endpoint before sending offers. The recovery runs the remaining three blocks at the original writer SHA and checks the original control’s slot and digest against its first request. SIZE `i22-1` stopped when its vendor launcher treated `clojure.main` as a filename. READERS `i24-1` stopped at missing host `psql`. Both retry before any timed offers and retain their original bundle manifests.

RD1 `i28-1` saved a full small zero arm and its true loaded failure. The ladder’s frozen copy of the zero report matched the original byte for byte, but it was outside the driver’s actual mount. The producer verified 45,485 seeded assertions and reached the end of the six scheduled phases before this refusal. The retry mounts the platform and stack evidence at the same root and tests a fresh 1k matched pair at its pinned source before the three 10k short comparisons. The first pair archive remains at `overnight/i28-1`.

The full recovered GROWTH sequence is sealed in `overnight/i21-2`. The first control’s bytes remain in `i21-1`. All four blocks acknowledged 2,250 offers in-window each. Physical SQL reads were 373/260/260/373, with old-live lookups at 112 in each arm and retirement at 109/2/2/109. The native residual outside the attributed transaction-function children was 126/123/123/126. All counted SQL reads were on first visits. One of 2,250 range checks was empty in each candidate, so the cold empty-range forecast remains open. SIZE’s second refusal `i22-2` printed the indexed baseline but ran into the vendor peer’s non-exiting thread pool before the first timed save.

### Matched deep tails

SCALE1 `0ac940409` measured 2,364 saves per 39.4/s cell over 60 seconds after 8,163 earlier saves and 570 seconds of lower-rate traffic. The restored 100k scope had 16,245,647 facts and the 64-reader dose began before that final cell. Eighty percent of its jittered Zipf saves used one changed field, 15% used two and 5% used three. BM1’s older matched arms used 1,773 evenly spaced saves over 45 seconds on new 10k scopes (1,613,329 facts deep). Every BM1 save replaced five fields on a distinct subject. BM1 removed only the first two seconds when quoting the tails. Both measured without the v3 history growth or release overlays. The writer gateway had one core and a 3 GiB heap with the same unforced collector selection. SCALE1’s read gateway had two cores and BM1’s one. Both transactors explicitly used G1. The exact per-save transactor pauses and the gateway collector selection in both saved artifact sets are unverified. These differences leave the cause of the tail gap unresolved. The two SCALE1 transfers and their compressed summaries matched the published hashes. The p99 90% intervals were 42.50–71.17 and 31.87–59.90 ms. The two conditions each ran once.

The two HA1 isolation jobs run their published one-host bench at 50 and 100 saves/s, in that order. The 50/s three-window block must be independently collected before starting 100/s. The per-arm raw evidence stays in each native producer directory. Collect `i30-1` and `i31-1` from the same BM1 client.

### Activation pin ab8ce484b

At 03:18:48 EST the queue admitted the reviewed pin `ab8ce484b4320af2c8cbfa5a28b698aa737f3e32` with WFIX `4331d6fe8`. Its six 64-person window outputs and 757 effects matched the producer and collector. The next native smoke stopped at `join/gate.ts:166`, the `local-before` location floor save, with `AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value` from `notify1/journal.ts:185`. The pinned `join/account.ts:1053` still passes the defined empty owner through `owner ?? undefined` while the release uses census. No 100k timed window started. The published `join/server.ts:116–125` also opens and seeds its own new ACT2 deep scope. Reusing the sealed SCALE1 account for the six windows requires a producer that binds its different roster, schema and original cut. Full first and repeated refusal files are in `overnight/i27-1` and `overnight/i29-1`.

RD1 writer attempt 2 independently reopened the deep seed and had working perf and SQL clients. It stopped before its four native blocks with `Prepared trace directory already has a terminal artifact` in `writer-probe.ts:568`. The initial trace was rotated. The restored gateway then restarted again after an ActiveMQ connection failure and left native JFR terminal files. The native log and raw trace retain both starts and the preflight refusal. A retry needs clean trace ownership after a stable restored startup. Both attempts are collected at `overnight/i24-1` and `i24-2`.

STG1 `f3454b12e` is item `i32`. The four-hour outer ceiling includes a native copied-route 1k preflight. Its official producer and BM1 must agree before the named 100k native unit starts. The command is the published copied route with 16 pages, zero delay and four workers. Its own release hook plus the outer unit check both slot inventories. Collect `i32-1` through the BM1 client.

The repaired RD1 1k pair completed on `ba07d040`. Its terminal reported 124 correct zero-arm checks and 18,320,932 correct loaded reads with the independent oracle accepted. The three 10k pairs use that identical pinned producer. The initial zero and loaded refusal remain available independently.

### Fresh reader pairs

RD1 `ba07d040` finished its three 115-second 10k comparisons at 04:06 EST. `overnight/i28-2` has the matched zero inputs, all reports and the original oracle evidence. The six reader workers were between 0.810 and 0.829 busy in the three 1,024-reader phases, above the 0.70 eligibility limit. The weighted phases lasted 18 seconds. Read errors and mismatches were zero. Independent replay checked 43 readings per loaded arm and 5,706 entity queries across all three.

| History mode | Weighted correct pulls/s (n) | 1,024/256 goodput | Recovery correct reads/s | Writer p99 ratio at 256, n=17/17, 90% interval |
| --- | ---: | ---: | ---: | ---: |
| Global, 192 MiB | 31,732 (571,181) | 1.049 | 126,012 | 1.521 [0.468, 3.555] |
| Closure, 192 MiB | 31,703 (570,659) | 1.043 | 120,963 | 0.820 [0.256, 1.428] |
| Closure plus 32 MiB install | 32,448 (584,070) | 1.024 | 121,448 | 1.320 [0.366, 4.133] |

Each weighted phase and both reader levels reported zero fallback share. The install lane handled 14 requests over its entire run. The fresh scopes stayed before the first scheduled burst, unlike the long Linux v3 run at 3,490 weighted pulls/s. The short tests show strong local-read capacity and did not excite the history path enough to price an old-cut treatment. All three writer ratios are unjudged with 17 saves per side. The revised supervisor launched HA1 shared SQL at 04:06 EST.

### One-host import isolation

The exact `6ef27404e` shared-PostgreSQL job finished at 04:21 EST. `overnight/i30-1` contains all six native tapes, their two independent collectors and the importer’s separate receipt stream. Import reached every one of the fixture’s 800,000 facts. The resulting 7,407 facts/s over a 108-second window is a floor for this setup because the fixture ran out of work.

| PostgreSQL layout and live dose | Last import ACK s | Live offers per arm | Quiet read p99 ms and ratios | Quiet save p99 ms and ratios | Worst read/save ratios against either bookend |
| --- | ---: | ---: | --- | --- | --- |
| Shared, 50 saves/s | 70.68 | 11,880 | 4.44, 1.17× / 1.22× | 7.92, 0.89× / 1.45× | 2.24× / 1.56× |
| Shared, 100 saves/s | 72.88 | 17,280 | 4.87, 0.88× / 1.08× | 11.93, 1.34× / 1.14× | 1.43× / 2.92× |
| Separate, 50 saves/s | 74.38 | 11,880 | 5.51, 1.40× / 2.09× | 7.85, 0.90× / 1.13× | 2.42× / 1.48× |
| Separate, 100 saves/s | 70.76 | 17,280 | 5.32, 1.05× / 1.10× | 18.38, 1.58× / 0.97× | 3.14× / 2.80× |

All quiet p99s used 540 samples per bookend or active window. All accounts verified every scheduled offer in both PostgreSQL layouts at both rates. Separate PostgreSQL finished at 04:36 EST and is collected in `overnight/i31-1`. The shared results are separate Datomic pipelines inside one PostgreSQL process, on one storage device. They price the synthetic fixture and leave the full Priority 8 imports open. The client initially refused the new two-digit item number. The preserved archive and all member hashes verified after correcting the key parser.

STG1 `i32-1` completed the official 1k copied-route preflight. The first independent collector sought an optional `archive.ts` output that the published benchmark does not emit. Re-reading the original attempt, paired tapes and producer proof yielded identical results, 257.88 notices/s, 999 verified effects and four matched saves per side. The source, original request, staged report and preflight hashes travel separately into `i32-2`. The first archive remains intact. The full published command still runs its own bound native check and uses the remaining four-hour ceiling.

INT1 `i26-1` fixed the earlier working directory. Its exact native activation gate checked 1,000 subjects through cut 447. The capacity trial stopped on its first resource snapshot. On this Docker daemon, `top -eo rss` returned `Couldn't find PID field in ps output`; its thread snapshot uses the same PID-free format. The retry wraps only those two measurements for this attempt’s four container IDs, asks Docker for PID plus the actual metric, and returns the original column format. It checks a fresh 1k trial before the 1M seed. The first archive is `overnight/i26-1`. The previous queue wrote FREE at 04:45:06 EST when INT1 refused. I verified the empty inventory and restarted the retained notice job at 04:46:06.

STG1 `i32-2` refused at `notify1/bench.ts:102`, `Two retained seeds and one active cohort must fit`. The pinned capacity formula requires about 192 GiB available memory for the copied route at this population. The host has 93 GiB installed. The check ran before creating its native unit. The matched 1k survives at `i32-1` and the refusal at `i32-2`. INT1 `i26-2` wrote a real 1k result before BM1's equality check rejected two optional `undefined` properties omitted on disk. The independent Mac replay checked all native phase readings and matched the producer's p99s of 6.21 ms cold read and 8.48 ms save (10 and 20 observations). It made no offers at 1M. The first bytes and refusal are under `overnight/i26-2`, with the replay in `single-n20/recovered/int1-i26-2`.

The thin seed's first bootstrap pointed at the sparse operator checkout and exited 127. The replacement reused the already checksum-built, unchanged INT1 checkout at `0dd4cbb24`, with a new owned slot and two new scopes. At 05:03:46 EST the native 1k verified 8,000 assertions through cut 22 (5.00 s seed and 0.90 s feed check), and the independent collector reproduced its ledger. The 1M scope then started from position zero. Check `/var/tmp/triplex-bm1/STATUS` and `sudo tail -n 30 /var/tmp/triplex-bm1/single-n20/thin-fixture/worker.log` on the bench server. After cleanup, run the same Mac collection command with `collect-thin-fixture` in place of `collect <key>`. It copies the checksummed evidence to `evidence/DX-BM1/single-n20/thin-fixture/` and indexes it. Large raw data stays on the bench. The systemd runtime limit is 2 h 35 min.

ACT1's new `48f557594` pin supplies the shared-geography repair. Bench preflight `i33-1` finished at 05:49:12 EST, with the pinned component windows, shared census, typed refusal and both small settlement rates verified in `overnight/i33-1`. The quiet owed and staged windows were 41.95/57.71 ms and 242.03/250.92 ms to durable and first correct answer. At 3.5 saves/s they were 39.96/51.85 and 222.07/231.64 ms. At 23.5 saves/s they were 84.51/92.67 and 270.18/275.73 ms. All six windows kept their exact scheduled saves and 757 verified effects. The separate 100k ACT1 roster still requires a scope decision or a producer that validates the sealed SCALE1 roster and cut.

The full thin seed verified all 8 million assertions through cut 20,834. The first sealer expected `kvs`, while the archive listed `datomic_kvs`. The original logical dump survived cleanup. `bm1n20-thin-fixture-restore` restored its 2,912,827,191 bytes in 119.07 s, checked 164,585 physical storage rows and all three durability settings, then verified an empty scratch inventory at 06:03:04 EST. The image SHA-256 is `c9057500e6398135148fa16bf656c2d80cffea9fa95bbd3ca8391441213c787d`. The full dump stays on the bench. The Mac `collect-thin-fixture` verified and indexed the proof.

The owner authorized the fresh ACT1 roster at 06:05 EST. `bm1n20-activation-100k` launched `bm1n19-joinedv2n20rb` at 06:05:37 using verified ACT1 `48f557594` and WFIX `4331d6fe8`. The failing `ab8ce484b` attempt remains at `i29-1`. Progress is in `/var/tmp/triplex-bm1/night-n19/i29/2/worker.log` and STATUS. The four-hour cutoff is 10:05:37 EST. The supervisor releases the slot after the six linked windows, exact seed readback and offline receiver checks settle. The separate second 100k settlement price fixture is stopped at that boundary. Collect `i29-2` through the Mac client after cleanup.

The next seed is ERASE1's separate aged target fixture at `856c4c9ae`, as its native stage uses target-only journal transactions. The two collectors matched the builder's checked 24-person sample, including 244.54 and 235.81 ms to a fresh root. Item `i34-1` runs the exact published Linux `server.mjs stage` and `check` commands with its own loopback PostgreSQL and worker lease. It starts after ACT1 cleanup. The total ceiling is four hours, with a 150-minute native stage maximum and 55-minute check maximum. Check STATUS and `sudo tail -n 30 /var/tmp/triplex-bm1/night-n19/i34/1/worker.log` on the bench. Collect `i34-1` through the Mac client. The indexed fixture and native logs stay on the bench if the measurement stops.

### Joined Publish at 100,000

The `i29-2` ACT1 producer began the first offer at 07:59:47 EST after 112 min 4 s of seed preparation and enrolment. The last timed window wrote its terminal record at 08:04:39 EST. The independent seed readback checked 16,045,255 facts at cut 11,669 and the final receiver matched 342,881 ordered effects. The Mac copy has the complete `overnight/i29-2` transfer and 38 original checksummed files in `single-n20/recovered/activation-i29-2-components`. Both copies agree on six offered-to-durable and first-correct intervals and all 3,240 save ACK rows.

| Saves/s and mode | Durable / first correct | My forecast | One-second deadline |
| --- | --- | --- | --- |
| Quiet receipt-only | 46.14 / 55.97 ms | 80 / 120 ms | MET |
| 3.5 receipt-only | 53.15 / 63.46 ms | 100 / 140 ms | MET |
| 23.5 receipt-only | 2.043 / 2.051 s | 140 / 190 ms | MISS |
| Quiet staged | 13.019 / 13.026 s | 18 / 18.1 s | No bar |
| 3.5 staged | 14.118 / 14.134 s | 20 / 20.1 s | No bar |
| 23.5 staged | 18.616 / 18.625 s | 23 / 23.1 s | No bar |

Each cell has one Publish. The loaded windows have 210 or 1,410 audited saves each, according to rate. The busy receipt waited 2,019.56 ms from ingress to entry. Its last older save finished 0.012 ms before that entry. Time from entry to the native ACK was 24.25 ms. The busy staged run had 89 older saves at ingress and waited 4,320.30 ms before entry. These observations include the benchmark's serial admission queue. The full v3 bars remain unjudged.

The close hook initially compared the producer's writer-container slot to the stack prefix. The corrected match verified both names and the actual writer options. It stopped the separate settlement-price fixture at 09:01:01 EST after the requested measurements and receiver proof. Independent replay and cleanup completed at 09:01:06. The separate 100k settlement-price results remain open. ERASE1 began at 09:01:12 with a four-hour cutoff at 13:01:06.

### ERASE1 retained fixture

ERASE1 staged 100,000 people, 16,045,255 facts and one 415-save history through cut 12,066. The stage file was ready at 10:02:34 EST, 61 min 28 s from admission. During SQL maintenance the transactor logged `Terminating process - Heartbeat failed` at 10:00:57. The subsequent check failed before any timed offer with `DatomicHttpError: Error communicating with HOST`. The indexed fixture and exact stage input remain on the bench. Mac archive `overnight/i34-1` has the stage, failure and scoped cleanup. The `bm1n20-erase-fixture-copy` unit clones the stopped PostgreSQL files before the one resumed check. The retry checks the copy, stage hash, scratch nonce and the producer's durable scope before any timing. Collect `i34-2` with the same Mac command.

The first resume controller treated the copied directory as an already launched unit. It wrote FREE at 10:10:44 EST with no worker log and a nonexistent service. I preserved that refusal in `i34-2-prelaunch` and started the same recorded attempt at 10:12:42, with its original deadline and cleanup. The worker verified the 11 GiB copy, retained stage digest and scratch nonce before invoking the native checker. A copied fixture alone no longer qualifies as worker admission.

The resumed check finished and cleaned up at **10:15:58 EST**. The unaged and 415-save targets each covered one person. Fresh-root clocks were 2.557 and 11.900 s, with native index jobs of 2.340 and 8.550 s. The aged arm selected 5,658 datoms and wrote 901 leaf segments and 111 directory segments. Fresh peers matched zero remaining selected values. One held gateway view returned the aged value 14.177 s after request send. At 500 saves per block, the aged arm's p99 was 129.99 ms in control and 120.88 ms for the entire comparison block. It was 164.94 ms among the 337 saves wholly inside the native index job. The later storage pass covered both erasures and older index generations. Ordinary collection removed 54.3 MB of values with unchanged relation allocation. The full rewrite recovered 0.99 GB and the maintenance window generated 5.72 GB of WAL. Mac archive `overnight/i34-2` has the full producer and collector outputs and the retained fixture proof.

STATUS read `FREE 2026-11-20T15:15:58Z` after both native services stopped and the owned inventory was empty. The full chosen activation and erasure bundles and thin restore summaries were verified and indexed on the Mac. The full setup images remain on the bench. The source-bound activation prices cover the six component windows. The independent 100k settlement-price follow-up, INT1 capacity at 1M, CEIL, isolated predecessor and pulse, SIZE and RD1's matched writer attribution still need measurements. The revised INT1 pooled report at `bf6dbc410` still awaits its small saved-output comparison.

## Friday one-database queue

The pinned JVM1 seed service started at 10:28:14 EST. The write, read and transactor placements were confirmed and the seed entered native ingestion. The detached successor waits for exact readback and scoped teardown before running the eight-save agreement and starting the timed comparison. Bench checkout `46880aa47d7c580c400b457df0c8baf9e971e78a`, supervisor `897cd5b35`. Both use `/var/tmp/triplex-bm1/day-n20-jvm1`. Neither service releases the server to the next owner.

```sh
cat /var/tmp/triplex-bm1/STATUS
systemctl status --no-pager bm1n20-jvm1-seed.service bm1n20-jvm1-campaign.service
sudo tail -n 25 /var/tmp/triplex-bm1/day-n20-jvm1/{seed,campaign}.log
```

Look for the detached seed's `seed/seed.json`, then `small/results/small/{producer-small,collector-small}.json` and `campaign/results/collector.json`. The seed payload stays on the bench. Each phase keeps exact offer and stage rows. All three JVMs log absolute GC timestamps. HotSpot is G1 on the transactor and reader and Serial on the writer. The present arm uses 1/2/1 cores in that order and the three other arms use 3/3/1. The field schedule retains submit, prepare, ready, entry and native-completion clocks. The pinned individual mode doesn't emit the native computation subclock.

TAIL1's archive pin matches the experiment's 281,491,079-byte synthetic archive in the Mac SCALE1 evidence. The assigned bench contains no matching copy. ACT1 merged priority `bc01028b0` in `63fa6ecdb`. At `3bbd85ba3`, its server command still seeds fresh and offers one Publish per window. The three loaded receipt-only sweeps need an exact roster restore and repeated offers at the specified rates. BM1's previous joined run saved its exact final evidence and removed its volume without writing a physical snapshot. The separate SCALE1 deep seed uses another roster. The scoped inventory found no exact reusable ACT1 image. The six-window proof and timing remain available. Staged-value timings are reported separately under the current Targets definition.

HA1's new `load-micro` uses one Datomic database per arm, with all live participants and the import in that database. The current command uses one serving gateway for writes and reads, and one transactor. The producer and BM1 replayed all five saved Mac tapes, each with 11,880 fixed live offers. The source-bound summary is in `evidence/DX-BM1/day-n20/ha1-micro-agreement`. The three cap treatments were 16/24/32 facts and yielded 844/836/935 independently queryable facts/s on that Mac. The historical separate-database comparisons are out of the current queue.

The retained thin million-person image uses the INT1 `0dd4cbb24` lean roster. The stock integrated campaign expects another legacy, namespaced seed. The retained-seed reader uses the original source's validated reader, population ledger and gateway budgets. It runs a fresh small restore and companion API/collector check before the matched active-only and full-size observations. Both profiles admit precisely the same 20,000 spread-cohort people. The baseline creates only those 20,000 roots. The full arm restores the sealed 1M image and checks each reader answer against the saved assertion ledger. Three natural RSS samples precede the save loop. Profile differences are paired whole-process RSS estimates. PostgreSQL's summed RSS can count shared pages more than once.

The INT1 image is present on the bench by its original immutable ID. The supervisor `bm1n20-int1-capacity` waits for JVM1 and any higher-priority TAIL1 job to stop. `bm1n20-rd1-aged` waits for it, builds the pinned RD1 checkout and runs the 24-person native preflight. The full reader curve uses one 10,000-person database, 10,000 native saves between the older cuts and the head, and the same read gateway in the direct and worker arms. Read shares are 0%, 1% and 5%. A 24-root lookup cohort shares two old cuts to match RD1's original experiment. This diagnostic exposes the benefit of reuse for that workload.

The HA1 microframe service follows RD1. PREP1's published report now names source `7ca8525a9` and the native command. Its detached service first checks a short real K/S tape against the native append and three JVMs. Only then can the unmodified producer prepare its ten-account field seed and start the 12 measured arms. The builder still has the SQL restart and erasure gates open. The separate ACT1 settlement-price producer currently puts the live neighbour in a different native database. The current one-database queue needs an ACT1 counterpart with both accounts in the same scope.

The sealed JVM1 dump is 22,257,097,252 bytes, with SHA-256 `34e3e707453eaf7d78b0ed6bd01c5eeef31cbdee21addff50621b94958ba2202`. The small eight-save replay passed. The present arm stopped at the six-minute logical restore ceiling before any timed offer. The first provisioning retry reached its PostgreSQL stack and stopped during Java setup. Cleanup reported an unset home variable. The resumed service now restores into that already-owned PG container and uses checked cold clones for transient arms. The source and timing profiles are still pinned to `46880aa47`.

The first INT1 restore returned all 20 small reads correctly and could not resolve its first subsequent write. The retry prices reads and memory on the same 20,000 active people, without measured saves. The RD1 first native fixture stopped at its first attempted retraction because the adapter used the wrong request field. Its fresh retry uses `id`. The first attempt files remain in their own roots. A single detached supervisor, `bm1n20-friday-remaining`, now starts INT1, RD1, HA1 and PREP1 sequentially after JVM1's cleanup. Independent waiting units had raced the JVM1 restart during their handoff and left HA1 and PREP1 unstarted.

Collect terminal run files from the Mac with the appropriate producer SHA. Both original files and the large snapshots remain in place on the bench.

```sh
export BENCH_SERVER
bench_control=/var/tmp/triplex-bm1/day-n20-followers
python3 lab/experiments/EXP-DX1/bm1/day-evidence.py collect jvm1 46880aa47d7c580c400b457df0c8baf9e971e78a "$bench_control"
python3 lab/experiments/EXP-DX1/bm1/day-evidence.py collect int1-capacity-retry 0dd4cbb24f10dad80e4263fd0c04159ce512b251 "$bench_control"
python3 lab/experiments/EXP-DX1/bm1/day-evidence.py collect rd1-aged-retry 5f51de7d6ab09b884df61f5c260db7f6688726c1 "$bench_control"
python3 lab/experiments/EXP-DX1/bm1/day-evidence.py collect ha1-micro 14174308fa1b1f6ade7f3e1fe3ce58ca4bc173ba "$bench_control"
python3 lab/experiments/EXP-DX1/bm1/day-evidence.py collect prep1 7ca8525a9ea0c3810c7af6ba0b5a0e15552dd534 "$bench_control"
```

### JVM1 completed comparison

All four clones finished at about 14:03 EST and INT1 took the host. Each arm accepted 81,444 timed offers across ten phases. Each offer had one distinct native receipt and both field and journal readback. There were zero observed missing, expired or failed offers. The materialized copy restored 815,808 storage entries in 338.59 seconds through a single logical restore, then checked 1,357 physical files per arm before launching its JVMs. Every arm kept all three absolute timestamp pause logs. The collector joins prepare, sender and gateway admission, native entry and await to each original scheduled save. It also checks the sealed population, cold restore and driver placement. The Mac holds the full 23.3 MB summary archive and 216 KB raw archive under `evidence/DX-BM1/day-n20/jvm1`. The directory includes the verified files, including `summary/retry/results/collector.json` and all raw offered clocks used below.

| JVM arm | Solo ACK p99 at 3.5 / 23.5 / 39.4 saves/s by 210 / 1,410 / 2,364 saves (ms) | Quiet account with nine at 23.5 / 39.4 (ms and ratio, 210 quiet saves each) | Ten-account goodput at 235 / 394 offered/s | Drain beyond 60 s at 235 / 394 offered/s |
| --- | ---: | ---: | ---: | ---: |
| Present | 70.8 / 72.2 / 474.1 | 1,450 / 1,525, 20.49× / 21.54× | 138.6 / 153.3 | 41.72 / 94.26 s |
| Candidate | 97.1 / 139.2 / 199.9 | 1,203 / 1,072, 12.39× / 11.04× | 148.8 / 163.5 | 34.78 / 84.57 s |
| Candidate with 128 MiB memory-index threshold | 90.8 / 132.1 / 243.4 | 981 / 956, 10.80× / 10.53× | 188.5 / 186.4 | 14.81 / 66.86 s |
| Candidate with compiler threshold scaling 1 | 125.2 / 110.5 / 627.0 | 1,072 / 906, 8.56× / 7.23× | 147.2 / 170.1 | 35.76 / 78.99 s |

Ten-account high-rate denominators are 14,100 and 23,640. In the 235-offer/s window, per-save p99 prepare/gateway queue plus native entry/native await were 0.15/1,521/1,531 ms presently, 0.17/1,094/1,165 ms for candidate, 0.18/1,048/1,146 ms for 128 MiB, and 0.18/1,159/1,258 ms for compiler default. Those are marginal clock distributions with possible overlap. They do not sum to the end-to-end tail. The client-side offered backlog peaked at 4,445 / 5,515 / 2,332 / 5,482 saves. Solo p50 at 23.5/s stayed 6.93–7.81 ms while the candidate's native await p99 rose from 71 to 135 ms. The 32 MiB candidate and both ablations missed both preregistered 3.5/s and 23.5/s solo-tail ranges. The 128 MiB arm offers the strongest busy-throughput follow-up. The solo and quiet regressions still matter, and each policy has one measured replicate.

Collectors and physical role cores were G1 1/Serial 1/G1 2 for transactor/writer/reader presently and G1 3/Serial 1/G1 3 in each other arm. In present/candidate/128 MiB/compiler-default order the transactor logged 515/1,174/1,140/1,166 pause events, the writer 317/196/214/197, and the read gateway 107/39/48/39. Counts cover the whole arm including startup. Each role's log timestamps and exact placement are in the collected evidence. There was no controlled writer-collector change here.

### Retained million-person capacity

The original lean million-person seal bound cut 20,834 and all 8 million facts. A fresh 1,000-person retry matched the native producer and independent collector's 20 reads, at p50/p99 3.42/29.55 ms. The active-only baseline admitted only the matched 20,000 spread-cohort people, reaching cut 417. The full arm restored the original image and used the same cohort at cut 20,834. Both checked all 20,000 scheduled first reads in order with zero wrong or missing reads. There were no save offers and no save stage clocks in this read-only retry. The transactor, write gateway and read gateway used G1 with 1/1/2 cores, with absolute pause logs, exact container IDs and teardown retained. Mac evidence is under `evidence/DX-BM1/day-n20/int1-capacity-retry`.

| Reading | Active-only profile | Restored million |
| --- | ---: | ---: |
| First read p50/p99, ms | 0.467 / 6.460 | 0.475 / 6.120 |
| Reader median RSS, MiB | 207.73 | 210.27 |
| Write gateway median RSS, MiB | 306.33 | 331.55 |
| Read gateway median RSS, MiB | 338.30 | 406.04 |
| Transactor median RSS, MiB | 727.70 | 506.51 |
| Summed PostgreSQL median RSS, MiB | 562.01 | 523.74 |

Per 980,000 extra untouched people this is +2.73, +26.98 and +72.48 B for reader, writer and read gateway. The three samples give roughly +72–78 B for the read gateway. The restored transactor and PostgreSQL RSS were lower by 236.66 and 40.95 B per untouched person. The active-only baseline seeded its rows in the live JVM and the full arm reopened a restored SQL image. These two negative differences expose the effect of startup and seed history on the snapshots and cannot establish a native bytes-per-person rate. The earlier follow-up write returned an unknown outcome and was not replayed. This capacity check measures a retained population with ordinary reads. It leaves write latency and integrated capacity qualification open.

RD1's second preflight kept 32 exact native aging receipts and advanced through head 44. It finished its small read windows and failed the producer's trace-census step. Its native events identify the read peer as `gw-r`, run as the exact slot, and source as the Git SHA. The local decoder expected `gateway`, `rd1-` plus slot, and the gateway's measured source-file digest. The saved summary trace contains six admitted spans for 7,509 exchange IDs. All six match their parent and child IDs, but there are too few to complete the small evidence or price the full aged workload. Both attempts are under `evidence/DX-BM1/day-n20/rd1-aged*`.

### Aged old-cut reads

The bare-metal decoder and the independent collector accepted all exchanges from the fresh 24-person, 32-save gate. The full run on the same pinned source finished at 14:30 EST. It aged one 10,000-person database with 10,000 native saves in 34.44 s and queried the same 24 roots at head or two previous cuts. Each cell used two mirrored three-second windows with 128 seats. The producer checked every issued answer against its cut-specific model. Of 14,047,985 issues, 14,046,964 completed inside their windows and 1,021 drained after. No open-loop offers or expiries apply to these closed-loop reads. The gateway spans matched all 23,387 logical fallbacks that issued HTTP and all 23,401 corresponding exchanges.

| Old-cut share | Direct reads/s | Share of direct baseline | Isolated install reads/s | Share of isolated baseline | Correct in both treatments |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0% | 538,551 | 100% | 541,376 | 100% | 6,479,564 |
| 1% | 140,766 | 26.1% | 542,115 | 100.1% | 4,097,284 |
| 5% | 49,549 | 9.2% | 528,804 | 97.7% | 3,470,116 |

The isolated installer reduced in-window fallback decisions from 8,442 to 229 at 1%, and from 14,794 to 358 at 5%. Both treatments shared the same read gateway. The transactor, writer and read gateway used G1 with 1/1/2 cores. Logs include their absolute GC clocks, saved issue and ACK times for every aging save and read admission/work spans. The diagnostic benefits from reusing two historical cuts. It leaves the curve for high-cardinality old cuts and full frozen-trace verdicts open. Evidence `evidence/DX-BM1/day-n20/rd1-aged-native-trace`.

### Shared database microframes

HA1 source `14174308fa1b1f6ade7f3e1fe3ce58ca4bc173ba` used one Datomic database and eleven live accounts within each five-arm run. Ten neighbours offered 50 saves/s and the quiet account added 5/s. There were 540 saves and 540 read offers per account in every 108 s window, all 59,400 live offers matched. Fresh matched no-import bookends gave the quiet account save/read p99 of 12.76/6.55 ms and 6.84/3.98 ms. Every import frame size exceeded 1.5× for at least one account against both controls. The quiet-account rows below give p99 and ratios against the first and second control.

| Facts/frame | Queryable within 108 s (facts/s) | Quiet save p99 (ms) and ratios | Quiet read p99 (ms) and ratios | Worst read/save ratio against either control |
| ---: | ---: | ---: | ---: | ---: |
| 16 | 216,208 (2,002) | 42.92 (3.36× / 6.28×) | 9.85 (1.51× / 2.48×) | 4.07× / 8.25× |
| 24 | 320,136 (2,964) | 50.76 (3.98× / 7.42×) | 12.68 (1.94× / 3.19×) | 3.19× / 8.68× |
| 32 | 430,144 (3,983) | 37.59 (2.95× / 5.50×) | 15.98 (2.44× / 4.02×) | 4.02× / 8.41× |

Every exact queryable prefix excludes later receipts and includes an independent marker check. The recorded native joins retain submit, queue, entry, peer stages, serial hold and complete times. The driver also checks a lost response replay and ordered history. Save and read service share one G1 gateway, with no standalone reader JVM in this experiment. The separate transactor used G1 too. Both have 3-core quotas and an effective JVM processor count of two. Absolute logs are retained with the offer tapes. This is the current small-frame reading for one database. No separate-database run is used in these comparisons. Evidence `evidence/DX-BM1/day-n20/ha1-micro`.

PREP1's first native preflight matched all 1,315 prepared-path offers and returned `InvalidValue` for all 1,315 grouped-control offers. The short seed omitted the native subject/account mapping that the full producer has. BM1 added those facts and the second gate matched all 1,315 offers per treatment. K emitted zero prepared appends and S used the prepared route on all 1,315. The producer and separate collector agreed. The full producer entered ten-account seeding at 14:36:05 EST in `bm1n20-prep1-tenant.service`, source `7ca8525a9`, supervisor `a5c4d68f9`. It plans 12 arms with a 29-minute ceiling per arm and a 7h40m total unit ceiling. The failed and corrected small results remain separate at `evidence/DX-BM1/day-n20/prep1` and `evidence/DX-BM1/day-n20/prep1-tenant-agreement`.

```sh
sudo cat /var/tmp/triplex-bm1/STATUS
systemctl status --no-pager bm1n20-prep1-tenant.service
sudo tail -n 20 /var/tmp/triplex-bm1/day-n20-prep1-tenant/worker.log
python3 lab/experiments/EXP-DX1/bm1/day-evidence.py collect prep1-tenant 7ca8525a9ea0c3810c7af6ba0b5a0e15552dd534 /var/tmp/triplex-bm1/day-n20-prep1-tenant-control
```

## Friday evening queue

**Server 1 estimated running cost at 01:00 EST is $67.09** at $1.09/hr since Wednesday 11:27 EST. The orchestrator owns the release. The absolute remaining window ends Saturday at 12:00 EST.

The active PREP1 `1-2-S` is a one-gateway mirror. The first component of the producer's cell name is the writer count. The server fenced only the parent loop while this child continued. The reordered supervisor waits for that child's output and cleanup, reopens the same seal for `2-1-S` then `2-0-K`, and skips the other repeats and four-gateway arms. The measured pair's first collector checks each source, plan, seed, summary and fresh terminal against the original request. After it records the pair, TAIL1 `da4c34f48` then JVM1 `5a9652780` take the original `46880aa47` verified seed. TAIL1 uses Java 21 G1 and varies the transactor cache from 256 to 2,560 MiB. The Java 21 G1, Java 25 G1 and Java 25 ZGC comparison keeps placement fixed. The new order has three JVM arms.

PREP1 sealed its own 17.49 GB dump at 16:19 EST. The first one-gateway K/S pair delivered 181.7/111.1 saves/s within the 394/s window (56,736 offers per arm). It achieved 7.988/1.002 durable saves per append and left 30,303/40,485 offers without ACKs. Quiet-account p99 ratios were 8.03×/86.53×. The builder's original forecasts were 255/383 saves/s and 14.53×/1.22×. Both arms used all 504 quiet-account receipts per reported quiet p99. High-rate loss makes some complete-cohort tails unavailable.

The restricted comparison finished at about 18:35 EST. Both two-gateway treatments and the already-running one-gateway S mirror completed. The matched grouped K pair lost 31–43% of goodput at 235–620 offered and verified roughly one save per append, down from eight. The prepared pair rose at 235 and 394 and held nearly flat at 620. The two write processes shared the one-gateway arm's physical CPU mask and total heap budget. The remaining arms were skipped by instruction. The complete table and 78,373,936 bytes of verified compressed archives are available on the Mac. [Writer comparison](PREP1-READING.md)

TAIL1's standalone `da4c34f48` stopped before offers with `Integrate JVM1's sealed-seed restore first`. The required stack module is absent at that source. The advancing queue then restored the original seed for JVM1, but its worker rejected intersecting main and worker CPU lists. Both first attempts are retained. The recovery uses the `da4c34f48` cache producer's exact bytes on its descendant `5a9652780` for the required stack. Both adapted launchers assign CPU 3 to the sender main and CPUs 6–7 to its helpers, preserving the declared three-core sender set. They must finish fresh native small checks before timing. The integrated TAIL1 retry matched eight exact saves. Its write gateway exported a zero-byte JFR file with IOException, so neither cache arm entered full timing. The refused writer JFR was timestamped 23:47:24.126 UTC, about 16 seconds before the finish request. The writer restarted twice before readiness and its JSONL still held the first startup's runtime rows. The retry archives each failed writer or reader generation before starting the next JVM and waits for two WAL samples during its small gate. The retained failed prefix cannot establish reads or decode per save. Java's placement retry matched eight native saves and two historical reads with all three pause logs, and began its three original policies at 18:50 EST. All three finished. The independent checker initially refused a request mtime 0.361 ms before its recorded start. Recheck the captured run within one measured Linux timestamp tick. Keep its original refusal log and raw rows.

The checked cold clone from the afternoon avoids the measured six-minute startup barrier. The cold-copy shim hashes every streamed byte of the original 22.26 GB dump, compares the bound seed and physical manifest, checks every restored file on the fresh PG container and records its immutable ID. Each producer still checks its own original restore digest and reopens its verified cut. Eight native offers per small arm must agree with the independent collector before long timing. All committed starting states, phase outputs, pause logs and scoped cleanup are checked per source and run. The benchmark writer layout and single-database workloads remain fixed.

The priority-Publish code is integrated on ACT1. Its latest server launcher starts a fresh seed and offers one Publish per rate. The available repeated runner is fixed to 10,000 people, and the earlier 100,000-person ACT1 cleanup deleted the exact PostgreSQL volume without a snapshot. The previous proof and roster census are intact. Keep the current no-reseed rule unless the owner changes it. Release-scorecard trajectories and cross-database contrasts stay out of server 1's queue.

After Java, PREP1 runs the published storage campaign at `d3bd6a8b`: grouped, original prepared, numeric-owner, ordered hints and 16 GiB cache at 235 and 394 offered. A one-second native prefetch gate uses the same physical seed and collector input format. The five timed arms use the original producer files. The standby numeric-owner comparison is superseded. That diagnostic failed before offers because the pinned function literal differed across JVMs. The cache recorder recovery now runs first. Four timed PREP1 cases from the builder's corrected `df307c29c` follow: grouped, original prepared, 16 GiB cache and ordered IDs. Numeric-owner-only and ordered hints were cut to stay inside 90 minutes. Both cache settings must first join eight saves and seal all three recordings. The ordered-ID storage gate separately joins a fresh one-second phase for each rate and quiet window. The priority-Publish rerun still needs an exact retained 100,000-person snapshot. ERASE1's `4054f548` detached check uses four distinct quiet-account roots in the same database and requires a fresh 128-person native gate before its paired full stage. The guarded controls are separately staged starting states for isolated arms. HA1 `e1b5d34d2` supersedes the multiple-frame comparison with feedback and fixed pacing, each with one outstanding 32-fact frame. The two-sided Mac replay accepted all 5,040 original live observations and both queryable prefixes. No second host is used by these measurements. The two-server failover window belongs to the orchestrator after the queue.

```sh
sudo cat /var/tmp/triplex-bm1/STATUS
systemctl status --no-pager bm1n20-prep1-tenant.service bm1n20-jvm25.service bm1n20-tail-backlog.service
sudo tail -n 25 /var/tmp/triplex-bm1/night-n20-dispositions.txt
df -g .
```

After each child becomes terminal, use `day-evidence.py collect ITEM FULL_PRODUCER_SHA CONTROL_DIR --bundles` on the Mac. Use control `night-n20-reordered-control` for `prep1-tenant`, `jvm25` and `tail-backlog`. Use `night-n20-recovery-control` for `jvm25-retry`, `tail-backlog-integrated`, `erasure`, `erasure-small` and `ha1-paced`. Use `night-n20-storage-control` for `prep1-storage`. Use `night-n20-generation-control` for `tail-backlog-generation`. Use `night-n20-ordered-control` for `prep1-ordered` and the Java collector replay. Paths are under `/var/tmp/triplex-bm1`. The manifest keeps compressed sizes, hashes, service outcomes and original producer receipts. The client rechecks every compressed member and leaves at least 5 GiB free. The grouped K lane has live priority enabled and S uses direct prepared saves. The newer fair-credit ingress is unavailable at this pin. The K/S contrast cannot isolate that later rule.

### Java 25 completed comparison

The three arms finished at 19:32 EST with all 244,332 offered saves durable and all 1,800 pinned reads exact. Independent replay accepted the original run after correcting the 0.361 ms mtime skew. The first refusal and raw bytes remain in the compressed bundle. ZGC gave 219.55/245.33 saves/s at 235/394 offered compared with Java 25 G1's 195.93/189.58. Memory capacity reserved grew from 24 to 37 GiB. The native TAIL gate runs separately and still requires all three JFR seals. The four-arm ordered-ID retry waits after TAIL. Both runs have scoped cleanup and queue into erasure and import pacing. [All Java clocks and evidence](JVM25-READING.md)

### Completed cache pair

Both cache settings passed their fresh native eight-save gates. The recorded JVM generations and all 4,728 full clock joins matched independently. At 2.5 GiB the mean SQL count fell from 14.73 to 9.68 per save and ACK p99 fell from 286.13 to 173.37 ms. Ordered PREP1 began its native small gate after cleanup at 19:52 EST. Erasure and import pacing remain detached behind it. [Cache readings](TAIL-CACHE-READING.md)

Ordered PREP1 ended at 20:48 EST. The 128-person erasure gate completed both checks. Full staging stopped at 20:52 EST when bind returned EADDRINUSE after small cleanup. Import pacing started immediately. A fresh erasure stage follows it with bounded passive bind retries and the accepted small gate's fingerprints. Collect `erasure-retry` via `night-n20-erasure-retry-control`. Inspect `bm1n20-ha1-paced.service` and `bm1n20-erasure-retry.service` for the two remaining ready items.

Ordered IDs reached 234.90/393.92 saves/s at 235/394 offered with 0.033/0.014 transaction-thread SQL reads/save. The Mac compressed bundle has all 152,640 offered rows, including expiries, and all three JVM pause logs. [Verified four-arm table](PREP1-STORAGE-READING.md)

Pacing finished at 21:01 EST. The erasure retry cleared the port check and stopped at the image check because the pacing build had updated the shared tag. The exact image recorded by the erasure build remains present and matches its digest. The final launch uses that immutable identity. Collect `erasure-image` through control `night-n20-erasure-image-control` and keep both full-stage refusals.

The four import pacing windows are independently verified. Feedback gave 1,715.56 facts/s and fixed pacing 2,986.07. Both doubled the quiet read p99 against the faster control and increased quiet-save p99 more than ninefold. All 47,520 live offers verified. The final runnable item is erasure on the original pinned image. [Every account and stage](HA1-PACING-READING.md)

The new append-tail job uses the ordered writer at `df1b45d6b` with the original sealed ten-account inputs. The second NVMe was an unmounted signature-free whole disk and the root filesystem was on the first NVMe. Only the second disk is formatted, and only the WAL treatment mounts it. The work ceiling is 75 minutes after preparation. See `bm1n20-prep-tail.service` and the pending result in [forecasts](PREDICTIONS.md).

### Erasure stage disposition

The 128-person native gate measured 81.78 ms to a durable ACK for 416 aged identities, 94.37 ms to the verified marker and 1.13 s for 128-body cleanup. Each of its five guard windows verified 500 saves, with guarded-save p99 at 0.60–1.26× of its controls. The first two full launches stopped before staging on a busy port and a moved image tag. The immutable-image attempt sealed 16,045,255 facts at position 11,651 in 61m37s, including a 2.90 s staging index settle. Its transactor lost its heartbeat during staging maintenance and the control tried to reuse it. The one authorized recovery hash-checked the protected seed and keys, reopened them, and sealed an equal-size unguarded control. It stopped when the runner's shutdown assertion still reached a loopback listener. Neither 100,000-person erasure timing began. The original evidence and both sealed starting states remain on the bench and the Mac has the logs and witnesses. No further erasure retry remains authorized.

The first append session bound all three sentinel commits to their WAL flush LSNs. No fsync helper entry reached the tracer, and its gate refused the tape. The retry observes a successful fdatasync within the same PostgreSQL backend's XLogFlush interval, preserving the three-way sentinel check and the original benchmark code, seed, offer tape and storage settings. Both attempts have separate roots. The second drive's existing ext4 UUID must match before retry. [Pinned PostgreSQL 17 WAL code](https://github.com/postgres/postgres/blob/REL_17_12/src/backend/access/transam/xlog.c#L8149-L8192)

The append retry's first sentinel linked a fresh commit, flush and successful syscall at 22:33 EST. Inspect `bm1n20-prep1-tail-syscall.service` for the four-arm run. The first archive used the planned item name as the systemd unit and reported the default inactive state. The adjacent checksummed `service-correction.txt` records the actual original unit and exit 1. Updated collection binds each unit by its real name. After the retry terminates and proves an empty inventory and unmounted WAL drive, the detached erasure waiter starts the single recovery.

The control and separate-WAL append arms completed and validated. Java 25 actually reported version 25.0.5+8-LTS, but the launcher compared the transactor to the Java 21 gateway pin. Neither ZGC nor fair turns offered work in that attempt. The two-arm completion keeps both existing arms and validates each JVM against its pinned runtime. It follows the active erasure recovery and uses the same tape, sealed dump and observer. Inspect `bm1n20-prep1-tail-remaining.service` after erasure. The four readings span two sessions. [Verified append results](APPEND-TAIL-READING.md)

The combined experiment is pinned at `d1224c27e5ac0fcacfa04cc4d2a11b0f328eacaa` and queued directly behind the active two-arm append completion. It uses the same seed, the published native observer, fair turns, the existing dedicated ext4 WAL device and the mixed Java pin. Its ceiling is 30 minutes. Collect `prep1-tail-combined` after its service ends. See the erasure disposition above for the two sealed stages and the final shutdown failure.

The ZGC and fair-turn arms completed at 00:36 EST with all 114,480 offers durable. Their compressed archives and each per-append cause are on the Mac. The stock combined pin began at 00:37 EST without needing a new filesystem. [All four readings](APPEND-TAIL-READING.md)
