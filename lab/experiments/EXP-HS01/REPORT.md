# EXP-HS01: broker host store layout

Builder CX-HS01. Base `257d4d20`, contract 0.3.14. Branch `exp/HS01-host-store-layout`.
North star: P5/P4 storage and working set, preserving P2/P1 recovery correctness. Goals come only from `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`.

Implementation is submitted for independent review, not promotion. Gate execution is in progress; final results will replace this provisional report.

The worker uses v2 dictionaries, compact entity-clustered facts/history/journal, byte-checked derived journal values and a full-JSON fallback envelope preserving exceptional JS scalars. SQLite normalization is checked explicitly for negative zero, non-finite numbers and lone surrogates. Noncanonical ids remain text. Dictionary ids are prepared before the write lock, inserted atomically, and cached only after commit. Retractions move the one row version to history; horizon purge retains history. Nested claims resolve their own transact position.

Retention persists CRC/offset anchors, holders and epochs. Prefix deletion and anchor movement are one bounded transaction, preserving the last frame and the ACKED sidecar's frame. Default retention is infinite. Open verifies retained payloads one page at a time. The legacy `opened.frames` array remains an explicit lazy diagnostic materialization; broker startup uses marker/epochs and LSN headers instead. Attached replicas retain zero until a separately qualified durable replica base exists. Detached startup releases the replica holder. Stale cursors fail as `FeedRetentionExpired`.

## Predictions and measurements

R45 5.4 predicts 5,656 B/asserted fact for v1; 3,304 after dropping recent rows; 2,380 after frame purge; about 555 with typed rows; about 259 with derived journal values; about 232 after offline vacuum. This round implements A+B+C+D, keeps page size 4,096 and does not vacuum. W0 measurements pending.

Preliminary focused checks: 100,000 generated codec rows, including SQLite storage conversion; 50,000 v1/v2 worker comparisons; retention, typed cursor expiry, legacy-layout refusal and nested-claim tests. Final expanded stream adds journal references, nested ordinals, epoch frames and feed pages. A 1.09 GB frame-churn test purged over 1 GB and reopened by verifying two retained frames (8,388,680 bytes); these are logical frame bytes checked, not physical disk I/O. Peak RSS is sampled for the whole process, not isolated worker memory.

## PASS and receipt audit

| Producer | Content | Freshness | Binding / limits |
| --- | --- | --- | --- |
| Worker codec compact acceptance | Every own field compared with `Object.is` after decode; journal JSON exactly equal; unsafe SQLite scalars force fallback | Actual row of this append before BEGIN | Immutable dictionary/transaction metadata, same-member referenced row; persisted rows decode through the same derive function; fallback protects gaps |
| HostLog recovery acceptance | Retained CRC chain, consecutive LSNs/offsets, marker end/epoch/CRC, ACKED checksum and actual named frame | Actual database at this open | Persisted anchor, actual frame bytes, marker and sidecar; does not claim drive-cache/power-loss qualification |
| HS01 layout tests | Canonical complete result comparisons; codec own-field `Object.is`; exact retention/frame counts | New UUID stores and seeded deterministic random stream each attempt | Source worker v1/v2 bytes; genuine SQLite binding; diagnostic timings only |
| HS01 crash harness | Parent keeps ACK map, checks exact recovered row ids, claims, receipts, idempotent resend and feed order/gaps | New store per 80-cycle run; parent survives whole-process stops | Instrumented actual worker transaction barriers bind original and instrumented hashes; source can be reconstructed from checked-in transformation |
| W0 seed manifest | Complete assertion columns, actual retirement tuples, real claims; reference coverage and strictly increasing native positions | Fresh UUID scope/store; new intent/map files | Real core `Triples.transact` nested groups; SHA256 intent and map; no handwritten journal suppression; size uses submitted assertions |
| run.mjs execution receipt | Raw exit/signal and SHA256 log; source equality before/after | Exclusive UUID output and timestamps | Exact argv, Node, Git head, source inventory and disk; no semantic PASS inferred from exit zero; offline slot is null |
| Existing gates | Their retained assertion/oracle results and skip inventories, not exit alone | Re-executed on this branch | Source-bound run receipts; gate-specific limitations retained; independent reviewer still required |

## Evidence and boundaries

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-HS01/`. All first failures remain. Bulky stores/raw output stay outside Git with manifests to be added after execution. No acceptance file is edited; the initial pin intersection is empty. No merge, push, package publish, engine lifecycle action or forbidden port is authorized or performed. G12 is diagnostic only and will be skipped without an orchestrator slot. Full G6-G12 outcomes and known omissions will be recorded explicitly after completion.
