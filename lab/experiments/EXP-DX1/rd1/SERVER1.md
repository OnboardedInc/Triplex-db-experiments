# DX-RD1 server 1 commands

Start the server comparisons after reviewing the controlled Mac mechanism result. Use the pushed `exp/DX-RD1-readers` source and the existing owned stack. Each formal comparison gets a fresh tag and its own zero arm. [Report](REPORT.md) · [Pre-run forecasts](PREDICTIONS-P2.md)

```bash
pair() {
  local tag="$1"
  shift
  DX_BARE_METAL=1 DX_NS_PROFILE=v3 DX_STUDY_LEVEL=summary \
    DX_CPUS_GW_READ=4,8 DX_CPUS_DRIVER=3,5,6,7,9,10,11 \
    DX_MAIN_CPU=3 DX_WORKER_CPUS=5,6,7,9,10,11 DX_DRIVER_MEMORY=48g \
    bash lab/experiments/EXP-DX1/t1/study.sh "tx2-dxt1-rd1p2-$tag" \
    --reader-threads 6 --reader-trace-every 64 \
    --receipt-capture replica-worker --expected-state-retention worker-journal "$@"
}
pair global --replica-history-coverage global --replica-history-mib 192
pair closure64 --replica-history-coverage closure --replica-history-mib 64
pair closure192 --replica-history-coverage closure --replica-history-mib 192
pair closure512 --replica-history-coverage closure --replica-history-mib 512
pair lane --replica-history-coverage closure --replica-history-mib 192 --replica-historical-fallback lane
pair batch --replica-history-coverage closure --replica-history-mib 192 --replica-historical-fallback batch
pair revision --replica-history-coverage closure --replica-history-mib 192 --replica-historical-fallback revision
pair install --replica-history-coverage closure --replica-history-mib 192 --replica-historical-fallback install --replica-installed-history-mib 32
```

The optional worker admits four native batches at once and retains no more than 16 logical calls per batch. Capture `client.stressHeadroom`, `historicalFallback`, `readerFinalDiagnostics` and both absolute ladder rates. Use the batch census to measure how frequently the actual record and valid clocks coincide. If the highest sustained reader, collector or fallback-worker ELU exceeds 0.70, the arm stays unjudged. Keep the offers unchanged and compare local six, remote six and remote twelve as described in the forecast. A remote relay remains a separate implementation.

For the ten-minute writer diagnostic, prepare the same two peers with `TRIPLEX_TRACE_LEVEL=full`, `TRIPLEX_TRACE_COMPONENTS=node,gateway,tx-jfr,gw-jfr`, `DX_TX_NATIVE_JFR=1`, PostgreSQL WAL timing and scheduler stats. Retain write-peer unified GC logs with wall and uptime stamps, for example `-Xlog:gc*,safepoint:stdout:time,uptimemillis,level,tags`. Use the same gateway JVM options in every block.

```bash
TRIPLEX_NODE_MAIN_CPUS=3 TRIPLEX_NODE_WORKER_CPUS=5,6,7,9,10,11 \
  timeout --signal=TERM 10m node --import tsx lab/experiments/EXP-DX1/rd1/writer-probe.ts "$OUT"
```

Provide existing `DATOMIC_URL`, `DATOMIC_READ_URLS`, `TRIPLEX_TRACE_RUN`, `TRIPLEX_TRACE_SOURCE`, `TRIPLEX_TRACE_SLOT`, `PGSERVICE`, `DX_RD1_WRITE_TRACE`, `DX_RD1_TX_PID`, and `DX_RD1_WRITE_PEER_PID`. The trace path names `gw-w.jsonl` in the fresh owned trace directory. This command seals both the native transaction recording and the write-gateway pause log. Predict approximately 89k local reads/s and 4.57 reader cores in ON blocks. A repeatable 15–25% rise in native p90 with unchanged write-gateway pause totals favors host interference. A rise concentrated in paused gateway requests points to that JVM. Native-only timing cannot attribute heap allocation.
