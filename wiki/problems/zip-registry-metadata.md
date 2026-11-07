# ZIP registry metadata I/O

Problem tag: `bootstrap.zip-registry.repeated-central-directory`.

The task-owned loopback npm registry serves only public dependency versions
captured in the supplied immutable ZIP. Every tarball is verified against the
captured SHA256 before serving. It uses Python3.14.6 standard-library ZIP and HTTP
implementations; its routing is adapted from
[`tools/archive/offline_registry.py`](../../tools/archive/offline_registry.py),
portable-export SHA256
`b58bae4429e5d97c3092b82a7e0e1e4daf2e71a80cca37a6ef3dcc9e7e191898`.

The first DuckDB workspace lockfile-only invocation reached its180s whole-command
deadline. The root lock remained unchanged. The initial wrapper held child output
in memory and did not persist it when `TimeoutExpired` raised; that capture gap is
explicit in
`.runtime/bootstrap/duckdb-workspace-deps-first-timeout.json`. Later invocations
streamed output directly to retained files.

The registry reopened the ZIP and reparsed its78,668-member central directory for
each metadata verification/read. The repaired implementation keeps one immutable
`ZipFile` handle; separate member readers coordinate seeks through `ZipFile`'s
lock. Tarball hashing remains mandatory, and HTTP statuses are recorded under the
bounded workspace. No upstream registry proxy was added.

The diagnostic lockfile-only invocation then completed in3.8s and the frozen
installation in2.8s, adding three host-applicable DuckDB packages. These are
observations from different diagnostic invocations, with cache and request-policy
changes as well as handle reuse. They are not a controlled speedup or database
performance claim. Receipts and logs:

- `.runtime/bootstrap/duckdb-workspace-deps-lock-diagnostic.log`
- `.runtime/bootstrap/duckdb-workspace-deps-frozen.log`
- `.runtime/bootstrap/duckdb-workspace-lock-controlled-addition.json`
- `.runtime/bootstrap/duckdb-workspace-dependencies-completed.json`

The resolver also normalized unrelated existing metadata and peer annotations.
Those changes were rejected. The accepted lock adds only the new DuckDB importer
and ten exact `@duckdb/*@2.0.0-r.1` package/snapshot entries, retaining the original
entries and text. Its SHA256 is
`7a02f735718ecdd29fdbfaf8ec2e2b05c92ad773cdc27d1920a278c5c7f4ba14`.

When a source ZIP is immutable, cache its directory metadata and stream only the
needed members. Keep content validation separate from metadata-cache reuse, and
write diagnostic output from launch so timeouts retain useful evidence.
