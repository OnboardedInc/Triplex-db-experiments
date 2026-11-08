# EXP-P2Q QLever behind a host log and broker: report (saved by the orchestrator, 2026-11-07 22:50Z)

**Bottom line:** the candidate (option `broker`, default off; A0 unchanged) ACKs independently of QLever's delta. In every paired window on
the shared dev resident the candidate ACKed in 4 to 8 ms p50 while A0 took 0.96 to 7.4 s; read-your-own-write held on every completed pull;
the feed and the Q31c falsifiers pass. The controlled delta-level measurements need an exclusive slot and did not run (pool at 10.0 of 11 GiB
all session). Branch `exp/P2Q-qlever-log-broker` head d7c6086 (384d634, 2b73620, 650b18f, d7c6086); not merged pending verification.

## Design
- Frames per R13 2.4 (32-byte headers, CRC32C chain, torn-tail truncation with a backup copy, refusal on mid-log corruption); kinds
  COMMIT_GROUP and EPOCH_BEGIN; quads are a pure function of the rows; delete terms from the broker's own encoder, never read back.
- Positions (Q31c): (stream = scope, epoch, offset = LSN, ordinal) packed as lsn*1024 + ordinal; an EPOCH_BEGIN on every open; a torn tail
  burns its LSN (the abort gap); every position at or below the head is resolved.
- ACK after fsync and the watermark update (Q31e). Claims and per-subject CAS (read and write sets), escalating to a scope-wide check for
  reads not tied to known entities; group commit of everything queued during the previous fsync (up to 64, no timer).
- Asynchronous publication: up to 64 commands per guarded update on a fresh connection with a (broker_position, broker_epoch) marker guard;
  a higher epoch means fail-stop; a lower marker means replay from the log.
- Overlay eligibility: one SPARQL request returns rows and marker; the replica answers when its marker has reached B, else the overlay is
  merged if it still holds every frame after the marker, else the read goes to the log; temporal filters in the kernel.

## Results (5-10 band unless noted; same resident, same window)
| Window | Arm | ACK p50 / p99 (ms) | RYOW |
| --- | --- | --- | --- |
| delta 2.29M-2.35M, closed loop, n=30 | C / A0 / C | 4.5 / 9.4; 7,433 / 11,636; 5.0 / 9.2 | 30/30 each |
| delta 192k-311k, closed loop, n=60 | C / A0 / C | 3.9 / 11.6; 961 / 1,797; 4.8 / 19.5 | 60/60 each |
| open-loop TARGETS 2.1 steady, 100 s | C | 6.7 / 42.2 (11-25: 7.5 / 25.1; 26-50: 8.1 / 33.7) | 57/57; 114/114 committed; lost ACKs and resends got the original receipt |
| same, next window | A0 | 2 of 114 acknowledged (112 outcome-unknown at the 30 s timeout) | n/a |
| offline, 180 s with the 50x burst | C | 4.7 / 25.0 | 3,414/3,414 committed, 0 unaccounted |
| ACK path alone | C | 3.8 / 4.8 (fsync 2.84 ms, F_FULLFSYNC) | 120/120 |
- Feed: lag ACK to durable consumer record p50 5.9 / p99 12.8 ms offline, p99 24.5 ms on dev; 0 gaps, 0 order violations, 0 duplicates.
  100 injected crashes keyed: 0 visible duplicates, 136 replay attempts; unkeyed control with separate writes: 129 visible duplicates.
- Q31c falsifiers (nested cuts, abort gap, crash between append and resolution, resume at the gap): all pass.
- Predictions: ACK independence from delta shown; p99 above 20 ms during the burst (25) and with reads and the applier in one process (42),
  but inside the TARGETS P2 bars (p50 ≤ 10, p99 ≤ 50) in every run; RYOW met on every completed read; feed met; falsifiers met.
- The `--persist-updates`-off arm (engine-np/qlever-start.sh via TX2_CONFIG_DIR) and a kill -9 replay mode are built, not measured.
- Receipts in lab/experiments/EXP-P2Q-qlever-log-broker/receipts/ on the branch (P2Q-trace-C-20261107T221344Z-cad02c is contaminated).

## Open questions (ruled Q50)
1. Exclusive-slot run list; 2. reads when the replica is unreachable; 3. Datalog/executor queries cannot use the overlay (2 s wait then
error); 4. A0 writes about 750 triples per 10-fact command (journal rows included), 8x R17's 94; 5. hardening left out (in-process broker,
PID lock, no segment rotation or checkpoints, no overlay memory bound or backpressure); 6. keep-alive penalty not seen on the loaded
resident.
