# Goal 6 additive design: cancellation epochs and publication

**2026-11-02 UTC — source and mathematical design review only.** This is a new, narrow research note, not a selected adapter/contract, implementation, execution plan, runtime result or goal 6 acceptance. All goal 6 empirical stages remain **UNRUN**. Existing code, hand specifications, frozen research and held work are unchanged.

## Useful result

A query-generation comparison followed by a connection-scoped interrupt is not, by itself, a query-generation fence. A later adapter must separately prove **delivery retirement, execution termination/reset, transaction outcome, public-effect outcome and relevant owner lifetimes**. The standalone logical reservation ledger proves none of those merely by entering DRAINING/CLOSED.

A second source consequence is important: the inspected query-end path clears active-query state **before** transaction commit/rollback. An absent active query is therefore not a transaction-outcome acknowledgment.

## Reconciled project basis

This note builds on, rather than repeats or replaces:

- [Saved primary research and its review boundaries](../primary-research-20261101/README.md), including the [cross-lane synthesis](../primary-research-20261101/RESEARCH-SYNTHESIS.md).
- [Standalone logical-core scope at its source checkpoint]([PRIVATE_REFERENCE_REMOVED]).
- [Lifecycle reader qualifications](../hand-lifecycle-20261101/READER-QUALIFICATION.md): W is admitted, not all performed, work; C remains after close; logical closure does not establish physical teardown or safe key reuse.
- [Project-data-only policy](../../../../../PROJECT-DATA-POLICY.md).

The existing research already identifies the stale-canceller and last-poll hazards. The delta here is an explicit counterexample, a narrowly sufficient abstract delivery fence, the query-end ordering consequence, and their accounting/publication obligations. No stopped package is reconstructed.

## Independently checked primary evidence

Public DuckDB source was read at the project's immutable pin `d54cbbe3df17e8e5ce68312f483b4155836112aa`. These are project/public-source identities, not installed-computer observations.

| Source | Returned Git blob identity | Narrow observation |
|---|---|---|
| [connection contract](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/connection/connection.yaml) | `5ab2cd992e8124a6a8ff5e36b95052db08780420` | Interrupt is cross-thread, connection-scoped, and addresses the currently executing query. Its parameters do not include a query ID. |
| [connection bridge](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_connection.cpp) | `2d88d63cb1e78022ce4f73f8cfcf7697c6002b94` | It increments the context's cancellation generation, then invokes `context.Interrupt()`. |
| [interrupt implementation, lines 1083–1129](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/client_context.cpp#L1083-L1129) | `1631051fd816da2badc69b1f7a6028607c56d4c3` | Interrupt sets atomic interrupt state; this is not callback-termination acknowledgment. |
| [result contract, lines 183–267](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/query_result/query_result.yaml#L183-L267) | `8801cf9a78eb83b3b9db34f7ba9eee76faf9510d` | Stepping and fetching expose cancellation on different channels. Previously fetched chunks remain caller-owned after result destruction. |
| [query-end implementation, lines 94–131](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/client_context_execution.cpp#L94-L131) | `2b204776ea6c99502adfa9c26737e993db7cccc7` | It cancels executor tasks, resets active query/deadline state, and then handles transaction commit/rollback/invalidation; that cleanup can fail. |

The last row establishes ordering in this inspected path, not all engine cleanup paths. In particular, it does not establish a public reset or health oracle. Current generic configuration documentation was supplementary only; it was not substituted for exact-pin API behavior.

For the proof vocabulary, [Herlihy and Wing, *Linearizability*, TOPLAS 12(3), July 1990, §§2.1–2.2](https://www.cs.cmu.edu/~wing/publications/HerlihyWing90.pdf), was checked directly. It supplies history/operation-order reasoning, not a DuckDB cancellation theorem or progress/latency guarantee. No source text is reproduced here.

## 1. Epoch-check counterexample — inference, not an observed defect

Consider a hypothetical wrapper that validates an epoch and later calls the connection interrupt without excluding reuse:

| Order | Abstract event |
|---|---|
| 1 | An old canceller validates that connection c is active for epoch e. |
| 2 | The worker completes e. |
| 3 | The wrapper retires e and permits reuse of c. |
| 4 | The worker starts e+1 on c. |
| 5 | The old canceller calls the connection-scoped interrupt on c. |

The source semantics permit event 5 to target e+1. Epoch equality at event 1 cannot make the later host call conditional on the old epoch. A second comparison after the call cannot undo an interruption already delivered. Making the comparison atomic does not atomically combine it with a separate host call.

This establishes a missing obligation in that hypothetical design. It does **not** demonstrate that the current project implements such a wrapper or has exhibited this failure.

### One sufficient abstract fence for delivery versus rebind

Under a full-participation, valid-lifetime model:

1. Epoch validation and admission of a delivery obligation serialize with retirement.
2. An admitted obligation pins the old connection binding through the interrupt call's return.
3. Retirement closes old-epoch delivery admission and cannot rebind the connection until all admitted delivery obligations have returned.
4. Old epoch references cannot bypass admission or alias a reused epoch identity.

Then each old-epoch interrupt invocation either is rejected after retirement or completes before rebind. This excludes the displayed **stale delivery invocation** interleaving.

This is not the only possible fence and selects no lock, thread, callback route or host change. It proves neither absence of an inherited interrupt flag nor healthy reuse. Execution terminal evidence, relevant host-reset/no-inherited-effect evidence, transaction disposition and owner/handle lifetime remain separate requirements. The source review does not provide all of them.

No finite wait, deadlock freedom, callback termination or cancellation-latency bound follows. A delivery-call return is not execution quiescence. Holding an application gate throughout query execution is not assumed to be safe or responsive.

## 2. Cancellation and publication need declared arbitration

This section is **proposed application policy**, not a guarantee of the cited DuckDB API.

A final poll only observes requests already visible then. The following abstract history remains possible without further synchronization: final poll says no cancellation; a cancellation request arrives; commit or publication proceeds anyway. Relabeling the operation cancelled afterward does not retract those effects.

A future contract can define a single arbitration between cancellation and permission to enter the relevant irreversible phase:

- If cancellation wins that declared decision, prohibit new success publication under that policy; any promised no-effect cancellation also requires no earlier irreversible effects.
- If commit/publication permission wins, later cancellation is too late **to revoke that permission under this policy**. It is not proof of execution or commit success.
- Permission to commit, commit acknowledged, result made public and result delivered are distinct facts.
- If commit and publication are separate, represent committed-but-unpublished outcomes. A missing acknowledgment is unknown unless other definitive outcome evidence establishes it.

The query-end ordering above makes a query-absent marker inadequate as that outcome evidence. A cancellation enum, interrupt return, zero progress or ledger close is also not a combined outcome/health oracle.

Previously observed ordinary chunks cannot be unobserved. Full owned staging can delay publication but adds chargeable ownership and cannot guarantee final conversion or transport. Tentative frames plus a terminal marker would be a different consumer protocol, not an existing feature or a selected change. No claim of exactly-once delivery follows.

## 3. Link to logical accounting, without broadening C/W

Cancellation does not refund admitted work or automatically discharge logical owners.

- Keep declared ownership/reservation obligations charged until their owner and dependent-borrow end is established, or a valid charged transfer occurs.
- A terminal status can justify release only if its independently established contract entails those facts; the label alone is insufficient.
- Delivery-obligation metadata, retained cancellation references, staging buffers and control storage need explicit inclusion or exclusion in a broader charge map, with adequate prior coverage where included.
- Do not assume the existing C measures actual layout, or W includes all validation, control, waiting and teardown work. Their selected meanings remain unchanged.
- Retirement of a connection binding and closure of a logical ledger are different protocols. Neither silently retires token copies or proves absence of future old uses.

These are logical coverage obligations, not allocator/RSS measurements or physical-containment claims. They add no numerical quota or tuning recommendation.

## Review, limits and next design boundary

A separate read-only collaboration peer checked the supplied source observations and abstract reasoning. This was an **inference/design review**, not independent acquisition or byte rehash of the public sources. It found the narrow direction sound after the qualifications above: delivery fencing is not healthy reuse; arbitration is application policy; commit permission is not acknowledgment; logical release is not physical measurement.

The next authorized design selection would need an actual end-to-end participant/ownership boundary and authoritative outcome/reset evidence. It must preserve current core semantics and distinguish failure, cancellation, unknown outcome and restart-required disposition where appropriate. This note supplies no runtime procedure or authorization to implement, test, restart, retry, publish a consumer protocol or change an earlier held item.

All empirical stages remain UNRUN. No compatibility, speedup, complete resource accounting, healthy-reuse or goal 6 completion is claimed.
