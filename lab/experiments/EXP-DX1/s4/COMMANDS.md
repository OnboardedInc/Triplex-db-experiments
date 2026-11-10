# DX-S4 command record

All commands ran from this worktree. Docker used only the triplex2 socket and the named `tx2-dxs4-*` resources.
Source preimages, image/container inspection, raw outputs and cleanup outcomes live under each attempt directory.

1. Read scope/protocol/targets and the supplied H6 branch. Its named `h6/REPORT.md` did not exist; used `PROGRESS.md`,
   `gateway-floor.mjs`, the original page manifest and the raw H6 `postgres-sizes.json` as supporting evidence.
2. Prepared the current-only corpus with `python3 lab/experiments/EXP-DX1/s4/prepare.py` outside the container lock.
   Verified all 16 input hashes against their original manifest. The archive restore checks compared decompressed bytes.
3. Ran `node lab/bin/heavy.mjs --label DX-S4-inspect -- bash lab/experiments/EXP-DX1/s4/window.sh tx2-dxs4-inspect bash lab/experiments/EXP-DX1/s4/inspect.sh`.
   Failed on the required wildcard database-list URI. Raw anatomy remains usable as a labelled observation.
4. Repeated with `datomic.sh clone` under fresh prefixes `tx2-dxs4-anatomy2`, `tx2-dxs4-anatomy3`.
   First failed advertised-address connection; next obtained census/export, then raced transactor initialization on index request.
5. Ran the combined maintenance/footprint controller under `tx2-dxs4-anatomy4`. Both components completed, with native row
   digests/attribute totals preserved. Exact executable controller files are in that attempt's `source/` directory.
6. Current-only native corpus check ran through `heavy.mjs --label DX-S4-corpus-proof -- python3 .../verify-corpus.py .../tx2-dxs4-anatomy3`.
7. `tx2-dxs4-retired` refused admission below 5 GiB. `retired2` was a wrapper-edit parse failure; an empty lock remained and
   was removed after an observed 210 seconds, with no containers created. Future launches freeze sources before any wait.
8. Reversible owned-file retention used Python gzip streams and a complete byte-for-byte comparison immediately before unlink.
   Exact files and byte counts are in `owned-retention.json`. It did not change other agents' data. Pre-existing zstd fixtures
   were restored with the installed `/opt/homebrew/bin/zstd` through `heavy.mjs`; original hashes were checked in
   `owned-restoration.json`. No software/image download by DX-S4.
9. `bash .../launch.sh tx2-dxs4-retired3 retired-only.sh` completed the transactor-free footprint and exported 214 strings.
10. Prepared the complete corpus through heavy admission:

```sh
node lab/bin/heavy.mjs --label DX-S4-prepare-all -- python3 lab/experiments/EXP-DX1/s4/prepare.py \
  /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S4/tx2-dxs4-retired3/retired-subject-rowtexts.jsonl \
  /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S4/input-all
```

11. Ran `verify-corpus.py`, `verify-archives.py` and `check-input.py` sequentially under `heavy.mjs --label DX-S4-corpus-all-gates`.
12. `S4_INPUT=.../input-all bash .../launch.sh tx2-dxs4-batch1 batch.sh postgres a b d e xtdb`.
    PostgreSQL completed; native declaration wrappers failed the Bash 3.2 empty-array expansion before loading data.
    XTDB's literal INSERT plans exhausted heap at 80,000 rows. All failures and cleanup remain.
13. Fixed the array expansion and switched XTDB to reusable prepared statements with explicit NULL binding and synchronous commits.
    `S4_INPUT=.../input-all bash .../launch.sh tx2-dxs4-batch2 batch.sh a b d e xtdb` was the corrected batch. It waited nearly 30 minutes, then was explicitly cancelled before measurement admission;
    `cancelled-before-admission.json` records the exact owned heavy PID and observed other-party lock. No component started.

Local source checks: `bash -n` on all shell scripts, Python AST parsing without creating caches, `node --check` on JS drivers,
and Clojure delimiter checking. Actual executed Clojure namespaces are also checked by the installed JVM compiler during runs.
No `pnpm install`, package build, product test suite, package publication, merge, push, speed benchmark or unrelated cleanup.

14. Final source checks and complete durable-evidence SHA256 inventory ran through `heavy.mjs --label DX-S4-final-audit`.
    The final inventory checks all `tx2-dxs4-*` container/volume/network names, not only the latest attempt.
    No owned runtime resource remains; removal logs are retained per attempt.

## Continued spike

All continuation commands used `S4_INPUT=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S4/input-all`.
The launcher now records the vendored `lane/d-native:lab/bin/host-quiet.sh` JSON before each hold and refuses admission
when `df -k /System/Volumes/Data` is below 15 GiB free. `continuation-vm.json` records 8 CPUs / 16,732,614,656 memory bytes.

1. `bash .../launch.sh tx2-dxs4-cont1 batch.sh xtdb`: pre-hold refusal from a threshold typo (115 rather than 15 GiB),
   no lock/container. Corrected with a fresh prefix.
2. `bash .../launch.sh tx2-dxs4-cont2 batch.sh xtdb`: successful full row-document XTDB footprint, exact readback,
   explicit finish-block, twelve idle samples, clean stop and cleanup.
3. `cont3` was cancelled before admission when preflight caught the journal namespace filename. Frozen bytes retained.
4. `bash .../launch.sh tx2-dxs4-cont4 batch.sh journals a b d`: native journal export completed; a replay/maintenance
   emitted its digest but retained a non-daemon notifier at process exit. `docker exec tx2-dxs4-cont4-a-peer kill -3 10`
   produced the retained Java thread dump (guest PID only, inside the exact owned container). The own heavy PID was sent
   SIGTERM to invoke the hold's cleanup trap. No a footprint was adopted from that attempt.
5. `node lab/bin/heavy.mjs --label DX-S4-native-journal-input -- python3 .../journal-input.py prepare .../tx2-dxs4-cont4-journals .../journals-real .../input-all`:
   completed the byte/census/command-aligned real-journal preparation outside the measurement hold.
6. After adding `datomic.api/shutdown true`, `bash .../launch.sh tx2-dxs4-cont5 batch.sh a b`: both completed.
7. `bash .../launch.sh tx2-dxs4-cont6 batch.sh d`: failed the dictionary proof expression after loading/indexing; no footprint.
8. With `S4_JOURNAL=.../journals-real`, `bash .../launch.sh tx2-dxs4-cont7 batch.sh f`: completed the actual-journal comparison.
9. `bash .../launch.sh tx2-dxs4-cont8 batch.sh d`: corrected dictionary proof matched all row and dictionary bytes; completed.
10. `bash .../launch.sh tx2-dxs4-cont9 batch.sh xtdb-entities`: optional nested-entity layout.
11. `node lab/bin/heavy.mjs --label DX-S4-qlever-input -- node .../prepare-qlever.mjs .../input-all .../qlever-input`:
    full a0 lane RDF preparation, outside the hold; original/adapted mapping source hashes retained.
12. `bash .../launch.sh tx2-dxs4-cont10 batch.sh e e-nohistory`: optional aggregate/history comparisons.

Every `...` above expands to `lab/experiments/EXP-DX1/s4/` for code or the durable DX-S4 evidence root for data.
Each attempt retains the exact executable sources rather than relying on a later working-tree state.
13. `cont9` failed SQL parsing on reserved column `rows` before loading. `bash .../launch.sh tx2-dxs4-cont11 batch.sh xtdb-entities`
    retried with `fact_rows`, verified every nested payload cell, observed compactor idle and stopped/measured/removed the volume.
14. The aggregate e case completed. `e-nohistory` was recorded in `cont10/not-started.txt` because fewer than 240 seconds
    remained; it was not called a failure or a result.
15. With `S4_QLEVER_INPUT=.../qlever-input`, `bash .../launch.sh tx2-dxs4-cont12 batch.sh qlever` remained unadmitted.
    It was cancelled at the continuation timebox before any container/hold; the exact pending process and full heavy-pool
    observation are in `cancelled-before-admission.json`. No QLever index footprint was produced.
16. `node lab/bin/heavy.mjs --label DX-S4-final-audit -- python3 .../final-audit.py` finalizes syntax checks, the actual
    parent heavy permit, empty owned Docker inventories, source hashes, removal names and the complete durable manifest.
    It makes no independent semantic or production acceptance claim.
