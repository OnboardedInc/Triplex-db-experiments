| Form — same 442,410 assertion payloads | Bytes | Bytes/assertion | ÷ 656 | Scope |
| --- | ---: | ---: | ---: | --- |
| rows.jsonl.xz | 1,627,396 | 3.678 | 0.00561 | archive / raw stream |
| rowtexts.jsonl.xz | 2,850,528 | 6.443 | 0.00982 | archive / raw stream |
| rows.jsonl.gz | 3,467,529 | 7.838 | 0.01195 | archive / raw stream |
| rowtexts.jsonl.gz | 5,569,738 | 12.590 | 0.01919 | archive / raw stream |
| Packed typed cells + dictionary (raw, not a DB) | 50,648,023 | 114.482 | 0.17452 | reversible representation |
| rows.jsonl | 89,655,069 | 202.652 | 0.30892 | archive / raw stream |
| Row-string UTF-8 payload sum (unescaped) | 122,108,693 | 276.008 | 0.42074 | reversible representation |
| rowtexts.jsonl | 130,514,435 | 295.008 | 0.44971 | archive / raw stream |
| Gateway Datomic, maintained | 139,673,600 | 315.711 | 0.48127 | full gateway + retained history, WAL excluded |
| PostgreSQL typed table + 3 indexes | 150,847,488 | 340.968 | 0.51977 | bare payload DB, WAL excluded |
| Gateway Datomic, sealed seed | 286,547,968 | 647.698 | 0.98734 | full gateway + retained history, WAL excluded |

The common corpus is **442,410 assertion payloads**: 442,196 current rows from the 16 recorded pages plus 214 retracted
assertion strings read from a fresh sealed-volume clone. Every current row matched the native export byte for byte; the
supplement's original encoded strings matched reconstruction exactly. This explains the apparent denominator mismatch:
442,410 is historical assertions, not current rows. There are 214 additional native retraction datoms.

Archives and bare stores below preserve the same 17-cell assertion payloads. They do not implement the gateway's complete
current/history, feed, claim and receipt protocol. The gateway rows include those additional structures. Its physical seed
is the specified H5 sealed volume; H6's 656 bytes/row is the requested historical ratio anchor, not substituted fresh evidence.

North star: storage-cost research supporting P1–P5, with their correctness and performance requirements unchanged.
All results are diagnostic. No product changes or acceptance promotion.

## Findings

- Sealed source: 286,547,968 table bytes, 335,544,320 SQL WAL bytes, 653,889,536 allocated volume bytes by stopped-source `du`.
  The task's 290,193,408-byte H6 table is a different physical seed instance; it was not silently substituted for this source.
- Index, GC and `VACUUM FULL`: 139,673,600 table bytes (2.052x smaller). After GC but before vacuum the relation still occupied
  305,594,368 bytes. Main relation free space was 97.50%; vacuum was necessary to reclaim allocation.
- Cleanly stopped maintained clone: 304,574,464 allocated bytes, including 134,230,016 WAL allocated bytes; retained non-WAL
  allocation 170,344,448 bytes. Smaller WAL settings were used on the clone; this is not an isolated WAL-only experiment.
- 2,089,694 current native datoms and 2,259,176 historical native datoms. Subject row strings occupy 122,051,540 UTF-8 bytes;
  journal row strings occupy 363,584,827 bytes. These are logical text bytes, not a physical per-attribute allocation.
- The native current subject export exactly matches every reconstructed recorded-page row text and external entity ID.
- Main-relation dead tuple count before maintenance was zero. Datomic garbage existed as live PostgreSQL key-value rows,
  rather than predominantly as dead PostgreSQL tuples.

## Anatomy

| Part | Sealed source bytes | After GC bytes | After vacuum bytes |
| --- | ---: | ---: | ---: |
| Main relation | 76,251,136 | 76,251,136 | 1,556,480 |
| Primary index | 6,774,784 | 6,823,936 | 745,472 |
| TOAST heap | 201,105,408 | 219,889,664 | 135,077,888 |
| TOAST indexes | 2,285,568 | 2,498,560 | 2,293,760 |
| TOAST including auxiliaries | 203,472,896 | 222,470,144 | 137,371,648 |
| Total table including auxiliaries | 286,547,968 | 305,594,368 | 139,673,600 |

Key-value rows fell from 82,227 to 12,343. Logical value bytes fell from 719,714,225 to 131,430,923;
`pg_column_size` totals fell from 253,167,254 to 126,941,019. Before maintenance, PostgreSQL `pglz` compressed
533,473,796 bytes into 66,888,051. Gzip-prefixed values totalled 193,233,620 bytes and occupied 191,380,979 bytes.
Twelve sampled gzip values successfully decompressed: 626,114 compressed bytes became 1,986,825 bytes.

The previous-log-link value class was 521,027,566 logical bytes / 61,111,851 stored bytes before maintenance.
Afterward it was 2,816,472 / 355,337. **This is not a measurement of the entire transaction log:** treeified log
segments and index segments share the opaque gzip-value class. The remaining physical bytes have not been assigned
separately to EAVT, AEVT, AVET and the log.

GC was requested and key-value count/value bytes were observed stable for over 30 seconds. That is evidence of
quiescence, not a formal proof that every reclaimable segment was removed. Current/history row digests and all
per-attribute counts/string totals matched before and after index/GC, before vacuum. SQL payload counts and lengths
were unchanged by vacuum; a new post-vacuum Datomic peer reread was not performed.

## Native datoms by attribute

| Attribute | Current datoms | Current string bytes | History assertions | History retractions | History string bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| `:triplex.claim/command-id` | 42,775 | 544,969 | 42,775 | 0 | 544,969 |
| `:triplex.claim/tx` | 42,775 | 0 | 42,775 | 0 | 0 |
| `:triplex.claim/tx-id` | 42,775 | 1,283,250 | 42,775 | 0 | 1,283,250 |
| `:triplex.entity/id` | 187,913 | 4,100,528 | 187,913 | 0 | 4,100,528 |
| `:triplex.entity/rev` | 187,913 | 0 | 229,664 | 41,751 | 0 |
| `:triplex.entity/row/journal` | 800,613 | 363,584,827 | 800,613 | 0 | 363,584,827 |
| `:triplex.entity/row/subject` | 442,196 | 122,051,540 | 442,410 | 214 | 122,165,846 |
| `:triplex.journal/position` | 42,775 | 0 | 42,775 | 0 | 0 |
| `:triplex.scope/bootstrap` | 1 | 9 | 1 | 0 | 9 |
| `:triplex.scope/commit-fn-hash` | 1 | 64 | 1 | 0 | 64 |
| `:triplex.scope/feed-version` | 1 | 0 | 1 | 0 | 0 |
| `:triplex.scope/key` | 1 | 54 | 1 | 0 | 54 |
| `:triplex.scope/max-recorded-at` | 1 | 0 | 1 | 0 | 0 |
| `:triplex.scope/position` | 1 | 0 | 42,776 | 42,775 | 0 |
| `:triplex.scope/position-regular` | 1 | 0 | 1 | 0 | 0 |
| `:triplex.scope/rows-version` | 1 | 0 | 1 | 0 | 0 |
| `:triplex.scope/schema-hash` | 1 | 64 | 1 | 0 | 64 |
| `:triplex.tx/id` | 42,775 | 1,283,250 | 42,775 | 0 | 1,283,250 |
| `:triplex.tx/journals` | 42,775 | 0 | 42,775 | 0 | 0 |
| `:triplex.tx/max-recorded-at` | 42,775 | 0 | 42,775 | 0 | 0 |
| `:triplex.tx/operation-id` | 42,775 | 1,539,900 | 42,775 | 0 | 1,539,900 |
| `:triplex.tx/position` | 42,775 | 0 | 42,775 | 0 | 0 |
| `:triplex.tx/recorded-at` | 42,775 | 0 | 42,775 | 0 | 0 |

Including the small health database, there are 2,089,966 current and 2,259,450 historical native datoms.
At the maintained size this is 66.831 table bytes/current native datom or 61.818 bytes/history datom.
Those are alternative denominators, not separately attributed storage. There are 145,138 current domain entities;
187,913 `:triplex.entity/id` values include the 42,775 journal entities. Claims and physical transactions add native
entities of their own. A 1,000-business-subject seed is not a 1,000-row or 1,000-native-entity database.

Only 214 subject row assertions have been retracted. The bulk of row text is still current, especially the journals;
turning off history does not remove those journal copies. The aggregate rewrite variant creates a different history shape.

## Suspects

1. **Covering-index replication: logically confirmed, physical factor not isolated.** The installed schema indexes
   row strings; Datomic documents log/EAVT/AEVT plus AVET for indexed attributes. Compression prevents equating this
   to four literal 220-byte copies. Q3 a/b remains required for the incremental AVET cost.
2. **Journal duplication: confirmed as change objects, not identical row strings.** There are 442,624 `:_tx/change` rows,
   containing 112,731,823 JSON payload bytes inside 252,602,257 row-text bytes. Of those change objects, 442,196 reference
   current subject-row IDs. Journal envelopes, changed-entity links and other metadata add further bytes.
3. **Maintenance garbage: confirmed.** Fresh index/GC/vacuum cut the table by 146,874,368 bytes without changing the measured
   current/history row contents. Dead tuples alone did not explain the original size.
4. **Compression: confirmed at both layers.** Gzip decompression and PostgreSQL compression metadata were checked.
   Most gzip bytes gain little from TOAST; uncompressed previous-log-link values gain substantially.
5. **Verbose row text: confirmed logically.** Reconstructed headers add 32,896,034 bytes over the lossless 17-cell arrays
   for the full assertion corpus. Binary cells plus their dictionary occupy 50,648,023 raw bytes. Database savings remain unmeasured.

## Reductions, ranked by demonstrated saving and evidence

1. Index/GC plus physical compaction: measured 146.87 MB table saving, 51.26%, 2.052x smaller on this seed. It preserved
   the observed native current/history row bytes. Costs an offline maintenance window in this spike. This does not authorize
   running GC with an immediate cutoff on a live production system.
2. Smaller WAL retention plus checkpoint/stop: observed WAL allocation fell 201.33 MB (2.500x smaller), separately from data.
   No SQL synchronization setting was changed by the script. This was coupled to the maintenance run, not a durability test.
3. Reversible compact encoding: assertion row text / packed cells plus dictionary = 2.411x; raw row text / lossless row arrays
   = 1.369x. These are representation factors, **not measured Datomic table reductions**. Prefix lookup and assertion-identity
   validation need replacement before removing the indexed string representation. Read speed was not measured.
4. Journal redesign: journal row text is 74.87% of total current row-text bytes. Physical saving is unmeasured and cannot be
   inferred from that share because segments compress/mix values. Removing it requires an exact ordered resumable feed and
   receipt replacement. **Dropping the journal without that replacement changes feed/receipt answers.**
5. Archive compression: measured raw assertion JSONL to xz factor 55.09x. An archive is not an indexed live database.
   **Replacing native retained history with an archive changes availability and query guarantees unless a complete history
   access path is built.** No such path was implemented.

## Metric

Proposed primary metric: stopped allocated volume bytes excluding physical PostgreSQL WAL, divided by W0 business subjects,
including fixed PostgreSQL overhead, schema, all retained logical history/logs, journals, claims and indexes. Report table bytes
and counts of current rows, historical assertions and all native datoms separately. Count a Datomic logical transaction log
inside the table as retained data. For XTDB, count its logical log alongside its storage. A physical redo WAL is separately reported.

Reference maintenance state: completed requested indexing, GC request plus observed quiescence, `VACUUM FULL`, checkpoint and
clean stop. Preserve the cutoff, raw counts, hashes, source and exact engine identities. This is a size metric, not a projection
of year-one growth; multiple rungs are needed to separate fixed from marginal cost.

Today, the as-supplied source measured by the footprint runner is 318,332.928 non-WAL allocated bytes/business subject and
286,547.968 table bytes/business subject. The maintained clone is 170,344.448 and 139,673.600 respectively. The footprint output
labels caller-supplied denominators and distinguishes source and post-stop clone allocation.

## Other-store comparison and execution limits

PostgreSQL loaded all 442,410 rows into one typed table, verified all cells on readback, ran `VACUUM FULL` and checkpoint,
then stopped cleanly. Main relation: 80,822,272 bytes; three indexes: 70,017,024; total: **150,847,488 bytes**
(340.968 bytes/assertion). Physical WAL at the SQL observation: 134,217,728 bytes, reported separately.
After clean stop, `du` measured 308,776,960 allocated volume bytes, including 134,230,016 WAL bytes
(174,546,944 non-WAL bytes). Table figures are SQL relation allocation; volume figures are stopped-volume `du -sk × 1024`.
The indexes are `(entity_id,attribute)`, `(attribute,value_type,value_string,value_number,value_boolean,value_datetime,value_json)`
and `(recorded_position,id)`. There is no additional assertion-ID-only unique index. `value_boolean` preserves the source's 0/1
numeric channel as `smallint`. This is a bare payload table, not a complete Triplex host.

The first declaration batch failed before data loading because macOS Bash 3.2 treats an empty array as unbound under
`set -u`. All four failed attempts are retained. The compatibility expansion was fixed and checked locally. XTDB's first
attempt failed with Java heap exhaustion after 80,000 rows when each literal INSERT had a different SQL text. It produced
no accepted footprint. The retry reuses prepared statements, binds NULL explicitly and commits synchronously.

A temporary host-space shortage refused one attempt before container creation. Space subsequently recovered. The private
input archives were restored and checked against their SHA256 manifest; the historical supplement and full-corpus hashes
are recorded separately. A queued mutable wrapper also failed parsing after an edit; no container was created, its empty
lock was removed after an observed 210 seconds, and `launch.sh` now freezes controller sources before any scheduler wait.

The corrected batch was cancelled before admission after nearly 30 minutes waiting for the shared measurement lock, at the
end of the roughly three-hour spike budget. Its cancellation record and frozen source are retained. **No declaration variant
or XTDB footprint completed.** Consequently AVET, binary-in-Datomic, aggregate/noHistory and journal-copy physical factors
remain open; no QLever index measurement was attempted. No speed benchmark,
product integration, production qualification, merge, push or publication.

## Evidence and commands

Raw evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S4/`.
Tooling/evidence-index commit: `69649888`; this report is committed afterward as required.
`COMMANDS.md` records the executed commands and `EVIDENCE.md` maps the durable directories.
See README for exact runner patterns. Successful maintenance is `tx2-dxs4-anatomy4`; its source preimages are retained under
`source/`, with image and container identities. `components.json` records clone and footprint exits. The standalone footprint
component is `tx2-dxs4-anatomy4-footprint/footprint.json` (current-row denominator);
`tx2-dxs4-retired3/footprint.json` independently repeats it with the requested 442,410 denominator and original gateway-export size. Native complete-corpus match: `input-all/native-corpus-check.json`; current-only control remains under `input/`.
The first three attempts remain: `inspect` (wildcard URI failure), `anatomy2` (advertised address failure), `anatomy3`
(index request raced database initialization). `retired` refused disk admission; `retired2` was the mutable-wrapper parse failure. `retired3` successfully exported all 214 retracted strings and exercised the footprint component without a transactor. All owned containers, networks and volumes
from these attempts were removed; per-attempt cleanup and empty inventory files retain the receipts.

The checked-in controller also fixes the volume watchdog to include batch-component prefixes; the frozen batch1/2 sources
retain their earlier parent-only watchdog. Batch1 stores were sequential, removed immediately and stayed below the 6 GB cap;
batch2 never created a container.

Removed volumes (all owned clones/scratch, never the sealed source): `tx2-dxs4-inspect-pg-data`,
`tx2-dxs4-anatomy2-pg-data`, `tx2-dxs4-anatomy3-pg-data`, `tx2-dxs4-anatomy4-pg-data`,
`tx2-dxs4-anatomy4-footprint-pg-data`, `tx2-dxs4-retired3-pg-data`,
`tx2-dxs4-batch1-postgres-pg-data`, `tx2-dxs4-batch1-a-pg-data`, `tx2-dxs4-batch1-b-pg-data`,
`tx2-dxs4-batch1-d-pg-data`, `tx2-dxs4-batch1-e-pg-data`, `tx2-dxs4-batch1-xtdb-data`.
`REMOVED.txt` lists all 39 logged resource names; transient `--rm` helpers and config-extract containers were also removed.
The final audit found zero owned containers, volumes and networks. Its 25 source checks were syntax checks, not broad tests.
`SHA256SUMS` binds all 538 durable evidence files.

Downloads: none. Existing local images only. Acceptance pins: no existing pinned path was edited; `lab/acceptance/` unchanged.

## PASS / verdict audit (9a)

No acceptance PASS was produced. Diagnostic content-verdict sites are:

- `check-input.py`: actual fixture hashes, lengths, corpus row count and native proof binding must match before each store run; the expected hashes are retained in the attempt.
- `prepare.py`: original page hashes checked against their manifest; duplicate IDs must have identical cells; packed cell decode
  must equal input. Input source hashes and counts are retained in the summary. A historical supplement, when used, must contain
  exactly 214 missing IDs and reproduce the native text headers exactly.
- `verify-corpus.py`: every native current exported `(entity,row-text)` must match and consume the corresponding reconstructed
  record, with no extra/missing records. The native export and exact preparation bytes are hashed from this attempt.
- `gzip-samples.py`: actual sampled bytea bytes must decompress; compressed and inflated hashes/lengths bind the observations.
- `verify-clone.py`: per-database current/history row digests, per-attribute totals and logical row anatomy must match in this
  attempt; GC-scheduling events must cover both named databases. Peer log hash and clone container ID bind the result.
- `verify.py`: prepared for Q3; expected and observed per-entity value multisets and the binary dictionary must match, with a fresh
  GC-scheduling event. Corrected declaration trials were cancelled before admission and are not measured declaration evidence.
- `postgres.sh`: the completed exact all-cell readback binds the observed table to the prepared complete corpus; source hash, row count and source paths are recorded. Numeric channels allow equal exact int/float representations while rejecting Boolean/numeric substitution.
- `xtdb.mjs` / `xtdb.sh`: exact all-cell readback plus flush/idle observations; the first incomplete load failed and was not counted as a footprint. Corrected trial was cancelled before admission.
- Archive restore verification: decompressed gzip/xz stream hashes equal original input streams. `verify-archives.py` ran against the complete corpus and checked both compressed forms against the exact original stream hashes.
- `summarize.py`: arithmetic diagnostic only; no semantic PASS. Raw SQL sizes, stopped source/clone `du`, exact clone container ID,
  source name and explicit supplied denominators are linked. Fresh attempt prefixes and unused resource names are enforced by `launch.sh` and `window.sh`.

- `final-audit.json`: syntax checks and fresh Docker name inventories only; it does not assert semantic correctness. `SHA256SUMS` hashes actual retained bytes and does not confer an acceptance verdict.
- Owned retention/recovery: each removed raw native-export/dictionary copy was fully compared with decompression immediately before unlink; archives retain all bytes. Input restoration matched the original SHA256 manifest, including the previously independent native-corpus input hash.
- `table.py`: only completed content-checked components with empty post-cleanup inventories enter the comparison; source payload count, not duplicate journal value count, is the denominator. It does not promote acceptance.

Freshness is scoped to these fresh attempt directories and retained source preimages, not historical H6 PASS receipts. No independent
review, broad semantic qualification or production-history acceptance was performed by this spike.

References: Datomic [capacity/storage and GC](https://docs.datomic.com/operation/capacity.html) for logical copy/index and
background-GC interpretation; [read-only connections](https://docs.datomic.com/operation/read-only.html) for the transactor-free
census. Storage figures, compression checks and preservation checks above come from the local raw observations, not those pages.
