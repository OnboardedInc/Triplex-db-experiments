# DX-BM1 bench handoff, November 19

**North star.** P5 uses a fresh 100k W0 run under 64 live readers. P1–P4 use one full v3 pair and both tracing-off controls. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

The overnight 100k reader and its failed replay are collected. The old W0 run finished its live measurement and independent outbox comparisons and timed out before producing its terminal envelope. Its source volume and the prior attempt remain available. The day run reads that volume through a fresh private clone, rechecks the seed fingerprint at position 4,338,757, and uses a new publication namespace. [Report](REPORT.md)

At the last prelaunch check, `triplex-drv1-wait.service` was active and had started its second arm at 09:15 EST. It owns the bench until it exits and the daemon has no running containers. The day batch is `d19`, with controller `triplex-bm1-d19-queue.service` and cleanup hooks for each separate child cgroup. The controller retries a failed stop hook once the unit has drained. An interrupted pair restores the captured scheduler setting and can retain compact driver evidence in `driver-at-stop/`.

| Stage | Expected elapsed | Ceiling |
| --- | ---: | ---: |
| Prepare pushed revision using verified bench caches | 5–25 min | 35 min |
| 1k W0 live smoke | 4–12 min | 25 min |
| 100k retained-seed clone, readback, live activation and history verification | 45–100 min | 2 h total, including any retry |
| One full 10k v3 pair, bookends, streamed reports and independent replay | 3½–4½ h | 4 h 50 min, subject to the end of the window |

The working cutoff is **20:00 EST November 19** (01:00 UTC November 20). The controller reserves the last 15 minutes for final packaging. The terminal queue line gives its actual finish time. Release the bench after all available bundles have passed their Mac transfer checks and the stop hooks show empty inventories. The earlier cutoff estimate belonged to the overnight run.

Set `BENCH_SERVER` to the SSH destination in the brief. Poll every 10 to 15 minutes while timing is active.

```sh
bench() {
  ssh -n -F /dev/null -i "${DX_BENCH_KEY:-$HOME/.ssh/triplex_bench_ed25519}" \
    -o IdentitiesOnly=yes -o ForwardAgent=no -o BatchMode=yes \
    -o StrictHostKeyChecking=yes "$BENCH_SERVER" "$@"
}
bench 'sudo -n cat /var/tmp/triplex-bm1/STATUS'
bench 'systemctl show triplex-drv1-wait triplex-bm1-d19-queue -p ActiveState -p Result -p ExecMainStatus'
bench 'sudo -n tail -n 24 /var/tmp/triplex-bm1/day-d19/logs/queue.log'
bench 'sudo -n find /var/tmp/triplex-bm1/day-d19/logs -name "*.exit" -o -name "remaining.txt"'
bench 'sudo -n find /var/tmp/triplex-bm1/day-d19/checkout/state/evidence/DX-T1 -maxdepth 2 -name activation.log -exec tail -c 1200 {} \;'
```

Collect published bundles from the Mac. The script validates the transfer manifest and actual bytes before indexing the evidence. Partial failures and their cleanup logs are retained. `raw-transfer.txt` gives the size and hash when a raw archive exceeds the 4 GiB transfer policy.

```sh
while IFS= read -r tag; do
  bash lab/experiments/EXP-DX1/bm1/collect.sh "$BENCH_SERVER" "$tag" || \
    printf 'Collection failed for %s\n' "$tag" >&2
done < <(bench 'sudo -n find /var/tmp/triplex-bm1/bundles -mindepth 2 -maxdepth 2 -name TRANSFER.sha256 -printf "%h\n" | sed "s|.*/||" | grep "^tx2-dxt1-bm1-d19-" | sort')
```

A terminal failure with missing bundles or a nonempty `remaining.txt` requires checking its corresponding `logs/<item>-cleanup/cleanup.log` and run output before release. The retained November 18 seed volume belongs to its original attempt and is outside the scoped day teardown.
