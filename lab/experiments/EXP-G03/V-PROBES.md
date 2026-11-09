# EXP-G03 pre-round-5: VM probes V1–V7

Window executed: V2 and V5 observed; V1, V3, V4, V6 and V7 NOT-ESTABLISHED. Final offline checks: 53 Node + 3 Python + 35 pool/box. No NS claim is qualified by these diagnostic probes.

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

### Offline refinement before the VM attempt

`preflight/offline-final-2.tap`: **53/53**, zero skipped/cancelled/todo; `python-final.txt`: **3/3**. Added real 256-loop reader positive/negative controls requiring the exact seeded SELECT count, invalid duration/CPU refusals, and actual poll-cadence refusal. V1 now records synchronous level and row count read back from SQLite, rather than repeating configuration constants. V3 retains poll start times and reports achieved p50/p99 cadence (median above 0.5 ms refuses the 0.25 ms model). These extend the content checks in audit items 1–2. The first queued VM wrapper was explicitly cancelled with exit 143 before heavy admission; it created no probe resources. No measurement is assigned to that cancelled attempt.

## Window 1: observed results (2026-11-09 08:09–08:13 UTC)

Executed source: `4a53fd01cd2dcb8f9e3b1d73227504ac67632375`. Image: `sha256:3344768f0ab951cb8053083a57e2a923d062dfeb21ac4392171fcf17f9cd11ac`; image-input SHA256 `6fbb6b1e6bf844e74b4e220b744803aca7dbe1a27238abc0ea81f29ac8216844`. SQLite **3.40.1**. All numbers below are from durable `summary.json` and `window-1/V*/receipt.json` / `observations.json`, relative to the evidence root above. The summary hashes each receipt; the committed SHA256SUMS independently indexes every raw file. These diagnostic observations grant no qualification.

| Probe | Result | Measurements | Receipt |
| --- | --- | --- | --- |
| V1 | NOT-ESTABLISHED for busy floor | Idle fdatasync p50/p99 **0.201380 / 2.780146 ms**; ten-row WAL/FULL commit **1.058238 / 4.425556 ms**. Under read load: fdatasync **0.322702 / 6.588319 ms**; commit **1.705832 / 9.463982 ms**. 500 samples of each in each condition. Engine averaged **1.230163 cores**, below the 1.8 busy criterion. | `window-1/V1/receipt.json`, `observations.json` |
| V2 | OBSERVED | **100/100** new readers saw old LSN 0 before WAL fdatasync; **100/100** saw 0 after the real sync while its return was held; final new reader saw LSN **1** after completion. This SQLite/image experiment supports the proposed ordering, subject to its stated coverage limit. | `window-1/V2/receipt.json`, `observations.json` |
| V3 | NOT-ESTABLISHED | Three ABBA p99 changes **−43.561585%, +12.432079%, −2.420140%**. Poll cost p99 **83.341 us**; actual period p50/p99 **470.355 / 702.882 us**, versus requested **250 us**. The required overhead under 5% is unestablished, and exact 0.25 ms polling was not achieved. | `window-1/V3/receipt.json`, `observations.json` |
| V4 | NOT-ESTABLISHED | **2000** FIFO round trips, p50/p99 **17.627 / 99.034 us**, zero peer timestamps outside their ping brackets. Same boot ID, **different time namespace inodes 4026532636 and 4026532634**. Both the equal-inode expectation and p99 <=50 us fail. Namespace mismatch does not by itself prove the clocks have different offsets. | `window-1/V4/receipt.json`, `observations.json`; derived quantiles in `summary.json` |
| V5 | OBSERVED | Other-container write produced masks **2 (IN_MODIFY)** and **8 (IN_CLOSE_WRITE)** on the exact watch descriptor; both sides read back this attempt's nonce. | `window-1/V5/receipt.json`, `observations.json` |
| V6 | NOT-ESTABLISHED | Plain: **61,747** successful requests, **2054.407544/s**, engine **1.378540 cores**, relay **0.200873 cores**. Capture: **54,286**, **1802.371142/s**, engine **1.340234 cores**, relay **0.275574 cores**. **256** closed-loop readers, zero request errors in each. Authenticated capture verified. Capture/plain rate **0.87731918**, a **12.268082%** penalty. Neither engine reached 1.8 cores, so no engine-first saturation or adequate-relay conclusion. | `window-1/V6/receipt.json`, `observations.json`, `capture.ndjson` |
| V7 | NOT-ESTABLISHED; synthetic floor only | 1000-subject role peaks below; the 256 readers here are buffers, not an actual NS reader service. Full concurrent engine-plus-role cap layout remains inadmissible under the permitted one-park budget. | `window-1/V7/receipt.json`, `observations.json` |

V1 mount/device observation: both named volumes were ext4 on **`/dev/vdb1`, major:minor `253:17`**, options `rw,relatime` and super options `rw`; no `nobarrier`. The resolved device queue reports **`write back`**. Together with the supplied Lima vz Fsync/Cached implementation premise, record the class **guest-flush/host-fsync; host-power-loss UNQUALIFIED**. No power-cut, crash-survival, drive-cache flush or independent Lima-source audit was performed. Loaded numbers cannot stand in for a saturated-engine floor.

V3 individual round p99 commit latencies in ABBA order (ms): **2.688174, 2.077878, 0.541312, 1.952619; 2.420222, 3.012057, 2.798398, 2.747747; 3.192051, 2.767516, 3.053390, 2.773223**. RESTART checkpoint durations in the same order (ms): **2.471342, 0.387190, 0.208531, 0.445666; 0.239710, 0.269710, 0.564711, 0.610685; 0.514569, 0.626844, 0.593439, 1.705275**. All 12 checkpoint busy counts were zero. Variation and achieved cadence are retained rather than combining favorable blocks into PASS.

V7 role peaks and caps (bytes):

| Role | Observed synthetic memory.peak | R44 cap |
| --- | ---: | ---: |
| broker | 9,916,416 | 1,073,741,824 |
| consumer | 9,924,608 | 536,870,912 |
| reader | 10,993,664 | 805,306,368 |
| driver | 10,997,760 | 1,073,741,824 |
| observer | 9,920,512 | 268,435,456 |
| relay | 9,924,608 | 67,108,864 |

### Cleanup, remaining work and reporting limits

Every probe receipt has `remaining: []` and no cleanup error. `preflight/inventory-final.json` confirms holder `CX-G03-V` has **zero containers, volumes and networks**; `engine-status-final.txt` records the returned pool. The newly made QLever s1 volume was removed (`slot-down.json`). No resident was parked/restored by this attempt; D was already parked by its owner. The declared round-2 Linux store is untouched. The trusted probe image is retained by immutable ID above for review/replay; no new dependency store remains.

`window-1/fstrim.json`: exit **0**, trim **1,285,816,320 bytes** on the triplex2 data device, **95,547,904** on EFI, **0** on boot, **229,806,080** on root. Its stderr records an informational rosetta-detection sysctl warning. `context.json`: exit **0**, active Docker context restored to **colima**; the explicit triplex2 DOCKER_HOST still overrides it in this lab process. No default VM command was issued.

The original window driver returned exit 0 for completed transport even when individual probes returned 2. Every receipt and window event correctly records those refusals and `qualification:false`; **that outer exit was not PASS**. A follow-up code change now propagates any nonzero probe status to the window exit while still completing the remaining probes and cleanup. This adds a refusal only and does not change or relabel the saved attempt. Its content/freshness/binding are the same exact child execution status and receipt checks in audit item 4.

Open before NS runner admission: redesign/validate the time-domain identity against distinct container namespace inodes; achieve and measure the intended polling cadence and <5% overhead; establish a sufficiently demanding read trace and reader/relay CPU attribution before claiming engine saturation; reduce/justify capture overhead; obtain a resource decision for the full per-arm layout and measure actual role implementations later. **No NS runner was built, no actual NS memory fit was verified, no host-power-loss durability was established, and no P1–P5 claim became QUALIFIED.** The next runbook uses a new empty `window-2` directory, preserves these failures, and must stop if a new exclusive reservation is present. No automatic second measurement attempt was made.

Evidence retention: [V-PROBES-INDEX.json](V-PROBES-INDEX.json) and [V-PROBES-SHA256SUMS](V-PROBES-SHA256SUMS) index **168 durable files, 101,331,584 bytes**; **121** per-probe file hashes were independently replayed. The 98,176,878-byte capture and 1,198,784-byte V3 observation file remain outside git. No raw probe directory is committed.
