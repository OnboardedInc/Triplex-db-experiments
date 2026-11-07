# Triplex cursor and receipt contract research

3 November 2026. Source research and hand specifications only. Goal 10 remains unaccepted; no adapter, selected capability subset, executable fixture or conformance result is introduced.

## Findings that affect the next adapter design

Triplex has distinct continuation contracts. A query-page cursor carries the full ordering key and binds a normalized query, page size, database scope and generation, and a resolved recorded-time/commit-position/valid-time basis. The global transaction journal instead takes an exclusive numeric position and returns the last nonempty page's position. That journal API does not pin an upper cut or prove another page exists. Command receipts identify an original transaction, rather than serving as either type of read cursor.

A fixed deterministic runtime clock also changes how the shared conformance fixture must be interpreted. The historical-time pagination case sleeps between writes and expects older timestamp visibility. The public deterministic option supplies a fixed time, so sleep alone cannot establish that separation. With standard runtime services and no custom time override, the hand derivation in F01 gives a different result. This is a conditional source-level fixture incompatibility, not an observed test failure. A forced-timestamp-tie control should be separate from a historical-time-separation fixture.

The current DuckDB schema 2 prototype retains logical position cuts and timestamp metadata, but exposes neither Triplex query cursors nor its transaction journal/transaction-ID receipt surface. Its bounded typed/native results cannot be counted as adapter conformance.

## Why this is independent work

This packet uses the pinned public Triplex source and unchanged, published product storage source at PR 8 head `0e882397`. The earlier [interoperability research]([PRIVATE_REFERENCE_REMOVED]) supplies context; this focused addendum adds exact continuation distinctions, the deterministic-clock fixture qualification and eighteen explicit hand controls. It neither adopts nor makes a novelty claim about unpublished local research.

No stopped runner, fixture, capture, output, database, WAL, artifact, dependency acquisition or original-owner workspace was read or used. No subject import, compile, model simulation, database action, package action, replay or runtime observation was performed. Existing nonpasses and held goals 3/original 4 are unchanged. Source metadata below is project provenance, not an inventory of an execution environment.

## Contents and source pins

- [Contract map and current prototype gaps](CONTRACT-MAP.md).
- [Eighteen hand controls](HAND-CONTROLS.md), all unexecuted.
- [Primary source ledger](PRIMARY-SOURCES.json), containing exact repository revisions and connector-returned Git blob IDs. These are source identities, not loaded-build authentication or an independently rehashed public-source archive.

Triplex is pinned to `e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0`. The unchanged product source is pinned to `0e8823973f5e1b886b7ef96e8dc5a899f467f241`. PR 9 remains separately draft/unmerged at `dbb7d27a20430e09413f92259007961ad8e66ac3`; its runtime outcomes and the progress Page's sequence 90 were reconciled before this research.

## Next gate

A future adapter selection must specify the supported values/language, public temporal input and exact snapshot capture, query-cursor service, journal metadata, original transaction IDs and lifecycle ownership. It must retain source/semantic validation and actual storage guards. No field alias or cursor wrapper closes recovery, concurrency, resource or compatibility requirements.

Do not run the whole shared suite with a fixed clock on the assumption that its sleeps advance metadata time. Select an advancing-clock conformance setup for time-separation cases, and a separate fixed-clock tie scenario. Any executable authoring, dependency or runtime work needs its own selected contract and gates. Nothing here admits a stopped action or grants retry permission.

