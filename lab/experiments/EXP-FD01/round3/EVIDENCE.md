# FD01 round 3 evidence

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-FD01/`.
`SHA256SUMS` paths are relative to that root. Earlier-round manifests are unchanged.

| Path | Evidence |
| --- | --- |
| `672f137e-206f-46cf-9ac5-f0e04cbfd16a/` | First attempt retained: builds/types and 13 host tests passed; bench failed on a fixture variable and sandbox boot-identity query denial. Not a passing attempt |
| `3809e4bb-9f72-4957-9242-e4df6d89c4c5/` | Corrected source-unchanged standalone builds/types, 14 host tests, 11 bench tests; 900 crash observations. Precedes final capture-before-lock refinement |
| `round3-cross-48b1a2ed-e505-4af3-89c7-eacb1bae9727/` | First real two-process origin probe: 90.246875 ms relative versus 406.7035 ms bound host interval |
| `round3-g0/` | Final-source G0: 1,240 pass, 0 fail, 137 expected skips; receipt, raw reports and hash-verified content-addressed source/build objects; no engines/slot |
| `round3-cross-cb89fbc6-71ad-42ae-903e-51909576f308/` | Final G0-built code: actual two-process 102.143251 ms relative versus 406.375084 ms bound host interval; raw captures and independently read-back producer record; controls reject and source/build hashes unchanged |
| `round3-source/` | Final implementation/probe preimages, tracked diff, source hash-change inventory, base Git identity and targeted lint (0 errors, 2 pre-existing warnings) |

Original review probe is retained verbatim in `reviewer-probes/`, bound to `0fcaa911` by `ORIGIN.json`.
It targets the old API; the adaptation in `cross-process.mjs` runs against public built package exports.
The producer record's host identity is a local hash; no data was sent to a service.

No real source observer, live P3 latency, 256-reader load, engine recovery, G1 or successful clean package install is claimed.
The final sidecar observation is captured before waiting on its own SQLite lock/fsync; production sources must call it at their native publication event. NS windows still need integration with the shared host-boot origin.

A metadata-copy retry skipped already verified read-only objects with duplicate hashes; no gate was rerun or reclassified for that copy operation.
