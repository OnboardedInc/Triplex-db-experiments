Yes. One database durably accepted every offer at 394 saves/s (393.92/s inside the window) on the 16.25-million-fact repeated-person tape, with one gateway and a 2 GiB transactor cache. Quiet-account isolation still fails.
At 235 and 394 offered, ordered IDs delivered 234.90 and 393.92 saves/s inside the window, with no expiries at either rate.
The quiet account went from 73.66 to 315.42 ms and from 34.07 to 118.16 ms. The ratios were 4.28× and 3.47× against a 1.25× bar.
Durable append and the wait to start it took 99% and 97% of the two loaded quiet p99 saves. The fair-turn rule was off.
Both solo p99-ranked saves spent about 89% inside the append. G1 pauses affected some other saves, including the two slowest at 394 loaded.
Ceiling command (60 minutes) uses source 8a116ed366d54ad7bca7b153d92d4f2eb4ea7041 on the held SCALE1 seed.
Run `DX_BARE_METAL=1 node lab/bin/heavy.mjs --label DX-PREP1-ceiling -- bash lab/experiments/EXP-DX1/prep1/server.sh ceiling "$OUT" 8a116ed366d54ad7bca7b153d92d4f2eb4ea7041 "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" "$SCALE1_TRANSFER_SHA256"`.
The 620/900 comparison spans 1,900 people per neighbour with fair turns off and on. The fixture matched 3,056 receipts. The physical run is pending.
Measured source df307c29c. [Quiet-account stage recount](QUIET-ACCOUNT.md).

**North star.** Durable, exact small saves and quiet-account tails in one database. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

**Ordered IDs.** One client-minted ULID prefix carries the journal and a contiguous run of new 26-character assertion IDs, including journal facts. The transactor checks their exact historical range, and legacy callers retain their previously assigned IDs. Client clock skew and delayed submissions can still fetch an older leaf. [Design and SDK contract](ORDERED-IDS.md)

**Ordered ID audit.** The new acknowledgement field is emitted only from the fresh native report after verification of the operation, journal, command claim, owner revision and committed position. The gateway computes bounds from the exact typed rows sent in that transaction. The new fixture checks retired-ID reuse under a different owner, the original claim and journal after restart, and matching pinned and native query bytes. The package build and two client identity tests passed.

**Owner revision.** At the server's 2 GiB cache size, total EAVT storage loads capped CAS costs at 0.151 and 0.239 reads/save at 235 and 394 offered. At least 85.4% and 78.4% of saves did no EAVT fetch at all. I kept the existing CAS. This bound applies to the recorded tape and gives no uniform-access result for a million people. [Revision reading](ORDERED-IDS.md#owner-revision-at-the-server-cache-size)

**Typed compatibility.** The first 28-character experiment reduced reads but tripped the typed journal's existing TripleId validation. It was corrected to reserve two ordinal characters within the original 26-character format.

**SQL diagnostic.** History checks fell from 11 calls per save to one and read counts from 568 to 2. Total SQL reads fell from 803 to 249 across two matched 96-save arms. The ordered arm still spent 1.00 reads/save on the public-ID witness and 1.17 on native row redundancy. All 96 used ordered IDs, committed, and read back the same journal changes and exact pinned business rows. [Lookup comparison](ORDERED-IDS.md#paired-32-mib-diagnostic-with-26-character-ids) · [Checksums](SHA256SUMS)

**Ordered correctness.** The native suite passed 27 tests and 54,079 assertions. Nine SQL tests and 760 assertions also passed, including a retired-ID collision under another owner. I stopped the gateway after the native commit, reopened PostgreSQL with its synchronous standby, and checked that both resend forms resolved to the exact original receipt, journal ID and position. All 13 removal routes passed against a persisted ordered assertion with a positive typed-journal witness before removal. [Checksums](SHA256SUMS)

**Why reads happen.** The Mac trace reconciled 106 K and 674 S fetches to stock native counts. K’s were all native AEVT row/retirement redundancy. S’s historical AVET check accounted for 350 fetches within its span, owner CAS for 95, and another 60 appeared under lazy AVET iteration. Operation and command point checks fetched no SQL on this tape. Three unscoped S EAVT entity keys were unavailable. In the earlier server run, the grouped arm reached 179.5 and 181.7 saves/s and the per-person arm reached 140.6 and 111.1 at 235 and 394 offered. [Lookup table](LOOKUP-READING.md) · [Server reading](SERVER-READING.md)

**What changed.** `TX2_SUBJECT_PREFETCH=1` adds a lookup-only Datomic hint to numeric-owner S. The authoritative transaction, installed writer hash, scope/erasure checks, CAS, claims and ordinary business/journal rows use the prior path. The timing field records hint preparation separately and the receipt can report whether a hint was attached. An attached hint says nothing about its hit rate. [Dependency argument and forecasts before implementation](LOOKUP-PLAN.md)

**Hint diagnostic.** In the first pair, both arms saved 96 changes and all hinted saves attached hints. Stock SQL counts were 771 without and 746 with hints. In the repeat, the transactor read back native prefetch enabled on one CPU and counts were 457 without and 976 with hints. Historical AVET alone rose from 337 to 722. VM CPU PSI avg10 was 9.15–15.65% without and 9.61–30.30% with hints in the repeat. The initial forecast of moving 60–75% of the I/O is unsupported. The functioning read-free apply and ≤0.5 ms target remain open. [Checksums](SHA256SUMS)

**Server controls.** Each arm restores and verifies the sealed seed. All use one gateway, the same CPU placement, native prefetch enabled, 24 GiB transactor heap and 30 GiB transactor container limit. The four 60-second cells per arm have matched quiet arrivals and identical field inputs. The collector seals stage clocks, native reads, journal receipts and the three JVM logs.

| Arm | 235 / 394 loaded forecast saves/s | Quiet p99 solo → loaded at 235 / 394 (ms) | Loaded native apply ms / SQL reads per save at 235 and 394 |
| --- | --- | --- | --- |
| Grouped K | 180 / 182 | 119 → 341 / 37 → 294 | 0.19 / 0.05 and 0.19 / 0.05 |
| Original S | 141 / 111 | 63 → 1,169 / 17 → 1,474 | 6.91 / 11 and 8.62 / 10 |
| Numeric-owner S | 146 / 115 | 63 → 1,120 / 17 → 1,430 | 6.41 / 10.3 and 8.12 / 9.3 |
| Numeric-owner S with prefetch | 125 / 100 | 73 → 1,320 / 20 → 1,690 | 7.0 / 11.3 and 8.7 / 10.3 |
| Original S with 16 GiB cache | 210 / 185 | 35 → 700 / 12 → 880 | 2.1 / 2.2 and 3.6 / 2.2 |
| Numeric-owner S with ordered IDs | 225 / 205 | 45 → 550 / 22 → 950 | 2.2 / 2.0 and 3.7 / 2.2 |

Solo cells forecast 3.5 saves/s. For ordered IDs, both solo cells forecast 2.6 ms native apply and 2.6 reads/save. K under load forecasts eight saves per append and all other cells one. Loaded forecasts have expiries, which leave the complete-cohort p99 unavailable. The generated plan includes numbers for all 24 cells. At 394, the earlier S run's mean apply minus reported SQL and decode already leaves 2.63 ms before append, above the 2.54 ms/save budget. The new arm measures whether fewer seeks also cut that remainder.

**Server preflight.** Eleven unit tests and strict type checking passed. The mixed-format SQL gate passed 781 assertions and retained the original receipt across both boots. [Ceiling and hashed-ID behaviour](CEILING.md). The simulated producer and collector joined all 3,822 fixture offers, including 637 ordered receipts in both launch modes, and rejected a changed ordered journal ID. The sixth arm subsequently ran on server 1. [Checksums](SHA256SUMS)

**Grouped fallback proposal.** At 235 offered, the measured gateway spent 39.40 of 44.31 ms per busy turn speculatively evaluating its members. Parallel same-basis preparation with one append projects 300–325 saves/s on two workers and 430–520 on four, if groups stay near eight and the storage reads overlap. It is a proposal. [One-page design and assumptions](GROUPED-PREPARATION.md)

**Evidence audit.** The probe and collector check exact ACKs, journal changes and pinned bytes, binding staged hashes, image, holder, attempt, database and native transaction to the apply interval. The SQL restart verifier binds ordered IDs and replica flushes to the one durable receipt across the stop. The removal verifier checks its actual branded assertion and all 13 fresh routes against the source, nonce, slot and run cleanup. The native suite checks exact assertions and pins test source, image, run and terminal log. The server producer and collector bind the original seal, arm, source, tape and receipt to the native append, JVM readbacks and fresh stack. No acceptance pins moved. [Checksums](SHA256SUMS)
