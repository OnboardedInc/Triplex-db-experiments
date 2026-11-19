One shared database has one durable write pipeline. A 5–6.7 ms cycle would carry about 150–200 saves/s.
The saved trace has no sustained saturation trial. Its overlapping burst completions averaged 3.03 ms apart, about 330/s in those intervals.
The previous 41.70 ms p99 is the time a caller waited. It includes transport, processing, storage and notification.
Grouping can pay one append and notification for several waiting commands. It cannot remove their fact checks or receipt writes.
The saved 100k seed sustained 4,669 facts/s when writes carried about 2,000 facts each.
A fit to busy small writes gives an optimistic 11,555 facts/s limit if all fixed work can be shared. The seed and live workloads differ.
Ten deep accounts would share the resulting capacity. The quiet account's p99 needs a separate comparison against its own baseline.
Group throughput and the quiet-account ratio are pending measurement.

**P2 and P6.** Targets come from `origin/main:lab/TARGETS.md` §1.2. Group commit is opt-in. The earlier range-check work and its queued server command are at `5ff0793a:w1` under this experiment.
**Busy costs.** The saved 100k thin arm had 1255 burst primaries already submitted when the previous observed native transaction completed. At 12.87 facts/save, the completion-gap median/p99 was 1.69/16.10 ms, apply 1.40/15.50 ms and native read-through-log 5.25/44.60 ms. The median-by-size fit was 0.672 + 0.0865 ms/fact for completion gaps and 0.447 + 0.0865 ms/fact for apply. Stages overlap. The fixed term is a fit, not measured flush time.
RE1 observed two autocommitted PostgreSQL statements per tail append, synchronous WAL acknowledgements, thread handoffs and peer notification. Its separately instrumented steady run had 1.9 ms send, 4.1 ms native, 2.0 ms return medians and a 1.07 ms pod-update median. The selected burst run’s native-completion-to-gateway-end median was 0.401 ms.
At this mix, sharing the entire fitted intercept across four/eight/sixteen commands gives 780/835/865 commands/s (10,040/10,744/11,135 facts/s). These are arithmetic limits from typical gaps, before per-command overhead and stalls. The cited 5,000–20,000 traditional commits/s is an external comparison supplied in the brief. No matched traditional database run is in this evidence.
**Audit.** `group/cost.py` checks consumed file hashes, source/slot/boot, native database/t, submitted and completion bounds, and all 7,408 primary ACKs. `DX-W1/group1/busy-cost.json` lists inputs and denominators. [Evidence hashes](SHA256SUMS)
