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

# Round 2: independent-review fixes (CX-CRNS)

North star: trustworthy P1–P5 arithmetic, with no vacuous or identity-pooled bar. Scope remains the current SCOPE/NORTH-STAR/TARGETS.
No acceptance file, engine, slot, package dependency or public API was changed. Original Opus review files were committed **unchanged
first** at `255bf136`; their historical TAP is retained, not relabelled as a fixed run. The source review was Codex `verify/CRNS`
`93d2af9c` plus the independent Opus review preserved in that commit.

## Findings, fixes and required tests

The six Codex assertions were copied with their fixture to `lab/verify/CRNS/`. Assertions still require refusal; fixture upgrades
supply newly mandatory evidence. Positive controls that intentionally change source/WAL bytes now update those retained bytes too,
and the R01 diagnostic message tolerates absent metrics on an earlier refusal. The Opus TODO tests are all required: no todo/skip
flags remain. Contradictory historical-observation preconditions (for example O8 asserting both presence and absence of a code)
were removed. Positive ladders now have actual loop completions; O11 explicitly removes those to plant its forgery. Each original
review is recoverable byte-for-byte from its review commit.

| Finding | Fix | Required regression/control |
| --- | --- | --- |
| R01 | Nonempty in-window main E2; re-derived E8; exact main/ladder segment binding | copied R01; round2 positive P1 and removal tests |
| R02 | Each checkpoint names a resolved source prefix, final frontier exactly terminal; pinned initial frontier | copied R02; round2 resolved seal control |
| R03 | Pin consumer and per-position epoch; no cross-identity pooling | copied R03; O26 |
| R04 | Main reads entirely within measurement interval; boundary-spanning evidence refuses explicitly | copied R04; sequential in-window C16 |
| R05 | Unique read id and no overlapping requests in single-client P4 | copied R05; C16 |
| R06 | Exact source/consumer CR role coverage per committed position, known enum, unique keys | copied R06; O20 |
| O1 | One commandId in only one committed source transaction | required Opus O1 (DUPLICATE-COMMIT) |
| O2 | Refuse typed error/conflict on a committed command; valid rejection gets infinite latency | required Opus O2 (ERROR-BUT-COMMITTED) |
| O3 | Restore E1 kind; published duplicate/retry must return original receipt | required Opus O3; lost-ACK regression |
| O4 | Pin consumer and source epoch before counting/sets; invalid labels never grant a count bar | both required Opus O4 variants; R03/O26 |
| O5 | Source offset order and position order agree; coordinate stream/epoch/offset checked | required Opus O5 and O5b; resolved frontier control |
| O6 | Always execute accounting/progress/ACK source preconditions, including P3-only | required Opus O6a/O6b |
| O7 | Explicit resume bar, independently recomputed crash companion, aggregate P3 met requires it | required Opus O7; builder crash control |
| O8 | Exact checkpoint-to-recovery replay equals both source interval and anchored committed WAL deliveries | required Opus O8; crash companion controls |
| O9 | Consumer bracket required through drain for every committed position, including outside lag window | required Opus O9 |
| O10 | Expected-answer memo uses full semantic request, including hops; basis-clipped prefix | required Opus O10 |
| O11 | Ladder levels checked against per-second actual E2/E8 completions, not level labels | required Opus O11 |
| O12 | Main E8 derived from distinct completed E2 loops; declarations reconciled exactly | required Opus O12; F13/R01 |
| O13 | History answers oracle-checked; IO comes from observer phase deltas | required Opus O13; round2 wrong-answer regression |
| O14 | Sweep traffic inside sweep, baseline outside; measured 64 loops and correct answers | required Opus O14; upgraded P5 positive control |
| O15 | Activation position/source command/release pin; durable end bracket and evaluator verification | round2 O15 three variants; upgraded 100k control |
| O16 | Oracle prefixes clipped by position/basis/pre-offer visibility; real O-DOMAIN world derived from prefix | required Opus O16; real-child state-prefix assertions [1,1750],[2,1800] |
| O17 | Full trace command digest and separate identity change digest compared with decoded source content | required Opus O17; round2 coherent rewrite and full-value digest variants |
| O18 | Source normalization required for broker too, in addition to CRC | required Opus O18/O25; round2 source decoder check |
| O19 | Required evaluator WAL decode must reproduce every transaction and final row | round2 O19; synthetic decoder positive controls |
| O20 | Mandatory E11 coverage for source and consumer | round2 O20/R06 |
| O21 | Positive pinned schedule-derived lag and band minima, missing/short sample refuses | round2 O21 variants |
| O22 | Undecided ACK share reported and refused; pinned max bracket width | required Opus O22 |
| O23 | Unique E1 eventId/E2 readId, including P3-only and auxiliary windows | round2 O23 variants |
| O24 | Unique nonempty window ids and explicit recoveryOf | required Opus O24 |
| O25 | Storage kind pinned by evaluator, never selects a less strict verifier | required Opus O18/O25; round2 storage pin variant |
| O26 | Expected consumer/epoch checked before affected set can count | round2 O26; R03 |
| O27 | Hot-set and split-straddle evidence; largest bucket bar must be evaluator-pinned | round2 positive P1/removal variants and P4 bucket regression |
| O28 | Exactly one domain per pinned participating role | round2 O28 variants |
| O29 | Absolute baseline floors beside P1 writer, P4 depth-1 and P5 live ratios | required Opus O29a; round2 P4/P5 variants |
| Lost ACK also-noted | Resolve original censored lost-ACK attempt through later receipt, preserving original E1 bytes; latency ends at resolving ACK | round2 lost-ACK positive and typed-duplicate negative |

## Design/ruling amendments for the contract builder

- **R44 4.3/Q100p (O10):** replace `(subject,shape,basis)` memo identity with the complete semantic request, explicitly including
  hops and every projection/query parameter. Observation/scheduling identifiers do not change the query.
- **R44 4.2/Q98f (O1/O3/O17):** one logical command commits once. E1 includes unique event id, kind and a full frozen command hash;
  source decoder recomputes that hash from actual retained command bytes. A separate canonical identity-change digest binds the
  value-free feed. Lost ACKs resolve against retry receipts without inventing an original ACK.
- **R44 4.2/Q100j (O7/O8):** distinguish crash count/resume recomputation from primary timing judgment. Primary P3 requires a fresh,
  separately authenticated crash companion with the same build/source/slot/input identity. Crash-only results cannot grant lag or
  whole P3. Complete recovery intervals are anchored to committed WAL checkpoints, not arbitrary listed entries.
- **Q100e/k/m (O11/O12/O20/O21/O22/O28):** pin sample minima from the frozen plan, max bracket width, participant roles, complete CR
  coverage and per-window actual completion identities. Undecided ACK order cannot be an order pass. Main boundary-spanning reads
  refuse rather than disappear; collector scheduling/censor rules must account for them explicitly.
- **P4/O27:** no new implicit target is introduced. The largest-bucket threshold is required as an evaluator pin; Sam/contract
  authority must confirm its value. Tests pin 50ms only as a synthetic fixture choice. Until pinned, P4 refuses the missing bar.
- **O13/O14/O15/O18/O19/O25/O29:** mandatory production decoder, resource-phase, activation, durability and baseline inputs replace
  the round 1 adapter promises. They must be reviewed/pinned before integration; synthetic JSON decoder fixtures are not SQLite
  decoder qualification. Absolute baseline floors must accompany ratios.

`SCHEMA.md` round 2 section supersedes conflicting optional-input statements in the original schema. These amendments are listed
here only; `lab/acceptance/` is untouched, and neither pending authority nor arithmetic results can qualify an acceptance claim.

## Round 2 PASS/verdict audit (before implementation commit)

All new/changed observation-to-decision sites, including standalone helpers:

1. `recomputeNS` envelope/source/storage/command/coordinate/frontier/identity/CR floors: checks actual authenticated bytes,
   decoded source commands and rows against pinned trace/config. Exact witnessed head and attempt bind freshness; expected source,
   slot, inputs, driver, encoding, storage/stream/consumer/epoch/roles bind scope. A missing capability is a refusal.
2. `nsOtherPriorities` unconditional source preconditions: checks per-attempt kind, content hash, oracle validity and matched
   receipt; errors on committed commands refuse, no censored valid command disappears. Prefix is pre-offer/captured basis.
   Freshness and identity inherit the authenticated attempt. P2 samples require schedule minima before arithmetic is accepted.
3. `nsReaderEvidence`, `nsReadSample`, `nsSegment`, `nsP1Ladder`: check nonempty, unique, in-window raw events and actual per-second
   loop identities, complete semantic query answers, main/auxiliary membership, explicit recovery and absolute baseline. Helpers
   alone are arithmetic on caller data; under recompute they inherit the exact authenticated input/attempt binding.
4. `nsP4History` and P4 branch: answer hashes match evaluator oracle at the bounded basis, history subject sets match, IO is
   observer phase counters, baseline absolute bars hold, and single-client requests are sequential/in-window. Resource evidence
   has the same attempt envelope; missing resource/oracle inputs refuse, never supply a default value.
5. P5 branch and `nsP5Traffic`: activation belongs to the trace command at the committed position and release pin; durable end
   verified by evaluator, every output/outbox compared at that basis; traffic is inside/outside the sweep and has 64 measured
   loops, correct answers and baseline absolute bars. Raw times and source input are freshly envelope-bound.
6. `bars.P3.resume`/`met`: re-executes the sealed companion, never accepts an inline verdict. Different exact attempt, identical
   build/source/slot/input identity; no companion chain. Witness hashes are unique, actual source/WAL recovery intervals equal,
   whole crash counts clean. Invalid primary evidence cannot yield a true aggregate bar. A crash RECOMPUTED only judges counts
   and resume, with lag null; primary whole-P3 requires GREEN lag and valid companion.
7. Existing `nsConsumerCounts`/CRC and historical P3M helper: still no standalone acceptance authority. Caller-bound decoding
   is now mandatory; P3M remains historical DIAGNOSTIC. No past receipt or test result is adopted as fresh execution.
8. Required reviewer/builder assertions and TAP: compare actual results, exact codes and positive controls from this attempt;
   all TODO flags removed. Preserved historical reviewer TAP remains historical. Passing builder tests is not independent review.

The original admission/reference verdict sites remain unchanged. No source/SQLite decoder, OS proof collector or production oracle
adapter was implemented in this pure-function round; they are now **mandatory checked dependencies**, not optional exemptions
that produce a successful recomputation without their output. No live engine/durability/acceptance run was performed.

Round 2 final validation and changed evaluator hash will be recorded after committing the implementation (Q75a requires that).

Round 2 changed evaluator path: `lab/bin/claim.mjs`, old SHA256 `6806dcd852657e15d8b83c9138c42bc25d48afd46f3f51f884ebb04f787d9a30`, new SHA256 `0ac41f01b4e2dbdd04db64654eb47310ea07346aaf90aada65a7ae829299f892`. No old evaluator content-hash pin occurs in the current obligations/load-contract; no acceptance file was edited. The contract builder must pin the reviewed final evaluator and mandatory adapters before use.
