# Removing the encrypted copies

After a removal is published, each new request sees the removal marker at every pin. The removal must become unrecoverable within the request grace and the approved 15-minute key-rotation window. Encrypted bodies can be collected in ordinary storage maintenance after that. The standing decisions set no separate stopwatch for deletion of a body whose key cannot be recovered. [Q24](../../../acceptance/RULINGS.md) · [Q106d](../../../acceptance/RULINGS-PENDING.md) · [R38 §2.5, §3.4 and §7](../../../research/R38-erasure-design.md)

The first 128-body job wrote 467 leaf segments, took 5.68 seconds at the largest Mac size and coincided with a 389 ms save. Quiet save p99 was 1.28–1.50× its surrounding controls. Each index job took in 49,125 datoms, so the number of removed bodies did not describe the work that quiet accounts saw. [Diagnostic data](FAST.md#matched-scale-measurements)

Test two ways of handling the same authenticated set of published removals. Start both arms from fresh isolated copies of the same sealed seed and synthetic authority. Keep a deployed removal authority forward-only. Each arm receives the same ordinary write bytes in the same order and measures the same number of verified quiet saves, pinned reads and feed receipts. In the separate arm, require an index build and exact excision barrier before opening the ordinary indexing window. In the folded arm, queue excision without requesting a build. The same scheduled ordinary build runs in both arms after the same 32 ordinary writes. Compare total leaves, directories, elapsed native indexing and quiet p99 ratios across the windows. This checks folding into scheduled ordinary maintenance. Automatic threshold-triggered indexing remains a separate case. A timed-out ordinary build leaves the fold unmeasured and the cleanup debt pending. No age or time estimate from an idle wait substitutes for the native index and excision readback.

The two small Mac arms each removed exactly 100 encrypted bodies. Both verified all forty saves and pinned reads and feeds, including eight saves in the cleanup block. Separate scheduling wrote 153 leaves and 14 directories across two builds. Folding wrote 114 leaves and seven directories in one build. Total native build time was 765 and 477 ms, respectively. The 25.5% leaf reduction is a diagnostic of these layouts and this scheduled workload. The local run emitted quiet-operation counts. The 1.25× p99 bar still needs the 500-save prepared arms.

Allow one cleanup with an outstanding native barrier per database. Keep the matched-datom ceiling at 2,000. Record each completed build's leaf count, quiet latency and pre-build pending bytes, and derive a leaf estimate by data size and layout. Admit only when the predicted added leaf work fits a range already observed with all three quiet p99 ratios within 1.25 against both controls. Use both total leaves and the difference against ordinary indexing; a new layout or uncalibrated density needs a clean run before it receives a live admission threshold. If any ratio exceeds 1.25, hold new cleanup submissions until the regular workload has recovered and reduce the next batch. Native index work already in progress completes and remains charged. Keep the age of the oldest pending body visible for follow-up.

Use the same independently verified sealed manifest for both prepared arms. Give each arm its own fresh scratch restore and run them separately.

```sh
timeout --kill-after=15s 55m node lab/experiments/EXP-DX1/erase1/server.mjs check-cleanup-separate erase1-cleanup-separate erase1-fast-stage/staged.json
timeout --kill-after=15s 55m node lab/experiments/EXP-DX1/erase1/server.mjs check-cleanup-folded erase1-cleanup-folded erase1-fast-stage/staged.json
node lab/experiments/EXP-DX1/erase1/cleanup-index.mjs erase1-cleanup-separate erase1-cleanup-folded
```

Both prepared arms use 500 verified saves per block. The native barrier associates the scheduled transaction with the exact set of published encrypted bodies and checks those bodies are absent from history. The log reader ties the completed index entries to the same fresh source and stage binding, the exact cleanup cut and the observed ordinary maintenance window. A missing log or barrier produces no comparison.

[Evidence hashes relative to the experiment evidence directory](P3-CLEANUP-SHA256SUMS)
