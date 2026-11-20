The server run is on hold. The earlier number measured one correct read after Publish.
A release can now record what it owes in the same transaction that publishes it.
A separate mode writes the changed values, retirements and guards. Its timer ends at the last required commit.
The deadline checker now rejects a missing last read and a stale read that arrives before a late reply.
A new reader can finish an interrupted Publish. A clock worker can catch up after restart with saves idle.
The earlier crash recovered 11,960 changed rows and 997 owed notices. It proved recovery from the recipe.
The earlier save comparison measured 6.68% extra database log bytes per fact. The owner’s target was 15%.
The two timing modes now have separate databases and a raw read log. The final local gate is pending.

| Finding | Decision | Fix | Negative control |
| --- | --- | --- | --- |
| 1 Durable endpoints | Accepted | 0d85534c8, 5744dd0a4, f199db819 | Release ACK alone, and a stored proof with an owed notice removed |
| 2 Deadlines | Accepted | 5744dd0a4 and f199db819 | Missing final route probe, stale pre-ACK return, delayed seal and slow verifier |
| 3 Collector | Accepted | BM1 c07040e4b and DELTA 5744dd0a4 | Two references must fail and three exact ordered identities must agree |
| 4 Effective time | Accepted | 0d85534c8 | Future wage release and midnight expiry without a save |
| 5 Independent source basis | Accepted | 0d85534c8 and 5744dd0a4 | Terminal position differs from the proposed ordinal |
| 6 Cold arms | Accepted | 5744dd0a4 and f199db819 | The cold-witness check rejects an earlier read of the same person |
| 7 Interrupted Publish | Accepted | 0d85534c8 and 5744dd0a4 | Save first, interrupted issuer, competing Publish, save after |

OwedRecord names the original event, predecessor, source cut, index and census. Its native assertion is verified at the same cut as the release. DecodeOwed opens those bytes with dispatch idle. PersistPublication writes literal domain changes and item states, then commits the account guard with hashes and native positions for every chunk. OpenStored verifies those exact cuts and bytes. Independent Python equality is still required in the campaign before a completion receives credit.

Account.currentCut observes the durable fence and helps before returning a cut. Duplicate claims read back the original native command and position. Future activation and UTC boundaries use durable command keys. Save validity intervals add due boundaries. The clock worker can replay them on startup. The new mode binds release ordinals to their own native event positions.

The 23 original native publication schedules and the delayed, time, race, erasure and recovery tests passed at 0d85534c8. Public and historical clock tests compared cut and policy bytes. Slot recovery verified the old native owner, dead manager, container IDs, images and nonce before removing its three roles and volume. [Audit checksums](ACTAUDIT-SHA256SUMS)

The earlier 201-release result was 0.843 s p99 to one verified read, with two over one second. Its already-submitted save queue was 605 ms p99 and zero on the release at the read p99. It is diagnostic. Four separate physical WAL arms measured 4,507 → 4,808 bytes per fact and database growth 4,314 → 4,604. Individual native operation counts matched. [Part 3 checksums](PART3-SHA256SUMS)

The joined path at cff46335b uses the same release-independent ranges and durable notice intent. Share the serial release contract, declaration-driven ranges and retired-item checks. Keep record and literal completion clocks explicit. The 3.9 to 13.4 s stored projections use its compact fixture.

The bare command stays disabled. The audited command is below. Its preflight refuses missing source, raw reads, guards, notices or deadline coverage. The full result records misses separately for each mode and retains the diagnostic output when a mode misses.

`DOCKER_HOST=unix:///var/run/docker.sock node --import tsx lab/experiments/EXP-DX1/scale1/bench.ts launch 2 delta-$(date -u +%Y%m%d%H%M%S) activation --activation-mode delta --delta-audit 2`

The command schedules 45 offers per mode. It has a 160-minute work limit and 20 minutes for shutdown and collection. Three separate 100,000-person seeds project to about 175 minutes at the observed earlier seed rate, before the sweeps or proof. A three-hour completion remains unproved. No bench server was used. No acceptance pins changed.

The exact BM1 parser accepted the prior native 1,000-person output. It refused the same bytes when the reference list omitted R1, reversed the order or repeated R2. The new preflight repeats those checks on its own native output. The clock-only sample that failed integer normalization is retained without a full activation result.
