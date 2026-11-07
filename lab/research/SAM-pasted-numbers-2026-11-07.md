# Sam's pasted correction on numeric exactness, 2026-11-07 (verbatim)

Sam's ruling: this replaces the earlier "exact int64 and decimal" requirement with the corrected gate in section 5.

---

why do we need exact int64 and decimal? what is the goal here? can we not use a replacement?

Why I said "exact int64 and decimal", and what the goal really is
I overstated it. The real requirement is "no silent precision loss", not "the engine must store int64 natively". A replacement
encoding works, and the QLever lane already uses one.

1. The goal
Three reasons, all rooted in the reconciler being a pure function that has to be explainable:

Rules compare and add business numbers.
Comparisons: "pay change over $5 an hour needs approval", "pay rate at or above $16.50 minimum wage", "hours over 40".
The failure: if 16.50 is stored as 16.499999, a compliance rule gives the wrong answer, and an auditor sees it.
The same basis must give the same answer every time, on every engine.
Why: explain and audit re-read old facts and must reproduce the result exactly.
The failure: float rounding that differs between engines, or between a stored and a recomputed value, breaks that.
Silent corruption is the real enemy.
What QLever did: int64 max became -1, and 1.0000000000000002 became 1.0, with no error (research/48 §G).
The rule: a store that rejects a value is fine. A store that changes a value without saying so is not.
2. Does the domain need int64 range? Mostly no
Value | Typical size | Needs int64?
Money in cents | Even $1 billion = 1e11 cents | No. That's far below 2^53 (9e15), so JavaScript-safe integers suffice.
Hours, counts, quantities | Small | No
IDs | UUIDs and strings | No (not numbers)
Timestamps in microseconds | About 1.7e15 | No (under 2^53)
Timestamps in nanoseconds | About 1.7e18 | Yes. That's over 2^53 and over QLever's 60-bit limit (5.8e17). Use microseconds or ISO strings instead.
The "exact signed 64-bit" rule comes from Triplex's own conformance contract (research/48 §D). It is stricter than the business needs.

3. The replacement that works
Money and decimals: store as scaled integers (cents) or as decimal strings with an order-preserving encoding. The QLever lane
already does this with lexical strings and fixed-width hex order keys.
Never store floats for business values. Allow them only for approximate values like a risk score, and even then they must be
deterministic.
Error, don't convert. A value outside what the engine can hold must fail the write, never be widened or rounded.
Do arithmetic in the kernel, not the engine. Reconcile works per subject on small fact sets. The TypeScript kernel can add and
compare exactly (BigInt or a decimal library) after reading. The engine only has to:
store the value exactly,
test equality, and
sort it correctly (order-preserving encoding).
4. What the replacement costs
Need | With native exact numbers | With an encoding
Store and read back exactly | Yes | Yes
Equality and range filters | Native index | Works if the encoding preserves order
Sums and averages in the engine | Native | Hard. QLever needed two 32-bit channels for exact sums, capped at 100k rows
Sums in the kernel per subject | Fine | Fine
Analytics across many subjects | Native | Do it in a projection (DuckDB or Postgres) that has native decimals
Engine-side arithmetic over many rows is only needed for projections and analytics. Those can live in an engine with native decimals.

5. The corrected gate
Old: "exact int64 and decimal".

New:

Exact storage and round-trip for every value kind the world definition uses.
Order-preserving comparison for any attribute used in a range rule.
A hard error, never silent conversion, for any value the engine can't hold.
Range of at least 2^53 for integers.
Arithmetic over many rows only where a projection needs it.
