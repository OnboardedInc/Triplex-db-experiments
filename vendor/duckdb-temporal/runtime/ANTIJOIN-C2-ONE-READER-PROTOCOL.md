# C2 one-reader qualification: proposed next protocol

Status: source-only plan, not an executable binding or a completed gate.
Keep common source `8651acc1d243b4803a55e2d08913fc08abd3ae4b` and its
three sixteen-client config files byte-identical until the current timed
wave and required reverse comparisons finish. The first C2 sixteen-client
raw is `5e90b7c2…`; passing it does not imply a one-client or production pass.

The native reference remains B core `f44d116c…`, owner `55e588fe…`, control
`af47c28b…`, native source `c3ff1d73` and v2 binding `0eaf2187…`, loaded from
the same immutable archive. The original `e992830b…` budget and accepted
0.32 identities remain distinct from this selected B artifact. No native
build, Datalog change, alternate evaluator or public API option is needed.

## Minimal later harness extension

On a separate successor source checkpoint, allow an explicit profile
selection of exactly one or sixteen clients. Keep the existing sixteen-only
version and its files preserved; do not edit them to pretend a one-client
run used the old binding. Reuse the same common readCell/query/oracle and
fixed native-binding helper. The profile selector may choose only the
matching untouched original budget entry. It must not change any limits.

For C2, retain declared admission 3 but report effective admission
`min(pool capacity,3)=1`. Record one logical client, one independent reader
connection, effective limit1, actual observed port/control scopes, and queue
counts separately. The existing generic child already clamps admission and
checks physical-port count against its selected pool size. The narrow
change is configuration admission plus new immutable one-client bindings
and corresponding pure tests, not a second benchmark implementation.

The later binding must pin the exact successor common harness and keep all
native/archive/source/budget identities. Its large configuration is one
client, DuckDB4/UV4, 20 fixed samples, one warmup, 60s mixed, max 12000 writes,
2GB engine memory, 4GB temp, 4GiB logical intermediate budget. Its optional
100k correctness screen is explicitly two fixed samples, no warmup and2 s
mixed; no numerical qualification is inferred from that smoke.

Pure tests must cover original one-profile values, rejection of mixed or
undeclared profile selections, selected-reader/config disagreement,
admission 3/effective 1 accounting, unchanged numerical/native bindings, and
the separate small-source identity. Retain all queue abort/deadline/retry
cases. No current code/config file is modified by this document.

## Exact gate and case

Use a fresh clone of the same closed 10m K39087 source (SHA `3712516b…`,
pilot recipe SHA `5321690c…`), the same eight Probe seed batches, query SHA
`998e12dd…` and cyclic two-field patches. Logical input proof stays
1,680,202 facts with exact-cap success and one-below rejection.

| One-client measurement | Unchanged original limit |
| --- | ---: |
| Fixed p50 / p99 | ≤1500 / 2500 ms |
| Mixed queries per second | ≥0.75 |
| Mixed p50 / p99 | ≤1500 / 3000 ms |
| ACK count / ACKs per second | ≥40 / 0.5 |
| Sampled process RSS | ≤3.5 GB |

Require every typed answer at returned K, all pinned historical cuts, v1
submitted-write ordering/post-ACK visibility, consecutive receipts, writes
in each complete 10 s window, zero errors, reuse, final/reopen and all
before/after source/native/harness/archive identities. Queue wait remains
inside the public-call timer and timeout. First/warmup/final diagnostics
remain outside stopped sample quantiles, as in the common runner. Process
CPU is all threads plus oracle/sampling/drain; sampled RSS/spill are not
physical ceilings. Fixed p99 is the maximum of only 20 samples here, not a
rare-tail SLO claim.

Root grants each later engine/timing window and decides whether to pair a
fresh one-client B0 control for attribution. A prior B one-client pass does
not replace this explicit C2 gate. Stop on identity/oracle/lifecycle failure;
preserve any numerical failure without changing thresholds. A successful
one-client gate still needs fresh/reverse sixteen-client confirmation and
broader regressions. C2 is currently harness-only: any later runtime
integration needs its own lifecycle/conformance review and measured gate;
these measurements do not establish a deployed production limiter.
