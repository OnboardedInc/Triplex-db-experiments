# R26: seed once, clone faithfully (XTDB 2.2.0 and QLever 0.6.0 slots in the triplex2 colima VM)

**Written:** 2026-11-07 by research agent R26 (Sonnet xhigh). **Moves:** measurement speed for all five priorities (`lab/NORTH-STAR.md`). Every A0, NS and PAIR-0 run on XTDB seeds its slot through the commit path, and EXP-N01's A0 receipt shows what that costs: 384,785 assertions in 2,281.6 s (38.0 min, 168.6 facts/s, 1,031 commands, commit p50 1.9 s) on `s1` at the 10k rung (`lab/runs/NS/NS-xtdb-20261108T001701Z-6f67e0.json`, `/ns/seed`). EXP-M01 measured about 120 facts/s on a loaded host, so the seed takes 38 to 53 minutes. Goals, scope and bars come only from `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.

## How to read this report

- **Evidence labels.**
  - `[S]` pinned source, cited `path:line`. XTDB is `references/xtdb` (v2.2.0, sha c6c1962). QLever is `references/qlever` (v0.6.0, sha 6c5861a). Lab files are cited from the repo root.
  - `[D]` XTDB docs copied under `references/xtdb/docs/src/content/docs/`, cited `file:line`.
  - `[W]` web primary document, with URL. All were fetched on 2026-11-07, unauthenticated, with no personal details in any request.
  - `[P]` an earlier lab report or receipt (a measurement someone else made).
  - `[E]` my inference or arithmetic, with the inputs shown.
- **Confidence.** High means source, docs or a receipt say it. Medium means one source or a different workload. Low means inferred.
- **What I did not do.** I started no container, ran no engine, ran nothing in the VM and edited nothing in the repository. Every behavior claim is from source, docs, upstream-style reasoning or earlier lab measurements. The procedure in section 6 is text only, and section 6.9 turns each unproven step into a test with a prediction.
- **Style review.** I spawned no subagents (the brief forbids it), so the background review that `sam-writing-style` asks for did not run. I checked the file by grep for em-dashes and banned words only.
- **Untouched.** `/Users/sam/projects/triplex-db` and ports 15442 and 17019 were not touched.

---

## 0. Answer

**A stopped engine's storage can be copied into a new slot, and the copy is a faithful clone, provided five conditions hold.** The conditions are a clean stop, one moment for both the log and the storage, a settled engine, the same image and config, and the driver's seed manifest saved next to the volume. Source shows no persistent node identity in either engine, so two copies can run side by side. The saving is about 35 minutes per single-arm run and about 70 minutes per PAIR-0 duet, at the price of 3 to 4 GiB of disk per volume.

**Procedure in brief (commands in section 6):**

1. Seed once on an exclusive slot through the real commit path, then call `POST /system/finish-block`, wait until the compactor is idle, record the layout fingerprint, and stop the container with a long grace period.
2. Copy the slot volume into a golden volume with a helper container (`cp -a`), record the file listing and the hashes of the two log files, and never start an engine on the golden volume.
3. For every run, take the slot with `engine.mjs up --fresh`, stop the container, replace the volume contents with the golden contents, start the same container again, and wait for `/healthz/started`, not only `/healthz/alive`.
4. Run the cheap checks (section 4) before the driver starts, then a warm-up (section 5), then the measured window.
5. Give the driver the manifest it needs. It already has a `--seed-manifest` route for QLever (`lab/bench/lib/bulk.ts:9-22`), and XTDB needs a seed-only writer for the same manifest plus one dereference fix (section 6.6).

| # | Question | Answer | Confidence | Key evidence |
|---|---|---|---|---|
| 1 | Is a cold copy of a cleanly stopped XTDB node's storage a valid new node? | **Yes.** The node keeps two log files, immutable storage files and nothing else. Its id is a random per-process value that is never written to the data. The leader term is re-claimed from the replica log at every start. | High on mechanism, Medium on side-by-side behavior (never run) | `LocalLog.kt:52,350`; `Storage.kt:40-47`; `Xtdb.kt:1646`; `LogProcessor.kt:279-297`; `Database.kt:229-251,288-305` |
| 1 | What would collide? | **Nothing persistent.** Identical on both copies by design: log epoch, XTDB tx ids (byte offsets in the log), Triplex scope key, journal stream name. Harmless unless a harness keys results by those across slots. | High | section 1.3 |
| 1 | Same blocks and tries, so same query cost? | **Yes for files.** Different at start: the open block's rows are rebuilt in memory from the replica log, JVM and memory caches are cold, the 15-minute block timer restarts. A settled golden (section 6.2) leaves the live index empty and the compactor idle, so only the cold caches and the restarted timer remain. | High on files, Medium on timing | `BlockFlusher.kt:18-50`; `BlockCutter.kt:86,116-118`; `TrieGarbageCollector.kt:36-43` |
| 2 | QLever: is index directory plus delta files a faithful clone of a stopped server? | **Yes.** The clone is every `triplex.*` file, including `triplex.update-triples` and `triplex.allocated-graphs-state`, owned by uid 999. The delta file stores vocabulary ids, so it only pairs with the exact index build it came from. | High | `IndexImpl.cpp:1085-1172,1243-1290`; `DeltaTriples.cpp:648-710`; `GraphNameManager.cpp:28-60` |
| 3 | Which copy method? | **`cp -a` in a helper container on the pinned image.** The VM's volumes are ext4 on `/dev/vdb1`, so `cp --reflink` cannot work. A few GiB takes 10 to 60 s, up to about 2 min under host load. | Medium (estimate) | `lab/research/R13-log-of-record.md:206`; `cp(1)` [W]; section 3 |
| 4 | Cheap faithfulness checks? | Yes. Eight checks (C1 to C8, 1 to 3 minutes together) run on every clone through file metadata and SQL, and two (C9, C10) run once to validate the method. The strongest are the exact fingerprints (file listing, `xt.trie_stats` rows, probe plan) taken at freeze and compared after the clone starts. | Medium | section 4 |
| 5 | Where is a clone not acceptable? | Seed-rate and write-path measurements, GS.13, first-start and cache-fill effects, compaction catch-up, and the final acceptance rerun, which TARGETS requires to be fresh. | High | section 5 |
| 6 | Time saved and risk? | About 3 min per clone against 38 to 53 min per seed. The main risks are a stale golden after a code change, readiness gated on `/healthz/alive`, and disk. | Medium | section 6.7, 6.8 |

---

## 1. XTDB 2.2.0 with Local log and Local storage (Q1)

### 1.1 What is on disk

The lab config gives `log: !Local path: /var/lib/xtdb/log` and `storage: !Local path: /var/lib/xtdb/buffers` (`xtdb-config.yaml:1-13`), and `engine.mjs` mounts one named volume at `/var/lib/xtdb` (`lab/bin/engine.mjs:94`). The image runs as user `xtdb`, uid 20000 (`references/xtdb/docker/Dockerfile:65-69`).

| Path under `/var/lib/xtdb` | Content | Changes after it is written? | Names a node? | Evidence |
|---|---|---|---|---|
| `log/LOG` | Source log. Each record is `0x1E`, size (int), timestamp (micros), payload, offset of the record (long). One writer coroutine appends up to 10 messages per `force(true)`. | Append only | No. The epoch is not in the file. | `LocalLog.kt:52,57-59,154-164,169,200-202` |
| `log/REPLICA_LOG` | Replica log. The leader's resolved transactions plus control records (block boundary, block uploaded, tries added and deleted, no-op term claims). | Append only | Term ids inside records only | `LocalLog.kt:350`; `LogProcessor.kt:279-297` |
| `buffers/v06/blocks/bNN.binpb` | Block files. Each holds the latest completed tx, the latest processed source msg id, the boundary replica msg id, the table list, secondary database configs, the term id and term sequence. | Write once | No | `TableCatalog.kt:304-338,345-346`; `Storage.kt:40,43-47` |
| `buffers/v06/tables/<slug>/{data,meta,blocks}/` | Arrow trie data and metadata files (L0 from block cuts, L1 and higher from compaction), per-table block files. | Write once, deleted only by garbage collection | No | `TableSlug.kt:15-25`; `LocalStorage.kt:118-128,150-170` |
| `buffers/v06/.tmp/` | In-flight uploads, moved into place with an atomic rename | Transient | No | `LocalStorage.kt:54-57,132` |
| `buffers/v06/oversized/...` | Replica messages too large for the log, referenced from `REPLICA_LOG` | Write once | No | `OffloadedMessages.kt:33-68` |
| `buffers/v06/crashes/<nodeId>/<ts>/` | Written only after an indexer crash | Write once | Node id in the path | `CrashLogger.kt:65` |

`v06` is `Storage.VERSION` 6 through `asLexHex` (`Storage.kt:40,43-47`; `StringUtil.kt:164-168`), and a `_e<epoch>` suffix appears only when the storage epoch is above 0. There is no catalog file apart from the block files, no lock file (grep for `tryLock`, `FileLock` and `.lock` in `core/src/main` and `api/src/main` finds nothing), and no disk cache for Local storage because the memory cache lives in the JVM (`LocalStorage.kt:48-51`, `xtdb-config.yaml:9-10`).

**Not on disk, rebuilt at every start:** the node id, the leader role, the table and trie catalogs (loaded from the latest block, then patched by replica records), the live index (the open block's rows), the memory cache and the block timer.

### 1.2 What a start does with a copied directory

1. **Config.** The primary database `xtdb` takes its log and storage from the node YAML. Secondary databases come from the latest block, with absolute paths (`DatabaseCatalog.kt:205-219`). The lab uses only the primary database (`slots.json` `urlTemplate` ends in `/xtdb`), so no stored absolute path matters `[E]`.
2. **Storage and catalogs.** The latest block is the lexicographically last `blocks/b*.binpb` (`TableCatalog.kt:352-361`). Table and trie catalogs load from it (`PartitionState.kt:59-73`).
3. **Log integrity.** `LocalLog` reads the last 8 bytes of `LOG` and checks that the file ends exactly on a record boundary, or it throws `log file corrupted` (`LocalLog.kt:61-95,132`).
4. **Storage and log must agree.** `validateOffsets` refuses to start if the log is at an earlier epoch than the storage's latest processed message, or shorter than it (`Database.kt:229-251,299`). A log and a storage copied at different moments fail here, which is the documented out-of-sync scenario [D] `ops/backup-and-restore/out-of-sync-log.md:5-18`.
5. **Replay.** The node starts as a follower, tails `REPLICA_LOG` from the block's boundary replica msg id and applies the already-resolved rows to the in-memory live index (`LogProcessor.kt:201-202,246-265`). Nothing is re-resolved.
6. **Leadership.** After the tail is empty the node appends `NoOp(termId = highestTermSeen + 1, termSeq = 0)` to its own `REPLICA_LOG`, becomes leader and resumes the source log after the last applied source msg id (`LogProcessor.kt:279-297,432-505`). The term comes from the file's content, so each copy numbers its terms independently.
7. **Block cutting stays deterministic.** The cutter starts from the rows already in the open block "or block sizes drift across restarts" (`BlockCutter.kt:86,116-118`, the code comment cites an earlier stop/start off-by-one).
8. **Timers and workers.** The 15-minute flush timer is armed at node start (`BlockFlusher.kt:26`). The compactor computes its jobs from the trie catalog (`Compactor.kt:215-218`), so it has none if the catalog is settled. Garbage collection runs only on the leader and is signalled at block boundaries (`TrieGarbageCollector.kt:36-43`). Its cutoff is the system time of the block `blocksToKeep` back minus `garbageLifetime` (`TrieGarbageCollector.kt:128-130`), so it follows stored system time and not the clone's wall clock, and with fewer than 10 blocks nothing is collected (`TableCatalog.kt:363-365` returns null). The 10k rung has about 4 to 5 blocks `[E]` (384,785 assertions plus claim and attempt rows, against 102,400 rows per block).
9. **Readiness.** `/healthz/started` returns 200 only after the latest processed msg id has reached the log head seen at start (`healthz.clj:62-80`). `/healthz/alive` does not wait for that (`healthz.clj:82-`).

The lab's `probe()` treats a slot as ready when the container is healthy (health check = `/healthz/alive`) and pgwire accepts connections (`lab/bin/engine.mjs:140-146`; health check at `:95`). **A clone can therefore pass `waitReady` while replay is still running**, and a read without a token returns whatever the node has applied so far (`lab/research/R19-xtdb-read-scaling-commit-floor-tenancy.md` section 1.4 table; `query.clj:157-163`, the default basis is the node's own latest completed tx). The `/healthz/started` gate is a requirement, not a nicety.

### 1.3 Identity audit: what two side-by-side copies share

| Candidate | Where it lives | Collision or confusion between two copies | Evidence |
|---|---|---|---|
| Node id | Random per process (`XTDB_NODE_ID` overrides). Used for a metrics tag and the crash directory name. `engine.mjs` sets only `JDK_JAVA_OPTIONS`. | None. Not persisted. | `Xtdb.kt:1646`; `Metrics.kt:26-29`; `CrashLogger.kt:65`; `engine.mjs:93` |
| Log epoch | Node YAML (`epoch`, default 0). A msg id packs the epoch above a 48-bit offset. | Same config on both, so same epoch. Do not change it for a clone. | `LocalLog.kt:332`; `MsgIdUtil.kt:6-20`; [D] `ops/config/log.md:77-118` |
| Leader term | Derived from `REPLICA_LOG` content | None. Each file gets its own next term. | `LogProcessor.kt:140-146,279-297` |
| XTDB tx id | The msg id: epoch bits plus the byte offset of the record in `LOG` (the tx id equals the source msg id unless a database has an external source, `Database.kt:292-295`) | **Identical sequences on both copies**, which is expected because the files start identical. Matters only if a harness joins results across slots by XTDB tx id. | `Database.kt:174-175`; `LocalLog.kt:152-166` |
| System time | The log record's timestamp, bumped to 1 µs past the latest completed tx if the clock is behind | A copy started later has later times. No rejection. | `TxResolver.kt:211-216` |
| Triplex scope key, journal stream (`triplex-journal:<scope>`), command ids | Table rows. The scope name is fixed by the seed manifest. Command ids carry a fresh `runTag` per run. | **Same scope and stream name on both arms of a duet.** Receipts must identify arms by slot and container id, not by stream. | `lab/bench/driver.ts:97-101`; `lab/bench/lib/seed.ts:79`; `packages/xtdb/src/XtdbStorageAdapter.ts:195-250` |
| Container, volume, port, slot lock, pool reservation | `engine.mjs` | Different per slot | `lab/bin/lib.mjs:119-134` |
| File owner | uid 20000 | The copy must keep it, or XTDB cannot write | `Dockerfile:65-69` |

Triplex adds no instance identity of its own: the adapter's `randomUUID()` calls make per-operation ids only (`XtdbStorageAdapter.ts:338,406`).

### 1.4 Does the clone cost the same to query?

**Same, because the files are the same:** blocks, L0 and compacted tries, bloom metadata (blooms exist only in compacted files, [P] `lab/research/R7-xtdb-indexing-ingest.md` Q1), table and trie catalogs, HLLs.

**Different at start, all `[E]` from the source above:**

- The live index holds the open block's rows (up to `rowsPerBlock` = 102,400, `IndexerConfig.kt:15`) and is rebuilt from `REPLICA_LOG`.
- The JVM memory cache (512 MiB, `xtdb-config.yaml:9-10`) is cold.
- The OS page cache is partly warm, because the copy just wrote the files. A natural restart would be colder.
- The 15-minute block timer starts at node start, not at the last block.
- Garbage collection is inert at the start. Superseded tries are dated by the log timestamp of the record that superseded them (`PartitionState.kt:28-37`, `trie_catalog.clj:169-181`), and the cutoff is derived from the stored system time of the tenth-latest block (1.2 item 8), so a clone does not collect seed-era garbage until about 10 more blocks exist, and the golden's age does not matter `[E]`.
- One extra `NoOp` record lands in `REPLICA_LOG`.

**Earlier lab evidence for the cold effect:** after a container restart at 3M rows, the first point lookup took 419 ms against 68 ms warm, and later runs matched warm ([P] `lab/research/R1-xtdb-capabilities.md` B9). **Earlier lab evidence for a restart-dependent plan:** R7 saw queries keep planning over 24 L0 files after a restart although `xt.trie_stats` listed 4 live L1C files, fixed by a second restart, cause not isolated ([P] `R7` Q1 item 1). Section 4 therefore compares the plan (`scan_files_used`, `scan_pages_used`) of a fixed probe, not only the result.

### 1.5 Preconditions for a valid copy

1. **Nothing in flight.** `LocalLog.close()` gives its writer 5 s (`LocalLog.kt:309-312`), and an interrupt in the middle of a record write leaves a partial record that the next start rejects (`LocalLog.kt:172-178,61-95`). Disconnect every client and wait for the queue to drain first.
2. **Clean stop, proven.** The JVM shutdown hook waits 10 s for the main thread and then calls `halt(1)` (`references/xtdb/main/src/main/clojure/xtdb/main.clj:81-98`). `engine.mjs down` uses `docker stop -t 30` (`engine.mjs:292`). Accept the stop only if the container log ends with `Node stopped.` and does not contain `could not stop node cleanly`. An exit code of 137 or 1 means the golden is discarded `[E]`.
3. **One moment for both directories.** Copy `log/` and `buffers/` in one operation from one stopped node. With a stopped node the docs' "storage first, then log" rule does not apply, because that rule concerns hot backups ([D] `ops/backup-and-restore/overview.md:144-151`; [W] `https://docs.xtdb.com/ops/backup-and-restore/overview.html` says the same).
4. **Settled.** Call `POST /system/finish-block` after the last seed commit ([D] `ops/maintenance.md:7-24`) so the open block becomes L0 tries and the live index is empty, then wait until `compactor.jobs.available` is 0 (`Compactor.kt:206`). Compaction in flight at stop time would leave a second, half-built state to reason about.
5. **Same image and config.** The image digest and the config bytes (`epoch`, paths, `indexer`, `compactor`, `garbageCollector`) are part of the golden's key (section 6.1). The effective config hash already includes the YAML bytes (`engine.mjs:91-97`).

---

## 2. QLever 0.6.0 (Q2)

### 2.1 What persists

The lab starts `qlever-server -i triplex ... --persist-updates` in `/data` (`qlever-start.sh:13`), and builds a one-triple bootstrap index only if `triplex.index.pso` is missing (`qlever-start.sh:4-8`).

| File (base name `triplex`) | Content | Changes at runtime? | Evidence |
|---|---|---|---|
| `triplex.index.<perm>` and `.meta` for the six permutations and the two internal ones | The permutations | No, except through a rebuild | `Permutation.cpp:166-171`; `IndexImpl.cpp:1243-1268` |
| `triplex.vocabulary.*`, `triplex.meta-data.json`, `triplex.settings.json`, optional `triplex.index.patterns` | Vocabulary, build configuration (git hash, build time), settings | No | `FileSuffixConstants.h:15-60`; `IndexImpl.cpp:1270-1286` |
| `triplex.update-triples` | The delta: inserted and deleted triples as vocabulary ids, plus the local vocabulary. **Rewritten from scratch after every update** through `.tmp` and `rename`. No fsync. | Yes | `DeltaTriples.cpp:518-540,648-670`; [P] `R8` section 5.1 |
| `triplex.allocated-graphs-state` | Next unallocated graph number | Yes, after graph allocation | `GraphNameManager.cpp:28-60`; `IndexImpl.cpp:1168-1172` |
| `previous.<date>/`, `rebuild.<date>.tmp/` | Old index generation kept by a rebuild, scratch of a rebuild in progress | After a rebuild | `Qlever.cpp:505-550` |
| `.tx2-volume`, `bootstrap.nt` | Lab marker and bootstrap input | No | `engine.mjs:253-257`; `qlever-start.sh:6` |

At start, `createFromOnDiskIndex` loads the permutations and, with persistence on, replays the delta file through `insertTriples` and `deleteTriples` and consolidates (`IndexImpl.cpp:1085-1166`; `DeltaTriples.cpp:674-710`). Replay costs about 5 µs per delta triple, 2.25M triples in about 10 s, and 4.5M triples took 22.6 s and 1.87 GiB RSS ([P] `R2` section 1.5; [P] `R8` section 5.2 reports 9.0 s for 1M).

### 2.2 Is copying the index directory plus the delta files faithful?

**Yes for a stopped server, and the same four rules apply:**

1. **Copy everything under `/data` except `previous.*`, `rebuild.*` and `*.tmp`.** `IndexImpl::allIndexFiles` is the engine's own list of what belongs to an index and shows the set (`IndexImpl.cpp:1243-1290`). `previous.*` is a rollback copy, about twice the index bytes, and a clone does not need it.
2. **Index and delta travel together.** The delta stores vocabulary ids, so a delta file is only valid with the exact index build it was written against. Never combine a delta from one build with an index rebuilt from the same quads.
3. **Cold copy only.** An update rewrites `triplex.update-triples` by rename, so a hot copy sees the old or new whole file, but a `rebuild-index` moves every file into `previous.*` and the new ones into place in several renames (`Qlever.cpp:663-713` per [P] `R13` section 4.3), so a hot copy during a rebuild can capture a mixed layout.
4. **Hash the delta.** A truncated or empty delta stops the server from starting, and a flipped byte is accepted silently because the file has no checksum ([P] `R8` section 5.1 item 4). Record `sha256` of `triplex.update-triples` and `triplex.allocated-graphs-state` in the manifest and compare after the copy.

**No identity to collide.** The lab server runs with `--no-access-check`, so there is no token (`qlever-start.sh:13`). The index files contain a build time and git hash, not a host id. A rebuild on two clones writes `previous.<same date>` into two different volumes (`Qlever.cpp:548`).

**What differs after start:** the result cache (512M, `qlever-start.sh:13`) is empty, the six permutations' located-triples structures are rebuilt from the delta (the in-memory form is regenerated, `DeltaTriples.cpp:649-653` comment), and the page cache is partly warm. The delta's memory cost is outside `-m` (0.4 to 1.7 KB per triple, [P] `R2` section 1.4), so a delta that fit before a stop can OOM during replay (`slots.json` records three OOM kills of `qlever-dev` while its delta grew).

### 2.3 What the QLever clone saves

The N01 report says QLever transacts run at about 30 facts/s, so the bulk path is the planned seed: 2.5 minutes of engine-free quad generation (cacheable by `nq.sha256`), then `qlever-index` (`lab/bench/README.md` "QLever bulk seed"). The 10k rung is 24,550,838 quads (150 MB gzipped), and index builds took 13 s (8.2M triples) to 190 s (98.6M triples) with about 20 bytes per triple ([P] `R8` header), so the 10k build is roughly one minute `[E]`. **Cloning saves about 1 to 4 minutes per QLever run, not 35.** It still removes the 6.74 GB gunzip stream and gives the QLever lane the same start-state discipline as XTDB. The bulk path has "not yet been indexed or read back on a live QLever" (`lab/bench/README.md`), so the first golden doubles as that check.

**Broker compositions.** The EXP-P2Q broker keeps its log, `WATERMARK` file and epoch on the host (`QLEVER_BROKER_DIR`, [P] `EXP-P2Q` report), not in the slot volume, and writes a `(broker_position, broker_epoch)` marker into QLever with every guarded update. The broker code is on an unmerged branch, so I could not read it `[E]`. The clone unit for a broker composition is **engine volume plus broker directory, copied from one quiescent moment**, and the first check after start is "marker equals broker head". An XTDB-behind-broker composition (P2B) is the same: the `broker_marker` row is in XTDB storage ([P] `R23` section 4.1) and the broker directory is separate.

---

## 3. The VM side (Q3)

### 3.1 How slots, volumes and limits are made

- **Names.** Container `tx2-<lane>-<slot>`, volume `tx2-<lane>-<slot>-data`, mounted at `/var/lib/xtdb` (XTDB) or `/data` (QLever) (`lib.mjs:127`, `engine.mjs:94,108`). Only a small read-only config file is bind-mounted, because bind mounts from macOS are slow for databases (`engine.mjs:16-18`).
- **Volume lifetime.** `down` stops with `-t 30`, removes the container, **keeps the volume** and records it in the pool ledger as retained (`engine.mjs:292,298-307`). `up` without `--fresh` and without a container reuses a retained volume as is. `up --fresh` removes container and volume first (`engine.mjs:242-246`).
- **Restart of an existing container.** `up` refuses if the container's config hash differs from `slots.json` (`engine.mjs:213-214`) and otherwise runs `docker start` (`engine.mjs:248`). A stopped container with a matching hash is therefore a valid place to swap the volume contents.
- **Limits.** XTDB slots `s1` to `s3`: 3.5 GiB, 2 CPUs, `-Xmx2g`, direct memory 1g, disk forecast 8 GiB. The pool is 11 GiB of memory and 50 GiB of the 60 GiB VM disk (`slots.json`). Disk admission uses real `df` usage, so a golden volume counts without being in the ledger (`lib.mjs:188-192`, `engine.mjs:228`).
- **One writer per volume.** `volumeGuard` refuses a second read-write XTDB container on a slot volume because the Local log has no file lock (`lib.mjs:251-262`). The EXP-X05 follower on the same volume was killed on reliability: its tail reader read half-written records, 9 deaths in 30 minutes ([P] `EXP-X05` report). **A cold copy avoids that hazard by having no concurrent reader at all.**
- **Filesystem.** Named volumes are `ext4` on `/dev/vdb1`, the colima data disk, which is a raw sparse file on the Mac ([P] `R13` section 3.1 item 4, line 206).
- **Ownership.** XTDB runs as uid 20000. QLever runs as uid 999 and `engine.mjs` chowns a new volume once, with a marker file so Docker does not undo it on an empty volume (`engine.mjs:253-257`). Docker populates an **empty** volume from the image directory ([W] `https://docs.docker.com/engine/storage/volumes/`) and, as the lab observed, copies that directory's ownership onto it (`engine.mjs:253-255` comment). A volume that already has content gets neither, so a volume filled by a copy needs an explicit `chown` of its root.

### 3.2 Copy methods compared

| Method | Keeps permissions and owner | Keeps sparse files | Works on this ext4 volume | Verdict |
|---|---|---|---|---|
| `cp -a` in the **pinned XTDB image** (alpine BusyBox) | Yes. BusyBox `-a` is `-dpR`: links, mode, owner, timestamps. No xattrs. [W] `https://busybox.net/downloads/BusyBox.html` | BusyBox lists no `--sparse` option, so holes are written as zeros | Yes | **Use for XTDB volumes.** XTDB writes no sparse files (Arrow IPC and appended logs) `[E]`, and no pull is needed because the image is already present. |
| `cp -a` in the **pinned QLever image** (Ubuntu, GNU coreutils) | Yes. `-a` is `-dR --preserve=all`. [W] `https://man7.org/linux/man-pages/man1/cp.1.html` | Yes by default (`--sparse=auto` keeps detected holes) | Yes | **Use for QLever volumes.** |
| `cp --reflink=auto` | Same as above | Same | **No gain.** `auto` falls back to a full copy and `always` fails when the filesystem cannot clone ([W] same man page). Reflinks need Btrfs or XFS ([W] `https://man7.org/linux/man-pages/man2/ioctl_ficlone.2.html` names only those), and the volume is ext4. | Not usable |
| `tar -c \| tar -x` | Yes as root | BusyBox tar lists no sparse flag; GNU tar needs `-S` | Yes | Two processes and a pipe, so no faster than `cp -a`. No benefit. |
| Hard links (`cp -al`) | n/a | n/a | Only inside one mount. `link()` fails across mounts even for one filesystem ([W] `https://man7.org/linux/man-pages/man2/link.2.html`). Two named volumes are two mounts, so it needs a bind of `/var/lib/docker/volumes`. | **Reject.** It also shares inodes, so a `chown` on the clone edits the golden, and it shares page cache between duet arms. |
| Overlay volume (lower = golden) | n/a | n/a | Possible with the `local` driver, only with VM paths | **Reject.** It changes the I/O path, so service time is not the same as a plain volume, and it ties every arm to the golden's lifetime. |
| Hot copy of a running engine | n/a | n/a | n/a | **Reject.** Torn `LOG` tail for XTDB, mixed rebuild layout for QLever. |

### 3.3 How long a few GiB takes

`[E]` from measured VM numbers. R13 wrote 128 MiB to an ext4 volume in 91 to 172 ms plus 14 to 37 ms to flush, and a BusyBox `dd conv=fsync` ran at 381 MB/s to 1.0 GB/s ([P] `R13` `out/bulk-vm.log`). A copy reads and writes, so I take 0.3 to 1 GB/s effective.

| Size | Quiet host | Host load 17 or higher (NOTEBOOK 2026-11-08) |
|---|---|---|
| 3.4 GiB (the 10k rung after N01's A0 run) | 8 to 25 s plus a final `sync` of 5 to 15 s | 1 to 2 min |
| 10 GiB (hypothetical) | 25 to 70 s plus `sync` | 3 to 5 min |

The A0 receipt measured the volume at 3,666,530,304 bytes (3.41 GiB) and VM `df` used growing from 10.07 GB to 14.12 GB across that run (`NS-xtdb-20261108T001701Z-6f67e0.json`, `/volumeBytes`, `/diskBefore`, `/diskAfter`). Give the helper `--memory 512m --memory-swap 512m` so the copy's dirty page cache is reclaimed inside its own cgroup, and name it `tx2-clone-*` so the pool ledger counts it as external memory.

**Disk is the scarce resource, not time.** One golden plus two duet clones is about 10 GiB. The host had 9 to 10 GiB free on 2026-11-08 with a rule of no new heavy run below 5 GiB (NOTEBOOK), and the VM disk is a sparse image that keeps blocks it has touched. Remove each clone volume after its run (`engine.mjs down --remove-volume`) so the VM reuses the same blocks.

---

## 4. Faithfulness checks (Q4)

Each check compares the clone to the **freeze record** written when the golden was made (section 6.2 step 4), never to a re-measurement of the origin. File hashes are taken before the first start, because the first start appends a `NoOp` to `REPLICA_LOG`.

| # | Check | How | Cost | Pass | Catches |
|---|---|---|---|---|---|
| C1 | Copy completeness | In the helper: `cd /dst && find . -type f -exec stat -c '%n %s' {} + \| sort \| sha256sum` and compare with the golden's listing hash. Hash `LOG` and `REPLICA_LOG` fully (about 2.4 GB). | 1 s listing, 10 to 30 s hash | Equal | Truncated copy, wrong source, torn log |
| C2 | Started and caught up | `docker exec <ct> wget -q -O- http://127.0.0.1:8080/healthz/started` returns 200, then `/healthz/alive` returns 200 | seconds | 200 on both | Partial replay |
| C3 | Latest completed tx | `SHOW LATEST_COMPLETED_TXS` (surfaced through pgwire, `Database.kt:587-597`) and `SELECT COUNT(*), MIN(system_time), MAX(system_time) FROM xt.txs` | under 1 s | Tx id and system time equal the freeze record | Lost tail, wrong pair |
| C4 | Triplex position and counts per scope | `SELECT position FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?`; `SELECT COUNT(*)` from `tx_assertions`, `tx_claims`, `tx_attempts` for the scope. The driver already compares the position with the manifest (`bulk.ts:10-13`), and the assertion count has a closed form (384,785 at the 10k rung, `assertionsMatchClosedForm`). | 5 to 60 s | Equal to the manifest and the closed form | Missing or extra rows |
| C5 | History and system-time depth | Same count with `FOR ALL SYSTEM_TIME FOR ALL VALID_TIME` (syntax per [D] `about/time-in-xtdb.md:172`), plus `COUNT(DISTINCT system_time)` from `xt.txs` | 10 to 60 s | Equal | Lost versions |
| C6 | Layout fingerprint | Hash of the ordered rows of `xt.trie_stats` (`table_name, trie_key, level, trie_state, data_file_size, row_count`), `xt.block_files` and `xt.live_tables` (`information_schema.clj:172-192`; `block_tables.clj:32-60`) | under 1 s | Equal at start. `xt.live_tables` row counts equal the replayed open block. | Different index layout, compaction state |
| C7 | Compaction idle | `SELECT value FROM xt.metrics_gauges WHERE name = 'compactor.jobs.available'` is 0 (`Compactor.kt:206`; `Database.kt:375-388` also exposes `node.tx.latestCompletedTxId` and `node.tx.lag.MsgId`) | under 1 s | 0 for three polls 5 s apart | Unsettled golden |
| C8 | Fixed probe plan and result | For about 20 fixed subjects: the 4-query pull at the manifest basis, `EXPLAIN ANALYZE` rows `scan_files_used`, `scan_pages_used`, `scan_rows_read` ([P] `R7` Q1 "Instrumentation"; `ScanMetrics.kt`), and a hash of the result rows | 5 to 20 s | Same hash, same files and pages used as the freeze record | The R7 stale-plan anomaly, wrong data |
| C9 | Probe latency | 200 pulls, p50 and p99, after warm-up, on origin-fresh and clone, run once in E1 (section 6.9), not per run | minutes | Ratio within the lab's hold margins, 1.10 at p50 and 1.15 at p99 (Q60, provisional, `lab/STATE.md:100`) | Service-time difference |
| C10 | Content digest | Sorted digest of every row of the scope over all system and valid time, in chunks. O-REPLAY's 12-subject sample re-check already runs in the driver. | minutes | Equal | Anything C1 to C8 miss |

**QLever equivalents.** C1 on the index directory, plus `sha256` of the two persisted-update files. Then `SELECT (COUNT(*) AS ?n) WHERE { GRAPH ?g { ?s ?p ?o } }` per scope graph against the manifest's `quads`, the `triplex:meta` position triple against `manifest.result.lastPosition` (`bulk.ts:10-13`), and a fixed SPARQL probe set with result hash and runtime-information tree (the scan nodes).

C1 to C8 together cost 1 to 3 minutes per clone. C9 and C10 are validation, not per-run gates.

---

## 5. Where a clone is not acceptable, and what needs a warm-up (Q5)

### 5.1 Measurements that must not start from a clone

| Measurement | Clone? | Why |
|---|---|---|
| Seed rate, commit path under bulk load (EXP-M01's 120 facts/s risk, the 168.6 facts/s receipt), `public` against `public-queued` seeding | **No** | The seed is the object under test. |
| GS.13 HRIS backfill (a 1M-fact import under live reads) | Import: no. Base store: yes | The import itself must run live against the clone. |
| GS.04 kill and restart | The restart is the measurement | A clone gives the pre-state only. |
| First-start and cache-fill effects, cold-restart recovery time | **No** | The copy leaves the page cache partly warm, and the engine is already caught up. |
| Compaction catch-up after a bulk load, garbage-collection backlog (R7's roughly 6x pre-GC growth) | **No** | A settled golden has neither. |
| Final acceptance ("the final acceptance reruns all 20 fresh", `lab/TARGETS.md` section 6) | **No** | Fresh seed through the commit path, plus the golden audit (C10) on the side. |
| After any change to the Triplex adapter, the world or seed generator, the image or the config | New golden | The key changes (section 6.1). |

Everything else (P1 ladder, P2 and P3 on the trace, P4 pulls, P5 sweep, PAIR-0 duets, hill-climb screening) can start from a clone, **because the start state is what those runs hold constant and the seed is not what they measure.**

### 5.2 Maintenance events in a settled clone

TARGETS 1.1 P1 item 3 requires at least one maintenance event in every P1 window. Whether N01's window contained one is not recorded, because the bench only observes maintenance events in engine logs (`lab/bench/README.md`, "Seams"). A freshly seeded engine probably still compacts its last block at window start `[E]`. A settled clone has no backlog, and the next natural block cut is 15 minutes after the start (`BlockFlusher.kt:26,30-46`) or at 102,400 resolved rows. **Force the event at a fixed trace time in every run** with `POST /system/finish-block`, reached with `docker exec` because the lab publishes only pgwire. The README lists forced maintenance as an open seam (`lab/bench/README.md`, "Seams").

### 5.3 Warm-up after cloning

| Measurement | Needs a warm-up? | Rule |
|---|---|---|
| P4 pull latency, P1 read p99 | **Yes** | Run a fixed pass over the trace's active set, then discard the first N seconds. R1 saw a 6x first-lookup penalty after a restart ([P] B9). The profile warm-ups (smoke 15 s, screening 30 s, acceptance 120 s, `lab/bench/lib/phases.ts:25`) are the minimum. |
| P2 commit latency, P3 feed lag | Yes, shorter | Commits touch the live index and the log first. Discard until the first block cut has passed or compare only matched phases. |
| P5 sweep wall time | **Yes** | The first pull of every subject reads files cold. The sweep runs at the 100k rung, where the working set exceeds the 512 MiB cache `[E]` and a Local-log clone is too large (6.8 item 8), so P5 needs a fresh seed or the epoch-bump variant. |
| PAIR-0 duet | Same warm-up on both arms, in the same order | The copy leaves the destination files in page cache for the arm copied last. Alternate which arm is copied first between duets. |
| Fixed-probe plan check (C8) | Run it before and after warm-up | The plan must not change with warmth. |

Record in the receipt: `healthz/started` time, the copy's end time, the warm-up length and the golden key, so a verifier can see the start protocol.

---

## 6. Recommendation (Q6)

### 6.1 The seed key and the golden manifest

A golden is valid only for the exact inputs that produced its bytes. The key is the SHA-256 of:

- the XTDB image digest and the bytes of `xtdb-config.yaml` (so `epoch`, paths, `indexer`, `compactor`, `garbageCollector`);
- `sha256` of `lab/bench/lib/world.ts`, `commands.ts`, `seed.ts`, `rng.ts` and the built `packages/xtdb` and `packages/core` that the seed ran against (the A0 receipt already records these under `/fixtures` and `/build`);
- the driver options that shape the seed: rung, subjects, `--seed`, `--seed-batch-facts`, `--oracle-subjects` and `--history-sample`.

Name the golden `tx2-golden-xtdb-<first 8 hex of key>`. Store `runs/xtdb-seed/<key8>/manifest.json` beside it in the format `qlever-bulk-seed.ts` already writes (`tx2-ns-bulk-seed/1`, `qlever-bulk-seed.ts:194-207`: `scope`, `result.{firstPosition,lastPosition,lastInstant,state,versionIds}`, `recorded`), with `lane: "xtdb"` and these additions: `goldenVolume`, `image`, `configSha256`, `freeze` (the fingerprints from C3 to C8), `files` (listing hash and the `LOG` and `REPLICA_LOG` hashes), and `stop` (the `Node stopped.` line and the exit code).

### 6.2 Make the golden (once per key, about 45 to 60 minutes)

Docker is addressed with `-H` exactly as `lab/bin/lib.mjs:137-139` does; `TX2` below is `unix:///Users/sam/.colima/triplex2/docker.sock`. `<IMG>` is the pinned XTDB image from `slots.json`.

```
# 1. Seed through the real commit path on an exclusive slot (the current 38 to 53 min).
node lab/bin/engine.mjs up --lane xtdb --slot s1 --fresh --holder R26-golden --exp GOLD
node lab/bench/xtdb-seed.ts --rung 10k --seed ns-v2 --out runs/xtdb-seed/$KEY      # NEW (6.6): seed only, writes manifest.json; XTDB_URL is the one `up` printed

# 2. Settle: put the open block into L0 tries, then wait for the compactor.
docker -H $TX2 exec tx2-xtdb-s1 wget -q -O- --post-data= http://127.0.0.1:8080/system/finish-block
#    poll over pgwire until three readings 5 s apart show:
#    SELECT value FROM xt.metrics_gauges WHERE name = 'compactor.jobs.available'   -> 0
#    SELECT table_name, row_count FROM xt.live_tables                              -> all 0

# 3. Optional: shrink the golden by collecting garbage first (6.8, risk 7). It needs a restart on a config with
#    garbageCollector {blocksToKeep: 4, garbageLifetime: PT1S} and one more finish-block, as in R7 Q6, so it is a second
#    config in the golden's key. Skip it unless disk forces it.

# 4. Freeze record: run C3 to C8 and store the output in manifest.json (freeze block).

# 5. Stop and prove it was clean.
docker -H $TX2 stop -t 60 tx2-xtdb-s1
docker -H $TX2 logs --tail 30 tx2-xtdb-s1 | grep -c 'Node stopped.'                # must print 1
docker -H $TX2 inspect -f '{{.State.ExitCode}}' tx2-xtdb-s1                         # not 137, not 1

# 6. Copy into the golden volume; the source is read-only.
docker -H $TX2 volume create --label tx2.golden=1 --label tx2.seed-key=$KEY tx2-golden-xtdb-$KEY
docker -H $TX2 run --rm --network none -u 0:0 --name tx2-clone-gold --memory 512m --memory-swap 512m \
  -v tx2-xtdb-s1-data:/src:ro -v tx2-golden-xtdb-$KEY:/dst --entrypoint sh <IMG> -c '
    cp -a /src/. /dst/
    find /dst -name .tmp -type d -prune -exec rm -rf {} +
    chown 20000:20000 /dst
    sync
    cd /dst
    find . -type f -exec stat -c "%n %s" {} + | sort | sha256sum
    sha256sum log/LOG log/REPLICA_LOG'      # record both outputs in manifest.json

# 7. Release the seeding slot. The golden is never mounted read-write and never started.
node lab/bin/engine.mjs down --lane xtdb --slot s1 --holder R26-golden --remove-volume
```

`find ... -name .tmp -prune -exec rm` and `sync` are `[E]` on BusyBox and have to be confirmed in E1.

### 6.3 Clone for a run (per run, about 2 to 4 minutes)

This works with today's `engine.mjs` and keeps the slot lock and pool reservation the whole time.

```
SLOT=s1; CT=tx2-xtdb-$SLOT; VOL=$CT-data; GOLD=tx2-golden-xtdb-$KEY

# 1. Take the slot with an empty node (creates the volume with the right owner; 15 to 30 s).
node lab/bin/engine.mjs up --lane xtdb --slot $SLOT --fresh --holder $H --exp $E

# 2. Stop the container but keep it, the lock and the reservation.
docker -H $TX2 stop -t 60 $CT

# 3. Replace the volume contents with the golden contents.
docker -H $TX2 run --rm --network none -u 0:0 --name tx2-clone-$SLOT --memory 512m --memory-swap 512m \
  -v $GOLD:/src:ro -v $VOL:/dst --entrypoint sh <IMG> -c '
    find /dst -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    cp -a /src/. /dst/
    chown 20000:20000 /dst
    sync
    cd /dst
    find . -type f -exec stat -c "%n %s" {} + | sort | sha256sum
    sha256sum log/LOG log/REPLICA_LOG'      # C1: compare both outputs with the golden's manifest

# 4. Start the same container again (config hash unchanged, so engine.mjs runs docker start).
node lab/bin/engine.mjs up --lane xtdb --slot $SLOT --holder $H --exp $E

# 5. Gate: C2 (healthz/started), then C3 to C8, then the warm-up, then the driver with --seed-manifest.
node lab/bin/gate.mjs NS --lane xtdb --slot $SLOT --rung 10k --seed-manifest runs/xtdb-seed/$KEY/manifest.json ...

# 6. After the run: node lab/bin/engine.mjs down ... --remove-volume   (frees the clone; the golden stays)
```

**Duets.** Repeat steps 1 to 4 for `s1` and `s3` from the same golden, one at a time. Alternate which arm is copied first between duets.

**Cleaner form (a change to `engine.mjs`, not made).** `engine.mjs up --clone-from <golden-volume>` would run steps 2 and 3 inside `up`, under the slot lock and after pool admission, and `probe()` would add a `docker exec wget .../healthz/started` check. That is about 30 lines and removes the empty-node start in step 1.

### 6.4 QLever golden and clone

```
# Golden (once per key). Quads come from qlever-bulk-seed.ts (2.5 min, engine-free, cacheable).
node lab/bench/qlever-bulk-seed.ts --rung 10k --out runs/qlever-seed/$KEY
docker -H $TX2 volume create --label tx2.golden=1 tx2-golden-qlever-$KEY
# a new volume is root-owned (the image has no /data), so repeat engine.mjs's one-time init first (engine.mjs:253-257)
docker -H $TX2 run --rm --network none -u 0:0 --name tx2-clone-gold-q -v tx2-golden-qlever-$KEY:/data \
  --entrypoint sh <QLEVER_IMG> -c 'echo "tx2 volume initialized for uid 999" > /data/.tx2-volume && chown -R 999:999 /data'
docker -H $TX2 run --rm --network none -u 999:999 --name tx2-clone-gold-q --memory 3g -v tx2-golden-qlever-$KEY:/data \
  -v $PWD/runs/qlever-seed/$KEY:/seed:ro --entrypoint bash <QLEVER_IMG> -c \
  'cd /data && gunzip -c /seed/seed.nq.gz | qlever-index -i triplex -F nq -f - --stxxl-memory 512M --no-patterns'
# Verify on a CLONE (below), never on the golden: a server start may write nothing, but "may" is not a guarantee.
# Record sha256 of every file under /data in the manifest (the delta is empty for a bulk-built index).

# Clone per run: same four steps as 6.3, with these differences.
#   - helper image <QLEVER_IMG>, entrypoint bash, -u 0:0
#   - copy:  cd /src && tar cf - --exclude='previous.*' --exclude='rebuild.*' --exclude='*.tmp' . | (cd /dst && tar xpf -)   or  cp -a with the same exclusions
#   - then:  echo "tx2 volume initialized for uid 999" > /dst/.tx2-volume && chown -R 999:999 /dst
#   - gate:  the SPARQL checks in section 4, and the driver's position check against the manifest
```

`[E]` The `qlever-index` flags follow `lab/bench/README.md` ("QLever bulk seed"). That path has not run on a live QLever yet, so the first golden build is also its first test.

### 6.5 Compositions with a broker

Copy the engine volume and the broker directory together while both are stopped, put the broker directory under a per-slot path, and fail the run if the engine's marker differs from the broker head. Never pair one slot's broker directory with another slot's volume. The broker's epoch bump on every open (`EPOCH_BEGIN`, [P] EXP-P2Q) and its kernel lock by real path (`log.ts:96,193,100` per the report) keep two copies apart.

### 6.6 Changes the lab needs (none made by this report)

1. **`lab/bench/xtdb-seed.ts`**, a seed-only entry that runs `seedRung` against a live XTDB slot and writes the manifest. It mirrors `qlever-bulk-seed.ts:194-207`. `versionIds` should cover all subjects, as the QLever manifest does, so any P4 history sample can be grown.
2. **`lab/bench/driver.ts:250`** reads `bulkManifest.nq.sha256` and `bulkManifest.nq.quads`, which an XTDB manifest does not have. It needs `seedPath = { kind: "clone", goldenVolume, key, manifestSha256 }` for this case. The checks on lane, subjects and seed (`driver.ts:99-100`) already work for XTDB.
3. **`engine.mjs`**: the `--clone-from` option and the `/healthz/started` probe (6.3).
4. **Receipts**: bind the golden key, manifest hash, volume name, copy timestamps and the C1 to C8 results, and refuse a PAIR where the arms have different keys. The N01 receipt's `/ns/seed/wallS` would otherwise show the original seed time for a clone.

### 6.7 Time saved

| Case | Today | With a clone | Saved |
|---|---|---|---|
| One XTDB A0 or NS run at the 10k rung | 38.0 min seed (N01 receipt) to about 53 min (120 facts/s) | 2 to 4 min | 34 to 50 min |
| One PAIR-0 duet (two arms seeded) | 76 to 106 min | 5 to 8 min | 70 to 100 min |
| A repeated duet after `INVALID_NOISE` | Another 76 to 106 min | 5 to 8 min | same |
| The first run on a new key | 38 to 53 min | 45 to 60 min (seed plus settle plus copy) | none, pays back from the second use |

Per-clone budget `[E]`: empty-node start 15 to 30 s, stop 5 to 15 s, copy 10 to 60 s, start to `/healthz/started` 15 to 60 s (a replacement follower was ready in 11 to 28 s, [P] `EXP-X05` report), checks 1 to 3 min. The warm-up is not counted because it already exists in the profiles.

### 6.8 Risks, ranked

1. **Stale golden.** A change to the adapter, world, driver options, image or config makes the bytes wrong while the clone looks fine. **Mitigation:** the key (6.1), and the driver refusing a manifest whose key differs from the running build's hashes.
2. **Early readiness.** `waitReady` passes on `/healthz/alive` before replay is done. **Mitigation:** C2 and the position check, which fails closed (`bulk.ts:10-13`).
3. **Unclean stop or hot copy.** A torn `LOG` tail stops the next start, or worse hides a lost record. **Mitigation:** clean-stop evidence in the manifest (1.5 item 2), C1.
4. **Disk.** A golden plus two clones is about 10 GiB against 9 to 10 GiB of free host disk. **Mitigation:** `--remove-volume` after each run, the existing 5 GiB host rule, and the optional GC pass in 6.2 step 3.
5. **Hidden coupling between arms.** Page cache warmth from the copy, and identical stream names and tx ids. **Mitigation:** alternate copy order, same warm-up, identify arms by slot and container id.
6. **The seed path stops being exercised.** A regression in the commit path or the seed would be invisible. **Mitigation:** the acceptance run seeds fresh (TARGETS 6), and a fresh seed against the golden (C10) whenever the key changes.
7. **Garbage collection after a long run.** After about 10 further blocks a clone collects seed-era superseded tries (1.2 item 8), which adds unlinks and a `TriesDeleted` record to a long acceptance window. **Mitigation:** none needed for runs shorter than a few hours, because 10 blocks need 10 block cuts. The optional GC pass in the golden removes the effect and shrinks the volume (R7 saw 37.7 GB fall to 13.1 GB in 10 s with tight settings), at the cost of a second config in the key.
8. **Scale.** The Local logs are never trimmed and carry about 3 KB per fact (J01's 10-fact record is 30,061 bytes, [P] `EXP-J01`). At the 100k rung the logs would be about 25 GB, which does not fit. A later variant clones only `buffers/` after a final `finish-block` and starts the clone at a higher `epoch` with an empty log directory ([D] `ops/backup-and-restore/out-of-sync-log.md:30-47`). It changes the config bytes and the tx id range, so it needs its own key and its own validation.

### 6.9 Validation experiment E1 (needs one exclusive slot pair; about 2 hours)

1. Make a golden on `s1` (6.2) and stop. Make a **fresh seed** on `s3` with the same key, settle it the same way, stop it.
2. Clone the golden onto `s1`. Start the stopped `s3` volume as it is.
3. Run C1 to C8 on both, then the PAIR-0 A/A procedure with arm A the fresh-seeded volume and arm B the clone, with identical warm-up.

**Predictions to falsify:**

| # | Prediction | If wrong |
|---|---|---|
| P-a | C3 to C7 are equal between the two volumes after the same settle | Seeding is not deterministic enough to compare, so freeze one and share it |
| P-b | C8 plan and result hashes are equal | Restart-dependent planning (R7's anomaly), so add a second restart to the protocol |
| P-c | The clone reaches `/healthz/started` in 60 s or less | Replay is longer than estimated, so budget more per clone |
| P-d | A/A slot bias at p50 and p99 lies inside the hold margins 1.10 and 1.15 | The clone is not service-time equivalent, so find the source before adoption |
| P-e | A first start does not rewrite any `buffers/` file (a file listing before and after matches except for `REPLICA_LOG`, `LOG` and new files) | Storage is not immutable at start, so re-check the golden's read-only rule |
| P-f | Copy time for 3.4 GiB is 8 to 60 s | Re-plan disk and duet scheduling |
| P-g | BusyBox `cp -a`, `find -exec rm`, `wget --post-data=` and `stat -c` all work in the pinned image | Use the QLever image for the helper, or a per-command fallback |

---

## 7. Open questions

1. **Which freeze state is canonical, settled or as-seeded?** I recommend settled plus a forced `finish-block` at a fixed trace time. It makes runs comparable, and it differs from the N01 start state, where the open block's rows were still in memory and the last block was still compacting. Historical A0 receipts are therefore not directly comparable to settled-clone receipts. If Sam wants them comparable, E1 should include a hot-frozen golden, which is the same procedure without step 2.
2. **May hill-climb receipts say "seeded by clone of golden G" while only acceptance seeds fresh?** TARGETS 6 requires fresh seeds for the final acceptance and is silent on screening.
3. **Does a restart rewrite anything under `buffers/`?** Source shows write-once storage and no start-time writes, but I did not trace every startup path. P-e tests it.
4. **How long does replay take for a full open block?** Up to 102,400 rows are rebuilt from `REPLICA_LOG`. A settled golden empties the live index, so this only matters for a hot-frozen golden.
5. **Exact names and syntax** of `xt.metrics_gauges` rows, `SHOW LATEST_COMPLETED_TXS` output and the `FOR ALL SYSTEM_TIME` count are from source, not from a run.
6. **Broker code is not in this checkout.** Section 2.3 and 6.5 rest on the EXP-P2Q report, not on reading `broker.ts` and `log.ts`.
7. **100k rung.** The logs make a Local-log clone too large (6.8 item 8). Whether the epoch-bump variant is faithful enough is untested.
8. **The 38-minute figure.** The A0 receipt gives 2,281.6 s at 168.6 facts/s, while EXP-M01 and the NOTEBOOK say about 120 facts/s. I used both as a range.

---

## 8. Sources

**Lab files read.** `lab/NORTH-STAR.md`, `lab/SCOPE.md`, `lab/TARGETS.md`, `lab/STATE.md`, `lab/NOTEBOOK.md`, `lab/bin/engine.mjs`, `lab/bin/lib.mjs`, `lab/config/slots.json`, `lab/config/xtdb-follower-config.yaml`, `xtdb-config.yaml`, `qlever-start.sh`, `compose.xtdb.yaml`, `lab/bench/driver.ts`, `lab/bench/lib/{seed,bulk,world}.ts`, `lab/bench/reader-worker.ts`, `lab/bench/qlever-bulk-seed.ts`, `lab/bench/README.md`, `lab/runs/NS/NS-xtdb-20261108T001701Z-6f67e0.json`, `lab/experiments/EXP-M01-paired-measurement/REPORT.md`, `EXP-N01-northstar-bench/REPORT.md`, `EXP-X05-xtdb-read-follower/REPORT.md`, `EXP-P2Q-qlever-log-broker/REPORT.md`, `lab/research/R1`, `R2`, `R7`, `R8`, `R13`, `R19`, `R23`, `/Users/sam/Claude/Projects/triplex-db-2/R13-log-durability/out/bulk-vm.log`, `.../EXP-J01/xtdb-attribution-A0.out`.

**XTDB source (v2.2.0, sha c6c1962), `references/xtdb`.** `core/src/main/kotlin/xtdb/api/log/{LocalLog,ReadOnlyLocalLog}.kt`, `storage/{LocalStorage,BufferPool}.kt`, `api/storage/Storage.kt`, `database/{Database,DatabaseCatalog,DatabaseLogs,PartitionState}.kt`, `catalog/TableCatalog.kt`, `table/TableSlug.kt`, `indexer/{LogProcessor,BlockCutter,BlockFlusher,TxResolver,OffloadedMessages,CrashLogger}.kt`, `compactor/Compactor.kt`, `garbage_collector/TrieGarbageCollector.kt`, `util/{MsgIdUtil,StringUtil}.kt`, `api/{Xtdb,CompactorConfig,GarbageCollectorConfig,IndexerConfig}.kt`, `core/src/main/clojure/xtdb/{healthz,information_schema,block_tables,log_tables,trie_catalog}.clj`, `main/src/main/clojure/xtdb/main.clj`, `docker/Dockerfile`.

**XTDB docs.** `ops/backup-and-restore/{overview,out-of-sync-log}.md`, `ops/config/log.md`, `ops/maintenance.md`, `ops/config/monitoring.md`, `about/time-in-xtdb.md`.

**QLever source (v0.6.0, sha 6c5861a), `references/qlever`.** `src/index/{IndexImpl,DeltaTriples,GraphNameManager,Permutation}.cpp`, `src/global/FileSuffixConstants.h`, `src/libqlever/{Qlever.cpp,Qlever.h}`, `src/ServerMain.cpp`, `Dockerfile`.

**Web, fetched 2026-11-07, unauthenticated.**
- `https://man7.org/linux/man-pages/man1/cp.1.html` (`--reflink`, `--sparse`, `-a`).
- `https://man7.org/linux/man-pages/man2/link.2.html` (`EXDEV` across mounts).
- `https://man7.org/linux/man-pages/man2/ioctl_ficlone.2.html` (reflink needs filesystem support; page names XFS and Btrfs).
- `https://busybox.net/downloads/BusyBox.html` (`cp -a` is `-dpR`; no `--sparse`).
- `https://docs.docker.com/engine/storage/volumes/` (an empty volume is populated from the image directory).
- `https://docs.xtdb.com/ops/backup-and-restore/overview.html` (storage first, then log, for backups).
- `https://www.gnu.org/software/coreutils/manual/html_node/cp-invocation.html` returned HTTP 429 twice, so the man7 page stands in for it.
