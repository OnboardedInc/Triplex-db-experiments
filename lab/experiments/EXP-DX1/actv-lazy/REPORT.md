Publish still records the new rules and what notices are owed in one write. The previous 10,000-person deep run measured 38 ms.
A background worker writes the changed values and individual notices in short turns. The recipient can stay offline while it records them.
Until a value is stored, a read derives the answer from the receipt. A stored answer can serve the same exact cut.
A new release can stop an obsolete value copy. Notices from both releases still get recorded in order.
A shared wage-floor save covers the full roster when the database cannot prove a smaller affected set.
The earlier server command remains on hold while the revised producer and its collector run together on native storage.
The ten-thousand-person settlement timings and live-traffic ratios still need the reserved lab slot.
The owner still needs to rule on whether the receipt counts as stored and what to do with an owed notice after erasure.

### Part 7

The value and notice archives are separate native scopes on the same writer. Frames bind their receipt, exact source cut, release and cursor. The W1 queue has live priority and fair bulk turns. A service estimate bounds submitted work per frame. The measured P6 ratios must still decide whether that allowance is sufficient. [Design and receipt audit](PART7.md)

The STG1 fallback from `fa53e50cd` keeps generic source edits at full-census coverage. Joined saves may use one person only when the original native command proves the namespace is private. The specific shared floor already took the census path in joined Publish, so that recipe did not omit a person. The previous general save recipe allowed an unproved narrow list. The companion's seven memory tests passed. The joined regression checks both sides of Publish and the unaffected complement before delivery.

The seven ACTREVIEW2 findings have a written response. The revised format keeps the offer, durable component clocks, independent deadline samples, terminal status, oracle tape and exact outputs. The collector checks those bytes and clocks. The original BM1 collector is not compatible with the revised format. [Launch review](REVIEW2.md)

### Prior measurements

On the Mac, 10,000 deep people took 38 ms to the receipt and 49 ms to the first correct connected answer. Storing all 49,297 values with the notice-only index took 21.66 s. The faster compact path stored the original three-rule release in 796 ms at 10,000 people. [Part 6 price and scope](PART6-PRICE.md) · [Part 6 checksums](PART6-SHA256SUMS)

The deep notice leaf used 48.2 bytes per person, plus about 101.3 bytes of durable addresses. That is an encoded storage count. P7 measures resident bytes outside Postgres. The first-read and resident-account evidence must be reported separately. [Part 5 read stages](STAGES.md) · [Retention choice](RETENTION.md)

### Server command

Hold until the version-matched native preflight completes. Use the managed W1 slot with live priority enabled. [Environment and predictions](SERVER.md)

```sh
TX2_SWEEP_STRICT=1 TX2_W0_POINT_JOURNAL=1 TX2_W0_RESTORE_INDEXED_JOURNAL=1 TRIPLEX_DATOMIC_LAYOUT=lean node lab/bin/heavy.mjs --label DX-ACT1 -- node --experimental-strip-types lab/experiments/EXP-DX1/actv-lazy/join/server.ts 100000 "$DX_LAZY_OUT" --settlement
```
