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
