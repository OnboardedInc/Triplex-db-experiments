# EXP-O04: F2 fixed and erasure modeled (saved by the orchestrator, 2026-11-09)

- Branch `exp/O04-oracle-erasure` from main 6ae5d23. F2 commit f4b59b494843b19f12804e8bd404de5f96e4cf33 (oracle 0.3.2); erasure commit
  9fdc3b46c3a8d7cf0bbfe0b967b908661daf63a9 (oracle 0.4.0). Q49 implementation in progress on the same branch.
- F2 (DR-JSON-CONVERT): toDecimal(json 1.5, 2, 1) = 1.5; json 1.55 at scale 1 = E-DECIMAL-FRACTION; json "abc" = E-INVALID-VALUE; json
  1234.5 at (4, 1) = E-DECIMAL-OVERFLOW; JSON boolean, null, array, object = E-INVALID-VALUE; never rounded. `decimalRouting` added to
  RULES.md's table list and Coverage.TABLES (8 tests). probe_035 at F2: 119/119 MATCH (was 116 + 3 WRONG).
- Erasure (R-ERA-1 to R-ERA-6): `erase` op forms by entity+attribute, by entity, or by assertion; after publication every read at any basis
  returns `{"_tag": "ErasedValue", "erasedAt": ...}` with identities and intervals unchanged (match, entityTriples, history, snapshots,
  entityPage including continuation of a pre-erasure cursor, timeline, single-support documents, journal change values); in-flight reads
  list both acceptable forms. Refused (X-NOT-MODELED) until ruled: answers depending on an erased value, and the erasure commit's own
  journal content (ruled by Q49a and Q49c).
- Results: 338/338 tests; coverage watches q43Rules and all 17 CS-ERASURE cases; self-check 61/61; converter core and qlever identical to
  EXP-O02 item by item (answers on the 49 vectors unchanged); negative control 8/8; probe_delta_033 20/20; probe_035 118 MATCH plus 1
  outdated probe expecting the old erasure refusal.
- Oracle side: 8 of the 11 erasure-dependent obligations can close (G9.erasure.visibility-boundary, .protected-copies, .restore-reapplies,
  G10.cursor.stable, NS.SEC.retro-and-audit, G8.composition.watermark-routing, REQ.pii-erasure, GS.16); G7.journal.logical-contract,
  G9.erasure.reproduction-modulo and R.repo.mutation-controls wait on Q49a.
- Evidence: /Users/sam/Claude/Projects/triplex-db-2/EXP-O04-oracle-erasure/.
