# EXP-RQ01 — fix round 2

Builder CX-RQ01, branch `exp/RQ01-route-equivalence`, starting at `93ad96e6`.
Review: CX-VRQ01 `verify/RQ01` at `ae6b802`, FIX-FIRST. This is builder evidence;
an independent reviewer still decides acceptance.

North star: P1 immutable answers at named bases; P4 exact route admission.
Goals/targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`.
Design: R31 section 4, Q89a–i. Q89i's exact text is pinned in `Q89i.md`.

## F1 — subject-preserving edits

Replacement and bounded-correction assertions derive entity and attribute from
the actual retract target. Seed tests inspect the row ledger, require actual
same-subject/same-attribute witnesses, and check before/inside/after valid-time
answers. The reviewer's correction-ignoring route is required to fail the default
generated history while its independent control remains clean.

## F2 — measured R31 histories and cuts

Every generated profile has at least sixteen commits (default forty, six-subject
namespace). The full sixteen-operation cycle includes the original assertion,
40/10 group, cardinality-many, replacement, self-retraction, bounded-edit and
future-valid cases, plus nested callback ordinals with committed receipt
identities, claims-only and position-only commits, CAS-conflicting abort attempts
with proposed writes, controlled A/B staging/decision inversion on disjoint
subjects, same-ms ties and a backwards staging-clock step. Abort attempts record
expected-live/observed-retracted conflicts; their assertions must not occur in
the committed log. These are offline schedule/receipt models, not live runtime
fibers, transactor execution or proof that an engine implements those semantics.

`route-coverage.ts` measures witnesses from actual row identity, validity and
attempt/receipt relationships; it does not count index-modulo labels. It requires
all sixteen history families and all fourteen cut predicates. Numeric holes
alone cannot establish an abort or nested ordinal. Qualification cases without
an explicit diagnostic scope reject missing history/cut coverage.

The basis generator includes every committed position and nested ordinal,
proven abort-gap cuts, every record-time stamp ±0.5, every valid edge ±1, now,
omitted validAt, future T/P, both TP orderings, and every entity's history at every
committed position. Pinned and unpinned purge horizons are planned before the
request set is frozen, so each actual requested event horizon h and h-1 is
included. Purge callbacks receive that exact horizon and pin mode.

The gate embeds the measured coverage manifest for five seeds (1, 42, 890, 89,
891), actual answer/refusal counts per shape, contract and event outcomes in its
receipt. Missing offline families/cuts or a shape without answering reads fails
the coverage command. Overlay eviction, pinned/unpinned purge, catch-up and cache
reset report `model-applied`. Index-job, flush and compaction report `pending`
with a reason; no-op callbacks are not promoted to evidence of engine work.

## F3 — Q89i result contracts

Every driver must name `snapshot` or `raw-lifetime`. Missing/invalid contracts
reject before reads. Snapshot answers mask `retracted_at`, `retracted_position`
and `retract_tx_id` together when retirement is beyond either named record-time
or position cut. In-cut retirement metadata remains visible and is compared.
All TripleRow columns still participate in HE-1 and within-contract HE-2.
Snapshot-only HE-5 checks immutable bytes. Raw-lifetime rows have a separate
reference and comparison group and are not asserted to be immutable snapshots.
An independent reference callback receives the contract explicitly.

The new existing-row retraction regression reads old P, T, TP and historical cuts,
appends retirement, and verifies snapshot bytes remain exact. It also exercises
raw-lifetime rows separately and together with snapshot drivers without comparing
the two contracts. A planted incorrect in-cut retirement transaction ID must
still trigger HE-1. No metadata comparison was dropped.

The actual XTDB offline SQL-client driver is labeled `raw-lifetime` because that
is the physical row contract it currently exposes. This round changes no product
adapter to claim Q89i compliance. Its existing future-position negative still
requires HE-1/HE-3; raw-lifetime rows are not checked under HE-5. The snapshot
D-C1 regression remains explicitly known-failing under Q89a: late assertions
change membership even after the metadata mask is correct, and the positive
qualification wrapper must reject that case.

## F4 — no empty qualification

The runner rejects empty and filtered-to-empty requests before resetting a
fixture. The default shape scope requires at least one distinct L/V/P/T/TP/H
request. A narrowed diagnostic must explicitly name its scope and positive
minimum per shape. Missing shapes, a zero/invalid minimum or empty shape scope
reject; filtering cannot silently turn the required gate into zero observations.

## Copied review tests

`reviewer-round1/review.mjs` and `empty-without-flag.mjs` are byte-identical copies
from the read-only review worktree; `provenance.json` binds both source and copy
SHA-256 values. They preserve the original findings and old false-pass
expectations as historical probes, and are not executed as current acceptance.
`packages/testkit/test/route-equivalence-review.test.mjs` adapts the independent
ledger and five planted faults to explicit contracts/scopes and Q89i metadata
masking, then reverses the four finding expectations into regression tests.
The independent ledger still does not call the harness's fold/reference logic.
The fixture-specific code and comments cite the reviewer as their source.

## Execution

Use the shared wrapper:

```sh
node lab/bin/heavy.mjs --label CX-RQ01-round2 -- node lab/experiments/EXP-RQ01/gate.mjs UNIQUE_ATTEMPT
```

The command runs all testkit tests, both offline lane entry suites, testkit
TypeScript/build, then structural coverage plus actual per-shape reads over five
seeds. Relevant sources, controller, contract pin, copied review and dependency
lock bytes are hashed before/after. Evidence remains attempt-specific; no earlier
round's failures or receipts are overwritten.

Final results and retained attempts appear below.

## Boundaries

No engines or containers, network research, performance run, live runtime
concurrency or independent O-REPLAY qualification. Existing QLever broker/H1 and
Datomic adapters remain unwired; their pending inventory is unchanged. No core
receipt/record-time fix (Q89a) or product Q89c/Q89i repair is claimed. No full-root
check, merge, push or publication. Index/flush/compaction remain explicit pending
engine gates. Package verification uses pinned local dependencies and is not a
registry-clean consumer installation. The original round-1 report is historical;
this report supersedes its generator omissions and raw-metadata HE-5 contract.

## Final builder results

**PASS:** `evidence/round2-a3/receipt.json`, `sourceStillMatches:true`, with all
six child exits zero. There are **83 passing tests**: 79 testkit tests (including
19 copied/adapted reviewer regressions), three XTDB offline tests and one QLever
model test. Testkit TypeScript, build and the measured coverage command pass.
D-C1/Q89a remains an active known-failure assertion; F1's pre-fix fixture and
XTDB's Q89c negative likewise remain active, not skipped.

Coverage at every one of the five seeds: six same-subject replacements, three
bounded corrections, two committed nested ordinals, two claims-only and two
position-only commits, two CAS abort witnesses, two controlled staging inversions,
eighteen same-ms adjacent pairs and four backwards staging-clock transitions.
All sixteen operation families and all fourteen cut predicates pass. The actual
planned/applied model purge horizons are 21504 (pinned) and 43008 (unpinned),
with both predecessors requested. Per-shape answer/refusal counts, receipt
identities, staging-clock observations, abort attempts, horizons and pending
engine events are embedded in the receipt and in `round2-a3/coverage.json`.

Availability is now checked separately for each contract as well as equality:
a raw-lifetime answer cannot conceal unavailable snapshot reads. A nineteenth
review regression requires the qualification wrapper to reject that situation.
This last interaction motivated the final a3 run after a2 passed.

Retained attempts:

- `round2-tsc-a1.log`: focused wrapped TypeScript check exited zero.
- `round2-a1/`: all six commands exited zero, but `sourceStillMatches:false`
  because the reviewer test file acquired its last three regressions while this
  attempt started. This attempt is not qualification evidence; no failure was
  overwritten.
- `round2-a2/`: source-stable PASS, 82 tests plus TypeScript/build/coverage. It
  predates the additional cross-contract availability regression and check.
- `round2-a3/`: final source-stable PASS with the additional check and 83 tests.

`round2-lint-final.log` has zero warnings/errors on eleven changed implementation,
test and controller files. Formatting and source/documentation whitespace checks
are recorded separately. Raw tool output and byte-identical review copies are
retained without style rewriting.

Repository-wide package verification was rerun through the heavy wrapper and
remains **blocked** at triplex-sql by
`ERR_PNPM_CANNOT_RESOLVE_WORKSPACE_PROTOCOL`; see `evidence/round2-pack.log`.
No unrelated dependency installation or lockfile change was made. Pnpm pack uses
the equivalent `--config.store-dir` command-line override because pack rejects a
bare `--store-dir`; this pins the mandated project store without a global setting.

The focused testkit package smoke passed for the a2 code in
`round2-package-smoke.json` (its controller preimage is retained alongside it).
The final source gets a separate tarball/consumer smoke attempt below; both use
existing pinned core/Effect links, not a registry-clean installation. The package
smoke controller is now committed and binds its own SHA-256 in each receipt.

Final package smoke: **PASS**, `evidence/round2-final-package-smoke.json` and
`.log`. The tarball includes the generated route-coverage JS/declarations and
public harness exports, excludes source/tests/caches, and produces 31,570
observations with zero violations from an unpacked consumer. Its SHA-256 and
controller preimage hash are recorded; the tarball/consumer remain under
`.experiments/rq01-package-smoke-round2-final`.

All heavy executions used `lab/bin/heavy.mjs`. No engine slots were reserved,
no shared residents were changed, and no package was published or branch merged
or pushed. The original QA findings, original probes and all unsuccessful or
superseded attempts are retained. Independent round-2 QA is still required.
