# EXP-O05 observation oracle, round 2 — CX-O05-R2

North star: correctness floor for P1, P2, P3 and P5. Scope and targets come from `lab/SCOPE.md`, `lab/NORTH-STAR.md`,
`lab/TARGETS.md`. This round implements Q80a-c and Q82a-e against review F1-F5; it is builder evidence, not independent acceptance.

## Inputs and scope

Started on `exp/O05-observation-oracle` at 6852fc1. Read the orchestrator's main-checkout review, pending rulings and R27 source
research read-only. Retained reviewer inputs come directly from `git show 74d1152:lab/verify/O05/cases.json`; none are rewritten.
The 23 original acceptance discrepancies and all 177 original inputs are covered by mandatory rejection of the old evidence interface.
Additional authenticated fixtures exercise the revised semantic rules so legacy refusal is not the only regression check.

No package contract, engine, shared resident, Docker endpoint, acceptance pin, main-checkout file or external service was changed.
No deployment, push, merge or observer launch was performed. No subagents were spawned.

## Changes

- F1 / Q82c: require evaluator-owned `obs-context/1`, retained `obs-bundle/1`, external 32-byte run key. Validate raw chunks,
  exact header hashes, dense sequence, per-stream chain, header HMAC, independently retained periodic/final witness heads and
  authenticated seal. Pin envelope, contract and bridge bytes in context. Rerun evaluator-selected, hash-pinned normalizer scripts
  on retained raw bytes; reject any supplied records that differ. Bundle-local executable paths and escaping object paths fail.
- F2 / Q80a: protocol, obligation, case, witness kind, run identity, selected thresholds and mandatory case bindings come from
  the evaluator context. Threshold use is checked against its selected set; work witness kind fixes reuse vs incremental bar.
  The obligation's required thresholds cannot be omitted, and RESOURCE cannot substitute a convenient obligation.
- Q82a-b: R27 protocol/engine source cells; EI, TO, HO, DR and restricted caller-only HR, with CR refused. The four safety
  protocols require two different non-HR kinds agreeing on every engine-side field. This is deliberately conservative: evidence
  that cannot reproduce the required independent facts is refused/failed rather than inferred. Datomic CANCEL/PREABORT require
  HO and TO. XTDB X1 mutation evidence names only `node.tx.latestCompletedTxId`. Indirect source strength is visible in output.
- F3 / Q80b: transition-specific concrete payloads and expected readback facts, bound to evaluator operation and position, plus
  post-crash readback identities/times. Every declared transition requires a witness. COMMIT contents, source effects/absences,
  publication markers, request/update/begin payloads, actual receipts and QT5's three access paths replace labels as proof.
- F4 / Q80c: compare all integer work-counter ratios by rational cross multiplication. No binary64 quotient; both exact boundaries
  and the immediately above-boundary large-counter cases are exercised. Maintenance nearest-rank selection also uses integers.
- F5 / Q80b: WATERMARK requires authenticated start/end events with the same read id; the full pre-route duration must equal the
  claimed wait and meet the contract bar. Wait and ACK inequalities include clock uncertainty margins.
- Q82d: evaluator-owned physical scan inventory, mandatory observer/old-generation/freed-block categories, and positive canary
  controls at each location with the same scanner before publication. Blind scans refuse. Existing surviving-plaintext and
  derived-channel checks remain.

## Trust and integration boundary

The context is trusted evaluator input. It must be retained independently with the key, witness log, raw objects and contract;
accepting a candidate-authored context would recreate F1. The offline process cannot establish filesystem ownership or defeat
another process running as the same macOS user. Q82c's separate verifier recollection remains necessary. Every PASS is explicitly
`qualification: screening-only`.

R27 specifies bundle fields, not a machine-readable evaluator context or normalizer invocation ABI. This implementation documents
both in `lab/acceptance/oracle/README.md`. Context-selected scripts are trusted evaluator code, not sandboxed candidate programs;
O-OBS verifies their exact bytes and runs them in isolated Python with raw stdin and JSON stdout. Production parsers must be
reviewed and dependency-pinned separately.

`fixture_normalizer.py` is strictly a decoder of hand-built synthetic observer field-event JSONL. It is not a vendor parser.
This round does not build the collector sidecar, Prometheus/pgwire/HTTP/OTLP/FSST parsers, source-specific coverage acquisition,
physical scanner, clock bridge service or key custodian. No real engine evidence or production completeness is claimed.
Physical location enumeration remains the evaluator's responsibility; broad inventory category labels alone are insufficient.

## Execution and evidence

All test suites run under `lab/bin/heavy.mjs` after checking host free space exceeds 5 GiB. The first admitted fixture run
(`evidence/round2-fixtures-first.json`) failed 0/96 before evaluation: the synthetic key literal was 33 bytes. It is retained.
The fixture was corrected to an explicit 32-byte value; later attempts use new evidence paths.

The first combined suite (`evidence/round2-gates-first.json`) passed 96/96 fixtures, 29 round-two tests and 14/14 semantic
omission mutants. Its CLI suite found two boundary bugs: missing contract thresholds returned FAIL instead of REFUSED, and
non-object evidence reached an object-only lookup. The fixes were made during that admitted attempt, and its source-stability
receipt correctly reports false. That attempt is retained and is not treated as final validation.

After freezing source, the final admitted suite passed with `sourceStable: true`:

| Gate | Result | Evidence |
| --- | --- | --- |
| Hand-built authenticated protocol fixtures | 96/96 expected verdicts, including all 14 protocol positives | `evidence/round2-final-test_observe.stdout.txt` |
| CLI boundaries, malformed inputs, contract authority | 8/8 tests | `evidence/round2-final-test_cli.stderr.txt` |
| Q80/Q82 trust, ratio, source, witness, wait and canary regressions | 29/29 tests; includes all 177 retained reviewer legacy cases refused | `evidence/round2-final-test_round2.stderr.txt` |
| Semantic omission mutants | 14/14 killed by actual wrong PASS with positive controls intact | `evidence/round2-final-selfcheck.stdout.txt` |
| Source stability and all process exits | All four gates exit 0; Python source bytes unchanged | `evidence/round2-gates-final.json` |

The final receipt retains Python version, start/end times, host free space (over 5 GiB), SHA256 of every oracle/test Python
source before/after, and exact gate artifact paths. The command was:

```sh
node lab/bin/heavy.mjs --label CX-O05-R2-final -- python3 -I -B lab/acceptance/oracle/gates_round2.py final
```

`git diff --check` and Python AST syntax parsing also passed. No root pnpm/package/engine suite was run: this changes only the
Python lab oracle, fixtures, documentation and report. No engine behavior, physical scan, live timing or sidecar collection was
verified. The 177 legacy refusals establish rejection of the obsolete interface; authenticated synthetic regressions and semantic
mutants provide the separate evidence for the new implementation paths.

## Outstanding review

A separate reviewer must review and rerun this branch, including the evaluator trust boundary, production parser selection,
source-kind independence and source-specific semantic adapters. No obligation is closed or promoted by this builder report.
