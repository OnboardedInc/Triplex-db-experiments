# INT-Q: accepted P2Q + SQL01, default off

**Result: integrated on `int/P2Q-SQL01`; requested applicable gates pass. Ready for separate integration review, with legacy segment-verifier exclusions and retained first failures documented below.**

North star: P1 exact named snapshots and P2 durable atomic writes, with P4's position-retired H1 correctness floor. Scope and targets are only `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`.

## Integration

Branch `int/P2Q-SQL01`, base `7a27b149`. No main merge or push.

1. Merge `exp/P2Q-qlever-log-broker` at `be588639` (accepted product `561410d2`, V-P2Q round 11 at `f0e881c`) in merge commit `6ae38068`.
2. Merge `exp/SQL01-broker-sqlite` at `4863a8e0` (accepted default-off by V-SQL01 round 2 at `73fbe45`) in merge commit `8e9b682f`.
3. Integration/H1 code in `3d92e82b`; gate fixture and skip-list updates in `7c9a38e2`. Independent Q89i oracle correction in `973d5e86`. Later commits contain report/evidence updates; the product source stays identical.

Broker activation remains opt-in through the existing `broker` option or `QLEVER_COMMIT_PATH=broker` with an explicit directory. SQLite is used only inside that opted-in broker. Ordinary runtime construction retains A0, including main's compact-encoding option and read-only recursion.

### Every textual conflict

| Merge / path | Resolution |
| --- | --- |
| P2Q / core runtime/index.ts | Keep main's FrontierClosure exports and add accepted P2Q's read-constructor/policy exports. Neither export group replaces the other. |
| P2Q / QleverQueryExecutor.ts | Keep main's read-only recursion evaluator and rule-relation VALUES compilation; run its requests through P2Q's snapshot-bound `replicaClient`. Keep P2Q private read provenance and basis routing. |
| P2Q / QleverStorageAdapter.ts | Combine compact encoding with the default-off broker option/early dispatch. A0 validates and uses its existing encoding. |
| P2Q / qlever index.ts | Compose both option sets. Preserve main's encoding selector and read-only relation exports, and P2Q's fresh-connection broker lifecycle, `resolveQueryBasis` wiring and private read boundaries. Exclude internal resolveBasis from user queryLimits. Do not restore the removed scratch-update error. |
| P2Q / native/NativeQueries.ts | Retain main's read-only relation resolver and read-only public client wrapper, while retaining P2Q snapshot availability/incarnation checks. Relation reads use P2Q's `replicaQuery`; no scratch updates/cleanup are restored. |
| SQL01 / BrokerStorageAdapter.ts, reference default | Whitespace-only: accepted P2Q formatting. |
| SQL01 / BrokerStorageAdapter.ts, old future-position guard | Keep P2Q's common `readBasis` policy instead of SQL01's duplicate older per-method wait. |
| SQL01 / BrokerStorageAdapter.ts, row return | Keep P2Q's `snapshotRows` retirement-tuple masking, composed with SQL01's asynchronous H1/source selection. |
| SQL01 / BrokerStorageAdapter.ts, dependencyState and resolveQueryBasis | Keep accepted P2Q transaction-aware `readBasis`, empty-read availability check, private policy wrapping, and `openSnapshot` resolution. Adapt its two overlay lookups to SQL01's asynchronous indexed worker queries. Preserve remaining deadline after basis resolution. Reject the older unwrapped/transaction-unaware SQL01 block. |

Other shared-file merges, including broker.ts, verifier harness, broker-fixes tests and the six lockfile importer additions, merged automatically. No acceptance files were edited.

## Q89b and Q89c

SQL01 round two already bypassed H1 in the adapter for any resolved basis with `recordedAt`, using complete indexed source rows and combined temporal predicates. That bypass remains.

H1 now also refuses at its own worker boundary: its pull request can carry `recordedAt`, the worker rejects that request before its position-retirement query, and the host RPC maps the refusal to `H1BasisUnsupported extends ReadError`, reason `h1-record-time-unsupported`. `HostLog.pull` and `HostBroker.pullAt` accept a resolved basis object while retaining numeric-position compatibility. The error and basis type are exported. No empty ineligible result substitutes for the record-time refusal.

`packages/qlever/test/h1-route-equivalence.test.ts` adds an actual SQLite H1 driver to the public testkit `/route` harness. A seeded history includes the 40-assertion/10-retirement pattern, replacements, valid-time edges and timestamp/position inversions. Forced H1 refuses T and TP; the complete persisted source answers all shapes. Identical requests are repeated after later commits and actual pinned/unpinned purge. The harness compares complete snapshot rows and checks typed refusal. Its default offline-fold reference is explicitly diagnostic, not an independent oracle; SQL01's separate generated-event oracle supplies an independent cross-route comparison.

The compact-encoding source scan now excludes only specific JSON property-presence checks and the broker claim-metadata write. It still scans broker files for any actual RDF query reader of an omitted channel.

## Fresh gates

All final listed runner receipts have `sourceStillMatches:true`, actual exit zero and retained raw logs. The earlier direct package receipt has an output-inventory false flag, explained in the initial audit; the table uses the complete source-bound G0 package rerun instead. Final package/core/controller/skip-list source is unchanged since `7c9a38e2`; the later code change is only the independently adapted SQL01 oracle. G0 performs builds and declaration/type checks as part of both lanes.

| Gate | Observed result | Receipt |
| --- | --- | --- |
| QLever package | 235 passed; 26 named live skips | [receipt](/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-INT-Q/g0-qlever-final-01f5f896-4503-41cc-9e55-6a0fc48d88d9/receipt.json) |
| P2Q applicable offline matrix | 873 passed; 22 skips (21 live and one obsolete burned-LSN test) | [receipt](/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-INT-Q/p2q-final-b0895461-917f-401c-a3e1-23c27d3b52fd/receipt.json) |
| P2Q applicable storage controls | 5 passed; 3 obsolete infrastructure assertions explicitly filtered | [receipt](/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-INT-Q/p2q-storage-1c04f44c-92b3-4eda-bacd-1c08384bbecb/receipt.json) |
| SQL01 semantic suite | 11/11; 77,616 generated reads / 38,808 route pairs; zero mismatches | [receipt](/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-INT-Q/sql01-q89i-619916b4-53b9-46a3-bb8f-b9f9579fd1bf/receipt.json) |
| Testkit route harness | 93/93; actual H1 driver also passes in the package/G0 suite | [receipt](/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-INT-Q/route-harness-c0550040-530c-47d5-b947-b9bcf9a908d2/receipt.json) |
| G0 QLever | 1,388 passed; 76 exact expected skips; full scope | [receipt](/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-INT-Q/g0-qlever-final-01f5f896-4503-41cc-9e55-6a0fc48d88d9/receipt.json) |
| G0 XTDB | 1,218 passed; 137 exact expected skips; full scope | [receipt](/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-INT-Q/g0-xtdb-a5a42eec-fe44-4074-b0d7-1f7c338f2096/receipt.json) |
| Evaluator Q87 | 108/108; zero failed/skipped/cancelled | [receipt](/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-INT-Q/evaluator-final-21a868ef-7134-4ef8-a884-7f4813446e14/receipt.json) |
| Live QLever broker | 5/5 on shared qlever-dev; timings DIAGNOSTIC | [receipt](/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-INT-Q/qlever-live-7e8fc628-5cf0-4a3b-871b-5c9e33e3c376/receipt.json) |
| Package packing | 13 tarballs and clean consumer install verified | [receipt](/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-INT-Q/pack-final-9fbe5f6a-c52b-41c4-bcc4-5e72410b9b2d/receipt.json) |
| Contract verify | Exit 0; byte-identical regeneration; transitive hash 93da54904fa7e382125b33bb002db9c8b14db1522787f606a353fa48647687ec | [receipt](/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-INT-Q/contract-final-1eed5fd4-70a2-4209-8bfa-ad82277e8ee5/receipt.json) |

The exact selected commands and all source hashes are in the receipts; `gate-receipts.json` indexes their identities and `RUN-SHA256SUMS` seals fresh controller output. [PASS-AUDIT.md](PASS-AUDIT.md) lists all result-producing paths, content/freshness/binding checks and historical-controller limits. These are builder results, not the independent promotion review.

## Gate adaptations and retained failures

- First package run preceded the core build required by a tsx subprocess fixture. Retained its failure. Built core/testkit/QLever, corrected a new fixture path and its same-command assertion/retraction bookkeeping, then verified the actual H1 harness.
- First broad P2Q run: 873 passed, two failed, 21 skipped. One failure creates an obsolete segment file to test a burned LSN; SQLite intentionally refuses legacy segments. The other requires the round-ten mutation scratch tree. The final applicable offline matrix excludes that scratch-only test, the superseded round-ten type control (round eleven runs instead), removed segment/flock/FileHandle infrastructure suites, and the burned-LSN case. A separate storage run retains duplicate/CAS/feed/ordinal semantics. These exclusions are explicit; the full historical segment verifier is not claimed to pass on SQLite.
- First SQL01 run: seven passed, two failed because old outage fixtures supplied prose-only TypeError("fetch failed"). Accepted P2Q intentionally requires a structured transport identity. Tests now supply ECONNREFUSED as the error cause; product classification is unchanged. Both original failures remain.
- The accepted SQL01 round-two routes/checkpoint tests were copied from `73fbe45`; their original hashes are recorded. First execution: ten passed, one failed because the independent oracle returned later retirement metadata at older cuts. Accepted P2Q implements Q89i snapshot semantics. The oracle adaptation masks all three future-retirement fields independently, without importing product visibility/mask helpers.
- First G0 QLever failed because the local pnpm wrapper duplicated an already supplied store option, causing pnpm to treat it as an array; qualification/XTDB dist was consequently absent. The corrected wrapper adds the explicit owned store only when absent. Both wrapper versions are retained. G0 also discovered the five explicit live broker cases absent from main's expected-skip list; only those named tests were added (21 to 26 QLever live skips), pending the integration reviewer's review of this gate-list change.
- First package-packing attempt found the unbuilt CLI dist entry. Built the required local packages and reran: all 13 tarballs and a clean consumer install passed. The original failure remains.
- Early collector receipts had sourceStillMatches:false solely because fresh SQL01 JSON output entered their untracked-input inventory. Before later edits, all existing input bytes were checked: none changed or disappeared. `initial-source-audit.json` additionally checks their recorded inputs against their exact Git head. The collector now excludes evidence output from source inventory. These original false flags are retained, not rewritten.

## Pins and evidence

`pin-changes.json` scans 243 paths pinned by the acceptance JSON documents, including path/hash objects and keyed hash maps, and intersects them with the integration diff. **No acceptance-pinned path moves**, so there are no old/new changed-pin pairs. `lab/acceptance/` is byte-identical to the base. The separate contract builder owns 0.3.14; no repinning was performed.

Historical evidence was relocated byte-for-byte outside Git: 6,168 files / 18,479,402 bytes under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-INT-Q/historical/`, preserving original repository-relative paths. Five `HISTORICAL-SHA256SUMS-*` manifests and `historical-evidence.md` index it. Every destination was read back and hashed before removing its working copy. Accepted branches and original Git history remain unchanged. Historical reports/manifests can be resolved against that durable root.

Fresh output, original failures, exact commands, Git/source hashes, timestamps, disk observations and log hashes are under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-INT-Q/`. All heavy commands used the shared heavy admission mechanism; admissions stayed above 5 GiB free disk. Install was frozen/offline with pinned pnpm 10.11.0 and the owned store. No global config/cache modification.

Fresh bounded gate output and synthetic fixtures were copied and SHA-256 read back: **827 files / 1,879,696,709 bytes** under `evidence/CX-INT-Q/fresh/`, preserving worktree-relative paths. `FRESH-SHA256SUMS-1` inventories those bytes. Originals are retained. Source-bound G0 object copies include every object referenced by all three G0 attempts. Pack tarballs/consumer artifacts also remain at `runs/pack/CX-INT-Q/triplex-pack-qtFc9d`; dependency caches were not copied into the evidence source inventory.

Automatic approval review rejected a proposed copy-and-delete relocation of broad output roots because task ownership was not sufficiently established for deletion. No part of that command ran. The implemented `seal-evidence.py` makes read-only, checksum-verified copies and retains all originals; nothing remains blocked. The final process inspection found no integration fixture processes. Generated SQL01 JSON and the three small G0 receipts remain deliberately untracked in the worktree; all are retained by the durable evidence index and are excluded from the commit.

## Limits and next review

These are builder gate results for independent integration review, not self-promotion. No production/performance acceptance, target-scale workload, physical power-loss qualification, new 50-stop durability run, erasure or tenant-isolation qualification, PostgreSQL integration, full root check, or deployment/publish was performed. The historical unexplained assertion-only 30/40 observation remains an open investigation if it recurs. Unbounded WAL growth under indefinitely pinned readers remains a policy/qualification gap. Timings on shared qlever-dev are DIAGNOSTIC under Q91a.

No subagents, engine lifecycle action or exclusive slot were used. All semantic live tests target unique graphs on shared qlever-dev at port 7070; engine status was read only. No main checkout edit, forbidden service, merge to main or push.
