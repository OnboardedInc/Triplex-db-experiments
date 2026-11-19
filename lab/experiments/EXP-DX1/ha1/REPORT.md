# Recovery of one shared database

The owner is considering one database for all accounts. The proposed ceilings are 60 seconds after transactor loss and 30 seconds for a planned move. Pinned reads and every acknowledged write must survive. The ceilings await confirmation.

**Priority 9.** The single-database drills record new writes, the pinned reader, and preserved receipt identities. The first study used one database per account. [Part 1 results](PART1.md) · [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

**Evidence audit.** The normal engine reservation, source, mounted bytes, role IDs, nonce and cleanup bind each drill. The observer reads batched native receipts from one immutable database value. Population checks every seed receipt and full facts at three pins. Each fault compares all receipts, each live feed change and the old pin with the authored inputs. Broker and peer milestones are observed independently. Each result records attempted and admitted size. [Failure drill](one-failover.ts)
