# CX-VP2B evidence index

Reviewed candidate: `ba10ebb9a119a89e9bdd532ccaa2439f268b1211`.
Verdict and scope: [VERIFY.md](VERIFY.md). Durable root:
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2B/`.

| Evidence | Meaning |
| --- | --- |
| `gates-58ae2302-c2be-43cb-82d4-1be18e713e42/` | Own broker build; 48 XTDB + 81 QLever offline regressions; five original independent schedules. `before.json` / `result.json` bind exact source and reused public dependency/native bytes before/after; unchanged. Command logs retain actual test totals. |
| `gates-db2f599d-c313-46ec-8f81-ae13cf00d533/` | Final six independent schedules, including the public duplicate-receipt race; 6/6 completed. Source/runner/dependency hashes unchanged. |
| `review-d2817c3e-d322-48a6-b55c-cf6720a2ee39/observations.json` | Final actual observations. Duplicate gets `CommandAlreadyCommittedError` while original receipt is null at head 0. WAL series ends at 78,889,792 bytes. SQLite fixtures are retained beside this file. |
| `review-b7959d4d-17c7-462b-8b12-61dc5df09f26/`, `review-53e551fc-4537-4dc6-9c8e-9c8b304ffd98/` | The earlier five-schedule runs, both completed. These are additional observations, not replacements for failures. |
| `gates-04810ad5-ab90-4a97-97b6-3e8e59cbb03f/`, `gates-775e31ed-d251-4c80-b325-742b646ae5fe/` | First duplicate-window verifier failures: wrong public error property, then wrong null expectation. Logs and source hashes retained. Each completed the other five probes; neither is treated as a completed six-probe result. |
| `review-*/` not individually named above | Attempt-specific databases/observations for the failed fixture iterations. No old database is reused as the next run's store. |
| `upstream/` | Fresh SQLite stores from the unchanged 24-test broker suite. Worktree `runs/EXP-P2B` points here, keeping bulky outputs outside git. |
| `tools-final/` | Copies of the final verifier source/configuration bytes. For the final six-probe gate, current `.ts/.cjs/.mjs` tool hashes match that gate's before/after map. These copies were collected after exit and are not described as historical pre-run captures. |

Small execution logs stay in this directory in git, with trailing blank lines
removed for whitespace checks. Exact original log bytes are retained in durable
`execution-logs/`. `baseline.log` retains the
initial Vite temporary-directory sandbox failure; `baseline-attempt2.log`
records 24/24 broker tests after fixing local dependency reuse. `bound-gates-*`
and `bound-probes-*` logs identify the durable gate directories and child exits.
`latency-audit-attempt1.json` contains independently recalculated final-cell
quantiles and original raw/report hashes; its stderr records heavy-slot waiting.

The source fixtures use actual default F_FULLFSYNC opens. The worker control
pauses only the review's own source snapshot after its real marker read; the
append-return control delays completion to the broker after a real append. No
engine slot, fake engine SQL answer, physical power loss or disk-full result is
claimed. The reproduction tests for the defects intentionally assert those
observations, so a green verifier test does not grant implementation acceptance.

Public dependencies were reused read-only from the P2B environment; the source
under review comes from this worktree. The generated broker build is local.
Root/package dependency directories are local ignored directories of symlinks,
so Vite writes local temporary files without writing through a sibling's
`node_modules`. No pnpm install or dependency version change was needed.

`SHA256SUMS` lists every retained regular file under the durable root at collection
time, including all failures, databases, logs, metadata and final tool copies.
Verify with:

```sh
shasum -a 256 -c lab/verify/P2B/SHA256SUMS
```

No durable evidence was deleted. Reruns create UUID directories; this manifest
remains an index of this review's collected files rather than adopting a later
run automatically. The builder's multi-gigabyte archive is outside this manifest;
only the three final 256-reader raw logs were independently audited for latency.
