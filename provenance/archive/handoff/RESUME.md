# Resume instructions and qualification boundaries

The handoff is intentionally inert. Work only in a copy after verifying the pristine bundle. Python tools require3.10+, Node requires22+ (official24.13.0 archives are retained where listed), and the workspace package manager is pnpm10.11.0.

## Dependencies

Consult `offline/npm/manifest.json`, `offline/node/manifest.json`, public-source manifests and source archive manifests for hashes, licenses and platform coverage. Bundled registry tarballs were fetched without using a developer's npm cache or credentials. Verify archive SRI before consumption. The public pnpm tool archive can be extracted to a new tools directory and invoked with Node; do not globally install or alter another project's package manager.

`tools/offline_registry.py` serves only captured package versions over loopback. Run it in one terminal and use its printed registry URL with a local store in a working copy:

```sh
node PATH_TO_EXTRACTED_PNPM/package/bin/pnpm.cjs install --frozen-lockfile --ignore-scripts --registry http://127.0.0.1:48731 --store-dir .pnpm-store
```

This first install deliberately suppresses package lifecycle execution. Inspect `pnpm-workspace.yaml`'s allowed/ignored build-dependency policies before allowing required native-tool lifecycle steps. Optional browser downloads, compilers, Python and any uncaptured service SDK are separate prerequisites. Offline registry availability is not proof that every platform-specific lifecycle build succeeds. The original `package-lock.json` and pnpm lock are retained unchanged where they contain no personal information.

With an approved dependency/tool environment, `pnpm check` is the complete archived workspace command; `pnpm pack:check` performs package-consumer checks. Rebuilding and checking these on a new machine is new work and must get new receipts.

## Fresh servers

Pinned public image layers can be loaded with `docker image load --input <archive.docker.tar.gz>` from `offline/container-images/`. Verify the archive hash first. This imports public images only and does not restore any database. Image IDs/provenance and Linux ARM64 architecture are in the image manifest. Other architectures require their own upstream image and new qualification.

```sh
python3 tools/prepare_local_run.py --backend qlever --destination ../fresh-qlever
python3 tools/prepare_local_run.py --backend xtdb --destination ../fresh-xtdb
```

These commands create NEW run folders and start nothing. Review the generated `run.json` and `start.py`. The startup helper rejects a nonlocal Docker endpoint, a missing/wrong-architecture image, an existing container name, an occupied loopback port, symlink data directories and mismatched directory ownership. It does not remove or recreate anything. It uses unique container names, separate data folders and bounded CPU/memory. Only newly created data directories are prepared; it never changes ownership on an existing unrelated tree. Runtime startup on a recipient Linux host has not been executed for this handoff.

QLever bootstrap native bytes are tied to the pinned image/index format. They contain one synthetic triple; mutable update files and tokens are absent. Persistent application history must be recreated through public APIs. Configure/check the QLever planner limit100 before reproducing compact-v3 correctness. The archived readiness script assumes the old fixed container owner and cannot configure the generated unique owner unchanged; adapt its owner/profile checks as part of the explicit controller-portability work. Its lease inheritance is strict. Until that adaptation is qualified, generated-server startup alone does not reproduce compact-v3 readiness. The generated unique-owner run is a **new profile** and is not automatically accepted by old fixed-owner controller/resource checks.

Both servers listen only on loopback through the published port. The development QLever profile uses no access check; keep it local. Resource ceilings are partial application budgets rather than proof that all native intermediates are bounded. The prepare helper leaves XTDB at4CPUs/8GiB (3GiB heap/2GiB direct,512MiB memory cache) and QLever at4CPUs/4GiB (512M query budget/4threads/64M cache/32M entry). These unequal development ceilings do not constitute a fair performance comparison. Before startup, inspect target host/Docker aggregate capacity and other workloads; the helper does not reserve aggregate server/client memory. Its free-disk recheck admits only a small starter reserve, not ongoing ingestion, indexes or backup growth.

## Direct public contract checks

In a rebuilt working copy, export `TRIPLEX_BACKEND=xtdb` and `XTDB_URL=postgresql://xtdb:xtdb@127.0.0.1:5442/xtdb`, or `TRIPLEX_BACKEND=qlever` and `QLEVER_URL=http://127.0.0.1:7019`; use the generated run's port if changed. These are local example connection values, not exported credentials.

- Runtime44: `pnpm --filter @triplex-build/triplex-qualification exec vitest run test/runtime-conformance.test.ts` with `TRIPLEX_INTEGRATION=1`. Preserve unchanged upstream expectations and test isolation. Latest QLever run is expected to expose the known self-rule failure until fixed.
- Workload packet: `pnpm exec tsx scripts/triplex-workloads.ts --output NEW_RESULT.json` with the same backend environment. Use a new evidence file; never overwrite old receipts.
- Pure/unit package checks and public HTTP round-trip experiment are in package tests and `experiments/http-integer/` respectively. Native round-trip has not run.

These direct invocations produce useful new correctness evidence but bypass the archived controller's resource/source-proof receipt envelope. They **do not** produce qualification-equivalent receipts or justify a performance comparison. Review and bound native/client work before execution. Repeated fixture execution must use fresh scopes as the tests require.

## Required portability work before full qualification

The archived `scripts/xtdb-source-manifest.py` audited original Git checkouts; personal absolute paths and Git metadata are intentionally absent. Marker paths such as `__HANDOFF_ROOT__` and `[LOCAL_PATH_...]` in historical evidence are descriptive and are not executable substitutions. Legacy controllers call that verifier and fixed container/profile readiness logic. They must be adapted to use a newly declared sanitized-export baseline, unique runtime owners, matching resource profiles, complete input/artifact hashes and explicit `portable-export` provenance. Never return an old protected-source PASS from a bundle-integrity check, disable the source check silently, or feed malformed old receipts to a strict comparator.

Create a new named proof policy and comparator version that records precisely which verification ran. Preserve the old evidence and failures. Hash the same built public core/frontend/testkit, both backend artifacts, independent expected inputs, translator programs, runner and resource settings for paired comparison. A receipt must bind result bytes, run ID, packet identity and all142 expected check keys.

The45-fact recovery scripts require omitted retained state and cannot be run unchanged against the bootstrap. Recreate recovery fixtures via public APIs, then restart the new owned instance. Backup/restore, lost acknowledgements, process/container faults and cancellation must run exclusively; a client timeout alone does not prove backend work stopped.

## Earlier DuckDB work

The earlier runtime's takeover files are more detailed than this overview. Native owner builds use a pinned DuckDB2.0.0 source revision and macOS ARM64-specific linking. Full headers are available in the bundled source archive; do not reuse compiled extension binaries across machines. Compiled build outputs and large generated synthetic databases are omitted. Additional UTF-8 code, logs and metadata from build directories are retained in separate deduplicated build-text snapshots. Source, expected answers, generators and historical measurements are retained. Reproduce the appropriate small gates before adapting or measuring that engine. It remains a reference project, not a third competitor in the current XTDB/QLever comparison.

## Development loop after resumption

Keep a root plus three child slots: shared contract/integration owner, two competing bottleneck candidates, independent verifier. Define the failing public case, baseline, one changed variable, resource profile, correctness gate, metric and stop condition. Run two or three isolated correctness experiments concurrently. Reject semantic failures first. Measure survivors serially without contention, alternate order, promote only after focused and unchanged integrated gates, and preserve rejected hypotheses.

No source/benchmark execution occurred during packaging. Packaging uses a separate `handoff-export` disk profile: it accounts for copied source, downloaded public archives and ZIP overlap, while preserving at least12GiB host reserve during admission. It is **not** evidence that the old12GiB combined development budget passed, and the new computer must recalibrate its own capacity before scale gates.
