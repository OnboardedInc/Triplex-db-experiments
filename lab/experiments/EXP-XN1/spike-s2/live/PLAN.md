# Live run plan frozen before timing (2026-11-10)

North star: P1 reader isolation first, P2 commit and RYOW cost, P3 observed visibility lag, P4 point pulls.
Authority remains lab/SCOPE.md, NORTH-STAR.md and TARGETS.md. Diagnostic engine-only spike; no PASS.

1. Topology proof: completed before timings with exact cross-node/current/past bytes, stopped endpoint, restart catch-up and remote block objects; 20k guarded updates prepared.
2. Same-day AWS/Local control commits, keeper off then on, and the S1 read cases with verified keeper on.
3. Q1: 15/55 commits/s × 0/16/64/256 readers, keeper off then on, in one four-engine hold.
4. Q3: 15/55 commits/s × 0/256 readers, off then on.
5. Q2: small/135k current and independently pinned earlier-basis pulls, 16/64/256 readers, with 55/s guarded writers, keeper on.
6. Q5 from every measured bracket's Kafka/S3/write/read cgroup counters; Q4 fresh await+snapshot probes, on.

All open-loop windows are **45 seconds**, with the same seed (914511) and trace prefix for each matched rate/reader/keeper case. This replaces S1's historical 60-second window and was selected before any timing result existed, because lower-priority lock waits consumed the budget and both Q1 arms must fit a single 15-minute hold. Same-day controls also use 45 seconds. Report sample denominators; do not call this an exact rerun of the historical 60-second trace.

Every reader still warms with 100 byte-checked pulls per connection. Worker/socket warmup is parallelized before the timed window so 256-reader preparation does not consume a window's runtime budget. No measured query, command or correctness check is removed.

Containers are removed before every lock release; rest at least 120 seconds. At most 10 minutes for a single-node hold, or 15 for four-engine bring-up holds. No published ports. Prefix tx2-xns2 only. Names/IDs, sources, configs, keeper status, cgroups and raw results remain in each attempt's evidence directory. First failures remain. No downloads have been needed.

Before any Q1 timing (2026-11-10 16:30 UTC), split the unchanged matrix into `q1-off` and `q1-on` holds. Sixteen 45-second intervals alone consume 720 seconds; startup, fixed 100-pull/client warmups and cleanup can exceed the 15-minute hold. Each arm now has eight cases and a separate restart/barrier. The queued `q1-1` attempt was cancelled while waiting for another holder, with no containers or samples. This supersedes the one-hold placement above; durations, trace, order, readers and queries are unchanged.
