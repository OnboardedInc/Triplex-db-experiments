# EXP-G03 pre-round-5: VM probes V1–V7

Status before VM attempt: implementation and offline checks complete; VM numbers pending. No NS claim is qualified by these diagnostic probes.

Scope: R44 sections 2.3, 2.5, 3.2–3.4 and 8.1, read from the main checkout. Source/targets remain lab/SCOPE.md, NORTH-STAR.md and TARGETS.md. Main checkout and acceptance files are unchanged. Trusted synthetic Python/Node workloads import no candidate packages; Python is confined to a separate probe image, never added to the candidate image.

## Offline evidence

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-G03/v-probes-20261109/`.

- `preflight/offline.tap`: 49/49 Node checks, zero skipped/cancelled/todo. Includes a real localhost capturing relay byte round trip and HMAC-chain verification, plus negative controls for each probe's content/freshness/binding.
- `preflight/python-tests.txt`: 3/3 Python checks; actual WAL/FULL ten-row transaction, new-read visibility and readonly refusal, quantiles, timeout. Host primitives only, no VM latency claim.
- C hook passes `cc -fsyntax-only -Wall -Werror`; Linux `LD_PRELOAD` behavior awaits the VM.
- `preflight/pool-box.tap` and `pool-box-short.tap`: 35/35 existing box/pool tests. The first ran through the heavy wrapper after queueing; the second short verification was redundant and is retained. An attempted cancellation found no matching queued process because the first command had finished.
- `preflight/engine-status-before.txt` and `engine-status-latest.txt`: no exclusive reservation; D resident already parked; XTDB/QLever residents total 6.50 GiB reserved. No resident is stopped by this attempt.

## Probe implementation and limits

`v-probes/window.mjs` checks status once at entry and again before each non-slot stage and admission, refuses a held exclusive slot without waiting, builds only through `engine.mjs box prepare-v-probes`, and uses `BoxExecutor` for every workload/helper. Its one owned QLever s1 slot is admitted normally and removed with its newly created volume; an existing s1 volume is refused. All per-probe resources receive cgroup-removal proofs. Raw output stays outside git.

V1 retains 500 fdatasync and 500 SQLite ten-row WAL/FULL samples in both idle and busy conditions, exact mountinfo, the volume device's write-cache setting, SQLite version and explicit durability class. Busy admission additionally requires 256-reader load and measured engine utilization of at least 1.8 cores. The class is conditional on the supplied Lima vz Fsync/Cached premise: guest flush to host fsync; **host power loss remains UNQUALIFIED**. Latency alone never proves that class.

V2 interposes the WAL fdatasync in a trusted image. A parent reader executes 100 fresh read transactions with the flush blocked before the real syscall and 100 after it succeeds but before returning to SQLite; all must see old LSN 0, then LSN 1 must be visible after completion. Hook absence/timeouts fail closed. This is an experimental ordering observation, not a proof for every SQLite build or transaction interleaving.

V3 runs three ABBA blocks, 12 × 1000 ten-row commits, with a separate readonly SQL observer requesting a 250,000 ns period. All three paired p99 changes must be under 5%; busy RESTART checkpoints refuse acceptance. Raw polling costs and checkpoint delays remain available. It models continuous active polling, a conservative duty cycle relative to inotify-woken polling; scheduler cadence is not assumed exact.

V4 uses named FIFOs on one shared volume between two separately hardened containers, 2000 round trips, exact boot/time-namespace/monotonic identity, peer timestamp inside the host's ping interval, and p99 **round trip** at most 50,000 ns (a conservative interpretation of the requested pipe ping). V5 watches the exact shared-volume file using unprivileged inotify, requires MODIFY and CLOSE_WRITE on the watched descriptor, and compares both containers' file bytes to this attempt nonce.

V6 uses a registered, holder-owned QLever slot pinned to CPUs 0,1 and two 30-second, 256-loop SELECT trials: the G03 byte-pipe shape and a byte-capturing relay on CPU 5. The trusted reader is on CPU 4. Capture retains raw directional bytes in a dense HMAC chain, checked independently before teardown. Each trial requires engine >=1.8 cores, relay <0.8 cores, no request failures and all 256 readers completing; capturing throughput must be >=95% of plain. Fixed-query caching may make the engine fail to saturate; that is NOT-ESTABLISHED, never inferred away. The capture implementation is an experimental R27-shaped collector, not O-OBS admission or a production relay qualification.

V7 deliberately records a **synthetic lower bound only**: six roles, 1000 subjects, 256 reader buffers, R44 non-engine memory caps and CPU placement. It always returns NOT-ESTABLISHED for actual NS memory. No candidate code is available in this task's allowed probe model to measure the real future runner. Full R44 caps total 7.0625 GiB; with the two unparkable residents (6.5 GiB), 13.5625 GiB exceeds the 11 GiB pool by 2.5625 GiB. A full engine-plus-layout concurrent cap test cannot be admitted in the one-park window. This open fact requires an orchestrator-approved resource/layout decision; neither this task nor the probe lowers caps or parks a second resident.

## Exact runbook

Run from this branch's worktree at the committed head, with at least 5 GiB host free. The driver rechecks status **after** heavy admission, so a queued command cannot reuse a stale availability observation.

```sh
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
node lab/bin/engine.mjs status
node lab/bin/heavy.mjs --label CX-G03-V-window -- node lab/experiments/EXP-G03/v-probes/window.mjs --out /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-G03/v-probes-20261109/window-1
```

If any exclusive reservation is present, stop; do not retry or wait for admission. If D has been restored, stop for the orchestrator to park only that one resident using its own holder, keeping its volume; the probe driver never takes over another holder. XTDB and QLever dev remain running. Since this attempt finds D already parked, its restoration list is empty; the orchestrator retains responsibility for its existing park. The driver removes its own slot/volumes, invokes `colima ssh -p triplex2 -- sudo fstrim -av`, then `docker context use colima`. Both command results are retained. Any cleanup failure requires recovery before another attempt, never a hidden rerun.

## PASS / receipt audit (rule 9a)

1. `check.mjs:judge`: the only diagnostic OBSERVED grant. Checks content specific to V1–V6 above; requires every observation nonce and binding to equal this attempt/source/image/slot/input envelope; V7 never grants. Every result has `qualification:false`; no QUALIFIED or gate PASS is produced.
2. `run.mjs:retain` and final receipt: accepts only current nonce stdout from freshly created exclusive output files and successful, inspected container exits. Exact source commit is required and tracked source must be clean; image label and source-context digest must match the supplied build receipt. Inspects, request bytes, private volume, slot identity and query hash bind inputs. Cleanup records and remaining resources accompany the receipt; failure forces NOT-ESTABLISHED. A receipt's existence alone grants nothing.
3. `box-engine.mjs:prepare-v-probes`: builds a separate image through pool admission, checks source-context bytes before/after and image label against their digest, records immutable image ID and this build's timestamp. This is a tooling receipt, never a semantic or durability PASS. Apt resolution is not lock-reproducible; resulting image bytes are the execution identity.
4. `window.mjs`: records terminal status without semantic admission; even an exit-zero stage is checked for its fresh receipt and complete cleanup. Existing unit-test assertions grant only offline test success, not VM observation.
5. Inherited BoxExecutor profile and kill proofs are unchanged; content is actual inspect/cgroup state, freshness is this container's lifecycle, binding is exact container ID plus holder/reservation. Failed proof retains reservation and prevents success.

## Contract pin impact (rule 9b)

No `lab/acceptance/` file changed. The evaluator source inventory includes `lab/bin/box-engine.mjs`; its old SHA256 at parent 86976d1 is `abf8c37529dc88992ff6e4589ca765855e9a43bc1774c255dcf41a3cd55a00e1`, new SHA256 is `44ef65e4472287b5946575b8d26ec1f45f823aef9cfaf3e20ba65caea1a3cba0`. No literal acceptance pin for that path was found in this checkout's generated JSON. The contract owner must re-pin the evaluator inventory in its next version; G03 does not edit the contract.
