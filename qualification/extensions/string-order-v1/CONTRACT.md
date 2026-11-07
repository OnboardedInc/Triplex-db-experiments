# String-order qualification extension v1

Status: source-only contract for review. No fixture implementation, admission,
mutation, query, default change or engine action is authorized by this file.

This is a separate extension. The existing20 workload families,71 logical tasks
and142 current/reopen expectations remain unchanged. The shared ASCII recipe
can later run on all five surfaces; initially only `qlever-datalog` and
`qlever-native` are proposed. The other three paths remain UNEXECUTED and receive
no transferred result. Native queries stay authored in their own language.

## Required and unresolved policy

The new common ASCII compatibility policy is literal `A < E < c < z`, with
stable entity tie-breakers. It applies to the extension's public ordered reads,
supported wrapper text filters and pages. Root explicitly approved this narrow
policy; it does not select a new global Unicode collation.

Triplex documents numeric-only ordered WHERE predicates. Therefore the text
range cases use `Triples.queryPage` wrapper filters, not invented string WHERE
comparisons. KV order/cursor and wrapper-text comparison currently use JavaScript
string relational comparison, which compares UTF16 code units. SQL paths
delegate text comparison to SQL. The public docs specify family ordering and
stable cursor cuts, but do not settle a common BMP/astral collation. Unicode
Datalog observations therefore retain separate UTF16, codepoint and UTF8
candidate expectations with `POLICY_UNRESOLVED`; choosing another candidate is
not a qualification failure or permission to change behavior.
([query docs](../../../docs/datalog.md),
[KV order/cursor](../../../packages/core/src/kv/datalog/executor.ts),
[KV predicate domain](../../../packages/core/src/kv/datalog/predicate.ts),
[SQL wrapper](../../../packages/core/src/datalog/wrapper.ts))

Authored native SPARQL `STR` ordering and string comparison independently require
the specified Unicode codepoint semantics. Those normative Unicode cases apply
to `qlever-native`; they do not impose SPARQL on XTDB SQL/XTQL or Triplex Datalog.
The retained first-page discrepancy remains a failure of that exact old query.
([STR](https://www.w3.org/TR/sparql11-query/#func-str),
[ORDER BY](https://www.w3.org/TR/sparql11-query/#modOrderBy),
[operator mapping](https://www.w3.org/TR/sparql11-query/#OperatorMapping))

## Fixture and actual public operations

Use one shared physical QLever foundation, with two fresh UUID-bearing
`DatabaseScope.test(...)` scopes: four ASCII entities and seven Unicode entities.
Use `Attribute.text(":string-order/label")` and an `EntityType.make` attribute
handle, with one required label per entity. The recipe supplies exact strings
and entity IDs. No existing scope or rows are deleted, reused or rewritten.

Write only through compiled public `Triples.transact`, using the schema handle,
`string(value)`, explicit `[10.25,10.75)` validity and unique command IDs.
Initially write four ASCII assertions in one command and seven Unicode
assertions in a second scope's command. Retain complete receipts and prove each
with `transactionByCommand`. The ASCII correction later retracts the original
`c` assertion by its returned ID and asserts `"0"` for that same entity in one
acknowledged transaction. There are three intended commands,12 assertion
versions and one retirement; measure actual storage/metadata separately.

Use the existing public runtime composition pattern from
[native-entry.ts](../../../packages/qlever/experiments/native-entry.ts), with
`Capabilities.none`, controlled deterministic clock/seed and explicit validAt10.5.
Retain observed clock/receipt fields rather than inventing R values. Initial
ASCII and Unicode positions are recorded independently. Reject an unexpectedly
nonempty fresh scope or an inconsistent receipt before qualification.

The Datalog ordered reads call `Triples.queryAll` with explicit label/entity
ordering and `includeBasis:true`. Wrapper ranges call `Triples.queryPage` with
filters `{column:"?label", op:">", value:"E"}` or `< "c"`, limit8 and
`includeCount:false`; they do not call `queryAll` with a WrappedQuery.

The native public provider calls `select` with parameter/row TypeExpr contracts
derived from the label handle. Authored SPARQL uses `ctx.fact("?entity", Label,
"?label")`, safe `ctx.literal(...)` parameters and `ORDER BY STR(?label)
STR(?entity)`. Page requests use native `LIMIT2/OFFSET0,2` at an explicitly
captured `NativeReadBasis.recordedPosition`; this is not an invented native SDK
opaque-cursor API. Retain raw RDF terms and typed rows.

## Page, cut and reopen sequence

1. Freeze the ASCII P1 receipt and confirm the complete four-row membership.
2. Run the declared initial ASC/DESC and wrapper/native text-range cases at P1.
3. Capture a two-row first page, its public basis and actual opaque cursor for
   Datalog, or explicit native P1 and offset sequence for SPARQL.
4. Commit the same-scope `c → 0` correction and verify its command receipt,
   retired/new assertion IDs, history and P2 position. Retain any unknown ACK;
   do not replay a write or infer rollback.
5. Continue the original P1 page. It must return `c,z`, even though the latest
   P2 order is `0,A,E,z`. Reopen the adapter/provider at the same scope and
   replay that declared old-cut continuation. No container restart occurs.
6. Query latest P2 and run Unicode membership/ordering observations at their
   separately captured scope position. Reopening means a new public client and
   runtime lifecycle, not crash recovery or a new physical database copy.

Do not inject a private exact-K field into an ordinary Datalog query. Use the
public cursor's inherited cut; explicit K belongs to the native read options.
Every native multi-call case supplies the same captured P instead of resolving
a newer P independently. Returned basis scope, validAt and position are checked.

## Evidence and proposed operational envelope

The independent oracle is the accompanying data recipe. Expected ordered arrays
are frozen before execution; no backend result, casefold, locale sort, client
sort-to-pass or aggregate normalizer generates expectations. Unicode candidate
arrays are independently specified, not inferred from an engine. Membership
checks compare by fixed entity identity separately from order.

Capture each actual response/basis, native trace/query, receipt/history and
reopen observation incrementally. Retain failures without exposing tokens or
raw error messages; use the reviewed bounded class/message-hash evidence style.
Normative failures remain failures. A planned diagnostic may continue to later
read cases only under an explicitly reviewed packet policy; any infrastructure,
unknown-ACK, owner, privacy, budget or transport failure stops the packet with
partial evidence and no retry/recovery.

Proposed client envelope:896MiB/1CPU/64MiB owned disk/180s, with the unchanged
2GiB QLever resident and other resident costs counted. A future concrete runner
must freeze its finite exact SDK-call inventory and per-call deadlines before
admission. First QLever translated selection should use the explicitly qualified
F1 flags and100→1→100 settings wrapper; native SPARQL uses guarded100. These
same-server stages are settings-exclusive, require separate exact manifests and
must restore/read back100 before the sibling. No setting or write is granted
by this proposal. All source/build/dependency/oracle/controller scopes and actual
co-runners must be bound under the corrected reviewed collector; unresolved
conditional/environment scope remains explicit.

The semantic probe takes priority over larger load or full-capture work. A
success would qualify only these small supported cases. A failure supplies a
new independent public counterexample. Neither outcome rewrites44/142, proves
target scale/durability, fixes native codepoint order or authorizes a default
promotion, whole continuity capture, stop/copy action or fault sequence.
