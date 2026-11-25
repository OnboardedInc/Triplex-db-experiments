# A removal on request reaches every copy derived from the removed value (`TX2_DERIVED_SEAL`)

Builder DX-ERA4, 2026-11-24, branch `exp/DX-ERA4-derived-copies` from `exp/DX-ACT9-account-tickets` (`c2aa3d416`). All
accounts stay in one Datomic database. Mac work is correctness at toy size; every Mac time is diagnostic. Datomic is not
modified. Every option is default off; with `TX2_DERIVED_SEAL` absent nothing here changes a byte.

The requirement closed here is TARGETS section 7, item 3: every place a protected value, or anything derived from it,
lives must be reached by the removal, or the value must live there only under a key the removal destroys. Items 1, 2, 5,
7, 8 and 9 bind the design too.

Sections 1 to 4 were written before any code of the option (the inventory from the code of `c2aa3d416`, the failing
test, the design). Results follow from section 6.

<!-- SUMMARY -->

## 1. The inventory: every place a protected value or a derivative can be stored or served

**First, the original value. On an UNSEALED protected database a removal deletes nothing from storage.** `erase.clj`
`apply-native!` (139-160) writes the removal's journal entry (`op: "erase"` change records naming the assertion IDs), its
claim and a compare-and-set of the removal sequence; it retracts no datom and excises nothing (`:db/excise` appears in the
gateway only in a feed test fixture and in guards that detect excision). The value's bytes stay in Datomic's log, its
indexes, PostgreSQL's files and every backup; every route of this store **masks** it when it answers, from the published
removal log (`privacy.clj` `masked`). So an unsealed scope promises exactly this: no route of this store answers the
value after the removal's publication; it promises nothing about storage, backups, or anyone who decodes storage
directly. **Against TARGETS 7.3 an unsealed protected scope fails for the original value, before any derived copy is
considered.** Only a SEALED scope removes the value: the value is stored encrypted (`envelope.clj` `seal!` 117-129) and
the removal deletes its key (`erase-keys!` 165-172; with the PostgreSQL authority `authority_sql.clj` `shred!` 127-132,
which deletes the wrapped key row).

**The key's scope in the sealed path is per assertion**, i.e. per value: the file authority keeps one 32-byte key per
assertion ID (`key-file`, `assertion-<sha256(assertion ID)>.key`, 27-29, issued by `issue!` 38-54); the PostgreSQL
authority hands each sealed assertion one pooled key (`take-key!` 103-108) whose handle is written into that
assertion's sealed body (`sql/<handle>/...`, 126). Each key encrypts exactly one value's string, bound to its assertion
ID, entity, attribute and valid interval as associated data (`aad` 17-18). Nothing else is encrypted with it today.

**What the grace period means for "unrecoverable".** Keys are deleted by a worker every 500 ms, for published removals
older than `TRIPLEX_ERASURE_SHRED_GRACE_MS` (default **300,000 ms, 5 minutes**, `envelope.clj` 180; the toy stacks set 0,
`stack/up.sh` 981 and 998). From the publication until then the value is masked on every route but its key still exists:
it is recoverable by a read that started before the publication (TARGETS 7.1 allows it) and by anyone who can read the
authority and the wrapping key. After the key is deleted it is not recoverable from the store's live data; it remains
recoverable from an older backup of the authority together with the wrapping key (row 11 below).

**Should an unsealed protected scope exist outside tests? No.** It cannot meet TARGETS 7.3 for any value, and nothing in
this design can fix that (there is no key to destroy). It is useful for tests that check masking and the removal's
ordering; for production every protected database should be sealed, with the PostgreSQL authority. This design is for
the sealed model only: under the option a derived write from a protected world on an unsealed database is refused.

"Derivative" means anything computed from a protected value: a copy, a hash of a payload that holds it, a notice whose
kind or existence follows from it, a label computed from such a kind. "Reached" means the removal deletes it, rewrites it,
refuses to serve it, or makes it unreadable by destroying a key. "Before" is `c2aa3d416` with every option on that
exists there; "after" is this branch with `TX2_DERIVED_SEAL=1` (sections 3 and 4). A held account's derived documents
are ordinary rows of the attribute `notice/value` on entities `notice:v1:<hash(scope, account)>:<key>`
(`notify1/store.ts` `Documents.put`), written through the ordinary transact route: the value is canonical JSON, or
deflate plus base64 of it (`pack`), which anyone can decode.

| # | Place | Can hold a protected value or derivative today | Reached by removal before | After (this option) | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | The subject's own protected fact (current and history rows, every read route) | yes (the value) | masked by the published cut on every route; sealed scopes: the value is ciphertext under a per-assertion key, shredded after the grace | unchanged | `privacy.clj` `masked` 226-244; `envelope.clj` `seal!` 117, `shred-published!` 195 |
| 2 | Recorded notice packets `recorded-notices:<n>` (whole deliveries: `id, key, kind, payload, rule, seq, subject, version`) | **yes**: `payload` copies subject values verbatim (EVSUB `{"startDate": ...}`, `kernel.ts` 480; pay rate, document type and expiry); `version` is SHA-256 over the payload (`kernel.ts` 366), `id` over key, kind, rule, subject (355); `kind` and existence can follow from a protected value (EVSUB fires only for a present nine-digit SSN, 460-478) | **refused** when read, streamed or delivered (stamp check, `recorded.ts` 414-415); readable in clear through rows, history, journal pages and native data | **unreadable**: each delivery body sealed under the keys of the protected assertions it was computed from (section 3.1); only the subject, the generation and the sealed bytes stay in clear | `recorded.ts` 92-108, 123, 229-255 |
| 3 | The packet chain (`previous` = hash of the packet before) and the cursor `notice-progress` | **yes, a derivative**: the hash covers the clear payload, so a low-entropy value can be recovered by trying candidates | not reached | the hash covers the sealed bytes; it reveals nothing once the key is gone, and the chain still verifies | `recorded.ts` 112, 247; `receiver.ts` 49-52 |
| 4 | Notice ledgers `recorded-ledger:<subject>` (whole, and in parts `ledger-parts.ts`) | **yes**: `ItemState.payload` | refused (the recorder stops for good once a subject with a ledger is touched, `recorded.ts` 285-292) | **unreadable**, each item sealed as 2; the recorder goes on with a new generation for that subject (section 3.4) | `recorded.ts` 204-226; `ledger-parts.ts` 103-135 |
| 5 | Settled stored changes (settlement pages `answer:<seq>:f<n>`, `bytes: pack(entries)`) and their progress hash chain | **yes**: a subject's computed answers (a form field that copies a protected value) | refused when served (`archive.ts` 422-508, stamp check) | **unreadable**: each subject's entry sealed; the progress hash covers the sealed bytes | `archive.ts` 104-121, 299-300 |
| 6 | Delivery records in the recipient database: `receiver:<origin>:<subject>` (projection payloads), `effects:<origin>:<batch>` (the deliveries verbatim), the claim marker (a hash over the whole packet) | **yes** | **not reached** (another database; 158 copies counted by DX-ACT9); a delivery whose commit outcome was unknown lands after the removal declared (6 of 6) | **unreadable**: the recipient stores the sealed delivery bytes as received and its per-subject state sealed under the same keys of the SOURCE database; a delivery landing late carries ciphertext under the removed key | `receiver.ts` 54-83 |
| 7 | The journal's change records of every derived write (journal pages, `:_tx/change`) | **yes**: the change record holds the document value (the review's F5) | **not reached**: masking replaces values by assertion identity, and a derived row's identity is never removed (`privacy.clj` 230-237) | the value in the change record is the sealed document (by construction: the write holds no clear derived content) | DX-ERA3 F5; ACT9 10.2: 429 copies |
| 8 | Feed entries of derived writes (`/v1/db/{db}/log`) | no value on a protected database: identities only (op, entity, attribute, assertion ID, interval); the entity name of a ledger names its subject | — | unchanged; a removal already appears in the feed as an `erase` change naming the removed assertion IDs, and every sealed record names in clear the assertion IDs it is sealed under, so a follower knows what to forget (section 3.6) | `feed.clj` `project-protected` 31-62 |
| 9 | Native data under Datomic (`:triplex.entity/row` row texts, packed journals, index segments) and PostgreSQL's files under Datomic's storage (`datomic_kvs` segments, heap, TOAST, WAL) | yes: derived documents in clear (packed); unsealed protected values in clear (masking only) | sealed protected values: ciphertext, key shredded; derived documents and unsealed values: **not reached** (segments are immutable; no excision) | derived documents: ciphertext under the removed assertion's key, unreadable once it is shredded; unsealed protected values: unchanged (the option needs a sealed database) | `envelope.clj` 117-129; ERA2 9(c): "masking keeps the native bytes" |
| 10 | Backups and restored copies of the data | yes, as 9 | sealed values: ciphertext; derived and unsealed: not reached. A restore replays the removal log (`restore-erasure`, `main.clj` 491), and the shred worker deletes every published removal's keys again after a restart (`@shredded` starts at 0) | derived: ciphertext under a destroyed key | `envelope.clj` 179-208 |
| 11 | **The keys themselves**: wrapped assertion keys in `triplex_removal.keys` (a second database of the same PostgreSQL server as Datomic's storage on the toy stacks), or key files (file authority) | a destroyed key's wrapped bytes survive in PostgreSQL's dead rows, WAL and any backup of that server until overwritten; with the wrapping key (one per authority, never rotated) they open again | **not reached** | **not reached** (unchanged; stated in section 3.8: a key destroyed in the store can still be opened from an older backup of the authority together with the wrapping key) | `authority_sql.clj` 33-34, 127-132; `stack/up.sh` 990-997 |
| 12 | The removal log (`head.json`, `erase-<seq>.json`, `pending.json`) | no: commands, selectors (by assertion ID, entity, or entity and attribute) and identities (ID, entity, attribute, type, interval, key handle); never a value | — | unchanged | `erase.clj` 81-83, 88-99, 134-135 |
| 13 | The census (enrolment), ID lists, Publish markers, event tail, receipts | no: subject IDs, counts, release documents (definitions), hashes of documents (after: hashes of sealed bytes); an ID is never a protected value (protected attributes take strings only) | — | unchanged | ACT9 page section 2 W1, W2; `privacy.clj` 293-295 |
| 14 | The sweep's and the batch (`read`) route's answers, rows, history, pinned reads, Reach | protected rows: masked; derived documents: **in clear** | protected: masked; derived: not reached | derived documents are sealed bytes | `privacy.clj` `masked` |
| 15 | The commit-time index (connected questions) | not on this branch (`exp/DX-XQ10-questions-connected` is not merged here) | — | a derived document would be indexed as sealed bytes; not tested here | — |
| 16 | The reporting copy (PostgreSQL) | not on this branch (`exp/DX-RPT1-sql-reporting`); its page: protected attributes are never copied (`omitProtected`), every other attribute is, settlement documents included, so a notice payload would be copied **in clear** | — | it would copy sealed bytes (by construction); not tested here | `rpt1/SQL-REPORTING.md` on that branch, sections 1 and 3 |
| 17 | The gateway's parsed-entity cache (each reader; used by every world read: `/reach`, `/reach-many`, the journal route's inline worlds, the batch route), keyed by scope, connection generation, entity and **revision**; and the Reach session and ID caches | it holds the entity's raw native row texts, filled before masking (`reach.clj` 225) and masked only when answering (282). Unsealed scope: the clear value. **Sealed scope: the token `triplex-sealed-v1/<id>`, never a decrypted value** (unsealing happens per answer in `privacy/masked` through `*unseal*`), so after the key is shredded the cache holds nothing that opens. Derived documents: clear | a removal does not move an entity's revision, so the cache is not invalidated; masking at answer time is what keeps the value out of answers. (DX-API1, not on this branch, adds a drop of the named entities' entries when a reader first sees a removal, with a gate of 6,208 probes, 0 removed values served.) Derived: served in clear | derived documents are sealed bytes in the cache too; nothing else changes. The other per-reader cache keyed on revision, `recent.clj`, keeps revision witnesses (which revision of an entity is current at a cut), no row values | `entity_cache.clj` 31, 52, 97-110; `recent.clj` 7-16; `reach.clj` 16, 129, 225, 282 |
| 18 | The SDK's Reach reply cache, row cache and predecessor cache (process memory) | yes, in memory: rows as read (protected rows unsealed, derived documents) | Reach replies: keyed by the global sequence (re-sent after any removal); row and predecessor caches: no removal check, but used only to prepare writes, never to answer a read | derived rows are sealed bytes; the rest unchanged | `DatomicClient.ts` 910-934; `DatomicStorageAdapter.ts` 117-147, 683 |
| 19 | The held reader's answer cache (`read.ts` `LazyReader`, process memory) | **yes**: a subject's computed answers | not reached with every option off (held readers check no removal, ACT9 3.3); with `TX2_ACCOUNT_TICKETS=1` keyed by the account's removal state | under this option every held reader keys on the global removal sequence and checks it before returning (the protected-scope rule) | `read.ts` 97-258; `account.ts` 230; `archive.ts` 603 |
| 20 | Logs and traces at every layer | gateway spans and attributes: no values (status, sizes, operation IDs, hashes, timings); lab drivers log counts and IDs | — | unchanged; the option's own code logs no value | `trace.clj` 96-161, every `trace/attribute!` call |
| 21 | Erase proofs of the older notice-level erase (`erase-proof:<hash(subject)>:<n>`, `Notices.erase`) | **yes**: the subject's work items packed in clear, written on purpose before a notice-level erase | not reached (they exist to keep the preimage) | not used on the held path (only `notify1/hosts.ts` calls it); under the option the recorder refuses a subject with an erase proof rather than serve it | `journal.ts` 376-420 |
| 22 | Non-held paths: the older dispatcher's packets and ledgers (`dispatcher.ts` 156, 187), staged Publish records (`staging.ts` 46, 70), a non-held store's stored answers | yes | refused by their stamp checks; readable in clear | **not reached in this pass** (section 3.9): the held path and the W0 lazy store's recorded notices are |
| 23 | The lazy account's reconcile index (`join/index.ts` leaves and base: per-subject postings computed from the world by `actv-delta/rules.ts` `describe`; with `expanded`, the world's facts themselves) | **yes, whenever an indexed rule reads a protected attribute**: the default index keeps MINWAGE, EVSTAT and PAYCHG postings (EVSTAT reads `everifyStatus` and `everifyStatusAt`, strings, so protectable); the expanded index adds DOCEXP (the expiry day, `rules.ts` 149) and stores every world fact verbatim (`index.ts` 67). In T1 the default index held MINWAGE postings only (the pay rate, an integer) | not reached | **not reached in this pass**: the expanded index is refused under the option; a default-index posting computed from a protected attribute is not sealed (follow-up 2) | `index.ts` 18-29, 60-68; `rules.ts` 107-150 |

**What this says.** On `c2aa3d416` a removal reaches the subject's own fact (masking, and the key for a sealed value)
and nothing derived from it: rows 2 to 7, 9, 10, 14, 17 and 19 hold copies or derivatives the removal only refuses to
serve through some paths (2, 4, 5) or does not touch at all (3, 6, 7, 9, 10, 14, 17, 19). The step that makes the removal
fail TARGETS 7.3 is not a missing check: every derived copy is written in clear, so any path that reads the bytes
(the journal, a raw read, a recipient, a backup) has the value.

## 2. The failing test (the gate this work must turn green)

**T1, real rules, real notices** (`era4/derived.ts`, driven by `era4/run.sh`): one container from the pinned runtime image
by ID, this head's gateway source copied in, an in-memory Datomic and the file removal authority (sealed), the gateway
listening on a port of the lab VM; the TS client on the Mac. A W0 lazy store (the code path the held layout uses for
recorded notices, settlement frames and delivery: `RecordedNotices`, `Archive`, `receiveOrdered`) and a recipient
database. The protected attributes are `ssn` and `startDate`. W0's rule EVSUB (`kernel.ts` 448-485) **reads both**: it
copies `startDate` verbatim into the payload of `everify.submit-case`, and that notice **exists only if the SSN is
present and nine digits** (row 7; a missing SSN gives a task, not a notice). Subjects: X with a valid SSN and a start
date (the removed one), Y the same (kept), Z with no SSN; an unprotected control value (`bgcStatus`, `location`) on X.
Steps: publish R1 (owed), settle values, record notices, deliver to the recipient, then remove X's `startDate` and `ssn`
(by assertion ID), with the shred grace 0. Then the scan:

1. every route's answers, at every position: current rows, rows pinned before and after the removal, history, journal
   pages from position 1, the feed from the start, the sweep, recorded packets, ledgers, stored changes, the
   recipient's rows and journal, a second gateway instance's cached replies;
2. the raw stored data: every native row text and packed journal of both databases, each string decoded every way the
   store encodes (JSON, deflate plus base64), and every sealed body decrypted with every key the store still holds;
3. what is searched for: X's removed values (the start date string, the SSN string) and their derivatives (X's
   `everify.submit-case` delivery `version` and item `id`, computed from the clear payload before the removal, and the
   kind string inside any record of X); the control value must be found (so the scan works), and Y's values must be
   found in Y's records (so the removal did not over-reach).

**Prediction (before running; option off):** X's start date is found in the recorded packet, X's ledger, the stored
change of X (EVSUB's start date is not a form field: 0 there unless a form copies it), the recipient's
`effects:` and `receiver:` records, the journal change records of each of those writes, and the native row texts of
both databases; X's `version` and `id` the same places; the SSN string 0 places outside X's own sealed fact (no rule
copies it), but X's `everify.submit-case` record exists in clear (its existence follows from the SSN). Shown wrong if
the scan finds X's start date nowhere (then the test does not reproduce the fault) or the control value nowhere.

**T2, the gateway alone, in process** (`era4/derived.clj` on DX-ERA2's in-process harness): the same derived documents
in the exact byte shape the TS code writes, through the gateway's route handler, on a sealed database; then the
removal; then the same scan over every route and the native data. It runs inside the reviewer's fuzzer schedules for
gate (e).

**As run (written after the first runs; the plan above is kept as it was).** (1) EVSUB could not run: the joined
account refuses any SSN input on purpose (`account.ts` 379-382, "Protected input requires a retention ruling"), so its
submission notice never occurs there. T1 uses W0's rule DOCEXP instead, which has both properties asked for: it copies
a subject's document `docType` and `expiresOn` verbatim into `notify.document-expired`, and that notice exists only if
the protected expiry date is in the past (`kernel.ts` 551-607; R1 covers `ead` and `visa` documents). The protected
attributes are `docType` and `expiresOn`; X's and Y's documents are expired, Z's is not (so Z has no notice), and W
(account B) is expired. (2) T2 became the in-process schedules of `era4/races.clj` (gate (e)), which write derived
documents through the gateway's route handler in DX-ACT9's shapes. (3) With the option off the derived writers cannot
run on a sealed database at all (section 6.1, first finding), so the failing test runs on an unsealed protected database,
the only setting where today's notices are recorded; the sealed refusal is recorded as its own row.

## 3. Design

### 3.1 The choice: every derived copy is sealed under the keys of the protected values it was computed from

The requirement allows two means: (a) the copy never holds the value in clear, only under a key the removal destroys;
(b) the removal finds and rewrites each copy. **This design uses (a) for every kind of copy in rows 2 to 7, 9, 10, 14,
16 and 17**, because with (a) a missed copy cannot exist: a copy is unreadable because the key is gone, wherever the
copy went (a journal page, a recipient database, a feed follower's store, a backup, the reporting copy), and nothing has
to find it. With (b) the removal has to know every place, including places that are added later and places outside its
database, and Datomic's segments are immutable (a rewrite is a new datom; the old one stays in history and in every
backup), so (b) cannot reach the journal or a backup at all.

**Which key.** A sealed protected value already has its own key (one random 32-byte key per assertion: `envelope.clj`
`take-key!`, `issue!`; the key's scope today is **per assertion**, i.e. per value, and it encrypts exactly that value's
string, bound to its assertion ID, entity, attribute and valid interval as associated data, `seal!` 117-129). The removal
already destroys that key (`erase-keys!`, by key handle or key file). A derived record computed from protected
assertions `a1 ... an` is sealed under a key **derived from those assertions' own keys**:

    K = HKDF-SHA256(salt "triplex-derived-v1", ikm = K(a1) || ... || K(an) in ID order, info = database || a1 || ... || an)

So **destroying any one of them destroys K**, by construction, and the removal needs no new step to reach derived
copies. No new key is stored anywhere; K exists only inside the gateway while it seals or opens.

**Why per assertion and not per subject or per attribute.** Per subject would need the gateway to know which entities
belong to which subject; the two layouts name them differently (`pl:00000012` in the lazy world, `pl:s00000012` in the
deep one, `world.ts` 80-83 and `account-tickets.ts` 75), so a removal could miss a subject whose layout the gateway does
not know. Per assertion needs no layout knowledge: the record names the assertions it was computed from, and the
gateway, not the client, decides which of them are protected (section 3.2). It is also the narrowest: removing an old,
replaced pay rate leaves records computed only from the current one readable.

**Where sealing runs.** In the gateway: the client sends the clear record and the assertion IDs of every string row the
derivation read; the gateway keeps the protected ones (it knows them: `:triplex.private/id`), derives K, and returns the
sealed bytes. Opening is the same route in reverse, and it answers a typed removed marker when any of the record's
assertions is removed in the request's published cut (so the boundary is the removal's publication, TARGETS 7.1) or its
key is gone. The key never leaves the gateway, so no client cache of key material exists to invalidate. Derivation
itself stays where it is (the client evaluates the rules on the subject's world, which it reads in clear); the clear
result exists only in the client's memory between evaluation and the seal call.

**The sealed bytes.** `tdx1.<header>.<nonce>.<ciphertext>` (base64url), header `{"d": database, "k": [assertion IDs]}`
(IDs only, never values), AES-256-GCM with the header as associated data, and the nonce the first 12 bytes of
HMAC-SHA256(K, header || clear). The nonce depends on the clear bytes, so the same record sealed twice gives the same
bytes: a frame recomputed after a conflict writes the same document, and the chain hashes do not change between tries.
Two records equal in clear and in their assertion IDs are equal sealed; that is all the determinism shows.

### 3.2 Which assertions a record names, by construction

A record names **the IDs of every string row of every world it was computed from** (protected attributes take strings
only, `privacy.clj` 293-295, so no protected value is in a non-string row), plus the IDs named by every sealed record it
was computed from (a ledger item carries its earlier sequence number forward, so a new item names what the item before
it named). The client takes them from the rows `worldsAt` read (`decision.ts` 60-91, `heldWorlds` 35-58), not from a
list a caller writes. The gateway drops every ID that is not a protected assertion of this database; a record whose list
is then empty is stored in clear (it was computed from no protected value). A held world holds only its own subject's
rows (`heldWorlds` asserts it), so a record for subject Y names only Y's assertions.

**Derived values that are functions of several subjects** name the union of their worlds' IDs; K then needs every one of
those keys, and a removal of any subject's value makes the record unreadable. (In the held layout no derived record
today is computed from more than one subject's world: ACT9 page, section 2.)

### 3.3 The chain of notices, and a removed payload in it

A packet is `{account, epoch, batch, previous, event, position, recipe, start, through, deliveries, erasureSeq}`; under
the option each delivery is `{subject, generation, sealed}` (or the plain delivery when its list is empty). `previous`,
the cursor's hash and the recipient's receipt digest are SHA-256 over the packet **as stored**, so they commit to the
sealed bytes. After the removal the sealed bytes stay where they are, their key is gone: the chain verifies exactly as
before (the recipient checks `previous` against its receipt, `receiver.ts` 49-52), and the commitment reveals nothing
about the payload. This is the "commitment that survives while the payload is destroyed".

### 3.4 Re-recording: the notice stream continues after a removal

Today a removal of a subject with notices stops the account's recorder for good (`recorded.ts` 285-292). Under the
option nothing needs to stop: a record computed from a removed value is unreadable everywhere already. What remains is
to say what the stream is after it.

1. The recorder reads a subject's ledger before each frame. **If any item of subject X opens as removed, X's notice
   state is forgotten**: the ledger is taken as empty and X takes a new generation, the current removal sequence
   (always higher than X's last one). The ledger document becomes `{generation, items}`.
2. X's next evaluation (the next event that includes X) publishes X's current work items from X's masked world as new
   items (sequence 1), each carrying X's new generation.
3. The recipient keeps per subject `{generation, entries}`. A delivery of a higher generation replaces X's state with an
   empty one first; then it is applied as W0's `receive` applies it. A delivery that opens as removed is not applied
   (its content is removed) and not counted as a gap: every later delivery of the same item names at least the same
   assertions (rule 3.2, second half), so it opens as removed too until X's new generation arrives.
4. The account's other subjects and every other account are untouched: their records name none of X's assertions.

**What this means for the stream, stated exactly:** after a removal of any protected value that some notice of X was
computed from, X's notices start again from sequence 1 in a new generation, computed from the masked data; a notice
whose content did not depend on the removed value is therefore sent once more. Nothing of X's earlier notices remains
readable that named the removed value. The stream of every other subject continues byte for byte.

### 3.5 Deliveries in flight when a removal starts

A delivery checked before a removal declared and committed in the recipient after it (ACT9 10.6, 6 of 6) carries the
sealed bytes, so from the removal's publication it opens as removed, and once the key is shredded nobody can open it.
No in-flight mark is needed for the content (ACT9 follow-up 3 is closed for content; the fences stay as they are).

### 3.6 The journal and feed entries of derived writes, and a follower that already consumed them

A derived write's change record holds the document value, which under the option is the sealed record: nothing in
clear replaces anything, because there was never a clear value in the store. On a protected database the feed already
carries identities only. A follower that opened a record (through the open route) before the removal is told by the
removal's own `erase` change in the feed, which names the removed assertion IDs: it must forget every record whose
header names one of them. The header is in clear exactly so that this needs no lookup.

### 3.7 Existence: what the store promises and what it cannot

- **Promised:** after the removal is published, no route returns the removed value or anything computed from it; once
  its key is shredded (the grace, `TRIPLEX_ERASURE_SHRED_GRACE_MS`, default 5 minutes), no byte in the store, in a
  recipient database of the same removal authority, in the journal, the feed, a backup or the reporting copy can be
  opened: payload, version, item ID, kind, rule, key and sequence of a notice computed from it are inside the sealed
  bytes.
- **Not promised:** that a notice existed. A packet keeps one entry per delivery with its subject and generation in
  clear, the ledger document of X exists, and X's generation changes when X's state is forgotten; so "subject X had a
  notice at event E" stays readable, even when only the SSN rule could have produced one. The store cannot hide it
  without dummy entries.
- **Not promised: a delivered notice cannot be un-sent.** A recipient outside the store (a person, an email, a payroll
  system), or a client that opened a record before the removal and kept the clear bytes, has what it was given. The
  store tells it what to forget (3.6); whether it forgets is outside the store.

### 3.8 What is not reached even with the option

1. **The keys' own copies (row 11).** A key is destroyed by deleting its wrapped bytes from the authority; PostgreSQL
   keeps dead rows and WAL until they are overwritten, and a backup of the authority keeps them for good. With the one
   wrapping key (never rotated) they open again. TARGETS 7.9 asks that every surviving copy be encrypted only under the
   destroyed key; this one is encrypted under the wrapping key too. Closing it needs the wrapping key rotated after each
   removal (re-wrap every live key, destroy the old wrapping key) or keys kept outside any backed-up storage. Not built.
2. **Unsealed protected databases.** Their protected values stay in clear in Datomic's segments (masking only); the
   option needs a sealed database and refuses otherwise (a derived write from a protected world on an unsealed database
   fails rather than store clear derived content).
3. **Copies outside the store** (3.7).

### 3.9 Kinds of copy and the means chosen, one by one

| Kind | Means | Why |
| --- | --- | --- |
| Recorded packets, the packet chain | (a) sealed per delivery; hashes over sealed bytes | delivered and hash-linked: cannot be rewritten (a rewrite breaks the chain and the recipient's receipts) |
| Ledgers | (a) sealed per item; a forgotten subject takes a new generation | the recorder reads them; a rewrite would race the recorder |
| Settled stored changes | (a) sealed per subject entry | hash-chained pages |
| Recipient's records | (a) the sealed bytes as received; state sealed under the same source assertions | another database: the removal has no serial point there |
| Journal change records, feed, native data, backups, reporting copy, caches | (a), by construction (they copy the stored value) | immutable or outside the database |
| Held reader's answer cache | keyed by the global removal sequence and checked before returning | memory: invalidation is exact and cheap |
| Keys' own copies in the authority | not reached | needs wrapping-key rotation (3.8) |
| Erase proofs (older notice-level erase) | refused under the option | they exist to keep the clear preimage |
| Non-held dispatcher, staging, non-held stored answers | not reached in this pass | not on the held path; same mechanism applies (follow-up) |

## 4. The option

| Option | Default | With it |
| --- | --- | --- |
| `TX2_DERIVED_SEAL=1` (gateway) | off | the routes `POST /v2/db/{db}/derived-seal` and `derived-open` (section 3.1); on a database that is not sealed and protected they answer 409 `DerivedSealNeedsSealedScope`. Otherwise every route answers byte for byte as before. |
| `TX2_DERIVED_SEAL=1` (client) | off | recorded notices, ledgers, settled stored changes and the recipient's records are written sealed (3.1 to 3.4); readers open them; the recorder forgets and re-records a subject whose records open as removed; held readers key their caches on the removal sequence. |

## 5. What was built (behind `TX2_DERIVED_SEAL`, default off)

| File | Change |
| --- | --- |
| `gateway/derived_seal.clj` (new, loaded only with the option: `main.clj` resolves it at call time) | the routes `derived-seal` and `derived-open` (3.1); `preview-ok?`; `removal-tx-id` |
| `gateway/main.clj` | the two routes in the dispatch, under the request's published cut (written with `if`, `let` and calls only); with the option on, two hooks set at load |
| `gateway/privacy.clj` | two plain values (`derived-preview`, `derived-tx-id`), nil unless the option is on |
| `gateway/storage.clj` (two places) | a staged preview on a sealed scope is served when `derived-preview` says its staged rows hold no protected attribute |
| `gateway/erase.clj` (one line) | a removal's transaction ID comes from `derived-tx-id` when it is set |
| `lab/bench/lib/derived-seal.ts` (new) | the client: which rows a world was built from, seal and open through the routes, the removed marker |
| `actv-lazy/decision.ts`, `notify1/journal.ts` | each world and each evaluation carries the IDs of the string rows it was built from (3.2) |
| `actv-lazy/join/recorded.ts` | deliveries and ledger items sealed; ledgers opened; a subject whose ledger opens as removed is forgotten and takes a new generation (`recorded-generation:<subject>`); `openedPackets` |
| `notify1/receiver.ts` | the recipient's per-subject state `{g, e}`, each item sealed under the source's assertions; a higher generation starts it again; a delivery that opens as removed is not applied |
| `actv-lazy/join/archive.ts` | each settled change unit sealed (`["", sealed]`); readers open them (`openChanges`) |
| `actv-lazy/join/account-tickets.ts` | `copyCheck`, `settledCurrent`, `markerCurrent` return the current frontier instead of refusing (the copies they guarded are sealed) |
| `actv-lazy/join/account.ts` | the account's walk of its source accepts a removal's transaction (only `erase` changes) |
| `actv-lazy/read.ts` | every held reader keys its answer cache on the removal sequence (row 19) |
| `era4/run.sh`, `derived.ts`, `serve.clj` | T1 |
| `era4/races.clj`, `inproc.sh`, `series.sh` | gate (e) in process, and the cost phase |
| `lab/bench/lib/derived-seal.test.ts` | unit tests (4) |

### 5.1 Three faults found on the way, each blocking derived copies on a sealed database or the stream after a removal

All three are older than this branch and are fixed here only under the option (every default unchanged).

1. **With every option off, the derived writers cannot run on a sealed database.** Their transactions read their own
   staged documents, and on a sealed scope the gateway refuses every staged preview ("A protected row preview requires
   a guarded save", `storage.clj` 661 and 786), because preparing a preview seals protected staged rows and so issues
   keys outside the writer's lock. T1 off, sealed: refused at the first derived write (the census install). Under the
   option a preview whose staged rows hold no protected attribute, directly or inside a change record, is served (it
   seals nothing); one that holds one is still refused. Consequence that stays: **a lazy account cannot save a
   protected attribute on a sealed database** through `JoinedAccount.save` (its transaction previews the protected row),
   with or without this option; T1's later saves are of unprotected attributes.
2. **After any removal, the SDK cannot read past the removal's transaction.** A removal writes its transaction as
   `_tx/erase-<uuid>` (`erase.clj` 134); the SDK's and core's `TransactionId` accept only `_tx/` and 26 characters
   (`core/src/Branded.ts` 42-44), so every feed read that crosses a removal fails ("Schema validation failed", the same
   fault as DX-ACT9's enrolment beside removals), and with it every save of a lazy account (T1 off: the first save
   after the removal fails). Under the option a removal's transaction takes a well-formed ID (128 random bits in base
   32); nothing in the gateway or the SDK reads the old prefix.
3. **The lazy account's walk of its own source stops on a removal's transaction** ("Unclassified native writer left
   the joined source open", `account.ts` 280): it accepts only the writers it knows. Under the option it also accepts a
   transaction whose changes are all `erase` records (a removal writes no content of the source).

A fourth limit is W0's, not the store's: **the W0 kernel accepts a removed value only for `ssn`** (`w0/src/schema.ts`
69 is the only attribute declared erasable); a world holding a removed `docType` or `expiresOn` is `W0.E_VALUE` and is
not evaluated at all. So after a removal of any other attribute, that subject's evaluation stops until the removed
value leaves its world. T1 unlinks X's document (an unprotected reference) before X's next save. The reconcile index
(`actv-delta/rules.ts` `describe`) refuses the same worlds.

## 6. Results

Mac, toy size; every time is diagnostic. Every container ran the pinned runtime image by ID,
`sha256:21a67288007d...` (`tx2-datomic:1.0.7745-da00`), with this head's gateway source copied in and its SHA-256 recorded
(`gateway-source-sha`); each run records `image-ran` and fails on a mismatch. Evidence: `evidence/DX-ERA4/` (the owner's
project folder, not the repository).

### 6.1 Gate (b): the failing test turns green (T1)

After the removal is acknowledged (and the keys are shredded, grace 0), occurrences found by the scan of section 2:

| Arm | X's removed expiry date | X's notice `version` (derivative) | X's item `id` (derivative) | Y's kept date (scan works) | Control (unprotected) |
| --- | --- | --- | --- | --- | --- |
| **off**, unsealed (`T1-off-unsealed-final`) | **100**, in 21 places | **37**, in 13 | **92**, in 20 | 108 | 39 |
| off, sealed (`T1-off-sealed-final`) | refused at the first derived write (`ProtectedPreviewUnavailable`, 5.1 item 1) | | | | |
| **on**, sealed (`T1-on-6`) | **0** | **0** | **0** | 112 (29 places, opened with the keys the store holds) | 40 |

Where the off arm found X's removed date: current rows, history, rows pinned before the removal and pinned history of
the settlement archive, the notice archive and the recipient (12 each), their journal entries (5), the client's ledger
and recipient reads (6), and the native data of the source (5: masking keeps the bytes), the recipient (15) and both
archives (15 and 6). The client's own packet and stored-change reads refused ("Discard the old protected input cut");
the routes and the raw data did not. In the on arm every sealed record found in any place (up to 17 per place) was
opened with the keys the store still holds: X's opened as removed, Y's and W's to their values.

{{T1LATE}}

### 6.2 Gate (c): the chain, the other subjects and accounts, delivered once

On arm (`T1-on-6`): after the removal the recorded packets of account A read and verify their chain (`orderedPackets`
asserts every `previous` hash and the cursor's count); X's delivery reads `{subject, generation, removed}`; Y's
deliveries are byte for byte what they were before; account B's packets are byte for byte what they were; a second
delivery of everything added 0 effects. Off arm: the packets of A are refused after the removal (the stamp check), so
the chain cannot be read through the store; account B is unchanged.

### 6.3 Gate (d): the notice stream continues exactly

On arm: after the removal, Y's pay change, X's document unlinked and X's pay change (3 events) were recorded and
delivered; each event's deliveries were compared with an oracle that does not read the recorder's ledgers or seals (W0's
kernel on each subject's world read through the gateway at the event, folded with `W0.publish`, a subject forgotten at
its first event after a removal of an assertion its items were computed from): **3 of 3 equal, 0 differ**; before the
removal 3 of 3 (A) and 1 of 1 (B). X's new notice (`notify.pay-change-approval`) is generation 1, sequence 1; Y's is
generation 0, sequence 1. Off arm: the stream stops at the first save after the removal (5.1 item 2). DX-ACT9's "the
recorder stops for good" is gone under the option: nothing refuses the recorder. The independent form rule
(`form-expect.ts`) applies to form-adding releases of the deep profile; T1's W0 release adds no form, so it was not run.

### 6.4 Gate (e): races in process

{{SERIES}}

### 6.5 Gate (a): every option off

| Check | Result |
| --- | --- |
| Stored-function identities (`act9/idents.sh`, seven writer settings, runtime image by ID, this head against the base `c2aa3d416`) | **60 of 60 equal in all seven settings** (base, server, server-wide, server-wide-hints, serial-retire, owner-head, every other option on) |
| Native log (`era2/gate.sh` phase `paired`, base `c2aa3d416` twice, this gateway options unset, and the per-account option on with the database never moved) | **identical**: 653 and 698 datoms, `d4b11ca6...` and `5197942f...`; every reply identical |
| The same with `TX2_DERIVED_SEAL=1` added to the last arm (information) | the same datom counts and every reply identical; the log hash differs, as it must: a removal's transaction ID takes the new form (5.1 item 2) |
| Unit tests | `derived-seal.test.ts` 4 of 4; `account-tickets.test.ts` 6 of 6 |
| Type check of the lazy lane | 20 errors, the lane's known 20, none in a file this work changed |

### 6.6 Gate (f): the removal branch's gate set, the account-ticket gate set and the reviewers' tests, every option on

{{GATEF}}

### 6.7 Gate (g): what it costs

{{COST}}

## 7. What the store now promises about derived copies, and what it cannot

{{PROMISES}}

## 8. The server run (written, not run)

{{SERVER}}

## 9. Not verified

{{NOTVERIFIED}}

## 10. Follow-ups

{{FOLLOWUPS}}
