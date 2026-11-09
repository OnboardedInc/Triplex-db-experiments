# Driver filesystem layout (offline / G03 handoff)

Build with Node 24 and `lab/bench/ns-driver/build.mjs <fresh-artifact-dir>` from the evaluator commit.
Run its hash-bound `launch-artifact.mjs <artifact-dir> <config.json>`. The launcher creates a fresh sibling
`runtime-<UUID>/`, and an external `runtime-<UUID>.receipt.json`. It copies only:

- `driver.mjs` (one esbuild closed artifact; third-party modules are bundled, builtins remain Node runtime dependencies),
- `runtime-guard.mjs` (secondary module check), `layout-audit.mjs` (startup filesystem audit),
- `manifest.json`, `metafile.json`,
- `config.json` (declared evaluator data), and `run-key` (only a 32-byte evaluator key outside candidate/dependency paths),
- `inventory.json` (file names, hashes, bundle identity, denied external paths).

An invalid/non-key source path is left external, never copied or granted. The real driver therefore refuses it
when reading its key; the review fixtures attempt to evaluate that same unreadable text. Config is evaluator
input, never candidate authority to add filesystem grants. No source tree or node_modules is copied.

The external receipt lists **every** readable layout file including the inventory's own hash. Its digest is
passed through the fresh child's environment as an external anchor, avoiding a self-hash cycle. It also binds
the original config digest and artifact digest. Startup enumerates the actual layout, rejects extra paths,
symlinks, directories, missing/changed files, and verifies that external input/artifact/output paths get
`ERR_ACCESS_DENIED`. The audit's JSON observation goes to stderr before artifact execution. A receipt records
construction; it does not alone assert that the child ran or that any NS cell passed.

The offline child has only `--permission --allow-fs-read=<runtime-layout>` and
`--allow-fs-write=<fresh-output>/*`. Output is outside the layout, write-only, and checked empty by the trusted
launcher. It cannot introduce readable files. There are no child, worker, native-addon or permission-management
grants. The Node runtime is the trusted executable/base, not a node_modules tree. Linux boot and time-namespace
identity are captured by the trusted launcher before restriction; the child inherits that namespace. Mac uses
its diagnostic boot identity. The module hook is explicitly secondary: readable declared data can be evaluated
within one process, and hooks can be replaced; neither is claimed to be the boundary.

For G03, put this exact inventoried layout in the separate trusted-driver box built from the evaluator commit,
with its pinned Node runtime/base; mount the layout read-only, give it a separate write-only output volume,
and expose candidate RPC only. Do not mount the repository, candidate source, dependency stores or candidate
volumes into that box. Keep the receipt outside the box with evaluator run evidence. Run the startup audit
under the same permission flags. This change supplies and tests the directory layout; it does not build or
claim to verify an actual G03 container image or VM isolation policy.
