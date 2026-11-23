# Size and reads on the ordered save path

P2 and P6. Reduce serial storage misses without changing logical history, ACK durability, or the stored journal. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## What a save touches

For the ordered 20-record neighborhood, the following are effective data leaves after sharing repeated probes. A seek can also load branch segments. Ranges overlap. They express the model, since the full-size trace counts index loads and SQL fetches but contains no leaf keys.

| Index and purpose | Cold or hot | Distinct leaves per save, estimated |
| --- | --- | ---: |
| EAVT owner public identity, owner revision/CAS. Native cardinality-one checks can revisit them. | Old owner number, scattered across histories | 1–2 |
| EAVT owner, exact old row and retirement lookup at gateway; Datomic validates the concrete retraction on apply | Old owner and old row. Gateway and transactor caches are separate. | 1–2 on peer, common owner footprint on apply |
| AEVT row and revision native redundancy, including journal additions and predecessor retraction | Old row and owner scattered; new journal at allocated tail | 2–4 mixed |
| EAVT scope/account policy, erasure generation, function and head position/clock | Hot witnesses. Account identity is embedded in the protected owner key on this route. | 2–3 hot |
| AEVT reverse latest position after metadata-only commits, and `:db/excise`; EAVT attributes of any excision found | Hot constant keys and latest tail; can grow with excision records | 1–2 hot, extra on excision |
| AVET unique operation, claim and journal. Historical row prefix and ordered never-used range. | Hot ordered range on this tape. Externally supplied or legacy hashed IDs can scatter. | 1–3 hot, additional for scattered IDs |

About **7–13 distinct leaves** on the serial path, with overlap between owner probes. The central model uses 2.35 effective independently scattered leaves and 0.02 baseline fetches. Count cache-limited reads as `0.02 + L * (1 − min(1, C / W))`. `W = 32 GiB * N / 430 million` is an inferred effective working set for this tape. `C` is the transactor object-cache allowance. This calibrates at one point and assumes uniform access to that set. It is neither an index census nor a claim that 32 GiB is occupied at 430M. A few branch or log loads and changed index generations consume the same allowance. A second tier can remove SQL misses without making decoding free. [Datomic caching](https://docs.datomic.com/operation/caching.html) · [Datomic I/O counts](https://docs.datomic.com/reference/io-stats.html)

| Native records | Fitted effective cache to cover this writer set | Reads/save at 16 GiB | Approximate apply at like load |
| ---: | ---: | ---: | ---: |
| 430M | 32 GiB | 1.20 | 1.87 ms |
| 1B | 74 GiB | 1.86 | 2.38 ms |
| 8B | 595 GiB | 2.31 | 2.73 ms |

Apply for pressured arms prices 0.93 ms of observed residual plus 0.78 ms per SQL fetch and its decode. For the resident small seed, the cached-path anchor is 0.25 ms. A single fixed intercept would miss that seed by more than 3× if fitted to full size. Size scaling puts its working set near 3 GiB at roughly 43M records and predicts 0.02 reads, inside the observed 0.014–0.033. The full-size 1.20 prediction is inside the 0.70–1.30 observed band. At 430–477M, the model predicts roughly 1.9–2.0 ms versus the loader's 0.86 ms, outside 2×. The loader has a different tape, 256 outstanding, newer keys, and no matching per-save SQL or reuse-distance series. At 515–667M, the model predicts 2.0–2.3 ms, within 2× of 1.46–1.65 ms. The lowered cache-hit share and rising PostgreSQL reads support the mechanism; those counters and the 1.5% trend cannot identify an index depth change or validate an 8B slope. This projection has no safe 394/s margin at 8B on the reference path.

A whole-index estimate is a different quantity. If the toy density of 257 indexed datom appearances per segment held, and an average stored record had 2.8 indexed appearances with 40–100 KiB decoded per segment, the three sizes would need roughly 180–445 GiB, 415–1,040 GiB and 3.2–8.1 TiB to cache in full. Segment packing, compression and index coverage at scale are unknown. Sizing a cache from these extrapolations would need actual decoded geometry and reuse distances.

## Designs in test order

Each cell is predicted **SQL fetches / mean apply ms**, at 16 GiB and like loaded traffic. The last row needs a separate read-layout gate before build. These are forecasts, including the effect of shorter old-leaf work, without claiming the toy experiment is a volume-equivalent simulation.

| Design | 430M | 1B | 8B | Disk, migration, reads and journal |
| --- | ---: | ---: | ---: | --- |
| Append exact retirement on the existing marker attribute, built | 0.85 / 1.59 | 1.32 / 1.96 | 1.63 / 2.20 | Same datom count per eligible save. Old text remains current physically and the marker adds a shorter value instead of logging a full text retraction. Existing seeds mix both representations without rewrite. Match and pinned reads apply the marker. Current owner enumeration now does work proportional to that owner's retained markers and rows. Stored ordinary journal stays identical. |
| Narrow owner revision seek from DX-W1 part 8 | 1.10 / 1.79 | 1.71 / 2.26 | 2.11 / 2.58 | No disk or reader change. The serial revision fence already has a narrow AEVT option. It does not remove native redundancy on the old row. |
| Small owner head plus append-only version/retirement on new sequential entities | 0.20 / 1.09 | 0.30 / 1.16 | 0.36 / 1.21 | Target one small resident current witness per owner. Initialize on first write from the legacy row at a guarded cut. New event keys and compact pointers add records. A separate projection must bound current reads and translate old as-of cuts. Keep each journal change stored. Do not drop uniqueness or the excision witness until all writer and native-erasure entry points fence the same exact epoch. |

For the built arm the modeled scattered term drops from 2.35 to 1.65 leaves. It can instead move redundancy onto the marker attribute and leave SQL flat or worse. A bounded position-based head layout is the candidate for near-flat reads across ages, with bounded per-owner current reads, while moving full-history work away from serial apply. Claim, operation and retired-ID uniqueness indexes stay until an equivalent exact global reservation exists. Removing a reader-only index has no immediate gain on a path that seldom misses AVET.

The append arm is `TX2_SUBJECT_APPEND_RETIREMENT=1`, off by default, only for numeric, certified, ordinary per-person replacements. It leaves protected or irregular frames on the original route. The gateway already proves predecessor content and keeps it in the journal. Serial scope, excision, owner ID, revision, operation, claim and never-used-ID guards still decide. The marker uses the actual logical position, clock and transaction ID, checked directly in the committed report. Rolling admission releases credits on the same ACK boundary.

## Mac prediction and scale limit

The probe restored the same indexed 512 × 160 seed for six arms. It used the same 96 edits to scattered people in each arm and restarted the transactor before each. The index job reached native t 1577 with 975 segments and 251,049 per-index datom appearances. Using the 81,920 business facts as the lower endpoint of toy volume and indexed appearances as an upper endpoint gives proportional cache caps of 3.12–9.57 MiB at 430M, 1.34–4.11 MiB at 1B, and 0.16–0.51 MiB at 8B on the same 16 GiB basis. Even the smallest working cap tested, 32 MiB, cannot reproduce those ratios. At that cap, a proportional 8B simulation would need about 15.6M physical records. The exact counts below are toy evidence. Mac timings are diagnostic.

| Transactor cache | Current SQL, EAVT, AEVT, AVET per save | Append SQL, EAVT, AEVT, AVET per save |
| ---: | --- | --- |
| 128 MiB | 2.40, 1.00, 1.32, 0.07 | 2.10, 1.00, 1.03, 0.07 |
| 64 MiB | 2.40, 1.00, 1.32, 0.07 | 2.10, 1.00, 1.03, 0.07 |
| 32 MiB | 2.50, 1.02, 1.34, 0.14 | 2.10, 1.00, 1.03, 0.07 |

SQL is a storage fetch. EAVT, AEVT and AVET are separate segment-load counters. Every arm attributed 96 SQL fetches to the EAVT owner public-ID lookup. Native AEVT `:triplex.entity/row` fetched 126 times with retraction and 96 with append, and the new `:triplex.entity/retired` added two fetches. The two widest cache caps account for the entire net drop with those two changes. At 32 MiB, AVET and additional owner/revision work also contribute to the difference. The trial confirms that avoiding retraction removes one class of fetch and leaves first-touch owner work. The small cache sweep and cold per-person tape do not measure the large working set's locality curve.

The native parity and conflict gate checked 749 assertions across seven tests. Barrier6 and rolling6 each observed 56 exact durable saves, six refused appends with no visible record, and recovery of the original lost reply after restart. The test joined every reply to its own completed native append. PostgreSQL `fsync`, `synchronous_commit` and `full_page_writes` stayed on. Both images were removed and the slot and volumes released. [Evidence hashes](WRITE9-SHA256SUMS)

## Before the server run

| Copy and offered rate | Current ordered writer | Append retirement |
| --- | --- | --- |
| Fresh, 394/s | 0.9–1.35 SQL/save, 1.6–2.0 ms, 375–394 stored/s | 0.60–1.05, 1.35–1.85 ms, 385–394/s |
| Fresh, 620/s | 1.15–1.6, 1.8–2.3 ms, 430–510 stored/s | 0.75–1.25, 1.55–2.05 ms, 475–550/s |
| 1B, 50/s | 1.0–1.8, 1.5–2.4 ms, 49–50 stored/s | 0.7–1.35, 1.3–2.0 ms, 49–50/s |
| 1B, 235/s | 1.4–2.1, 1.9–2.65 ms, 228–235 stored/s | 0.9–1.55, 1.6–2.2 ms, 230–235/s |

These are pre-run ranges, conditional on the old-row work staying a material share at scale. The Mac establishes the direction on one toy tape. The discriminating outcome on the server is a reduction in sampled native AEVT row fetches with a stable EAVT owner check, and a corresponding reduction in total fetches. A flat or increasing total with reduced row fetches would put the next effort into the owner witness and reader costs rather than adoption.

Each arm starts from an independent restore of the same authenticated dump. Fresh runs 300-second windows at 394 and 620 with the pinned readers and journal. Aged runs 120-second windows at 50 and 235 with journal verification and without the fresh pinned-reader schedule. Both split windows into halves and report durable appends separately from ACKs. The second window follows the first window of that arm. The two options and credit mode must be observed and bound to the exact attempt and tape. Use the existing clean-build receipt, exact image/transfer hashes, and separate WAL volume. The 1B command also needs the aged bundle, dump pins and existing AGE1 Java setup.

```sh
DX_W1_RETIREMENT_PAIR=1 PREP1_LOOKUP_EVERY=64 bash lab/experiments/EXP-DX1/v01/adopted-server.sh \
  "$(git rev-parse HEAD)" "$OUT" "$DEADLINE_MS" "$SEED_DIR" "$IMAGE_PIN" "$TRANSFER_PIN" \
  fresh subject j21-g1 "" "" "" "" j25-zgc "$WAL_DIR" j21-g1 "${CREDIT_MODE:-rolling6}"

DX_W1_RETIREMENT_PAIR=1 PREP1_LOOKUP_EVERY=64 bash lab/experiments/EXP-DX1/v01/adopted-server.sh \
  "$(git rev-parse HEAD)" "$AGED_OUT" "$DEADLINE_MS" "$SEED_DIR" "$IMAGE_PIN" "$TRANSFER_PIN" \
  1B subject j21-g1 "$AGED_BUNDLE" "$AGED_PIN" "$AGED_DUMP" "$AGED_DUMP_PIN" \
  j25-zgc "$WAL_DIR" j21-g1 "${CREDIT_MODE:-rolling6}"
```

## Audit before the change

- The existing native result verifies operation, claim, journal, position and revision against this attempt's exact committed database value. The candidate also matches the new marker bytes, owner, final clock, position and native transaction in that report's actual datoms. No separate database lookup decides whether to acknowledge.
- The native comparison checks the pinned answers, exact ordinary journal and receipts for the same edits on fresh scopes and separately confirms that the physical retirement used a marker. The recovery fixture binds the seed, sender mode, write option, native transaction and durable/denied operations to its fresh attempt before reopening it.
- The cache fixture restores the same indexed dump bytes per arm and uses the same subjects, widths and values. It verifies the installed writer, marker ACK, durable operation and exact old and new values at their named cuts. The result carries the dump hash, cache setting, fresh arm and native transaction numbers. It issues no product or acceptance verdict.
- The server comparison hashes each arm's operations, binds native apply and append to the attempted database and t, and matches the feed, tape, pace and initial cut across separately restored arms. New marker reports are checked only on actual marker writes. No server command ran.
- No acceptance files or contract-pinned hashes changed in part 9.
- Nineteen local tape, credit and ordered-ID tests passed. Shell, TypeScript and Python syntax checks passed. A synthetic two-rate reducer run verified the half-window counts and refused modified operation bytes. The launcher has not been tested against a full-size or aged native dump.

Inputs to the model are `prep1/SCORECARD-FRESH-READING.md` at `e7a977908`, `age1/LOAD-READOUT.md` at `a0eee1ea1`, `scale1/AGE1-LOAD.md` at `28e5e59ee`, and `bm1/ROLLING-READING.md` at `86fc52d30`. The full-size archive counts are in `REPORT-DX-W1.md` at `ff4346209`.
