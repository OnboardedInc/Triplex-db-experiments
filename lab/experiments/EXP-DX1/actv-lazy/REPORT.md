A 10,000-person release that previously took 1.205 seconds to show included the cost of starting a new reader process.
The original trace measured 254 ms to make the release durable, 14 ms to check its receipt and 39 ms inside the first read.
In a fresh trace, an already-connected reader returned the new answer 36 ms after durability at the median. A new process took 563 ms.
On deep data, the corresponding medians were 29 ms and 625 ms. Both readers picked up the release on their next request.
The existing reader made seven database requests on a miss. The shared-cut option reuses control data from the same database position.
An account record can describe every owed notice in one transaction. Storing changed output values also takes work proportional to the changes.
The local joined experiment tests both costs. The earlier 10,000-person dispatcher took 25.6 seconds to record 1,650 individual notices.
A protected identity erased after a notice becomes due needs an explicit delivery rule.

### Local evidence

The first diagnostics at `9d2fa21f3` used separate native volumes. The repeats at `c4a0505fb` ran independent compact W0 scopes on one fresh stack after the queue probe. The table gives the repeats. [Proposed rule](RULE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

| People | Facts | Offer to durable, R1/R2/R3 (ms) | Durable to first cold answer (ms) | First/repeat/ordinary median (ms) | R2 changed and applied | Receiver effects/s |
|---:|---:|---|---|---|---:|---:|
| 1,000 | 4,109 | 185/59/38 | 1740/1096/1246 | 28.6/14.8/47.7 | 166 | 9.6 |
| 10,000 | 40,898 | 43/254/54 | 951/951/1005 | 20.5/11.1/29.9 | 1,650 | 17.5 |

Per size and attempt we checked three switches, 72 cache misses, 72 hits, 48 no-change reconciles and eight real saves. Python matched 66,000 pinned outputs plus 2,000 more after backdated two-hop changes. The initial 10,000-person wage switch also exceeded one second at 1.062 s.
Every marker used 12 native HTTP requests and a 1,009–1,012-byte journal receipt. Cold times include process startup. No keep-warm work ran. R1 migrated the whole initial roster. R2 sought qualifying locations and pay ranges. R3 examined zero release-only owners.
At 1,000/10,000 the eight saves took median 108.9/62.8 ms plus 236.0/107.4 ms for reconciliation and publication. Four genuine worker claims changed items at each size. Four no-change inputs advanced only the account cursor.
The historical publisher admitted all three delayed records. The final native proof at `eda1ed132` passed those schedules and three additional races through the real cursor, 19 pinned reads and all 23 inherited publication schedules. Nine actual process kills covered the marker, cache, publisher, recipient and ACK. A raced location move, first local floor, equality retirement and two-hop correction produced all six independently expected notices. The rollback fixture applied seven ordered effects.

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
- Raw evidence under `evidence/DX-ACT1/actv-lazy/` includes `proof-d`, `rung1000-b`, `rung10000-b`, the final `price-d/{queue,1000,10000}` and `smoke-f`. Seven verified attempts bind four source inventories. All trial volumes were removed. All 174 frozen W0 tests and six experiment tests passed. No acceptance pin moved. [Checksums](SHA256SUMS)

### Dedicated bench

On the prepared server checkout run `DOCKER_HOST=unix:///var/run/docker.sock node --import tsx lab/experiments/EXP-DX1/scale1/bench.ts launch 2 lazy-$(date -u +%Y%m%d%H%M%S) activation --publication lazy`. The 1,000-person preflight precedes 100,000 deep subjects, 64 and 256 readers, and 100 switches per load. [Runner](../scale1/bench.ts)
The runner verifies all pinned reader hashes and oracle item transitions after each active window. It compares every native outbox and recipient byte, checks redo receipts, contiguous affected-owner feed lag, an actual follower hold and a pause over unpaid notices. The active read/commit p99 screen is 1.5× its matched baseline. The quiet read/commit/feed screen is 1.25× quiet traffic alone.
`bench/window/checkPush` and the SCALE1 collector bind the frozen trace, per-window commands, receiver rows, oracle denominator, source/build inventory, slot, container IDs and attempt nonce. The first deep smoke exposed a collector that rejected fractional writer offers. The trace digest now preserves those original offsets. A missing own-release response counts as a miss. Source, hardware samples, closed database hashes and paired raw observations accompany the separate latency and interference screens.
The local deep smoke used 256 people and 31,482 facts. Both cold responses saw their own release. All three frozen saves, 144 reads and 255 owed effects checked out, including 87 held-watermark fallbacks. One of the two cold responses took 1.293 s. The full server command remains unrun.
The part 5 trace collector checks each first and repeat answer against Python at the returned native cut and the independently offered release. Fresh children receive only a scope, requested subject, clock and nonce. It records native save transmission, release ACK, first response bytes, each application stage and HTTP request. Guest CPU samples require the same exclusive owner and volume at both ends.

Joined receipt audit. `install/state/original/command/marker/physical` compare native operation bytes, a fresh account epoch, original command, input digest, exact predecessor, roster, chunk assertions and release event. `choose/dispatcher/admit` bind the original cut, root, candidate order and witness to the same native history. `Reference.check/receiver`, `join/gate` and `join/price` compare independent Python output, timed first answer, physical changes, deliveries and ledgers on new source and recipient scopes. The range test checks all changed notice and display rows on two clocks against Python for forward and reverse edits. The stage-budget reconstruction verifies the sealed raw hashes and each additive budget. `local` rechecks the exact source/build, owner and volume at both ends.
