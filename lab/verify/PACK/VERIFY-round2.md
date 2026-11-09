# CX-VPACK: EXP-PACK round 2 independent review

North star: the packaging correctness floor for the public TypeScript boundary used by all lanes, under `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`. This review does not qualify engines or performance.

**Verdict: ACCEPT within the assigned packaging-review scope.** Both round 1 high findings are closed by fresh independent checks, including a newly authored export-map case. No additional high finding was reproduced. No gate or package fix was made by this reviewer; temporary fixtures were restored.

Reviewed target: `6a7551b6` (`exp/PACK-lab-gate`). The local reviewer branch was rebased onto that target, retaining the prior review. Tests executed at `e74ae0cab4a941ba6e8a39dfa25c4d040d003bb5`, which adds only the earlier review files to the target. The controller asserts its gate bytes match the exact target and that package, gate, policy, checker, lockfile and acceptance sources have no diff from that target before and after testing.

## Original findings and new export check

1. **Closed — high, silent workspace omission.** At `lab/bin/check-packages.mjs:134`, actual pnpm workspace discovery now drives selection; `:153` classifies every returned manifest against `lab/config/pack-exclusions.json`. An added untracked workspace package with the original `CX_VPACK_ADDED_BUILD_MUST_FAIL` build is discovered, selected in the recursive build command and rejected before packing. Its manifest hash is in the fresh failure receipt. It is neither omitted nor silently excluded. Baseline accounts for all 25 workspace identities: 12 checked packages and 13 named, reasoned exclusions; unknown packages cannot silently inherit an exclusion. The requested fix is verified; no further fix is proposed for this finding.
2. **Closed — high, runtime resolution without evaluation.** At `lab/bin/check-packages.mjs:575`, each discovered public specifier is now evaluated with `await import(...)` in a separate Node invocation from the new installed consumer. The original QLever root throw fails this gate during that import, with its exact marker in the command log; an independent direct import from that same consumer fails too. Baseline executes exactly 22 distinct one-specifier import commands, matching all packed manifests and the receipt's completed-import inventory. The requested fix is verified; no further fix is proposed for this finding.
3. **New subpath is discovered and enforced.** Added `./cx-vpack-round2` to QLever's exports map, targeting a new `src/CXVPACKRound2Entry.ts` compiled by the real build. The successful fixture logs an attempt-unique token, PID, cwd and module URL. The gate runs a 23rd isolated import; its token matches this attempt, cwd is this attempt's consumer, URL names the newly installed subpath, and PID differs from the controller and gate. A separate attempt puts `CX_VPACK_R2_NEW_ENTRY_THROW` in the same new export and fails on its specific import command. Fresh packed and installed subpath JS hashes match in both attempts. This proves the implementation follows changed export maps rather than freezing the original 22 specifiers.

## Fresh observations

| Case                            | Observed gate result                                                            | Evidence attempt      |
| ------------------------------- | ------------------------------------------------------------------------------- | --------------------- |
| Baseline                        | PASS, exit 0; 66 commands; 22 isolated imports; 12 stale-dist sentinels removed | `triplex-pack-l7NevY` |
| Added failing workspace package | FAIL, exit 1; inventory plus selected build, no packing/imports                 | `triplex-pack-bs57KS` |
| Original QLever root throw      | FAIL, exit 1; failed QLever isolated import, direct import control also fails   | `triplex-pack-pDpwxs` |
| Newly added successful subpath  | PASS, exit 0; 67 commands; 23 isolated imports; exact evaluation marker         | `triplex-pack-WOhT63` |
| Newly added throwing subpath    | FAIL, exit 1; failed import of the new subpath with its planted marker          | `triplex-pack-xZmdD9` |

Both successful attempts check installed package root JS against each fresh tarball, ensure installations resolve inside their own consumer/node_modules, compare import commands against every packed export, and complete strict declarations, SQLite behavior and installed CLI checks. Every gate output retains DuckDB's OUT-OF-SCOPE/unresolved diagnostic. Datomic and the other excluded workspaces remain explicitly excluded, not qualified packages.

Execution was offline. Workspace tooling came from the existing frozen installation with the unchanged lockfile. The npm shim copies registry `_cacache` bytes from the retained builder cache into each new attempt cache and forces `npm_config_offline=true`; no consumer node_modules or old dist supplies a passing result. All gates ran inside the controller's admitted `heavy.mjs` slot, recorded in `binding.json` and each observation. The controller asserts the 5 GiB host-free floor before every case, and the gate checks it again before building. No engine slot or engine connection was used.

## Evidence, disk and restoration

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VPACK/round2/`.

- `binding.json`: target/execution HEAD, actual gate/policy hashes, workspace inventory, exclusion policy and admitted heavy holder.
- Per-case directories: gate output, new attempt receipts/command logs, exact fixture bytes and hashes, tarballs, consumer inputs/lockfiles, and direct-import control where applicable.
- `reviewer-source/`: exact executed controller and helper snapshots.
- `results.json` / committed `ROUND2-results.json`: all five outcomes and exact attempt paths, including new-export command and evaluation marker.
- `audit.json`: final fixture restoration and unchanged reviewed sources.
- `round1-dependency-cleanup.json`: bounded retirement of old reviewer consumer/node_modules and npm-cache only.

The first new-subpath failure control, `new-export-throw/attempts/triplex-pack-kIWYCd`, was correctly rejected during import with `SyntaxError: Export 'marker' is not defined in module`. Its throw preceded an exported constant; the build removed the unreachable constant and retained its export. The reviewer controller stopped because it required the intended throw marker, which this emitted module could not reach. That diagnostic and exact executed fixture/tool snapshots remain unchanged. The reviewer fixture was reordered to export its constant before throwing, then rerun in `new-export-throw-rerun/`; no product code was fixed. `binding-rerun.json`, `results-before-resume.json`, `reviewer-source-rerun/` and `../round2-controller-rerun.log` distinguish the continuation from the first attempt. The final result index adds the completed corrected control; it does not adopt or overwrite the first failure.

Host free briefly measured below 5 GiB while an already admitted baseline was running; new case admissions remained guarded by fresh disk assertions. Free space subsequently recovered above 8 GiB. The reviewer also reclaimed ten completed round 1 dependency/cache directories, after confirming terminal receipts, absent old gate PIDs, owned exact paths and absence from the original evidence manifest. All original source/fixture bytes, tarballs, receipts, logs, consumer manifests and lockfiles remain. This supersedes round 1's retention of disposable installations and caches; its checksummed proof is preserved. Workspace node_modules and other agents' data were not removed.

`ROUND2-SHA256SUMS` covers 459 new durable raw evidence entries, excluding dependency installations, caches and symlink helper directory. `verify-hashes-round2.mjs` independently reread all 459 entries and all 391 original entries successfully; counts/timestamps are recorded in `ROUND2-checksums-verified.json`. Aggregate controller output is retained beside the durable root as `../round2-controller.log`. Large evidence stays outside git.

All temporary package/source changes restored in finally blocks. Only new files under `lab/verify/PACK/` are committed. Gate SHA256 is `f556e34af0bbc5316070a373c0fc874cdc67a608711306b08dab01075b730ec6`; policy SHA256 is `2891744d1cc02d9619f8d65e02a715e72ff5c3b063f015726f11a82ae71dfb04`, matching the reviewed revision. No acceptance file or pinned source changes were made; there are no moved pinned-path hashes to report. No contract re-pin was attempted.

## PASS and verdict audit

These are all reviewer code paths that turn observations into results or receipts:

1. **Source and admission binding:** the controller checks the gate against target bytes, source diffs against the target, and its parent PID against the current heavy holder before running cases. Each gate receipt must identify this execution HEAD/root, exact gate/policy hashes and fixture hashes, including previously untracked new-package/new-entry files. Start/finish timestamps must belong to the freshly allocated, exclusive case/attempt directories.
2. **Gate observations:** result recording requires process exit and receipt status to agree, current command logs to rehash correctly, and planted failure markers to be present. Added-package rejection must occur in the actual selected build after inventory; QLever rejection must occur in that exact specifier's isolated import. Thus no historical receipt or bare zero exit establishes a result.
3. **Successful artifact/import checks:** current tarball hashes must match retained bytes; installed root bytes and locations must match those tarballs and this consumer. Every packed export maps to one successful fresh Node command and completed-import entry. New-subpath bytes must match tarball/installation and its token/cwd/URL/PID must establish evaluation in this attempt's separate process. The throwing new-subpath command must fail with the current marker.
4. **Cleanup receipt:** retirement requires the completed old controller, terminal bound gate receipts, absent gate PIDs, exact owned dependency/cache paths and no overlap with retained manifest entries. Only after those checks does deletion occur; path absence is checked and fresh before/after free-space observations are recorded. This is a retention receipt, not a semantic PASS.
5. **Evidence receipts:** controller manifest generation hashes actual retained files and rereads each value. The separate admitted checksum verifier reads each committed old/new manifest, bounds each relative path to its evidence root and checks actual SHA256 bytes before recording fresh counts/timestamps. These verify proof bytes, not package correctness by themselves.
6. **ACCEPT:** this scoped verdict follows the fresh baseline, both original failures now rejected, and successful plus failing new-export evaluation controls, with restoration and provenance checks above. No exclusion, historical builder PASS or engine result is counted as independently verified success.

Final focused syntax, oxlint, oxfmt and staged whitespace checks passed. The primary controller was formatted before execution; the exact executed cleanup helper is retained even if committed formatting differs.

## Limits and open questions

No unresolved finding remains within this round's assigned scope. The policy still explicitly leaves Datomic packaging unqualified and DuckDB's reported TS4023 failures unresolved. I did not independently repeat the builder's other four round 2 planted controls (missing export, broken declarations, SQLite throw, stale-source error), run full root checks, build DuckDB, exercise native FoundationDB or a live engine, qualify performance/acceptance, publish, push or merge. No production code was fixed by this review.
