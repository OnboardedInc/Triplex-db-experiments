"""Run unchanged frozen-baseline checks with all fixtures redirected off source.

Requires caller-supplied pinned DuckDB on PYTHONPATH and a trusted compiled
extension. Does not install dependencies, edit source, or touch the original
prototype workspace. These are v1 baseline checks, not typed-v2 acceptance.
"""
from __future__ import annotations

import argparse
import importlib.util
from pathlib import Path
import sys
import unittest


def import_file(name: str, source: Path):
    spec = importlib.util.spec_from_file_location(name, source)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("native", "storage", "correctness", "qa"), required=True)
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument("--extension", type=Path, required=True,
                        help="Trusted extension built from the audited frozen source")
    parser.add_argument("--baseline", type=Path,
                        default=Path(__file__).resolve().parents[2] / "frozen-baseline")
    args = parser.parse_args()
    baseline, output = args.baseline.resolve(), args.output_root.resolve()
    extension = args.extension.resolve()
    if output == baseline or output.is_relative_to(baseline):
        raise SystemExit("Output must not be inside the frozen baseline")
    if not extension.is_file():
        raise SystemExit("The explicit trusted extension does not exist")
    output.mkdir(parents=True, exist_ok=True)
    (output / "build").mkdir(exist_ok=True)
    if args.mode == "native":
        module = import_file("frozen_v1_extension_test", baseline / "engine/tests/test_extension.py")
        module.ROOT = output  # Only the owned apostrophe-path fixture uses this root.
        module.EXTENSION = extension
    elif args.mode == "storage":
        store = import_file("store", baseline / "storage/store.py")
        store.ROOT = output / "storage-root"
        store.ROOT.mkdir(exist_ok=True)
        store.TRUSTED_EXTENSION = extension
        # SCHEMA remains the unchanged frozen source path. Resource/path policy
        # code is not replaced; only its admitted disposable root is relocated.
        module = import_file("frozen_v1_storage_test", baseline / "storage/tests/test_store.py")
    else:
        bench = import_file("bench", baseline / "bench/bench.py")
        bench.ROOT = output / "bench-root"
        bench.ROOT.mkdir(exist_ok=True)
        result_path = output / f"{args.mode}-v1.json"
        if args.mode == "correctness":
            sys.argv = ["frozen-bench", "--mode", "correctness", "--prefilter",
                        "--extension", str(extension), "--out", str(result_path)]
            bench.main()
        else:
            qa = import_file("frozen_qa", baseline / "bench/qa.py")
            sys.argv = ["frozen-qa", "--extension", str(extension), "--out", str(result_path)]
            qa.main()
        return
    result = unittest.TextTestRunner(verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromModule(module)
    )
    raise SystemExit(0 if result.wasSuccessful() else 1)


if __name__ == "__main__":
    main()
