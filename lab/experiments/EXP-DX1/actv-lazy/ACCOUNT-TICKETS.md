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

## 9. Merges, and the stored-function identities with every option off

| Merge | Conflicts and how each was resolved (both sides kept every time) |
| --- | --- |
| `exp/DX-ERA2-removal-per-account` `6bc2484f0` (`dfa095cf9`) | none; no file changed on both sides |
| `exp/DX-IMP2-import-whole-subject` `d4411c77b` (`26420c297`) | `ha1/local.ts`: the holder rules of ACT5, ACT6, ACT8 and IMP2's `snapshotWhole`, all in the one assert; `main.clj`: the frontier keeps ERA2's per-account fields and adds IMP2's removed families (each under its own option); `privacy.clj` `apply-entry`: IMP2's families, then ERA2's per-account counters |
| ERA2's fix head `a9da13f89` (`ddeb986d3`) | `up.sh`: both blocks; `erase.clj`: the fix's F3 refusal goes into the base removal here and into `removal_erase.clj` (where ERA2's removal code lives on this branch), its restore rebuild through privacy's hooks; `privacy.clj`: the prepared removal's entry kept in the cut, written with nested `when`/`if`; `ensure-ticket!` (with the fix's wait) lives in `removal_scope.clj`; `removal_scope.clj`, `storage.clj`, `removal_commit.clj` as they came, `removal_commit.clj`'s references pointed at `removal_erase.clj` |
| ERA2's head `5114a74b0` (`adcbc8253`) | `privacy.clj`: ERA2 changed `ensure-ticket!` there; on this branch it lives in `removal_scope.clj`, which takes the change (`pending-touches?` resolved from `removal_commit.clj` on a database guarded per account); `main.clj`'s cross-database check resolves it the same way |

**Identities (`act9/idents.sh`, the several-owners builder's method: every stored function's identity under seven writer
settings, on one pinned runtime image by ID, compared with the base `2e7ae66c4`).** At the start, after the first two
merges: **17 of 58 moved** in every setting (commit, subject-save, owner-layout, packed-journal, predecessor,
general-prefetch). Cause: ERA2's new code in `removal_scope.clj`, `privacy.clj` and `erase.clj` loaded before those
namespaces, and its new functions renumbered the generated names inside their stored texts; a database opened by the
base would then install its writer functions again. Fix (`a0baaaed1`): `removal_scope.clj` loads after every stored
function text; the early files reach it through plain values in `privacy.clj` filled when it loads; ERA2's removal code
moves verbatim to `removal_erase.clj`; every changed early line uses only `if`, `when` and `let`. ERA2 found the same
fault on its own branch later and fixed it by moving two functions into `removal_commit.clj` (`f2bf6b690`); both fixes
now hold together. The two keys new to the merged tree (`removal-scope/fence-code`, `fence-ident`) are installed only
when a database is moved per account.

**At the end** (`adcbc8253`, the last gateway change; `act9/idents.sh` on runtime image `sha256:a87bf58bf20c`): **58 of
58 equal to the base in all seven settings** (base, server, server-wide, server-wide-hints, serial-retire, owner-head,
and every option on, `TX2_ACCOUNT_TICKETS=1` included). Evidence: `evidence/DX-ACT9/idents/compare-merged-era2-adcbc8253.txt`.

<!-- IDENTS-FINAL -->

## 10. Results: what a removal in one account stopped in other accounts, before and after

Mac, toy size, diagnostic times; every count below is from the run named. Private image `sha256:8924e7252497`
(receipt `agents/DX-ACT9/image-adcbc8253.json`, its Datomic sources equal to the branch head's, `srccheck` before each
stack run); in-process runs on runtime image `sha256:21a67288007d` with the head's gateway source copied in. Evidence:
`evidence/DX-ACT9/runs/` (the owner's project folder, not the repository).

### 10.1 The many-accounts miniature (gates b, c, d, g)

`act9/cells.sh`: ten publishing accounts, the first (A) removes, each removal on a fresh entity of A that belongs to no
subject; 30 s (ten shape) or 50 accounts, one round each, removals in a 51st account doing nothing else, 60 s (many).
"Refused" counts every refused try (Publish and settle are tried up to three times a round).

| Cell | Removals done (p50, p99 ms) | Other accounts: Publish / settle / deliver / read refused | Other accounts' rounds complete | A refused | Exactness |
| --- | --- | --- | --- | --- | --- |
| before, 1/s, ten | 11 (1,461, 8,187) | **98 / 93 / 31 / 31** | **0 of 50** | 11 / 9 / 3 / 3 | no account had every round settled, none checked |
| before, 10/s, ten | 238 (58, 975) | **1,286 / 21 / 7 / 7** | **0 of 433** | 133 / 3 / 1 / 1 | none checked |
| after, 10/s, ten | 16 of 17 offered (692, 5,825; one 503) | **0 / 0 / 0 / 0** | **38 of 38** | 0 / 0 / 0 / 0 (1 round, complete) | 10 of 10 accounts exact; 0 notices delivered late, 0 twice |
| before, 1/s, many (50) | 61 (83, 1,322) | **141 / 24 / 8 / 8** (42 of 50 accounts' Publish refused all three tries) | **0 of 50** | (does nothing else) | none checked |
| after, 1/s, many (50) | 61 (55, 5,411) | **0 / 0 / 0 / 0** | **50 of 50** | — | 50 of 50 exact; 0 late, 0 twice |
| after, 1/s, ten | <!-- B2-AFTER1 --> | | | | |

Every refusal in the before cells is `ErasureFrontierChanged` ("Discard the old protected input cut", "Recorded notices
belong to an earlier removal sequence"). The miniature's own end checks (every subject's root and form at the final
head against the oracle, every account) passed in every cell that finished.

**The after arm's removal rate.** Removals in one database run one at a time, and under the option a removal of A also
waits for A's own derived writes in flight (they hold A's lock from their check through their commit); the after cells
also carry nine accounts' completed rounds, where the before cells carry almost none. So at "10/s" the after cell did
17 removals in 30 s against the before cell's 238. Its claim "0 refused elsewhere" rests on 17 removals, the in-process
gate (10.2) and the many cell (61 removals). Removal on request in A was never refused by the option.

**Enrolment beside removals is broken in both arms (found, not fixed).** Every cell enrolled two more accounts during
the removals; all twelve enrolments failed, in both arms: `ReadError: Datomic read failed (Schema validation failed)`,
one `677 !== 676`, and in the before arm one `ErasureFrontierChanged` at its first Publish. The held enrolment walks
every commit between its first and last write (`join/account.ts`, the `beside` walk) and stops on a removal's
transaction in that window (its journal decode, or the walk's position check). Enrolment carries no removal ticket
(section 2, W2), so this option does not touch it; it predates this branch's code (DX-ACT8's walk meeting DX-ERA2's
removals) and is listed under not verified.

### 10.2 Gate (e) in process: removal completeness, 1,000 schedules per arm

`act9/tickets.clj` (loaded after DX-ERA2's gate and the review's `era3/attack.clj`, whose hooks stop a removal at any
step). Each schedule: subject X of account A and Y of account B seeded with protected values; eight derived writes
(settlement frame, notice frame, Publish marker, delivery into a recipient database; for A and for B) copy their
subject's value under a ticket read before the removal of X, each sent at a random point (before, at the same moment,
after its intent, inside its commit, after its guard, after its native commit, after its first answer, after its
resume); the removal stopped at a random step (none, **its intent written but not committed**, **committed but not
published**, at its publication, after its guard) and resumed. Block checks after every 50 schedules: no copy of a
removed value in any journal page (the readable form), feed entry or native datom, source or recipient, except X's own
removed assertion and the copies that landed before the removal's position.

| Run | Oracles | Violations | B's derived writes committed | A's derived writes sent at or after the removal's intent | Copies made before a removal (source, recipient) |
| --- | --- | --- | --- | --- | --- |
| after (`TX2_ACCOUNT_TICKETS=1`) | 8,307 | **0** | **4,000 of 4,000** | all refused (2,208 409, 1,205 503); 587 sent before or with its start committed, each before its position | 429, 158 |
| before | 2,283 | **0** | **544 of 4,000** (3,456 refused: 2,211 409, 1,245 503) | all refused | 405, 154 |
| after, `TX2_IMPORT_WHOLE_SUBJECT=1` too | 8,357 | **0** | **4,000 of 4,000** | all refused (3,446) | 442, 112 |

Stops drawn (after run): none 336, intent written not committed 162, committed not published 158, at publication 170,
after its guard 174 (the guard step is reached only on the removal's held path, which no schedule took: those 174 ran as
"none"; DX-ERA2's hammer gate drives the held path, 30 rounds).

### 10.3 Gate (e) on a stack: the top cases (`act9/stack.sh`, `era3/stack.sh`)

A removal of a1 (account a) stopped with its gateway killed; on the read gateway, tickets read before it (seq 0):

| Case | Frame a | Frame b | Frame, no account | Delivery a | Delivery b | Delivery, no account | Resumed | Delivery a again | a1's value after (source read, journal; recipient read, journal) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| committed, not published; after | 503 | **200** | 503 | 503 | **200** | 503 | 200 (seq 1) | 409 | 0, 0; 0, 0 |
| the same; before | 503 | 200 | 503 | 503 | **503** | 503 | 200 | 409 | 0, 0; 0, 0 |
| intent recorded, not committed; after | 503 | **200** | 503 | 503 | **200** | 503 | 200 | 409 | 0, 0; 0, 0 |
| the same; before | 503 | 200 | 503 | 503 | **503** | 503 | 200 | 409 | 0, 0; 0, 0 |
| `era3/stack.sh` option 1, every option on | — | — | 503 | — | — | — | 200 (seq 1) | resent no-account frame 409 | derived copy not readable; a1 not readable |

The "intent recorded" rows were meant to stop the removal after its declaration and before its intent; the intent
write, waiting on a table lock, completed in PostgreSQL after its gateway was killed, so the state reached was the
review's other case (`act9/stack.sh` header). The declared-only state is DX-ERA2's in-process `orphan` case (10.4).
Frame b commits in both arms: DX-ERA2's rule already honours a ticket naming its accounts in the same database. The
difference the option makes on the gateway is the cross-database delivery (3.2): delivery b 200 instead of 503.

### 10.4 Gate (f): every option on together

| Gate | Result |
| --- | --- |
| DX-ERA2's gate (`era2/gate.sh`, `ERA2_EXTRA_ENV="TX2_ACCOUNT_TICKETS=1 TX2_IMPORT_WHOLE_SUBJECT=1"` on every per-account run), head `a8870e290` | interleavings database-wide 360, per-account 695, subject-check 8,963 checks, **0 failed**; race loop 1,000; hammer 30 rounds; frame race 40 (20 no-account `cas-failed`, 20 account fence); the review's attacks and fuzzer 1,979 and 1,988 oracles, **0 violations**; suites 76 tests, 71,170 pass, 1 error (the same `http-route` error as the base) |
| (its first run, `28bb0d46c`) | 1 of 691 and 1 of 8,959 failed: `named-absent`'s import step was refused earlier than the case expects (IMP2's rule declines an import of a removed family at validation, 409 `ErasureReplayDeclined`, so it never reaches the plan the case holds). The case now expects that refusal when `TX2_IMPORT_WHOLE_SUBJECT=1` (`era2/gate.clj`) |
| IMP2's removal gate, every option on, the database moved per account (`imp2/gate.sh`, `DX_IMP2_MOVE_PER_ACCOUNT=1`) | **30 of 30** (IMP2's 28 and the two moves) |
| ACT8's adversarial schedule, every option on (`ha1 load-fair`, `DX_ACT8_PARTS=adversarial`) | <!-- TOY-ADV --> |
| gate (e) in process with every option on | 10.2, third row |
| `era3/stack.sh` option 1 with every option on | 10.3, last row |

### 10.5 Gate (a): every option off

| Check | Result |
| --- | --- |
| stored-function identities | 58 of 58 in seven settings (section 9) |
| native log (`era2/paired.clj`, base `2e7ae66c4`) | options off: identical to the base (653 and 698 datoms, `d4b11ca6...`, `5197942f...`), in every gate run; with `TX2_ACCOUNT_TICKETS=1` on (database not moved): identical; with `TX2_IMPORT_WHOLE_SUBJECT=1`: different, as IMP2's option makes a removal record the families it names |
| ACT8's toy gates (`ha1 load-fair`, holder DX-ACT9): every part, this option off | <!-- TOY-G1 --> |
| the held runner's default campaign | <!-- TOY-R1 --> |
| unit tests | `account-tickets.test.ts` 5 of 5; type check: no error in a file this work changed (the lazy lane's 20 errors are in five files the branch does not touch and in `load1/snapshot.ts`, which is byte for byte IMP2's head; the miniature 0) |

<!-- RESULTS -->
