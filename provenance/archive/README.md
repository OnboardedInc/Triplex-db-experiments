# Temporal store research and implementation handoff

**Status: PAUSED, incomplete.** This is a sanitized, self-contained research and source snapshot. No service starts, dependency installs, builds, benchmarks, migrations, or external publication happen when this folder is extracted. Start with `handoff/PAUSED-STATE.md` before running anything.

The current development objective is two competing implementations of the same Triplex temporal store: **Triplex on XTDB and Triplex on QLever**, each exposed through Triplex Datalog and mutation APIs. DuckDB is preserved here as a separate earlier implementation and research reference. It is not a third competitor in the current comparison. All ten goals and the full scale target remain acceptance requirements, not completed claims.

## What is in this folder

| Path | Contents |
| --- | --- |
| `triplex-backends/` | Independent Triplex workspace: core/frontend extensions, XTDB and QLever adapters, complete package manifests, lockfile, examples, tests, documentation, experiment packets, failures and qualification evidence. Working-tree edits at pause are included. |
| `duckdb-temporal/current/` | Current earlier DuckDB temporal-store source, native/adapter code, contracts, generators, workloads, research, handoffs and retained evidence. |
| `duckdb-temporal/recovered-research/` | Separate recovered research snapshot from an accidentally nested worktree. This is intentionally retained even where it duplicates current research; its older roadmap differs. |
| `duckdb-temporal/variant-manifests/` | Complete file maps for 53 historical/experimental development variants. These are alternatives and include unpromoted work. |
| `duckdb-temporal/variant-objects/` | Deduplicated, sanitized file contents for those variants. Use `tools/materialize_variant.py`; do not concatenate or edit objects. |
| `duckdb-temporal/build-text-manifests/`, `build-text-objects/` | Additional deduplicated UTF-8 source, generated code, diagnostics and metadata recovered from build directories; no native binaries or database volumes. Use materializer `--build-text` to recover separately. |
| `duckdb-temporal/decoded-research-artifacts/` | Materialized research previously stored as base64 archive parts, including nested archive contents. Encoded duplicates and archive ownership/path metadata were removed. |
| `duckdb-temporal/unpromoted-tests/` | Standalone authored interval-test draft; inclusion does not mean it ran or passed. |
| `references/triplex-upstream/` | Public upstream Triplex source snapshot at the reference commit, without Git history or local checkout metadata. |
| `offline/public-source/` | Git-tracked source snapshots of public research projects, with public provenance and original licenses. Includes large committed SQL logic fixtures. |
| `offline/npm/`, `offline/node/`, `offline/sources/` | Public dependency/tool/source archives and integrity manifests. Consult `offline/` manifests for the actual downloaded set and any explicit unavailability. |
| `offline/container-images/` | Public pinned XTDB and QLever Docker image layers only, not running containers or database volumes. Retained images are Linux ARM64. |
| `offline/qlever-bootstrap/` | Tiny immutable one-triple QLever bootstrap index and hashes; contains no application updates or server telemetry. |
| `offline/citations/` | Downloaded public technical citations with source URLs, original/export hashes and explicit unavailable entries. HTML is exported as inert readable text with visitor/request metadata removed. These are archival captures, not a claim that every historical web page remains accessible. |
| `privacy/` | Sanitization provenance, exclusions, independent review reports and export limitations. |
| `tools/` | Standard-library Python integrity checks, create-only variant extraction and portable preparation helpers. |

## Verify before using

From this extracted folder, with Python 3.10 or later:

```sh
python3 tools/verify_bundle.py
```

To check a ZIP without extracting it:

```sh
python3 tools/verify_bundle.py --zip ../temporal-store-handoff.zip
```

`MANIFEST.json` covers every exported regular file except itself. A separate ZIP SHA-256 sidecar accompanies delivery. Hashes detect changes and corruption; they do not establish a signing identity. Preserve a pristine extracted copy before installing dependencies or building, since either operation changes its contents and invalidates exact-tree verification.

To recover one historical variant into a **new, nonexistent** destination:

```sh
python3 tools/materialize_variant.py --list
python3 tools/materialize_variant.py temporal-presence-intervals-20261106 ../interval-variant
```

The materializer validates every object before creating the destination. It refuses existing destinations, symlinks and unsafe paths. Shared decoded research stays in this handoff rather than being duplicated into each variant.

## Resume on another computer

1. Read `handoff/PAUSED-STATE.md`, `handoff/RESUME.md`, and the relevant project's takeover documents. Check the bundled integrity manifest and review reports first.
2. Make a working copy. Install/build only in that copy, using the bundled public archives where possible. Public package archives preserve lockfile SRI and include platform variants; they do not include every operating-system compiler, Python interpreter, browser download or optional service SDK. The dependency manifests name any remaining gaps.
3. Use a local Docker engine and fresh, uniquely named data directories. Do not run the archived compose files blindly against another checkout. `tools/prepare_local_run.py` creates a new run folder and unique container names; it starts nothing. Its generated startup helper checks local Docker context, image identity, container/port collisions and new-directory ownership before issuing a single create-only `docker run`. This helper is packaging-time code, statically checked; fresh native startup still needs qualification on the recipient machine.
4. Rebuild the public packages on the target machine. Retained `dist/` files are historical snapshots, not a promise that edited source, platform or dependency behavior has been freshly qualified.
5. Re-run small public API checks before any scale or performance work. The original qualification controllers still depend on an original-checkout Git audit that cannot be reproduced from this privacy-sanitized export. `tools/verify_bundle.py` is a separate export-integrity check; it does **not** substitute a forged PASS for that original audit. See `handoff/RESUME.md` for direct checks and the required controller-portability work.

Do not treat prior receipts as fresh results on another machine. Sanitization changed some source, evidence and path bytes. `privacy/source-to-export-hashes.json` and variant provenance distinguish original and exported hashes. Historical receipt hashes remain historical; the bundle manifest authenticates the exported copy's internal bytes.

## Technical starting points

- Upstream Triplex reference commit: `e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0`; upstream runtime conformance has 44 cases.
- Read `triplex-backends/docs/xtdb.md`, `docs/custom-runtimes.md`, `docs/datalog.md`, then `packages/core/src/storage/StorageAdapter.ts`, `QueryExecutor.ts`, `packages/core/src/config/TypeSchema.ts`, and `packages/testkit/src/index.ts`.
- `triplex-backends/qualification/PLAN.md` records the shared two-backend orchestration loop and complete acceptance target. `qualification/ledger.json` is historical; the pause overlay takes precedence where newer.
- `duckdb-temporal/current/runtime/TAKEOVER-STATE.md`, `TEN-GOAL-LEDGER.md`, `NATIVE-TEMPORAL-STORE-PLAN-20261106.md`, `RESEARCH-SYNTHESIS.md`, and `handoffs/` explain the earlier engine.
- The independent event-replay workload packet has 20 families and 71 cases. Backend qualification expands this to 142 checks including reopened reads. Expected answers must remain independent of engine output.
- Public citations and required upstream licenses remain. Public upstream contributor attribution, fictional fixtures and deliberately public cryptographic test keys may appear in vendored upstream projects; these are not local account history or user secrets.

## Scope and portability limits

This export contains project research, implementation source, test inputs, generators, expected answers, source evidence and paused context. It deliberately omits Git histories/remotes, local account metadata, private links, credentials, dependency caches, external symlinks, server tokens, mutable database volumes, platform-specific compiled native extensions and tens of gigabytes of generated synthetic databases. Nothing was moved or deleted from original projects to make this export. Recreate generated data with included generators on the recipient machine; do not infer missing large-scale validation from their presence.

The historical DuckDB native owner build explicitly targets macOS ARM64 and needs adaptation and requalification elsewhere. The retained XTDB/QLever image archives are Linux ARM64. Source snapshots and dependency archives do not by themselves qualify another architecture. Native resource and power-failure/cancellation claims remain bounded by the actual evidence listed in the pause state.

All ten goals, relevant failure cases, ten million distinct entities with separate sparse/representative profiles, and a fair public XTDB-versus-QLever comparison remain required for completion. No release, deployment or performance qualification is implied by this handoff.
