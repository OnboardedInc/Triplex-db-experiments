# Source review of the value-contract packet

3 November 2026 (UTC). Independent read-only source inspection and hand derivation. This review is not runtime validation, a test pass, compatibility certification or an adapter selection.

## Scope

Reviewed the revised `PRODUCT-MAP.md` and `HAND-CONTROLS.md` after the temporal/null wording changes and T07's separate two-witness sum/count addition. Compared their value-contract claims with Triplex at `e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0` and relevant product text at `0e8823973f5e1b886b7ef96e8dc5a899f467f241`.

`TRIPLEX-SOURCES.json` records exact repository/path/ref/blob identities and line ranges: 21 Triplex files and seven product-review files. The product review includes full-tuple relation deduplication, native aggregate completion and zero-initialized sum state, same-tag expression comparisons, byte ordering, strict UTF-8 admission, exact int64 query/wire helpers and schema2 carrier constraints. Supplemental ECMAScript sources support the mathematical/encoding derivations.

## Findings

No remaining substantive correction was identified in the examined value-contract scope.

- **Typed ref distinction:** exact storage-tag matching is correctly limited to typed-ref patterns. Raw equality predicates and joins use flattened scalar identity.
- **Result null:** the revised map correctly treats missing optional fields and empty non-count aggregates as result states, not a new stored TripleValue tag. Tagged JSON null is separately permitted and ordinarily flattens to serialized text "null".
- **Count and multiplicity:** T07 correctly distinguishes two flattened values from five distinct entity sources and the per-group entity counts 2/3. Its separate amount10/two-witness subcontrol correctly predicts sum20 but count(amount)1 from the pinned source assertions. Native count iterates the completed relation's distinct full tuples, so two different witnesses with one measure remain two native count inputs.
- **Empty aggregates:** native zero-key sum_i64 has zero-initialized state and yields integer zero; native empty min/max produces no output tuple. Triplex's read source assertions expect null non-count aggregates and count0. No direct aggregate equivalence is asserted.
- **Time and precision:** the revised `resolveTemporalBasis` wording is properly scoped. Its explicit condition retains validAt0.5, unlike unchanged product int64 cut admission. A separately declared exact unit mapping could preserve some fractional instants; none is selected. The binary64 integer and safe-integer distinctions are mathematical claims, not observed conversions.
- **Unicode:** the hand derivation is sound. UTF-16 D800 DC00 sorts before E000; UTF-8 EE 80 80 sorts before F0 90 80 80. Both inputs satisfy the cited non-NUL/scalar/512-byte constraints. SQL collation parity remains explicitly unresolved.
- **Finite admission and JSON:** the packet does not infer universal NaN/Infinity rejection from constructors, CanonicalJson or cursor checks. It does not substitute canonical content JSON for plain JSON.stringify query identity.
- **Control inventory:** `HAND-CONTROLS.md` is the sole canonical list, T01-T08 plus M01-M06, fourteen hand-only unexecuted controls. `VALUE-CONTRACT.md` links to that list rather than adding another inventory.

Earlier corrections are now incorporated: public read-basis wording replaces the broader "temporal inputs" wording; result-null wording includes empty aggregates and distinguishes JSON null; T07/M04 copy spacing is repaired. The unsafe claim about grouping by and counting the same implicit source variable is absent.

## Unresolved limits

This review did not inspect Effect 4.0.3's Schema.Number implementation, execute any fixture/model/query, import a module, compile code, install a dependency or access a database/runtime subject. It does not establish arbitrary SQL Unicode collation parity, all unsupported JSON payload outcomes, every upstream admission limit, a future capability subset, all numeric precision policies or loaded-build identity. It does not revalidate historical runtime results, owner observability or held actions.

Sources and derivations remain source-only. No product changes, runtime retries, capability selections or hold releases follow from this review.

Supplemental primary standards: [Number representation and rounding](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-number-type), [UTF-16 String representation](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-string-type), [string less-than](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-islessthan).

