Hypothesis NOT YET ESTABLISHED. O1–O5 pending; this is a live work report, not a verdict.

North star: P1/P4 pull CPU, P2 commit latency, P3 feed waits and P5 growing seeds. Goals and authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; fast-forward protocol 0b.

## Integration boundary requiring dispatch clarification

The three expressions in `required-integration.patch` are necessary to preserve snapshot/basis/record-time answers once scope position/max-recorded-at stop moving. They are in `storage/begin!`, `storage/await-record-time`, and `main/basis`, outside the task's explicitly owned functions. They remain unchanged in this worktree. I asked for permission for those expressions and prepared an isolated proposed integration source under durable evidence; testing it will be labelled as overlay testing. DX-B7 can apply those expressions to its owned functions. No unrelated request handling or wait-loop rewrite is needed.

**Do not deploy or merge the unfinished working tree as a completed fix.** It currently marks new HTTP scopes v2 while those three legacy readers are pending integration. I will leave the final committed source safe if dispatch clarification does not arrive.

## Current evidence

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B8/`.

- `before-source/`: actual unchanged gateway, TypeScript source/build and dependency preimages at base `53fcf4f289b257a7c26a630a3c6b447ff926b516`.
- `unit.log`: 111 engine-free tests passed.
- `package-no-engine.log`: first broader run, W0 dist missing; retained failure.
- `support-build.log`: support packages built without downloads.
- `package-no-engine-rerun.log`: 144 passed, 46 skipped (native tests), exit 0.
- `typecheck.log`: Datomic TypeScript check, exit 0.
- `before-a-v2.log`: first engine attempt failed in raw fill encoding (`schema_version:null`); fixed runner uses zero. No measured point was produced. Cleanup was 32 seconds, no containers/network left; owned Postgres volume retained for retry.
- `before-b.log`: queued corrected unchanged-code attempt.

## Hot-value audit

| Value/read | Existing frequency | Change/proposed integration |
| --- | --- | --- |
| Scope position | Replaced every commit; read in stored function, snapshots, basis, waits, journal and pull header | v2 reads immutable tx/position; v1 stays legacy. Snapshot/basis substitutions are in companion patch. |
| Scope maximum record time | Replaced as row timestamps advance; stored function plus record-time wait | v2 carries the prefix maximum on every commit transaction, including timestamp-free commits; wait expression is in companion patch. |
| position-regular | true at creation, false once on irregular positions | Keep sticky proof and exact targeted read. |
| irregular, feed-irregular | sticky false/absent to true | Keep; repeated same-value assertions do not replace values. |
| Scope key/bootstrap/row/feed versions | Written at creation | Keep; stable targeted lookups. |
| Schema/commit-function hash | On installation/change | Keep; infrequent control-plane mutation. |
| Entity revision | Replaced for touched entity | Keep, as required; bounded by that entity's history. |
| select-db full entity iteration | Every pull, merges unrelated hot scope attributes | Replace with four exact attribute reads and shared versioned head helper. |
| journal compatibility checks | Targeted stable version/flag lookups | Keep. |
| feed_live CAS fixture | Legacy manually authored transaction | Keep on explicit legacy arity; new transaction-function commits are v2 only when enabled. |

## Algorithm and compatibility

The v2 newest-commit helper checks the basis transaction's immutable position first. A schema/marker basis falls back to reverse AVET `index-pull`, bounded by `[:triplex.tx/position Long/MAX_VALUE]`. Transaction position is already the final logical position of its span. The same helper shape executes inside the stored function; actual engine callability is pending. Prefix clock maxima must be carried even across commits with no row timestamps. Old scopes are never automatically migrated or marked v2 when their schema/function is installed.

A pre-B8 gateway cannot understand a v2 scope: its old snapshot/basis readers would report the immutable bootstrap value. A rolling fleet that includes those binaries must keep v1 scopes until all serving/writing gateways understand v2. No compatibility with an unmodified old writer on a v2 scope is claimed.

## Remaining

Unchanged growth measurements; engine validation of reverse index-pull and semantic suites; source-bound fix commit; changed growth measurements; optional W0 fingerprint; final hash/pin audit and owned-volume removal. No acceptance files edited, no merge/push/publish performed.

## WIP commit audit (continued dispatch, 2026-11-10)

This commit preserves incomplete work before merging DX-B7; it is not a promotion or completion claim.

- `growth.mjs` computes diagnostic measurements only: actual successful SDK calls, returned positions validated by DatomicClient, fresh UUID scope, actual gateway health/source identity and owned-stack/cgroup manifests. It emits no semantic PASS. Two original-code points exist (1k/50k); 250k/500k are absent.
- `window.sh`/`up.sh` readiness checks compare actual gateway source hash, actual durability settings and container identities. Cleanup checks fresh inventories against the exact owner PID and explicitly declares retained PostgreSQL volumes; no cleanup exit is a semantic verdict. The first cleanup schema's `inventoryEmpty` excludes its separately indexed retained volume; later receipts name active resources explicitly.
- `stage.py` hashes copied bytes into a newly created directory, labels the integration overlay, and binds copied runner/patch/source bytes to the base revision. Hashes establish identity, not correctness.
- `native-tests.sh`, `base-gates.sh`, `suite.sh`, and the lean wrappers report actual assertion-runner outcomes from fresh processes/scopes and the source-bound stack. Nonzero native components remain nonzero even when package tests pass. Original selftest/feed fixture failures and interrupted lean reach remain failures/incomplete.
- `dxb8/head_test.clj` checks exact span heads, marker fallback, historical views, clock maxima and scope-datom history content on the SQL engine; 27 assertions passed in the latest run. `head-version.test.ts` checks actual receipt/snapshot/basis positions and held-row content on both layouts. Neither is a full-package verdict.
- `gateway-fixtures.patch` is a proposed fixture/probe update only, not applied in the worktree: it retains behavioural assertions and adds three explicit scan-rejection checks. Its current proposed source has not completed the full gate set.
- No M1–M4, O1–O5 completeness, fingerprint, independent acceptance or release PASS is claimed. All old failed attempts are retained.

Continued dispatch now authorizes all `packages/datomic/**`; next steps are commit this WIP, merge DX-B7, apply integration, fix/rerun the complete gates, and measure paired keep-awake variants.
