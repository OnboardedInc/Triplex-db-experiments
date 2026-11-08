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

## Fix round Q62a (head f711193, one commit on d7c6086; saved 2026-11-08 00:40Z)
| # | Fix | Evidence |
| --- | --- | --- |
| C1 | in-transaction Datalog waits for the replica's real marker to reach sourceK, then BasisNotAvailable (QleverQueryExecutor.ts:230, BrokerStorageAdapter.ts:512); executor view marks the CAS read set scope-wide (:537) | live: fails "Basis 2048 ... observed 0 after 2009 ms" instead of 0 rows; 1 row after publication; a Datalog-reading transaction conflicts when another subject commits |
| C2 | no answer uses the cached marker: Datalog gates before and after (QleverQueryExecutor.ts:387), dependencyState (BrokerStorageAdapter.ts:480, :462) and drain read the real marker; idle applier probes every 500 ms and fences and replays on regression (broker.ts:832, :796; probe and wait :659, :678) | live after a rewind: refused ("observed 0 after 2283 ms"); after replay dependencyState 2048 and the pull 3 rows via the replica = oracle |
| C3 | process-wide registry by realpath (log.ts:96, :193); kernel flock via a perl child (log.ts:100); `takeover: true` for crash tests; `abandon()` and failed starts release both (broker.ts:222) | offline secondOpened false; live second runtime refused 6/6; cross-process contender exits 3 and gets the lock after SIGKILL of the holder |
| M1 | segment format 2 header CRC (frame.ts:81, :96); format 1 only with firstLsn = 1; refuse when WATERMARK names an LSN above the scanned end, before truncating (log.ts:264) | 256/256 header bit flips refused as bad-header (before 62 read as torn-tail) |
| M2 | broker pulls beyond lastPositionOf(durableLsn) wait 2 s then BasisNotAvailable (BrokerStorageAdapter.ts:239, broker.ts:696); A0 pure guard (QleverStorageAdapter.ts:113, :139): no extra request at or below the highest observed position, one position read above it, then BasisNotAvailable without waiting | S7 first read fails typed; A0 option-off live: 4 passed, 4 timed out at 60 s in a busy window (two pass alone) |
| M3 | pulls and retraction-target reads fall back to broker.fromLog (BrokerStorageAdapter.ts:274-283); Datalog and dependencyState ReplicaUnavailable; broker-mode native SPARQL with `awaitBasisMs` waits then BasisNotAvailable and re-checks after (NativeQueries.ts:81, :133, :207); errors.ts:16, :43, :61 | 300 random outage reads equal an independent log replay; a retracting commit succeeds during an outage; 462 fuzz outage reads answer |
| m1 | post-fsync exception fails the broker, outcome-unknown (broker.ts:437); decision loop cannot leak a rejection (:335) | failed:WriteError, 0 unhandled rejections, watermark not advanced, resend after reopen CommandAlreadyCommittedError |
| m6, m5 | P3 harness records source (fsync return), ACK and consumer instants per position and exits 1 on any gap (bench/run.mjs); receipts record QLEVER_COMMIT_PATH, QLEVER_BROKER_DIR, TX2_CONFIG_DIR | smoke P2Q-trace-C-offline-20261108T002425Z-76dc92: 33/33, lag from source p99 12.1 ms |
- Verifier suite (V_P2Q_SEEDS=60, 32 tests): 23 pass, 4 fail, 5 skipped; the 4 failures are the defect assertions flipping (S3 now answers from the log;
  in-transaction Datalog no longer reaches a replica below sourceK; cached-marker regression now waits and answers on the real marker; fuzz
  counts outage answers as mismatches). Fuzz excluding outage reads: 3,228 reads, 0 mismatches, 60/60 converged. Live C1-C3 each fail at their
  defect line. Author's tests: 51 pass, 24 skipped (14 new in test/broker-fixes.test.ts).
- Left as is: typed errors keep `_tag` "ReadError" with a `reason` (basis-not-available, replica-unavailable) so adapter signatures stay (a
  distinct tag needs core); native SPARQL is typed only in broker mode when the caller passes `awaitBasisMs` (core's resolveNativeReadBasis still
  throws RangeError for A0); the outage fallback replays the whole log per pull (exact, slow; recent_rows in Q58c replaces it); the before/after
  marker check cannot see a replica that restarts and replays past B within one query; Q50d hardening out of scope.
- Evidence: /Users/sam/Claude/Projects/triplex-db-2/EXP-P2Q-qlever-log-broker/fix-round/ (verifier evidence preserved in
  fix-round/V-P2Q-originals-at-d7c6086/ and restored byte-identical after each run).
