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

R44 section 4 now carries an explicitly proposed B5 round 2 design amendment note and the P1 request-key correction. Original evidence/history is preserved; no acceptance ruling or target was changed.


## Round 2 final validation

Implementation commit: `31e22e3c97e03ff79d2344fc749ae1b21817b329`; the final report/evidence/design-note commit leaves evaluator
and test bytes unchanged. Before the run, evaluatorIntegrity reported no problems at that exact commit.

Command (through the canonical heavy-job limiter, host free space checked above 5GiB):

```sh
node lab/bin/heavy.mjs --label CX-CRNS-r2-final -- node --test \
  lab/bin/test/claim.test.mjs lab/bin/test/claim-round2.test.mjs \
  lab/bin/test/claim-ns.test.mjs lab/bin/test/claim-ns-round2.test.mjs \
  lab/verify/CRNS/review.test.mjs lab/verify/CRNS-opus/forgeries.test.mjs
```

**Exit 0: 213/213 passed; zero failed, cancelled, skipped or todo; execution 230.279 seconds** (heavy-slot waiting is retained in
the log). This contains the unchanged 108 original evaluator-suite tests, all 37 original CR-NS tests with stronger positive
fixtures, the 22 copied Codex-review tests, all 30 now-required Opus tests, and 16 additional round 2 regressions. Thus the original
145 test cases remain covered. Exact TAP and source-bound receipt: `evidence/round2/final-attempt1.tap`, `evidence/round2/verification.json`.

Incremental failures were fixture/schema transition failures and are retained in `attempt1-focused.tap` and
`diagnostic-*.tap`; subsequent focused attempts progressively passed 89, 104 and finally 105 tests before the source-bound full
run. No failed attempt was overwritten. Original Opus review/TAP remain historical. No reviewer verdict is relabelled ACCEPT.

Syntax checks, `git diff --check`, unchanged `lab/acceptance/`, and evaluator hash readback passed. All single evidence files are
under 1MB and the complete retained evidence is under 5MB. The root SHA256SUMS is refreshed for current report/schema/evidence;
`SHA256SUMS.round1-at-2f299bfa` is the immutable historical manifest for that old commit, not a claim about today's report bytes.

Result: every R01–R06 and O1–O29 finding is mapped above to code and a required test; the lost-ACK false refusal is also corrected.
The implementation is ready for a separate independent round 2 review. No acceptance cell was closed, no engine/VM/box/live
workload was run, no production normalizer/oracle/collector was qualified, and no acceptance contract was edited. Production
adapter qualification, amended rulings/pins and confirmation of the P4 largest-bucket threshold remain with their owners.


Final receipt audit addition (rule 9a): `evidence/round2/verification.json` records only the observed exit-0 full run, exact terminal
213/213/0/0/0 counts, fresh attempt log hash and current tested source hashes at implementation commit 31e22e3c. Its command is the
actual heavy-limited command above. Freshness is this new round2/final-attempt1 output, not the retained historical/reviewer TAP;
binding is the exact implementation/test hashes and explicit offline/no-acceptance scope. SHA256SUMS readback checks the committed
artifacts; it is an integrity manifest, not an NS verdict or independent reviewer receipt.

# Round 3: re-review fixes (CX-CRNS)

North star: correct P1–P5 evidence throughout the measured workload. Scope/targets remain SCOPE/NORTH-STAR/TARGETS. No acceptance
file, package/dependency, engine, box, slot or VM change. Opus re-review files were committed **unchanged first** at `e328de31`.
Codex input: `verify/CRNS` `0d298c89`, VERIFY-round2.md (R01–R06 fixed, N01 still HIGH). Reviewer historical TAP is retained.

## Finding-to-fix table

| Re-review finding | Fix | Required regression |
| --- | --- | --- |
| Codex N01, P5 missing 99 seconds | Denominator is the full verified sweep; exact interval, pinned 1-second sampling, each period has 64 correct readers and writers | copied round2 N01/C02/C03 controls; new round3 N01 includes a missing final second and missing writer period |
| High 1 / V-O6: garbage readers count as P3/P2 load | Always oracle-check every counted main read and echoed basis for all priority sets | required V-O6; new NF1 |
| High 2 / V-O7: crashes before traffic/unrelated resume range | Unique planned injection/time; crash inside traffic; before-U <= crash < recovery-L; decoded point snapshot and exact WAL/source range | required V-O7; NF2 time/id/bracket/snapshot variants |
| High 3 / V-O2b: source published before offer | Refuse PUBLISHED-BEFORE-OFFER against the first attempt; no queue clamp for pre-applied commands | required V-O2b; NF3 |
| High 4 / V-O2: invalid command committed | Refuse INVALID-COMMAND-PUBLISHED even with a valid-looking receipt | required V-O2; NF4 |
| Medium 5 / V-O6c: arbitrary lag minimum | Frozen scheduled valid-command population; outside-window publication remains infinite lag; minimum map must match frozen counts | required V-O6c/control; NF5 |
| Medium 6 / V-O29,V-O14: baseline inflation below absolute bars | Pin a prior/A0 calibration record; compare observed baseline with actual raw prior budget before ratios, for P1/P4/P5 | required V-O29/V-O14; NF6 and P4 sub-bar variant |
| Medium 7 / NF2: crash-only RECOMPUTED looks like grant | Separate CRASH-RECOMPUTED status; lag:null, composite met:false; only that status can establish a primary companion | required crash-only NF2; own NF7 |
| Medium 8: fixture pins derived from observations | Immutable separately authored builder/Opus trace profiles exist before judged source construction; no observed entries/rows used for expected pins | NF8 calls completeFixture after corruption and confirms unchanged pins plus SOURCE-CONTENT-MISMATCH |
| Medium 9: weak/unpinned companion context | Pin crashAttemptId; every context field equal except key/head, attempt id and primary wrapper; no shared mutable context snapshots | NF9 reader/identity/command/minimum/oracle/attempt variants |
| Low 10 / V-O1: duplicate under fresh logical id | Every duplicate/retry requires a strictly earlier attempt with identical commandId | required V-O1/V-O3; NF10 |
| Low 11 / V-O5/O17: reversed subject offer order | Conservative refusal of reversed first-offer order; proposed ruling recorded below | required V-O5/O17; NF11 |
| Low 12 / V-O10: mismatched basis form empties prefix | Refuse BASIS-FORM-MISMATCH before oracle invocation | required V-O10 |
| Low 13: old tests pass for unrelated failures | Complete valid inputs and exact own refusal codes for O8/O13/O14/O17/O18, with positive controls | revised five round-1 tests; reasons-audit-attempt2.txt |

The 16 Opus variants now have no TODO flag. The five old regressions specifically require: O8 FAULT-WITNESS-INVALID with a
range-content detail (not absent fields); O13 P4-HISTORY-ANSWER-MISMATCH; O14 P5-LIVE-TRAFFIC-NOT-VERIFIED with full interval and
calibration supplied; O17 SOURCE-CONTENT-MISMATCH against independently fixed content; O18 SOURCE-NOT-VERIFIED from an actual
synthetic broker-frame decoder after a RECOMPUTED control (not the storage pin). The reasons-audit script is refreshed from those
current tests, not its former stale fixture copy. Its original pre-edit form is preserved at e328de31.

## Design amendments and integration boundaries

- Lag population changes from observed source-L membership to frozen scheduled valid commands. Late publication is retained as
  infinity, not omitted. The contract builder must amend R44/Q100e/Q100p semantics and pin the complete trace preimage/attempt plans.
- P5 coverage is the entire sweep, with complete declared sampling periods; no auxiliary-subwindow inference. Baselines are from
  independently pinned A0/calibration raw records per Q99b. Missing authority/calibration/sampling input refuses.
- Crash-only status and the composite primary result are separate. Named fault-point proof uses absent/uncommitted/committed
  snapshot state consistent with one atomic consumer transaction. The review's example of committed effects without a committed
  checkpoint cannot hold for FD01; this implementation does not weaken atomicity to manufacture that observation. Production
  inability to see uncommitted effects remains an explicit refusal/residual, not a passing hook label.
- Conservative per-subject first-offer-order refusal is a proposed amended ruling, not an assertion that the existing contract
  already rules on concurrent open-loop commands. A different policy needs an approved explicit plan; unknown ordering cannot pass.
- Production source/WAL/fault snapshot decoders, collector, oracle copies and calibration authority must still be independently
  pinned/qualified. Synthetic byte codecs and constant prior-calibration inputs are tests only. No acceptance path is enabled.

## Round 3 PASS/verdict audit (before implementation commit)

1. `nsTraceAttempt` and scheduled lag selection: content matches immutable frozen command/schedule/window preimages and attempt;
   traceSha256 is in the exact authenticated binding. Samples cannot be reduced by source timing or a supplied small number.
   Source/slot/input/build/driver/clock binding and fresh witnessed head remain mandatory.
2. `nsOtherPriorities` reader correctness, command validity, first-offer publication, retry origin and subject order: compares
   observed bytes/times to oracle/request/receipt and frozen ids before arithmetic can grant a bar; source prefix is clipped.
   Every priority set runs these checks under the same exact authenticated attempt.
3. Fault loop and `nsSameCompanionContext`: actual unique injection and cgroup events, in-traffic times, consumer brackets,
   decoded point snapshots, source/WAL anchors and complete replay agree. Frozen injections/attempt id and all context settings
   bind the scope; a distinct attempt is independently re-evaluated, never a copied result or best-of-N supplied verdict.
4. Result status: clean crash data produces CRASH-RECOMPUTED only, lag remains null and composite met false. Primary RECOMPUTED
   still needs every source/read/count/lag check and a valid pinned companion. Missing bar values cannot imply met.
5. `nsCalibration`, P4 history calibration and P5 traffic: actual content-addressed prior raw samples match expected authority
   binding and GREEN record. Current workloads/phases/sample subjects match; current baselines cannot inflate past that budget.
   Records are trusted prior authority inputs, explicitly distinct from fresh run measurements; they are never relabelled fresh.
   Current timing/counts remain from this attempt. P5's full interval and all reader/writer sampling periods are checked.
6. Test fixture and assertion sites: expected trace/identity/content/schedule/calibration objects are authored independently of
   judged source/rows. The separate crash trace has its own events and scoped witnesses; context snapshots retain no shared mutable
   pin objects. Every forgery test is required and the five named older tests assert their exact code. Fresh test output is builder
   verification only. Preserved reviewer TAP and first failed fixture-transition runs remain historical, never accepted as fresh.
7. Updated reasons-audit script: executes current required assertions, records actual reasons, and exits nonzero on any failed
   assertion. Attempt 1 failed on a stale generated audit copy (P4 calibration argument), is retained, and attempt 2 uses the fixed
   current test source. It is a code-specific diagnostic, not an NS receipt or independent review verdict.

Original `admitCore`/`qualifyClaim` decision sites and `lab/acceptance/` remain unchanged. Final execution results and hashes follow
only after evaluator bytes are committed for Q75a. No live/production acceptance or independent reviewer ACCEPT is claimed.

Round 3 evaluator hash: `lab/bin/claim.mjs`, old `0ac41f01b4e2dbdd04db64654eb47310ea07346aaf90aada65a7ae829299f892`, new `1958810e9deb4ece3f3151c1d7268aa626d645cc3cd61012d784a79b0609d9a6`. No old evaluator hash occurs as a content pin in obligations/load-contract; no acceptance file was changed. Re-pinning remains with the contract builder.

Round 3 checkpoint follow-up, audited before the next source commit: the first source-bound run at 933b11f2 passed 255/255
(exit 0, final-attempt1.tap). Inspection then justified two additional NF2 content checks: a witness must name the **latest**
consumer checkpoint visible by its crash time, and the crash must lie inside actual observed reader and writer spans (not only
E9's interval). The independent crash fixture now records reader activity at both ends of that span. The added NF2 regression
keeps all other evidence valid and proves stale snapshots and ended reader traffic each refuse FAULT-WITNESS-INVALID. Freshness,
source/slot/input and planned injection binding are the same as audit item 3. The first passing run is retained as covering its
old exact source; it is not claimed as verification of these added bytes. The 148-test focused suite passes; both full evaluator
suites will be rerun after this source is committed.

Final round 3 evaluator hash after the checkpoint follow-up: `fb9af98bc6b96888f1e64206cf9315dfac419893986b23dfea9a7512d26560d9` (old pre-round-3 hash `0ac41f01b4e2dbdd04db64654eb47310ea07346aaf90aada65a7ae829299f892`). No acceptance pins were edited.
