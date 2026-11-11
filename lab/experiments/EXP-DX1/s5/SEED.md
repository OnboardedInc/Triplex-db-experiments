Unsealed seed in progress — second part, 2026-11-11.

Volume: `tx2-dxs5-seed-100000-pg-data`; checkpoint: `tx2-dxs5-seed-100000-tools`.
Scope: `dxs5-w0-100000-v1`; seed id: `1b8525ba-a1ae-4a81-9299-82e1e9a9f932`.
The same retained pair from orchestrator attempts b1–b5 is being resumed; no new seed was substituted.

Last fully verified prefix: 80,000 subjects at logical position 3,471,684.
World fingerprint: `sha256:e51fd84cb777179efdc131e1d68fd5645b3a156cf8c9be94e36b01ff858cec98`.
R2 fingerprint: `sha256:6fa5bccab01f0e293bd16f017f9dc806d3c3c61421b0e0ab608dc8dc4f7e43bd`.
Reachable fact occurrences: 35,643,500; shared reachable facts repeat per subject.
This is the first 80,000 subjects of the 100,000-subject rung, not a separately generated 80,000-subject population.
Fresh complete native pre/post maintenance equality at basis 22,058,829:
current 99,889,072 rows, digest `393c9cc53fb9d0e57905e81bf5e68f6b314746e58b1d5a885913ce9143430df7`;
history 99,920,448 rows, digest `26d8870ce36e40f8e5791c4de6c1f0c8f2da3f1a1622ff8c7c9feca12c152cf0`.
Evidence: `~/Claude/Projects/triplex-db-2/evidence/DX-S5/seed100000-c1.log` (active; compressed when closed).
The hold has advanced to the next 10,000-subject chunk; current head can exceed the verified cut above.

Diagnosis: b4 logged `OutOfMemoryError: Java heap space` in `/reach-many` at `datomic.index.Index.seek` through `entity_cache/revision` (raw lines 961–995).
The AMQ startup failures were separately reproducible before the broker's first heartbeat/listen; a fresh peer read the retained head in 1.553 s.
The retained database was already indexed: the transactor reported zero catch-up bytes, index-t=tail-t=22058829, catch-up 16 ms.
Both original-profile gateways also returned HTTP 200 at head 3471684; PostgreSQL max_connections=100, with no exhausted connection pool observed.
Evidence: `orch-seed100000-b4.log.gz`, `live-jvm80000-a.log.gz`, `probe80000-c.log.gz`, `http-head80000-a.log.gz`, `observe80000-c.log.gz`.
The allegedly empty b5 transactor section contains all 13,162 bytes plus its separator in the raw file.

Correction: wait for a successful target-database head read, not generic health; keep the 2 GiB peer heap/3 GiB container limits.
Datomic object cache is 256 MiB, parsed cache 64 MiB, and session entries 65,536; defaults outside the S5 profile are unchanged.
Complete 80,000-subject readback now succeeds, with reader container memory sampled near 2.25 GiB.
Complete console/rotated/Clojure/GC logs are captured on failures, and uncompressed extraction counts must equal the archived size.
Resume: `S5_RESUME=1 node lab/bin/heavy.mjs --label DX-S5-seed100000-c1 -- bash lab/experiments/EXP-DX1/s5/hold.sh 100000 10000 false`.
No 100,000-subject seal, clone or activation result exists yet. The original deleted first attempt remains a historical failure.
