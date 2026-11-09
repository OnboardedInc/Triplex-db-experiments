# Native SPARQL reads

`makeQleverNativeQueries(client, scope)` reads the same assertions and source
positions as the Triplex QLever runtime. Triplex remains the write, transaction
and history authority. Queries are authored SPARQL; no Datalog AST is lowered on
this path. Existing Triplex `TypeExpr` schemas validate parameters and decode
declared results.

```ts
import { Effect } from "effect";
import { Attribute, TypeExpr } from "@triplex-build/triplex/config";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeQleverClient, makeQleverNativeQueries } from "@triplex-build/triplex-qlever";

const token = process.env.QLEVER_ACCESS_TOKEN;
const client = makeQleverClient(process.env.QLEVER_URL!, token ? { accessToken: token } : {});
const native = makeQleverNativeQueries(client, DatabaseScope.test("native-example"));
const Counter = Attribute.int64(":native/counter");
const contract = {
  name: "example/counter",
  parameters: TypeExpr.struct({ entity: TypeExpr.required(TypeExpr.text) }),
  row: TypeExpr.struct({ counter: TypeExpr.required(TypeExpr.int64) }),
};
try {
  const result = await Effect.runPromise(native.select(contract,
    { entity: "?alice" }, (ctx, decoded) => {
      const input = decoded as { entity: string }; // Already schema-validated.
      return `SELECT ?counter WHERE {
        ${ctx.fact(ctx.entity(input.entity), Counter, "?counter")}
      }`;
    }, { basis: { validAt: 10.5 }, includeRaw: true }));
  console.log(result.rows, result.basis, result.rawRows);
} finally {
  await client.close();
}
```

`ctx.entity(value)` distinguishes a literal Triplex entity identifier such as
`?alice` from an authored SPARQL variable such as `"?subject"`. `ctx.literal`
escapes other data literals. `ctx.fact` binds a schema attribute's physical type
and closes the database scope, source position, optional recorded time and
half-open valid time. `ctx.recordedFact` keeps the same knowledge cut across all
business-time intervals; optional `validFrom`/`validTo` variable names expose
their lexical coordinates. These helpers preserve exact integer and binary64
carriers; native computed arithmetic has the engine's own precision and limits.

The example uses the compiled public signatures exercised by
`experiments/native-entry.ts` and the native qualification tasks. That entry
fixture writes its own counter first; this example reads an existing counter.
Runtime-authored `TypeExpr` schemas return validated `unknown` rows instead of
asserting an unchecked TypeScript generic. `TypeExpr.any` preserves RDF terms,
including kind, datatype and language. Unbound variables remain absent.
`includeRaw` retains the original protocol bindings beside a declared decode.

The shared trace encoder represents a negative-zero parameter as
`{ type: "float64", bits: "8000000000000000" }` so serialized evidence keeps its
sign. Decoded parameters and rows still use JavaScript numbers. This evidence
carrier does not extend the pinned engine's native arithmetic precision.

Use `result.basis` for subsequent authored pages or multiple calls that must
share one source cut. `maxRows` and response-byte limits reject oversized
complete results rather than returning partial answers. Cancellation requests
native termination but does not itself prove physical resource reclamation.

Native-only SPARQL expressions and relations remain available. Arbitrary raw
graph access does not automatically inherit helper cuts, portable Datalog
errors, authorization or pending-transaction overlays. The matched71-task
library qualifies its authored native queries separately from the foundation44.

## Read-only native relations (contract C8, EXP-C8)

`selectWithRelations(contract, input, definitions, build, options)` answers bounded
closures with SPARQL reads only. Each definition's authored `SELECT ?source ?target`
(plain string endpoints) is read at one resolved source cut; optional `seeds(ctx, input)`
(ids, or `{ query }` projecting `?seed`) restricts the relation to pairs from those
starts, otherwise every source is closed. The closure runs in the shared
`frontierClosure` and reaches the final builder as an inline `VALUES` block through
`ctx.relation(name, source, target)` (variables or `ctx.entity` literal carriers).
`relationStrategy: "single-read"` (default) reads the edge relation once; `"rounds"`
reads once per frontier round with the frontier as one `VALUES` block. No graph is
written, so no read empties QLever's result cache or grows its delta.
`maxRelationRows` bounds edges, reached nodes and pairs; exceeding it is an error,
never a partial closure. No property path with both ends unbound and no `p*` with a
constant start is issued; a current-graph property-path tier (R10 6.3) needs plain IRI
triples this mapping does not have yet.

The source inspiration is QLever v0.6.0's native
[TransitivePath implementation](https://github.com/ad-freiburg/qlever/blob/6c5861a/src/engine/TransitivePathBase.h).
The current binary and the authored workload still require their own retained
live evidence; source support alone is not acceptance.
