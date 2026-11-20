# Overnight collector audit

The 100k DELTA reservation is held. The first group run continues from its original source and ceiling. The next command is the W1 quiet pulse after its small native collector check.

## Activation review

- Finding 1 confirmed at `e12105b91`. `loaded.ts:256–305` stops after one read of the offered release and Python comparison for that subject. `solo.ts:258–299` runs all offers before it expands the first two, and records no completion time for those durable rows and notices. It does not run the dispatcher.
- Finding 2 confirmed. `loaded.ts:249–263` starts the clock after the scheduled wait and the previous offer, can omit that queueing, and `loaded.ts:320–385` ends readers without demanding an observation for every deadline. `solo-proof.ts:56–106` permits any nonnegative stale count and has no maximum duration limit.
- Finding 3 confirmed at `bde03a5d1`, `overnight.py:492–508`. The old collector required two reference records. `solo-proof.ts:114–134` requires the three exact W0 release hashes in order. `delta_output` now checks the ordered releases against the producer checkout's release index, each reference cut, the exact attempt binding and the hashed loaded file and raw offers. A published producer output whose collection fails is retained under its original attempt and marked `uncollected`. It cannot trigger a second timed run.
- Finding 6 confirmed. The 1k native run leaves the large destination empty. The large runner still seeds and scans the population before both page-reference sweeps, then enters the loaded DELTA windows on the warmed stack. The loaded timing rotates the same three release documents and independently verifies one subject in each timing sample. The regional narrow case changes three flags at 1k. The wide case and complete durable publication still need their own verification. `solo.ts:148–168,226–267` and `loaded.ts:212–305`.
- Finding 10 changes the guarded four-arm run to diagnostic. It has no place in the default queue while better measurements wait.

## Files and admission

| Work | Produced file(s) | Small real output and gate |
| --- | --- | --- |
| DELTA | `delta/result.json`, `delta/loaded.json`, `delta/offers.ndjson`; SCALE1 emits `delta-measurement.json` | The unmodified producer verifier, rebuilt at `1ed7442b5`, and BM1 accepted the same saved native 1,000-person six-offer output. Missing R1, reversing the three releases and repeating R2 each failed. This source still has findings 1 and 2. A corrected producer must rerun the small test and be pinned. |
| Group commit | `results/comparison.json`, `results/arm-*/raw.json`, `seed-readback.json` | Already running at `502c8897d` when the audit arrived. Its first and second arm evidence stay separate. Any retry needs a fresh collector check. |
| Quiet pulse | `results/comparison.json`, `results/arm-*/raw.json`, `seed-readback.json`, `summary.json` | A separate ten-fact native smoke uses the named W1 build, actual durable command receipts and the same collector file layout. Full population and 600 quiet offers per cell remain required in the real run. |
| Thin/deep match | `results/comparison.json`, `results/arm-*/field-output.json`, `writer.jsonl` | The same producer runs the 64-person, 39-offer smoke and the four 10,000-person blocks. Both verify pinned rows, exact operation receipts, ordered offered inputs and actual ACK samples. |
| Import | `traffic/comparison.json` and the native `terminal.json` with stage file manifests | Saved native small readings are available. A source-bound collector check is required before admission. |
| Predecessor and short probes | `probe-results.json`, per-block offer and receipt tapes and native traces | Work must bind the original PostgreSQL checkpoint, its source world, a fresh attempt and the actual serial counters. |
| Active capacity | `thin-1m/result.json`, `thin-4m/result.json`, each `inputs.json` and `SHA256SUMS` | Saved small native producer outputs are available. A source-bound collector check is required before admission. |
| Guarded diagnostic | `act1-sweep.json`, `act1-verified.json` and `comparison.json` | Held. A checked diagnostic would be scoped to sweep completion and the verified durable guards. |

`night-client.py` waits for the ready receipt before invoking a public command. It compares each transferred summary byte and file hash to the same request and terminal attempt. `overnight.py` scopes teardown to the admitted service and checks its inventory independently. An unrelated file, a different source, an old attempt, or an incomplete source archive cannot enable admission. `COLLECTOR-CASES.json` records the deployed source and digest of externally reproduced smoke evidence. Reports remain diagnostic where the benchmark contract does not score the outcome.
