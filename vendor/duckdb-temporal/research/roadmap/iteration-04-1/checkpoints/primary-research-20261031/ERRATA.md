# Additive research errata — independent item4.1

2026-10-31. Original new research revisions remain unchanged. The [independent review](peer-review.md) found no blocking mathematical defect and recorded these qualifications.

1. **Outgoing successor adjacency for Kahn removal.** In cost-and-portability.md the least-ready Kahn row says "with reverse adjacency." Under the proposed producer-to-consumer convention, removing a ready producer enumerates outgoing successor cross edges to decrement consumer indegrees. A dual storage convention must be explicit; unexplained reverse-only adjacency is insufficient. The asymptotic bound and count/decrement argument remain sound with outgoing quotient adjacency. Reverse adjacency is separately useful for SCC passes and return-distance construction, not a substitute for this removal direction.
2. **Acquisition bracket labels are not timing evidence.** The new verification source record has ambiguous before/after interval wording. No empirical graph or performance timing is inferred from it. This curated collection publishes its primary bibliography, not the companion acquisition log; the independent review transparently retains the wording caveat.
3. **Research is not a selected interface.** Exact builtin types, dense ID/certificate bounds, enum/edge ordering, duplicate occurrence identity, canonical projection, arbitrary valid tree acceptance, ownership, malformed input and checker outcomes still require a separately reviewed source contract. The research alone authorizes no code or test.

## Excluded premises

Both research lanes flagged the short Borovšak–Mihelič certificate paper's no-path-between-distinct-SCC wording and adjacency-matrix linearity wording. Neither claim is adopted. The positive certificate argument instead uses independently reasoned in/out reachability trees plus an all-cross-edge component order, corroborated by [Tarjan–Zwick2022v3 §3.3](https://arxiv.org/html/2201.07197v3). A one-way path between distinct SCCs is perfectly valid.

All empirical checks remain UNRUN. These corrections do not accept item4/4.1, alter any held action, or select the forthcoming contract.
