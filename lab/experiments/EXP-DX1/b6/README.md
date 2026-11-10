# DX-B6 package fixes and probes

North star: P1 exact pinned reads, P2 sparse commits, P3 ordered journal reads,
P4 bounded client caches. Authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`,
`lab/TARGETS.md`. These are developer diagnostics and regression gates, not an
acceptance promotion.

`gates.sh PREFIX COMMAND...` takes the shared measurement lock, captures source
and built preimages, starts an owned split-peer Postgres stack, bounds the child
process group and removes all owned resources before releasing the lock. Run an
immutable copy of it. Prefixes must start `tx2-dxb6-`; no downloads are made.

Use `B6_HOST_GATES=1` for native correctness tests; published ports 8516/8517 are
used, with at most 64 concurrent Mac connections. Performance uses VM mode:

```sh
node lab/bin/heavy.mjs --label DX-B6-measure -- \
  bash /absolute/path/to/immutable-gates-copy.sh tx2-dxb6-fresh-attempt \
  node --experimental-strip-types lab/experiments/EXP-DX1/b6/lone-commit.mjs
```

The probe seeds 400 representative subjects, runs 120 cold sparse commits,
2,000 back-to-back commits, 120 warmed sparse commits and a 60-second Poisson
15/s arrival trace. It then runs the 2,000-subject read matrix with three reader
workers at 64 and 256 logical readers, first sequential and then seeded random.
The initial retained measurement used 900 Poisson arrivals (57.7 s); the final
runner uses the full 60-second offered interval. Read matrices are labelled by
access pattern; random is an additional diagnostic, not a matched replacement.

`client.onCommit` observes adapter start/return and per-attempt staging/order
release times with optimistic/begin flags. `client.onRequest` observes actual
socket finish, response headers, JSON completion, socket reuse, byte counts and
the gateway's payload/sequence/submission/completion timeline. Each commit carries its operation ID, transaction IDs and attributed request
observations, including overlapping offers, conflict replies, HTTP count and
replays. HTTP counts are actual request constructions. The final Poisson runner
schedules independent offered times and includes offer delay; earlier b/c probes
are explicitly completion-paced diagnostics. Gateway `responsePrepared` is preparation, not a
socket-flush timestamp. No gateway response-flush completion is claimed.

`peer-gates.sh PREFIX` checks 5,000 immediate commit/read pairs on each layout,
with and without pausing the actual Java read peer for 30 ms inside the VM. Every
commit is checked through both row and reach routes; their order alternates.
`final-gates.sh` splits expensive concurrency and reach gates by layout and
runs the 300 paired layout scenarios in their own window. `suite.sh` runs the
remaining package files and touched core tests on both layouts.

Bulky source copies, logs and raw results stay under
`/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B6/`. The inherited VM
launcher first copies its driver output to `evidence/DX-H3/PREFIX/`; B6 retains
an additional copy under its own attempt directory. Both are identified in the
final evidence index. Never infer success from cleanup, an exit code or a hash
inventory without the content assertions in the corresponding native test log.
