# Public HTTP exact-integer qualification

`public-roundtrip.ts` uses only public built exports from core, config, HTTP and
the selected backend. Effect `HttpRouter.toWebHandler` receives actual Web
`Request` objects and returns actual `Response` objects. Database transport and
transactions are real; this is not an HTTP ingress/network performance trial.

Run after the backend's readiness/admission checks, in a distinct lease from its
44-case and workload gates:

```sh
python3 scripts/triplex-lease.py --backend xtdb --purpose 'public HTTP integer E2E' --wait-seconds 30 -- pnpm exec tsx experiments/http-integer/public-roundtrip.ts --execute --backend xtdb
python3 scripts/triplex-lease.py --backend qlever --purpose 'public HTTP integer E2E' --wait-seconds 30 -- pnpm exec tsx experiments/http-integer/public-roundtrip.ts --execute --backend qlever
```

Each run retains a fresh logical scope and create-only evidence receipt. It
persists the ExactLedger schema with the public `ConfigStore.commit` release API
and atomically moves `live`. The explicit collection is `exact-ledgers`.

Checks cover tagged signed-int64 bounds and `9007199254740993` through POST,
GET, PUT, cardinality-many deduplication, native Datalog joins, retained history
and typed transaction receipts. JSON numbers, plain text, noncanonical strings
and overflow return HTTP400 without advancing the commit position. Served schema
and OpenAPI come from the persisted release.

The final POST uses a custom public `Runtime.define` with the real StorageAdapter
and QueryExecutor. A client wrapper lets the native commit succeed, then loses
its acknowledgement and rejects only operation-marker lookups for the adapter's
five-second resolution window. The actual resulting HTTP500 must expose
`transaction_outcome_unknown`, `operationId` and `attemptId`. A fresh unwrapped
native connection resolves that durable operation; its typed receipt identifies
the created entity, which is retrieved without replaying the POST.

This fault model demonstrates transport uncertainty and later durable lookup.
It does not simulate a database crash or establish server partial-write/crash
atomicity. No test data, databases, containers or receipts are deleted.
