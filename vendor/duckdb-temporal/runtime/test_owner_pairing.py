"""Reject stale companion inputs before invoking a native compiler."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import build_owner_probe


class OwnerPairingTests(unittest.TestCase):
    def reject_stale(self, stale):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source"
            engine = root / "engine/libduckdb.dylib"
            files = {
                source / ".source-manifest.json": json.dumps({"revision": build_owner_probe.REVISION, "archive_sha256": "a" * 64}),
                source / "LICENSE": "fixture license",
                source / "src/include/duckdb_static_extension.h": "fixture header",
                engine: "fixture engine",
                engine.parent / "package.json": json.dumps({"version": "2.0.0-r.1", "cpu": ["arm64"], "os": ["darwin"]}),
                root / "build/temporal_datalog.duckdb_extension": "fixture core",
                root / "build/catalog_sql.hpp": "fixture catalog",
                root / "native/src/temporal_integrity.hpp": "fixture integrity",
                root / "native/src/temporal_current_unique.hpp": "fixture current uniqueness",
                root / "native/src/temporal_uniqueness.hpp": "fixture schema uniqueness",
                root / "native/src/temporal_presence.hpp": "fixture entity presence",
            }
            for path, text in files.items():
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(text)
            manifest = {
                "extension_sha256": build_owner_probe.digest(root / "build/temporal_datalog.duckdb_extension"),
                "catalog_sql_sha256": build_owner_probe.digest(root / "build/catalog_sql.hpp"),
                "source_sha256": {name: build_owner_probe.digest(root / name) for name in
                    ["native/src/temporal_integrity.hpp", "native/src/temporal_current_unique.hpp",
                     "native/src/temporal_uniqueness.hpp", "native/src/temporal_presence.hpp"]},
            }
            if stale.startswith("native/"):
                manifest["source_sha256"][stale] = "0" * 64
            else:
                manifest[stale] = "0" * 64
            (root / "build/artifact.json").write_text(json.dumps(manifest))
            with patch.object(build_owner_probe, "ROOT", root), patch("sys.argv", ["build_owner_probe.py",
                "--source-dir", str(source), "--engine-library", str(engine)]), patch.object(build_owner_probe.subprocess, "run") as compiler:
                with self.assertRaisesRegex(RuntimeError, "matching core extension"):
                    build_owner_probe.main()
                compiler.assert_not_called()

    def test_stale_core_extension_rejected_before_compilation(self):
        self.reject_stale("extension_sha256")

    def test_stale_shared_integrity_rejected_before_compilation(self):
        self.reject_stale("native/src/temporal_integrity.hpp")

    def test_stale_schema_uniqueness_rejected_before_compilation(self):
        self.reject_stale("native/src/temporal_uniqueness.hpp")

    def test_stale_presence_rejected_before_compilation(self):
        self.reject_stale("native/src/temporal_presence.hpp")

    def test_stale_catalog_rejected_before_compilation(self):
        self.reject_stale("catalog_sql_sha256")


if __name__ == "__main__":
    unittest.main()
