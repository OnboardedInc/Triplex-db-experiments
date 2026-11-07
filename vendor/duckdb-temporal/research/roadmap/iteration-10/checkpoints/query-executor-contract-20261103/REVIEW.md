# Query contract source review

3 November 2026. Independent source counterchecks are complete for this research packet. This is source review, not test execution, adapter acceptance or a runtime pass.

## Counterchecked findings

- QueryExecutor's four methods are required service members; the runtime capability bundle does not provide a per-operator language negotiation field.
- Shared preflight collects positive bindings before filters. OR filters existing contexts, while NOT can use inner pattern-bound local witnesses without exporting them.
- Optional projection is scalar hydration/decorated output, not an optional where-clause. Its missing-value representation, projected-target restrictions and phase timing are separate from native tuple absence.
- COUNT distinctness, duplicate-preserving non-count aggregate inputs, empty ungrouped null results and final projection DISTINCT are separate stages.
- Repeated same-name base definitions survive schema decode, semantic validation and SQL rule grouping. The finite duplicate-base control avoids recursion/cycle/depth confounds. KV pair deduplication and SQL UNION ALL still remain source-only comparison conditions.
- All inspected positive optional examples retain rowBinding in find. They do not establish hidden-rowBinding behavior across the KV and SQL branches.
- Shared runtimeConformance runs the shared Triples cases. Separate source tests and generated-SQL assertions retain their own coverage limits and were not run here.

## Qualifications retained or corrected

The product preparation description was narrowed during review: signed-integer cut shapes, nonnegative known cuts and limits are validated before BEGIN, but known_at <= snapshot position is checked inside the new read transaction after position acquisition. No earlier snapshot-relative check is claimed. Counter fields are described as exposed source fields, without promoting this analysis to a fresh runtime counter observation.

An unknown-looking three-slot head is not automatically an invalid operator. The pinned source assertion treating >> as a pattern remains in H12. Rule-call/pattern dispatch and the OR-only documentation example are qualified by the actual schema and preflight entry point.

H13 and H14 are unresolved comparison obligations. Their controls do not present a common selected expected result, observed backend difference or confirmed defect. The extra numeric-identity aggregate hypothesis was excluded because it was unnecessary to the verified findings.

The sixteen controls are curated paper specifications. Overlapping source-test descriptions and earlier exploratory examples are not additional executed cases or a combined certification score. Broader Unicode/wildcard/optional-many behavior, arbitrary cycles, resource/cancellation behavior, recovery and production compliance remain unestablished.

## Preservation and scope

The packet contains original research summaries, hand controls and named source identities, not copied third-party source archives. Product code and PR heads are unchanged. Original-owner visibility, held goals, the three later NONPASS attempts and stopped test-database boundaries remain unchanged. A successful remote write must be read back before publication is claimed; publication does not add runtime evidence.
