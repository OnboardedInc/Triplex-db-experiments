# Presence, temporal references and deletion: requirements map

Source-only map, 2026-11-07. This records requirements and compatibility
boundaries for a later common-corpus extension; it accepts no implementation.
The [exact source index](../../qualification/evidence/presence-reference-deletion-requirements-v1.json)
binds current SHA-256, line ranges and original ZIP member/hash where available.
All referenced imported members already exist locally; no archive extraction,
test, compiler, SDK, backend or queue operation was needed.

| Topic | Explicit requirement or imported design | Current public boundary and unresolved choice |
| --- | --- | --- |
| Entity presence | The imported managed-presence contract makes presence opt-in and immutable per schema/type. Empty live records can be present. Latest PUT replaces the presence set; subsequent PATCH intervals add to it. Presence is separate from attributes and stable identity. [D1](../../vendor/duckdb-temporal/runtime/NATIVE-TEMPORAL-REFERENCES-DESIGN.md#contract) | This is an earlier native DuckDB contract, not automatic Triplex behavior. Current Triplex groups facts by entity ID; typed visible facts establish subjects for graph-rule evaluation. The configured-eight recipe instead authors explicit `:capacity/present` and type-version facts. Their meaning must remain a named application convention. [P1](../../docs/concepts.md#facts-and-relationships), [S1](../../packages/core/src/Constraint.ts), [T1](../../qualification/capacity/configured-entities-v1/CONTRACT.md) |
| Temporal references | The imported coverage design requires the complete source interval to fit the union of target-presence intervals at the same committed K, evaluates the final batch overlay, admits same-batch forward references, and does not treat unknown/unmanaged presence as coverage. Stable reference identity retains its older meaning. [D2](../../vendor/duckdb-temporal/runtime/RESEARCH-SYNTHESIS.md#goals-1-9-and-10-temporal-coverage-on-existing-presence) | The older identity-only native profile explicitly does **not** promise temporal overlap. Current Triplex `ReferenceTarget` checks for a visible target fact with the required entity type, at represented valid-time boundaries, only when rules are supplied in `meta.enforce`. These are different contracts; neither implies the imported managed-presence policy. [D3](../../vendor/duckdb-temporal/runtime/NATIVE-SCHEMA.md), [S1](../../packages/core/src/Constraint.ts), [S2](../../packages/core/src/store/TriplesLive.ts), [P2](../../docs/configuration.md) |
| Entity deletion | The ten-goal plan requires interval-local deletion with preserved history, correction/schema meaning and replay/reopen evidence. The imported design says deletion clips authored presence, attributes and outgoing references over its interval. [G1](../../vendor/duckdb-temporal/runtime/TEN-GOAL-LEDGER.md), [D2](../../vendor/duckdb-temporal/runtime/RESEARCH-SYNTHESIS.md#goals-1-9-and-10-temporal-coverage-on-existing-presence) | Ordinary Triplex retraction closes recorded visibility and retains the assertion; it is not a general valid-interval deletion primitive. The current REST DELETE retracts the entity's current facts in one transaction, rejects scheduled facts and retains history. It does not traverse incoming references. This surface must keep its existing contract. [P1](../../docs/concepts.md#assertions-retractions-and-correction), [P3](../../docs/http-api.md), [S3](../../packages/http/src/EntityStore.ts) |
| Restrict, detach and cascade | The imported synthesis explicitly separates final-state rejection, interval-local deletion, detach and bounded reverse cascade. It calls for deterministic receipts, bounded newly removed endpoint cells and legal cycles that do not independently seed deletion. Goals1/9/10 keep this work open. [D2](../../vendor/duckdb-temporal/runtime/RESEARCH-SYNTHESIS.md#goals-1-9-and-10-temporal-coverage-on-existing-presence), [G1](../../vendor/duckdb-temporal/runtime/TEN-GOAL-LEDGER.md) | No common default policy is selected here. Decide policy ownership, incoming-edge direction, interval clipping, cycle/alternate-support behavior, atomic budget refusal and historical schema binding before an oracle can define a cascade answer. Typed reference values or a passed Required check do not qualify those decisions. |

The shared plan requires assertion identity, one coherent cut, final-overlay
transaction semantics, causal receipts and public-path parity; its scale profiles
count relationships and presence/version events separately. [G2](../../qualification/PLAN.md#architecture-and-initial-proof)
Public ordinary `TemporalBasis` accepts R/V; exact upper P is internal to stable
pagination or explicit in the native contract. A later corpus must use legitimate
captured cuts, including same-R distinct commits, rather than inject private P.
[S4](../../packages/core/src/Temporal.ts)
Archived operational limits and historical closed-goal claims are not adopted as
current five-surface qualification.

The [configured-eight actual independent review](../../qualification/reviews/configured-entity-xtdb-tiny-v4-terminal-independent.json)
retains 47 passed checks and five failed **new** historical assertion-metadata
target checks. Explicit presence off/on preserves domain facts and reference
targets; the fixture contains no automatic cascade. Required enforcement is
explicit, codec version1 is not application type-version, and stored datatype
auto-enforcement remains unqualified. Eight subjects and ceil-rounded events
do not establish scale, temporal-reference coverage or five-path semantics.
The stronger snapshot-metadata target also remains distinct from ordinary raw
assertion-lifetime compatibility. [T2](../../qualification/capacity/configured-entities-v1/TINY-XTDB-CONTRACT-v4.md)

After the current snapshot blockers, the smallest corpus extension should first
freeze these distinctions: presence versus identity, opt-in target coverage,
same-batch forward/self/cyclic references, half-open/open-ended intervals and
historical schema cuts. Deletion/restrict/detach/cascade must then be separately
named cases with explicit expected receipts and bounded atomic failure. This is
a requirements menu, not authored executable tests or an implementation choice.
