# One-time start-up read at 1 billion records, bench 4 (2026-11-23)

**Source:** JVM1 `968285954` (`jvm1/STARTUP-READ.md`, patched `startup-aged.ts`), one build with its receipt, launched by `bench4-startup.sh … startup-aged run`. **Data:** the held 1 billion record cluster (control `537ac161…`, handoff digest checked before launch), on a fresh copy for each arm, with the write log on the second NVMe. **Arms:** `today-cache32` then `startup-read-cache32`, rolling 6, 394 offered per second for 300 s after a JVM restart. Ran 00:36 to 01:09 UTC on 24 November and ended with a passing verdict. Synchronous commit on, one database, and no cache warming other than the start-up read under test.

## Verdict

**The start-up read removes the restart's latency tail at 1 billion records.** In the first 30 s after admission, save p99 is 7.26 s without the read and 385 ms with it, a 19× drop. It costs 19.6 s more from stop to admission (41.8 s against 22.2 s, inside the 60 s bar). No falsifier fired. Both arms stored 394 saves per second with 0 expired.

## Measured against the forecast

| Measure | today-cache32: forecast → measured | startup-read-cache32: forecast → measured |
| --- | --- | --- |
| Storage gets per save, first 60 s | 0.80 (0.45–1.3) → **0.796** | 0.55 (0.25–1.0) → **0.279** |
| Storage gets per save, fifth minute | 0.50 (0.25–0.95) → **0.299** | 0.48 (0.2–0.9) → **0.333** |
| Save p99, first 30 s | 6 s (1.5–20) → **7.26 s** (p50 6.28 s) | 3 s (0.5–12) → **0.385 s**, below the range (p50 10.4 ms) |
| Save p99, first 60 s | 5 s (1.2–18) → **7.22 s** (p50 4.52 s) | 2.5 s (0.4–10) → **0.380 s**, below the range |
| Save p99, first 120 s | 3.5 s (0.8–15) → **7.16 s** (p50 11.1 ms) | 2 s (0.3–9) → **0.368 s** |
| Save p99, whole 300 s | — → 6.99 s (p50 6.2 ms), settled at 285 s | — → 0.340 s (p50 5.5 ms), settled at 285 s |
| Stop to admission (bar 60 s) | 35 s (18–60) → **22.2 s** | 50 s (30–80) → **41.8 s** (first acknowledgement 42.3 s) |
| Stored per second, whole window | 390 → **394.0** (118,197 of 118,200 in the window) | 392 → **394.0** (118,197 of 118,200) |
| Start-up read, transactor | — | 12 s (6–25), 13,000–20,000 gets → **18.4 s** (connect 2.9, select 0.9, read 14.6), **36,453 segment loads**, above the forecast range |
| Start-up read, write peer | — | 10 s (4–25) → **5.5 s**, 18,344 segment loads |

- **Restart phases, today / read:** stop 10.2 / 10.1 s, transactor ready 2.1 / 2.7 s, gateways ready 22.1 / 23.2 s, scope open 0.1 / 0.1 s, start-up read 0 / 18.5 s.
- **Reads:** both readers stopped with `complete`, selecting and reading 9,402 owners each (cap 40,000), well inside the 30 s and 150,000-segment limits, with no task failures.
- **Reader threads:** there were no `tx2-sread` threads at the report or at admission in either JVM, and `poolTerminated` was true in both reports. The runner's after-window check is an assertion, and the arm passed it.
- **Autovacuum:** the PostgreSQL sampler (124 samples, every 10 s) saw no autovacuum worker in either arm.

## Falsifiers

| Falsifier | Measured | Fired |
| --- | --- | --- |
| Read arm's first-60 s gets stay above half the today arm's | 0.279 against half of 0.796 (0.398) | no |
| Gets fall 2× or more but first-30 s p99 falls less than 1.5× | gets fell 2.85×, p99 fell 18.9× | no |
| The transactor read hits its 30 s limit | 18.4 s, `complete` | no |
| Stop to admission over 60 s (stated at 430M; checked here at 1B) | 41.8 s | no |
| Any `tx2-sread` thread at or after admission, or a report without `poolTerminated` | none; both `poolTerminated` | no |

**Forecast misses that do not falsify:**
- The read arm's early p99s are below their forecast ranges, which is better than forecast.
- The transactor read took 36,453 segment loads against the forecast of 13,000 to 20,000 gets.
- In the today arm the restart tail lasted the whole two minutes: p99 stayed above 7 s through the first 120 s, against a forecast of 3.5 s.

Evidence: `evidence/DX-BM1/bench4/bench4-startup-aged/` on the Mac. Running cost of bench 4 at publication: about 10.2 h, about USD 11.1.
