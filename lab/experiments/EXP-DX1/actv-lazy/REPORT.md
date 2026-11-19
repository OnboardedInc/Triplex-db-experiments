Activation changes the rules that a new account screen uses. A screen pinned before the change still sees the earlier answer.
One account write switched the rules for both 1,000 and 10,000 people. The switch visited zero people.
In the first local runs a fresh process returned the right answer 711–876 ms after the offer at 1,000 people and 777–1,062 ms at 10,000.
One wage switch missed one second. Its write took 288 ms and its first verified response took another 774 ms.
At 10,000 people the median first read in an existing process took 10.5 ms, a repeat took 5.9 ms and an unchanged reconciliation took 18.4 ms.
The wage change owed 1,650 notices at that size. Recording them took 19.6 s and applying them at the receiver took another 67.8 s.
The overtime change owed zero notices, including for people who never opened a screen. Screens and notices have different completion times.
The 100,000-person live-traffic test is outstanding. A one-second deadline for the last recipient or unrecoverable protected evidence would rule out this design for those uses.

### Local evidence

The first paired population runs used source `9d2fa21f3`, fresh native Datomic volumes and compact W0 facts. These diagnostics price the design on the shared Mac. [Proposed rule](RULE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

| People | Facts | Offer to durable, R1/R2/R3 (ms) | Durable to first cold answer (ms) | First/repeat/ordinary median (ms) | R2 changed and applied | Receiver effects/s |
|---:|---:|---|---|---|---:|---:|
| 1,000 | 4,109 | 54/30/25 | 822/680/724 | 13.8/7.6/17.7 | 166 | 20.6 |
| 10,000 | 40,898 | 30/288/54 | 795/774/723 | 10.5/5.9/18.4 | 1,650 | 24.4 |

Each size had three switches, 72 misses, 72 hits, 48 ordinary no-change reconciles and eight real saves. All 33,000 pinned outputs matched Python. The backdated two-hop correction added another 1,000 checks.
Every switch used 12 native HTTP requests and one 1,009–1,012-byte journal receipt. The first cold column includes process startup. No keep-warm work ran. R1 explicitly migrated all members. R2 sought qualifying locations and pay ranges. R3 examined zero release-only owners.
At 1,000/10,000 the eight saves took median 39.2/44.8 ms plus 43.3/47.2 ms for index maintenance and publication. Four item states changed at each size. The account cursor also advances over no-change source inputs.
Six isolated native admission schedules, reads across historical pins, unpaid rollback and reappearance, expiry despite a later correction, and the 23 unchanged ACT2 publication tests ran in the earlier small gate. The isolated admission fixture installed its own test cursor. The revised gate uses the real dispatcher for every transition.

### What the new rule promises

The account fact binds immutable release, effective instant and authorized slot. Its native assertion distinguishes a rollback. Derivation uses the exact account generation, transaction and microsecond. Cached results and replica fallbacks recheck current erasure. A listing binds its preceding roster page and cut.
An ordinary worker can consume only its own current one-person event through the same ordered dispatcher. Native comparison against its original predecessor covers missing facts, two-hop changes and release ABA. Unrelated writes may force retries. A private receipt cannot establish a paid event frontier.
Durable items, retirement, pending keys and the cursor commit atomically. Receiver effect and deduplication share a separate durable transaction. Earlier unacknowledged IDs block later IDs for that person. A real deadline arms a one-shot timer. Restart rebuilds the range index from the original feed.
Frozen W0 C82 exposes a per-person no-change guard and C123 accepts differing supplied records at equal clocks. Lazy stores no such guard. Frozen P5 still requires physical enumeration. The owner must decide whether exact screen visibility and recoverable notice debt satisfy the new activation target.
The pilot covers the stock W0 releases. Protected E-Verify submission is excluded pending a retention ruling. Recovery of an unpaid transition that needs erased evidence leaves its cursor open. Machine-loss recovery, physical shredding, a migrated outbox, the thin fleet and idle bytes remain unqualified.

### Receipt and verdict audit

- `store.commit/input/cursorReceipt` verifies original input and scope, native actor, changed rows, receipt identity and predecessor. `decision.admitLive` recomputes the witness, enrollment, exact slot and latest erasure. An ordinary event records its original witness inside the serialized cursor transaction.
- `readAt/readMany/list` compare exact canonical outputs or typed errors at explicit historical cuts, check current erasure after fills, and bind pagination and demand replicas to native identities. A cold process gets neither a release receipt nor an expected answer.
- `Projection.advance/Dispatcher.step` verify contiguous native source, original command bytes, sealed roster, ordered event and range, prior cursor and native commit. `Receiver.send/drain` verify generation, pending content, per-person order, original applied bytes and native acknowledgement.
- `negative/projection/admission/read/dispatch/dependency/boundary/service/crash/pressure` use fresh fixtures. Their checks cover an independent 180-world index grid, three historical failures, delayed decisions, real races and restarts, changed dependency edges, native cursor binding, unpaid effects and the receiver.
- `seed/price/local` bind the observed native population and roster to a fresh scope, source and built-module hashes, owner, slot, volume and image. Python checks every output, item delta and ordered delivery. Pricing checks the exact marker, zero roster visits, every normal reconcile and the final receiver database.
- Durable raw evidence is under `evidence/DX-ACT1/actv-lazy/`. The first paired runs are `rung1000-b` and `rung10000-b`. Both native volumes were removed. The public changes leave the acceptance contract, v3 trace and W0 files unchanged.
