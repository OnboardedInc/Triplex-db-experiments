# Synchronous failover

The PostgreSQL standby saves a second copy before the writer replies.
The controller waits for evidence of failure, closes the writer route and fences the old primary and transactor.
It checks the surviving copy before promotion and sends writes to the new owner after the peer reconnects.
Pinned reads use a gateway attached to the surviving PostgreSQL copy.
The first new receipt after losing a machine has one durable copy until a standby returns.
Strict two-copy mode keeps the writer closed until another synchronous copy is available.
Timing and fault coverage will be recorded from the isolated runs.

**Priority 9.** Recovery and planned moves use [scope](../../../SCOPE.md), [north star](../../../NORTH-STAR.md) and [targets](../../../TARGETS.md). See [procedure](PROCEDURE.md).

**Fault audit.** The driver checks the active SQL wait or held wire reply, binds it to the authored operation, and rereads every earlier receipt and the ordered feed on B. The replay oracle checks exact rows at successive landmarks from the same attempt. Reader probes store their requested cut and compare every returned digest after recovery. Docker startup refusal is a new process start against the same fenced volumes. [Fault driver](faults.ts) · [O-REPLAY comparison](replay.ts)

**Sync cost.** Both arms use a strict-clock lean scope and matched ten-fact saves at depths 1, 16 and 64. Each runs local flush / sync / sync / local flush with streaming enabled throughout. The comparison reports p50, p99, elapsed time per save and actual native transactions per save. The W1 grouping implementation is already in the base. [Cost driver](cost.ts) · [W1 original implementation](https://github.com/OnboardedInc/Triplex-db-experiments/commit/6756ed177)

**Planned move.** The previous lab move paused 15.47–15.62 s and opened with one copy. The new procedure rewinds A to the new timeline and waits for A to protect B's writes before routing clients. Predicted pause with a small final WAL tail is 18–29 s at 16M and 21–38 s at 160M. The second range can exceed 30 s. Estimates add startup, rewind file scans and changed blocks to the saved local clocks. Precopy grows with bytes and churn. [Move driver](move.ts) · [Prior measurements](../ha1/PART2-MEASUREMENTS.md)
