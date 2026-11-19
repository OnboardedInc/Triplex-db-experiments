# Recovery of one shared database

The owner is considering one database for all accounts. The proposed ceilings are 60 seconds after transactor loss and 30 seconds for a planned move. Pinned reads and every acknowledged write must survive. The ceilings await confirmation.

**Priority 9.** The single-database drills record new writes, the pinned reader, and preserved receipt identities. The first study used one database per account. [Part 1 results](PART1.md) · [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

**Evidence audit.** The normal engine reservation, source, mounted bytes, role IDs, nonce and cleanup bind each drill. The observer reads batched native receipts from one immutable database value. Population checks every seed receipt and full facts at three pins. Each fault compares all receipts, each live feed change and the old pin with the authored inputs. Broker and peer milestones are observed independently. Each result records attempted and admitted size. [Failure drill](one-failover.ts)

At 163,840 seeded facts in ten tenants, four transactor losses resumed in 8.50–24.95 seconds. The reader saw zero errors at its historical pin. The slowest case combined a recent unindexed tail with 83 acknowledged writes/s before the fault.
The restore drill checks the vendor manifest and cut or the PostgreSQL file manifest, archive segment, restore point and cluster identifier. Each fresh restore tests every original receipt through its cut, every missing operation after it, the historical pin and the exact subsequent feed. The synchronous-cost drill checks the streaming mode and reads back every original receipt after primary removal. [Backups](one-backup.ts) · [Physical cutover](one-whole.ts)

**Cutover audit.** The physical drill proves the SQL writer fence, replica flush and replay LSN and cluster identity, then exercises the old pin, withheld acknowledgement, native feed and every original receipt. The tenant drill binds a canonical command, receipt, native feed projection and actual row-value digest to each account and sequence. It advances a durable destination checkpoint after readback and gates activation on the fenced source generation and digest. Router publication uses a persistent compare-and-swap. The same pending write and an independent neighbor time the cut. [Tenant drill](one-account.ts) · [Copy and router](placement.ts)

The two-machine controller exposes five fresh-tag commands and a 160-million-fact rung. The transferred archive binds both machine identities, content hash, campaign nonce, revision and each requested size to the completed observations. [Bench commands](BENCH.md#shared-database-experiments)
