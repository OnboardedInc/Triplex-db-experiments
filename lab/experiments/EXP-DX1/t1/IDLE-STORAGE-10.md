# Idle-gap storage observations

SQL is a time-window correlation, with the existing 2-ms uncertainty and ambiguous intervals excluded. Execute durations exclude the later implicit commit at protocol Sync. WAL counters are aggregate over each stated sample window, including background work and asynchronous statistics publication; they are not exact transaction counts or a per-request storage partition. O_DSYNC accounts durability in WAL write time, so zero explicit sync time is not zero durable I/O.

| arm / full tracing | G ms | clean/commands | SQL execute total p50/p99 ms | statements p50 | aggregate WAL writes / write ms | average WAL write ms |
| --- | --- | --- | --- | --- | --- | --- |
| tx2-dxt1-p10-idle-b-1-plain | 25 | 148/150 | 0.176/1.155 | 2.000 | 317/77.176 | 0.243 |
| tx2-dxt1-p10-idle-b-1-plain | 1000 | 150/150 | 0.239/1.333 | 2.000 | 470/264.180 | 0.562 |
| tx2-dxt1-p10-idle-b-2-sentinel | 25 | 148/150 | 0.183/1.056 | 2.000 | 327/72.724 | 0.222 |
| tx2-dxt1-p10-idle-b-2-sentinel | 1000 | 150/150 | 0.214/1.045 | 2.000 | 466/141.077 | 0.303 |
| tx2-dxt1-p10-idle-b-3-plain | 25 | 137/150 | 0.215/1.567 | 2.000 | 348/234.951 | 0.675 |
| tx2-dxt1-p10-idle-b-3-plain | 1000 | 150/150 | 0.218/0.982 | 2.000 | 467/249.816 | 0.535 |
| tx2-dxt1-p10-idle-b-4-http | 25 | 148/150 | 0.178/2.002 | 2.000 | 273/68.895 | 0.252 |
| tx2-dxt1-p10-idle-b-4-http | 1000 | 150/150 | 0.208/0.837 | 2.000 | 464/237.750 | 0.512 |
| tx2-dxt1-p10-idle-b-5-plain | 25 | 150/150 | 0.190/0.971 | 2.000 | 360/89.237 | 0.248 |
| tx2-dxt1-p10-idle-b-5-plain | 1000 | 150/150 | 0.179/0.811 | 2.000 | 472/270.699 | 0.574 |
| tx2-dxt1-p10-idle-b-6-refused | 25 | 147/150 | 0.179/0.823 | 2.000 | 241/61.203 | 0.254 |
| tx2-dxt1-p10-idle-b-6-refused | 1000 | 150/150 | 0.208/1.018 | 2.000 | 465/244.541 | 0.526 |
| tx2-dxt1-p10-idle-b-7-plain | 25 | 150/150 | 0.164/0.960 | 2.000 | 364/96.110 | 0.264 |
| tx2-dxt1-p10-idle-b-7-plain | 1000 | 150/150 | 0.235/1.373 | 2.000 | 466/240.302 | 0.516 |
| tx2-dxt1-p10-idle-b-8-tcp | 25 | 148/150 | 0.165/0.867 | 2.000 | 250/69.427 | 0.278 |
| tx2-dxt1-p10-idle-b-8-tcp | 1000 | 150/150 | 0.175/1.659 | 2.000 | 464/244.351 | 0.527 |
| tx2-dxt1-p10-idle-b-9-plain | 25 | 150/150 | 0.186/1.015 | 2.000 | 362/96.693 | 0.267 |
| tx2-dxt1-p10-idle-b-9-plain | 1000 | 150/150 | 0.215/2.016 | 2.000 | 458/257.394 | 0.562 |

Each arm inherits the CPU/swap context and adjacent plain controls in IDLE.md; exact sample windows and counter deltas are in IDLE-STORAGE.json. The virtual versus physical disk and individual backend Sync durations remain unsplit.
