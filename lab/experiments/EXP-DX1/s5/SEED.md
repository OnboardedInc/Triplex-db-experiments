Unsealed 100,000-subject seed — second part, 2026-11-11.

Volume: `tx2-dxs5-seed-100000-pg-data`; checkpoint: `tx2-dxs5-seed-100000-tools`.
Scope: `dxs5-w0-100000-v1`; seed id: `1b8525ba-a1ae-4a81-9299-82e1e9a9f932`.
All 100,000 subjects are committed at position 4,338,757. The same pair from orchestrator attempts b1–b5 remains retained.
Last fully verified prefix: 90,000 subjects at position 3,907,910, with 40,132,691 reachable fact occurrences.
Observed prefix world fingerprint: `sha256:8bcb75b80e2109d52fc9494d4df0b4c933fe84e301aeb3a91f3c74ccd5f325c6`.
Observed prefix R2 fingerprint: `sha256:759600884712c02659f3e85ed738591464d83b5aa93e8ccb72dec56e758d88cd`.
These are the first 90,000 subjects of the 100,000-subject rung, not a separately generated population.
World fingerprints cover ordered subject worlds at the named cut; shared reachable facts repeat per subject, physical IDs/scope names/recorded clocks are excluded.

Fresh 100,000-subject native pre/post maintenance equality in attempt c1, basis 27,564,749:
all `:triplex.entity/row` datoms: current 124,817,263, digest `1350b8f7420fd7fa3ef35439a80d085b12a36bc1bce058920743541f560a7bf5`;
history 124,856,479, digest `74180824252e5437d991d70e71aab9a6ef02ff02425c0f97d592c89f6bf3ea3c`.
Other native metadata attributes are not included in this row digest.
Maintained table bytes: 15,750,660,096; database bytes: 15,757,386,255. A clean stopped-volume seal is still pending.

Expected 100,000-subject fingerprint from unchanged Python population oracle, 164.10 s, `population100000-a.log.gz`:
worlds `sha256:fec1d7cedee2b2f18c77e78210e4e9ed14fffb72e9629545155c7307e969c760`;
R2 `sha256:551bbbc479eecd15d4f5eb13698f61d20c09a900b7f83a2b10858fb2ba13b562`;
position 4,338,757; reachable fact occurrences 44,537,987. These expected values are not an observed SQL/world PASS.

The transactor is not replaying a long tail: fresh connect/read took 1.553 s, and its log reported zero catch-up bytes, index-t=tail-t=22058829, 16 ms.
Startup AMQ errors precede the new broker heartbeat/listen. Both original-profile gateways could read the retained head over HTTP.
The actual readback failure is peer heap exhaustion: b4 logged `OutOfMemoryError` in `/reach-many` at `Index.seek` through `entity_cache/revision` (lines 961–995).
Lowering the object/parsed/session cache budgets let 80,000 and 90,000 read back fully, but c1 stalled near the end of 100,000 and hit `Gateway deadline exceeded`.
`readback100k-jvm-a.log` shows full compaction 2037M→1980M in the 2048M heap; the thread dump is in the native reach/index seek path.
The read path also has an unbounded positive-ID memo (`reach.clj` id-map/entity-id). S5 now bounds it at 131,072 entries, retaining the same scope/epoch keys and native `d/entid` fallback.
No original gateway source or commit function changed: `bounded_gateway.clj` is an S5-only launch wrapper.
Fresh native eviction unit: 16,384 row comparisons, two epochs/three cuts, zero mismatches; `idmemo-unit-a.log`.
The correction retains complete console/rotated/Clojure/GC logs on failure and checks emitted byte counts. The allegedly empty b5 transactor section actually contains all 13,162 bytes plus its separator.

Attempt c2 is repeating maintenance and full readback on the same retained pair with the bounded memo.
Resume command: `S5_RESUME=1 node lab/bin/heavy.mjs --label DX-S5-seed100000-c2 -- bash lab/experiments/EXP-DX1/s5/hold.sh 100000 10000 false`.
Evidence root: `~/Claude/Projects/triplex-db-2/evidence/DX-S5/`; closed raw command logs are gzip compressed.
No 100,000-subject seal, clone or activation result exists yet. The original deleted first attempt remains a historical failure.
