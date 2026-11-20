Preparing a full group took most of the time on the Mac.
Eight-save groups spent 86% of their gateway turn preparing the edits.
The forecast was 25% to 55%. Both repeats were above it.
Almost all of that preparation was Datomic applying each edit on the gateway.
The durable log append took about 2 ms at the median.
All 1,152 saves had the expected receipts, feed entries and pinned field reads.
The comparison used ten synthetic accounts on a one-core shared Mac slot.
The next build targets the repeated apply.

**North star.** P2 durable saves and P6 isolation, with P1/P3 exact cuts and feed. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)
**CEIL-MAC-ORTHO eight-member probe.** W1 source `7a6a7e9ef`, prepared-request reuse and predecessor lookup on, original row encoding, cap eight, 1,152 subjects with 160 scalar fields each. The six blocks used disjoint cohorts at 1/8/32/32/8/1 outstanding, 192 replacements per block.

| Outstanding | Members | Groups | Evaluate / materialize ms | Native apply / append ms | Append to last ACK ms |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 384 | 0 / 0 | 4.126 / 1.294 | 2.227 |
| 8 | 4 | 41 | 82.551 / 0.328 | 2.014 / 1.466 | 4.404 |
| 8 | 7 | 27 | 109.033 / 0.432 | 4.200 / 2.445 | 7.258 |
| 32 | 8 | 46 | 117.359 / 0.488 | 3.619 / 1.995 | 6.257 |

Values are medians within the displayed occupancies. The full table includes the smaller groups and per-group observations. The 8-outstanding arm produced no full groups. Initial gateway request preparation was 0.388 ms median at depth one. Full groups carried 38,384 median native serialized bytes. Native append measures the actual durable log call, and the ACK interval ends at the last HTTP client response.
**Decision.** For all full groups, total evaluate plus materialize divided by total evaluate plus materialize plus peer await was 85.8% (85.1% and 86.9% by repeat). The loop's per-member receipt settlement follows that denominator. The prepare path clears the 15% stop threshold. Shared CPU and the small synthetic seed limit extrapolation.
**Evidence.** `DX-PREP1/ortho-03` under the durable lab evidence root, with the append/receipt join in `stages.json`. Attempts 01 and 02 retain startup failures. [Checksums](SHA256SUMS)
**Result audit.** `manage.py` records engine exit and binds its log digest, attempt, image and reservation. `probe.ts` checks the current attempt's durable operation receipts, strict positions/clocks, exact feed changes and reads at p−1/p. `read_probe.py` checks staged/build input hashes, attempt, slot, image, durable SQL settings, all edits, native database/t, datom counts, timing bounds and zero observer drops before writing measurements.

**Parallel preparation.** `TX2_PARALLEL_PREPARE=1` prepares strict lean single-owner saves with a bounded worker pool. The guard binds scope and feed flags, function revision, logical head and clock, exact subject revisions and retirements, journal absence and historical assertion IDs. Datomic enforces unique operation and command claims. Interacting members, layout changes and whole-scope predicates use W1. Definite refusal recomputes and an unknown reply is resolved by durable identity.
**Differential.** Four shuffled tapes per path yielded 144 durable receipts and 928 exact O-REPLAY snapshot answers, plus independent full feed-change checks. Same-subject chains shared one physical group. Six native witnesses covered an unrelated append, changed revision, retirement, ID reuse, duplicate claim and lost acknowledgement. The original receipt survives both a repeat operation and a fresh operation with the same claim. `DX-PREP1/parity-02` holds the attempt and all oracle inputs/answers.
**Audit follow-up.** Serialized duplicate checks precede mutable predecessors, and a same-group retraction uses its predecessor's assigned clock. The gate uses in-process Datomic. SQL restart recovery, lean erasure and cross-group provisional retraction metadata need separate evidence.
**Receipt audit.** The gateway acknowledges only on that native report's exact operation, position, clock and physical t. `gate.py` checks fresh scope/attempt, source and JAR hashes, full expected changes and pinned oracle answers before writing its verification. No acceptance pins changed.
**Window.** `TX2_PREPARE_WINDOW=prepare` renders the next dependency-disjoint group ahead of the current durable reply. `two` can submit that successor immediately. Its native guard requires the first group's exact final operation, position and clock. Only definitive refusals replay.
**Window evidence.** The Mac prepare-ahead arm verified 384 saves, 46 prepared physical groups and 22 successor renders before the preceding append completed, with zero replays. In six native scenarios, an injected intervening commit forced one replay in prepare-ahead and two with two submissions. Lost replies preserved all original receipts. `window-prepare-01` and `window-parity-02` are bound. The two-submission SQL arm is queued.
**W1 compatibility.** The integration incorporates `f5ef9f091` account admission and receipt assembly. Both paths stamp retraction times and supplied valid-time ranges from the exact predecessor. W1's shared-ledger and packed-journal layouts continue through the reference path. The merged gateway loads, and its native rerun is queued.

**Bare-metal forecast.** About 385 saves/s at today's field payload, with a 320–450/s planning range. Eight members need roughly 18–25 ms of effective service per group. At 50 and 235/s, predict 49–50 and 230–235 in-window saves/s, with p99 of 25–45 and 30–100 ms. At 394/s, predict 315–394 in-window saves/s. Expect p99 of 60–300 ms if all offers keep pace. A 320/s plateau accumulates roughly 14 seconds of p99 wait over a minute if the queue accepts every offer.
**Server command.** Use two disposable SQL-backed gateways on the same reference hardware. Both use strict lean rows, ready-only cap eight, predecessor lookup, prepared-request reuse, stage clocks and fast replies. Set diagnostic bulk seed caps to 2,048 rows and 1,048,576 bytes. Enable `TX2_PARALLEL_PREPARE=1 TX2_PREPARE_WINDOW=prepare` only on the second gateway.
`node --import tsx lab/experiments/EXP-DX1/prep1/live.ts "$DX_W1_URL" "$DX_PREP1_URL" 60`
