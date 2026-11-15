# Durable log-write tail

Fresh 10k full-level traces, source `afee00b0`, locate the longest native tail-descriptor parks in server-side `WalSync` and the guest's block flush path. SQL/backend and disk windows are correlations on the run clock; there is no shared Datomic/SQL transaction ID. Cumulative WAL deltas have reporting lag and include other work, so they are not per-transaction sync counts.

| example trace | commit / peer / apply ms | PostgreSQL samples | guest vdb flush ms / enclosing sample window ms |
| --- | --- | --- | --- |
| 97049596844644870000000000001eda | 372.091 / 360.222 / 11.500 | 18 INSERT `IO:WalSync` | 344 / 379.730 |
| c57ba716aaa5d6ab0000000000002076 | 138.587 / 128.010 / 2.270 | 6 INSERT `IO:WalSync` | 123 / 140.903 |
| 9d07be2a03d1f96d000000000000200b | 276.922 / 270.244 / 2.140 | 13 INSERT `IO:WalSync` | 353 / 300.044 |
| 9d07be2a03d1f96d0000000000001ebe | 268.527 / 257.635 / 14.500 | 12 INSERT `IO:WalSync` | 238 / 281.098 |
| 9d07be2a03d1f96d0000000000001f8e | 232.989 / 227.134 / 7.130 | 11 INSERT `IO:WalSync` | 217 / 242.160 |

Disk counters accumulate completed requests, including work begun before the window; flush totals can exceed window wall. Statement execution logs omit the implicit commit/Sync delay. The observed wait is after INSERT, before the following UPDATE, not an expensive UPDATE executor or a lock wait. The largest examples have no adjacent WAL-file switch/creation and checkpoint counters are unchanged throughout timing. Some smaller slow requests do coincide with a segment transition; that is not the largest-stall cause.

The PG data mount is ext4 on `/dev/vdb1`; the VM data disk is sparse, logically 100 GiB and about 47.16 GiB allocated. Allocation is essentially unchanged across these arms, so these stalls do not prove sparse-file growth. The host volume is 96–97% full. Guest flush delay places the problem below PostgreSQL, but the existing host iostat throughput does not split guest block scheduling, Virtualization/APFS and physical SSD service. Physical operation/time counters are added for subsequent runs; that split remains unproved here.

At arm end the KV heap is about 6 MB and total relation/TOAST/index size about 163 MB, within 512 MiB shared buffers. HOT updates are 5678/5686, 5683/5696 and 5682/5695; dead-tuple estimates 10/12/12. Autovacuum runs, and no checkpoint occurs in the primary window. These are estimates, not a physical bloat measurement; the new post-timing heap/TOAST census reports that separately when available. No fillfactor, autovacuum, checkpoint-spacing, WAL-size or shared-buffer change is claimed to fix these isolated flushes.

Same-session sync-method ABA: source `80176ae4`, 10k full-level 300-second diagnostic through 256 readers; worker witness fixed, original placement/cache/history/clocks/read path/frozen trace fixed. All actual PG settings match except `wal_sync_method`; fsync, synchronous_commit and full_page_writes are on. [PostgreSQL documents both methods as ways to force WAL to disk](https://www.postgresql.org/docs/17/runtime-config-wal.html#GUC-WAL-SYNC-METHOD). No physical power-loss test was performed.

| full-level observation | fdatasync opening | open_datasync | fdatasync closing |
| --- | ---: | ---: | ---: |
| primary commands | 3530 | 3530 | 3530 |
| commit p50 / p99 ms | 13.142 / 58.251 | 13.115 / 53.041 | 12.981 / 67.734 |
| peer wait p99 ms | 44.169 | 38.724 | 50.022 |
| commits >50 ms / summed wall ms | 61 / 3778.826 | 47 / 3343.212 | 64 / 4977.692 |
| writer lateness episodes >50 ms | 0 | 0 | 0 |
| timed Mac swap GiB median | 4.109 | 4.109 | 4.109 |
| timed non-VM CPU median / p99 % | 10.1 / 97.6 | 11.5 / 92.4 | 11.4 / 101.4 |

Peer p99 improves 8.372 ms against 5.854-ms bookend drift. All-primary p99 improves 9.952 ms against 9.483-ms drift, a narrow margin; p50 change is inside .161-ms drift. Keep `open_datasync` provisionally for the verdict pair, not as proof that disk stalls are gone. All arms are DONE, oracle PASS with no mismatches/receipt violations, all 3530 witnesses durably read back, complete collectors, and exact model reads. The actual settings/source/build identities, fresh clocks and raw/decoded archive hashes are checked before comparison. Counter movement between WAL write and sync is not itself counted as a gain.

Private recordings and verified derived scripts: `evidence/DX-T1/tx2-dxt1-p9-witness-a-*`, `p9-witness-analysis-b/`, `tx2-dxt1-p9-dsync-a-*`, `p9-dsync-analysis/`. Earlier failed derivations remain retained. Only this diagnostic's source-bound observations are attributed to its setting; C/A are historical references, not controls.
