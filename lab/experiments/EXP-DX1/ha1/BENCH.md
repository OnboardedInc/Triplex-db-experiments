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
