### EXP-DA04: lane D on SQL storage (PostgreSQL)

**North star.** Correctness floor under P2 and P3, and the precondition for every lane D P1 to P5 receipt being accepted (Q86f): an
acknowledged lane D commit must survive an abrupt stop of the transactor or of storage, so that lost-ACK resolution returns the original
receipt 100% of the time (TARGETS P2). Measured by the durability probe below: zero lost acknowledged commits on SQL storage across every
round, with dev storage as the control arm. Secondary: P1, because peer cache misses move from the transactor JVM to Postgres (Q78a's SQL
trigger); DA03 measures it.

**Scope.** `lab/SCOPE.md` (requirements: atomic idempotent commit with lost-ACK resolution, tenant isolation at the storage layer, real
erasure or crypto-shredding), `lab/NORTH-STAR.md`, `lab/TARGETS.md` sections 1 (P2), 3, 6 (GS.15), 7. Design source:
`/Users/sam/Claude/Projects/triplex-db-2/R32/R32-datomic-durable-storage.md` sections 1 to 4, and R29. Builds on the DA01 branch
(`exp/DA01-datomic-adapter`) after its Q85 round, because it edits the same gateway and engine code.

**Commander's intent.** At the end, `engine.mjs up --lane datomic --slot dev` brings up a Postgres companion and a Datomic container on
`protocol=sql`; the gateway reads storage with a SELECT-only role; G1 passes 88/88 plus the suite on it; and a probe shows, with receipts, that
acknowledged commits survive abrupt stops on SQL storage and do not on dev storage. DA03 can then measure P1 to P4 on the storage that will
be accepted.

**Steps.**
1. **Postgres companion in engine.mjs.** `slots.json` `lanes.datomic.storage`: Postgres image pinned by digest (PostgreSQL 17, newest minor
   at least two weeks old), `memBytes`, `cpus`, `shmSize`, a config file `lab/config/datomic/postgresql.conf` hashed into the effective
   config, its own volume `tx2-pgd-<slot>-data`, a user-defined network per slot. Companion lifecycle like the XTDB follower: same lock, one
   reservation per container, `down` keeps both volumes. The Postgres image is pulled by orchestrator tooling, not the builder.
2. **DDL owned by the lab** (`lab/config/datomic/pg-init.sql`): database `datomic`; per system a schema, an owner, a transactor role with
   SELECT, INSERT, UPDATE, DELETE on its `datomic_kvs`, a peer role with SELECT only, `search_path` set per role, `REVOKE ALL ON SCHEMA public
   FROM PUBLIC`, no grant to public. Table shape exactly as `bin/sql/postgres-table.sql` (`id text primary key, rev integer, map text, val
   bytea`). Passwords generated per volume, kept in the volume and in engine.mjs's runtime dir, never in git and never in the gateway's
   source.
3. **Transactor on SQL.** `transactor.properties` gains a `protocol=sql` variant (`sql-url`, `sql-user`, `sql-password`,
   `sql-driver-class=org.postgresql.Driver`); `host` and `alt-host` set to the container's network name. The entrypoint waits for Postgres
   (`pg_isready` is not in the JRE image, so a TCP check like the existing one) before starting the transactor.
4. **Gateway on the read-only role.** `base-uri` from an env variable (`datomic:sql://{db}?jdbc:postgresql://pgd:5432/datomic?user=...`).
   Run every gateway route and `d/request-index`, excise and `gc-storage` with the SELECT-only role; record which, if any, need a write. If a
   route needs one, route it through the transactor or record it as a residual; never widen the peer role silently.
5. **G0, then G1 88/88 plus the suite, then `--previous`**, on the SQL resident. Record `docker stats` peaks of both containers during G1.
6. **Durability probe** (`lab/experiments/EXP-DA04-sql-storage/durability.mjs`), the writer trace at its steady rate against throwaway
   scopes, each commit's receipt saved by the driver before the next is sent:
   - D1: abrupt process stop of the Datomic container (the power-loss case for the transactor process), at a seeded random moment, then
     `up`; resolve every saved receipt through `/operation/{id}`. 5 rounds, at least 1,000 acknowledged commits per round.
   - D2: abrupt process stop of the Postgres container while commits run; same resolution.
   - D0 control: D1 on dev storage, in a 1.5 GiB research-probe container (transactor `-Xmx512m`, gateway `-Xmx640m`), same seeds.
   - After each round: `d/request-index`, then a full read-back of every probe database (datom count and hash over `:eavt`) compared with
     O-REPLAY's answer from the saved receipts.
   - Record, do not run: a VM-level crash (it would stop the other lanes). Record `SHOW fsync, synchronous_commit, full_page_writes,
     wal_sync_method` in the receipt.
7. **Tenancy probe** (section 3.3 item 1): a second system and a 0.75 GiB second transactor while a slot is free; the cross-tenant reads
   must be refused by Postgres.
8. **Erasure smoke** (no GS.16 yet): plant a marker value in a probe database, excise it, `request-index`, `sync-excise`, `gc-storage` with
   a short older-than on the probe database only, `VACUUM FULL`, `CHECKPOINT`, `pg_switch_wal()`; scan the table files and `pg_wal` for the
   marker; report every place it is still found. This measures the inventory for TARGETS 7.3; it does not claim erasure.
9. **Retire dev storage as the resident.** The old dev volume `tx2-datomic-dev-data` is parked, not deleted, for 7 days as rollback; dev
   databases are not migrated (they are per-run test scopes). If a retained proof database must be kept, `bin/datomic backup-db` and
   `restore-db` move it ("backup and restore can migrate data between" storages `[D]` storage.html).

**Gates.**

| Gate | Pass condition |
| --- | --- |
| G0 | PASS on all three lanes |
| G1 | 88/88 plus the complete suite on the SQL resident, and the `--previous` rerun PASS |
| D1, D2 (SQL) | 0 lost acknowledged commits in every round; every receipt resolves to its original `{t, position}`; read-back hash equals O-REPLAY |
| D0 (dev control) | reported, not gated; expected to show losses; if it shows none in 5 rounds, say so and keep the source-based finding |
| Read-only peer | every gateway route passes with the SELECT-only role, or each failing operation is listed with its residual |
| Tenancy | Postgres refuses `t_a_peer` on `t_b`; tenant B's commit p99 with A's slowed consumer within 1.15x of its baseline (Q60 margin) |
| Memory | both containers stay below 85% of cap at G1 load; else the 3.0 GiB fallback (2.4) |
| Review | a Codex reviewer at high verifies the branch (PROTOCOL section 1); durability wording per PROTOCOL section 6 |

**Pool plan (who parks when).**

| Phase | Work | xtdb-dev | qlever-dev | Lane D | Other | Total of 11 GiB |
| --- | --- | --- | --- | --- | --- | --- |
| 0 now | DA01 round 2 on dev storage | 3.0 | 3.5 | datomic-dev 2.75 | s3 1.5 + obs 0.125 + G03 seed 0.06 | 10.94 |
| 1 offline | steps 1 to 4 on `datomic:mem` selftests and unit tests | 3.0 | 3.5 | datomic-dev 2.75 | as phase 0 | 10.94 |
| 2 switch | after DA01 round 2 commits: park datomic-dev (dev volume kept), up pgd-dev 0.5 + datomic-dev on SQL 2.25; steps 5 and 6 (D1, D2) | 3.0 | 3.5 | 2.75 | as phase 0 | 10.94 |
| 3 probes | after CX-OBS01 releases s3 (1.69 GiB freed): D0 control in a 1.5 GiB probe container, then the tenancy probe's 0.75 GiB second transactor | 3.0 | 3.5 | 2.75 | 1.5 then 0.75 | 10.75 then 10.0 |
| 4 DA03 | 10k NS smoke on datomic-s1: park pgd-dev and datomic-dev (2.75); up pgd-s1 1.0 + datomic-s1 3.0; obs sidecar and relay | 3.0 | 3.5 | s1 4.0 | 0.19 | about 10.7 |
| 5 after | park s1 pair, restore the resident pair | 3.0 | 3.5 | 2.75 | free for X/Q slots | 9.25 |

In phases 2 to 4, no X or Q exclusive slot runs with the lane D slot (Q78b). Only the orchestrator parks or starts residents (Q78b, CODEX
preamble rule 3). The DA01 builder is not interrupted: phase 2 starts at a commit point.

**Order relative to the queue.** DA04 goes before DA03 so DA03's P1 to P4 numbers are on the storage that can be accepted. DA02 (native
Datalog) can run on either storage and is not blocked.

