# Pinned native correlation and aggregate shapes

Tags: `backend:qlever`, `surface:qlever-native`, `surface:qlever-datalog`, `goal:4`, `goal:5`, `problem:native-correlation`, `mechanism:positive-grouping`, `status:observed`.

The independently executed [public-schema edge review](../../qualification/reviews/qlever-native-shape-edges-independent-v1.json) separates three passing candidate edges from two failing normative controls. Exact int64 maximum preserves every tied winner; an empty maximum group stays absent; grouped empty SUM produces no row. These are bounded semantic checks, not a general SPARQL or performance qualification.

Both flat and nested correlated NOT EXISTS controls used two revision/order rows and a later-order relation. Expected only `two`; the pinned engine returned `one,two`. The normative controls remain explicit failures even though the candidate positive grouping formulation passes. Do not infer that all native correlated negation is correct from the142-task library result, and do not relabel a rewritten application query as an engine semantic fix.

Related translated-path family12 caused a real2GiB cgroup OOM, with ingestion unavailable afterward. Its [retained attempt](../../.devloop/jobs/qlever-datalog-packet-bounded-v2/attempts/0001/terminal.json) and [read-OOM recovery](recovery.md) are distinct from the native semantic controls. Count-first, positive MAX/grouping and a narrowly patched engine are competing hypotheses, each requiring its own current public/cut/empty/tie qualification.

The current public Datalog validator rejects the reviewed nested double-NOT shape before lowering. Its nested-MINUS eligibility test is defensive future/preflight coverage; it is not evidence of a reachable current Datalog defect. The flat/nested **raw SPARQL** correlation controls above remain independently observed engine findings. OR-negation carries an expression flag that prevents the MINUS lowering.

At fixed2GiB, the compact-source [projected arm](../../.devloop/jobs/qlever-negation-projected-family12-v1/attempts/0001/terminal.json) and the fresh [MINUS arm](../../.devloop/jobs/qlever-negation-minus-family12-v2/attempts/0001/terminal.json) each OOMed on the first family12 query. The earlier `minus-family12-v1` ran against an unavailable server and is setup failure rather than MINUS evidence. The next stored-scalar leaf candidate is being tested at the same cap to remove compact variable-predicate/type-channel planner ambiguity. No pass is assigned to that candidate before execution and recovery checks finish.
