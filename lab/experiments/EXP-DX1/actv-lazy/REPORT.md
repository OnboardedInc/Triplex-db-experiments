The original 1.205-second first answer spent 898 ms outside the release write, receipt check and read call.
In the new traces most of that gap was starting a fresh process, loading modules and opening connections.
At 10,000 people the fix brought the connected reader down from 36 ms to 19 ms after durability. A fresh process took 499 ms.
At 1,000 people we recorded 166 owed wage notices in 48 ms with one transaction and four database changes.
Storing the 250 changed values as well took 86 ms. The first correct answer arrived at 105 ms.
A save that only changes the screen adds no notice or index writes. A changed notice posting updates one compressed index page.
The 1,000-person trial projects several seconds to store changes at 100,000. At one million, large edits also hit the request limit.
For an erased number, keep the fact that a submission was due and pause submission. [Owner decision](RETENTION.md)

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
