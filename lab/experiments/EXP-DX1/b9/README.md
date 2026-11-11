# DX-B9 measurement and verification tools

P1/P2 first, then P5. Goals remain in lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md.
All performance numbers are diagnostic. No acceptance contract is changed here.

`prepare.py ABSOLUTE_FRESH_DIRECTORY --working` captures A (`19f5422d`), B (working
source), shared built SDKs, drivers, runners and oracle bytes. Never edit a running
shell runner: execute its immutable captured copy through `lab/bin/heavy.mjs`.

The original `alternate.sh` seeds identical 2,000-subject graphs plus 50,000 commits
in each arm. That takes most of a lease. The selected `clone2-window.sh` instead
clones the explicitly sealed B9 seed volume read-only: identical file names and
SHA256s before startup, exact logical head 52,039, and matching hashes/counts/bytes
of all 2,000 warm JSON answers per worker across A1 B1 A2 B2. Startup metadata may
advance native t; both values are retained. This is an answer check for this graph,
not equivalence of arbitrary native metadata queries. Arm clones are removed after
measurement. The sealed source is removed after the last clone hold.

`frozen` runs seeded-random 4/64/256 readers for 30 seconds each. `mixed` runs dense
commits, Poisson 15/s commits without readers, and Poisson 15/s with 256 moving-cut
readers, 30 seconds each. Each hold alternates A1 B1 A2 B2, with B8 topology/flags.
Host JSON is retained before admission (`--wait 20`), immediately after lock acquire,
and after cleanup. Busy means busy, including when an earlier precheck was quiet.
Sparse latency includes VM wake cost; dense latency is reported alongside it.
`keepAwake` is false everywhere; no keep-awake helper was used.

`summarize.py HOLD` checks successful bounded hold, source/arm/stack binding, positive
samples, head and warm-answer hashes, then prints both repeats and their ranges.
Only non-overlapping ranges count as a measured difference. It grants no acceptance.
`profiles.sh FRESH_ID JFR...` converts completed nonempty recordings under a short
separate hold. Shutdown flushes JFR because the image has jfr but no jcmd. Raw profile
JSON is zstd-compressed; leaf/caller summaries retain missing/truncated stack counts.

Selected default: TX2_RECENT_REVISIONS is off. Set it to 1 (or JVM property
triplex.recentRevisions=true) to opt into the report-fed revision map. The fixed-field
read config and generation-bound primitive-coordinate cache keys apply in either mode.
No write-gateway consumer wait was found or added.

Gates use separate short/differential and long holds to keep each lease under20m.
`verify-gates.py SHORT_PREFIX LONG_PREFIX CAPTURED_GATEWAY` checks fresh child exits,
full counts, all300 RNG-linked scenarios, verified-cache counters and exact current
source, then emits only a developer-gate union. Existing hot/lifecycle/recent native
suites explicitly opt in; other native suites and package suites use the default.
Failed earlier attempts remain in FAILURES.md and durable evidence.

The W0 fixture now supplies its backend URL and observes the actual built SDK as
well as fallback requests. Its existing exact row/order/basis/one-request assertions
exposed a real root-frontier order mismatch; sweep decoding restores portable BFS
order and rejects unreachable nonempty row bodies. This is a compatibility repair,
not the requested compact-row performance work.

`draft/`, `strict-order.test.ts.draft`, and `apply-step-b.py` are unexecuted B proposals.
They are not imported, not package tests, and confer no ordering claim. C/D were not
implemented. See REPORT.md for final numbers, limitations and evidence.
