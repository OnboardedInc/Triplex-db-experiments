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

## Q49 implemented: O-REPLAY 0.4.1 (a9c1327d4e1d6756696db6844e17008671d4a193; saved 2026-11-07 22:59Z)
- F2 commit unchanged (f4b59b4). Q49a: an erasure commit is an ordinary journal transaction (position, txId, `transactions()`,
  `:_tx/changed-entity` and `:_tx/change` facts) whose changes carry identities only (`{"op":"erase", entityId, attribute, assertionIds}`);
  earlier changes are re-rendered with the marker; whole journal = no-erasure control journal with markers; no plaintext anywhere.
  Q49b idempotent erase and empty erase commit. Q49c match/snapshot/supports/retract-pattern/find/aggregate `where` never match an erased
  value; `exists` sees it, `missing` does not; SUM/AVG/MIN/MAX skip it; ORDER BY puts it after readable values in both directions by
  assertion id; one marker group per attribute (a readable value plus the group conflicts in a cardinality-one model); Unique ignores it;
  erased references are not followed. Q49d in-flight reads accept old value or marker. Q49e JSON number to decimal from the as-written text;
  decimal text in a JSON string is E-INVALID-VALUE; R-DEC-18 refusal removed.
- Results: 342/342 tests (against 0.3.6 obligations.json); coverage complete incl. 17 CS-ERASURE cases and q43Rules; self-check 61/61;
  converter core 317 AGREE, 19 AGREE-RULED, 2 VECTOR-BUG, 3 NOT-MODELED and qlever 298/18/19 DISAGREE (expected Q33i)/1 CONVERTER-ERROR/2/3,
  both 0 differences from EXP-O02 item by item; negative control 8/8; probe_delta_033 20/20; probe_035 118 MATCH + 1 stale probe (expects
  the old erasure refusal; the probe's "ST erasure answered" self-test no longer checks anything). Cosmetic: E-DECIMAL-OVERFLOW phases
  stored as a tuple against the contract's "preflight or execution" text.
- All 11 erasure obligations can close on the oracle side (G7.journal.logical-contract, G9.erasure.reproduction-modulo and
  R.repo.mutation-controls newly), provided the authored CS-ERASURE cases avoid the residual refusals.
- Residual X-NOT-MODELED (RULING-NEEDED in RULES.md; ruled Q52): COUNT over 2+ erased assertions; ORDER BY over erased plus missing; erasedAt of
  a marker group erased at different instants; ReferenceTarget over an erased reference; computed answers over in-flight values;
  toDecimal(json, p, s, rounding); the `erasure` spelling, erase mixed with other ops, preconditions on erase.
- Per-file sha256 of lab/oracles/replay at a9c1327: in the hand-back and in /Users/sam/Claude/Projects/triplex-db-2/EXP-O04-oracle-erasure/hashes.q49.txt
  (replay.py 585524ba...0d, entities.py 2af069de...71, values.py 67a42954...82, views.py df8dba0b...6b, RULES.md 949ad875...7c).

## O-REPLAY 0.4.2 (exp/O04b-oracle-0.4.2 3e38a61 from main 639264e; saved 2026-11-08 00:51Z)
- Q52a distinct counts treat an attribute's erased values as one value (GROUP BY's key); assertion counts count each. Q52b readable, then
  markers by assertion id, then missing, both directions. Q52c a marker group's erasedAt is the earliest member. Q52d ReferenceTarget skips an
  erased reference (constraints.py); delete cascade and restrict are lane obligations (the oracle models neither). Q52e all-or-none per commit:
  an in-flight query's entry is `"inFlight": {"rule": "ER-INFLIGHT-ALL-OR-NONE ...", "acceptable": [{"erasuresSeen": [txIds], "result" |
  "error": ...}]}` (all-old answer first), or a plain result when every choice agrees; this replaces 0.4.1's per-value InFlightErasure (same
  acceptable set for ER-INFLIGHT-READ and ER-CACHE-INVALIDATION, new shape). Q52f toDecimal(json, p, s, rounding) rounds the as-written reading
  (json 2.675 at (3, 2) half-up = 2.68); without a mode excess digits stay E-DECIMAL-FRACTION. Q52g `erasure`, erase mixed with other ops, erase
  with preconditions: rejected commands with E-INVALID-VALUE (R-CMD-9, Q33f). Q56f SCHEMA.md documents the `id` selector and the Q56a rule. The
  five 0.3.8/0.3.9 system-side error rows are in the table only (not produced). Named tests for DR-JSON-STRING-TEXT, DR-JSON-CONVERT-ROUNDING
  (`decimalRoutingQ52`) and all 42 CS-ERASURE required cases (25 new).
- Remaining refusals exactly three, matching 0.3.9's ORACLE_PINS: tdk1-keys run.py:53, envelope-facts views.py:129, scale-evolution entities.py:61.
- Results: 370/370 tests; self-check 61/61; converter core 0 of 341 differ from EXP-O02 (317/19/2/3), qlever 0 of 341 (298/18/19 DISAGREE Q33i/1/2/3);
  negative control 8/8; probe_delta_033 20/20 (identical to 0.4.1); probe_035 117 MATCH + 2 outdated probes (the `erase` refusal probe and the
  `erasure` refusal probe, now an E-INVALID-VALUE rejection under Q52g; its reverse check flags the five new error rows as expected).
- Limits (ruled Q66): 2^n in-flight combinations (Q66a: n + 1 prefixes); cursorFrom cannot name an in-flight entry (Q66b); only same-scope
  erasures are in flight (Q66c); explicit text-to-decimal belongs to the lanes (Q66d).
- sha256 at 3e38a61 (changed files): RULES.md 5459fd4f...5039; SCHEMA.md 1089e5a6...2455; constraints.py 9e1e9d7b...1a91; entities.py
  d25a8991...51bd; errors.py c2260e1e...34df; exact.py 4cfcf2c9...74d2a; examples/entity-mini.expected.json 9d7705a2...bd4ca; replay.py
  bf0a3476...4010; run.py 1f4b0e05...c674b; tests/helpers.py c9189d85...4cd; tests/test_contract_section4.py d4a7a03f...f3d; views.py
  0fc172e4...9eb8072 (full table in /Users/sam/Claude/Projects/triplex-db-2/EXP-O04b-oracle-0.4.2/hashes.3e38a61.txt with all evidence).
