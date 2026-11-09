# EXP-O06 round 3

North star: P1 reproducible cuts, correctness floor; scope/targets are lab/SCOPE.md,
lab/NORTH-STAR.md and lab/TARGETS.md. Offline oracle coverage only.

Use a new attempt path and at least 5 GiB host free disk:

```
node lab/bin/heavy.mjs --label CX-O06-round3 -- python3 -I lab/experiments/EXP-O06/round3/gates.py lab/experiments/EXP-O06/round3/evidence-new
node lab/bin/heavy.mjs --label CX-O06-round3-seal -- python3 -I lab/experiments/EXP-O06/round3/finalize.py lab/experiments/EXP-O06/round3/evidence-new
```

The gate runs the unmodified suite, selfcheck, existing fixtures/probes, golden
comparisons and six isolated full-suite trials with the exact reviewer variants.
It refuses an existing attempt; a failed attempt stays failed. A passing gate
requires the correct source to pass all 403 tests and every wrong variant to fail
only the intended rule tests (including K's related L scope check). Diagnostic runtime file hashes do not identify the
in-memory substituted implementation: use the named variant, captured original
variant-source hash and wrapper bytes. The seal checks source/input/log and
case/output provenance, inventories retained raw files and refreshes SHA256SUMS.

Fixtures Q70E/H/I/K and Q70L entity/scope are authored JSON. Q70E is a documented
primitive-level source-answer fixture; the others use public case inputs. Expected
answers and negative assertions are in tests/test_q70_coverage.py. The registry
maps contract ids to executed tests, preserving the explicit legacy future-position
error as a compatibility mapping. It does not change the machine contract or
oracle runtime behavior.

Prior attempts are historical. Final round-3 evidence is evidence-attempt3;
REPORT-round3.md explains the earlier test-shape errors and every PASS boundary.
