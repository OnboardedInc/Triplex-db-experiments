# DX-B1 durable evidence

Raw logs, staged gateway, source snapshots, measurement data and original failed attempts live in:

`/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B1/`

`SHA256SUMS` binds the retained files at report finalization. Evidence is diagnostic builder verification; it is not an acceptance-contract PASS or independent review. The original baseline domain failure and intermediate harness/startup failures are retained.

Replay prerequisites: offline dependencies installed from the project store; build the Datomic dependency graph; stage packages/datomic/gateway plus codec-spec.json; run only the owned tx2-dxb1 dev container on CPUs 6/7, 3g, port 8490 as described in the task. All heavy commands go through lab/bin/heavy.mjs. Measurement scripts take the PROTOCOL 0b measurement directory lock themselves. `mutants.sh` changes only staged gateway copies and restores them. Never run it against another container.
