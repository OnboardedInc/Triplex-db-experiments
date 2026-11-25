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
the sealed model only: under the option the seal route refuses on an unsealed database (409
`DerivedSealNeedsSealedScope`), so this option's derived writers fail there rather than store clear derived content.
(Corrected after the merge, section 11.2: the gateway itself does not refuse a clear derived save from another writer.)

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
   option needs a sealed database: its seal route refuses otherwise, so its derived writers fail rather than store
   clear derived content.
3. **Copies outside the store** (3.7).
4. **(Added after the merge, section 11.2.) A copy a caller writes in clear, or seals naming fewer assertions than it
   read.** The gateway cannot tell a clear copy of a protected value from any other string without looking it up by
   value, which the store never does; the option relies on its writers sealing, and naming every row they read.

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
| **off**, unsealed (`T1-off-unsealed-final`, and `-final2` with the late recipient: the same counts) | **100**, in 21 places | **37**, in 13 | **92**, in 20 | 108 | 39 |
| off, sealed (`T1-off-sealed-final`) | refused at the first derived write (`ProtectedPreviewUnavailable`, 5.1 item 1) | | | | |
| **on**, sealed (`T1-on-6`, and `T1-on-final` with the late recipient: 0, 0, 0) | **0** | **0** | **0** | 112 (29 places, opened with the keys the store holds) | 40 |

Where the off arm found X's removed date: current rows, history, rows pinned before the removal and pinned history of
the settlement archive, the notice archive and the recipient (12 each), their journal entries (5), the client's ledger
and recipient reads (6), and the native data of the source (5: masking keeps the bytes), the recipient (15) and both
archives (15 and 6). The client's own packet and stored-change reads refused ("Discard the old protected input cut");
the routes and the raw data did not. In the on arm every sealed record found in any place (up to 17 per place) was
opened with the keys the store still holds: X's opened as removed, Y's and W's to their values.

**A packet recorded before the removal and delivered after it (`T1-on-final`, the late recipient).** A second
recipient received nothing until after the removal, then everything: the first packet holds X's removed delivery and
Y's; X's was not applied (it opens as removed) and was not taken as a gap. After the stream, both recipients hold the
same state for every subject: X generation 1 with its one new entry, Y generation 0 with two entries, Z none. The
scan of that run (the late recipient's database included) found X's removed value and derivatives **0** times. Off arm
(`T1-off-unsealed-final2`, the same counts as the table: 100, 37, 92): the late recipient's delivery is refused whole
("Discard the old protected input cut"), so with today's store a recipient that was behind at the removal never
receives the other subjects' notices either, and the stream stops at the next save.

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

Every option on together: `TX2_REMOVAL_PER_ACCOUNT`, `TX2_REMOVAL_SUBJECT_CHECK`, `TX2_ACCOUNT_TICKETS`,
`TX2_IMPORT_WHOLE_SUBJECT` and `TX2_DERIVED_SEAL`, on runtime image `sha256:21a67288007d...` by ID.

| Gate set | Result |
| --- | --- |
| DX-ERA2's gate (`era2/gate.sh`, phases gate, era3, suites; `ERA2_EXTRA_ENV` with the three later options) | interleavings database-wide 360 checks, per account 695, subject check 8,963: **0 failed**; frame race 40 per setting (20 `cas-failed`, 20 at the account fence, 0 committed); the first review's attacks and fuzzer (`era3/attack.clj`) 1,979 and 1,988 oracles: **0 violations**; gateway suites 76 tests, 71,170 assertions passing, 1 error: the known `feed-test` `http-route` error, the same on the base (it is what makes the script exit 1, as for DX-ERA2 and DX-ACT9) |
| DX-ACT9's gate (`act9/inproc.sh after`, 1,000 schedules) | 8,267 oracles, **0 violations** |
| The second review (`REVIEW-2.md`, `1c656316b`), its findings as gates | **E9** (a derived copy recorded before a removal stays readable, unsealed and sealed): closed for the copies this option seals (T1; gate (e), whose oracles allow no copy). **E6** (a ticket naming fewer accounts than its writer read lets the copy survive): closed for sealed copies, because the key follows the rows read, not the ticket (gate (e)'s cross-account write). **N5** (a log restored older than the data): not run; argued in section 9, item 9. **N1 to N4** (the removal protocol: an orphan declaration, deliveries into a recipient moved per account, mixed versions): not changed by this option and not closed here. Its `attack2.clj` was not run on this branch: its derived writes are written in clear, so with or without the option they show the copy E9 describes |

### 6.7 Gate (g): what it costs

**Bytes and datoms (T1, the same scenario off and on, the dump taken at the same point).** Sealing adds **no datom**:
every derived database holds the same number of string datoms in both arms (recipient 88 and 88; the four archives 81,
77, 73, 73 and the same). Bytes grow: the recipient's stored strings 21,551 to 25,260 (+17%), the four archives
62,753 to 81,931 (+31%). Per sealed record (31 distinct in `T1-on-final`): median clear size 217 bytes, sealed 540
characters, about 323 characters of overhead, of which 206 are the header; most of the header is the source
database's long name (`s2-` and base64 of the scope), so a short database ID would about halve it. A settled change is
sealed per unit, so a form with many small fields pays the overhead per field. A notice frame makes one seal call (all its
deliveries and ledger items) and, for each subject in it, one open of its ledger (batched per frame); a delivery makes one
open of the packet's deliveries and one seal of the recipient's state. Seal counters of `T1-on-6`: 6 seal calls (31
records), 36 open calls (147 opened, 71 removed answers) for the whole run.

**The removal's own work as a function of how many derived copies its subject has** (`era4/races.clj` phase `cost`, in
process, sealed, file authority; times diagnostic):

| Sealed copies of the subject's value | Removal: identities | Positions it wrote | Datoms it wrote | Time (ms) | Opening every copy afterwards (ms) |
| --- | --- | --- | --- | --- | --- |
| 0 | 1 | 1 | 35 | 34 | 0 |
| 10 | 1 | 1 | 35 | 43 | 3 |
| 100 | 1 | 1 | 35 | 16 | 20 |
| 1,000 | 1 | 1 | 35 | 12 | 50 |

The removal visits no derived copy, so its work is the same with 1,000 copies as with none (the time falls as the JVM
warms). It therefore stays within its try bound exactly as before: the subject check bounds it at 4 commit attempts by
construction (DX-ERA2 13.3), and every removal of gate (e) completed within 3 resumes. What grows with the copies is the
work of whoever opens them afterwards, which answers removed.

**Gateway CPU per call** was not measured (Mac). Each seal or open derives one key per record from its assertions'
keys: with the file authority one file read per assertion, with the PostgreSQL authority one SQL read and one AES
unwrap per assertion, uncached (follow-up 3).

## 7. What the store now promises about derived copies, and what it cannot

**Promised, under `TX2_DERIVED_SEAL=1` on a sealed protected database, for the derived copies this option seals**
(recorded notice packets, notice ledgers, settled stored changes, the recipient's state and delivered records, and so
the journal entries, feed entries, native data, backups and any copy made from them, such as the reporting copy):

1. From the removal's publication, no route of the store opens a derived record computed from the removed value: the
   open route answers `{removed: [assertion IDs], seq}` at any basis (the boundary of TARGETS 7.1), and the recorder,
   the settlement readers and the receiver read it as removed.
2. Once the removed assertion's key is deleted (the shred worker, after `TRIPLEX_ERASURE_SHRED_GRACE_MS`, default 5
   minutes), no byte the store holds can be opened, in any database of the same removal authority, in any journal
   entry, feed entry, backup or restored copy of the data: the record's key is computed from that key and stored
   nowhere. A key restored from an older copy of the authority is deleted again by the worker (`@shredded` starts at 0
   after a restart), and the published removal decides meanwhile (gate (e): restores).
3. This holds whatever the derived write's ticket named (the second review's E6 is closed for sealed copies: the key
   follows the rows the derivation read, not the accounts its ticket named), whenever the copy landed (before, during or
   after the removal: DX-ACT9's in-flight deliveries are closed for content; a late cross-database delivery too,
   section 11.3), and whichever process stored it, **provided the copy was sealed through the seal route naming every
   row its derivation read** (corrected after the merge, section 11.2: a copy written in clear, or sealed naming fewer
   assertions, is not reached).
4. The notice stream goes on: a subject whose notices were computed from the removed value starts a new generation and
   is sent its current notices again from the masked data; every other subject and account continues byte for byte.

**Not promised:**

1. **That a notice existed.** The packet keeps one entry per delivery with its subject and generation in clear; a
   subject's ledger document exists; its generation changes when its state is forgotten. "Subject X had a notice at
   event E" stays readable, even when only a rule reading a protected value could have produced it (DOCEXP: X's
   document had expired). Kind, rule, key, item ID, payload, version and sequence are inside the sealed bytes.
2. **A delivered notice cannot be un-sent.** A recipient outside the store (a person, an email, a payroll system), or a
   client that opened a record before the removal and kept the clear bytes, has what it was given. The store tells a
   follower what to forget: the removal's `erase` change names the removed assertion IDs, and every sealed record names
   in clear the assertion IDs it was sealed under.
3. **Copies outside this option's reach** (inventory rows 11, 22, 23, and every unsealed database): the keys' own dead
   copies in PostgreSQL and in backups of the authority (they open with the one wrapping key); the non-held paths; the
   reconcile index's postings; every protected value of an unsealed database (masking only).
4. **During the grace period** (published, key not yet deleted) the value is masked on every route but recoverable by
   anyone who can read the authority and the wrapping key.
5. **The client's memory**: the clear content between evaluation and the seal call, and what a caller keeps after
   opening. Held readers' caches key on the removal sequence under the option (row 19).
6. **(Added after the merge, section 11.2.) A copy a caller writes in clear or seals naming fewer assertions than it
   read.** The second review's `e9`, run as written (a hand-made derived save holding the value in clear), stays red
   with the option on; a copy of X sealed naming only Y's assertion survives X's removal. This option's own writers
   (the recorder, the settlement archive, the receiver) seal, and take the names from the world they read.

## 8. The server run (written, not run)

`era4/server.sh` (Linux, a clean clone at the head, this branch's image by ID; written, not run). Per arm a stack with
the PostgreSQL removal authority shared by both gateways (the production removal path, grace 0), the per-account rule,
the subject check and account tickets; T1 against it (on: sealed; off: unsealed, as on the Mac); `pg_dump` of the data
and of the authority (the key table left out) scanned afterwards. Predictions, written 2026-11-24 before any server run:

| Measure | Off | On | Shown wrong if |
| --- | --- | --- | --- |
| X's removed value and derivatives in routes, client reads and `pg_dump` of the data | found (about 100 or more, as the Mac) | **0** | any occurrence on |
| Y's and W's values | found | found through the open route | absent (the scan or the open route is broken) |
| Stream after the removal | stops at the first save | continues, oracle 0 differ | any difference |
| A frame's time (settlement, notice) | as today | **+20 to +150%**: one seal call per frame, and with the PostgreSQL authority each protected assertion's key is one SQL read (64 subjects with 2 protected values each: 128 reads per frame; no key cache) | more than 3 times off (then a per-cut key cache in the gateway is needed before any scale run) |
| The removal's own time | as today | within 10% of off (it visits no derived copy) | it grows with the subject's number of derived copies |
| Bytes per delivery, per ledger item | as today | +60 to +100% (about 130 to 200 bytes of header, nonce and tag, and base64) | above +200% |

At the deep scale (the held layout, 1 billion records) the same option needs the miniature to declare a protected
attribute its rules read (the deep profile's string pay rate) and the server's protected database to be sealed; that is
not written yet (follow-up 4).

## 9. Not verified

1. **Nothing ran on a server.** Every count is Mac toy size; every time is diagnostic, taken with several other builders
   on the lab VM.
2. **The held layout's derived writers** (one database, `heldWorlds`, deep worlds) were not run with the option: T1 is the
   W0 lazy store, which runs the same `RecordedNotices`, `Archive` and `receiveOrdered` code with its archives in their
   own databases. `heldWorlds` notes its rows (`decision.ts` 58) but no held run sealed anything.
3. **A real backup and restore** of the data and the authority: in process the restore is the authority's key put back
   and the worker restarted; the data was never restored from a backup.
4. **The PostgreSQL authority with the option**: every run used the file authority. With PostgreSQL a key is one SQL read
   per assertion per call (no cache), and destroying it deletes a row whose dead copy stays in PostgreSQL's files and WAL
   until overwritten (row 11).
5. **Cached replies on a second reader**: T1 has one gateway. The gateway's caches hold derived documents as sealed
   bytes by construction (rows 14, 17); the second review's stack read Reach on a second gateway for protected values.
6. **Ledger in parts** (`TX2_NOTICE_LEDGER=parts`) and count frames: the option needs byte frames and was run with
   whole ledgers only.
7. **A protected attribute saved after the removal by a lazy account on a sealed database** is refused by the SDK's
   preview (5.1 item 1); T1's later saves are of unprotected attributes.
8. **The reconcile index** (row 23) and the non-held paths (row 22) are not sealed.
9. **The second review's N5** (a removal log restored older than the data lets an old derived write land after the
   removal) was not run with the option. Argued: its copy is sealed under the removed assertion's key, so it opens as
   removed once the correct log is back, and as soon as the key is deleted it opens nowhere; the frame landing after the
   removal is unchanged. N1 to N4 concern the removal protocol and are unchanged by this option.
10. **Derived values computed from several subjects**: the design covers them (the union of their worlds' rows), but no
   rule here computes one, so none was run.

## 10. Follow-ups

1. **Wrapping-key rotation** (row 11, TARGETS 7.9): re-wrap every live key under a new wrapping key after each removal
   (or each day) and destroy the old one, so a destroyed key's dead copies and older backups of the authority cannot be
   opened.
2. **The reconcile index** (row 23, TARGETS 7.4): seal each subject's postings and evaluate the ranges after opening, or
   keep protected attributes out of indexed rules.
3. **A per-cut key cache in the gateway** for the derived routes (the PostgreSQL authority reads one key per assertion
   per call), dropped on every published removal.
4. **The held layout at scale**: declare a protected attribute the deep rules read (the string pay rate), run the
   miniature and the server run sealed.
5. **The three faults of 5.1**, now fixed only under the option, should be fixed by default on the one branch: a
   removal's transaction ID in the SDK's form (it also fixes DX-ACT9's enrolment beside removals), the lazy account's
   walk accepting a removal, and a preview of unprotected staged rows on a sealed scope.
6. **Should an unsealed protected scope exist outside tests?** No (section 1): refuse it in production configuration.

## 11. After the merge of DX-ERA2's third pass, and the second review's E9 and E6 as gates (2026-11-24)

The coordinator asked, after sections 1 to 10 were written: merge DX-ERA2's third version
(`origin/exp/DX-ERA2-removal-per-account` `3edb9f5d9`, gateway code at `e921f3ef1`; intent before declaration, any
gateway completes a pending removal, `RemovalLogBehind`), rerun the stored-function identities, place every step of this
option on that version's stop points P0 to P7, make the second review's `e9` a gate that must turn green, say whether
this design relies on callers naming what they read (E6) and gate the caller, and confirm or refute that a sealed copy
makes the cross-database delivery window harmless.

**The merge** (`1d01d02ab`). Three conflicts, all where DX-ACT9 had moved functions to late namespaces to keep the
stored-function identities: the third pass's change to `request-cut` (the declared sequence checked, a typed
`RemovalLogBehind` answer) went into `removal_erase.clj`, its change to `ensure-ticket!` (a tagged refusal that starts the
removal's completion) into `removal_scope.clj`, and its `removal_commit.clj` was taken with DX-ACT9's three references to
`removal-erase` restored. The review's `attack2.clj` E1b case was pointed at `removal-erase/selector-buckets` (moved by
DX-ACT9); nothing else in it changed. This option needed no change for the new order: it adds no step to a removal.

### 11.1 Every step of this option on the removal's stop points

This option's steps are: **seal** (derivation time, the `derived-seal` route), **record** (the derived write that stores
the sealed copy, an ordinary ticketed write), **open** (the `derived-open` route, any reader), the **removal's
transaction ID** in the SDK's form (inside the removal's commit, P4 and P5), the **key's destruction** (DX-ERASE1's shred
worker, after the publication), and the client's **re-recording** of a subject whose records open as removed (its next
frame after the publication). Only the last two act after a removal; none adds state to the removal, so nothing new has
to be completed when a gateway dies. The table follows DX-ERA2 15.2 (s is the removal's sequence); "checks" is
`era4/races.clj` phase `checks`, in process on the merged head, sealed database, file authority, every option on.

| # | Stopped after | Open a copy recorded before it | Seal the removed assertion again | The plain read of the value | A derived write of a copy it can reach | Who completes it, and what this option adds | Checks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0 | the agreement check (nothing written) | the value | sealed | the value | accepted (no removal exists yet) | nothing to complete | argued (nothing is written) |
| P1 | its intent (declaration not sent) | the value (the request uses the last published cut, TARGETS 7.1) | sealed: harmless, the copy is under the key the removal destroys | the value | 503 `ErasureFrontierUnavailable`, tagged; that refusal completed the removal | any gateway (DX-ERA2 15.2); the option adds nothing | stop before `declare!`: fired; after the acknowledgement every check below passed |
| P2 | its declaration | the value | sealed | the value | 503, and it completed the removal | as P1 | stop after `declare!`: fired |
| P3 | its subject guard | as P2 | as P2 | as P2 | as P2 | as P1 | **not reached**: a quiet removal commits at its first attempt and takes no guard (DX-ERA2's own gate stops there in process) |
| P4 | a commit sent whose wait expired | not landed: as P2; landed: as P5 | as P2 | as P2 | as P2 | as P1; the removal's transaction ID is inside that commit, so a late landing carries it | stop before the commit's native transaction: fired, as P2 |
| P5 | its commit | the value (the published cut does not hold it yet) | sealed | the value | 503, and it completed the removal | as P1 | stop after the commit: fired |
| P6 | the intent rewritten to the committed entry | the value | sealed | the value | 503, and it completed the removal | as P1 | stop at the publication: fired |
| P7 | its publication (answer not sent) | **removed** | **removed** | no value | 409 `ErasureFrontierChanged` (a ticket from before) | nothing; the resend answers 200 | ran to its answer: open and seal answered removed at once |
| S | the key's destruction (after `TRIPLEX_ERASURE_SHRED_GRACE_MS`) | removed (the cut decides before, the missing key after) | removed | no value | as P7 | **every gateway's shred worker** (every 500 ms, from the published log; a restart starts from 0 and deletes again; gate (e) kills and restores a key); if no gateway runs, the key stays and the published cut alone keeps every route from opening a copy | key deleted within 5 s in every row (grace 0) |

**One rule over the whole table, checked at every stop that fired:** while a removal is pending, a copy opens exactly
when the plain read of the value still answers it (oracle held at P1, P2, P4, P5 and P6), so this option never answers
more than the store already does; from the publication on, every copy opens as removed. After each row's
acknowledgement: the copy's document, the journal and every native datom hold no clear value, the copy opens as removed,
the assertion seals nothing, another subject's copy still opens, and the key is gone.

### 11.2 What this design relies on: the caller seals, and names every row it read

**Yes, it relies on the caller,** in two ways, and neither can be checked by the gateway without looking a protected
value up by value, which the store never does:

1. **The copy must go through the seal route.** A writer that saves a protected value in clear into a derived document
   is not reached. The second review's `e9`, run as written with the option on (its copy is a hand-made derived save
   holding the value in clear), stays red: section 11.5.
2. **The seal must name every row its derivation read.** The gateway keeps the protected IDs among those the caller
   names; it cannot know what the caller read. `e6s` (phase `checks`): a copy of X's value sealed naming only Y's
   assertion **survives** X's removal, exactly as E6 shows for a ticket naming fewer accounts.

**How the caller is gated.**

- **By construction in this option's writers.** The three call sites of `seal` take their names from the world the
  reader built, never from a list a caller writes: the settlement archive from `worldInputs(world)` (`archive.ts` 417),
  the recorder from `outputInputs(items)` united with what the subject's earlier items named (`recorded.ts` 438-445),
  the receiver from the names in the sealed records it received (`receiver.ts` 135-153). `worldInputs` throws for a world
  whose rows were not noted, and `outputInputs` for an evaluation without its world, so a derived record cannot be
  sealed from a world built outside `decision.ts`'s readers (unit tests 2 and 3).
- **At run time, on W0's real writers (T1, gate b).** After the removal, every sealed record found anywhere (every
  route, every client read, the native data of all four databases) is opened with the keys the store holds; a record
  sealed under too few assertions would open to X's removed value and be found. Found: 0 (section 6.1, and 11.5 on the
  merged head).
- **Not gated:** a writer outside this option's three (a new derived writer, the non-held paths of row 22, a caller of
  the gateway's save route). The rule for any new derived writer: it calls `seal` with the names `noteWorld` recorded,
  and T1's scan covers it only once T1 drives it.

### 11.3 The cross-database delivery window, with a sealed copy

DX-ERA2 15.8: a delivery's recipient transaction prepared under the source's current ticket and submitted after the
source's removal was acknowledged commits, and today its copy is readable in the recipient. **Confirmed open, and
confirmed harmless for a sealed copy** (phase `checks`, `window`; the recipient transaction captured as its gateway
prepared it and submitted straight to the recipient's Datomic after the source's acknowledgement and the key's
deletion, which bypasses every gateway check):

| Copy | Late transaction | Readable in the recipient (read route) | In the recipient's journal | Recipient datoms holding the value in clear | Opened through the source | Opened through the recipient |
| --- | --- | --- | --- | --- | --- | --- |
| clear (as today) | committed | **yes** | yes | 2 | — | — |
| sealed (this option) | committed | **no** | no | **0** | `{removed: [its assertion], seq: 1}` | 409 `DerivedSealNeedsSealedScope` (only the source can open it) |

So the window stays open for ordering (a copy can land after the acknowledgement), and a sealed copy makes it harmless
for content: whenever it lands, it is ciphertext under a key that no longer exists. What still lands in clear is what
every sealed record keeps in clear: the source database's name, the assertion IDs in its header, and the recipient
document's own name (existence, section 7).

### 11.4 E6 and E9 of the second review, as gates

| Finding | As the review wrote it | With this option | Gate |
| --- | --- | --- | --- |
| E9: a derived copy recorded before a removal stays readable | `e9` (clear copy; unsealed and sealed scope) | **sealed scope, copy sealed through the route (`e9s`): green**: after the acknowledgement the copy is not in its document, its journal or any native datom, it opens as removed, the key is gone, another subject's copy still opens. **Unsealed scope:** the option refuses to seal (409), by design (section 1). **As written** (a clear hand-made copy): red with the option on too (11.2, item 1) | `e9s` in phase `checks`; `era3e9-on` in DX-ERA2's gate with the option on (11.5) |
| E6: a ticket naming fewer accounts than its writer read | `e6` | the copy is sealed under the rows read, not the ticket: X's removal makes it unreadable (gate (e)'s cross-account write, every schedule) | gate (e) |
| E6 for seals: a seal naming fewer assertions than read | (new here) | **survives**, as expected: the design relies on the caller (11.2) | `e6s`, observed |

### 11.5 Gates on the merged head

Every container ran the pinned runtime image `sha256:21a67288007d...` by ID (recorded per run). Source: the merge
`1d01d02ab` and the phase `checks` commit `1b9d0e227` (in-process runs copy the gateway source at their start).

| Gate | Result |
| --- | --- |
| (a) Stored-function identities (`act9/idents.sh`, seven writer settings), this head against the merge without this work (the merged tree with this branch's gateway changes reversed) | **60 of 60 equal in all seven settings**; that tree also equals `c2aa3d416` 60 of 60 (the third pass moved no identity) |
| (a) Native log (`era2/gate.sh` phase `paired`, base `c2aa3d416` twice, this gateway options unset, the per-account option on and never moved) | **identical**: 653 and 698 datoms, `d4b11ca6...` and `5197942f...`, the same hashes as before the merge; every reply identical. With `TX2_DERIVED_SEAL=1` on the last arm: the same datom counts and replies; the log and read hashes differ (the removal's transaction ID, 5.1 item 2) |
| (f) DX-ERA2's interleavings, every option on | database-wide 360 checks, per account 1,545, subject check 9,813: **0 failed**; frame race 40 per setting (20 `cas-failed`, 20 at the account fence); lock lost 20 of 20 (one 200, one 503) |
| (f) The gateway's Clojure suites (base `c2aa3d416` off, this head off, this head with every option on) | 76 tests, 71,170 assertions passing in each; 1 error in each, the known `feed-test` `http-route` error, the same on the base |
| (f) The first review's attacks and fuzzer (`era3/attack.clj`), every option on | 1,979 and 1,988 oracles, **0 violations** |
| (f) The second review's cases E1 to E8 and its 400-schedule fuzzer (`era3/attack2.clj`), every option on, both settings | 2,785 and 2,785 oracles, **0 violations** (E7 and E7b, the log restored behind the data, included) |
| (f) The second review's `e9` as written, every option on | **red, as expected** (2 violations: unsealed and sealed, the copy readable and in the journal; 4 and 2 native copies): its copy is a hand-made clear save, which no option can reach (11.2) |
| **`e9s`**: the review's `e9` with the copy sealed as this option writes it | **green**: copy not readable after the acknowledgement, not in the journal, 0 native copies, opens as removed, key gone; another subject's copy opens; on an unsealed scope the seal route answers 409 |
| `window`: DX-ERA2 15.8's late cross-database delivery | clear copy: committed late, **readable** in the recipient, in its journal, 2 native copies; sealed copy: committed late, **not readable**, 0 native copies in either database, opens through the source as removed |
| `stops`: this option at P1 to P7 | 7 rows (P3 not reached); every stop that fired was completed by the refused derived write; after each acknowledgement 9 checks each passed (11.1) |
| Phase `checks` in all | 135 oracles, **0 violations** |
| (g) Cost phase (`races.clj` `cost`) | the removal wrote 1 identity, 1 position and 35 datoms with 0, 10, 100 and 1,000 sealed copies of its subject (time 39, 18, 19, 14 ms, diagnostic); opening every copy afterwards 0, 7, 11, 79 ms |
