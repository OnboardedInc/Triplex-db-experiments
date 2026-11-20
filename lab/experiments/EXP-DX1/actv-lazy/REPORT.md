Use `48f55759494f6a6a04eeb6aa5284dde3e166d431`. The Mac shared-geography gate and the server's 64-person preflight passed at that exact commit.
A single write records the new rules and what notices are owed. At 10,000 deep people that write took 38 ms on the Mac.
A background worker writes the changed values and individual notices in short turns. The recipient can stay offline while it records them.
Before a value is stored, reads at the receipt’s cut derive it. Stored values serve that same cut. Later saves use the latest source.
A new release can stop an obsolete value copy. Notices from both releases still get recorded in order.
A shared wage-floor save covers the full roster when the database cannot prove a smaller affected set.
On the server, 64 people took 42 ms to the quiet receipt and 58 ms to the first correct answer. At 23.5 saves per second those took 85 and 93 ms.
The first local replay waited 55 minutes for a slot. The live timing pilot has waited over two hours. The receipt and erasure rulings remain open.

### Part 7

The value and notice archives are separate native scopes on the same writer. Frames bind their receipt, exact source cut, release and cursor. The W1 queue has live priority and fair bulk turns. A service estimate bounds submitted work per frame. The measured P6 ratios must still decide whether that allowance is sufficient. [Design and receipt audit](PART7.md)

The STG1 fallback from `fa53e50cd` keeps generic source edits at full-census coverage. Joined saves may use one person only when the original native command proves the namespace is private. The specific shared floor already took the census path in joined Publish, so that recipe did not omit a person. The previous general save recipe allowed an unproved narrow list. The companion's seven memory tests passed. The joined regression checks both sides of Publish and the unaffected complement before delivery.

BM1 `i27-1` and `i29-1` stopped before the large offers because Joined Save passed an empty geography owner as an owner claim. The repair plans a census reconcile for either shared geography kind. The native test replayed three shared edits with seven affected people and one unchanged person each, three stops, a lost acknowledgement and 35 ordered effects. It removed its volume. [Part 8 checksums](PART8-SHA256SUMS)

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

The 10,000-deep trial spent about 26 minutes on preparation and reached the contested timing boundary. It yielded its heavy token and removed the volume before either live window. The shared lease also blocked the 1,000-deep fallback and the untimed matrix. Both waiters closed before admission. [Part 7 checksums](PART7-SHA256SUMS)

Transactor and gateway suspension, the fixed 64-reader trace and wider cold-read measurements remain open. BM1 `i33-1` passed all six small cells, the shared census, both settlement rates and the typed bulk refusal. The 100,000-person run still needs a producer that verifies the existing SCALE1 seed or a separate joined seed. [Part 8 evidence](PART8.md)

### Server command

Use the pinned checkout on the first line and the managed W1 slot with live priority enabled. [Environment and predictions](SERVER.md)

BM1 `34badc007`, evidence `i14-1` and `i17-1`, replayed 30 point answers and 757 effects. `Store.commit` had discarded the adapter's typed cause. The Mac W1 gate got HTTP 413 `BulkFrameTooLarge` with no head change and accepted and replayed the smaller retry. The same native run matched 199 stored changes, 118 ordered notices, two worker kills and two automatic wakeups. Its volume was removed. [Checksums](PART7-SHA256SUMS)

```sh
TX2_SWEEP_STRICT=1 TX2_W0_POINT_JOURNAL=1 TX2_W0_RESTORE_INDEXED_JOURNAL=1 TRIPLEX_DATOMIC_LAYOUT=lean node lab/bin/heavy.mjs --label DX-ACT1 -- node --experimental-strip-types lab/experiments/EXP-DX1/actv-lazy/join/server.ts 100000 "$DX_LAZY_OUT" --settlement
```
