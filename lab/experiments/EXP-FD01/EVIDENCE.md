# FD01 evidence index

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-FD01/`.
All paths in SHA256SUMS are relative to that root. Run `shasum -a 256 -c <repo>/lab/experiments/EXP-FD01/SHA256SUMS` from the durable root.

| Path | Meaning |
| --- | --- |
| `g0/G0-xtdb-20261109T050834Z-e33b2d.json` and matching directory | Final-source diagnostic G0, 1,235 passed, 0 failed, 137 expected skips |
| `g0/G0-xtdb-20261109T050508Z-faae55.json` | Nested P2X grouping G0, 1,235 passed |
| `g0/G0-xtdb-20261109T045952Z-57992d.json` | First G0, 1,234 passed |
| `g0/objects/` | Immutable content-addressed objects referenced by the three receipts; copies verified before reuse |
| `096561bb-f82a-4941-b2dc-85136c2d7c86/` | Source-unchanged standalone builds/types, 10 feed tests, 9 bench tests |
| `0a3b1cbd-9e1a-4356-9138-103ab843b085/` | First failure, missing host testkit dev dependency, zero tests executed |
| `4ed71edf-e61e-408e-95c6-b6272448a299/` | Worker-close failure and changing runner source; retained, not qualified |
| `oracle-db361014-ef70-4dc0-9e56-11aeb557161b/` | Fresh independent O-REPLAY output, input hashes/preimages, case hash and duplicate-command original transaction |
| `measure-487eb647-2c5b-40c4-a17c-bbd56a22ef3c/` | Final-source 1,000-write measurement, p99 11.113 ms, misses <=10 ms prediction; zero readers |
| `measure-56dc7b9c-dde3-4396-a850-ef334828bc5e/` | Earlier write sample, p99 6.372 ms |
| `measure-8233670e-356c-4cbf-8dab-5962a2603d25/` | First write sample, p99 5.364 ms |
| `pack/triplex-pack-fqDdto/` | Initial package check: unbuilt unrelated CLI artifact |
| `pack/triplex-pack-y4wWmv/` | All 13 tarball layouts checked; clean consumer fails offline npm resolution; cache/error report retained |
| `source-final/` | Final implementation/runner/case bytes and modified tracked source, not a retroactive snapshot of earlier attempts |
| `fd01-*.log` | Install, build, gate, package-check and measurement command output, including failures and heavy admission waits |

Earlier standalone manifests are hash inventories, not complete source snapshots. Measurement preimages are copied only when bytes still match their recorded hashes; absent old preimages are not invented. The final measurement retains all four named preimages. No fixture result certifies a real broker/XTDB/Datomic feed, a domain affected set, or P3 at 256 readers.
