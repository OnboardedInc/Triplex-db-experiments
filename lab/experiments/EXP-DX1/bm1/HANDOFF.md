# DX-BM1 bench handoff, November 19

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

```sh
bench 'sudo -n cat /var/tmp/triplex-bm1/STATUS'
bench 'sudo -n cat /var/tmp/triplex-scale1/decision/attempts/arm-d7-bm1-single-n20/STATUS.json'
bench 'sudo -n tail -1 /var/tmp/triplex-scale1/decision/attempts/arm-d7-bm1-single-n20/seed-progress.jsonl'
BENCH_SERVER="$BENCH_SERVER" BM1_TRACE_INDEX="$PWD/lab/bin/trace-store.mjs" \
  python3 lab/experiments/EXP-DX1/bm1/night-client.py collect-seed
BENCH_SERVER="$BENCH_SERVER" BM1_TRACE_INDEX="$PWD/lab/bin/trace-store.mjs" \
  python3 lab/experiments/EXP-DX1/bm1/night-client.py collect i27-1
```

The seed estimate is 42 min ingest, 38 min verification and 5–8 min sealing. The three-hour seed ceiling is independent of the probe budgets. The after-seed supervisor waits for stack teardown, checks the full native SCALE1 receipt and SHA-256s and reopens a separate copy per probe arm. Its admission order is ACT1 `i27` (4 h), CEIL `i18` (1 h), predecessor `i19` (1 h), pulse `i20` (75 min), GROWTH `i21` (1 h), SIZE `i22` (45 min), the READERS writer probe `i24` (45 min), RD1's new short pairs `i28` (2 h) and INT1 `i26` (4 h). Those ceilings include setup and cleanup. If the seed check fails, the independent thin rung can begin while the original is preserved. ACT1 has its own unqualified fixture and seeds its separate empty scope after the joined and settlement checks. The four reader-block scopes are separate from the restored deep scope. The three short reader pairs in RD1 `7affa420c` use fresh 10k scopes and matching zero arms. A separate 1k pair proves the real report and collector before those comparisons. Collect an item's terminal bundle by substituting the corresponding key above. See STATUS for the live owner and FREE time.

TAIL1 specifies the exact SCALE1 zero-B archive `095971d5126cf567a7db3ff15c3fc718656bf98541a66ea0b05136c4c9bd54bb`. The file is absent from this bench's two evidence roots. TAIL1 `9f8865e84` reproduced its matched analysis byte for byte in `single-n20/matched-tail-replay` from the original `overnight/i9-1` transfer. It bound 7,092 offers and receipts to the original clocks. Forty-nine of the 50 slowest post-start deep saves spent most of their time in peer wait beyond their own evaluation, and the active write gateway limits a single continuous pause within those waits to 29 ms. The transactor has only GC rollups. Exact individual pause attribution remains unresolved.

ERASE1's `stage` prepares two distinct aged cohorts with exclusive journal transactions and interleaves their edits during ingest. Its `check` binds their actual assertion IDs, nonce, source and cut. The SCALE1 pack groups unrelated people in shared frames and cannot supply that staging file. An ERASE1 run needs its own stage or a reviewed producer that can reuse this seed.
