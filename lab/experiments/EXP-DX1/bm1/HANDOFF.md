# DX-BM1 bench handoff

**North star.** The first two v3 pairs measure P1–P4; the 100k live activation measures P5. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

The bench server runs native Linux. The standalone first study is `triplex-bm1-study-a.service`. Its source is `97fa91233d2a42807aa0922e237111e08f412544` and its tag stem is `tx2-dxt1-bm1-pair-a`. The smoke ran before it from the same checkout and image set.

`triplex-bm1-queue.service` is running from pushed `5a1aa1ffc3974467eb75c7f2025f9f4181cca324`. Batch `20261118` waits for the first study, seals the closed arms, runs 10/250/1,000 ms fixed gaps, then fetches the public tracing branch and builds the chosen tip for 100k zero, 100k readers and live W0 activation. It restores the first study's source and images for the repeat. An optional WAL A/B uses the second drive only after checking it has no partitions or signatures. The delivered kernel exposes no cpuidle state controls.

| Stage | Expected elapsed | Ceiling |
| --- | ---: | ---: |
| First v3 pair including off controls and exact checks | 3½–5 h | 6 h |
| 250/1,000 ms fixed gaps and 10 ms control | 5–15 min | 30 min |
| Build public scale tip and images | 2–10 min | 1 h |
| 100k zero; then 100k readers | 45–90 min each | 2½ h each |
| 100k W0 seed, readback, live activation and verification | 1–3 h | 4 h |
| Second v3 pair | 3½–5 h | 6 h |
| Optional root/second SSD WAL A/B | 3½–4 h | About 4¼ h |

Check the server at 10-minute intervals or slower during a long arm. Set `BENCH_SERVER` to the SSH destination provided in the brief. Leave SSH agent forwarding disabled.

```sh
bench() {
  ssh -n -F /dev/null -i "${DX_BENCH_KEY:-$HOME/.ssh/triplex_bench_ed25519}" \
    -o IdentitiesOnly=yes -o ForwardAgent=no -o BatchMode=yes -o StrictHostKeyChecking=yes "$BENCH_SERVER" "$@"
}
bench 'systemctl show triplex-bm1-study-a triplex-bm1-queue -p ActiveState -p SubState -p ExecMainStatus'
bench 'tail -n 30 /var/tmp/triplex-bm1/study-a.log /var/tmp/triplex-bm1/queue.log'
bench 'find /var/tmp/triplex-bm1/queue-20261118/logs -name "*.exit" -print -exec cat {} \;'
bench 'find /var/tmp/triplex-bm1/bundles -mindepth 2 -maxdepth 2 -name TRANSFER.sha256 -printf "%h\n" | sort'
```

Collect each sealed bundle from the Mac. The script verifies the bytes before publishing the per-tag reports, raw traces when transferable, and machine facts under `$HOME/Claude/Projects/triplex-db-2/evidence/DX-BM1`.

```sh
tag=tx2-dxt1-bm1-pair-a-zero
bash lab/experiments/EXP-DX1/bm1/collect.sh "$BENCH_SERVER" "$tag"
while IFS= read -r tag; do
  bash lab/experiments/EXP-DX1/bm1/collect.sh "$BENCH_SERVER" "$tag" || break
done < <(bench 'find /var/tmp/triplex-bm1/bundles -mindepth 2 -maxdepth 2 -name TRANSFER.sha256 -printf "%h\n" | sed "s|.*/||" | sort')
```

For failed starts or a missing bundle, keep the queue logs and check the matching run directory before requesting cleanup. `raw-transfer.txt` records when a raw archive is at or over the 4 GiB transfer limit.
The queue should finish around **04:00–08:00 EST on November 19** if all items run near their estimates. Bench work has a **16:27 EST on November 19** cutoff and the 30-hour server budget ends at **17:27 EST**. Collect and verify all available bundles before the orchestrator releases the server.
