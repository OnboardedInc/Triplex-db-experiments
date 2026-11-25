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
is older than this line. How sure: certain. It happened once in 1,460 saves on the stack by timing (operation
`fz1001-100108507`, taken by the creation writer), and every time in an in-process test that makes the transactor
unavailable after it applied the save, on the one-owner, creation and general writers alike.

**In the per-subject writers themselves, no save stored anything the general writer would not have stored. How sure:
high for what was tried, which is not proof.** TODO_TOTALS

**The three most serious findings**

1. **F1 (break, every writer): a committed save is answered as refused when the transactor goes away before its
   acknowledgement.**
   - Stack (`s5/stack.sh`, evidence `stack1-server`): writer gateway A had handed the save to the transactor when the
     transactor was stopped. The answer was `400 TransactionRejected`; the verifier then found the operation
     `committed` at its position, contiguous with the rest. In each of three stack runs 691 to 720 further saves were
     answered `400 TransactionRejected` "Transactor not available" while the peer reconnected, 720 of 1,456 on the
     general writer alone (`stack2-general`).
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
   `commit!`'s catch, answer `503 OutcomeUnknown` for a transport anomaly (`:cognitect.anomalies/unavailable`,
   `interrupted`, `busy`, the message "Transactor not available") and for any exception raised after the transaction
   was handed to `d/transact-async`. Keep 400 for refusals the gateway or the transaction function decided.
2. **Fix F2 before the import bound is counted for priority 6.** Price `(count entities)`, `(count live)` and
   `(count command-ids)` as lookups in `import_bound.clj` `estimate-us`, or refuse an import frame whose read set is
   larger than the entities it writes. No stored function changes.
3. **Decide F3.** One refusal code on both writers for a save racing a removal, and a measured control in place of the
   S4 gate's constant. Mapping the per-subject refusal in the gateway (it carries `{:triplex.subject/stale true}`) avoids
   changing any stored function.

## 1. Findings

| # | Severity | Finding | Evidence | Proposed fix |
| --- | --- | --- | --- | --- |
| F1 | **High (break; every writer; older than the line)** | A save the transactor committed is answered `400 TransactionRejected` when the transactor becomes unavailable before the acknowledgement; the SDK treats it as final and never looks it up. Hundreds of saves per restart get the same final answer while the peer reconnects | Stack `stack1-server` (1 committed save of 1,460 answered 400), `stack2-server` and `stack2-general` (695 and 720 answers "Transactor not available"); `transactor-unavailable-after-apply` 3 of 3 writers. `storage.clj` 627-645, `DatomicStorageAdapter.ts` 658-684 | 503 `OutcomeUnknown` for transport anomalies and for any failure after submit |
| F2 | **Medium** | The import bound prices operations and bytes but not lookups: a frame's read set (`entities`) and predecessors (`live`) cost the writer one index lookup each. Frames admitted under 40,000 µs held the toy's writer 85 to 174 ms; honest frames run at 0.05 to 0.11 of their estimate | `import-bound-estimate-against-apply`, 3 runs (table above). `import_bound.clj` 9-11, `write_policy.clj` 14-17, `commit.clj` 230-256 | Count `entities`, `live` and claims in `estimate-us`, or cap an import frame's read set at the entities it writes |
| F3 | **Medium-low (different answers, same records)** | A save racing a removal on request (or the first save racing a protection declaration) is refused `CasConflict` by every per-subject writer and `ErasureFrontierChanged` by the general writer; the SDK replays one and fails the other. The S4 gate's control for this case is a constant, the S3 gate has none | `save-racing-a-removal` 3 of 3 kinds, `first-save-racing-protection`. `subject_save.clj` 108-117, `commit.clj` 187-190, `s4/create_gate.clj` 197-199 | One code on both writers (map the per-subject stale refusal in the gateway), and a measured control |
| F4 | Low (a save refused whatever its frame) | With `TX2_SUBJECT_CREATE=1`, a creation that writes a family a removal named before the entity existed is refused `ErasureReplayDeclined` even when it is framed after the removal. The same value written onto an existing entity after its own removal commits, and the same creation split into two saves commits (the entity first, then the value). The code's own docstring says such a creation "was framed before the removal"; nothing checks that, although each removal entry already records its position | `removed-family-after-removal`: option on `[409 ErasureReplayDeclined]`, without the value `[200]`, then the value `[200]`; existing entity `[200]`; option off `[200]`. `subject_create.clj` 69-75 (its docstring at 70-72 states the framing assumption), `privacy.clj` 270-276, `import_bound.clj` 25-32, `erase.clj` 130-136 | Keep each family's removal position (the entry has it) and refuse only frames whose source predates it, or state the rule on the page |
| F5 | Low (the card) | With the wide writer, several owners or creations on, `checkSavedIdentity` checks a per-subject function's name only when a save names one; a run in which every eligible save went to the general writer passes. The card reports the split (`writerPath`) but no gate asserts it | `v01/adopted.ts` 120-128 (read, not run: the SDK is not built in this worktree) | Assert the per-subject share the arm's tape predicts, as `real2/aged-gate` does for "at least one" |
| F6 | Low (known; cause now pinned) | The S2 change to `subject_save.clj`'s plan (349-358, inside the plan function, not stored code) is enough on its own to change the stored code and identities of the covering writer (`owner-layout`, installed only with `TX2_SUBJECT_OWNER_HEAD=1`) and the general hint function (`general-prefetch`, only with `TX2_GENERAL_PREFETCH=1`). The likely mechanism is the generated-name counter: the edited `and` has one term fewer, so one generated name fewer, and every namespace loaded after `subject-save` embeds shifted names in its quoted code (the comment at `privacy.clj` 272-274 guards against exactly this). The S4 page's finding 3 saw the 5 values; this pins the cause. With every option off none of the 5 is installed | `s4/idents.sh`: base `23b7df344` against head, 53 of 58 values equal in all 9 settings, 5 differ; base plus only the S2 file gives the same 5 new values (`runs/idents/compare-base-plus-s2.txt`) | Keep generated names out of stored code (no `x#` or `and`-expanded forms in quoted code), or hash the code after renaming generated symbols |
| F7 | Low (performance; older than the line) | Every per-subject commit scans every excision entity in the database at the serial point (`changes-application-rows?`, `subject_save.clj` 35-40, in the body at 116), so its cost grows with the number of removals ever made, in one database for all accounts | Read from code; not measured, because the memory database keeps no excision datoms (0 after 2,000 removals in `excision-scan-on-every-fast-commit`) | Keep a counter or a flag of non-body excisions on the scope and read that one datom |
| F8 | Information | One excision of anything other than a protected body, anywhere in the database, turns every per-subject writer off for every account for good (the same check returns true from then on) | `subject_save.clj` 35-40, 116, 319 | As F7; state it in the operations notes |
| F9 | Information | `one-account?` (`subject_owners.clj` 61-64) counts owners without an `acct/` prefix as one account; `group/classify` (`group.clj` 113-114) reads their stored account. A save writing two such owners of two stored accounts takes a per-subject writer. The general writer has no account rule, so stored records are equal | Read from code | Use the same rule as `classify`, or decline owners without the prefix |
| F10 | Information (the IMP2 page) | With `TX2_SUBJECT_CREATE=1`, an import frame of one to four new subjects with one claim and a source takes the creation function; the IMP2 page (section 2) says import frames "never reach the per-subject writer". Records are equal; the page is out of date | `import-bound-estimate-against-apply`: the honest frames were taken by `:triplex.subject/create-f9690a21…` | Correct the IMP2 page |
| F11 | Information (rollout) | A removal handled by a gateway without the creation option records no families; a creation of that entity through a gateway with the option then brings the removed value back. Mixed fleets during rollout only | Read from code (`subject_create.clj` 67, `erase.clj` 127-136) | Turn the option on everywhere before relying on the rule, as the S4 page already says for "option off" |

## 2. What was attacked and did not break

TODO_ATTACKED

## 3. What was not tested

TODO_NOT_TESTED

## 4. Evidence and how to rerun

TODO_EVIDENCE
