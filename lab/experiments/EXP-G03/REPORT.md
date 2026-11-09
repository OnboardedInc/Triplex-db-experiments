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
- No merge into main or push was performed. Main/contract integration awaits the orchestrator's instruction; Q87 must be rerun on
  that merged source/contract. The separate foundation, integrity, lifecycle-fix and claim-test commits make those conflicts
  reviewable. Current passing evidence applies to this branch's contract, not an unperformed future integration.
- Production semantic argv/manifests/A0 acceptance, PAIR-0 statistical execution, registered-slot relay/preflight integration,
  R27 observer integration and Q86g VM hardening remain the earlier report's open work. No full repository pnpm check, production package build/pack
  check or public package change was performed in this round. Independent review is still required; no promotion is requested.


# Round 4 — merge main and audit grant paths

North star: correctness floor for all P1–P5 claims. This round integrates reviewed contract/evaluator changes without claiming registered-slot qualification.

## Merge and conflict intent

Merged exact main `f1e4b116` into `exp/G03-executing-gate` from `e5909dd1`; main had advanced beyond the dispatch snapshot. No main checkout edits, merge into main, or push. Main's X02, C8 and J01 code is included by this merge; the requested focused gates do not independently qualify those implementations.

- `lab/bin/test/claim.test.mjs`: retain all contained execution assertions, full commit IDs and protected clone; main's >1 MiB contract-read fix is preserved by `gitSource`'s verified blob reader (1 GiB cap) and `fixtureGit` (128 MiB cap), replacing the obsolete ref-based `git show` setup. No assertion removed or weakened.
- `lab/bin/test/claim-round2.test.mjs`: retain all 16 integrity controls in their contained form; the same bounded large Git reader preserves main's buffer fix without restoring Mac callbacks. A source comment records this equivalence.
- `lab/bin/test/claim-fixtures.mjs` (automatic merge): retain main's distinct O-CONTRACT/O-ERR fixture pins, complete per-runner file lists, and the updated refused migration selection. G03's contained executor consumes these committed fixture authorities. These pins qualify synthetic fixture bytes only.
- `lab/bin/claim.mjs` (automatic merge): retain main's shared complete runner-pin predicate, screening-only refusal and declared compiled-runner hash check, alongside G03's protected evaluator/container path and reservation-race fix.
- `lab/bin/gate.mjs` (automatic merge): preserve C8's read-path wire-counter refusal and G03's executing OBL forwarding.
- `lab/acceptance/ACCEPTANCE.md`, `capability-matrix.md`, `obligations.json`: resolve using exact merged main. Also restore main's `build_contract.py` and `load-contract.json`, whose automatic merge had retained draft G03 generator edits. **All generated acceptance outputs and the generator are byte-identical to merged main**; no generated files edited or regenerated here. The nongenerated Q93 table cross-reference formatting fix is described below.

The removed draft isolation fields are preserved at `pins-for-0.4.0.json`: box image/build/store pins, source allowlist, metadata exclusions, execution-identity/2 and PAIR layout, plus slot-box agreement and original source commit. This is a proposal, **not production admission authority**. Main still has no boxSpec, so production execution fails closed until a reviewed contract supplies it. The contained fixture helper and policy unit fixture publish the proposal into their own synthetic committed authority; production `authorityPolicy` still reads only its explicit full commit. Test store caps/listing/lock pins remain fixture-specific. No contract authority is read from main by name.

## Q93a and rule 9a PASS audit

Full path inventory and content/freshness/binding analysis: [round4/grant-audit.md](round4/grant-audit.md). It enumerates comparator/case-record/real-executor grants, reference and document-core labels, final qualifier and CLI/OBL forwarding; all G0/G1/G2/NS/GS/G4 success consumers; and shared receipt verdict construction. It also records why preflight, kill, slot, readiness and resource evidence can only refuse.

There are more than a few surfaces. **Proposal only:** one final evaluator-owned admission constructor that reopens and rejudges a sealed, source/authority/slot/input/attempt-bound bundle after cleanup; all other paths return observations or refusals. No such redesign implemented.

I cannot honestly confirm content/freshness/binding at every existing success expression in isolation: pure comparators rely on callers, semantic core lacks final isolation checks, document labels are diagnostic, and legacy gate receipt construction trusts status/count adapters. The audit explicitly marks these limits, including receipt.verdictOf not independently checking positive counts.fail without a reason. Those are reported design risks, not new PASS claims. The outer qualifier's end checks and offline refusal remain in force.

For **this round's test result statements**, content is actual TAP per-test results and exact summary/exit code; freshness is newly named round4 output files and the protected clone commits retained in `fixture-provenance.json`; binding is `source-snapshot.json`, evaluator bundles, authority/source commit IDs, fixture holders/stores and final cleanup inventory. All original 34 pool/box assertions run on this merged source; one additional regression asserts that main without reviewed box pins cannot borrow the nearby proposal. Contract verify is a failure, never relabelled PASS. No semantic engine or performance acceptance is inferred from passing fixtures.

## Validation

First evaluator run: **104/108**, zero skipped/cancelled/todo (`round4/claim-suites-1.tap`, exit 1). All 16 integrity controls passed. One failure is the inherited Q93 self-check error; three others (alias, missing-pair control, background-helper run) did not reach their expected semantic outcome. Their per-run diagnostic JSON was removed by the normal fixture cleanup, so their earlier refusal cause cannot be established from this TAP and is **not attributed as proven** to disk or pool pressure. Host free disk temporarily approached the 5 GiB admission floor. All first-failure evidence is retained. A second full suite records each exact request and result through fixture cleanup. No test assertion is changed. Initial pool/box: **34/34** (`round4/pool-box.tap`); final with the additional proposal-refusal regression: **35/35**, zero failed/skipped/cancelled/todo (`round4/pool-box-final.tap`).

`build_contract.py --verify` **fails**: Q47d/Q64f detect Q74a–e and Q83a–e both pending and compiled, because Q93's old/new comparison table has old ruling IDs as pending rows. `round4/contract-verify.log` retains this failure. A read-only `python3 -B /Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py --verify` reproduces it on main (`round4/contract-main-baseline.log`), proving it is inherited from current main. The second attempt makes only a formatting correction in nongenerated `RULINGS-PENDING.md`: existing Q74/Q83 identifiers in Q93's comparison table become inline-code cross references, so the parser does not mistake them for pending declarations. Wording and rule authority are unchanged; the original empty-self-check-error assertion is preserved. Verification now passes the clash checks but reports **REGENERATION NOT BYTE-IDENTICAL: obligations.json, ACCEPTANCE.md** (`round4/contract-verify-2.log`). Those generated outputs remain untouched, as instructed; the contract owner must regenerate them.

## Limits

Offline only; no exclusive slot requested or used, no resident parked/stopped/recreated, no VM mounts/network changes. No live registered-slot preflight/P1–P7/PAIR-0/gateway execution, year-one performance, X02/C8/J01 integration suites, or production QUALIFIED verified. Contract pin promotion and the upstream Q93 pending-table/generation correction remain for the orchestrator/contract owner. Round3's old evidence-manifest REPORT hash describes its historical report bytes; round4 has a new manifest instead of rewriting historical evidence.


Round-4 gate commands (from this worktree):

```sh
node lab/bin/heavy.mjs --label CX-G03-r4-claim -- node --test --test-concurrency=2 lab/bin/test/claim.test.mjs lab/bin/test/claim-round2.test.mjs
node lab/bin/heavy.mjs --label CX-G03-r4-pool-final -- node --test lab/bin/test/box.test.mjs lab/bin/test/box-policy.test.mjs lab/bin/test/lab.test.mjs
python3 lab/acceptance/build_contract.py --verify
node lab/experiments/EXP-G03/round4/replay-evidence.mjs
```

`round4/claim-positive.json` and `integrity-positive.json` each retain 303 hash-verified objects, 64 recomputed PASS case-result/2 records and 66 cgroup-removal proofs. Both outer verdicts remain DIAGNOSTIC with exactly GATE-NOT-RUN and RUN-NOT-ON-GATE (`round4/replay.log`). `bundle-binding.json` confirms the saved source/authority bundles contain the exact positive-attempt commits. No cleanup or process observation grants semantic admission.


Second-attempt command additionally sets `TX2_FIXTURE_TRACE` to this worktree's `round4/attempt2/attempts` directory. The trusted fixture helper saves the exact request and protected evaluator result there after each call, so a later assertion cannot hide an earlier refusal reason. This is diagnostic retention only; no candidate or production grant behavior changed. `round4/attempt2/source-snapshot.json` records the final fixture helper and nongenerated pending-document bytes separately from the first attempt. The first cleanup audit succeeded with no own resources beyond the retained round-2 store (`round4/cleanup-final.json`).

Attempt two captured the environmental refusal directly: both `request-1.json` results contain `ISOLATION-NOT-IN-FORCE: host free disk below 5 GiB`, plus fail-closed evaluator errors. Their inner core labels are QUALIFIED but their case counts are only 46 and 53 (additional A0 prerequisite execution was interrupted); outer verdicts remain DIAGNOSTIC and resourcesRemaining is empty. This is concrete evidence for the Q93a audit: an inner core label cannot grant final admission. These are **failed attempts**, not positive evidence, even though some content comparisons passed. Files remain under `round4/attempt2/attempts`; no assertion or admission floor is relaxed.


Attempt two finished **102/108**, exit 1, zero skipped/cancelled/todo (`round4/attempt2/claim-suites.tap`). Six assertions about the positive runs failed after the recorded low-disk interruption: integrity input-delete/rewrite controls and claim manifest coverage, strict rejudge, gate-plan/execution and offline-result checks. The contract-reference self-check, missing-pair, alias and background-helper assertions now pass unchanged. All exact requests/results remain in `attempt2/attempts`; two environmental disk refusals and the expected source-link/clone negative controls are separated in `attempt2/isolation-refusals.json`. The later background-helper run passed 64 semantic cases with exactly the offline refusal pair (`attempt2/background-positive.json`), but this does not turn the failed suite into PASS.

`round4/attempt2/cleanup-final.json` confirms all new containers/volumes/networks, own reservations and both protected clones are gone, preserving only the declared round-2 store. Attempt three starts the complete unchanged 108-test suite with roughly 10 GiB host free disk (`attempt3/source-snapshot.json`), the same two-module command, a new label `CX-G03-r4-claim-3`, a new trace directory and an explicit terminal exit-code artifact. No retry deletes or relabels an earlier failure. No admission threshold or assertion is weakened.

Attempt three again encountered the shared host disk floor, this time after clean 64-case positive runs and all 16 integrity controls had passed. The background-helper, promotion, unregistered-slot and supplied-fingerprint requests record `host free disk below 5 GiB` (`attempt3/disk-refusals.json`). Host free-byte observations and source binding are retained in `attempt3/disk-observations.jsonl`. No threshold, assertion, resource cap or admission check was relaxed; no other job, resident, VM or unrelated file was changed to obtain a pass. No fourth full-suite admission is made under this recurring external condition. **A clean 108/108 result remains unverified; do not promote this branch on the partial results or combine successful subsets across attempts.**

The clean third-attempt positive artifacts (`attempt3/claim-positive.json`, `integrity-positive.json`) each replay 303 objects, 64 comparator PASS results and 66 cgroup-removal proofs, with outer DIAGNOSTIC and exactly the two offline refusals (`attempt3/replay.log`). Their source and authority preimages are retained and checked (`attempt3/bundle-binding.json`). These are transport/control evidence, not a replacement for the failed complete suite and not production qualification.


## Final round-4 result

**Verification blocked; not ready for promotion.** Main `f1e4b116` is integrated in this worktree with every original fixture assertion preserved. Three complete 108-test attempts ended **104/108**, **102/108**, and **103/108**; all had zero skips, cancellations and todo. Final attempt exit 1 and exact summary/failing names are in `round4/attempt3/claim-suites.tap`, `exit-code.txt` and `round4/validation-summary.json`.

The final five failures are the background-helper, promotion, supplied-fingerprint, gate-plan/execution and offline CLI assertions. Four qualification requests explicitly record the host disk floor; the CLI reports two additional EVALUATOR-ERROR codes, but its detailed result was not retained by the CLI helper, so **the underlying CLI error cause is unverified** rather than assumed to be disk. A stable host-disk run is still needed to establish a clean 108/108 result and, if the CLI error repeats, retain its complete stdout/result for diagnosis. No successful subsets are combined into a suite PASS.

**35/35 pool/box checks pass**, including all original 34 plus the unpinned-production-authority regression. Syntax checks, source-snapshot equality and git diff checks pass. Generated acceptance outputs and `build_contract.py` still equal the exact merged main commit; final contract verification fails only byte identity for `obligations.json` and `ACCEPTANCE.md`. The contract owner must regenerate them in its reviewed version; G03 isolation policy remains an explicit proposal for 0.4.0.

Final cleanup (`round4/attempt3/cleanup-final.json`) confirms both final fixture holders and the CLI holder have no containers or networks, no newly made volumes, no reservations, and no protected clones. Only `tx2-g03-r2store-store-b2b3e6e8cdfb` from round 2 is retained as previously declared. No new image or production dependency store was built in round 4.

The Q93a grant inventory and rule 9a audit are in `round4/grant-audit.md`; the single-grant redesign remains a proposal. No exclusive slot, resident lifecycle change, VM mount/network change, registered-slot execution, live preflight/PAIR-0/gateway validation, package integration/performance qualification, merge into main or push was performed. Open work: obtain a stable host-disk verification window, resolve the CLI diagnostic gap if it repeats, regenerate the contract through its owner, and later run the registered-slot plan against explicit reviewed authority/evaluator commit IDs.

Final evidence manifest: `round4/evidence-manifest.json` binds 20 source files and 106 evidence files (including this report), excluding itself. The recorded evaluator commits and Git bundles preserve the exact protected code and positive source/authority preimages.

## Pre-round-5: V1–V7 probe preparation

See [V-PROBES.md](V-PROBES.md) for implementation, offline checks, diagnostic grant audit, exact command sequence and pin impact. 49 Node probe checks, 3 Python checks and all 35 existing pool/box checks pass. VM execution and numeric observations are recorded separately after the window attempt; no offline fixture supplies a VM fact. V7 remains an explicit synthetic lower bound, and the complete R44 cap layout cannot fit the permitted one-park window.

Pre-round-5 window completed at source `4a53fd01`: V2 WAL-sync/publication ordering and V5 cross-container inotify observed; V1 saturated busy floor, V3 overhead, V4 domain/pipe limit, V6 relay adequacy and V7 actual memory fit remain NOT-ESTABLISHED. The significant design counterexample is distinct time-namespace inodes despite a shared VM boot. See V-PROBES.md for all numbers and receipt paths. All new containers, volumes, networks and the owned QLever s1 slot were removed; trim and context restoration succeeded. D was already parked and was not touched. The probe image is retained; legacy round-2 store is unchanged. No contract edits or qualification grants occurred.

Final pre-round-5 evidence: V-PROBES-INDEX.json and V-PROBES-SHA256SUMS bind 168 durable files (101,331,584 bytes), with 121 per-probe hashes replayed. Final offline denominator is 53/53 Node, 3/3 Python and 35/35 pool/box. Raw evidence stays outside git. The final driver change only propagates probe refusals to its exit status; it was syntax checked, with no semantic grant changed or measurement rerun.

## Round 5 — boxed NS runner (pre-smoke implementation)

North star: correctness floor for P1–P5, particularly trusted P2/P3 instants and candidate isolation (SCOPE, NORTH-STAR, TARGETS). Read R44 sections 2, 5.1, 5.2 and 8 and the pending Q100c/q/r and Q103a rulings from main, plus V-PROBES.md.

Merged accepted NSR `709a18f1` in merge commit `4aa5eec9`. One textual conflict: `lab/acceptance/RULINGS-PENDING.md`. Automatic approval review rejected taking the incoming file because rule 9b forbids acceptance edits during this non-contract task. Safe resolution retains **the entire acceptance directory byte-for-byte from G03's pre-merge head**, while integrating the NSR/P3M implementation and its other upstream files. Incoming contract updates are deferred to the contract owner, not silently hand-merged or regenerated. The merge message records this exact resolution. No local assertions were deleted or weakened. NSR's lockfile change required the box-policy unit fixture's **synthetic** authority to hash its own lock bytes; production/draft store pins are unchanged. The initial failures are retained.

Implementation: `Box.service`, `Box.driver`, bounded async start and owned exec; per-run role/private trace/key/output/state volumes; trusted launcher staging under its private tmpfs while its artifact stays RO; Q100q boot/zero-offset checks including the restricted child's inherited record; Q100c inspect/mount/listener/route/DNS checks; observer RO source/consumer mounts and no network; Q103a separates frozen trace and RNG data from all candidate role inputs and instance artifacts. The smoke compiles NSR's candidate entry/provider into regular JS blobs without evaluating candidate code on the Mac. Its fixture uses independent WAL/FULL source and consumer stores, named-cut reads from an in-memory replica through RPC, and no shared candidate files. The public durable-flush export is resolved to its exact implementation for the tiny diagnostic build and retained in the bundler metafile. It is not a qualified lane provider.

The step log follows R44 5.2: source identity, compiled instance/walker, network and per-run volumes, isolated roles, preflight, trusted seed/readback, diagnostic window, driver, drain/consumer frontier, observer seal, cgroup removals, raw HR/observer/state export. Step 13 records **no CR-NS admission**: production normalizers/O-REPLAY/O-DOMAIN/CR-NS, GREEN lease, acceptance durations, round-6 injection and round-7 grant remain future gates. Generic observer wiring is implemented with a diagnostic marker watcher; it is not represented as the independently reviewed OBS01 B6 collector. Contract fields are a proposal only in `ns/contract-proposal.json`.

Offline evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-G03/round5/`. `offline/ns-policy-4.tap`: 27/27, including a real permission-guarded artifact launch with an alternate runtime parent and RO bundle. Earlier attempts retain the noncanonical temporary path refusal and sandbox-denied macOS boot sysctl; the passing attempt used read-only sysctl access without relaxing the launcher. `offline/box-pool-2.tap`: 37/37 (the original denominator grows by two NSR-merge checks), versus retained initial 33/37 after the stale synthetic lock pin. All results are offline DIAGNOSTIC.

### Rule 9a: grant / receipt audit before smoke

- `ns-policy.clockFacts/sameClock`, role plans and `layoutProblems` grant only preconditions: actual proc bytes must parse to the same boot and both zero offsets; exact inspected mount/network facts bind private volumes to this run. Missing facts fail. Different time inodes are diagnostic, as Q100q requires.
- `Box.service/driver/create/clock/exec/startAsync` use this box's resource list, engine-admitted immutable-image containers, actual inspect/exit values and bounded output. Hardened profiles and cgroup removal are inherited unchanged. Driver bundle is separate from candidate instance and stays RO; no user callback enters the trusted driver.
- NS seed/readback compares actual observer-image SQL bytes with the independently generated diagnostic population before warm-up. A successful RPC alone cannot grant the seed check. Population and digest are bound into this attempt's input digest and stage record. This does not supply the future O-DOMAIN fingerprint.
- `verifyHr` grants chunk replay only after exact HMAC bytes, dense sequence, previous head, fresh run/source/input/slot binding, matching seal and a sole clean end event. `verifyObserver` independently checks raw-byte HMAC chain, nonce/run, sequence and final head/count. Run keys are new per run and never mounted into a candidate.
- `checkSmoke` grants only DIAGNOSTIC fixture consistency: every offered command/receipt, every recorded named-cut answer hash, independently observed final source population/values and both exact entry sequences/frontiers must match the frozen diagnostic trace; driver/observer clock facts agree. No candidate summary or timing self-report grants correctness.
- The smoke summary's `OBSERVED` requires all four source-bound ABBA runs to finish semantic checks and 1000 trusted HR offer/ACK intervals per run; active/baseline p99 ratio must be <=1.05. Every actual observer period is retained. It never returns QUALIFIED or changes claim/gate admission. One-round debug runs explicitly cannot establish overhead.
- Teardown/terminal records do not grant semantic acceptance: they retain actual failures, remaining resources and cleanup outcomes. Raw state/HR/observer bytes are exported after candidate cgroup proofs. The new policy module is added to the evaluator source inventory so protected clones cannot silently omit the new Box dependency.

Exact smoke command after committing source (new empty output directory, >=5 GiB host free):

```sh
node lab/bin/heavy.mjs --label CX-G03-R5 -- node lab/experiments/EXP-G03/ns/smoke.mjs --out /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-G03/round5/smoke-1
```

The smoke uses explicitly diagnostic 128 MiB role caps, four reader loops, 16 subjects and 1000 frozen offers per ABBA arm; this is not the proposed acceptance nsLayout, not L256 and not a production performance bar. Dev residents remain up. After VM work the command removes its own resources, trims triplex2 and restores Docker context `colima`. The conditional exclusive 1k run is gated later by the actual smoke result, fresh status, >10 GiB host free, and normal engine admission; no resident takeover is authorized.

Smoke attempt 1 (`smoke-1/terminal.json`, source `c0006127`) failed closed at role readiness before any driver offer. All resources were removed (`remaining: []`), trim/context commands completed, and holder inventory is empty. The first failure stays retained. Empty state/output volumes had not been initialized through the image's uid-10001-owned `/work`; the follow-up initializes them before mounting `/state` or `/out`, preserving all hardening. The original failure did not retain candidate stderr, so that specific underlying cause is not claimed as proven from attempt 1 alone. Follow-up also retains stage logs incrementally and captures all surviving container stderr/stdout before cleanup on any error, making future first causes reviewable. These are initialization/diagnostic changes; no threshold or admission check is relaxed.

Smoke attempt 2 (`smoke-2`, source `ba7b1439`) passed role startup, clock ping/zero-offset, private-mount and network/file preflight, then failed on a generated seed-RPC script newline syntax error. It retained incremental stages and candidate stderr; all resources were removed and trim/context succeeded. The failure is kept. A real offline seed-RPC round trip now verifies exact newline-delimited request bytes/run/population. Preflight output now requires exact fresh run/role/denied-path/blocked-target coverage plus positive route and DNS results; omission controls were added. HR/observer schema tags and the runtime artifact hash are checked; source Git IDs are separated from the source listing SHA256, and the actual diagnostic RNG seed is bound in the private input digest (it remains unreadable by candidates). The other-arm listener is positively checked before using it as a denied target. These extend content/freshness/binding in the audit above; no production grant is introduced. `offline/ns-policy-6.tap` and `box-pool-3.tap` retain the expanded passing gates; earlier failed gate outputs are preserved.

Smoke attempt 3 (`smoke-3`, source `673afa74`) completed driver execution, consumer drain, observer seal and candidate cgroup removals, then failed at the trusted walker export. Its initial walker cap was only 64 MiB despite a larger WAL/event export; the original stderr was empty, so OOM is a hypothesis rather than a proven first cause. The follow-up uses the existing 512 MiB walker profile after candidate removal (no candidate or acceptance cap changes) and records actual walker exit/inspect/OOM facts before removal. All attempt-3 resources were removed and cleanup completed. No correctness/overhead result is claimed for that attempt. Raw files and the attempt key are now durably exported **before** semantic replay, so any future semantic refusal retains its complete preimage. This export receipt checks fixed relative paths from the trusted walker, uses exclusive files under a new run directory, and binds the exact run/source/input/artifact metadata; it grants no acceptance by itself.

Smoke attempt 4 (`smoke-4`, source `2afa1852`) completed its first 1000-offer baseline with exact source/consumer/read consistency. The observed arm retained all raw exports and failed `offer bytes/receipt`: its HR event order contained `offer-208`/position 209 immediately before `offer-207`/position 208. Every ID was present exactly once. This was an ACK-completion ordering assumption in the smoke checker, not evidence of swapped receipt contents. The fix matches by unique command ID, then still checks every exact command, echoed ID, expected receipt position, complete final source/consumer entry sequence and every named-cut read hash. The source-prefix ordering assertion is unchanged. Added controls reject duplicate/missing IDs, changed command bytes, wrong receipt position and wrong echoed ID; a reply completion permutation is accepted. The retained failed terminal is not relabelled or replaced. This is a diagnostic checker correction, not a relaxed count/timing bar or an acceptance promotion.

Smoke attempt 5 (`smoke-5`, source `4846ff55`) completed a baseline and observed arm, then the second observed arm failed the unchanged receipt-position assertion: actual source publication assigned `offer-228` position 228 and `offer-227` position 229. This time the native order truly differed (not merely ACK completion). The raw first failure remains. The diagnostic fixture now declares an explicit `sequence` on each offered command and queues **inside the candidate broker** until earlier offered sequence numbers arrive. Pending sequence distance and duplicates are bounded/refused; it never knows or applies the value of a future unoffered command. Final source-prefix and receipt assertions stay strict and unchanged. This makes the synthetic source protocol deterministic under TCP arrival reordering, rather than weakening the gate. It does not claim this globally ordered fixture is a qualified production composition or a P2 optimization.

### Completed P-TINY smoke (attempt 6)

Source `42bd3e214d344cff10ef81230af49417c2087acf`, evidence `round5/smoke-6`: four ABBA arms completed, **1000 offers each**, exact source and consumer frontiers/entry bytes, every recorded named-cut answer hash, driver artifact/permission record, HMAC chains and final seals. All four per-role isolation preflights refused private driver output, trace/key/bundle, other state paths, oracles, Python, other arm and forbidden network targets; positive broker routes and the other-arm listener were separately checked. Clock facts used equal boot/zero offsets, retaining distinct inodes and each run's 2000-ping uncertainty measurement.

Trusted offer-to-ACK p99 in ABBA order: **52.103107, 73.769666, 77.116083, 147.619950 ms**. Frozen paired-mean comparator `(B1+B2)/(A1+A2)-1` is **−24.452514%**, so it does not exceed the 5% smoke refusal limit. Baseline drift is large; this is **DIAGNOSTIC and not evidence of an observer speedup or calibrated acceptance overhead**. Active observer actual period p50/p99: **469.085 / 2374.591 us**, then **455.797 / 1654.059 us**. Baseline observer is idle at approximately 50 ms; its periods are not called 250 us polling. Full per-poll bounds remain in raw observer files; no nominal cadence is substituted. Every receipt binds `guest-durable, host-fsync, drive cache not flushed`; no host power-loss claim.

The shared private input preimage was read back by a trusted host-side Docker exec from the last driver's RO config and hash-checked before that arm's measured window: capture file mtime **10:51:24.747 UTC**, stage 9 **10:51:33.968 UTC**. It matches all four input bindings (`5e11205ff9becbed55420ce850bba157681d2dde1f1a21be7323bc94bbf70062`). The candidate never mounted it. Future runs save the private preimage automatically before driver execution; this metadata-only addition does not alter or relabel attempt 6. Earlier failed attempts did not all retain the RNG preimage and are not promoted by a later replay. All smoke-6 raw driver/observer/state/key files are retained outside git for CR-NS/O-OBS development, with immutable source IDs and manifest hashes.

Cleanup: all smoke-6 resources gone, trim/context exit 0, `inventory-final.json` empty for CX-G03-R5. No resident lifecycle change. `status-after-smoke.txt` shows **no exclusive reservation**, **6.50 GiB** residents in the **11 GiB** pool; host free was about **13.9 GiB**, above the user-required 10 GiB. An explicit exclusive admission control will now attempt the full R44 role caps on one registered 1k slot; no reduced acceptance layout or resident parking is used. The full caps plus these residents cannot physically fit; a refusal is retained, never labelled a completed 1k NS workload. The available fixture is not a production QLever replica provider; even an admitted diagnostic control would not qualify that lane.

Final preflight hardening also rejects a candidate attached to a second network and an observer with a writable candidate-state mount; new offline negative controls cover both. The conditional executor's `receipt.json` is DIAGNOSTIC only: it checks fresh source, >10 GiB, no held exclusive, actual engine registration/ID/image/config, every ordinary pool admission, and actual cleanup. It cannot grant QUALIFIED or imply that a refused layout executed.

Conditional exclusive attempt 1 (`exclusive-1`, source `79810a79`) met the fresh conditions (host free **14,910,914,560 bytes**, no exclusive owner), admitted an owned QLever slot and compiled the candidate/driver, then failed the runner's mandatory input check because the executor omitted its `trace` argument. No NS workload ran; this is not a pool-refusal observation. Slot, new volume, store and box resources were removed, trim/context succeeded. The executor now passes the already-built frozen trace; the next attempt is fresh and rechecks the user conditions, without adopting or overwriting this failure.

### Conditional 1k result and final status

`exclusive-2/receipt.json`, source `cf07a99903f7a91e0b5ff2508a412bd9c8f79bf8`, records a fresh host free check of **14,555,488,256 bytes**, no held exclusive, and actual registered QLever slot ID `57a968c51c9eff4fc69b46a02078c042d99d062de57e2665393d2df0a6536dda`. Its image is `sha256:37d5ede193f1bffb6aebf734d15d2a4c2a3228ee102858b0c6c2e65c149a78ec`; config SHA256 `44b08fad7eebf4a958742f832f3cc3c2035f39ea2a0ef9d3aa141aa3e697555a`. The slot and 1 GiB broker were admitted normally. The next 64 MiB initializer was refused: **11.00 GiB reserved + 64 MiB = 11.06 GiB > 11.00 GiB**. This is a real, fail-closed pool refusal, not a completed 1k NS run. No offers or 1k performance measurements ran. No cap was reduced, no second resident was parked, and no admission retry is made after this resource refusal.

All exclusive resources and the new slot volume were removed; `remaining: []`, holder inventories empty for both CX-G03-R5 and CX-G03-R5-exclusive. Last trim/context exit **0**; triplex2 data device trimmed **103,723,008 bytes**, EFI **95,547,904**, boot **0**, root **117,141,504** (`exclusive-2/trim.json`). The informational rosetta sysctl warning remains in stderr. Both dev residents stayed up, D's existing park was untouched, the earlier retained Linux store remains declared, and the default VM was never addressed.

Separate raw-byte replay by this builder, **not independent reviewer acceptance**, (`replay.mjs`, `replay.json`) rechecked raw byte HMAC chains, source/artifact/input digest, every named-cut answer, exact source/consumer contents, current strict inspect/mount/network checks and clock facts for all four successful smoke-6 arms: **4000 offers, 11,735 reads**. Ping p99 by arm: **13.542, 43.875, 48.167, 11.292 us**. Each run retains five distinct container time-namespace inode observations, all in the same boot with zero offsets. There are **44 cumulative distinct cgroup-removal proofs** across the four runs (11 added per run); these are cleanup preconditions, never semantic grants. Replay is DIAGNOSTIC and does not relabel any earlier failed attempt.

Final offline gates: **50/50 NS checks**, **37/37 box/pool checks**, zero skipped/cancelled/todo. Bundler metafiles and both actual executable artifacts are retained. Syntax and diff checks pass. `build_contract.py --verify` fails **Q61i: slots lane images must agree with IMAGE_PINS**: the explicitly requested NSR code/config merge brought newer lane configuration while the acceptance directory was retained under rule 9b/automatic review. No generated output or ruling was edited to hide this. The contract owner must integrate/re-pin it in its own version. The entire acceptance directory equals pre-round-5 G03 `1a2f362b` byte-for-byte.

Pin impact: [round5/pin-changes.json](round5/pin-changes.json) lists old/new SHA256 for eight changed inventoried/pinned inputs relative to `1a2f362b`: box-engine, box, claim, engine, gate, new ns-policy, slots and pnpm lock; it separately lists the three driver/candidate source adaptations against accepted NSR `709a18f1`. It preserves the old hashes and leaves the contract unchanged. DRIVER_PIN, run.ns, nsLayout, ns-sut/1 and feed-entry/1 are proposals in `ns/contract-proposal.json`, not authority.

Open work / not verified: **a full 1k NS workload did not run** because normal admission cannot fit the required layout alongside the protected residents; an actual production lane provider is still needed. The smoke's fixture is not FD01/SQL01 acceptance, its input trace is a private diagnostic HMAC fixture rather than the frozen W0 acceptance generator, it has four readers rather than L256, zero warm-up rather than acceptance durations, no GREEN/noise lease, no driver-ELU invalidation gate, no B6 WAL-tail/O-OBS production normalizers, no round-6 fault witnesses, and no round-7 single grant. Node 22.23.2's existing box image was used diagnostically; NSR's documented Node-24 target and FD01's SQLite >=3.51.3 floor require a reviewed runtime before production use. Claim/gate NS qualification is not wired to this diagnostic runner without contract pins and the later grant; no P1–P5 claim became QUALIFIED. The root pnpm check and full 108-case evaluator suite were not rerun in this round. [round5/RUNBOOK.md](round5/RUNBOOK.md) gives the exact safe continuation and distinguishes admission control from a future production command.

The exclusive executor is specifically an **admission integration control**: its fixture does not connect replica operations through a slot relay to QLever. That production `Box.arm`/provider hookup is still open; the registered slot here proves ownership and resource refusal only. Likewise, the diagnostic marker observer is not a replacement for the pending B6 `obs-bundle/1` WAL-tail implementation. These gaps cannot be closed by relabelling the successful P-TINY smoke.

Final rejection-only hardening restricts role placement to bounded memory and its R44 cpuset; caller placement cannot override image, trust, mounts or privileged flags. Six additional offline controls cover this. Existing VM smoke placements satisfy the stricter policy; no performance rule or measured output changes.

Final retention index: [round5/INDEX.json](round5/INDEX.json), [round5/SHA256SUMS](round5/SHA256SUMS). **1630 durable files, 425,877,316 bytes**, including **21 files over 1 MB**, remain under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-G03/round5/`; all 1630 file hashes were replayed after writing the manifest. Only compact index/manifest/runbook/pin-change documents are committed. Earlier failures remain indexed. Final builder result: boxed P-TINY transport/isolation/correctness smoke completed DIAGNOSTIC; full 1k NS execution, production relay/provider integration and qualification remain blocked/open as described above. Independent reviewer acceptance is still required.
