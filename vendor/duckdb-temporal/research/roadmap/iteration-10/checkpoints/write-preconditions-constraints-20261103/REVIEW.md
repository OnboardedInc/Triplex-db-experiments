# Independent source countercheck

3 November 2026. Reviewed README.md, CONTRACT.md, HAND-CONTROLS.md, PRODUCT-MAP.md and PRIMARY-SOURCES.md as text. Independently inspected pinned Triplex source and published PR8 typed_store.py, schema_v2.sql and store.py through GitHub.

The technical findings and all twenty hand-only predictions are supported by the inspected source, subject to their stated valid-input, entrypoint and serialization qualifications. In particular:

- EntityState compares the complete current-recorded unretracted fact-ID collection before command mutations, including future-valid and expired-valid facts.
- TripleLive requires explicit retract correspondence but is enforced during ordered application.
- Graph enforcement compares current and final projected facts across their combined valid-time boundaries and permits unchanged or improved legacy findings.
- Opt-in rules are not verified against configSnapshot by the inspected service.
- Standalone retract can report an error after its underlying no-op transaction returns.
- Published product source uses strict exact-ID retractions first, lacks the inspected Triplex precondition/type/constraint surface, and does not establish cross-instance graph serialization.

Review corrections were applied:

- EntityState mapping now requires comparison inside the later serialized write boundary.
- P08 distinguishes operation application order from reconstructed journal-array order.
- TypedFact and initialization anchors use L346–373 and L583–624.
- Boundary wording describes present validTo values, matching Option.isSome rather than asserting a Number.isFinite guard.
- The packet contains P01–P10 and G01–G10, all explicitly unexecuted.

Connector blob IDs match the named source inventory. Earlier goal outcomes and remote-reconciliation metadata are separately sourced project context, not independently reauthenticated runtime evidence in this countercheck.

Only Markdown and source text were reviewed. No subject import, execution, compilation, model or fixture evaluation, database inspection, package action, stopped-artifact access or external mutation occurred. This review establishes source consistency, not runtime conformance, backend acceptance, a selected executable action or release of any hold.
