# INT-D: integrate the accepted Datomic adapter

**Result: integrated on `int/DA01`; both G0 gates, evaluator 108/108 and offline route harness pass. Contract verification fails only on expected Q61i. Package-wide pack check remains blocked by the unbuilt CLI. Ready for separate integration review.**

North star: the P1 named-cut and P2 atomic-write correctness floor. Goals and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`.

Implementation commit `fc07dc3b` (this report/evidence receives a later commit). Branch `int/DA01`; squash input `89c31355ec63d4dc01a337ec73ef4ef394b77293`; base `501532c0`. Independent acceptance: `verify/DA01` at `f9ee85b42a2edd7be805c189e70364e945e226b1`, `lab/verify/DA01/VERIFY-round3.md` (ACCEPT, adapter integration only). This report is integration evidence, not independent qualification.

## Evidence retention

Moved **131 files, 64,230,783 bytes** to `/Users/sam/Claude/Projects/triplex-db-2/evidence/EXP-DA01/`, retaining repository-relative paths beneath that root. [SHA256SUMS](SHA256SUMS) and [relocation.json](relocation.json) enumerate every path, byte length and SHA-256. Nineteen original parent directories contain checksum manifests and short indexes. Historical reports now link here. Each destination was hashed against its original bytes before the source copy was removed; original historical receipt hashes were preserved. Files over 1 MB and entire raw/oracle directories over 5 MB were selected before relocation. Remaining small files stay in Git. Historical collector scripts are retained as original source, not rerun or promoted as fresh evidence.

## Conflict resolutions

- `lab/bin/gate.mjs`: kept main's E01 dry-run/OBL plan branch and all existing lanes; added Datomic only to G0/G1, including matching dry-run validation. Retained DA01's Datomic build, skip accounting and live route-equivalence handling.
- `packages/testkit/README.md`: kept the complete RQ01 route-equivalence section and appended DA01's separate Datomic fixture section.

## Contract pins (contract untouched)

`lab/config/slots.json` adds lane D. Contract IMAGE_PINS previously has `{image: null, imageId: null}` for Datomic; now the slot configuration declares image `tx2-datomic:1.0.7745-da00`, image ID `sha256:34fb9db10a278ff5614e7ac59788a2456329c75d098871ce1831465e243f2dcf`. XTDB and QLever image pins are unchanged. The base checkout has no lane-D slot image; the contract's old lane-D image ID is null, not an older built image.

`packages/testkit/src/index.ts`: old SHA-256 `6001458f13ca711e9679d6b8e6fe3b746ea60f4e9deb5be08b2484b17ad87988`; new `cb89a55ced5426b8fa0af3523fbbeb73870e61e3622ebb42e8a78c3e67da8d28`. This is pinned at O-TESTKIT, CS-U44.pinnedSourceFiles and caseSourcesPinned.CS-U44; only new route-helper exports were appended. [Pin occurrence list](pin-changes.json). No other explicit contract file-content pin moves. Contract 0.3.13 must re-pin these; no acceptance files were edited. `build_contract.py --verify` reports only Q61i; it stops at contract self-checks and does not diagnose the testkit source drift. [Actual output](contract-verify.txt).

## Validation

Evaluator committed rerun: **108/108**, zero failures/skips, actual exit 0 ([log](evaluator-committed.log)). The retained first attempt ran against pre-integration HEAD and finished 80/108, 28 failures caused by the expected evaluator Git-blob integrity refusal ([first log](evaluator.log)); it was not relabelled or overwritten.

First Datomic G0 `G0-datomic-20261109T023429Z-2ea0ed`: FAIL, 1,252 passed / 1 failed / 66 reviewed skips; a shared qualification test dynamically imported the unbuilt XTDB dist package in this fresh worktree. XTDB G0 was run next, then Datomic G0 was retried with the first receipt linked by `--previous`. No assertion or harness change addresses this preparation failure.

Final Datomic G0: **PASS**, 1,253 executed/pass, 66 reviewed skips, no failures or unexpected skips; receipt [`G0-datomic-20261109T023947Z-e440ef`](../../runs/G0/G0-datomic-20261109T023947Z-e440ef.json), linked to the first failed run. XTDB G0: **PASS**, 1,218 executed/pass, 137 reviewed skips, no failures or unexpected skips; receipt [`G0-xtdb-20261109T023636Z-7f1117`](../../runs/G0/G0-xtdb-20261109T023636Z-7f1117.json). Both bind `fc07dc3bab98197dcdce92a30994fd59d5b230d8` and its unchanged executable source. The Datomic retry could not create an optional tracked-files stash in the sandbox (`could not write index`); its explicit executable-source identity still has zero diff bytes and no modified/untracked inputs.

Offline route harness: **PASS**, attempt [`INT-D-fc07dc3b`](../EXP-RQ01/evidence/INT-D-fc07dc3b/receipt.json), 93 testkit + 3 XTDB + 1 QLever tests, typecheck/build, and complete five-seed execution-plan coverage. All children exit 0; source/dist/admission remain matched, coverage token and current output freshness checked. This is the RQ01 offline harness, not a live Datomic test.

Final contract verification: actual exit 1, only Q61i ([result](contract-verify-result.json)). All 42 acceptance files are byte-identical to the base ([comparison](acceptance-unchanged.json)). Both merged dry-run paths were exercised ([Datomic G0](dry-run-datomic.json), [XTDB OBL](dry-run-obl.json)). `node --check lab/bin/gate.mjs` and conflict-file whitespace checks passed. Full upstream squash whitespace checking reported existing whitespace in vendor templates, signatures and historical captured output; these original bytes were retained.

Required `pack:check`: **FAIL**, unrelated unbuilt CLI tarball missing `package/dist/index.js` ([actual log](pack-check-config.log)); no clean-consumer qualification is claimed. First invocation refused pnpm's unsupported `--store-dir` option for `run` ([first log](pack-check.log)); the actual check used `--config.store-dir` plus the same owned-store environment and offline mode. Package artifacts were retained at `.experiments/pack/triplex-pack-9Wdxas` and copied to the durable evidence root. No root `pnpm check`, production durability or live Datomic gate was run.

Fresh G0 raw outputs/objects, route-harness output and package-check artifacts are preserved at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-INT-D/` (repository-relative paths), 180 files / 6522902 bytes; [GATE-SHA256SUMS](GATE-SHA256SUMS) and [gate-evidence.json](gate-evidence.json) bind the retained bytes. Small gate receipts and offline results are also committed here; content-addressed raw objects remain outside Git. This fresh collection is separate from the 131-file DA01 historical relocation count.

Dependencies installed frozen/offline using pinned pnpm 10.11.0 and the owned store; no registry downloads or dependency changes. [Install log](install.log).

## PASS audit (preamble 9a)

This integration introduces no new PASS-producing controller. The only executable conflict resolution extends existing lane admission; the gates and helpers below arrive from independently accepted DA01. Their claims remain bounded to their checks:

- `lab/bin/gate.mjs`: G0 build/typecheck/TAP/Vitest accounting requires nonzero actual execution, zero failures and exact reviewed skips; unique run/raw paths, source/lock/toolchain/script hashes, rebuilt dist manifests and outcome bytes bind this invocation. G0 has no engine slot and claims none. Datomic G1 requires complete conformance results and route-fixture outcomes, actual endpoint/image/container/config/owner identity, unchanged built output, retained oracle bytes and matching resident identity before/after. All gate receipt verdicts flow through existing `verdictOf` in `receipt.mjs`; a failed precondition stays a failure. G1 was not run here because Datomic is parked. Both final G0 results checked zero diff bytes and no modified/untracked executable inputs.
- `lab/bin/engine.mjs`: new Datomic image/ready/selftest results check extracted ZIP bytes, peer signature, source/distribution/context manifests, source stability, actual image readback and gateway version/source hash. Probe readiness is health only, not semantic acceptance. No engine lifecycle operation was run for this integration.
- `lab/bin/datomic-context.mjs`: staged context verification compares the exact file set and per-file hashes against this staging attempt before image build; context names include process/time identity. Context equality is not engine qualification.
- `packages/datomic/test/route-equivalence.test.ts` and query/property helpers: oracle input/output names are exclusive under a unique scope/UUID directory; fresh O-REPLAY output is required, expected rows and refusal tags are compared for each named cut/route, and cleanup is checked. Not rerun here against a parked resident.
- `lab/experiments/EXP-DA01/round{2,3,4,5}/collect.mjs`: retained historical collectors assert exact expected counts/content, named attempt/head and clean source/build identities, raw hashes, cleanup and image/context evidence. Their summaries remain historical and relocation does not create a new PASS. Historical consumer smoke/measurement scripts under `EXP-DA01-datomic-adapter/receipts/continued/` are retained attempt evidence only, not fresh qualification controllers.
- Unchanged `lab/experiments/EXP-RQ01/gate.mjs`: each actual test report must be fresh, nonempty and all-pass; build/typecheck and coverage checks verify content, five exact seeds, attempt token, exact execution-plan bindings, source/dist equality and the same live heavy-admission owner. It explicitly labels its reference offline-fold-not-independent and does not certify live engines.
- Evaluator test results are assertion counts from this execution, not obligation closure or engine qualification. Evidence relocation checks content via SHA-256, freshness via the current original bytes, and binding via retained relative paths and durable destinations; it asserts byte preservation only.

## Limits

No engine lifecycle changes, main merge, push, publish or deployment. Datomic was already parked with its retained volume when inspected ([engine state](engine-before.txt)); live Datomic route/conformance reruns therefore remain unverified. This integration does not close durability, performance, tenant isolation, erasure or production admission goals. Acceptance remains default-off pending the separately required qualifications. A separate reviewer must assess this integration.
