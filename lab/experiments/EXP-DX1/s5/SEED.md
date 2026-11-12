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
At sealing, the read path's positive-ID memo was unbounded and an S5 wrapper capped each scope/epoch map at **131,072**. The third part moves the bound into gateway source, default on: **131,072 entries / 32 MiB conservative entry estimate** per scope/generation, with native fallback; heap bytes are not directly measured.
Peer object cache **256 MiB**, parsed entity cache **64 MiB**, reach sessions **65,536**; peer heap/container stay **2/3 GiB**.
The seal used the wrapper without gateway/commit/replica/core edits. The third part changes gateway memo source and adds the small Replica subject-snapshot fix documented first in REPORT.md; commit semantics/core remain unchanged. Strict native unit: **16,384** row comparisons, two epochs/three cuts, zero mismatches and exact concurrent capacity accounting.
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
At the prior reporting point, seal source **abb0e467**; evidence root `~/Claude/Projects/triplex-db-2/evidence/DX-S5/` (**424,501,670 B**, compressed raw output only).
Primary evidence: `seed100000-c2.log.gz`, `population100000-a.log.gz`, `orch-seed100000-b4.log.gz`, `readback100k-jvm-a.log.gz`, `idmemo-unit-b.log.gz`, `activation100000-a.log.gz`, `candidates100000-a.log.gz`, `final-inventory-b.log.gz`.
T4/T5 remain missed; complete three-candidate live performance and a pristine physical clone were not obtained. See REPORT.md for the content/freshness/binding audit and next changes.

Third-part activation, 2026-11-12, measured source **e4759d64**:
- Reused this appended volume explicitly; H began at head **4,357,536** and evaluated immutable **P=4,338,757**.
- All **100,000** native/full/subject-scoped worlds and the two sealed fingerprints above matched again, zero mismatches.
- Bootstrap **446.136 s**, **4,635,599,992 B** packed input, **932,391,011 B** shared index, **6,250 pages** including empty trial roots.
- No-traffic R1: **32.495 s** evaluation, **35.926 s** publication, **53,681 changed / 210 commits**, size 256/window 32. F/G window-8 timing observations were **30.959/31.148 s**, but those attempts were aborted before complete state exactness.
- Live local subject snapshots at fixed configured valid time: evaluation pass **50.388 s** + publication **84.153 s** = **134.541 s**, **9,798 changed / 307 commits**, size 32/window 1/yield limit 50 ms. The wall bar still misses.
- Full-window read p99 **926.814→1830.415 ms (1.975×)**; scheduled commit **152389.243→242498.461 ms (1.591×)**; service **132.333→310.526 ms (2.347×)**. Both ratio bars miss; baseline burst writes already queue for minutes.
- Every **100,000 output, record and stored state** matched the unchanged per-subject Python oracle; post-ACK exactness **701.413 s**, oracle-active wall **682.989 s**. No sampling.
- The exact native state cut was captured and checked on every page, but its number was scheduled for the final report that did not complete. Future equality summaries now emit it directly.
- The command later exited **137** entering the candidate stage, with no complete new three-candidate or matrix result. Final Docker OOM state/whole-run peak were not retained, so the cause is unconfirmed.
- Main-stage peak **11,648,790,528 B (10.849 GiB)** under the **11 GiB** cap; current packed data/index/main post-GC heap **6,149,071,920/932,391,011/1,946,522,416 B**. These are not an additive peak breakdown.
- Shell disk polls interleaved one large equality JSON record. The complete record is recoverable by removing only recognizable poll records; original raw bytes remain. New windows merge closed driver logs after poll writers stop and preserve the driver OOM state.
- Latest mitigation incrementally releases verified record graphs while retaining exact reference bytes/order; unit/type checks passed, **100k candidate completion is not reverified**.
- Latest source uses **triplex.gateway.main, Xmx2g, without the S5 wrapper**; all 100k native reads completed. Physical IDs resolve at the request's current DB, while all rows/revisions retain the selected historical DB.

Fresh final read-only hold, source **0da93a79**, no application driver or logical writes:
- Both peers observed current head **4,364,832**, native basis **27,888,318**; three beyond the highest preserved H ACK **4,364,829**.
- Database **17,443,673,779 B**; clean-stopped volume allocation **17,923,854,336 B** (**17,503,764 KiB**); PostgreSQL exit **0**.
- This remains the only retained DX-S5 volume. No DX-S5 containers/networks/runtime directories remain. No pristine clone exists; cloning still does not fit the 15 GiB reserve.
- H minimum sampled Mac free **19,220,116 KiB (18.330 GiB)**, VM free **41,119,948 KiB**. Original seal time/size/peak above remain historical seeding measurements, unchanged.

Current main-only command, using a fresh attempt name: `bash lab/experiments/EXP-DX1/s5/activation.sh next-main-1`.
The runner now defaults to R1 window 8 and omits candidates/matrix; `S5_MATRIX=1` explicitly enables those uncompleted stages. This is not a new successful full-scale measurement.
Head-only command: `node lab/bin/heavy.mjs --label DX-S5-head -- bash lab/experiments/EXP-DX1/r2/window.sh tx2-dxs5-head-new tx2-dxs5-seed-100000-pg-data dxs5-w0-100000-v1 100000 --head-only`.
Read-only clone verification remains the earlier candidate-verification command with fresh names and without `--verify-in-place`; reserve checks must pass. Never resume seeding this consumed volume.
Evidence: `publication100000-f/g/h.log.gz`, `full-f/g-cpu-a.log.gz`, `full-h-parse-a.log.gz`, `head-final-a.log.gz`, and focused check logs under the evidence root above. REPORT.md distinguishes fresh phase checks from historical and uncompleted work.

Fourth-part update (2026-11-12), superseding prior pending candidate/memory status:
- Measured C source 246809dd; G/H source 910f2124. The immutable P=4338757 and its two fingerprints/fact count were rechecked on all 100000 native/full/scoped worlds, zero mismatches. No pristine clone was created.
- C no-traffic evaluation/setup 46.654 s plus 36.231 s publication =82.885 s, 53681 changed/210 commits. Its overloaded frozen-burst baseline/follower failure prevented a new live activation verdict; no complete new published-state comparison.
- Dedicated writer/follower/two reader workers, engine CPUs 0–2/runtime 3–7: explicit capacity caps 10 and 5 commands/s passed latency headroom checks. Scheduled/SDK p99 814.831/186.327 ms and 479.933/130.944 ms; read p99 120.074/110.001 ms at 5585/5552 reads/s. These are paced prefixes, not frozen-burst acceptance.
- H quiet three-release pass 34.998 s, 35.727 s including setup; every 300000 candidate output/record matched independent Python, oracle wall 198.900 s. Bootstrap 591.798 s, 1563 pages; one release 24.307 s. Head unchanged 4376617→4376617; no live traffic/publication, zero feed reads in the candidate driver.
- H whole-driver peak 10792865792 B (10.052 GiB), OOMKilled=false/oom_kill=0, includes a read-only tail diagnostic subprocess during bootstrap. Retained slabs/index/candidate main heap 4633657344/911191011/604929832 B, not an additive peak decomposition. All candidate checks completed within the hold.
- Read-only retained-tail diagnostic found a deterministic 16-journal/64 MiB response overflow after 4374773. Halving to eight read all 664 journals and matched every 2757 changed-root native world at 4375021; current head 4376617 unchanged. Final helper source f9caf860 passed a fresh native eight-journal full-byte comparison, with cap unchanged; no full live verdict of this fix.
- C shutdown self-copied its redirected log to 17078199438 B, violating the file/disk floor; original 2139133 driver bytes, traffic, complete JVM logs and final resource flags were recovered. Duplicate recursive cleanup bytes discarded. Original C exception was lost; the tail overflow is a reproduced defect, not proof of that exact exception. TERM redirection/foreground stop fixes have four regressions.
- Latest observed head 4376617, native basis 28084719; database 18328131251 B; pre-stop volume allocation 18351096 KiB (18791522304 B); PostgreSQL stopped cleanly (exit 0). Only this seed volume remains. No owned containers/networks/runtime directories remain, own lock released.
- Final source ae7d9e87: bounded same-cursor feed retry, complete-root tail probes and explicit --traffic-write-max-rate option. Final runtime/feed/mode 9 tests and logging 4 tests pass; source/report distinguishes native/candidate exactness from unmeasured activation/pacing.
- Evidence: capacity-tail-g.log.gz, candidates-thread-h.log.gz, complete-tail-h-b.log.gz, native-adaptive-h-b.log.gz, thread100000-c-recovered.log.gz and check logs under the existing DX-S5 evidence root. Commands/layout/open bars are in REPORT.md.
