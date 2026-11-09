# CX-VP5A — second review of EXP-P5 round A

**Verdict: FIX-FIRST.** The four original findings are resolved in the reviewed offline paths. A new admission freshness regression still permits success after the gate's total deadline or cancellation.

North star: P5 release activation, protecting P1/P2 correctness. Authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`, and the lab protocol. Builder input: **`7e34c387`**, round 3 of `REPORT-CX-P5A.md` and `lab/experiments/EXP-P5/round3/index.json`. Explicitly authorized merge into `verify/P5A`: **`3f2931d4`**. No main merge or push; no builder code fixed. Reviewer additions are confined to `lab/verify/P5A/`.

## Finding F5 — Medium: the P5 admission wrapper grants after deadline or abort

**Location:** `lab/bench/lib/w0-fingerprint.ts:194`, `:197–202` (also the unbounded reader-open phase at `:158`).

`deadlineMs` bounds only the nested `admitG0` call. The wrapper's start/end `storeCounts` calls and opening work are outside that deadline. The external signal is combined only into the subordinate W0 reader, and it is not checked after the final count. Thus a complete content match can still become a stale or cancelled `complete-and-matching` grant. The new monotonic guard inside `g0.ts` correctly covers that inner coordinator; it does not cover these outer observations.

`lab/experiments/EXP-P5/W0-G0-INTERFACE.md` explicitly states that the compatibility wrapper's deadlines refuse with `FingerprintRefusal`; the observed grants contradict that advertised interface.

**Fresh reproduction:** `round2/freshness.test.ts` uses a real N=50 seed, fresh independent O-DOMAIN expected fingerprint, a full-content pre-freeze pin, and unchanged data throughout. It wraps only `storeCounts`:

| Case | Expected | Observed |
| --- | --- | --- |
| `deadlineMs=5000`; each of the two count reads waits 5100 ms | Deadline refusal | `complete-and-matching` after **12,369.216 ms**, both count reads completed |
| Abort the supplied controller during the second count read | Cancellation refusal | `complete-and-matching`; `signal.aborted === true` |

The focused test run has **0/2 passing**, with both assertions failing because success was returned. An earlier independent parity probe reproduced both outcomes too. Content, pin, requested P/V and endpoint stay unchanged, so a content mismatch cannot mask this defect. Raw observations retain the complete returned grants and exact executed source preimages.

**Proposed fix:** enforce one absolute monotonic deadline and combined cancellation signal for the entire P5 wrapper, pass only the remaining budget into shared G0, bound/cancel opening and count reads, and check freshness again immediately before the grant. Keep the shared full-content digest in `g0.ts`; this does not require a second admission digest. Preserve deterministic cleanup of any opened reader. Add these two negative regressions to the builder suite.

## Disposition of the four original findings

| Original finding | Result of this review |
| --- | --- |
| F1, history coverage / competing admission digest | **Closed offline.** `fingerprintSweep` delegates to `admitG0`; `readW0Fingerprint` still computes the required subordinate W0 world/R2 hashes. It no longer independently compares a snapshot digest to grant admission. `requireFingerprint` is the shared coordinator's comparison alias. |
| F2, traffic expected-answer checks | **Closed offline.** Returned live/sweep worlds are compared with accepted O-REPLAY command-intent reconstruction; outputs and complete evaluation records with independent O-DOMAIN reconcile; delivered items with O-DOMAIN publish. Separate timed live-world, sweep-world and delivery corruptions refuse. G3 has explicit positive and never-written negative witnesses. Fresh G6 uses an explicit accepted O-REPLAY reference. |
| F3, missing end counts | **Closed offline.** `CountLedger` accounts for actual submitted operations/ACKs, excluding retries; traffic additionally checks O-REPLAY's independently folded counts. Actual start/expected end/observed end counts are retained. Wrong final counts and missing receipt cases refuse. G4's final count fold is exercised by the fresh 650-subject process-stop regression. |
| F4, burst-window eligibility | **Closed.** Complete frozen 60-second burst containment is checked inside both actual matched intervals. Earlier one-second windows, 59,999 ms, a start inside the burst, and missing interval metadata stay INCONCLUSIVE. A correctly aligned synthetic full burst exercises the positive path. No offline performance claim is granted. |

### Same digest and same planted refusals as K01

`round2/parity.test.ts` passes identical complete returned rows to three entry points: P5 `fingerprintSweep`, the integrated coordinator, and the exact K01 `245a49664d6e6def36877bdee1b0ec2e0e0cc919` coordinator preimages retained by the first review. The latter's generated schema-module path is redirected to this worktree, as documented in the first review; its algorithm bytes are unchanged.

The positive source pin is identical across all three, **D `425f3517349f2c7d60232bd3110db9b241a99f81799351fb92f0e99718066745`**. All three admit unchanged rows. All three refuse:

- One removed row, with the independently counted row total changed.
- One already-retired assertion value change, with counts unchanged.
- One retraction-position edit, with counts unchanged.
- One valid-time-bound edit, with counts unchanged.
- One claim/command value edit.
- An integer's lexical representation changed while decoding to the same value (leading zero).
- An integer represented as a JS number instead of its original string, with the same decoded value.

`count-parity.test.ts` separately keeps all scan rows unchanged and changes only the independent assertion count: P5 and both coordinators refuse. It also verifies the outer P5 store-count mismatch refusal. Expected results are not inferred from a changed expected hash; observed rows/counts are mutated after the pin.

The imported `g0.ts` differs from the exact K01 source only by its additional monotonic-deadline guard and post-scan table-count check. Four imported helpers are byte-identical (`g0-schema.ts`, `g0-values.ts`, `g0-normalize.ts`, `g0-wire.ts`); `g0-xtdb.ts` only removes an unused `readG0` import. The audit inventory retains all old/new hashes. These changes do not change D. The full-content D and subordinate W0 digest remain distinct by design; they are no longer competing admission decisions.

## Fresh execution and limits

| Execution | Fresh result |
| --- | --- |
| Bench + imported G0/value/schema/E1 + P5/deadline + reviewer refusal probes | **192/192 passing** (includes the builder's 183 plus nine bench tests) |
| Independent P5/current-K01/exact-K01 parity and initial lifecycle observations | **2/2 passing**; lifecycle observations expose wrong grants, not product PASS |
| Independent count-only parity | **1/1 passing** |
| Stacked G6, immutable RQ01 `d5cd32e6829100c0d9968ddb83713525e1510b3a` | **5/5 passing**, `sourceStable:true`; exact independent replay reference and planted wrong-value/fail-open controls |
| N=100, two real worker pages, independent oracle publisher/count fold | **2/2 passing**: correct output/publication/counts; planted second-publication payload refused with G5 |
| Focused expected-refusal lifecycle regressions | **0/2 passing**, both reproducibly return success (F5) |
| N=150, three-page/two-worker full timed traffic probe | **1/2 passing**: planted second-publication error refused with G5; positive run failed closed with `sweep deadline exceeded` after all three publications |

The N=150 positive timing refusal is retained as a failed/unqualified attempt. It does not establish a semantic mismatch or a performance result. The separate N=100 publisher run removes the timed traffic client's 120-second watchdog and confirms correct cross-page oracle state/counts and second-page error rejection. It does not replace full timed traffic evidence. Inline replay/domain validation materially changes the diagnostic client's cadence, as the builder reports.

No package source or lock change required rebuilding packages for these bench-only changes; tests used the existing built modules, whose exact hashes are in the audit inventory. No root suite, live engine, A1 slot, K01 physical clone lifecycle, native E1, maintenance/lease/purge, bytes-per-fact, corrected 1k/10k end-to-end path, or production ratio qualification was run. All performance ratios remain INCONCLUSIVE. The A1 runbook itself says its old fresh-scope command is historical and that native clone/scope/endpoint admission wiring is not a completed recipe; this review does not turn that handoff into live evidence.

## Evidence and PASS audit

Tools/results: `lab/verify/P5A/round2/`. Bulk raw evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP5A/round2/`. `*-attempt.json` pointers locate the raw command logs, oracle outputs, returned grants/refusals and exact executed reviewer test preimages. `round2/SHA256SUMS` covers reviewer files, this report and bulk raw files. Prior review evidence and failure files are retained unchanged.

`round2/source-and-evidence-audit.json` checks the builder's seven indexed receipt hashes and manifest hash, exact reviewed source bytes, current built modules, K01 source equality/differences, and executed reviewer preimages. Historical builder statuses are consistency inputs only; fresh outcomes above come from this review's actual runs. Raw gate output over the size limit remains outside Git; only hashes, source/test preimages, compact receipts and this index are committed.

| Observation-to-verdict boundary in reviewer tools | Content | Freshness | Binding / limit |
| --- | --- | --- | --- |
| `earlier-probes.test.ts` assertions/observations | Actual changed full rows, independent O-DOMAIN expected worlds, separate wrong live/sweep/delivery/count cases, full-burst boundary controls | Fresh seeds, independent subprocesses, scopes, workers and UUID output directory | Adapted copy of earlier probes; exact test SHA/preimage and reviewed source inventory; diagnostic memory only |
| `parity.test.ts` and `count-parity.test.ts` assertions/observations | Same rows/counts/W0 callback through all three real entry points; same D positive; each actual mutation refused | Fresh N=50 seed, O-DOMAIN subprocess, pin, cloned fixture rows | Exact P/V, scope/endpoint, row-content hashes and exact original K01 preimages; no physical clone promotion |
| `freshness.test.ts` red assertions | Unchanged content grants after budget/abort, exact elapsed time/call count/signal state retained | Fresh seed/pin and current invocations | Exact source SHA/preimage, P/V/count/pin and gate arguments. Failed assertions establish F5; no PASS emitted |
| `multipage.test.ts` assertions/observations | Actual timed traffic and independent semantic checks; first failure retained; planted payload must reach second publication | New N=150 scope for each case | Actual operation/receipt logs and original returned error. Positive result unqualified; no latency or completion PASS inferred |
| `page-publisher.test.ts` assertions/observations | Actual worker records checked against replay/reconcile/publish; expected end counts; wrong second delivery rejected | New N=100 seed, oracle processes and worker run per case | Exact test preimage and source inventory; correct/tampered paths separate; no timed/live-traffic claim |
| `run-g6.mjs` / stacked assertions | Exact independent reference answers, zero fixture violations and required planted HE-1/HE-6 violations | New stack directory, oracle/test processes | Exact immutable RQ01 source/compiled hashes; route/bridge/oracle/build/lock sources checked again. No native maintenance claim |
| `audit.py` / inventory / manifest | Actual file hashes and byte equality; exact executed reviewer preimages | Reads actual files after completed runs | Builder 7e34c38, original K01 source commit, current build hashes; consistency evidence only |
| This report | Four closures and one new reproduced defect | Current review | **FIX-FIRST**, not offline/native admission or performance acceptance |

No `lab/acceptance/` file was edited. Relative to the explicitly merged builder head, no pinned code path changed: **old/new pinned-path SHA list is empty**. No unknown/forensic state was removed and no other process, resident or engine was interrupted. Final questions remain F5's wrapper-wide freshness enforcement and the separate native A1 admission/run handoff; no clarification is needed to reproduce the finding.

Focused reproduction (expected exit 1 on this reviewed head):

```sh
node lab/bin/heavy.mjs --label CX-VP5A-F5 -- node lab/verify/P5A/disk-guard.mjs node --experimental-strip-types --test lab/verify/P5A/round2/freshness.test.ts
```
