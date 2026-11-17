The 100,000-subject reading did not finish: seeding and bootstrap completed, then guest-wide memory exhaustion killed the driver during sweep.
It seeded 3,848,930 assertions in 1,561.517 seconds and retained 6,178 closed primary acknowledgements; the missing tail is unknown.
The same-source 10,000-subject neighbour finished: 8,529 offers, 8,529 acknowledgements, zero expired, and 7,408 exact all-ACK model reads.
The database table grew 11.325× and seeding took 10.852×; per-commit native datom p50/p99 stayed 47/123 in the initial phase.
The first blocker is the driver's retained population/replica/model memory: its cgroup peaked at 7.841 GiB while guest available memory fell to 78.805 MiB.
The second is cold serial-point storage work; the third is follower recovery, whose scope reopen returned HTTP 503 after repeated peer sync waits.
These are busy-host diagnostics, with no performance verdict or population-only latency claim; the host deteriorated between arms.
The current 16-GiB admission is now refused; an inferred 18-GiB resident allowance is conservative planning, not a demonstrated fit. No VM resize was attempted.
Fresh 1k clone and fresh-seed activation proofs passed all independent content comparisons; the final smoke closed all seven trace shards cleanly. A 100k activation is still unproved.
Night scripts and v3 are unchanged. All owned containers, volumes, networks and the lease are gone; 101.8 GiB is free, above tonight's 47-GiB reservation.

| Same-session context / complete seed | 10,000 neighbour D | 100,000 reading D |
| --- | ---: | ---: |
| Tracing; source | full; `c165501b` | full; `c165501b` |
| Busy-host swap GiB p50/p99 | 19.100/21.336 | 15.725/18.251 |
| Mac non-VM CPU gauge p50/p99, % of a core | 245.8/701.1 | 133.9/631.0 |
| Seed assertions; seconds; assertions/s | 384,785; 143.897; 2,674.030 | 3,848,930; 1,561.517; 2,464.866 |
| Closed primary ACKs / native matches | 7,408/7,408 | 6,178/6,169; censored |
| Initial phase ACK count; busy-host p50/p99 ms | 49; 32.489/1,579.848 | 49; 46.498/375.016 |
| Initial native apply p50/p99 ms | 8.520/296.000 | 18.500/98.400 |
| Initial serial SQL reads/commit; commits with SQL reads | 1.408; 23/49 | 3.265; 36/49 |
| Initial ACK-clipped TS own / queue / peer-wait p50 ms | 6.659/0.141/20.534 | 8.605/0.119/29.114 |
| Initial ACK-clipped network / gateway own p50 ms | 1.325/2.357 | 0.995/1.767 |
| Initial TypeScript share; unexplained p50 ms | 22.124%; 0.050 | 22.029%; 0.047 |
| Native object-cache hits/requests, including setup | 2,999,685/3,011,487 (99.608%) | 25,272,817/25,318,045 (99.821%) |
| Observed completed index adoptions | 12 | 43 |
| Pre-offer table bytes | 104,456,192 | 1,182,941,184 |
| Driver cgroup peak / limit GiB | 3.632/8 | 7.841/8 |

Population ratios: assertion count 10.003×, seed time 10.852×, pre-offer table 11.325×, observed driver peak 2.159×; initial per-commit datom quantiles remain 47/123.
CPU is the captured process-lifetime `ps` gauge, not an interval measurement; analysis ran during the neighbour as allowed. Both arms have **zero logical readers**, including phase names L256/L1024. Quantiles do not add; native apply is inside peer wait. The initial phase is an observed 49-ACK diagnostic, not a judged bar.
Full per-phase ACK/finish/layer/SQL/datom tables, callback bytes/cache rates, adoption windows, all cache snapshots and memory limits are in [READING-14.md](READING-14.md); [EVIDENCE-14.md](EVIDENCE-14.md) indexes and seals every attempt, including failures.
PG aggregate commits/native transaction is 10.309 in the neighbour's 60.749s initial bracket, including samplers/heartbeat/indexing; the 100k initial bracket is stale and remains unknown. Exact per-transaction WAL syncs and physical bytes remain unsplit. Native callback transaction-byte histograms are reported by phase, separately from datom counts.
The 100k driver died at guest-global OOM, not its local cap; the kernel record matches its exact container and boot ID. Last closed primary ACK is T+786.401s of 900s. Final offer/expiry counts, complete replica geometry/lag, post-run attribute census and final model/oracle checks are unavailable. The complete zero-reader neighbour's independent replay oracle is NOT-RUN by policy. No 100k reader arm ran because memory admission failed.

| First blockers / readiness | Required next step |
| --- | --- |
| P2/P5 population memory | Reduce retained writer/model/replica duplicates, then repeat admission; merely raising the driver's cap cannot fix guest-global OOM. 18 GiB is an inferred reserve, not permission to resize. |
| P2 serial cold reads / working set | Measure transactor cache/index settings with actual RAM headroom; initial native apply rose from 8.520 to 18.500 ms on this busy-host comparison. No warmer. |
| P3/P5 follower catch-up | Trace `4ebdb8027cc0c87000000000000004aa`, client thread 5: `/v1/db/create` HTTP 503, matching gateway request 4,233.414 ms with 4,148.864 ms in three peer syncs. Repair repeated scope metadata/catch-up work; do not mask it with a timeout alone. |
| W0 activation port | S5 seeding/recovery/activation uses current stack, immutable clone checks, original Python oracle, full journal fold and durable published-state readback. Proven at 1k for clone and fresh seed; current 100k activation admission requires ≥23 GiB usable guest memory and refuses today's guest. |

All 1,000 worlds, 1,000 independent oracle outputs and 1,000 durable published states matched in both native W0 proofs, with input/published positions 42,775→42,786. Final seed-D source is `14f5297e`; earlier recorder collisions and incomplete drains are retained separately. [CHECKS-14.md](CHECKS-14.md) records 382 package tests, focused regressions and explicit skipped/untested suites; [AUDIT-14.md](AUDIT-14.md) lists every content/freshness/binding boundary. No changed path appears in the acceptance pins; the contract is unchanged.
[F/H's 51-row historical table](STEADINESS-14.md) is retained: F 33 ACKs >100ms plus two writer episodes, H 15 plus one; 35/0 guest clock steps and zero observed whole-arm swap-out increase. Missing host/guest clock bridge and writer identities prevent exact Mac-writer attribution.
[bare-metal.sh](bare-metal.sh) plans a named-public-commit Ubuntu 24.04 native build, self-seeded 1k smoke/10k v3 study, fixed gaps and a checksummed report archive. Shell/platform/planning checks passed; physical-server installation, native architecture builds and end-to-end execution remain untested.
Raw traces remain compressed privately. Three W0 traces shrank 324.795 MB→18.163 MB with exact decompressed hashes; the interrupted core was preserved as 740.758 MB with the original SHA256. Cleanup and compression receipts are indexed; nothing was uploaded.

```sh
# Plans refuse the disproven 16-GiB 100k fit; no timed run is started.
bash lab/experiments/EXP-DX1/t1/first-100k.sh --plan tx2-dxt1-next-reading
bash lab/experiments/EXP-DX1/t1/activation.sh --plan tx2-dxt1-next-w0 1000 seed no-live
node lab/trace/scale-forensics.mjs "$EVIDENCE_ROOT/DX-T1/tx2-dxt1-p14-scale-d-100000" NEW_JSON
bash lab/experiments/EXP-DX1/t1/bare-metal.sh --plan PUBLIC_FULL_40_HEX_COMMIT
# Execute only in an admitted session with an explicit timezone cleanup deadline; see each script.
```
