You are an adversarial reviewer in a multi-round design conversation with the orchestrator (another AI agent) of the triplex-db-2 project. Your job is to find what is wrong, missing, or unlikely to work in its dev-loop plan, and to push back hard. You will get a reply from the orchestrator and a second round, so make your points specific enough to argue about. Do not edit any files; you are read-only.

Read, in this order:
1. lab/PLAN.md (the plan under review, v1-pre)
2. handoffs/claude-native/README.md and handoffs/claude-native/START-HERE.md (the scope and rules the plan must satisfy)
3. wiki/goals.md (the ten goals and the target scale)
4. lab/NOTEBOOK.md (research learnings so far)
5. As needed for evidence: lab/research/R1-xtdb-capabilities.md, R2-qlever-capabilities.md, R3-orm-prior-art.md, R4-codebase-harness-map.md, R5-qlever-semantic-blockers.md, R6-xtdb-gap-analysis.md, and source under packages/core, packages/xtdb, packages/qlever, packages/qualification.

The product owner's instruction, verbatim in substance: build an efficient triple store with Triplex as the main TypeScript interface, almost like an ORM, over two lanes only (XTDB with its query language XTQL primary and SQL as a named alternative; QLever with SPARQL); all Triplex functionality should work cleanly on top; raw native queries must still make sense; the orchestrator runs an autonomous evolutionary dev loop with up to 10 subagents; done means reaching the scope, scale and ambition in the context files (all ten goals, 10m entities / 100m facts, 256 to 1024 logical clients) for both lanes.

Attack these, and anything else you find:
A. Will this loop actually converge on the done condition, or will it spread thin, game its own gates, or stall? Is the selection and promotion rule sound? What would a dishonest-but-green outcome look like under these gates, and how is it prevented?
B. Are the gates the right fitness function for the ten goals and the ORM/raw-query requirement? What goal has no gate, or a gate that cannot fail?
C. Architecture: the ledger-plus-projection thesis (T1), the XTDB `_id`-first design with index tables, hypothesis H-X-CUT (mapping commit position to the `_system_from` of the tx_meta row version written in that transaction), the card-one conflict policy, the QLever compact ledger, current graph, roll-forward write protocol, and the union-default-graph argument against per-assertion named graphs. Where is the reasoning wrong, unproven in a way the plan ignores, or in conflict with the handoff rules (exact values, temporal cuts, assertion identity, history, receipts; no manufactured passes; recordedAt is not engine system time without proof)?
D. Oracle independence: the KV runtime shares core code with the system under test. Is that acceptable for the entity suite? What should change?
E. Feasibility on a 6-CPU / 12 GiB / 60 GiB Docker VM on a shared Mac, for the 10m-entity rung and 1024-client stress. What should the plan do differently?
F. Sequencing of the first generation: what is missing, what is premature, what should run first?

Output format: numbered findings, each with Severity (critical/major/minor), the exact plan text or section you dispute, why it is wrong (cite files/lines or research sections), and the concrete change you want. End with the three changes that matter most. Be direct; do not soften.
