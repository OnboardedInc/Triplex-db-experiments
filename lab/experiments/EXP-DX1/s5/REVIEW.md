# Adversarial review of the per-subject save line (DX-S5, 2026-11-24)

Reviewer DX-S5, branch `exp/DX-S5-save-line-review` from `exp/DX-S4-real-mix` at `2d78680f7` (base of the line
`exp/DX-INT1` at `23b7df344`). The code under review was not changed. This branch adds a differential fuzzer, targeted
attack tests, a PostgreSQL stack check and this page (`s5/`). Mac only, toy sizes, the lab VM shared with other
builders; every time on this page is diagnostic. The code was read before the builders' pages, and each suspicion below
was written down before its test ran.

## Page 1, for the owner

**Is there a break? Yes, one, and it is not in the per-subject writers.** On a real stack with PostgreSQL storage, a
save that the transactor committed was answered `400 TransactionRejected` ("Transactor not available"), because the
transactor restarted before the gateway received the acknowledgement. The SDK treats that 400 as final, so the caller is
told the save failed while it is stored. The general writer answers the same way through the same code, so the fault
is older than this line. How sure: certain. On the stack it happened by timing in 2 of 6 runs with a transactor
restart (8,743 saves sent, 2,373 committed): once on the creation writer (operation `fz1001-100108507`) and once on the
general writer (`fz1001-100109251`). It happens every time in an in-process test that makes the transactor unavailable
after it applied the save, on the one-owner, creation and general writers alike.

**In the per-subject writers themselves, no save stored anything the general writer would not have stored. How sure:
high for what was tried, which is not proof.** The differential fuzzer applied 82,400 saves to a candidate and a general-writer control from identical prior states, in 13 runs over five writer settings: 59,000 one at a time (with 5,883 competing saves injected between the plan and the commit, 2,949 kills and 1,815 lost replies), and 23,400 from 2 and 4 writers at once, every committed one then accepted again by the general writer at the same prior state. 0 differences in outcome, receipt, stored datoms or any read route (209 full comparisons). On the PostgreSQL stack, 2,373 committed saves of 6 runs replayed equal on a control, with a writer gateway killed and the transactor restarted in every run.

**The three most serious findings**

1. **F1 (break, every writer): a committed save is answered as refused when the transactor goes away before its
   acknowledgement.**
   - Stack (`s5/stack.sh`, evidence `stack1-server` and `stack3-server-2`). Writer gateway A had handed the save to the
     transactor when the transactor was stopped. The answer was `400 TransactionRejected`, with the message
     `Transactor not available #:cognitect.anomalies{:category :cognitect.anomalies/unavailable ...}` in the second run.
     The verifier then found the operation `committed` at its position, contiguous with the rest. The first save was
     taken by the creation writer, the second by the general writer. In every stack run another 695 to 725 saves were
     answered with the same final code while the peer reconnected (720 of 1,456 on the general writer alone,
     `stack2-general`); those were not stored, and a caller cannot tell them from saves the store refused for cause.
   - In process, `s5-attack/transactor-unavailable-after-apply` reproduces it on demand. Output, one line per writer:
     `one owner, per-subject writer: answer [400 TransactionRejected] "Transactor not available", operation committed,
     resend [409 OperationDuplicate]`, the same for `creation, creation writer` and for `one owner, general writer`.
   - Cause: `storage.clj` 627-645 (`commit!`'s catch) turns every exception it does not recognise into
     `400 TransactionRejected`, including a transport anomaly (`:cognitect.anomalies/unavailable`). The SDK
     (`DatomicStorageAdapter.ts` 658-684) turns a 4xx other than a conflict into a final `WriteError` and looks the
     operation up only after a 5xx. The save contract (`v01/SAVE-SHAPE.md` section 1, item 3) says an unknown outcome
     is `OutcomeUnknown`, found afterwards by its command.
2. **F2 (the import bound does not bound the time an import holds the writer): frames estimated under the 40,000 µs
   bound held the toy's writer 85 to 174 ms.**
   - The estimate (`import_bound.clj` 9-11, `write_policy.clj` 14-17) prices operations at 45 µs and request bytes at
     70 µs per KiB. The general writer also makes one index lookup per entity in the read set and per predecessor in
     `live` (`commit.clj` 230-256); the estimate prices those only by their bytes, about 0.5 to 2 µs each.
   - Test `s5-attack/import-bound-estimate-against-apply`, three runs (`smoke2-attack`, `run3-attack`,
     `run4-attack`), every frame admitted (`200`):

     | Import frame | Operations | Request bytes | Estimate | Time in the writer (3 runs) |
     | --- | ---: | ---: | ---: | --- |
     | 100 facts of one new subject (honest) | 212 | 240,883 | 29,507 µs | 1,433 to 3,218 µs |
     | 1 fact, 55,000 absent entity names in its read set | 14 | 490,116 | 37,635 µs | 85,252 to 118,298 µs |
     | 1 fact, one existing subject named 18,000 times in its read set | 14 | 492,242 | 37,780 µs | 150,521 to 174,317 µs |
     | 1 fact, 12,000 read-only predecessors in `live` | 14 | 354,219 | 28,345 µs | 97,534 to 136,304 µs |

     "Time in the writer" is the receipt's `transactMicros` on the memory toy (submit to acknowledgement, in process).
     At 1 billion records each lookup can be a cold segment read, so the gap grows with the database.
3. **F3 (the same request, a different refusal): a save racing a removal on request is refused `409 CasConflict` by
   every per-subject writer and `409 ErasureFrontierChanged` by the general writer.** The SDK replays the first
   (re-read, re-validate, re-stage) and fails the second to the caller (`DatomicStorageAdapter.ts` 664-684).
   - Test `s5-attack/save-racing-a-removal` (a removal of another subject's protected value lands between the plan and
     the commit), each kind on its own scope with each writer: `one owner: per-subject [409 CasConflict], general
     [409 ErasureFrontierChanged]`; `two owners: several-owners [409 CasConflict], general [409
     ErasureFrontierChanged]`; `creation: creation writer [409 CasConflict], general [409 ErasureFrontierChanged]`.
     Both refuse whole (operation absent in all six).
   - `first-save-racing-protection`: the first save of a scope, racing the scope's protection declaration, gets the
     same two answers.
   - Neither builder measured the general writer here. `s4/create_gate.clj` 197-199 writes its answer as a constant
     (`{:status 409 :body {"code" "CasConflict"}}`, "refused the same way"), and `s3/owners_gate.clj` 209-231 has no
     control. Cause: the per-subject body throws `TRIPLEX_CONFLICT` when a scope flag moved (`subject_save.clj` 108-117,
     shared by all three functions); the general writer throws `TRIPLEX_ERASURE_FRONTIER` (`commit.clj` 187-190).

**One recommendation: merge with named fixes.** In everything tried, the per-subject writers store exactly what the
general writer stores, so the line can merge. The fixes:

1. **Fix F1 (about five lines, independent of this line, can land on the one branch after the merge).** In `storage.clj`
   `commit!`'s catch, answer `503 OutcomeUnknown` when the failure is a transport anomaly (category `unavailable`,
   `interrupted`, `busy` or `fault`, or the message "Transactor not available"). Keep 400 and 409 for refusals the
   gateway or the transaction function decided. The SDK already resolves a 503 by looking the operation up.
2. **Fix F2 before the import bound is counted for priority 6.** Price `(count entities)`, `(count live)` and
   `(count command-ids)` as lookups in `import_bound.clj` `estimate-us`, or refuse an import frame whose read set is
   larger than the entities it writes. No stored function changes.
3. **Decide F3.** One refusal code on both writers for a save racing a removal, and a measured control in place of the
   S4 gate's constant. Choosing the code in the gateway (after a per-subject refusal, compare the plan's erasure flags
   with the database the gateway already syncs to) changes no stored function.

## 1. Findings

| # | Severity | Finding | Evidence | Proposed fix |
| --- | --- | --- | --- | --- |
| F1 | **High (break; every writer; older than the line)** | A save the transactor committed is answered `400 TransactionRejected` when the transactor becomes unavailable before the acknowledgement; the SDK treats it as final and never looks it up. About 700 more saves per restart get the same final answer while the peer reconnects; they were not stored | Stack: 2 committed saves answered 400 in 6 runs (`stack1-server` creation writer, `stack3-server-2` general writer), 695 to 725 such answers per run, 720 of 1,456 on the general writer alone (`stack2-general`); `transactor-unavailable-after-apply` 3 of 3 writers. `storage.clj` 627-645, `DatomicStorageAdapter.ts` 658-684 | 503 `OutcomeUnknown` for transport anomalies; 400 and 409 only for decided refusals |
| F2 | **Medium** | The import bound prices operations and bytes but not lookups: a frame's read set (`entities`) and predecessors (`live`) cost the writer one index lookup each. Frames admitted under 40,000 µs held the toy's writer 85 to 174 ms; honest frames run at 0.05 to 0.11 of their estimate | `import-bound-estimate-against-apply`, 3 runs (table above). `import_bound.clj` 9-11, `write_policy.clj` 14-17, `commit.clj` 230-256 | Count `entities`, `live` and claims in `estimate-us`, or cap an import frame's read set at the entities it writes |
| F3 | **Medium-low (different answers, same records)** | A save racing a removal on request (or the first save racing a protection declaration) is refused `CasConflict` by every per-subject writer and `ErasureFrontierChanged` by the general writer; the SDK replays one and fails the other. The S4 gate's control for this case is a constant, the S3 gate has none | `save-racing-a-removal` 3 of 3 kinds, `first-save-racing-protection`. `subject_save.clj` 108-117, `commit.clj` 187-190, `s4/create_gate.clj` 197-199 | One code on both writers, chosen in the gateway after the refusal so no stored function changes, and a measured control |
| F4 | Low (a save refused whatever its frame) | With `TX2_SUBJECT_CREATE=1`, a creation that writes a family a removal named before the entity existed is refused `ErasureReplayDeclined` even when it is framed after the removal. The same value written onto an existing entity after its own removal commits, and the same creation split into two saves commits (the entity first, then the value). The code's own docstring says such a creation "was framed before the removal"; nothing checks that, although each removal entry already records its position | `removed-family-after-removal`: option on `[409 ErasureReplayDeclined]`, without the value `[200]`, then the value `[200]`; existing entity `[200]`; option off `[200]`. `subject_create.clj` 69-75 (its docstring at 70-72 states the framing assumption), `privacy.clj` 270-276, `import_bound.clj` 25-32, `erase.clj` 130-136 | Keep each family's removal position (the entry has it) and refuse only frames whose source predates it, or state the rule on the page |
| F5 | Low (the card) | With the wide writer, several owners or creations on, `checkSavedIdentity` checks a per-subject function's name only when a save names one; a run in which every eligible save went to the general writer passes. The card reports the split (`writerPath`) but no gate asserts it | `v01/adopted.ts` 120-128 (read, not run: the SDK is not built in this worktree) | Assert the per-subject share the arm's tape predicts, as `v01/production-aged-toy.ts` 152 does for "at least one" |
| F6 | Low (known; cause now pinned) | The S2 change to `subject_save.clj`'s plan (349-358, inside the plan function, not stored code) is enough on its own to change the stored code and identities of the covering writer (`owner-layout`, installed only with `TX2_SUBJECT_OWNER_HEAD=1`) and the general hint function (`general-prefetch`, only with `TX2_GENERAL_PREFETCH=1`). The likely mechanism is the generated-name counter: the edited `and` has one term fewer, so one generated name fewer, and every namespace loaded after `subject-save` embeds shifted names in its quoted code (the comment at `privacy.clj` 272-274 guards against exactly this). The S4 page's finding 3 saw the 5 values; this pins the cause. With every option off none of the 5 is installed | `s4/idents.sh`: base `23b7df344` against head, 53 of 58 values equal in all 9 settings, 5 differ; base plus only the S2 file gives the same 5 new values (`runs/idents/compare-base-plus-s2.txt`) | Keep generated names out of stored code (no `x#` or `and`-expanded forms in quoted code), or hash the code after renaming generated symbols |
| F7 | Low (performance; older than the line) | Every per-subject commit scans every excision entity in the database at the serial point (`changes-application-rows?`, `subject_save.clj` 35-40, in the body at 116), so its cost grows with the number of removals ever made, in one database for all accounts | Read from code; not measured, because the memory database keeps no excision datoms (0 after 2,000 removals in `excision-scan-on-every-fast-commit`) | Keep a counter or a flag of non-body excisions on the scope and read that one datom |
| F8 | Information | One excision of anything other than a protected body, anywhere in the database, turns every per-subject writer off for every account for good (the same check returns true from then on) | `subject_save.clj` 35-40, 116, 319 | As F7; state it in the operations notes |
| F9 | Information | `one-account?` (`subject_owners.clj` 61-64) counts owners without an `acct/` prefix as one account; `group/classify` (`group.clj` 113-114) reads their stored account. A save writing two such owners of two stored accounts takes a per-subject writer. The general writer has no account rule, so stored records are equal | Read from code | Use the same rule as `classify`, or decline owners without the prefix |
| F10 | Information (the IMP2 page) | With `TX2_SUBJECT_CREATE=1`, an import frame of one to four new subjects with one claim and a source takes the creation function; the IMP2 page (section 2) says import frames "never reach the per-subject writer". Records are equal; the page is out of date | `import-bound-estimate-against-apply`: the honest frames were taken by `:triplex.subject/create-f9690a21…` | Correct the IMP2 page |
| F11 | Information (rollout) | A removal handled by a gateway without the creation option records no families; a creation of that entity through a gateway with the option then brings the removed value back. Mixed fleets during rollout only | Read from code (`subject_create.clj` 67, `erase.clj` 127-136) | Turn the option on everywhere before relying on the rule, as the S4 page already says for "option off" |

## 2. What was attacked and did not break

Counts are from the evidence runs named in section 4. The fuzzer applies every save to two scopes from identical prior
states: the candidate with the per-subject writers as configured, and a control on which every per-subject plan is
declined, so the general writer decides the same request. "Equal" means the same status and code for every save, and
for a commit the same position, record clock and datom count; and at every comparison point (every 400 saves, after the
serial phase and after every concurrent round) the same stored datoms (a digest of every datom of the row, identity,
revision, claim, journal and scope-flag attributes, with entities named by public ID and transactions by position) and
the same answer on every read route. Under append retirement (the `serial` setting) only the read routes are compared,
because its retirement markers differ from the general writer's retractions by design.

1. **The differential fuzzer: 82,400 saves, 0 differences.** 59,000 saves one at a time and 23,400 in 52 concurrent rounds (15,600 with 4 writers, 7,800 with 2), by setting: the server's settings 19,400 (3 runs); narrow revision, reused predecessors and append retirement 18,900 (3 runs); per-subject hints 18,900 (3 runs); without the numeric owner 12,600 (2 runs); with prefetch 12,600 (2 runs). Serial saves by the writer they were submitted to: one-owner 10,765, several owners 4,529, creation 19,456, general 24,250; concurrent: one-owner 5,193, several owners 1,806, creation 6,422, general 9,979. Serial outcomes: 47,437 committed, 7,765 `CasConflict`, 922 `IdentityConflict`, 1,138 `CommandConflict`, 906 `OperationDuplicate`, 832 `TransactionRejected` (retractions framed on another owner's entity, refused the same way on both writers); concurrent: 17,100 committed, 6,300 `CasConflict`, every refusal justified by a commit after its source on an entity it named. Declined plans by reason: reference-or-system-field 3,412, over-owner-bound 3,196, several-accounts 2,869, system-entity 1,761, read-only-entity 1,235, frame 894, over-subject-bound 90. Faults applied by the generator to serial saves: a stale source (8%), an extra read-only entity (5%), a scope-wide read (4%), a stale predecessor (3%), a retraction framed on another owner (2%); the counts by mode are exact: plain 44,823, race 5,883, lost-reply 1,815, kill-after 1,488, kill-before 1,461, same-command 1,138, same-operation 906, reuse-block 896, reuse-refused-block 590.
2. **Every check the general writer makes, against the per-subject functions.** Each row is attacked by the fuzzer's
   faults or by a targeted test; none broke except where a finding names it.

   | General writer check (`commit.clj`) | One-owner function | Several owners | Creation | How it was attacked |
   | --- | --- | --- | --- | --- |
   | Operation ID already used (181-182) | Same check | Same | Same | Resent operations 906, lost replies 1,815, kills after submit 1,488: every resend of a committed save `409 OperationDuplicate` on both writers, and the operation found committed with the original position (the killed request's own answer is F1's 400) |
   | Command ID already used (183-184) | Same check, exactly one claim | Same | Same | A new operation under a committed command 1,138: `409 CommandConflict` on both |
   | Erasure frontier (187-190) | Scope flags compared with the plan's (108-117) | Same | Same | F3 (different code, both refuse whole) |
   | Import predecessor claim (209-210) | Declined with the wide writer on (293) | Declined | Declined | Read |
   | Scope-wide read: head equals source (229) | Declined | Declined | Declined | Scope-wide fault in the fuzzer (4% of serial saves) |
   | Each predecessor in `live` exists and is not retired (230-248) | The plan reads it on the owner; the revision compare-and-set covers it | Per owner | Existing owners only | Stale predecessors and retractions framed on the wrong owner, refused on both; competing saves between plan and commit (5,883, of which 3,499 were planned on a per-subject function) |
   | Each entity's revision at or before the source (249-256) | Compare-and-set to the planned revision, planned revision at or before the source and the source at or before the plan's head | Per owner | New owner absent at the serial point | Stale sources, races, concurrent rounds with 2 and 4 writers on a hot set of six owners and shared new names, the stack's two write gateways |
   | Every new identity absent from history (262-273) | One range probe of the ordered block, else one seek per identity | Same | Same | Reused committed blocks (refused on both), reused refused blocks (committed on both), plain identities, one-byte and wide blocks, saves over 256 assertions |
   | The retraction finds the current row on its entity (278-297) | The row text read at plan time, covered by the revision compare-and-set | Same | Same | As the predecessor row above |
   | The journal already exists (202, 328-329) | Replan to the general writer | Same | Same | Reused blocks (the journal exists): replan, then the general writer's refusal |
   | Clock and position (191-227) | The same code | Same | Same | Every commit's position and record clock compared |

3. **Constraints (line of attack 2).** The gateway decides the writer from the request, and the SDK records its reads in
   the request: a read by type marks it scope-wide (`DatomicStorageAdapter.ts` 361-362), a read by entity adds the
   entity to `entities` (363-366, 377, 422). Every per-subject plan declines a scope-wide request and any request whose
   read set is not exactly the entities it writes (`read-only-entity`), so a constraint that read another entity takes
   the general writer, which checks that entity's revision. Attacked at the gateway with the scope-wide fault and extra
   read-only entities (1,235 saves declined `read-only-entity`, then taken by the general writer with equal outcomes). A constraint the SDK never read (stale definitions,
   a release between read and commit) is invisible to both writers alike.
4. **Identity blocks (line 3).** Collisions with a committed block, reuse after a refused attempt, blocks of one and of
   several owners, plain identities beside block identities, one-byte blocks next to wide ones, saves of more than 256
   assertions, and a different body under the same command, all equal on both writers (counts above). Tokens are
   random across processes and advance monotonically within one (`orderedSaveIdentity.ts`), and the ordered probe
   compares whole prefixes, so an identity of another length cannot match.
5. **Creation (line 4).** New owners named so they differ from an existing one only by case, by Unicode normal form
   (NFC against NFD), by a trailing space, in another account, without an account, or as a system entity; new owners
   created by a competing save between the plan and the commit; two writers creating the same new owner at once (six
   shared names per concurrent round); a new subject with one to four other owners of which some exist. Every outcome
   equal on both writers, and in the concurrent rounds every committed save was accepted again by the general writer at
   the same prior state. No writer on this branch retracts a public ID (only an excision could, and an excision of anything but a protected body turns the per-subject writers off, F8), so an entity that existed and had every fact retired is an existing owner.
6. **Several owners (line 5).** Owners of two accounts (declined), a system entity (declined), references between the
   save's own owners, facts of several owners interleaved in random order inside one block. All equal.
7. **Import (line 6).** F2 and F10. An import frame is one Datomic transaction, so a kill leaves it whole or absent; the
   stack's verifier found every committed save whole and positions contiguous in every run.
8. **Routing honesty (line 7).** `client.saveRoutes` counts `writer:per-subject` only when the answer names a
   per-subject function, which `verify-report` adds only to the native function's own report; a save that replanned or
   was declined is counted on the general writer. It counts events, not saves (a save over 128 facts is counted at send
   and again at its answer), which is a reporting detail. The card's check is F5.
9. **The PostgreSQL stack.** Six runs (`server` four times, `serial-hints` with narrow revision, reused predecessors,
   append retirement and hints, and `general` with every per-subject writer off): 8,743 saves sent, 2,373 committed; in every run positions were contiguous, every committed save (whichever writer took it) was accepted again by the general writer on a control in commit order with the same position and record clock, and the stored datoms (except under append retirement, where markers differ by design) and every read route of 80 owners were equal. Writer B was killed with SIGKILL after about 255 saves in each run; every save without a definite answer was resent by a fresh gateway and answered `OperationDuplicate` (it had committed, 6 in all) or `CasConflict` (it had not, 11). The only wrong answers were F1's two.
10. **Option off against the base.** `s4/idents.sh` on the base `23b7df344` and on this head: 53 of 58 stored-function
    identities and code hashes equal in all 9 settings, the one-owner function and the commit function among them; the
    5 that differ are F6, and none of them is installed with every option off. With the options off, the gateway's
    request handling and the SDK's request are unchanged by reading (`storage.clj`, `privacy.clj`, `erase.clj` and
    `DatomicStorageAdapter.ts` only act behind the options); the IMP2 builder's byte-identical log check was not
    repeated.

## 3. What was not tested

- **The SDK end to end.** `TriplesLive` over the Datomic adapter with `orderedSaves`, `severalOwners`, `creationSaves`
  and `saveSizeRule`, the replay loop, and the card's identity check (F5) were read, not run: the SDK is not built in
  this worktree, and building it needs a pnpm install. The gateway was driven with frames built as the SDK frames them
  (`s3/owners_gate.clj`'s shape, extended).
- **Constraint classification through the SDK** (a unique rule on a created attribute, a reference target created or
  retired concurrently, cardinality across owners, a release between read and commit, stale definitions): argued from
  the read tracking above, not run.
- **Value types.** The fuzzer wrote string, reference and number values (strings with Unicode, escapes, a NUL, line and
  paragraph separators and 700 characters). JSON, boolean, datetime and blob business values were not fuzzed.
- **Protected values on the several-owners and creation writers** (they decline them) and sealed scopes: protected
  scopes appear only in the targeted removal tests; the fuzzer's scopes are unprotected.
- **Group commit (`TX2_GROUP_COMMIT=1`), live priority and the write budget.** The per-subject writers are off under
  priority and budget; group commit was not combined with them.
- **Owner head (the covering writer)**, which the new options refuse to start beside.
- **Settlement frames**, which are not on this branch.
- **A transactor killed with SIGKILL.** The stack stopped it with SIGTERM; one writer gateway was killed with SIGKILL.
- **Two write gateways with different option sets** (F11 is argued).
- **Scale.** Toy sizes only; the cost of F2 and F7 at 1 billion records is argued, and F7 was not measured at all
  because the memory database keeps no excision datoms.
- **Rename of generated names (F6) by a running database**: shown on stored code, not by installing both versions.

## 4. Evidence and how to rerun

Evidence is in the private evidence store, folder `DX-S5-review/runs/` (one compressed archive per run, each with the
image ID, the source commit and the working-tree status, and `SHA256SUMS`). Every run mounted this branch's gateway sources read-only into one
pinned runtime image, `tx2-datomic:dx-s4-runtime`, ID `sha256:da58aea16b31779bdd3120396d052814222cc046b0a923e81ec4ebf72621796b`
(the S4 builder's runtime image, with the mounted sources first on the class path). No run had
a change outside `s5/`, so every run tested the gateway exactly as it is at `2d78680f7`.

| What | Command (one ordinary heavy token each, `DOCKER_HOST` set to the lab VM socket) | Runs |
| --- | --- | --- |
| Differential fuzzer | `S5_SEEDS=21 S5_STEPS=5000 S5_ROUNDS=4 S5_THREADS=4 S5_PER_THREAD=150 node lab/bin/heavy.mjs --label DX-S5-fuzz -- bash lab/experiments/EXP-DX1/s5/clj-run.sh OUT fuzz server` (settings `server`, `serial`, `hints`, `plainowner`, `prefetch`) | 13 complete runs (`batch2-server-21-22` seed 21, `batch3-*`, `batch4-*`); two more runs stopped on a harness assertion (a reused one-byte block on a save over 256 identities, fixed in `5d05a3391`) after more than 2,400 and more than 1,600 saves compared equal, and are not counted |
| Targeted attacks | `S5_REMOVALS=2000 node lab/bin/heavy.mjs --label DX-S5-attack -- bash lab/experiments/EXP-DX1/s5/clj-run.sh OUT attack 'readback import'` | `run4-attack` (also `run3-attack`, `smoke2-attack`) |
| PostgreSQL stack | `S5_STACK_PER_THREAD=300 node lab/bin/heavy.mjs --label DX-S5-stack -- bash lab/experiments/EXP-DX1/s5/stack.sh OUT server` (or `serial-hints`, `general`) | `stack1-server`, `stack2-server`, `stack2-general`, `stack3-serial-hints-1`, `stack3-server-2`, `stack3-server-3` |
| Stored-function identities | `bash lab/experiments/EXP-DX1/s4/idents.sh SRC OUT.jsonl` on the base tree, on this head (`DX_S4_CREATE_SETTINGS=1`) and on the base with only the S2 `subject_save.clj`, then `python3 -I lab/experiments/EXP-DX1/s3/compare-idents.py` | `idents/` |
| Totals | `python3 -I lab/experiments/EXP-DX1/s5/summarize.py RUN...` | |

Files: `s5/fuzz.clj` (generator, frames, comparison, stack writer, resend and verifier), `s5/attack_gate.clj` (the
targeted tests named in section 1), `s5/clj-run.sh`, `s5/stack.sh`, `s5/stack-run.sh`, `s5/summarize.py`.
