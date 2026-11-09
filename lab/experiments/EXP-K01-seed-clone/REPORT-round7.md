# EXP-K01 round 7 — Q93 simplification

Builder CX-K01-R2; branch exp/K01-seed-clone; starting head d35fc4b4. Offline implementation only.
Authority: SCOPE/NORTH-STAR/TARGETS, Q93a/b and all of R36, especially sections 2.1 and 4.
R36 SHA-256: `59780fea0f29b28d3fbf1f62551d19ad26e96897ea58372d2ba59b3d1191b42b`.
Read-only RULINGS-PENDING SHA-256 at inspection: `0787f578599dcff631d3d7e3ca7b2e66a8934074d8df2134daa782cd8379d3f6`.

## Result and scope

Implemented one granting gate: `lab/bench/lib/g0.ts` → `admitG0`. The seed writer pins D after its last commit,
before the first finish-block. The measuring driver independently reads its writer endpoint before creating reader workers
or starting warm-up. It compares position-based assertion history, claims, attempts, and scope metadata; scans all valid time
at current XTDB system time; preserves duplicate row multiplicity; excludes random IDs and wall-clock fields. Independent
COUNT queries must match generator/manifest counts, and metadata must name exactly the seed scope at the seed position.
Missing/partial/failed reads and deadlines throw. G0's overall deadline is ten minutes, each SQL call has a deadline,
health probes have deadlines, and client close is bounded. No diagnostic or prior PASS is an input to this gate.

`g0-xtdb.ts` supplies the paged SQL reader, closed-form N01 counts, health precondition and fresh-node quiescence refusals.
A golden is copied while stopped, then an ordinary clone is started twice: each start reads D anew; the second must also
reproduce the first start's L and T. Only then is golden.json published exclusively. The golden volume never runs XTDB.
C1 remains a copy-time refusal. Key/build/image/config, seed position, quiescence, first committed position and end counts
are refusals. End counts include both trace and history-growth commands and lost-ACK resolutions, independent of sampling.
Goldens are never automatically deleted by a runner; manual golden-rm requires an unmounted managed golden with matching labels.
A failed volume enumeration refuses before creation/copy, rather than treating an unknown older golden as absent.

Fresh E1 arms use `engine.mjs fresh`: the same two cuts/jobs waits, stop and restart, followed by the same driver G0.
The legacy inline XTDB measurement seed now refuses without a pre-freeze manifest (engine-free memory composition is exempt).
An E1 fresh comparator supplies TRIPLEX_LAB_REFERENCE_GOLDEN and must reproduce the clone seed's D.
Source live_tables is never read. Fresh-node live_tables is refusal-only. Missing Log4j stop lines cannot decide admission;
stop status, duration and log tail are diagnostics. The slot-only Log4j flag remains; no resident configuration changed.

Deleted the stopped-tail decoder, F/M/T settle machinery, one-cut probe, readiness/certificates, owner lifecycle tokens,
C3-C8 equality and their retired suites. Owner files contain slot ownership only. Old live T1-T7 runners are retired;
historical reports/evidence remain historical. Retained key/build, copy parsing, disk/pool, benchmark and new content controls.
The shared pool retains direct input/df validation, without observation envelopes; operational inspection errors do not
become absence before cleanup releases resources. No schema/package contract changed.

## P5 sharing

The single shared module is **lab/bench/lib/g0.ts**. `readG0`, `admitG0` and `requireW0Fingerprint` are documented in
[G0-SHARED-INTERFACE.md](G0-SHARED-INTERFACE.md). W0 requires a fresh measured fingerprint hook and comparison of basisTx,
facts, worlds and R2 with O-DOMAIN, with rung/seed/source metadata checks. The API matches CX-P5A's current fingerprint shape.
No sibling-worktree source imports or duplicate comparison module were introduced. CX-P5A must import this commit and
connect its lane reader/fingerprint hook; I did not modify its read-only branch or verify that integration live.

## Verification

Final command: `node lab/bin/heavy.mjs --label CX-K01-R7-offline -- node lab/verify/K01/run-round7.mjs`.
**73/73 tests passed; benchmark TypeScript check passed.** Engine, shared helper and gate-runner syntax checks passed;
`git diff --check` passed. The final [source/hash receipt](evidence/round7/run.json) binds actual source bytes and log hashes,
Node v22.23.2, base HEAD and 8,674,217,984 host free bytes (above the 5 GiB floor).
[Test log](evidence/round7/tests.log), [type log](evidence/round7/types.log).

Controls cover reordered rows/random IDs, changed values/history/retractions, dropped row/subject, empty table, absent field,
extra row/scope, wrong position/count/scope/pin, partial scan, acquisition exception and deadline; stale external PASS cannot
admit changed content. W0 positive admission rereads the hook and refuses oracle drift. Wiring checks source pinning,
in-process pre-worker G0 and two-start qualification. Resource and malformed-copy refusal controls remain.

Development attempts are retained under evidence/round7/development-1 through development-4; development-2 has the failed
whitespace-sensitive wiring assertion, corrected by matching optional whitespace. An earlier scratch TypeScript error for
an untyped literal .mjs import was fixed using a URL import; that initial scratch log was overwritten before the runner's
no-overwrite guard was added. The final receipt is bound by source hashes, since its HEAD field names the pre-commit base.
The old 262 process tests are not claimed as passing the new protocol: the superseded machinery and tests were removed.

## PASS audit before commit

| Publication | Content | Freshness | Binding |
|---|---|---|---|
| `admitG0` → driver G0 PASS | All projected rows with multiplicity, independent counts, scopes/position, pre-freeze D; W0 also O-DOMAIN | Executes readG0 anew with deadlines; no saved verdict consumed | Manifest expected scope/position/counts/world and pin match; SQL reader uses the writer endpoint the same process measures before warm-up |
| `golden` → golden.json | Both qualification starts reproduce that pinned D; L/T reproduce; copy/key/resource checks only refuse | Sequential real clone start/read/stop/start/read; exclusive new publication | Same manifest hash, seed key, engine/config and golden volume; second read uses the same qualification clone endpoint |

`readG0` creates an expectation, not an admission PASS. `fresh-state.json` holds restart layout/D binding, not admission.
Seed provenance is marked clone/seed-writer only beside this run's driver G0. Every remaining process observation is a
refusal/precondition or a diagnostic. The diagnostic stop object is only recorded; decisions never read it. Existing benchmark
performance/oracle verdicts are unchanged and do not grant K01 seed reuse. Test-run receipts report subprocess status and
source hashes; they do not qualify a live golden or E1.

## Lines added/deleted

Against starting head d35fc4b4, excluding evidence and this report; counts are Git line changes, not compressed byte counts.

| Area | Added | Deleted |
|---|---:|---:|
| Implementation (including retired experiment runners) | 908 | 1659 |
| Tests and verification runners | 306 | 1620 |
| Existing documentation and G0 handoff | 40 | 110 |

## Not done / open verification

No engine, slot, Docker command, volume, seed, golden, clone or E1 run was executed. **No volumes were created or retained**;
no cleanup was needed. No merge or push. Golden/clone timings, two-start behavior on XTDB, SQL paging/temporal behavior at
500/10k subjects, W0 sweep integration and E1 PAIR-0 latency margins remain unverified. E1 must run for the new recipe/image/version
before clone measurements count as qualified comparisons. The adapter reader/oracle common-mode risk still needs independent
review and the authorized live run; offline content controls are not live qualification.
