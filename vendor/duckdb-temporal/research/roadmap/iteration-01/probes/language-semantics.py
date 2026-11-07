"""Reproduce Python numeric traps and generate finite-f64 transport evidence.

Only writes evidence files beside this script. Does not import or edit the engine,
run the project tests, open a database, or install any dependency. Run before the
companion language-semantics.mjs with Python 3.12.14 for the recorded evidence.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
import random
import struct
import sys

ROOT = Path(__file__).resolve().parent
SEED = 20261030


def main() -> None:
    rng = random.Random(SEED)
    # Positive/negative zero, positive/negative minimum subnormal, minimum normal,
    # positive/negative maximum finite, 1.0 and the nearest binary64 to 0.1.
    values = [
        0, 0x8000000000000000, 1, 0x8000000000000001,
        0x0010000000000000, 0x7FEFFFFFFFFFFFFF, 0xFFEFFFFFFFFFFFFF,
        0x3FF0000000000000, 0x3FB999999999999A,
    ]
    while len(values) < 1024:
        bits = rng.getrandbits(64)
        if ((bits >> 52) & 0x7FF) != 0x7FF:
            values.append(bits)
    corpus = [
        {"bits": f"{bits:016x}",
         "value": struct.unpack(">d", bits.to_bytes(8, "big"))[0]}
        for bits in values
    ]
    assert len(corpus) == 1024
    assert all(math.isfinite(row["value"]) for row in corpus)
    assert all(struct.pack(">d", row["value"]).hex() == row["bits"] for row in corpus)
    (ROOT / "float-json-corpus.json").write_text(
        json.dumps(corpus, allow_nan=False), encoding="utf-8"
    )
    summary = {
        "python": sys.version.split()[0],
        "python_bool_is_int": isinstance(True, int),
        "python_numeric_equality": True == 1 == 1.0,
        "python_untagged_numeric_set_size": len({True, 1, 1.0}),
        "python_tagged_numeric_set_size": len({
            ("b", True), ("i", 1), ("f", struct.pack(">d", 1.0).hex())
        }),
        "i64_max": str(2**63 - 1),
        "float_i64_max_collides_with_out_of_range": float(2**63 - 1) == float(2**63),
        "epsilon_example": {
            "a": 0.0, "b": 0.75, "c": 1.5, "epsilon": 1.0,
            "a_close_b": abs(0 - 0.75) < 1,
            "b_close_c": abs(0.75 - 1.5) < 1,
            "a_close_c": abs(0 - 1.5) < 1,
        },
        "float_json_corpus_count": len(corpus),
    }
    assert summary["python_untagged_numeric_set_size"] == 1
    assert summary["python_tagged_numeric_set_size"] == 3
    assert summary["float_i64_max_collides_with_out_of_range"]
    (ROOT / "python-language-semantics.json").write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
