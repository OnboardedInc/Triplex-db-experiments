DX-R1 — working replica and evaluator; qualification partial; fresh 1k and 10k equality checks complete, live follow-lag target missed.

Design as built:

1. A Map holds entity IDs and current revisions; each entity has immutable packed SharedArrayBuffer bytes.
2. A UTF-8 string dictionary precedes 48-byte rows (dictionary indexes, position, valid interval and numeric value).
3. JSON/-0/blob metadata round-trip; the store holds current assertions, not historical rows or cached answers.
4. Bootstrap reads complete 64-root row pages and their reference closures at explicit B0; callers provide all subject roots.
5. The indexed feed provides ordered logical positions, changed entities and logical assertion/retraction descriptions.
6. It does not supply complete current rows plus their physical revision; each journal therefore uses exact-position `need` reads.
7. New reference targets are fetched recursively; a complete changed set replaces old buffers before the watermark advances.
8. Gaps, regressions, declines and malformed coverage invalidate reads; the follower rebuilds from its configured roots.
9. `world` walks references at the replica's fixed valid time; historical reads remain on the gateway.
10. `caughtUpTo` waits for progress; invalidation rejects pending waits rather than serving an uncertain world.
11. Snapshots copy the entity index and retain immutable buffers; later updates replace buffers, preserving the captured cut.
12. Future snapshot requests register before in-flight batches advance; capture and following share a serial section.
13. Each pass coalesces bytes once into one SAB shared by three evaluation workers; entity indexes are copied per worker.
14. A worker builds each subject world once, then runs unchanged W0 for every requested candidate; exact coverage is checked.
15. Preview omits publication; activation compares stored outbox item state and packs only changes into atomic 64-subject frames.

- R1 — 1k: bootstrap 6.638 s; packed 46,211.688 B/subject; post-GC heap delta 35,725.136 B/subject.
  Packed plus observed heap delta is 81,936.824 B/subject, above an 80,000-byte combined-footprint interpretation; packed bytes alone meet it.
- R1 — 10k: bootstrap 71.841 s; packed 46,673.589 B/subject; heap delta 30,556.005 B/subject (sum 77,229.594 B).
  Packed/heap figures are not total RSS. Generator lifetime peaks: 1k 1,853,444,096 B; 10k 5,515,689,984 B.
- R2 — 2,000 serial live commands: ACK→applied p99 17.620 ms, following CPU 3.569 main-thread seconds (1.785 ms/command).
- R2 — 10k live arm: 10 writer ACKs, ACK→applied p99 1,452.559 ms: MISSED 250 ms. The 1k measured arm had no writer samples.
- R3 — 1k: compute 0.442357 s (2,260.62/s); freeze+setup+compute 1.173100 s (852.44/s), 0.848 worker CPU s; publication adds 0.487355 s.
  The compute rate exceeds 1,000/s, but the complete non-publication pass misses it; read p99 ratio 0.725; writer ratio unverified (0 samples).
- R4 — 10k: compute 4.091103 s (2,444.33/s); freeze+setup+compute 9.271137 s (1,078.62/s), within 10 s; 8.166 worker CPU s.
  Read p99 ratio 0.999; scheduled-writer ratio 1.034 (10 samples/arm); service-writer ratio 2.130. Peak 5,515,689,984 B = 5.14 GiB < 6 GiB.
- R5 — 1k: R2 plus OT=2700 minutes and PAYCHG=700 cents: compute 0.574933 s (1.300x); complete pass 1.354780 s (1.155x).
- R5 — 10k: compute 5.397613 s (1.319x); complete pass 10.868075 s (1.172x). Both sizes meet 1.5x.
  Both passes used 64 readers and the fixed writer trace; 1k measured intervals had zero writer offers; the 10k candidate arm had eight.
- R6 — 1k after the 2k trace, R2 after R1: 149 changed subjects, 3 commits (64/64/21), 0.487355 s, 305.73 changed subjects/s.
- R6 — 10k: 997 changed subjects, 16 commits (15×64+37), 3.528418 s, 282.56 changed subjects/s.
- R7 — Linear 10k→100k arithmetic on the same four generator CPUs (three workers): bootstrap 718.4 s; evaluation pass 92.71 s, compute 40.91 s/81.66 CPU s.
  Packed inputs 4.667 GB + observed heap delta 3.056 GB = 7.723 GB, plus a 4.667 GB shared pass image and worker indexes.
  Naively scaling the whole verification-run peak gives 55.16 GB; neither that projection nor the 100k execution/latency is qualified.
  Linear publication adds 35.28 s; current serial evaluation+publication would be 128.0 s, without a claim of 100k activation acceptance.

Equality: fresh 1k bootstrap at 42,775 and after 2,000 commands at 44,775: all 1,000 canonical worlds equal gateway pulls.
The follow trace replaces scalars/shared location data, retracts assertions, and adds/removes references; every ACK also has a content witness.
Fresh 1k at B1=44,786: every worker world, R2 output and complete record equals fresh gateway/serial W0 and independent Python.
All 1,000 complete published states equal independent Python R1→R2 state folds after the last publication ACK.
G3: ten positive retroactive mutations change independent latest answers; ten negative input witnesses stay unchanged; neither leaks into B1.
G5 adaptation: Python determines changed items/deliveries, including retirement without delivery; no-op subjects retain their old checkpoint.
G9: all stored journals fold to position 44,895, assertions 447,604 and retirements 2,951, equal fresh full-history counts.
10k: all 10,000 bootstrap worlds/fingerprints, frozen worlds, outputs, records and published states also match; 100 positive/100 negative witnesses.
These exercise H6 G0/G1/G2/G3/G5/G7/G9 meanings at 1k and G0/G1/G2/G3/G5/G7 at 10k; the 10k full-history G9 fold was not rerun.
No acceptance or independent-review promotion is claimed; the sequential latency arms are diagnostic, without clone/A-A calibration.
Workers are ready before live warmups; reported pass wall includes freeze/startup, while latency windows cover compute/publication, not startup.
Raw C recording replay separately compares all 1,000 worlds at both cuts through the production journal decoder and 2,000 exact need reads.
Corpus: 0/300 complete; scenario 0, legacy position 3 declines `irregular` after the explicit-position import; 200 worlds matched across four transaction completions, then fail-closed.
Gateway owner request: serve exact current-head row pages for irregular/imported positions so rebuild can complete; the full corpus remains blocked.

Limits: startup/sharing/index transfer costs 0.708 s at 1k and 4.613 s at 10k, exceeding compute in each case; world decoding/kernel remain local CPU work.
The packed image is shared without per-worker byte copies, but each pass creates one extra complete packed image and per-worker indexes.
Gateway request: full current changed rows/revisions in journals would remove 2,000 need RPCs; their 5,782,007 response bytes move into the feed, not necessarily disappear.
The same feed itself carried 6,592,868 response bytes; no measured wall saving is attributed to the proposed protocol change.
Bootstrap received 97,654,944 raw bytes versus 46,211,688 packed bytes; a suitable compact page could cut payload about 52.7%, before protocol overhead.

Validation: SDK/dependency builds, targeted package/bench TypeScript, 15 focused tests, and owned TypeScript formatting/lint pass.
Root check (`root-check-1.log.gz`) stops at formatting (bounded report layout + existing deeply nested C132 fixture overflow); later root stages did not run. Pack check excludes private Datomic; 100k was not executed.
Failures retained: B failed at an invalid nested read-only mount; C passed bootstrap/follow but failed G9 against an obsolete pre-candidate cut.
C's gateway startup race was recorded and retried inside its lock; D adds bounded automatic startup retry and the corrected final count cut.
Earlier failures remain raw. Corpus A had a harness ordering error; B bootstraps before writes and exposes the gateway decline. No failed attempt substitutes for D or the 10k run.
Evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R1/`; `window-1000-d.log.gz` is the complete fresh 1k run.
`tx2-dxr1-1000-{c,d}/pages/` hold raw requests/gzipped responses; `replay-c-1.log.gz` holds the offline replay result.
`window-10000-a.log.gz` is the complete fresh 10k run; its sealed H8 seed was cloned read-only and never modified.
`local-2.log.gz` is historical H6 replay only; `window-1000-{a,b,c}.log.gz` retain abandoned/failed attempts.

Commands (all heavy execution admitted by `node lab/bin/heavy.mjs --label DX-R1-* -- ...`):

- `pnpm install --offline --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`; `bash lab/experiments/EXP-DX1/r1/local.sh`.
- `pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store exec tsc --noEmit -p lab/experiments/EXP-DX1/r1/tsconfig.json`.
- `node --experimental-strip-types lab/experiments/EXP-DX1/r1/replay.ts <evidence>/tx2-dxr1-1000-c/pages`.
- `bash lab/experiments/EXP-DX1/r1/window.sh tx2-dxr1-1000-d tx2-dxh5-seed-1000-pg-data dxh5-w0-1000-v1 1000 --follow-commands 2000 --live --publish --post-capture --candidates --seed-fingerprint --journal-counts`.
- 10k: same window command with `tx2-dxr1-10000-a tx2-dxh8-seed-10000-pg-data dxh8-w0-10000-v1 10000 --live --publish --post-capture --candidates --seed-fingerprint`.
- Corpus: `bash lab/experiments/EXP-DX1/r1/window.sh tx2-dxr1-corpus-b tx2-dxh5-seed-1000-pg-data dxh5-w0-1000-v1 1000 --corpus`; `window-corpus-b.log.gz` is the failed gate.
- Final `final-{containers,volumes,networks}.log.gz` inventories are empty; both sealed seeds remain. All owned containers/volumes were removed.
