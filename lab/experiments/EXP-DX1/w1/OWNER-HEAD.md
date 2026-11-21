# Keep the writer's current state small as history grows

North star P2 and P4. Count serial SQL fetches per save, then check current and pinned reads at the exact committed basis. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Two steps

| Component | Step 1, a lazily installed witness | Step 2, moving business rows |
| --- | --- | --- |
| Owner state | One narrow cardinality-one value with the accepted logical position and clock and the IDs of the latest assertions. The legacy revision remains the authority. A witness left behind by an ordinary writer is stale whenever its position differs from that revision. | Separate compact owner-head entities in one dedicated allocation range. A head binds public owner, revision, position, clock and the current page root. The only old business-state lookup on the serial path is this head. A serial comparison against the prepared head token fences all predecessor changes. |
| New facts and retirements | Canonical rows and retirements still use today's physical layout. The optional Part 9 marker can coexist independently. | Use fresh Datomic tempids for the version entity, with the exact logical row and an owner reference. Append the explicit retirement on that transaction's fresh entity, using predecessor identity and assigned position and clock. Leave old facts untouched. Verify storage locality with EAVT/AEVT samples since allocation order and segment packing belong to Datomic. |
| Current rows | Existing point, reach, native query, journal and history readers continue to use the current projection. They never resolve the witness. | Read the head, then immutable pages of exact live assertion pointers. Pages contain bounded chunks, for example 32 identities each. Read at most one head, the branch pages and live rows requested, with the existing row budget. Updates replace only affected pages. The head never stores decoded business values. |
| Past cuts | Existing as-of readers are the only authority. | Before migration, read the same legacy cut. At or after migration, seek the last immutable owner-root event at or before the requested cut and follow its pages. Replay legacy assertions and version/retirement streams for history-range queries. For recorded time use the existing time-to-cut rules. Keep intra-transaction/group cut reconstruction and query budgets explicit. |
| Stored journal and feed | Same stored journal. The native ACK can report whether the exact witness was added in its own durable report. | Keep all journal datoms and per-save receipts under their existing identities. Teach logical queries, native feed and replica bootstrap to resolve owner references for physical events. A retirement can name its old row in the ordinary journal using the existing validated predecessor bytes. |
| Old and new people | An untouched person stores zero additional datoms. An eligible first replacement initializes the witness in the save transaction. Creation and all ordinary writers can continue without it. | First write takes the legacy live rows at a pinned peer cut and builds the initial pages from those identities, inside a bounded migration. Serial apply checks the legacy owner ID and revision and fences native removal before publishing the root. New people start with a first root and no legacy scan. Above the migration budget, stay on the existing path until a separately bounded migration can run. |
| Global identity and removal | Keep the existing legacy/ordered historical prefix check, clock and revision checks, operation and claim uniqueness, transaction-function version and excision witness. Store no protected values in the witness. | Keep the common assertion-ID index over both layouts and never remove its identity evidence when removing a protected body. Look up old hashed identities exactly and ordered IDs by the existing interval with exact fallback. Keep the external removal sequence and native excision check. Head and pages contain only opaque IDs and never hold decrypted bodies or keys. |

All reads must see one committed cut. Migration must publish only when its prepared live set is still current, then immediately support reads through a separate peer at the returned cut. Mixed physical formats can coexist in one database. For Step 2, every mutator capable of changing an owner, including bulk import and Publish, must either advance the authoritative head or compare and invalidate it atomically. The scope needs durable format admission so readers and rollback binaries unable to interpret migrated rows cannot open it for writes. Changing a public owner ID or running raw application excision can invalidate a head without advancing the legacy revision, so the Step 1 witness cannot replace either native guard. Existing clients need no routing change in Step 1, and disabling its writer option leaves all data readable.

Step 2 keeps the transient root small by storing only a latest reference in the hot record. Immutable root events and pages grow in separate index ranges. The size of the hot state then follows the number of written people and the writer's locality, rather than retained history. Residency at 16 GiB is an experimental prediction. The old-row and clock checks that Datomic performs outside the authored function still need to be attributed under load.

## Cost and forecast before testing

Step 1 adds one assertion for initialization and an assertion plus retraction for each replacement of the witness. It adds one narrow, no-history head attribute installation per database. The witness is never the source of an as-of answer. No user read has to read it. The feature does not avoid the old-row probes in this step. An ordinary path that advances the legacy revision writes the same datoms as before and leaves the witness stale until the next eligible save.

Step 2 targets one root value, one immutable root event, and new page pointers for changed pages, plus owner links for version and retirement events. A 160-row first-touch migration would write roughly five pages at 32 pointers per page plus the root, before any event or indexing overhead. As a planning range, allow 5–10 more datoms and 1–3 KiB of pre-index uncompressed data per save over the 17-datom plain case. Apply the same increment to the 22-datom protected case as a forecast. A 5–10 datom increment over 17 is 29–59% more datoms, so reaching a fixed native record count would take 23–37% less time at the same save rate. WAL, storage after maintenance and retained history amplification need measurement. The first migration cannot be amortized into per-save counts without stating the number of distinct people touched.

The updated rolling6 baseline measured 1.35 SQL fetches/save at 394/s, 1.32 at 620/s and 0.61 at 235/s, reaching 454 saves/s at 620 with 2.25 of three transactor cores. That leaves CPU, queueing and commit/log costs outside the old-row hypothesis. The 8B 1.21 ms estimate is an apply-only ceiling. The Mac cache sweep could not reproduce production ratios. The model also missed the early aging loader's apply time by more than a factor of two. The measured points are from `bm1/ROLLING-READING.md` at `0e5795578`. [Part 9](RETIREMENT-READS.md)

Target for the complete design, using weighted, non-overlapping per-index SQL attribution with an explicit unattributed bucket:

| Records | EAVT / AEVT / AVET / other SQL fetches per save | Mean apply |
| --- | --- | --- |
| 430M | 0.08 / 0.08 / 0.02 / 0.02 | 1.09 ms |
| 1B | 0.12 / 0.12 / 0.03 / 0.03 | 1.16 ms |
| 8B | 0.15 / 0.14 / 0.04 / 0.03 | 1.21 ms |

For a full 394 offered run, forecast 390–394 stored/s and quiet p99 of 35–70 ms with the completed head. At 620, forecast 520–610/s and quiet p99 of 45–100 ms. Aggregate scheduled-offer-to-ACK p99 can still reach the 30 s expiry region at 620 if sustainable capacity lies below offers. At 1B with 50 and 235 offered, forecast 49–50 and 231–235 stored/s, quiet p99 of 20–55 and 30–75 ms, and apply of 1.1–1.4 ms. Score these forecasts only after the completed layout passes the exactness and removal gates. Step 1 is an instrumentation and migration foundation and has no server arm.

Proposed rolling6 windows are 300 seconds fresh at 394 and 620, and 120 seconds aged at 50 and 235, each from an independent prepared copy per writer with half-window samples every 64 native applications. The ranges below describe whole-window aggregate p99 from scheduled offer to durable ACK, including later ACKs for offers in the window. Report quiet/account tails and expiry separately. Each entry gives EAVT/AEVT/AVET/other mean SQL fetches per save, mean apply ms, durable saves/s, and aggregate p99. Other is unassigned SQL. These are hypotheses for the final three-way run.

| Copy and offered | Current ordered writer | Append retirement | Completed head |
| --- | --- | --- | --- |
| Fresh, 394/s | .55/.67/.01/.12 · 1.7–2.1 ms · 385–394/s · 2–8 s | .53/.38/.01/.10 · 1.45–1.85 ms · 388–394/s · 0.4–6 s | .08/.08/.02/.02 · 1.0–1.3 ms · 390–394/s · 0.08–3 s |
| Fresh, 620/s | .54/.65/.01/.12 · 1.8–2.3 ms · 425–485/s · 29–31 s | .52/.38/.01/.10 · 1.55–2.05 ms · 465–550/s · 26–31 s | .11/.11/.02/.02 · 1.05–1.4 ms · 520–610/s · 3–31 s |
| 1B, 50/s | .60/.62/.02/.11 · 1.5–2.4 ms · 49–50/s · 0.04–0.5 s | .59/.34/.02/.11 · 1.3–2.0 ms · 49–50/s · 0.035–0.4 s | .10/.10/.03/.03 · 1.0–1.35 ms · 49–50/s · 0.02–0.2 s |
| 1B, 235/s | .72/.82/.02/.14 · 1.9–2.65 ms · 228–235/s · 0.08–5 s | .70/.50/.02/.14 · 1.6–2.2 ms · 230–235/s · 0.07–4 s | .12/.12/.03/.03 · 1.1–1.4 ms · 231–235/s · 0.04–3 s |

## Step 1 evidence

| Mac diagnostic | Observed |
| --- | --- |
| Native parity and conflict | 909 assertions in seven tests, including same-owner races, stale cuts, historical ID reuse, business row and journal parity, and exact witness datoms. |
| Barrier6 and rolling6 recovery | Each recorded 56 durable edits, checked the same receipts after restart and found none of the six refused offers in storage. Each recovered one withheld reply. The observer matched every receipt to its completed append with synchronous commit, fsync and full-page writes enabled. |
| Sealed switch and removal | Both modes recovered the typed erased marker for the initial and post-switch assertions at their own cuts and through the held cut. Neither stored change body returned an original value. |
| All 13 removal routes | Passed in both barrier6 and rolling6 using the sealed value written through the head-enabled ordered writer. The actual backup restore checked the same assertion; both stacks released their slots and removed temporary containers, volumes and network. |
| In-process point read of 257 rows, 24 current and 24 pinned per arm | Baseline medians 8.64 ms current and 11.74 ms pinned. Two witness runs measured 6.28/7.24 ms and 6.91/5.69 ms. The control ran first in the same JVM. These measurements exercise the same logical projection and give no isolated speedup or comparison with the 1.65 ms full-size service reading. The new head adds no lookup to the product reader. |
| Native records and bytes | Plain ordered fixture 24 on first touch and 25 thereafter, one add and then an add/retraction over the 23-record path. A sealed first replacement wrote 29 including the witness. The witness contained 54 UTF-8 bytes for the one-field ordered case, excluding log framing and index overhead. The previously reported 17/22 counts are from the compact layout. The first-stage witness runs do not use that layout. |

The first-stage witness is bounded to at most three recent assertion IDs of at most 128 characters each and contains no application values or body keys. Counts above cover the logical native writes before index maintenance. Settled bytes and aging-rate change for the final layout are unmeasured. One no-history value per touched person caps the retained witness state while each update still writes in the durable log. [Evidence hashes](WRITE10-SHA256SUMS)

For a fresh Mac attempt, the managed driver stages exact inputs and uses its own ordinary heavy tokens for image build and selftest. The route suite uses the removal stack already exposed by the lab engine.

```sh
DX_W1_OWNER_HEAD=1 python3 lab/experiments/EXP-DX1/prep1/manage.py \
  "$DX_W1_EVIDENCE/owner-head-new" rolling-recovery 10 1 1 0 1 0

for mode in barrier6 rolling6; do
  DX_W1_OWNER_HEAD=1 DX_ERASE1_SUBJECT_WRITER=1 DX_ERASE1_ORDERED_IDS=1 \
    node lab/bin/heavy.mjs --label "DX-W1-owner-head-routes-$mode" -- \
    node --experimental-transform-types lab/bin/engine.mjs erase1 --holder DX-W1 \
      --out "owner-head-new-$mode" --run ledger-authority-regression --people 12 \
      --sealed-witness --credit-mode "$mode"
done
```
