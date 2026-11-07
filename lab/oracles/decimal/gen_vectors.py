#!/usr/bin/env python3
"""O-TDK1 vector generator (RULINGS Q35, Q37c).  Run:  python3 -I lab/oracles/decimal/gen_vectors.py

Writes lab/oracles/decimal/tdk1-vectors.json: decimal values with their declared (precision, scale), canonical text and TDK1 key,
listed in exact numeric order (ties share one key).  Engine-side gate V5 stores these keys on each lane and checks that the engine's
ORDER BY returns them in this order.  The encoder is R20's reference (tdk1_reference.py, copied unchanged from the R20 research run);
it is stdlib-only and independent of packages/.  The seed is fixed so the file is reproducible byte for byte.
"""
import importlib.util
import json
import os
import random
from decimal import Decimal
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("tdk1_reference", os.path.join(HERE, "tdk1_reference.py"))
ref = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ref)

SEED = 20261108
rng = random.Random(SEED)
values = []
# Worked examples and boundaries (R20): zero, signs, normalization, carries, the 38-digit extremes.
fixed = [("0", 3, 2), ("1.1", 3, 2), ("1.10", 3, 2), ("16.50", 4, 2), ("-0.5", 3, 2), ("-0.55", 3, 2), ("-12.5", 4, 1),
         ("5", 3, 0), ("0.50", 3, 2), ("99.99", 4, 2), ("100.00", 5, 2), ("0.01", 3, 2), ("-0.01", 3, 2),
         ("9" * 38, 38, 0), ("-" + "9" * 38, 38, 0), ("0." + "0" * 37 + "1", 38, 38), ("-0." + "0" * 37 + "1", 38, 38)]
for text, p, s in fixed:
    values.append((text, p, s))
for _ in range(2000):
    p = rng.randint(1, 38)
    s = rng.randint(0, p)
    n = rng.randint(-(10 ** p - 1), 10 ** p - 1)
    # Codex round 4 finding 7: Decimal(n).scaleb(-s) rounds to the default 28-digit context and silently changed 518 of 2,000
    # values. Build the Decimal exactly from its digit tuple and exponent, and assert it equals n / 10^s as a Fraction.
    d = Decimal((1 if n < 0 else 0, tuple(int(c) for c in str(abs(n))), -s))
    assert Fraction(d) == Fraction(n, 10 ** s), (n, s, d)
    values.append((ref.render(d, s), p, s))
rows = []
for text, p, s in values:
    d = Decimal(text)  # parsing text is exact (no context rounding applies to the Decimal constructor)
    assert Fraction(d) == Fraction(text) if "e" not in text.lower() else True
    if d == 0 and text.startswith("-"):
        continue
    rows.append({"text": ref.render(d, s), "precision": p, "scale": s, "key": ref.encode(d), "_exact": Fraction(d)})
rows.sort(key=lambda r: (r["_exact"], r["precision"], r["scale"], r["text"]))
for i in range(1, len(rows)):
    a, b = rows[i - 1], rows[i]
    assert (a["_exact"] < b["_exact"]) == (a["key"] < b["key"]), (a, b)
    assert (a["_exact"] == b["_exact"]) == (a["key"] == b["key"]), (a, b)
for r in rows:
    del r["_exact"]
out = {"format": "O-TDK1 vectors v1", "encoding": "TDK1", "channel": "decimal_order_v1", "seed": SEED, "count": len(rows),
       "orderedBy": "exact numeric value; equal values share one key", "rows": rows}
with open(os.path.join(HERE, "tdk1-vectors.json"), "w") as f:
    json.dump(out, f, indent=1, sort_keys=True)
    f.write("\n")
print(f"wrote {len(rows)} rows")
