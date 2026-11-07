# Isolated verification of the existing clean v1 candidate

This is a fresh verification of the **starting prototype**, not an implementation of roadmap item 1. Original source/PR ownership remains with the existing owner. All tests ran from the separately copied frozen clean export, with outputs and owned fixtures redirected outside that source snapshot.

## Results

- Two local GCC 14.2 builds reproduced original native binary SHA-256 `62c9f24e3f8951771ff0f7ceae7dd255843885b203c818bb53e3c232baa45662` exactly.
- The same 22 native integration tests passed on DuckDB 2.0.0 and 1.4.3; these are not 44 distinct cases.
- 23 real-file storage tests passed on 2.0.0. Largest observed fixture after close: 4,468,736 bytes.
- 25 JavaScript reference test groups passed. This is not rendered UI/accessibility or native browser execution.
- 60 SQL/native correctness cases and 545 QA comparisons/guards passed. These overlapping coverage categories are not one certification score.
- All 218 frozen source manifest entries remained unchanged after verification.

Exact logs, raw correctness/QA records and hashes are in `runs/20261030-1503/` and `VERIFICATION.json`. Native executable build outputs are deliberately not committed; build from the audited source. The same-host/compiler byte match does not establish cross-environment reproducibility or production durability.

## Reproduce

Supply existing pinned DuckDB wheel directories on the corresponding Python paths; the scripts never install dependencies. The default source path is `../../frozen-baseline`, whose immutable export manifest is preserved separately in the preparation checkpoint. If restored elsewhere, reconstruct that audited clean export first and verify its manifest.

The final export is not yet verified on PR #7. Until its existing owner preserves the full source, reproduction requires the existing local frozen copy; this checkpoint preserves preparation and evidence, not a substitute remote source backup. PR #7 was independently still at initial commit `c24108a` at approximately 15:03 UTC.

```sh
TD_DUCKDB2_PYTHONPATH=/path/to/existing/duckdb-2.0.0 \
TD_DUCKDB143_PYTHONPATH=/path/to/existing/duckdb-1.4.3 \
bash reproduce.sh /absolute/new/output-directory
```

The output directory must not already exist. Omitting the 1.4.3 path explicitly reports that run as UNRUN. All actual fixtures live inside the new output directory. `run_baseline.py` imports unchanged tests and redirects only their fixture root and trusted compiled extension path. The store's admission limits and path-policy logic remain unchanged. Bench spill/output paths are redirected as well. No source is rewritten and no original prototype data is opened.

Unsigned extensions execute native code with process privileges. Use only the reviewed local build, serial loading and trusted isolated test inputs. No small absolute address-space limit is applied; the recorded runtime reserves substantially more virtual address space than resident memory.

## Not established

Typed-v2 evaluation, typed persistence/migration, typed browser behavior, new full-path performance, deployed Site acceptance, and crash/backup/restore certification remain unrun. The separate new v2 acceptance harnesses must not count these baseline results as typed coverage.
