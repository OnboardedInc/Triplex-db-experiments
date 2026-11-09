# Evidence index

Small offline raw logs, the copied brief, synthetic recorded pages and source checksum changes are in this directory.
`clojure7.log` binds final gateway, test/helper and vendor JAR input bytes to a fresh synthetic projection.
`CHANGED-SHA256.tsv` lists before/after SHA256 for modified pre-existing files and the number of acceptance artifacts mentioning them.
`REPORT.md` states each gate's scope, failures, PASS audit and unexecuted live requirements.

Durable bulky dependency evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DF01/`.
It holds vendor JRE API metadata, the SHA256-verified archive and extracted JRE. It contains no user credentials.
`DURABLE-SHA256SUMS` is rooted at that directory. The Datomic distribution remains in its existing downloads directory;
this experiment did not duplicate, modify or delete it.

G0's source/build/raw-byte object store is the standard gitignored worktree `runs/` store. The canonical terminal receipts are committed under `lab/runs/G0/`;
raw outputs are copied to the durable evidence root with a checksum manifest before reporting.
No file over 1 MB or raw-output directory over 5 MB is intentionally committed.

Final full G0: `G0-datomic-20261109T074723Z-fe429c` (1,279/1,279, 66 expected skips).
First failures: `G0-datomic-20261109T073729Z-b9d89b`, `G0-datomic-20261109T074216Z-bab2d9`.
Interrupted setup: `G0-datomic-20261109T074129Z-83a091` (no terminal receipt, unqualified).
The durable `gates/` tree contains raw outputs and copies of terminal receipts; `objects/` contains their verified preimages.
`xtdb-dist/` records the optional package build required by the qualification import. `pack/` preserves the failed root pack check.
`FILES-SHA256SUMS` covers the small local experiment artifacts; the checksum manifest excludes itself and its generation log.
