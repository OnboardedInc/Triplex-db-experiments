# Erasure regressions on the integration branch

**North star** P1, P3 and P5. Check whether every read, replay and publication honors the latest erasure, including at a data cut that predates it. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

The original regression fixture runs against merged integration source `4c9a28fa62752329d0d356439a708e3b442ecd32`. The corrected baseline includes the updated integration seed at `30b278e95f80404f2bd4a8318925b7a72a82c765` and leaves the ledger disabled. It enrolls 24 synthetic deep subjects and edits the selected field five times. Every check keeps the original assertion identity and looks for the typed marker with the erasure's recorded instant. The native red gate runs with `node lab/bin/heavy.mjs --label DX-ERASE1 -- node lab/bin/engine.mjs erase1 --holder DX-ERASE1 --run regression --people 24 --out fresh-regression`. The per-attempt files and compiled JavaScript hashes identify the exercised source and build.

| Boundary | Red expectation and positive control |
| --- | --- |
| Held gateway and fresh history | Read the canary on the held handle before native excision. At the same cut after synchronization, require the original identity and typed marker. Check the current history independently. |
| Replica and retained snapshot | Bootstrap real replica rows, take a snapshot, and advance the follower to a later verified receipt. Require both local views to apply the later erasure. |
| Feed and resume | Require an identity-only erase event at the native excision t. Resume from its actual offset with a new client. |
| Journal | Find the old typed assertion inside the original journal before excision. Read that same assertion change after the barrier through the gateway and the typed composition feed. Require its exact marker. |
| Archive import | Replay the original synthetic value through `ImportRun` and test whether a new current read can obtain it. |
| INT1 Publish | Capture the real Publish's cut. Complete the erase during its first checkpoint. Require the old input projection to lose the value before any further publication. |
| Staged sender and recipient | Submit a pending synthetic payload through `Dispatcher.receive` and decode the actual recipient effect and ledger rows. Require the stale packet to be declined. |
| Joined marker and chunks | Use the real `JoinedAccount.publish` and `physical` readback. Require a protected-scope marker and staging manifest that bind the current erasure sequence. |
| Backup restore | Back up before the erase, stop the two owned Datomic services, restore in the private SQL stack, and reopen the same logical scope. Require the original assertion to come back as its marker. [Datomic restore procedure](https://docs.datomic.com/operation/backup.html#restoring) |

The fixtures use separate account scopes for the isolated Publish and recipient. Notice and joined APIs follow the integration copies of those paths. The branch-only changes beyond that integration head have separate source histories.

## First red run

`p2-red-24a` observed the exact protected value in both replica views, the held gateway and the old journal. Fresh history lost the assertion. The native lean feed declined. `ImportRun` replay stored the value again, and INT1 Publish committed two pages from the old projection. The real sender accepted the stale synthetic payload. The recipient stored it in both the effect and its ledger.

The joined fixture's first attempt stopped on W0 input typing. The restore attempt stopped on incompatible JVM heap flags after the native backup was made. The fixtures now use typed W0 input and explicit JVM limits. The first failures are retained in the [manifest](P2-RED-SHA256SUMS), relative to `evidence/DX-ERASE1/`.

`p2-red-24b` reproduced all twelve red checks. In addition to the first observations, it materialized and read back a joined release at position 8 with no erasure sequence on its published marker or stage. The native restore tool succeeded, and a fresh gateway returned the original assertion and exact old value.

Receipt audit. Each raw case binds the attempt digest, original assertion ID and data position. The fixture compares the actual typed value before erasure, the native request t and instant, and the new bytes on each route. The recipient is checked through separate effect and ledger readbacks. The joined check binds its actual release marker and staged chunks. The restore helper records the owned native tool, exact scope and exit, then requires a fresh gateway read at the original assertion ID. The red trace makes no acceptance claim.
