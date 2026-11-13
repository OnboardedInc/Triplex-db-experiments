# DX-T1 part 3 evidence and checks

North star: P2. Measurement stopped at V0 after the required three off controls; no full-pair or performance-fix claim follows.

Assessor: `b6eedf1b` (offline only). Measured source: `3f59403d87c87549399afea0b842c639a2dec389`. Product/benchmark bytes, default limits, heaps and CPU placement stayed unchanged. [HOST-GATE-3.json](HOST-GATE-3.json) contains the decision, exact quantiles, swap/CPU/memory observations and SHA256/length for every assessed input. [AUDIT-3.md](AUDIT-3.md) lists all decision and receipt sites.

Durable evidence root: `$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1/`. [CHECKS-3-SHA256SUMS](CHECKS-3-SHA256SUMS) covers 380 files, verified by readback, with paths relative to that root. Raw traces, oracle bytes, logs and viewers stay there. The five runs retain 2,075,267 bytes of compressed traces. No raw trace was deleted or rewritten.

| Run tag                   | Purpose / result                                                                                    | Committed index                                |
| ------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `tx2-dxt1-p3-smoke-a`     | 1k summary smoke; oracle 50 reads / 3,449 entities, zero mismatches; 83/83 coverage                 | [index](runs/tx2-dxt1-p3-smoke-a/INDEX.md)     |
| `tx2-dxt1-p3-v0-memory-a` | 10k off resource probe; 20-second L256, zero OOM; oracle 37 reads / 1,927 entities, zero mismatches | [index](runs/tx2-dxt1-p3-v0-memory-a/INDEX.md) |
| `tx2-dxt1-p3-v0-off-a`    | First zero-reader admission control; gate missed                                                    | [index](runs/tx2-dxt1-p3-v0-off-a/INDEX.md)    |
| `tx2-dxt1-p3-v0-off-b`    | Second control after 20-minute wait and delayed quiet admission; gate missed                        | [index](runs/tx2-dxt1-p3-v0-off-b/INDEX.md)    |
| `tx2-dxt1-p3-v0-off-c`    | Third control after another 20-minute wait; gate missed, stop                                       | [index](runs/tx2-dxt1-p3-v0-off-c/INDEX.md)    |

Fresh focused checks: six Node tests (four host-gate, two collector configuration); lint zero warnings/errors. Gateway preflight in the 1k smoke ran five tests / 21 assertions, zero failures/errors. New JavaScript roots are registered; 453 registered roots have zero type/binding diagnostics. Root coverage still has 124 inherited unregistered paths, so the full root check is not claimed passing. No package code changed; package suites/builds and pack checks were not repeated.

Private `tx2-dxt1-p3-verify.py` / `.json` independently check all 64 assessment input digests, raw primary quantiles and both oracle SHA chains. The initial verifier assumed the report's sampled-subject count was the full oracle count; its script/log are retained. The corrected verifier checks the bound full case. It changes no semantic output.

`tx2-dxt1-p3-v0-wait-{a,b}.json` retain wait deadlines; `*-host-before.jsonl` retain actual quiet admission/refusals. There were transient host CPU spikes after admission; the report and raw samples preserve them. `tx2-dxt1-p3-cleanup.txt` is the final empty owned inventory; each run also has empty container/network/volume readbacks. The measurement lease was absent after cleanup.

Acceptance/pin scan found no references to changed paths or the old registry SHA, and no acceptance edits. No pinned path moved. The registry SHA changes from `b60488b639e5111719e0a1d5a177d7f92553dc3ac3a51dbb7a45d2cf43ebca6f` to `68946c536635d6d08105b37a009b7ed1bd87e6d614860421421703f331153259`; it is unpinned. No dependency/image was added, no seed changed, no volume remains, and no push was made.

Recheck recorded V0: `node lab/trace/host-gate.mjs "$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1" 3f59403d87c87549399afea0b842c639a2dec389 tx2-dxt1-p3-v0-memory-a tx2-dxt1-p3-v0-off-a tx2-dxt1-p3-v0-off-b tx2-dxt1-p3-v0-off-c`.
