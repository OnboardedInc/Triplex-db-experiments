Datomic applied each save on the gateway before it could send the group.
That work took 86% of the gateway turn for full eight-save groups on the shared Mac.
The forecast was 25% to 55%, and both repeats were above it.
Independent saves now prepare in parallel, and a ready second group can overlap the first.
The checks covered exact receipts, history and the order and content of changes.
At 50 and 235 offered saves per second, the Mac acknowledged more saves sooner. Peak results varied.
The predicted server ceiling for this guard is about 300 saves per second, with a range of 260 to 360.
Lean erasure and lost replies across a database restart still need direct evidence.

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
**Evidence.** All attempt directories below sit under `evidence/DX-PREP1` in the durable lab evidence root. `ortho-03/stages.json` joins every group to its native append and receipts. Attempts 01 and 02 retain startup failures. [Checksums](SHA256SUMS)
**Evidence audit.** `manage.py` records engine exit, log digest, attempt, image and slot. `probe.ts` checks fresh durable receipts, strict positions and clocks, exact feed changes and reads at p−1/p. `read_probe.py` checks staged/build hashes, attempt, slot, image, durable SQL settings, edits, native database/t, datom counts, timing and zero observer drops. `live.ts` checks fresh scope, exact feed changes and durable receipt readback. `read_live.py` joins exact offered IDs and outcomes to the staged image, slot, native database/t and append timing before counting rates or tails.

**Parallel preparation.** `TX2_PARALLEL_PREPARE=1` prepares strict lean single-owner saves with a bounded worker pool. The guard binds scope and feed flags, function revision, logical head and clock, exact subject revisions and retirements, journal absence and historical assertion IDs. Datomic enforces unique operation and command claims. Interacting members, layout changes and whole-scope predicates use W1. Definite refusal recomputes and an unknown reply is resolved by durable identity.
**Differential.** Four shuffled tapes per path yielded 144 durable receipts and 928 exact O-REPLAY snapshot answers, plus independent full feed-change checks. Same-subject chains shared one physical group. Six native cases covered an unrelated append, changed revision, retirement, ID reuse, duplicate claim and lost acknowledgement. Both repeat operation ID and fresh operation ID with the original claim resolve the exact original receipt. `parity-02` retains the inputs and answers.
**Receipt audit.** The gateway acknowledges from the exact durable report's operation, position, clock and physical t. `gate.py` checks fresh scope/attempt, source and JAR hashes, full expected changes and pinned oracle answers before recording verification. Acceptance pins were left intact.
**Window.** `TX2_PREPARE_WINDOW=prepare` renders the next dependency-disjoint group ahead of the current durable reply. `two` can submit that successor immediately. Its native guard requires the first group's exact final operation, position and clock. Only definitive refusals replay.
**Window evidence.** Both Mac SQL arms verified 384 saves. Prepare-ahead rendered 22 successors before the preceding durable append returned. Two-in-flight submitted 22 successors before that return and the native reader received all 22 while the predecessor was still pending. Both arms had zero definitive replays. An injected advancing commit forced one replay in prepare-ahead and two with two submissions. Lost replies preserved original receipts. `window-prepare-01`, `window-two-02` and `window-parity-02` bind these results.
**W1 compatibility.** Merged gateway source through W1's `3223c5e37` passed the same eight oracle runs and six window cases in `merged-parity-compound`. W1 common code supplies duplicate handling, fair account turns, and authoritative predecessor clocks and valid ranges. Optional shared-ledger and packed-journal writes use W1. The SDK build and W1's 281-assertion gate passed. The latest W1 research-only update merges cleanly.

**Mac offered load.** `live-01` used matched 10-second A/B/B/A windows, ten namespaces in one SQL-backed database per arm and 96 client sends outstanding at most. Each save edited 1–3 fields of a 160-field subject. A uses W1 grouped, B prepares ahead with one submission in flight. Each cell gives in-window durable ACKs/s / completed p99 seconds, ordered by arm.

| Offered/s | W1 A0 | Prepare B1 | Prepare B2 | W1 A3 |
| ---: | ---: | ---: | ---: | ---: |
| 50 | 25.7 / 5.18 | 34.3 / 3.56 | 36.9 / 3.02 | 23.2 / 6.16 |
| 235 | 50.5 / 32.30 | 81.7 / 23.81 | 73.7 / 27.42 | 52.9 / 36.83 |
| 394 | 65.7 / 56.18 | 56.6 / 55.54 | 75.3 / 48.82 | invalid |

Every offer in these shared-slot windows exceeded 50 ms or missed its ACK. All clean arms drained every offer. A3 at 235/s recovered 68 original receipts. At 394/s every one of its 526 CAS conflicts followed a lost durable predecessor known only to the database, invalidating that bookend. The corrected driver freezes the subject until it knows the durable predecessor.
**Where the time went.** At 235/s the two prepared arms' median native apply for full groups was 89.0/89.8 ms, against W1's 4.2/5.2 ms. The median durable append stayed about 2 ms. Some of the work moved into the transactor's authoritative checks. At 394/s, after-drain durable rates in the three usable windows were 59.1, 60.0 and 66.9/s. `live-01/native-cost.json` recounts each native group by path.
**Bare-metal forecast.** About 300 saves/s with this guard (260–360/s), against the original W1 estimate of 210–300/s. The range discounts the analyst's 320–450/s for the measured native apply cost and the modest peak rate gain. Predict 49–50 and 225–235 in-window saves/s at 50 and 235 offered with p99 of 25–45 and 35–130 ms. At 394 offered, predict 255–360/s and roughly 6–31 seconds of p99 wait over a minute if all offers queue. Serving 394/s needs a full eight-save cycle below 20.3 ms.
**Server command.** Use two disposable SQL-backed gateways on the same reference hardware. Both use strict lean rows, ready-only cap eight, predecessor lookup, prepared-request reuse, stage clocks and fast replies. Set diagnostic bulk seed caps to 2,048 rows and 1,048,576 bytes. Enable `TX2_PARALLEL_PREPARE=1 TX2_PREPARE_WINDOW=prepare` only on the second gateway.
`node --import tsx lab/experiments/EXP-DX1/prep1/live.ts "$DX_W1_URL" "$DX_PREP1_URL" 60`
