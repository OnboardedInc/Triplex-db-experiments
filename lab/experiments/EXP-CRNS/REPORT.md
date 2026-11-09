# EXP-CRNS (CX-CRNS): R44 B5 offline recompute

North star: P1–P5, with P3 first. Scope and bars: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; design: R44 sections 4 and 8.2 B5, pending Q99b and Q100e–p.

Implementation is in `lab/bin/claim.mjs`; fixtures in `lab/bin/test/claim-ns.test.mjs`. No engine, box, Docker, slot, dependency, package, or acceptance-contract change. No merge or push. The builder checks below are not independent reviewer acceptance.

## What is implemented

- `recomputeNS`: pure authenticated, canonical-JSON normalized E1–E11 boundary with exact attempt/source/slot/input binding, pinned driver and encoding identity, witnessed chunk head, per-chunk HMAC/hash/previous-head validation, and a common clock domain. Rejects summaries instead of raw streams.
- Proposed `feed-entry/1` encoding: sorted-key UTF-8 JSON of strict identity-only entry/transaction/change fields, without whitespace or trailing newline. `NS_ENCODING_SHA256` identifies the encoding description. A contract builder must pin this specification and evaluator implementation together; this is not a claim that FD01 already uses these bytes.
- P3: source prefix reconciliation including lost ACKs and foreign commands, resolved offsets, exact delivery digests, consumer WAL-tail/final-prefix comparison, committed-mutation/final-row reconciliation, frontier range consistency, committed effect insertions including delete/reinsert and final duplicate rows, per-position evaluator-invoked domain affected/effect set comparisons, conservative source/consumer brackets, exact nearest-rank pooled/steady/burst lag and midpoint/width reports, measured reader share, CR tolerance, clock separation, recovery witness uniqueness and byte-exact replay. Count results remain available when timing is unjudged.
- Broker CRC32C byte verifier independently checks frame header, payload and chaining, adapted from the documented SQL01/P2Q frame format. Other source formats require evaluator-owned source verification. No candidate module is imported.
- P2: scheduled-offer latency per size band (censored attempts contribute infinity), accounting, valid-command progress via evaluator oracle, publication/ACK ordering including undecided brackets, receipt equality, evaluator RYOW, queue depth and burst drain.
- P1: every supplied read checked by requested subject/shape/basis key against evaluator oracle; correctness-qualified goodput; matched raw ladder segments, writer ratios, 256/1024 goodput, maintenance and recovery checks. Evaluates all keys rather than sampling above 2 million.
- P4: single-loop pull latency, exact frozen fact/hop bucket mix, cpuset and CPU-second throughput, resource/scan counter deltas, matched 1,000-subject depth 1/3/10 latency and bytes checks.
- P5: activation basis, pinned subject coverage, per-subject evaluator domain output/outbox comparison for all 100k subjects, sweep duration, raw matched live read/writer comparison.
- `nsControlRecord`: Q99b's bound A0 rung diagnostic record for absolute claims. Comparative/promotion controls still require paired matching rungs. Records explicitly say `PENDING-CONTRACT`.
- F1–F20 CX fixtures, extra authentication/WAL/CRC/binding/crash variations, exhaustive bounded range and duplicate properties, quantile boundaries, P1/P2/P4/P5 arithmetic and 100k-subject sweep fixtures.

## Authority and integration boundary

These exports produce `RECOMPUTED` or `REFUSED`, never PASS/QUALIFIED. They are not connected to `admitCore`, `gateNS`, or `qualifyClaim`: pending rulings are explicitly not admission authority in the existing evaluator. Thus gateNS still ends at MEASURED; this branch provides B5 arithmetic and records for the later contract/executor integration, not an NS acceptance closure. The A0 rung helper replaces a control refusal only in the proposed pure diagnostic interface; current comparative admission behavior is unchanged.

Inputs are **normalized evaluator events**. The sealed chunk envelope here is `ns-events/1`, not a parser for OBS01's native `obs-bundle/1`. The collector/O-OBS adapter must authenticate the original bundles and independently rerun pinned normalizers before creating these normalized events. HMAC checks prove retained bytes and bindings, not that a normalizer correctly decoded SQLite. WAL bytes are compared to retained tail bytes and normalized mutation/final state is reconciled, but this code does not itself decode SQLite WAL pages. Source frame payload-to-identity normalization is also an adapter responsibility. Raw poll sequence-to-bracket derivation, OS cgroup witness validation, actual R22 grade derivation, and oracle process pin/copy execution are evaluator-supplied capabilities, not candidate JSON fields. The `trusted` object must never be loaded from a claim. The tests invoke real O-DOMAIN for the C34 fanout at every fixture position; the generic read/command/sweep adapters use deterministic evaluator-owned stand-ins in arithmetic tests. No production oracle adapter is claimed.

P1 ladder callbacks do not prove actual 256/1024-loop activity in every auxiliary segment; these need the collector's E8 records. P4 sample membership and P5 activation/traffic coverage need the frozen run plan's identity checks in the adapter. These arithmetic checks alone cannot establish complete workload coverage. No year-one/256-reader acceptance, real 20-minute screening, live durability, VM run, full package check, or independent review was performed.

## Retained P3M input

First real input: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P3M/g0-fixtures/32374b5b-2be8-406d-80bd-15fdee22126c/{observations.json,receipt.json}`. The test verifies the observations bytes against the historical receipt's bound SHA256, ignores supplied lag sample/summary numbers during recomputation, computes all quantiles from `known.atNs - publication.atNs`, then compares pooled/steady/burst values with the bench receipt.

P3M predates observer-bracket timing and O-DOMAIN/WAL evidence. `recomputeP3MDiagnostic` therefore returns `DIAGNOSTIC / LAG-START-CR`, never upgrades historical evidence. Agreement of those numbers validates arithmetic only. The R44 conservative-bracket and domain recompute is exercised by fresh synthetic fixtures, not retroactively attributed to P3M.

## PASS/verdict audit (rule 9a)

Every new observation-to-result site:

1. `recomputeNS` final status and P3 bars: content from authenticated exact raw payload, delivery encoding, source entries, WAL reconciliation, ranges, insertion history and evaluator domain results; freshness from the evaluator's witnessed head and exact attempt; binding to expected source/slot/input/driver/encoding/clock. Any reason keeps status REFUSED. Timing is nullable and requires evaluator GREEN and no crash. RECOMPUTED is arithmetic only.
2. `nsConsumerCounts`: content from all committed insertions and transaction ranges plus final rows; no standalone PASS. Freshness/binding inherited from the recompute envelope. Exported standalone counts have no acceptance authority.
3. `nsVerifyBrokerFrames`: content CRC/header/payload/previous-chain checks; no standalone verdict receipt. Freshness/binding inherited from caller envelope; normalizer still must prove payload interpretation.
4. `nsOtherPriorities`: P2/P1/P4/P5 comparisons check raw scheduled/receive times, oracle answers, receipt equality, sample keys, coverage and observed counters. Freshness/binding inherited from the envelope. Missing capabilities/data refuse. No independent acceptance authority; adapter limitations above remain.
5. `nsP1Ladder`, `nsP4History`, `nsP5Traffic` `met`: content from matched raw windows and exact denominators, source-bound when called under recompute; standalone calls do not authenticate inputs. They cannot qualify a claim and must only receive evaluator-owned data.
6. `nsControlRecord`: content requires bound measured A0 rung and matching paired rung or GREEN A/A absolute fallback; exact attempt/source/slot/input binding checked. Explicit PENDING-CONTRACT record, no admission result.
7. `recomputeP3MDiagnostic`: content from full timestamp events; historical observations hash verified by test against its retained receipt. Historical freshness only, explicitly DIAGNOSTIC; never this attempt's measurements.
8. Test assertions/TAP: actual function/child execution in this attempt, exact expected values and refusal codes. Synthetic identities are test identities. A passing test is not an NS PASS or independent verification.

The existing `admitCore`/`qualifyClaim` verdict sites were not edited.

## What the next contract must add (rule 9b)

Do not simply enable these exports. Review Q99b and Q100e–p, then pin: complete feed-entry/1 byte specification and implementation; normalized E1–E11 schema and envelope/adapter format; driver image/bundle/frozen generator; source/consumer SQL normalizers and O-OBS invocation; source frame normalization and initial/final chain proofs; complete WAL reconstruction and poll-to-bracket rules; exact clock identity; run-plan/sample/schedule identities; source-bound O-DOMAIN/O-REPLAY adapters at every position/requested basis; real sequential A/A GREEN grader; crash witness schedule/DR/gone/replay checks; A0 rung registry/proof and absolute-kind route; the evaluator/oracle files and independent verifier registry. Bind auxiliary ladder/history/no-sweep run inputs and workload denominators before admission. Keep comparative/promotion paired requirements.

Changed-file SHA256 evidence is in `evidence/source-hashes.json`. Acceptance files are unchanged. The scan checks both exact keyed paths and old content-hash occurrences in obligations/load-contract; it does not treat prose mentions as file pins.

## Checks and retained attempts

- `evidence/ns-attempt1.tap` through `ns-attempt5.tap`: incremental offline fixture executions (28 through 37 tests, all passed at their respective revisions). Final source-bound results will be appended after committing evaluator bytes.
- `evidence/evaluator-attempt1.tap`: 108 tests, 76 passed / 32 failed because the evaluator's uncommitted claim.mjs did not match HEAD (Q75a); this first failure is retained. Corrective action: commit implementation, run the supported restore-evaluator command, rerun both full suites against committed bytes.

The service-capacity interruption ended the tool session for `final-attempt1.tap` after the 37 new tests, without a whole-suite terminal summary or retained exit code. It is incomplete, not a whole-suite PASS. `final-attempt2.tap` reruns the same three suites on the exact committed implementation, after `evaluatorIntegrity()` confirmed no problems. No evaluator code changed between these attempts.

Implementation checkpoint: `d1baf2295bc274c62eafe7dd75b6a4d42d5fa140`. The final documentation/evidence commit leaves those evaluator bytes unchanged. The normalized event and trust boundary is documented in `SCHEMA.md`.

Changed evaluator path (not found as a content-hash pin in the current obligations/load-contract):

| Path | Old SHA256 | New SHA256 |
| --- | --- | --- |
| `lab/bin/claim.mjs` | `0577b9ca68bda21f57df574bdeff501a0869dd06af4ad63300ce33eb1402229c` | `6806dcd852657e15d8b83c9138c42bc25d48afd46f3f51f884ebb04f787d9a30` |

No currently pinned file was moved by this change. The contract builder must add the new recompute/encoding/adapter pins before acceptance use. Existing contract/reference behavior remains unchanged.

Final verification on the committed evaluator completed:

- `node lab/bin/heavy.mjs --label CX-CRNS-final-retry -- node --test lab/bin/test/claim.test.mjs lab/bin/test/claim-round2.test.mjs lab/bin/test/claim-ns.test.mjs`: **exit 0, 145/145 tests passed, zero failed/skipped/cancelled**, 179.689 seconds. This includes both original evaluator suites in full plus 37 CR-NS tests. Terminal TAP: `evidence/final-attempt2.tap`.
- All F1–F20 fixtures refused with their expected code; the positive fixture invokes the actual O-DOMAIN child at each committed position. Historical P3M pooled/steady/burst numbers compare exactly with the retained bench receipt.
- `node --check` passed for evaluator and new test module. `git diff --check` passed. `evidence/source-hashes.json` was read back and matches the evaluator file. `git diff -- lab/acceptance` is empty.
- Every evidence file is below 1 MB and the whole evidence directory below 5 MB; no bulky raw evidence was added to git. `SHA256SUMS` covers the retained evidence, schema and report; `evidence/verification.json` binds the successful command, exit status, test counts and committed evaluator hash.

Result: B5 offline implementation and requested offline gates completed. No NS acceptance cell is closed. Pending-contract integration and independent review remain as described above; the branch is ready for the separately dispatched reviewer.
