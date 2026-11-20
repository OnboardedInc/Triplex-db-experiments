The per-person design has yet to reach 394 saves/s in one database. It reached 111.1 at that load with 8.62 ms of native apply per save, against a 2.54 ms total serial budget.
The next server command uses source `afd94a9fe0bc2e4485f200bab436c7cb58b289ed`.
Run `DX_BARE_METAL=1 node lab/bin/heavy.mjs --label DX-PREP1-owner -- bash lab/experiments/EXP-DX1/prep1/server.sh owner "$OUT" afd94a9fe0bc2e4485f200bab436c7cb58b289ed "$SEALED"`.
Use the original comparison's sealed campaign directory as `SEALED` and a new absolute directory as `OUT`.
The command restores one ten-account database for each of three arms. One gateway serves grouped, original per-person, and fixed per-person in turn.
Each arm measures the quiet account alone and with nine neighbours at 235 and 394 gross offers/s. The command allows at most one hour including forced exit.
The fix sends the existing owner number. Datomic still checks the public identity and revision, and stores the same journal and feed.
The fix removes one redundant lookup. The bigger costs still need to come down before 394 is credible.

**North star.** P2 durable and exact small saves, P3 the ordered feed, and quiet-account tails in one database. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

**Server finding.** The copied one-gateway run confirmed 179.5 versus 140.6 saves/s at 235 and 181.7 versus 111.1 at 394, grouped versus per-person. The 235 medians were 0.15 versus 6.15 ms of apply per save. Per-person at 50 offered had 136 replies over one second, all from seconds one through four. The median native entry wait in that tail was 1,360 ms. The early archive lacks all six JVM pause logs, so the underlying cause of that initial stall remains open. [Full server reading and candidate forecasts](SERVER-READING.md)

**Selected fix.** The peer already resolves the owner when it reads predecessor rows. `TX2_SUBJECT_NUMERIC_OWNER=1` drops just that existing owner's identity-upsert map and sends its new rows directly by entity number. An EAVT check binds that number to the public ID at the serialized cut, and the revision CAS still guards all business rows. The new journal still uses its tempid and retains its identity and all existing checks. The default prepared path still uses the original identity-upsert shape. The forecast saves at most one storage fetch and decode, or about 0.5 ms at 235. [Lookup audit](SERVER-READING.md#where-the-read-work-sits)

**Follow-up controls.** Use the allocated native Linux host with the same pinned images, workspace package builds and physical CPU masks. Each arm verifies the original SHA-256 seal and restores a new copy of the same dump. All use matching 60-second windows, 210 quiet offers per window and 14,100 or 23,640 total offers under load. Accompanying setup, collection and owned cleanup are inside the hour. The prior fair-turn experiment remains documented at `b1bbc9875`.

| Arm | 235 / 394 loaded forecast in-window saves/s | Quiet p99 at 235 / 394, solo then loaded (ms) |
| --- | --- | --- |
| Grouped | 180 / 182 | 119 → 341 / 37 → 294 |
| Original per-person | 141 / 111 | 63 → 1,169 / 17 → 1,474 |
| Numeric-owner per-person | 146 / 115 | 63 → 1,120 / 17 → 1,430 |

All quiet solo cells forecast 3.5 saves/s. All loaded cells forecast expiries and therefore no complete-cohort p99. Each prediction is also in the bound server plan. The appends and full stage distributions will be measured.

**Local gates.** The numeric-owner PostgreSQL gate ran 7 tests and 744 assertions under an ordinary token. It checked the same-revision owner rename, original receipt across two synchronous database boots, journal routes and pinned queries. Seven TypeScript-side tests and strict type checking passed. The three simulated arms matched 1,911 durable receipts and append records. The collector rejected a changed numeric-owner arm. The server follow-up remains unrun here.

**Evidence audit.** The archive reader checks member bytes, source, slot, tape, cut and matching ACK/receipt contents. The launcher checks the original and rerun seals and confirms its owned resources are gone before publishing each summary. The producer verifies live settings including numeric-owner mode, starting cut, receipt and stored journal. The collector binds those observations to the attempt, source, seed, tape, native append and JVM logs. The existing subject receipt verifier binds the logical position, operation, journal, clock and claim to the committed native transaction. The Mac race gate exercises exact emitted keys and proves an identity change at the same revision cannot commit. The SQL verifier checks mode, staged source, attempt, native transaction, replica flushes, original receipt and query results. [Checksums](SHA256SUMS)

Part 5's [gated handoff](https://github.com/OnboardedInc/Triplex-db-experiments/blob/94b930a73/lab/experiments/EXP-DX1/prep1/REPORT.md) records the off/on writer gates, original receipts across restart and all 13 erasure routes. No acceptance pins moved.
