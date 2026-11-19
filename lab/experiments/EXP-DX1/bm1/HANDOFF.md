# DX-BM1 bench handoff, November 19

**North star.** DX-ACT1 measures durable guards for 100k W0 subjects with 256 live readers. The published P5 target specifies 64. P1–P4 use one full v3 pair and both tracing-off controls. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

The three sender arms completed and their bundles and checksummed COMPARISON.md are on the Mac under evidence/DX-BM1. The new sender measured 41.705 ms all-primary p99 with 38,826 correct receipt reads. The older 73.78 s activation omitted durable guards. Its retained seed supplies fresh, verified private clones for the corrected experiment.

Batch p3 launched at 13:03 EST at f37731a7. Native schedules passed 13/13. The narrow-full run verified all 100,000 seed worlds, then R1 refused an invalid later world for subject 6011. Baseline and sweep had written the same answer references at 4,341,356 and 4,344,665. The second private clone independently reproduced those duplicate facts. Its stage was stopped at 13:46 and cleaned. The standard release was deferred with the narrow comparison. A verified pristine seed is required.

The original pair was refused before any offers because the VM-only CPU check rejected core 8. The fresh pair retry batch p3r uses the current Linux CPU affinity, the new sender, six reader cores and a five-hour ceiling. Guarded activation follows DX-SCALE1 item 1. The terminal FREE line with its UTC time transfers the bench to DX-SCALE1.

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
