# XRUN scale window — CX-XRUN

Result: **all three requested full XTDB gates PASS; persisted-mode collector is incomplete (exit 1), retained without retry.** No independent promotion or general compact-on acceptance is claimed.

North star: correctness floor for P1 exact-cut reads and P4 read-only traversal; P2 compact commit qualification. Goals and targets: [SCOPE](../../SCOPE.md), [NORTH-STAR](../../NORTH-STAR.md), [TARGETS](../../TARGETS.md). This is a builder execution hand-back for a separate reviewer.

## Source and interpretation

Branch `exp/XRUN-scale-window`, executed source **`e90c15846a7fb0b93f7d4debdef3dcb76a4f24d4`**, tree `8a31beed7ea8dac4f35688d6e1cb52f86a3e79a2`. X02 `7b11af08`, C8 `514c3b6` and J01 `0d9a860` are ancestors. Read INT-XCJ's complete integration report, J01 REPORT/REPORT-round2 F2, and `verify/J01:lab/verify/J01/VERIFY-round2.md` (F2-R2). The reruns exercise the combined source already on main, not separate historical pre-integration branches. One full G1/G2 pair covers integrated X02/C8 under Q76f, followed by J01 compact-on full G1.

No implementation, contract, dependency pin or lockfile changed. All three receipts have the same sourceTreeId `29626bf1ba00c98b532d2278d285100fddb4c642181c8da6d18aa3c9bfdf2357`, zero executed-source diff and no modified/untracked executed inputs. The first run is wholly clean; subsequent Git dirty flags contain only earlier untracked canonical receipts in `otherDirtyPaths`. No contract-pinned file's hash was moved by this work; `lab/acceptance/` is unchanged.

## Fresh gates

| Purpose | Run ID / canonical receipt under `lab/runs/` | Encoding | Full observed result | Final gate volume bytes |
| --- | --- | --- | --- | ---: |
| X02 + C8 G1 | `G1/G1-xtdb-20261109T033339Z-61d306.json` | explicit `a0` | **88/88 PASS**, 44 current + 44 reopen, complete suite PASS, 0 fail/skip | 16,375,808 |
| X02 + C8 G2 | `G2/G2-xtdb-20261109T033820Z-12808b.json` | explicit `a0` | **142/142 PASS**, 0 fail/skip | 3,903,488 |
| J01 compact-on G1 | `G1/G1-xtdb-20261109T034051Z-ab5e08.json` | explicit `compact` | **88/88 PASS**, 44 current + 44 reopen, complete suite PASS, 0 fail/skip | 15,392,768 |

G2's read-client wire counter observed **438 statements, zero writes, zero commits and zero unparsed operations**. This covers the native runner's read client, not every possible application read. Its default language routing reports 22 XTQL / 116 SQL / 4 hybrid answer executions; this is not a claim that all 142 ran independently in each language. G1 uses the Triplex Datalog foundation path.

All receipts are `runKind: acceptance`, but these gate results do not themselves promote the implementation or close broad P1/P2 targets. They bind their own freshly built JS/declarations, lockfile, oracle/fixture inputs, raw outcomes and engine observations. No assertion/test failure occurred in the three gates.

## Slot, residents, ownership and cleanup

Each gate used a newly created empty **`tx2-xtdb-s1-data`** volume mounted at `/var/lib/xtdb`, with only its owned `tx2-xtdb-s1` engine using it. The same volume name was removed and recreated between gates; no fixture reuse, clone or inherited slot state. Holder **CX-XRUN**, slot **xtdb-s1**, endpoint `postgres://xtdb:xtdb@127.0.0.1:5471/xtdb`, cap **3,758,096,384 bytes / 2 CPU**, image `sha256:a6a426505b95a36e4e0e1d0de88efcf4220cb6bde8f1f5e594b0a1f92a948a77`, config `13f5a70b36655b51fdf6daca77cc8bc215c4ef8bc044569867500fb286458927` throughout.

Container identities, in table order:

- `1bb78de139cf2346af0416f84af97425ca324596c9e98f7f95c524bd9c29a2f5`
- `a98a827c2773b8cd7dd65e17424b25f08f7e164415689b874bed47e1048a38dd`
- `0759d2cff7316d65dc00f5181848db4762f9d4f5421409327eb3ad6cc7b36939`

Every gate receipt and launch/outcome envelope records the slot, exact container/config, data volume and resident set. Co-running residents were only **tx2-xtdb-dev (3 GiB)** and **tx2-qlever-dev (3.5 GiB)**, both healthy. Datomic was already parked by the orchestrator and stayed parked. The pool admitted each exclusive reservation; no resident lifecycle change or other holder's slot was touched.

All three teardown commands completed successfully through `engine.mjs down --remove-volume`: exact owned container gone, data volume absent, reservation and slot lock released. The explicit task instruction to remove created volumes supersedes F2's historical retain-volume recipe. `engine-final.log` shows s1 absent, pool back to 6.5 GiB reserved, and both shared residents READY. All three volume incarnations are removed. Existing retained/forensic volumes were preserved.

## J01 launch and persisted-mode evidence — first nonzero check retained

`launch.mjs` is the executable envelope missing from the earlier F2 recipe. Before spawning `heavy.mjs`, it writes exact argv, the actual explicit encoding environment passed to the child, source identity, lockfile hash, launcher hash, slot owner bytes/hash, full container inspection, resident set and volume size. Its outcome links that launch hash to the unique fresh canonical receipt, built-file manifest/hash, raw report/hash, child exit code and final owner/container observations. Gate `cleanEnv` preserves `TRIPLEX_COMMIT_ENCODING`; no free-text note is used as encoding proof. Built bytes are produced by the gate after launch and linked in the outcome, not represented as pre-existing launch-time builds.

After compact G1, `collect-mode.mjs` ran through heavy admission **before cleanup**, read all 332 transactions from this clean volume and fetched every corresponding source-log record, without P9 sampling, record-size exclusions or a time-window filter. It retains raw transaction metadata, raw `tx_ops`, exact scope-to-record-ID mapping and both guard-form counts. All 332 transaction IDs had a source record. Owner, container, start time and config observations remained stable.

It observed compact guards in **85/89 exercised scopes**, with no A0 guard record in those scopes. The other four have **NO-SCOPED-WRITE-OBSERVED** dispositions, not a fabricated encoding success. They are current/reopen executions of:

- `datalog rejects invalid and unbound queries with backend-neutral typed errors`
- `reserved Triplex namespaces reject ordinary writes atomically`

Their fresh G1 executions all PASS. Source inspection of `packages/testkit/src/index.ts` identifies validation-only queries and deliberately rejected writes/atomic rollback checks, consistent with the lack of scoped source-log writes. This is an explanation, not a retrofit to the collector verdict. The collector conservatively requires a compact guard witness for every scope, so it wrote **`stable:true, complete:false` and exited 1**. The first nonzero check is preserved in `J01-mode.log` and `J01-compact-mode.json`; no retry, relaxed rule, further gate or mode promotion followed. Independent review must adjudicate these explicit no-write dispositions or request a separately authorized collector revision. The raw data is retained for that review even though the owned engine has been removed.

## Reproduction and evidence

Node 22.23.2 / pnpm 10.11.0. Worktree dependencies were initially absent; heavy-wrapped offline frozen-lockfile install succeeded from the sole owned store `/Users/sam/projects/triplex-db-2/.pnpm-store`. No pnpm configuration was set. Host disk free was approximately 16 GiB initially and 14 GiB before compact G1, above the 5 GiB floor. All Docker use went to `unix:///Users/sam/.colima/triplex2/docker.sock`. Heavy admission waits are retained; they were not bypassed.

For each new engine, sequentially:

```sh
node lab/bin/engine.mjs up --lane xtdb --slot s1 --holder CX-XRUN --exp XRUN-scale-window
node /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-XRUN/launch.mjs CX-XRUN-XC-G1 G1 a0
# Next empty volume: launch.mjs CX-XRUN-XC-G2 G2 a0
# Next empty volume: launch.mjs CX-XRUN-J01-G1 G1 compact
# Only after compact G1 and before its teardown:
node lab/bin/heavy.mjs --label CX-XRUN-J01-mode -- node /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-XRUN/collect-mode.mjs lab/runs/G1/G1-xtdb-20261109T034051Z-ab5e08.json /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-XRUN/CX-XRUN-J01-G1-launch.json
node lab/bin/engine.mjs down --lane xtdb --slot s1 --holder CX-XRUN --remove-volume
```

Launch expands to `node lab/bin/heavy.mjs --label <label> -- node lab/bin/gate.mjs <gate> --lane xtdb --slot s1 --holder CX-XRUN --exp XRUN-scale-window --run-kind acceptance --note <label/mode>`, passing the explicit encoding and owned store environment. Exact per-attempt commands are in the launch JSON. These filenames are append-only: use new labels/new receipts for any future attempt, not these historical paths.

Durable evidence root: **`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-XRUN/`**. The committed `SHA256SUMS` indexes all evidence there: envelopes/outcomes, install/engine/gate logs, copied raw directories, canonical receipts, complete referenced content-addressed object closure, raw persisted log and mode result. The source log is over 8 MB and stays out of Git. Repository copies of the small executable launch/collection/archive tools permit inspection. `archive-audit.json` records raw-content/identity checks and retains `modeQualified:false`.

## PASS / receipt audit (rule 9a)

Every observation-to-status location used or added here:

1. **Existing `gate.mjs` G1/G2 and `receipt.mjs:verdictOf`**, unchanged: compare the actual fresh report executions, full denominators/suite, endpoints, packet/oracle inputs and C8 counts, with source/build and engine binding. The archive audit independently rereads actual G1 execution statuses/suite and G2 statuses/counter, not just the gate's exit/verdict. Raw-report hashes and the receipt object closure are checked. This is builder validation of receipts, not independent verification.
2. **`launch.mjs` outcome**, new: records the real child close code and links only newly created receipt filenames to their bytes/build/raw hashes. It emits no semantic PASS. Before/after exact container/owner identities and launch/receipt timestamps are checked again by `archive.py`; each gate binds its source, slot and inputs.
3. **`collect-mode.mjs` per-scope `COMPACT-OBSERVED` / `NO-SCOPED-WRITE-OBSERVED` / `UNQUALIFIED`, and `stable`/`complete`**, new: checks actual raw guard text in the fresh slot's full transaction/source records, mapped to each exact scope from this attempt's report, bound to report/receipt/launch hashes and owner/container/config observations. Missing source records throw; no scoped evidence is never counted as encoding success. The incomplete status and exit 1 are retained. Scope matching uses the exact UUID name or its UTF-8 hex representation; it is text-form evidence, not an independent Arrow decoder.
4. **`archive.py` assertions / `archive-audit.json`**, new: reads back actual content hashes for every referenced object and durable copy; validates full raw case results, zero skips/failures, expected counts, exact source head, zero executed-source changes, matching owner/container, fresh timestamp order, new receipt hashes and named resident set. It does not replace mode status with PASS; `modeQualified:false` is explicit. Its checksum manifest verifies bytes, not semantics.
5. **This report's PASS rows** reproduce those exact three receipts and verified raw denominators. They do not turn the incomplete mode check into acceptance.

## Limits and handoff

No QLever/Datomic gates, separate all-XTQL/all-SQL G2 matrix, original-branch reruns, full root/pack checks, performance scale/concurrency measurements, erasure qualification, compact-off persisted-log capture, both-lane Q81c closure, merge, push, deployment, publication or agent delegation. The normal G1 `reopen` phase is the existing second initialization with fresh scopes, not a database crash/recovery or re-read of the original scope. No implementation was changed to make gates pass. General compact-on qualification and independent adjudication remain open; the three requested gate runs themselves passed.
