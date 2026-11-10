# Entity revision key audit (source inspection, before implementation)

North star: correctness floor for P1/P4. Scope: gateway-authored writes through both public adapter and raw storage SPI;
arbitrary external Datomic transactions that bypass the gateway are outside this proof.

- `storage.clj:110-111`: every input row is decoded before splitting fresh/old; this includes compact lean rows and tagged raw SPI rows.
- `storage.clj:169-175`: fresh rows either assert canonical text or set the legacy overflow marker.
- `storage.clj:176-205`: lean born-retired markers, ordinary retractions and imported retirement metadata are generated from the same row collection.
- `storage.clj:206`: all distinct row entities receive `:triplex.entity/rev` with a logical position marker, regardless of layout or row origin.
- `storage.clj:213-217`: the complete operation vector is passed to the transaction function along with span/source and layout.
- `commit.clj:23-26`: the transaction function allocates a final head and delta at the serial point.
- `commit.clj:37-48`: recursive `replace-value` remaps every `:triplex/position` (including revisions) and embedded row positions consistently.
- `commit.clj:49-75`: lean asserts and row retractions are expanded inside that same atomic transaction.
- `commit.clj:84-93`: the final position and all prepared operations are returned together. Nested commits share the enclosing final revision;
  it is a unique physical publication even when their interior logical positions cannot be represented as a Datomic cut.
- `reach.clj:47-64`: named position/time cuts select immutable Datomic db values, so looking up a revision at that cut selects its own row set.

The cache must remain database-scoped (entity numeric IDs can repeat between databases), must not cache negative identity lookups,
and must preserve overflow/missing-revision declines. Staged `d/with` rows are read through storage, not the cached reach route.

The runtime verify mode will reread all row and retirement datoms at the exact same immutable db on cache hits and compare row texts,
reference intervals and inline JSON. Differential scenarios and a deliberate same-revision mutation test must execute that mode.
This file records reasoning, not an execution verdict.
