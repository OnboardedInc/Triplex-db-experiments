100,000-subject sealed logical base; physical volume subsequently used as explicitly declared below.

Volume: `tx2-dxs5-seed-100000-pg-data`; scope: `dxs5-w0-100000-v1`.
Seed id: `1b8525ba-a1ae-4a81-9299-82e1e9a9f932`; sealed logical position **4,338,757**.
Subjects **100,000**; reachable fact occurrences **44,537,987**.
Worlds: `sha256:fec1d7cedee2b2f18c77e78210e4e9ed14fffb72e9629545155c7307e969c760`.
R2: `sha256:551bbbc479eecd15d4f5eb13698f61d20c09a900b7f83a2b10858fb2ba13b562`.
Both hashes, position and fact count match the unchanged independent Python population oracle (164.10 s).
Fingerprints cover canonical ordered subject worlds at this cut, all reachable valid-time facts and logical assertion positions; shared facts repeat per subject.
Physical Datomic IDs, scope names and recorded wall clocks are excluded. Fact occurrences are not a distinct database-wide fact count.

Seal completed with clean PostgreSQL stop at **2026-11-12 00:07:30 UTC**.
Native pre/post maintenance basis **27,564,753**; complete `:triplex.entity/row` datoms:
current **124,817,263**, SHA256 `1350b8f7420fd7fa3ef35439a80d085b12a36bc1bce058920743541f560a7bf5`;
history **124,856,479**, SHA256 `74180824252e5437d991d70e71aab9a6ef02ff02425c0f97d592c89f6bf3ea3c`.
Other native metadata attributes are outside these row digests.
Table **15,754,092,544 B**; database **15,760,835,087 B**; stopped-volume allocation **16,830,218,240 B**, including **1,040,199,680 B** WAL.
Peak sampled PostgreSQL allocation **22,220,980,224 B**; minimum sampled Mac free **15.874 GiB**, never observed below the 15 GiB floor.
Retained-seed b1 start to clean seal: **29,192 s (8 h 6 m 32 s)**, including failed starts, diagnosis and gaps across b1–b5/c1/c2.
Positive-chunk command time **10,058.816 s**, **431.339 commands/s** for **4,338,757 commands**. Final c2 hold **1,188 s**.
The earlier deleted 70k trial is separate: 9,958 s hold wall, not included in this retained seed's elapsed time; its original cause remains unproven.

Diagnosis: b4 lines 961–995 show Java `OutOfMemoryError` in `/reach-many`, `Index.seek` through `entity_cache/revision`.
The 80k chunk was already indexed (b2), not awaiting a 430k-transaction replay. Fresh direct connect/read took **1.553 s**, basis 22058829; gateway catch-up zero bytes, index-t=tail-t, **19 ms** in diagnose80000-b lines 71–85.
Observed peer TTL **10,000 ms**, heartbeat **5,000 ms**, unchanged; later reconnects show 1 s backoff/unbounded retry maximum.
Restart AMQ failures precede the new broker heartbeat/listener; the diagnostic captures storage location/heartbeat and port 4334 (NIO acceptor started 21:33:10.175, live-jvm80000-a line 23). PostgreSQL max_connections=100 was not exhausted.
Reduced object/parsed/session cache budgets let 80k and 90k finish, but c1 stalled near the end of 100k: full compaction **2037M→1980M in a 2048M heap**.
The read path's positive-ID memo was unbounded. The S5-only wrapper caps each unchanged scope/epoch map at **131,072**, retaining native `d/entid` fallback.
Peer object cache **256 MiB**, parsed entity cache **64 MiB**, reach sessions **65,536**; peer heap/container stay **2/3 GiB**.
No gateway source, commit function, replica package or core changed. Strict native unit: **16,384** row comparisons, two epochs/three cuts, zero mismatches and exact concurrent capacity accounting.
Readiness now waits for a successful target-database head read; the seed driver also checks the exact checkpoint head and full worlds. Complete console/rotated/Clojure/GC logs are captured on failure with byte counts checked.
The allegedly empty b5 transactor section actually contained all **13,162 bytes** plus separator; the earlier display was truncated.

First-use activation, source **db2a7a68**: clone plan required **16,435,760 KiB** while Mac free was **21,468,804 KiB**; a clone plus the 15 GiB floor did not fit. Clone skipped; no measured clone time exists.
All 100,000 bootstrap worlds and the independent four-field fingerprint matched before the first activation append.
Bootstrap **475.817 s**, input **4,630,799,992 B**, shared index **911,191,011 B**, **1,563 pages**.
R1 preparation without live traffic: evaluation **32.077 s**, publication **74.639 s**, **53,681** changed subjects/**839** commits; **107.710 s** including setup.
Live R2 under 256 readers/frozen writer trace: evaluation **54.939 s**, publication **114.304 s**, **9,798** changed subjects/**154** commits; **170.125 s** including setup. The 100 s bar is missed.
Full-window read p99 before/during **3755.279/3936.765 ms** (**1.048×**); scheduled commit p99 **119480.656/249368.891 ms** (**2.087×**, bar missed); commit-service **133.922/318.956 ms** (**2.382×**).
Matched 100 s prefix ratios: read **1.041×**, scheduled commit **2.087×**, service **2.394×**; baseline did not cover the full 169.427 s sweep. Sequential diagnostic, no A/A calibration.
Follow lag p99 **271.768 ms**, **1,216** observed commits. Main stage reported peak **9,780,568,064 B (9.109 GiB)**; retained data/index/main post-GC heap **5,179,965,440/911,191,011/1,848,022,656 B**.
Main exactness: **all 100,000 worlds, outputs, records, published states and per-subject Python checks**, zero mismatches, exact changed-subject counts; **1,358.709 s**, oracle-active wall **1,324.560 s**.
Inputs stayed at sealed P; published states were read at **4,347,443**, independently observed in `activation100000-head-b.log.gz`.
The following live candidate attempt failed at Node's default ~2 GiB heap, log line 686: `FATAL ERROR: Reached heap limit`, result deserialization stack, exit **133**. It did not produce a complete live three-candidate result; its final whole-container peak is unavailable.

Read-only follow-up, source **4658aabe**: S5 keeps the **11 GiB cgroup cap**, sets **4 GiB V8 old space**, and compacts already checked reference objects to exact canonical bytes.
It repeated all 100,000 native-world/fingerprint checks at P; observed logical head stayed **4,347,648→4,347,648**, zero feed reads/live readers/publications.
One R2 reference evaluation **31.865 s**; three canonical releases in one pass **46.620 s**, **47.446 s** including setup, **no live traffic**.
Every **300,000 candidate output and record** matched unchanged Python O-DOMAIN; oracle stage **357.209 s**, no sampling.
Whole follow-up driver peak **9,939,202,048 B (9.257 GiB)**; packed data/index **4,633,657,344/911,191,011 B**; candidate main heap after GC **3,142,315,000 B** while all 100,000 triple records were retained.
Candidate-only H5 clone proof also passed 1,000 worlds/fingerprint and 3,000 oracle comparisons, **715,038,720 B** peak. Original H5/H8 volumes were never mounted writable.
The retained volume now contains activation/outbox/traffic appends; **there is no pristine physical seed copy**. The sealed input cut remains readable and reverified.
After follow-up clean PG stop: volume allocation **16,764,157,952 B**, database **16,149,747,379 B**; WAL housekeeping makes allocation differ from the original seal. Tools and all owned containers/networks were removed.

Resume used before sealing: `S5_RESUME=1 node lab/bin/heavy.mjs --label DX-S5-seed100000-c2 -- bash lab/experiments/EXP-DX1/s5/hold.sh 100000 10000 false`.
Do not resume the sealed volume: its checkpoint/tools volume is gone. The original first-use command was:
`node lab/bin/heavy.mjs --label DX-S5-activation100000-a -- bash lab/experiments/EXP-DX1/r2/window.sh tx2-dxs5-eval-100000-a tx2-dxs5-seed-100000-pg-data dxs5-w0-100000-v1 100000 --first-use-if-needed --seed-position 4338757 --seed-fingerprint --publish --post-capture --candidates --oracle-candidates --oracle-concurrency 8 --oracle-processes 3 --batch-oracle --verification-pages 4 --live --traffic-offset-s 120 --baseline-ms 100000 --live-warmup-ms 10000`
Read-only follow-up command:
`node lab/bin/heavy.mjs --label DX-S5-candidates100000-a -- bash lab/experiments/EXP-DX1/r2/window.sh tx2-dxs5-eval-100000-candidates-a tx2-dxs5-seed-100000-pg-data dxs5-w0-100000-v1 100000 --verify-in-place --verify-candidates-at-seed --seed-position 4338757 --seed-fingerprint --candidates --oracle-candidates --oracle-concurrency 8 --oracle-processes 3 --batch-oracle --verification-pages 4`
To clone the retained volume for verification when disk permits, use that command with a fresh prefix/label and **omit `--verify-in-place`**; it copies the appended volume, then verifies historical P, and refuses insufficient reserve.
Seal source **abb0e467**; evidence root `~/Claude/Projects/triplex-db-2/evidence/DX-S5/` (**424,501,670 B**, compressed raw output only).
Primary evidence: `seed100000-c2.log.gz`, `population100000-a.log.gz`, `orch-seed100000-b4.log.gz`, `readback100k-jvm-a.log.gz`, `idmemo-unit-b.log.gz`, `activation100000-a.log.gz`, `candidates100000-a.log.gz`, `final-inventory-b.log.gz`.
T4/T5 remain missed; complete three-candidate live performance and a pristine physical clone were not obtained. See REPORT.md for the content/freshness/binding audit and next changes.
