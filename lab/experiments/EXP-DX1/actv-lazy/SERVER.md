# One deep account on bare metal

The owner counts the durable release and exact notice recipe as stored. The stored point and the first correct connected answer must both arrive inside one second. Concrete values and individual notice entries are recorded in the background. Use the integration candidate in [the report](REPORT.md) and preserve the historical staged windows for comparison.

| 100,000 deep people | Quiet | 3.5 saves/s | 23.5 saves/s |
| --- | --- | --- | --- |
| Earlier FIFO receipt / first exact read | 46 / 56 ms | 53 / 63 ms | 2,043 / 2,051 ms |
| Earlier staged values / first exact read | 13.019 / 13.026 s | 14.118 / 14.134 s | 18.616 / 18.625 s |
| Forecast with Publish priority, receipt / first exact read | 40–100 / 50–150 ms | 50–150 / 60–200 ms | 70–300 / 80–350 ms |

These are forecasts for the offered release under the old 100,000-person server workload. The busy FIFO receipt spent 2.020 s behind 50 saves and took 24 ms after entering. Priority passes waiting saves in the same account. An in-flight save and native contention still contribute to the clock. ACT2's model projects about 140 ms p99 at the peak rate if saves sustain the offered load. The campaign supplies three single offers. It cannot establish a Publish p99. [Earlier clocks and evidence](PART8.md#server-observations-at-100000-people)

Use a clean checkout with built packages and a managed exclusive Datomic writer with live priority enabled. Supply its owner file as `TRIPLEX_LAB_SLOT_OWNER`, endpoint as `DATOMIC_URL`, and configuration root as `TX2_CONFIG_DIR`. Set `TX2_WRITE_OPTIONS_ATTEMPT` to the exact nonce configured in the actual gateway. The runner verifies the loaded queue policy and commit function through the gateway. Use a new empty directory for `DX_LAZY_OUT`, with a four-hour work budget plus supervisor cleanup time. The last verified cold seed took about 112 minutes.

```sh
TX2_SWEEP_STRICT=1 TX2_W0_POINT_JOURNAL=1 TX2_W0_RESTORE_INDEXED_JOURNAL=1 TRIPLEX_DATOMIC_LAYOUT=lean node lab/bin/heavy.mjs --label DX-ACT1 -- node --experimental-strip-types lab/experiments/EXP-DX1/actv-lazy/join/server.ts 100000 "$DX_LAZY_OUT" --receipt
```

The command runs the gate for both same-person save orders and three external races, then runs the bound 1,000-person producer and collector before creating the large fixture. It records every scheduled offer, the native acknowledgement, one connected first response and three distinct, cold deadline reads. It counts late sample starts as misses and also records the live save backlog. It replays the ordered receiver stream after the windows. The optional `--settlement` flag still produces the old six receipt and staged windows plus the separate background experiment. The independent full fixed-trace interference gate and scorecard's common database remain separate.

## Background recording

Use a separate managed slot and volume with the holder `DX-ACT1` and set `TX2_EXCLUSIVE_VOLUME_ID` to its exact suffix. Supply a new empty output directory. Keep the same gateway queue options and the recipient offline. Run the typed bulk-limit and restart preflight followed by matched 180-second control and settlement windows at both rates. Use 64 readers in the publishing scope and a matched neighbour with one reader and 3.5 saves/s. The recorder retains all offered and acknowledged clocks and tests both archives and every sampled read against the independent oracle. Report both terminal clocks and the denominators for the p99 ratios during the overlap with unsettled work.

```sh
DX_ACT1_NATIVE=1 TX2_SWEEP_STRICT=1 TX2_W0_POINT_JOURNAL=1 TX2_W0_RESTORE_INDEXED_JOURNAL=1 TRIPLEX_DATOMIC_LAYOUT=lean node lab/bin/heavy.mjs --label DX-ACT1 -- node --experimental-strip-types lab/experiments/EXP-DX1/actv-lazy/local.ts --joined-settle-server 100000
```

The value archive uses up to 6,250 16-person turns at 100,000 people. The notice archive uses four-person turns over its candidate roster. At the observed Mac per-person cost, the estimates are 36 minutes to values and 42 minutes to notices at 100,000, and six and seven hours at one million. With an assumed bare-metal 30–80 ms per turn under sustainable load, the server forecast is about 6–17 minutes to values and 9–23 minutes to both endpoints at 100,000. The gaps between these estimates reflect different observed load and assumed service costs. The matched run supplies both native endpoint clocks and live p99 ratios. A quiet fixture restart and full verification can extend runtime past those endpoints.

For a wider or deeper roster, the receipt still writes four fact changes and visits no subjects. The first read can still depend on index residency. Million-person and 4.5-million-person timings remain open. Both commands use the existing experiment's logical scopes. The v0.1 scorecard still needs the common physical database at the fresh and one-billion-record ages. Use the scorecard runner for that qualification.
