# DX-R3 — recent local reads
Result: implemented and live differential-equal; performance targets remain UNVERIFIED.
Measured source HEAD: `2e06d5de`; final attempt `j`, 2026-11-11, private CPU-pinned stack.

## Targets (10,000 subjects)
| Target | Result |
| --- | --- |
| T1 verified pulls/s, 64 / 256 readers | UNVERIFIED; benchmark exited before seed (missing host build output). |
| T2 read p99 at 256 | UNVERIFIED; no measured reader phase. |
| T3 local share / phase route counts | UNVERIFIED; no measured reader phase. |
| T4 CPU ms / local pull | UNVERIFIED; report implements process-CPU upper bound including writer/feed. |
| T5 just-acknowledged receipt wait p50 / p99 | UNVERIFIED at 10k; implemented actual elapsed wait histograms and routes. |
| T6 10k copy/window/process peak <4 GiB | UNVERIFIED; process exit emits OS peak including analysis/serialization. |
No throughput or latency acceptance, promotion, or zero-error benchmark claim is made.

## Design as built (12 lines)
- One additive Replica update hook supplies previous/current immutable buffers after each complete cut.
- RecentReads retains per-entity version intervals, default 20,000 positions and 64 MiB accounted history.
- Byte eviction advances a global floor by complete cuts; sidecar summaries count toward history bytes.
- Exact record clocks come from validated journal instants; ambiguous, regressing or unknown clocks decline.
- Bootstrap clock admission checks gateway position/time equality; recovery clears clock eligibility.
- Local positions must lie between floor and watermark; unknown closure/version falls back unchanged.
- Ahead receipt reads await follower/index updates for a nominal 10 ms, then fall back; actual wait is reported.
- Rows and references use their own half-open valid intervals; traversal handles cycles and missing closure.
- One process follower publishes index deltas; reader threads share entity and summary SharedArrayBuffers.
- Per-version interval summaries include every actual fact; reference traversal combines them for each read.
- Pulls expose a pinned lazy world: materialization retains the selected buffers even after eviction.
- All benchmark observations remain losslessly retained; unchanged Model/judgeRead checks stamp and full digest.

## Fresh differential proof
`final-j.log.gz`: 2,000 subjects; 200,000 pairs; **0 differences**; 3,039 concurrent writer commits.
155,159 local / 44,841 fallback; 398 floor reads; 201 actual ACK straddles; 28,515 current-position reads.
Basis mix 160,000 current-receipt / 30,000 receipt-pinned / 10,000 varied past-valid-time selections (with floor/current overrides).
Each pair compares decoded canonical world bytes, lazy-world bytes and cached whole-world observation against gateway.
777.102 s; wait p50 0 / p99 166.431 ms in this CPU-heavy proof (not T5); exact requested basis retained.
Final packed payload 14,685,936 B; accounted history 67,041,668 B; RSS 797,904,896 B (not a 10k peak).
Fresh scope `dxr3-diff-1794376799972`; driver exit 0, OOM false; CPUs 4–7, client cap 8 GiB.
Older `differential-e.log.gz`: 200,000 / 0 at e5d31c30; final j additionally proves lazy materialization.

## Benchmark, commands and limits
Run: `node lab/bin/heavy.mjs --label DX-R3-final-j -- bash lab/experiments/EXP-DX1/r3/run.sh both j` (stdout/stderr gzip).
The script proves equality, then starts a fresh client/distinct 10k scope on the same stack; 19-minute watchdog.
NS flags: `--lane datomic --rung 10k --composition reach --read-path replica --reader-ladder-only --reader-threads 3 --profile smoke --level-s 30 --max-readers 256 --probe10-per-s 0 --rate-scale 1 --seed-batch-facts 2000`.
Frozen background trace/burst retained; probe10 overlay disabled. First ≤24 raw oracle captures use gateway; every read still checked.
Benchmark startup failed on `packages/host/dist/feed/index.js`; host build subsequently succeeded; import preflight reached argument validation.
Build: `node lab/bin/heavy.mjs --label DX-R3-host-build-l -- pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store --filter @triplex-build/triplex-host build`.
No time remained for another complete lock/seed/ladder within four hours; no shortened substitute was measured.
Current rate limiter is unknown without that run; packed traversal, message delivery and full post-run checking remain costs.
Fallback: unrecognized record clock, expired cut, incomplete closure, invalidated copy, or follower wait expiry; no approximate answer.
Checks: focused 13 tests pass, final lazy tests 5 pass, TypeScript passes, lint 0 errors/warnings; prior Datomic suite 170 pass/47 skip.
Recorded DX-R1 replay proves historical-page equality only; 10,000 optimized observations, 2,000 commits, invalid-clock rejection covered.
No full root check, full NS/GS, 100k, external Python oracle, independent review, or DX-R2 integration qualification.

## Verdict audit and retained failures
Replica/TimedSource admission: complete validated source cut and same-journal clocks; rejected pages publish no clocks; current attempt buffers only.
RecentReads/pullAt: exact eligible position, valid intervals and retained bytes; gaps/reset invalidate; unknown cuts use original gateway basis.
Prepared summaries/observe/lazy world: every actual fact contributes at selected version; final j compares both complete bytes and digest.
ReadRecords/judgeRead/levelStats/bars: retain every field/read, judge against requested-basis Model after ACKs; errors never count as goodput.
Tests/replay/differential/report: label historical inputs; live j binds fresh scope/source HEAD/private slot; equality assertions, not exit-zero alone.
Earlier failures retained: a shell-source mutation, b canonical helper type rejection, d V8 heap OOM; c/f/g/h cancelled before admission. No failed attempt relabelled.
Attempt j cleaned all owned containers/network/volumes before releasing lock; later lock holder is unrelated. No resident touched.
Evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R3/`, compressed raw command output only; no manifests/captures.
Acceptance files unchanged; no modified source paths found in scanned current pins. No commits pushed or merged.
