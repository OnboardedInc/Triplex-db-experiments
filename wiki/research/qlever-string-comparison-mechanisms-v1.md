# QLever string comparison mechanisms v1

Tags: `problem:qlever-native-string-order` `problem:qlever-wrapper-string-range` `hypothesis:native-lexical-comparison` `hypothesis:binary-vocabulary-profile`

Status: **source-only hypotheses, neither implemented nor executed**. No engine
patch, native build, settings change, stop, copy, index rebuild or recovery is
approved by this memo. The fixed runtime is QLever
`6c5861a6526d7d7ae77735d09339ee0825f0c001`; archive variants such as e8 are separate.

The public extension's retained `qlever-public-string-extension-v6/0001` failed
seven of nine Datalog logical checks and nine of eleven native logical checks.
Both paths returned ASCII ascending `A,c,E,z`, while the independent common ASCII
oracle requires `A,E,c,z`. Native Unicode order/range also failed its separately
normative oracle. Exact Unicode membership, correction lineage and captured bases
passed. These observations are not retroactive failures of the unchanged44/142
packets. See [actual independent review](../../qualification/reviews/qlever-public-string-v6-terminal-independent.json).

The separate wrapper defect is an impossible numeric-plus-string family guard.
The isolated explicit wrapper branch passed12 pure compiler cases and remains
unintegrated. It does not change the engine comparator. See
[wrapper finding](../problems/qlever-wrapper-string-range.md),
[pure author result](../../qualification/evidence/qlever-wrapper-text-lowering-pure-v1-author.json)
and [independent pure result](../../qualification/reviews/qlever-wrapper-text-lowering-v1-actual-independent.json).

## Source authority and limits

SPARQL's `STR`, operator mapping and ordering rules supply the native string
oracle. They do not establish a general Unicode ordering policy for the distinct
Triplex Datalog API. Its wider Unicode observations remain `POLICY_UNRESOLVED`.
[W3C STR](https://www.w3.org/TR/sparql11-query/#func-str),
[operator mapping](https://www.w3.org/TR/sparql11-query/#OperatorMapping),
[ORDER BY](https://www.w3.org/TR/sparql11-query/#modOrderBy).

In the pinned implementation, STR constructs a literal; OrderBy invokes
`compareIds`. Local-vocabulary comparisons delegate through the vocabulary
context. These source paths explain a plausible mechanism; they are not an
executed comparator trace.
[StringExpressions.cpp27–37,58–68](https://github.com/ad-freiburg/qlever/blob/6c5861a6526d7d7ae77735d09339ee0825f0c001/src/engine/sparqlExpressions/StringExpressions.cpp#L27),
[OrderBy.cpp105–115](https://github.com/ad-freiburg/qlever/blob/6c5861a6526d7d7ae77735d09339ee0825f0c001/src/engine/OrderBy.cpp#L105),
[ValueIdComparators.h512–517,565–584](https://github.com/ad-freiburg/qlever/blob/6c5861a6526d7d7ae77735d09339ee0825f0c001/src/global/ValueIdComparators.h#L512),
[LocalVocabContextImpl.cpp15–18](https://github.com/ad-freiburg/qlever/blob/6c5861a6526d7d7ae77735d09339ee0825f0c001/src/index/LocalVocabContextImpl.cpp#L15).

`TripleComponentComparatorImpl` compares datatype, then ICU-derived inner values;
TOTAL's byte comparison is only a later tie-break. LocaleManager's TOTAL strength
is ICU IDENTICAL, not a byte comparator. The retained current index metadata says
ICU enabled, en_US, punctuation not ignored.
[StringSortComparator.h307–332](https://github.com/ad-freiburg/qlever/blob/6c5861a6526d7d7ae77735d09339ee0825f0c001/src/index/vocabulary/StringSortComparator.h#L307),
[LocaleManager.h307–333](https://github.com/ad-freiburg/qlever/blob/6c5861a6526d7d7ae77735d09339ee0825f0c001/src/index/vocabulary/LocaleManager.h#L307).

Exact primary-source hashes, local retained copies and line counts are recorded in
[the source audit](../../.artifacts/qlever-string-mechanisms-v1/source-audit.json)
and the earlier [comparison audit](../../.artifacts/qlever-page-sample-terminal-independent-v1/source.json).
Direct pinned bytes are authoritative: the web text extractor still returned an
older413-line StringSortComparator view, while the independently fetched pinned
file is446 lines, SHA `b395e366c294930bbe8ffc3cfcc500cb02820b25e8139c959e2fbe2e730f2f5d`.

## N1 — semantic lexical comparison with the existing ICU index

Hypothesis: a native comparison layer can compare the actual lexical content of
comparable string values by codepoint, while retaining the existing vocabulary's
physical ICU order and Unicode functions. For valid UTF-8, unsigned lexical byte
ordering provides a candidate implementation of codepoint ordering. RDF quoting,
escaping, language/datatype channels and invalid-input rules must be handled by
the owning term decoder, not by comparing serialized RDF text blindly.

This is more than changing LocalVocab's comparator: global/local/mixed terms,
constants and expression-produced STR literals must agree. Equality and term
identity must retain their existing contract. ORDER BY, relational evaluation,
MIN/MAX and all sorted-column or block-range shortcuts need an audit. The
relational API already exposes metadata prefilters, so a semantic change cannot
leave a contradictory prefilter silently active.
[RelationalExpressions.h44–49](https://github.com/ad-freiburg/qlever/blob/6c5861a6526d7d7ae77735d09339ee0825f0c001/src/engine/sparqlExpressions/RelationalExpressions.h#L44).

Expected costs are hypotheses: lexical lookups/comparisons add work proportional
to compared content; a sort can perform O(M log M) comparisons. Caching keys adds
measured bytes per distinct value; preserving the ICU index may require scanning
instead of an incompatible ordered range shortcut. No bytes, runtime or memory
saving is yet measured. Native source/build/dependency disk, binary size and build
RSS must be admitted separately. This candidate aims to avoid a data reindex, but
that is not established until all physical-order assumptions are inspected.

First falsifiers, after a separate source/build grant: independent pure term tests
for global/local/mixed representations, ASCII E/c, BMP/astral, NFD/NFC identity,
empty/equal strings, compatible and incompatible typed terms; then the unchanged
native and common ASCII public task, range and P1/reopen cases. Preserve wrong
answers. No whole-fact host evaluation or post-LIMIT client sorting is part of N1.

## N2 — separately built byte-ordered vocabulary profile

Hypothesis: a coherent binary/index pair using byte-ordered vocabulary terms can
make the relevant native string comparisons agree with the codepoint oracle while
keeping ID-based query operations. The existing `QLEVER_NO_UNICODE` mechanism is
a source-backed control candidate, not an accepted semantic fix. Its build option
is OFF by default and explicitly warns about Unicode feature loss.
[CMakeLists.txt323–331](https://github.com/ad-freiburg/qlever/blob/6c5861a6526d7d7ae77735d09339ee0825f0c001/CMakeLists.txt#L323).

The NoICU manager compares bytes, produces byte sort keys and makes normalization
a no-op. Its own comments also show that other Unicode behavior needs inspection.
Passing ASCII alone cannot qualify case conversion, regex, normalization, language
handling or all SPARQL functions. A byte comparator specifically selected for the
vocabulary while retaining ICU elsewhere is a further source design, not a flag
that has already been proved available.
[LocaleManager.h375–434](https://github.com/ad-freiburg/qlever/blob/6c5861a6526d7d7ae77735d09339ee0825f0c001/src/index/vocabulary/LocaleManager.h#L375).

This changes physical ordering. The implementation stores `has-icu-support` and
refuses an index/binary mismatch. Reusing the current ICU index with an edited
metadata bit would violate that guard. A rebuilt profile must preserve every
acknowledged current/history/configuration/journal population and verify its full
payload independently; counts and sampled prefixes are insufficient.
[IndexImpl.cpp1315–1325,1426–1442](https://github.com/ad-freiburg/qlever/blob/6c5861a6526d7d7ae77735d09339ee0825f0c001/src/index/IndexImpl.cpp#L1315).

Costs include separately measured build/reindex CPU and peak RSS, source and
binary closure, input capture, retained original index, new index, temporary
sort/WAL and restoration proof. No complete continuity capture exists yet, so
this path is currently blocked before any service operation. The8GiB VM currently
holds5GiB of engine caps plus its separately counted system overhead; a new2GiB
worker does not simply fit alongside both existing foundations. An eventual
reviewed replacement window would retain reservations/history and preserve the
original data. No larger VM or engine cap is inferred.

First falsifiers, only after new admission and continuity approval: mismatch guard
negative; a tiny separately indexed full-payload fixture; the same codepoint,
term-identity and Unicode-function controls as N1; then both public paths and their
write/history/receipt/reopen regressions at unchanged engine limits. A Unicode
feature failure disqualifies the claimed language subset rather than being hidden
by an ASCII-only label.

## Decision boundary

N1 is the preferred first source-design investigation because it seeks to preserve
the current physical store and Unicode facilities. N2 is a useful independent
mechanism hypothesis with substantially higher migration/resource prerequisites.
Neither is a measured win or implementation choice yet. Locale switches,
casefolding and sorting already truncated client pages do not satisfy the retained
native contract. Changes to a complete supported native query language should
remain native; no new Datalog compilation or full SPARQL AST rewrite is required.

Both mechanisms may benefit the shared QLever foundation and both query paths,
but each path needs its own fresh public semantic gates. The isolated wrapper
family fix is independent. A later lowercase-only public range case can establish
that repair without accepting the unchanged mixed-case native discrepancy as an
oracle. Broader Datalog Unicode policy, ties, full conformance, load, durability and
configured-entity capacity remain separate open goals.
