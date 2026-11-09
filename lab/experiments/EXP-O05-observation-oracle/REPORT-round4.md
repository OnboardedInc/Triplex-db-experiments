# EXP-O05 observation oracle, round 4 — CX-O05-R2

North star: correctness floor under P1, P2, P3 and P5. Goals and targets remain `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and
`lab/TARGETS.md`. This is builder evidence for screening, not independent production acceptance.

## Inputs and change

Started from 537adf8 on `exp/O05-observation-oracle`. Read the complete CX-VO05-2 `VERIFY-round3.md`, its context matrix,
coverage analysis and retained evidence from read-only review commit `a036359`. No review or main-checkout file was edited.

R3-F1 is fixed in the common `check()` path, before any protocol handler: the bound obligation must exist exactly once,
its actual contract `oracles` selection must contain O-OBS, the context protocol must match the requested protocol, and
that protocol must be registered in the pinned contract. Any selection contradiction returns REFUSED/2. Valid raw bytes,
HMACs, source kinds, a global O-OBS registry entry or a pending oracle requirement cannot authorize the wrong obligation.
All fourteen protocols inherit the same guard. WORK's additional contract-derived threshold/witness selection remains.
No timing, authentication, expected-content or exact-ratio gate was weakened.

The contract currently represents oracle selection on obligations and protocols in the global `obsProtocols` registry;
there is no separately encoded per-case/per-protocol obligation relation. This change validates the actual represented
selection and matching protocol identity, without inventing mappings by parsing free text or modifying the frozen contract.

## Corrected supplemental positive

`test_round4.py` starts with the retained supplemental cancellation observations and changes only the engine sample times.
The corrected schedule is `100 + 500*i` for i=0..15, ending at 7600. Request remains 102, drain 2100, and reuse 2200; caller
settlement, transport ACK, request/connection identities and successful reuse remain unchanged. Uncertainty stays u=1.
The 1998 ms drain therefore still meets the 2000 ms worst-case bar. The sample cadence and final edge now also have slack.

The test requires the original, cadence-only, and edge-only controls to reject at their intended coverage checks; both
repairs together must pass. It explicitly compares all non-sample observations against the original input. The independent
reviewer's complete re-encoded `coverage-evidence/both` bundle is also replayed as a positive, with original raw chunks,
HMACs, chain, seal, independent heads and expected facts retained in the pinned review commit. The original insufficient
bundle is preserved and still rejects. No threshold, uncertainty value or gate is loosened to make the repaired control pass.

## Gates and evidence

The full source-frozen cohort runs through `lab/bin/heavy.mjs` after checking more than 5 GiB host free space. It includes
all existing gates, the new shared-selection and four-way coverage tests, and both independent reviewer replays:

- Original reviewer cohort: 306 inputs, including all 177 round-one inputs and the fourteen primary positive bundles.
- Round-three additional cohorts: 462 generalized transition/threshold/timing cases, fourteen contradictory contexts,
  and the four isolated coverage controls, for 480 additional inputs.

The first admitted full cohort passed with all eight process exits zero and `sourceStable: true`. There was no failed
round-four gate attempt. Evidence under `evidence/`:

| Gate | Fresh result | Artifact |
| --- | --- | --- |
| Hand-built authenticated fixtures | 96/96 | `round4-first-test_observe.stdout.txt` |
| CLI boundaries | 8/8 methods | `round4-first-test_cli.stderr.txt` |
| Round-two regressions | 29/29 methods | `round4-first-test_round2.stderr.txt` |
| Round-three regressions | 13/13 methods | `round4-first-test_round3.stderr.txt` |
| Common selection and corrected control | 4/4 methods, covering 60 authenticated bundle invocations | `round4-first-test_round4.stderr.txt` |
| Retained original reviewer CLI cohort | 306/306 expected outcomes | `round4-first-replay_review_round2.stdout.txt` |
| Additional reviewer CLI cohorts | 480/480 expected outcomes and intended guards | `round4-first-replay_review_round3.stdout.txt` |
| Semantic omission mutants | 14/14 actual wrong-PASS kills, positive controls retained | `round4-first-selfcheck.stdout.txt` |

The independent CLI denominator is 786: 57 PASS, 172 FAIL and 557 REFUSED, with zero unexpected PASS and zero crashes.
All 177 round-one inputs remain REFUSED/2. All fourteen primary protocol-positive bundles remain PASS/0. All fourteen
unrelated-obligation contexts now return REFUSED/2 specifically at the common authority guard. The generalized cohort's
462 expected outcomes and intended guards remain satisfied. In the four coverage controls, `both` passes, while `original`,
`cadence-only`, and `last-edge-only` fail at the intended coverage checks. The original nine round-two counterexamples
remain rejected. These CLI cohorts overlap the shipped fixtures; their denominators must not be added to unit counts.

The full current review revision is `a036359e0c5df89b31580d15f0e35201b0335649`; the original reviewer inputs are replayed from
`fc4cfb665212dd9d38ed882c4b799caf3b6c573a`. Replay receipts retain archive hashes, original per-case input hashes, process
codes and complete oracle reports. The new replay checks source input bytes after every CLI invocation; only local path
prefixes in temporary context aliases are relocated. Expected facts, raw chunks, chains, HMACs, seals and independent
witness heads are not regenerated or repaired. The review inputs remain read-only.

`round4-gates-first.json` retains Python version, timestamps, host free bytes, artifact paths and SHA256 pins for every
oracle/test Python script before and after all gates. Host free space at suite entry was 20171407360 bytes.
The exact full-suite command was:

```sh
node lab/bin/heavy.mjs --label CX-O05-R4-first -- python3 -I -B lab/acceptance/oracle/gates_round4.py first
```

Python AST parsing and `git diff --check` also passed. The only evaluator implementation diff is the common context
selection check and relocation of the existing protocol registration check into it. ClockBounds and every timing gate
are byte-for-byte unchanged from round three.

## Limits and handoff

No engine, Docker lifecycle, sidecar, production parser, physical scanner, clock bridge service or key custody was built
or verified. No root pnpm/package suite or benchmark was run for this Python-only lab change. No acceptance pin or obligation
status changed; no main edit, merge or push occurred. PASS remains screening-only. A separate reviewer must rerun the revised
source-bound checks; actual collection, production parser integration and explicit clock-correlation modeling remain open.
