At 10,000 compact people, the account recorded 1,650 wage notices in 37 ms with four database changes.
The original three-rule release now stores 3,764 concrete changes in 796 ms on that compact fixture. The connected reader answered at 807 ms.
At 1,000 real deep people, the recipe was durable in 68 ms. Staging 5,759 concrete changes with the notice-only index took 1.052 seconds.
The deep notice leaves use about 48 bytes per person. A reader-only save adds no notice or index changes.
Bounded staging removes the single-request limit for a release. The 100,000-person deep estimate for concrete output still exceeds one second.
Native crashes, two competing releases, same-person writes, changes for everyone or nobody and idle expiry matched the oracle.
The six-cell server command passed a small native collector check. Server timings remain open.
The owner still needs to decide whether a durable recipe counts as stored and whether erased submissions should pause or be cancelled.

### Read path

Quiet figures are paired local medians from four cases apiece. The release is learned by querying the latest committed database position. The pinned source pull took 10–19 ms on a deep person, and rule evaluation and serialization took about 1–2 ms. Starting a fresh process took 469–552 ms on average, including module loading and native session setup. The included save overlap raised the time to get to the final native commit request. Guest CPU averaged 5.5–13.5% busy across eight virtual cores with no native quota throttling. The historical trace lacked host resource and transactor queue clocks. [Full stage budget](STAGES.md)

### Joined publication

An account transaction installs the LAZY marker, changes the notice tail and appends the ordered owed event. The marker and event share the same source cut. Ordinary reads derive from that marker and verify the exact database position and erasure frontier. DELTA indexes only notice-changing inputs. NOTIFY1 replays the immutable cut and maintains ordered recipient deduplication. Stored mode adds the actual changed values and deletions. Envelopes mode also preserves the complete W0 answer bytes. [Design and companion source pins](JOIN.md)

Externally named saves keep their own IDs separate from calendar events. Dated corrections retain the earlier valid interval. Reader-only saves update source and clock with zero notice or index changes. A notice-input save adds an event and changes the tail. A changed posting updates one compressed base-relative leaf. A shared dependency or backdated change can invalidate the index and lead to an exact census fallback. The experiment enrols a fresh W0 recipient epoch. Deep-profile joined support, migration, protected inputs and production latency remain open. [Costs and limits](COST.md)

### Verification and evidence

- The two raw stage captures verify all 64 read responses per build against Python at the reported cuts. The shared-cut run also checked 19 historical and erasure reads. The old 23 publication schedules, six other experiment tests and 174 frozen W0 tests passed.
- The final native join gate killed three processes and checked 11 full-census cuts. It recovered the exact lost publication receipt, admitted the two-hop correction, retained the earlier valid value and replayed 21 ordered recipient effects. The independent range grid checked 4,000 subject, clock, edit and coverage combinations. The 1,000-person price run independently checked the full source roster at eight release cuts, every physical change, 18 saves and all 883 recipient effects.
- Receipt audit. Joined `install/state/original/command` check durable operation bytes, native generation, independent roster, command intent and exact predecessor. `choose/admit/marker/physical` verify source cut, leaf and census matches, witness, event and chunk assertions. NOTIFY1 `Documents.original/commit`, `Notices.create/event/plan`, dispatcher and receiver bind epoch, event parent, packet, native receipt, effect and acknowledgements. `Reference.check/receiver`, `gate/price` and the range test compare complete pinned answers, changes and ordered effects to the oracle. `timing` binds request nonce, release and cut. `local` verifies source, binaries, inputs, image, slot and volume before and after. Reducers validate sealed evidence bytes and attempt identities.
- The private evidence is under `evidence/DX-ACT1/lazy-join/`. Key attempts are `baseline-a`, `reader-d`, `joined-proof-d`, `price1-c`. The pool refused the optional 10,000-person joined price on its disk forecast. Earlier unallocated attempts and that refusal are retained as admission logs. Trial volume removals are in each cleanup log. No acceptance pin moved. [Checksums](PART5-SHA256SUMS)

The Part 6 compact repeat independently checked all eight release cuts, each stored value and the receiver. Its volume was removed. [10,000-person cost and estimates](COST.md) · [Part 6 checksums](PART6-SHA256SUMS)

Deep receipt audit. The deep save previews the actual enrolled root and attached rows at the proposed native predecessor. Every accepted change carries the same source receipt, calendar, index operations and notice tail. The profile compares the first native answer, release cuts and effect ledger with Python on the authored deep inputs and verifies every save’s actual native byte and position.

Staged receipt audit. `stage/checkStage/collectStage` verify the original scoped manifest, exact native positions and unreachable chunk identity. `publish/marker/physical` bind encoded values and the source/marker cut. `rawDeep/deepImpact/replaceDeep` and the oracle gates bind enrolled subject operations and independently authored inputs. `fast-price/stage-gate/deadline-gate/server` verify actual output bytes or receipts from fresh attempts, including the receiver and scope. Server time series keep offers that miss the deadline in the raw ledger. See [Part 6 implementation and audit response](PART6.md).

The first native staged gate verified a killed writer, an abandoned and collectable stage, a competing release, all-change and empty releases, and an original receipt after lost ACK. The idle boundary gate recorded the expiry event with zero saves and proved one recipient effect after reopening.

Native stage, race and expiry evidence is complete. The 10,000-person comparison isolates ranges, threads, input reuse, staged writes and encoding. The native 64-person server-command smoke checked six cells, 28 saves and 757 ordered effects. The 10,000-deep price is loading its fixture. [Measured work and estimates](PART6-PRICE.md) · [Deep server command and predictions](SERVER.md)

The final staged gate verified both orders of the same-person save and a new deep reader during an abandoned stage. The deep fixture’s independently encoded notice leaf costs 48.2 bytes per person at 10,000. [Evidence checksums](PART6-SHA256SUMS)

At 1,000 deep people, receipt-only Publish took 68 ms durable and 85 ms to the first correct answer. Staging all 5,759 changed values took 1,052 / 1,068 ms using the notice-only index. The independent oracle verified 2,003 recipient effects. [Deep save costs](PART6-PRICE.md)
