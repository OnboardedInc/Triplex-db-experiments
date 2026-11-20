The server run is on hold. The earlier number measured one correct read after Publish.
A release can now record what it owes in the same transaction that publishes it.
A separate mode writes the changed values, retirements and guards. Its timer ends at the last required commit.
The deadline checker now rejects a missing last read and a stale read that arrives before a late reply.
A new reader can finish an interrupted Publish. A clock worker can catch up after restart with saves idle.
The earlier crash recovered 11,960 changed rows and 997 owed notices. It proved recovery from the recipe.
The earlier save comparison measured 6.68% extra database log bytes per fact. The owner’s target was 15%.
A fresh loaded run, an independent full source check and the matching server collector still need proof.

| Finding | Decision | Fix | Negative control |
| --- | --- | --- | --- |
| 1 Durable endpoints | Accepted | Owed assertion at seal and separate materialized ledger | The old ACK had no owed assertion |
| 2 Deadlines | Accepted | Strict clock scorer, pending campaign wiring | Missing final route probe and stale pre-ACK return |
| 3 Collector | Accepted | Pending integration | Two references must fail and three exact ordered identities must agree |
| 4 Effective time | Accepted | Public valid clock and idle recovery | Future wage release and midnight expiry without a save |
| 5 Independent source basis | Accepted | Native ordinal on fresh audited accounts, pending independent source replay | Terminal position differs from the proposed ordinal |
| 6 Cold arms | Accepted | Pending | Reject a previously observed witness or previously published offer |
| 7 Interrupted Publish | Accepted | Read-side fence recovery and original claim replay | Save first, interrupted issuer, competing Publish, save after |

OwedRecord names the original event, predecessor, source cut, index and census. Its native assertion is verified at the same cut as the release. DecodeOwed opens those bytes with dispatch idle. PersistPublication writes literal domain changes and item states, then commits the account guard with hashes and native positions for every chunk. OpenStored verifies those exact cuts and bytes. Independent Python equality is still required in the campaign before a completion receives credit.

Account.currentCut observes the durable fence and helps before returning a cut. Duplicate claims read back the original native command and position. Future activation and UTC boundaries use durable command keys. Save validity intervals add due boundaries. The clock worker can replay them on startup. The new mode binds release ordinals to their own native event positions.

Public and historical clock tests compare cut and policy bytes. Slot recovery verified the old native owner, dead manager, container IDs, images and nonce before removing its three roles and volume. [Audit checksums](ACTAUDIT-SHA256SUMS)

The earlier 201-release result was 0.843 s p99 to one verified read, with two over one second. Its already-submitted save queue was 605 ms p99 and zero on the release at the read p99. It is diagnostic. Four separate physical WAL arms measured 4,507 → 4,808 bytes per fact and database growth 4,314 → 4,604. Individual native operation counts matched. [Part 3 checksums](PART3-SHA256SUMS)

The joined path at cff46335b uses the same release-independent ranges and durable notice intent. Share the serial release contract, declaration-driven ranges and retired-item checks. Keep record and literal completion clocks explicit. The 3.9 to 13.4 s stored projections use its compact fixture.

The existing DELTA launcher refuses the server campaign during the audit. No bench server was used. No acceptance pins changed.
