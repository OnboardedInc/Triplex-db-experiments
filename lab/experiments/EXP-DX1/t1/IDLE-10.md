The quiet-gap premium has two measured contributors: durable WAL write time in the storage path, and wake-up/handoff time around the peer/transactor. The disk sentinel flattens the first; rejected serial requests also shorten send/ACK and gateway work. TCP slow-start tuning has no gain beyond drift. No keep-warm behavior is adopted.

Timed source `a0785bcf`; full tracing with identical Node/gateway/JFR/PG collectors, exact local path and strict server clocks; current durable layout. Each arm has 200 warm-up commands and 150 ten-fact commands at each G=10/25/50/100/250/500/1000 ms. No crash injection or north-star verdict is claimed for this different diagnostic trace. All 11,250 model reads are correct; the external oracle is explicitly NOT-RUN at zero readers. Adjacent plain controls bracket each candidate. Service is actual start to finish; ACK service stops at the existing ACK stamp. The authoritative verdict remains scheduled offer to finish.

| arm | 25-ms service original/ACK p50 | 1000-ms service original/ACK p50 | 1000-ms service original/ACK p99 | swap GiB | Mac non-VM CPU p50/p99 % |
| --- | --- | --- | --- | --- | --- |
| 1-plain | 10.069/9.754 | 11.716/11.364 | 20.363/20.044 | 4.244 | 16.400/94.200 |
| 2-sentinel | 9.869/9.412 | 9.988/9.633 | 24.613/24.221 | 4.244 | 16.700/106.000 |
| 3-plain | 12.417/12.064 | 12.059/11.615 | 20.520/20.208 | 4.205 | 15.900/181.000 |
| 4-http | 9.325/8.962 | 10.744/10.310 | 17.131/16.791 | 4.205 | 15.300/94.400 |
| 5-plain | 9.557/9.250 | 11.923/11.477 | 18.502/18.147 | 4.205 | 16.600/81.200 |
| 6-refused | 8.338/7.825 | 8.581/8.130 | 17.941/17.608 | 4.205 | 14.700/85.000 |
| 7-plain | 9.498/9.064 | 11.601/11.210 | 19.888/19.438 | 4.205 | 15.100/72.800 |
| 8-tcp | 10.209/9.791 | 11.505/11.076 | 20.360/20.038 | 4.205 | 16.200/103.600 |
| 9-plain | 9.589/9.205 | 13.041/12.566 | 32.619/30.978 | 4.205 | 15.700/78.800 |

| candidate | 1000-ms service p50 gain vs adjacent controls / drift, original; ACK | deciding observation and cost |
| --- | --- | --- |
| sentinel | 1.899 / 0.342 ms; 1.856 / 0.251 ms | 1-second versus 25-ms service differs 0.119 ms (target 0.5); 32,090 syncs, 131.44 MB rewritten during the primary window, 1.604 s CPU inside writes/syncs alone (total sentinel CPU unmeasured). |
| http | 1.247 / 0.135 ms; 1.236 / 0.138 ms | Still 1.419 ms of idle premium. 51.13 requests/s; worker runtime 6.599 s / 324.750 s = 2.03% of one core; no engine CPU increase beyond drift. |
| refused | 3.181 / 0.323 ms; 3.213 / 0.267 ms | Idle premium 0.243 ms (target 0.5); 16,572 checked CasConflict responses, 51.01/s. Worker 8.045 s / 324.889 s = 2.48% of one core; engine CPU 22.47% vs 12.90/13.36% controls (9.34 percentage points of one core above the mean; 0.46-point drift). |
| tcp | 0.816 / 1.440 ms; 0.812 / 1.356 ms | Gain stays inside 1.441-ms original / 1.356-ms ACK drift; not adopted. All owned endpoint sysctls read back zero; global VM setting unchanged. |

At 1-second gaps the sentinel changes peer wait from 6.845/6.398 to 5.115 ms and native process time from 4.320/3.930 to 3.000 ms. Apply remains near 1.1–1.3 ms; every gap has complete native SQL-read counters and median SQL reads/time zero, so cold reads do not set this median. Aggregate WAL write duration falls from .562/.535 to .303 ms per write, while logged Execute totals remain about .2 ms and omit the later implicit commit at protocol Sync. This identifies a durable storage-path component; backend Sync versus guest/Virtualization/APFS/physical device is still unsplit.

The rejected-request arm keeps WAL write cost .526 ms (controls .574/.516) but cuts submit-to-native residual from 1.296/1.207 to .482 ms, ACK residual .998/1.031 to .667 ms, and gateway-before-peer .905/1.110 to .493 ms. Native process time also falls to 3.260 from 4.110/3.890 ms. These are exact native database/t joins, with residual logging/rounding uncertainty; they do not identify which individual messaging thread waited for a core. Guest nohlt does not prove an Apple hardware power/frequency state. Node before/after-transact scopes change by only hundredths of a millisecond across these gaps; per-scope Linux CPU counters are quantized, so zero is not zero executed work.

Plain arm 3 has an unstable early 25-ms group (12.417-ms service), so a universal monotonic curve is not claimed. Other plain 1-second premiums are 1.647–3.452 ms. Candidate decisions above compare the same 1-second population against adjacent controls and explicitly retain their drift. Full PG samplers themselves create read-side activity; extrapolation to summary or off is unverified. The sentinel and refused-request effects overlap and cannot be added as an unmeasured combined saving.

Five median-near 1-second examples (one per plain arm):
- `590490e5f639f2460000000000000b18` (tx2-dxt1-p10-idle-b-1-plain): service 11.716, peer 6.160, native 3.670 ms; full/host/control context is the row above.
- `d2ee3dc5e15272df0000000000000bb6` (tx2-dxt1-p10-idle-b-3-plain): service 12.059, peer 6.635, native 4.680 ms; full/host/control context is the row above.
- `c57f7c4a0083103b0000000000000be4` (tx2-dxt1-p10-idle-b-5-plain): service 11.923, peer 7.755, native 4.440 ms; full/host/control context is the row above.
- `897a45717404390c0000000000000a2d` (tx2-dxt1-p10-idle-b-7-plain): service 11.601, peer 6.838, native 4.560 ms; full/host/control context is the row above.
- `7f5c171c0c2d73c70000000000000ac3` (tx2-dxt1-p10-idle-b-9-plain): service 13.041, peer 8.391, native 5.860 ms; full/host/control context is the row above.

[All gap/layer tables](IDLE-LAYERS-10.md), [sealed SQL/WAL correlations](IDLE-STORAGE-10.md). Private `tx2-dxt1-p10-idle-b-session/audited/` retains the complete row dataset, reporter hashes and byte seals. The first unmodified render is retained beside `audited/`; this second render additionally checks every warm-call clock, proof content/source and seals its log. No observed values changed; no missing native SQL counter is replaced by zero. [Audit](AUDIT-10.md).
