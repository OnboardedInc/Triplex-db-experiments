# Reusing the existing DuckDB runtime

Evidence checked by remote text reads on 3 November 2026, with the bounded SQL-only connection/schema result and cross-goal update added on 4 November. This project-local guide records a previously successful technical path. It does not authorize an execution, certify a dependency's origin, or replace current task instructions and action-time review. Preserve the [project-data-only policy](PROJECT-DATA-POLICY.md).

## Early real-engine default for implementation lanes

Updated 4 November 2026. Read the project [engine-first working guidance](AGENTS.md) and [lane reconciliation](ENGINE-FIRST-CHECKPOINT-20261104.md) when starting or continuing an implementation lane.

For behavior that depends on SQL, storage, native callbacks, parameter/row conversion, transactions or driver lifecycle, select a small real-DuckDB integration slice early, before expanding standalone reference or recording-port work. Pure components remain useful as independent oracles and finite-model tests; they do not complete the integrated task.

**A fresh action does not require a fresh dependency installation.** Start by evaluating the existing exact closure below. A lane that has not selected a concrete driver/action has an integration-selection gap, not evidence that DuckDB is unavailable or that acquisition is required. Conversely, this guide does not approve a package or action, clear ownership uncertainty, authenticate origin or override a stopped dependency.

Record the selected runtime/driver, lane owner, fresh subject, actual first terminal outcome and next engine gate. If integration is unsuitable or blocked, name the precise missing API, dependency, ownership fact or denied operation and identify work that can continue independently. Keep source-only, synthetic, real-driver, native and full-goal acceptance separate.

## What the existing path establishes

The [shared input selection][profile] identifies the existing project dependency at the relative binding `duckdb_native_20261101_1954_new/deps`. Its declared 69-file closure contains 68,764,653 bytes: 68 RECORD-listed hashes/sizes matched, and RECORD itself is intentionally unhashed.

- Manifest: 15,943 bytes, SHA256 `2e061c1c849f3cde089f09007c585f005d39bda622a349b5cd76c83b5584e234`.
- Native module: 67,631,112 bytes, SHA256 `e7cda112749d860a36cb1524ff465cefecdb0acc5c4e2ff4510ecc1b6f6c061a`.
- DuckDB 2.0.0 and revision `d54cbbe3df` are checked self-reports, not loaded-image authentication.
- The existing v0.6 extension and FP guard/helper are separately pinned in the source/action reviews. A new extension or helper needs its own exact identity and review.

These are declared project-file identities and current-file self-consistency under trusted immutable ownership. They are **not authenticated original-wheel/build provenance, proof of loaded mappings, a machine inventory, or retroactive attribution of today's native hash to older runs**.

[PR19's source/action review][review19] and [independent receipt review][receipt19] document successful use of this same immutable closure for a fresh persisted-negation subject. [PR20's source/action review][review20] and [result][result20] document another fresh action with 80 native and 80 independent SQL queries. PR20's final receipt check was performed by its action owner; a second independent receipt reviewer did not start. These are bounded project results, not broad runtime or roadmap acceptance.

## Reuse without dependency acquisition

1. Coordinate a read-only ownership lease with current workers. Keep the package in its identified location. Do not copy, relocate, install, overlay, repair, mutate, clear caches, or change permissions. An unresolved owner action is not permission to duplicate its work.
2. Bind only the selected manifest and exact existing native input. Capture verified manifest-listed Python source bytes through the reviewed narrow importer and exact distribution metadata. Refuse preexisting DuckDB-family modules and unlisted namespace/fallback imports. Do not replace this with ordinary site-package lookup.
3. Use a newly reviewed isolated launcher/subject with `-I -S -B`, a sanitized environment and fresh owned home/temp/run/capture leaves. Preserve trusted interpreter, standard-library, system-loader and immutable-ownership premises explicitly. Do not inventory the computer to strengthen the claim.
4. Retain fresh predicate-only FP checks at the reviewed boundaries, with exact guard/helper pins. No control repair or library search. Use explicit private connection ownership, an exact authorized native LOAD, disabled automatic extension acquisition/loading, and the reviewed external-access restriction.
5. Recheck declared inputs before and after the subject. Any added dependency, native change, timestamp path or changed loader is outside the old closure until separately reviewed. Prior passes do not supply missing inputs or authorize acquisition.

The reviews linked below contain the concrete importer, lifecycle and launcher contracts. Reuse their approved technical scope, not old test cases, harness run bodies, claims, results, or stopped/nonpass material.

## Proven SQL-only connection recipe and schema lesson, 4 November

The active goal10 lane has now used this exact existing closure for a new real Python-driver connection diagnostic and a separate corrected schema/transaction subject. See [cross-goal applicability and propagation](REAL-ENGINE-METHOD-20261104.md) for the goal-by-goal map, evidence and remaining dependencies.

For the reviewed **SQL-only** connection, initialize the fresh private temp_directory at connect with autoinstall_known_extensions=false and autoload_known_extensions=false. Then immediately execute and fully fetch SET enable_external_access=false, under the selected FP guards, before any subject SQL. Supplying temp_directory and enable_external_access=false together in connect deterministically raised the recorded PermissionException in the [actual diagnostic](research/roadmap/iteration-10/CONNECTION-PROFILE-RESULT-20261104.md). Keep both restrictions; do not omit the external-access restriction to get a pass. Reuse the exact reviewed [importer]([PRIVATE_REFERENCE_REMOVED]) and [connection helper]([PRIVATE_REFERENCE_REMOVED]) within a new action's own reviewed wrapper and ownership contract. These helper files are not standalone admission or an executable reusable run.

This is not a drop-in native-extension profile. A lane selecting native LOAD/callbacks must separately review its exact extension/API and LOAD/restriction ordering; it cannot silently alter this SQL-only profile or revive an unresolved native action.

The schema regression also established a concrete DuckDB issue to check early: a parent UPDATE involving a CHECK that mentions an indexed/referenced column may self-assign that column and encounter the engine's delete-and-insert foreign-key restriction. The corrected goal10 shape keeps command headers immutable and inserts a separate leaf completion ledger with one four-column composite foreign key to a matching unique header key. Adopt that shape only where the lane has the same relationship and after its own schema review. It is not a general migration, transaction-recovery or durability guarantee.

The corrected bounded SQL-only gate has 20 checks, 67 acknowledged subject execute/fetch helpers, seven deliberate constraint controls, one in-memory private connection and acknowledged close; its complete receipt review passed. No custom extension, JavaScript/Effect, public TIMESTAMPTZ, persisted restart or whole-goal acceptance follows. The prior consumed NONPASS subjects stay NONPASS. The exact evidence and source links are in the cross-goal note.

## Additional consumer and process-memory lesson: goal7

The [goal7 concrete extractor/driver gate]([PRIVATE_REFERENCE_REMOVED]) now independently adopted this method. Its corrected fresh action completed with first terminal exit 0: 22 checks, 74 acknowledged subject execute/full-fetch helpers, two private in-memory connections with both close ACKs and three complete captures. A [separate retained-evidence audit]([PRIVATE_REFERENCE_REMOVED]) completed consistently with 141 assertions. Source/input pins, full 39,177-byte evidence, exact 505-byte stdout/result equality, empty stderr/fault, 237 journal phases and declared fresh footprint agree. This is actual bounded reuse, not a migration, reopen, public-controller or full-goal pass.

A controlled fresh profile diagnostic also exposed an important launch limit: the added 1 GiB RLIMIT_AS caused a cap-sensitive SIGSEGV in the SET execute call, whereas the otherwise matched uncapped profile completed SET/full-fetch/close/rechecks. The uncapped profile's post-connect virtual address use exceeded 2.7 GiB despite memory_limit=96MB. DuckDB's buffer setting is not a process virtual-address or resident-memory cap. Do not add a low virtual-address limit to the proven profile without separately validating its consequences. Keep appropriate reviewed process bounds and the selected DuckDB limits, and do not infer a native allocator defect from the Python fault frame alone.

The initial failed action is preserved unchanged. The corrected action was independently selected with fresh targets after controlled diagnosis and explicit continuation, not replayed on uncertain old state. Such diagnosis does not release another lane's stopped material, acquisition or unknown operation.

For this separate goal7 capture path, direct builtin epoch_us/isinf timestamp projection with strict NULL/infinity tagging worked without ICU/pytz acquisition. It does not replace public4.1/5's specified timestamp route or clear their held dependencies. The exact extractor and frozen expectations are beside the linked result.

## Normal clean persistence and project-only evidence

Goal7's [later clean reader gate]([PRIVATE_REFERENCE_REMOVED]) now supplies actual separately selected disk write/checkpoint/close and fresh-process read-only reopen evidence, not merely in-memory rows. Its reader passed 21 checks, 28 acknowledged execute/full-fetch helpers, two complete 5/18-fact captures and two closes, with 99 journal phases, exact 455-byte stdout/result, empty stderr/fault, unchanged DB byte/hash pins, no sidecars and unchanged 69-file runtime. Separate writer/reader retained-evidence audits completed consistently with 618/477 assertions. This does not establish migration, backup, WAL-only/crash recovery, contention, public controller behavior or full goal7 acceptance.

For a separately authorized clean-persistence subject, select explicit ordinary CHECKPOINT/full-fetch after all COMMITs/results end, acknowledge close and retain the known initial writer terminal outcome. Shutdown close can catch checkpoint exceptions. Require exactly the selected clean DB files and no WAL/checkpoint/recovery/temp sidecars before read_only=True reopen; pinned read-only opening can otherwise replay WAL contents in memory. Use a separate process to avoid same-process DB-instance-cache ambiguity, complete canonical/raw/catalog recapture, and unchanged post-terminal DB byte/hash checks. Read-only mode and external-access disable are not whole-process/temp-directory sandboxes.

Keep evidence project-only from the start: use project-relative bindings, resolve/check actual paths in memory and record only necessary project data such as full answers, source/dependency identities, byte/hash pins, counters and phase labels. Do not collect/publish device/process identities or computer-path/configuration snapshots for a stronger attestation claim. The clean reader's new explicitly derived writer project capture is labeled as such; original mixed local receipts were not relabeled or published. No actual denial or safety-stopped material was bypassed by that source-only reader redesign. [Project-data policy](PROJECT-DATA-POLICY.md) still governs every package.

## Every new action still needs its own gate

- Establish current authority, exact reviewed sources/action, current input pins, coordinated ownership and immediately fresh no-clobber targets. A prior source review is not an action-time freshness check.
- Use a new independently scoped subject with its own contract and hand/reference expectations. Do not resume, reset or rename an old consumed claim.
- Preserve the actual initial outer terminal outcome. A yielded session, unknown owner call, late file or PASS-looking payload is not a completed run. Resolve uncertain state without replay or database reopening.
- Accept only the selected complete evidence: initial terminal success, exact separate canonical stdout/result agreement, empty separate stderr, acknowledged close, full answers/counters, expected fresh footprint and unchanged input pins. A read-only receipt check is not a second runtime observation or loaded-image proof.
- Stop at the first nonpass or uncertain outcome. Do not repair/retry a consumed subject, adopt late output, or use an alternate route around a tool denial. Report the exact action, target and observed status. Database inspection remains within the selected scope; PR19's post-action observer used metadata only and never reopened, queried, hashed or copied its DB.

## Separate historical acquisition boundary

The [independent rebuild record][rebuild] reports `EXECUTOR_LAUNCH_FAILURE_PRESTART` for fresh dependency acquisition: declared destination/start/result paths remained absent, and no project download/install/import/database action occurred. The shared selection calls that stopped acquisition/attestation operation **C** and explicitly excludes all C bytes from reuse.

This record does not expose a policy-denial reason or prove that every DuckDB execution was denied. It also does not authorize reviving C, completing its pipeline, reconstructing it elsewhere, or examining restricted platform paths. Persisted50/comparison84 and old holds/nonpasses remain unchanged.

For goal3.1, this guide supplies only a possible existing dependency input. Its own v2 loading, SQL/oracle comparisons, timing and acceptance require new evidence; no goal3.1 runtime pass follows from PR19/20.

[profile]: [PRIVATE_REFERENCE_REMOVED]
[review19]: [PRIVATE_REFERENCE_REMOVED]
[receipt19]: [PRIVATE_REFERENCE_REMOVED]
[review20]: [PRIVATE_REFERENCE_REMOVED]
[result20]: [PRIVATE_REFERENCE_REMOVED]
[rebuild]: [PRIVATE_REFERENCE_REMOVED]
