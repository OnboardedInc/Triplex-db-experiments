# Owner head: the covering root as a default-off option

North star P2 and P4. `TX2_SUBJECT_OWNER_HEAD=1` makes the per-person writer keep a small covering root on each edited person, so a save no longer reads that person's old rows. Default off. Every number here is a Mac diagnostic at toy size. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md) · [Server command](SERVER-OWNER-HEAD.md)

## What it is

| Part | Behaviour with the option on |
| --- | --- |
| Save | An exact replacement of one to three fields goes to the covering writer. New rows go on a fresh version entity; the retired rows get markers there. The owner keeps one root value: the masked legacy row IDs and up to four live edited row texts. The writer compares the root bytes and the revision, then advances the revision as today. |
| Fold at four texts | A save that would put a fifth text in the root first runs a separate fold transaction with no logical position: the covered rows move back onto the owner, the masked legacy rows and the root are retracted. No row, position or clock changes, so the feed skips it. The save then migrates the person again. The paged spill is gone. |
| Other writers | Any other save on a person with a root folds that person first and then uses today's per-person or reference writer, with their usual outcomes and error codes. The reference function, compiled with the option only, refuses a payload for a person with a root and treats rows on version entities as not live. Prepared groups refuse such people. |
| Reads | Every product read route detects the format from the installed attribute, not from a setting: current and pinned reads, reads by assertion ID, history, reach, group-cut interiors and the native feed. Rows come back in the legacy index order. |
| Admission | A writer started without the option refuses a database that stores roots (`OwnerLayoutRequired`). With the option off nothing is installed and the gateway's function texts are unchanged apart from reader-generated symbol numbers. |
| Removal on request | All 13 routes pass with the option on, with the witness saved by the covering writer. |

## Gates

| Gate | Source | Result |
| --- | --- | --- |
| Layout gate on PostgreSQL: migration, races, framed root, fold at four with every cut and history equal to legacy, product routes equal to legacy (read, pinned at all 11 positions, history, by ID, reach, feed) across 3 folds, reference-writer fence, admission | `owner14-02`, `75ce37f40` | 5 tests, 160 assertions, pass |
| Per-person writer and conflict matrix with the option on (covering writer on the product route) | `owner14-02` | 7 tests, 936 assertions, pass |
| Same suites in memory, option on and off; gateway selftest on and off | `e2a49d9d6` merged tree | 1,096 and 782 assertions; 54,110 selftest assertions each way, pass |
| Lost reply and refused appends through the product route, `barrier6` and `rolling6` | `owner14-02` | 56 durable saves each, 6 refused appends absent after restart, lost reply recovered |
| Removal across the head (protected save by the covering writer, 2 identities erased, pinned before and after) | `owner14-02` | pass in both credit modes |
| DX-CHK1 removal combination, option on: 13 routes, 24 rolling saves, backup restore | `w1-removal-head-a` | pass |

### Combined check (DX-CHK1) on the merged head

Branch head `97081e286` (or `75ce37f40`, which differs only by the server document), merged with `exp/DX-INT1` `e13fcf13d`. Option off unless stated.

| Combination | Result |
| --- | --- |
| Removal on request with append retirement, rolling6: 13 routes, 24 rolling saves, backup restore | Pass (`w1-removal-a`) |
| The same with `TX2_SUBJECT_OWNER_HEAD=1`; the removal witness saved by the covering writer | Pass (`w1-removal-head-a`) |
| Fair import, quiet account and Publish: 46 positions replayed | Pass |
| Read study with saves, removal and import: 21 saves, 176 logical reads in 22 batches, 27 positions replayed | First attempt stopped on an untyped `TRIPLEX_ERASURE_FRONTIER` from an import racing the removal (the refusal family DX-CHK1 reported); the rerun passed with 31 and 24 typed refusals |
| Cold admission ramp with lost reply and resend: 9 positions | Pass |
| Realistic toy seed with removal: 13 routes, 24 saves, 101 positions | Pass (second attempt; the first stopped on a source-drift check because I committed during it) |
| Realistic toy seed with fair import and Publish: 106 positions | Pass |
| Policy B failover with append retirement | Pass |
| Native append recovery, serial revision and sampled lookups: 56 durable, 6 refused | Pass |
| Java 25 ZGC write gateway with removal | Not rerun (needs a separate Java 25 build receipt; the change is JVM-independent) |

`owner14-01` (source `6c615c1f5`) passed the same layout and serial gates, then one call of the removal probe hit the 5 s client deadline on a loaded Mac; the probe now names each call, and `owner14-02` passed it.

## Read cost

| Probe | Migrated person, current | Migrated person, pinned | Untouched person in an option-on database |
| --- | ---: | ---: | ---: |
| SQL gate, three JVMs, arms shuffled, 192 rounds each (`owner14-02`) | +12%, +40%, +50% | −1%, +29%, +32% | −6% to +4.5% |
| Same JVM, same data, 3,000 interleaved pairs, in memory, indexed | +1.6% to +4.5% | +2.5% to +5.4% | — |
| Same, with the gate's single-CPU 368 MiB JVM | +4.4%, +6.3% | +2.5%, +5.4% | — |

- **Untouched people pay nothing measurable.** That is the cost the option puts on everyone.
- **A migrated person's read is within 10% of legacy in the controlled probe, not in the SQL gate.** The SQL gate compares separate databases in a loaded Mac, and its control arm (identical code) drifted 2% to 7%. The trade, stated plainly: the processing a migrated read adds is 15–25 µs per 81-row person (root decode, mask, one merge), and the range it walks is 3 datoms (1.6%) larger. A first version sorted the merged rows and cost +70% in the SQL gate; that is fixed (`e2a49d9d6`).
- **Pinned reads walk the person's history, which now holds each old root.** After 16 saves the walked bytes grow +6% (one edited field), +35% (two) and +73% (eight, capped by the fold; +166% before it). People edited often across many fields will cross extra index leaves at full size.

## Records and bytes per save

| Tape (16 saves, same person) | Records per save, today → owner head | Added string bytes per save | Folds |
| --- | --- | --- | --- |
| One field | 23 → 25.94 (25 first touch, 26 later) | 2,284 → 2,589 (+13.4%) | none |
| Two fields (the scorecard edits answer and note) | 23 → 25.94 | 2,279 → 2,789 (+22.4%) | none |
| Eight fields | 23 → 25.75 + 2.81 fold records | 2,331 → 2,970 (+27%) | 3 folds of 15 records |

- **The extra three records** are the root's new value and the retraction of its old one, and the version-owner reference. The row retraction becomes a marker. Advancing the revision costs the same as today's revision check, so it adds nothing over today; it is what keeps every cache and fence keyed on the revision exact.
- **At 394 saves/s** that is about 1,180 more records per second (+13%). If records drive index jobs, the 64 s gap between jobs at 394/s becomes about 57 s; if bytes drive it, 52–56 s.

## Serial storage reads (the saving)

256 people × 160 facts per writer, indexed, transactor restarted before each writer and round, 64 people edited per round; per save after the first cold save.

| Writer | SQL fetches per save | EAVT | AEVT | AVET |
| --- | ---: | ---: | ---: | ---: |
| Today's writer | 1.37–1.54 | 0.57–0.64 | 0.57–0.65 | 0.22–0.25 |
| Append retirement | 1.48–1.78 | 0.54–0.68 | 0.68–0.75 | 0.25–0.35 |
| Owner head | 0.35 | 0.32 | 0.00 | 0.03 |

This speaks to the owner head only (16 GiB-like pressure on a toy seed). At today's full size, a 32 GiB cache already brings reads to 0.04 per save; the owner head matters for the growth case. [Server command and predictions](SERVER-OWNER-HEAD.md)

## Evidence

`owner14-01` and `owner14-02` in the private evidence folder `DX-W1`, with `owner14-verify.py` and `owner14-recovery.py`; the combined runs in `DX-CHK1/w1-*` and `DX-CHK1/load1`, `DX-CHK1/hasync-ack-*`.
