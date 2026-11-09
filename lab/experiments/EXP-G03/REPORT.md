# EXP-G03 — executing gate isolation, builder round 1

**Builder:** CX-G03. **Branch:** `exp/G03-executing-gate`. **Status:** PARTIAL / UNQUALIFIED / independent review required.

**North star:** correctness floor for every P1–P5 claim. Goals and measurements are only those in `lab/SCOPE.md`,
`lab/NORTH-STAR.md`, and `lab/TARGETS.md`. This work changes no performance bar. Design: R28 and Q86a–g,
Q65f, Q67e, Q75a–j, Q55a. Base: `317750312fa912e118e70e122700ab497fe2f0f8` (contains merged E01 `f060f7e`).

## Result

Implemented an engine-managed container executor and connected it to `claim.mjs qualify` and non-dry-run `gate.mjs OBL`.
The actual registered-slot path was **not verified**: engine admission refused a 3.5 GiB exclusive slot while the residents
held 9.25 GiB. No resident was stopped, no VM settings changed, no forbidden port contacted, and no main-checkout file edited.
**No claim was qualified, no blocker was removed, and this is not a promotion recommendation.**

### Implemented

- `lab/bin/box-engine.mjs`, dispatched by `engine.mjs box`: holder-labelled volumes/networks; atomically pool-admitted container
  creation; fixed private daemon; source-authority lockfile fetch into a Linux-only store; pinned-image preparation with owned
  buildx state; slot ownership checks; cleanup and inventory. Candidates never receive a Mac bind mount or Docker socket.
- `lab/bin/box.mjs`: contract allowlist of regular git blobs (never `lab/`); deterministic tar with explicit directory ownership;
  offline build, read-only store, read-only case workspace and inputs; uid 10001, dropped capabilities, no-new-privileges,
  read-only root, private PID/IPC namespaces, tmpfs, memory/swap equality, CPU/pids/ulimit/log caps; inspect rejection before start.
- Candidate output leaves through Docker stdout only, capped and timed. Build output is read by an image-owned Node walker
  over a read-only volume. No candidate archive or output is extracted on the Mac. Outside links and special files fail closed.
- Per-case process inventory comparison; container removal; a trusted host-cgroup reader proves the candidate id is absent **and
  observes its own id**, establishing that the hierarchy is visible. The candidate's reservation stays held until this proof
  succeeds; failed cleanup reservations survive this branch's reconciliation. The helper is a one-shot trusted reader, not the
  R27 observer (observer integration remains open).
- Internal arm networks with `inhibit_ipv4`; a fixed-upstream TCP relay; planned every-arm preflight against the Mac canary,
  VM, engine addresses, public DNS/address, and positive `engine` endpoint. The relay/preflight code is unverified against a slot.
  This relay does **not** implement R27's TO capture/bundle protocol.
- `execution-identity/2` includes source, build spec, input allowlist, metadata exclusion list, runner, image/build-input pin,
  read-back Node/pnpm binaries and versions, Linux store listing, canonical hardening/result limits, Docker runtime components,
  and kernel. Slot/config application is separately bound to each execution. Container/volume names stay outside build identity.
- Qualification requires explicit 40-hex authority and evaluator commits and an independent evaluator clone outside the known
  agent-writable roots. Evidence must be inside that clone. It never calls a claimant-supplied SUT callback. Offline verdicts stay
  DIAGNOSTIC. Oracle children retain E01's trusted copied/rehashed Mac execution path. Missing containment is
  `ISOLATION-NOT-IN-FORCE`; `GATE-NOT-RUN` clears only after actual isolated, configured cases and successful cleanup.
- Box image pinned in this branch's `slots.json`. `lab/config/box/build-proposal.json` proposes Linux argv, inputs, limits and the
  measured metadata exclusions. **It is not an authoritative contract version**; its qualification pins intentionally remain null.

## Executed probes and evidence

All Docker lifecycle operations were through `engine.mjs` on the triplex2 socket. Engine/image/build probes ran under
`lab/bin/heavy.mjs`. Unit checks were short direct Node invocations. A selected legacy claim regression command took 36.4 seconds;
it was inadvertently run without the heavy wrapper (no engines); retain that procedural deviation rather than hiding it.

| Probe | Observation | Evidence |
| --- | --- | --- |
| P1 | PASS twice: internal members communicate; Mac and VM canary TCP connections fail | `probes.json`, `probes-probe-1794177783076.json` |
| P2 | NOT RUN: H2 is a VM egress change waiting for Sam under Q86g | same probe reports |
| P3 | Second attempt observed parent/child with distinct session ids; removal followed by cgroup absence on cgroupfs/v2 | `probes-probe-1794177783076.json` |
| P4 | PASS: two offline frozen installs/builds with read-only Linux store; store listing rechecked unchanged | `build-probes-1794178215198.json`, `evidence/raw/` |
| P5 | Linux half PASS: 424 selected source files, five builds, 578 output files each; no differing output path between clean Linux instances. **Mac/Linux dist parity not measured** | same build report |
| P6 | PARTIAL: install + five builds + removal/proof took 51.557 s / 41.630 s, each at a **1.5 GiB diagnostic** cap, below the proposed 2 GiB production cap. 87,474 runner entries each. **Volume bytes, peak memory, separate install/build times and exec overhead not measured** | same build report |
| P7 | Two differing paths: `node_modules/.modules.yaml`, `node_modules/.pnpm-workspace-state.json`; proposed exclusions require contract review | same build report |
| Exclusive slot | REFUSED: resident pool cannot fit the requested 3.5 GiB slot; the recorded 9.75 GiB also includes our transient 512 MiB walker | `arm-probe-1794178293010.json` |

Image/store preparation: `prepare-1.stderr` retains the buildx attempt to write outside the worktree; changed client state to
`runs/g03-buildx` and retried. `prepare-2.stderr` retains a killed 512 MiB fetch (no OOM inspect was retained, so cause is not proven).
The admitted 1.5 GiB retry succeeded: `box.json`, `prepare-3.stdout`. Image:
`sha256:d9daa33801a8c73d7cafd01f4ac39695257215ea4608d7083f8086512f0da506`.
Store listing: `c13cf21f64047faa85410506693d395759deb687084023bfd4d60027ce92cafd`.

First reduced-input install failed because implicit tar parent directories were root-owned:
`build-probes-1794178049247.json`, `evidence/raw/1794178049247-build-0.stdout`. Explicit uid-10001 directory entries fixed it;
the successful retry is a new attempt, not a replacement of that failure.

### Isolation regression results

`smoke-1794178167399.json`: **7/7 PASS**, no remaining resources. It exercised actual containers:

1. Toolchain and Linux store identity/immutability.
2. Absent oracle path, Python and Mac paths, plus read-only workspace.
3. Detached child rejected by the survivor check; namespace removed and cgroup gone.
4. Oversize output kills/removes the case container.
5. Timeout kills/removes the case container.
6. PID-1 termination through tini/SIGTERM fails closed.
7. Outside symlink rejected by the trusted walker.

The first smoke report (`smoke-1794178008052.json`) preserves a fixture failure: SIGKILL sent to namespace PID 1 from inside was
ignored, so that did not terminate the runner. The replacement uses tini's handled SIGTERM and retains the first result.
This is **not** complete T1–T8/N1–N4 coverage; pids exhaustion, all restore variants, and the slot/other-arm checks need more fixtures.

`unit-final-3.tap`: **6/6 PASS**, including changed inspect-profile rejection, regular input restrictions, tar byte fidelity,
explicit-commit refusal without invoking a candidate, failed-proof reservation retention, and protected-clone refusal.
`claim-core-1.tap`: **65 selected legacy tests PASS**. Command:
`node --test --test-name-pattern='^(admit|CMP|contract|RULINGS Q64a)' lab/bin/test/claim.test.mjs`.
This intentionally did not run the historical Mac qualification tests: their same-repository/ref-based fixtures need migration to
protected-clone/container fixtures. No full `pnpm check`, package build on the Mac, pack check, or full legacy qualification suite ran.
All five edited/new execution modules pass `node --check`; `git diff --check` passes. No independent verification is claimed.

## Not completed / next round

1. The production 2 GiB build and 3.5 GiB registered-slot relay/preflight need admission after the orchestrator parks a resident.
   This builder did not park lane D or either shared resident. No registered-slot case was executed.
2. No authoritative contract version, case-manifest pins, A0/verifier registry entries, or frozen trace were added. The contract
   owner must review the proposed box fields, exclusions, execution schema and Linux build placement. Existing blockers stay.
3. `obl-case.ts` semantics, fault injection/witness production, and PAIR-0 remain unimplemented/unintegrated. The generic executor
   can execute authority-pinned argv/cases but does not invent those semantics. Claims needing them remain diagnostic.
4. Mixed-slot compositions and lane D gateways are refused/unsupported. There is no separate lane D gateway container here and
   no lane D durable-readback claim. R27 TO/observer-bundle integration and paired placement also remain open.
5. No protected evaluator clone was provisioned outside this builder's writable roots; only the refusal rules were tested.
   A genuine source/evaluator/authority-pinned end-to-end claim still needs a reviewer-owned execution.
6. Complete P2, P5 parity, P6 measurements and the remaining negative fixtures. Output is conservatively capped across Docker's
   buffered streams; stderr over the cap can also fail a case, and only 64 KiB stderr is retained in case evidence.

Q86g residuals remain explicit: R1 shared kernel; R4/N4 engine egress; D1 development runs on the Mac; D2 shared Docker socket and
writable VM HOME mount; D3 external ref writers; L1 and N1–N4 remain named until H1/H2 is resolved. No VM mount/network changes were
made. Same-user/outside-Docker actors and kernel/runtime compromise remain outside this containment guarantee.

## Cleanup and retained evidence

`cleanup-before.json` found only our Linux store volume; `cleanup-store.json` records its removal; `cleanup-after.json` reports
**zero CX-G03 containers, volumes or networks**. The built image is retained and pinned. The store receipt is now historical and
cannot be used as proof that a usable store still exists. Reprepare it through `engine.mjs box prepare` for the next run.
No unknown engine volume, resident, original source, first failure or unrelated cache was removed.

`evidence/objects/` retains smoke inspect/output objects; `evidence/raw/` retains failed/successful build logs;
`evidence/source/` and `source-final.json` retain final evaluator source preimages/hashes. These final source pins are not retroactive
execution identities for earlier diagnostic attempts. Raw temporary probe directories also remain under `runs/g03-*` in this worktree.
No source or dependency cache was copied into evidence. Do not adopt these builder diagnostics as semantic qualification.

---

# Round 2 — work without an exclusive slot

**Result:** implemented the requested no-slot policy, harness fault controls, layout and gateway code. No exclusive admission
was attempted this round; no resident was parked. **Still UNQUALIFIED and not merge-ready under Q87** because the full legacy
evaluator suites have 33 failures. No approval, promotion or completion of business cases is asserted.

## Changes

- Contract **0.3.12 draft** now pins the box image/build inputs, Linux store listing and authority lockfile, limits, regular source
  allowlist and the two measured metadata exclusions. The semantic build argv/outputs/run remain null under Q65e; a missing
  `obl-case.ts` is not replaced with a placeholder. Generator validation/regeneration passes. No A0, verifier, oracle or manifest
  acceptance was invented.
- `box-policy.mjs` reads obligations, slots, load contract and lockfile through the supplied Git object's explicit full commit id.
  It checks the load-contract hash, slots/image agreement and lockfile/store agreement. A store receipt supplies only the physical
  volume name; image/build/listing/lockfile mismatches are rejected. Engine-side box operations and slot operations accept the same
  explicit authority/repository. Qualification forwards these values, so it does not select main by name. An inventory check with
  `TX2_CONFIG_DIR` deliberately set to a missing directory succeeded using pinned policy (`round2/authority-inventory.json`).
- The production cgroup proof and network preflight were extracted into shared scripts/validators. Preflight results require the
  complete ordered target list, a positive engine endpoint, failed blocked-target connections and failed public DNS; missing or
  altered evidence fails closed. Synthetic failures exercise those same implementations, without a production weakening flag.
- PAIR-0's contract layout assigns engines 0–1 / 2–3 and auxiliary cores 4 / 5. SUT, relay and observer share their arm's auxiliary
  core; arms never share a core. Layout validation rejects duplicate slots, overlap, out-of-range cores and inconsistent auxiliary
  placement. `BoxExecutor` applies optional layout to relay/case auxiliary placement with cpuset and no CPU quota. This is **not**
  M01 statistical execution; engine/observer no-quota placement and cgroup regime readback remain integration work.
- Lane D now has a separate candidate gateway plan and launcher: read-only instance source, pinned image/build inputs, ordinary
  hardening, 1.5 GiB cap, private arm network, alias `gateway`, one auxiliary core, and readiness check. Its entrypoint overrides the
  resident launcher so it cannot start a transactor. DA01 source at `1f09771c25b7bc11ef4344de9de389352ba8b4b4` hardcodes a loopback
  `base-uri`; the adapter retargets that Clojure var to `engine:4334` before main without rewriting read-only source. The arm relays
  4334 and 4335 and requires a transactor-only engine labelled with advertised host `engine`. Gateway image pins remain null until
  DA01's image/source integration is independently reviewed. No gateway JVM or Datomic engine was started. Dev durable readback
  remains DIAGNOSTIC, and the code explicitly refuses unimplemented SQL-peer storage instead of trusting a storage label.
- `round2/window.mjs` is a one-shot slot diagnostic with explicit source/authority/evaluator identities, copied authority configuration,
  retained-volume refusal, store verification, real relay/preflight and a containerized TCP canary. It cleans only its new slot state.
  `round2/SLOT-RUN.md` gives exact commands pinned to implementation/authority
  **`e847718a23d08ceb57ffc5dfb444b505e57653b7`**. They require the orchestrator's window and were **not run** here.

## Gates and retained failures

- `round2/unit-final.tap`: **12/12 PASS** (original six box tests plus six policy/layout/gateway/proof controls).
- `round2/contract-generate-2.txt`: generator validation and second regeneration byte-identical for draft 0.3.12.
- `round2/synthetic-1794179638018.json`: **6/6 PASS** on source/authority
  `2efba925a876be89a93092747b082f9216e44a62`, with retained authority file hashes. Actual synthetic containers demonstrated:
  live cgroup rejection; acceptance after deletion with a visible reader; rejection when reader visibility is missing;
  isolated positive preflight; rejection of a deliberately reachable forbidden target; rejection of a missing positive endpoint.
  All synthetic containers/networks/volumes were removed. Raw preflight/request/inspect objects are copied to `round2/evidence/`.
- `round2/claim-suites.tap`: full `claim.test.mjs` and `claim-round2.test.mjs`, through heavy.mjs: **75 PASS / 33 FAIL / 108**.
  The failed fixtures expect the old ref-based, same-repository Mac runner, callbacks, plan-only gate or offline-qualified behavior;
  they now stop at the explicit-commit/protected-clone guard, with downstream expectations consequently failing (one reads null core,
  another expects an evidence directory that was never created). They were **not skipped or weakened**. They need migration to the
  new contained fixture model before Q87 allows a contract merge. This is a material remaining test-suite blocker.
- The first synthetic attempt `round2/synthetic-1794179442305.json` failed before candidate execution: the prior pinned image
  `d9daa...` was absent from the daemon. Retained as the first failure. Engine-managed preparation using explicit commit
  `e64c2b9c1e91be685771e374a3244a0f5128dd1b` and the same pinned Dockerfile/base/lockfile completed. Image and store hashes changed;
  **no substitution was accepted against the old pins**. A new draft contract pins the observed image
  `sha256:302cbcd48d5b68ca49d020204c08814fac74c451fb51e13a62b908f368423575` and store listing
  `64bfed7194f5f8d852286cd923bd050f520f47562dd1937a86c3253d5bbc356e` (`round2/store.json`). The cause of different rebuild bytes was
  not established. Do not infer reproducible image/store rebuilding from a shared recipe hash.
- `node --check` passed for edited execution modules; `git diff --check` passed. Evaluator integrity at frozen implementation
  `e847718a23d08ceb57ffc5dfb444b505e57653b7` reported no problems. Synthetic checks are diagnostics, not independent verification.

## Retention and next action

`round2/inventory-final.json` shows no CX-G03 containers or networks. One deliberately retained, engine-labelled immutable Linux store
remains: `tx2-g03-r2store-store-b2b3e6e8cdfb`. Its retention is declared in the shared engine ledger and `round2/store-retention.json`,
so the requested window can start without a network fetch. It has no resident process or memory reservation. Do not prune it before
that window; the final command in `round2/SLOT-RUN.md` removes it explicitly afterward. No credential/dependency cache was copied
into evidence; only the prepared Docker volume holds the dependency store.

The next orchestrator action is the frozen diagnostic command sequence after opening a window. Before any semantic qualification,
migrate the 33 legacy fixture failures, integrate/pin the real OBL runner and fault/paired measurement paths, integrate R27 observer/TO,
and review DA01's transactor-only/gateway image and source. No H1/H2 VM changes were made; Q86g residuals from round 1 remain.

---

# Round 3 — migrate the evaluator fixtures to containment

**Builder:** CX-G03. **Base:** `c78d7aacc4873adfc468cd0b9cefac873f2bae61`. This round changes the fixture model, not the
qualification floor. All candidate executions are synthetic, network-none containers; no exclusive slot is requested.

## Fixture model and groups

The common fixture foundation (`lab/bin/test/contained-fixtures.mjs`) creates a separate Git-anchored evaluator under
`/Users/sam/.tx2-evaluator/fixtures-g03-r3-*`, outside the known agent-writable roots. It copies the actual evaluator files,
commits their actual bytes, passes that full evaluator commit and a full authority commit, and runs the evaluator **from that
clone**. Candidate sources are separate commits. The fixture authority pins the real box image, an engine-managed empty Linux
store, the exact lockfile blob, allowlist and small 64 MiB build/case/walker limits. The limits remain pool-admitted, inspect-checked
and execution-identity-bound. Production defaults remain unchanged. No candidate callback, forged Docker success, protected-root
exception, ref-based authority, live database or exclusive slot is used.

Offline execution is now an explicit option: it executes the authority argv through the same BoxExecutor using network none,
records actual Linux toolchain and executions, and **always** retains DIAGNOSTIC, GATE-NOT-RUN and RUN-NOT-ON-GATE. A semantic
`run.core.verdict === QUALIFIED` is only a positive fixture control, never qualification. Legacy supplied callbacks remain ignored.
The CLI's old Mac-side localSut path is removed. Final-use input, oracle and evidence guards are exposed without changing their
production callers so external-controller faults can test the exact guard after proving the candidate cannot reach those files.

All original named tests remain; no skip, todo, filtering, removed test or relaxed comparator is used. The 33 failing tests from
`round2/claim-suites.tap` are covered as follows:

| Group | Old failures | Preserved intent and contained expression |
| --- | ---: | --- |
| Build, A0 rebuild/alias/mismatch, manifest cases, comparator, answer rule, wrong answer | 7 | Actual tiny container builds; A0 identity frozen from the real warm build; all pinned cases/modes; raw retained comparator objects; explicit v2 identity and Linux toolchain assertions |
| Oracle refusal, missing PAIR-0, forged records, export-ignore, promotion, registry, W0/fingerprint | 7 | Full-id authority and source variants; actual candidate/oracle execution where applicable; original typed refusal assertions; no acceptance of claimant records |
| Control edit, oracle/evidence edit, detached helper | 3 | Real separate control volume and read-only candidate volume; inaccessible oracle/evidence Mac paths and symlink attempt; exact re-hash/end guards for external corruption; positively observed detached helper followed by cgroup/container absence |
| Gate/slot, offline verdict, CLI | 3 | Actual offline boxes replace plan-only success; invalid slot refuses before build; outside-clone call and supplied gate callback cannot provide evidence; CLI runs real cases but exits 2 DIAGNOSTIC |
| Integrity F1, F2, Q75c, F3/F10, F4/T6, F7, F8 | 7 | Persistent evaluator edit and real restore; Git replace-ref attack ignored; unpinned compiled oracle stays diagnostic; source and build-created outside links rejected; fresh tmpfs namespaces with planted-file positive control; external evidence deletion plus candidate denial; promotion before candidate execution |
| Integrity unreadable evidence, mode/link identity, PATH binary, same-instance edit, final input delete/rewrite | 6 | Real permission fault at the production end guard; real walker modes/link and target-byte identity changes; actual image Node compared with recorded toolchain while a hostile Mac PATH wrapper remains unused; read-only instance/input mutation attempts plus exact final-use guard against external faults |

The three previously passing integrity tests (early returns, Q75g and Q75h) retain their assertions too. Q86 replacements are
explained in comments at the tests: paths that used to differ by Mac directory now differ by container tmpfs namespace; candidate
access to Mac oracle, evidence, evaluator, Git and control files is prevented before any re-hash would have to detect it.

## Validation and first failures

Foundation commit: `852aa59d` (separate from both test-file groups). `round3/box-policy.tap`: **13/13 PASS**.
The first smoke (`round3/smoke-1.log`, `smoke-result.json`) reached a passing semantic core, then shared-pool admission refused
256 MiB during the A0 position run after another lane's reservations increased. It is retained as an interrupted diagnostic,
not called a passing smoke. The tiny fixture limits were reduced to authority-pinned 64 MiB; admission and hardening stay enabled.

A duplicate smoke was queued behind the four heavy-job tokens, then cancelled to avoid competing with the full suite. It had
just started, so `round3/smoke-2.log` is an interruption, not a result. Its exact holder-labelled container/volumes were removed
through engine.mjs; `round3/smoke-2-cleanup.json` records cgroup proof, empty inventory and removal of its temporary evaluator and
source roots. The first cleanup command used the fixture id rather than the BoxExecutor's random run prefix and was refused;
the corrected command used each resource's actual prefix. Read-only oracle directory modes required restoring write permission
within that exact interrupted fixture root before deletion. No shared or unknown resource was removed.

`round3/claim-suites-1.tap` retains the first full command: **15 integrity tests PASS, one integrity failure, and a claim-file
module-load failure** (reported as 17 TAP tests rather than its eventual 108 named tests). The PATH probe read the whole Linux
Node binary into its 64 MiB process; it returned empty output. The claim file imported the trusted `walkTree` before that
function was exported. Corrected the missing export and changed the PATH probe to stream the binary hash, adding an explicit
zero-exit assertion before parsing JSON. `round3/path-probe.{mjs,json,log}` reproduces exit 137 for the original whole-buffer
probe and exit 0 with the real image Node path/hash/version for the streaming replacement at the same cap. OOM attribution is
not separately proven by an OOM inspect; only the actual exit codes and output are retained. Both containers were removed with
successful cgroup proofs. `round3/box-policy-2.tap`: **13/13 PASS** after the export correction.

`round3/integrity-positive.json` retains the first honest contained result and all 303 content-addressed objects (base64), not
just references into a deleted temporary clone. `node lab/experiments/EXP-G03/round3/replay-evidence.mjs` verifies every object
hash, re-judges **all 64 case-result/2 records PASS**, checks the exact two offline blockers, zero remaining resources and
**66 successful kill proofs** (`round3/replay-evidence.json`). This is fixture evidence, not production acceptance.
`round3/fixture-provenance-1.json` records its actual full evaluator commit/tree and initial authority/source/store identities.

The second full command (`round3/claim-suites-2.tap`) ran all **108** tests with **107 PASS / 1 FAIL**, no skips. All 16 integrity
controls passed, as did the actual offline CLI and detached-helper kill proof. The remaining oracle/evidence tamper test forgot
to chmod the evidence object writable before its **external controller** corruption (writeStore correctly makes objects 0444).
Restored that original step, added a positive read-only denial assertion, and restore the original bytes **and mode** in finally.
No evaluator behavior or assertion was weakened. The second attempt is retained, not overwritten.

`round3/evaluator-claim.bundle` retains the real evaluator clone used by that command, full commit
`3a5d497f7c0c16d5a662e01cbcf21ea0b02ccbf9`. `round3/source-proof.json` verifies all 13 evaluator source files match this worktree;
`round3/bundle-verify.log` verifies complete Git history. The chmod correction is in the test file, outside those evaluator bytes.
`round3/claim-runs-summary.json` is a diagnostic checkpoint of actual completed variants; request 0 is the deliberate warm build
with a placeholder A0 identity, not a positive result. `round3/fixture-provenance-2.json` records the second attempt's two clones.

The third attempt (`round3/claim-suites-3.tap`, parallel fixture files) exposed an actual reservation race and was stopped;
`round3/third-abort.json` records the owned processes stopped. A Docker-list snapshot can precede a new container's creation,
then its short-lived creator exits before reconcile consumes that snapshot. The old exists-or-creator-pid check drops the live
box's reservation. Removal correctly refused **ISOLATION-NOT-IN-FORCE** instead of running an uncovered kill reader. This is not
an admission-capacity failure, and the proof was not bypassed.

Separate fix commit **`c5b6e8e1`**: BoxExecutor passes its actual Mac controller PID; the creator accepts it only when it equals
its real parent PID. Box reservations carry `cleanupRequired` from birth until explicit removal/proof, even if a Docker snapshot
omits them and the creator is dead. Ordinary engine reservations keep their existing reconciliation behavior. A new regression
covers the before-proof stale-snapshot interval in addition to the earlier failed-proof retention check. **34/34 pool + box unit
checks PASS** (`round3/pool-units.tap`); **14/14 box checks PASS** after the recovery ownership guards (`box-policy-4.tap`).

For the pre-fix orphan only, `engine.mjs box remove --recover-reservation --note ... --proof-image <immutable-id>` can reconstruct
an owned existing container's missing reservation from its inspected memory cap under ordinary pool admission, then remove it
with the normal kernel proof. It rejects a conflicting holder, missing note/proof image and absent/uncapped container. It does
not adopt old execution or make an interrupted claim qualify. `round3/third-cleanup.json` records both third-attempt holders at
**empty container/volume/network inventories**, successful kill proofs, and removed exact evaluator/source roots. No ledger was
hand-edited and no other holder was stopped. The third attempt's two evaluator bundles and provenance remain historical; source
comparisons in earlier artifacts apply at capture time, before this lifecycle fix.

The integrity group is separately committed as **`3836e9d0`**, the claim group as **`3d86014b`**. The final full retry starts at
`3d86014b` with no pending evaluator/test changes. It again runs both complete files with two independent protected clones and
ordinary shared-pool admission; no exclusive slot or resident lifecycle operation is used.

## Final round-3 result

**PASS: 108/108 evaluator tests, zero failures/cancellations/skips/todos**, on committed source **`3d86014b`**. The full successful
receipt is `round3/claim-suites-4.tap` (exit 0; 1,866,765.624459 ms). Exact command:

```sh
node lab/bin/heavy.mjs --label CX-G03-r3-claim-suites4 -- \
  node --test --test-concurrency=2 lab/bin/test/claim.test.mjs lab/bin/test/claim-round2.test.mjs
```

The gate executes genuine synthetic container cases from two independent protected evaluator clones. Final evaluator commits:

- Claim group: `0d160ceef426f0481683ac2a7083974b8ec46e09` (`round3/evaluator-claim-4.bundle`).
- Integrity group: `891c4817d34f1cf04e5cfbb46d27f7d5eb07c396` (`round3/evaluator-integrity-4.bundle`).

`round3/fixture-provenance-4.json` verifies all 13 evaluator files against the committed worktree and records explicit initial
source/authority/store/holder pins. Both bundles verify with complete Git history (`bundle-*-4-verify.log`).
`round3/claim-runs-summary-4.json` retains diagnostic summaries of 15 completed setup/claim variants before cleanup; it is not a
qualification receipt. The CLI's own 64-case honest run passed its semantic core, retained exactly GATE-NOT-RUN/RUN-NOT-ON-GATE,
exited 2, and reported no remaining resources. Every offline outer verdict remains DIAGNOSTIC. **No P1–P5 production claim was
qualified.** The original 108 named tests remain enabled, including all 33 previously failing controls.

Other checks: **34/34 pool/box unit checks PASS**, including the new pre-proof reservation regression; **14/14 box policy checks
PASS** after recovery guards. `round3/contract-verify.log` records successful `build_contract.py --verify`, including second
regeneration byte-identical. Changed/new JavaScript syntax checks and `git diff --check` pass. `round3/evidence-manifest.json`
records final evidence hashes and the committed source/test hashes.

`round3/cleanup-final.json`: **all 10 round-3 holders have empty container/volume/network inventories**, no CX-G03 candidate
reservations remain, and no `fixtures-g03-r3-*` protected clones remain. Normal source-fixture teardown also ran. The sole
CX-G03 volume left is the explicitly retained **round-2** production store `tx2-g03-r2store-store-b2b3e6e8cdfb`; it was not
modified or removed. No image was built or removed this round. Earlier interrupted/failed receipts and their exact cleanup
receipts are retained; none was relabelled as a successful run.

### Limits and open work

- This is the requested **offline fixture migration**, plus the real reservation-race fix it exposed. No exclusive slot was
  requested, no registered-slot qualification or engine benchmark ran, no resident was parked/stopped/recreated, and no Colima
  VM mount/network setting was changed. Neither forbidden port was contacted.
- No main merge or push was performed. Main/contract integration awaits the orchestrator's instruction; Q87 must be rerun on
  that merged source/contract. The separate foundation, integrity, lifecycle-fix and claim-test commits make those conflicts
  reviewable. Current passing evidence applies to this branch's contract, not an unperformed future integration.
- Production semantic argv/manifests/A0 acceptance, PAIR-0 statistical execution, registered-slot relay/preflight integration,
  R27 observer integration and Q86g VM hardening remain the earlier report's open work. No full repository pnpm check, production package build/pack
  check or public package change was performed in this round. Independent review is still required; no promotion is requested.
