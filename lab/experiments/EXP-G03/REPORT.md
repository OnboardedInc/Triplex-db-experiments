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
