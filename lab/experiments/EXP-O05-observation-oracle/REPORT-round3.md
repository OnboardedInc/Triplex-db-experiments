# EXP-O05 observation oracle, round 3 — CX-O05-R2

North star: correctness floor under P1, P2, P3 and P5. Goals and targets remain `lab/SCOPE.md`, `lab/NORTH-STAR.md`,
`lab/TARGETS.md`. This is builder implementation and gate evidence; independent review and recollection remain separate.

## Inputs

Started from 463703d on `exp/O05-observation-oracle`. Read CX-VO05-2's complete `VERIFY-round2.md` in the review worktree.
The replay reads the retained inputs from review commit `fc4cfb6` using Git's immutable archive interface. No reviewer,
main-checkout, engine or acceptance-status file was edited. This round addresses all three review findings in the evaluator.

## Fixes

**R2-F1:** the full expected-facts comparison was accidentally nested inside the `sourceReadback` branch. It is now
unconditional for every supported transition after the structural checks. Expected facts must be an object. QT5 requires
complete effects/absences arrays for eav/ave/vea and equality across all three paths, in addition to matching the evaluator's
expected contents. Identity, authentication, record hashes and payload shape cannot excuse incorrect contents.
`test_round3.py` exercises all twelve transition schemas with substantive expected payloads, then changes a payload while
leaving expected facts unchanged. Each wrong-content case fails, including request/validation/update/marker/receipt paths.

**R2-F2:** `work_selection` derives the work bar from the bound contract obligation, which must use O-OBS and declare
exactly one supported work threshold. The selected threshold, witness kind and work thresholds in `thresholdIds` must
agree with that declaration. Contradictory unions, missing bars and unrelated obligations refuse. WORK evaluates the
derived bar, not the context's independent selection. Non-work protocols retain their fixed permitted threshold rules;
ACK-ORDER can still consult its legitimate nested WATERMARK bar. Builder work fixtures now bind the genuine reuse or
incremental obligation rather than the unrelated capacity obligation.

**R2-F3:** `ClockBounds` centralizes temporal inequality policy. Every observation event has independent interval
`[t-u,t+u]`; nonstrict order requires `a+u <= b-u`, strict order requires `<`, and a duration upper bound includes `2u`.
Its arithmetic uses rational decimal values. The same helper now governs:

- cancel/drain, caller settlement, transport ACK, reuse and timeout grace;
- complete PREABORT windows and segment overlaps;
- sample order, cadence and coverage edges;
- connection release and possibly post-deadline leaks;
- availability probes and possibly in-window manual restarts;
- maintenance interval, possibly overlapping lag samples and lag p99;
- canary write/find, erasure publication/scan and key destruction ordering;
- wait bound, route containment, publication ACK and subsequent pull ordering;
- transition, crash and durable readback ordering.

Timestamp equalities that bind two references to the same event remain identity checks. Application valid-time inputs
are exact semantic coordinates, not measured observer time. Collector header monotonic timestamps are natively on the
observer clock; bridge send/receive timestamps share the harness clock. Those format-integrity checks keep their explicit
same-clock arithmetic. No correlation between distinct observation events is inferred from equal numeric timestamps.

The new tests include uncertain boundary rejection and successful inside-boundary controls, including complete authenticated
CANCEL and ACK-ORDER bundles with u=1. Zero uncertainty preserves the fourteen protocol positive bundles.

## Conservative coverage consequence

The retained `CANCEL/clock-margin-positive` has a 1998 ms nominal drain with u=1, but samples are 1000 ms apart and the final
sample is exactly drain+5000. It now fails the uncertainty-aware coverage rule: independent endpoints cannot establish
1000 ms maximum gaps or full edge coverage without slack. The replay marks this changed expectation explicitly, without
altering the retained input. It is not a new false PASS. Supporting cancellation of shared clock offsets would require
an explicit, authenticated correlation model, which the present generic context does not contain. The new authenticated
positive instead supplies sufficient deadline, cadence and coverage slack.

## Gates and receipts

All suites use `lab/bin/heavy.mjs`, with more than 5 GiB host free space checked before their work. No engines, containers,
foundation slots, benchmarks, production scanners or live collectors were used.

`evidence/round3-gates-first.json` is retained: existing gates, eleven initial round-three tests and all fourteen omission
mutants passed with stable source. The replay harness stopped before replay on a macOS `/var` versus `/private/var` path
comparison. The second attempt, `evidence/round3-gates-second.json`, also retained stable source and passing semantic gates
(including thirteen expanded new tests), but its replay stopped on the deliberately missing-context input. The harness
now resolves its snapshot root and relocates local path bytes without decoding or repairing malformed contexts. These
are test-runner fixes; neither attempt is represented as complete review replay.

The final source-frozen cohort completed with all six process exits zero and `sourceStable: true`:

| Gate | Result | Evidence under `evidence/` |
| --- | --- | --- |
| Authenticated hand-built fixtures | 96/96 | `round3-final-test_observe.stdout.txt` |
| CLI boundaries | 8/8 | `round3-final-test_cli.stderr.txt` |
| Previous round-two regression suite | 29/29 | `round3-final-test_round2.stderr.txt` |
| New round-three suite | 13/13 methods, including twelve transition variants and authenticated uncertain-time controls | `round3-final-test_round3.stderr.txt` |
| Independent retained reviewer CLI cohort | 306/306 revised expected outcomes; no crashes | `round3-final-replay_review_round2.stdout.txt` |
| Semantic omission mutants | 14/14 wrong-PASS kills, positive controls retained | `round3-final-selfcheck.stdout.txt` |

The independent replay contains all 177 original inputs (all REFUSED/2), the fourteen primary protocol-positive bundles
(all PASS/0), and all nine original false-PASS counterexamples (now FAIL or REFUSED). Overall it returns 29 PASS, 50 FAIL,
and 227 REFUSED. The sole changed positive expectation is the documented insufficient-coverage supplemental control above;
all 276 reviewer-designated negative inputs reject. These cohorts overlap and must not be added as unique case counts.

The full retained review revision is `fc4cfb665212dd9d38ed882c4b799caf3b6c573a`. The replay receipt includes that identity,
archive SHA256, per-case original input hashes, return codes and complete oracle reports. It changes only the snapshot's
local path prefix in context files so the pinned normalizer can run from the temporary read-only-input snapshot. Its raw
chunks, chain/HMAC/seal bytes, expected facts and independent heads remain retained original bytes.

`evidence/round3-gates-final.json` retains Python version, start/end timestamps, free space before execution, every gate's
artifact paths and exact before/after SHA256 pins for all oracle/test Python scripts. The final command was:

```sh
node lab/bin/heavy.mjs --label CX-O05-R3-final -- python3 -I -B lab/acceptance/oracle/gates_round3.py final
```

Python AST parsing and `git diff --check` also passed. The first and second attempt receipts and stderr remain committed;
the final receipt does not replace their failure history.

## Scope and remaining work

No production normalizer, observer sidecar, physical inventory discovery, key custody, clock correlation model or live
engine behavior was built or verified. No root pnpm/package checks were run for this Python-only lab change. No acceptance
pin or obligation was promoted; no main-checkout edit, merge or push was performed. The screening-only qualification tag
remains. A separate reviewer must rerun the source-bound gates and independently collect production evidence before any
acceptance claim. The production collector/parser integration and explicit clock provenance remain open.
