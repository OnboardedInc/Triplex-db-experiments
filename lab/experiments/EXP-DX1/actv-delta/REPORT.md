Erasing a protected fact exposed a fault in DELTA’s historical notice status. The fix preserves the state that was actually published.
At 10,000 people the first correct read took 1.425 seconds for the broad release and 2.209 seconds for the narrow one when a save won the race against 64 readers.
At 10,000 people the broad change affected 6,193 people. The receiver applied all 997 notices in order.
The narrow change removed 38 overtime flags and sent no notices.
One account transaction made each release visible. Readers could see the new answer before all broad changes had been stored or delivered.
Seven of eleven rules have adjustable settings. Their declared inputs find exactly whose answer changes, including wage floors two links away.
The indexes added 454 request bytes and 3,183 bytes of database log per fact in ordinary saves.
The cost at 100,000 deep subjects still needs a server measurement.

**Local Datomic and PostgreSQL results, in seconds**

| People | Release change | Changed people | Notices | First verified read | Concrete changes reopened | Dispatch finished | Full independent proof | Maximum first read under 64 readers and a save |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | broad | 628 | 116 | 0.060 | 1.165 | 1.987 | 2.533 | 1.321 |
| 1,000 | narrow | 0 | 0 | 0.053 | 0.053 | 0.120 | 0.721 | 1.571 |
| 1,000 | translated-scope | 7 | 0 | 0.177 | 0.177 | 0.374 | 1.083 | — |
| 10,000 | broad | 6,193 | 997 | 0.081 | 8.802 | 16.389 | 22.253 | 1.425 |
| 10,000 | narrow | 38 | 0 | 0.300 | 0.300 | 0.608 | 6.632 | 2.209 |
| 10,000 | translated-scope | 73 | 0 | 0.612 | 0.612 | 0.925 | 7.277 | — |

Each eligible release committed one record, its head and its command claim in four native operations. Instrumented seal reads fetched zero subject bodies. Every target save and release guards the same account head, so a winning save forces the seal to retry. The third row in each group changes the overtime jurisdiction after R3. The frozen 100k reference changes 62,293 people and 9,798 notices for R1→R2, then 418 flags and zero notices for R2→R3. The deep fixture and live cuts have independent counts.
Starting with validated policy inputs in memory, the reference page publisher took 0.80 / 0.63 seconds at 1k and 7.19 / 4.39 at 10k through final R2 / R3 publication. Each loaded DELTA screen stopped on its first offer above one second. Each arm therefore has one loaded timing. A production tail requires further observations.

**Everyday writes on the shared Mac**

Each arm committed 500 saves and 6,549 facts, and recovered ten duplicate sends. Without / with indexes, serialized operation bytes per fact were 1,114 / 1,568, database growth 3,868 / 6,854 and WAL 3,992 / 7,175. Elapsed acknowledgement time was 22.84 / 19.89 ms per fact. The unindexed arm ran first. Run order and shared-host load limit the timing comparison to these two runs. Bootstrap wrote 2.50 / 2.68 MB in serialized operations. Indexed 5–10 and 11–25 fact saves had p50 of 221 / 226 ms and p99 of 959 / 802 ms.

**Evidence and acceptance audit**

- `lookup.test.ts` compares all changed keys and before/after domain bytes in both directions to fresh Python full evaluations of 1,002 independently enumerated people for 17 release pairs. Full reads regenerate release-specific versions and provenance, including on unchanged domain outputs. Additional tests cover every legal business-day setting and both sides of midnight. I9S2 and EVSUB index open cases with start dates, EVSTAT indexes dated TNC cases, DOCEXP indexes document type and expiry, MINWAGE indexes pay and two-hop floors, OT indexes scoped minutes, and PAYCHG indexes unapproved pay differences. LIFE, I9S1, BGC and PROP have no release parameter.
- `Account.bootstrap/head/pages/censusAt/selected` check validated source bodies, actual initial publication, a separately stored census, reverse membership and page content hashes. `originalObject` can reopen a lost derived row at its original journaled command. A missing index and unavailable journal fall back to full evaluation. `checkFull` verifies every source and publication predecessor before ACK on the full path, including protected EVSUB and a changed clock.
- `Objects.many/get/commit` compare bound native bytes at the requested cut and every asserted receipt. `command/seal/admit/save` guard the same account head and bind a retry to the original intent. A late result must still match the release incarnation, source, valid time and erasure frontier. All 23 original schedules ran. Three additional native schedules held a pay change at transaction 15 or at transaction 20 just before noon, then checked the exact output, guard, sequences and original journal position after rejection. DELTA also tested both write orderings, no-body guards, two-hop changes, retroactive edits, two releases, expiry and restart.
- `expand/concrete/drain` verify the event’s original predecessor, the ordered outbox prefix, durable chunk hashes and cursor ACKs. `Receiver.send` commits the effect and incoming receipt together in a separate database. Rollback preserved sequences 1, 2 and 3. Fresh processes exited before/after expansion, after send/effect and after ACK. `erasure.test.ts` reproduced the historical fault first. Historical reads now mask protected facts while preserving the actual old publication state.
- `Window.apply/price.run` check original source assertions and valid times, 1,000 timed samples and independent final reads for all 62 touched people. `rungs/measure/checkRoster` compare the complete independent population SHA, all outputs, guards, concrete changes, ordered deliveries and durable sink effects. `screen/pageControl` check the loaded observations and all reference states on fresh scopes. The slot manager binds image, mounted gateway, limits, nonce and volume cleanup. [Evidence checksums](SHA256SUMS)
- `DeepAccount.commit/repair/readAt` atomically records a real source save and its outstanding index work. It uses Datomic’s assigned positions, serves exact dirty cuts from the native source and completes publication before returning the save ACK. `nativeDeep/guardDelta` verify native membership, both live windows, every target output at both releases and the receiver before a large seed. Each proof carries the source, slot, nonce, cut and hashes. An earlier changed-source run stopped before a large seed.

**Prepared server command**

`DOCKER_HOST=unix:///var/run/docker.sock node --import tsx lab/experiments/EXP-DX1/scale1/bench.ts launch 5 delta-$(date -u +%Y%m%d%H%M%S) activation --account-layout pooled --activation-mode delta`
The exact server preflight ran locally in 248.9 seconds against 1,000 deep target subjects, a neighboring account and a separate 1,000-person two-window oracle check. The 600-second parent watchdog records a stop reason. The server arm seeds ten 100,000-person accounts, indexes account 002 and runs a 66-minute frozen traffic plan across all ten. Budget about 11–24 hours plus archival. The existing seed extrapolation is 9.7 hours. [Scale assumptions](../act2/REPORT.md)
The local narrow object stores stable subject IDs and both flag values. This costs more bytes than 32-bit ordinals and avoids interpreting changes through a different dictionary after restore. The proposed account record represents coverage for unchanged people. The owner still needs to decide whether first read, concrete persistence, receiver effect or verified coverage defines the one-second target.
Native evidence is under `evidence/DX-ACT2/delta/{price-2,rungs-6,controls-2,preflight-2,publication-final}/`. Both focused TypeScript projects and all 174 W0 tests passed. Earlier attempts retained a resend-identity failure, a fractional timing encoder error, a reference transactor memory kill and a range-receipt collision. Native controls recovered using 64-person roster ranges. The 100k server run, production receiver latency, production interference ratios and P7 residency remain unmeasured. Acceptance continues to use its frozen trace, contract pins and existing verdict rules.
