# Triplex typed storage and public scalar boundary

3 November 2026. Goal 10 source research and fourteen hand-only controls. No adapter capability subset, implementation, executable fixture or runtime action is selected.

## Finding for the next adapter contract

Triplex preserves seven tagged value families in typed storage reads but deliberately flattens them for Datalog. Text-family joins and projection can merge string, ref, blob content identity and serialized JSON; the numeric family merges number and datetime. Typed-ref pattern matching remains tag-exact, while a raw equality predicate unwraps the ref payload. Projection, DISTINCT, grouping, COUNT and ordering therefore cannot be implemented by exposing the current prototype's native value tags unchanged.

The distinction is explicit in the pinned conformance source: five facts with number 7, datetime 7, string T, ref T and blob T produce two public projected values. Grouping by that value and counting distinct entity witnesses gives groups of two and three. These are source assertions, not tests executed by this research.

The existing DuckDB product intentionally preserves disjoint string, boolean, int64 and finite float64 values. Its exact integer decimal wire, tag-local identity, UTF-8 text order and full-witness aggregate count are useful contracts in their own right. An adapter needs a separate, explicit mapping rather than weakening those guards. JavaScript number precision, fractional public read-basis times, typed blob metadata, optional-result null and Unicode ordering add specific boundary obligations.

The complete reasoning, conditions and exact source links are in [VALUE-CONTRACT.md](VALUE-CONTRACT.md) and [PRODUCT-MAP.md](PRODUCT-MAP.md). The [fourteen hand controls](HAND-CONTROLS.md) are all unexecuted. The source ledger and [independent countercheck](REVIEW-TRIPLEX.md) distinguish schema declarations, actual implementation branches, conformance assertions and mathematical derivations.

## Current reconciliation

At the start of this pass, the living progress Page (private application reference omitted) was at sequence 92, updated at 07:42 UTC. Private main was verified at c44c356a35d16cf20d5d13b4731be1c89c8f49ec. Draft PRs [7]([PRIVATE_REFERENCE_REMOVED]), [8]([PRIVATE_REFERENCE_REMOVED]) and [9]([PRIVATE_REFERENCE_REMOVED]) were open and unmerged at a7ddd790, 0e882397 and dbb7d27a respectively. Exact PR9 head again returned no combined-status records or PR-triggered workflow records; no required-CI pass is established.

The published checkpoint still leaves the original owner's live state and pending calls unobservable. Remote source/PR metadata does not resolve that uncertainty. PR9's three later attempts remain NONPASS: the budget runner stopped in preflight, IR serialization stopped before its unit, and schema2 rollback stopped in STORE_UNIT without result/evidence. Known outer terminal outcomes are separate from unobserved database-level command, rollback, health or close outcomes.

Goals 1–2 retain bounded acceptance. Goal 3 and original goal 4 remain incomplete and held. Independent 4.1 and goal 5 have bounded results, not full acceptance. Goals 6–10 remain unaccepted. Existing accepted subjects, build checkpoints, nonpasses, holds and stopped materials are unchanged.

## Sources and limits

Triplex is pinned to e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0. The unchanged product mapping is pinned to published PR8 head 0e8823973f5e1b886b7ef96e8dc5a899f467f241. Source identities are named project provenance, not loaded-build authentication or a computer-environment snapshot. Prior [cursor/receipt](../cursor-receipt-contract-20261103/README.md) and [capability/lifecycle/explain](../capability-lifecycle-explain-20261103/README.md) research remains separate. This packet neither adopts nor claims novelty over unpublished local work.

No stopped runner, database, WAL, capture, artifact, dependency acquisition or original-owner workspace was inspected or used. No subject import, compilation, model/fixture evaluation, database/conformance/package action, computer snapshot, Codex task, merge, deployment or deletion occurred. Standard text-file authoring and source inspection do not add runtime evidence.

General NaN/Infinity schema admission is not established because Effect's Schema.Number decoder was not inspected. JSON uses the inspected plain JSON.stringify path, not a guaranteed canonical object-equality contract. Arbitrary Unicode collation parity across SQL dialects is also unestablished. These limits are retained rather than turned into executed-defect claims.

## Next gate

A future adapter selection needs separate typed-storage and public-query value contracts, explicit numeric/time domains, result null and blob metadata handling, projection/distinct/aggregate semantics, and stable unsupported-input errors. Validate that mapping against independent hand controls before selecting code and executable checks. This packet releases no hold, repairs no stopped action and grants no retry.
