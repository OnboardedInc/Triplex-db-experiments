# Round-5 runbook

North star: P1–P5 correctness and isolation floor. These commands produce DIAGNOSTIC evidence only.

Run in the G03 worktree at a committed clean head. Every output directory must be new. Never replace previous attempts.

```sh
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
node lab/bin/engine.mjs status
node lab/bin/heavy.mjs --label CX-G03-R5 -- node lab/experiments/EXP-G03/ns/smoke.mjs --out /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-G03/round5/smoke-7
```

This reruns the 16-subject, four-reader diagnostic ABBA smoke. Existing results are sufficient for this round; do not rerun only to improve numbers. A new run requires a stated implementation/failure reason. The 5% comparison rule stays frozen; failed runs stay failed.

For the conditional 1k **admission integration control**, first require no exclusive reservation, >10 GiB host free, a completed semantic smoke, and an orchestrator-authorized resource layout that actually fits. No resident is stopped by G03. The current 6.50 GiB residents plus proposed full NS caps do not fit the 11 GiB pool; `exclusive-2/receipt.json` records the real refusal. Do not retry admission until that external condition changes.

```sh
node lab/bin/engine.mjs status
node -e 'const fs=require("node:fs"),s=fs.statfsSync(".");if(s.bavail*s.bsize<=10*1024**3)throw Error("host free not above 10 GiB")'
node lab/bin/heavy.mjs --label CX-G03-R5-1k -- node lab/experiments/EXP-G03/ns/exclusive.mjs --out /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-G03/round5/exclusive-3
```

The executor rechecks those conditions after heavy admission, selects only an unused registered QLever slot and uses its own holder. Every role faces ordinary engine pool admission with the full R44 caps. It removes only its new slot/volumes and never takes over retained data. It currently carries the diagnostic fixture provider: **it is not a command for a qualified production-replica NS measurement**, even if its resources fit. A production 1k run still needs the actual lane provider, reviewed runtime/driver/schema/normalizer pins and protected evaluator integration, CR-NS/O-OBS and the later grant/window gates; no exact production command is claimed available before those exist.

Both executors remove owned containers, networks, volumes and reservations, then run:

```sh
colima ssh -p triplex2 -- sudo fstrim -av
docker context use colima
```

Cleanup errors remain in terminal receipts and must be resolved before another attempt. The retained round-2 Linux store belongs to an earlier declaration and is not removed here. No command addresses Sam's default VM. Contract changes are exclusively the contract owner's work; see `pin-changes.json` for old/new input and evaluator source hashes.
