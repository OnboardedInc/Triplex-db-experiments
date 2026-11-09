# ER01-S evaluator-owned erasure scanners

R38 §4.1, Q82c–d and Q95g: four independent scans with matched positive controls. This is observer/evaluator code; no system-under-test erasure implementation or live engine is launched here. Round 2 supersedes round 1's claim that a full byte read qualified arbitrary `bytes` profiles.

- **P** searches protected plaintext and its encoded representations before/after erasure. A distinct unprotected twin must match value kind, length bucket and pinned fixture commit provenance. Its assertion/type/expected bytes are bound to the EI/D canary.
- **C** searches the exact observer EI envelopes. Both target and live control must be found before erasure, live control afterward. In-place/new-generation profiles require removal; append-only retention is explicit.
- **K** searches every expected wrapper/epoch version and discovers new versions carrying the exact target key/tenant identity. Current SQL row absence is insufficient. Known wrapper matches remain searchable in physical residuals.
- **D** attempts every discovered candidate across provided roots, epochs, key stores, backups and physical key files. Historical rows, fresh nonces and UTF-16 key text are included. Expected plaintext digests and five-part AES-GCM context must authenticate. Root drift, unknown formats or incomplete enumeration refuse; a live control cannot qualify a blind copy elsewhere.

## Coverage is part of every result

For each relevant file at every phase, `coverage` reports its exact path/id/SHA256, size, `rawSearchedRanges`, disjoint `parsedRanges`, and explicit `unparsedRanges` with reasons. Parsed plus unparsed byte counts equal size. Physical search always covers the entire file, even if parsing fails; decoded/reassembled views only add findings. Unknown nonzero bytes cannot be called parsed just because grep ran over them.

**PASS requires zero unparsed bytes at every relevant protected location.** This guard exists inside P/C/K/D and at aggregation. Missing controls, malformed input or unknown layouts REFUSE. Findings survive refusal; `findingStatus: FAIL` identifies a witnessed violation and `UNDETERMINED` makes no absence claim. No incomplete result contains a secondary PASS. Aggregate REFUSED dominates FAIL; per-scan observations preserve failures.

Raw/reconstructed searches include UTF-8, UTF-16LE/BE, padded/unpadded base64/base64url, upper/lower hex, JSON escapes and byte-array varints. UTF-32LE support is retained. Native record length prefixes/serial integers are decoded rather than treated as a barrier. Supplemental gzip and base64 fragment decoding adds findings without qualifying an opaque container as parsed. Budgets never grant PASS: incomplete decoding/enumeration refuses.

## Supported formats and explicit refusals

`formats.py` implements:

- SQLite v3: page-size/header/encoding checks; table/index cells and serial varints; UTF-8/16LE/16BE text; overflow-chain payload reconstruction; freelist and freeblock metadata. Zero fill is accounted for. Unknown nonzero residual/deleted-record bytes remain unparsed and refuse, rather than being labeled erased.
- SQLite WAL: header/frame checksum and salt validation; complete frames; matching main-file page/encoding context; committed historical views, including records deleted by later commits. Stale pointer-array slots are accounted for only when their exact bytes are proven metadata by a prior decoded checksummed view. Partial/uncommitted/undecodable page regions refuse. Concurrent cross-file snapshot coherence still requires an acquisition witness.
- Postgres TOAST `postgres-toast/16-le8192`: little-endian 8192-byte heap pages, line pointers, three-column TOAST tuples, short/4-byte varlena, stock 1996-byte chunk id/sequence assembly, explicit raw/external size checks, none/pglz/LZ4. Unknown flags, missing chunks, unmatched value inventories, compression or nonzero dead/free residues refuse. Complete extra chunk groups are still searched on metadata refusal. Fixtures follow native layout; no running Postgres or native server-generated compression qualification is claimed.
- `erasure-fixture-records/2`: explicitly synthetic tagged/length-prefixed records, with no trailing-byte acceptance. These replace misleading fake heap/WAL/XTDB byte profiles in the nominal fixture suite; they are not an engine codec.
- Checked key-set/authority JSON and root-hex fixture schemas. Unknown production schemas refuse.

QLever `qlever-fsst-squared-le64/0.6` uses `fsst.py`: two raw decoder structs per 2^20-word block, both vocabulary copies, global internal ids, compact vectors and mmap offsets. Positive controls must occur in decoded words, not only codebooks. Disabled/missing/unsupported decoders refuse while raw searches still run. The archived bootstrap index's manifest and known input validate a real compressed index; new planted controls use the explicit legal fixture encoder. No new IndexBuilder run is claimed.

Raw Postgres heap/pg_wal, Datomic segments, native compressed XTDB/Arrow, heap/LRU and freed blocks without a qualified decoder remain unparsed. Their exact ranges are REFUSED. The scanner does not convert an opaque file or inaccessible mock into whole-engine erasure proof.

Format references: [SQLite v3 file/WAL layout](https://www.sqlite.org/fileformat.html), [Postgres TOAST](https://www.postgresql.org/docs/16/storage-toast.html), [PG16 detoast](https://github.com/postgres/postgres/blob/REL_16_STABLE/src/backend/access/common/detoast.c), [pglz](https://github.com/postgres/postgres/blob/REL_16_STABLE/src/common/pg_lzcompress.c), [QLever v0.6 compressed vocabulary](https://github.com/ad-freiburg/qlever/blob/v0.6.0/src/index/vocabulary/CompressedVocabulary.h). Decoder implementation is original; upstream source is not vendored.

## Raw evidence and replay

`compile.py case.json /evaluator/normalizer.py` embeds all Python/Node decoder bytes and evaluator inputs in a standalone Python parser. It pins the exact Node executable path, version and SHA256. The case/frame binds run, stream, source, engine container, slot, inputs, phase nonce and bounded monotonic windows. All before/shred/rotate phases and the exact file inventory are mandatory. `snapshot.py` reads complete stable regular files with no-follow opens and no source DB opens. Private SQLite copies may create their own WAL-index files; original files are never opened by SQLite.

Use the existing obs-bundle/1 HMAC chains and external evaluator key/witness: these normalizers alone do not authenticate evidence. The unit suite exercises the real bundle writer, seal recomputation and O-OBS `23e2273` authentication. Its old semantic ERASURE-SCAN schema still lacks the four-scan consumer. No legacy `keyDestroyedEvidence` is fabricated.

The D fixture padding/schema/AAD choices remain explicit test adapters pending ER01-C: uint32-LE value length plus zero fill to 32-byte buckets; JSON `[tenant,entityId,attribute,assertionId,valueType]` AAD; key-id-hex key wrapping AAD; JSON `[tenant,epoch]` epoch wrapping AAD. They do not change the product contract.

```sh
# Check at least 5 GiB free before admission. The runner checks again when it starts.
node lab/bin/heavy.mjs --label CX-OBS01-ER01S-R2 -- python3 -B lab/observer/erasure/run_round2.py /absolute/new/evidence-directory
```

The runner freezes/hashes its sources, executes both test suites, replays all **31 exact retained reviewer inputs**, checks independent overflow/decryption findings and coverage partitions, rejects source drift, and retains full logs/raw/parsers/results with SHA256SUMS. Retained QA is explicitly historical input with a newly executed parser, not fresh source collection. `qa_round1/` holds verbatim review generators/proofs; their intentional old false-PASS assertions are not the new gate. Large artifacts stay under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-OBS01/`.

Round 3: WAL coverage is bound to each physical frame body and its decoded prefix
snapshot, with per-frame offsets and hashes. A repeated page flushes the prior
snapshot before replacement; unresolved historical dependencies remain unparsed.
Additive search views follow JSON string leaves (including Unicode surrogate
pairs), URL percent encoding, backslash escapes and quoted-printable recursively.
The 32-layer/4096-view/64-MiB view budgets refuse unresolved searches. Raw bytes
remain searchable independently. `run_round3.py` also replays the reviewer's exact
14 new scenarios and second-block FSST control, alongside the previous 31 cases.
These are offline fixtures and historical replays, not erasure acceptance.

Round 4 adds inverse scalar base64/base64url (including folded text) and hex to
that same closure. Every resulting view re-enters escaping, scalar, gzip and
recognized native SQLite/fixture-record/length-prefix/byte-varint decoders. Native
SQLite/WAL, FSST and TOAST container decoders continue to seed the closure with
all reconstructed values. The default depth limit is 32 transformations; only
attempting to add a genuinely new view beyond the limit causes refusal. A budget
refusal conservatively marks the full originating physical file range unparsed;
original bytes and all findings produced before exhaustion remain available.
`run_round4.py` qualifies ordered layer pairs and all 61 retained QA scenarios.
