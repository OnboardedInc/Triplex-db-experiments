# R32: durable storage for lane D (Datomic Pro 1.0.7745)

**Written:** 2026-11-08 by planner R32 (Opus 5.5, high), under `lab/PROTOCOL.md`. **Moves:** the correctness floor under P2 (lost-ACK
resolution must return the original receipt 100% of the time) and the evidence base for P1 to P5 on lane D. **Scope:** `lab/SCOPE.md`
(requirements "real erasure or crypto-shredding of PII" and "tenant isolation at the storage layer"), `lab/NORTH-STAR.md`, `lab/TARGETS.md`
(sections 1, 3, 6 GS.15 and GS.16, 7). Rulings Q78a to Q78e, Q86f. Inherited homebase files were not used.

**Not done.** Research only. No container or engine was started, stopped or changed. Read-only `docker ps` and `docker inspect` on the
triplex2 socket only. No new download: the jar evidence comes from the Datomic zip DA00 already fetched and verified. H2 source was read from
the public h2database GitHub repository at tag `version-2.1.214` (the exact H2 jar bundled in the Datomic distribution, `lib/h2-2.1.214.jar`).

## Evidence labels

- `[S]` read in this repository or the da01 worktree at the path given.
- `[J]` read from the pinned Datomic 1.0.7745 distribution at
  `/Users/sam/Claude/Projects/triplex-db-2/downloads/datomic-pro-1.0.7745/extracted/datomic-pro-1.0.7745/`: config samples, SQL scripts,
  and the constant-pool strings of AOT-compiled classes in `datomic-transactor-pro-1.0.7745.jar`, dumped with a 30-line stdlib Python
  reader. No class was run or decompiled. Datomic publishes no source, so this is the closest thing to source evidence.
- `[H2]` H2 2.1.214 source, `h2/src/main/org/h2/...`, file and line given.
- `[D]` docs.datomic.com, fetched 2026-11-08. `[W]` other web sources. `[E]` my inference, not measured.

## 0. Answer

**Recommendation: move lane D from dev storage to SQL storage on PostgreSQL now, before EXP-DA03, inside the same 2.75 GiB resident
budget, and run DA03's 10k NS smoke on SQL storage. Dev storage stays only as the control arm of one durability probe and for mem/selftests.**

| # | Question | Answer | Confidence |
| --- | --- | --- | --- |
| 1 | Dev storage durability | Dev storage is Datomic's SQL storage code over an H2 2.1.214 database embedded in the transactor JVM, opened with H2 defaults. H2 acknowledges a commit before writing it to the file: with the default `WRITE_DELAY` of 500 ms, committed changes stay in the transactor's heap until a background writer runs, and H2 never fsyncs on commit. So an abrupt stop of the transactor process (OOM kill, `ExitOnOutOfMemoryError`, container kill) can lose up to about 0.5 s of transactions Datomic has already acknowledged; a VM or host crash can lose more and can leave the H2 file unrecoverable. SQL storage on Postgres with default settings fsyncs the WAL before each commit returns. Datomic calls dev storage "intended for development" and never lists it as a production storage. | High on the mechanism (source-visible); Medium on the exact window (not measured) |
| 2 | Storage choice and sizing | PostgreSQL in its own container. MySQL, Oracle, Cassandra and DynamoDB Local are worse fits (section 2.2). Resident: Postgres 0.5 GiB plus Datomic container 2.25 GiB = **2.75 GiB, unchanged**. Exclusive slot for DA03: Postgres 1.0 GiB plus Datomic container 3.0 GiB = **4.0 GiB**, with the lane D resident pair parked. | Medium (Postgres and heap sizes are estimates; the brief measures them) |
| 3 | Tenant isolation | Only a separate Datomic system per tenant (its own `datomic_kvs` table in its own Postgres schema, its own role, its own transactor) makes the storage itself refuse a cross-tenant read, which is what GS.15 asks. One database per tenant on shared storage isolates logs, indexes and bases but not storage access. Postgres schemas or row-level security cannot split one Datomic system, because one transactor owns exactly one table. Recommended for Q78e: tiered, as R19 already ruled provisionally: small tenants pooled per cell with per-tenant envelope keys, large tenants siloed. | High on what each proves; Medium on costs |
| 4 | Erasure | Excision is real but slow, batched, and leaves plaintext in old index segments until `gc-storage` (docs: older-than should be at least a month on a live system), then in the storage's own copies (Postgres heap, TOAST, WAL, backups; H2 old chunks). Crypto-shredding stays primary on every storage; the storage choice mostly decides where the key store lives and how its deletion is proven. Postgres makes both steps provable; dev storage does not. | High |
| 5 | Migration | **EXP-DA04 (SQL storage)**, ordered before DA03: Postgres companion under engine.mjs, transactor on `protocol=sql`, gateway on a SELECT-only Postgres role, G1 rerun, a durability probe (abrupt transactor stop and abrupt Postgres stop, dev storage as the control), a storage-layer tenancy probe. Pool plan in section 5.4. | Medium-High |

## 1. Dev storage: what it guarantees

### 1.1 What dev storage is

| Fact | Evidence |
| --- | --- |
| Datomic: "The dev storage protocol is intended for development. It runs an embedded JDBC server inside the transactor, and uses local disk files for storage." It is described for "interactive development where application peers and the transactor are colocated." | `[D]` https://docs.datomic.com/operation/storage.html |
| The storage page lists mem, dev, SQL (PostgreSQL, MySQL, Oracle), DynamoDB, DynamoDB Local, Cassandra3 and Cassandra-as-a-service. It labels none of them "production"; dev is the only one described as "intended for development". The Pro setup page says local development can "skip these steps and use Datomic's included dev storage", and that a production transactor needs a storage service set up first. | `[D]` storage.html; `[D]` https://docs.datomic.com/setup/pro-setup.html |
| Practitioner and staff statements (not re-fetched: the forum log returned HTTP 429) describe dev storage as a development convenience that shares resources with the transactor process. | `[W]` search summary of clojurians-log 2017-05-24 and 2016 threads; treat as secondary |
| The dev JDBC URL is `jdbc:h2:<data-dir>/datomic`, built by plain string concatenation with no H2 URL options. Remote peers use `jdbc:h2:tcp://<host>:<h2-port>/datomic`. | `[J]` classes `datomic/h2$sql_url`, `datomic/h2$local_jdbc_spec`, `datomic/h2$remote_jdbc_spec` |
| On first start the transactor runs `create table if not exists datomic_kvs (id varchar primary key, rev integer, map varchar, val bytea)`, `create user if not exists datomic password 'datomic'`, `grant all on datomic_kvs to datomic`, `grant all on datomic_kvs to public`. | `[J]` `datomic/h2$init_embedded$fn__31907` |
| The H2 TCP server is started inside the transactor with `-tcpPort`, `-ifExists`, `-baseDir`, and `-tcpAllowOthers` only when `storage-access=remote` (which requires both passwords to be set). | `[J]` `datomic/h2$init_tcp`, `datomic/h2$can_remote_QMARK_` |
| The storage layer is the same KV-over-SQL code for dev and SQL storage. It issues four statements, each as one autocommit JDBC statement: `insert into datomic_kvs (...)`, `update datomic_kvs set ... where id=? and rev=?` (compare-and-set on `rev`), `select id, rev, map, val from datomic_kvs where id = ?`, `delete from datomic_kvs where id = ?`. | `[J]` `datomic/sql$insert`, `$update`, `$update_with_nulls`, `$select`, `$delete` |
| The transactor jar contains no `WRITE_DELAY`, `CHECKPOINT` or other H2 durability setting anywhere in its string constants. | `[J]` full-jar string search |
| Lane D runs dev storage exactly this way: `protocol=dev`, `data-dir=/data` on the container volume, and the gateway connects to `datomic:dev://127.0.0.1:4334/`. | `[S]` `.claude/worktrees/da01/lab/config/datomic/transactor.properties`, `packages/datomic/gateway/src/triplex/gateway/main.clj:7` |

So Datomic's durability promise reduces to the backing database's durability for one autocommit statement. Datomic says it "always awaits
acknowledgment from storage before reporting that a transaction is complete" and that "A Datomic transaction is written to durable storage in
a single atomic write" `[D]` https://docs.datomic.com/transactions/acid.html. On dev storage, "acknowledgment from storage" is H2's return
from `executeUpdate`, inside the same JVM.

### 1.2 What H2 2.1.214 does on commit

| Step | What the source shows | Evidence |
| --- | --- | --- |
| Default write delay | `DEFAULT_WRITE_DELAY = 500` ms; on open, a persistent database reads `WRITE_DELAY` from the connection properties (default 500) and calls `setWriteDelay`, which sets the MVStore `autoCommitDelay`. Datomic's URL carries no `WRITE_DELAY`, so it is 500 ms. | `[H2]` `engine/Constants.java:222`, `engine/Database.java:379-380, 1732-1734` |
| Commit of a small transaction | `TransactionStore.endTransaction`: when the store is file-backed it calls `store.commit()` only if the transaction's undo log was already stored (`wasStored`, true only for large transactions) or `autoCommitDelay == 0`. Otherwise it writes nothing and only tries a commit when unsaved memory passes 3/4 of the auto-commit buffer. | `[H2]` `mvstore/tx/TransactionStore.java:600-645` |
| When changes reach the file | A background thread calls `tryCommit()` once `autoCommitDelay` has passed since the last write. | `[H2]` `mvstore/MVStore.java:3200-3215, 3395-3410` |
| fsync | `MVStore.commit()` serializes changed pages and writes them with `FileStore.writeFully`. `sync()` (which calls `FileChannel.force(true)`) is called only on close, file shrink and chunk compaction, never on commit. | `[H2]` `mvstore/MVStore.java:1457-1530, 1269, 1339, 1925, 2123-2177, 2261-2265`; `mvstore/FileStore.java:215-218` |
| H2's own statement | "This database does not guarantee that all committed transactions survive a power failure"; by default commits are delayed and a bit more than a second of commits can be lost after a power failure. | `[W]` https://h2database.com/html/advanced.html (Durability Problems); `SET WRITE_DELAY`: "The default is 500 ms." https://h2database.com/html/commands.html |
| Clean exit | H2 registers a closer at VM shutdown, and close commits and fsyncs. A graceful transactor stop (SIGTERM, shutdown hooks run) therefore keeps everything. | `[H2]` `engine/Database.java:382-384`, `mvstore/MVStore.java:1325-1345` |

### 1.3 What that means for lane D

```
  Triplex client          gateway peer            transactor JVM (one process)                 /data volume
  --------------          ------------            -----------------------------------------   ------------
  POST /transact  ----->  d/transact  ---------->  tx pipeline -> H2 INSERT (log segment)
                                                   H2 returns: change is in MVStore pages
                                                   in THIS heap only (no file write yet)
  receipt {t,P}  <-----   db-after    <----------  ack + novelty to peers
                                                   ... up to ~500 ms later ...
                                                   background writer: writeFully(chunk)  --->  page cache
                                                   (no fsync, ever, on this path)              disk: when the kernel flushes
```

| Event | Dev storage (H2 embedded) | SQL storage (Postgres, defaults `fsync=on`, `synchronous_commit=on`) |
| --- | --- | --- |
| Graceful stop of the transactor | no loss (close flushes and fsyncs) | no loss |
| Abrupt stop of the transactor process (OOM kill by the cgroup, `-XX:+ExitOnOutOfMemoryError`, `docker kill`, a crash) | **acknowledged transactions of the last write-delay window are lost** (they were only in the dying heap) `[E]` from the source above | no loss: the WAL record was flushed before Postgres answered the INSERT, and Postgres is a different process |
| Abrupt stop of the storage process | same event as the row above (storage is the transactor) | no loss: WAL replay on restart; the transactor fails its storage calls and must be restarted or reconnect |
| VM or host crash | loss of everything not yet flushed by the kernel (no fsync ever), and possible MVStore damage because chunk writes are not ordered by any barrier `[E]` | no loss of fsynced commits as far as the VM's virtual disk honors fsync; the same caveat applies to every lane on this VM `[E]` |

**Why this is worse than "a small window".** After an abrupt transactor stop on dev storage, the restarted transactor reads the log from H2
and continues from the last t that reached the file. Clients already hold receipts `{t, P}` for the lost transactions. Then:

1. `GET /operation/{id}` answers `absent` for a commit the client was told succeeded, which breaks TARGETS P2 ("Duplicates and lost ACKs
   return the original receipt 100% of the time") and goal 7.
2. A retry commits again under a different t, so the same Triplex position can be bound to two different Datomic transactions across the
   crash.
3. The same t values can be reissued with different content, so any copy of an old receipt, a feed checkpoint (P3) or a cached basis (P1)
   can point at a transaction that no longer exists or now means something else.

This is the lane D form of the durable-readback failure Q86f guards against. `slots.json` gives both lane D JVMs
`-XX:+ExitOnOutOfMemoryError` `[S]` `.claude/worktrees/da01/lab/config/slots.json:76`, and the pool has already OOM-killed `tx2-qlever-dev`
three times `[S]` `lab/STATE.md` infrastructure policy, so this path is not hypothetical.

**Torn index.** Datomic adopts a new index by writing segments and then a compare-and-set on the root row ("Conditional put of the index root
pointer guarantees atomic adoption of a new index" `[D]` acid.html; `update ... where id=? and rev=?` `[J]`). After an abrupt process stop,
H2 recovers to its last complete chunk, which holds a prefix of the statement sequence, so the root and the segments it names stay consistent
and no torn index is expected `[E]`. After a VM or host crash with no fsync, the kernel may have written a later chunk without an earlier one,
and a root could name a segment that is not in the file; Datomic would then fail reads with missing segments `[E]`. Postgres does not have
this failure mode: segment INSERTs and the root UPDATE are separate WAL-flushed commits, applied in order.

**A config-only mitigation exists but is not a fix.** An admin `SET WRITE_DELAY 0` makes H2 write on every commit (`autoCommitDelay == 0`
branch). It needs the storage admin password, its persistence across restarts is unclear in the open path (`Database.java:379` re-reads the
URL property), it still never fsyncs, and it changes nothing about R28's residual R5. Not recommended.

### 1.4 Other dev storage costs that bear on acceptance

| Issue | Evidence | Effect |
| --- | --- | --- |
| The peer user `datomic` has `grant all` on `datomic_kvs`, and so does `public`; dev storage has one peer credential. | `[J]` `h2$init_embedded$fn__31907` | Confirms R28 residual R5: any process with the peer password can write storage behind the transactor. Q86f's refusal of lane D durable-readback evidence is correct. |
| Storage reads by peers are served by the transactor JVM. | `[D]` storage.html; R29 1.2 | Peer cache misses compete with transaction processing (R29's own P1 risk 2). |
| One H2 file holds every database of every tenant. | `[J]` single URL `<data-dir>/datomic` | One damaged file loses every tenant at once. |

**Verdict on question 1.** Dev storage's acknowledgment means "in the transactor's heap". It can lose acknowledged transactions on an abrupt
process stop and has no crash guarantee at all; Datomic presents it as a development storage. It is fit for G1/G2 development loops, not for
any durable-readback, P2 lost-ACK or final acceptance claim.

## 2. SQL storage in our pool

### 2.1 Current pool (read 2026-11-08 from `lab/locks/pool.json` and `docker inspect`)

| Container | Cap GiB | Note |
| --- | --- | --- |
| tx2-xtdb-dev | 3.0 | resident |
| tx2-qlever-dev | 3.5 | resident |
| tx2-datomic-dev | 2.75 | resident, parkable, dev storage, cpuset 0,1 |
| tx2-xtdb-s3 | 1.5 | CX-OBS01 slot run |
| tx2-obs-xtdb-s3 | 0.125 | observer |
| tx2-g03-...-seed | 0.0625 | G03 seed |
| **Total** | **10.94 of 11** | VM 6 CPUs, 12 GiB |

Measured lane D RSS (DA00, dev storage): idle transactor 352 to 366 MiB and gateway 311 to 317 MiB (container 618 to 626 MiB); after 100
database creations transactor 568 to 570 MiB with 878 to 879 threads and gateway 519 to 523 MiB with 374 to 375 threads (container 1.04 GiB)
`[S]` `.claude/worktrees/da01/lab/experiments/EXP-DA00-datomic-bringup/receipts/final/measurements-1.json`. That is about 8 transactor
threads and 3.4 gateway threads per database, which matters for tenancy (section 3).

### 2.2 Which storage

| Storage | Fits locally | Durability on ack | Isolation tools | Extra cost | Verdict |
| --- | --- | --- | --- | --- | --- |
| **PostgreSQL** (container) | yes, 0.5 to 1 GiB | WAL fsync before each commit returns (defaults) | roles, schemas, `GRANT SELECT` for a read-only peer role, `pg_stat_*` counters | none: the driver ships with the transactor (`lib/postgresql-42.7.11.jar` `[J]`), scripts in `bin/sql/postgres-*.sql` `[J]`, documented path `[D]` storage.html | **Chosen** |
| MySQL or MariaDB | yes, about 0.5 GiB | InnoDB with `innodb_flush_log_at_trx_commit=1` | users, databases | driver not bundled: a new jar in the transactor's `lib/` and the peer classpath `[D]` storage.html; licence check | no advantage over Postgres; rejected |
| Oracle | XE needs about 2 GiB and an Oracle licence | yes | yes | driver not bundled | rejected |
| Cassandra3 | a single node needs 1 to 2 GiB heap; Datomic warns against multi-datacenter clusters `[D]` storage.html | depends on commit log sync mode | keyspaces | heaviest local footprint | rejected |
| DynamoDB Local | yes, about 0.3 to 0.5 GiB `[E]` | AWS ships it as a testing tool, not a durable service `[E]` | none locally (no IAM) | Java process, its own file store | rejected: replaces one development storage with another, as the orchestrator expected |
| H2 as a standalone SQL server | yes | no fsync on commit (section 1.2) | users | unsupported pairing | rejected for the same reason dev is |

### 2.3 Topology with SQL storage

```
 resident pair (2.75 GiB total, same budget as today)
 +---------------------------------------------+     +--------------------------------+
 | tx2-datomic-dev  (2.25 GiB, cpuset 0,1)     |     | tx2-pgd-dev  (0.5 GiB, cpus 1) |
 |  JVM transactor  protocol=sql   CPU 0  -----+-rw->|  postgres  db "datomic"        |
 |    role tx2_tx: SELECT INSERT UPDATE DELETE |     |  schema per system             |
 |  JVM gateway peer                CPU 1  ----+-ro->|  table datomic_kvs             |
 |    role tx2_peer: SELECT only               |     |  fsync=on synchronous_commit=on|
 |    transactions -> transactor :4334         |     |  volume tx2-pgd-dev-data       |
 +---------------------------------------------+     +--------------------------------+
       one user-defined network tx2-lane-d-dev (both containers), gateway port 8470 published as today
```

1. **Two containers, not one.** Postgres is a separate process with its own volume and its own cap, so an abrupt transactor stop does not
   touch storage. It follows the XTDB follower pattern already in engine.mjs (a companion container under the slot's lock and reservation,
   `[S]` `lab/config/slots.json` `lanes.xtdb.follower`). It also prepares Q86f: in G03 the candidate gateway gets its own container and its
   relay forwards Postgres 5432 (read-only role) and transactor 4334.
2. **The peer gets a SELECT-only role.** Peers read storage and ask the transactor to write `[W]` Datomic architecture overview and
   clojurians-log 2020-06-24 (search summary); `[E]` that the peer issues no storage writes at all. The brief probes every gateway operation
   with the read-only role (create, delete, transact, q, pull, sync, request-index, excise, gc-storage) and records which ones fail. If all
   pass, R5 closes. The lab writes its own DDL: the shipped `postgres-table.sql` grants ALL to `public` `[J]`, and Datomic's own Heroku
   guidance says to "remove the public grant" `[D]` storage.html.
3. **The transactor learns nothing new.** `protocol=sql`, `sql-url=jdbc:postgresql://pgd:5432/datomic`, `sql-user`, `sql-password`,
   `sql-driver-class=org.postgresql.Driver` `[J]` `config/samples/sql-transactor-template.properties`. The gateway URI becomes
   `datomic:sql://<db>?jdbc:postgresql://pgd:5432/datomic?user=tx2_peer&password=...`; `base-uri` in `main.clj:7` moves to an env variable.
   The schema is selected by the role's `search_path` (`ALTER ROLE ... SET search_path`), because Datomic's statements use the unqualified
   name `datomic_kvs` `[J]`.
4. **Postgres version and image.** PostgreSQL 17, the newest minor at least two weeks old, pinned by digest like the other lanes; the builder
   records tag and digest. The bundled pgjdbc 42.7.11 supports it `[E]`. Postgres 12 and later still accept the script's `WITH (OIDS=FALSE)`
   `[E]`, but the lab writes its own DDL anyway.

### 2.4 Sizing

Datomic sizing rules: the transactor heap covers `memory-index-max` plus `object-cache-max` plus headroom; peers may hold up to
`memory-index-max` per connected database; the sample production settings target 4 GiB; the dev-laptop template uses `memory-index-max=256m`,
`object-cache-max=128m` at 1 GiB `[D]` https://docs.datomic.com/operation/capacity.html; `[J]` `config/samples/*-transactor-template.properties`.
With SQL storage the transactor no longer hosts H2 or serves peer reads, so its heap need does not grow `[E]`.

**Resident (replaces today's tx2-datomic-dev, same 2.75 GiB):**

| Piece | Cap | Settings | Why |
| --- | --- | --- | --- |
| tx2-pgd-dev | 0.5 GiB, `--cpus 1`, `--shm-size 128m` | `shared_buffers=128MB`, `effective_cache_size=256MB`, `work_mem=4MB`, `maintenance_work_mem=64MB`, `max_connections=30`, `max_wal_size=512MB`, `fsync=on`, `synchronous_commit=on`, `full_page_writes=on` (asserted into the effective-config hash) | about 12 transactor connections (write-concurrency 4, read-concurrency 8 `[J]` template) plus the peer pool; dev data is small (4 GiB disk forecast) |
| tx2-datomic-dev transactor | `-Xms640m -Xmx640m`, `memory-index-max=192m`, `object-cache-max=96m` | unchanged from today | DA00 measured 570 MiB RSS after 100 databases |
| tx2-datomic-dev gateway | `-Xms896m -Xmx896m`, `datomic.objectCacheMax=288m` | down from 1g / 320m | container cap 2.25 GiB; DA00 measured 523 MiB gateway RSS |
| **Total** | **2.75 GiB** | | **fallback:** if G1 on SQL shows the gateway above 85% of its cap or GC time above 5%, restore the 1g gateway and run the pair at 3.0 GiB (pool 11.19 with today's s3 run, so only after s3 releases) |

**Exclusive slot for EXP-DA03 (10k NS smoke, R29 section 8):**

| Piece | Cap | CPUs | Settings |
| --- | --- | --- | --- |
| tx2-pgd-s1 | 1.0 GiB | cpuset 1 | `shared_buffers=256MB`, `effective_cache_size=640MB`, `max_connections=40`, `max_wal_size=1GB`, same durability settings |
| tx2-datomic-s1 transactor | in a 3.0 GiB container | cpuset 0 | `-Xms1g -Xmx1g`, `memory-index-max=256m`, `object-cache-max=192m` (R29's slot values) |
| tx2-datomic-s1 gateway | same container | cpuset 2,3 | `-Xms1536m -Xmx1536m`, `datomic.objectCacheMax=768m` (down from R29's 1792m/896m to make room for Postgres) |
| **Total** | **4.0 GiB** | 4 of 6 VM CPUs | disk forecast 8 GiB (R29) |

Data size at the 10k rung `[E]`: about 10k subjects times 50 to 200 facts times about 6 datoms per fact (R29 4.2) is 3 to 12 million datoms;
"Expect every datom to be stored at least 3 times" and 1,000 to 20,000 datoms per segment of up to about 50 KB `[D]` capacity.html give
roughly 0.5 to 2 GiB in `datomic_kvs` plus WAL. A 768 MiB peer object cache then holds a large share of the hot set but not all of it, so
P1 and P4 will see Postgres reads; DA03 records io-stats storage reads per read and `pg_stat_user_tables` counters per window.

**CPU.** At the trace's rate (R29: about 1.5 commands/s) Postgres CPU is small: one WAL-flushed INSERT per transaction log write, plus segment
writes during indexing jobs `[E]`. The P2 cost to expect is one WAL fsync per commit inside the VM, about 0.5 to 3 ms `[E]`, inside the P2
bar (p50 10 ms, p99 50 ms) but real. The P1 gain is structural: peer cache misses go to Postgres, not to the transactor JVM (R29's P1 risk 2
and Q78a's stated trigger for the SQL arm).

**Pool arithmetic for the DA03 window.** xtdb-dev 3.0 + qlever-dev 3.5 + slot 4.0 = 10.5 GiB, plus an observer sidecar (0.125) and a relay
(0.0625) = about 10.7 GiB. The lane D resident pair (2.75) is parked; no X or Q exclusive slot runs at the same time (Q78b as today); a G03
runner (0.75 GiB) does not fit, so DA03 runs NS, not the G03 executing gate. The two dev residents are unpinned today
(`cpuset` empty `[S]` docker inspect); during the measured window they should be idle or moved to CPUs 4 and 5 (a `docker update`, an
orchestrator action).

## 3. Tenant isolation at the storage layer

### 3.1 The constraint that decides it

One Datomic system is one transactor writing one storage location: the SQL transactor has one `sql-url` `[J]` template, and every statement
targets the literal table `datomic_kvs` `[J]`. A system hosts many databases, and those databases "share and compete for" the process's
resources; Datomic advises giving "large and/or mission-critical databases their own dedicated transactor and peer processes", while "hundreds
of small databases" on one system is common for staging or CI `[D]` capacity.html. Segment keys are not tagged by database in any way a SQL
policy can rely on `[E]`, so neither Postgres schemas nor row-level security can split one system's table by tenant.

GS.15's expected outcome is "The access fails at the storage layer" `[S]` `lab/TARGETS.md` section 6.

### 3.2 Options

| Option | What it is | What it proves | What it does not prove | Cost per tenant | 1,000 small tenants (GS.15) |
| --- | --- | --- | --- | --- | --- |
| **A. Pooled:** one Datomic database per tenant on one shared system | today's mapping (Q78d) on dev or SQL storage | separate log, indexes, basis t and feed per tenant; a query runs against one tenant's db value; per-tenant delete | storage does not refuse: any holder of the system's peer credential can connect to any tenant's database and read its segments. On dev storage it can also write them (R5). | about 8 transactor threads and 3.4 gateway threads per database `[S]` DA00; up to `memory-index-max` per connected database in the peer `[D]` | one transactor with about 8,000 threads and 1,000 memory indexes: a scale risk GS.15 must measure |
| **A+E. Pooled with per-tenant envelope keys** | A, plus every PII value (and its order key, TARGETS 7.4) encrypted under a tenant key held outside Datomic | a cross-tenant storage read yields only ciphertext for protected values | entity ids, attribute keys, subject ids, positions and times stay plaintext; the storage still answers the read | key service calls and a ciphertext codec | same as A; this is R19's provisional "pooled cell" reading (`lab/STATE.md` R19 tenancy) |
| **B. Siloed:** a Datomic system per tenant: own Postgres schema with its own `datomic_kvs`, own transactor role and SELECT-only peer role, own transactor | storage per tenant inside one Postgres instance | **GS.15 literally:** tenant A's role gets "permission denied" on tenant B's schema; separate transactor, memory index and write pipeline, so one tenant's load or crash cannot stall another's commits | process-level separation of the database server itself (one Postgres instance) | one transactor JVM per tenant, about 0.5 to 0.7 GiB RSS at a 384 to 512 MiB heap `[E]` from DA00's 352 to 570 MiB; one connection pool | infeasible: about 500 GiB of transactors |
| **B'. Siloed on separate Postgres instances** | B with one Postgres container per tenant | B plus separate storage processes, volumes and caps | nothing more for GS.15 | B plus 0.3 to 0.5 GiB per tenant | infeasible |
| **C. Postgres schemas or RLS inside one system** | split one system's table | not possible (3.1) | n/a | n/a | n/a. Schemas are only useful as the mechanism of B. |
| **D. Tiered (recommended)** | small tenants pooled per cell (A+E), each cell its own system with its own schema and roles; large tenants siloed (B) | GS.15 for large tenants exactly; for small tenants the blast radius of a credential is one cell, and protected values are ciphertext across tenants | storage-layer refusal between two small tenants in the same cell | one transactor per cell plus one per large tenant | for example 1 cell of 1,000 tenants plus 1 silo for the 1m tenant: 2 transactors |

### 3.3 What the lab can show inside the pool

1. **Tenancy probe (part of EXP-DA04):** a second system on the resident Postgres (schema `t_b`, roles `t_b_tx` and `t_b_peer`) and a second
   transactor container at 0.75 GiB (`-Xmx384m`), run only while s3 or another slot is free. Checks: `t_a_peer` reading `t_b.datomic_kvs` is
   refused by Postgres; a gateway connecting with tenant A's URI to tenant B's database name fails; a 10x slowed feed consumer on A leaves B's
   commit p99 unchanged.
2. **GS.15 itself** (later, on a slot): one cell system with 1,000 small databases plus one silo system with the 1m-entity tenant, if the
   rung fits; otherwise the 100k rung, with the tenant counts reported.

### 3.4 Options to put to Sam on Q78e (isolation half)

1. **Tiered (recommended):** pooled cells with per-tenant envelope keys for small tenants count as storage-layer isolation; large tenants get
   their own Datomic system (own schema, roles, transactor). Same shape as R19's provisional ruling for the other lanes.
2. **Silo everyone:** only option B counts. Lane D then cannot run GS.15's 1,000 tenants locally and fails that scenario by cost; production
   cost is one transactor per tenant.
3. **Pooled everyone:** one database per tenant on one system counts. GS.15's "fails at the storage layer" is then judged at the gateway, not
   the storage, and lane D's receipt has to say so.

## 4. Erasure

### 4.1 What Datomic excision does

| Property | Evidence |
| --- | --- |
| The excised datoms leave the index and the log: "The resulting index (and all future indexes) will no longer contain the datoms" and "those same datoms will be removed from the transaction log". `:db.excise/attrs` limits it to attributes; `:db.excise/before` or `beforeT` to older transactions. | `[D]` https://docs.datomic.com/reference/excision.html |
| The transaction is atomic but the removal is not: it is "a background operation that occurs during the first indexing job after an excision transaction"; `sync-excise` waits for it. | `[D]` excision.html |
| Cost: "Try to avoid excising more than a few thousand datoms at a time on a live system"; large excisions cause back pressure and lower write availability. | `[D]` excision.html |
| Storage is not freed until `gc-storage`, which "should not be run with a current or recent time" and whose older-than "should be at least a month old" outside initial import. | `[D]` excision.html, capacity.html |
| "Excision is irrevocable", and "Every excision creates a permanent record" (the excise entity itself cannot be excised). | `[D]` excision.html |
| Not covered by the docs: existing backups, peer object caches, and `:db/noHistory` attributes ("cannot guarantee full removal"). | `[D]` excision.html |

So after an excision, plaintext survives in: index segments of every older index root until `gc-storage` deletes them; the peers' object
caches until eviction or restart; Datomic backups; and the storage's own copies of deleted rows.

### 4.2 By storage

| Copy | Dev storage (H2) | SQL storage (Postgres) |
| --- | --- | --- |
| Old segments after `gc-storage` deletes the row | MVStore keeps old chunks for `RETENTION_TIME` (default 45 s `[W]` commands.html), then marks space reusable; bytes stay in the file until overwritten or compacted; `SHUTDOWN COMPACT` needs admin and the transactor stopped `[E]` | the dead tuple and its TOAST chunks stay until `VACUUM`; after `VACUUM` the bytes stay in free space until overwritten; `VACUUM FULL` (exclusive lock) or a table rewrite removes them `[E]` |
| Write-ahead copies | none (no WAL in H2 2.x) | WAL segments hold full row images until recycled after checkpoints; `CHECKPOINT` plus `pg_switch_wal()` plus waiting for recycling bounds it; any WAL archive or base backup keeps them `[E]` |
| Evidence the bytes are gone | only a raw scan of the H2 file for a planted marker | a raw scan of the table files and `pg_wal` for a planted marker, `pageinspect`, and `pg_stat_user_tables` dead-tuple counts `[E]` |
| Who can bypass erasure | anyone with the peer password can write storage (R5) | peers are read-only (2.3); only the transactor role writes |

### 4.3 What this means for SCOPE's requirement

1. **Crypto-shredding stays primary on every storage** (Q78e's current ruling). Each PII value and its order key is ciphertext under a
   per-subject key; erasure destroys the key and publishes an erasure commit with `:f/erased-in` (R29 4.5), which gives TARGETS 7.1's exact
   read boundary immediately. Excision of the ciphertext datoms follows in batches of at most about 2,000 to 3,000 datoms, each followed by an
   indexing job (`d/request-index` and `sync-excise`), as defense in depth. GS.16 (10k subjects, about 5 PII value datoms each `[E]`, so about
   50k datoms) is then about 20 batches.
2. **The key store must not live in Datomic.** Datomic keeps history, so a destroyed key would stay readable in every older db value until
   excised and garbage-collected. With SQL storage, the key store is a small table in its own schema of the same Postgres instance, with its
   own role. Its own copies (heap, WAL, backups) are the whole TARGETS 7.3 inventory for key destruction, and 7.9's evidence is a raw scan of
   that table's files and `pg_wal` after `DELETE`, `VACUUM FULL` (cheap on a small table), `CHECKPOINT` and WAL recycling. If per-subject keys
   are wrapped by a tenant key, the wrapped form in old WAL is still a surviving copy, so the WAL window must close before the erasure counts
   as done, or the tenant key must also rotate.
3. **Dev storage cannot give 7.9's evidence.** A key store on H2 inherits section 1 (an acknowledged key deletion can be lost on an abrupt
   stop, which brings the key back) and R5 (the peer can rewrite it).
4. **Restore re-applies erasure (TARGETS 7.5)** for Datomic backups exactly as for the others: the erasure ledger lives outside Datomic and
   is replayed after `restore-db`.

## 5. Migration plan: EXP-DA04 brief

This section is written as the brief, ready to save as `lab/experiments/EXP-DA04-sql-storage/BRIEF.md`.

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

## 6. Options for Sam on Q78e (both halves, as one message)

**Storage for acceptance.**
1. **(Recommended)** Dev storage is not accepted for any durable-readback, lost-ACK or final acceptance evidence on lane D. Acceptance runs on
   SQL storage on Postgres with peers on a read-only role. Dev storage remains allowed for development gates. Cost: Postgres fits in the same
   2.75 GiB resident budget; an exclusive lane D slot grows from 3.5 to 4.0 GiB.
2. Dev storage accepted with a declared loss window. This needs Sam to loosen P2's "100% of the time" bar for lane D, because an abrupt
   transactor stop can lose acknowledged commits; R28's R5 (the peer can write storage) also stays open.

**Tenant isolation.** The three options of section 3.4: tiered (recommended), silo everyone, pooled everyone.

## 7. Open questions

1. Does the Datomic peer issue any storage write (for example during `gc-storage`, `delete-database` or `excise`)? Step 4 answers it.
2. Does the VM's virtual disk honor fsync to the Mac's SSD? It affects every lane equally and only the VM-crash row of section 1.3; the lab
   does not test VM crashes.
3. Does a 2.25 GiB Datomic container hold G1 and G2 at the 896m gateway heap? Step 5 answers it; the fallback costs 0.25 GiB.
4. How many databases one transactor carries before commit latency moves (about 8 threads per database measured)? GS.15 on the pooled cell
   answers it; it decides the cell size in the tiered option.

## 8. Sources

- `[D]` https://docs.datomic.com/operation/storage.html, https://docs.datomic.com/transactions/acid.html,
  https://docs.datomic.com/operation/capacity.html, https://docs.datomic.com/reference/excision.html,
  https://docs.datomic.com/setup/pro-setup.html (all fetched 2026-11-08).
- `[W]` https://h2database.com/html/advanced.html, https://h2database.com/html/commands.html, https://h2database.com/html/mvstore.html;
  https://jepsen.io/analyses/datomic-pro-1.0.7075 (used DynamoDB storage only: "We also limited ourselves to a single storage engine:
  DynamoDB"; found no safety violations; says nothing about dev storage); clojurians-log threads via search summary only.
- `[H2]` https://github.com/h2database/h2database at tag `version-2.1.214`: `engine/Constants.java`, `engine/Database.java`,
  `mvstore/MVStore.java`, `mvstore/FileStore.java`, `mvstore/tx/TransactionStore.java`, `command/dml/Set.java`.
- `[J]` Datomic 1.0.7745 distribution: `datomic-transactor-pro-1.0.7745.jar` classes `datomic/h2*`, `datomic/sql*`, `datomic/kv_sql*`;
  `config/samples/dev-transactor-template.properties`, `sql-transactor-template.properties`; `bin/sql/postgres-{db,table,user}.sql`;
  `lib/h2-2.1.214.jar`, `lib/postgresql-42.7.11.jar`.
- `[S]` `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`, `lab/PROTOCOL.md`, `lab/STATE.md`, `lab/acceptance/RULINGS.md` Q78a-d,
  `lab/acceptance/RULINGS-PENDING.md` Q78e and Q86, `lab/research/R29-datomic-lane-design.md`, `lab/research/R28-g03-isolation.md` sections 5
  and 8, `lab/verify/DA00/VERIFY.md`, `lab/locks/pool.json`; da01 worktree `lab/config/datomic/*`, `lab/config/slots.json`,
  `packages/datomic/gateway/src/triplex/gateway/main.clj`, `lab/experiments/EXP-DA00-datomic-bringup/receipts/final/measurements-1.json`.
