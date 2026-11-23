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
