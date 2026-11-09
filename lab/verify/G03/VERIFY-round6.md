# G03 rounds 5 and 6: FIX-FIRST

Reviewer: CX-VG03-56. Reviewed head: `95b0593cbea843217d03bd7cbe943519fd2e1346`, branch `exp/G03-executing-gate`. Review branch: `verify/G03-r6`.

North star: correctness floor for P1–P5, especially trustworthy P2/P3 measurement, durable consumer recovery and independent evidence (lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md).

Two reproducible defects block acceptance of this runner. No code under review was changed. Neither finding demonstrates a production QUALIFIED claim bypass: claim.mjs still refuses its fault-witness and paired-measurement paths, and runBoxedNS explicitly records CRNSAdmission:false. The findings concern positive diagnostic results that are intended to underpin the later NS grant.

## Findings

### F1 — High: final observer readbacks and periods can change without authentication failure

Locations: `lab/bin/ns-run.mjs:18` (`verifyObserver`, especially line 20), `lab/experiments/EXP-G03/ns/observer.py:55`; consumption at `lab/bin/ns-run.mjs:34` and `lab/experiments/EXP-G03/ns/smoke.mjs:40`.

The HMAC chain authenticates `polls.ndjson`. Its final head is copied into `seal.json`, but the seal's `final`, `periodNs` and `domain` fields are not authenticated. The verifier checks only runId, chunk count and that copied head, then returns the entire seal. `checkSmoke` trusts its final source/consumer contents; the smoke summary trusts its period samples. Authenticating a reference to the poll stream does not authenticate these additional observations.

Reproduction: `review-round6.mjs` creates one valid poll chunk, then changes only seal.final.consumer from an empty checkpoint to fabricated committed effects, and changes periodNs to [1]. `verifyObserver` accepts without changing the key, poll bytes or poll HMAC. A second control starts with matching driver observations and an invalid final consumer checkpoint: checkSmoke rejects. Replacing only the unsigned final consumer readback with expected values makes that same check return DIAGNOSTIC fixture consistency. `review-round6.json` records both observations. This is post-capture integrity failure; it does not require a candidate to mount the observer volume or learn the run key.

Proposed fix: authenticate the entire final seal, including final readbacks, clock domain and measured periods, against the fresh run binding and final poll head. Alternatively emit those observations as the final authenticated observer event and require exact agreement at replay. Add negative controls changing each consumed seal field independently. Retain/check a trusted capture digest before any later CR-NS ingestion. The deferred production normalizer is not a substitute for authenticating this existing diagnostic evidence.

### F2 — High: failed driver completion can carry a clean end event and reach semantic replay

Locations: `lab/bin/ns-run.mjs:116`–117 (status merely recorded); `lab/bench/ns-driver/driver.mjs:189`–197 (finally emits error from the reader/offer `failed` variable only). `lab/bin/box.mjs:140` returns the Docker exec status rather than rejecting a nonzero status.

Exceptions thrown by hookedPage, consumer stop, or subsequent synchronous driver operations do not set `failed`. The finally block still writes `{kind:"end",data:{error:null}}` and seals the events. The driver exits unsuccessfully, but runBoxedNS only stores result.status in stage 10 and proceeds. verifyHr sees a clean end. In a main run, injector.finish requires observed handshakes but does not certify successful completion of the driver's final RPC.

Reproduction: the reviewer evaluates the **unchanged driver source bytes** in a Node VM module, with trusted RPC/filesystem/event dependencies substituted; no candidate code runs on the host. A one-offer model returns a correct receipt and named-cut answer, completes all three real hookedPage handshakes through the real FaultInjector with no injection, then throws on the final hook-release RPC. runNS rejects with OFFLINE-PLANTED-HOOK-FAILURE, yet its final event says error:null, the real injector accepts finish with three handshakes, and the resulting actual driver event rows pass checkSmoke against matching final state. The exact driver source SHA256 and observed rows are in review-round6.json. Static inspection establishes the coordinator's missing nonzero-status rejection; a full boxed coordinator false-positive run was not performed.

Proposed fix: require driver result.status === 0 before accepting the run, while exporting/retaining failed-attempt bytes. Also catch and record every driver exception in the terminal event before rethrowing. Add a regression in which the final consumer release/stop fails after correct durable effects and all three handshakes; neither a clean end nor positive diagnostic consistency should result. Check the fault control stream's successful terminal completion as well as its handshake count.

## Requested integrity checks

| Question | Result and evidence boundary |
| --- | --- |
| Candidate reaches driver output, another state volume, frozen trace/seed, Python or lab/oracles | Offline mount mutation controls reject driver output, consumer state, frozen trace and key on the broker. servicePlan provides only instance RO, own input RO and own state RW; the reader has no state writer. ns-run builds candidate config without trace/seed and places those exclusively in driver-in; the candidate build exports only two JS artifacts. Dockerfile refuses Python at image build and live preflight checks Python/oracle paths. No fresh candidate-container access attempt ran; historical round-5 results remain historical. |
| Candidate distinguishes crash from main before injection | No crash flag/schedule found in candidate config or RPC. Both paths call the same hookedPage sequence; the real evaluator no-injection path was exercised with three hook releases in F2. Private evaluator decide controls injection. No live timing/observable-environment equivalence claim is made, and a replacement process necessarily sees its own restart. |
| Witness without kill/cgroup proof, or wrong target | Fresh offline controls reject missing cgroup proof and a wrong killed ID, emit zero witnesses and never restart. NS.P3 rejects a broker-role target. Existing boxed transport routes lifecycle through engine.mjs, checks the owned immutable ID and state mount, and only clears resources after cgroupGone. Synthetic proof fields are not proof that a real kernel cgroup disappeared; that path was not rerun live. |
| Alter raw evidence before claim.mjs/CR-NS | A semantic HR event mutation with unchanged HMAC is rejected. F1 shows final observer evidence is mutable without rejection. End-to-end CR-NS ingestion cannot be verified because it remains unwired: claim.mjs:1414–1431 returns FAULT-WITNESS-MISSING / PAIRED-NOT-RUN. This review does not grant round-7 acceptance. |
| Added capability refused | A valid inspect fixture first yields zero profileProblems; changing only CapAdd to SYS_ADMIN yields privileges refusal. Box.create uses this checker for candidate roles. This is an exact pure-function control, not a live capability-bearing container trial. |

Read: main CLAUDE.md, authoritative scope/north-star/targets/protocol; R44 section 2 and 5.1–5.3; requested Q100a–d/j/n/q/r and Q103a/b in RULINGS-PENDING.md; G03 REPORT rounds 5/6, both indexes, runbooks and implementation/tests. Existing limitations (toy provider, no full registered-slot 1k workload, production normalizers, runtime floors, calibration/noise and later grant) were not relabelled as newly discovered defects.

## Execution and evidence

Run from the review worktree:

```sh
node --experimental-vm-modules lab/verify/G03/review-round6.mjs > lab/verify/G03/review-round6.json 2> lab/verify/G03/review-round6.stderr.txt
```

Exit 0: both defect reproductions and the listed negative controls behaved as asserted. The experimental VM-modules warning is retained. The VM dependencies are trusted test models; the actual driver module and real hookedPage/FaultInjector/checkSmoke functions supply the behavior being checked. No real candidate/provider executes on the Mac.

All review files are in this directory; `SHA256SUMS` covers the script, reproduction output, stderr and environment observation. Each file is below 1 MB and the directory is below 5 MB. No bulky evidence export was needed.

The initial host free space was approximately 5.1 GiB, already below the task's 10 GiB boxed-run condition. It subsequently fell below the 5 GiB heavy-admission floor; `environment.json` retains the fresh byte count. Therefore no boxed P-TINY run, engine gate, broad fingerprint, full upstream suite or heavy job was started. Only this bounded offline reproduction ran. No exclusive slot was acquired, resident/container/volume lifecycle changed, Docker/Colima command issued, or context switch attempted. The local Docker configuration readback was default, with the required private DOCKER_HOST retained. The reviewed smoke/runbook still contain the obsolete `docker context use colima`; those instructions were not followed.

No live durability, cgroup disappearance, Python absence, cross-container reachability, nine live injections, source-bound production normalizer, full claim path or performance acceptance was independently verified. No state/evidence from historical runs was modified or adopted as fresh execution.

## Rule 9a audit and rule 9b pin impact

This review introduces no gate, PASS receipt or QUALIFIED grant. The verdict is FIX-FIRST. Positive reviewer assertions in review-round6.mjs are limited to:

1. F1 control: content is the exact changed final observation returned by verifyObserver and the rejected-then-accepted checkSmoke result; freshness is newly constructed in-memory input on each invocation; binding is the same run/key/head and the same driver trace throughout. This demonstrates a missing producer check; it does not bless the fabricated readback.
2. HR mutation control: content is a changed end error with the old HMAC; freshness is this invocation's fixture; binding is its explicit OFFLINE-SYNTHETIC run/source/input/slot. Actual rejection is required.
3. F2 control: content is the thrown hook error, clean end, three real accepted handshakes and checkSmoke result; freshness is this invocation's new VM/module/model; binding is unchanged reviewed driver source bytes (hash recorded), fixed offline source/slot/input sentinels and one trace. Dependency stubs and the unexecuted coordinator branch are disclosed.
4. Kill/target controls: content is the thrown refusal, zero retained witnesses and absent restart; freshness is a new injector per case; binding uses exact target ID/role/volume, run/input/source/slot and per-handshake nonce. No synthetic proof is called a kernel observation.
5. Profile/mount controls: content is the exact checker result before/after one capability or mount change; freshness is newly allocated inspect data; binding is an explicit expected image/network/cap/mount fixture. No VM placement acceptance is inferred.
6. The JSON record helper only appends observations after the corresponding assertions. The environment receipt reads current statfs and local context configuration; the checksum manifest binds the retained review bytes. Neither grants semantic acceptance.

Only new files under lab/verify/G03 were added. No pinned file changed, so there are no old/new pinned-file SHA256 pairs to report. lab/acceptance remains byte-identical to reviewed head; the contract was not regenerated or edited. No changes outside the review worktree were made.

Open work: builder fixes F1/F2 and adds failure-path regressions; an independent reviewer reruns them, then the orchestrator provides a >10 GiB boxed window and the production adapters/pins needed for an end-to-end claim review.
