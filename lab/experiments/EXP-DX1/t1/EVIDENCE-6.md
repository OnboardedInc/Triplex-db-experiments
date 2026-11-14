# Part 6 durable evidence

Root: ~/Claude/Projects/triplex-db-2/evidence/DX-T1/. No raw files are committed. Every run retains trace.html, trace.chrome.json, automatic reports, compressed raw traces, source/build/slot identity, oracle archives and cleanup receipts. The repository keeps only small indices/reports and SHA256SUMS under runs/. Global evidence/TRACE-INDEX.md has viewer paths and raw sizes.

| run group | source | raw trace bytes (compressed total) |
| --- | --- | ---: |
| reference-a (4 arms) | c9b9fc3f | 52120871 |
| native-a (4 arms) | cc625642 | 227471276 |
| profile-smoke-a (1 arms) | cc625642 | 32715172 |
| cache-smoke-b (1 arms) | 9ac79685 | 16944141 |
| cache0-b (4 arms) | 9ac79685 | 70959276 |
| cache256-b (4 arms) | 9ac79685 | 103365078 |
| candidate-smoke-a (1 arms) | b6aa04e7 | 249431268 |
| rev0-a (3 arms) | b9b9c9f6 | 53254715 |
| rev256-a (3 arms) | b9b9c9f6 | 77937455 |
| cores0-a (3 arms) | 7629065b | 53213529 |
| cores256-a (3 arms) | 7629065b | 78818232 |

Native smoke attempt cache-smoke-a was refused for an invalid 2-GiB object-cache/3-GiB heap combination before measurement; original startup/TERM failure and source-bound scheduler recovery remain retained. The valid 1280-MiB follow-up passed.

Basis comparison tx2-dxt1-p6-basis256-a was refused before lease/container creation when free disk was below 20 GiB; controller and incomplete session metadata are retained. No timing or oracle result is derived from it. Disk admission observations: p6-disk-admission.jsonl. The authorized raw-trace scan found only two uncompressed files, both in the report-cited interrupted p4 writer arm; they remain unchanged. No other evidence, foreign containers or volumes were removed.

Validation logs/receipt: p6-final-unit.log (pnpm option refusal), p6-final-unit-direct.log, p6-final-types.log and p6-checks-receipt.json. Full command inputs and per-attempt SHA256SUMS bind observations, not just a historical report label.

All 24 anatomy derivations passed the normal raw/source/slot/command/collector reader. They write to p6-phase-analysis/<original-tag>, preserve the original source separately from renderer SHA256, and do not mutate any cited report/raw input. All 48 derived JSON/Markdown hashes are in PHASES-6-SHA256SUMS; parser logs are p6-phase-analysis.log and p6-pair-phase-analysis.log.

Closing attempt tx2-dxt1-p6-closing-a at f3e87989 was refused at the unchanged 20-GiB disk guard before any lease or container. Its first host-quiet probe had sandbox-denied ps/sysctl reads; a later authorized read-only host probe and owned-resource inventory succeeded (p6-host-after-analysis.jsonl, p6-owned-final-inventory.txt). No latency or quiet verdict is inferred from either probe. Private p6-compression-scan.json binds the only two uncompressed candidate files to their unchanged bytes; both are cited part-4 writer traces and remain untouched. The floor was not lowered.

Final fresh checks: p6-release-check.log, p6-cli-guard-tests.log, p6-final-checks-receipt.json and p6-final-checked-source.patch. The older p6-checks-receipt.json is a checkpoint with explicit observed file lengths, including a then-growing admission journal; its journal hash applies to that recorded prefix. Immutable command logs remain separate. No dependency/image was downloaded in part 6.

Final retry tx2-dxt1-p6-closing-b at bee2b558 had working host probes: quiet heuristic true, Mac non-VM CPU 18%, swap 4823.06 MiB. It again refused solely at the unchanged disk guard (19.523 GiB), before any lease or containers. p6-closing-b-controller.log and its session metadata preserve that attempt. p6-final-state.json binds a successful fresh empty owned-prefix query, query implementation hash and absent lease to this exact source; performanceVerdict is null. The final report is committed before waiting out unused budget because no authorized compression target can unblock admission. EVIDENCE-6-SHA256SUMS covers auxiliary receipts, check logs, native gate bytes and original session/trace manifests; PHASES-6-SHA256SUMS covers derived anatomy.

Final output-safety check: p6-safe-derive-check.log, p6-safe-derive-checks.json and p6-safe-derive-source.patch retain the fresh-directory/symlink/exclusive-create guard and its full package rerun. The anatomy CLI requires a new destination. No cited report/raw bytes were replaced.
