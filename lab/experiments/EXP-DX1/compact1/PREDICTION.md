# Bare-metal prediction for ten deep accounts

**North star.** P2 and P6 durable save tail at 235 and 394 offers/s, with P9 durable receipts. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

| Single-Datomic-system scenario | Saturated saves/s | p99 at 235/s | p99 at 394/s | Capacity after reserves |
| --- | ---: | ---: | ---: | ---: |
| Original packed route in isolation | 733 | 31 ms | 34 ms | 467/s |
| Stored journal in isolation | 526 | 57 ms | 62 ms | 335/s |
| Stored journal, retained histories, readers and import | 452 | 72 ms | 124 ms | 288/s |

My forecast for the command below is **450 saves/s** at saturation and **72/124 ms p99** at 235/394 offers/s, with both paced windows draining. The 394/s peak leaves too little margin for one pooled system. This is a pooled counterfactual under Q106f. Deep accounts in the tiered deployment have isolated storage roles. [Q106f](../../../acceptance/RULINGS-PENDING.md)

The seeded queue model runs batches of up to eight as soon as work is ready, and applies the original, stored-journal, or mixed service priors. The mixed prior uses 3.1 ms fixed plus 1.62 ms/member, a uniform 0–0.7 ms perturbation and 10–55 ms of extra delay in 4% of groups. These are explicit penalties for more durable rows, history preparation, misses and neighboring traffic. Each run applies 15% maintenance capacity and then 25% spare capacity for planning. [Deterministic queue model](prediction.mjs)

The Mac stored-journal control ran 502–636 saves/s at fixed groups of eight before post-ACK verification. With 64 unpaced polling readers in one two-vCPU peer, the neighboring import reduced compact goodput by 24–29% from the reader-only controls. The forecast uses a 14% reduction between its quiet and mixed stored-journal scenarios. It assumes paced server readers and greater CPU capacity reduce that penalty. The server distributions and all-offer counts can falsify the capacity and p99 values directly. [Attribution](ATTRIBUTION.md) · [Mixed traffic](MIXED.md)

Run from a clean checkout on a provisioned bare-metal SQL stack with the pinned Datomic distribution and this checkout's compact namespace on the transactor classpath. Supply the SQL settings using the stack's private environment.

```sh
bash lab/experiments/EXP-DX1/compact1/bench-server.sh
```

The command seeds one fresh database with 1M people and 160M business facts, then ages 512 people in each of the three live cohorts plus the 64 reader subjects to 415 events. Timed writes, imports and generated history use actual stored journal rows and checkpoints at a 64-event cadence. Each window uses 64 pinned readers and a paced attempted import at 3,000 facts/s. The three windows offer 14,100 at 235/s, 23,640 at 394/s and 24,000 at closed-loop depth 64. It reports reader progress, accepted imports, native group occupancy and complete receipt readback. The initial bulk seed still uses packed snapshots. Production-scale erasure, the targeted reverse worker, activation and notice delivery need their own tests. This command was not run on a bench server.

Build the corrected incremental writer first and keep whole accounts movable. Carry every stored journal triple forward and price exact guarded preparation. To pursue the compact layout beyond W0, require the business query projection, full protected key and restore workflow, and isolated quiet-account tails to meet their respective contracts. A personal save on the compact source becomes a single durable native group slot, and keeping all that work and the raw surfaces on one system is the trade the forecast prices.
