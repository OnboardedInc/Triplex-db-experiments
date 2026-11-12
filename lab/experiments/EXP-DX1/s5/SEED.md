Sealed 100,000-subject seed — 2026-11-12 00:07:30 UTC.

Volume: `tx2-dxs5-seed-100000-pg-data`; scope: `dxs5-w0-100000-v1`.
Seed id: `1b8525ba-a1ae-4a81-9299-82e1e9a9f932`; logical position: **4,338,757**.
Subjects: **100,000**; reachable fact occurrences: **44,537,987**.
Worlds: `sha256:fec1d7cedee2b2f18c77e78210e4e9ed14fffb72e9629545155c7307e969c760`.
R2: `sha256:551bbbc479eecd15d4f5eb13698f61d20c09a900b7f83a2b10858fb2ba13b562`.
Both fingerprints, position and fact count match the unchanged independent Python population oracle (164.10 s).
Fingerprints cover canonical ordered subject worlds at this cut, with all reachable valid-time facts and logical assertion positions.
Shared facts repeat per subject; physical Datomic IDs, scope names and recorded wall clocks are excluded.

Final native basis: 27,564,753. Complete pre/post maintenance `:triplex.entity/row` datoms:
current 124,817,263, SHA256 `1350b8f7420fd7fa3ef35439a80d085b12a36bc1bce058920743541f560a7bf5`;
history 124,856,479, SHA256 `74180824252e5437d991d70e71aab9a6ef02ff02425c0f97d592c89f6bf3ea3c`.
Other native metadata attributes are outside these row digests.
Table bytes: **15,754,092,544**; database bytes: **15,760,835,087**.
Clean stopped-volume allocation: **16,830,218,240 B** (including **1,040,199,680 B** WAL), below 20 GB.
Peak sampled PostgreSQL allocation across retained-seed attempts: **22,220,980,224 B**.
Minimum sampled Mac free: **15.874 GiB**, never observed below the 15 GiB floor.
Retained-seed elapsed calendar time b1 start to clean seal: **29,192 s (8 h 6 m 32 s)**, including failed starts/gaps.
Positive-chunk command time: **10,058.816 s**, **431.339 commands/s** for 4,338,757 commands.
Final c2 hold: **1,188 s**, repeating final maintenance and completing full readback; tools volume removed after seal.

Diagnosis: b4 lines 961–995 record `OutOfMemoryError` in `/reach-many`, `Index.seek` through `entity_cache/revision`.
The 80k chunk was already indexed; fresh direct peer connect/read took 1.553 s, catch-up was zero bytes/16 ms, index-t=tail-t=22058829.
AMQ219007 startup errors precede the new broker heartbeat/listener. PostgreSQL connection limit was 100, without exhaustion.
Reduced object/parsed/session caches let 80k and 90k finish; 100k c1 still stalled, full compaction 2037M→1980M in a 2048M heap.
The read path's unbounded positive-ID memo retained millions of entries. The S5-only launch wrapper caps it at 131,072 with unchanged scope/epoch keys and native fallback.
No gateway source or commit function changed. The strict concurrent unit compares 16,384 rows across two epochs/three cuts, with zero mismatches and exact capacity accounting.
Readiness now waits for a real target-database head read; complete console, rotated JVM, Clojure and GC logs are retained on failure, with emitted byte counts checked.
The allegedly empty b5 transactor section actually contained all 13,162 bytes; the earlier display was truncated.

Resume used: `S5_RESUME=1 node lab/bin/heavy.mjs --label DX-S5-seed100000-c2 -- bash lab/experiments/EXP-DX1/s5/hold.sh 100000 10000 false`.
Do not resume this sealed volume: its checkpoint/tools volume has been removed. Use the evaluation window below to clone or explicitly declare first use.
`node lab/bin/heavy.mjs --label DX-S5-activation100000-a -- bash lab/experiments/EXP-DX1/r2/window.sh tx2-dxs5-eval-100000-a tx2-dxs5-seed-100000-pg-data dxs5-w0-100000-v1 100000 --first-use-if-needed --seed-position 4338757 --seed-fingerprint --publish --post-capture --candidates --oracle-candidates --oracle-concurrency 8 --oracle-processes 3 --batch-oracle --verification-pages 4 --live --traffic-offset-s 120 --baseline-ms 100000 --live-warmup-ms 10000`
The window measures required clone bytes against available space plus the floor. If insufficient, it declares first use before appending; all input comparisons remain pinned to position 4,338,757.
The fresh H5 clone proof at position 42,775 compared all 1,000 published states and 4,000 main/candidate oracle outputs successfully.
Evidence: `~/Claude/Projects/triplex-db-2/evidence/DX-S5/`, raw command output compressed when closed.
Seal evidence: `seed100000-c2.log`, `population100000-a.log.gz`, `seal-summary-b.log`; diagnosis: b2/b4, `readback100k-jvm-a.log.gz`; strict bound: `idmemo-unit-b.log`; pinned-input proof: `pinned-proof1000-a.log`.
Seal audit: seed.ts compares fresh complete ordered worlds/facts/head/R2 against independent population bytes and bound inputs; maintain.clj checks both complete row streams at the same basis; hold.sh requires this attempt's full verification, clean PG stop and <=20 GB.
The summary command independently checked all four fingerprint fields, unique completed c2 seal, clean PG stop, allocation and sampled disk floor; connectivity/unit outputs alone never qualify the seed.

First use was declared in `activation100000-a.log` on 2026-11-12: source 16,435,760 KiB, Mac free 21,468,804 KiB, so a clone plus the floor did not fit; clone time is unavailable (skipped).
The retained volume now contains appended activation, outbox and traffic records. Its sealed logical input at position 4,338,757 remains readable; it is no longer a pristine physical seed copy.
All 100,000 bootstrap worlds and the independent four-field fingerprint matched before the first activation append.
R1 preparation: 32.077 s evaluation, 74.639 s publication, 53,681 changed subjects/839 commits, 107.710 s including setup, without live traffic.
Live R2: 54.939 s evaluation, 114.304 s publication, 9,798 changed subjects/154 commits, 170.125 s including setup (100 s bar missed).
Read p99 before/during: 3755.279/3936.765 ms, ratio 1.048; scheduled commit p99 119480.656/249368.891 ms, ratio 2.087 (1.5 bar missed).
Matched 100 s prefix ratios: read 1.041, scheduled commit 2.087, commit service 2.394; baseline did not cover the full 169.427 s sweep window. Sequential diagnostic, no A/A calibration.
Follow lag p99: 271.768 ms over 1,216 observed commits. Main driver peak reported 9,780,568,064 B; data/index/main post-GC heap 5,179,965,440/911,191,011/1,848,022,656 B.
Main exactness completed all 100,000 worlds, outputs, records, published states and per-subject Python checks, zero mismatches; 1,358.709 s total, oracle-active wall 1,324.560 s.
Published states were read at position 4,347,443, independently observed in `activation100000-head-b.log`; all evaluation inputs stayed at sealed P.
The following three-candidate pass failed at Node's default ~2 GiB heap: `FATAL ERROR: Reached heap limit` at log line 686, worker result deserialization stack. Window exit 133, not a timer or JVM failure.
The corrected S5 driver keeps the 11 GiB cgroup cap, permits a 4 GiB V8 heap, compacts already checked reference records to exact canonical bytes, and provides a read-only candidate-only follow-up. Candidate exactness remains pending until that run completes.
Candidate-only H5 clone proof passed at 42,775: all 1,000 native worlds/four-field fingerprint and 3,000 candidate outputs/records matched, 715,038,720 B driver peak, no live traffic or publication; `candidate-proof1000-a.log`.
The follow-up also checks that its final observed logical head equals its initial observed head; it reports zero live readers when traffic is disabled.
