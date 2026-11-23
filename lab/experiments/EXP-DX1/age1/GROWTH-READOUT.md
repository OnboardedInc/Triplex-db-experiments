# Server comparison for DX-AGE1

The predictions were recorded in `51f386561` before Server 2 reached AGE1. The SCALE1 publication at `2a431952a` updates disk admission using the measured seed size and both copy reservations. There is still no verified full-seed transfer, AGE1 calibration, sealed rung or matched fresh reference in the published evidence.

Use the actual settled history count and exact cuts from the SCALE1 and AGE1 seals. Record the measurement source, attempt, slot, scope, clock, policy and bytes. A matched size comparison needs identical read inputs and owner edit depth, cache state, save width and offer pattern, index debt or copy conditions for the specific row. Carry confidence intervals and sample counts with timing comparisons. A missing comparison cannot establish flat growth.

| Prediction | Compare with the following evidence | Observed on Server 2 |
| --- | --- | --- |
| EAVT keeps three levels while leaves and directories grow | Settled EAVT main and mid census in `structure.log`, including root and directory bytes, versus the estimate at the two actual counts. | Awaiting AGE1. |
| AEVT keeps three levels while leaves and directories grow | AEVT census at both settled cuts, separating an added tier from another level in the same tree. | Awaiting AGE1. |
| AVET keeps three levels with the indexed subset | AVET census and indexed datom density at the two cuts. | Awaiting AGE1. |
| VAET stays near the source leaf count under solo K | VAET census and refs in native save material. A large VAET jump would challenge the layout or the model. | Awaiting AGE1. |
| A fixed-width current read needs bounded leaf loads | `current-recent` and `current-year-idle` read I/O by tier and returned rows, using the same fixed-width task at the fresh cut. | Awaiting AGE1. |
| A fixed-depth old pin avoids a global scan | `old-cut`, original physical t and EAVT leaf loads on the same task. A hotter task with extra history goes in a separate comparison. | Awaiting AGE1. |
| Seven feed entries need bounded leaves at fixed bytes | Compare same-length feed pages of similar age and journal byte count. The AGE1 head page alone gives an endpoint. | Awaiting AGE1. |
| Save uniqueness and predecessor work is bounded by width | Native `tx-with` I/O at equal width, placement and backlog, keyed by the measured window's transaction IDs. Latency alone cannot attribute a path. | Awaiting AGE1. |
| Index cost follows the affected tiers and novelty debt | Actual merge tier, debt and rewritten bytes at matching cuts, plus index-overlap save counts and delays. | Awaiting AGE1. |
| A fresh peer opens a small path at settled index debt | First peer `connectMs` separately from task-read I/O. Compare root bytes and leaf loads at identical debt. The process is cache-cold, with storage temperature unspecified. | Awaiting AGE1. |
| Native copy bytes and time approximately follow durable objects | Native full backup, verify and restore logs with bytes, object counts and times on matched storage. A fresh PostgreSQL dump is a different operation. | Awaiting AGE1. |

Record an absolute structural contradiction when the surveyed index adds a fourth level, or when a firmly bound directory or leaf count persistently misses the modeled size band. Use a matched fresh/aged comparison to say that a fixed-input operation grew unexpectedly. If calibration stops, publish the rate, exact acknowledged head, size and reason and leave all unrun measurement cells open. [Predictions](GROWTH-MODEL.md)
