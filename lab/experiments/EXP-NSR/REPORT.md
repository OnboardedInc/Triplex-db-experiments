# EXP-NSR — NS driver / candidate split

Builder: CX-NSR. Branch: exp/NSR-bench-split. Base: d523f632 (EXP-P3M).

North star: every P1–P5 cell needs measurements captured by trusted driver code, outside candidate processes (Q86a).
Goals and bars: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md. Design: R44 sections 2, 3.4–3.5, 5.1, B1/B7;
pending Q100a/d/f/m. This report describes builder checks, not independent promotion or NS qualification.

## Implementation

- `lab/bench/ns-driver/driver.mjs`: trusted scheduled offers (ACK-independent), 256 closed reader loops by default,
  RYOW, P4 pulls, pinned sweep pulls, captured request bases, answer hashes and sampled bytes, event-loop hiccup meter.
- `rpc.mjs`, `schema.json`: ns-sut/1, one UTF-8 JSON line per TCP connection; exact envelopes, method/role/run/request
  binding, 1 MiB request and 16 MiB response limits, nesting cap, typed candidate errors and request timeout.
- `events.mjs`: fresh exclusive output directory, append-only HMAC-chained chunks, sequence and prior-HMAC continuity,
  run/source/input/slot binding and terminal seal. `controlEvent` emits hook notifications without any Docker access.
- `check-imports.mjs`, `build.mjs`: TypeScript-AST import-closure traversal, dynamic execution/import refusal, realpath
  boundary checks, package-free bundle copy and content manifest. The frozen trace generator remains the same source.
- P3M pure measurement moved to `ns-driver/p3.mjs`, with evaluator-owned FD01 validators in `feed.mjs`. The original
  monolith retains its public API through re-exports, plus candidate adapters/source recorder in `lib/p3.mjs`.
- `packages/qualification/workloads/ns-sut.ts`: long-lived broker/readers/consumer role server. Candidate provider
  loading happens only there. Role startup/shutdown and RPC transport are exercised in separate OS processes.
- Linux FD01 clock identity is now `{bootId, timeNs, primitive: CLOCK_MONOTONIC}`; hostname is absent. macOS keeps
  its distinct boot-bound diagnostic clock. Both equality implementations reject cross-boot/time-namespace comparisons.
- `assertDurableFlush`: Linux refuses tmpfs, overlay and unknown filesystem/device paths; requires a recognized
  filesystem, barriers, readable block-device cache mode and successful real fsync calibration. ConsumerStore invokes
  it before opening SQLite; NS broker entry invokes it before loading its provider. Calibration reports guest-flush
  durability with host power-loss explicitly unqualified.

## Boundaries and remaining integration

The split runner is deliberately DIAGNOSTIC and refuses live qualification. G03 owns hardened VM containers, separate
volumes/cgroups, role images, observer brackets and live resource admission. CR-NS owns independent recomputation.
The P3M sidecar timestamps remain CR and cannot become trusted publication evidence here.

`openNsRole(role, config)` is the candidate provider interface. The committed provider is an offline parity fixture,
not a newly qualified live lane composition. The fixture consumer gets feed pages over broker RPC; its source/metadata
file access is Mac diagnostic scaffolding, not the VM volume layout. A live provider must supply native lane commit,
read, feed and consumer behavior. The baseline contains no SQL01 `packages/broker` source; this change guards the NS
broker entry, and does not claim to change an absent SQL01 store constructor.

Linux refusal and two-hostname checks use mocked OS probes on this Mac; an actual Linux tmpfs startup and device flush
calibration are not verified. No engine slot, Docker lifecycle, deployment, acceptance-contract edit or production run.

## Gates and evidence

Builder checks completed; results below. Durable evidence root:
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-NSR/`.

First attempts remain: `offline-1.log` records sandbox refusal of `sysctl kern.bootsessionuuid` (eight failed checks,
three passed); `clock-flush-1.log` records two invalid ESM spy attempts. New attempts use distinct directories/logs.
The mocks were corrected to module-factory mocks; clock-dependent offline commands are rerun with boot-identity access.
`offline-2.log`: 11/11 checks passed, including seeded split/monolith equality, actual candidate role processes,
256 distinct completed fixture loops, P3M delay/negative fixtures, and raw feed contents. `clock-flush-2.log`: 2/2
mocked Linux identity/refusal checks passed. These are builder observations, not independently verified promotion.

G0 first attempt `G0-qlever-20261109T072300Z-84a267` completed FAIL: 1203 passed, 12 failed, 71 expected skips.
The initial pnpm shim duplicated the store option on the gate's build argv (pnpm reported `filepath.startsWith is
not a function`); its missing QLever/qualification builds and sandbox boot-identity failures remain in the receipt.
The initial module-spy failures are retained in that attempt. The shim is corrected to add the owned store only when
it is absent. The first receipt is retained unchanged.

## PASS / verdict / receipt audit (rule 9a)

1. **`runNS` result and HR seal (`driver.mjs`, `events.mjs`)**: emits only DIAGNOSTIC. Content is captured from actual
   RPC bytes and hashed, chunks are chained and keyed; freshness is exclusive directories/files and fresh request IDs;
   binding is the supplied attempt/source/input/slot tuple in every chunk. These bindings are caller-supplied and need
   evaluator validation; no candidate reply, seal or diagnostic result is an NS PASS.
2. **Moved `auditP3` (`p3.mjs`)**: checks byte-equivalent feed contents against a source prefix, complete resolutions,
   publication inventory, positions, receipt identities, checkpoint, samples and observed readers. Freshness checks
   runId and window instants; binding checks source/stream and publication/transaction coordinates. Its positive fields
   remain P3M offline/CR diagnostic arithmetic, never observer evidence. The monolith's existing OFFLINE-PASS/MEASURED
   receipt writer remains in `p3-driver.mjs`; no new qualification PASS route was added.
3. **`readerLevel`**: positive reader level requires per-second distinct completed loops for 99% of seconds and relay
   agreement within 10%, against supplied window bounds. The caller must bind retained HR/TO events to the attempt;
   absence of relay data fails. `runNS` does not turn requested loops or short fixture completions into qualified L256.
4. **Import manifest / bundle**: AST closure checks content and realpaths; files are read in the current invocation,
   hashed and copied to a fresh destination. This is a static dependency gate, not semantic acceptance.
5. **Durability admission**: actual startup checks occur before SQLite/provider opens, using the selected path's
   filesystem/mount/device and a fresh fsync probe; typed refusal precedes volatile store creation. A successful
   preflight is a guest flush-path observation, not proof of host power-loss durability.
6. **Builder tests and G0**: test assertions compare observed content and deliberately changed controls in fresh
   attempts. Existing G0 machinery binds builds/inputs and retains raw outputs. Builder results do not self-certify
   promotion; independent review remains required.

7. **Final evidence manifest / copied-object summary**: each SHA256SUMS entry was produced from retained file bytes
   and read back in the same invocation; every one of the final G0 receipt's 44 object references was checked against
   the copied CAS bytes. Freshness is the completed attempt's retained paths, not a reused PASS summary. Binding is
   the original receipt/run ID, its tested source c194baf7 and the explicit durable-root relative path. The manifest
   asserts preservation only; it does not upgrade any failed attempt or diagnostic into semantic acceptance.

## Contract / pins

No lab/acceptance file is edited. `pin-changes.json` lists changed paths found in contract pin dictionaries; currently empty. Final gate outcomes follow below.
P3M final-head check currently still resolves to d523f632; no newer P3M commit was available at the last check.

## Final builder result

Source tested: `c194baf7` (implementation `74111638`). Final evidence/report commit changes no runtime source.

| Check                                                                           | Result                                                                 | Receipt / durable evidence                                       |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Static driver closure, copied bundle import                                     | Eight evaluator files; no candidate package path; copied entry loads   | `bundle-c194baf7.json`, `bundle-c194baf7/manifest.json`          |
| Split / P3M diagnostic parity and P3M negative gates                            | 11 passed, 0 failed                                                    | `offline-2.log`, `attempt-2/`, `p3m-attempt-2/`                  |
| Two mocked Linux hostnames and volatile-filesystem refusal                      | 2 passed, 0 failed                                                     | `clock-flush-2.log`                                              |
| Final G0 (includes 2048 deterministic RPC envelope mutations and all NSR tests) | **PASS: 1220 passed, 0 failed, 71 expected skips, 0 unexpected skips** | `lab/runs/G0/G0-qlever-20261109T073657Z-30e916.json`, `g0-3.log` |
| Formatting / lint of new and changed implementation files                       | Passed                                                                 | Builder invocation; no runtime source changes after G0           |
| Offline package check                                                           | FAIL: CLI tarball lacks unbuilt `package/dist/index.js`                | `pack-1.log`, `pack/`                                            |

The second G0 attempt, `G0-qlever-20261109T073033Z-9a41f5`, had 1219 passes and one failure: the qualification
suite imported the not-yet-built XTDB dist package. `xtdb-build.log` retains that dependency build. The third attempt
reran the complete G0 on the same source and passed; the second receipt is also retained unchanged.

The final G0 is runKind **diagnostic**, scope **full**, with no engine slot. It is a complete builder G0, not an NS
performance/semantic qualification or independent promotion. Its host suite passed all 22 tests. Production durability,
Linux device calibration and VM placement remain unverified. The offline package check was run as required and did not
reach a clean consumer install; no package-readiness claim is made.

`SHA256SUMS` and `EVIDENCE.md` index the durable evidence root. Raw G0 outputs and their content-addressed objects are
copied under `repository-runs/`; every object bound by the final receipt was checked after copying. Test-owned temporary
artifacts from earlier gate attempts were recovered under `recovered-temp/`. No raw evidence over 1 MB is committed.

Changed contract-pinned paths: **none** (`pin-changes.json` is empty). The current contract's
`writerTrace.generator.frozen.sha256` is null, so equality with a frozen pin cannot yet be asserted. The bundle proposes
the unchanged generator source hash `201f721287b3d3f93e230dc310516369024bcba35cc9151f8c0f3ed3e7f342e4`; the contract
builder must pin it with DRIVER_PIN in the next contract version. `lab/acceptance/` remains byte-unchanged.

The last P3M-head check still returned `d523f632`; it is already an ancestor of this branch. There was no newer final
P3M head to merge. The orchestrator must incorporate later P3M fixes if that branch advances after this handoff.

Open integration: native lane `openNsRole` providers (this change supplies the RPC entry and parity provider), actual
Linux tmpfs/device startup tests, SQL01 constructor-level guarding when its absent source is integrated, G03 hardened
VM placement/observer wiring and CR-NS qualification. The P5 path here drives pinned pulls only; evaluation/outbox
publication is not an accepted P5 result. These limits are not hidden by the passing offline gates.

## Round 2 — review F1, F2, F3

Review: `verify/NSR` at `4c8b02fc`, reviewing `05c26355`. North star: oracle-checkable P1 answers and trustworthy
P1–P5 evidence boundaries. Scope/targets remain `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`.

**F1 fixed.** New evaluator-owned `answer.mjs` defines `answer-canonical/1`; its complete specification is in the
ns-sut/1 schema. It recursively emits sorted object keys, preserves array order, and hashes UTF-8 canonical JSON
of the parsed application answer, excluding the RPC envelope. `answerSha256` is now this canonical digest;
`rawWireSha256` independently retains the hash of the original received RPC line. Every read retains the complete
snapshot of the driver-sent request and its canonical `requestKey`: subject, configured shape including hops,
basis, route and all additional fields are preserved, with no projection onto only subject/basis. `rpcMethod`
records the actual method. RYOW, P4 and sweep pulls use the same recording path.

Sampling is explicit in the HMAC-protected `answer-policy` event: `answer-sampling/1` retains the first answer and
every 16th zero-based sequence in **each loop**, with a validated configurable interval; all non-loop pulls retain
answers. Sampled rows include parsed answer, canonical bytes and raw response bytes. Every row, including
unsampled loop-1 rows, retains both digests and the full request. Sampling is independent of candidate content.

**F2 fixed.** The import gate now rejects module/worker/VM/process loader capabilities at their import boundary,
so renamed createRequire and worker imports cannot disappear from the graph. It rejects global require aliases,
import-equals, dynamic imports, indexed function invocation, reflective constructor access and unapproved process
APIs. Node builtins are restricted to the driver's actual data/clock/hash/TCP needs; crypto/util/perf exports are
restricted too. The sole child-process exception is the exact literal boot-ID sysctl invocation in clock.mjs,
with its fixed argv and encoding-only options. File reads are data inputs, not executable runtime imports. This
remains a conservative gate for evaluator-authored code, not a general JavaScript security sandbox.

**F3 fixed.** Linux admission resolves an existing database filename with realpath and classifies **that target**,
including file-level filesystem mounts. A durable-directory symlink into modeled tmpfs now fails typed. Durable
symlinks are also conservatively refused. Existing WAL/SHM/journal/lock paths are resolved and refused if linked
or on a mismatched filesystem; dangling links fail typed. A new database still uses its resolved parent until
SQLite creates it. This is path-level preflight on the private volume, not a claim of race-free inode reservation
against a concurrent path replacer, nor proof of host power-loss durability.

The review's `probes.mjs` was copied to `lab/verify/NSR/probes.mjs` and its controls adapted to require refusal and
independent canonical recomputation. Exact original probes and durability test are retained under `round2/`.
The new negative answer is deliberately placed in an **unsampled loop-1 read**. An independent canonical encoder
and fixture oracle recompute from normal retained HR evidence and reject it; the driver itself still reports
DIAGNOSTIC and does not claim to perform B5's semantic qualification.

### Round 2 gates

All commands used heavy.mjs, Node 24 and the owned pnpm store; no engine slot or Docker operation.
Durable evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-NSR/round2/`.

| Check                                                       | Fresh builder result                                                                                                                                  | Evidence                                                            |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Changed host package build and declaration/type generation  | Passed                                                                                                                                                | `final-1.log`                                                       |
| Clock and modeled Linux target/refusal tests                | 4 passed, 0 failed                                                                                                                                    | `final-1.log`; `nsr-target.test.ts`                                 |
| Copied review probes                                        | Both original loader cases refused; 11 direct/loading controls refused; copied nine-file bundle loads                                                 | `final-1.log`, `final-probes/`                                      |
| F1 controls                                                 | Equal semantic answers compare equal across RPC IDs; raw-wire hashes remain distinct; changed unsampled loop-1 answer fails independent recomputation | `final-probes/` retained HR events, policy and independent captures |
| NSR/P3M parity, caps, canonical encoding and planted delays | 12 passed, 0 failed                                                                                                                                   | `final-1.log`, `final-nsr/`, `final-p3m/`                           |
| Formatting and lint                                         | Passed for changed implementation/test files                                                                                                          | Builder invocation                                                  |

The earlier `offline-1.log` passed 12 tests plus probes; `host-1.log` passed the initial three source controls.
The final run adds the database-file/sidecar control and rebuilds the changed public host dist before parity.
`source-hashes.json` retains the final source hashes, final host dist hashes, review provenance and a byte check
against every file in the successful probe's copied bundle. The round 1 1220-test full G0 remains historical;
a full G0 and package consumer/release check were **not rerun** in round 2. The review established that the earlier
missing CLI entry was build setup, rather than an NSR regression.

### Round 2 PASS / verdict / receipt audit

1. **Canonical read observations** (`answer.mjs`, `driver.mjs`): capture only validated parsed answer bytes and a
   pre-send snapshot of the complete request; raw bytes are separately hashed. New RPC IDs and per-loop sequence
   numbers establish fresh observations, bound by the existing run/source/input/slot HMAC chunks. A digest is an
   observation, not a semantic PASS; oracle recomputation still supplies the independent expected content.
2. **Sampling policy**: policy is written before loops, with a validated interval; each sampled flag follows its
   actual loop sequence and is checked by the independent probe. No candidate-selected or loop-0-only coverage.
3. **Import gate**: positive closure manifests contain actual current file hashes; runtime loader capabilities
   fail closed before fixture execution. The copied bundle is loaded fresh. The negative controls check no marker
   was produced. Source/bundle hashes bind the exact closure, without claiming an all-purpose code sandbox.
4. **Durability preflight**: actual resolved target/sidecar paths determine classification, with typed refusal of
   modeled volatile files. Fresh real symlinks/files and explicit Linux mocks exercise the check. The result binds
   targetPath and the existing filesystem/device observations; no actual Linux startup or TOCTOU proof is inferred.
5. **Copied review probe assertions**: independent expected canonical fixture content is compared with every
   retained read digest and full request, using fresh UUID attempts and raw TCP data. The nonzero-loop mutation
   is rejected by recomputation, not accepted as a receipt. Source closure and supplied offline-no-slot binding
   remain explicit; the fixture's input hash is a label, not a production input attestation.
6. **Round 2 evidence manifest**: hashes are computed from retained bytes and read back after the completed final
   attempt; paths/source-hashes bind each file and the tested source. Preservation does not promote DIAGNOSTIC
   or prior historical checks into qualification.

Changed contract-pinned paths: **none**, enumerated in `round2/pin-changes.json`. No lab/acceptance bytes changed.
Actual Linux tmpfs/device startup, race-free new-file reservation, hardened VM wiring and native providers remain
unverified. P3M still has no newer head than d523f632 at the final check. These checks are builder evidence for the
three review fixes, awaiting independent review, with no NS qualification/promotion claim.
