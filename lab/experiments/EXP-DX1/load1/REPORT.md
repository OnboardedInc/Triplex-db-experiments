# DX-HA1 · Import alongside live saves

An import now shares the same write credits as live saves. It cannot take the quiet account's reserved credit.
At 32 facts per frame, the import needs 94 durable frames per second to meet the target.
We expect 1,400–2,400 facts per second with the six-credit barrier and 2,400–3,350 with rolling credits.
We expect quiet saves at 48–78 ms with the barrier and 35–52 ms with rolling credits. Live reads still need to meet their own limit.
The Mac run is a correctness check. A server run is needed to establish both the speed and the effect on neighbours.
The [server command](FAIR-SERVER.md) runs both credit modes in one database with 235 other saves per second. It allows under 60 minutes.

- Built against INT1 `057cc1eb4`. The current sender is unchanged unless an import producer is enabled. Frame size and its concurrent credit limit are settings. In barrier mode a quiet arrival after a turn starts still waits for that turn. Rolling retains an immediate quiet grant when otherwise eligible.
- A full deep-account load takes roughly 89 minutes at the target. The five-minute test offers that much input lazily and measures the verified portion by half. The workload has one immutable subject per frame and preserves its feed order using the standard command sequence.
- The [predictions](PREDICTIONS-PART7.md) give the arithmetic, limits and fallback. If saturated neighbours leave too few grants, an importer holding one fair share cannot reach the target there. An isolated request process with a shared serial budget would still need at least 94 frames/s at this width.
- Run the [Mac correctness gate](FAIR-SERVER.md#mac-correctness) under a single ordinary token. No bare-metal execution was dispatched.
- Audit. The existing command receipt path holds the grant through durable response or claim recovery. Stable command, transaction and assertion IDs bind the source stream, frame width and ordinal to its exact rows. Measured results require a fresh nonce, slot, source, write options, restored image pin and fresh journal suffix. The comparison verifies the live receipt and journal, each imported native journal digest and every imported row, and accounts for all offered reads and saves. The diagnostic exercises a discarded reply and checks the original receipt and unchanged head after retry. No new verdict is generated.
- [Part 6](PART6.md) preserves the fixed and feedback pacing experiment and the earlier evidence. [Priority 9](../ha1/BENCH.md#version-01-recovery-row-on-one-server) has the separate fault and move commands.
