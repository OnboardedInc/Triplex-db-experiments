# QLever wrapper text ranges use a numeric-only guard

Tags: `backend:qlever`, `surface:qlever-datalog`, `goal:2`, `goal:10`,
`problem:wrapper-string-range-numeric-domain`, `status:observed`.

The fresh public extension `qlever-public-string-extension-v6/0001` returned no
rows for both ordered wrapper text filters `label > "E"` and `label < "c"` over
the exact `A,E,c,z` fixture. Its actual debug SPARQL requires the same value to
have a numeric family and the string family:

```sparql
FILTER((?v1_type IN ("number", "integer") && ?v1_type = "string" && ?v1_order > "E"))
```

The owning compiler's wrapper branch calls its numeric-only Datalog predicate.
That conjunction is unsatisfiable independently of the separate native string
collation failure. The new extension retained correct P1/R/scope/validAt,
correction lineage and old-cut membership; those positives do not clear its
wrong range/order/page answers. Exact queries, source hash/lines and immutable
response pointers are in the
[tagged finding](../../qualification/evidence/qlever-wrapper-string-range-numeric-guard-v1.json).
The [author terminal record](../../qualification/evidence/qlever-public-string-extension-v6-author-terminal.json)
retains the full failed outcome; independent terminal review is separate.

An isolated repair should separate text-wrapper comparison from WHERE lowering.
An explicit wrapper branch is the smallest candidate: keep the WHERE numeric
guard unchanged and produce a family-compatible text comparison for an ordered
wrapper boundary. A second internal-mode alternative would share more code but
make the context restriction less visible. Neither candidate fixes native
collation. Tests must preserve numeric WHERE validation and existing numeric,
equality and LIKE paths, without changing the shared expected answers.

The explicit branch now passed twelve actual isolated full-compiler cases in
`qlever-wrapper-text-lowering-pure-v1/0001`, including the unchanged control that
reproduces the contradictory guard. The live compiler and public artifacts are
unchanged. This is strip-only test emission and pure query generation, not a
TypeScript package build or native ordering/range acceptance. See the
[author result](../../qualification/evidence/qlever-wrapper-text-lowering-pure-v1-author.json)
and [independent actual review](../../qualification/reviews/qlever-wrapper-text-lowering-v1-actual-independent.json).
The separate native comparison mechanisms remain
[source-only hypotheses](../research/qlever-string-comparison-mechanisms-v1.md).

The shared SQL wrapper already separates inner Datalog compilation from wrapper
filters and chooses `orderText` for string boundaries. Its source is useful
inspiration for this adaptation. No fresh DuckDB or XTDB string result follows
from inspecting that code; cross-lane compatibility remains a qualification
hypothesis. See the [shared extension](../../qualification/extensions/string-order-v1/CONTRACT.md)
and [native ordering problem](qlever-native-string-order.md).
