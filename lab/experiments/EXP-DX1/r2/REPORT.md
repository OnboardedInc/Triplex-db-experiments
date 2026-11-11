DX-R2 — implementation complete; 1k/package/corpus gates PASS; fresh 10k blocked by admission. No promotion.
North star: P3 ordered following and P5 release activation; lab/SCOPE.md, NORTH-STAR.md and TARGETS.md govern.
Implementation head b2bcd0a9; recorded-scale diagnostic cfced14c; report committed last.

A — Implemented: opt-in complete changed rows/revisions at each journal cut; no per-journal need RPC.
Reconstructed-protocol replay: both 1,000-world cuts equal, 2,000 inline journals, zero extra page calls.
Fresh 1k: 2,000 commands, all 1,000 worlds equal, zero extra page reads, serial ACK-to-applied p99 10.101 ms.
256-reader/55-commit/s-burst p50/p99: NOT MEASURED; 250 ms target unverified (A not qualified).
B — Implemented: immutable slab slices, shared binary base index, copied update overlay, no per-pass row image.
Workers use the retained buffers; byte counters avoid an unreported full-index scan.
Fresh 10k setup/compute/peak: NOT RUN; 0.5 s / 6 GB targets unverified (B not qualified).
C — Implemented: optional lossless gzip row pages from cached fragments, four pinned 64-root requests in flight.
Fresh 10k bootstrap: NOT RUN; 30 s target unverified (C not qualified).
D — Implemented: lean-layout/feed-version/regular-position capability check and Replica.UnsupportedScope error.
Corpus checks supported lean prefixes, declines legacy up front and counts later unsupported imports separately.
D gate met: all 300 gateway scenarios / 95,028 comparisons; 272 fully supported lean cases, 28 imported-position cases declined.
All 125,200 eligible replica worlds match; legacy replicas decline up front (300 scopes), with 9,800 exact rebuilds for SPI gaps.

Journal form as built:
1. Replica.source(client, db, head, validAt) opts in; the old factory and old feed form remain compatible.
2. Requests carry replicaRows:true and explicit validAt; inline pages are bounded to 16 journals.
3. Entries are [transactionId, position, originalJournalRows, replacement].
4. Replacement position/t identifies the exact immutable cut; unsupported interior cuts decline.
5. Changed entities carry complete current inline columns plus canonical revisions, including empty revision zero.
6. Newly asserted reference targets carry their complete reference closures at that same cut.
7. Existing reference links reuse prior local buffers; changed targets must be covered by the changed set.
8. Incremental payloads validate roots, row/domain/position binding, revisions and complete known-reference coverage.
9. All replacements apply before advancing each watermark; uncertainty invalidates and requires a rebuild.
10. Bootstrap first checks capability, then requests full compressed pages at one fixed position and valid time.

Completed checks: Datomic/dependency builds; targeted bench TypeScript; 29 focused tests; focused lint.
Historical-input checks: all worlds, outputs, records and Python outputs equal at both 1,000 and 10,000 subjects.
These are fresh executions over historical inputs, not fresh database execution or performance qualification.
The new inline replay reconstructs its payloads from original journal and exact-position row recordings.
Package check stops at an unbuilt CLI tarball artifact before consumer install; private Datomic is excluded.
Fresh package gates pass: feed_test 13 tests / 85 assertions; selftest 14 / 53,715; journal-fast 9 tests.
Fresh 1k: all outputs/records and 1,000 published states equal; Python checks all subjects after publication ACK.
1k bootstrap 3.565 s; setup 0.477 s; compute 0.255 s; full pass 0.732 s; driver cgroup peak 812,572,672 B.
Historical 10k geometry: shared slabs 467,664,896 B; index 95,095,158 B; initial JS heap 28,699,344 B.
100k input projection: 10 × (slabs + index) + fixed heap = 5,656,299,884 B; excludes workload/output memory.
Historical diagnostic peak RSS 1,536,212,992 B; scaling the whole peak ×10 is 15,362,129,920 B, above 6 GB.
No fresh 100k run; bootstrap/evaluation wall and loaded lag cannot be qualified from historical replay.

PASS audit: no acceptance files, scorecard or promotion receipts are changed.
Replica.acceptPage/applyFeed checks content, cut and coverage before advance; inlineSource checks journal identity/change coverage.
inline.test.ts checks actual content and snapshot cuts; replay-inline.ts checks every recorded world and exact 2k/zero-read counts.
w0-replica-driver.ts retains fresh world/output/record/oracle/publication checks; corpus-adapter.ts compares every eligible world.
offline-scale.ts binds each recorded page to roots/cut and checks every world/output/record/oracle result; emits HISTORICAL only.
Window completion requires successful commands; each run prints its clean source head and owns its lock/container prefix.
No edited path was found pinned in lab/acceptance; the contract remains unchanged.

Evidence: /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R2/ — raw command logs, compressed when closed.
First failures retained: pnpm flag, early TS checks, host Bash array, missing feed fixture path; canceled queued attempts remain.
An empty abandoned lock was removed only after its prior failure/empty directory were proved; no foreign containers were touched.
Finished failed-window inventories show zero owned containers, volumes and networks; both sealed seeds remain untouched.
Completed fresh run: window-1000-f.log.gz; all owned containers/volumes/networks removed, exit zero.
10k waiter ran 05:03:57–06:00 UTC behind other owners; canceled at cutoff, exit 124, no admission/containers.
Evidence: recorded-10000.log.gz is historical-only; final-cleanup.log.gz inventories zero owned resources.

Commands used: node lab/bin/heavy.mjs --label DX-R2-* -- <command> for every heavy run.
Build: pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store exec turbo run build --filter=@triplex-build/triplex-datomic.
Checks: pnpm with that store config exec tsc/vitest/oxlint; r2/tsconfig.json and r2/inline.test.ts.
Replay: node --expose-gc --experimental-strip-types lab/experiments/EXP-DX1/r2/replay-inline.ts <DX-R1/tx2-dxr1-1000-d/pages>.
Recorded 10k: node --expose-gc --experimental-strip-types lab/experiments/EXP-DX1/r2/offline-scale.ts <DX-R1/tx2-dxr1-10000-a/pages> 10000.
1k: bash lab/experiments/EXP-DX1/r2/window.sh tx2-dxr2-1000-f tx2-dxh5-seed-1000-pg-data dxh5-w0-1000-v1 1000 --gateway-tests --follow-commands 2000 --publish --post-capture --candidates --seed-fingerprint --journal-counts --corpus-after.
10k retry: same window.sh tx2-dxr2-10000-a tx2-dxh8-seed-10000-pg-data dxh8-w0-10000-v1 10000 --live --publish --post-capture --seed-fingerprint --traffic-offset-s 120 --baseline-ms 12000 --live-warmup-ms 10000.
Still required: fresh 10k worlds/output/records/published states + per-subject oracle, loaded lag, bootstrap, setup/compute, peak, fresh-based 100k model.
