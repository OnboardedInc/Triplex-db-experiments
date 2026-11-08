# Experimental Datomic runtime

`makeDatomicRuntime({ url })` composes Triplex storage and Datalog over the lab's
Datomic Pro Peer gateway. Bind a scope and explicitly pass `Capabilities.none`:

```ts
import { makeDatomicRuntime } from "@triplex-build/triplex-datomic";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";

const runtime = makeDatomicRuntime({ url: "http://127.0.0.1:8470" });
const layer = runtime.layer({
  scope: DatabaseScope.test("isolated-fixture"),
  capabilities: Capabilities.none,
});
```

The gateway provisions test scopes only. Each scope has its own database. Writes
stage in a fiber-local callback and publish through one scope-CAS transaction;
only explicitly replay-safe callbacks retry conflicts. Operation IDs resolve
lost acknowledgements. An unresolved outcome returns `TransactionOutcomeUnknown`.

Datalog patterns, predicates and existence filters execute in the Peer with an
allowlist and timeout. Fact witnesses preserve support multiplicity before the
bounded TypeScript aggregation and pagination kernel. Binary rules use bounded
frontier rounds, rather than native recursive Datomic rules. Callback reads use
held immutable databases and `d/with`; snapshot handles expire after two minutes.

Integer payloads remain canonical int64 text in TypeScript and Datomic longs in
storage. Binary64 values use doubles; sign metadata preserves negative zero when
the durable transactor normalizes it. Arithmetic never silently converts exact
integers to doubles.

This private package is a lab candidate. See `lab/experiments/EXP-DA01/REPORT.md`
for measured coverage and limitations. Native Datalog/pull, erasure, tenant
certification, production provisioning and P1-P5 performance qualification belong
to later experiments. Source and image versions must be deployed together through
`lab/bin/engine.mjs`; do not use a default Docker daemon.
