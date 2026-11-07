# Hand controls for future cursor and receipt selection

All eighteen entries are hand-derived specifications. They are not executable fixtures, admitted tests, observed outcomes or a certification score. Literal row names and numbers are synthetic.

## Common equal timestamp scenario

At logical position 1, assert rows a,b,c at recorded time 100. All have valid interval [100, 200). A first query page at recorded time 100, position 1 and valid time 100 uses ascending projected value order and page size 2. Later position 2 retracts b at time 100; position 3 asserts d at time 100 with the same valid interval. These later operations are hypothetical admitted complete commits, not actions run by this packet.

### T01 First page

At basis (time 100, position 1, valid 100), visible sorted values are a,b,c. Fetching one extra supplies a,b,c; return a,b and a continuation keyed by b. The extra c establishes that a next page exists. No timestamp alone explains the exclusion of future same-time commits.

### T02 Continue after tied changes

Resume that original cursor after hypothetical positions 2–3. Its basis remains(time 100, position 1, valid 100). Return c and no further cursor. Row b remains visible at the pinned cut because its retraction position 2 is later; d stays excluded because its assertion position 3 is later.

### T03 Fresh query after tied changes

A new query at(time 100, position 3, valid 100) sees a,c,d. It does not reuse the old page's position 1. Equal recorded timestamps do not collapse these two snapshots.

### T04 Time and position intersect

In a separate scenario assert x at(time 10, position 1) and y at(time 20, position 2), both valid [0, 100). Basis(time 15, position 2, valid 50) sees x only. Filtering solely at logical position 2 would incorrectly include y; treating timestamp 15 as the prototype's position cut is also not an equivalent mapping.

### T05 Retraction beyond the time cut

Assert x at(time 10, position 1), retract it at(time 30, position 2), valid [0, 100). Basis(time 20, position 2, valid 50) retains x because the retraction timestamp is later, even though its position is within the cut. Requiring only retraction-position visibility would hide x too early.

### T06 Half open valid bounds

Using the common scenario at recorded time 100/position 1, valid 100 includes a,b,c; valid 199 includes a,b,c; valid 200 includes none. No assertion is extended over its exclusive valid end.

## Query identity and ordering controls

### Q01 Complete tie key

Project rank and name from the set [(1, a),(1, b),(1, c)], requesting rank ascending. Normalization appends name ascending. A page of 2 returns(1, a),(1, b) with complete key [1, b]; continuation returns(1, c). A rank-only strict key would omit c. These simple values do not specify mixed-family ordering.

### Q02 Changed page size

With an otherwise intact valid cursor from page size 2, request size 3. At this pin page size participates in the normalized query fingerprint; the expected single-violation rejection is query_mismatch, not silent resizing.

### Q03 Changed database generation

Create the same query/basis under otherwise identical scope fields but change generation 0 to 1. A cursor from generation 0 must fail scope_mismatch. Two different environments, tenants or database fields likewise must not share cursor identity. Identity checking does not authorize either database.

### Q04 Changed explicit basis

Reuse a valid cursor but explicitly request a different validAt or recordedAt. The single-violation outcome is basis_mismatch. Omitting an explicit basis restores the cursor's basis; it does not request the latest time or position.

### Q05 Incomplete ordering key

A syntactically valid version 1 envelope with otherwise matching fingerprints/basis has one value where the normalized order requires two. It must fail malformed. The specified condition concerns the decoded structure; no actual cursor bytes are generated here.

### Q06 Invalid position domain

A preparePagination input with internal recordedPosition 9007199254740992, one above the JavaScript maximum safe integer, must fail malformed before paging. Zero is admitted as an empty-store cut. Current prototype caps remain unchanged and are not near this boundary.

## Global transaction journal controls

### J01 Exclusive lower position

Given hypothetical complete transaction records at positions 1, 2, 3, request after 1 with limit 1. Return position 2 and next 2, not position 1. This is the global transactions API, not the entity-specific history service.

### J02 Next is not has more

Given only positions 1, 2, request after 0/limit 100. Return both with next 2 despite the short page. A subsequent after 2 request is empty and has no next. Do not interpret the first next as proof that a third record already exists.

### J03 Live continuation has no upper cut

After J02's empty read, suppose a new complete transaction at position 3 is committed. Another after 2 request may now return 3. The numeric journal request does not retain a prior high-watermark like an opaque query-page cursor.

## Receipt and configuration controls

### R01 Same command identity with changed operations

Suppose command C already committed as transaction X at position 7. An otherwise-admitted later transaction attempt Y claiming command C, even with different valid operations, receives original transaction X from claimCommand and the standard duplicate error before a new position is allocated. The source path does not hash the operations to decide identity. No actual duplicate is sent or retried here.

### R02 Preserve original transaction identity

The current prototype projection(position 7, command C,timestamp 100) contains no stored original Triplex transaction ID. It cannot simply be returned as transaction X. A future mapping must preserve the runtime-supplied transaction identity and its metadata deliberately; this packet does not choose a mapping, add a schema field or infer a missing transaction from live data.

### F01 Fixed clock versus historical time separation

Apply the shared historical fixture's order with standard services and fixed deterministic time 100: assert a,b,c at position 1; sleep; retract b at position 2; assert d at position 3; then request the first page with recordedAt 100. Default validAt also resolves to 100, and the current captured position is 3. The hand-derived visible set is a,c,d, while the shared fixture expects a,b,c. A real sleep changes neither fixed metadata time nor that captured position.

This is conditional on the standard Runtime.define/fromKv clock and ordinary writes, without a custom capability overriding time/operations. It does not claim a test was run or that ordinary advancing-clock conformance fails. Keep historical-time separation and forced-timestamp ties as distinct future fixtures; no edit to upstream testkit or execution setup is made here.

