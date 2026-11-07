"""Build and run the scoped WAL ENOSPC gate with the pinned DuckDB library."""
import argparse
from hashlib import sha256
import json
from pathlib import Path
import subprocess
from tempfile import mkdtemp

ROOT = Path(__file__).resolve().parent
REVISION = "d54cbbe3df17e8e5ce68312f483b4155836112aa"


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--engine-library", type=Path, required=True)
    parser.add_argument("--runtime-build", type=Path, default=ROOT / "build")
    args = parser.parse_args()
    source, engine, runtime = (path.resolve() for path in (args.source_dir, args.engine_library, args.runtime_build))
    core = runtime / "temporal_datalog.duckdb_extension"
    owner = runtime / "owner_probe/temporal_owner_probe.duckdb_extension"
    source_manifest = json.loads((source / ".source-manifest.json").read_text())
    package = json.loads((engine.parent / "package.json").read_text())
    core_manifest = json.loads((runtime / "artifact.json").read_text())
    owner_manifest = json.loads((owner.parent / "artifact.json").read_text())
    hashes = {"engine": digest(engine), "core": digest(core), "owner": digest(owner)}
    if source_manifest.get("revision") != REVISION or not (source / "LICENSE").is_file():
        raise RuntimeError("The harness requires the pinned DuckDB headers and license")
    if (engine.name != "libduckdb.dylib" or package.get("version") != "2.0.0-r.1"
            or package.get("os") != ["darwin"] or package.get("cpu") != ["arm64"]):
        raise RuntimeError("The harness requires the pinned macOS arm64 Node DuckDB library")
    if (core_manifest.get("engine") != "2.0.0" or owner_manifest.get("engine") != "2.0.0"
            or owner_manifest.get("source_revision") != REVISION
            or owner_manifest.get("source_archive_sha256") != source_manifest.get("archive_sha256")
            or hashes["core"] != core_manifest.get("extension_sha256")
            or hashes["core"] != owner_manifest.get("core_extension_sha256")
            or hashes["owner"] != owner_manifest.get("extension_sha256")
            or hashes["engine"] != owner_manifest.get("engine_library_sha256")):
        raise RuntimeError("The runtime core, owner companion, headers and engine must match")

    (ROOT / "build").mkdir(exist_ok=True)
    output = Path(mkdtemp(prefix="wal-enospc-", dir=ROOT / "build"))
    print(output, flush=True)
    binary = output / "wal-enospc"
    test_source = ROOT / "native/test_wal_enospc.cpp"
    command = ["c++", "-std=c++17", "-O2", "-Wall", "-Wextra", "-Wpedantic", "-Werror"]
    for include in ("src/include", "third_party/fmt/include", "third_party/utf8proc/include"):
        command += ["-isystem", str(source / include)]
    command += [str(test_source), str(engine), "-Wl,-rpath," + str(engine.parent), "-o", str(binary)]
    with (output / "compile.log").open("x") as log:
        subprocess.run(command, cwd=output, check=True, stdout=log, stderr=subprocess.STDOUT, timeout=120)
    with (output / "stdout.json").open("x") as stdout, (output / "stderr.log").open("x") as stderr:
        subprocess.run([binary, core, owner, output / "fixture.duckdb"], cwd=output, check=True,
                       stdout=stdout, stderr=stderr, timeout=60)
    observed = json.loads((output / "stdout.json").read_text())
    if observed.get("result") != "PASS":
        raise RuntimeError("No successful completion observed")
    receipt = {"source_revision": REVISION, "extension_version": core_manifest["extension_version"],
               "artifact_sha256": hashes, "test_source_sha256": digest(test_source),
               "launcher_sha256": digest(Path(__file__)), "test_binary_sha256": digest(binary), "observed": observed}
    with (output / "receipt.json").open("x") as report:
        json.dump(receipt, report, indent=2)
        report.write("\n")
    print(json.dumps(receipt))


if __name__ == "__main__":
    main()
