# Two-site recovery drills

Run from the published experiment branch with Node 22 and the built workspace. Set `BENCH_SERVER` and `BENCH_SERVER_B` to the two assigned SSH destinations, `DX_BENCH_KEY` to the operator's key, and `HA1_LINK_A` and `HA1_LINK_B` to the hosts' mutually reachable private IPv4 interfaces. The two dedicated hosts need the existing lab bench account, pinned SSH host keys and noninteractive sudo. On each released server the orchestrator provisions `/var/tmp/triplex-ha1/platform/dedicated.json` with role `DX-HA1` and its own `machineIdSha256`, as in SCALE1. The private link must be restricted to the two assigned machines.

One command starts each experiment. Give every run a fresh tag.

```sh
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts failures pair-faults
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts move pair-move
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts replication pair-sync
```

The controller verifies the anonymous branch ref, assignment and distinct machine identities, takes both leases, and prepares the same detached public revision on both machines using BM1's native bootstrap. Node and the evidence clock run on A. B's management requests travel over the operator's second SSH connection. Datomic, JDBC and WAL travel on the private link. The operator's SSH key stays on the operator's machine. Each run has a six-hour systemd ceiling. The controller retrieves and hashes the attempt archive, including failed trials. A remaining owned container holds the host's lease for inspection.

- **Failures.** A runs the primary SQL store, original transactor and write/read gateways. B runs the standby. Five separately named databases each start with 2,000 subjects of 160 facts and receive independent writes. HA1_PEOPLE sets the subject count. Each command retains its identity across transport retries. A fresh write starts immediately after each fault. The measured interval brackets the Docker kill and includes retries through the replacement. The read and write gateways use the same client endpoint across a restart.
- **Move.** A's neighbor writes to a separate Datomic storage database on the same PostgreSQL primary. The moving account has a dedicated SQL principal and storage database. B has distinct PostgreSQL storage. The same backup location supplies a concurrent precopy and a final verified restore. The destination stays offline until the final restore finishes. This deployment fences all source write-capable processes for the account through the SQL principal. The fixture contains synthetic, unprotected facts. The default seed rungs are 500, 2,000 and 5,000 subjects of 160 facts each. Set `HA1_PEOPLE=100000` to measure a 16M-fact move on a pair with room for source, backup, target, WAL and verification.
- **Replication.** A runs a PostgreSQL 17 primary and B a streaming standby. Two alternating pairs compare local flush and named synchronous standby flush at the Datomic receipt. After a remote-flush witness, the drill kills and fences the primary, promotes B, rechecks every previous command, and submits one new write. The promoted primary then has one copy until a replacement standby joins. Process loss and isolated storage are exercised. Power loss of an entire host requires a separate physical fault.

For the local small drill, build the Datomic package and run `node lab/bin/heavy.mjs --label DX-HA1 -- node --import tsx lab/bin/engine.mjs ha1 --holder DX-HA1 --slot s1 --experiment failures`. Choose `move --people N` or `replication` for the other arms. The engine obtains the exclusive slot and records the actual role caps. No resident or retained slot volume is used.

## Shared-database experiments

Run these on the released pair. Each command acquires both machines. The first three use one physical Datomic database with ten interleaved tenant prefixes. Each subject contributes 160 current application facts. The account extraction uses two independent Datomic databases containing multiple tenants. The drills use new storage and verify the actual source revision, both machines, input hashes and exact outputs on every rung.

```sh
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts one-failover shared-election
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts one-backup shared-backups
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts one-sync shared-sync
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts one-whole shared-promotion
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts one-account tenant-extraction
```

- **Transactor failure.** Seed 1,000, 10,000, 100,000 and 1,000,000 deep subjects, reaching 160 million application facts at the last rung. Four abrupt elections per rung vary recent index completion and offered writes. The source PostgreSQL storage stays on A and the two transactors alternate between A and B.
- **Machine recovery.** Seed 1,000, 10,000, 100,000 and 1,000,000 subjects. B stores the Datomic backup and a physical base with WAL as they arrive from A. Remove A's primary and both application processes. Verify independent fresh restores of B's captured bytes, inclusive recovery cuts, absent ACKs and the time to an actual application receipt.
- **Commit cost.** At 1,000 subjects compare 4,096 ten-fact Datomic writes per policy in alternating blocks. B must report a streaming flush before A is destroyed and B promoted. Both the raw sample arrays and the block p99s are retained.
- **Whole database.** At 1,000, 10,000, 100,000 and 1,000,000 subjects a live physical standby follows A. Deploy the destination peer during precopy, then revoke the source writer, wait for the exact flushed LSN, promote B and switch writes. Historical reads may use the read-only A until B answers the same pin.
- **One account.** At 100, 1,000, 10,000 and 100,000 subjects, red moves from A to an already populated database on B. Blue writes on A throughout. An interrupted logical copy resumes from its verified checkpoint. The final fence covers at most eight one-position commands, each with at most 160 fact rows and 512 KiB of encoded input. The coordinator exercises a three-fact final change.

Set `HA1_PEOPLE` to a comma-separated list of subject counts to select rungs. Set `HA1_BENCH_HOURS` to the released reservation length when the default six-hour ceiling is too short. The large-rung preparation is included in that budget. A last rung that runs out of time supplies no observation. Size here counts authored facts. The default runs use deep subjects. The optional mixed run also measures wide and small tenants.

The optional `HA1_BENCH_SHAPE=mixed` population adds three wide accounts of 4.5 million, 3 million and 1.2 million subjects at eight facts each, plus 100 small accounts of 50 subjects at 80 facts each, alongside the ten deep accounts at the full rung. Smaller rungs scale these additions proportionally. For example, `HA1_BENCH_SHAPE=mixed HA1_PEOPLE=1000000 node --import tsx lab/experiments/EXP-DX1/ha1/control.ts one-failover full-mix-election` requests 230 million current facts in one database. The source and observation record actual counts. The annual history horizon remains a separate input.

For a local capacity measurement, `--slot auto --experiment one-failover --people 1000000 --fault-cell tail-burst` spends the larger part of one admission on seeding and executes one saturated fault. The capacity arm reserves 3 GiB for storage and stops growth at 2.25 GiB of measured PostgreSQL allocation, the host free-space floor or the seed deadline. The ordinary four-cell experiment reserves more time for fault injection.
