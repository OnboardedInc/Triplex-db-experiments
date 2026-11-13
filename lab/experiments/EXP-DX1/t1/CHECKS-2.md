# Part 2 evidence index

All paths below are relative to `$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1/`.

- `tx2-dxt1-p2-abl-a-session/`: the nine recorder ablation arms.
- `tx2-dxt1-p2-cost-{a,b,c,d,e}-session/`: every off/default/default/off sequence, controls, swaps and source binding.
- `tx2-dxt1-p2-model-a-session/`: complete legacy/compact full-pair comparison and off bookends.
- `tx2-dxt1-p2-cpu-a-session/`: partial CPU comparison; closing off refused disk, not a complete session.
- `checks/queue-findings.json`, `final-numbers.json`: five dependency chains, all 56 predecessors, and exact primary latency derivations.
- `checks/final-evidence-check.json`: 986 manifest hash readbacks across 55 attempts; raw traces unchanged.
- `checks/final-bindings.json`: all changed JS checked; 124 unchanged inherited coverage gaps listed explicitly.
- `checks/viewer-qa.json`, `trace-viewer-L256.png`: offline L256/tail viewer checks and screenshot.
- `checks/pin-audit-final.json`: no changed pinned references and no acceptance edits.
- `checks/oracle-compression-20261113*.jsonl`, `oracle-archives-reverified.json`, `aux-compression-20261113.jsonl`, `view-clones-20261113.jsonl`: lossless gzip/COW preservation receipts. `gzip -dk` restores the original auxiliary paths.
- Every completed arm has `trace/SHA256SUMS` for raw bytes and `SHA256SUMS` for reports/viewers; committed copies are under `runs/`.

`CHECKS-2-SHA256SUMS` hashes the small diagnostic receipts and recovery manifests. Larger files, including all raw traces, stay in the durable store. Failed smokes e and h and the refused control are retained.
