P2 still does not pass. Loaded all-primary p99 is 48.849 ms against 50; the zero-reader context is 51.130 ms against that reference.
At 256 readers, small/medium medians are 10.879/12.799 ms against 10, and small-band p99 is 103.006 ms against 50; medium burst median is 10.879 ms against 10.
P1 misses G256/G64 at .995609 against 1 and the 256-reader writer ratio at 4.164693 against 1.25; its other bars and P3 pass, as do measured P4 bars.
H uses summary tracing, swap 4.017 GiB; loaded Mac CPU median/p99 is 13.7/85.2%, zero is 15.0/96.1%; same-session off medians 9.872/9.826 ms. All 19,971,607 reads are correct; oracle PASS.

All requested menu findings reproduced. The permanent scheduler repair removes the median timer bias; every run now reports the original, ACK-only and corrected diagnostic clocks without changing the verdict.
Four-subject history growth removes its slow commits but remains a switch because it changes a frozen workload step.
Disk separation did not confirm the required threshold, so storage stays unchanged and WAL preparation was not adopted; sharing the gateway core with the transactor is also rejected.
The cold premium is in durable storage and peer/transactor wake-up/handoffs. Two alternative warm probes flatten it, but overlap; no keep-warm default is adopted.
First attempt G failed one read despite oracle PASS. Its raw failure is recoverable; H adds bounded error-cause capture, not a retry or a transport fix.

[Every original bar beside C/A/F/G/H, with both definitions and all-arm host context](VERDICT-10.md). Corrected = ACK minus scheduled offer minus observed offer lateness, retaining subject/slot waits; it also removes real GC/event-loop lateness and cannot qualify acceptance. ACK-only retains lateness. Read/feed clocks and queue counts are unchanged.

| same-session trial / level | original p50/p99 ms: control → candidate → control | swap GiB; Mac CPU medians % in that order | finding |
| --- | --- | --- | --- |
| scheduler / summary | 10.659/40.776 → 10.001/44.913 → 10.723/37.268 | 6.319/6.293/6.293; 14.3/14.3/13.5 | .690-ms median gain exceeds .064 drift; no tail gain. |
| history growth / summary | 10.927/88.526 → 10.019/45.232 → 10.403/63.753 | 4.181/4.111/4.080; 14.3/13.8/13.7 | Growth >50-ms counts 14→0→17; every depth complete and all oracles PASS; opt-in. |
| two TX cores / summary, zero | 10.810/43.523 → 10.547/37.983 → 10.871/45.378 | 4.080/4.080/4.041; 14.2/15.2/14.9 | .293-ms gain below .5 target. |
| two TX cores / summary, loaded | 11.879/46.313 → 11.738/62.244 → 12.199/58.117 | 4.080/4.048/4.033; 15.6/13.3/15.6 | Median gain within .320 drift; 1024 writer ratio 3.542 vs .797/1.862 controls; rejected. |

Timer-lateness medians .597/.002/.605 ms; actual total wait medians .650/.041/.653 ms (target <.05). H's total-wait median is .040 ms, lateness .002 ms. Scheduler/history source hashes start a new comparison series. [Scheduler](SCHEDULER-10.md), [history including costs/depth counts](HISTORY-10.md), [cores](CORES-10.md).
The disk diagnostic moved the entire driver spill/witness/trace volume to durable guest-root ext4, leaving PG on its data volume: 23 sparse slow commits versus zero-reader 12 (target ≤+3), closing control 17. Gain stayed inside drift; the disks share the physical SSD. All loaded oracles PASS. [Full same-session levels, swap/CPU and clocks](DISK-10.md).

| fixed-gap alternative / full tracing | 1-second service original/ACK p50 ms | adjacent plain controls original/ACK p50 ms | swap GiB; Mac CPU median % (candidate; controls) | gain / drift; cost |
| --- | --- | --- | --- | --- |
| disk sentinel | 9.988/9.633 | 11.716/11.364; 12.059/11.615 | 4.244; 4.244/4.205; 16.7; 16.4/15.9 | 1.899/.342 ms; 32,090 syncs, 131 MB rewritten; 1.604 s CPU inside writes/syncs, total CPU unmeasured. |
| refused serial request | 8.581/8.130 | 11.923/11.477; 11.601/11.210 | 4.205 throughout; 14.7; 16.6/15.1 | 3.181/.323 ms; 51 requests/s, worker 2.48% core, engine +9.34 points of one core. |
| gateway health | 10.744/10.310 | 12.059/11.615; 11.923/11.477 | 4.205 throughout; 15.3; 15.9/16.6 | 1.247/.135 ms; 51 requests/s, worker 2.03% core; idle premium remains. |

Each sentinel/refusal arm's 1-second versus 25-ms service differs <.5 ms. Native SQL-read medians are zero; sentinel lowers WAL-write time, refused calls shorten submit/ACK/gateway work. Backend Sync versus guest/host/SSD and individual thread wake causes remain unsplit; TCP tuning stays within drift. No combined saving or summary-level extrapolation is claimed. [Every gap/layer, proofs and costs](IDLE-10.md).

| H arm / level | original p50/p99 ms | ACK-only p50/p99 | corrected diagnostic p50/p99 | swap GiB; Mac CPU median/p99 % |
| --- | --- | --- | --- | --- |
| off-before / off | 9.872/43.999 | 9.447/43.104 | 9.232/41.822 | 4.017; 12.6/82.5 |
| zero / summary | 10.033/51.130 | 9.569/50.281 | 9.299/48.570 | 4.017; 15.0/96.1 |
| loaded / summary | 10.201/48.849 | 9.680/48.242 | 9.397/45.584 | 4.017; 13.7/85.2 |
| off-after / off | 9.826/40.533 | 9.392/39.894 | 9.175/39.618 | 4.017; 14.7/105.5 |

Off control mean 9.849/42.266 ms; p50/p99 drift .046/3.466 ms; both off medians meet 12. These 200-second controls give context, not a tracing-cost test against the 900-second pair. Cross-session C/A/F gains are not causal claims.

| H measurement | today | corrected diagnostic | unchanged threshold |
| --- | --- | --- | --- |
| L256 small median/p99 ms | 10.879/103.006 | 10.047/102.281 | ≤10/50: both miss |
| L256 medium median/p99 ms | 12.799/18.909 | 11.967/17.982 | ≤10/50: median misses |
| L256 large p99 ms; burst small/medium medians ms | 15.746; 8.831/10.879 | 14.053; 8.191/9.983 | ≤100; ≤10 each: medium burst misses today |
| P1 goodput ratios 256/64,1024/256 | .995609,1.137928 | same | ≥1,≥.9: first misses |
| P1 writer p99 ratios 256,1024 | 4.164693,.824726 | 4.211075,.776937 | ≤1.25,≤2: first misses |
| P1 recovery; P2 steady queue / burst drains | 35 s; 2 / .023,.179 s | same | ≤60 s; ≤2.19 / ≤60 s: met |
| P3; P4 whole-machine / weighted p50,p99 / depths 1,3,10 p99 | lag 22.5 ms; 18,345.834/s / .029,.212 ms / .140,.144,.143 ms | same | P3 met; P4 ≥4400, ≤5/25, flatness 1.021429≤1.1; engine bytes unknown |

H has 68 primary commits >50 ms: 46 peer wait, 13 subject wait, 5 network, 4 scheduler lateness. The 103-ms L256 outlier spends 98.982 ms in peer wait, trace `23e84b7c0e963e180000000000001eeb`; native internals are unobserved in summary. H slow counts burst/growth/sparse are 47/13/8 versus zero's 54/16/8. [Tail and remaining visibility](TAIL-10.md).
Exactness: all 7408 primary commands and 7436 durable witnesses; duplicate/lost-ACK/RYOW bars met; independent oracle 810 commands, 53 reads, 2485 queries, zero mismatches. Split rule `pending`; cache 1280 MiB, 192-MiB history, original placement, quiet logs and durable O_DSYNC retained. No layout/seed changes.
G's one ReadError and full 3.40-GB observation spill are retained in a verified 361-MB archive; first metadata refusals remain. Free space 17.38→20.21 GiB after recovery, about 19.35 GiB finally. Package tests: 318 passed, 51 external skips; no full-root/pack PASS. [Evidence/seals](EVIDENCE-10.md), [content/freshness/binding audit and unchanged pins](AUDIT-10.md).

```sh
bash lab/experiments/EXP-DX1/t1/study.sh tx2-dxt1-my-next-pair  # full pair + off bookends, heavy wrapper/lock built in
bash lab/experiments/EXP-DX1/t1/tail-session.sh history tx2-dxt1-my-history  # original / four-subject / original
bash lab/experiments/EXP-DX1/t1/idle-session.sh tx2-dxt1-my-next-pair  # full fixed-gap component controls
```
Run outputs land under `~/Claude/Projects/triplex-db-2/evidence/DX-T1/<tag>/`; offline `trace.html`, Chrome JSON, reports and compressed `trace/raw/` are automatic. Timed H source `f846bcd7`; no push. Sam still decides the ACK verdict boundary and permission for any keep-warm mechanism.
