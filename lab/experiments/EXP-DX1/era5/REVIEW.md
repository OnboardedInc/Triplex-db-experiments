# Review of `TX2_DERIVED_SEAL`: can a removed value still be obtained from a derived copy?

Reviewer DX-ERA5, 2026-11-25 (started 01:26 EST, this page written from 02:02 EST). Branch
`exp/DX-ERA5-derived-copies-review`, from `origin/exp/DX-ERA4-derived-copies` at `aee618710`. Tests only: no line of the
code under review was changed. Mac, toy sizes; every time on this page is diagnostic.

**The code reviewed.** `git merge-base` gives two true bases: `c2aa3d416` (DX-ACT9, the first parent of every ERA4
commit) and `3edb9f5d9` (DX-ERA2's third pass, merged at `1d01d02ab`). The diff read is ERA4's own first-parent commits
on `c2aa3d416..aee618710` plus the merge's resolution: `derived_seal.clj` (new), `main.clj`, `privacy.clj`, `erase.clj`,
`storage.clj`, `removal_erase.clj`, `removal_scope.clj`, `removal_commit.clj` (merge), and the writers in the lab tree
(`bench/lib/derived-seal.ts`, `actv-lazy/decision.ts`, `join/archive.ts`, `join/recorded.ts`, `join/account-tickets.ts`,
`join/account.ts`, `read.ts`, `notify1/journal.ts`, `notify1/receiver.ts`), and what they build on (`envelope.clj`,
`authority_sql.clj`, `privacy.clj` `cut`, `erase-keys!`, `shred-published!`, `removal_commit.clj` `complete-pending!`).
The code was read before the page `era4/DERIVED-COPIES.md`; the three removal reviews (`era3/REVIEW*.md` at
`af62ce1dc`) after it.

## Page 1, for the owner

**Is there a break? Yes, three, and I am certain of each:** every one reproduces on every run, on the code exactly as
built, and each has a control run beside it that does not break. A fourth (B4) is a stop of the notice stream that the
builder's page lists as a limit of W0 but that contradicts the option's own promise.

**The three most serious.**

1. **B1. The settlement writer stores derived copies in clear after one failed seal call, and serves them after the
   removal.** The settlement archive keeps the frame it computed in a cache before it calls the seal route
   (`join/archive.ts` 407-408, the seal at 417, sealed units written back at 423). If that call fails once (a gateway
   restart, a network error, the client's 5 s timeout, a gateway without the option, which answers 404), the clear
   frame stays cached under the same key, and the archive's next turn writes it without calling the seal route again.
   Under the option nothing refuses that copy later: `copyCheck`, `settledCurrent` and `markerCurrent` now return the
   frontier instead of checking it (`account-tickets.ts` 87, 128, 144). The settlement worker keeps one archive for
   its life: its automatic mode runs the same archive again on the next notice after a failure (`settlement.ts`
   74-101), and the scale driver retries `settle` three times on one worker (`scale2/mini.ts` 792).
   - Test: `era5/attack.ts` cases W and W2, run by `era5/run.sh` (W0's real recorder, archive and receiver against
     this head's gateway in its own container, sealed database, file authority, grace 0). Account F: one seal call
     fails with an injected error; account G: **no injected error**, the gateway's container is paused for the length
     of one seal call (`docker pause`, as a long collection pause or an overloaded host does) and the client's own
     5 s timeout ends it; account C: neither.
   - Output (`attack-3`, 02:04 EST): F: first turn `fetch failed (injected once ...)`, retry `stored`; G: first turn
     `Gateway deadline exceeded`, retry `stored`. Frame units: **F 0 sealed, 17 clear; G 0 sealed, 17 clear**; C 17
     sealed, 0 clear. X's clear unit reads
     `{"kind":"notify.document-expired","payload":{"docType":"visa","expiresOn":"2026-02-13"}}`. Then X's two values
     are removed and both keys deleted. After that, `values.stored()` **serves X's removed expiry date and "visa"** in
     F and in G (1 and 1 each), the archive's rows and journal hold X's date 2 times and its native data 1 time in
     each. C: 0, 0, 0. The same on `attack-1` and `attack-2` for F.
2. **B2. One removal left pending anywhere in the database stops the deletion of every published removal's key.** The
   shred worker reads each database's published cut without allowing a pending removal (`envelope.clj` 199,
   `privacy.clj` 166), the cut refuses, and the worker swallows the refusal (`envelope.clj` 208). So while any removal
   of any account is pending (its gateway died between its intent and its publication), no key of that database is
   deleted, however old its removal: the removed value and every copy sealed under it stay decodable with a key the
   store still holds, past the grace. Reads, seals, opens and plain saves do not complete the pending removal; only a
   write it can reach or a later removal does. In the one-database v0.1 this couples every account to every other.
   This code is DX-ERASE1's and is unchanged on the removal builder's head `6524bab92`; the option's promise 7.2 rests
   on it.
   - Tests: `attack5.clj` phase `pending` (file authority), `pending5.clj` p1 (PostgreSQL authority), and
     `era5/stack-shred.sh` on a stack (transactor, PostgreSQL, a write and a read gateway sharing the PostgreSQL
     authority, every container on its pinned image by ID, shred grace 15 s).
   - Output, stack (`stack-shred-1`, 02:02 to 02:03 EST): control database: a1's key row gone 15 s after its removal.
     Second database: a1 removed, then c1's removal started on the write gateway, which stopped after the intent and
     was killed; **25 s and 45 s after a1's publication a1's key row is still there**; a plain save of account b, a read
     of c1 and opening a1's copy on the read gateway left c1's removal pending; c1's removal resent on the read gateway
     answered 200, and a1's key row was gone 2 s later. The prediction written before the run held in every line.
   - Output, PostgreSQL (`pending-pg-1`, 01:53 EST, grace 4 s): R1 (account a) published; R2 (account c) stopped after
     its intent; **7 s later R1's key row is still in `triplex_removal.keys` and X's derived copy decodes** with it;
     R2's own resend completes it and then R1's key row is deleted. Control without R2: deleted within the grace.
3. **B3. The stored length of a sealed copy identifies the removed value.** AES-GCM without padding: every record's
   clear length is its stored length less 16 (`attack5.clj` c2: exact for every length from 0 to 64). W0's `docType`
   takes `passport`, `ead` or `visa` (`w0/src/schema.ts` 83). After X's removal, X's sealed records against Y's
   (opened through the route, as any reader can) leave exactly one document type.
   - Test: `era5/attack.ts` case L (real writers), `attack5.clj` c2 (the route).
   - Output (`attack-2`): X's clear lengths against Y's in each of the four places a copy lives: packets 329 against
     328, ledger 189 against 188, settled changes `[...,293]` against `[...,292]`, recipient 271 against 270; **types
     that fit: `["visa"]` in all four** (X's removed type was `visa`). Also: two copies of one content under the same
     names are byte-for-byte equal for good (`two-copies-equal true`). The route alone gives the same (`cases-2`,
     02:07 EST: X's record 311 bytes against Y's 310, types that fit `["visa"]`).

**B4 (admitted by the builder, page 5.1, but it contradicts promise 7.4).** After X's document values are removed, the
account's next Publish cannot settle or record notices for anyone: `S-next-release` gives settlement
`FAILED: W0.E_VALUE`, notices `FAILED: W0.E_VALUE for pl:s00000000`; the same Publish on an account without a
removal: `stored`, `recorded`. W0 accepts a removed value only for `ssn`, and one subject's evaluation error fails the
whole frame (`material.ts` 25, `journal.ts` 368).

**B5 (in the composition with the removal builder's settled head `bd4ec0d1a`, under its commit boundary).** The
coordinator asked: can the held reader's answer cache serve a computed answer holding the removed value between the
removal's commit and its publication? **Yes.** `era5/row19.ts` (the option's reader, `TX2_DERIVED_SEAL=1`, against the
gateway source of `bd4ec0d1a` with `TX2_REMOVAL_COMMIT_BOUNDARY=1`, per account, the removal paused 20 s after its native
commit): 63 ms after the commit the plain read of X's document answers `erased`, a fresh reader computes an answer
without X's date, and **the reader that had read X before answers from its cache (`exact-cache`) with X's removed
expiry date**, because the erasure frontier's sequence stays 0 until the publication (`removal_commit.clj` `effective`
masks through `union-mask` and keeps `:seq`). After the publication the cache is cleared. With the commit boundary off
the same reads wait for the publication (a read publishes a committed pending removal first) and nothing leaks.
Page 11.6 predicted this row wrong under that option; this run shows it.

**Recommendation: do not merge as is. Merge after these named fixes, each with its test from this branch turned green:**

1. `archive.ts`: never put clear units into the frame cache (seal into a local map and cache only what the route
   returned), and under the option refuse to write any unit that is neither sealed nor marked `clear` by the route
   (B1; `attack.ts` W).
2. `envelope.clj` `shred-published!`: read the published prefix allowing a pending entry (`privacy/cut name nil true`);
   a pending removal must not hold back the keys of removals already published (B2; `attack5.clj` `pending`,
   `pending5.clj` p1, `stack-shred.sh`).
3. `derived_seal.clj`: pad every sealed record to a fixed size class, and bind the record's place (its document key) in
   the associated data and the nonce, so equal contents in different places differ (B3, L1; `attack.ts` L,
   `attack5.clj` c2, c3).
4. W0 or the writers: a subject whose world holds a removed value must not stop the frame for other subjects (B4;
   `attack.ts` S).
5. `derived_seal.clj`: refuse a name that is not an assertion of this database instead of answering `clear` (M1).
6. Before the commit boundary is merged with this option: the held reader's cache must change key at a removal's
   native commit (for example the frontier reports the committed sequence, or the masked identities, and the reader
   stamps on it) (B5; `row19.ts`).

**My judgement of the design.** Sealing derived copies under keys that the removal destroys is the right family: it is
the only means that reaches journal entries, recipient databases and backups without finding them, and its core held
under everything I aimed at it (one source of n removed up to n = 512; five kinds of tampering; 20,000 random schedules
with kills and key restores; the stop point P3 the builder never reached; a decoder outside the gateway). What breaks is
where the design hands work to the client and to other processes: the client decides what to seal and which names to
send, the client holds the clear content in caches, and key deletion depends on a worker that any pending removal stops.
A shape with fewer states is worth weighing against it: seal in the gateway's own write route for derived documents,
under one key per subject and generation that any removal of that subject's values destroys. The recorder already
forgets a subject's whole notice state on any removal that touches it (page 3.4), so the per-assertion precision buys
little that is used, and it costs a name list per record (with its 512 limit and fail-open answer), lineage unions, one
key read per name per record with no cache, and a client that can write a clear copy. With the write route sealing,
no client can store a clear copy and none is cached; the price is that the gateway must know a document's subject
(the page's reason for rejecting per subject, section 3.1). Whichever shape is kept, padding and the shred fix are
needed.

## Findings

| # | Severity | Finding | Evidence | Proposed fix |
| --- | --- | --- | --- | --- |
| B1 | **Break (highest)** | Settlement archive writes clear derived copies after one failed seal call; the store serves them after the removal | `archive.ts` 391-424, `account-tickets.ts` 87, 128, 144, `settlement.ts` 74-101, `scale2/mini.ts` 792, `derived-seal.ts` 71 (only 503 is retried), `DatomicClient.ts` 354 (5 s timeout), `main.clj` 411 (a gateway without the option: 404); `attack.ts` W (injected error) and W2 (a 5 s gateway stall, no injection): 17 of 17 units clear in each, X's removed date served 1, archive routes 2, native 1; control 0 | Seal before caching; cache sealed units only; under the option refuse a unit the route did not seal or mark clear |
| B2 | **Break (high)** | A pending removal anywhere in the database stops all key deletion in it | `envelope.clj` 195-208, `privacy.clj` 166, `removal_commit.clj` 441-459 (completion only on a refused write or another removal); file: `pending` (R1 key present after grace + 3 s, copy decodes); PostgreSQL: p1 (key row present, copy decodes); stack: `stack-shred-1` (key row present 25 s and 45 s after publication with grace 15 s; gone 2 s after the pending removal was resent) | Shred from the published prefix with the pending entry allowed; and complete a pending removal older than a bound from the worker |
| B3 | **Break (high)** | A sealed copy's length identifies the removed value; equal copies stay equal | `derived_seal.clj` 102-122 (GCM, no padding; nonce from the content); `attack5.clj` c2 (length exact 0 to 64; `two-copies-equal true`); `attack.ts` L (`["visa"]` in packets, ledger, settled, recipient) | Pad to size classes; bind the place in the nonce and associated data |
| B4 | **Break of promise 7.4 (high, liveness)**; admitted as W0's limit (page 5.1) | After a removal of a non-SSN value, the account's next Publish fails for every subject | `attack.ts` S: `W0.E_VALUE` for settlement and notices; control `stored`, `recorded`; `material.ts` 25, `journal.ts` 368 | W0 treats a removed value as absent for every protectable attribute, or the writers isolate one subject's evaluation error |
| M1 | Medium | The seal route answers `clear` for names it does not know (an entity ID, another database's ID, a wrong case, none), so a writer that names rows wrongly stores its value in clear with no error | `derived_seal.clj` 113-115; `attack5.clj` c6: 4 of 4 wrong names `CLEAR` | Refuse names that are not assertions of this database; let a writer state "computed from no protected value" explicitly |
| M2 | Medium | A key restored from an older copy of the authority decodes every derived copy outside the gateway until a restart; with the log also put back to a pending-state copy (M1 of the third review), a restart does not delete it either, because the restored log holds the removal pending (B2's mechanism) | `attack5.clj` c4 (decodes, kept 3 s, deleted after a restart); c8 (decodes, kept after a restart and 6 passes, log pending). Page 11.6 states the first; it says a restart deletes again, which c8 shows false for that log state | B2's fix; and the worker checks every published removal's keys again on each pass, not from a progress counter |
| M3 | Medium | Mixed fleet: a client with the option facing a gateway without it gets 404 and, through B1, writes clear; a removal completed by a gateway without the option takes the old transaction ID (page 11.1); a client without the option writes clear copies the gateway accepts (page 11.2). Nothing in the database records that derived copies must be sealed | `main.clj` 411; B1; fuzzer: 3,074 removals by a gateway without the option, every copy still removed (no violation) | A per-database declaration, immutable like the protection policy, under which the gateway refuses unsealed derived writes |
| M4 | Medium (admitted, page 3.4) | After any removal that touches X, every notice of X is delivered again from sequence 1 in a new generation, including notices not computed from the removed value: delivered twice at the recipient | page 3.4; `recorded.ts` 349-357; T1's late recipient | Keep it, but say it in the promise; or re-send only items whose names include a removed assertion |
| L1 | Low | A sealed record is bound to its database and names only, not to its document, subject or account: copied into account B's document it opens to account A's value (the open route, like every gateway route, checks no account; the binding is what would keep a moved or replayed copy from opening) | `derived_seal.clj` 118, 136-144; `attack5.clj` c3 (`account-b-document-opens-to-account-a-value true`) | Bind the document key in the associated data |
| L2 | Low (liveness) | One record naming more than 512 rows, or longer than 4,000,000 characters, fails the whole seal call and so the whole frame; through B1 the retry writes the frame in clear | `derived_seal.clj` 18, 109-111; `attack5.clj` c1: 513 names `[400 "InvalidDerivedRecord"]` | Split per record; refuse one record, not the frame |
| C1 | Cost (diagnostic) | Each seal or open reads one key per protected name per record, no cache: a settlement frame of 64 subjects x 6 changes is 384 to 7,680 PostgreSQL key reads | `cost5.clj`; table below | A per-request key cache (the same names repeat across a frame's records) |
| R11 | Confirmed, admitted (inventory row 11) | After the key row is deleted its wrapped bytes are still in PostgreSQL's WAL; with the one wrapping key they decode X's copy | `pending5.clj` p2: heap tuple pruned (not found), WAL segment `000000010000000000000001` holds it, copy decoded | Page 10, follow-up 1 (wrapping-key rotation) |
| B5 | **Break under the commit boundary (high)**; composition with `bd4ec0d1a` | The held reader's cache serves an answer holding the removed value between the native commit and the publication | `read.ts` 138, 173, 193, 212 (key and check on the frontier sequence; a cache hit on the legacy path returns without a recheck); `bd4ec0d1a` `removal_commit.clj` `effective` / `union-mask` (sequence unchanged at the commit); `row19.ts` arm commit: plain read `erased`, cached reader `exact-cache` with X's date, frontier sequence 0; arm log: no leak (reads wait for the publication) | Stamp the cache on what the commit changes (a committed sequence or the masked identities in the frontier) |

**Unsealed databases (line of attack 6).** On an unsealed protected database a removal deletes nothing from storage:
`attack5.clj` c5, the value in **2 native datoms before and 2 after** the removal (the read route masks it). Nothing
stops an unsealed protected scope outside tests: `erase.clj` `declare!` and `privacy.clj` `register!` accept
`"sealed": false` with no other condition, on any database. With the option on the seal route refuses there (409
`DerivedSealNeedsSealedScope`), so this option's writers fail rather than write clear.

**Rows 22 and 23 in the v0.1 configuration (evidence).** The v0.1 scorecard drives `join/held-campaign.ts` (on
`exp/DX-INT1` at `1ed2650bd`), which imports `Settlement` (the archive and recorder this option seals) and publishes
`"owed"` only; `account.ts` 810 asserts a held account's Publish is `owed`, so no staged or stored output parts exist
for held accounts; `held-campaign.ts` imports neither `notify1/dispatcher.ts` nor `join/staging.ts` and never calls
`JoinedAccount.install` (the reconcile index). So rows 22 and 23 do not run in the v0.1 held configuration; B1 does
(its writer is the held campaign's `Settlement`).

**Cost with the PostgreSQL authority (line of attack 8; Mac, PostgreSQL in its own container on the lab VM, diagnostic,
medians of 5).** "off" is the same frame's derived write in clear, or a read of it.

| Protected values per subject | Settlement frame 64 x 6: seal (key reads) | its write, off | Frame 64 x 20: seal (key reads) | One subject owing 200 forms, notice frame: seal (key reads) | Subject page, 6 changes: open / off read | 400 items: open |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 86 ms (384) | 7 ms | 217 ms (1,280) | 68 ms (400) | 2 / 2 ms | 49 ms |
| 2 | 82 ms (768) | 7 ms | 338 ms (2,560) | 101 ms (800) | 1 / 3 ms | 70 ms |
| 5 | 156 ms (1,920) | 4 ms | 601 ms (6,400) | 167 ms (2,000) | 3 / 1 ms | 154 ms |
| 20 | 609 ms (7,680) | 3 ms | 2,025 ms (25,600) | 620 ms (8,000) | 8 / 2 ms | 621 ms |

The file authority gives 56 to 380 ms for the 64 x 6 frame at 1 to 20 values (`cost-file-2`). A Publish under the
option seals nothing (the owed record holds no subject value), so its own cost is unchanged; its frames are the rows
above. With a 1 ms round trip to PostgreSQL (another host), one chunk of 512 records naming 10 protected values is
about 5,120 sequential key reads, about 5 s: the client's timeout, and through B1 a clear frame. Predicted, not run.

## What was attacked and did not break

| Attack | How hard | Result |
| --- | --- | --- |
| Fuzzer (line 7), `attack5.clj` phase `fuzz`, `series1` (01:47 to 02:21 EST, seeds 501 to 504, 4 runs of 5,000, 509 to 532 s each, pinned image by ID, gateway source `f11ed329...` in every run) | **20,000 schedules**; 149,745 derived records (84,763 from a removed value, 64,982 kept), 60,195 written into derived documents; stops fired before the declaration 2,771, after it 2,667, before the native commit 2,781, after it 2,856, at the publication 2,736 (after the guard 2,874 asked, 0 fired: P3 is reached only by `pending5.clj` p3), none 8,290; kills 6,265; second removals 4,975; removals run by a gateway without the option 3,074; key restores 3,083; 200 block scans of every native datom and the journal | **538,753 oracles, 0 violations**. Every record of a removed value opened as removed and did not decode outside the gateway with any key file left; every kept record opened and decoded to its exact content; no native datom or journal page held a removed value or a copy in clear. Counted apart (the admitted class of M2): 6,226 records decoded outside the gateway with a key restored after its deletion |
| One of n (line 1), c1 | n = 1, 2, 3, 5, 8, 16, 64, 200, 512; one random source removed; route, re-seal, decoder outside the gateway with the n-1 keys left, a record of the other n-1 | 9 of 9 hold (removed, seals nothing, not decodable, the rest opens) |
| Derived key inputs (line 1) | code; c1's decoder outside the gateway | the key is a function of the assertions' secret keys only (salt and info are public and harmless); no input a reader holds suffices |
| Tampering (line 1), c3 | header names fewer, out of order, another database; nonce bit, body bit | 5 of 5 refused (409 or 400) |
| Hash of a clear payload stored (line 1) | code: packet chain, cursor, ledger head `sha`, settlement progress, the receiver's `effects:` and receipt | every hash is over the sealed bytes |
| Two removals of one record's sources; a removal no copy used; another subject (line 5), c7 | three removals | the copy stays readable after a removal it did not use; removed after the first source, still after the second, at the later sequence; the other subject's copy byte for byte |
| Stop point P3 (line 3), `pending5.clj` p3, PostgreSQL | two saves of X's subject racing the removal's commit, the third attempt takes the guard, the gateway stops there, caches and shred progress cleared, resumed | reached (`holds 1`); at P3 the copy opens only while the plain read still answers; a derived write refused 503 and completed the removal; afterwards removed, no clear byte in document, journal or native data, key row deleted, not decodable |
| The third review's M1 for derived copies (line 3), c8 | authority directory put back to a pending-state copy after the acknowledgement | the route answers removed (`d803df016` holds); the key file came back (M2) |
| Real writers after the removal, control arms (lines 2, 5) | `attack.ts` account C | 0 occurrences of X's removed values in routes, native data and `stored()`; Y's records open |
| A second gateway, a killed gateway (line 4), `stack-shred.sh` | the read gateway opens a1's copy while the write gateway is killed mid-removal, and after | `removed` every time (3 opens) |
| The recorder and the receiver after one failed seal call (line 3), `attack.ts` R | the recorder's first frame fails the same way as B1 | the recorder seals again on its next frame: its packets hold 2 sealed deliveries, 0 clear (it caches work items, not records) |

## What I could not test

1. **A merged gateway of this option and the removal builder's settled head** (`bd4ec0d1a`). A local merge of the
   head as it stood at 01:50 (`6524bab92`) into `aee618710` conflicts in `erase.clj`, `main.clj`, `removal_commit.clj`
   and `era2/gate.sh`: the fourth pass still edits `request-cut` and `per-account!` in `erase.clj`, where DX-ACT9 moved
   them to `removal_erase.clj`, and replaces `source-ticket!` with `check-source!`. Porting that is the derived-copies
   builder's merge (the coordinator has asked for it), and a wrong port would make any result meaningless, so I did not
   build one. What I ran instead, on a second branch of work: the option's client (this branch, `TX2_DERIVED_SEAL=1`)
   against the gateway source of `bd4ec0d1a` with and without `TX2_REMOVAL_COMMIT_BOUNDARY=1` (`row19.ts`, B5). From
   code: `derived_seal.clj` `native-erased` already treats a removal as effective at its native commit, so the derived
   routes do not depend on the boundary; `envelope.clj` and `privacy.clj` are unchanged from `3edb9f5d9` to
   `bd4ec0d1a`, so B2 is on that head too; B1 and B3 are in code the removal head does not touch. None of B1 to B4 was
   re-run on a merged head: no merged head existed when this page was written.
2. **The reporting copy and the commit-time index** (`f084d5adb`, `f078320a2`): from code only. The reporting copy reads
   journal pages and rows with `omitProtected` (protected attributes emptied) and copies every other value as stored,
   so it copies sealed bytes, or clear ones where B1 wrote them. The commit-time index never keys a protected attribute
   (`cross_index.clj` 206-210) and keys a derived document only if its attribute is declared, as stored.
3. **A server.** Nothing ran on a server; every time is from the Mac.
4. **The held layout's writers with the option** (deep worlds, one database): the real-writer runs use the W0 lazy
   store, which runs the same `Settlement`, `Archive`, `RecordedNotices` and `receiveOrdered` code.
5. **A second read gateway's caches, SDK caches** beyond code reading and the stack's opens (they hold sealed bytes by
   construction; B1's clear bytes would be cached like any document).
6. **Option off byte-identical**: not rerun; the builder's identity gate (60 of 60) is the evidence, and the code
   reading agrees (the new route clause is false with the option off; no stored function changed).

## Tests and how to run them

All on `exp/DX-ERA5-derived-copies-review`, lab VM only, one ordinary heavy token each
(`DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label NAME -- ...`). Evidence of every run here is in the
owner's project folder, `evidence/DX-ERA5/` (not the repository).

| Test | Command | What it shows |
| --- | --- | --- |
| `era5/attack.ts` (cases W, R, L, S) | `bash lab/experiments/EXP-DX1/era5/run.sh NEW_DIR on` (needs the packages built: `pnpm install --offline --store-dir <repo>/.pnpm-store`, `npx turbo run build`) | B1, B3, B4 on the real writers; controls |
| `era5/attack5.clj` phase `cases` | `bash lab/experiments/EXP-DX1/era5/inproc.sh NEW_DIR cases` | c1 to c8: one of n, length and equality, tampering and place, restored key, unsealed, unknown names, two removals, pending-state copy |
| `era5/attack5.clj` phase `pending` | `bash lab/experiments/EXP-DX1/era5/inproc.sh NEW_DIR pending` | B2 with the file authority (grace 4 s) |
| `era5/attack5.clj` phase `fuzz` | `bash lab/experiments/EXP-DX1/era5/series.sh ROOT RUNS N FIRST_SEED` (inproc.sh per run) | the fuzzer |
| `era5/pending5.clj` | `bash lab/experiments/EXP-DX1/era5/cost.sh NEW_DIR pg era5-pending-pg` | p1 (B2, PostgreSQL), p2 (row 11), p3 (P3) |
| `era5/cost5.clj` | `bash lab/experiments/EXP-DX1/era5/cost.sh NEW_DIR file` and `... pg` | C1 |
| `era5/row19.ts` | `ERA5_DRIVER=row19.ts ERA5_GATEWAY_REF=bd4ec0d1a ERA5_GATEWAY_ENV="TX2_REMOVAL_PER_ACCOUNT=1 TX2_REMOVAL_TEST_PAUSE_AT=committed TX2_REMOVAL_TEST_PAUSE_MS=20000 TX2_REMOVAL_COMMIT_BOUNDARY=1" bash lab/experiments/EXP-DX1/era5/run.sh NEW_DIR on` (drop the last option for the log boundary) | B5 |
| `era5/stack-shred.sh` | `ERA3_MAIN=2 bash lab/experiments/EXP-DX1/era3/run.sh BODIES subject bodies2`, then `bash lab/experiments/EXP-DX1/era5/stack-shred.sh NEW_DIR BODIES/run.out/bodies` | B2 on a stack |

Every container ran the pinned runtime image `sha256:21a67288007d...` by ID (each run records `image-ran`), with this
head's gateway source copied in (`gateway-source-sha` `f11ed329...` in every run, the source of `aee618710`); the
PostgreSQL containers ran `sha256:526f86d93c6e...` by ID.
