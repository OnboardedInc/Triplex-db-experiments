"""O-REPLAY command line.

  python3 -I lab/oracles/replay/cli.py CASE.json [-o OUT.json]
  python3 -I lab/oracles/replay/cli.py --self-check [-o OUT.json]
  python3 -I lab/oracles/replay/cli.py --test

`-I` drops the working directory from sys.path, so this script adds exactly one
path: the repository root three levels above this file (computed from __file__).
"""
import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
    __package__ = "lab.oracles.replay"

import argparse  # noqa: E402
import unittest  # noqa: E402

from lab.oracles.replay import run as RUN  # noqa: E402
from lab.oracles.replay import values as V  # noqa: E402


def main(argv=None):
    parser = argparse.ArgumentParser(prog="o-replay")
    parser.add_argument("case", nargs="?")
    parser.add_argument("-o", "--output")
    parser.add_argument("--self-check", action="store_true")
    parser.add_argument("--test", action="store_true")
    args = parser.parse_args(argv)
    if args.test:
        here = Path(__file__).resolve().parent
        suite = unittest.defaultTestLoader.discover(str(here / "tests"), top_level_dir=str(here.parents[2]))
        result = unittest.TextTestRunner(verbosity=1).run(suite)
        return 0 if result.wasSuccessful() else 1
    if args.self_check:
        from lab.oracles.replay import selfcheck
        report = selfcheck.run_all()
        text = V.dumps(report)
        status = 0 if report.get("status") == "PASS" else 1
    else:
        if not args.case:
            parser.error("a case file is required")
        try:
            report = RUN.evaluate_text(Path(args.case).read_bytes())
        except V.OracleInputError as error:
            print(f"o-replay: malformed case: {error}", file=sys.stderr)
            return 2
        text = V.dumps(report)
        status = 0 if report.get("verdict") in ("PASS", "EXPECTED-ONLY") else 1
    if args.output:
        Path(args.output).write_text(text + "\n", encoding="ascii")
    else:
        sys.stdout.write(text + "\n")
    return status


if __name__ == "__main__":
    raise SystemExit(main())
