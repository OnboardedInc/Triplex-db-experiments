# QLever native STR ordering

Problem tags: `semantic`, `string-order`, `pagination`, `goal-2`, `goal-10`.
Status: observed native discrepancy and a separate public SDK counterexample.

The first named page in
[`qlever-native-page-sample-v1/0001`](../../.devloop/jobs/qlever-native-page-sample-v1/attempts/0001/terminal.json)
returned256 complete rows and no duplicate identities. Rows231→232 share their
graph key, but their subject strings first differ as `c`(U+0063) followed by
`E`(U+0045). The generated query explicitly orders `STR(?g)`, `STR(?s)`,
`STR(?p)`, `?kind`, `STR(?o)`, `?datatype`, `?language`. Its codepoint-order check
failed and the attempt stopped after one SELECT; no adjacent/default/repeated
page or final owner/profile observation was made.

SPARQL1.1 makes STR of an IRI a simple literal. Ascending ORDER BY uses the
less-than operator, whose simple-string comparison uses Unicode codepoint
collation. Thus this observed pair differs from the specified STR order; it
cannot be explained as unspecified ordering between raw RDF term types.
This establishes one result-order discrepancy, not a whole-language conclusion.
([STR](https://www.w3.org/TR/sparql11-query/#func-str),
[ORDER BY](https://www.w3.org/TR/sparql11-query/#modOrderBy),
[operator mapping](https://www.w3.org/TR/sparql11-query/#OperatorMapping))

Pinned runtime commit `6c5861a6526d7d7ae77735d09339ee0825f0c001` compares local
literal words through the vocabulary's TOTAL locale comparator. Local index
metadata declares ICU support and the en_US locale. That provides a plausible
source explanation, without instrumentation of the executed comparator.
TOTAL uses ICU before its byte tie-break; replacing it with casefold would not
implement that comparator or the normative codepoint rule.
([comparison](https://github.com/ad-freiburg/qlever/blob/6c5861a6526d7d7ae77735d09339ee0825f0c001/src/index/LocalVocabContextImpl.cpp#L15),
[TOTAL comparator](https://github.com/ad-freiburg/qlever/blob/6c5861a6526d7d7ae77735d09339ee0825f0c001/src/index/vocabulary/StringSortComparator.h#L307))

Exact raw response, canonical bytes, timing, source hashes and the independent
review remain in the [semantic finding](../../qualification/evidence/qlever-native-str-order-semantics-v1.json),
[full-commit locator correction](../../qualification/evidence/qlever-native-str-order-source-locators-v1.json)
and [terminal review](../../qualification/reviews/qlever-native-page-sample-v1-terminal-independent.json).
The archive's public source at `e8e6ed5` is a different revision. Short-prefix
browser-cache line counts were stale; the locator correction binds fresh full
commit source hashes and ranges. Earlier receipts are preserved.

The separate v2 sampler uses opaque native order solely for prefix consistency,
byte and client-wall measurements. Its order diagnostic may remain false; that
is not an ordering PASS. No full continuity budget, stop/copy action or fault
test is authorized by that source proposal.

The initial public SDK risk was unexecuted: `rdf.ts` stores raw string lexical data
as `scalar_order`, and ordinary translated ORDER BY/range/page paths can consume
that channel. Bounded aggregate final-answer ordering separately uses byte
comparison. A fresh public mutation/query/reopen/cut fixture with independent
mixed-case/Unicode sort, range and pagination expectations is needed before
general string-order qualification. Existing44/142 answers remain scoped to
their own tasks and bytes; no retrospective failure or fix is inferred.

The separate public extension `qlever-public-string-extension-v6/0001` has now
executed all31 declared SDK calls and three Triplex commands through the real
schema/runtime/native facades. Both paths returned ASCII ASC `A,c,E,z` and the
original-cut continuation/reopen `E,z`, violating this extension's frozen
`A,E,c,z` policy. Native `STR` ranges and Unicode ordering also failed. Exact
Unicode payload membership, P1/R/scope/validAt, the12 assertion versions/one
retirement and settings100→1→100 passed. Datalog's broader Unicode order remains
POLICY_UNRESOLVED; the observed order does not silently select a new policy.

The Datalog text ranges additionally contain an impossible numeric+string
conjunction, tracked as a [separate compiler defect](qlever-wrapper-string-range.md).
Neither finding authorizes casefolding or sorting returned pages to pass.
The [author terminal record](../../qualification/evidence/qlever-public-string-extension-v6-author-terminal.json)
preserves the failed logical answers and an unrelated JSON-format byte-check
failure; independent terminal review is separate. This remains one small shared
fixture with11 logical subject IDs, not configured-entity capacity, general
ordering conformance, a142packet failure, target scale or a default promotion.
