# Fixed native B runtime: three configuration arms

Run this protocol from the `temporal-thread-budget-20261105` worktree on
`codex/temporal-antijoin-config-20261105`, frozen source `8651acc1`.
The integration branch retains this protocol and evidence while the
experimental harness remains isolated on that branch.

This source-only wave follows the first B run: its one-client gate passed,
while sixteen clients missed five absolute mixed gates. These experiments
keep B's `c3ff1d73` native predicate and v1 submitted-write ordering fixed.
The original `e992830b…` numerical budget still names the accepted 0.32
baseline; the `0eaf2187…` native binding separately identifies B's
`f44d116c…` core, `55e588fe…` owner and `af47c28b…` control bridge.
Neither identity is renamed to make a configuration candidate look like
an unchanged control.

| Arm | DuckDB threads | UV pool | Logical clients / native connections | Added whole-call admission |
| --- | ---: | ---: | ---: | ---: |
| B0 | 4 | 4 | 16 / 16 | None |
| C2 | 4 | 4 | 16 / 16 | FIFO, at most 3 |
| B2 | 1 | 4 | 16 / 16 | None |

These are the only admitted variants. C2 changes admission alone; B2 changes
DuckDB threads alone. The query, eight Probe seed batches, cyclic full-record
patches, typed oracle, returned cuts, native ownership and readCell timers
are unchanged. C2's FIFO wait starts inside the full-call timer; its queue
abort/deadline behavior and remaining timeout are inherited from the tested
first C gate. Rejections release admission. Physical control-scope IDs are
recorded separately from logical clients and admission counters; none is
proof of simultaneous native tasks.

`antijoin-config-binding.mjs` admits only this fixed B native binding,
original budget bytes, common harness fingerprints, source fingerprints,
and exact arm. The old fe9 native-binding helper is byte-identical. Its
tracked-source attestation uses the frozen original B worktree, while the
selected runtime is B's separate read-only archive with copied SDK packages.
No native files, artifacts or public APIs are changed by this wave. Do not
copy the common harness into the B reference worktree: that would correctly
break its old harness fingerprint. Run this shared script for all arms.

The original sixteen-client limits remain fixed p50/p99 <=3500/6500 ms;
mixed >=4.8 queries/s, p50/p99 <=3200/6500 ms; >=40 ACKs, >=0.5 ACK/s,
sampled RSS <=3.5 GB, a write in every full ten-second window, and all exact
answer/receipt/lease/reuse/final/reopen/source checks. A sixteen-client winner
still needs one-client qualification, fresh paired B0/reverse comparisons
and broader regressions before promotion. The prior first B result is
context, not a fresh paired control for this wave.

## Qualification commands

Run from this worktree's `projects/temporal-datalog/runtime`. The source
checkpoint precedes any checks. After root grants the bounded check window:

```sh
UV_THREADPOOL_SIZE=4 node --test adapter/test-antijoin-cost.mjs adapter/test-antijoin-config-binding.mjs adapter/test-native-write-binding.mjs
node --check adapter/benchmark-antijoin-cost.mjs
node --check adapter/antijoin-config-binding.mjs
```

The pure suites contain 6 + 5 + 5 methods. They do not start DuckDB. The new
five cases cover exact arm deltas, original budget/identity preservation,
wrong selected runtime/harness, and the explicit small correctness scope.
The FIFO cases retain cancellation/deadline isolation and failed-read reuse.

After the separate smoke lease, run each selected arm with a fresh output.
This example is C2; B0 omits `--read-admission 3`, and B2 also changes
`--threads 4` to `--threads 1`. Replace the arm-specific config/output names.
Use the original operations budget path so its relative raw baseline and
receipt paths resolve to the preserved files.

```sh
UV_THREADPOOL_SIZE=4 node adapter/benchmark-antijoin-cost.mjs \
  --runtime ../../../../temporal-native-write-cohort-20261105/projects/temporal-datalog/runtime/build/native-write-frozen-032-20261105/runtime \
  --candidate-binding ../../../../temporal-native-write-cohort-20261105/projects/temporal-datalog/runtime/evidence/antijoin-native-write-candidate-binding-v2-20261105.json \
  --config-binding evidence/antijoin-config-c2-10m-16-20261105.json \
  --budget evidence/antijoin-cost-10m-budget-20261105.json \
  --fixture ../../../../research-reference/projects/temporal-datalog/runtime/build/scale-runs/20261105T185235542Z-394378fd/facts-100000.duckdb \
  --evidence ../../../../research-reference/projects/temporal-datalog/runtime/build/expanded-value-integration/mixed-100k-026-checkpoint-fixed.json \
  --output build/config-wave-20261105/c2-small-01.json \
  --screen small --readers 16 --samples 2 --warmup 0 --duration-seconds 2 \
  --threads 4 --read-admission 3
```

This checks only correctness with diagnostic timings. Its source is fixed
at K577, and numerical promotion is explicitly not evaluated. It still
verifies the real archived B runtime, native source reference, common
harness, queue/port ownership and all exact postconditions.

Only after root grants an exclusive timed lease, use the same command with
these replacements:

```sh
  --fixture ../../../../research-reference/projects/temporal-datalog/runtime/build/scale-runs/20261105T194343420Z-abf92aa7/facts-10000000.duckdb \
  --evidence ../../../../research-reference/projects/temporal-datalog/runtime/build/combined-028-20261105/mixed-10m-pilot.json \
  --output build/config-wave-20261105/c2-large-01.json \
  --screen large --readers 16 --samples 20 --warmup 1 --duration-seconds 60
```

Large source identity is K39087, SHA `3712516b…`, original pilot SHA
`5321690c…`; the logical anti-join admission proof remains 1,680,202 facts.
Parent and child use fresh owned clones. Source checksum and closed-file
identity are checked before/after; original budget, native/config binding,
harness and actual runtime/source identities are rechecked after cells.

Run one arm per granted lease. Stop immediately on an identity, typed-oracle,
receipt or lifecycle disagreement; preserve the first output and diagnose.
A numerical failure rejects that arm without changing limits or launching
another arm automatically. Root selects control/candidate order and any
reverse confirmation. No build or matrix automation is added here.
