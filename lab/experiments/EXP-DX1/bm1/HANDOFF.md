# DX-BM1 bench handoff, November 19

**North star.** DX-ACT1 measures durable guards for 100k W0 subjects with 256 live readers. The published P5 target specifies 64. P1–P4 use one full v3 pair and both tracing-off controls. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

The three sender arms completed and their bundles and checksummed COMPARISON.md are on the Mac under evidence/DX-BM1. The new sender measured 41.705 ms all-primary p99 with 38,826 correct receipt reads. The older 73.78 s activation omitted durable guards. Its historical seed cut is valid. Later writes make its current head unsuitable for a fresh guarded activation.

Batch p3 launched at 13:03 EST at f37731a7. Native schedules passed 13/13. The narrow-full run verified all 100,000 seed worlds, then R1 refused an invalid later world for subject 6011. Baseline and sweep had written the same answer references at 4,341,356 and 4,344,665. The second private clone independently reproduced those duplicate facts. Its stage was stopped at 13:46 and cleaned. The standard release was deferred with the narrow comparison. O-DOMAIN independently accepted the seed and reproduced W0.E_CARDINALITY at the live head from the captured gateway responses. `bm1/replay-cardinality.py` reproduces both readings from `subject-6011-basis-wire.json` under evidence/DX-BM1/drv1a/guarded-schedules. A fresh 100k seed takes about 3¼ hours including readback, followed by about three hours for the guarded series.

**The bench was released at 18:48:15 EST on November 19 (`FREE 2026-11-19T23:48:15Z`).** The named pair’s teardown found zero owned containers and networks. Both tracing-off bookends returned 0. All seven sealed `p3r` bundles are on the Mac. The separate guarded activation trigger entered its waiting state five seconds after handoff.

The first pair attempt refused physical core 8 before any offers. Batch `p3r` ran from 13:53:48 to 18:48:15 EST on `11cb89fe0d5a7ddd74d0dbeee53313425ab34a6e`. Each arm submitted and checked all 38,826 primary receipts. The loaded driver reached DONE, matched 143,900,955 model observations and finished independent replay in 34m33s. At 18:42:10 the operator stopped its post-run viewer after securing the raw checksums and native oracle output, leaving time for the normal closing bookend. The original pair controller therefore records exit 1. Reproduction of its bars and both 90% intervals uses the captured same-session inputs. Six saturated reader workers make performance ineligible. [Per-bar readings](REPORT.md)

On the Mac, `evidence/DX-BM1/drv1a/p3r-handoff-confirmation.log` records the FREE line, empty inventories, control exits and deferred state. The original bundles are under `evidence/DX-BM1/tx2-dxt1-bm1-p3r-*`. The separate viewer is rebuilding from the loaded arm’s original raw manifest in `evidence/DX-BM1/drv1a/offline-render/tx2-dxt1-bm1-p3r-pair-ladder/`. Its log is one directory above it. The original loaded bundle retains `BM1-RENDER-INTERRUPTION.json`.

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

The deferred job is `g19r`, pinned to `c0ee7dc9f0b3198f28e0103eb2a5dfb692a2ce15`. The installer observed the terminal day archive, checked out the pinned public source, and registered the server trigger. At 18:48:20 EST the trigger was active and waiting for the handback after SCALE1 item 1. SCALE1 runs on its own allocation at present. The first reader produced zero complete scope reports. SCALE1 restarted item 1 on the matched B pair, whose zero tag is `arm-d19-i1-zero-b`. The Mac relay watches the B-pair evidence locally through 01:30 EST November 20. Once both transfers are complete and BM1 is FREE, it signals the waiting server service by SSH. It checks the two archive hashes, attempt and terminal bytes, nonces, source, baseline tag, end times and cleanups. Only the tags and terminal digests cross the connection. The manual release below can recover an expired relay.

```sh
bench 'systemctl show triplex-bm1-g19r-install-b.path triplex-bm1-g19r-install-b.service -p ActiveState -p SubState -p Result'
bench 'sudo -n cat /var/tmp/triplex-bm1/deferred-g19r/STATUS'
launchctl print "gui/$(id -u)/org.triplex.dx-bm1.g19r-relay" | rg "state =|last exit code"
bench 'systemctl status --no-pager triplex-bm1-g19r-after-scale1.path'
bash lab/experiments/EXP-DX1/bm1/deferred.sh --release g19r "$BENCH_SERVER" arm-d19-i1-zero-b arm-d19-i1-reader-b
bench 'sudo -n tail -n 12 /var/tmp/triplex-bm1/day-g19r/logs/queue.log'
```

The deferred seed has a four-hour ceiling. It stops before any release or live traffic, proves the fresh writable head and all 100,000 worlds, then seals a cold PostgreSQL copy. Each activation restores every file into a new private volume, checks its seed digest, and runs native schedules and complete readback. The three arms share a further three-hour ceiling. Allow 7 h 45 min from release including setup and archival. A failed prerequisite skips its dependants and releases the clean bench. Use the collection command above with the tags for `g19r` and its three request slots. `DX_BM1_COMPACT=1` keeps the raw traces compressed on the Mac and extracts the Linux telemetry needed to replay the study. Both 10k driver reports are directly readable. The canonical loaded raw bundle and the separate viewer use the locations above.

The Mac collector follows the relay automatically. Every 11 minutes after handback it inventories only this batch’s sealed archives and requested activation slots, pulls new bundles, checks their hashes and updates the evidence index. Its receipt is `evidence/DX-BM1/collection-g19r.json`. It names missing terminal archives and ends at most nine hours after the handback signal. If no release arrived by 01:40 EST, it exits with the server trigger still available. The manual collection commands above work independently.
