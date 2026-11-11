Second-part diagnosis in progress on retained seed id 1b8525ba-a1ae-4a81-9299-82e1e9a9f932; prior report below is historical.
DX-S5 — INCOMPLETE: no sealed 100k seed and no 100k activation. Builder diagnostic; no acceptance promotion.
Failed seed began df3838d8; log phase f768b4e8; proof/placement ab5329b9. Recovery correction 450c1442; missing-seed guard 199ac5a9.
T1 PASS on corrected procedure: 1k in two 500-subject chunks with injected AMQ219007/reconnect; 10k in two 5000-subject chunks with a deliberately killed driver/controller and a new resumed hold.
The corrected resume recovered 896 stored suffix commands (215346→216242), ended at 434768, and matched 12566422 current/12570330 history rows; holds were ~923 s interrupted / 1008 s resumed, each <25 min. Corrected 1k hold: 642 s.
1k worlds = sha256:ca15387e66e25ed5e19a4adc602e941f7f06dd8b0f1c6ca7d1a5d2f02f8171ad (444368 fact occurrences).
10k worlds = sha256:7b4c292331396ab379423ed7faa1a095c324dcdb72afb411d0f48f93efa5624d (4488231 fact occurrences).
Fingerprint scope: canonical ordered subject worlds, each with all reachable valid-time facts and logical assertion positions; shared facts repeat per subject.
It excludes physical Datomic IDs, database scope names and recorded wall clocks; native current/history digests separately include physical row identity/content.
T2 FAIL: 70k commits/P=3041238; ~9958 s hold wall, 5299.869 s command time (573.833/s). Peak sampled PG allocation 16.196 GB; minimum sampled Mac free 25.860 GiB. No 100k seal.
T3 NOT RUN at 100k: local-copy bootstrap.
T4 NOT RUN at 100k: one-release evaluation plus changed-output publication; three candidates in one pass.
T5 NOT RUN at 100k: matched frozen-trace read/commit p99 ratios under 256 readers.
T6 NOT RUN at 100k: driver peak and retained data/index/main-heap geometry (11 GiB cap).
T7 NOT RUN at 100k: every world, output, record, published state and per-subject Python oracle; no sampling.
Corrected 1k diagnostic: bootstrap 3.273 s; R2 pass+publication 6.090 s; all 1000 main and 3000 candidate oracle checks equal; driver peak 2170171392 B.
Its retained data/index/main heap were 195035136/9849130/63632784 B; read/commit p99 ratios 2.065/0.797 (read miss). Seeding CPU layout; no 100k projection.

Seeding procedure, twelve lines:
1. Use the local images, private Docker socket and offline frozen pnpm store; build the existing public imports first.
2. Run `node lab/bin/heavy.mjs --label DX-S5-seed100000-a -- bash lab/experiments/EXP-DX1/s5/hold.sh 100000 10000 false`.
3. Acquire the measurement lock; require long-hold-ok, at least 15 GiB Mac/5 GiB VM free, and enforce the bounded hold/watchdogs.
4. Create the owned PostgreSQL volume with the unchanged logical KVS hash-partitioned sixteen ways; require fsync/synchronous_commit/full_page_writes=on.
5. Submit real commits with window 32, strict client send sequence, scalar dependencies and exact expected ACK positions.
6. Save the complete-chunk checkpoint; recover every committed suffix journal with exact command/assertion/retraction/validity checks.
7. Park only the owned read peer during writes; seed writer uses cores 4–5 and JS uses 6–7; bounded WARN logs rotate at 16 MB/64 MB retained.
8. Request/sync index, collect unreachable storage and wait for stable observed KVS row/value counts; reserve the largest leaf plus disk floors; stop owned JVMs.
9. VACUUM FULL/CHECKPOINT; restart writer/transactor and reconnect; compare every current/history row before/after at the same basis, with two complete hash streams.
10. Restart/health-check the reader; fingerprint every prefix subject at its exact cut; seal only after clean PG stop and volume <=20,000,000,000 B.
11. Driver interruption resumes automatically; whole-hold resume: `S5_RESUME=1 node lab/bin/heavy.mjs --label DX-S5-resume -- bash lab/experiments/EXP-DX1/s5/hold.sh 100000 10000 false`.
12. Clone/evaluate: `bash lab/experiments/EXP-DX1/r2/window.sh tx2-dxs5-eval-100000-a tx2-dxs5-seed-100000-pg-data dxs5-w0-100000-v1 100000 --first-use-if-needed --seed-fingerprint --publish --post-capture --candidates --oracle-candidates --oracle-concurrency 8 --batch-oracle --verification-pages 4 --live --traffic-offset-s 120 --baseline-ms 100000 --live-warmup-ms 10000`.
A corrected failed hold retains its owned unsealed data/checkpoint pair for resume, with containers removed; S5_DISCARD_ON_FAILURE=1 opts out. Finish-time cleanup removes unsealed fixtures. First-use fallback applies only to the new 100k seed.

Seeding limits: commits, engine indexing stalls and repeated full-prefix checks; busy writer/transactor CPUs were observed, without a frame-level CPU profile.
At 40k, owned JVM INFO logs had grown to ~3.8 GB outside PG; stopped JVM logs were retained compressed and byte-compared before reclamation.
The controller paused for that logging-only restart; GW exits were 137, TX 143; the restarted head remained exactly 1739437. PG durability was unchanged.
Later source window added parallel complete native hashes and read-peer parking; the native memory unit checks identical serial/parallel bytes (1000 current/1002 historical).
The real SQL 50k pre/post maintenance digests matched all 62596454 current/62616210 historical rows; fresh post-scan took 42.953 s.
At 70k the post-vacuum peer could not connect to the transactor (AMQ219007). Old cleanup deleted the partial seed; its missing JVM diagnostics leave the original cause unproven.
Next: rerun the long seed with corrected stop/reconnect/retention and retained failure diagnostics; reproduce the original failure at scale if it recurs. Evaluation bottlenecks remain unmeasured; a fresh 100k build/evaluation cannot fit the remaining ten-hour budget.

PASS audit — content, freshness and binding:
`w0-seed.ts` checks actual ACK positions; `seed.ts` binds checkpoint format/scope/N/mapper/releases, validates every fresh suffix byte, and only marks verified subjects after full readback at the unchanged head.
`maintain.clj` compares complete current/history content at one native basis through fresh pre/post peers; its serial/parallel memory parity is only a unit gate.
`verify-log-archive.py` compares every retained/original byte, requires this hold's archive and stopped unchanged container ID, and reads back zeroed files/new configuration bytes.
`w0-replica-driver.ts` retains every frozen-world/output/record/state/count comparison against native reads and unchanged O-DOMAIN; candidate oracle checks all 3N; timing-only output says pending.
`hold.sh` binds resume ownership/input labels/pair identity; unsealed retention is not PASS. Sealing requires fresh full verification, clean PG stop, bytes and cleanup checks; `window.sh` refuses missing seeds and requires full driver success. Interruption binds the native PID/start/command and exact owned driver.
Range/parallel tests compare actual fresh fixture worlds/oracle bytes, preserve order/bounds, and reject failures; no historical receipt becomes a fresh PASS.
No lab/acceptance file or pinned owned path changed; no package, gateway, core, merge, push, publish or deployment change.

Checks: targeted S5/R2 TypeScript; four focused Node tests; native parallel parity; focused formatting and lint (zero warnings/errors); shell syntax.
Root check/pack not run (bench-only changes). Every expensive run uses `node lab/bin/heavy.mjs --label DX-S5-* -- <command>`.
Final proofs: `S5_TEST_BROKER_DOWN=1 ... hold.sh 1000 500 false true`; `... hold.sh 10000 5000 false`; `python3 .../s5/interrupt-for-proof.py <proof10000-c.log>`; `S5_RESUME=1 ... hold.sh 10000 5000 false`, all engine holds through heavy.mjs.
Evidence: /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S5/ — raw command output only, compressed when closed; no hash manifests/source captures.
Final T1: proof1000-h.log.gz, proof10000-c.log.gz, proof10000-c-interrupt.log.gz, proof10000-d-resume.log.gz. Failed long run: seed100000-a.log.gz. Retained engine logs: seed-{tx,gww,gwr}-info-a.tar.gz.
First failures retained: import/store/mount setup, canceled queued holds, 10k-a timeout before final maintenance, log PID sandbox check, head-helper mount, occupied unit helper name.
Final inventories: zero DX-S5 containers, volumes and networks; no runtime directories remain. Original H5/H8 volumes were never mounted writable or modified. Evidence totals <1 GB compressed.

Second-part audit: readiness.clj compares a fresh d/connect+d/sync database head with the explicit expected head and emits URI/basis; diagnose.sh binds the held slot and exact retained volume-pair identity. This is connectivity evidence, not seed qualification.
Readiness audit: wait-ready.mjs requires a fresh HTTP 200 with encoded long head >= this attempt checkpoint, target database path and owned network; seed.ts still checks exact head and every world before qualification. No readiness output seals a seed.
Oracle pool audit: each call uses an isolated unchanged DomainOracle child and its FIFO response queue; 24 distinct frozen requests matched original serial bytes. All full-scale comparisons still check every subject/candidate and their frozen cuts; seed-position rejects a consumed first-use head.
The final 100k seed.ts world-hash gate compares the fresh ordered readback against the unchanged Python population oracle (population100000-a, 164.1 s), rather than a candidate observation; checkpoints still bind the unchanged seed mapper/releases.
Explicit --seed-position also retains the fresh immutable bootstrap snapshot for R1/R2/candidate inputs and all native/oracle input comparisons; activation/outbox positions remain separately reported. Defaults are unchanged.
