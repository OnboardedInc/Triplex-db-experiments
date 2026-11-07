# Source review and limits

3 November 2026. The review covered research text and hand mathematics only.

## Closed source findings

Two complementary primary-source reviews and final draft readbacks found no remaining blocker in their stated scopes:

- Query-page preparation, temporal intersection, full ordering-key controls T01–T06 and Q01–Q06, and the conditional fixed-clock derivation F01.
- Global journal continuation J01–J03, original-transaction receipt controls R01–R02, the distinction from entity-specific history, and the published schema 2 product mapping.
- The final text clearly separates source contracts, hypothetical control outcomes and historical runtime evidence. No adapter, capability subset or executable fixture is selected.

The reviews corrected two substantive precisions. Query cursors carry their ordering values, but those values are not fingerprinted or authenticated. Only the resolved query-page basis here guarantees a commit cut; the generic resolved temporal type makes it optional and ordinary queryAll does not capture one. Final spacing-only edits were reread and checked against the reviewed texts.

## Exact final research text identities

| File | UTF-8 bytes | SHA-256 |
| --- | ---: | --- |
| README.md | 4,168 | d36ae85c4ba67cdd0f6f4979a619b142db3b0e8f7f9f494ccc6cb9b2a08a1e5e |
| CONTRACT-MAP.md | 10,127 | dc3a84410d3f26dc126d93e8ab1d6e16aeb4078c0d0e3735692ad071c0f8537c |
| HAND-CONTROLS.md | 6,950 | f461d656582f2c144fb580eda9abc69f4ac2f40cfaee2950cea603eaa43b8f57 |

The current product mapping was independently compared with the exact published schema_v2.sql, typed_store.py and store.py blobs listed in PRIMARY-SOURCES.json at PR 8 head 0e8823973f5e1b886b7ef96e8dc5a899f467f241.

## Documentation checks and exclusions

The text files decode as UTF-8. The source-ledger JSON parses, its fifteen upstream and three product references are explicit, and the hand-control document has eighteen distinct labels. The outgoing documents contain no local absolute computer paths or connected-account routing identifiers. These checks concern documentation structure and disclosure, not a subject test.

No project code, fixture/model, package, compiler, native/FP helper, database, WAL, conformance suite or benchmark was invoked by this research or review. Source presence and mathematical outcomes are not runtime evidence. No stopped material was inspected or reused; all original holds and known nonpasses remain unchanged.

F01 is a conditional source-level incompatibility between a fixed deterministic clock and one historical-time-separation fixture. It is not an observed runtime failure, a cause assigned to any prior nonpass, or a reason to alter a stopped setup. Goal 10 remains unaccepted.

