The server branch is exp/DX-W1-commit-tail-reads. This report covers code head dfc061fc3.
K keeps separate changed-subject and change rows. Match and the new query option read those same rows.
The option adds zero records or bytes to a save. The local PostgreSQL timing run is queued.
A query for one named entity can seek to it. A broad query still has to read stored histories.
Queries that return classic Datomic fact numbers need reified fact records.
The new native routes refuse after observed erasure. K still stores cleartext in the business row and journal.
P remains an experiment because its packed journal rows are absent from ordinary queries.
The earlier 36 ms p99 measured lean with the native query route off. Full query coverage and erasure remain open.

| Surface | Lean K before and after | Test |
| --- | --- | --- |
| Match at current and held cuts | Stored change rows, changed-entity refs and application rows were already readable. | `query6.clj`, `query6.ts` compare full rows and earlier cuts. |
| Datalog, complete reads, pages and plans | `/q` refused by default, including SDK execution through it. Explain stayed available. `TX2_LEAN_NATIVE_QUERY=1` supplies an immutable relation of stored rows. | `query6.ts` checks joins, logic, rules, aggregates, optional values, numerics, complete results, plans and both cursor forms after a write. [Datalog](../../../../docs/datalog.md) |
| Dependency state | The existing history read finds assertion and retraction positions. The adapter still scans history for the requested attributes. | `query6.ts` checks the next valid-time edge before and after the retraction. |
| Typed journal | The four routes were available. WFIX corrects wrong retraction content in the feed and resumed page. Per-entity history still scans candidate journals. | `query6.ts` checks command, ID, page and entity page. WFIX's retraction suite checks the original values, intervals and clocks. [Operational primitives](../../../../docs/operational-primitives.md) |
| Native `/q` and `/log` | Both refused lean by default. Opt-in `/q` resolves stable Triplex IDs. Opt-in `/log` applies Q107c to both layouts by filtering journal rows. | `query6.clj` compares logical native queries, grouped interior cuts and log resume, and checks typed declines. |

`TX2_LEAN_NATIVE_LOG=1` projects identity, positions and valid intervals from committed datoms. Q107-S keeps the ordinary triples and Q107a specifies exact reconstruction for the broker. Lean never allocated classic fact entity IDs or their native assertion datoms. Projection or scalar use of physical IDs, raw bytes and arbitrary attribute selectors get a typed decline. Blob identities and logical transaction IDs remain available as public scalar values. Point lookup applies only when all patterns depend on named owners or assertions. [Datomic query relations](https://docs.datomic.com/query/query-data-reference.html)

**Remaining read work.** Broad compatibility input is capped at 100,000 visited datoms or 16 Mi characters, checked before grouping an owner's history. An AVET journal projection would add 3 or 7 index datoms for one- and three-field replacements. A key with a five-byte type and length prefix, attribute name and 26-byte assertion ID would add about 134 or 302 value bytes before encoding and index overhead. Indexed subject history also needs one changed-owner ref per logical save or a proved complete existing index. A physical journal projection needs 24 or 56 fact datoms before optional fields and dictionary upserts. Existing lean seeds have no original classic fact entity numbers to recover.

**Evidence audit.** The native runner checks exact fixture results, expected test count, a new attempt nonce, all loaded gateway sources and the exact Datomic and Java inputs. The managed verifier compares Classic and K after a fresh SQL slot, projects the pinned O-REPLAY case from the independent offered operations and receipt identities, and checks the source, image, slot and nonce. Its write timings require exact receipt and persisted row readback. The new native feed binds identities to the durable transaction at the requested log t. No acceptance claim is made from pending attempts.

**One writer.** Integrated DX-WFIX1 through `4331d6fe8`. The cross-run freezes DX-W1 `67bc5285c` and DX-WFIX1 `d83214271`. WFIX's first six native cases found 11 assertion failures on DX-W1, and its SDK cases found three. DX-W1's layout, packed, priority and predecessor cases and commit-order test passed on the other writer. The options witness lacked its API on the old DX-W1 source. Six DX-W1 controller cases then passed with a complete fixture export on `4331d6fe8`. [WFIX fixtures](../wfix1/REPORT.md)

| Finding | Resolution on the combined branch |
| --- | --- |
| 1. Replacement resend | WFIX checks both durable identities before CAS on every serial path. Its SDK resolves an older gateway's CAS once through the same durable claim and operation. |
| 2. Retraction content | WFIX uses the checked predecessor row for identity, value, assertion Tx ID, record clock and valid range. It retains DX-W1 packed-group coverage and fixes the separate layout replay splicer. |
| 3. Scope maintenance | WFIX uses a separate system account and retains dependency keys for checkpoint and release frames. |
| 4. Fair turns | WFIX preserves ready-member bypass and the eight-live-turn bulk grant, and resets the turn counter at idle. |
| 5. Account owners | WFIX classifies actual authored owners with the persisted membership fallback. DX-W1's multi-account test remains. |
| 6. Ordered byte cap | WFIX spends a sequence on dispatch and retains the established 400 `InvalidValue` response for a local UTF-8 preflight failure. |
| 7. Writer proof | WFIX binds live function readback and request options to the exact reopened scope, source, slot and attempt. The older write5 readback remains for those comparisons. |
| 8. Feed evidence | WFIX compares full change bodies, cut and command and tests deliberate mutations and resume. The DX-W1 full durable readback remains. |

**Writer evidence audit.** Serial identity recovery and the SDK use the committed command and its original native operation, cut and clock. The group reply remains bound to the actual durable group. WFIX's launcher verifies the selected transaction definition from the reopened measured database. Its journal validator compares each measured command's complete changes from the committed position and its resumed page. Raw regression outcomes keep their source, attempt and hashes.

**Erasure inventory.** K stores the protected body in the business row and in the assertion and retraction `:_tx/change` JSON. The row text is an indexed value. Historical indexes, database logs, WAL, backups, caches, and typed journal and replica responses can retain it. A claim, receipt, retirement marker and native application-feed entry carry identity, timing or interval metadata. Q49c needs a current, durable erasure marker per assertion and query semantics that preserve presence while excluding erased values from predicates. Physical excision alone loses that identity-to-value binding. [Datomic excision](https://docs.datomic.com/operation/excision.html)

**Erasure regression.** Ported the gateway, retained-pin, journal and native feed checks and synchronized native excision from DX-ERASE1 `91cffd2c3`. The local verifier binds the pre-excision canary, refusals and ordinary read observations to the issued t, earlier assertion t, current slot/image and staged sources. The upstream fixture covers replica, import, Publish, notice and restore. The later `856c4c9ae` tests query detached ciphertext and an independent key store, which this K layout lacks.

**Pulse.** `node --experimental-strip-types lab/experiments/EXP-DX1/w1/control.ts --pulse pulsew6a --write6`.
**Field rates.** `node --experimental-strip-types lab/experiments/EXP-DX1/w1/control.ts --field-rates fldw6a --write6`.
**Forecast.** K estimates 275–385 durable saves/s at saturation and a quiet-account p99 ratio of 2.4–5.0 at 235 offered saves/s. P estimates 205–330 and 3.0–8.5. Both use the same writer options. K is the eligible journal policy. P is informational. The writer proof checks a measured command's original operation and claim, its exact typed and ordinary journal rows, and its native log offset. The report seals that witness with source, slot, attempt, seed and forecast hashes. These are server handoffs. [Predictions](small/write6-predictions.json)

**Local evidence.** The final in-process Datomic gate passed 38 assertions across classic and K. Both launch plans, nine controller and witness tests, and the final TypeScript check passed. The SQL comparison uses O-REPLAY `45bfa59b8`, whose standalone R-JNL-5 journal case passed. The SQL image is built. Exact SDK comparison, timing and local erasure checks still await the slot. The acceptance files and their pinned paths are unchanged. [Evidence hashes](WRITE6-SHA256SUMS)

The combined writer passed 1,747 native assertions and 12 SDK tests. A vector fixed lean's subject deduplication, and a conjunction in each disjunction branch stopped a third subject appearing. The next native run passed 33 of 34 checks. Classic had a null assertion time in the retraction journal. The writer now finds the original clock through `:f/id` when the explicit clock and reference are absent. A separate Datomic probe showed a physical-ID comparison losing a match. The lean query now rejects that program during preparation. The SDK package and declarations rebuilt successfully.
