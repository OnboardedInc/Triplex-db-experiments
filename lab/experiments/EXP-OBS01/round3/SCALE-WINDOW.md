# Deferred scale-window commands

North star: qualify the observation cost/clock floor without weakening P1/P2/P3/P5 correctness
(`lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`). **Not run in round 3.** No exclusive slot is
permitted this round. The scale orchestrator must first admit a dedicated measurement slot and
park lane D itself if required. These commands never park or reconfigure residents.

The checkout has no frozen, executable year-one NS driver/fixture manifest. The window owner must
supply `OBS01-frozen-ns-driver/1` JSON containing absolute `cwd`, `argv`, `env`, `files:[{path,sha256}]`,
`writerTraceSha256`, `fixtureSha256`, and `scale:{entities:10000000,activeFacts:100000000,readers:256}`.
The pinned files must include the driver, generator, writer trace, oracle and fixture/reset implementation.
`run_frozen_driver.mjs` executes that exact argv after checking pins; it does not invent an NS runner or
certify the driver, fixture semantics, sustained writer floor, source attribution or workload interval.
The reviewed driver must emit its actual measured-window receipt before clock collection starts.
Do not replace it with `measure_writes.py`, `measure_q_writes.py` or `aa_round2.mjs`.

## Clock under NS load

Set these to the evaluator's actual artifacts, outside any candidate-writable mount:

```sh
export OBS01_NS_MANIFEST=/absolute/evaluator/OBS01-frozen-ns-driver.json
export OBS01_RUN_KEY=/absolute/evaluator/OBS01-scale-clock.key
export OBS01_IMAGE=python@sha256:e48f59cdba69a3cbd9ed2cf0f348d90d45a8d350d98134cf1070bc106ee9ed90
```

In the admitted future window, in this worktree:

```sh
node lab/bin/heavy.mjs --label CX-OBS01-scale-engine -- node lab/bin/engine.mjs up \
  --lane xtdb --slot s1 --holder CX-OBS01-SCALE --cpuset-cpus 0,1 --observation-sources
node lab/bin/engine.mjs observer-up --lane xtdb --slot s1 --holder CX-OBS01-SCALE \
  --image "$OBS01_IMAGE" --observer-cpus 5 --run-id obs01-scale-clock-01 \
  --receipt-id obs01-scale-clock-01 --key-id obs01-scale-clock-01-key --key-file "$OBS01_RUN_KEY"
node lab/bin/heavy.mjs --label CX-OBS01-NS-clock -- node lab/observer/run_frozen_driver.mjs "$OBS01_NS_MANIFEST"
```

Run the driver in its own terminal/process so the following exact command runs **inside its measured
window**, after checking the independently retained measured-window receipt:

```sh
node lab/observer/compare_clocks.mjs 15471 runs/OBS01/scale-clock-comparison.json
node lab/bin/engine.mjs observer-down --lane xtdb --slot s1 --holder CX-OBS01-SCALE
node lab/bin/engine.mjs observer-retain --run-id obs01-scale-clock-01 --holder CX-OBS01-SCALE
node lab/bin/engine.mjs down --lane xtdb --slot s1 --holder CX-OBS01-SCALE --note 'retained NS clock source'
```

The actual watcher samples at 1 Hz throughout the driver run; retain rejected samples too. Repeat at
64, 256 and 1024 readers, fresh run IDs/keys and at least three independent runs. Require actual measured
window alignment and p99 RTT <2 ms; do not infer qualification from accepted-sample-only p99. If the Mac
forward cannot meet the bound, use the VM-local harness reference with independently measured uncertainty;
the resident diagnostic process bracket is **not** a <=1 ms clock qualification.

## A/A cost under the fixed writer trace

For each arm below, the scale owner must restore the **same pinned fixture** and replay the same frozen
trace. Fixture restoration is not implemented by this observer change; do not reuse the growing history
between arms as round 2 did. Retain the reset implementation, its source pins and identical fixture hash.
The manifest's environment must select the stated endpoint; its argv stays unchanged between arms.

| Arm | engine flags after normal slot arguments | observer stream | driver endpoint |
| --- | --- | --- | --- |
| baseline-before | `--observation-sources --observation-features none --diagnostic-direct` | none | native 19471 |
| H1 | same | H1-memory-current | native 19471 |
| T1 | same | T1-wire | proxy 16471 |
| X6 | `--observation-sources --observation-features logs --diagnostic-direct` | X6-log | native 19471 |
| X7 | `--observation-sources --observation-features spans --diagnostic-direct` | X7-spans | native 19471 |
| baseline-after | first row | none | native 19471 |

For each arm, use `engine.mjs up` with exactly those flags, then (except baselines):

```sh
node lab/bin/engine.mjs observer-up --lane xtdb --slot s1 --holder CX-OBS01-SCALE \
  --image "$OBS01_IMAGE" --observer-cpus 5 --observer-streams "$OBS01_ARM_STREAM" \
  --run-id "$OBS01_ARM_RUN" --receipt-id "$OBS01_ARM_RUN" --key-id "$OBS01_ARM_RUN-key" \
  --key-file "$OBS01_ARM_KEY" --max-bundle-bytes 1073741824
node lab/bin/heavy.mjs --label CX-OBS01-NS-AA -- node lab/observer/run_frozen_driver.mjs "$OBS01_NS_MANIFEST"
node lab/bin/engine.mjs observer-down --lane xtdb --slot s1 --holder CX-OBS01-SCALE
node lab/bin/engine.mjs observer-retain --run-id "$OBS01_ARM_RUN" --holder CX-OBS01-SCALE
node lab/bin/engine.mjs down --lane xtdb --slot s1 --holder CX-OBS01-SCALE --note 'retain NS A/A source'
```

For Q3, use lane qlever/s1, `--observation-features none|logs`, stream `Q3-events`, direct port 21071;
compare logging against bracketing baselines with the same native SPARQL update trace. Match the configured
CPU/memory grant across arms, record resident contention, verify sustained correct writer progress and use
at least three runs per arm. Each component's writer commit p99 ratio must be <1.05. Retain all failures,
uncertainty, drift and input-reset receipts. No cost gate is implemented by merely executing the driver.

## Physical erasure: exact available probes and remaining implementation

Physical coverage remains deferred. The existing command below is a **literal positive-control probe**,
not a complete physical erasure qualification:

```sh
node lab/bin/engine.mjs observer-command --lane xtdb --slot s1 --holder CX-OBS01-SCALE \
  --action scan --canary obs01-scale-erasure-canary
```

Start that future observer with `--enable-probes`. Execute the same command before erasure publication
and after cleanup, with a canary actually written through the frozen driver, and retain both replies.
For QLever use `--lane qlever`; a missing vocabulary hit must remain blind. `observer-command` currently
has a 1 GiB per-file limit, so year-one files may refuse. The `utf8-utf16le-utf32le/1` parser supports only
those named encodings, not FSST or freed blocks.

There is **no honest executable full physical-coverage command yet**: a reviewed complete inventory,
FSST/Arrow derived-channel decoders, old-generation/backup/observer-output controls, freed-block collection,
and actual publication/key-destruction witnesses must first be supplied. Once present, pass the frozen
per-stream parser spec with `observer-up --protocol-spec`, then invoke the pinned oracle exactly:

```sh
python3 -I -B runs/OBS01/r3-oracle/observe.py check OBS-ERASURE-SCAN "$OBS01_ERASURE_EVIDENCE" \
  --contract lab/experiments/EXP-OBS01/round3/contract.json --context "$OBS01_ERASURE_CONTEXT" \
  --bundle "$OBS01_ERASURE_BUNDLE" --key-file "$OBS01_ERASURE_KEY"
```

The evaluator context must select `G9.erasure.protected-copies` (O-OBS delegated), bind the actual observed
publication time and enumerate every protected physical copy. This command must refuse/fail blind controls;
a successful literal grep does not replace the missing decoder/inventory work.
