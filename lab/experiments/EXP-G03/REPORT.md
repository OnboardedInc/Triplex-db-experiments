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

## Round 6 — offline fault injector (implementation audit, before commit)

Merged current main snapshot `1b40aeba83272d4625be714bed1206d5f9086175` without rewriting history, merge commit `3afa747c`. Conflicts were confined to eight acceptance files: ACCEPTANCE.md, RULINGS-PENDING.md, RULINGS.md, budgets.json, build_contract.py, capability-matrix.md, load-contract.json, obligations.json. Each was resolved with main's exact bytes as explicitly instructed. The entire acceptance tree equals that main snapshot, not merely the conflicted files. Proposed pins remain outside acceptance. Standalone `python3 lab/acceptance/build_contract.py --verify` passed and regenerated byte-identically before implementation; repeated verification is in `round6/contract-verify.txt`.

`ns-fault.mjs` owns injection selection, fresh nonce/attempt binding, exact consumer target, pause, paused observer snapshot, proven SIGKILL/removal, same-volume new-container restart, DR recovery comparison and one content-addressed fault-witness/1 per injection. NS.P3 refuses a broker target. C2 uses the same controller with a separately explicit broker point inventory and broker target, plus brokerControl RPC rather than the consumer method. No candidate callback executes in the evaluator. All results remain DIAGNOSTIC and qualification:false; a replay mismatch is retained as a failed case, never converted into success by a witness's existence.

Every driver run now requires a complete ordered before-effect, after-effect, after-checkpoint exchange. The evaluator sends releases over private stdin; candidate RPC only receives the same step/release requests. It never gets an injection schedule or restart bit. The launcher streams stdout while the guarded child waits; Box.execControl bounds streams/time and routes control to the evaluator. The diagnostic provider holds a real SQLite transaction across these hooks and reopens existing tables on restart. Engine-managed pause inspects the exact ID and frozen state; removal checks expected ID before the existing cgroup-gone proof. Missing proof leaves ownership/reservation sticky and prevents restart.

The observer snapshot script uses a new read-only SQL transaction, copies checkpoint, frontier, effect rows, WAL bytes and structural commit-frame/tail metadata. It labels that metadata **structural-only**, not a WAL checksum or sync proof. The VM adapter deliberately requires evaluator-provided page bounds and a recovery normalizer before an injected run can issue a witness; missing integration refuses as FAULT-PAGE-BOUNDARY-MISSING / FAULT-RECOVERY-NORMALIZER-MISSING. No production provider/normalizer is inferred from the diagnostic toy store. C2's production point inventory likewise remains a contract input, not invented authority. These VM adapter paths are not live-verified this offline round.

### PASS / receipt audit (rule 9a)

No new QUALIFIED or semantic PASS grant is introduced. Every observation-to-receipt or positive precondition site added this round is listed here:

- `box-engine.mjs`, pause: content = inspected Paused:true; freshness = inspect after this pause; binding = owned holder/run/name plus exact expected immutable container ID. Existing removal/cgroup-gone is invoked with expected ID; its fresh proof reader must read exactly `gone` before releasing the reservation. The fault adapter requires that proof, exact removed name/ID, current /state mount and observer timestamp before restart.
- `ns-fault.mjs`, hook admission / no-kill release: content = envelope, point, role, cursor/page and Boolean private decision; freshness = fresh nonce and terminal failed-session rejection; binding = exact run/source/evaluator/input/slot binding. No release constitutes a semantic verdict.
- `ns-fault.mjs`, paused/recovered DR objects: content = observed bytes parsed with schema, checkpoint/row count, digest and phase validation; paused checkpoint must match evaluator page bounds; freshness = fresh per-injection UUID and ordered observer monotonic timestamps; binding = exact binding, killed target ID, same state volume, phase. Bytes retained under their computed hash before witness construction.
- `ns-fault.mjs`, restart/recovery evidence: content = new role-matching container ID, identical volume, recovery's observed checkpoint/digest matches retained post-restart effects; freshness = ID differs from killed target, proof nonce matches this attempt; binding = prior exact target/volume plus source/slot/inputs. Expected replay digest comes from the trusted evaluator normalizer; equality is a byte digest comparison, not candidate success. The snapshot's point label retains Q100j's CR residual.
- `ns-fault.mjs`, fault-witness/1/events: content = exact envelope plus hashed transition/evidence/replay details, including mismatches; freshness = per-attempt UUID, current observer freeze instant and incremented point repetition; binding = events object carries exact binding/target/hook and snapshot hashes. The store's returned hash must equal the computed hash for every retained object. A witness records injection, not correctness.
- `ns-fault.mjs`, finish: content = observed handshake inventory, and at least three actual witnesses at each required point when requested; freshness = session-local counts with any failed/busy session refused; binding = one immutable attempt binding and evolving exact target chain. Returns DIAGNOSTIC only.
- Driver `fault.mjs`: complete ordered points and matching page/nonce/run release; fresh UUID per handshake and private response timeout; RPC role and run bound throughout endpoint replacement. Ignored, incomplete, unordered, stale or foreign control fails closed. No candidate can grant release.
- Offline assertions: content = explicit duplicate/gap/digest checks and refusal causes, including real trusted-observer SQLite serialization fixtures; freshness = fresh fixture run and temporary SQL bytes; binding = synthetic source/slot/inputs and exact retained fixture snapshots. These are not VM isolation or qualification evidence.

Rule 9b: `round6/pin-changes.json` inventories old/new source SHA256 relative to the merge commit and any direct contract input pins. No acceptance bytes are edited by this implementation. Rule 9c: compact logs/objects only; no bulky output committed. Validation completion and committed-tree evidence follow below.


Committed-tree attempt 1 (`b5027e32`) retained in `round6/committed-suites.tap`: 205 passing / 207 discovered, two suite-file failures before contained execution because merged main's engine imports `datomic-context.mjs` but G03's protected evaluator inventory omitted it. No assertion was removed or weakened. Added that exact module to EVALUATOR_FILES so the protected clone hashes and copies the complete engine dependency; this is an additional integrity refusal check, not a grant. Remaining 37 pool/box, 50 NS and 47 new fault checks passed in that same attempt. The evaluator suite must be rerun after committing this dependency fix.


Witness schema hardening: comparison against the existing evaluator's `faultWitnessOk` exposed that a CR hook label (for example `after-effect`) is not the manifest case ID required in both `case` and `faultPointId`. Added an explicit evaluator-only `caseIds` map; missing, incomplete or duplicate case pins refuse **before pause**. Each emitted witness now passes the unchanged contract schema predicate with its exact selected case ID. Six atomic/split controls assert this compatibility, and a new control rejects missing/duplicate pins. Also corrected the diagnostic caller outcome to the actually observed protocol state, `hook-acknowledged; target-killed-before-release`; the hook RPC has already acknowledged, so claiming a witnessed connection failure was unjustified. Earlier fault objects are retained as superseded diagnostic producer evidence, not acceptance evidence. The final indexed object set will use the corrected producer.

PASS/receipt audit addendum before this commit: witness content now checks exact schema compatibility and maps both identity fields to the selected case pin; freshness still comes from this session's hook nonce and per-injection attempt; binding now explicitly includes `caseId` in the hashed events preimage. A missing map cannot cause lifecycle effects. The caller-outcome string records the observed handshake/proof ordering, not an invented transport exception. No QUALIFIED/PASS grant is added. This refinement changes only NS diagnostic files, driver support and new tests; the full evaluator suite continues using the unchanged evaluator/Box dependency closure committed at `9fd35406`.


### Round 6 final results

- **Full committed-tree suite: 242/242, zero failures, zero skips**, `round6/committed-suites-2.tap`, 2,235,787.377 ms. This includes **108/108 evaluator fixtures**, **37/37 pool/box**, **50/50 NS**, and the earlier **47/47 fault** checks. The tested evaluator commit is `9fd35406`; every file in its protected EVALUATOR_FILES closure and both evaluator test files remain byte-identical after the NS-only refinement (`round6/evaluator-closure.txt`).
- **Final committed NS component suite: 135/135, zero failures, zero skips**, `round6/final-ns-suites.tap`, at `67d39f4b`: **50 NS + 37 pool/box + 48 fault**. The additional fault check rejects missing/duplicate case pins; six existing controls now also call the unchanged contract `faultWitnessOk` predicate. No existing assertion was removed, skipped or relaxed.
- **Nine corrected witnesses in one synthetic attempt, three per point**, indexed by `round6/fault-objects-v2/nine-injections.json`; **18 linked paused/recovered snapshots**. `round6/fault-link-verification.json` rechecks schema, events SHA256, snapshot SHA256 and attempt/source/target/volume bindings. The atomic model resumes without duplicates/gaps; the planted split-transaction after-effect model records **one duplicate** and replay.equal:false. The ignored hook, incomplete hooks, foreign bindings, stale snapshots/proofs, wrong target, fresh replacement volume and absent cgroup proof all refuse. The trusted observer formatter additionally reads real SQLite fixture bytes at all three boundaries; no candidate/provider is executed on the Mac. The transaction plants and proof faults themselves are deterministic offline models, not a claim of real paused-container execution.
- **Standalone contract verification passed again**, `round6/contract-verify-final.txt`, with byte-identical regeneration. The entire acceptance tree equals main snapshot `1b40aeba83272d4625be714bed1206d5f9086175`. `pins-for-0.4.0.json` remains outside acceptance and unchanged. `round6/pin-changes.json` lists all 14 changed/inventoried source paths with old/new SHA256 relative to merge commit `3afa747c`; none is a direct inputs pin in that merged contract. It still records the protected/driver input changes for the next contract builder; no pins are silently adopted.
- **Cleanup:** all four first/final fixture holders report empty containers, volumes and networks (`round6/cleanup.json`). No exclusive slot was acquired and no resident was parked. The legacy round-2 store is outside these holders and was not deleted. `fstrim` on **triplex2 only** returned 0: 755,920,896 bytes on /dev/vdb1, 95,547,904 bytes on /dev/vda15, 0 on /dev/vda16, and 117,141,504 bytes on /dev/vda1 (`round6/fstrim.txt`).
- **Context limitation:** the explicitly requested `docker context use colima` returned 1: the `colima` context does not exist. Read-only inventory shows `colima-triplex2` and `default` only. `DOCKER_HOST` remains the mandatory triplex2 socket; no fallback daemon, default VM, context creation or metadata repair was attempted. The error is retained in `round6/docker-context.stderr.txt` and cleanup.json.

What remains unverified/not done: no new NS VM smoke, no live pause/kill/restart fault sequence, no production domain replay normalizer, and no 1k registered-slot run. The NS diagnostic coordinator wires the consumer fault path; C2 shares the exported controller/transport and brokerControl hook API but production broker orchestration still needs its pinned C2 point/page plan. Legacy qualifyClaim fault cases remain refused pending the later NS grant integration. No P1–P5 claim becomes QUALIFIED here; no production correctness or latency PASS is inferred from these offline gates. The later orchestrator window owns Q100n's qlever-dev parking. The missing default `colima` context is an external configuration question; this agent did not recreate it or touch that VM.

Evidence index: `round6/INDEX.json`; checksums: `round6/SHA256SUMS`; exact offline replay and future integration requirements: `round6/RUNBOOK.md`. All retained round-6 evidence is below rule 9c's individual-file and raw-directory limits, so no bulky evidence had to enter git or be exported. Separate reviewer acceptance remains outstanding.


Final evidence-tool audit (rule 9a): `round6/verify-evidence.mjs` recomputes terminal TAP pass/fail/skip/cancel counts against INDEX, checks the unchanged fault-witness predicate using schemas read from the explicit merged-main commit (no moving ref), verifies all nine witness objects and 18 DR links, exact run/source/input/slot bindings, distinct attempt/hook nonces, old target and same-volume new-container proof metadata, actual replay digest, three observed repetitions per point, and every SHA256SUMS entry. Freshness is the primary v2 producer's one run ID and per-injection nonces, not an earlier producer's counts; binding is checked across index/witness/events/snapshots and the explicit authority commit. The tool reports DIAGNOSTIC/qualification:false and does not certify the synthetic proof metadata as a real kernel observation. Both suite processes' exit status 0 was observed before summarizing them; cleanup inventories are actual engine.mjs readbacks, not inferred from tests passing. `evidence-verification.json` is the retained verifier output.


## Round 7a: reviewer's two High findings (F1, F2)

Source: `lab/verify/G03/VERIFY-round6.md` (FIX-FIRST, d31569ec). Offline only; no engine, slot or Docker use. Base `95b0593c`, code commit `ef1a9216`. No QUALIFIED or PASS grant is added; every result stays DIAGNOSTIC.

### F1: observer final readbacks and periods are now authenticated

- `ns/observer.py` writes the final source/consumer readbacks and `periodNs` as the last record of its existing HMAC chain (same key, runId, previous head, domain). `seal.json` is only a copy.
- `verifyObserver` requires exactly one final record, last in the chain, with no poll rows after it; requires the domain to be constant across chunks; requires `seal.json` to have exactly the expected keys and every field (head, chunks, runId, domain, final, periodNs) to equal the authenticated values; and returns a seal rebuilt from authenticated values only. Truncating the final record fails even with a matching head.
- `runBoxedNS` records `sha256` of every exported driver/observer/source/consumer file at capture, before any verification (`raw-<run>/terminal.json`, `capture`, plus `captureSha256` in stage 13), for later CR-NS ingestion to compare. The CR-NS ingestion itself is still unwired (round 7b/later).

### F2: failed driver completion cannot reach replay

- `driver.mjs` records every exception on its own path (hook, consumer stop, synchronous code, teardown) in the terminal `end` event. A clean end (`error:null`) now exists only if the run produced its result with no recorded failure; otherwise `DRIVER-INCOMPLETE` or the error message.
- `runBoxedNS` builds a `ns-terminal/1` record from the coordinator's own `docker exec` status and the fault injector's `finish()` outcome (not from driver events). Raw bytes are still stopped, exported and digested first (failed attempts keep their evidence), then `requireCleanTerminal` refuses a nonzero or null exit status or a failed fault stream before `verifyHr`/`checkSmoke`. `checkSmoke` takes the terminal as a required sixth argument and refuses before reading any event.
- `smoke.mjs` no longer runs the obsolete `docker context use colima` (rule 10).
- Limitation: the exit-status branch of `runBoxedNS` is covered by the pure `trustedTerminal`/`requireCleanTerminal`/`checkSmoke` tests and the reviewer's real-driver reproduction; a live boxed coordinator run with a failing driver was not performed (offline round).

### Regressions

- `lab/verify/G03/review-round6.mjs`: the reviewer's reproduction copied with F1/F2 assertions inverted. The unmodified original now fails at its first formerly accepted step (`observer final record missing`); the inverted copy exits 0 (`round7a/review-round6-refusal.json`). With the old driver restored it fails (`end.error` null), confirming the control is live.
- `ns/round7a.test.mjs` (25 tests): a seal-only edit of each consumed field (12 cases), the reviewer's fabricated-consumer case, in-chain edit without key, re-sign with another key, truncation, rows after final, second final, wrong run/key, domain change; the real `observer.py` (paths redirected, fsync for fdatasync on macOS) verified end to end and then edited; terminal refusals (missing, foreign run, nonzero, signal, hook failure, forged source) before events are read; the real-driver reproduction run as a subprocess.
- The existing `obs()` fixture in `offline.test.mjs` was updated to the real two-record shape; its assertions were not removed or weakened.

### Gates (committed tree `ef1a9216`)

- Full suite: **268/268**, zero failures, zero skips (`round7a/committed-suites.tap`): 108 evaluator fixtures, plus 160 NS components. Previously 242; the difference is the 25 new tests plus one more fault check added in round 6.
- NS components: **160/160** (`round7a/ns-suites.tap`): lab 22 + box/policy 15 + offline 50 + fault 48 + round7a 25. Previously 135.
- Evaluator fixtures 108/108 on a committed tree; no protected EVALUATOR_FILES entry changed.
- `build_contract.py --verify` passes and `lab/acceptance` equals main snapshot `1b40aeba` (no diff).
- Reviewer reproductions refuse (above).

### PASS / receipt audit (rule 9a)

Each site that turns observations into a verdict, with content / freshness / binding:

- `verifyObserver` (observer evidence): content = HMAC over every record including final readbacks and periods, exact seal copy equality; freshness = runId in each record plus per-run random key; binding = same key, runId, previous-head chain and constant domain.
- `trustedTerminal` / `requireCleanTerminal` (driver completion): content = exact exit status 0 and `faultFinish.ok === true`; freshness = produced from this run's exec result; binding = `runId` equal to the run binding and `source:'coordinator-exec'`.
- `checkSmoke`: unchanged content checks (named-cut answers, offers/receipts, final source/consumer state against the trace); now additionally bound to a clean terminal and an authenticated final record.
- `verifyHr`: unchanged (end `error:null` plus HMAC chain, run binding); the end event is no longer sufficient on its own.
- Capture digests: content = sha256 of exported bytes, freshness = taken this attempt before verification, binding = path under the run's raw directory; not yet consumed by CR-NS.
- Reviewer script / regression tests: positive assertions only follow the refusal assertions; stubs are trusted offline models and are disclosed in that script.

Rule 9b: `lab/acceptance` untouched. Pinned-file hashes (none is an acceptance input pin; `round7a/pin-changes.json`):

| Path | Old sha256 | New sha256 |
| --- | --- | --- |
| lab/bench/ns-driver/driver.mjs | b7fda0b06a410976d12261614a989c2f4a7549bd42be3afdc9f1a44c1eec3abe | 687061d04c64e2a12becd8f28cb7787840842724739352c71c39847df102c8bb |
| lab/bin/ns-run.mjs | 8ba7f0dd3868ff4f70b5e8957ee07e698bcd0b6ec1dcd6e96ba4813838d862d5 | 93f2267c8e9682bfc9f922be332b288f1be5be94a17bdbf8400c72f17f897ef4 |
| lab/experiments/EXP-G03/ns/observer.py | a5fb217a8ebecdde5ad52e8550e3dbe19d9ce8d491dc3a7aad073cfd1f18f735 | d89731b984a0b4dc978d9721fcec58b3f68764e3a4ca84290940b991bdcb8aaa |
| lab/experiments/EXP-G03/ns/smoke.mjs | 683d7e3a87cf62eabf1029ceaf7d120dd1fb314b20bcab9b0e9b65a41499bb9b | 7ac90c5d7fe4cb6056308bba41ea9344f307363afdd72d0b17a181584816bd7b |

The driver bundle hash changes with driver.mjs; the next contract builder must re-pin it. Rule 9c: all round-7a evidence is under 1 MB; durable copies and SHA256SUMS are in `/Users/sam/Claude/Projects/triplex-db-2/evidence/G03-R7/`. Index: `round7a/INDEX.json`, `round7a/SHA256SUMS`.

Not done: R48 sync-witness integration (round 7b), any live boxed or VM run, CR-NS ingestion, production normalizers.


## Round 7c: reviewer's F3 (medium) and F4 (low)

Source: `lab/verify/G03/VERIFY-round7a.md` (FIX-FIRST, reviewed `ef1a9216`/`9c4b68aa`). Offline only; no engine, slot, VM or Docker lifecycle use; Docker context stayed `default`. Base `9c4b68aa`, code commit `87c86a10`, rule 10 fix `733daf5c`. No QUALIFIED or PASS grant is added; everything stays DIAGNOSTIC.

### F3: a rejected control session now exports, digests and refuses (or retains the volumes)

- `runBoxedNS` catches a rejected `execControl` (failed onControl/handshake, malformed or truncated JSON, timeout, output cap, FAULT-POINT-DR-CONTRADICTION). The terminal is a coordinator-owned `ns-terminal/1` with `driverExit:null` and `controlFailure:{ok:false,error,partial:{stdout/stderr bytes and sha256}}`.
- Safe stop: the driver is removed with kill proof first (killing the `docker exec` client does not stop the container process), then the observer is sealed, then every candidate container is removed with proof, then raw export and capture hashing run. The partial streams are exported as `raw-<run>/control/stdout` and `control/stderr` and are digested in `capture`. Then `requireCleanTerminal` refuses with `DRIVER-CONTROL-FAILURE <cause>`. No result is returned, so no semantic grant follows.
- Retention: any throw from stop, teardown or export (this covers the old nonzero-exit path too) before the export completes moves the run's per-run volumes (broker, consumer, output, observer, trace, key, bundle, observerCode, control) out of `box.resources`, so `box.close()` cannot delete them. They are listed in `box.retained` and in `ns-<run>-retained.json` (`export:"NOT-PROVEN-SAFE"`, reason, volume names, terminal), with stage 14. The thrown error carries `rawDir`, `terminal`, `retained`, `candidateLogs` and `runId`.
- `box.mjs` `execControl` attaches `error.partial` to every rejection. This is the only box.mjs change.
- `smoke.mjs` and `exclusive.mjs` record `rawDir`, `terminal`, `retained` and the logs captured before removal on failure. Retained volumes are not in `box.resources`, so `close()` leaves them; they appear in `terminal.json`/`receipt.json` as `retainedVolumes`.
- `exclusive.mjs`: removed the obsolete `docker context use colima` step (rule 10); the context stays `default`.

### F4: every observer record's clock domain is validated

`verifyObserver` tracks initialization (`domainSeen`) apart from the value and requires every record's `domain` to be exactly `{bootId (36 chars), primitive:'CLOCK_MONOTONIC', offsets:{monotonic:['0','0'],boottime:['0','0']}}`, else `observer domain invalid`. A non-null change still gives `observer domain changed`.

### Regressions (`ns/round7c.test.mjs`, 17 tests, `ns/round7c-harness.mjs`)

- The harness runs the exact committed `ns-run.mjs` and the exact `box.mjs` `execControl` bytes (vm-loaded, real `FaultInjector`) against a trusted Box model, one subprocess per mode.
- Rejected hook (DR contradiction), control timeout, truncated control output, malformed control JSON and output cap each assert: `DRIVER-CONTROL-FAILURE` plus the cause; the terminal fields; 8 exported files with every digest recomputed from the on-disk bytes; partial streams exported and digest-bound to the terminal; ordering (driver removed, then observer sealed, then walks, then `close()`); no volume deleted before the export; no result returned.
- Unprovable walk and unprovable teardown assert the exact retained volume names, the retained.json gap, that `close()` left the volumes, and that no `raw-*` directory is presented as an export.
- Baselines (status 7, null status, finish failure) still export six digested files. A `requireCleanTerminal` control covers `controlFailure`.
- F4 controls: constant valid accepted; null first; null in all records; null middle or final; non-null change; malformed constant domains.
- Liveness: against the `9c4b68aa` `ns-run.mjs` and `box.mjs`, 12 of the 17 fail and 5 pass (baselines, F4 accept control, domain change). No round 7a assertion was changed.

### Divergences from the review's proposal

- The reviewer's `coordinator-review.mjs` was a standalone harness. Here it became a committed test plus harness. The model's `walk` and `close` were extended so retention can be asserted.
- Retention keeps all per-run volumes; it does not try to guess which are "forensic". Input volumes `ns-in-*` and the ping volume are not retained.
- On a control failure the driver is removed before the observer is sealed; on a resolved exec result the original order (observer first) is unchanged.
- `box.mjs` is changed even though it is in the protected evaluator closure (orchestrator decision: carrying partial streams is the right behavior). See pins.

### Gates

- Full committed-tree suite at `87c86a10`: **285/285**, zero fail/cancel/skip/todo, exit 0 (`round7c/committed-suites.tap`): 108 evaluator fixtures plus 177 NS components (was 268; +17).
- NS components at `87c86a10`: **177/177** (`round7c/ns-suites.tap`); rerun at `733daf5c` after the exclusive.mjs change: **177/177** (`round7c/ns-suites-final.tap`).
- Evaluator fixtures run separately: **108/108**, no EVALUATOR-TAMPERED output (`round7c/evaluator.tap`).
- `python3 lab/acceptance/build_contract.py --verify` as its own step: exit 0, byte-identical regeneration (`round7c/contract-verify.txt`). `lab/acceptance` has no diff against `9c4b68aa`.
- All suites ran through `heavy.mjs --label G03-R7C`. The full and evaluator runs were at `87c86a10`; the only later change is the exclusive.mjs line, which no suite imports.

### PASS / receipt audit (rule 9a)

- `trustedTerminal` / `requireCleanTerminal` (driver completion): content = exact exit 0, `faultFinish.ok` and no `controlFailure` key (a forged `driverExit:0` cannot hide it); freshness = built from this run's exec result or rejection; binding = `runId` equal to the run binding and `source:'coordinator-exec'`. The partial-stream digests are computed from the bytes exported this attempt.
- Capture digests: now include `control/stdout` and `control/stderr` on a rejected session; taken at export before any verification; bound by path under the run's raw directory.
- `verifyObserver`: content = HMAC over each record plus the full clock-domain object check on every record and equality with the seal copy; freshness = per-run key and `runId`; binding = constant domain across the chain.
- Retention record (`ns-retained/1`): makes no PASS claim; it records which volumes were kept and why; `qualification:false`.
- `checkSmoke`, `verifyHr`: unchanged.
- Tests: positive assertions follow refusal assertions; Box and transport are trusted models (disclosed in the harness header); digests are recomputed from files on disk, not read back from the code under test.

### Pins moved (rule 9b; `lab/acceptance` untouched; none is a contract input pin; `round7c/pin-changes.json`)

| Path | Old sha256 (9c4b68aa) | New sha256 |
| --- | --- | --- |
| lab/bin/box.mjs (PROTECTED EVALUATOR CLOSURE, in claim.mjs EVALUATOR_FILES) | 96b9d9cc9485ef2fcfd13362a69a5e126a0cbf36bb93cdf978402908d89411c1 | 589028dca91ca8c90865994dd483df4694999360f9485520c9c963296b1dc906 |
| lab/bin/ns-run.mjs | 93f2267c8e9682bfc9f922be332b288f1be5be94a17bdbf8400c72f17f897ef4 | aa99c4fae29d72f2558e47fb14e6abcf12748caf7f21fd45a9fbe4e87fcffd82 |
| lab/experiments/EXP-G03/ns/smoke.mjs | 7ac90c5d7fe4cb6056308bba41ea9344f307363afdd72d0b17a181584816bd7b | a5d8cecd5fd48b3abd1b1fcdd4d71c75a177dfc83bacb067b51c58f83b86aaa5 |
| lab/experiments/EXP-G03/ns/exclusive.mjs | 4290c09a8a66cb36782e0572e717e131974567bae978912e414486874cfad71e | cef7f4672a9e78198f1b4dc0890d748ee62bdd1c6c8c7c71724b01c861359d4f |

`box.mjs` moves the protected evaluator closure: contract 0.4.1 must re-pin it together with the round 7a driver bundle. `lab/bench/ns-driver/**` and `observer.py` are byte-identical to `9c4b68aa`, so the driver bundle hash is unchanged by this round (the round 7a change, `5eb71216...` to `21d3fd1e...`, still awaits re-pin). The evaluator run raised no tamper refusal.

### What did not run / not verified

- No live boxed or VM run, no pause/kill/restart, no CR-NS ingestion, no production normalizers, no P1-P5 qualification.
- Real Docker behavior is model-only: `docker rm -f` on a paused or killed consumer, the engine's kill proof after the exec client is killed, and the walker against a stopped run. `smoke.mjs` and `exclusive.mjs` were only syntax-checked.
- Retained volumes stay in the lab VM until someone removes them; the smoke exits 2 and lists them.
- Separate reviewer acceptance of this round is outstanding.

Evidence index: `round7c/INDEX.json`; checksums: `round7c/SHA256SUMS`; durable copy at `/Users/sam/Claude/Projects/triplex-db-2/evidence/G03-R7/round7c/` (all files under 1 MB).

## Round 7d: reviewer's F5 (medium), F6 and F7 (low)

Source: `lab/verify/G03/VERIFY-round7c.md` (FIX-FIRST, reviewed report head `67844167`, implementation `87c86a10`). Offline only: no live boxed or VM run, no engine slot, no Docker lifecycle command by the builder; the Docker context stayed `default`. Code commit `78307fcf`. No QUALIFIED or PASS grant is added; everything stays DIAGNOSTIC.

### F5: the retention guard starts before the terminal and includes stage 10

- `runBoxedNS` now defines `forensicVolumes` and the guarded `try` before `trustedTerminal` is built and before `stage(10)` is appended. A failure in either is tagged `persistenceError` and goes through the same catch as a stop, teardown or export failure.
- The catch detaches the run's nine per-run volumes from `box.resources` (so the caller's `close()` cannot delete them), lists them in `box.retained`, and writes `ns-<run>-retained.json` with two new fields, `persistenceGap` (the append error) and `originalCause` (`DRIVER-CONTROL-FAILURE <cause>`, `DRIVER-EXIT-NONZERO status=N` or `DRIVER-HOOK-FAILURE <cause>`, else null).
- The thrown error keeps the original cause first: `DRIVER-CONTROL-FAILURE <cause>; TERMINAL-PERSISTENCE-GAP <append error>`, with the append error as `cause`. A clean run whose stage-10 append fails throws the append error unchanged. The error carries `retained`, `terminal`, `runId`, `candidateLogs`.
- Nothing is exported in this case (the stage log is incomplete, so the attempt is not trusted); the volumes are the evidence and stay in the VM.

### F6: control envelopes are validated before property access

`execControl` checks the parsed top-level value: JSON `null`, arrays and scalars call `fail(Error('FAULT-CONTROL-ENVELOPE'))` with the partial bytes, so the coordinator's rejection path (terminal, export, retention) runs instead of a TypeError in the stream callback. Objects with another `schema` are still ignored, because the driver prints its final result object on stdout (`driver.mjs` line 221).

### F7: raw bytes

`execControl` keeps the received chunks as Buffers. Lines are framed on the 0x0a byte (so a multibyte character split between chunks is safe) and decoded strictly: a UTF-8 round trip must reproduce the line bytes, else `FAULT-CONTROL-JSON`. `partial.stdout`, `partial.stderr`, `partial.pending` and a resolved exec's stdout/stderr are the concatenated raw chunks, so the terminal digests, byte counts and the exported `control/stdout` and `control/stderr` are of exactly what was received. No `TextDecoder` is used, so the vm test contexts (including the reviewer's) need no new global or import.

### Regressions (`ns/round7c.test.mjs` 27 tests, was 17; `ns/round7c-harness.mjs`)

- F6: `control-null`, `control-array`, `control-scalar` join the rejected-control table: `DRIVER-CONTROL-FAILURE FAULT-CONTROL-ENVELOPE`, failed coordinator terminal, 8 digested exports, exact partial bytes, volumes deleted only after export.
- F7: `ff 0a` (invalid UTF-8), `c3 | a9 0a` (split multibyte, not JSON), `7b 22 61 22 3a 22 e2 82 | ac` (split, truncated) and a valid object line with a multibyte character split across chunks followed by `null`. Each asserts the exported bytes equal the supplied bytes (hex), the terminal byte count and sha256, and `capture['control/stdout']`.
- F5: one-shot EIO on only the stage-10 append (`stage10-control` rejected hook, `stage10-nonzero`, `stage10-clean`): all nine named volumes survive `close()`, no close-time removal of them, `box.retained` and gap list them, gap has `persistenceGap` and `originalCause`, no `raw-*` directory, no walk, stage 10 absent and stage 14 last.
- Liveness: against the `67844167` `box.mjs` and `ns-run.mjs`, the 10 new tests fail and the 17 existing pass. Old `box.mjs` alone: 7 fail; old `ns-run.mjs` alone: 3 fail.

### Divergences from the review's proposal

- Stage-10 failure refuses and retains rather than continuing to export: the stage log would be incomplete. The reviewer asked for detach and gap, which this does.
- A failure while writing the gap or stage 14 no longer replaces the thrown error; it is recorded as `gapWriteError` on it. The volumes are already detached before that write. This changes the round 7c behavior the reviewer's matrix recorded for "gap-write failure" (the refusal was the gap-write error; it is now the original error).
- "Where possible" is implemented for control, nonzero-exit and hook failures; a clean-terminal run has no original cause to keep.
- An unparsable line is still `FAULT-CONTROL-JSON`; the new `FAULT-CONTROL-ENVELOPE` covers parsed non-object values only. A parsed object with a foreign schema is ignored, not refused.
- `partial.pending` is the raw tail, as before but now unmodified bytes.

### Gates (committed tree `78307fcf`; the report commit changes only REPORT.md and `round7d/`)

- NS components: **187/187** (177 plus 10), exit 0, `round7d/ns-suites.tap`.
- `python3 lab/acceptance/build_contract.py --verify` as its own step: exit 0, second regeneration byte-identical, `round7d/contract-verify.txt`.
- Evaluator fixtures run separately: **108/108**, exit 0, no EVALUATOR-TAMPERED output, `round7d/evaluator.tap`.
- Full suite: **295/295** (285 plus 10; 108 evaluator fixtures plus 187 NS components), zero fail/cancel/skip/todo, exit 0, no EVALUATOR-TAMPERED output, 1,883 s, `round7d/committed-suites.tap`.
- All ran sequentially through `heavy.mjs --label G03-R7D`. `df -h /` showed 93 GiB free before the first. `lab/acceptance` has no diff.

### PASS / receipt audit (rule 9a)

- `trustedTerminal` / `requireCleanTerminal`: unchanged. The terminal is now built inside the guard; content = exec status, finish result, control cause; freshness = this run's exec result; binding = run ID. If it cannot be built or logged, no terminal is presented as an export; the gap record carries it (or null).
- Capture digests and partial-stream digests: content = sha256 of the exact received bytes (no decoding), freshness = taken at export this attempt, binding = path under `raw-<run>/`. They are not re-derived from decoded text.
- Retention record (`ns-retained/1`): makes no PASS claim; `qualification:false`, `export:'NOT-PROVEN-SAFE'`; binding = run ID, binding object, volume names built from the run ID.
- `execControl` envelope check: refuses, never accepts; the only positive path (a `ns-control/1` object) is unchanged and still goes through `injector.handshake`.
- Tests: refusal assertions come first; digests and bytes are recomputed from files on disk or compared to the supplied hex, not read back from the code under test; Box, transport and fs fault are trusted models, disclosed in the harness header.
- `checkSmoke`, `verifyHr`, `verifyObserver`: unchanged.

### Pins moved (rule 9b; `lab/acceptance` untouched, contract unchanged; none is a contract input pin)

| Path | Old sha256 (67844167) | New sha256 |
| --- | --- | --- |
| lab/bin/box.mjs (PROTECTED EVALUATOR CLOSURE, in claim.mjs EVALUATOR_FILES) | 589028dca91ca8c90865994dd483df4694999360f9485520c9c963296b1dc906 | a90715c708b6329bc8c07d12531aac4d88b0ce275fa1352bb46a3483e34fe481 |
| lab/bin/ns-run.mjs | aa99c4fae29d72f2558e47fb14e6abcf12748caf7f21fd45a9fbe4e87fcffd82 | bb9105e18a321438d7b8c2594f9de975862d082acf225f1ea22fae7f3ca5720d |

Against the original `9c4b68aa` base, `box.mjs` was `96b9d9cc9485ef2fcfd13362a69a5e126a0cbf36bb93cdf978402908d89411c1` and `ns-run.mjs` `93f2267c8e9682bfc9f922be332b288f1be5be94a17bdbf8400c72f17f897ef4`. `smoke.mjs`, `exclusive.mjs`, `observer.py` and `lab/bench/ns-driver/**` are unchanged, so the driver bundle hash is unchanged. Contract 0.4.1 must re-pin `box.mjs` (new value above) with the pending round 7a bundle.

### What did not run / not verified

- No live boxed or VM run, no pause/kill/restart, no CR-NS ingestion, no recovery normalizer, no P1-P5 qualification, no exclusive slot.
- The stage-10 EIO, the stream bytes and the Box are trusted models; real Docker volume retention after a host I/O fault was not observed. The reviewer's `stage-review.mjs` reproductions were not rerun (they live in the verify worktree); the equivalent cases are covered by the new harness modes.
- Evaluator and full fixtures use their existing private-daemon synthetic containers through engine.mjs (the gates asked for them); no other container work.
- The evaluator tap run used `TX2_FIXTURE_TRACE` under `/tmp`; those traces are not committed.
- Separate reviewer acceptance of this round is outstanding.

Evidence index: `round7d/SHA256SUMS`.
