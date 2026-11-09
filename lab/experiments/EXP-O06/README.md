# EXP-O06 runner

North star: correctness for P1 exact record cuts and P2 atomic decisions. Goals and
measurements are `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`.

Run under the lab heavy-job grant, with at least 5 GiB host disk free:

```
node lab/bin/heavy.mjs --label CX-O06-fixtures -- python3 -I lab/experiments/EXP-O06/fixture_runner.py
node lab/bin/heavy.mjs --label CX-O06-tests -- python3 -I lab/oracles/replay/cli.py --test
node lab/bin/heavy.mjs --label CX-O06-selfcheck -- python3 -I lab/oracles/replay/cli.py --self-check
```

The fixture runner exits zero only when every authored positive observation agrees
and every negative control fails. Receipt inconsistencies directly fail; stale
answers for R-CMD-3, R-JNL-5, and R-CUT-6 fail observation comparison. Query errors
are expected answers, so an E-BASIS-NOT-AVAILABLE oracle result by itself is not a
failed oracle run. `observedQueries` is a recursive partial-object comparison;
lists have exact length and order. Missing fields fail comparison.

`golden_runner.py` is the retained O02 converter with only path/lane routing and
stagedAt/adapter propagation added. Its output directory is positional; names
beginning `baseline-` select the retained 0.4.9 source. O06_GOLD selects another
golden directory; by default it uses the frozen original golden corpus.
O02_LANE selects core or qlever. Existing converter coverage gaps remain gaps.

`gates.py` preserves the first source run; `final_gates.py` runs the final source
and migrated golden corpus. `proof.py` compares item verdicts and the full suite's
failure identities and emits SHA256SUMS for every Python oracle/test/runner file.
Frozen baseline source and complete raw case/output files remain locally under
`evidence/` and are excluded from Git; their inventory is retained with the report.
A fresh checkout can restore baseline oracle source from commit
4efe962e3faf79b3330973891b4533dae5f83704 and copy the six selfcheck SOURCES plus
lab/acceptance/{obligations.json,RULINGS.md} to the same baseline-source tree.
No package source is needed.
