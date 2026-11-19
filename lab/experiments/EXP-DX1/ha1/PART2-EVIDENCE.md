# Shared database evidence

From the durable DX-HA1 evidence directory run `shasum -a 256 -c PATH_TO_PART2-SHA256SUMS`. The manifest includes terminal runs, partial attempts and offline gate output. Each completed database drill records its source revision, executable digests, nonce, slot, role images, local readbacks and cleanup.

| Attempt | Source | Outcome |
| --- | --- | --- |
| `one-account-0c44903d-eeda-4893-bce3-04a258ea3465` | `fa8377bf2` | Completed and cleaned up. 1,280 seeded tenant facts. Fenced suffix of 3 facts. |
| `one-account-17c74fba-b9f3-42b5-b748-de39cd2c2aee` | `89b6a0091` | The historical pin rejected its integral tagged double across JSON. Corrected and rerun. |
| `one-account-33e4ae80-a448-40c7-a0f6-49c6eb9da952` | `7bc8008b2` | Completed and cleaned up. 1,280 seeded tenant facts. Fenced suffix of 3 facts. |
| `one-account-3f5b6862-a5ee-4dd7-9c91-c93a5188af55` | `8c4ea6140` | Completed and cleaned up. 1,280 seeded tenant facts. Fenced suffix of 3 facts. |
| `one-account-b5968724-7f6b-40bd-bdcf-5a562f7e7d90` | `8c4ea6140` | Completed and cleaned up. 20,480 seeded tenant facts. Fenced suffix of 3 facts. |
| `one-account-d5caff29-fa95-4e52-bcc5-028f33117e52` | `515080fe9` | The blind-command validator rejected the shipped client’s optional synchronization hint. The peer now validates the hint independently of command identity. |
| `one-backup-55a6bc06-04f3-479d-bb24-74ee4a973d2d` | `8b27905b7` | Stopped before admission while the selected slot was in use. Retried with any available slot. |
| `one-backup-6d645aeb-3e66-4aea-adc8-a04af49c0745` | `89b6a0091` | Completed and cleaned up. 10,240 seed facts. Two independently verified fresh restores. The WAL receiver was deliberately stopped before the final eight writes. |
| `one-backup-70413428-9210-454b-953f-c932261c3b85` | `515080fe9` | Completed and cleaned up. 163,840 seed facts. Two independently verified fresh restores. The asynchronous WAL receiver was streaming when the primary died. |
| `one-failover-3e77594d-f038-45a8-a4b9-f2edf69eeefd` | `fa8377bf2` | Completed and cleaned up. 2,923,520 seed facts. 1 real election(s), receipt readbacks and exact live changes. |
| `one-failover-5278c53b-dfcd-4e24-9144-c375c21646a3` | `5598eaabb` | Completed and cleaned up. 2,078,720 seed facts. 4 real election(s), receipt readbacks and exact live changes. |
| `one-failover-6ec202c9-9eed-4353-b276-269a6238ee71` | `7bc8008b2` | Completed and cleaned up. 10,240 seed facts. 4 real election(s), receipt readbacks and exact live changes. |
| `one-failover-ac53471b-a7b2-4293-a988-8a2bb05f1d80` | `70b5781be` | Completed and cleaned up. 163,840 seed facts. 4 real election(s), receipt readbacks and exact live changes. |
| `one-failover-cd7b93dd-0735-41d8-8335-fd0de08942c6` | `70b5781be` | Attempt header only. No role, terminal observation or timing was recorded. |
| `one-failover-d8bd79e8-fc09-4230-9e7e-bfaa89c5a980` | `8c4ea6140` | Another measurement claimed the timer during source hashing. No roles started. Retried with an atomic timer claim. |
| `one-sync-7f58b5b7-d03f-4463-89db-f0bb3a476bc7` | `454bf234b` | Completed and cleaned up. 4,096 ten-fact writes per mode, followed by primary loss. Recomputed distribution from raw arrays. |
| `one-whole-05b4e293-4ab4-4725-b522-df5c6774ae75` | `8c4ea6140` | Completed and cleaned up. 235,280 seeded facts. Live physical copy, fenced promotion and 183 historical read samples. |
| `one-whole-ed263949-150d-4fa7-bd0a-7f33d24c6eac` | `7bc8008b2` | Completed and cleaned up. 10,240 seeded facts. Live physical copy, fenced promotion and 178 historical read samples. |
| `part2-checks-4859d011-0d85-442f-a958-0453ed336c73` | `fa8377bf2` | Offline source, formatting, negative and public client/feed tests. Includes a reproducible cross-check of each completed drill and the wider lab checker output. |
| `part2-checks-d65d84c5-9fd7-484d-8491-aaf001ec9840` | `fa8377bf2` | Denominator check rejected four discovered files and 196 tests. A temporary syntax tree made the two real suites visible twice. The fresh gate used the two original paths. |

The offline gate directory includes `cross-check.py`. From the built worktree, run `python3 PATH_TO_GATE/cross-check.py DX_HA1_EVIDENCE_DIRECTORY --final`. It reconstructs executable hashes from each source revision, reconciles original trial and cleanup records, and calculates the p50 and p99 directly from the raw client samples.
