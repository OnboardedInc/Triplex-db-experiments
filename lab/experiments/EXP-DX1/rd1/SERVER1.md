# DX-RD1 server 1 diagnostics

Use the pushed `exp/DX-RD1-readers` source and the existing server 1 placement and independent oracle. Start these comparisons after reviewing the Mac mechanisms. Each pair has a 28-minute foreground limit and time for the managed launcher to clean up. Use a fresh tag and keep both arms' raw reports. [Mac results and archived decomposition](REPORT.md)

| Setting | Forecast weighted pulls/s | Forecast 1,024/256 stress ratio | Forecast recovery reads/s | Forecast writer p99 at 256/zero |
| --- | ---: | ---: | ---: | ---: |
| Global 192 MiB, direct | 3,200–3,900 | 0.38–0.52 | 16k–23k | 1.32–1.60 |
| Closure 192 MiB, direct | 3,900–5,400 | 0.45–0.65 | 22k–34k | 1.30–1.58 |
| Closure 192 MiB and isolated install | 4,100–5,900 | 0.52–0.80 | 28k–42k | 1.28–1.58 |

These forecasts apply to a scope aged like p3r. The combined arm assumes fewer obsolete-cut exchanges and less foreground observation work. A single weighted reader still waits for every issued exchange and its IPC. Moving from the archived 3,490/s to 4,400/s requires removing about 59 microseconds from its average complete read cycle. The writer estimates allow for shared CPU and storage pressure. Read fallback traffic goes to a separate JVM, so direct savings in the writer JVM's allocation remain unmeasured. The four bars are 4,400/s, 0.90, 41,392/s and 1.25. [Pre-Part-3 forecasts](PREDICTIONS-P2.md)

The Mac fixture with 5% old cuts held 12% of the direct zero-miss rate. The isolated install arm held 92% of its own zero-miss rate and fell back on 0.037% of completed reads. It reused two old cuts over 24 roots. The forecasts above retain the aged-scope assumptions. [Mac curve and history data](REPORT.md)

```bash
short_pair() {
  local tag="$1"
  shift
  DX_BARE_METAL=1 DX_NS_PROFILE=smoke DX_MATCH_DURATION_S=115 DX_R3_TRY_LOCK=1 \
    TRIPLEX_TRACE_LEVEL=summary DX_CPUS_GW_READ=4,8 DX_CPUS_DRIVER=3,5,6,7,9,10,11 \
    DX_MAIN_CPU=3 DX_WORKER_CPUS=5,6,7,9,10,11 DX_DRIVER_MEMORY=48g \
    timeout --signal=TERM 28m bash lab/experiments/EXP-DX1/t1/run.sh pair "tx2-dxt1-rd1p3-$tag" \
    --rung 10k --seed-budget-s 360 --reader-ladder-only --rolling-read-smoke --rd1-read-diagnostic \
    --level-s 20 --reader-threads 6 --reader-trace-every 64 \
    --receipt-capture replica-worker --expected-state-retention worker-journal "$@"
}
short_pair "$TAG-global" --replica-history-coverage global --replica-history-mib 192
short_pair "$TAG-closure" --replica-history-coverage closure --replica-history-mib 192
short_pair "$TAG-install" --replica-history-coverage closure --replica-history-mib 192 \
  --replica-historical-fallback install --replica-installed-history-mib 32
```

Each pair has a fresh zero and loaded arm, each with 115 seconds of the same offer schedule and a six-minute seed budget. The short phases are baseline, 256, 1,024, recovery and the single-seat weighted mix, after 15 seconds of initial traffic. They measure the mechanism on a young scope before the first scheduled burst. The full profile remains required for the four bars. Capture the two ladder rates, `p4mix`, recovery, `client.stressHeadroom`, `historicalFallback`, and per-role time between native response and Node callbacks. A role above 0.70 leaves performance unjudged. First measure remote six on the identical workload, then remote twelve if the saturated roles are the reader or verifier. A remote relay remains outside this branch.

For the writer diagnostic use the same prepared peers with `TRIPLEX_TRACE_LEVEL=full`, `TRIPLEX_TRACE_COMPONENTS=node,gateway,tx-jfr,gw-jfr`, `DX_TX_NATIVE_JFR=1`, PostgreSQL WAL timing and scheduler stats. Keep the write-peer unified GC log with wall and uptime stamps. Use the same JVM options in each block.

```bash
TRIPLEX_NODE_MAIN_CPUS=3 TRIPLEX_NODE_WORKER_CPUS=5,6,7,9,10,11 \
  timeout --signal=TERM 10m node --import tsx lab/experiments/EXP-DX1/rd1/writer-probe.ts "$OUT"
```

The writer probe needs the prepared `DATOMIC_URL`, `DATOMIC_READ_URLS`, `TRIPLEX_TRACE_RUN`, `TRIPLEX_TRACE_SOURCE`, `TRIPLEX_TRACE_SLOT`, `PGSERVICE`, `DX_RD1_WRITE_TRACE`, `DX_RD1_TX_PID`, and `DX_RD1_WRITE_PEER_PID`. `DX_RD1_WRITE_TRACE` names the fresh `gw-w.jsonl`. Look for a repeatable native p90 change and whether new commit-tail time overlaps a write-gateway pause. The allocation volume remains unmeasured.
