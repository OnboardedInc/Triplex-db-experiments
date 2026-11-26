# W0-1.2 amendment: removed values (the owner's ruling of 2026-11-25)

**The ruling, verbatim:** "I think we should keep the expired document notice as opposed to withdrawing it."

**What it reverses.** The first B4 fix (`decision.ts` `withoutRemoved`, DX-ERA5's first review) dropped a removed document
value from the world, so it counted as absent (⊥): DOCEXP then took row 3 (`doc.expiry-missing`) and the
expired-document notice was withdrawn; in the deep format the world builder refused a world without the row and stopped
the account (third review T1).

**What it is now.** A removed value is a state of its own: present, unreadable, neither a value nor ⊥. A rule that reads
one is *held* for that key: the expired-document notice the subject had at its last recording before the removal stays
(delivered again in its new generation, the removed value as its marker), and nothing else is produced for that
document: no task and no obligation, since their due times are computed from the removed date. The removed value is
not read, needed or revealed, and neither the frame nor the account stops. So "its outcome stays what it was at the
removal" holds for the notice, the outcome the owner named; the document's task (`doc.reverify`) is not kept, because
keeping it would keep its due date, a value computed from the removed one.

This page is the exact text for `lab/world/W0/SPEC.md` and for the independent oracle's specification
(`lab/oracles/domain/README.md`). `SPEC.md` itself is not edited on this branch: it is pinned by checksum
(`lab/world/W0/SHA256SUMS`) and by the acceptance contract, and the amendment is opt-in, so every W0-1.1.2 case and output
stays byte for byte. Both the TS kernel (`packages/w0`) and the oracle (`lab/oracles/domain/w0.py`) implement it.

## The text for SPEC.md

**Section 2.1 (new): removed values.** An `erased` marker `{"erasedAt": <instant>}` is a valid value of an attribute marked
PII (section 2, unchanged), and also of an attribute the request names in `removable`. On such an attribute it is a
**removed value**: the fact is present (its `e`, `a` and `tx` stay), its value cannot be read. `removable` may name only the
document attributes `docType`, `expiresOn` and `reverified` (the only non-PII attributes a protection policy may cover in
W0: every one is read by DOCEXP alone). A removed value is never compared, ordered, parsed or copied into an output.

**Section 4.3: `evaluate` and `reconcile` inputs.** Each may carry two optional keys:

- `removable`: an array of attribute names (2.1);
- `kept`: an array of work item ids (`wi:` and 64 lowercase hex digits, section 8.4): the work items the subject held at its
  last recording before a removal, as kept by the writer (see "What the writer keeps").

Absent, the operation is W0-1.1.2's exactly. Any other key is still `W0.E_SHAPE`, and a `removable` or `kept` that is not an
array of strings is `W0.E_SHAPE`.

**Section 4.4, step 2.1 (new, after the basis, before the world):** `W0.E_VALUE` if `removable` names an attribute other than
`docType`, `expiresOn` or `reverified`, or `kept` holds a string that is not `wi:` and 64 lowercase hex digits.

**Section 4.4, step 3.2:** an erased marker on an attribute that is neither PII nor named in `removable` stays `W0.E_VALUE`
(cases C64, C88).

**Section 7.0 (new): held items.** A keyed rule's item whose input facts include a removed value is **held**: the rule's
table is not applied to it. Its trace entry has the item's key, row `0` and the item's inputs as usual (the `tx` of each
input fact, the removed ones included). A held item produces no task, no obligation and no flag. It produces its rule's
work item only when that work item's id is in `kept`, and then with the payload its row would carry, each removed value
written as its marker. Only DOCEXP reads removable attributes, so only DOCEXP items can be held.

**Section 7.7, DOCEXP, a new first row:**

| Row | Condition | Outputs |
| --- | --- | --- |
| 0 | `d.docType`, `d.expiresOn` or `d.reverified` is a removed value (7.0) | none; work item `notify.document-expired` key d when its id is in `kept`, payload `{"docType": d.docType, "expiresOn": d.expiresOn}` with each removed value as its marker |

Rows 1 to 6 are unchanged and apply only to items that are not held. A document with no documents' row stays row 0 with key
`""` (unchanged); a held document is row 0 with its own key.

**Sections 8.8 and 8.9 (`publish`, `receive`): unchanged.** A kept work item is an ordinary work item: `publish` compares its
payload with the item state as before, so a held notice whose payload now carries a marker is published once more (the
recipient learns the value was removed); an unchanged one is not.

## What a later release does with a subject whose value is removed

The removed value stays removed in every later world (removal is final). Every later evaluation, whatever the release,
holds that document: its trace is row 0, it yields no task or obligation (a removed date has no due time), and the
expired-document notice is there exactly when the subject held it at its last recording before the removal. A release
that changes DOCEXP's parameters (R2's lead days for `ead`) does not change a held document's outcome. Nothing new can
arise for that document; documents of the subject whose values are present are evaluated as before.

## What the writer keeps (the lab's writers, under `TX2_DERIVED_SEAL`)

1. **Worlds keep the marker.** A removed protected value is read from the store as the marker; the W0 world (`worldOf`) and
   the deep world (`deep-activation.ts` `policyWorld`) carry it as the fact's value (before: dropped).
2. **Every evaluation names `removable`** (`derived-seal.ts` `evaluateOptions`): the settlement's comparisons
   (`material.ts`), the notice evaluation (`notify1/journal.ts`) and the live reads (`decision.ts`). With no removed value in
   a world the answers are W0-1.1.2's.
3. **The notice recorder keeps each subject's held notices** (`recorded.ts`, document `recorded-kept:<subject>`): the ids of
   the subject's expired-document notices as recorded, sorted, written with the subject's ledger when they change, in clear.
   A removal makes every sealed record of the subject unreadable (the gateway seals each under all the subject's protected
   values), so this set is what survives it; the next evaluation passes it as `kept`. The setting's check accepts this kind
   only in its exact form: an array of at most 1,024 distinct sorted strings, each `wi:` and 64 lowercase hex digits.
4. **The settlement needs no kept set.** It stores the difference between two releases' outputs on the same world; a held
   document gives the same row 0 output on both sides, so it is never a difference.

**What is revealed.** Neither the removed value nor anything computed from it beyond the outcome the owner chose to keep:
the kept notice ids say which documents of a subject had an expired-document notice owed (an id is a hash of the subject,
the rule, the kind and the document's key; it holds no date), and this is readable without any key, before and after the
removal. The kept notice's delivery carries the marker, not the date.

**Not covered.** A notice the subject would have been owed but that was not yet recorded when the value was removed (the
date passed between the last recording and the removal) is not created afterwards: the outcome kept is the one last
recorded. The live read path (`decision.ts`) evaluates with `removable` but without the kept set (the set is in the notice
archive), so a live read of a held document shows no work item; the notice stream keeps it.

## The oracle's specification (`lab/oracles/domain/README.md`)

The same amendment, in the oracle's terms: `evaluate` and `reconcile` accept `removable` and `kept` (SPEC 4.3 as above), step
2.1 is `check_options`, `check_value` accepts a marker on a removable attribute, and DOCEXP's row 0 is implemented from the
text above alone. Without the options the oracle's outputs are unchanged (133 of 136 golden cases byte-identical, the same
three byte-level cases failing as before the change: C91, C92, C128, whose case files have no `input`).

## Evidence

| Test | Result |
| --- | --- |
| `packages/w0` vitest (golden cases and unit tests) after the change | 174 of 174 passed |
| oracle `cli.py cases` before and after | 133 of 136 byte-identical both times, the same three failing |
| `era4/removed-oracle.ts` (kernel against oracle, R1 and R2, 12 worlds each) | 24 of 24 byte-identical; see the table below |
| `era4/removed-kept.ts` (deep format, in process, `b3d45a0fd`, `evidence/DX-ERA4/v8/removed-kept-6`) | 7 of 7 checks: both settlements and both recordings complete; subject 0's expired-document notice delivered again in its new generation with `"expiresOn":{"erasedAt":...}` as the payload's date; subject 1 (not expired at the removal) gets none; subject 2 (untouched) keeps generation 0 and gets none again; no delivery of the second release names a removed date. On a stack: section 15 of `DERIVED-COPIES.md` |

`removed-oracle.ts` worlds (one subject, document a expired at the valid time, document b not):

| World | Options | DOCEXP rows (a, b) | Tasks | Expired-document notice |
| --- | --- | --- | --- | --- |
| nothing removed | none | 6, 4 | `doc.reverify` a | a, with its date |
| nothing removed | `removable` | 6, 4 | the same | the same (W0-1.1.2's answer) |
| a's expiry removed | none | `W0.E_VALUE` (W0-1.1.2) | | |
| a's expiry removed | `removable`, `kept` = a's notice | 0, 4 | none | a, expiry as its marker |
| a's expiry removed | `removable`, nothing kept | 0, 4 | none | none |
| a's type removed | `removable`, kept | 0, 4 | none | a, type as its marker |
| a's type and expiry removed | `removable`, kept | 0, 4 | none | a, both markers |
| b's expiry removed (not expired) | `removable` | 6, 0 | `doc.reverify` a | a, with its date |
| both removed, a kept | `removable`, kept | 0, 0 | none | a, expiry as its marker |
| `removable` names `payRateCents` | | `W0.E_VALUE` | | |
| `kept` holds a malformed id | | `W0.E_VALUE` | | |
| a removed `payRateCents` | `removable` | `W0.E_VALUE` (not a removable attribute) | | |

The same under R2 (DOCEXP's `ead` lead 90): the held rows and notices do not change.
