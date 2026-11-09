# Contract 0.3.13 round-2 evidence

Merged tested source: `2ec12111466f53718e1c8420f112402883981c28`; parents reviewed candidate `6b8d2182` and dispatch main `9a7996e2`. See ../REPORT-0.3.13.md round 2 for per-hunk resolutions and PASS audit.

Local small receipts/logs and source/merge audit are covered by SHA256SUMS. validate.py revalidates these exact attempts, current source hashes and all durable bytes; it does not run a new gate or grant engine qualification. The first merge-tests.txt failure used the shared config without unmerged Datomic; merge-tests-final.txt and js-tests-committed.tap use explicit candidate config and pass unchanged assertions.

Raw gate output, immutable CAS objects and complete build preimages are durable under:

`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-A01-0312/contract-0.3.13-round2/`

| Attempt subdirectory | Retained files / bytes | Repo manifest |
| --- | --- | --- |
| G0-xtdb-20261109T035923Z-2980c9 | 629 / 6,815,981 | G0-xtdb-SHA256SUMS |
| G0-datomic-20261109T040114Z-8dc16e | 592 / 6,465,944 | G0-datomic-SHA256SUMS |

Each manifest path is relative to that attempt's durable subdirectory. The small G0-*-capture.json files bind the manifest digests, actual source/counts/capture times and sizes. Both raw output directories and every build file were captured immediately after that gate. Eight repeated Datomic grant references bind captured immutable owner bytes rather than a reusable live lock pathname. No bulky raw/build directory is added to Git.
