# Rulings recorded but not yet compiled (Q38c: RULINGS.md holds only compiled or explicitly listed entries)

These move into RULINGS.md when the contract version that compiles them is built.

## Q51b: EXP-P2X feed lag on XTDB (not compiled in 0.3.8: an experiment direction with no contract effect)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q51b feed lag on XTDB | The next XTDB P2/P3 experiment puts XTDB behind the same host log and broker as EXP-P2Q (EXP-P2B: XTDB as the replica, current and history layer), since that composition measured feed lag p99 12.8-24.5 ms and an ACK independent of the engine. The subject-stamp path stays the XTDB-native arm (A1) to compare against; a separate consumer database through ATTACH is not pursued unless P2B fails. | both engines stay candidates for every layer; fewer moving parts |

## Q73: EXP-D01b-112 readings for W0-1.1.3
| Q | Ruling | Basis |
| --- | --- | --- |
| Q73a deep writes | A publish or receive payload of any nesting depth is copied and written exactly (A13 applies to the writer as well as the reader). W0-1.1.3 adds a synthetic publish case with a payload of 20,000 nested arrays, delivered and stored unchanged. | EXP-D01b-112 SPEC-AMBIGUITY 1 |
| Q73b waiting at done + 1 | An inconsistent receiver snapshot with a waiting entry at done + 1 is kept as given (A15); an arriving seq equal to that entry is a duplicate, so the entry is never released. W0-1.1.3 adds a synthetic receive case: state {done 2, waiting [seq 3]}, deliveries [seq 3, seq 5]; projection applies 3 and 5, effects apply nothing, waiting [3, 5]. | EXP-D01b-112 SPEC-AMBIGUITY 2; A15 |

## Q78: lane D (Datomic) design decisions (R29)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q78e erasure and tenancy | Erasure is crypto-shredding first and excision of ciphertext second (batched, since excision is heavy); tenant isolation is one database per tenant. Whether a shared dev storage file satisfies storage-layer isolation, and whether dev storage is acceptable for final acceptance, are Sam's calls (pending). | R29 open questions |

## Q81: E01 delta check (round 3)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q81b counter, every request kind | Q77c applies to every request kind: an HTTP GET (or any method) the QLever counter does not positively classify as a read counts as a write; after a pgwire parser exception the connection's remaining traffic is counted as writes (or the connection refused) and survives tally resets. | CX-VC8-2 |
| Q81c default-off is byte-identical | An option that is off by default leaves every public client contract unchanged: J01's text-array binding becomes an explicit parameter descriptor used only by compact guards; untagged arrays keep their existing JSON handling; a differential public-client test with the option off proves it. The compact-on qualification (G1 off and on, each lane, receipts binding the encoding) runs on an exclusive slot before compact-on is used anywhere. | CX-VJ01 F1, F2 |

## Q86: R28 isolation for the executing gate (EXP-G03)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q86g VM hardening (Sam) | Narrowing the triplex2 VM's mounts (H1: today colima mounts $HOME writable, so every Docker socket holder can write anywhere in Sam's home) and blocking outbound traffic from tx2 containers (H2; today the VM reaches every Mac 127.0.0.1 service including ports 15442 and 17019) change the VM's security settings and wait for Sam. Until then R1, R4, D1, D2, D3, L1 and N1-N4 stay on the named unprotected list. | R28 decision 1 |

## Q88: lane D storage (from R32)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q88a dev storage is development only | Lane D evidence from Datomic dev storage is DIAGNOSTIC for every durable-readback, lost-ACK, P2 receipt and final acceptance obligation. Dev storage is H2 inside the transactor with H2's default 500 ms write delay, so an abrupt transactor stop can lose acknowledged transactions, which P2's 100% receipt bar does not allow. Acceptance runs on SQL storage on PostgreSQL (fsync on commit) with peers on a SELECT-only role (closes R28's R5, the peer writing storage). Dev storage stays allowed for development gates. This decides the storage half of Q78e without loosening any of Sam's bars; the other option R32 lists (accept a declared loss window) would loosen P2 and is Sam's alone. | R32 sections 1, 6 |
| Q88b EXP-DA04 before DA03 | Lane D moves to SQL storage in EXP-DA04 (brief lab/experiments/EXP-DA04-sql-storage/BRIEF.md) before the DA03 NS smoke: resident pair Postgres 0.5 GiB plus Datomic 2.25 GiB in the existing 2.75 GiB budget (fallback 3.0 GiB if G1 runs short), exclusive lane D slot 4.0 GiB with the resident pair parked. Gates: G1 88/88 with --previous; durability probes D1 (abrupt transactor stop) and D2 (abrupt Postgres stop) with zero lost ACKs, D0 the same on dev storage as the control; tenancy probe; erasure inventory smoke. | R32 sections 2, 5 |
| Q88c erasure on lane D | Crypto-shredding is the primary PII erasure on every lane D storage; Datomic excision in batches of about 2,000 to 3,000 datoms is the second layer; keys live in their own Postgres schema so key deletion can be shown by scanning table files and WAL. | R32 section 4 |
| Q78e tenant isolation (Sam) | Still waiting for Sam: one Datomic transactor owns one storage table, so schemas or row security cannot split one system. Options: tiered (small tenants pooled per cell with per-tenant envelope keys, large tenants with their own schema, roles and transactor; R32's recommendation, matches R19), silo every tenant (one transactor each; proves storage isolation literally, infeasible at 1,000 tenants), or pool every tenant (isolation enforced at the gateway, not storage). | R32 section 3 |

## Q89: route equivalence (from R31)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q89a record time at decision (design first) | Record time is to be stamped when the commit is decided, monotone in position, on every lane (broker writer lock, XTDB engine stamp, Datomic transactor value), with a record-time watermark that gates a named T like a future position. Today `transact` stamps before allocating a position (TriplesLive.ts:309 before :326), so a recordedAt cut is not a log prefix and an answer at a named T can change after it was served (R31 D-C1). Because this changes the core receipt `instant`, a planner designs it (R33) and it lands with a contract version. | R31 5.1 |
| Q89b refuse what a route cannot answer | Until Q89a lands, every store that retires rows by position refuses any basis naming a record time: H1 (including its pull predicate, sqlite-worker.ts:158), R24's planned current store, and Datomic's `:f/live` path. | R31 5.3, 5.4 |
| Q89c typed refusal | A route that cannot answer a basis exactly fails with a typed error, never an empty result with a flag; every route waits then refuses for a future position (and, after Q89a, a future record time). | R31 5.5 |
| Q89d DA01 read pins | DA01's next round pins multi-request Datalog (rule rounds, final query, optional pulls) to one position or held db (D-D1), refuses future positions (D-D3), seeks the position-to-t map (D-D4) and enumerates by subject for getByEntities (D-D5). | R31 5.2, 5.5 |
| Q89e Datomic current/history | Datomic separates current from history at the index level; R18 line 97 is superseded. DA03's P4 path reads `:f/live` for latest and position shapes and falls back to `:f/subject` for record-time shapes (Q89b). | R31 2, 3 |
| Q89f route-equivalence gate | The harness of R31 section 4 lives in packages/testkit and is a required gate for every branch that adds or changes a read route (SQL01, EXP-P4, P2X, DA01, DA03, R24's current store). | R31 4 |
| Q89g public position token (Sam) | Waiting for Sam with Q89a: add a position or opaque snapshot token to the public TemporalBasis so callers can pin "the latest committed tx (named exactly)". It changes the public TypeScript API (goal 10). | R31 R31-g |
| Q89h P4 arm X1 guard | Before any promotion of P4 arm X1, an initialization probe refuses default bounds when any row in tx_assertions has native valid time (D-X2). | R31 5.6 |
