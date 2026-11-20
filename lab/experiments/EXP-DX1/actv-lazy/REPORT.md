Server candidate `5100afc528b8bf188532bc621c81a0fc332dd644` is pushed. The Mac settlement preflight is waiting for the shared lease.
A single write records the new rules and what notices are owed. At 10,000 deep people that write took 38 ms on the Mac.
A background worker writes the changed values and individual notices in short turns. The recipient can stay offline while it records them.
Before a value is stored, reads at the receipt’s cut derive it. Stored values serve that same cut. Later saves use the latest source.
A new release can stop an obsolete value copy. Notices from both releases still get recorded in order.
A shared wage-floor save covers the full roster when the database cannot prove a smaller affected set.
On the server, 64 people took 34 ms to the quiet receipt and 47 ms to the first correct answer. All six cells agreed.
The ten-thousand-person settlement timing and live-traffic ratios need a reserved slot. The receipt and erasure rulings remain open.

### Part 7

The value and notice archives are separate native scopes on the same writer. Frames bind their receipt, exact source cut, release and cursor. The W1 queue has live priority and fair bulk turns. A service estimate bounds submitted work per frame. The measured P6 ratios must still decide whether that allowance is sufficient. [Design and receipt audit](PART7.md)

The STG1 fallback from `fa53e50cd` keeps generic source edits at full-census coverage. Joined saves may use one person only when the original native command proves the namespace is private. The specific shared floor already took the census path in joined Publish, so that recipe did not omit a person. The previous general save recipe allowed an unproved narrow list. The companion's seven memory tests passed. The joined regression checks both sides of Publish and the unaffected complement before delivery.

### Second review

- Finding 2 `8b0db230d`. The collector accepts the exact `i17-1` file set and rejects a copy that omits one terminal.
- Finding 3 `8b0db230d`. `observations.test.ts` marks late starts, late native cuts and stale cuts as misses.
- Finding 4 `8b0db230d`. The `i17-1` replay matched three distinct fresh deadline subjects per cell and 30 sampled answers.
- Finding 5 `8b0db230d`. All six `i17-1` offer hashes compiled to the recorded release, were unique and were absent from the built-in set. The quiet staged offer was among them.

The four producer and collector source files match byte for byte at `5100afc52` and the observed `i17-1` source `ec996c073`. The replay used the original source and slot owner, and all four focused tests passed at `5100afc52`. [Full review response](REVIEW2.md)

### Prior measurements

On the Mac, 10,000 deep people took 38 ms to the receipt and 49 ms to the first correct connected answer. Storing all 49,297 values with the notice-only index took 21.66 s. The faster compact path stored the original three-rule release in 796 ms at 10,000 people. [Part 6 price and scope](PART6-PRICE.md) · [Part 6 checksums](PART6-SHA256SUMS)

The deep notice leaf used 48.2 bytes per person, plus about 101.3 bytes of durable addresses. That is an encoded storage count. P7 measures resident bytes outside Postgres. The first-read and resident-account evidence must be reported separately. [Part 5 read stages](STAGES.md) · [Retention choice](RETENTION.md)

The eight-fact thin fixture encoded 10.3–10.4 leaf bytes and 100–104 address bytes per person in three 64-person pages, including offsets near one million and 4.5 million. This calculation did not load those populations. Thirty-two small tests passed, and two queue tests separately exercised live preference and fair turns. The first native collector attempt caught a working-tree change at startup and released its volume. The replacement runs from a frozen checkout. [Part 7 checksums](PART7-SHA256SUMS)

### Server command

Hold until the version-matched native preflight completes. Use the managed W1 slot with live priority enabled. [Environment and predictions](SERVER.md)

BM1 `34badc007`, evidence `i14-1` and `i17-1`, replayed 30 point answers and 757 effects. The settlement gate found `Store.commit` had reduced a gateway policy failure to its adapter's generic message. The repair returns the original typed refusal after checking for a committed receipt. The strengthened W1 gate checks the refusal and then admits the same command with a smaller body.

```sh
TX2_SWEEP_STRICT=1 TX2_W0_POINT_JOURNAL=1 TX2_W0_RESTORE_INDEXED_JOURNAL=1 TRIPLEX_DATOMIC_LAYOUT=lean node lab/bin/heavy.mjs --label DX-ACT1 -- node --experimental-strip-types lab/experiments/EXP-DX1/actv-lazy/join/server.ts 100000 "$DX_LAZY_OUT" --settlement
```
