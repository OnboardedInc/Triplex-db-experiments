# Compact and incumbent gateway paths

**North star.** P2 durable service and throughput, P1 pinned replay and P4 current pulls. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

The incumbent control is the starting revision of W1 (`3b8172bbe`), using strict lean v3 scopes, default row encoding and the grouped gateway writer. Both treatments get the same 1-, 2- and 3-field replacement tape. Each save replaces existing fields on a different 160-fact subject. The compact arm prepares concurrent ready requests and sends up to eight in one physical transaction. The incumbent prices its normal peer preparation, speculative apply and group append. The two databases share the same owned PostgreSQL transactor stack.

Each depth/arm uses 120 completed saves per block. Order reverses at each depth between the two blocks. Timing starts at a closed-loop request on the peer, includes gateway prep, native transaction and durable member response, and omits HTTP, TypeScript model conversion and application replicas. Native apply is the sum of measured transactor apply over physical transactions divided by verified logical saves. For body size use native log datoms and the UTF-8/scalar convention in the [census](CENSUS.md). Canonical Fressian uses the actual datoms. Cluster WAL is the PostgreSQL insert-LSN delta per replaced business fact during an arm, with native maintenance included.

The current read prices an already touched subject. The pinned read revisits the seed cut after replacing the field. Each returns and compares all 160 facts. The cold subject has never been read or edited in that peer. Datomic storage segments may already be resident from seed and indexing. Owner, account, field width, native group, receipt and staged source are retained in the attempt.

The domain checker runs both current and pinned worlds through unchanged independent O-DOMAIN. Some frozen cases put several owners at one supplied logical position. Those cases replay in the same prerequisite order on separate subject saves and are compared at their explicitly remapped positions. The remaining exact-position cases compare to the frozen output. A separate temporal fixture tests an interior physical group cut, two microsecond boundaries, durable duplicate resolution after a deliberately dropped native result, predecessor metadata in the feed, and the erased marker at a pre-erasure coordinate. The TypeScript driver calls the experimental gateway through its exact wire requests and checks command claims and both read paths.

Mac SQL attempt `prototype-c` checked 71 W0 cases across evaluate, reconcile and affected. Both read paths produced the expected independent answer in all 213 oracle responses, with three frozen coordinates and 68 remapped cases. A new peer recovered the original grouped receipt, pinned value and erase marker. The separate SDK process checked 11 requests, including three distinct receipts at one native transaction across two accounts. The benchmark component stopped on a bad seed revision index. `benchmark-d` fixed the index and ran fresh databases. [Attempt evidence](SHA256SUMS)

## Observed alternating arms

Both databases were seeded with 1,024 subjects of 160 facts. Each treatment acknowledged 960 distinct saves across eight windows, with a fresh cohort per window. Ranges are the two reversed-order blocks at each depth in the shared lab VM.

| Outstanding | Saves/s incumbent | Saves/s compact | Native apply µs/save incumbent | Native apply µs/save compact | ACK p99 ms incumbent | ACK p99 ms compact |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 64–87 | 77–122 | 2,993–5,406 | 778–1,327 | 30–95 | 29–35 |
| 8 | 113–124 | 416–598 | 809–1,182 | 325–344 | 119–174 | 22–43 |
| 32 | 158–262 | 662–678 | 462–589 | 229–292 | 174–347 | 67–74 |
| 64 | 99–169 | 614–742 | 1,101–1,194 | 222–252 | 397–720 | 88–123 |

| Outstanding | Path | Mean members/tx | Datoms/save | Value bytes/save | Fressian bytes/save | PostgreSQL WAL bytes/fact |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Incumbent | 1.0 | 29.00 | 4,493–4,506 | 4,765–4,779 | 1,223–1,285 |
| 1 | Compact | 1.0 | 11.00 | 290–293 | 433–441 | 531–540 |
| 8 | Incumbent | 4.0 | 35.58–36.67 | 4,709–4,736 | 4,979–5,012 | 851–1,076 |
| 8 | Compact | 4.0 | 10.25 | 287 | 382–394 | 288–357 |
| 32 | Incumbent | 7.5 | 36.29–36.34 | 4,732–4,734 | 5,006–5,007 | 820–861 |
| 32 | Compact | 7.5 | 10.03–10.13 | 286 | 381–386 | 231–238 |
| 64 | Incumbent | 7.5 | 36.32–36.34 | 4,733–4,734 | 5,005–5,010 | 805–882 |
| 64 | Compact | 7.5 | 9.98–10.10 | 285–286 | 384–386 | 230–236 |

The compact range at depth 64 gives 4.4× and 6.2× as many acknowledged saves per second within their matched blocks. Both writers average 7.5 members per transaction at that depth. Compact native apply falls to about a quarter millisecond per save. At that throughput it occupies a minority of elapsed time. Peer prep, the single in-flight group and durable log acknowledgement still bound the full cycle. The smaller payload also reduces WAL per changed fact by about 72% in these arms. The PostgreSQL LSN counter covers indexing during the timed interval.

Current and pinned percentiles use 24 exact reads per arm and depth block. Cold uses 32 untouched subjects per path in each of two blocks. Pinned targets the seed before the one correction. The short samples make p99 sensitive to one slow query, and the historical depth is one or two events.

| Read | Incumbent p50 ms | Compact p50 ms | Incumbent p99 ms | Compact p99 ms |
| --- | ---: | ---: | ---: | ---: |
| Current, touched | 0.784–1.344 | 0.048–0.138 | 2.937–25.818 | 0.219–1.688 |
| Pinned | 0.899–1.431 | 0.195–0.318 | 3.620–10.333 | 0.618–3.602 |
| Current, untouched | 1.438–3.931 | 0.307–0.496 | 6.601–30.980 | 4.367–12.394 |

[PASS audit and evidence binding](AUDIT.md) · [Checksums](SHA256SUMS)

## Reproduce the SQL comparison

```sh
node lab/bin/heavy.mjs --label DX-COMPACT1 -- node lab/bin/engine.mjs compact-probe --holder DX-COMPACT1 --run prototype --image tx2-datomic:dx-w1-small-cost-69a7e6cd --out prototype-new
node --experimental-strip-types "$attempt_dir/source/gate.ts" "$attempt_dir"
node lab/experiments/EXP-DX1/compact1/measure-summary.mjs "$attempt_dir"
```

Use the created durable attempt directory for `attempt_dir`. The runner keeps the domain, benchmark, recovery, SDK and loader logs separate and records their individual exits. `--run benchmark` runs the timing arms alone. `measure-summary.mjs` accepts `benchmark` or `load` after the attempt directory to reduce an individual completed component. A result used for comparison must include its complete arm sequence and cleanup record.
