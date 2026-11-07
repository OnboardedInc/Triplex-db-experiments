# Broad SDK runtime staging repair

Status: source-only repair proposal; no helper execution, staging, syntax check,
engine run or retry. The first approved launch is preserved at `a4be60d3`, in
`evidence/sdk-broad-forward-setup-first-20261105.json` and its raw directory.
B0 exited1 with `ENOENT` before stage construction, database cloning/open, or a
query. The SDK arm was not launched. Those `forward-01` files remain unchanged.

The unchanged scale runner unconditionally reads
`<runtime>/native/retained_validity.sql` before using the clone branch. The
minimal frozen archives intentionally contain compiled runtime/dependencies,
with native source references beside the runtime. They were complete for the
anti-join runner, but lack this older scale-driver source-file dependency.

The2472-byte SQL SHA256 is
`b0bd0524469bb53b88feaddc4ae0782b9bb97e99c3aa056720e0cdc67a7767f4`.
It is an explicit companion `integrity_sources_sha256` input, equals native
source commit `c3ff1d73398b46cc7019465f78fc44f7e598670a`, and exactly matches the
retained SQL embedded in the core-manifest-pinned generated catalog header.
This is a packaging repair, not a new validator or changed query strategy.

## Complete asset-read audit

- `benchmark-scale.mjs:381–385,391–415` reads compiled store/port imports,
  core/companion manifests and artifact, optional adapter sources, the added
  SQL, and its local harness/clone helper files. Optional adapter-source reads
  already tolerate `ENOENT`. Recipe reads use the declared external recipe.
- `adapter/native-entity.ts` and `native-schema.ts` contain no source-file reads.
  The port reads only core/control/companion build files and the engine resolved
  through its actual Node SDK dependency chain. These are in the frozen runtime.
- `scale-fixture.mjs`/`mixed-scale-fixture.mjs` do not read another selected-runtime
  asset. The declared clone path skips fixture generation and its raw audit.
  The Python clone helper is resolved from the unchanged integration harness.
- Resume/recovery source inputs are not used by this clone-only protocol.

The helper does not add the optional TypeScript sources to the staged runtime.
Their absence is honest in the generic raw report; the new receipt separately
attests the original SDK source tree and Git object and its frozen compiled
module. No missing required runtime file is silently excluded.

## Exact mapping and proof

`stage_broad_sdk_runtime.py` has two operations, `prepare` and `verify`. Neither
imports a native binding, opens a database, installs dependencies or builds code.
Both verify the five measured harness pins and each original445-file archive.

Reading both actual inventory files established the same partition:

| Declared inventory category | Entries | Treatment |
| --- | ---: | --- |
| `runtime/…` |404 | Every entry maps to the identical relative staged runtime file |
| `source/…` |40 | All checked;39 tracked inputs match c3 Git objects, generated header matches actual core/runtime header |
| `archive.json` |1 | Verified sidecar, recorded separately; not an application runtime file |
| Total |445 | Every declared entry verified; inventory file itself separately pinned |

The405 figure describes the **repaired staged runtime**: the404 original runtime
files plus the one SQL addition. It is not405 original runtime files plus40
source references. Counts in receipts are derived from inventory path mappings
and actual set equality, not substituted for content verification.

Prepare creates a new owned pair of CoW runtime copies and adds that SQL from
each verified archive's `source/` copy. Verify checks exact actual staged file
set/bytes equals `{all original runtime paths} + {native/retained_validity.sql}`.
There are no omitted package files, hidden files or symlink exemptions.
Directories are enumerated separately; no directory content is excluded.

Both modes also check the source/Git references, actual staged core/control/
companion/module/manifest/header bytes, and the SDK package chain resolved from
the **staged port path** through node-api→node-bindings→platform binding→engine.
`createRequire/resolve` is used without native import. Every resolved entry must
belong to the staged exact file mapping, and the actual engine must match the
paired companion. Inspecting only original frozen paths is insufficient.

## Proposed fresh setup and run paths

All commands require a later root grant after source review. From the integration
runtime, use fresh staging/receipt paths and preserve any partial failure:

```sh
[LOCAL_PATH_0034] stage_broad_sdk_runtime.py prepare \
  --stage-root build/sdk-broad-staged-20261105/forward-02 \
  --receipt build/sdk-broad-regression-20261105/forward-02/stage-before.json
```

This creates the two measured subjects:

- `build/sdk-broad-staged-20261105/forward-02/b0/runtime`
- `build/sdk-broad-staged-20261105/forward-02/sdk/runtime`

The existing actual artifact inspectors still attest each original frozen
reference before/after. `stage-before.json` additionally binds the actual staged
subjects to those reference bytes, with only the SQL addition. No existing
anti-join binding is edited or relabeled as a staged-runtime binding.

Use the exact `SDK-BROAD-REGRESSION-PROTOCOL.md` commands/settings/budgets,
replacing only each runtime with the corresponding absolute staged subject and
each output with fresh `forward-02/b0.json` and `forward-02/sdk.json`. Both
processes still import the original SDK/native bytes. No measured file changes,
native rebuild, threshold changes, installs or new application policy occur.

Before B0, between arms, and after SDK, run the same verifier with fresh receipt
names (`stage-pre-b0.json`, `stage-after-b0.json`, `stage-after-sdk.json`):

```sh
[LOCAL_PATH_0034] stage_broad_sdk_runtime.py verify \
  --stage-root build/sdk-broad-staged-20261105/forward-02 \
  --receipt build/sdk-broad-regression-20261105/forward-02/stage-after-b0.json
```

Keep hashes of source371/recipe532/no-WAL and the declared helper/binding files
before/after, outside measured phases. Preserve complete logs/terminals and all
actual stage attestations. Driver exit0 remains distinct from numeric pass.
Continue SDK after a numerical-only B0 miss; stop subsequent arms on identity,
typed-oracle or lifecycle disagreement. No reverse pair without a separate grant.

The helper source itself must be reviewed before execution. First staging or
package-resolution failure stops without deleting or overwriting its partial
paths; no blind re-run on the same destination. This addendum grants no engine
run by itself and does not erase the first setup failure.
