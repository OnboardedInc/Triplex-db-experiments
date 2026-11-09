# DX-B2 evidence index

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B2`. 582 regular files, 241,657,177 bytes. Bulky raw output remains outside git.
`SHA256SUMS` hashes every retained regular file relative to that root; it does not establish a production PASS.

Verify from the durable root:

```sh
cd /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B2
shasum -a 256 -c /Users/sam/projects/triplex-db-2/.claude/worktrees/dx-b2/lab/experiments/EXP-DX1/b2/SHA256SUMS
```

- Final warm run: `bench-1794264686047-2fbd8359-6b4d-4d93-b459-0d51b2de01bb/result.json`, `runner.mjs`, all `step*-raw.json` and `step*-stats.jsonl`; `bench-final.log`. Measured source head `9d5809fc183a2284f3365b0e5fe0ff10930c06f6`.
- First complete run (retained misses): `bench-1794261338251-452a53df-4043-47ae-9cb1-3db435c4f647/`; `bench-n4c.log`.
- Final stack/source/image/SQL durability binding: `tx2-dxb2-final/stack.json`, `gateway-files.json`, `containers.json`, `health-*.json`, `durability.txt`; source copies `stage/tx2-dxb2-final/` and `source-FINAL/`.
- Final correctness: `final-gate.log`, `final-gate-results.json`, `final-transitions.json`, `final-reset.log`, `final-reset-transitions.json`.
- Final mutation sensitivity: `final-mutants.log`, `mutants-20261109T224204Z-24714/`. Earlier mutation failures remain at the root.
- Codec/domain/client: `codec-opt-unit.log`. Core: `core.log`. Other adapter typechecks: `other-types.log`. Broader lab harness typecheck limitations: `bench-types2.log`.
- JVM feed: `n5-feed-unit3.log`, `n5-recorded-feed-page.json`; failed compile/output-setting attempts retained in `n5-feed-unit*.log`.
- NS indexing-hook smoke: `runs/reach-1794260876834/ns-report.json` and `console.log`; its earlier sandbox-failed attempt is retained in the adjacent run.
- Attribution controls/profiles: both `commit-probe-*/` directories, `commit-control.log`, `commit-candidate.log`. The first control has only selected source hashes; the later probe retains source/build preimages and source-stability checks. Both are diagnostic smaller-fixture probes.
- Install/build histories: `install.log`, `build*.log`, other named build logs. Zero dependency/image downloads.
- Failed startup and early aborted run: `stack-n4b.log`, `tx2-dxb2-n4b/postgres-failure.log`, `bench-attempt1-aborted.md`; other first failures remain retained.
- Unintegrated JSON-parser prototype: `parser-prototype/`, `parser-unit*.log`; not deployed or used for the reported final design.
- Cleanup: `CLEANUP.json`, `cleanup-before.json`, `cleanup-final.log`, final container logs. Remaining owned containers/networks/volumes: empty.

Largest files:

| Bytes | Relative path |
|---:|---|
| 26,974,113 | `bench-1794261338251-452a53df-4043-47ae-9cb1-3db435c4f647/step5-with-readers-raw.json` |
| 26,599,258 | `bench-1794264686047-2fbd8359-6b4d-4d93-b459-0d51b2de01bb/step5-with-readers-raw.json` |
| 26,307,365 | `bench-1794261338251-452a53df-4043-47ae-9cb1-3db435c4f647/step5-open-loop-raw.json` |
| 26,220,383 | `bench-1794264686047-2fbd8359-6b4d-4d93-b459-0d51b2de01bb/step5-open-loop-raw.json` |
| 24,361,069 | `bench-1794261338251-452a53df-4043-47ae-9cb1-3db435c4f647/step5-serial-raw.json` |
| 24,357,550 | `bench-1794264686047-2fbd8359-6b4d-4d93-b459-0d51b2de01bb/step5-serial-raw.json` |
| 7,496,078 | `bench-1794264686047-2fbd8359-6b4d-4d93-b459-0d51b2de01bb/step3-concurrent-raw.json` |
| 7,276,479 | `bench-1794264686047-2fbd8359-6b4d-4d93-b459-0d51b2de01bb/step2-full-raw.json` |
