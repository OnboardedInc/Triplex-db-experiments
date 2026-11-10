# DX-B8 head and gateway diagnostics

Production and assertions are in `packages/datomic/`. Raw observations live under
`/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B8/`; this directory contains only runners, indexes and manifests.

`stage.py ABSOLUTE_FRESH_DIRECTORY` copies the integrated gateway and codec specification and hashes every copied file.
`gate-window.sh` and `measure-window.sh` acquire the shared measurement lock, allow only `tx2-dxb8-*` names, run the pinned
split-peer topology and remove containers before releasing. `B8_GATEWAY_SRC` selects the immutable captured source.
Every invocation runs under `node lab/bin/heavy.mjs --label DX-B8-... -- ...` and must begin with at least 5 GiB host free.

`base-gates.sh PREFIX base` runs Clojure head/selftest/feed and all short package gates in both physical layouts.
`parallel-gates.sh PREFIX full` covers the remaining long suites in both layouts. The `diff` mode runs all 300 scenarios
as three contiguous 100-scenario ranges with one original RNG stream. A shared proxy caps physical Mac-to-VM sockets at
32 per gateway; logical test concurrency stays unchanged. Set `B8_HOST_GATES=1 B8_CACHE_VERIFY=true` for the verified differential.

`load.mjs` adapts DX-B7's representative 2,000-subject graph and seeded random 4/64/256 reader arms. Eight clients add 50,000
one-row physical commits without requesting an index job. The frozen read cut remains bound to the final representative seed ACK;
`headAfterFill` records the grown scope's latest physical basis. `B7_MIXED=1` adds quiet and loaded independent Poisson 15/s arms.
Mixed readers use the same SDK adapter reach path and atomically sample the greatest acknowledged receipt position before each pull
(the public TemporalBasis resolver drops internal positions); writer ACK timelines and matching feed
transaction IDs/positions are retained. `B7_DURATION_MS` defaults to 30 seconds and `B8_MIXED_DURATION_MS` to 60 seconds.

Run identical fresh attempts with `B8_KEEP_AWAKE=0` and `1`. The latter requires the helper to report exactly eight SCHED_IDLE
workers with one CPU each, and stops them before releasing the lease. `B8_PROFILE=1` records JFR through the measured arms.
Both the requested 30-frame dump and a 128-frame supplement are retained, so `profile.py` can attribute leaf samples to a captured
gateway caller instead of guessing from Datomic internals. Phase UTC timestamps delimit frozen and mixed samples.

`growth.mjs` is the original 400-subject, eight-client fill / trace-command / 64-reader mechanism comparator, with checkpoints
outside git so an owned stopped Postgres volume can continue in another bounded lease. Use a fresh `B8_LABEL` for each paired arm.
No index threshold is reduced. The baseline files are retained unchanged; historical fixture and failed-run overlays remain evidence.

`required-integration.patch` and `gateway-fixtures.patch` preserve the earlier ownership-boundary prototype. They are historical
artifacts; the final stage runner applies neither. Actual source integration and permitted legacy fixture changes are committed
directly in the package.
