# Rulings recorded but not yet compiled (Q38c: RULINGS.md holds only compiled or explicitly listed entries)

These move into RULINGS.md when the contract version that compiles them is built.

## Q51b: EXP-P2X feed lag on XTDB (not compiled in 0.3.8: an experiment direction with no contract effect)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q51b feed lag on XTDB | The next XTDB P2/P3 experiment puts XTDB behind the same host log and broker as EXP-P2Q (EXP-P2B: XTDB as the replica, current and history layer), since that composition measured feed lag p99 12.8-24.5 ms and an ACK independent of the engine. The subject-stamp path stays the XTDB-native arm (A1) to compare against; a separate consumer database through ATTACH is not pursued unless P2B fails. | both engines stay candidates for every layer; fewer moving parts |

## Q70: V-O04e cursor continuations of in-flight reads (O-REPLAY 0.4.4)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q70a continuation view | Every `cursorFrom` continuation is answered from the source read's start, scope and prefixes, whether or not the source had commits in flight; a continuation's own readStart is never consulted. | V-O04e F7 |
| Q70b literal token | A literal cursor token equal to a `nextCursor` that a read with commits in flight issued earlier in the same case continues that read per prefix; token bytes and the cursor vectors stay unchanged. Any other literal token keeps today's rule (the query's own read view). | V-O04e F8, fix (b) |

## Q70 additions: what O-REPLAY 0.4.4 left undecided
| Q | Ruling | Basis |
| --- | --- | --- |
| Q70c any issuing read | Q70b extends to every read: a literal cursor token equal to a `nextCursor` issued earlier in the same case by any read, in flight or not, continues that read (its start, scope and prefixes). Only a token no earlier read issued uses the query's own read view. This closes the F7 hole reached through a literal token. | O-REPLAY 0.4.4 author, item 1 |
| Q70d equal tokens | When several earlier reads issued the same token, the continuation follows the latest of them in case order. | 0.4.4 author, item 2 |
| Q70e prefixes without the token | Prefixes whose pages did not issue the token are left out, the same as a prefix with no next cursor under `cursorFrom`. | 0.4.4 author, item 3 |

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

## Q70 additions: V-O04f gaps (O-REPLAY 0.4.6)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q70f ambiguous literal token | When the earlier reads that issued a literal token disagree in start, scope or per-prefix answers, the continuation fails closed with a typed X-NOT-MODELED "ambiguous literal token" (a fourth listed refusal site). Issuers with identical views continue as Q70d says. | V-O04f F9 |
| Q70g journal pagination | Q70c extends to the journal: a `transactions` call whose `after` equals a `next` that an earlier transactions page issued in the same case continues that read (its start and prefixes), one answer per prefix; an `after` no earlier page issued uses the call's own read view. | V-O04f F10 |

## Q74: R26 seed once, clone faithfully
| Q | Ruling | Basis |
| --- | --- | --- |
| Q74a who may clone | Screening and development receipts may be seeded by clone of a golden; the receipt records `seededBy: clone` with the golden key (adapter commit, world and seed-generator hash, driver seed options, image digest, engine config hash) and the golden's freeze fingerprint. Acceptance runs seed fresh (TARGETS 6). | R26 open question 2 |
| Q74b freeze state | The canonical freeze state is settled: `POST /system/finish-block`, compactor jobs 0, live index empty. A fresh-seeded arm compared with a cloned arm settles the same way before its window. Older unsettled A0 receipts are not compared with settled ones. | R26 open question 1 |
| Q74c validation first | No clone-seeded receipt counts, even for screening, until validation E1 passes: a fresh-seeded slot against its clone under the PAIR-0 A/A procedure, holding within 1.10 at p50 and 1.15 at p99, with R26 section 6.9's seven predictions checked. | R26 section 6.9 |
| Q74d readiness | A cloned slot is ready only after `/healthz/started` (read with `docker exec`) and the R26 C1-C8 checks pass, then the same warm-up on every arm. | R26 risk 2 |
| Q74e maintenance in every window | Runs that measure P1 force one `finish-block` at a fixed trace time in every window, on every arm, so a settled clone still has a maintenance event. | R26 note |
| Q74f disk | A golden or clone is made only when host free disk after the copy stays at or above 5 GiB; clone volumes are removed after each run. At the 10k rung (3.41 GiB per XTDB volume) that allows one clone at a time today. | R26 risk 4; host 8.7 GiB free |
| Q74g broker compositions | A broker composition clones the engine volume and the broker directory together, from one stopped moment. | R26 open question 3 |

## Q70 additions: O-REPLAY 0.4.6 author's choices and one journal gap (0.4.7)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q70h issuer views | Issuers are compared by view: start, scope, and the prefixes whose pages issued the token. Issuers with identical views and different page bodies (for example different limits reaching the same token) continue rather than refuse, because the continuation depends only on the view. | 0.4.6 author choice 1 |
| Q70i journal fail-closed | Q70f's fail-closed rule applies to a journal `after` issued by disagreeing pages too ("ambiguous journal after"); Q70g matching requires the same journal scope. | 0.4.6 author choices 2, 3 |
| Q70j journal in-flight scope | A `transactions` read decides which erasures are in flight from its own `scope` field, not from `cut.scope` or the default scope. | 0.4.6 author item 4 |
| Q70k read scope everywhere | Q70j applies to every read kind that takes a `scope` field (`transactions`, `transaction`, `transactionByCommand`, `transactionsForEntity`, `journalFacts`, `assertions`, `cutCatalog`, `history` with no cut): in-flight erasures come from the scope the read reads. Other kinds use their cut's scope. | O-REPLAY 0.4.7 author |

## Q75: V-E01 on claim.mjs 2796455 (E01 fix round 2; contract items for 0.3.11)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q75a evaluator integrity | At the start of every run, every evaluator-side file the run executes (claim.mjs, lib.mjs, gate.mjs, the reference and oracle runner files) is compared with its git blob at the evaluator's commit, read with `GIT_NO_REPLACE_OBJECTS=1`; a mismatch refuses the run and marks the checkout poisoned (EVALUATOR-TAMPERED) until restored from git. An edit made and restored inside one run stays on the named unprotected list until EXP-G03 isolates builds. | V-E01 F1 |
| Q75b trusted bytes first | Every oracle copy and every other trusted byte is read, hashed and copied before the first candidate process runs; the evaluator's git runs with `GIT_NO_REPLACE_OBJECTS=1` and checks each blob against its tree entry's object id. | V-E01 F2 |
| Q75c pinned runners | An oracle is pinned only when the contract lists sha256 for every runner file; COMPILED oracles (O-CONTRACT) are pinned that way through the contract's own outputs. A claim that depends on any oracle without such a list is DIAGNOSTIC (Q59e literally). build_contract.py's contractBlockers and claim.mjs's follow the same rule in contract 0.3.11. | V-E01 F2 contract conflict |
| Q75d toolchain | The identity records each resolved binary children run (node, pnpm, python3): path, sha256 and version; children run with PATH pinned to the recorded toolchain directory. | V-E01 F3 |
| Q75e links and modes | The identity walk uses lstat, refuses any symlink that resolves outside the checkout, and hashes file modes; configuration the evaluator does not apply is recorded as unbound, not hashed as if applied. | V-E01 F3, F10 |
| Q75f per-child environment | Every child process gets a fresh HOME and TMPDIR. | V-E01 F4 |
| Q75g comparators in O-REPLAY answers | A row comparator applies to each `queries[i]` entry's `result` (or its `inFlight.acceptable[j].result`) inside an O-REPLAY answer; `commandOutcomes` and `state` compare exactly. Contract 0.3.11 states this; until then those cases stay UNCOMPARABLE (fail closed). | V-E01 F5 |
| Q75h CMP-ERROR cause | Following compiled Q67h, `cause` is optional; when present it must be a structured object with `_tag` or `message`. | V-E01 F6; Q67h |
| Q75i evidence and paths | The run keeps the set of evidence hashes it wrote and requires every one at the end (deletion detected); every return path carries GATE-NOT-RUN from the run's start; end checks run inside the try. admitCore returns DIAGNOSTIC for `kind: "promotion"`, and admit_claim in the reference does the same in 0.3.11. | V-E01 F7, F8, F9 |
| Q75j report honesty | The unprotected list names F1's in-run restore, setsid, TOCTOU, no filesystem or network isolation; "double fork escapes" is corrected (it is killed). Q67i's "CMP-EXACT" reads as CMP-EXACT-VALUE; no comparator is plain byte equality, and hash equality applies only to case-result/1 documents. | V-E01 corrections; A01 0.3.10 note 5 |
| Q70l one continuation rule | Every paged read kind continues by one rule. The oracle keeps a table of paged kinds and their continuation parameter and issued value (entityPage: `cursor`/`cursorFrom` and `nextCursor`; `transactions`: `after` and `next`; `transactionsForEntity`: `beforePosition` and `nextBeforePosition`, matched on the same entity, scope and `snapshotPosition`). A continuation value equal to one an earlier page of the same kind and key issued continues that read's view (Q70a-c, Q70g); disagreeing issuers refuse (Q70f, Q70i); identical views continue (Q70d, Q70h). A self-check fails if any query kind whose output carries a `next*` field is missing from the table, so a new paged kind cannot be left on the old rule. | V-O04g F11; the F7-F12 pattern |
| Q70m typed continuation values | `after`, `beforePosition` and any other integer continuation parameter must be a JSON integer; a string, a float or a negative value makes the case malformed (exit 2), never a crash or a FAIL exit. Matching uses the parsed integer. | V-O04g F12, F13 |

## Q76: EXP-C8 open questions (reads never write)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q76a scale of closures | The single-read default's typed refusal above 1M edge rows (XTDB) or 100k (QLever) stands. Cheaper per-round reads (XTDB entity-keyed projection tables, a QLever IRI ledger, R10 6.4) belong to a later experiment on the P4 current structure (Q68a), since both need an id-keyed current copy. | C8 questions 1-3 |
| Q76b dead schema | `XtdbStorageAdapter.initialize` stops creating `tx_query_relations`; the C8 follow-up removes it after V-C8, so no read-path artefact remains in the schema. | C8 question 4 |
| Q76c tail constraints | A recursive rule shape a lane cannot answer is refused typed, never answered without its constraint. Core's SQL `compileRecursiveCTE` ignoring tail constraints is a correctness defect for the SQL adapters outside the two lanes; it is recorded in the capability matrix and fixed when a lane uses it. | C8 question 5 |
| Q76d WL20 supports | The C8 follow-up wires `countSimplePaths` into WL20 supports on both lanes, so supports are general rather than path lengths 1-3. | C8 question 6 |
| Q76e maintained-query publication | Maintained queries publish only from the change feed consumer (P3), never from a read; until that consumer exists, `query()` answers directly. | C8 question 7 |
| Q76f clean receipts | XTDB G1/G2 receipts for C8 are rerun on an exclusive slot after V-X02's; the overloaded-dev receipts stay as diagnostic. | C8 question 8 |
| Q70n completeness by execution | The Q70l completeness check runs every query kind registered in `run.QUERIES` on generated cases and inspects the actual output (top level, pages and nested objects) for any `next*` key; a kind whose output carries one and is not in `CONTINUATIONS` fails, and a kind that cannot be exercised fails conservatively. Static source matching may stay as an extra check, never as the only one. Negative controls: a computed key, a helper in another module, a nested dictionary. | V-O04h F14 |
| Q70o page selector typed | `cursorFrom.page` is an integer continuation parameter under Q70m: a JSON integer from 0 to the last page index, otherwise the case is malformed (exit 2); invalid reference shapes raise the oracle's input error, never an uncaught exception. | V-O04h F15 |

## Q77: V-C8 findings (C8 fix round)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q77a budgets are exact | Every accepted recursion budget is enforced with a typed refusal and never a partial or over-budget success: a confirmation read may not extend the answer past maxRounds; ruleClosure enforces maxRounds and maxVisited (or rejects budget fields it does not support). maxDepth keeps its Datalog meaning. | V-C8 F1, F2 |
| Q77b no recursion in counting | Path counting uses iterative DP over DAGs and an explicit stack for bounded cyclic enumeration; pathSteps refusal stays typed. | V-C8 F3 |
| Q77c counter fails closed on every unknown | The write counter positively classifies every operation it forwards; any multipart, prepared, portal or other operation it cannot classify counts as a write (or is refused). Classifications of prepared statements and portals survive tally resets, and Execute operations are what is counted. | V-C8 F4, F5 |

## Q78: lane D (Datomic) design decisions (R29)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q78a engine and storage | Datomic Pro 1.0.7745 (Apache 2.0 binaries, Java 17+), dev storage inside the transactor for DA00-DA02; SQL storage is a later arm only if io-stats show peer cache misses loading the transactor. The zip's sha256 is pinned by the lab, the bundled peer jar is cross-checked against Maven Central's sha1 and PGP signature. No Datomic source exists, so lane D has no engine-repair track; gaps get workarounds. | R29 sections 1, 2 |
| Q78b pool policy | `tx2-datomic-dev` (2.75 GiB: transactor heap 640m, gateway heap 1g) is a parkable resident: only the orchestrator parks it (`engine.mjs down`, volume kept). Lane D slot runs and lane X/Q exclusive-slot runs do not overlap with it running. | R29 pool section |
| Q78c access path | A thin Clojure gateway on the official Peer API speaking HTTP/1.1 + JSON with every value tagged (longs and entity ids as decimal strings); the gateway rejects query functions outside an allowlist (C8 floor). Rejected: peer-server with the undocumented Client wire protocol; the legacy REST server. | R29 section 3 |
| Q78d mapping | One Datomic database per Triplex scope; each assertion is a fact entity (`:f/id`, `:f/subject`, `:f/live`, `:f/attr`, one typed value attribute, valid-time bounds); commit metadata on the transaction entity; retraction retracts `:f/live`; a latest-basis read uses the current db, a past basis `as-of`, reads in a transaction `d/with`. One `:db/cas` per entity per transaction (Jepsen: operations inside one transaction apply as if concurrent). | R29 section 4 |
| Q78e erasure and tenancy | Erasure is crypto-shredding first and excision of ciphertext second (batched, since excision is heavy); tenant isolation is one database per tenant. Whether a shared dev storage file satisfies storage-layer isolation, and whether dev storage is acceptable for final acceptance, are Sam's calls (pending). | R29 open questions |

## Q79: V-X02 findings (X02 fix round)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q79a token-aware guards | Every SQL hazard guard runs on the same comment-aware token stream as the envelope, recognises quantified comparisons including the bare-expression operand, and keeps `UNION ALL` / `SELECT ALL` and supported subqueries; public-provider regression cases for the comment and bare forms. | V-X02 F1 |
| Q79b typed overflow | Checked int64 arithmetic yields a typed failure in the Effect error channel, never a defect; tests assert Fail (not Die) and recovery with catchTag in both languages. | V-X02 F2 |
| Q79c no silent rounding | Exact Datalog arithmetic (the five exact compute operators and anything downstream) never lowers through DECIMAL to BIGINT; it keeps the exact result as text through range checks and decoding, or refuses with a typed error until exact lowering exists. This is Sam's "no silent precision loss" rule and applies to core's compiler for every lane that uses it. | V-X02 F3; Q39a; SCOPE 2.4 |
| Q79d unset means unchanged | With the language switch unset, behaviour is main's; changing the default needs its own qualification and a ruling. | V-X02 F4 |

## Q80: V-O05 findings (O-OBS round 2, after R27)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q80a trusted context | O-OBS judges evidence only inside an evaluator-owned, contract-bound case and run context (obligation, case, witness kind, threshold ids, run id) and against collector objects the evaluator retained itself; evidence that only hashes itself is REFUSED. The collector and context format comes from R27. | V-O05 F1, F2 |
| Q80b witnesses prove, labels do not | Each fault transition and each wait bound has a witness schema of source-bound events (start, end, readback) checked against retained objects; a label naming the transition or the duration is never evidence of it. | V-O05 F3, F5 |
| Q80c exact ratios | Work ratios compare integer counters exactly against rational contract thresholds (cross-multiplication), never binary64. | V-O05 F4 |

## Q81: E01 delta check (round 3)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q81a final input checks | At the end of a run the evaluator re-checks every case input it handed out (present, same bytes) along with the evidence set; a deleted or rewritten input after its last use refuses the run (INPUT-TAMPERED). The guarantee is kept, not narrowed. | CX-VE01-3 |
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
| Q79e operand classification by grammar | The quantified-comparison guard classifies the operand by a small grammar, not by listed shapes: any parenthesized query expression (SELECT, VALUES, and set operations UNION / INTERSECT / EXCEPT with or without ALL, at any nesting of parentheses, with comments anywhere) is a subquery and is admitted if it contains no nested unsafe comparison; anything else is refused. Tests are generated from the grammar's combinations (each form at depths 1-3, with and without comments) and each generated query is checked against XTDB's own answer, next to the round-2 rejections. | CX-VX02-3: six parenthesized UNION ALL forms refused after round 3 |

## Q85: V-DA00 findings (fixed in the DA01 branch)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q85a create is idempotent and monotonic | Database creation for a scope is idempotent and never resets or lowers an existing scope position; concurrent creates converge on one database with its position intact. | V-DA00 F1 |
| Q85b public scopes | The gateway accepts every scope name the public Triplex constructor can produce (mapped to a Datomic database name by a documented, reversible encoding) and nothing else. | V-DA00 F2 |
| Q85c hermetic image builds | Every image build starts from a fresh context that contains only verified inputs listed in the input hash; a reused or dirty context refuses the build. | V-DA00 F3 |
| Q85d one codec definition | The TypeScript and JVM codecs share one specification of each value kind's range and representation, with a shared test vector set; a value either codec cannot represent is refused by both. | V-DA00 F4 |

## Q86: R28 isolation for the executing gate (EXP-G03)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q86a containers in the VM | Every candidate process (builds, case runners, lane D gateways, A0) runs in a hardened container in the triplex2 VM and none on the Mac: uid 10001, --cap-drop ALL, no-new-privileges, --read-only with tmpfs, memory = memory-swap, --pids-limit, --oom-score-adj 500, no Docker socket, no Mac bind mounts. Inputs enter as a tar of the contract's `boxInputs` (built packages, workspace manifests, lockfile; never lab/) plus a read-only Linux pnpm store volume filled by orchestrator tooling; outputs leave only through per-case `docker exec` stdout (capped, timed, hashed on receipt) and a trusted walker container. | R28 sections 4-5 |
| Q86b kill proven by the kernel | Each container has its own PID namespace; after every case `docker top` must show only the runner's processes and at teardown the container cgroup must be gone (read by the R27 observer), else the run fails closed. | R28; closes the setsid escape |
| Q86c network per arm | One internal network per arm with no gateway, whose only other member is a trusted relay to that arm's slot engine (R27's TO proxy in its own container); builds and offline cases use --network none; a preflight check runs every time and any failure marks the run ISOLATION-NOT-IN-FORCE (DIAGNOSTIC). | R28; N4 |
| Q86d execution-identity/2 | Adds the image id and build-input hash, the toolchain read inside the image, the store volume listing hash, a canonical isolation-profile hash checked against docker inspect, and daemon, containerd, runc and kernel versions; container names, cpusets and slot stay placement (Q67g). | R28 |
| Q86e no oracle in the candidate's reach | Oracle files never enter a candidate container and the candidate image has no python3 (closes oracle laundering, L1). The evaluator works from its own clone with commit ids passed explicitly, never `--authority-ref main` (closes D3, a builder moving main). | R28 L1, D3 |
| Q86f placement and lane D | Paired arms put each arm's SUT, relay and observer on one shared core; lane D's candidate gateway leaves the engine container for its own container, and lane D durable-readback evidence is not accepted until SQL storage replaces dev storage (the H2 password lets the gateway write storage directly). | R28 decisions 3, 5 |
| Q86g VM hardening (Sam) | Narrowing the triplex2 VM's mounts (H1: today colima mounts $HOME writable, so every Docker socket holder can write anywhere in Sam's home) and blocking outbound traffic from tx2 containers (H2; today the VM reaches every Mac 127.0.0.1 service including ports 15442 and 17019) change the VM's security settings and wait for Sam. Until then R1, R4, D1, D2, D3, L1 and N1-N4 stay on the named unprotected list. | R28 decision 1 |

## Q79f, Q87: X02 comment syntax; evaluator tests gate every contract merge
| Q | Ruling | Basis |
| --- | --- | --- |
| Q79f comments follow the pinned lexer | The X02 guard treats comments exactly as the pinned XTDB lexer does (SqlLexer.g4:12 defines BLOCK_COMMENT recursively): balanced nested block comments are consumed at any depth, an unterminated comment is an error, and the guard's tokenizer must agree with the lexer on every identifier boundary, including dollar-bearing, quoted and Unicode identifiers. Where the guard and the lexer disagree, the query is refused, never passed. | V-X02 round 4 F1-R4, F3-R4 |
| Q87 contract merges need the evaluator suite | A contract version merges into main only when lab/bin/test/claim.test.mjs and claim-round2.test.mjs pass on the contract branch merged with main, in addition to build_contract.py --verify and the contract's own tests. Contract 0.3.11 at 3b46c8a passed its review but fails 8 of 108 evaluator tests; its merge into main (e074baf) was undone before anything built on it. | orchestrator, 2026-11-08 |
