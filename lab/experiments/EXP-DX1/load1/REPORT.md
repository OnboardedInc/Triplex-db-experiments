# Loading one shared Datomic database
The original two server loads reached 4,578 and 4,669 facts per second.
A full batch took about 413 milliseconds from the previous client return.
About 72 milliseconds were spent applying it. Durable-write waiting overlapped parts of the transaction pipeline.
The client waited for each reply before submitting its next batch.
The first experiment measures how much of that interval can be removed without changing a receipt.
Local and server measurements for the new loader are pending.
The live-import target is 3,000 facts per second with each neighbour's read and write p99 within 1.5 times its own baseline.

## Evidence audit
- `profile.ts` joins each current public command to the actual native operation ID, HTTP position, source, attempt and slot. It checks exact source rows and IDs against a subsequent durable lookup. Each arm starts with a fresh physical database, verifies its final position and seals the actual expected-model journal bytes.
- `oracle.ts` compares every ordered source fact, validity, stored clock, transaction ID and assertion ID. `run.ts` checks subprocess identity and equal source seals. The HA1 manager checks image, mounts, reservation, cleanup and unchanged executed inputs before emitting observations.
- W1 is imported from `502c8897d`. Its native range proof rechecks all unique IDs and both bounds against actual ops and serialized history. Group evaluate/materialize/receipt and the client's transactCommand tie each logical receipt to the claimed operation, actual report and stored basis; ordinary writes remain the default. LOAD1 profile mode is solo and reads its metrics datom from that exact transaction.
- `Snapshot.open/write/verify` binds a native manifest to destination, source generator and packing width, compares the public ACK with the input, and commits only contiguous source progress in SQLite FULL. Reopen verifies stored receipts; final verification reconstructs every frame from source, compares durable lookup and feed to the saved identities and checks the physical rows at one pin. The gap drill withholds a committed checkpoint and checks the exact original after reopen.
- The named fresh-text wire format derives row IDs and order from the submitted canonical text. The peer repeats the ordinary identity/content validation and rejects duplicate prefixes. Only an empty historical range at the transactor permits skipping the individual history seeks. The existing seed entry point accepts `TX2_DATOMIC_SEED_IN_FLIGHT=1|2|4` for disjoint subject batches on Datomic.
