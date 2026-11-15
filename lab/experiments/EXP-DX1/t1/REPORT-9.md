The tail still misses: final F all-primary p99 is 67.224 ms against 50; C was 55.647 and A 71.013.
The full pair’s oracle passes, with all 19,766,713 model reads correct; P3 and the measured P4 bars pass.
The long native log-write windows show PostgreSQL waiting on the INSERT’s durable WAL sync, with matching guest disk flush delays.
Checkpoints, lock blockers and severe table bloat do not explain those examples; the delay inside Virtualization/APFS versus the SSD remains unsplit.
I moved SQLite witness persistence off the writer: the matched full-level median saves .490 ms beyond .045-ms drift; no tail gain is proved.
O_DSYNC provisionally saves 8.372 ms of peer p99 beyond 5.854-ms drift, with durability kept; it does not remove the full-pair tail.
A’s G256/G64 miss does not repeat, but recovery still fails within 60 seconds; writer ratios miss at 3.386 against 1.25 and 2.498 against 2.
P2 also misses small/medium loaded medians 12.223/13.055 against 10 ms, small p99 150.402 against 50, medium burst 11.839 against 10, and steady queue 3 against 2.19.

Timed F source `c8ef367b`; current layout, exact local reads, strict server clocks, split `pending`, cache 1280 MiB, history 192 MiB, prior CPU placement/quiet logging and delta broadcasts. No bar, frozen phase, ACK boundary or sealed seed changed.
[Every bar beside C/A](VERDICT-9.md), [writer/tail causes and trace IDs](TAIL-9.md), [witness trial](WITNESS-9.md), [server/disk windows](STORAGE-9.md), [evidence](EVIDENCE-9.md).

| F arm / tracing | primary p50 / p99 ms | swap GiB median | Mac non-VM CPU median / p99 % | same-session off p50 / p99 ms |
| --- | --- | --- | --- | --- |
| off-before / off | 10.448 / 41.437 | 4.109 | 8.9 / 63.2 | 10.477 / 42.226 |
| zero / summary | 10.461 / 48.729 | 4.101 | 10.8 / 93.8 | 10.477 / 42.226 |
| loaded / summary | 11.080 / 67.224 | 4.101 | 10.0 / 90.4 | 10.477 / 42.226 |
| off-after / off | 10.506 / 43.016 | 4.093 | 10.4 / 89.6 | 10.477 / 42.226 |

Host samples cover primary offer-to-last-ACK. Every F latency uses that arm/context above; C/A contexts accompany their full table. Both off medians meet 12 ms; drift .058-ms p50 / 1.580-ms p99. Off arms are 200-second context, full zero/loaded 900 seconds: not a tracing-cost A/B or a cross-session causal claim.

| measurement | opening / candidate / closing; controls and host context |
| --- | --- |
| Witness, full, 10k/450 s/max1024 | Commit p50 13.267/12.754/13.222 ms; p99 46.694/53.128/59.621; >50-ms commits 25/51/62; lateness episodes 0/0/1. Writer dispatch p99 4.227/.068/3.537 ms. Swap 4.109 GiB throughout; Mac CPU median 10.6/11.2/10.6%, p99 91.2/98.5/99.6%. Both deferred controls retain identical collectors; no p99 win beyond drift. |
| WAL sync, full, 10k/300 s/max256 | fdatasync/open_datasync/fdatasync: primary p99 58.251/53.041/67.734 ms; peer p99 44.169/38.724/50.022; >50-ms commits 61/47/64. Swap 4.109 GiB; Mac CPU median 10.1/11.5/11.4%, p99 97.6/92.4/101.4%. Primary p99 gain 9.952 barely exceeds 9.483-ms drift; median neutral within drift. |
| F writer | 131/7408 commits >50 ms: peer 100, scheduler 12, subject wait 11, network 4, TypeScript 3, peer-call setup 1. Four lateness episodes total 449.530 ms; GC maximum 149.975 ms. Dispatch/readback p99 .069/.354 ms; no synchronous SQLite persistence on the writer. |
| F P1 | G256/G64 1.016169 and G1024/G256 1.194368 pass; read p99 6.303 ms passes. A’s recovery miss repeats: all seven windows fail. Writer ratios use loaded/zero p99 150.402/44.425 and 78.450/31.409 ms, 46 commits each. One passing scaling observation does not prove A was noise. |
| F P2 | Misses listed above; small burst 9.663 ms passes; medium/large loaded p99 23.268/22.155 ms pass. Burst queues drain .026/.410 s within 60. All 7408 commands accounted/published; RYOW, duplicate and lost-ACK checks exact, no typed conflicts/rejections. |
| F P3/P4 | Gaps/order/duplicate effects 0, replay exact, 3 crashes, lag p99 76.858 ms within 250. Whole-machine weighted goodput 18,171.534 pulls/s exceeds 4400; weighted p50/p99 .029/.210 ms, largest .289; history depth1/3/10 p99 .139/.143/.142 ms, ratio 1.022 within 1.1. Engine bytes/query remain unmeasured. |
| Exactness | Loaded oracle: 810 commands, 53 reads, 2771 entity queries, 0 mismatches/receipt violations. All 7436 witnesses durably read back with original capture clocks, pending 0. Zero/off controls explicitly have oracle NOT-RUN. |

Fresh post-run heap/TOAST census: .008662%/0% dead space, 99.845% HOT updates, five autovacuums. No checkpoint/WAL-size/fillfactor/autovacuum/shared-buffer change was measured: the observed isolated flush waits did not justify them, and they are not declared exhausted. Actual fsync/synchronous_commit/full_page_writes stay on; no physical power-loss test.
Remaining: 100 peer-dominated outliers are unsplit internally in summary F. Earlier full traces locate durable flush waits below PG; physical versus virtual flush service remains unknown. One 149.446-ms writer episode overlaps 148.307 ms of GC; three other episodes retain unassigned time. No current CPU profile proves their residual cause. Rejected journal/V8/core/slim experiments were not revisited.
Validation: fresh 37 host + 296 Datomic tests pass, 51 external-service skips; build/declarations/typechecks/lint/shell/format pass. All 364 checked source and 1527 timed source/build hashes match. The sandbox boot-clock failure is retained; root-JS still fails on inherited unregistered `report-revision-race.mjs`, pack unverified because pinned pnpm rejects the mandated store flag.
[PASS audit](AUDIT-9.md): content, freshness and source/slot/input checks at every qualifier; acceptance unchanged, zero changed-path pin references. Performance misses are not promoted to acceptance.

Commands (fresh tags; wrappers supply heavy admission, measurement lock, 15-GiB guard and owned cleanup):
```sh
DX_WITNESS_LEVEL=full bash lab/experiments/EXP-DX1/t1/tail-session.sh witness tx2-dxt1-p9-witness-new
DX_TAIL_PG_SETTINGS='-c shared_buffers=512MB -c max_wal_size=8GB -c checkpoint_timeout=30min -c wal_buffers=64MB -c wal_sync_method=open_datasync' bash lab/experiments/EXP-DX1/t1/tail-session.sh storage tx2-dxt1-p9-dsync-new
bash lab/experiments/EXP-DX1/t1/study.sh tx2-dxt1-p9-final-new
```
Outputs: `~/Claude/Projects/triplex-db-2/evidence/DX-T1/<tag>/` contains scorecards, offline HTML/Chrome timelines and compressed raw; committed `t1/runs/<tag>/` contains report/index/SHA256SUMS. `evidence/TRACE-INDEX.md` links every run; F default-pair raw is 54,496,509 bytes. [Lossless compression journal](COMPRESSION-9.md) preserves all original readable bytes.
All owned containers/volumes removed, scheduler restored, lease released; closing disk free 15.477 GiB. No upload, push or merge.
