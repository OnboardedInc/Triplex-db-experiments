| Form — same 442,410 assertion payloads | Bytes | Bytes/assertion | ÷ 656 | Scope |
| --- | ---: | ---: | ---: | --- |
| rows.jsonl.xz | 1,627,396 | 3.678 | 0.00561 | archive / raw stream |
| rowtexts.jsonl.xz | 2,850,528 | 6.443 | 0.00982 | archive / raw stream |
| rows.jsonl.gz | 3,467,529 | 7.838 | 0.01195 | archive / raw stream |
| rowtexts.jsonl.gz | 5,569,738 | 12.590 | 0.01919 | archive / raw stream |
| Datomic d: typed binary + dictionary | 27,377,664 | 61.883 | 0.09433 | bare payload DB, WAL excluded |
| Datomic b: unindexed row strings | 34,816,000 | 78.696 | 0.11996 | bare payload DB, WAL excluded |
| Datomic a: indexed row strings | 42,516,480 | 96.102 | 0.14650 | bare payload DB, WAL excluded |
| Packed typed cells + dictionary (raw, not a DB) | 50,648,023 | 114.482 | 0.17452 | reversible representation |
| rows.jsonl | 89,655,069 | 202.652 | 0.30892 | archive / raw stream |
| Row-string UTF-8 payload sum (unescaped) | 122,108,693 | 276.008 | 0.42074 | reversible representation |
| Datomic f: indexed rows + real journal rows | 126,328,832 | 285.547 | 0.43529 | bare payload DB, WAL excluded |
| rowtexts.jsonl | 130,514,435 | 295.008 | 0.44971 | archive / raw stream |
| Gateway Datomic, maintained | 139,673,600 | 315.711 | 0.48127 | full gateway + retained history, WAL excluded |
| PostgreSQL typed table + 3 indexes | 150,847,488 | 340.968 | 0.51977 | bare payload DB, WAL excluded |
| Datomic e: entity aggregate, history retained | 196,222,976 | 443.532 | 0.67612 | bare payload DB, WAL excluded |
| Gateway Datomic, sealed seed | 286,547,968 | 647.698 | 0.98734 | full gateway + retained history, WAL excluded |
| XTDB entity nested arrays | 628,670,464 | 1421.013 | 2.16618 | bare payload DB, logical log included |
| XTDB one document per assertion | 702,676,992 | 1588.294 | 2.42118 | bare payload DB, logical log included |

The common corpus is **442,410 assertion payloads**: 442,196 current rows from the 16 recorded pages plus 214 retracted
assertion strings read from a fresh sealed-volume clone. Every current row matched the native export byte for byte; the
supplement's original encoded strings matched reconstruction exactly. This explains the apparent denominator mismatch:
442,410 is historical assertions, not current rows. There are 214 additional native retraction datoms.

Archives and bare stores below preserve the same 17-cell assertion payloads. PostgreSQL and the XTDB row-document layout normalize the fixed-width recorded-position string to an exact integer; its original 16-digit form is deterministically recoverable. Other payload channels remain exact. They do not implement the gateway's complete
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

1. **Covering-index replication: confirmed; its incremental physical cost is measured.** The installed schema indexes
   row strings; Datomic documents log/EAVT/AEVT plus AVET for indexed attributes. In the fresh scratch comparison,
   indexed strings occupy 42,516,480 table bytes, versus 34,816,000 without AVET: **7,700,480 bytes / 17.406 bytes per
   assertion**, 22.12% overhead relative to b, or an **18.11% reduction** when removing the index from a.
   This is a whole-table controlled-variant delta, not a decoded per-segment EAVT/AEVT/AVET attribution, and not a
   measured 18.11% saving on the full gateway. Compression refutes four literal uncompressed copies as the physical model.
2. **Journal duplication: confirmed as change objects, not identical row strings, with a physical isolation result.**
   There are 442,624 `:_tx/change` rows, containing 112,731,823 JSON payload bytes inside 252,602,257 row-text bytes.
   Of those change objects, 442,196 reference current subject-row IDs. The real full journal export includes 800,613
   rows / 363,584,827 text bytes. Adding those exact rows and their IDs to a raised the maintained scratch table from
   42,516,480 to 126,328,832 bytes: **83,812,352 bytes / 66.34% of f**, not 74.87% physical storage.
   That delta includes journal envelopes and links; it does not separately isolate change payloads or all gateway protocols.
3. **Maintenance garbage: confirmed.** Fresh index/GC/vacuum cut the table by 146,874,368 bytes without changing the measured
   current/history row contents. Dead tuples alone did not explain the original size.
4. **Compression: confirmed at both layers.** Gzip decompression and PostgreSQL compression metadata were checked.
   Most gzip bytes gain little from TOAST; uncompressed previous-log-link values gain substantially.
5. **Verbose row text: confirmed logically.** Reconstructed headers add 32,896,034 bytes over the lossless 17-cell arrays
   for the full assertion corpus. Binary cells plus their dictionary occupy 50,648,023 raw bytes. In Datomic, changing unindexed strings to typed bytes plus a stored dictionary saved
   **7,438,336 bytes / 21.36% versus b**; combining the encoding change and AVET removal saved 35.61% versus a.
   Compression makes the physical saving much smaller than the 2.411x raw-text/packed representation factor.

## Reductions, ranked by demonstrated retained-data saving

1. Index/GC plus physical compaction: **146,874,368 bytes / 51.26%**, 2.052x smaller on the sealed seed. Measured native
   current/history row bytes were preserved before vacuum. This spike used offline maintenance, an immediate GC cutoff
   and observed quiescence; it does not authorize applying that cutoff on a live production system.
2. Journal redesign: **83,812,352 bytes / 66.34% of the combined bare f layout**, measured with the real journal strings.
   This is a controlled-layout increment, not a certified saving from the full gateway. An exact ordered resumable feed,
   receipts, identities and recovery behavior need a replacement. **Dropping the journal without it changes feed/receipt
   answers and guarantees.** Retaining exact history of assertions alone does not supply the whole journal protocol.
3. Encoding plus lookup redesign: a → d saves **15,138,816 bytes / 35.61%**, 1.553x smaller, in the bare assertion layout.
   Its two measured parts are AVET removal (a → b: 7,700,480 bytes / 18.11%) and changing unindexed strings to bytes plus
   their stored dictionary (b → d: 7,438,336 bytes / 21.36%). Do not add their percentages or extrapolate them to every
   gateway segment. The current row-prefix index lookup needs an exact replacement; binary cells need stable dictionary
   lifecycle, decoding, identity/type validation and migration. These representations retain all payload cells in this
   spike, but public reads and writes were not integrated or performance-tested.
4. Archive compression is an alternative access model, not a demonstrated live-layout optimization: assertion JSONL → xz
   is **55.09x smaller**. **Replacing native retained history with an archive changes availability/query guarantees unless
   a complete history access path is built.** No such path was implemented.

The measured aggregate rewrite with native history is rejected as a storage reduction: 196.22 MB, **5.636x b**.
The grouped XTDB seed is 10.53% smaller than its row-document seed, but later rewrite-history cost and its changed native
query shape were not measured. Neither observation justifies losing native history to reduce a number.

Separately from the retained-data ranking, smaller WAL settings plus checkpoint/stop reduced observed WAL allocation by
**201,326,592 bytes**, 2.500x smaller. WAL is excluded from the proposed primary metric and shown separately. No SQL
synchronization setting changed, but this was coupled to maintenance, not an isolated WAL/durability/performance trial.

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

### Complete stopped PostgreSQL allocation for the bare corpus

SQL-table rows in the first table exclude fixed PostgreSQL cluster overhead. These stopped `du` observations include it;
XTDB storage/log directory figures already include its system tables. Use the non-WAL allocation metric for disk budgeting.

| Layout | Entire volume | Physical WAL | Non-WAL volume | Non-WAL bytes/assertion |
| --- | ---: | ---: | ---: | ---: |
| Datomic a | 207,290,368 | 134,230,016 | 73,060,352 | 165.142 |
| Datomic b | 199,589,888 | 134,230,016 | 65,359,872 | 147.736 |
| Datomic d | 192,151,552 | 134,230,016 | 57,921,536 | 130.923 |
| Datomic f | 291,229,696 | 134,230,016 | 156,999,680 | 354.874 |
| PostgreSQL typed table | 308,776,960 | 134,230,016 | 174,546,944 | 394.537 |

## Continued spike: Datomic declarations

The indexed/unindexed trials (`tx2-dxs4-cont5-a`, `tx2-dxs4-cont5-b`) each used a fresh PostgreSQL volume and scratch
Datomic database, no gateway, the same 442,410 row strings, 145,138 external entity IDs and 42,775 command-shaped
transactions. Both independently matched the same complete per-entity value multiset digest:
`605b919f4646a088aef8ddcabf44aadf733cf7830505f0e08d78e9b7fe6a5a96`.
Each requested indexing, waited for `sync-index`, scheduled GC, observed stable key-value count/value bytes for over
30 seconds, vacuumed fully, checkpointed and stopped cleanly before volume `du`.

| Variant | Main | PostgreSQL index | TOAST + auxiliaries | Total SQL table | Table bytes/assertion |
| --- | ---: | ---: | ---: | ---: | ---: |
| a: indexed string | 843,776 | 262,144 | 41,410,560 | 42,516,480 | 96.102 |
| b: unindexed string | 835,584 | 245,760 | 33,734,656 | 34,816,000 | 78.696 |

Stopped a volume: 207,290,368 allocated bytes, including 134,230,016 WAL; non-WAL 73,060,352.
Stopped b volume: 199,589,888 allocated bytes, including 134,230,016 WAL; non-WAL 65,359,872.
SQL WAL is 134,217,728 in both. The full maintained gateway is a different, richer data model; these bare trials do not
implement claims, revision protocols, feed ordering or the 214 retractions as native retraction transactions.
Content is verified before physical vacuum; no new post-vacuum native peer reread was performed.

The earlier `cont4-a` emitted its expected payload proof but hung at JVM exit on a non-daemon Artemis notifier.
A retained SIGQUIT thread dump showed `DestroyJavaVM` and the notifier. The hold was intentionally aborted and all owned
runtime resources removed; **that attempt contributes no footprint**. The successful retries call the documented
[Datomic peer shutdown API](https://docs.datomic.com/clojure/index.html#datomic.api/shutdown) instead of relying on
`shutdown-agents` alone. The native journal export component of cont4 had independently completed and was retained.

The history-retaining entity aggregate (`tx2-dxs4-cont10-e`) completed, but is a regression: **196,222,976 table
bytes / 443.532 bytes per assertion**, 5.636x unindexed incremental strings (b), or 4.615x indexed strings (a).
Its 145,138 current blob values contain 130,659,573 string bytes; the native history has 186,889 positive blob versions
and 41,751 retractions, totaling 1,368,612,655 string bytes when history assertion/retraction datoms are counted.
The current payload proof still matches all 442,410 source strings. Rewriting a full entity blob on each command repeats
old prefixes in historical versions, unlike adding independent row strings. This is not a recommended storage reduction.

`e-nohistory` was **not started**: after e completed, less than the reserved 240 seconds remained in the hold. Its runner
exists but there is no physical result. **Suppressing those native blob versions changes native historical-read guarantees**;
retaining all assertion payloads in today's blob is not a qualification of coherent past-basis application reads.

The real journal input now has 800,613 rows (442,624 change objects), 363,584,827 text bytes, and all 42,775 command
positions aligned to the assertion input. Its native export SHA256 is
`efcf0abdd3f8b5caf5f3f868070dafc4d79a50c53f0f0a3447ea21c7f562effc`; prepared grouped input SHA256 is
`9eaa5aa13e0f20e165045de138061b8617e5a45c66665f67775899b29ced2f95`.
The corrected binary trial `tx2-dxs4-cont8-d` and real-journal trial `tx2-dxs4-cont7-f` completed with the same
maintenance sequence and clean-stop measurements. Binary proof matched all 442,410 values and its complete stored dictionary;
f matched all 1,243,023 values (assertions plus actual journals), including every journal text exactly.

| Variant | SQL table bytes | Bytes/assertion | Comparison |
| --- | ---: | ---: | --- |
| d: bytes + stored dictionary, no row AVET | 27,377,664 | 61.883 | 7,438,336 fewer bytes than b (21.36%); 15,138,816 fewer than a (35.61%) |
| f: a + actual journal rows and their entity IDs | 126,328,832 | 285.547 | 83,812,352 more bytes than a; 2.971x a |

The isolated journal increment is **66.34% of f** (104.685 bytes/native journal row, 189.445 bytes per source assertion).
It is not a decoded physical attribution inside the maintained gateway: different layouts can mix/compress segments differently.
The f layout is 13,344,768 bytes smaller than the maintained full gateway, which also implements claims, revision/position
protocols and other native attributes. Neither difference is a production removal test.

`cont6-d` loaded and indexed but failed in the dictionary-proof expression: a misplaced parenthesis passed a transducer to
`sort`. It contributes no footprint. The explicit `for` replacement in cont8 ran successfully and matched both independently
computed hashes. All failed volumes were removed and the first error/source preimages retained.

## Continued spike: XTDB 2.2.0

`tx2-dxs4-cont2-xtdb` completed all **442,410 assertion documents** with the prepared 128-document statement loader.
Every one of the 17 source fields matched on full readback, bound to input SHA256
`db514954ec7d1698988b5b503c599b84f61102d3ae7c7f5e8453efc3be16b30e`.
This bare layout commits synchronously in 128-row chunks (3,457 transactions), not the gateway's 42,775-command protocol.
Source valid/record times remain payload fields; this does not qualify Triplex bitemporal queries or feed behavior.

| Stopped XTDB allocation | Bytes | Bytes/assertion |
| --- | ---: | ---: |
| Local storage directory | 471,818,240 | 1,066.473 |
| Local log directory | 230,858,752 | 521.821 |
| Storage + logical logs | 702,676,992 | 1,588.294 |
| Entire volume (including directory overhead) | 702,681,088 | 1,588.303 |

These are cleanly stopped `du -sk × 1024` values. The log includes both `LOG` (102,600,482 file bytes) and
`REPLICA_LOG` (128,244,649 file bytes); neither was silently excluded as PostgreSQL physical redo WAL.
The node acknowledged an explicit `POST /system/finish-block`; then 12 consecutive samples, roughly five seconds apart,
showed `compactor_jobs_available=0` and container CPU below 5%. The final file inventory contains level-1 compacted Arrow
files and level-0 files still retained on disk. This proves observed flush and compactor quiescence, not that all obsolete
storage files were garbage-collected or that this is the minimum possible steady-state footprint.
The exact content readback occurred before the explicit flush; no post-stop/restart content reread was performed.

The grouped layout (`tx2-dxs4-cont11-xtdb-entities`) also completed: **145,138 documents**, each containing a
native nested array of all that domain entity's 17-cell rows, loaded once per entity in 128-document chunks (1,134
transactions). Every nested cell of all 442,410 payloads matched. The same flush/compactor-idle criterion eventually
completed after several CPU spikes reset its consecutive-sample count. Its cleanly stopped allocation was:

| Grouped XTDB allocation | Bytes | Bytes/assertion |
| --- | ---: | ---: |
| Local storage | 372,867,072 | 842.809 |
| Local logs | 255,803,392 | 578.204 |
| Storage + logs | 628,670,464 | 1,421.013 |
| Entire volume | 628,674,560 | 1,421.022 |

This is **10.53% smaller overall** than row documents: storage falls by 98,951,168 bytes, while logs grow by 24,944,640.
Grouping retains every payload cell but changes native query access; it is not a fast-path implementation. Loading each
aggregate once does not measure the history cost of rewriting it on every later command. The first grouped attempt,
`cont9`, failed before data loading because `rows` is a reserved SQL word; cont11 used `fact_rows`. Both outcomes remain.

Before the hold, the requested native host sample was recorded: `quiet:false`, load1 11.42, swap 13,333.56 MB,
other CPU 433%, call-app CPU 77%. Sizes are reported without timing claims. The Data-volume `df` admission exceeded
15 GiB free. This continuation uses that stricter threshold and records the `lane/d-native` host-quiet script bytes.
The first continuation launch (`cont1`) refused before taking the lock because an editing typo initially compared free
space with 115 GiB; the frozen source and observed `df` remain. It was corrected to the requested 15 GiB for `cont2`.
The corrected journal/variant launch superseded `cont3` before admission after a namespace-filename preflight fix.

## Optional QLever preparation and remaining gaps

The complete assertion corpus was mapped through the lane's default full `a0` RDF channels from
`packages/qlever/src/rdf.ts`: **11,961,132 triples**, 2,025,250,161 prepared input bytes. The reversible `_row` projection
checked every payload cell and the exact source hash. Original/adapted mapping and stream hashes are in
`qlever-input/summary.json`; the original mapping text is retained in this spike. The runner would canonicalize Turtle
integer shorthand to strict N-Quads literals, hash the actual indexed stream, build a native index with the default permutation settings and
verify every `_row` over SPARQL before counting bytes. **That native path was not executed.**

`cont12` remained waiting for the heavy pool and was cancelled before admission at the nominal continuation timebox.
No QLever container, volume or network was created and no native index size is reported. This is the remaining other-store
comparison gap. The noHistory physical comparison also remains unmeasured; its explicit skip is separate from a failed
attempt. No post-vacuum Datomic reread, production query/write integration, speed benchmark or independent acceptance
review was performed. All reported measurements are at this one 1,000-business-subject fixture, not a scale-growth model.

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
end of the roughly three-hour spike budget. Its cancellation record and frozen source are retained. **At that first stopping point no declaration variant
or XTDB footprint had completed.** The continued spike above now supplies the XTDB measurement. The continued trials above now supply AVET, binary-in-Datomic and real-journal physical factors.
The history-retaining aggregate also completed (and regressed); noHistory was not started. The optional QLever index never reached admission and was cancelled at the continuation timebox; its complete RDF preparation is retained but is not native-index evidence. No speed benchmark,
product integration, production qualification, merge, push or publication.

## Evidence and commands

Raw evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S4/`.
Initial tooling/evidence-index commit: `69649888`; continuation tooling commit: `91f0182a`.
The refreshed evidence manifest is commit `fda195e4`; this report is committed last.
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
At the first stopping point, `REMOVED.txt` listed 39 logged resource names; transient `--rm` helpers and config-extract containers were also removed.
The initial audit found zero owned containers, volumes and networks and ran 25 syntax checks. Its manifest covered 538 evidence files.
The continuation final audit supersedes those counts: **36 source checks passed**, **1,785 evidence files hashed**,
**89 logged resource names removed**, and zero remaining owned containers, volumes or networks. Its exact heavy permit
was PID 36845, admitted at `2026-11-10T20:11:50.582Z`; it binds the committed `91f0182a` source bytes. These are syntax,
ownership and hashing checks, not independent semantic acceptance. The closing hash audit waited after the nominal
measurement timebox for a shared slot; no new measurement was started during that wait.

Additional continuation volumes removed: `tx2-dxs4-cont2-xtdb-data`, `tx2-dxs4-cont4-journals-pg-data`,
`tx2-dxs4-cont4-a-pg-data`, `tx2-dxs4-cont5-a-pg-data`, `tx2-dxs4-cont5-b-pg-data`,
`tx2-dxs4-cont6-d-pg-data`, `tx2-dxs4-cont7-f-pg-data`, `tx2-dxs4-cont8-d-pg-data`,
`tx2-dxs4-cont9-xtdb-entities-data`, `tx2-dxs4-cont11-xtdb-entities-data`, `tx2-dxs4-cont10-e-pg-data`.
All 23 original/continued owned scratch volumes are gone. Native exports, prepared corpora and first-failure logs remain
in durable evidence. Journal preparation also removed only its verified, reproducible temporary `sorting.tmp` database.

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
  GC-scheduling event. The initial corrected batch was cancelled before admission. The continued a/b/d/f trials later completed with fresh matching value proofs; f additionally checks the real native journal input hash and every journal value.
- `postgres.sh`: the completed exact all-cell readback binds the observed table to the prepared complete corpus; source hash, row count and source paths are recorded. Numeric channels allow equal exact int/float representations while rejecting Boolean/numeric substitution.
- `xtdb.mjs` / `xtdb.sh`: exact all-cell readback plus flush/idle observations; the first incomplete load failed and was not counted as a footprint. The initial corrected trial was cancelled before admission; continuation cont2 completed an exact full-corpus readback and observed flush/compactor quiescence.
- Archive restore verification: decompressed gzip/xz stream hashes equal original input streams. `verify-archives.py` ran against the complete corpus and checked both compressed forms against the exact original stream hashes.
- `summarize.py`: arithmetic diagnostic only; no semantic PASS. Raw SQL sizes, stopped source/clone `du`, exact clone container ID,
  source name and explicit supplied denominators are linked. Fresh attempt prefixes and unused resource names are enforced by `launch.sh` and `window.sh`.

- `final-audit.json` / `final-audit.py`: actual parser/CLI syntax checks must exit successfully; fresh Docker name inventories must be empty; the final program additionally requires its exact parent heavy permit, no other owned heavy holders and an unchanged owned branch/scope. Its UTC timestamp, committed source hashes, actual permit/PID and Docker host bind the receipt. `SHA256SUMS` hashes all retained bytes; neither check confers semantic acceptance.
- `journal_export.clj` / `journal-input.py`: a fresh read-only clone directly exports native row strings, computes their exact stream hash and checks the native census. Preparation verifies that hash, every encoded entity/command position, totals and complete command alignment; each f attempt rechecks native/prepared hashes and binds clone/peer IDs.
- `prepare-qlever.mjs`: actual source stream hash/cardinality plus a reversible all-cell `_row` projection; its local projection verdict is not a native-index content verdict. The original/adapted mapping and generated stream hashes are retained.
- `qlever.sh` / `qlever-verify.mjs`: require the prepared/native source hashes and full exact native SPARQL `_row` readback before accepting an index footprint. No builder-only or partial result enters the table.
- `xtdb-entities.mjs`: checks every nested cell, entity membership and the complete 442,410-payload count. A parse failure contributes no footprint.
- Owned retention/recovery: each removed raw native-export/dictionary copy was fully compared with decompression immediately before unlink; archives retain all bytes. Input restoration matched the original SHA256 manifest, including the previously independent native-corpus input hash.
- `table.py`: only completed content-checked components with empty post-cleanup inventories enter the comparison; source payload count, not duplicate journal value count, is the denominator. It does not promote acceptance.

`continuation-waits.jsonl` is raw scheduler state, not a success verdict. File-byte anatomy JSON is arithmetic over the retained XTDB inventory; its v2 classification fixes the initial mount-prefix classifier and does not assert storage GC completion.

Freshness is scoped to these fresh attempt directories and retained source preimages, not historical H6 PASS receipts. No independent
review, broad semantic qualification or production-history acceptance was performed by this spike.

References: Datomic [capacity/storage and GC](https://docs.datomic.com/operation/capacity.html) for logical copy/index and
background-GC interpretation; [read-only connections](https://docs.datomic.com/operation/read-only.html) for the transactor-free
census. Storage figures, compression checks and preservation checks above come from the local raw observations, not those pages.
