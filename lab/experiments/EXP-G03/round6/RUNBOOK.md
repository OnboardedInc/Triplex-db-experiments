# G03 round 6 replay

This is an offline/DIAGNOSTIC protocol gate. The existing evaluator fixtures use private-daemon synthetic containers; they do not acquire or park an engine slot. No 1k registered-slot run is authorized this round.

Run from the G03 worktree, on the committed implementation (final tested source is recorded in INDEX.json):

```sh
git status --short
git rev-parse HEAD
df -k .
python3 lab/acceptance/build_contract.py --verify
git diff --exit-code 1b40aeba83272d4625be714bed1206d5f9086175 -- lab/acceptance
node lab/bin/heavy.mjs --label CX-G03-R6-replay -- node --test lab/bin/test/claim.test.mjs lab/bin/test/claim-round2.test.mjs lab/bin/test/lab.test.mjs lab/bin/test/box.test.mjs lab/bin/test/box-policy.test.mjs lab/experiments/EXP-G03/ns/offline.test.mjs lab/experiments/EXP-G03/ns/fault.test.mjs
```

Do not start the heavy command below 5 GiB host free. The Docker socket must remain `unix:///Users/sam/.colima/triplex2/docker.sock`. The protected evaluator fixtures need their existing `/Users/sam/.tx2-evaluator/` authority boundary; they must not be moved into a candidate-writable root to avoid permissions. On macOS the existing guarded-artifact test also reads the boot clock via sysctl. No test assertion is optional.

To retain a fresh set of synthetic fault objects, choose a **new empty** evidence directory and run:

```sh
G03_FAULT_EVIDENCE="$PWD/lab/experiments/EXP-G03/round6/replay-fault-objects" node --test lab/experiments/EXP-G03/ns/fault.test.mjs
```

`nine-injections.json` must contain exactly three observed witnesses per point and nine unique events hashes. Open every events object by SHA256; it references paused/recovered DR objects. The split-transaction after-effect fixture must retain duplicate count 1 and replay.equal:false. Synthetic receipts use explicit sentinel source identities and `OFFLINE-SYNTHETIC` slot; they are not execution identities for an engine or a production candidate.

After the contained evaluator suite, inspect its cleanup failures, and use only engine.mjs with the fixture's own recorded holder/run to recover any orphan. Never remove an unidentified resource. Then:

```sh
colima ssh -p triplex2 -- sudo fstrim -av
docker context use colima
```

## Future VM fault window (not run in round 6)

`runBoxedNS(box, options)` always runs the hook protocol. With no `faults` parameter it releases all hooks; there is no candidate-visible crash mode. To enable injections, the evaluator supplies `faults.decide(event)` (private schedule), `faults.caseIds` (unique point-to-manifest-case-ID mapping from the explicit pinned contract), `faults.pageBounds(event)` (trusted expected checkpoint before/after), `faults.recover({box, observer, consumer, context})` and `faults.requireInjections:true`. Recovery must actually exercise the restarted boxed consumer on the same volume and return `{checkpoint,retries,expectedReplaySha256,actualReplaySha256,caseResults}`. The actual digest must equal SHA256 of the recovered snapshot's ordered `effects` JSON bytes; expected digest must come from the frozen input and the pinned domain normalizer, not candidate output. This normalizer adapter is still required for the real production lane; absence fails closed. All recovery hook steps must remain indistinguishable from ordinary steps. Do not present the fixture replay encoder as the production feed-entry normalizer.

For C2, use `FaultInjector` with obligation `C2`, an exact broker target and the contract-selected `points`; relay `hookedPage` using role `broker`, method `brokerControl`. This shares pause/snapshot/kill/proof/restart/witness machinery and explicitly cannot satisfy NS.P3's consumer crash bar. The NS diagnostic coordinator currently wires the consumer path; production broker driver orchestration needs the contract's C2 page/point plan. No invented C2 point names are registered by this change.

A live fault smoke and the 1k slot run require the orchestrator's later window and production observer/domain integration. The prior round5/exclusive.mjs remains a DIAGNOSTIC admission probe, not a production registered-slot qualification. Q100n's qlever-dev parking is authorized only for that later window; never park it from this runbook's offline commands.
