# Wide saves on the per-subject writer

North star P2. One form save by a subject writes about 17 form rows; on the production-shaped tape a save carries 6 facts at the median, 72 to 75 at the 90th percentile, 103 at the 99th and about 120 at most, and about 4% of saves are a subject's first. The per-subject ordered writer accepts only one to three facts that each replace a current value, so one commit per save would run mostly on the general writer. This page says why, measures what a wider per-subject writer would buy at toy size, and builds it as a default-off option. Mac timings are diagnostic. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md) · Production tape: `real2/PRODUCTION-TAPE.md` on `exp/DX-REAL2-production-tape`

**In brief.**

- **Why wide saves miss the fast writer:** a plan-eligibility rule (one to three facts, each replacing a current value), not anything in the native function; plus a one-byte assertion ordinal (256 assertions, reached at 84 replacing facts).
- **What widening buys at toy size:** the general writer's serial apply is 1.25 to 3.5 times the widened per-subject writer's (2.8 to 3.5 times at 120 facts); records, bytes and every read route are identical. It saves serial CPU, not storage reads.
- **What is built:** `TX2_SUBJECT_WIDE=1`, default off: up to 128 facts with first writes and retirements, a 4,096-assertion ordered identity that keeps 26-character IDs, no change to the native function. Gated with the covering head on and off, append retirement, removal on request (one-field protected saves only), fair import, failover, lost replies and refused appends in both credit modes, and the full combined check.
- **Recommendation:** keep it, default off, and turn it on only together with one commit per save and a server pair that confirms at least 1.5 times on large commits. Leave it off for one commit per row. The covering head still does not apply to wide saves.

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

### Serial apply per commit, runs 1 and 2 pooled (32 commits per cell; kinds pooled, 96 commits per row)

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
- **Why.** Per fact, the general writer parses and rewrites each row's JSON and each journal change's JSON inside the transaction to insert the clock and position, and looks up each retired value and each new ID. The per-subject writer does that work in the gateway before the serial turn: rows arrive split around the clock and position slots, and the predecessors arrive with the plan. The client's bounds remove the per-ID history seeks (about a quarter of the gap for warm saves of 75 to 120 facts, more for small cold ones), not the JSON work.
- **The gateway pays instead.** Gateway wall time per save (plan, submit, durable reply, readback) was similar in all arms: median 34.0 ms per-subject against 31.9 ms general (Mac, loaded). Gateways scale out; the serial point does not.
- **Records and bytes per save are identical** in every one of the 384 save cells: the same datoms and the same added text bytes in all three arms.
- **Storage reads at the serial point did not fall.** Toy reads are few and noisy (index jobs and log replay after each restart dominate them; the same arm differed up to 2.5 times between runs). In a third run that indexed every database between rounds, so no index job ran during a round, the per-subject writer read 0.69 and 1.05 segments per cold commit (rounds 1 and 2) against 0.23 and 0.88 for the general writer, and 0.12 to 0.19 against 0.00 to 0.14 warm. Its fixed guards (scope witness, owner public ID, `:db/excise` scan, installed function) load segments on a fresh transactor that the general writer does not touch, and its predecessor reads move to the gateway (0.04 to 0.21 per cold save there). The server's row-shaped run showed the same direction: 0.047 late reads per commit on the per-subject writer against 0.015 on the general writer. **Widening the writer saves serial CPU, not reads.** The run-3 apply ratios repeat runs 1 and 2: 1.6 to 2.3 cold and 1.8 to 3.1 warm.
- **Exact readback on every read route.** In runs 2 and 3, after both rounds, all three databases answered identically (compared by digest) on current reads of all 192 subjects (35,296 rows), full history of all 192 (51,200 rows), 172 pinned reads at positions across the rounds, 1,472 reads by assertion ID (current and history), reach for 24 subjects, and the whole feed with every journal change (576 transactions). Every save's subject was also read back equal to the model right after it committed.

## 3. What is built: `TX2_SUBJECT_WIDE=1`, default off

| Part | With the option on | With it off |
| --- | --- | --- |
| Eligibility (`subject_save.clj` `plan-with-erasure`) | Up to **128 facts and 128 retired values** per commit, at most 1,024 ops; any mix of replacements, first writes of a field and retirements; distinct plain fields on each side (no references, no `:_` attributes). Every other rule stays: one existing subject, one journal, one claim, regular frame, scope flags, protected envelopes only for this subject's rows. Ordered import frames (`import-predecessor`) stay on the general writer, which alone checks the predecessor claim. | Today's rule (one to three replacements), byte for byte. |
| Native function | **Unchanged** (same text, same ident `:triplex.subject/v-9c735b07…`): the function never depended on the save's size or shape, only the plan's eligibility did. No schema change, no new attribute, no new storage format. | Same. |
| Ordered identity (`orderedSaveIdentity.ts`) | `wideOrderedSaveIdentity()`: a 23-character token and a three-hex-digit ordinal, 4,096 assertions per block. IDs stay 26 characters (the core `TripleId` brand rejects any other length, which is why a 27-character form was not used). The journal ID is `_tx/<token>W00`. Blocks stay ordered (hex digits sort in ASCII), and `orderedSaveIdentity(token)` rebuilds either form from the retained token, so resends and recovery need nothing new. A process never issues a one-byte token inside a wide block's 23-character prefix or the reverse. | The gateway does not recognise a wide block: a one-to-three-fact save in one takes the per-subject writer with one history check per ID, and anything wider takes the general writer. |
| Gateway recognition (`ordered-bounds`) | A wide block is recognised from its journal ID and its exact contiguous IDs. It cannot be confused with a one-byte block: the 24th ID character is a hex digit and the journal's is `W`. The serial history guard proves the whole interval was never used, by any owner, live or retired, exactly as today; a crowded interval falls back to one check per ID. | Unchanged. |
| Why 128 facts | Every production-shaped save fits (maximum 119 to 121 facts; 2F + R + 4 is at most 388 assertions). The serial apply of a 120-fact save measured 4.5 ms on the Mac against 1.1 ms for 6 facts, so the bound caps how long one save can hold the serial point; a larger import still takes the general writer. 128 replacements make 388 assertions and about 520 ops, inside both other bounds. | |
| Covering owner head (`TX2_SUBJECT_OWNER_HEAD=1`) | Narrow replacements keep the covering writer. A wider save, a first write or a retirement folds the subject (as today) and then takes the plain per-subject writer instead of the general writer. The covering root is not widened: it is rewritten on every save, so it must stay at four texts. **So the covering head still applies only to exact replacements of up to four fields** (one to three with the option off; four with it on, the root's own limit, which the recovery gate below exercises). | Unchanged. |
| Append retirement, removal on request, fair import, both credit modes | Unchanged mechanisms; covered by the gates below. | |
| Write options | `subjectWide: true, subjectWideFacts: 128` in `/write-options`, so launchers can read the switch back. | No new keys. |

## 4. Gates (Mac, correctness; option on unless stated)

| Gate | Configuration | Result |
| --- | --- | --- |
| **New case: wide saves interleaved with narrow ones on one subject** (`wide-gate/wide-saves-match-the-general-writer`): 11 saves on one subject, one-byte and wide blocks, 1 to 129 facts, replacements, first writes, retirements, mixed; every save against a control database without the option | in memory; and on PostgreSQL (run 2) | Same outcome, position and clock as the control for every save; per-subject writer for every save up to 128 facts, general writer at 129; current, pinned at every position, history, by assertion ID, reach and the feed with every change equal to the control; current values equal to the model |
| The same with append retirement (`wide-saves-with-append-retirement`) | numeric owner, markers | Equal on every route; 269 retirement markers written |
| Refusals, resends and identities (`wide-conflicts-resends-and-identities`) | | Resend: `OperationDuplicate`; same command, new operation: `CommandConflict`, original receipt kept; a save planned before its predecessors changed: `CasConflict`, nothing written; a wide block over an old one-byte block's live and retired IDs, and a reused wide block: `IdentityConflict` in both arms, nothing written; **lost reply on the wide path**: durable, `OutcomeUnknown`, resend `OperationDuplicate`, the original position recovered |
| Covering owner head on (`wide-saves-with-the-covering-head`) | `TX2_SUBJECT_OWNER_HEAD=1`, narrow revision and predecessor reuse on | Narrow replacements on the covering writer, wide saves and first writes fold then take the plain per-subject writer, the next narrow replacement migrates again; every route equal to a database with neither option |
| Wide-gate totals | wide on, head off: 4 tests, 221 assertions; head on: 265 assertions; PostgreSQL: 221 | pass |
| **Writer and conflict matrix** (`prep1/subject_gate.clj`, `subject_conflicts.clj`) | option off and on, owner head off and on | 782 (head off) and 936 (head on) assertions, pass in all four |
| **Layout gate** (`prep1/owner_layout_gate.clj`: migration, races, framed root, fold at four, product routes against legacy, reference-writer fence, admission) | owner head on, option off and on | 5 tests, 160 assertions, pass both ways |
| Gateway selftest | option off and on | 28 tests, 54,110 assertions, pass both ways |
| **Recovery with lost replies and refused appends** (`prep1/manage.py … rolling-recovery`, DX-CHK1's native append case) | option on, rolling 6, append retirement, serial revision, every save replacing four fields in a wide block | 56 durable saves, 6 refused appends absent after the restart, the lost reply recovered with its original position, time and clock; retired legacy and wide IDs refused for reuse (`IdentityConflict`); full replay of 57 positions; exit 0 |
| **Recovery with the covering head** (`DX_W1_OWNER_HEAD=1 prep1/manage.py … rolling-recovery`: layout gate on PostgreSQL, serial edits, writer gate, removal across the head, then barrier 6 and rolling 6) | option on, owner head on, serial revision; every rolling save replaces four fields, so the covering writer takes four-field saves (the cover holds four) | Layout gate 160 assertions and writer gate 936, pass; removal across the head in both credit modes; barrier 6 and rolling 6 each 56 durable saves, 6 refused appends absent after restart, the lost reply recovered; exit 0 |
| DX-CHK1 removal combination (`erase1 ledger-authority-regression --combined --realistic`, rolling 6, append retirement) | option on, read back as `subjectWide: true` from the removal gateway | 13 routes, rolling saves and backup restore, exit 0. Its protected witness is a one-field save, so **a wide save carrying protected values was not exercised end to end**; the plan checks each protected body against its own business row, unchanged |
| DX-CHK1 failover combination (policy B, append retirement) | option passed to the writer gateways | exit 0 |
| DX-CHK1 fair import, quiet account and Publish (`ha1 load-fair --combined fair`) | option on in the writer settings | exit 0 |
| DX-CHK1 cold admission ramp with lost reply and resend (`cold`) | option on | exit 0 |
| DX-CHK1 realistic seed with fair import and Publish (`real-fair`) | option on | first attempt stopped on "8 import frames expected, 4 committed" inside the case's 5-second import window on a loaded Mac (load average 23; import frames carry a client sequence, a new subject and a reference, so they never reach the per-subject writer); the rerun passed, exit 0 |
| DX-CHK1 read study with saves, removal and import (`read`) | option on | first attempt stopped on an untyped `TRIPLEX_ERASURE_FRONTIER` from an import racing the removal, the same refusal family the owner-head check hit with the option off; the rerun passed, exit 0 |
| Toy measurement readback | three arms, runs 2 and 3 | every read route equal by digest (section 2) |
| TypeScript identity tests (`w2/wide-ids.test.mjs`, `prep1/ordered-ids.test.mjs`) | | 5 tests pass: 26-character IDs, 4,096 ordinals in order, rebuild from token, no shared prefix between forms, a 120-fact lab command in one block |

## 5. Server command and predictions (written before any run; no server was available to this builder)

**What the production tape needs to pass the option through.** The tape branch (`exp/DX-REAL2-production-tape`, `32ca969bb`) runs PREP1's older gateway, so the option has to be ported there. `w2/production-tape-wide.patch` does it and applies cleanly to `32ca969bb`:

1. The gateway eligibility and the wide ordered identity (`subject_save.clj`, `orderedSaveIdentity.ts`, `index.ts`) and the `subjectWide` write-options readback (`main.clj`). The native function is unchanged there too.
2. `stack/up.sh` forwards `TX2_SUBJECT_WIDE` to the writer gateways (its list of forwarded subject settings is explicit).
3. `prep1/server.sh` exports `TX2_SUBJECT_WIDE=1` for every cell when it is launched with `DX_REAL2_WIDE=1` (only for the production sets), and `0` otherwise.
4. `prep1/server-produce.ts` gives a commit over 256 assertions a wide ordered block instead of the general identity when the switch is on, and checks `subjectWide` on every writer's write-options before the first offer. Resend and journal checks already rebuild the block from its token.
5. `prep1/server-collect.py` reports `wideIdentityCommits` beside `generalIdentityCommits` and the existing `writerPath`.

Commit the applied patch on the tape branch (the launcher refuses a dirty tree) and rebuild `packages/datomic/dist` in the server checkout as the tape's prepare step already does. **Not exercised:** the patched `server.sh`, `up.sh`, producer and collector (Linux only). On the Mac the ported gateway loads, reports the switch and recognises a wide block (and still reads a one-byte block whose token ends in `W` as one-byte).

**The pair.** The same S tape (one commit per save, 23.1 commits/s at the 394 load), the same stack and settings, the option off then on, back to back on one machine. Off at the patched commit behaves exactly as `32ca969bb` (no switch, no new key).

```bash
# Fresh 430 million cut, 16 GiB profile: about 20 minutes each (cap 1,600 s each)
DX_BARE_METAL=1 node lab/bin/heavy.mjs --label DX-W2-wide-off -- \
  bash lab/experiments/EXP-DX1/prep1/server.sh production-s "$W2_OUT/off" "$(git rev-parse HEAD)" \
  "$SCALE1_IMAGE" 77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
  1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
  --pg-data "$SCALE1_PGDATA" --wal-mount "$SCALE1_WAL_MOUNT"
DX_REAL2_WIDE=1 DX_BARE_METAL=1 node lab/bin/heavy.mjs --label DX-W2-wide-on -- \
  bash lab/experiments/EXP-DX1/prep1/server.sh production-s "$W2_OUT/on" "$(git rev-parse HEAD)" \
  "$SCALE1_IMAGE" 77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
  1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
  --pg-data "$SCALE1_PGDATA" --wal-mount "$SCALE1_WAL_MOUNT"

# Sealed 1 billion cut, as the tape's production-aged mode runs it (R then S at 394 on 32 GiB): cap 3,560 s each
DX_BARE_METAL=1 node lab/bin/heavy.mjs --label DX-W2-wide-aged-off -- \
  bash lab/experiments/EXP-DX1/prep1/server.sh production-aged "$W2_OUT/aged-off" "$(git rev-parse HEAD)" \
  "$SCALE1_IMAGE" 77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
  1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
  --pg-data "$AGED_PGDATA_SOURCE" --wal-mount "$SCALE1_WAL_MOUNT" \
  --aged-bundle "$AGE_HANDOFF_JSON" "$AGE_HANDOFF_SHA256"
DX_REAL2_WIDE=1 DX_BARE_METAL=1 node lab/bin/heavy.mjs --label DX-W2-wide-aged-on -- \
  bash lab/experiments/EXP-DX1/prep1/server.sh production-aged "$W2_OUT/aged-on" "$(git rev-parse HEAD)" \
  "$SCALE1_IMAGE" 77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
  1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
  --pg-data "$AGED_PGDATA_SOURCE" --wal-mount "$SCALE1_WAL_MOUNT" \
  --aged-bundle "$AGE_HANDOFF_JSON" "$AGE_HANDOFF_SHA256"
```

The pins, environment and data directories are the ones `PRODUCTION-TAPE.md` and `PRODUCTION-AGED.md` publish for `production-s` and `production-aged`; only the output directories, the labels and the `DX_REAL2_WIDE` switch differ. If tonight's `production-s` and `production-aged` runs at `32ca969bb` complete on the same machine and settings, they can serve as the off arms and only the two "on" commands need to run (about 20 and 60 minutes).

**Predictions** (central value, then range). Serial apply is the late, warm, outside-index-job apply the collector reports by commit size (`applyMsBySize`); reads are PostgreSQL segment reads per commit at the serial point. The Mac's apply times are about 3.5 times the server's (6-fact per-subject save: 1.1 ms on the Mac; the server's 1.2-fact save: 0.30 ms), so the toy fits scale to general ≈ 0.37 ms + 0.035 ms per fact and per-subject ≈ 0.27 ms + 0.009 ms per fact.

| Measure | Fresh, off | Fresh, on | 1 billion, off | 1 billion, on |
| --- | --- | --- | --- | --- |
| S commits on the per-subject writer (`writerPath`) | 32% (25–40) | 98% (95–100) | 32% (25–40) | 98% (95–100) |
| Commits with a wide block / the general identity | 0 / 1.2–1.5% | 1.2–1.5% / 0 | 0 / 1.2–1.5% | 1.2–1.5% / 0 |
| Stored commits/s, expiries | 23.1, none | 23.1, none | 23.1, none | 23.1, none |
| Serial apply, mean commit (about 20 facts) | 1.1 ms (0.6–2.0) | 0.45 ms (0.25–0.9) | 1.5 ms (0.8–3.0) | 0.7 ms (0.35–1.5) |
| Serial apply, commits of 60 facts or more | 3.5 ms (2–7) | 1.1 ms (0.6–2.5) | 4.5 ms (2.5–9) | 1.8 ms (0.9–4) |
| Off ÷ on, apply at 60 facts or more | | 3.0 (1.8–4) | | 2.5 (1.5–3.5) |
| Serial reads per commit, late | 0.4 (0.05–2.5) | 0.45 (0.05–3) | 0.6 (0.1–3) | 0.7 (0.1–3.5) |
| Busy p99 per commit, whole / second half | 50 / 40 ms | 45 / 36 ms (within ±20% of off) | 60 / 50 ms | 55 / 45 ms (within ±25% of off) |
| Quiet account p99, loaded | 35 ms | within ±5 ms of off | 40 ms | within ±5 ms of off |

On the 1 billion cut the `production-aged` mode also runs R; with the option on, R's first-write rows (about half of R's commits) move to the per-subject writer. Prediction for R: stored rate unchanged, busy p99 within ±15% of off, per-commit p99 of the two writer paths closer together than off's 121 against 188 ms.

**What would show these predictions wrong.**

1. **The on arm puts under 95% of S commits on the per-subject writer.** Then production-shaped saves break a rule the toy shapes did not (for example the source cut against the gateway's head); read which rule refused them before anything else.
2. **Off ÷ on apply at 60 facts or more is below 1.5.** Then the toy's gain does not carry to the server, and the general writer is close enough: recommend not turning the option on.
3. **On reads more than twice off's serial reads per commit late, or more than 1 read per commit more on the 1 billion cut.** Then the per-subject writer's fixed guards cost more at full size than the JSON work they save.
4. **On's busy p99 is more than 20% (fresh) or 25% (1 billion) above off's.** Then gateway planning of large saves (predecessor reads and rendering, before the serial turn) costs more than the serial time saved; the gateway timeline in each ACK says where.
5. **Any lost save, any acknowledged row missing from the journal, any readback mismatch or any expiry.** Exactness or capacity broke; the run counts for nothing until explained.

## 6. What it buys, plainly

- **It is not within 20%.** At toy size the general writer's serial apply is 1.25 to 3.5 times the widened per-subject writer's, 2.8 to 3.5 times at 120 facts, and the whole measured tape took half the serial time (5.2 s against 10.5 s). The client's history bounds close about a quarter of the gap on large saves, not the rest. By the stated rule the option is worth keeping.
- **What it buys is serial CPU, not reads and not latency at today's load.** It moves each save's JSON stamping, predecessor reads and per-ID checks from the serial point into the gateway. It does not reduce storage reads at the serial point (it read slightly more at toy size and in the server's row-shaped run). At the 394 load in one commit per save (23.1 commits/s, about 20 facts each) the forecast saving is about 0.65 ms of serial apply per commit, about 15 ms per second of transactor time (1.5% of a core). The predicted commit p99 (about 50 ms) is set by durable storage, credits and index-job stalls, so the server pair should show no clear p99 change. The gain is headroom: about 2.5 times as many wide commits before the serial point fills, and a 120-fact save holding the serial point about 1.2 ms instead of about 4.5 ms.
- **It does not bring the covering owner head to one commit per save.** The covering root holds four texts and is rewritten on every save, so wide saves fold and use the plain per-subject writer. The head stays a read optimisation for exact replacements of up to four fields; for one commit per save, memory and the cache remain what keep reads down as the database grows.
- **Cost in moving parts:** one default-off switch, about 30 lines of eligibility in `subject_save.clj` and 8 in `owner_layout.clj`, one readback key, and a second ordered-identity form in the client. No native function, schema, attribute or storage format changes; records, bytes and every read route are identical.

**Recommendation.**

1. **If the owner chooses one commit per save:** merge the option onto the one branch default-off, run the "on" server arm(s) above, and turn it on together with that choice if off ÷ on apply at 60 facts or more is at least 1.5 and neither reads nor p99 regress (falsifiers 2 to 4). Without it, about two thirds of those commits run on the general writer at two to three times the serial cost.
2. **If the owner keeps one commit per form row:** leave it off. Row commits carry 1.2 facts; the measured gain at 6 facts was 1.25 to 1.8 times on a 1 to 2 ms apply, and the row shape's latency comes from its serial chain of rows, not from apply.
3. **If the server pair shows apply within 1.5 times, remove the option** rather than keep an unused switch.
4. **Do not widen the covering head** for wide saves.

**Found on the way (not changed with the option off):** the narrow per-subject writer does not refuse an ordered import frame (`import-predecessor`, only with `TX2_IMPORT_PIPELINE=1`). A pipeline frame that happened to be one to three replacements on one existing subject would skip the general writer's check that the previous import claim is durable. Today's pipeline frames create new subjects, so none qualifies; under `TX2_SUBJECT_WIDE=1` such frames stay on the general writer regardless, and the same one-line guard could be applied to the narrow rule.

## Evidence

Private evidence folder `DX-W2`: `sql1-measure.log.gz`, `sql2-measure-verify-gate.log.gz`, `sql3-indexed-rounds.log.gz` (the three paired runs), `gates.tar.gz` (in-memory suites), `chk1-and-recovery.tar.gz` (the two recovery gates and the combined-check cases; the cases' own directories are under `DX-CHK1`), with `SHA256SUMS`.
