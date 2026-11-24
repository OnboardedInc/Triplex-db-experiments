# A removal in one account stops nothing in another: Publish, settlement, recorded notices and delivery carry their account (`TX2_ACCOUNT_TICKETS`)

Builder DX-ACT9, 2026-11-24, branch `exp/DX-ACT9-account-tickets`: `exp/DX-ACT8-publish-beside-saves` (`2e7ae66c4`) with
`exp/DX-ERA2-removal-per-account` (`6bc2484f0`, then its fix heads `a9da13f89` and `5114a74b0`) and
`exp/DX-IMP2-import-whole-subject` (`d4411c77b`) merged. All accounts
stay in one Datomic database. Mac work is correctness at toy size; every Mac time is diagnostic. Datomic is not modified.
Every option is default off; with `TX2_REMOVAL_PER_ACCOUNT` absent or off nothing here changes a byte.

Sections 1 to 7 are the design, written before the option's code. Results follow from section 8.

## 1. The problem

A derived write is a write whose content is computed from subjects' values: a settlement frame (stored changes), a
notice frame (recorded notices and the per-subject notice ledgers), a delivery (the recipient's received effects), and
a Publish (the release marker; for an owed Publish it computes nothing from subjects, see 2.1). Each carries a ticket,
the removal sequence at which its inputs were read, and every reader of a derived copy rechecks that sequence. Today
the ticket and every recheck are database-wide, and one database holds every account, so **one removal on request in
any account refuses every account's derived work and makes every account's earlier derived copies unreadable**: the
Publish branch's run `M3` (its page, section 9.4): a Publish of an uninvolved account refused, its settlement refused
("Recorded notices belong to an earlier removal sequence"), and reading the recorded notices of an account that took
no part refused ("Discard the old protected input cut"). That stays so until the release is published again; for the
recorded notices it stays so for good (the recorder's cursor keeps the old sequence).

The per-account removal rule (`TX2_REMOVAL_PER_ACCOUNT`, DX-ERA2) already guards saves per entity and lets a ticket name
the accounts it read; no caller named any. This work makes the callers name their account and narrows every recheck to
it, and it fixes what the rule left for the case the callers create: a delivery is a write into another database.

## 2. Every write and read that carries or checks a removal sequence today

Traced in the code of the merged head. "Inputs" are what the derived content is computed from.

| # | Where | What it carries or checks today | Its inputs | What the check protects against |
| --- | --- | --- | --- | --- |
| W1 | Publish, held account (`join/account.ts` `publish`: `readErasure` 802, plan recheck 970, `withErasure` 814) | ticket = the sequence read before planning; the marker stores it (`erasureSeq`) | the account's notice tail, release list, calendar, enrolment, definitions (R1 to R10 of the Publish page); **no subject value** (an owed Publish reads none: `stats.worlds === 0`) | the marker's sequence is where that release's settlement starts its own removal check (W3); nothing in the marker is computed from a subject |
| W1' | Publish, non-held store (stored, envelopes, staged modes) | the same | the account's subjects' worlds (it materializes their answers) | re-materializing a removed value into stored answers |
| W2 | Enrolment (`installHeld`) | **no ticket** | the held source's subject IDs (`placementId(0 .. n-1)`); no value | nothing: the census is IDs, and an ID is never a protected value (protected attributes take strings only, `ProtectedTypeUnsupported`; a reference is an ID). Under the per-account rule its commit is a plain save fenced on the entities it writes |
| W3 | Settlement value frame (`join/archive.ts` `turn` 265, `byteFrame`; the ticket through `bulk.ts` 68) | before: `recheckErasure(marker.erasureSeq)`; the frame's ticket = the current frontier, sent **as a cross-database ticket naming its own database** (`withDatomicErasureSequence(seq, invoke, false, database)`) | the census page's subjects' worlds at the marker's cut, read through the gateway (masked by every published removal) | a stored change computed from a value removed after the inputs were read |
| W4 | Notice frame (`join/recorded.ts` `turn` 156 to 178, `byteFrame`) | reads the frontier; refuses unless the cursor's `erasureSeq` equals the current sequence; stamps the packet and the cursor with it; the frame's ticket as W3 | the event's subjects' worlds (work items) and their notice ledgers (`recorded-ledger:<subject>`, the payloads last notified) | a recorded notice or ledger computed from a removed value, and a cursor whose ledgers were computed before a removal continuing after it |
| W5 | Delivery (`recorded.ts` `deliver` 383; `notify1/receiver.ts` `receiveOrdered` 20 to 90) | per packet: the frontier must equal the packet's stamp; the recipient's commit carries the packet's frontier as a ticket with `erasureSourceDatabase` = the source; the gateway takes the source database's lock and compares the source's published sequence (`main.clj` source branch) | the recorded packet | delivering (and storing in the recipient's effect records) a copy recorded before a removal |
| R1 | Every reader of a marker (`account.ts` `marker()` 675: settlement, the receipt, the notice selection) | `recheckErasure(marker.erasureSeq)` | — | settling or selecting from a release whose sequence predates a removal |
| R2 | Serving stored changes (`archive.ts` `stored` 422/452, `storedStream` 508, the count-mode `reader()` 607) | recheck of the marker's sequence | — | serving a stored change computed before a removal |
| R3 | Reading recorded notices (`recorded.ts` `orderedPackets` 368: `packets`, `streamPackets`, `deliver`) | recheck of each packet's stamp | — | serving a recorded notice computed before a removal |
| R4 | The held reader's answer cache (`read.ts` `LazyReader`, as `JoinedAccount.reader()` and `Archive.reader()` build it) | **nothing**: held readers are built with `protectedScope = false`, so a cached answer is keyed without any removal sequence | — | (unprotected) a pinned answer cached before a removal is served after it |
| S1 | Staging (`staging.ts`: stage records keep `erasureSeq`) | as W1' | | only the staged mode of a non-held store (a held account publishes `owed` only: `assert(!this.s.held \|\| storage === "owed")`) |
| D1 | The older notice dispatcher (`notify1/dispatcher.ts`) | its own guard document and the database-wide sequence | | non-held stores only (the held path is `RecordedNotices`) |
| M1 | The release marker's stored `erasureSeq` | a point in the one removal log | | — |

**Which accounts' removals can reach each one.** A removal touches entities; an entity under `acct/<a>/` belongs to
account `a`, every other entity to the unscoped account `""` (`removal_scope.clj` `bucket`). In the held layout:

1. **A held account's derived content is computed only from its own subjects' entities.** Every world a held account
   evaluates goes through `decision.ts` `heldWorlds`, which asserts that every row's entity and every reference value
   starts with the account's prefix ("Foreign account in a pinned world") and belongs to the requested subject
   ("Foreign subject in a pinned world"). A read that crossed accounts would stop the evaluation, not feed it.
2. Its other inputs (notice tail, events, ledgers, settlement documents, census pages, enrolment, calendar, release
   documents and definitions) live under names outside every `acct/` prefix, so a removal of a value on one of them
   moves the unscoped counter, which every per-account check includes.
3. **A release document copied into many accounts carries definitions, never subject values** (the Publish page, R9;
   definitions by reference are content-addressed and shared, and are unscoped entities).
4. **No rule reads another account.** The W0 kernel evaluates one subject's world (`S`); the deep releases map one
   subject's rows (`deep-activation.ts` `policyWorld` asserts `subjectOf(r.entityId) === i` for every row).

So a derived write or copy of account A can be affected only by removals that touched A's entities or unscoped
entities. **Per subject is exact too**: the content for subject Y is a function of Y's world only (1 and 4), so a
removal of subject X's value can change only X's derived content. And an entity under `acct/A/` that belongs to no
subject (no `pl:`, `wk:`, `i9:`, `sec:`, `ev:`, `doc:`, `evt:` number, for example the miniature's
`acct/<a>/act8-note-<k>`) is in no world at all.

## 3. The narrowest exact check for each, and the invariant at Datomic's commit point

| # | Narrowest exact check | Built under `TX2_ACCOUNT_TICKETS=1` |
| --- | --- | --- |
| W1 | the account (an owed Publish reads no subject value, so strictly none; the account is kept because the marker's sequence is where W3 starts) | `readErasure(comp, account)`; plan recheck with the account; ticket `withErasure(seq, work, undefined, [account])`; the marker keeps the global sequence |
| W1', S1, D1 | each non-held store is its own database (one account per database), so its database-wide check is already that account's | unchanged |
| W2 | none | unchanged |
| W3 | the subjects already stored for the release (a later subject is read again, masked, when its turn comes) | a frame goes on while no removal since the release's stamp touched the unscoped account or a subject below the release's progress; the frame's ticket names the account and, the destination being the same database, is no longer sent as a cross-database ticket |
| W4 | the account for the frame's ticket; the subjects with notice state for the cursor | the cursor may go on while no removal since its stamp touched the unscoped account, and every entity of A touched since it belongs to no subject or to a subject with no notice ledger; new frames are stamped with the current global sequence; the ticket names the account |
| W5 | the packet's subjects | the client check per packet's subjects (as R3); the recipient's commit carries a cross-database ticket naming the source account, checked by the gateway under the source's account locks (section 3.2) |
| R1 | nothing of an account (the marker holds no subject value); every caller checks what it derives | current while no removal since its stamp touched the unscoped account |
| R2 | the subjects served | stored changes are served while no removal after the release's stamp touched the unscoped account or one of the subjects served (the count-mode reader: the account) |
| R3 | the packet's subjects | served while no removal published after the packet's stamp touched the unscoped account or an entity of a subject among the packet's deliveries |
| R4 | the account | held readers key their cache on the account's removal state and check it before returning (section 3.3) |
| M1 | the global sequence | unchanged (a point in the one log; each account's check compares it with that account's counter) |

### 3.1 The invariant, at Datomic's commit point

For a ticket `(s, [A])` on a database moved per account, the gateway refuses the write unless, **inside the
transaction at Datomic's serial point**, the native removal counter of account A and of the unscoped account each equals
the value in the cut the gateway checked, and that value is at most `s` (DX-ERA2's `ensure-ticket!` and the fence
`:triplex.removal/fence-v1` with `[:account A n] [:account "" m]`, `storage.clj`). Counters move only inside a
removal's own native transaction, so this says: **no removal that touched A or the unscoped account has its native
commit between the ticket's sequence and the derived write's position**. It holds whatever the removal's publication
does: a removal committed natively but unpublished (its gateway killed, a slow commit, the log briefly unwritable) has
already moved the counter, and the fence refuses the write (409). This is the property the review's F1 found missing
for tickets that name no account; a ticket that names its account has it (the review: 907 of 907 refused after the
commit). Every ticket this option sends names its account.

The removal's own window before its native commit (the review's F1b: its intent written, its commit not yet) is closed
by DX-ERA2's fix (`a9da13f89`, merged here): **a removal's first native transaction declares it**, setting the global
declared sequence (`:triplex.scope/removal-intent`) and **the counters of every account its selectors can reach to the
negated sequence**, before it selects or records anything. From that transaction on the same fence refuses every
ticketed write that names one of those accounts, and the gateway answers 503 while that removal is pending. So the
invariant at the commit point reads: **a derived write with ticket `(s, [A])` commits only if no removal that can reach A
or the unscoped account has declared itself natively since `s`.** It depends on no publication: a declared, committed
or published removal has moved the counter in Datomic before the write's serial point. A derived write that commits
before the declaration is a write made before the removal; its copy is a copy made before the removal (section 5).

### 3.2 Delivery: a ticket into another database

A recipient is another database, so no fence at the recipient's serial point can see the source's counters. Today the
gateway holds the source database's lock while it checks the source's published sequence and commits into the
recipient, so every delivery of every account waits for, and is then refused by, every removal of the source. Under
`TX2_ACCOUNT_TICKETS=1` on the gateway, a cross-database ticket that names source accounts on a source moved per
account is checked instead under **the source's account locks of the named accounts and of the unscoped account**, held
from the check through the recipient's commit:

1. the source's cut (published, with a pending removal allowed as DX-ERA2's `request-cut` allows it);
2. refused (503) while the source has a pending removal whose accounts include a named account or the unscoped one;
3. refused (503) while a removal that can reach them has declared itself natively (a negated counter, written in its
   first transaction, under the same locks);
4. refused (409) unless the ticket is current for the named accounts and the unscoped one in the published cut, **and
   the source's native counters of those accounts are at most the ticket's sequence** (read from the source's current
   database value under the locks).

Every removal takes the locks of the accounts its selectors can reach before its native commit and keeps them until
it ends (`with-bucket-guards` around the whole removal, its declaration included), so between this check and the
recipient's commit no removal touching those accounts can declare or commit natively; one that already declared,
committed or stopped after either is seen in steps 2 to 4. Without the option, or for a ticket naming no account, the source's database
lock and the database-wide check, as today.

### 3.3 The held reader's cache

A held reader's answer cache keys on the subject, the basis and the release, not on any removal sequence; a pinned
answer cached before a removal is served after it. This is so today with every option off. Under the option the held
reader of a protected database keys its cache on the account's removal state (the account's and the unscoped
counters) and checks it again before it returns, which is today's protected-scope rule (`protectedScope`, used only by
the removal regression) narrowed to the account. With the option off the held reader is unchanged.

## 4. Recorded notices: what a notice contains, and what a removal does to recorded ones

**What the notice writer stores** (`recorded.ts`, `W0.publish` in `packages/w0/src/outbox.ts`): per frame one packet
`{account, epoch, batch, previous, event, position, recipe, start, through, deliveries[], erasureSeq}` and, per subject
whose items changed, its ledger `recorded-ledger:<subject>` (the subject's `ItemState[]`: `{id, payload, retired, seq,
subject}`), and the cursor `notice-progress`. A delivery is `{id, key, kind, payload, rule, seq, subject, version}`:
`id` is a hash of `{key, kind, rule, subject}`, `version` a hash of `{inputs, payload, release}`, and **`payload` is
the rule's output as canonical JSON, computed from that one subject's world**.

**Can a notice carry a protected value, or a value derived from one? Yes, whenever a release's rules read a protected
attribute.** Protected attributes are string attributes the database declares; nothing stops a release from reading
one. The W0 kernel copies subject values into payloads verbatim: `notify.pay-below-minimum` carries
`{"floorCents", "payRateCents"}`, `notify.pay-change-approval` the baseline and the new pay rate,
`notify.document-expired` `{"docType", "expiresOn"}`, `everify.submit-case` `{"startDate"}`, `notify.form-owed` a
due date computed from the start date; and the kind and the existence of a notice can follow from a protected value
(W0's SSN rules read `ssn`: whether a subject gets an `everify.submit-case` notice follows from whether its SSN is
present and nine digits). In the deep profile the pay rate is stored as a string (`:person/custom-pay-cents`), so it can be
declared protected, and a subject paid below the floor then has its protected value inside a recorded notice and its
ledger. The toys' protected attribute (`:person/note`) is read by no rule, so no toy notice so far could carry one.

**What a removal must do to already-recorded notices of the removed subject: refuse to serve them.** Rewriting is not
possible for a packet already delivered (the recipient has it) and would break the packet chain (each packet carries
the hash of the one before it, and the recipient checks the chain); a mark would have to be written into an immutable,
chained packet. So the rule is the one the code has today, narrowed: a recorded packet stamped `s` is served (read,
streamed or delivered) only while no removal published after `s` touched the unscoped account or an entity of a subject
among the packet's deliveries; the recorder goes on after a removal only while no subject touched since its cursor's
stamp has a notice ledger. Value settlement follows the same rule: a release's frames go on while no subject touched
since its stamp is among those already stored (section 3, W3). A packet that holds the removed subject's notice is therefore never served again, and a
stream that holds one stops at it: the stream is built on that notice, and nothing short of re-recording it can take it
out (follow-up 1).

**Why notices of other subjects and other accounts are unaffected.** A packet's deliveries come from
`W0.publish(ledger(Y), workItems(Y))` for each subject Y in it; `workItems(Y)` is `notices.work(e, [Y], position)`,
evaluated over Y's world only (section 2, items 1 and 4), and `ledger(Y)` is Y's own earlier payloads. So a delivery
for Y, Y's ledger, and a packet without X's deliveries contain nothing computed from X's values; a packet of account B
contains only B's subjects (`p.account === source.db.prefix` is asserted on read). A removal of X's value in A changes
none of their bytes and none of what they would be if recomputed.

**What stays (section 5):** a notice recorded before the removal is not removed; it is refused.

## 5. Copies made before a removal (unchanged, and the limit of removal on request today)

A derived copy that committed before a removal (a packet, a ledger, a stored change, a recipient's effect record) is a
document of the account's settlement, not a protected attribute: its value is stored in clear, its own journal entry
holds it in clear (the review's F5), and the feed and the journal pages return it. Removal on request reaches protected
attributes by assertion identity; it does not reach derived documents. Today and under this option such a copy is
**refused when served through the store's derived-copy paths** (R1 to R3, W5) and **readable through the journal, the
feed and a raw read of the document**. This work does not change which copies exist or where they are readable; it
changes only which accounts' removals make them unservable. TARGETS section 7.3 requires the removal to reach every
copy of a protected value or anything derived from it; for a release whose rules read a protected attribute that is not
met today, with or without this option (follow-up 2).

## 6. Where the database-wide check is kept, and why

| Path | Why database-wide stays |
| --- | --- |
| Non-held stores (W1', S1, D1, `notify1/archive.ts`, `relay.ts`, `copy-plan.ts`) | each is its own database holding one account: its database-wide check is already that account's |
| A held account on a database not moved per account, or a gateway or client without `TX2_REMOVAL_PER_ACCOUNT` | the counters do not exist; the helpers fall back (`recheckErasure` narrows only when the frontier says `perAccount`) |
| A cross-database ticket that names no account | today's source lock and published-sequence check |
| The removal's own selection check (DX-ERA2's P9, or the per-subject check) | it retries the removal; it refuses no one else |
| The SDK's Reach reply cache (DX-ERA2's P8) | keyed by the global sequence: a removal anywhere re-sends rows, never refuses or answers wrong |
| The unscoped account inside every per-account check | settlement documents, definitions and system names are unscoped; a removal of a value on one of them can reach any account's inputs |
| The marker's stored sequence | it is a point in the one ordered log |

## 7. The option

| Option | Default | With it |
| --- | --- | --- |
| `TX2_ACCOUNT_TICKETS=1` (client) | off | effective only with `TX2_REMOVAL_PER_ACCOUNT=1` in the same process and a held account (namespaced, `acct/<account>/`): W1, W3 to W5 and R1 to R4 as section 3. Otherwise ignored. |
| `TX2_ACCOUNT_TICKETS=1` (gateway) | off | effective only with `TX2_REMOVAL_PER_ACCOUNT=1`: the cross-database ticket naming source accounts (3.2) and the frontier's `touched` field (`?account=A&since=s`: the entities of A whose removal counter is above `s`, sorted, at most 1,024, with `touchedComplete`). Otherwise the routes answer byte for byte as before. |

With either piece absent the wire bytes, the stored records and every check are the Publish branch's.

## 8. Predictions (written 2026-11-24 18:50 local, before any cell, stack case or server run)

**The Mac cells** (`act9/cells.sh`, the many-accounts miniature on its own toy stack; ten shape: ten publishing accounts
A to J, A removes, two accounts enrol during the cell, saves beside; each account's rounds are Publish (three tries),
settle (three tries), deliver, read the recorded notices; each removal saves a protected value on a fresh entity of A
that belongs to no subject, then removes it; 30 s):

| Arm | Rate | Other accounts (B to J) | Account A |
| --- | --- | --- | --- |
| before (the per-account rule; tickets without accounts) | 1/s, 10/s | **settle, deliver and read refused in nearly every round after the first removal** (the marker's and the packets' stamps are behind the database-wide sequence; the recorder's cursor refuses for good); Publish tries refused when a removal declares between the plan's read and the commit (some at 1/s, most at 10/s) | the same |
| after (`TX2_ACCOUNT_TICKETS=1`) | 1/s, 10/s | **0 refusals of every kind** | refusals only where one of A's removals declares or commits between a ticket's read and its write (Publish, frames, deliveries), each retried; reads 0 (the removed entities belong to no subject); every round that settles is exact |

Many shape (50 accounts publishing at once, one round each, removals in a 51st thin account): before, settlement,
delivery and reading refused in nearly all 50; after, 0. Exactness (every account whose rounds all settled, checked
against the oracle, notices delivered once) in every cell. Shown wrong if: after, any refusal in another account; before,
fewer than half of the other accounts' rounds after the first removal refused (the cell would not reproduce the fault).

**The server run** (`act9/server.sh`, never on the Mac): a byte copy of the sealed 1 billion database per arm, the
protected field added at the copy's head, the database moved per account; 200 accounts publishing (Publish, settle,
deliver, read, round after round), 1,000 thin accounts saving, ten enrolling; removals on request in one deep account
at 0.2 per second (120 in 600 s) and 10 per second (6,000 in 600 s).

| Arm | Rate | The 200 other accounts | The removing deep account |
| --- | --- | --- | --- |
| before | 0.2/s | settle, deliver and read refused in at least 90% of rounds after the first removal; Publish refused on at most a few percent of tries | the same |
| before | 10/s | settle, deliver and read refused in more than 99% of rounds; Publish refused on most tries, with rounds left unsettled after three | the same |
| after | 0.2/s | 0 of every kind | a few Publish and frame tries refused by its own removals, every round completes |
| after | 10/s | 0 of every kind | Publish and frames refused on many tries (its counter moves every 100 ms); some rounds left unsettled; removal p50 within 20% of the before arm |

Shown wrong if: after, any refusal in the 200 accounts; any exactness check fails; or the thin accounts' save p99 under
removals moves by more than the quiet bar (1.25x or 50 ms) between the arms.

<!-- RESULTS -->
