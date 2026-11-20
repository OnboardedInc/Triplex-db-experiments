Publish now reserves the account. A save can finish before that reservation or continue under the new release.
The first verified read arrived within 0.843 seconds at the 99th percentile in 201 loaded releases at 10,000 people.
Sixty-four readers ran while two accounts submitted everyday saves and bursts of 55.
Two of the 201 releases took over a second. The slowest took 1.295 seconds.
After the database restarted, a fresh reader recovered all 11,960 changed rows and 997 owed notices from the broad release.
The narrow release recovered all 38 flag changes and owed no notices. Neither release had written a concrete output chunk.
The indexes added 6.68% to database log bytes per saved fact, below the 15% target. Both arms wrote the same number of records on every save.
The 100,000-person result still requires a server run.

**Loaded publication and evidence audit**

In the earlier continuous-offer control, p99 was 1.735 s. That offer spent 1.485 s waiting for a save to finish preparation and 0.087 s waiting for a submitted save. The shorter path starts at native submission and combines the head and index check. The faster series scheduled Publish at one-second intervals and completed 1,542 saves. All 252,608 background reads matched Python. Native save queueing was 605 ms at p99 and 0 ms on the 843 ms tail offer.

The native fence checks the absence of another fence and the original command claim. Every ordinary save checks the fence at Datomic’s serial point. The terminal write checks the admitted intent, exact predecessor and claim, appends the event and releases the fence atomically. A second writer helps an interrupted publisher. A bad full evaluation records a rejection and releases the fence. The original source, release and valid-time checks still apply to delayed work.

Objects.many/commit check scope, cut, object hashes and returned assertion bytes. Account.seal/completeFence/command bind the document and command identity, actual predecessor and census. CurrentDecisions takes the cut after the batch arrives and checks the latest erasure mask. Each measured offer starts before decoding the offered document.

loadedOffers/Timeline verify a fresh current read against Python before stopping each timer, then check all 64 readers’ observations against independently replayed inputs at their native source positions. The writer records time behind the already submitted save separately from native service time. An earlier attempt stopped at a save conflict. Each attempt uses a new database, source-file hashes, slot owner, gateway and nonce.

native.ts checks the original 23 schedule names and the delayed-result, race, erasure and restart TAP results. The source and slot owner are rechecked at exit. The first native audit caught a misspelled expected test title and retained the failure.

crash.writer and recoverPower killed the issuing process immediately after the native commit and before the application received its ACK, then sent SIGKILL to the three nonce-owned PostgreSQL, transactor and gateway processes. The cold reader matched the original transaction ID, predecessor, cut, compiled release, census, ordered notice payloads and every changed row against independent Python. It checked all 10,000 subjects and 106 possible chunk/manifest keys before and after each read-only traversal. PostgreSQL reopened with fsync and synchronous commit enabled. The protected-source key directory survived both restarts.

The durable representation is the immutable release recipe, its authenticated epoch history, source/index cut and actual prior outbox. A consumer can recover every changed value and lifecycle sequence without a materialized result row. Subsequent saves reference that history by hash. The test covers process and storage-service crashes on the same host.

The pinned NOTIFY1 host read the seed, two releases and an intervening save through the existing feed. Its delivered rows matched independent Python output, including order and payload.

With separate page and root records, 111 of the 500 saves used four extra native operations. The first compact-index run alternated the order of ten paired 50-save blocks. Each arm committed 6,549 facts in 500 saves and recovered ten duplicates. Without/with indexes the WAL cost was 3,599/4,958 bytes per fact, database growth 3,480/4,782 and acknowledgment 7.57/7.75 ms per fact. price.run compared the same trace and receipts, the 62 touched people against Python and physical PostgreSQL size/LSN boundaries. Objects.decode verifies the original cut and logical page digest after applying a sparse patch. The tests also check the census complement, closed cases, old page versions and the full fallback for a newly tracked document type.

The final index puts changed leaves and their directory entries inside the existing save event. The head carries one authenticated reference. The cache checks that its native position precedes the requested cut. The negative test first reproduced an incorrectly accepted future reference. Two alternating-block observations of cluster-wide WAL changed sign when the starting order changed. They do not isolate asynchronous index maintenance.

Four fresh PostgreSQL stacks ran unindexed/indexed then indexed/unindexed. Each arm used its own empty volume, 500 original saves, 6,549 facts and ten duplicate sends. Datomic request-index/sync-index completed through the exact seed and final positions, with aligned PostgreSQL checkpoints. The means without/with the index were 4,507/4,808 WAL bytes, 4,314/4,604 database bytes, 1,039/1,075 request bytes and 4.07/4.29 ms per fact. The added WAL was 301 bytes per fact. None of the matched saves added a native operation.

physical-arms validates per-command fact and operation counts, independent final outputs, cluster IDs, unique maintenance jobs, cut ordering, physical counters, same executable inputs and removal of every preceding arm’s volume. The fail-first historical-cut test and corrected run are retained. [Part 3 evidence checksums](PART3-SHA256SUMS)

No acceptance pins or frozen workloads changed. Part 2’s original evidence is retained in [its manifest](SHA256SUMS).
