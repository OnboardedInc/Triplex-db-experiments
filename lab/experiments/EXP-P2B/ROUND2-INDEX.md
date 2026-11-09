# EXP-P2B round 2 evidence

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B`.

`ROUND2-SHA256SUMS` hashes 2256 files relative to that root, including all raw outputs, SQLite log stores, source/build preimages, invalid setup attempts and gate logs. Verify with `cd "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B" && shasum -a 256 -c "/Users/sam/projects/triplex-db-2/.claude/worktrees/p2b/lab/experiments/EXP-P2B/ROUND2-SHA256SUMS"`.

No bulky evidence is committed. `ROUND2-RESULTS.json` contains compact derived statistics from the twelve valid child reports; reports and preimages in the durable root are the underlying evidence.

| Phase | Placement | Readers | Attempt directory under round2 |
| --- | --- | ---: | --- |
| before | local | 0 | r2-before-local-0-7f8a13f1-e79a-4d18-bc59-957b6323f0fa |
| before | local | 16 | r2-before-local-16-727e4119-251f-47b4-b5cc-9159eb5d5893 |
| before | local | 256 | r2-before-local-256-cd72d46a-5dce-4cf0-bd53-65adbbef0319 |
| before | worker | 0 | r2-before-worker-0-fe06e685-457e-4199-910c-6dbffd954889 |
| before | worker | 16 | r2-before-worker-16-ad3e45e7-8fbb-4adf-a0a4-27c48a558e26 |
| before | worker | 256 | r2-before-worker-256-c09da39a-79f4-419b-aec5-cd83f09723dc |
| after | local | 0 | r2-after-local-0-1fa0b06f-f2c3-40c3-8a5d-64dfce77cc2c |
| after | local | 16 | r2-after-local-16-6626d58e-cef1-4ff6-a228-ca58a561f763 |
| after | local | 256 | r2-after-local-256-61a97883-ff86-4df8-971d-6609a2722c04 |
| after | worker | 0 | r2-after-worker-0-eceb52b0-774b-4389-a728-aefbb66c0195 |
| after | worker | 16 | r2-after-worker-16-5f3dfaf4-0cab-4131-9746-054b0cebc56b |
| after | worker | 256 | r2-after-worker-256-9d15e1f0-6836-4798-b149-acf80dc6cbaa |

The first invalid cells are indexed by `round2/matrix-before-setup1.json`. Their logs/preimages remain in this manifest. The exact repeated final gate log is `r2-final-gates-attempt2.log`; the initial tracing-test assertion failure remains in attempt1. `r2-legacy-guard.log` is the expected legacy-driver refusal.

The convenience matrix pointer files can be overwritten by future reruns. Attempt names, reports, raw bytes and checksums above identify this report's observations.
