# Compact and incumbent gateway paths

**North star.** P2 durable service and throughput, P1 pinned replay and P4 current pulls. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

The incumbent control is the starting revision of W1 (`3b8172bbe`), using strict lean scopes and the grouped gateway writer. Both treatments get the same 1-, 2- and 3-field replacement tape. Each save replaces existing fields on a different 160-fact subject. The compact arm prepares concurrent ready requests and sends up to eight in one physical transaction. The incumbent prices its normal peer preparation, speculative apply and group append. The two databases share the same owned PostgreSQL transactor stack.

Each depth/arm uses 120 completed saves per block. Order reverses at each depth between the two blocks. Timing starts at a closed-loop request on the peer, includes gateway prep, native transaction and durable member response, and omits HTTP, TypeScript model conversion and application replicas. Native apply is the sum of measured transactor apply over physical transactions divided by verified logical saves. For body size use native log datoms and the UTF-8/scalar convention in the [census](CENSUS.md). Canonical Fressian uses the actual datoms. Cluster WAL is the PostgreSQL insert-LSN delta per replaced business fact during an arm, with native maintenance included.

The current read prices an already touched subject. The pinned read revisits the seed cut after replacing the field. Each returns and compares all 160 facts. The cold subject has never been read or edited in that peer. Datomic storage segments may already be resident from seed and indexing. Owner, account, field width, native group, receipt and staged source are retained in the attempt.

The domain checker runs both current and pinned worlds through unchanged independent O-DOMAIN. Some frozen cases put several owners at one supplied logical position. Those cases replay in the same prerequisite order on separate subject saves and are compared at their explicitly remapped positions. The remaining exact-position cases compare to the frozen output. A separate temporal fixture tests an interior physical group cut, two microsecond boundaries, durable duplicate resolution after a deliberately dropped native result, predecessor metadata in the feed, and the erased marker at a pre-erasure coordinate. The TypeScript driver calls the experimental gateway through its exact wire requests and checks command claims and both read paths.

Mac SQL attempt `prototype-c` checked 71 W0 cases across evaluate, reconcile and affected. Both read paths produced the expected independent answer in all 213 oracle responses, with three frozen coordinates and 68 remapped cases. A new peer recovered the original grouped receipt, pinned value and erase marker. The separate SDK process checked 11 requests, including three distinct receipts at one native transaction across two accounts. The benchmark component stopped on a bad seed revision index. The corrected benchmark has its own fresh slot and attempt. [Attempt evidence](SHA256SUMS)

[PASS audit and evidence binding](AUDIT.md) · [Checksums](SHA256SUMS)

## Reproduce the SQL comparison

```sh
node lab/bin/heavy.mjs --label DX-COMPACT1 -- node lab/bin/engine.mjs compact-probe --holder DX-COMPACT1 --run prototype --image tx2-datomic:dx-w1-small-cost-69a7e6cd --out prototype-new
node --experimental-strip-types lab/experiments/EXP-DX1/compact1/gate.ts "$attempt_dir"
node lab/experiments/EXP-DX1/compact1/measure-summary.mjs "$attempt_dir"
```

Use the created durable attempt directory for `attempt_dir`. The runner keeps the domain, benchmark, recovery, SDK and loader logs separate and records their individual exits. `--run benchmark` runs the timing arms alone. `measure-summary.mjs` accepts `benchmark` or `load` after the attempt directory to reduce an individual completed component. A result used for comparison must include its complete arm sequence and cleanup record.
