# O-TDK1: the decimal order-key oracle (RULINGS Q35, Q37c)

- `tdk1_reference.py`: R20's reference TDK1 encoder, decoder and property suite, copied unchanged from the R20 research run
  (`/Users/sam/Claude/Projects/triplex-db-2/R20/decimal_key_test.py`). Stdlib only; run `python3 -I lab/oracles/decimal/tdk1_reference.py`
  to rerun the property suite (expect TOTAL REAL-ENCODER FAILURES: 0 and all five mutants caught).
- `gen_vectors.py`: writes `tdk1-vectors.json` (fixed seed, byte-reproducible): values with declared precision and scale, canonical
  text and TDK1 key, in exact numeric order. Engine gate V5 stores the keys on each lane and checks the engine's order.
- Independence: written by the R20 research agent from the contract and prior art; it reads no packages/ code. The TypeScript decimal
  kind must be written by a different agent and checked against these vectors.

## Changes from the R20 copy (2026-11-08, Codex round 4 finding 7)
- `gen_vectors.py` built random values with `Decimal(n).scaleb(-s)`, which rounds to Python's default 28-digit context and silently
  changed 518 of 2,000 draws. It now builds each Decimal from its digit tuple and exponent and asserts equality with `Fraction(n, 10^s)`;
  526 of the 2,017 vectors now have more than 28 significant digits.
- `tdk1_reference.py` line 202 (adjacent-values suite) had the same `scaleb` rounding, so "adjacent" pairs above 28 digits were not
  adjacent. It now computes the unscaled integer exactly. The suite still reports 0 real-encoder failures and catches all 5 mutants.
- The vector file needs an independent review before its hash is pinned (V5 vector pin).
