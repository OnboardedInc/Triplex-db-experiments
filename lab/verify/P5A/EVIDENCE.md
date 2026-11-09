# CX-VP5A evidence index

Verdict and findings: [VERIFY.md](VERIFY.md). Reviewed input: `dadb2de0`.

Fresh final checks: builder suite 31/31; reviewer regressions 4/4; immutable RQ01 stack 5/5; K01 full-content fixture rejects all three changed fields. Green reviewer regressions reproduce the four findings; they do not grant product acceptance.

`evidence/final-jobs.json` binds final commands, exits and logs. `evidence/index-audit.json` binds all nine builder evidence hashes, unchanged bench sources, built W0 modules and recorded ratio arithmetic. G6 and K01 preimages/compiled modules stay in their indexed subdirectories. Original import/fixture failures, queue cancellations and disk refusals remain separate from the successful final executions.

Bulky raw seeds/traffic, oracle outputs, observations and exact executed reviewer source preimages remain outside Git:

- First attempt: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP5A/attempt-90a86c6a-037b-47b7-a6f5-ad2fc7b11d18/`
- Final attempt: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP5A/attempt-6ba907c9-e2cf-4881-bbf8-469818bfebd6/`

`SHA256SUMS` covers reviewer files and both raw directories. From this worktree root:

```sh
shasum -a 256 -c lab/verify/P5A/SHA256SUMS
```

No native engine/A1 execution, fresh 1k/10k reviewer recovery, independent O-REPLAY qualification or 1.5x traffic claim was made. Rerun commands and PASS audit are in the report.
