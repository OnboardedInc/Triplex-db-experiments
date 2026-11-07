"""V-O02 fix F1 feasibility: apply the smallest change that makes O-REPLAY's own tests pass against contract 0.3.3
to a SCRATCH COPY of the oracle (never the repository's oracle), then run `cli.py --test` there.

F1 = (a) transcribe the six ACC 4.7 rows added in 0.3.3 into errors.ERROR_TABLE (not added to PRODUCED: the
oracle does not produce them yet), (b) a named test for ACC 4.4 AG-SUM-ONE-ENTITY (added in 0.3.2) that
evaluates its three contract examples.

  python3 -I lab/verify/O02/tools/f1_feasibility.py SCRATCH_ROOT   (SCRATCH_ROOT holds an extracted copy of lab/)
"""
import subprocess
import sys
from pathlib import Path

root = Path(sys.argv[1])
err = root / "lab/oracles/replay/errors.py"
t = err.read_text()
anchor = '    "E-OUTCOME-UNKNOWN": ("TransactionOutcomeUnknown", "outcome-unknown", "outcome"),\n'
assert t.count(anchor) == 1
t = t.replace(anchor, anchor + '''    "E-INEXACT-JSON-NUMBER": ("InvalidTripleError", "invalid-value", "preflight"),
    "E-NEGATIVE-ZERO-INSTANT": ("InvalidTripleError", "invalid-value", "preflight"),
    "E-DECIMAL-OVERFLOW": ("DatalogValidationError", "decimal-overflow", "execution"),
    "E-DECIMAL-BARE-DIVIDE": ("DatalogValidationError", "decimal-divide-requires-scale", "preflight"),
    "E-DECIMAL-FRACTION": ("DatalogValidationError", "decimal-fraction-not-zero", "execution"),
    "E-DECIMAL-NARROWING": ("WriteError", "decimal-narrowing-loses-digits", "preflight"),
''')
err.write_text(t)

test = root / "lab/oracles/replay/tests/test_contract_section4.py"
t = test.read_text()
anchor = '    "AG-SUM-F": {\n'
assert t.count(anchor) == 1
t = t.replace(anchor, '''    "AG-SUM-ONE-ENTITY": {
        "SUM(:conf/amount) with 10 asserted twice on entity agg:c": lambda: _one_entity(["agg:c", "agg:c"], "sum"),
        "COUNT with the same fixture": lambda: _one_entity(["agg:c", "agg:c"], "count"),
        "SUM with 10 on agg:a and 10 on agg:b": lambda: _one_entity(["agg:a", "agg:b"], "sum"),
    },
''' + anchor)
anchor = "def _stored_negative_zero():\n"
assert t.count(anchor) == 1
t = t.replace(anchor, '''def _one_entity(entities, op):
    ops = [assert_op(f"m{i}", e, ":conf/amount", i64(10)) for i, e in enumerate(entities)]
    rep = evaluate(case([{"clock": 1, "operations": ops}],
                        [{"id": "q", "kind": "aggregate", "cut": {"validAt": 1},
                          "match": {"attributes": {"amount": ":conf/amount"}},
                          "aggregates": [{"op": op, "var": "amount", "as": "x"}]}]))
    return V.integer(int(result(rep, "q")["rows"][0]["x"]["value"]))


''' + anchor)
anchor = "    def test_AG_SUM_F(self):\n"
assert t.count(anchor) == 1
t = t.replace(anchor, '''    def test_AG_SUM_ONE_ENTITY(self):
        self.check_examples("aggregateRules", "AG-SUM-ONE-ENTITY")

    def test_AG_INT_RESULT(self):
        big = [{"clock": 1, "operations": [assert_op("k", "e", ":s/v", i64(2 ** 62 + 1))]}]
        out = self.agg([{"op": "sum", "var": "v", "as": "s"}], cmds=big)["rows"][0]["s"]
        self.assertEqual((out["type"], out["value"]), ("integer", str(2 ** 62 + 1)))   # canonical text, not a JS number

''' + anchor)
test.write_text(t)
proc = subprocess.run([sys.executable, "-I", str(root / "lab/oracles/replay/cli.py"), "--test"], capture_output=True, text=True)
print(proc.stderr[-600:])
sys.exit(proc.returncode)
