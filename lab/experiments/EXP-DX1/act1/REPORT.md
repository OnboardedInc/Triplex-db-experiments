# DX-ACT1 · Release activation
Yes. Activation as measured could overwrite a newer decision. All three delayed-result schedules reproduced the failure.
At transaction 20 a person's pay notice still said 1,600 cents. A delayed result from 15 replaced it with 1,500 and issued another notice after restart.
The W0 product publication rule is correct. The benchmark skipped a durable write, and both of its original checkers discarded the same part of the oracle's answer.
On 1,000 W0 subjects, the historical publisher left 884 guards missing or stale. Both opt-in fixes recovered all 1,000 expected states on Datomic.
Saving just the guard wrote 89 bytes per unchanged person, against 444 for a full rewrite. Across the whole release, guarded publication took 8.74 seconds locally.
The native cost ratio projects the old 73.78-second run to about 320 seconds for 100,000 people, or 53 minutes for ten such accounts in series. The bench time is unmeasured.
Changing only the EAD document lead time skipped rule evaluation for 675 of 1,000 people. Every person still received the correct durable decision.

North star P5. Commit `1d27933e` records the three failing tests before the fix. The historical checker accepted missing guards even after 100,000 comparisons. [Benchmark](../bm1/REPORT.md) · [W0 §8.8](../../../world/W0/SPEC.md) · [Targets](../../../TARGETS.md)

## Price of a correct activation

The native trial evaluated the same 1,000 W0 worlds for R1 and R2 at successive bases. Items changed for 116 people. Each arm used a fresh database scope, 32-subject frames, one outstanding frame and no background traffic within its scope. Timings below cover publication. Commit time is amortized over the roster.

| Per roster subject on local Datomic | Historical | Full state | Guard fact |
| --- | ---: | ---: | ---: |
| Asserted value bytes / bytes per guard-only subject | 141 / 0 | 533 / 444 | 219 / 89 |
| State rows / state page reads / claim lookups | 1.10 / .016 / .004 | 2.00 / .032 / .032 | 2.10 / .032 / .032 |
| HTTP requests / complete entity compare-and-sets | .048 / 0 | 1.192 / 1 | 1.192 / 1 |
| Publisher CPU / engine container CPU, ms | .213 / 1.180 | 1.854 / 12.054 | 1.415 / 8.408 |
| Commit / publication wall, ms | .494 / .746 | 10.113 / 10.908 | 7.840 / 8.737 |

Projection adds 50.79 s evaluation to 22.99 s scaled by the native publication wall ratio. Full-state rewrite projects to 387 s at 100k and 64.5 min at 1M. Guard-fact projects to 320 s and 53.4 min. This transfers a local idle-scope ratio to the loaded server and assumes linear serial scaling. Item-change shares were 11.6% locally and 9.8% on the bench.
Three full-sync SQLite trials also matched both corrected arms and projected 111–140 s for the guard. SQLite file growth per roster subject was 1,130 / 7,172 / 4,174 bytes. Datomic per-scope physical growth and physical index reads were unavailable.
The stock gateway returned HTTP 404. A source-pinned build on a managed exclusive slot ran all 13 publication schedules and the selector successfully. Both reservations for that build were released. The first native timing's source list was collected after a script edit. Only the repeat with 43 prelaunch files rehashed after exit supplies the native table. [Measurement code](price.ts)

## Narrow release

Only compiled R1→R2 edits confined to the unscoped DOCEXP EAD lead-days constant qualify. The index binds validated R1 outputs and reachable EAD membership to the source generation, both clocks and erasure frontier. A changed cut, missing index, unproved page or broader edit, including standard R2, takes the full path. Invalid source worlds surface their W0 error.
At the 0→90-day edit, 325 people owned a reachable EAD and 51 had no document link. Tasks or obligations changed for 239. Work-item payloads changed for zero. Exclusions received the new release and recomputed work versions. All output bytes and all reopened outboxes matched the independent oracle.
Each 256-ordinal page binds both roster hashes, release pair and source cut. Durable output precedes cursor advancement. Interruptions at 10%, 50%, 90% and between page write and checkpoint recovered exact coverage. A missing subject, duplicate ID, swapped page or foreign checkpoint was detected.
In the native-store functional run, the local planner took 0.95 s full and 0.47 s selected, including page checks. Building the index took 0.71 s. Recovery of build cost would take two comparable releases at the same cut with zero intervening upkeep. The cold path took longer than full.

## Bench handoff and audit

On a prepared BM1 checkout run `node --experimental-strip-types lab/experiments/EXP-DX1/act1/bench.ts --execute`. The three-hour controller runs native schedules, then the 100k narrow full/selector pair and the standard full release on fresh retained-seed clones, each with the guard and 256 live readers. [Runner](bench.ts)
Expect standard activation to exceed 100 s and the narrow edit to save evaluation work once indexed. The runner reports both cold and reused-index costs. The live read/commit p99 ratios and the 1.5× bars await execution. Each clone is released after P5 readback. The separate whole-history audit, throttled compaction trial and a P5 acceptance verdict remain open.
Publication audit. The schedules compare fresh scoped facts, original ACK identity, pending bytes and receiver sequences against bare Python W0. An independent process delivers the held record after a lost newer ACK. Pricing binds release/input/source/build digests, native owner and ordered readback from a second process. `native-repeat/price/price.json` uses source `b76f8ab3`.
Selector audit. Source edges and roster ordinals independently check every candidate and exclusion. Checkpoints verify the attempt, cut and page bytes. The replica driver rereads both committed release markers, complete outputs and all terminal states at named cuts. The bench collector binds the nonce, source/build, slot and frozen trace, reproduces ratios from raw windows, and compares the narrow arms' ordered world/output/state digest.
Local gates covered 18 experiment tests, 15 existing publication/parallel/oracle tests, 139 W0 kernel checks and focused TypeScript compilation. Broad bench typing reports 32 errors in three untouched files. The Python cases loader read 133/136 fixtures. Its raw-byte entry point returned the expected error for the remaining three. No acceptance pins moved.
The evidence root is `evidence/DX-ACT1/`. It contains the initial red test (`initial/first-red.tap`), native delivery and receiver witnesses (`native/schedules.tap`), selector checkpoints (`native/selector-files/`), SQLite repetitions and independent native state bytes (`native-repeat/price/*.observed.json`). [SHA-256 manifest](SHA256SUMS)

## Part 2 · Page guards

The fourth arm writes one page fence plus changed bodies. Commit receipts carry the exact input digest, covered bits, release and roster range. [Design and alternatives](DESIGN-2.md)
Audit. publishPage checks actual asserted bytes, input digest and original transaction identity; publishPages verifies ordered ranges against a separate roster and hashes the acknowledged range receipts. The new reader decodes body presence and basis masks independently at one position. The tests compare interrupted and racing states with bare O-DOMAIN and recover held work from a fresh process.
Audit. price.ts checks every reopened subject, scope, source/build and image binding. page-pressure.ts checks each native transaction and rereads the queued live facts before recording wait times. The worker gates compare all output bytes and order. The bench collector checks actual CPU readback, the historical control's expected guard mismatches, fresh trace samples, release markers and matched-roster digests.
