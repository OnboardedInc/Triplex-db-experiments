# P2Q round-ten evidence

Durable raw root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2Q-R3/round10/`

[SHA256SUMS](SHA256SUMS) binds **1953 files**, **11,809,302 bytes**, with paths relative to that root. Raw gate output and exact source copies stay outside git. Dependency symlinks in the scratch copies are not traversed or copied; producer preimages separately bind the installed dependency sources used by the gates.

- `SUMMARY.json`: content/source/result readback for all twelve accepted gates at `561410d2`.
- `FINAL.json`: final current-source/case hashes and fresh owned process/lock observations.
- `final/`: all final logs, Vitest JSON and receipts, plus actual isolated native source/consumer mutations in `scratch/`.
- `preflight-de57dbf4-b456-404c-8c58-111e9f95bdc4/`: failed exploratory marker-constant fixture; source copies and later explanatory note remain, not qualified.
- `preflight-bf6b6a3c-b525-4913-844d-13ec50ea10a5/`: corrected two-probe preflight, separate from final gate acceptance.
- `lock-owner-readback.json`: 324 owned lock records; none of their 31 recorded PIDs remained live.

Final coverage: 1,135 offline tests, 54 earlier live-enabled cases (22 real-engine plus 32 repeated controls), seven new real-engine cases, and two typechecks. All twelve final receipts are accepted without source or slot drift. All owned fixture states remain at the receipts' `V_P2Q_RUNS` paths. No engine lifecycle, exclusive slot, merge, push or publication. Independent acceptance remains open.
