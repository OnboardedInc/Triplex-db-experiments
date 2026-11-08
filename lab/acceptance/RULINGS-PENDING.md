# Rulings recorded but not yet compiled (Q38c: RULINGS.md holds only compiled or explicitly listed entries)

These move into RULINGS.md when the contract version that compiles them is built.

## Q51b: EXP-P2X feed lag on XTDB (not compiled in 0.3.8: an experiment direction with no contract effect)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q51b feed lag on XTDB | The next XTDB P2/P3 experiment puts XTDB behind the same host log and broker as EXP-P2Q (EXP-P2B: XTDB as the replica, current and history layer), since that composition measured feed lag p99 12.8-24.5 ms and an ACK independent of the engine. The subject-stamp path stays the XTDB-native arm (A1) to compare against; a separate consumer database through ATTACH is not pursued unless P2B fails. | both engines stay candidates for every layer; fewer moving parts |

## Q72: V-P2Q round 2 on f711193 (broker fix round 2)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q72a lock helper | The flock helper runs detached in its own process group, ignores INT, TERM and HUP, and exits only on stdin EOF; when it exits for any reason the log fail-stops (every later append throws), and each append checks the helper is alive. A test kills the helper and Ctrl-Cs the holder's group and shows no second writer. | V-P2Q N1 |
| Q72b answer snapshot | Q67c applies to every broker read surface: a surface that answers in one request reads the marker in that request (a UNION with the marker triple, as pulls do); a surface that needs several requests (Datalog executor, dependencyState, native with awaitBasisMs) compares (incarnation, marker) before and after, and every fence and replay writes a new incarnation first. V-P2Q's live residual test (zero-downtime rewind between the probes) is a regression case. | V-P2Q N2; Q67c |
| Q72c reasons | Rename reasons to the contract's strings now (`basis-not-reached`, `replica-unreachable`). Core tagged errors (Q67h) are required before the broker becomes a default, not for the default-off merge; until then no claim may close an obligation pinned to E-BASIS-NOT-AVAILABLE or E-REPLICA-UNAVAILABLE. | V-P2Q question 5; Q67h |
| Q72d A0 guard | The A0 change with the option off is a correctness fix (main answers a basis above the published position) and stays. The frozen A0 control (Q46b) is re-frozen at the P2Q merge, and every matched comparison names the change. | V-P2Q N3; Q62a |
| Q72e outage replay | The synchronous whole-log replay per outage pull is a blocker for default, not for default-off; it is replaced by the Q58c store (recent_rows or a current index, on R25's design). Probes are coalesced into one in-flight probe per replica in this round. Tests import src through tsx, never dist. | V-P2Q N4, N5, N8 |
| Q72g native in broker mode | Every broker-mode wiring passes `awaitBasisMs: 2000` (the Q58a default) until the core native facade exists; receipts are measured at the claimed head. | V-P2Q N7, m3 |

## Q73: EXP-D01b-112 readings for W0-1.1.3
| Q | Ruling | Basis |
| --- | --- | --- |
| Q73a deep writes | A publish or receive payload of any nesting depth is copied and written exactly (A13 applies to the writer as well as the reader). W0-1.1.3 adds a synthetic publish case with a payload of 20,000 nested arrays, delivered and stored unchanged. | EXP-D01b-112 SPEC-AMBIGUITY 1 |
| Q73b waiting at done + 1 | An inconsistent receiver snapshot with a waiting entry at done + 1 is kept as given (A15); an arriving seq equal to that entry is a duplicate, so the entry is never released. W0-1.1.3 adds a synthetic receive case: state {done 2, waiting [seq 3]}, deliveries [seq 3, seq 5]; projection applies 3 and 5, effects apply nothing, waiting [3, 5]. | EXP-D01b-112 SPEC-AMBIGUITY 2; A15 |

## Q78: lane D (Datomic) design decisions (R29)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q78e erasure and tenancy | Erasure is crypto-shredding first and excision of ciphertext second (batched, since excision is heavy); tenant isolation is one database per tenant. Whether a shared dev storage file satisfies storage-layer isolation, and whether dev storage is acceptable for final acceptance, are Sam's calls (pending). | R29 open questions |

## Q80: V-O05 findings (O-OBS round 2, after R27)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q80a trusted context | O-OBS judges evidence only inside an evaluator-owned, contract-bound case and run context (obligation, case, witness kind, threshold ids, run id) and against collector objects the evaluator retained itself; evidence that only hashes itself is REFUSED. The collector and context format comes from R27. | V-O05 F1, F2 |
| Q80b witnesses prove, labels do not | Each fault transition and each wait bound has a witness schema of source-bound events (start, end, readback) checked against retained objects; a label naming the transition or the duration is never evidence of it. | V-O05 F3, F5 |
| Q80c exact ratios | Work ratios compare integer counters exactly against rational contract thresholds (cross-multiplication), never binary64. | V-O05 F4 |

## Q81: E01 delta check (round 3)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q81b counter, every request kind | Q77c applies to every request kind: an HTTP GET (or any method) the QLever counter does not positively classify as a read counts as a write; after a pgwire parser exception the connection's remaining traffic is counted as writes (or the connection refused) and survives tally resets. | CX-VC8-2 |
| Q81c default-off is byte-identical | An option that is off by default leaves every public client contract unchanged: J01's text-array binding becomes an explicit parameter descriptor used only by compact guards; untagged arrays keep their existing JSON handling; a differential public-client test with the option off proves it. The compact-on qualification (G1 off and on, each lane, receipts binding the encoding) runs on an exclusive slot before compact-on is used anywhere. | CX-VJ01 F1, F2 |

## Q82: R27 evidence sources and the collector format (O-OBS round 2; collector sidecar later)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q82a source kinds | O-OBS enforces six kinds in trust order: EI engine-internal, TO transport-observed (a wire proxy in a separate process), HO host-observed (cgroup, /proc, sockets, file scans), DR durable read-back, HR harness-observed (caller-side fields only), CR reported by Triplex code (rejected; includes the Datomic gateway, the broker's own timestamps, and a counter inside the client process). `source.kind` is `<code>/<engine>/<sourceId>`. | R27 section 3 |
| Q82b two agreeing sources for safety | OBS-NO-MUTATION, OBS-PREABORT, OBS-CANCEL and OBS-ACK-ORDER pass only when two sources of different kinds agree. | R27 |
| Q82c obs-bundle/1 | Evidence arrives as an obs-bundle/1 written by an observer sidecar per engine container that engine.mjs starts (never builder code): content-addressed raw chunks, a hash chain per stream, HMAC-SHA256 chunk headers under a per-run key the SUT never sees, a witness log of chain heads written only by orchestrator tooling, a clock bridge with stated uncertainty, and hash-pinned normalizer scripts that O-OBS reruns; records are recomputed from raw bytes, never accepted as given. Because every agent runs as one macOS user, acceptance additionally repeats the collection by the verifier (ACCEPTANCE 5.8); the bundle alone suffices only for screening. | R27 section 6; CA01 |
| Q82d erasure scans need positive controls | Every erasure-scan location first finds a canary written before the erasure with the same scanner, or the verdict is REFUSED (QLever's FSST-compressed vocabulary defeats plain grep). Observer outputs (QLever metrics log, XTDB DEBUG logs and spans, proxy captures, docker logs), old index generations and freed blocks join PROTECTED_COPY_INVENTORY. | R27 section 8 |
| Q82e engine facts | XTDB mutation evidence is the gauge node.tx.latestCompletedTxId, never source-log offsets (flushes and compaction append to the log); XTDB EXPLAIN ANALYZE attributes are JSON (scan_rows_read, scan_pages_used, scan_files_used), and the P4 harness's decoding (p4.mjs:29) is fixed to read them; QLever runs with --enable-metrics and its per-query metrics log on. Lane D CANCEL and PREABORT use host-observed per-thread /proc series of the gateway JVM plus the proxy (HO + TO). | R27 sections 4-5 |

## Q83: R30 freeze protocol for XTDB slots (K01 round 2)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q83a log4j flag on slots | Slots s1-s3 add `-Dlog4j2.shutdownHookEnabled=false` to javaOpts, so XTDB's shutdown hook can log `Stopping node...`, the three server-stopped lines and `Node stopped.` (Log4j's own hook otherwise drops them). The dev residents are unchanged. This changes the slot config hash and therefore every golden key; receipts before the change name the old hash. | R30 Q1, decision D1 |
| Q83b canonical freeze state | Settled = two finish-blocks (the second records the post-compaction catalog), compactor jobs 0, and snapshot-independent evidence (new block file whose tx_id and latest_processed_msg_id equal the node gauges, block.last_upload_time advanced, xt.trie_stats showing the new tries, file listing and trie digest unchanged over three readings 5 s apart); never `xt.live_tables` (stale shared snapshot, upstream #6174). Clean stop = exit within 10 s with the stop lines and exit 143, well-formed LOG and REPLICA_LOG tails checked offline, empty `buffers/**/.tmp` (refuse, never delete). The freeze fingerprint is taken on a reference start of the source after the copy, and every arm, fresh or cloned, starts the same way. Re-test the second finish-block and the reference start when XTDB 2.2.1 is pinned. | R30 Q2, Q3, Q5; decision D2 |
| Q83c block listing | Never read a block that may not exist (MemoryCache hangs the caller): list `buffers/v06/blocks/b*.binpb` first and query `xt.block_files` only for listed indices, re-listing just before each query; block numbers are not dense (GC keeps the latest 10). | R30 Q4 |

## Q84: R25 the broker's SQLite file (log of record, H1 current rows, pinned readers)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q84a pragmas and lock | WAL, synchronous=FULL, fullfsync=ON on every non-readonly connection, checkpoint_fullfsync=ON, wal_autocheckpoint=0, journal_size_limit=16 MiB, locking NORMAL (not EXCLUSIVE); the single writer holds a SQLite exclusive lock on a separate broker.lock file for the life of the process (replaces the perl flock helper); assert SQLite >= 3.51.3 at open. | R25 design; 80 writer SIGKILLs, 0 acked commits lost; two unlocked writers both acknowledged |
| Q84b threads | One writer worker thread owns the read-write commit connection; one checkpointer thread runs wal_checkpoint(PASSIVE) every 4 s on its own connection; four reader threads with readonly connections fed over MessagePort; the main thread never touches broker.db. Backstop: above 64 MiB of WAL the writer closes a gate, readers park between transactions, the writer runs RESTART. | R25: PASSIVE on the writer thread starved (WAL 714 MB); the checkpointer held 16-38 MB; four readers ~20k reads/s against ~7.6k for one owner thread |
| Q84c pinned reads | Every read transaction starts with `SELECT lsn, epoch, h FROM marker` and is served only when h <= B <= lsn, else routed to the source; one unit of work per transaction (one pull or one 64-subject page). Long work keeps its basis through a retention pin (pinBasis holds H <= B), never an open read transaction. | R25: 30 s sweep transactions grew the WAL to 504 MB; per-page transactions held 16 MB |
| Q84d H1 in the same file | H1's current rows live in broker.db as live_rows and retired_rows clustered by entity, written in the commit's own transaction, so W is always the snapshot's marker. | R25: 3-hop pulls 0.10 ms p50; rows examined flat across history depth; +0.06-0.07 ms per commit; 20,000-subject pinned sweep 2.09 s with 0 mismatches |
| Q84e start-up | Lock, open (recovery), PASSIVE (sync adopted frames), bump the epoch, run the marker and ACKED-sidecar cross-checks, then start readers; a mid-WAL corruption that SQLite recovers silently is caught by the ACKED sidecar. | R25 durability section |
| Q83d settle evidence after fast compaction | Settle evidence does not require observing L0 tries: compaction may merge them before the first poll. Settled means the new block's tx_id and latest_processed_msg_id equal the node gauges, xt.trie_stats covers that block at whatever level it now sits, compactor jobs 0, and the file listing and trie digest are unchanged over three readings 5 s apart. | K01 round 2 (G3 blocked by fast compaction) |
