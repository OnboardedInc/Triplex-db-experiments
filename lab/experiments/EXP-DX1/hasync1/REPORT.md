# Sunday failover at full size

The Sunday run is ready to take into INT1. It uses ten accounts in one database and starts from the same stopped 126 GB copy on each server.
Run server A first, then server B. The plan reserves 234 of the 240 minutes and uses the existing SSH port.
On the first failure, I expect every acknowledged save to survive under either policy.
I expect B to take 4–14 minutes to reopen saves while it rebuilds protection. A should reopen in 18–65 seconds, with one copy.
A second failure during that one-copy window is expected to make 150–2,050 acknowledged saves unavailable, depending on the save rate.
The planned move is forecast at 25–65 seconds against the 30-second limit. Sunday will supply the first full-size two-server measurements.
The organizer needs to publish the merged INT1 build, match the two cold copies and enable the dedicated SSH tunnel before 05:00.

## Driver handoff

[Two role commands, inputs, budgets and forecasts](SUNDAY.md) · [One-page reading sheet](SUNDAY-READING.md) · [Owner options](OWNER-DECISION.md) · [SDK retry contract](SDK-RETRY.md)

Built against INT1 `8ae07b227690fd760aa5fd8cec9055c3147170da`, merged locally at `2b60cc4c8`. Use the new INT1 commit after bringing over this change. Both roles verify the built package bytes and the pinned image IDs before starting. The run uses the `server` profile with Java 21 G1 and the ordered field writer. It records the live JVM flags and synchronous PostgreSQL settings.

Each arm clones a fresh work directory on each server. The B rebuild uses the original staged seed plus retained WAL from the promoted timeline. The A second-fault observation queries the previously fenced disk in recovery after stopping B. The run never deletes a seed or destroys B's disk to prove loss. It exercises loss of the database processes on a reachable host. Provider power fencing, emergency restoration to a blank replacement server, and the third-copy policy are outside this weekend's test.

## Mac correctness

At 1,210 facts the Policy B lost-reply and planned-move rehearsals settled all 167 scheduled saves once, including 138 retries with the original command, and returned 1,658 exact reads within the caller deadline. The stopped-directory gate used two PostgreSQL containers. The first attempt caught the Alpine checksum option mismatch before startup. On the corrected attempt the cold standby booted, kept the first record after promotion, then replayed the two later records in order from the original seed on the new timeline. The archive keeps the first failure and three successful attempts, each with its source, slot and cleanup record. Mac clocks are diagnostic.

HA TypeScript and the Core and Datomic builds passed. Three Sunday checks and fourteen HA and scorecard checks passed. The first mixed test invocation used Vitest on Node test files. The separate correct runners passed. The full monorepo suite and the actual SSH, full-size load, copy and recovery measurements on the two servers are pending.

## Receipt and verdict audit

- Cold-copy marker and toy receipt. The verified manifest, every cloned file and clean PG17 system identifier match. The role's live read-only mount, image, nonce and fresh container ID bind the report. The toy checks exact ordered records through replay at the recorded LSN.
- Original size and scope. Both servers check the independent SCALE1 transfer and image digests, the original checkpoint, and the stopped-directory hash. The live gateway checks the one database, recorded cut, terminal and manifest claims, and exact account rows.
- Scheduled saves and reads. The fresh nonce names operation IDs. The proxy ties each completed ACK to the route that forwarded it. The survivor returns the same ID, position, Datomic transaction and clock. Field samples match written values and scheduled read rows match the pinned expected values. Missing or changed observations remain in the first attempt's evidence.
- B and the move. PostgreSQL confirms the promoted timeline, the verified replica in recovery and its synchronous flush at or beyond the checked cut. The timing comes from the actual fault or seal and a confirmed new-route receipt. The A second-fault comparison requires both transactors and B's data process stopped and the exact A disk in recovery without upstream.
- Link and returning disk. The tunnel compares fresh random probe bytes with a loopback control. The optional return checks the exact fenced containers and disk, observed refusal and the same attempt's system identifier. Evidence archives have SHA-256 sidecars. No acceptance pins changed.

[Mac evidence archive checksum](SHA256SUMS.archives) · [Previous integration and branch map](INTEGRATION.md) · [Previous gate audit](EVIDENCE.md)
