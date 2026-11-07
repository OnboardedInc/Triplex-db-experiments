# O-TDK1: the decimal order-key oracle (RULINGS Q35, Q37c)

- `tdk1_reference.py`: R20's reference TDK1 encoder, decoder and property suite, copied unchanged from the R20 research run
  (`/Users/sam/Claude/Projects/triplex-db-2/R20/decimal_key_test.py`). Stdlib only; run `python3 -I lab/oracles/decimal/tdk1_reference.py`
  to rerun the property suite (expect TOTAL REAL-ENCODER FAILURES: 0 and all five mutants caught).
- `gen_vectors.py`: writes `tdk1-vectors.json` (fixed seed, byte-reproducible): values with declared precision and scale, canonical
  text and TDK1 key, in exact numeric order. Engine gate V5 stores the keys on each lane and checks the engine's order.
- Independence: written by the R20 research agent from the contract and prior art; it reads no packages/ code. The TypeScript decimal
  kind must be written by a different agent and checked against these vectors.
