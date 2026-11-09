# EXP-W02 builder report

Builder: CX-W02 (Codex gpt-6.1-sol, medium). Branch: `exp/W02-gs-harness-v2`.
North star: the GS gate under P1-P5 and the correctness floor, measured against
`lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` 2.1 and 6. Design read: R37
sections 1-4 and Q94b-i, Q91a, Q92a/k, Q93a from the main checkout.

**Result: PARTIAL / NOT QUALIFIED. EXP-W02 is not complete and must not be promoted.**
The offline W0 stream/golden path and admission/claim checks are implemented. The
new live entry deliberately reports FAIL/UNQUALIFIED rather than claiming that
kernel agreement closes database, domain, product or fault obligations. There
were no live GS runs and no engine lifecycle actions. Nothing was merged to main
or pushed. No `packages/*` source, dependency manifest or lockfile was changed.

## Integration provenance

- Merged W01b `1d1919915f66573a9636f10ad48de7bb34ee3022` into this branch first.
  This includes the preceding harness/restart fixes and historical evidence;
  independent review of W01b remains the separate reviewer's task.
- Cherry-picked P5 source commits `7bc0601a5b6c322fc5b57f1fca58d0ff0dc8fa01`,
  `18640ea2` and `ef53738a` from `exp/P5-release-sweep`. They supply the W0 mapper,
  seed, fingerprint and composition helpers; their historical receipts remain
  historical. This branch does not claim their independent acceptance.
- Partial source extraction from K01 `776811666a4cf024d17bdffd94523c73927d5a1f`:
  `lab/bench/lib/g0.ts` is byte-identical to that commit. The full K01 commit was
  not cherry-picked: its engine lifecycle and unrelated verifier changes were
  intentionally excluded. The W02 adapter uses its shared `bounded` and
  `requireW0Fingerprint` functions with P5's `readW0Fingerprint`.

## Implemented and remaining

| Brief item | Implemented | Remaining / limitation |
| --- | --- | --- |
| C1 W0 vocabulary/population | `v2/generate.ts` supplies all 20 scenario IDs, using W0 population IDs, attributes, references and the P5 mapper; business operations contain no W01 attributes | These are initial overlay recipes, not complete reproductions of every original story. Actions requiring product paths are explicit unsupported schedules. Counts can be reduced to fit the rung. Original generators remain in the explicit `--legacy-diagnostic` path for inspection |
| C2 O-DOMAIN adapter | `domain.mjs` executes fresh `reconcile`, `affected`, `publish`, `receive` CLI requests; saves input/output hashes and oracle/world source identity; exact observed byte comparison; unknown operations and invalid W0 inputs refuse | Only live reconcile kernel-conformance samples are wired. Live affected/publish/receive observations and state-oracle comparisons are not integrated |
| C3 named domain claims | Every `spec.domain` entry must have a successful, fresh observation explicitly covering its index; omissions fail closed, including 01/05/06/09/17/18 | The actual scenario-specific checks (next task, exact affected sets, boundaries, proposal exclusion, overdue projection) remain unimplemented in v2. Generic kernel agreement intentionally covers **none** of those claims |
| C4 frozen background | Uses `generateTrace` unchanged: 2% active set, seeded Zipf 1.1, Poisson offers, bursts at 120 + k*600 s, P5 W0 mapping; 240 s window; separate background/overlay counts and source/stream hashes | Actual in-window maintenance is unobserved and fails closed. Background writes are not removed from negative witness subjects; witness validation must distinguish the streams. The diagnostic executor is serial and is not a P1/P2 performance implementation |
| C5 content admission | Fresh random scope per scenario; independent full population oracle artifact fixed before seeding; same measuring composition reads full W0 G0 before traffic; independent seed counts and oracle source hashes checked before/after; start/end store counts retained | Tested through the memory diagnostic, **not an engine**. Public XTDB route still needs its build/live qualification; Q/D position/count routes are absent. Shared G0's raw-table `admitG0` is retained but not called by the W0 adapter |
| C6 position bases | V2 uses receipt positions and the deterministic W0 valid-time clock; no v2 read uses recordedAt | Legacy diagnostic retains historical time-based pins. Public `TemporalBasis` does not expose position in this checkout: v2 uses P5's position-aware public backend adapter route, which still needs RQ01/live qualification |
| Three-lane entry | `run.mjs` dispatches to v2 with Node type stripping; GS parser accepts datomic; matching exclusive-slot owner and endpoint required; broker selection explicit and owned path bound | Datomic package, qualification registry and slot registration are absent in this checkout. QLever P5 `publicSweep` refuses as unqualified. No lane is silently replaced by XTDB |
| Q91a / receipt identity | Gate records slot, resident flag, co-running set and bound broker path; built-base/bounded-delta/touched-block counts required for qualification | Q counts are **null**, not guessed. QG1/measurement integration is still required. Co-running inventory is the existing gate's end observation, not a continuous set history |
| C7 CS-GS | Authored exact inventory: 20 scenario tags + 50 required cases, including 40 witness selectors and all ten numeric/common-basis/fault schedules; deterministic manifest regeneration | Inventory only, not a fully executable evaluator manifest. Full per-case operands, expected fault observations, witness polarity proofs and contract pinning remain open. Contract anchors were not hand-edited |

The gate refuses pre-0.4.0 receipts (Q94e), retired W01 generation, missing content
admission/counts and unqualified QLever layout. All live v2 scenarios currently
return FAIL/UNQUALIFIED regardless of kernel agreement. GS.03's signal-ack still
waits for W0-1.2; no invented oracle was added. GS.10/19 cannot use a harness-file
outbox as product evidence. Q94a still waits for Sam; no reduced-rung acceptance
or year-one performance claim is made.

## Validation

Evidence: `lab/experiments/EXP-W02/evidence/` contains append-only attempts with
raw stdout/stderr, exact argv/exits, source hashes and an unchanged-source check.
The captured attempt is `offline-2026-11-09T01-57-49-766Z-38786b`.
Its recorded source-file hashes still match the final implementation. The current
receipt script additionally asserts test/golden denominators in stdout; its
redundant final rerun was cancelled while still waiting for a heavy slot (no new
test commands executed), so those additional controller assertions have not run.
The 30/1/20/80 denominators below were inspected directly in the retained raw logs.

- W0 build: exit 0.
- Offline generator/expectation typecheck: exit 0.
- Existing lab + W01b runner + new W02 unit checks: **30/30**, zero skipped.
- Same-process G0 diagnostic: **1/1**. It seeds a 50-subject memory scope, compares
  a freshly generated full independent population fingerprint, and rejects wrong
  scope, wrong counts, changed expected digest and changed observed value bytes.
- **20/20** offline golden entries regenerated byte-identically at N=500; **80**
  initial/final sample-witness evaluations agree byte-for-byte with O-DOMAIN.
  These are two sampled subjects per scenario, not all generated witnesses, and
  they do not prove positive/negative polarity or live state correctness.
- CS-GS manifest byte-identical; all 70 contract inventory IDs present, no extras.
- Syntax checks and `git diff --check` passed.
- **Live-path typecheck: FAIL / unverified.** Missing this worktree's unbuilt
  `packages/xtdb/dist/index.js` produces TS2307 in inherited P5 `w0-public.ts:20`
  and consequential implicit-any diagnostics at line 37. The separate offline
  typecheck does not imply live-path type safety. No dependency cache or sibling
  build was copied to conceal this gap.

`FIRST-FAILURES.md` retains the earlier generator-serialization and compact-oracle
stdout mistakes and their fixes. Historical W01b evidence was not regenerated or
reclassified. `RUNBOOK.md` gives exact conditional live commands and lane blockers.
No full root `pnpm check`, package integration suite, engine qualification,
maintenance/fault injection, GS campaign or independent verification ran.

## PASS audit (preamble 9a)

Every new decision site and copied G0 PASS site is listed here. These are builder
checks, not independent promotion verification.

| Site | Content | Freshness | Binding / limit |
| --- | --- | --- | --- |
| `domain.mjs:runDomain` | Exact oracle output bytes; invalid W0 inputs refuse | New bounded Python CLI call per request; source identity rechecked afterwards | Request bytes hash + complete oracle/world source identity; returns data, not live acceptance |
| `domain.mjs:expectDomain` | Observed bytes exactly equal independent CLI bytes | Requires current run tag; invokes CLI anew | Driver endpoint, scope, source hash, recorded position; input basis must agree; prose/missing binding fails |
| `domain.mjs:requireDomainClaims` | Each named claim index requires an explicit successful comparison | Only current context's requests used | No implicit claim coverage from a generic check; v2 conformance samples cover zero product claims |
| `v2/expect.ts:expectation` | TS output bytes equal independent O-DOMAIN on each sample input | Fresh CLI evaluation while regenerating | Stream/source/seed/rung, input/output hashes, subject and phase retained; OFFLINE-ONLY, no polarity or live verdict |
| `v2/expect.ts` and `v2/cases.mjs` CLI `--check` | Full regenerated artifact bytes equal committed bytes | Regenerates in current invocation | Current generator/oracle/spec/contract inventory; generation can never pin the contract itself |
| `v2/admission.ts:admitWorld` | Full engine-route W0 fingerprint plus independent counts and oracle-source hashes | Reads through the already-open measuring handle before traffic, bounded; counts/sources rechecked | Actual handle endpoint and scopeName, population size, receipt position and W0 valid clock; returns MATCHING only on equality |
| copied `g0.ts:requireW0Fingerprint` | Requires independent rung/seed/source/invalid-world metadata and every fingerprint field | Fresh read supplied by caller | W02 caller performs read itself; never supplies an old receipt |
| copied `g0.ts:readG0` / `admitG0` | Full table field hashes with multiplicity, exact counts/scopes/position and W0 where applicable; compares pin D | Rescans with deadline on every admission | Expected/pin binding equality; W02 does not call this raw-table admission path; K01's independent review still applies |
| `lib/policy.mjs:gsRefusals` and GS gate | Rejects missing generation/admission/counts/layout/domain records | Current report only; existing gate binds execution/build/source | Refusal-only predicates; cannot independently certify a forged report; no scenario PASS is currently emitted by v2 |
| `v2/run.ts:execute` and run report | Records actual receipts/read bases/errors; unmet checks explicit | Fresh scope, seed, admission and attempt | Scenario verdict is **always FAIL/UNQUALIFIED** pending integration; DONE means controller completed, not semantic PASS |
| `check-offline.mjs` | Real command exits/raw log hashes; final revision also checks test denominators and golden/case output content | New attempt directory, timestamps, actual commands | Source hashes before/after; aggregate remains failed while live-types fails; OFFLINE-DIAGNOSTIC only |

P5's imported diagnostic implementation and reports retain their own audits. This
builder has not independently verified or promoted those imports. Next work is
live-path builds/typing, complete per-scenario state/domain/fault checks, Q/D
position/count adapters and Q91 instrumentation, then the separate review and
exclusive-slot campaigns. Keep GS OPEN until those gates and the pending rulings
are satisfied.
