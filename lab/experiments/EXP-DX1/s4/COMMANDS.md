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
