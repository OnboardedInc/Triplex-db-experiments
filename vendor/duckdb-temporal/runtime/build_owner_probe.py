"""Build the isolated C++ lifecycle probe against the selected Node engine."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parent
REVISION = "d54cbbe3df17e8e5ce68312f483b4155836112aa"
HEADERS = ("duckdb/common/exception.hpp", "duckdb/common/types/data_chunk.hpp", "duckdb/common/types/value.hpp",
           "duckdb/function/scalar_function.hpp", "duckdb/main/attached_database.hpp", "duckdb/main/client_context.hpp",
           "duckdb/main/client_context_state.hpp", "duckdb/main/connection_manager.hpp", "duckdb/main/database.hpp",
           "duckdb/main/connection.hpp", "duckdb/main/query_result.hpp", "duckdb/main/query_parameters.hpp",
           "duckdb/common/enums/query_result_state.hpp", "duckdb/planner/expression/bound_parameter_data.hpp",
           "duckdb/main/extension/extension_loader.hpp", "duckdb/planner/extension_callback.hpp",
           "duckdb/transaction/duck_transaction_manager.hpp", "duckdb/transaction/meta_transaction.hpp")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--engine-library", type=Path, required=True)
    parser.add_argument("--compat-mutations", action="store_true", help="Build the experimental caller-transaction append kernel")
    args = parser.parse_args()
    source = args.source_dir.resolve()
    engine = args.engine_library.resolve()
    source_manifest = json.loads((source / ".source-manifest.json").read_text())
    if source_manifest.get("revision") != REVISION or len(source_manifest.get("archive_sha256", "")) != 64:
        raise RuntimeError("The probe requires the pinned DuckDB 2.0.0 source revision")
    if not (source / "LICENSE").is_file() or not (source / "src/include/duckdb_static_extension.h").is_file():
        raise RuntimeError("The source tree must retain its license and complete headers")
    if engine.name != "libduckdb.dylib":
        raise RuntimeError("This first probe targets the selected macOS Node DuckDB library")
    package = json.loads((engine.parent / "package.json").read_text())
    if package.get("version") != "2.0.0-r.1" or package.get("cpu") != ["arm64"] or package.get("os") != ["darwin"]:
        raise RuntimeError("The probe requires the selected Node engine 2.0.0-r.1")
    core_manifest = json.loads((ROOT / "build/artifact.json").read_text())
    core_extension = ROOT / "build/temporal_datalog.duckdb_extension"
    if (digest(core_extension) != core_manifest.get("extension_sha256") or
        digest(ROOT / "native/src/temporal_integrity.hpp") !=
            core_manifest.get("source_sha256", {}).get("native/src/temporal_integrity.hpp") or
        digest(ROOT / "native/src/temporal_current_unique.hpp") !=
            core_manifest.get("source_sha256", {}).get("native/src/temporal_current_unique.hpp") or
        digest(ROOT / "native/src/temporal_uniqueness.hpp") !=
            core_manifest.get("source_sha256", {}).get("native/src/temporal_uniqueness.hpp") or
        digest(ROOT / "native/src/temporal_presence.hpp") !=
            core_manifest.get("source_sha256", {}).get("native/src/temporal_presence.hpp") or
        digest(ROOT / "build/catalog_sql.hpp") != core_manifest.get("catalog_sql_sha256")):
        raise RuntimeError("Build the matching core extension before its owner companion")
    output = ROOT / "build/owner_probe"
    output.mkdir(parents=True, exist_ok=True)
    library = output / "temporal_owner_probe.so"
    artifact = output / "temporal_owner_probe.duckdb_extension"
    probe = ROOT / "native/owner_probe/owner_probe.cpp"
    writer_sources = ("native/owner_probe/native_writer.cpp", "native/owner_probe/native_writer.hpp",
                      "native/owner_probe/native_writer_abi.h", "native/owner_probe/node_writer.cpp")
    command = ["c++", "-std=c++17", "-O2", "-DNDEBUG", "-fPIC", "-shared", "-fvisibility=hidden",
               "-DDUCKDB_BUILD_LOADABLE_EXTENSION", "-Wall", "-Wextra", "-Wpedantic", "-Werror"]
    current_unique = core_manifest.get("experimental_current_unique_fast_path") is True
    all_cut_unique = core_manifest.get("experimental_all_cut_unique_fast_path") is True
    command += ["-DTD_CURRENT_UNIQUE_FAST_PATH=" + str(int(current_unique)),
                "-DTD_ALL_CUT_UNIQUE_FAST_PATH=" + str(int(all_cut_unique))]
    command += ["-DTD_COMPAT_MUTATIONS=" + str(int(args.compat_mutations))]
    command += ["-I" + str(ROOT / "native/src"), "-I" + str(ROOT / "build")]
    for include in ("src/include", "third_party/fmt/include", "third_party/utf8proc/include"):
        command += ["-isystem", str(source / include)]
    command += [str(probe), str(ROOT / writer_sources[0])]
    compatibility_sources = ("native/owner_probe/compat_mutation.hpp", "native/owner_probe/compat_mutation.cpp")
    if args.compat_mutations:
        command += [str(ROOT / compatibility_sources[1]), "-fno-fast-math", "-frounding-math", "-ffp-contract=off"]
    command += [str(engine), "-Wl,-rpath," + str(engine.parent), "-o", str(library)]
    subprocess.run(command, check=True)
    node = Path(subprocess.check_output(["node", "-p", "process.execPath"], text=True).strip()).resolve()
    node_headers = node.parent.parent / "include/node"
    required_node_headers = ("node_api.h", "node_api_types.h", "js_native_api.h", "js_native_api_types.h", "uv.h")
    if not all((node_headers / name).is_file() for name in required_node_headers):
        raise RuntimeError("Native writer requires the selected Node/uv headers")
    writer_addon = output / "temporal_writer.node"
    writer_command = ["c++", "-std=c++17", "-O2", "-DNDEBUG", "-fPIC", "-shared", "-fvisibility=hidden",
                      "-DNAPI_VERSION=8", "-Wall", "-Wextra", "-Wpedantic", "-Werror",
                      "-I" + str(node_headers), str(ROOT / writer_sources[3]),
                      "-undefined", "dynamic_lookup", "-o", str(writer_addon)]
    subprocess.run(writer_command, check=True)
    # Native extension metadata uses eight reversed fixed-width fields followed
    # by the signature reservation. The companion has its own CPP identity.
    fields = ["", "", "", "CPP", "0.2.0", "v2.0.0", "osx_arm64", "4"]
    metadata = b"".join(field.encode("ascii").ljust(32, b"\0") for field in fields)
    section = bytes((0, 147, 4, 16)) + b"duckdb_signature" + bytes((128, 4))
    artifact.write_bytes(library.read_bytes() + section + metadata + bytes(256))
    manifest = {"schema": "native-owner-probe-build/1", "engine": "2.0.0", "abi": "CPP",
                "test_command": ["node", "adapter/test-owner-probe.mjs"],
                "source_revision": REVISION, "source_archive_sha256": source_manifest.get("archive_sha256"),
                "headers_sha256": {name: digest(source / "src/include" / name) for name in HEADERS},
                "dependency_license_sha256": digest(source / "LICENSE"),
                "engine_library_sha256": digest(engine), "core_extension_sha256": digest(core_extension),
                "experimental_current_unique_fast_path": current_unique,
                "experimental_all_cut_unique_fast_path": all_cut_unique,
                "experimental_compat_mutations": args.compat_mutations,
                "compat_mutation_sources_sha256": {name: digest(ROOT / name) for name in compatibility_sources} if args.compat_mutations else {},
                "probe_source_sha256": digest(probe),
                "native_writer": {"abi": 1, "addon_sha256": digest(writer_addon),
                                  "sources_sha256": {name: digest(ROOT / name) for name in writer_sources},
                                  "node_version": subprocess.check_output([str(node), "--version"], text=True).strip(),
                                  "node_executable_sha256": digest(node),
                                  "headers_sha256": {name: digest(node_headers / name) for name in required_node_headers},
                                  "uv_headers_sha256": {str(name.relative_to(node_headers)): digest(name)
                                                        for name in sorted((node_headers / "uv").rglob("*.h"))},
                                  "compile_command": writer_command},
                "integrity_sources_sha256": {name: digest(ROOT / name) for name in
                    ("native/src/temporal_integrity.hpp", "native/src/temporal_current_unique.hpp",
                     "native/src/temporal_uniqueness.hpp", "native/src/temporal_presence.hpp",
                     "native/retained_validity.sql", "native/catalog.sql", "build/catalog_sql.hpp")},
                "library_sha256": digest(library), "extension_sha256": digest(artifact)}
    (output / "artifact.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest))


if __name__ == "__main__":
    main()
