# DI01 evidence index

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DI01/`.

The report gives the scope, limits and PASS audit. Raw files stay outside git. [SHA256SUMS](SHA256SUMS) binds the completed receipts and the durable full inventory.

Completed stages:

- `g0/G0-datomic-20261109T071437Z-c6e724/`: passing G0 receipt, raw output and referenced content-addressed objects. Prior G0 attempts are also retained.
- `final-r4/cases/`: nine named consumer cases, C19/C20 rule-boundary checks, raw oracle bytes and databases.
- `final-r4/crash/`: no-crash baseline, input, 900 raw stop/replay observations and actual SQLite files. All five DI snapshot tables are included.
- `final-r8/lag/`: complete apply-path paired timing samples, actual alternating J2/J1 changes, fresh O-DOMAIN fanout outputs and per-subject rerun hashes. 1,000 samples each; 100,000 dependency cross-checks.
- `final-r12/`: final source/build preimages and completed MATCH trace: 438,140 positions, 10,000 subjects, 662 full-world checks, 101 dependency cross-check positions, 180 expected/observed raise boundaries. The failed r11 predecessor is not adopted.
- `GS06-*/` and `oracle-control-*/`: fresh W02 claim and partitioned-versus-unsplit oracle controls, selected by the final attempt's binding/start interval in `audit.py`.
- `query-plan.json`, `query-plan-old.json`: actual SQLite query plans for the selective covering join and previous broad scan.
- `pack/`, `pack-rerun/`: failed initial layout attempt and subsequent offline clean-consumer failure. Package check is not passed.

`final-r4`, `final-r8`, and `final-r12` each retain `binding.json` and `preimages/<sha256>`. Their consumer, kernel, Python oracle, world and dependency-lock bytes agree. Differences are isolated to retained harness revisions and tests. Earlier stopped, failed, and preliminary attempts are not completed qualification; no prefix is promoted into a full gate.

`audit.py` performs an additional builder readback after the final trace exists. It checks completed non-null bindings, raw SQLite state, actual oracle bytes and ordinals, full generator denominator/command hash, non-void direct-subject differences, full-world checkpoints, boundaries and p99 calculations. Its result remains builder evidence; independent review is outstanding.

`final-r11/FAILURE.json` records the default-heap OOM after all position comparisons, during the separate boundary replay. It is a failed attempt; r12 repeats the complete unchanged-source gate with an explicit 8 GiB heap.

Stopped evidence may be losslessly compressed as `.zst`; restore with `zstd -d` before opening the matching SQLite family. `compression-r12-readmission.jsonl` and `compression-r12-stopped.jsonl` bind original names/sizes/SHA256 to verified decompressed bytes and record quiescence checks. Active r12 evidence is untouched.

Builder readback: `audit-28504077-510a-4168-9a53-9f87ed9fb00a/result.json`, also copied to `BUILDER-CHECKS.json`: PASS, explicitly `independentPromotion: false`.

Full inventory: `inventory-23e104cc-0491-44cb-bb31-70259ca739be/SHA256SUMS` (16,708 files / 1,508,629,120 bytes; SHA256 `1307b7b7b70e97614567c7b0fa6672eabda4ad3e367b9bd31a812de8fb5f4789`). Paths in that manifest are relative to the durable root. Its own directory is excluded to avoid recursion; the committed small manifest separately hashes its result, full manifest and receipt-retention record. `logs/` retains all completed DI01 tool logs, including both readback attempts and the failed package check. No active writer remained when the inventory ran.
