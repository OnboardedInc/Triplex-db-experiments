# @triplex-build/triplex-http

> **Pre-1.0:** install `@triplex-build/triplex-http` from npm with `effect@4.0.3`;
> Effect 3 is not compatible.

Configuration-derived REST and OpenAPI contracts for Triplex. The package is backend-neutral and
uses Effect services: hosts provide `Triples`, `ConfigStore`, and an authorization policy, then
mount `EntityHttp.layer` into their chosen HTTP server.

```ts
import { EntityHttp, HttpAuthorizationAllowAll } from "@triplex-build/triplex-http";
import { Layer } from "effect";

const routes = EntityHttp.layer({
  basePath: "/api",
  exposure: { collections: { Employer: "employers" } },
}).pipe(
  // Local examples only. Production hosts must provide a fail-closed authorization policy.
  Layer.provide(HttpAuthorizationAllowAll),
);
```

The HTTP contract is loaded from an immutable persisted configuration snapshot. JSON attribute
keys are exact global keywords such as `:employer/name`; TypeScript aliases are discovery metadata
only. `latest` resolves the configurable `live` ref and is writable. Explicit snapshot IDs and
friendly aliases are read-only unless the host names an `activeWriteSnapshot`.

On backends that support `Attribute.int64`, exact integer attributes use
`{"type":"integer","value":"9007199254740993"}` in requests and responses.
The decimal text must be canonical and fit signed 64-bit bounds. JSON numbers,
plain strings, overflow and noncanonical spellings are rejected. Legacy
`Attribute.integer` keeps its JavaScript-number wire format. The public
`ConfigApi.StorageFamily` union now includes `integer`; exhaustive consumers
must handle the added variant.

An uncertain transaction returns HTTP 500 with code `transaction_outcome_unknown`
and its `operationId`, `attemptId`, and caller command ID when present. This is
not an acknowledgement or proof of rollback. Resolve the operation through the
backend's recovery API before replaying it. Backend-specific unknown-outcome and
lossless integer integration remain subject to each backend's qualification.

See the repository's [HTTP API guide](../../docs/http-api.md) and
[complete host example](../../examples/http-api).

MIT © 2026 Ben Jacobson.
