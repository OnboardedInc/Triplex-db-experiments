# Full-size cache, cores and WAL follow-up

Forecast 38–42 minutes on the built source, with a 45-minute native cap (USD 0.82). Each of the three arms reopens the same stopped cut independently. Each arm uses 90-second matched quiet windows at 394 and 620 offered saves/s, with 315 quiet saves per window, 1,900 people per busy neighbour and six-credit fair turns. PostgreSQL keeps all durability settings on. [Producer forecasts and mechanism](https://github.com/OnboardedInc/Triplex-db-experiments/blob/1d0e2f5663dbb75c192efdb97621348da69c8bc8/lab/experiments/EXP-DX1/prep1/FULL-SIZE-READING.md)

| Transactor | Offered/s | Forecast delivered/s | Forecast quiet solo / loaded p99, ms | Forecast quiet ratio | Forecast reads/save solo / loaded |
| --- | ---: | ---: | --- | ---: | --- |
| 1 core, 2 GiB cache, G1 | 394 | 277 | 135 / 189 | 1.40× | 2.50 / 1.55 |
| 1 core, 2 GiB cache, G1 | 620 | 273 | 155 / 217 | 1.40× | 2.50 / 1.55 |
| 3 cores, 16 GiB cache, G1 | 394 | 365 | 91 / 137 | 1.50× | 1.50 / 0.45 |
| 3 cores, 16 GiB cache, G1 | 620 | 405 | 100 / 150 | 1.50× | 1.50 / 0.58 |
| 3 cores, 16 GiB cache, dedicated WAL, ZGC | 394 | 394 | 21 / 28 | 1.32× | 1.50 / 0.45 |
| 3 cores, 16 GiB cache, dedicated WAL, ZGC | 620 | 440 | 20 / 34 | 1.68× | 1.50 / 0.58 |

Every solo window forecasts 3.5 saves/s. The 394/s combined arm needs all 35,460 durable saves after drain with zero expiry. The workload checks and measurement logic come from `6abc19f66b0bbe59f3dbc57767ca6dc7456c8d4e`. Actual source `8879abb2c2cf66a66d2cb273cf6c4c704cf41172` changes only the expected NVMe numbering in setup, cleanup, stack and collector. We read the real root and secondary ext4 mounts and keep them distinct. This host uses the reverse enumeration from the pinned launcher. Shell syntax and Python compilation passed. The tree diff from the producer is five removals and five additions across three files.
