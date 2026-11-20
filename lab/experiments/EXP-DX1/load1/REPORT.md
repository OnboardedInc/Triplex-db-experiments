# Importing beside live traffic
The earlier run took its slow-save number from only 60 saves. We are repeating it with at least 500 quiet saves in each group.
All ten of the slowest saves arrived while a bulk frame was still outstanding.
The two slowest took about 132 milliseconds each. They spent 22 and 5 milliseconds waiting in the gateway queue.
We are measuring where the rest went before choosing a new frame size.
The earlier fast loader still handles quiet loads and retries a lost receipt.
The shared database and two separate-database layouts will get their own comparisons.
The Mac results are diagnostic. Server predictions and commands will be recorded before any server run.

In the archived 128-fact arm the client saw 269 frames with a median of 36.28 ms and a p99 of 170.39 ms. For nine of the ten slow saves, the outstanding frame's durable position preceded its save. One save committed before the outstanding frame. The historical native log was truncated to the final control arm.

The new 108-second bookends preserve the 50 offered saves per second, plus five quiet saves and five quiet pinned reads per second. Every published command still reconciles its full receipt and feed, and the importer verifies physical rows at the resulting pin.
- Audit. The historical analysis checks existing manifest hashes, source, nonce, slot and matching immutable receipt positions. Each new trace is produced by the live attempt's identified containers, checks the recording hash and run/source/slot, and keeps clock uncertainty for any host-to-guest overlap. The existing oracle and stack checks still guard claims, pins, physical rows, counts, identity and cleanup. No published contract pin moved.
- [Earlier loader report](PART3.md) · [Earlier predictions and commands](BENCH.md) · [Earlier attempt index](EVIDENCE.md)
