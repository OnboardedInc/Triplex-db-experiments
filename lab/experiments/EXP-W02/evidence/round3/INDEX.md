# Round 3 durable evidence

Raw root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-W02/`.
All files in the five attempt directories below are indexed by SHA256SUMS;
paths are absolute. Verify with `shasum -a 256 -c SHA256SUMS` from any directory.
This is an integrity inventory, not a semantic GS receipt.

Final controller: `round3-2026-11-09T03-11-42-527Z-f863ca/receipt.json`.
Final campaign: `2026-11-09T03-11-55-094Z-d3f630/review-results.json`.
The controller records exact argv, actual heavy grant slot 2, source and build
hashes, unchanged-input check, command exits and stdout/stderr hashes.
The campaign records 140 baseline members, 33 injected/rejected mutations,
missing-claim and wrong-fallback rejections, independent replay inputs and probe
traces. Read the EXP-W02 report for the 26 fail-closed members per lane.

Original QA program copy SHA256:
`8f4ce1fa95374ce45e53c56c1c9be835af5bbecdb5da4b8032ebf4484b332fb7`.
No engine or native lane slot was opened. All raw output, including both failed
attempts, remains durable and outside git.

| Directory | Files | Bytes | Role |
| --- | ---: | ---: | --- |
| `2026-11-09T03-08-56-046Z-3864b0` | 31 | 4262980 | retained failed attempt / child |
| `2026-11-09T03-11-55-094Z-d3f630` | 39 | 9729978 | final campaign |
| `round3-2026-11-09T03-08-42-775Z-423b09` | 862 | 3389693 | retained failed attempt / child |
| `round3-2026-11-09T03-10-44-232Z-308f01` | 43 | 449941 | retained failed attempt / child |
| `round3-2026-11-09T03-11-42-527Z-f863ca` | 955 | 3697333 | final controller |
