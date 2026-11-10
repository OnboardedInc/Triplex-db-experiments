# DX-S3 evidence index

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S3/`.

- [Final report](REPORT.md), including all measured percentile/attribution tables, exact recommended V2 command, limitations and verdict audit.
- [SHA256SUMS](SHA256SUMS): 1,544 files, 1,621,311,287 logical bytes; manifest SHA256 `5cfd71fb2735ade5225d043897051c9d22759c6703ef8ea1825d87a1fc893ab8`.
- Durable `INTEGRITY.json`: SHA256 `56ab25ba5ceafc2fd4ace99bb3f2c61778aecfbe7b02390cff8be732004e86aa`; two reads found zero mismatches. This is byte integrity, not semantic acceptance.
- Durable `final-inventory.json`: fresh empty `tx2-dxs3-*` container/network/volume inventories at seal time. All created Docker resources were removed.
- Durable `source-readback.json`: 849 package/source/build and fixed benchmark files unchanged against retained preimages.
- `source-build/` retains initial source/build preimages; `source-final/` retains the pre-delivery scripts/report/control files at seal time. Saved `runner.mjs` files and source hashes identify actual measured runner versions.
- `report-tables.md` and each `bench-*/analysis.json` retain derived values; raw `*-raw.json` files retain per-command receipts, timestamps, headers, datoms and native t. Container-prefix directories retain GC/native/Postgres logs, actual JVM arguments, SHOW output and identities.
- `zgc-allocation-stall-scan.json` retains the full allocation-stall extraction. The committed report adds its interpretation after sealing; the sealed pre-delivery report text has not been rewritten.
- First failures/partials: `docker-outage.jsonl`, `partial-v0-abort.json`, `cleanup-first-outage.json`, `v2-failed-probe-lock-cleanup.json`, attempt status files and superseded parser outputs. V4 is explicitly not admitted, with zero timed offers.

The event-overlap counts are **conditional** on native/client containment alignment. Independent clock probes were not captured through completed bursts, and native log/accounting delay was not independently ruled out. The retained runner now captures per-second VM dates for a future rerun; that addition was syntax checked only. Monotonic duration percentiles, native transaction/datoms matches, source bindings and offered-command accounting are separate checks.

Verify retained bytes from the durable root:

```sh
cd /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S3
shasum -a 256 -c /Users/sam/projects/triplex-db-2/.claude/worktrees/dx-s3/lab/experiments/EXP-DX1/s3/SHA256SUMS
```

No independent acceptance, root-wide pnpm check, fresh power-loss test, full semantic oracle rerun, year-one scale or 256-reader test was performed. No package code or acceptance contract was changed. No merges or pushes were performed.
