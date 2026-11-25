# Second review of `TX2_DERIVED_SEAL`: the builder's answer at `73e0d6849`

Reviewer DX-ERA5, 2026-11-25 (started 05:04 EST; this page written from 06:31 EST). Branch
`exp/DX-ERA5-derived-copies-review`, fast-forwarded to `origin/exp/DX-ERA4-derived-copies` at `73e0d6849` (last code
commit `802b7fd73`; the removal builder's heads `bd4ec0d1a` and `3b3471592` merged into it). Tests only: no line of the
code under review was changed. Mac, toy sizes; every time on this page is diagnostic.

**What was read, in this order.** The code diff `aee618710...73e0d6849 -- packages/` (12 files: `derived_seal.clj`
+302 lines, `removal_commit.clj` +523 (the removal builder's fifth pass), `main.clj`, `envelope.clj`, `failures.clj`,
`erase.clj`, `privacy.clj`, `reach.clj`, `removal_erase.clj`, `removal_scope.clj`, `storage.clj`, `DatomicClient.ts`);
the lab writers (`bench/lib/derived-seal.ts`, `actv-lazy/decision.ts`, `join/archive.ts`, `join/recorded.ts`,
`join/ledger-parts.ts`, `read.ts`, `notify1/receiver.ts`); then the page `era4/DERIVED-COPIES.md` sections 11.6
(corrected), 12 and 13; then the removal review's Z2 and Z4 (`era3/REVIEW-4.md` and `attack4.clj` at `0600ead45`).

## Page 1, for the owner

**Is there a break? In removal on request, not with today's writers: on the merged head, under each removal boundary,
I found no way to obtain a removed value.** Every finding of the first review that the builder fixed (B1 to B5, M1 to M3, L1, L2) re-ran as fixed (section 8),
and so did the removal review's Reach session case (Z4); M4 was kept by choice. **There is one break of another kind, and I am certain of it: with the
database setting that the B1 fix depends on, a subject owing more than 30 forms stops its account's notices for
good.** v0.1 cannot have both that setting and the 200 forms the owner requires (decisions 2026-11-24).

**How sure.** Certain of each measured fact below: each reproduces on every run and has a control beside it. Confident,
not certain, that there is no removal break: that rests on the counts in section 12 (the fuzzer: 10,000 schedules on the log boundary, 256,077 oracles, 0 violations; the commit boundary's 10,000 are in section 8), on toy sizes,
on the Mac.

**The three most serious findings.**

1. **N1. With the setting, the notice recorder stops for good above 30 owed forms per subject.** A sealed ledger item
   packs to about 400 characters (60.8 in clear), so a subject's ledger outgrows the writer's frame bound between 30
   and 32 forms; the way past the bound (ledgers in parts) is refused by the setting. The recorder cannot pass that
   subject, so every later subject of that release and every later release of the account gets no notice. The
   builder's page says parts are needed "for subjects owing about 1,700 forms or more"; 1,680 is the most parts can
   hold, not where they start.
   - Test: `era5/forms.ts` case P on the real settlement archive and recorder, `run.sh`, runs `forms-2` and `forms-3`
     (05:45 to 05:50 EST). With the setting: 5, 10, 20, 30 forms recorded; 32, 34, 36, 38, 40, 60, 100, 200 stopped
     (`its closing piece alone exceeds the writer's bound`), and stopped again on the second try; 200 in parts
     stopped. Control: 200 in parts without the setting recorded.
2. **N2. The removal log rebuild (the removal review's Z2, unfixed here) silently makes every later derived copy of a
   protected attribute public, and the setting accepts it.** A rebuild of a missing log may drop any attribute never
   yet removed from the protection policy. After that, new values of that attribute are stored in clear, a derived
   record computed from one is sealed under the key of no value (anyone can compute it), the setting accepts it, and a
   removal on request of the attribute is refused.
   - Test: `attack6.clj` `z2`, runs `cases6-log` and `cases6-commit` (05:20 to 05:24 EST): rebuild 200, the new value
     in 2 native datoms in clear, the new record names `[]`, stored under the setting (200), decoded outside the
     gateway with no key, removal 400 `EraseNotProtected`; the same on both boundaries.
3. **N3. A record whose writer names too few rows is public, and nothing can see it.** When a writer names none of the
   protected rows a value was computed from, the gateway seals it under the key of no assertion: it passes the
   setting, opens after the value's removal, and decodes outside the gateway with no key at all. Today's three writers
   name every row of the world by construction (section 2), so this needs a writer change; but the setting, built to
   catch writer mistakes, is blind to the one that matters most.
   - Test: `attack6.clj` `e1` (same runs): header names `[]`, accepted under the setting, after the removal the route
     opens it to the removed value and the outside decoder decodes it with an empty key list; a control naming the
     protected row opens as removed. The fuzzer's mislabelled mode: 5,320 of 5,320 mislabelled records from a removed value still opened to it after the removal (log runs)..

**One recommendation.** Do not declare the setting on a v0.1 database until a subject's ledger can pass the writer's
bound under it: cut ledger parts at item boundaries so the check can read each one (the builder's own proposal), or
seal a ledger part as one record instead of one record per item. Until then the setting trades the owner's 200 forms
for protection against a writer mistake that today's writers do not make.

**Judgement of the shape.** Keep the assertions' own keys (no new state, no new step in a removal: the builder is
right), but **let the gateway choose them**: every live protected assertion of the subject the record's place names,
plus whatever else the writer names (a second subject, for questions across subjects). The builder's own page says
every writer already names the whole world, so precision is not used today; choosing in the gateway costs nothing
that is used and removes the one failure (N3) no check can see. With that, the setting's list check becomes a backstop
instead of the main guard, and its gaps (N4: 17 of 18 hand-made documents holding a protected value pass it) matter
less.

## 1. The setting and its check: what it accepts (line of attack a)

**How the check works** (`derived_seal.clj` 360-435, called from `storage.clj` 178 at prepare time, before the
transaction is submitted). On a database with `:triplex.scope/derived-sealed` true, every NEW row whose attribute is
exactly `notice/value` and whose entity matches `^notice:v1:<64 lowercase hex>:(answer:N:fN | answer:N:N |
recorded-notices:N | recorded-ledger-part:... | recorded-ledger:... | receiver:...:... | effects:...:N)$` is decoded
and its shape checked: each content unit must be a `tdx2.` string whose clear header carries a place, or a map whose
`removed` is a vector. Field NAMES are checked for settled pages, packets, deliveries and a recipient's state; the
VALUES of the other fields are not, the removed marker's other keys are not, and a record's body is not (the gateway
never opens it). Ledger parts are refused outright.

**Test** `attack6.clj` `e1` (phase `cases6`, run by `inproc.sh`, every option on, sealed database, file authority, the
setting declared through its route): controls first, then 18 hand-made derived documents, each holding the protected
value `vx` of subject a1 in clear or recoverably. Runs `cases6-log` (ended 05:21:58 EST) and `cases6-commit` (ended 05:24:31 EST), the
same on both boundaries.

| Document (attribute `notice/value` unless said) | Outcome |
| --- | --- |
| control: a settled page with a clear unit | 409 `DerivedRecordUnsealed` |
| control: the same page with a sealed unit | 200 |
| settled page: `identity` = vx; `previous` = vx; an entry's `subject` = vx | 200, 200, 200 |
| recorded packet: `recipe` = vx; `account`, `event`, `previous` = vx; a delivery's `subject` and `generation` = vx | 200, 200, 200 |
| the removed marker with one more key `{"removed": [], "payload": vx}`: in a delivery, in delivered effects, in a ledger, in a recipient's state | 200, 200, 200, 200 |
| a recipient's state with `g` = vx | 200 |
| a hand-made string in the record's shape, `tdx2.<header {d, k: [], p}>.<12 zero bytes>.<vx in base64>` | 200 (the open route answers 409 `DerivedRecordInvalid` for it; the clear value is stored) |
| a record from the gateway's own seal route whose writer named only an unprotected row (section 2) | 200 |
| ledger part | 409 (as the builder states) |
| a kind one letter off the list (`recorded-ledgers:...`), the older dispatcher's `packet:N` | 200, 200 |
| attribute `notice/body` instead of `notice/value`; the entity's hex in capitals | 200, 200 |

**17 of the 18 documents that hold a protected value are accepted** under each boundary. None is written by today's
writers, which emit only the controls' shapes: these are the writer changes the setting exists to catch (admission 5
covers a new KIND; it does not say that a new FIELD, or a field's value, or extra keys on the removed marker pass too).
The fixes are cheap: each side field has a fixed type (a 64-hex hash, a subject ID, a counter: check it), the removed
marker is exactly `{removed, seq?}`, and a unit's body length must be a size class plus 16.

**Transition window (e2)** (admission 2, now measured). A clear derived write prepared before the declaration, held
between its preparation and its submission (`g/with-held`), the setting declared while it waits, then released:
**it commits (200) after the setting, and the stored document holds the clear value** (log and commit boundary, 1 of 1
each); the same write sent again is refused 409. The check runs at prepare time on the peer's database value; the
setting is not a value the write fences on at Datomic's serial point (the commit boundary's -2 is, `removal_commit.clj`
110). A second gateway whose peer has not yet seen the declaration is the same case.

**The journal's change record (e3).** A write whose `notice/value` row holds a sealed page while its journal change
record (`:_tx/change`) carries a different, clear string is accepted (200); the clear string is then in one native
datom and is served by the journal route (both boundaries). Hand-written only: the SDK copies the row's own value into
its change record (`transactionMetadata.ts` 15-26). The check could compare them, or check change records of content
documents as it checks the rows.

**Every kind the held path writes (test K).** `era5/forms.ts` case K (run by `run.sh`, run `forms-2`, 05:46 EST): one
account of three subjects through settlement, the recorder and a delivery into a recipient database, the setting
declared on all four databases; then every datom string of every database (history included, from the gateway's
native dump, decoded every way the store encodes) searched for the subjects' expiry dates in clear. **None: 0 copies in
the source (333 datoms), the settlement archive (74), the notice archive (82) and the recipient (89).** The path wrote
19 kinds of `notice/value` document; 5 are on the setting's list (`answer:N:fN`, `recorded-notices:N`,
`recorded-ledger:<subject>`, `receiver:...:<subject>`, `effects:...:N`) and 14 are not (`notice-progress`, `values:N`,
`claim:...`, `census:...`, `members:...`, `join-meta`, `join-calendar`, `join-member:<subject>`, `join-index-base:N`,
`event:N`, `tail`, `erasure`, `received:...`, `effect-erasure:...`). The 14 hold no subject value today (counters, hashes of sealed bytes, IDs, release documents). Not on this branch, so not
tested: the commit-time index for questions across subjects and the reporting copy (page 11, rows 15 and 16); either
would be a new kind outside the list, and the index is the owner's top gap.

**Every write path reaches the check.** `tx-data` (`storage.clj` 171-177) is the one preparation used by the ordinary
commit, the subject save (`storage.clj` 528, then `subject-prepare` 541), group commits (392) and staged previews (671,
798). Attacked without a break.

**An old build beside it (worst outcome, admission 1; reasoned, not run).** A gateway from before this option does not
know the attribute: it accepts every clear derived write from a writer without the option, does not run the re-sweep,
and has no derived routes (it answers 404 to a seal or an open, so its readers stop rather than leak). Nothing in the database makes it
refuse. The worst case is therefore a rollout in which one old gateway still serves writes: every derived document
written through it is clear and permanent (no key to destroy). **A restore from a backup taken before the declaration**
has no setting: clear writes are accepted again until someone declares it again, and nothing reminds them.

## 2. A record whose writer names too few rows (line of attack b)

**What the gateway does with too few names.** `seal-one` (`derived_seal.clj` 194-218) seals under the protected rows
among the names. If none is protected and the item has a place, it seals under the key derived from NO assertion:
HKDF over empty key material, salt `triplex-derived-v1`, info `[database, ]`. Anyone with the stored bytes can compute
that key. The setting accepts such a record (its header has a place), and no removal can ever destroy its key.

**Test** `e1` (same runs). Subject a1, protected value vx (assertion `e1-x`), unprotected row `e1-plain`. The writer
names only `e1-plain`: the record's header names `[]`; the document is accepted under the setting; vx is removed on
request and its key deleted; then **the record still opens through the route to `derived:vx`, and decodes outside the
gateway with no key at all** (`offline-open` with an empty key list), on both boundaries. A control record naming both
rows opens as removed.

**Can today's three writers name too few?**

| Writer | Where names come from | Can it name too few today? |
| --- | --- | --- |
| Settlement archive (`archive.ts`) | `outputInputs(work items)`: the string rows the subject's world was built from, noted where every world is built (`decision.ts` 68 and 104, `noteWorld`) | No by construction. A world built without its rows fails closed (`worldInputs` asserts); cached work items keep their rows (the WeakMap is keyed on the same objects); removed rows are not strings, so a removed assertion is never named for a new output |
| Recorder (`recorded.ts` 438-439) | the same, united with what the item it continues named | No, as above |
| Receiver (`receiver.ts` 150-157) | the names in the headers of the deliveries and state entries it applied, `named.get(id) ?? []` | Only if an id reached the new state that no delivery or entry carried; `W0.receive` keys effects and projection by delivery id (`outbox.ts` 192-232), so not today. If a delivery was itself sealed under `[]`, the receiver copies `[]` |
| Any new writer | whatever it passes | Yes: nothing refuses an empty or short list |

**What the gateway could check.** It does not know what a value was computed from, so it cannot check completeness in
general. It does know the place: every record a writer stores names its subject (`placeOf` = scope, account, subject).
So the seal route can **unite the names with every live protected assertion of that subject** (the gateway resolves
the subject's entities through the same owner rule the subject check uses), and refuse a placed record with no
protected name when its subject has any. That removes under-naming for the subject's own values with no new state and
no new removal step.

**Judgement on the shape, again.** The builder's table (page 13.2) is right that one key per subject and generation
costs new state (10,000,000 key rows at the owner's scale) and a new step inside every removal, and that per-value keys
cost neither. It also says that precision is unused today: every writer names the whole world, so a removal of any one
of a subject's protected values already makes every derived record of that subject unreadable. Per-value naming
therefore buys the builder nothing it uses today and leaves the one failure the check cannot see. **Keep the
assertions' own keys, but let the gateway choose them: the subject's live protected assertions, plus whatever else the
writer names** (a second subject for a record across subjects). That is the reviewer's shape without its new state,
and the builder's shape without the under-naming.

## 3. The new format (line of attack c)

**Size classes with the real fields (attacked without a break).** `attack.ts` case L, re-run on this head under three
removal arrangements (`attack-dbwide` 05:38, `attack-peraccount-log` 05:39, `attack-commit` 05:39 EST; the last moves
each database per account with the commit boundary on). Subject X's document is a visa, Y's an EAD; after X's
removal, X's stored records are compared with what Y's records would be for each of W0's three document types
(`passport`, `ead`, `visa`: 8, 3 and 4 characters). In all four places (packets, ledger, settled changes, the
recipient's state) **all three types fit X's stored classes** (X: 512; 256; 128, 256, 256, 256, 512, 512; 512 bytes),
in all three runs. Before the padding the same test singled out `visa`. What a class still shows, by arithmetic: a
record whose clear length sits within the difference of two candidate values below a class edge (64, 128, ... 4,096)
still tells them apart; Y's settled records here are 113, 191, 191, 217, 280 and 292 bytes, so a field 10 or more
characters longer would move the 113-byte record from class 128 to 256. A free-text value (a name, an address) is
told apart from a short one. That is the builder's admission 6, measured.

**The random nonce (reasoned).** Each record draws 12 bytes from `SecureRandom` at sealing (`derived_seal.clj` 215);
no path derives it from content, a counter or a retry. Two records can repeat a nonce only under the same derived key,
and the key is derived from the exact list of names and the database, so in practice one key per subject's world: a
few hundred to a few thousand records each at the owner's deep shape. The one key shared by many records is the key
of no assertion (one per database: every placed record with no protected name). Even if all of 1,000,000,000 records
used one key, the chance of any repeated nonce is about 6 x 10^-12 (n^2 / 2^97), and that key protects nothing anyway
(section 2). No reuse path found.

**Binding (attacked without a break).** `attack5.clj` c3, re-run (section 8): a record with its header changed (fewer
names, names unsorted, another database, another nonce, another body) is refused (409 `DerivedRecordInvalid` or 400
`InvalidDerivedRecord`); a record copied into another account's document does not open there for a reader that states
its own place (L1). By reading the code: a record replayed into another subject, account or database is refused for
the same reason (the place and the database are in the authenticated header); a delivery of an older generation is
sealed under the keys its generation named, so after the removal that started the new generation it opens as removed;
`tdx1` records still open (and show their exact length), and the setting refuses a `tdx1` unit; rewriting a `tdx2`
prefix to `tdx1` opens to the same clear bytes with the padding left on, so a reader gains nothing it could not open
anyway. One limit of the binding: the place is checked against what the READER states. Every reader in the lab
computes the place itself (`recorded.ts` 57, `receiver.ts` 131-132); a reader that copied the place from the header
would get no protection from it.

## 4. A removed value now counts as absent (line of attack d)

**Test** `era5/b4.ts` (no gateway: W0's TypeScript kernel and the independent Python oracle `bench/lib/w0-oracle.py`,
05:23 EST). One subject with a document of four kinds (visa expired, EAD expired, EAD not expired, passport) under
release R1, in six variants each: kept; both document values removed and dropped as `withoutRemoved` drops them; both
removed as W0's own erased markers; only the expiry removed; only the type removed; a subject that never had a
document. 24 worlds.

**Result: no break.** Kernel and oracle give the same work items on every dropped world (20 of 20); on the erased
markers both refuse with `W0.E_VALUE` (4 of 4). After the removal of either value of an expired document, the
subject's expired-document notice (`DOCEXP`) is no longer owed: exactly what a subject who never had a document owes.
No notice becomes owed that was not (R1 has no rule for a missing document). Other subjects are not touched (W0
evaluates one subject at a time). The new answer is computed without the removed value, so it shows nothing of it.
**One point for the owner, not a defect:** W0's specification says a world holding a removed document value cannot be
evaluated (`W0.E_VALUE`, only `ssn` may be removed); the writer now evaluates it as if the document had no such value.
So a subject who asks for removal of a document's expiry date stops being reminded that the document expired. That is a
product rule the owner should state.

## 5. Every cache under each boundary (line of attack e)

**The held reader's cache (B5's fix, inventory row 19).** `row19.ts` re-run on this head (the gateway paused 20 s
after the removal's native commit, `TX2_REMOVAL_TEST_PAUSE_AT=committed`; reads pinned before the removal):

| Boundary | Between the commit and the publication | After the publication |
| --- | --- | --- |
| commit (`row19-commit`, 05:39:35 to 05:39:55 EST) | plain read masked (`erased`); the reader primed before the removal answers from the source, **without the removed date**; a fresh reader the same | the same |
| log (`row19-log`, 05:40:15 to 05:40:35 EST) | reads refused while the removal waits (`The current erasure sequence cannot be verified`; the primed reader hits its 5 s deadline); nothing served | plain read masked; the primed reader answers without the removed date |

On the first review's composed head the cached reader served the removed date in this window under the commit
boundary. **Fixed**: the reader's key now holds the gateway's removal stamp, which moves at the commit.

**The Reach session (the removal review's Z4).** `attack6.clj` `z4` (phase `z4`, runs `z4-log` and `z4-commit`,
05:38 to 05:39 EST, then again in `z4m3-log` and `z4m3-commit`), unsealed and sealed, each boundary: a Reach session primed at a pin (the value inline), the
removal stopped after its native commit, the session read again at the pin, then the removal resent and acknowledged.
**In all eight cases the session read between commit and publication answers the entity inline and masked**, so no
client keeps the value (the plain read is masked too); after the acknowledgement the session answers a hit, and what
the client holds is the masked copy. 0 violations. **Closed on this head.**

**The SDK's Reach reply cache.** It now keys on the `x-triplex-removal-stamp` header when the gateway sends one
(`DatomicClient.ts` 625-640), which moves at the commit under the commit boundary. Read, not run separately: the
session case above exercises the gateway side of the same stamp.

**The held reader's cost (new).** Under the option every held read fetches the erasure frontier and builds its key
from the whole removed set: `Object.keys(erased).sort()`, joined and hashed (`read.ts` 119-131), at least twice per
read (before and after, 184 and 197). The frontier carries every removed assertion of the scope (about 130 bytes each:
type, value type, time and transaction, `privacy.clj` 143). Measured on the Mac (`node`, the key alone, without the
transfer): 1,000 removed assertions 1 ms per key, 10,000 6 ms, 100,000 77 ms, 1,000,000 1,152 ms; the frontier itself
is then about 13 MB at 100,000. It grows with every removal the database ever had and is paid on every read. As far as
I can read, the removed set changes only when the removal stamp does (the stamp moves at the commit under the commit
boundary, at the publication otherwise), so the stamp could key the cache alone and the gateway need not send the set.

## 6. The key re-sweep (M2's fix; line of attack f)

**Test** `attack6.clj` `m2` (same runs): N removals of one value each (N = 10, 100, 400, 1,000), then five re-sweep
passes timed on that one database (file authority); then a key file restored from a copy taken before its removal, and
a pass in which the authority refuses the delete (`erase-keys!` throws).

| Removals in the database | One re-sweep pass of that database (ms, five passes) |
| --- | --- |
| 10 | 1, 1, 1, 1, 1 |
| 100 | 10, 5, 4, 4, 4 |
| 400 | 13, 21, 12, 11, 13 |
| 1,000 | 35, 39, 31, 40, 34 |

**Cost.** Linear in every removal the database ever had (`resweep!`, `derived_seal.clj` 303-329: every pass reads
every committed erasure record and checks every removed identity's key), on every gateway with the option, every
second (`resweep-ms` 1000). About 35 microseconds per removed identity here: a database with 30,000 removed identities
would spend its whole second re-sweeping on each gateway. The PostgreSQL authority makes it one query per database per
pass, with every key handle in it.

**Failures are silent.** With the delete refused, **the pass counted nothing and logged nothing, and the restored key
stayed** (4 of 4 sizes); the shred worker under the same fault counted 1 each time (`envelope.clj` 211, the removal
builder's fifth pass). The next good pass deleted the key. So the fix for M2 is itself a loop that can stop doing its
work with no sign: `derived_seal.clj` 329 and 335 drop every exception, and 314 turns a failed read of the native
records into an empty list. It should report through `failures/note!` as the shred worker now does.

## 7. Z2 with this option (line of attack g)

**Test** `attack6.clj` `z2` (same runs). Protected attributes `:v` and `:p`, sealed; the setting declared. a1's `:p`
saved and a derived record sealed from it; b1's `:v` saved and removed; the removal log deleted; then the rebuild route
with a policy naming only `:v` (the removed attribute; `:p` was never removed).

**Result, both boundaries: the rebuild is accepted (200) and `:p` is no longer protected.** Then: a new `:p` value of
a1 is stored in clear in 2 native datoms; a derived record sealed from it names no assertion (`[]`), **is accepted
under the setting, and decodes outside the gateway with no key**; a removal of a1's `:p` on request is refused
(400 `EraseNotProtected`); the record made before the rebuild still opens to the old value. So Z2 (unfixed on this
head: `rebuild-log!` requires the policy to cover only the removed attributes, `removal_commit.clj` 908) silently
turns every later derived copy of that attribute into a public one, and the setting cannot tell.

## 8. The fixes re-run, and the fuzzer (line of attack h)

All on `73e0d6849`, under each removal boundary. "Log" is the database guarded per account with removals taking effect
at their publication; "commit" is the same database moved to the commit boundary (`TX2_REMOVAL_COMMIT_BOUNDARY=1` lets
the move turn it on; the in-process runs check that the database's boundary is the one asked for). `attack.ts` also
ran once with the database guarded database-wide.

| First review's finding | Test re-run | Log boundary | Commit boundary |
| --- | --- | --- | --- |
| B1 settlement frame kept clear after a failed seal | `attack.ts` W (injected failure) and W2 (gateway paused) | **fixed**: 17 of 17 units sealed after the failure and after the stall, 0 clear; after X's removal 0 copies of X's date served, in the archive's rows or in native data (also database-wide) | **fixed**, the same |
| B1 a writer without the option writes clear | `e1` controls; the fuzzer's failed and refused seals | **fixed** for the shapes today's writers write: 409 (section 1 for the shapes it misses) | the same |
| B2 a pending removal stops every key deletion | `attack5.clj` `pending`; `stack-shred.sh` on a stack (05:34 to 05:35 EST) | **fixed**: on the stack, a1's key row is gone 25 s after its publication while c1's removal is still pending (the first review: still there at 45 s); prediction written before the run held | `pending` phase: fixed |
| B3 the stored length names the value | `attack5.clj` c2; `attack.ts` L | **fixed** for these records: no candidate singled out (section 3) | the same |
| B4 the notice stream stops after a document value's removal | `attack.ts` S; `b4.ts` against the oracle | **fixed**: the next release is stored and recorded after the removal; the answer agrees with the oracle (section 4) | the same |
| B5 the held reader's cache in the commit window | `row19.ts` | no window: reads wait for the publication | **fixed**: not served (section 5) |
| M1 unknown names | `attack5.clj` c6; the fuzzer's refused mode | **fixed**: 400 `UnknownDerivedInput`; an empty list without a place answers clear (by design) | the same |
| M2 a restored key | `attack5.clj` c4, c8; `m2` | **fixed**: deleted at the next re-sweep without a restart; but the re-sweep's own failures are silent (section 6) | the same |
| M3 a gateway without the option | `m3` (phase `z4`) | **fixed**: before the setting it serves (200); after it, read, write, removal and journal all answer 503 `DerivedSealRequired` | the same |
| L1 a record moved to another place | `attack5.clj` c3 | **fixed**: does not open there | the same |
| L2 the 512-name limit | `attack5.clj` c1 (one of n up to 512, then 513) | **fixed**: 513 names accepted by the limit (refused only as unknown names) | the same |
| Z4 (removal review) the Reach session | `z4` | closed | closed |

Totals for the re-runs: `attack5.clj` `cases` 1,523 oracles and `pending` 8 under each boundary (05:12 to 05:13 EST), 0
violations; `cases6` 1,527 oracles each, 1 violation each (the Z2 oracle, section 7); `z4` and `m3` (runs `z4-*` and `z4m3-*`) 24 oracles, 0
violations; `attack.ts` 3 runs, no break; `row19.ts` 2 runs; the stack 1 run.

**The fuzzer, with the seal call's failures as dimensions.** `attack6.clj` `fuzz6`: attack5's schedules (three
subjects in random accounts, one to three protected values each, four to eight derived records, a removal stopped at a
random step and resumed, kills, restored keys, second removals) on a database **with the setting declared**, every
record written into a real settled page (attribute `notice/value`), and each seal call in one of five modes: ok;
failed (the call throws; the writer then stores the clear content, which must be refused); slow (the call is held
inside the gateway after its key was derived, while the removal of its sources runs, and answers after it); refused
(the call names a row the database does not hold, 400; the writer stores clear, which must be refused); mislabelled
(the writer names only unprotected rows: counted apart, as section 2's finding). Oracles: the removal completes; every
removed key is deleted; every record from a removed value opens as removed and no key the store holds decodes it;
every kept record opens to its exact content and decodes outside the gateway; every clear write is refused; every
sealed write accepted; at each block's end no native datom or journal page holds a removed value, a copy of one, or a
refused clear write.

| Run | Boundary | Schedules | Oracles | Violations | Time |
| --- | --- | --- | --- | --- | --- |
| `log-seed701` (ended 06:02:15 EST) | log | 5,000 | 128,077 | 0 | 519 s |
| `log-seed702` (ended 06:12:04 EST) | log | 5,000 | 128,000 | 0 | 563 s |
| `commit-seed703`, `commit-seed704` | commit | 10,000 | still queued for the lab's run slots when this page was first pushed (06:31 EST); see the next commit | | |

Totals over the log runs (10,000 schedules): seal calls by mode ok 32,016, failed 7,490, refused 7,528, slow 5,448,
mislabelled 7,428; **every clear write after a failed or refused seal refused (15,018 of 15,018, 409)**; every sealed
write accepted (32,016 ok and 7,428 mislabelled, 200); every slow seal answered sealed after the removal it overlapped
ran (5,448), and its records from a removed value opened as removed (3,677 records); records checked after a removal:
ok 22,508 from a removed value and 17,272 kept, slow 3,677 and 3,103; stops fired before the declaration 1,414, after
it 1,366, before the native commit 1,454, after it 1,405, at the publication 1,373 (after the guard asked 1,349, fired
0, as in the first review), none 4,096; kills 3,175; second removals 2,457; key restores 1,531; 100 block scans of
every native datom and the journal: 0 copies. Counted apart, as admitted classes: 1,930 records decoded with a key
restored after its deletion and before the next re-sweep (M2's window, under a second here), and **every mislabelled
record from a removed value still opened to it after the removal: 5,320 of 5,320, each also decoded outside the
gateway with no key** (N3).

## 9. Cost on the merged head, PostgreSQL key store (line of attack i)

`cost5.clj` run by `cost.sh pg` (in process, every option on, the PostgreSQL key store in a container of its own;
medians of 5; Mac, diagnostic): `cost-pg` 05:33:26 to 05:33:40 EST and `cost-pg-deep` 05:50:16 to 05:50:34 EST.

**The builder's figures, confirmed.** One key query per seal call in every shape (was one read per assertion).

| Shape (64 subjects; p protected values each; 3 unprotected names per record) | p = 1 | p = 2 | p = 5 | p = 20 | Builder's figure |
| --- | --- | --- | --- | --- | --- |
| Settlement frame, 64 x 6 changes: seal call (ms) | 46 | 26 | 28 | 59 | 29 at p = 1, 51 at p = 20 |
| the same frame's document written in clear (ms) | 13 | 5 | 5 | 7 | |
| Settlement frame, 64 x 20 changes: seal calls (ms) | 93 | 65 | 64 | 153 | |
| One subject owing 200 forms, 400 items: seal call (ms) | 19 | 16 | 17 | 40 | |
| Opening one subject's page of 6 changes (ms) | 2 | 1 | 1 | 1 | |
| Opening 400 items (ms) | 29 | 15 | 22 | 44 | |

(The first column includes the process's first calls.) The builder's p = 1 frame of 29 ms and p = 20 of 51 ms are
within the spread here.

**The owner's deep shape** (decisions 2026-11-19: 160 facts per subject). Each record names its subject's whole world,
as the writers do: 160 names, of which **8 are protected (my assumption: SSN, birth date, two document numbers, bank
account and routing, two more; 5% of the facts)**; the route drops the other 152 after looking each up.

| Deep shape, PostgreSQL key store | Sealed | Clear |
| --- | --- | --- |
| Settlement frame, 64 subjects x 6 changes | seal call 119 ms, one key query, **a request of 786,767 bytes** | the frame's document written: 7 ms |
| One subject's page of 6 changes | open 2 ms (on top of the read) | read 2 ms |

**What it means.** The seal call costs about 17 times the frame's own write in the deep shape, and its request is
about 12 times the writer's 64 KiB frame bound, because each of the 384 records repeats its subject's 160 names (the
gateway caches the lookups within the call, the wire does not). Sending each subject's names once per call, or letting
the gateway take them from the place (section 2), would cut the request by about six. The read side is cheap: one
call of 1 to 2 ms per page. As times these are Mac figures and diagnostic only.

## 10. Ledgers in parts and the owner's 200 forms (admission 4)

**Test P** (`era5/forms.ts`, run by `run.sh` against this head's gateway; runs `forms-2` 05:45:42 to 05:46:22 EST and
`forms-3` 05:49:38 to 05:50:06 EST). Three subjects who each owe F forms (`largeRelease(R1, forms=F,policies=F,permille=1000)`; every
subject owes every form and is sent a notice for each), the setting declared on every database, then settlement and
the recorder, then the recorder once more. Prediction written before the run (05:31 EST, `forms-prediction.txt`): the
recorder refuses somewhere between 30 and 60 forms.

| Owed forms per subject | Ledger | Setting | Settlement | Recorder | Recorder again |
| --- | --- | --- | --- | --- | --- |
| 5, 10, 20, 30 | whole | yes | stored | recorded (ledger of 6 to 31 items: 2,704 to 12,456 characters, about 400 per item) | |
| 32, 34, 36, 38, 40, 60, 100, 200 | whole | yes | stored | **stopped:** `Subject pl:s00000000: its closing piece alone exceeds the writer's bound` | **stopped, the same** |
| 200 | parts | yes | stored | **stopped:** `Native write had no receipt: Datomic read failed` (both runs) | **stopped, the same** |
| 200 | parts | no | stored | recorded (39 packets; both runs) | |

**How bad.** A sealed ledger item packs to about 400 characters against 60.8 in clear (DX-ACT6's measure), so the
writer's bound (8 ms of estimated service, 64 KiB of estimated wire, `ledger-parts.ts` 9-13) is reached between 30 and
32 owed forms instead of about 200. Above it, the only way out is ledgers in parts, which the setting refuses (admission
4), and the setting is what makes B1's fix hold. So **on a database with the setting, a subject owing more than 30
forms stops the account's notices for good**: the recorder cannot pass that subject, so every subject after it in
that release, and every later release of the account, gets no notice; settlement itself goes on. The writer's message
for the parts case does not name the setting. The builder's "about 1,700 owed forms or more" is the most a ledger in
parts can hold (1,680 items, `ledger-parts.ts` 30-33), not where parts become necessary. The owner's v0.1 requires 200
forms or more beside saves (decisions 2026-11-24): with the setting it fails, by a factor of more than six.

**What would fix it.** Cut parts at item boundaries, so each part is a list of sealed units the check can read (the
builder's own suggestion), or seal a ledger as one record per part rather than one per item (one 4 KiB-class record
of many items costs far less than many 512-byte ones), or both.

## 11. Findings

| # | Severity | Finding | Where | Test, result | Re-ran on the merged head |
| --- | --- | --- | --- | --- | --- |
| N1 | High (the owner's 200 forms) | With the setting, a subject owing more than 30 forms stops its account's notices for good: sealed whole ledgers exceed the writer's bound at 31 to 32 items, ledger parts are refused | `derived_seal.clj` 416; `ledger-parts.ts` 9-33; `frames.ts` 72 | `forms.ts` P: 30 recorded, 32 to 200 stopped twice; parts with the setting stopped; parts without recorded (section 10) | yes, `73e0d6849` is the merged head |
| N2 | High (composed; needs one operator call) | A rebuild of a missing removal log may drop a never-removed protected attribute (Z2); later values are clear, their derived records sealed under no key and accepted by the setting; their removal is refused | `removal_commit.clj` 908; `derived_seal.clj` 210 | `z2`: rebuild 200; 2 clear datoms; record `[]` accepted and decoded with no key; removal 400 (section 7) | yes, both boundaries |
| N3 | Medium | A writer that names none of a value's protected rows gets a record sealed under the key of no assertion: public, permanent, accepted by the setting; nothing checks completeness | `derived_seal.clj` 206-218 | `e1`: header `[]`, opens to the removed value after its removal, decodes with no key; fuzzer: 5,320 of 5,320 from a removed value still opened to it (section 2) | yes, both |
| N4 | Medium | The setting checks shapes only: 17 of 18 hand-made documents holding a protected value pass (side fields, the removed marker's extra keys, a forged record with a clear body, a kind one letter off the list, another attribute, capital hex) | `derived_seal.clj` 360-435 | `e1` table (section 1) | yes, both |
| N5 | Medium | The key re-sweep re-reads every removal on every pass, every second, on every gateway (35 ms at 1,000 removals here, the whole second near 30,000), and its failures are silent: a refused delete leaves a restored key with nothing counted or logged | `derived_seal.clj` 303-335 | `m2`: 1, 4, 12, 35 ms; 0 failures counted in 4 of 4, key left; the shred worker counts the same fault (section 6) | yes, both |
| N6 | Medium (cost) | Every held read fetches the whole removed set and sorts and hashes it, at least twice: 77 ms per key at 100,000 removed assertions (Mac), a 13 MB frontier | `read.ts` 119-131, 184-197 | micro-measure (section 5) | read, not run on a stack |
| N7 | Low (admitted 2, now measured) | A derived write checked before the declaration commits after it with its clear content | `storage.clj` 178 | `e2`: 200 after the setting, clear content stored; 1 of 1 each boundary (section 1) | yes, both |
| N8 | Low | A write whose journal change record differs from its row (clear text in the change) is accepted; the clear text is stored and served by the journal route | `derived_seal.clj` 424-435 | `e3`: 200, 1 native datom, journal shows it (section 1) | yes, both |
| N9 | Low (cost) | Deep shape: the seal request of a 64-subject frame is 786,767 bytes (each record repeats 160 names) and takes 119 ms against a 7 ms clear write | `bench/lib/derived-seal.ts` 108-121 | `cost5.clj` `deep` (section 9) | yes |
| N10 | Low | The refusal of a ledger part reaches the writer as `Native write had no receipt: Datomic read failed`, which does not name the setting | the bulk write path | `forms.ts` P, both runs | yes |
| B4 note | for the owner | A removed document value now counts as absent: the subject's expired-document notice is withdrawn, as for a subject without the document; W0's specification instead refuses such a world | `decision.ts` 1-10 | `b4.ts`: kernel and oracle agree on 24 worlds (section 4) | yes |

## 12. Attacked without a break

| Line of attack | Test | Count | Result |
| --- | --- | --- | --- |
| Removed value obtainable through the real writers after a failed, stalled or slow seal | `attack.ts` W, W2 (3 arrangements) | 3 accounts x 3 runs | 0 clear units, 0 copies served or stored |
| Clear copies of kept values anywhere in four databases after the whole held path, with the setting | `forms.ts` K | 578 datoms, 19 kinds | 0 |
| Stored length naming a document type | `attack.ts` L (3 runs), `attack5.clj` c2 | 4 places x 3 runs | every type fits |
| Header tampering, moving records between places, accounts, databases | `attack5.clj` c3 (2 runs) | 5 tamperings + a move, each run | all refused |
| One source of n removed, n up to 512 | `attack5.clj` c1 (2 runs) | 9 sizes each | removed, no key left decodes it |
| A pending removal and key deletion | `attack5.clj` pending (2 runs), the stack (1 run) | | fixed |
| Every write path reaching the check | code read | 5 paths | all call `tx-data` |
| The Reach session and the held reader's cache in the commit window | `z4` (4 runs), `row19.ts` (2 runs) | | nothing served |
| A removed value treated as absent | `b4.ts` | 24 worlds | kernel = oracle |
| The random nonce | reasoned | | no reuse path; 6 x 10^-12 at 10^9 records under one key |
| A gateway of this build without the option | `m3` (2 runs) | 4 routes each | 503 after the setting |
| The fuzzer with failed, slow, refused and mislabelled seals | `fuzz6` | 10,000 schedules (log), 256,077 oracles | 0 violations |

## 13. Not tested

1. **An old build beside this one** (admission 1): reasoned only (section 1); no mixed-image stack was run.
2. **A real fleet of two gateways** where one has not yet seen the declaration: in process, one peer; the held write in
   `e2` is the same case.
3. **The re-sweep with the PostgreSQL authority at many removals**: `m2` used the file authority; the PostgreSQL pass is
   one query with every handle (read).
4. **The commit-time index for questions across subjects, and the reporting copy**: not on this branch.
5. **Sizes**: toy only; the deep shape's costs are one Mac run, diagnostic. Nothing at 1 billion facts.
6. **The SDK Reach reply cache on its own**: read, not run (section 5).
7. **Size classes against free-text protected values** (names, addresses): reasoned (section 3), not run; W0 has none.

## 14. Reproducing

Every run: `DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label <name> -- <command>`, from this branch's
checkout; add `ERA5_EXTRA_ENV="TX2_REMOVAL_COMMIT_BOUNDARY=1"` for the commit boundary (in-process runs).

| File | Command | What |
| --- | --- | --- |
| `era5/attack6.clj` phase `cases6` | `bash lab/experiments/EXP-DX1/era5/inproc.sh NEW_DIR cases6` | e1, e2, e3, z2, z4, m2 |
| `era5/attack6.clj` phase `z4` | `bash .../inproc.sh NEW_DIR z4` | z4 and m3 |
| `era5/attack6.clj` phase `fuzz6` | `ERA5_N=5000 ERA5_SEED=S bash .../inproc.sh NEW_DIR fuzz6` | the fuzzer |
| `era5/attack5.clj` | `bash .../inproc.sh NEW_DIR cases` (and `pending`) | the first review's cases |
| `era5/forms.ts` | `ERA5_DRIVER=forms.ts bash .../run.sh NEW_DIR on` (`ERA5_FORMS=32,34` to choose sizes) | P and K |
| `era5/attack.ts` | `bash .../run.sh NEW_DIR on`; per account: `ERA5_EXTRA_ENV="TX2_REMOVAL_PER_ACCOUNT=1 ERA5_MOVE=1"`, plus `TX2_REMOVAL_COMMIT_BOUNDARY=1` | W, W2, L, S |
| `era5/row19.ts` | `ERA5_DRIVER=row19.ts ERA5_BOUNDARY=commit ERA5_GATEWAY_ENV="TX2_REMOVAL_PER_ACCOUNT=1 TX2_REMOVAL_TEST_PAUSE_AT=committed TX2_REMOVAL_TEST_PAUSE_MS=20000 TX2_REMOVAL_COMMIT_BOUNDARY=1" bash .../run.sh NEW_DIR on` | B5 |
| `era5/cost5.clj` | `bash .../cost.sh NEW_DIR pg` (`ERA5_COST_DEEP=1` for the deep shape) | cost |
| `era5/b4.ts` | `node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/era5/b4.ts OUT.json` (no Docker) | B4 against the oracle |
| `era5/stack-shred.sh` | `bash .../stack-shred.sh NEW_DIR BODIES_DIR` | B2 on a stack |

Runtime image for in-process runs, `run.sh` and the stack: `sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be`
(Datomic and the JVM; the gateway's source is this checkout's, mounted, and its hash is recorded in each run's
`gateway-source-sha`); PostgreSQL `sha256:526f86d93c6ea08fd3f1fe5605650cacc781b2c6013169a0ad8f42c7d3d84f32`. Evidence is
kept outside the repository as compressed archives (`DX-ERA5/r2`).
