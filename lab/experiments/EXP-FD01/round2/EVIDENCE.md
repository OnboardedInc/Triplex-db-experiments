# FD01 round 2 evidence

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-FD01/`.
The round 2 SHA256SUMS paths are relative to that root; the round 1 manifest remains unchanged.

| Path | Observation |
| --- | --- |
| `round2-g0/G0-xtdb-20261109T053539Z-02d392.json` and same-named directory | Final-source G0, 1,238 pass, 0 fail, 137 expected skips; copied raw reports and referenced content-addressed objects |
| `2f5fde2d-adb7-4ce1-b626-822e2a938830/` | Initial round 2 standalone source-unchanged builds/types; 13 host tests, 10 bench tests; 900 raw pre-replay crash observations (500 keyed, 300 unkeyed split, 100 keyed split) |
| `round2-mutant-f4a4d8f2-a62f-4fcc-bed3-164466eb6fe3/` | Final exact QA mutation applied to candidate: one actual after-first-COMMIT exit 77, full expected effects/affected rows with null checkpoint, specific pre-replay rejection, source unchanged, copied preimages |
| `round2-mutant-54049c8e-1c9c-44a9-ab45-53976ab2aaf7/`, `round2-mutant-319a5134-34b1-4735-b18a-9d59d413ec27/` | Earlier rejection checks; retained as earlier attempts, not substituted for final proof |
| `round2-clock-a7612370-3325-45f2-a20a-edea58bfd73d/` | Final adapted actual-consumer QA clock fixture: publication=100, durable=400, stamp=399, reported lag=300; raw result, SQLite file, hashes/preimages, unchanged source |
| `round2-clock-*/` | Earlier adapted clock attempts retained as diagnostics |
| `round2-pack/triplex-pack-rhW0cq/` | Offline package check: tarball checks completed, clean-consumer npm ERESOLVE retained; no network fallback |
| `round2-source/` | Round 2 implementation and helper preimages; source hash-change inventory; no credentials or dependency caches copied |
| `round2-logs/` | Actual build/test/G0/mutation/clock/package command logs, including expected failures and heavy-job admission waits |

The standalone 900 observations precede the final commit-boundary-first ordering, stricter key validation and publication-time bucketing; final G0 and the final mutation/clock probes cover the final source. Exact unmodified review probes are in the repository at `round2/reviewer-probes/`, with the fd8f670 content hashes in ORIGIN.json. Adapted probes are separate files; no old receipt was retrospectively given new source proof.

No new latency sample rescues the round 1 11.112791 ms p99. No engine, slot, live source observer, native erasure/excision/restore or 256-reader P3 result is represented here.
