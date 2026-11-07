# Numeric language transport probes

These standalone probes reproduce Python/JavaScript numeric identity and JSON transport hazards. They are not tests of a typed Datalog implementation.

Run in this order, with no dependency installation:

```sh
python3 -B language-semantics.py
node language-semantics.mjs
```

Each script resolves its own directory, so the commands also work with absolute paths. They read/write only the named evidence beside them. The recorded runtimes are CPython 3.12.14 and Node v24.22.1. A different runtime version changes the recorded version string and should be recorded as new evidence rather than mislabeled.

The Python script seeds `random.Random` with 20261030 and creates a 1,024-value finite binary64 corpus including positive/negative zero, minimum subnormals, minimum normal, maximum finite values, 1 and the binary64 approximation to 0.1. Every corpus value carries its original big-endian bit pattern. It also records bool/int/float set collisions and a nontransitive epsilon comparison.

The JS script parses that corpus, compares the recovered bits, and checks JS JSON export/import separately. The only expected JSON round-trip bit change is negative zero becoming positive zero. It also reproduces bare-int64 JSON corruption and verifies the tagged decimal-string/BigInt route is exact. Assertions fail if those expected observations differ.

Generated evidence:

- `float-json-corpus.json`
- `python-language-semantics.json`
- `js-language-semantics.json`

The separate `duckdb_boundary_probes.py` and its DuckDB JSON evidence were produced and run by the parent investigator. They also use a disposable in-memory database only; they are not a persisted-store migration or a crash test.
