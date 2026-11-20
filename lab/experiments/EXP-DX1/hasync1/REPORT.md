# Synchronous failover

The PostgreSQL standby saves a second copy before the writer replies.
The controller waits for evidence of failure, closes the writer route and fences the old primary and transactor.
It checks the surviving copy before promotion and sends writes to the new owner after the peer reconnects.
Pinned reads use a gateway attached to the surviving PostgreSQL copy.
The first new receipt after losing a machine has one durable copy until a standby returns.
Strict two-copy mode keeps the writer closed until another synchronous copy is available.
Timing and fault coverage will be recorded from the isolated runs.

**Priority 9.** Recovery and planned moves use [scope](../../../SCOPE.md), [north star](../../../NORTH-STAR.md) and [targets](../../../TARGETS.md). See [procedure](PROCEDURE.md).
