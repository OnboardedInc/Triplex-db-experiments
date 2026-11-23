# Wide saves on the per-subject writer

North star P2. One form save by a subject writes about 17 form rows; on the production-shaped tape a save carries 6 facts at the median, 72 to 75 at the 90th percentile, 103 at the 99th and about 120 at most, and about 4% of saves are a subject's first. The per-subject ordered writer accepts only one to three facts that each replace a current value, so one commit per save would run mostly on the general writer. This page says why, measures what a wider per-subject writer would buy at toy size, and builds it as a default-off option. Mac timings are diagnostic. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md) · Production tape: `real2/PRODUCTION-TAPE.md` on `exp/DX-REAL2-production-tape`

## 1. The per-subject writer's limits, from the code

A save reaches the per-subject writer only if `subject-save/plan` returns a plan (`packages/datomic/gateway/src/triplex/gateway/subject_save.clj`, `plan-with-erasure`). Every refusal is silent: the save goes to the general writer (`commit.clj` `operation-code`) with the same outcome codes. Counts below use F for facts asserted on the subject and R for values retired.

| Limit | Where | Why it exists | What it costs on the production tape |
| --- | --- | --- | --- |
| **1 to 3 facts** | `(<= 1 (count business) 3)` | The writer was certified on the measured field save (one to three edited fields). Nothing in the native function depends on the count; the peer reads one predecessor per fact (one or two EAVT seeks each) and pre-renders every row, so the bound kept that peer work and the serial apply short. | Any save of more than 3 facts: 68% of one-commit-per-save commits. |
| **Replace only** | `(= (count business) (count retired) (count live))`, `(= before after)`, `(= (set live) retired)` | The writer swaps the general writer's per-row liveness checks for one owner-revision check against predecessors it read itself. Requiring each new fact to retire exactly one current value of the same field kept the read set to "these rows, of this field, on this subject", and kept the covering owner head's mask and cover one to one. | First writes of a field (no predecessor) and retirements without a replacement go to the general writer: about half of one-commit-per-row commits (rows past a subject's seeded fields, every second field). |
| **One field per fact, no references, no system attributes** | `field` must be non-nil and the field sets distinct | A reference value names a second entity, which would widen the read set beyond the subject; `:_` attributes belong to the journal. | None on the tape (it writes plain fields). |
| **An existing subject** | `(integer? revision)` (the owner must exist) | The serial check is a compare-and-set on the owner's revision; a new subject has no owner entity, and creating one would need an absence check of its public ID inside the native function. | About 4% of saves (a subject's first ever). |
| **One subject, one journal, one claim** | `(= #{subject} (set entities))`, two entity IDs, one journal, one command ID, no `clientId`, no `readProfile` | The native function guards exactly one owner and one journal. A client-ordered queue (`clientId`) has its own sequencing. | None on the tape. |
| **Source at or after the owner's revision** | `(<= revision source head)` | The client's cut must have seen the owner's latest change, as the general writer's `rev > source` check also requires. | None (refusals are the same as the general writer's). |
| **Regular frame** | lean rows, not slim, span 1, server record time; not scope-wide, irregular, save-ledger, packed or bulk; every op `small-op?` or a protected envelope; unpacked rows | The writer stamps one position and one clock and renders only these op shapes. | None with the per-subject settings (packing and the save ledger are off). |
| **At most 256 ops** | `(<= (count ops) 256)` | A sanity bound sized for the small save. A save writes 2F + R + 4 assertions plus R retractions and about 8 other ops. | Saves over about 60 facts, if the fact bound were lifted alone. |
| **One-byte assertion ordinal** | `orderedSaveIdentity.ts` (0 to 255), gateway `ordered-bounds` `(<= 1 n 256)` | The 26-character TripleId fixes the length; the identity spends 24 characters on the save's token and 2 hex characters on the ordinal. | A replace-only save reaches 256 assertions at 84 facts (3F + 4); 1.2 to 1.5% of saves exceed it. Over the bound the gateway falls back to one historical check per ID, but no such save is otherwise eligible today. |
| **Scope flags** | schema and function hashes, rows version 3, head version 2, strict clocks, regular positions and feed, consistent removal ledger | The writer's guards are compiled for this storage layout. | None on a current scope. |
| **Not with priority, field-only or budget policies or replay capture; a sealed cut needs the shared key directory** | `storage/commit!` | Those policies schedule saves themselves. | None with the per-subject settings. |
| **With the covering owner head on: exact one-to-one replacement and at most four live texts in the root** | `owner_layout/prepare`, `cover-after` | The root lists the edited texts it covers; it is rewritten on every save, so it stays small. | Any save of more than 4 facts, a first write or a retirement folds the subject and leaves the covering writer. |

### What each writer does per commit

Both writers store the same records: the business rows, one journal change per fact and per retired value, the four fixed journal rows (position, instant, command, changed subject), the claim, the transaction header and the revision. The difference is where the reads happen and which checks run at the serial point.

| Per commit | General writer (`commit.clj` `operation-code`, inside the transactor) | Per-subject writer (`subject_save.clj`, reads in the gateway, checks in the transactor) |
| --- | --- | --- |
| Records per fact | same | same |
| Bytes per fact | same row and journal texts | same texts (rendered in the gateway) |
| Fixed checks | operation and command uniqueness, removal frontier, newest commit and clock, journal absence, strict clocks, layout flags | the same plus the scope witness (about 8 flag values), the installed function, the numeric owner's public ID and a scan of `:db/excise` |
| Per retired value | a current-row lookup (AVET range or EAVT seek on the owner), an EAVT seek for a retirement marker, and an EAVT seek to find the text to retract | none at the serial point: the gateway read the predecessor before submitting (one or two EAVT seeks) and the revision compare-and-set proves it is still current |
| Per subject | one revision read, checked `<= source` | one revision compare-and-set against the revision the gateway read |
| Per new assertion (2F + R + 4 of them) | one historical AVET seek per ID, or one range probe when the client sends `historyIdentityBounds` for a contiguous block | one range probe over the ordered block (at most 128 datoms inspected), else one historical seek per ID |
| Stamping | parses and rewrites each row's JSON to insert the clock and position | inserts the clock and position into fragments split in the gateway |
| Journal rows | written | written, identical |

## 2. What a widened per-subject writer saves, at toy size (Mac, diagnostic)

**Method** (`w2/wide_gate.clj` `measure-*`, run by `w2/sql-run.sh`). PostgreSQL storage with `fsync`, `synchronous_commit` and `full_page_writes` on; 32 MiB object cache and memory index as in the owner-head probe. Three scopes get the same indexed seed (192 subjects × 160 fields). Each arm then applies the same saves, in the same order, to the same subjects: one transactor restart and one fresh gateway JVM per arm and round, two rounds of 96 subjects. Each subject gets one save of a given shape on a cold transactor ("cold"), then a save that replaces every field the first one wrote ("warm"). Shapes: 6, 20, 75 and 120 facts; all replacements, all first writes, and mixed (half replacements, two fifths first writes, the rest retirements). All arms use the same wide ordered IDs, so they write the same records. Arms:

- **general**: today's general writer, as the production tape's wide commits reach it (no `historyIdentityBounds`, predecessor lookup on).
- **general-bounds**: the same with the client's `historyIdentityBounds`, which replaces one history seek per new ID with one range probe.
- **subject-wide**: the per-subject writer with `TX2_SUBJECT_WIDE=1`.

Serial apply is Datomic's own transaction apply time (`io-stats :api-ms`); SQL fetches are the transaction's storage reads (`io-stats :reads :sql`) and, separately, the gateway's reads while planning. 16 commits per cell. Every commit's subject was read back exact after its commit (current values equal to the model).

### Serial apply per commit, two runs pooled (32 commits per cell, kinds pooled: 96 per row)

| Phase | Facts | General, p50 ms | General with bounds, p50 ms | Per-subject wide, p50 ms | General ÷ per-subject | With bounds ÷ per-subject | Datoms per commit (all arms) | Added text per commit (all arms) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| cold | 6 | 2.35 | 1.95 | 1.89 | 1.25 | 1.03 | 37 | 8.0 kB |
| cold | 20 | 4.80 | 2.99 | 2.53 | 1.90 | 1.18 | 79 | 23.9 kB |
| cold | 75 | 9.91 | 8.70 | 3.82 | 2.60 | 2.28 | 244 | 86.3 kB |
| cold | 120 | 14.46 | 10.80 | 5.21 | 2.78 | 2.07 | 379 | 137.6 kB |
| warm | 6 | 2.00 | 1.90 | 1.11 | 1.81 | 1.71 | 42 | 9.7 kB |
| warm | 20 | 3.61 | 3.17 | 1.61 | 2.24 | 1.97 | 96 | 30.0 kB |
| warm | 75 | 10.19 | 8.30 | 3.25 | 3.13 | 2.55 | 308 | 109.2 kB |
| warm | 120 | 15.75 | 12.73 | 4.49 | 3.50 | 2.83 | 483 | 174.6 kB |

- **The general writer is not within 20% of the widened per-subject writer for wide saves.** Its serial apply is 1.25 to 3.5 times longer, and the gap grows with size. Fitted on the warm medians: general 1.28 ms + 0.121 ms per fact, general with bounds 1.33 + 0.095, per-subject 0.93 + 0.030. At 120 facts the ratio is 3.3 (all replacements), 2.1 to 3.2 (all first writes) and 2.8 to 3.5 (mixed). Total serial apply over all 1,152 commits of both runs: general 10.5 s, general with bounds 11.8 s, per-subject 5.2 s.
- **Why.** Per fact, the general writer parses and rewrites each row's JSON and each journal change's JSON inside the transaction to insert the clock and position, and looks up each retired value and each new ID. The per-subject writer does that work in the gateway before the serial turn: rows arrive split around the clock and position slots, and the predecessors arrive with the plan. The client's bounds remove the per-ID history seeks (about 20% of the gap), not the JSON work.
- **The gateway pays instead.** Gateway wall time per save (plan, submit, durable reply, readback) was similar in all arms: median 34.0 ms per-subject against 31.9 ms general (Mac, loaded). Gateways scale out; the serial point does not.
- **Records and bytes per save are identical** in every one of the 384 save cells: the same datoms and the same added text bytes in all three arms.
- **Exact readback on every read route.** After both rounds, all three databases answered identically (compared by digest) on current reads of all 192 subjects (35,296 rows), full history of all 192 (51,200 rows), 172 pinned reads at positions across the rounds, 1,472 reads by assertion ID (current and history), reach for 24 subjects, and the whole feed with every journal change (576 transactions). Every save's subject was also read back equal to the model right after it committed.

## 3. What is built: `TX2_SUBJECT_WIDE=1`, default off

| Part | With the option on | With it off |
| --- | --- | --- |
| Eligibility (`subject_save.clj` `plan-with-erasure`) | Up to **128 facts and 128 retired values** per commit, at most 1,024 ops; any mix of replacements, first writes of a field and retirements; distinct plain fields on each side (no references, no `:_` attributes). Every other rule stays: one existing subject, one journal, one claim, regular frame, scope flags, protected envelopes only for this subject's rows. Ordered import frames (`import-predecessor`) stay on the general writer, which alone checks the predecessor claim. | Today's rule (one to three replacements), byte for byte. |
| Native function | **Unchanged** (same text, same ident `:triplex.subject/v-9c735b07…`): the function never depended on the save's size or shape, only the plan's eligibility did. No schema change, no new attribute, no new storage format. | Same. |
| Ordered identity (`orderedSaveIdentity.ts`) | `wideOrderedSaveIdentity()`: a 23-character token and a three-hex-digit ordinal, 4,096 assertions per block. IDs stay 26 characters (the core `TripleId` brand rejects any other length, which is why a 27-character form was not used). The journal ID is `_tx/<token>W00`. Blocks stay ordered (hex digits sort in ASCII), and `orderedSaveIdentity(token)` rebuilds either form from the retained token, so resends and recovery need nothing new. A process never issues a one-byte token inside a wide block's 23-character prefix or the reverse. | The gateway does not recognise a wide block: a one-to-three-fact save in one takes the per-subject writer with one history check per ID, and anything wider takes the general writer. |
| Gateway recognition (`ordered-bounds`) | A wide block is recognised from its journal ID and its exact contiguous IDs. It cannot be confused with a one-byte block: the 24th ID character is a hex digit and the journal's is `W`. The serial history guard proves the whole interval was never used, by any owner, live or retired, exactly as today; a crowded interval falls back to one check per ID. | Unchanged. |
| Why 128 facts | Every production-shaped save fits (maximum 119 to 121 facts; 2F + R + 4 is at most 388 assertions). The serial apply of a 120-fact save measured 4.5 ms on the Mac against 1.1 ms for 6 facts, so the bound caps how long one save can hold the serial point; a larger import still takes the general writer. 128 replacements make 388 assertions and about 520 ops, inside both other bounds. | |
| Covering owner head (`TX2_SUBJECT_OWNER_HEAD=1`) | Narrow replacements keep the covering writer. A wider save, a first write or a retirement folds the subject (as today) and then takes the plain per-subject writer instead of the general writer. The covering root is not widened: it is rewritten on every save, so it must stay at four texts. **So the covering head still applies only to one-to-three-field replacements.** | Unchanged. |
| Append retirement, removal on request, fair import, both credit modes | Unchanged mechanisms; covered by the gates below. | |
| Write options | `subjectWide: true, subjectWideFacts: 128` in `/write-options`, so launchers can read the switch back. | No new keys. |
