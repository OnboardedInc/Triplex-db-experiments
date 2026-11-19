The benchmark issued two saves with the same answer IDs for person 6011.
Datomic stored both saves as submitted. The independent oracle correctly rejected the repeated references.
The saved responses reproduce the result byte for byte. The seed had 165 visible facts and the later read had 175.
Each traffic window now reserves its own transaction number. Retries recover the same number and the same save.
The 1,000-person preflight must finish on the bench within ten minutes before the large seed can start.
Priority 5 still needs a correct 100,000-person server measurement.

**Scope and native evidence**

The frozen generator and archived mapper at `f37731a7c` match all six stored assertions in each of the two saves, including valid time. All 12 assertion IDs were distinct. Sequence 2299 asserted both `ans:t2299-0` and `ans:t2299-1` at positions 4,341,356 and 4,344,665. The head was 4,346,080. [Original evidence manifest](../bm1/SHA256SUMS)
A single subject and two minimum-size saves reproduce the cardinality error. A second regression first failed because the second window was recognized as a retry. BM1 had already added separate entity prefixes for its two named phases. [Regression](identity.test.ts)
The first local attempt completed 23 native schedules. Its combined seed, preflight and matrix workload lost the gateway within a 3.5 GiB slot. The retained partial run provides no completed matrix.
Separate seed and matrix reservations bind both owners, the same volume and scope, membership at the original seed cut and the original first and last transaction IDs.
The reduced deep fixtures contain one target account and eight neighboring subjects. The matrix shares each release's immutable input across the evaluator counts and publishes each control in its own fresh namespace.

**Prepared server command**

`DOCKER_HOST=unix:///var/run/docker.sock node --import tsx lab/experiments/EXP-DX1/scale1/bench.ts launch 5 act2-$(date -u +%Y%m%d%H%M%S) activation --account-layout pooled`
This cold run seeds ten 100,000-person accounts in one scope, activates account 002 with two evaluators and keeps ten accounts live. Allow a day. The observed 10,000-person seed took 349 seconds, which projects to 9.7 hours for seeding alone at constant throughput. The execution ceiling is 24 hours, plus archival.

**Evidence audit**

- `openW0Window` reads the namespace marker at the original transaction. Both live writers use that position in their command and owned entity IDs. Recovery verifies the marker's entity, value, position and valid cut.
- `checkWindows` compares every seed receipt with its intended assertions, both saves and retries with their durable receipts, and all 1,000 reopened worlds with independently assembled facts and Python evaluation bytes. `guardSeed` requires a new evidence directory, source, slot, nonce, two distinct windows and a terminal receipt within 600 seconds.
- `seedAccounts` verifies ordered receipts and their values, independent population counts and native membership. `deepEvaluations` checks every worker's subject order. `DeepActivation.verify` reopens both source and publication cuts and compares every guard and item with Python.
- `matrix.ts` binds the seed, slot owner, new namespace, source and executable input hashes. It compares every worker output and durable state, the eight neighboring outboxes and live save receipts and full pinned rereads. The historical control must reproduce precisely the omitted guards.
- `audit-live.mjs` regenerates all fields from the account fixture and advances each subject’s stamp from zero using saved receipt positions. It checks the native row identities against the recorded read hash and sends a fresh two-evaluator release through the same `DeepActivation` entry point used on the server.
- BM1 and SCALE1 launch the seed only after that attempt's preflight exits successfully. The preflight status retains the failing phase and reason. [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)
