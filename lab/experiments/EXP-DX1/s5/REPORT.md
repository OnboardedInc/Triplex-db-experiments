DX-S5 — Replica exception: a subject-scoped immutable snapshot fixes whole-overlay copying per live read; regression and all 100000 worlds checked. T4/T5 remain MISSED; the full run did not complete.
Measured H source e4759d64; current memory mitigation b12ba41e has unit/type checks only, no new 100k measurement. Gateway commit semantics and packages/core are unchanged.
Sealed volume tx2-dxs5-seed-100000-pg-data, scope dxs5-w0-100000-v1, immutable input P=4338757. This is declared reuse of an appended volume, not a pristine physical clone; seed identity/fingerprints and build history are in SEED.md.

| Target | Observation | Status |
| --- | --- | --- |
| T1 | Prior 1000/10000 chunk, maintenance and kill/resume fingerprints equal their sealed references | Historical, not rerun here |
| T2 | Original seal 16.830 GB; 29192 s elapsed, 431.339 commands/s positive-command time. Current appended volume 17.924 GB; H minimum sampled Mac free 18.330 GiB | Original seal/floor met |
| T3 | H bootstrap 446.136 s, 6250 pages, 4635599992 packed input B, 932391011 shared-index B | Reported; verification/catch-up additional |
| T4 | H evaluation 49.447 s, setup-inclusive pass 50.388 s + publication 84.153 s = 134.541 s; 9798 changed / 307 commits | MISS 100 s |
| T5 | Full-window read p99 926.814→1830.415 ms (1.975×); scheduled commit 152389.243→242498.461 ms (1.591×); service 132.333→310.526 ms (2.347×) | Both ratio bars MISS |
| T6 | Main phase cgroup peak 11648790528 B (10.849 GiB); current packed data/index/main post-GC heap 6149071920/932391011/1946522416 B | Main observed below 11 GiB; later whole-run peak unconfirmed |
| T7 | Fresh 100000 native/full/scoped worlds, outputs, records, stored states and per-subject Python checks equal; exactness 701.413 s, oracle-active wall 682.989 s | Main exact, no sampling; candidates/matrix incomplete |

Publication observations without traffic, all 53681 changed: prior 64/frame serial 74.639 s (720/s); F 256/8 30.959 s (1734/s); G 256/8 31.148 s; H 256/32 35.926 s (1494/s). The 30 s publication target was not met. F/G were aborted before complete post-publication exactness.
F receipt-bound profile: 210 frames averaged 511 app operations →1282 native row datoms/1806 total datoms; about 1.6 MB HTTP per 256-subject frame. Mean command lookup/build/serialization/gateway parse were 36.4/43.8/9.8/25.9 ms; gateway 889 ms included native queueing at eight in flight. These overlap, and are not a decomposition of the old serial 89 ms.
H R2: 307/307 profiles receipt-bound; mean lookup 30.4 ms, build including lookup 32.1 ms, yield 78.5 ms despite a 50 ms limit, SDK commit 149.9 ms, gateway 94.8 ms. Yield consumed 24.112 s; copy state reads 1.061 s. The old 89 ms path was not separately CPU/I/O profiled; cache-hit rates were not measured.
Mechanism: pack sparse changed subjects across input pages; reuse feed-maintained outbox rows; bound overlapping real atomic commits and preserve SDK client order. TripleLive guards, journal contents, retries and durability retain their semantics.
F caches TX/PG/peer=1 GiB/512 MiB/256 MiB; G/H=1.25 GiB/768 MiB/384 MiB. Four engine CPUs, 12 GiB containers; writer gets CPUs 1,2. Larger caches showed no publication benefit in this non-isolated comparison.
Local reads use Replica.snapshotSubject at the current applied position and fixed configured valid time, with 256 outstanding readers. They are not the gateway arm's moving-valid-time reads. The frozen writer still uses the gateway; every due offer is drained, including after stop.
Matched 100 s prefix ratios were read 1.895×, scheduled commit 1.591×, service 2.347×; the 133.980 s sweep exceeds the baseline's coverage. Baseline already queues burst writes for minutes. Sequential evolving-store diagnostics, no clone/A-A calibration or acceptance promotion.

| Pacing proof, N=1000 only | Evaluation + publication | Read p99 ratio | Scheduled commit ratio |
| --- | --- | --- | --- |
| Local pullAt, 32/frame, 1 flight, yield≤50 ms | 1.700 s | 1.509 | 1.515 |
| Local pullAt, 16/frame, 1 flight, yield≤100 ms | 2.376 s | 1.161 | 1.404 |
| Gateway, 32/frame, 1 flight, yield≤50 ms | 2.034 s | 0.797 | 1.262 |
Each 1000-subject case compared every output/record/native state, plus 3000 independent candidate results. These small-scale results do not qualify 100k; the new 100k gateway and second pacing arms were never reached.
Historical 100k gateway arm (db2a7a68): 170.125 s, read ratio 1.048×, scheduled commit 2.087×. It is not a same-code comparison with H.

Default gateway memo is bounded per scope/connection generation: 131072 entries and a 32 MiB conservative entry estimate, with native fallback. Estimated bytes are not measured heap. H completed every native world read using triplex.gateway.main, Xmx2g, without the S5 wrapper.
Native memo test: 16384 native row comparisons, fresh UUID databases, three cuts/two epochs/concurrent eviction and byte-budget cases; gateway selftest 14 tests/53715 assertions. Physical IDs resolve at the request's current DB; row/revision reads retain the exact historical DB.
F CPU profile: snapshot construction/base lookups 58.96%, GC 21.82%; the removed byte-counter shortcut left G at 31.35% snapshot and 33.77% GC. Scoped snapshots capture only reachable immutable packed entities, including empty references; H compared all 100000 against full/native worlds.
H exited 137 after main exactness, during transition to candidates. Its final Docker OOM flag/peak was discarded, so the cause is unconfirmed. No complete new 300000-candidate result; the previous 300000 Python comparisons remain historical (SEED.md).
Current mitigation consumes reference object graphs in chunks instead of retaining both whole representations, preserving every canonical byte/order. 3073-reference regression passed; 100k memory improvement remains unverified.
H shell disk polls split a large equality JSON record. full-h-parse-a removes only recognizable poll records to recover the complete object; original raw bytes remain. New S5 windows capture closed driver output separately, preserve State.OOMKilled, and emit the numeric state cut directly.
Fresh read-only head check: 4364832 at native basis 27888318, three beyond the largest saved ACK 4364829; database 17443673779 B, clean-stopped allocation 17923854336 B. H's numeric publication-state cut was not preserved in its failed final report.
Next: isolate local reader decoding from the publication/event-loop thread using a compact shared base, then test two in-flight small publication frames with native-writer priority. Confirm the 137 cause before another full candidate/matrix hold; all bars remain open.

Measured command: `S5_END_EPOCH=1794471000 bash lab/experiments/EXP-DX1/s5/activation.sh h` at e4759d64 (then-default full matrix, R1 window 32).
Next main-only command with fresh ID: `bash lab/experiments/EXP-DX1/s5/activation.sh next-main-1`. Defaults now use best-observed R1 window 8; S5_PUBLISH_SIZE/INFLIGHT/YIELD_MS override pacing. `S5_MATRIX=1` opts into the still-unverified full matrix.
Read-only head command: `S5_END_EPOCH=1794471120 node lab/bin/heavy.mjs --label DX-S5-head-final-a -- bash lab/experiments/EXP-DX1/r2/window.sh tx2-dxs5-head-final-a tx2-dxs5-seed-100000-pg-data dxs5-w0-100000-v1 100000 --head-only`.
Checks: Datomic + publication suites 180 passed/51 integration cases skipped; package build, S5 TypeScript, lint/format, shell syntax; later compaction 8 focused tests and logging UTF-8 success/failure tests passed. Root check not run. Offline pack:check failed on unrelated CLI missing dist/index.js before consumer installation; no downloads.

Content/freshness/binding audit of every qualification-producing path:
`seed.ts`/`hold.sh`/`maintain.clj`: prior proofs require fresh checkpoint/ACK contents, complete native row bytes and world fingerprints at exact bases, bound seed ID/scope/N/volume; not re-promoted from historical exits.
`reach.clj`/`id_memo_test.clj`/gateway selftest: native row contents, fresh UUID DBs/cuts, exact scope/epoch keys and capacity accounting; current physical-ID resolution never moves the row basis.
`Replica.snapshotSubject` regression: actual closure bytes and byte counts, fresh fixture cuts, empty references, 2000 unrelated entities and held-snapshot isolation; H additionally checked every subject against full/native worlds at P.
`w0-outbox.ts`/`publishChanged`: native ACKs and unchanged TripleLive guards bind state to namespace/old row IDs; profiling binds receipt IDs to operation IDs. All 517 H publication frames had strictly increasing native positions per send sequence; an ACK alone is not semantic PASS.
`w0-replica-driver.ts`: every actual ordered world/output/record and native state compared, independent Python and changed counts, this attempt's exact source/state cuts; namespace absence and no-replay checks. Trials require complete N and 3N independent references before all-N stored-state comparison. Pending measurements and exit 137 are not whole-run PASS.
`w0-replica-live.ts`: unchanged frozen generator, exact offer-time boundary and full ACK drain; sample bytes/window/digest binding. Ratios remain diagnostics. New reference compaction checks byte/order equality and releases consumed graphs; it does not itself qualify outputs.
`window.sh`/logging regression/parser/readiness: closed current-attempt logs and exact large UTF-8 bytes, fresh UUID fixtures and actual cleanup source; guarded scope/owned slot/native target head. Read-only head observations qualify connectivity/head only, not the sealed world.

Evidence: /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S5/ — 446685807 B of compressed raw command output, under 1 GB; no source captures, hash manifests or separate audit documents.
Key new runs: publication1000-g.log.gz; publication100000-f/g/h.log.gz; full-f/g-cpu-a.log.gz; full-h-parse-a.log.gz; head-final-a.log.gz. Unit/check/failure files and final inventory are alongside them; first failures retained.
Inventory: no DX-S5 containers, networks or runtime directories remain; only tx2-dxs5-seed-100000-pg-data retained. H5/H8 originals untouched. No changed owned path found in acceptance pins; contract unchanged; no merge/push.
Open: T4/T5 and the 30 s no-traffic publish target miss; no new full-scale gateway/pacing matrix or candidate completion; final candidate peak/cause and the compaction mitigation need fresh 100k evidence.
