# CX-VP5A: EXP-P5 round A offline review

**Verdict: FIX-FIRST.** Reviewed builder `dadb2de0` on `exp/P5-release-sweep`; reviewer branch `verify/P5A`. North star: P5, preserving P1/P2 correctness. Authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; R34 sections 1–5; Q92a–k, Q89b/i and current-main Q93a. Both rounds of `REPORT-CX-P5A.md`, `round2-summary.json` and `A1-RUNBOOK.md` were read.

The offline mechanics are useful, and the retained evidence is accurately labeled diagnostic. They do not establish the expected-answer or complete-content gates requested for A1 readiness. No builder code was fixed.

## Findings

### F1 — High: snapshot-only G0 admits different history and valid-time content

Location: `lab/bench/lib/w0-fingerprint.ts:55–91`, especially `:67`; `lab/bench/lib/w0-world.ts:58–75`.

`fingerprintSweep` checks counts and the visible W0 worlds/R2 outputs at exactly one P/V cut. Retired assertions, retirement positions and valid-time bounds that do not cross that cut cannot change that fingerprint. This is a correctly masked snapshot digest, but it is insufficient for the requested one-fact/one-retraction/one-valid-time-change refusal and Q93a clone admission. Counts do not distinguish equal-size changes.

Reproduction: `adversarial.test.ts`, first test, reconstructs all lifetimes from a real N=50 `seedW0` command/receipt log and uses a fresh independent O-DOMAIN population fingerprint. The fixture computes counts from its actual rows. A visible value change and one removed assertion refuse. Changing one already-retired assertion value, shifting one retraction position by -1 while it remains retired, moving one visible fact's validFrom by -1 ms, or adding a validTo after V grants `complete-and-matching`. Before/after full-row hashes differ for each case and are retained. These are fixture content mutations, not a claim about engine corruption. All six cases passed their reviewer assertions in the final execution; the earlier extra scheduled-validTo fixture failure remains retained separately.

Proposed fix: use K01's full-content `g0.ts` admission coordinator and its pre-freeze all-table/history D in the P5 measuring process; supply P5's streaming W0 snapshot reader as its `W0Check.read` callback. Preserve masking in `worldOf`; adding lifetime metadata to W0 worlds would violate Q89i. Require both full-content equality and independent W0 equality.

### F2 — High: traffic sweeps publish wrong worlds without G1/G2/G3/G5 checks

Location: `lab/bench/lib/w0-traffic.ts:308–325` and `:391–403`; `lab/bench/audit-traffic.ts:56–89`; terminal completion in `lab/bench/round2.ts:148`.

After warm-up writes, `trafficArm` neither reconstructs touched worlds through O-REPLAY nor compares sweep outputs with O-DOMAIN reconcile. `onPage` publishes records without checking expected deliveries. Live reads retain only a digest; the raw auditor checks sample arithmetic and head/order, not whether that digest is the requested world's answer. The old no-pre-capture-trace driver and separate G4 reference do not qualify these newly touched traffic rounds. There is also no per-round selection/check of the prescribed 1% retroactive output-changing G3 witnesses.

Reproduction: the final traffic reviewer test seeds the actual memory store, passes fresh O-DOMAIN G0, then wraps only returned page values so weeklyMinutes is 1234 while P/V/head remain correct. The actual worker, reconcile and outbox paths run. `trafficArm` returns `sweepComplete: true` and publishes despite the wrong worlds: 491 corrupted reads/pages were observed and the end-count hook was called zero times. This demonstrates missing semantic checks, not a false production acceptance flag; the existing `acceptance:false` is correct.

Proposed fix: retain warm-up and trace operations/receipts; compute independent per-subject worlds at P_act with O-REPLAY, reconcile those through O-DOMAIN, compare every returned world/output and publication, and add explicit retroactive G3 witnesses. Refuse completion on any mismatch. Give the G6 harness an independent O-REPLAY reference before treating it as qualified HE-1 evidence.

### F3 — High: round-2 receipts omit G9 end counts and cannot fail on their mismatch

Location: `lab/bench/lib/w0-traffic.ts:403–435`; `lab/bench/lib/w0-rounds.ts:80–108`; `lab/bench/round2.ts:140–148`.

Admission checks start counts, but each traffic arm returns no start/end count observation or independently folded expected end counts. G0's returned admission object itself omits the counts it compared. Arms are dropped after return without G9. `g4-live.ts` likewise has pre-reference counts but no final count fold/check after actual publications. Thus source/build equality can lead to terminal offline completion while a required data-volume mismatch is never observed.

Reproduction: after successful fresh G0, the final traffic reviewer fixture makes `storeCounts` throw an explicit mismatch. The arm completes and the hook is called **zero times**. The same test records actual publication and wrong-page counters. This is separate from F2: even perfectly correct query answers do not account for extra/missing stored records.

Proposed fix: read and retain actual start/end counts for each arm/recovery run; fold all warm-up, activation, trace, publication and retry changes from driver-recorded receipts; compare the complete expected counts before any complete status. Bind them with the exact fingerprint, release hashes, scope/endpoint and attempt (plus slot identity for A1).

### F4 — Medium: burst eligibility uses phase duration instead of the matched sweep window

Location: `lab/bench/lib/w0-traffic.ts:57–65`, with `matchSweepWindow` at `:443–469`.

The ratio computation correctly uses matched-window p99 summaries, but permits a burst verdict when `trace.durationS >= 60`, even if `matchedWindowMs`/`sweepWallMs` contains only the first second of that burst. R34 4.2 requires one entire 60 s burst inside the **sweep window**. The retained 65 s phases have much shorter sweep windows; reaching eight such rounds would incorrectly remove this eligibility barrier. Current recorded verdicts remain INCONCLUSIVE for other floors and must stay that way.

Reproduction: the ratio reviewer test supplies eight 1 s matched burst windows inside 65 s phases with identical 1.0 ratios. Read status is `HOLDS`; with synthetic command counts over the minimum, commit status is also `HOLDS`. The bootstrap arithmetic is not the cause; the evidence eligibility predicate is wrong.

Proposed fix: verify complete burst containment using the recorded offer schedule and the actual matched interval in both arms. A short window must stay INCONCLUSIVE regardless of surrounding phase length, round count or sample count.

## K01/P5 shared digest decision

Compared immutable K01 head `245a49664d6e6def36877bdee1b0ec2e0e0cc919`, `lab/bench/lib/g0.ts` and `g0-schema.ts`, with this P5 head.

They **do not compute the same overall digest**. P5 returns `{basisTx,facts,worlds,R2}`: canonical projected worlds and R2 output arrays at B0. K01 D hashes expected scope/position/count/world binding, sorted multiplicity-preserving hashes of complete rows for every adapter-declared table, and the optional W0 component. K01's W0 component is supplied by a callback; it has no second competing W0 world generator. Feeding P5 `readW0Fingerprint` into that callback yields the same W0 component by construction, while D deliberately covers more content.

The fresh immutable K01 fixture admitted its unchanged complete table rows, then changed `valid_from`, `retracted_position` and `value_string` one at a time with counts unchanged. Every change produced a different D and `admitG0` refused it. This synthetic N01 table fixture checks D sensitivity; it is not a live K01 clone or W0 integration qualification. Exact preimages, generated modules, source hashes and old/new D values are retained.

Choose **`lab/bench/lib/g0.ts` as the single shared admission gate**, retaining `w0-fingerprint.ts`'s streaming reader as a subordinate W0 reader. Consolidate duplicate admission/comparison/deadline logic, carrying P5's monotonic elapsed-time guards into the coordinator, rather than replacing K01 D with the narrower P5 snapshot digest. This is an integration recommendation, not certification of K01. The P5 interface document already says its component cannot replace K01's history/claims/table coverage, but current P5 entry points do not invoke that stronger coordinator.

## Checks and boundaries

- Fresh dependency build: five tasks succeeded (four cached dependency builds, freshly built W0). Frozen offline pnpm install used the exact required store. No lockfile edits.
- Fresh builder tests: **31/31 passed**, including missing-pin, count/content, future/time-shape/deadline refusals, Q89i projection, worker admission and ten real controller-process stops. This includes the sparse 650-subject recovery regression; it is not a fresh 1k/10k recovery execution.
- Fresh reviewer tests: **4/4 passed**, reproducing the six G0 mutations, unchecked traffic content/counts, incorrect burst eligibility, and correct W0 field masking. These green tests confirm findings, not product acceptance.
- Fresh immutable RQ01 G6 stack: **5/5 passed**, sourceStable true, against `d5cd32e6829100c0d9968ddb83713525e1510b3a`. Seeds 1/42/890 have zero fixture violations; planted wrong values yield HE-1 and fail-open results yield HE-6. Its default offline reference remains diagnostic, not independently supplied O-REPLAY.
- All nine committed summary evidence hashes match the builder's retained files. Current built W0 JS bytes match the final guarded confirmations. Every tracked `lab/bench` source matches reviewed dadb2de bytes.
- Independently recomputed per-round p99 ratios and geometric means from the retained receipt summaries; they match. Current recorded ratio statuses are INCONCLUSIVE. This does not claim a fresh replay of all raw-stream percentiles or bootstrap intervals.
- Q92a: reviewed sweep paths use the activation ACK position and V_W0 or V_W0 plus deterministic trace offset. No sweep uses recordedAt or Date.now as its valid-time basis. Public adapter calls translate to `{recordedPosition,validAt}`. Recorded instants used for receipts are a different field.
- Q92b: one worker page requests one page reader; no database transaction/as-of handle survives a page. X-native performs its allowed per-hop statement set with a local page guard cleared in finally. Retention pins, when provided, are retention lifetime, not a database read transaction. Native execution was not tested.
- Q89i: `worldOf` projects exactly `{e,a,v,tx}` and excludes all retirement fields. Reviewer masking test confirms identical world bytes despite changed later lifetime metadata. Raw memory page rows still carry lifetime metadata; this review's positive result is specifically for W0 worlds.
- A1 remains a future slot run. The runbook's public G0 command exists, but full native traffic/controller/observer/maintenance screening is still explicitly absent. G7 epoch changes fail closed rather than automatically retrying; native G8, retention leases, endpoint/slot attestation and XTDB bytes/fact remain unverified.

## Reviewer PASS/verdict audit (rule 9a)

This report emits FIX-FIRST, never product PASS. Green reviewer tests mean the documented behavior was reproduced, including incorrect grants.

| Reviewer location | Content | Freshness | Binding and limit |
| --- | --- | --- | --- |
| Executed reviewer test preimage / TAP and observations | Independent O-DOMAIN B0 digest; before/after full-row hashes; exact grant/refusal; actual traffic completion/publications/count-hook calls; ratio eligibility; exact world keys | Fresh seed, oracle subprocess, scopes, workers and unique raw-output directory | Reviewed HEAD and exact test SHA/preimage retained; known P/V/endpoint/scope and truthful fixture counts; reviewed code unchanged. Final 4/4, earlier failed attempt preserved; no engine or production PASS |
| `run-rq01.mjs` exit / stacked tests | Exact P/T/TP fixture checks, zero violations, planted HE-1/HE-6 assertions | New stack and test subprocess, 5/5 | Immutable RQ01 source/compiled hashes; actual route/test/lock/W0 build hashes checked again. Diagnostic reference only, no independent-oracle/live-maintenance promotion |
| `compare-k01.mjs` fixture assertions | Unchanged complete-table D admits; each of three changed fields produces different D and refusal | New generated stack and in-memory fixture | Exact K01 preimages/dependencies and adapter declaration hashes; generated imports/schema default path adapted only for this reviewer stack. N01 fixture, no engine or W0 clone promotion |
| `audit-index.py` assertions | All nine retained hashes, exact reviewed source bytes, kernel build hashes, independently recomputed ratios/geometric means | Reads actual retained bytes during this review | Binds dadb2de, file hashes and original attempt paths; historical evidence consistency only |
| `VERIFY.md` verdict | Findings above and scope-limited receipts | This review | FIX-FIRST, no source/policy change or acceptance grant |
| `run-final.mjs`, `disk-guard.mjs`, `final-jobs.json` | Child exit codes, log hashes, admission-time available disk bytes | Each guard reads statfs just before its child starts | Exact argument lists and output paths; all three final child codes zero. These are execution metadata, never independent semantic grants |

No `lab/acceptance/` file or pinned builder path was changed: the old/new pinned-path SHA list is empty. No contract re-pin is requested for reviewer-only files. No main checkout/source, engine, resident, container lifecycle, unrelated file, merge or push was touched. No full root suite, engine integration, fresh native maintenance or A1 run was performed.

## Evidence and handoff

- `evidence/builder-tests.tap`: fresh 31/31. `evidence/build.log.gz`, `install.log`: setup receipts.
- `evidence/adversarial-final.tap`: final 4/4. `evidence/adversarial-r2.tap`: first execution, three subtests passed; the additional scheduled-validTo fixture failed. `evidence/adversarial-r3.tap`: disk-refused rerun, exit 78. Both earlier outcomes remain intact.
- `evidence/adversarial-attempt.json`: final durable raw directory; `first-adversarial-attempt.json` retains the first attempt. Each contains original seeds/traffic, oracle output, observations and an exact executed test preimage whose SHA matches its observation. The final source includes the corrected fixture and successful traffic G0 preflight.
- `evidence/rq01-d5cd32e6-1794193475399/`: fresh reviewer G6 preimages, compiled bytes, stack.json and test.tap, 5/5. `evidence/g6-final.log` is the outer log; earlier `g6-r2.log` disk refusal remains.
- `evidence/k01-1794193488840/`: fresh K01 fixture comparison and immutable source/generated dependencies, three changed fields refused. `k01-final.log` is the outer log. The first import failure and subsequent disk refusal remain in `k01-run.log`/`k01-r2.log`. `k01-source-review/` retains the static preimages too.
- `evidence/index-audit.json` and `.log`: nine evidence hashes, unchanged builder-source inventory, exact built W0 comparison, and independently checked recorded arithmetic.
- `SHA256SUMS`: reviewer tools, report, evidence and durable raw-file hashes. Bulky raw files remain under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP5A/`, outside Git.

Earlier queued guards observed only 5,126,627,328 to 5,176,172,544 available bytes against the required 5,368,709,120-byte floor and refused. Two earlier unguarded wrappers were stopped while still queued, before work began, when capacity fell below the floor. Capacity later recovered; all final checks ran sequentially under one heavy grant with a fresh disk check before each child. `final-jobs.json` binds command arguments, log hashes and zero exits. No engine slot was requested and no other job was interrupted. Native A1, full-scale reviewer recovery and independent O-REPLAY qualification remain unverified. Reproduction commands:

```sh
node lab/bin/heavy.mjs --label CX-VP5A-retry -- node lab/verify/P5A/disk-guard.mjs node --experimental-strip-types --test lab/verify/P5A/adversarial.test.ts
node lab/bin/heavy.mjs --label CX-VP5A-G6-retry -- node lab/verify/P5A/disk-guard.mjs node lab/verify/P5A/run-rq01.mjs d5cd32e6829100c0d9968ddb83713525e1510b3a
node lab/bin/heavy.mjs --label CX-VP5A-K01-retry -- node lab/verify/P5A/disk-guard.mjs node lab/verify/P5A/compare-k01.mjs
```
