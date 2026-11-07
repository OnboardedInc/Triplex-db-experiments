# Fourteen hand controls for a future value mapping

All controls below are source-derived specifications or mathematical distinctions. None was executed, simulated by a fixture/model, or counted as a passed test. They select no adapter subset or runtime action. T01–T08 concern pinned Triplex semantics; M01–M06 distinguish the current product boundary.

## Triplex controls

### T01 Bare text and typed ref do different work

Store two facts at `:test/value`, one with `string("x")` on entity S and one with `ref("x")` on entity R. A bare value-pattern constant `"x"` predicts S and R. A typed-ref pattern `{type:"ref",value:"x"}` predicts R only. A separate raw equality predicate comparing the bound value to that typed ref predicts both, because predicate comparison unwraps its text payload. Do not reuse the pattern's exact-tag rule for predicates.

### T02 A value-to-identity join uses flattened text

Add a fact on entity `"x"` at `:test/anchor` with true. Join T01's value variable to that anchor's entity slot. Both the stored string and ref predict a match. This is a query binding rule, not a statement that their typed storage objects are equal.

### T03 Numeric family and incompatible-family inequality

Use stored number 7, datetime 7, string `"7"` and boolean true. Matching the bare number 7 and joining shared numeric values predicts number/datetime only. Raw numeric ordered comparison includes the numeric-family matches. Text `"7" = 7` predicts false and text `"7" != 7` predicts true. Wrapper-filter inequality must have its own control because it has a different compatible-family/null contract.

### T04 JSON and blob are text at the query boundary

Let T be exactly `{"k":1}` as a string, including braces and quotes. Store string T, ref T, blob T and JSON object `{k:1}`. A bare value-pattern T predicts four matches through serialized text. A JSON numeric payload 7 instead flattens to text `"7"`, not numeric 7. A stored JSON null payload similarly flattens to text `"null"`, distinct from missing optional-result null. Blob projection exposes its content identity, not MIME/size/filename. This assumes these inputs reach the selected validated/storage path; Schema.Unknown alone is not proof that every JavaScript payload can be serialized.

### T05 Projection cannot reconstruct stored tags

Project only values from string/ref/blob with equal text and number/datetime 7. Expect primitive strings/numbers with no original tag or blob metadata. A direct typed triple read must separately retain those fields. Never infer the original stored family from the projected scalar.

### T06 Validated Datalog term eligibility

Typed datetime/JSON/blob constant objects are outside the public Datalog Constant union. Typed refs in entity/attribute/transaction identity positions are outside IdentityTerm. A validated entrypoint must reject those shapes. This is not a claim that every internal helper independently defends an unvalidated caller.

### T07 DISTINCT, grouping and COUNT have different inputs

Give five distinct entities one value each: number 7, datetime 7, string T, ref T and blob T. Value-only projection predicts two rows. COUNT(?value) predicts 2, while COUNT(?entity) predicts 5. Grouping by the flattened value and COUNT(?entity) predicts numeric group 2 and text group 3. The pinned conformance source asserts the two-row and 2/3 entity-count case; it was not run here.

Separate two-witness subcontrol: give two distinct entities one numeric amount 10 each. An ungrouped Triplex aggregate predicts sum 20 but COUNT(?amount) 1. The [pinned source assertion](https://github.com/bjacobso/triplex/blob/e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0/packages/testkit/src/index.ts#L1218-L1247) preserves equal numeric input multiplicity for sum while counting distinct flattened source values. This subcontrol is hand-only and unexecuted.

### T08 ASCII order and finite checks remain entrypoint-specific

Text `"10"` sorts before text `"2"`; numeric 2 sorts before numeric 10. The pinned KV comparator places numeric, boolean, text and null families in that order, even when reversing order within a family. Number constructors, Schema.Number decoding, canonical content encoding, public temporal-basis validation and cursor decoding are separate admission controls. Universal NaN/Infinity schema admission is not established by this packet.

## Product mapping controls

### M01 Integral payloads must not create a new query distinction

Native int64(1) and float64(1.0) are distinct values and distinct dictionary identities. Triplex's ordinary number(1) and number(1.0) are the same JavaScript numeric payload. A future translator that chooses the native tag from the spelling or integrality of each input must not expose that extra distinction as Triplex equality, joins, grouping or projection. No conversion policy is selected here.

### M02 Exact integer wire and Number precision

The product's i64 wire preserves decimal `"9007199254740993"` exactly. That integer cannot be represented by JavaScript's binary64 Number; round-to-nearest-even maps its mathematical value to 9007199254740992. The larger even integer 9007199254740994 is representable. An explicit future policy must distinguish a conservative safe-integer bound from an exact-round-trip test, and must not silently return decimal text as a numeric value. This is a mathematical derivation, not an observed conversion.

### M03 Fractional read-basis time cannot be truncated

With a finite nonnegative current time, Triplex's `resolveTemporalBasis({validAt:0.5}, now)` passes its stated finite/nonnegative checks and retains 0.5. The product's query snapshot requires signed int64 valid_at and cannot admit that float unchanged. The selected future adapter must preserve the cut or explicitly reject the unsupported instant; 0 or 1 is not an equivalent substitute. This does not describe every assertion-time or datetime-value entrypoint.

### M04 Existing text guards must remain visible

The product's persisted text has no-NUL and 512 UTF-8-byte guards; its native scalar-text decoder also rejects invalid UTF-8/surrogate scalar encodings. Triplex's inspected StringValue declaration is Schema.String and has no matching 512-byte guard there. A 513-ASCII-character payload and a NUL-containing payload therefore test a narrower product boundary, not permission to weaken it. A future subset must state the limit and return its selected unsupported-input result before mutation. No complete audit of every upstream string-entrypoint limit is claimed.

### M05 Unicode ordering distinguishes the comparators

Compare strings consisting of U+E000 and U+10000. The latter's UTF-16 representation begins D800, so JavaScript code-unit comparison places U+10000 before U+E000. UTF-8 begins EE for U+E000 and F0 for U+10000, so the native byte comparator places U+E000 first. This is a hand derivation for those two comparators. The inspected SQL paths do not establish universal cross-backend Unicode collation parity.

### M06 Native witness count is not COUNT(?value)

Give a completed native source relation two distinct full tuples, `(w1,7)` and `(w2,7)`, and group with no key. Native count consumes both full witnesses and predicts 2. A Triplex query binding two distinct entity witnesses to the same flattened value 7 has COUNT(?value)=1 and COUNT(?entity)=2. Changing only an aggregate's function name would not preserve both contracts. Empty global native sum_i64 predicts int64 zero and native min/max predict no tuple; pinned Triplex source assertions expect null for empty sum/avg/min/max and zero for count. No direct aggregate mapping is selected.

## Sources

[VALUE-CONTRACT.md](VALUE-CONTRACT.md) records the exact Triplex implementations, schema and conformance assertions. [PRODUCT-MAP.md](PRODUCT-MAP.md) records the unchanged product source, exact integer wire, validation, comparator and aggregate obligations. Source identities are in the accompanying source ledgers. These fourteen controls are not additive runtime coverage or a certification score.
