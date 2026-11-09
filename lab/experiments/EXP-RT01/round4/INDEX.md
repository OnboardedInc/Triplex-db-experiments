# RT01 round 4 evidence

Reviewer source: `verify/RT01` commit `dad9d9b`. `reproductions/*.original.txt` are byte copies of its round3/journal-clock.ts and sql-transport.ts. The executable copies adjust workspace paths and replace the known-defect assertion with equality, plus feed/command/envelope and future-staged continuation checks. The XTDB test transport is derived from the same interpreter; it executes emitted SQL in SQLite, not a reference history. This is offline coverage, not XTDB engine qualification.

Raw output goes to `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round4/`. Failed attempts are retained. The closure records exact source/build/helper hashes, checks actual output, and writes its manifest after checks. No contract or oracle change is authorized.

## PASS audit, before commit

- `journalBasis`, Datalog compiler temporal lowering, storage visibility, and KV temporal visibility: a journal answer retains the exact requested position predicate and retirement visibility; only business-time predicates are removed. Index and envelope use the same position after the unchanged shared watermark gate. Fresh source reads are used, without caching or fabricated journal values; real scope-bound adapters enforce scope and exact position. Existing receipt creation/decision protocols are unchanged.
- `journalRows` / `journalScan`, and their journal/feed callers: read current committed cut once or use the entity page's gated exact cut; decode actual metadata bytes. The shared `toReadError` preserves typed refusals. No journal path resolves the runtime clock.
- `journal-clock.test.ts` and the added KV test: fresh isolated scopes/IDs; assert nonempty receipt-bound pages, exact record/page equality after backward clocks and future staging, and continuation contents. XTDB normal-business-time exclusion is a negative control.
- `reproductions/journal-clock.ts`: assertions compare actual complete pages and records against this attempt's earlier nonempty receipt-bound page; checks helper hash before/after. Expected inputs and exact observed JSON and SQL are retained, both encodings.
- Copied round-3 read/pending matrices and reproduction controller: full existing expected typed outcomes and denominators (510/80), four pending refusal/publication proofs; no successful empty placeholder is adopted. New unique attempt, exact source/build/helper hashes before/after, offline slot.
- `run-packages.mjs`: fresh package builds, type checks and unit tests; records every exit, timestamps, raw-output hash and source before/after. Closure checks passed test totals as well as exits and exact source identity. Test summaries qualify only their declared offline coverage.
- `close.mjs` / RESULT and manifests: re-read exact command logs/outputs, verify hashes, exact page/receipt identities and unchanged source/build bindings; refuse existing attempt output. Current source and helper hashes must match execution. All raw files including failures are hashed; integrity alone does not imply semantic acceptance.

Independent review, live G2/G6 and contract re-pinning remain external requirements.
