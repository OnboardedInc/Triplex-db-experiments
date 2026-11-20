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
