# DX-H1 retained diagnostic evidence

All paths below are relative to:

/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H1/

- tx2-dxh1-a4/stack.json: actual container/image IDs, cpusets, memory and Postgres durability readback.
- tx2-dxh1-a4/gateway-files.json and stage/tx2-dxh1-a4/: staged gateway source preimage and manifest.
- runs/public-1794258523990/ns-report.json: completed public run.
- runs/reach-1794258619271/ns-report.json: completed reach run.
- The same run directories retain console.log, command.json, ns-writes.jsonl, SQLite consumer/publication state.
- public-summary.json / reach-summary.json: reproducible summaries from h1/summarize.mjs.
- startup-failures.md, tx2-dxh1-a1/, tx2-dxh1-a2/, tx2-dxh1-a3/: initial stack failures and retained config/SQL/logs.
- runs/public-1794256399504/: first failure (private storage lookup; ERROR).
- runs/public-1794257229613/: second failure (missing publication measurement; terminated with last status RUNNING).
- build*.log, unit*.log, reach-test.log, publication-test.log, effect-counter.log, typecheck*.log:
  successes and initial failures, retained separately.
- ns-admission.log: Datomic NS dry-run admission, no resident start.
- cleanup.json / cleanup.log: removed four a4 containers and network, retained tx2-dxh1-a4-pg-data.
- tx2-dxh1-a4/final-*.log: gateway and transactor logs captured before cleanup.
- *-invoke*.log: measurement-lock waits and resulting run directories. Replaced waiting wrappers were not adopted as runs.

SOURCE-SHA256.json in this directory indexes changed repository source bytes against the original branch base.
SHA256SUMS covers every retained regular file under the durable evidence root; it is relative to that root:

~~~sh
cd /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H1
shasum -a 256 -c /absolute/worktree/lab/experiments/EXP-DX1/h1/SHA256SUMS
~~~

These are diagnostic records, not acceptance receipts or an independent verification.
The data volume was retained deliberately; raw outputs and source-stage bytes stay outside git.
