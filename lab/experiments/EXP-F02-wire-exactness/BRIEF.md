# EXP-F02 falsifier: exactness of every Triplex value type on every wire path, both engines

## Commander's intent
Fill the capability matrix's value-type rows with measured evidence, so every later design decision about native
column types, typed literals and parameter binding rests on facts instead of documentation. The output tells the
projection compilers exactly which values can use a native type and which must stay lexical or route to the ledger.

## Point of view
- Enumerate the value domain from source (`packages/core/src/Value.ts` and the Triplex type list: text, number,
  integer, int64, boolean, date, instant, enumOf, ref, plus json/blob if the adapters store them).
- Edge values: text with astral characters, combining marks, NUL (if legal), isolated surrogates (must be rejected);
  number -0, smallest subnormal, max/min double, 2^53+1 as double, values with low mantissa bits set; int64 at
  ±(2^63-1), 2^53+1, ±2^59 and ±(2^59+1); instant with fractional milliseconds and microseconds, far past/future;
  date at boundaries; enum and ref ids with reserved IRI/SQL characters.
- Paths per engine: (a) Triplex public write then read through the existing adapter (ledger); (b) candidate
  projection encodings: XTDB typed columns (TEXT, DOUBLE, BIGINT, BOOLEAN, DATE, TIMESTAMPTZ) through the Node
  `postgres` driver as configured in `packages/xtdb/src/XtdbClient.ts`, QLever typed literals (xsd:string, xsd:double,
  xsd:long/xsd:integer, xsd:boolean, xsd:date, xsd:dateTime) written by SPARQL UPDATE and read back as JSON results;
  (c) native query parameter binding and `hydrateNativeValue`/`decodeNativeRows` on results.
- Report per (type, value, engine, path): exact, rounded (how), rejected, or silently changed. Silent changes are the
  important finding.

## Boundaries
Use the shared `dev` slots with a unique database scope (no restarts needed). Code under `lab/falsifiers/wire/` or
package tests on branch `exp/F02-wire-exactness`. Deliver `REPORT.md` plus a machine-readable
`results.json` the acceptance capability matrix can link to.
