"""Build isolated disabled/enabled native-read variants and matching companions."""
import argparse
import json
from pathlib import Path
import shutil
import sys
from unittest.mock import patch

import build_native
import build_owner_probe


ROOT = Path(__file__).resolve().parent
EXPERIMENTS = {"identity_count":"TD_IDENTITY_COUNT_FAST_PATH", "current_unique":"TD_CURRENT_UNIQUE_FAST_PATH",
               "injective_projection":"TD_INJECTIVE_PROJECTION_FAST_PATH",
               "all_cut_unique":"TD_ALL_CUT_UNIQUE_FAST_PATH",
               "streaming_source":"TD_STREAMING_SOURCE_FAST_PATH"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--engine-library", type=Path, required=True)
    parser.add_argument("--adapter-build", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--experiment", choices=tuple(EXPERIMENTS) + ("current_unique_injective",), default="identity_count")
    parser.add_argument("--reuse-baseline", type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=False)
    adapter = args.adapter_build.resolve()
    if not (adapter / "native-entity.js").is_file():
        raise RuntimeError("The spike needs the verified public owned-mode adapter build")
    baseline_selected = set()
    if args.experiment in ("all_cut_unique", "streaming_source"):
        baseline_selected = {"current_unique", "injective_projection"}
    if args.experiment == "streaming_source":
        baseline_selected.add("all_cut_unique")
    selected = baseline_selected | {args.experiment}
    if args.experiment == "current_unique_injective":
        selected = {"current_unique", "injective_projection"}
    variants = []
    builds = [(False, "baseline"), (True, "candidate")]
    if args.reuse_baseline:
        baseline = args.reuse_baseline.resolve()
        manifest = json.loads((baseline / "build/artifact.json").read_text())
        if any(manifest.get("experimental_" + experiment + "_fast_path") is not (experiment in baseline_selected) for experiment in EXPERIMENTS):
            raise RuntimeError("The reused baseline must match the selected experiment control flags")
        if build_owner_probe.digest(baseline / "build/temporal_datalog.duckdb_extension") != manifest["extension_sha256"]:
            raise RuntimeError("The reused baseline artifact changed")
        if any(build_owner_probe.digest(ROOT / name) != value for name, value in manifest["source_sha256"].items()):
            raise RuntimeError("The reused baseline must have the same native source snapshot")
        adapter = baseline / "build/adapter"
        variants.append({"name": "baseline", "runtime": str(baseline),
            "core_extension_sha256": manifest["extension_sha256"], "enabled": False})
        builds = [(True, "candidate")]
    for enabled, name in builds:
        stage = output / name
        stage.mkdir()
        (stage / "package.json").write_text('{"private":true,"type":"module"}\n')
        (stage / "native").symlink_to(ROOT / "native", target_is_directory=True)
        (stage / "adapter").symlink_to(ROOT / "adapter", target_is_directory=True)
        shutil.copytree(ROOT / "temporal_store", stage / "temporal_store",
            ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
        (stage / "node_modules").symlink_to(ROOT / "node_modules", target_is_directory=True)
        build = stage / "build"

        build_native.main(build, **{
            experiment + "_fast_path": experiment in (selected if enabled else baseline_selected)
            for experiment in EXPERIMENTS
        })
        manifest_path = build / "artifact.json"
        manifest = json.loads(manifest_path.read_text())
        with patch.object(build_owner_probe, "ROOT", stage), patch.object(sys, "argv", [
            "build_owner_probe.py", "--source-dir", str(args.source_dir.resolve()),
            "--engine-library", str(args.engine_library.resolve()),
        ]):
            build_owner_probe.main()
        shutil.copytree(adapter, build / "adapter")
        variants.append({"name": name, "runtime": str(stage),
            "core_extension_sha256": manifest["extension_sha256"],
            "enabled": enabled})
    (output / "variants.json").write_text(json.dumps({"schema": "native-read-variants/1", "experiment": args.experiment,
        "variants": variants}, indent=2) + "\n")


if __name__ == "__main__":
    main()
