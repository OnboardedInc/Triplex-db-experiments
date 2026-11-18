Tonight's runner can wait out a transient host refusal and keeps every arm that finishes.
It settles for 60 seconds, then retries each minute for up to 20 minutes. A sustained refusal or exhausted time can still stop the ladder.
The saved first CPU spike has no process breakdown. Tonight's checks record the ten busiest non-VM process names.
The rebuilt November 17 report preserves all three completed arms and the refusal. The 25% ceiling, frozen trace and v3 profile stay in force.
The zero arm's 109.129 ms ACK p99 misses 50 ms. Writer queueing dominates the slow commits in the later v3 bursts.
Its matching first 900 seconds scored 42.084 ms. The steady and leading-edge outliers spent most of their time waiting on the peer.
Skipping empty receipt broadcasts removed thousands of writer scans. The busy-host trial did not establish a lower p99.
The follower now uses one fresh peer cut. All 16 reopens returned HTTP 200 in the completed 100k reader arm.
In the 16 GiB guest, 100,000 subjects finished with zero and 16 readers. The loaded oracle passed. A complete 64-reader arm is still owed.
The separate 24-GiB campaign is dry-tested and awaits its own night. No VM resize ran today.

| Night gate and comparison | Result |
| --- | --- |
| Historical refusal | 26.0% non-VM CPU vs 25% with 4.4 GiB swap. Rendering ended 2.249 s before the first sample. Earlier copying/compression had already finished. |
| New handling | One-minute retries with a 20-minute limit and a fresh time-reservation check. The ladder refusal exits 75 cleanly when the host stays busy. |
| Pair semantics | Each arm starts from a fresh self-seeded stack, with the same offsets and ACK clock. Waiting can affect host/cache state. Every finished arm retains its own bar statuses. |

[Rebuilt November 17 night](NIGHT-2026-11-17.md) and [gate audit](NIGHT-15-REPAIR.md). End outer retries by 01:45 for the current 300-minute reservation. Surface each refusal and summary path before retrying. Hold the measurement lease through any outer swap-triggered restart and start the named profile with activation disabled so the global Docker context stays default.

| Saved summary zero, ACK | Result |
| --- | --- |
| All primary | 109.129 ms [98.766,120.832], n=38,826. 860 slow burst and 38 slow steady commits. All ten bursts contributed. Last five supplied 704 of 860. |
| Matching 900 s | 42.084 ms, n=7,408 vs H zero 50.281 and H loaded 48.242. v3/H burst shares 85.18/88.36%, 60 s each and similar rates. |
| >50 ms inside bursts | First second 31/539, middle 822/31,967, last second 7/567. On 149.701 s slow wall, queue 75.776 s, Node 12.031 s, socket/network 29.801 s, gateway 1.794 s, peer 30.276 s. |
| Driver and RYOW | Peak 23/32 in flight with no slot wait. 6,109 RYOW fallbacks, p99 325.059 s. A next same-subject ACK completed during a 449.711 s observer wait. The sender dispatches the pull asynchronously. |
| Small to medium L256 | 9.343→11.071 ms at zero readers. Peer wait +0.621 ms, staging/validation +0.278, encoding +0.213. Raw median gap 1.752 ms, below the 1.9–2.6 ms prediction. |

Saved v3 context was swap 4.417 GiB and Mac CPU 13.0% median. H used summary at 4.017 GiB and 15.0% zero / 13.7% loaded CPU. These were separate nights. [Trace IDs, spans, intervals and contexts](BURST-15.md).

| 10k busy-host first-burst A/B, summary | ACK p50/p99 ms | >50 ms | Offer lateness p99 ms | Swap GiB / CPU median |
| --- | ---: | ---: | ---: | ---: |
| Before | 8.902 / 46.714 | 27 | 3.909 | 9.627 / 26.1% |
| Skip empty broadcasts | 9.951 / 110.842 | 85 | 7.419 | 9.557 / 35.4% |
| After | 11.955 / 86.399 | 109 | 8.363 | 9.268 / 52.1% |

Same-session p99 drift is 39.685 ms. All 3,420 exact RYOW captures survived in each arm. The steady/first-second peer tail needs a full trace with native apply and Postgres waits from an intact matched burst.

| 100k in 16 GiB, summary, busy host | Zero readers | Up to 16 readers |
| --- | --- | --- |
| Offers finished, expired, exact reads | 8,532/8,532, 0, 7,408/7,408 | 3,705/3,705, 0, 184,574/184,574 |
| Peak driver / cap, lowest sampled guest availability | 6.50/6.50 GiB, 3.28 GiB | 6.50/6.50 GiB, 3.35 GiB |
| Feed replay and independent oracle | 10,421 exact, oracle skipped by zero-reader policy | 3,529 exact, oracle PASS on 27 reads / 2,425 entity queries |
| ACK-to-replica-apply p99 and host | 831.487 ms, n=10,555, 8.755 GiB swap / 25.6% CPU | 13,828.095 ms, n=3,613, 18.018 GiB swap / 309.2% CPU |

The journal retains every seed and write intent and receipt. After drain, the compact model reconstructs full canonical row digests, receipt positions, bitemporal visibility, stamps and reference closure for every recorded read. The 64-reader attempts exposed separate oracle and feed failures. Eight successful commits recovered after gateway 503s lacked original publication timestamps. [Fit, reopen and witness audit](SCALE-15.md).

Cold-read candidate 1 doubles the transactor object cache from 1,280 to 2,560 MiB. Allow 1.25 GiB more cache plus heap/GC headroom and measure SQL reads after adoptions. Risks are memory pressure and ineffective caching after an index switch.
Candidate 2 replaces history AVET row-identity scans with a short never-retracted unique identity. It costs an indexed datom per assertion and a seed rebuild/migration. Preserve the never-reuse rule for imported and retired IDs. RE1's combined per-fact savings estimate is about 0.5 ms mean and 3–5 ms at p99 on 10k, with no 100k estimate.

402 Datomic package tests passed, 52 skipped. Native gateway 25/25, ordinary 1k reader oracle PASS. Shell checks and the 5,910 s v3 plan passed. Bench-wide TypeScript still reports errors in three untouched scripts. Audits cover [arm and pair admission](NIGHT-15-REPAIR.md), [the burst trial](BURST-15.md), and [fit, scope, oracle and lease checks](SCALE-15.md#evidence-audit).

```sh
bash lab/experiments/EXP-DX1/t1/night.sh --render-saved NIGHT_SESSION_DIR
bash lab/experiments/EXP-DX1/t1/tail-session.sh empty-basis tx2-dxt1-new-burst
DX_PG_CENSUS=0 DX_COMPILER_POLICY=early DX_BOUNDED_MEMORY_TRIAL=1 bash lab/experiments/EXP-DX1/t1/run.sh real tx2-dxt1-new-zero --rung 100k --zero-readers --match-duration-s 900 --seed-budget-s 10800 --writer-deadline-ms 600000
DX_PG_CENSUS=0 DX_COMPILER_POLICY=early DX_BOUNDED_MEMORY_TRIAL=1 bash lab/experiments/EXP-DX1/t1/run.sh real tx2-dxt1-new-reader --rung 100k --max-readers 16 --reader-threads 1 --reader-ladder-only --level-s 30 --match-duration-s 200 --seed-budget-s 10800 --writer-deadline-ms 600000
bash lab/experiments/EXP-DX1/t1/scale-night.sh --plan tx2-dxt1-future-100k YYYY-MM-DD
```

Owned containers, networks, volumes and the measurement lock cleared by 14:38 local. 89 GiB free. Two partial journals were verified lossless (4.04 GiB to 106.8 MiB). Raw evidence stays under `$EVIDENCE_ROOT/DX-T1/`. [Evidence checksums](SCALE-15.sha256).
