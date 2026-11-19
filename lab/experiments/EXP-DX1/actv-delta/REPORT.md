Erasing a protected fact exposed a fault in DELTA’s historical notice status. The fix preserves the state that was actually published.
DELTA missed one second on the shared Mac with 64 readers when a competing save won the race to commit.
At 10,000 people the broad change affected 6,193 people. The receiver applied all 997 notices in order.
The narrow change removed 38 overtime flags and sent no notices.
One account transaction made each release visible. Readers could see the new answer before all broad changes had been stored or delivered.
Seven of eleven rules have adjustable settings. Their declared inputs find exactly whose answer changes, including wage floors two links away.
The indexes added 454 request bytes and 3,183 bytes of database log per fact in ordinary saves.
The cost at 100,000 deep subjects still needs a server measurement.

**Local Datomic and PostgreSQL results, in seconds**

| People | Release change | Changed people | Notices | First verified read | Concrete changes reopened | Dispatch finished | Full independent proof | Maximum first read under 64 readers and a save |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | broad | 628 | 116 | 0.060 | 1.165 | 1.987 | 2.533 | 1.321 |
| 1,000 | narrow | 0 | 0 | 0.053 | 0.053 | 0.120 | 0.721 | 1.571 |
| 1,000 | translated-scope | 7 | 0 | 0.177 | 0.177 | 0.374 | 1.083 | — |
| 10,000 | broad | 6,193 | 997 | 0.081 | 8.802 | 16.389 | 22.253 | 1.425 |
| 10,000 | narrow | 38 | 0 | 0.300 | 0.300 | 0.608 | 6.632 | 2.209 |
| 10,000 | translated-scope | 73 | 0 | 0.612 | 0.612 | 0.925 | 7.277 | — |
Each release used four native operations in one transaction and fetched zero subject worlds to seal. The two fixed releases are R1→R2 and R2→R3. The third changes the overtime jurisdiction after R3. The frozen 100k reference is 62,293 people and 9,798 notices, then 418 people and zero notices. Live cuts and deep fixtures have their own counts.
The comparison page publisher took 0.80 / 0.63 seconds at 1k and 7.19 / 4.39 at 10k for R2 / R3 through final publication. Each control checked every reopened outbox against Python. The DELTA screen stopped a shape at its first loaded offer of at least one second or after 20 offers. The loaded samples do not establish a tail or a server verdict.

**Evidence and acceptance audit**


1. `lookup.test.ts` compares both directions of the exact keyed posting union and all before/after row bytes for 17 release pairs at one explicit basis. A fresh Python process reads every original fact for every independently enumerated member. TAP binds a fresh nonce, census, source and fixture hashes and release bytes. The disabled-index path read all 1,002 subjects. This is a functional gate without an engine slot. [Checksums](SHA256SUMS)

2. One account transaction stores the predecessor, new release, source cut, roster/index roots, live basis and idempotent command claim. Narrow overtime stores both flag values. Broad releases store an immutable recipe. A point read replays from its actual publication checkpoint. Dispatch expands only matching people and sends retained payloads in event, subject and item order.
3. Proposed rule for review. A verified account record may represent coverage for unchanged people. A live result must still match the current release incarnation, source frontier, protected-data frontier, valid time and output bytes inside a guarded transaction. A time advance or unavailable index takes the full path. W0 and the existing verdict rules remain the authority for promotion.
4. `Account.bootstrap/head/pages/selected` bind the independent roster, validated source bodies, publication baseline, reverse membership and page hashes. `Objects.get/many/commit` compare bound native bytes at a reported cut and the requested assertion receipts. `command/seal/admit/save` guard the same account head, bind replay to the original request and retry conflicts. Raw protected inputs use disposable per-subject keys outside the database. Historical reads consult the current erasure mask.
5. `expand/concrete/drain` verify ancestry, ordered pending prefixes, content-addressed chunks and durable cursor acknowledgements. The separate receiver atomically stores effects and its idempotent incoming receipt. Original TAP checks all 23 schedule names. DELTA checks both CAS orderings, empty/unchanged guards, retroactive facts, shared floors, future releases, midnight, erasure, missing roots, rollback sequences and duplicate/gapped effects. Workers exited at each expansion/send/ACK boundary. Native identity, fresh scope, source files and released volumes are bound in `schedules-3/`. [Checksums](SHA256SUMS)

**Everyday writes on the shared Mac**

The same 500 committed saves added 6,549 facts in each arm. Ten duplicate sends recovered their originals. Indexing added 454 serialized operation bytes, 2,986 PostgreSQL database bytes and 3,183 WAL bytes per asserted fact. Total elapsed acknowledgement time per fact was 22.84 ms without indexes and 19.89 ms with them. The unindexed arm ran first on the shared host. The difference in timing cannot establish a speedup. The indexed 5–10 and 11–25 fact bands had p50 of 221 and 226 ms and p99 of 959 and 802 ms.
6. `Window.apply` binds each native assertion and its original valid time to a fresh window and idempotent claim. `price.run` matches the trace and fact denominators, verifies the final full output of all 62 touched people with Python, and records 1,000 per-command samples. The slot owner checked its own PostgreSQL database size and WAL insert positions on each boundary. The first attempt caught resend arrival time leaking into original-command identity. [Matched samples and checksums](SHA256SUMS)
7. `rungs/measure/checkRoster` match the complete independently generated population SHA, keyed before/after rows, every current read, every effective guard/outbox, ordered pending deliveries and the synthetic sink’s durable applied effects. Each elapsed clock shares the offer, cut, release, source hash set, nonce and allocated SQL stack. `screen` checks individual overlapping reads against the independent event history. `pageControl` checks both releases on a fresh reference scope. Earlier attempts exposed the gateway’s 64-root read limit and fractional timing values in a domain encoder. The reference transactor was killed at the larger page size. A later control used 64-person writes bound to individual roster ranges. [Checksums](SHA256SUMS)
The narrow record uses stable subject IDs and both flag values. This costs more bytes than the proposed 32-bit ordinals and permits direct interpretation without swapping an ordinal dictionary on restore. A missing index page or release ancestor reopens the exact original native claim. A missing index and unavailable journal use the separately committed census and full evaluation. A missing historical publication without a recoverable original stops the read.
8. `erasure.test.ts` first reproduced the prior release being reinterpreted after erasure. The current read masks the value. Historical outbox replay uses the original retained publication and the vault refuses an older restored copy after the key is erased. The owner still needs to rule on logical coverage and which completion clock defines the one-second target.
