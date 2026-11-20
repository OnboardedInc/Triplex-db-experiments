# Priority 9 merge handoff

| Piece | Where to take it |
| --- | --- |
| Shared-account routing, bounded account move, backup and early failover | Already in INT1 `a08f20103` through HA1 `6ef27404e`. Keep `ha1/one-{account,backup,failover,whole}.ts` and the account-routing gateway already there. |
| Synchronous whole-database failover, independent fence interface, planned database move and pending-save drill | Take the integrated `exp/DX-HASYNC1-sync-failover` branch. It contains `hasync1`, its dispatch in `ha1`, and the same-database resend proof. |
| Duplicate before predecessor and SDK claim lookup | Keep INT1's WFIX native transaction and SDK code. The integrated branch also keeps the interrupted claim-lookup regression and its unknown outcome. |
| Ordered import pipeline and its measurements | Take only the import changes from `exp/DX-HA1-failover-move` through `324a329d7`, including the ordered window at `14f77699b` and durable claim recovery at `31646e007`. Preserve the merged HA dispatcher and INT1 heavy admission when resolving its fixture overlaps. |

The integrated drill takes `HA1_RECOVERY_POLICY=B` by default. A opens after fencing and promotion with one durable copy and raises a durability alarm. B leaves ingress closed until a checked replacement is streaming and synchronous. A planned move always requires two copies. The Docker drill provisions a fresh volume on the old host. On real hardware a still-unavailable host needs a separate replacement before B can open. [Fence procedure](FENCE.md) · [Owner decision](OWNER-DECISION.md)
