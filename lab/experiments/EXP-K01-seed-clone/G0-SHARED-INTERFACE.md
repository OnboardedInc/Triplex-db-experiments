# Shared G0 handoff to CX-P5A (EXP-P5 / R34)

North star P1-P5 correctness; Q93a/b. Implementation is `lab/bench/lib/g0.ts`, used by K01 source pinning,
two-start qualification and benchmark admission, and provided for the EXP-P5 fingerprint sweep to import. Import this one module; no sibling
worktree imports or second equality implementation. `g0-xtdb.ts` is the XTDB paging/SQL reader, not a second gate.

* `readG0(reader, expected, w0?, deadlineMs?)` pins D on the source before freeze. Reader exposes streamed table rows,
  independent counts, all scope positions, and endpoint. Expected counts come from the generator, never the observed scan.
* `admitG0(reader, pin, expected, w0?, deadlineMs?)` is the only function that returns G0 PASS. Run it in the measuring
  process on its measured endpoint before warm-up. A read exception, timeout, partial scan or mismatch throws.
* For W0, expected.world is W0 and the required hook supplies `{N, oracle, read(signal)}`. `read` is P5's fingerprint sweep
  at B0; its result is `{basisTx,facts,worlds,R2}`. `requireW0Fingerprint` compares every value to the O-DOMAIN result,
  including rung, W0-pop-1 and source binding. N01 uses the same gate without the W0 hook.
* P5's existing `w0-gates.ts requireFingerprint` can be replaced by a re-export of `requireW0Fingerprint`. The full
  seed-reuse admission path calls `admitG0` with the lane reader and that hook; the helper's void return is not a PASS receipt.

CX-P5A owns the P5 sweep adapter/driver. This branch supplies the shared module and tested interface; it does not edit
CX-P5A's read-only worktree. After importing this commit, keep its oracle fingerprint format and replace duplicate
comparison logic. Bind module source and oracle sources in the sweep receipt. No live P5 compatibility is claimed here.

Round 8 coverage: the exported call signatures and W0 hook/Pin shape remain unchanged. `fields` is derived from all
XTDB adapter CREATE TABLE declarations by `g0-schema.ts`, with no excluded columns. Reader implementations must scan/count
every listed table, including empty side tables, and return complete stored rows. G0 checks core expected counts against the
manifest/generator as before; auxiliary counts may be supplied in expected.counts, otherwise D binds their independently
counted complete contents. SQL SELECT * retains dynamic columns beyond the declarations. The schema parser and reader are
part of the seed-generator pin; old pins/goldens must be regenerated. This module requires the pinned TypeScript parser.

Round 9 supersedes the previous normalization blocker under Q93c. The existing readG0/admitG0/requireW0Fingerprint
signatures remain unchanged. Pin optionally includes Dprime; consumers using full D do not need it. New readE1G0 performs
two complete source reads, requires identical raw D, and returns Dprime with documented engine assignments ranked by commit.
The seeder uses it; measuring clone admission still runs only full D. E1 compares fresh Dprime with golden Dprime.

The value codec uses typed frames and exact binary64 bits, bigint text, UTF-16 code units and typed binary bytes. The XTDB
reader retains pgwire OIDs and scalar bytes through Postgres.js raw rows, rather than decoded JS values. Unknown or lossy
wire types refuse (including text NaN, which cannot expose payload bits, and JSON transport of native structured values).
All generator inputs include the value/wire/normalization modules. Regenerate old pins. Dprime refuses source state without
an available commit-order anchor and ambiguous assertion ties; it never substitutes for full D or weakens other fields.
No live P5, raw-wire, E1 or engine cancellation qualification is claimed by these offline tests.

Round 10 keeps the shared G0 signatures unchanged. The production XTDB reader now pairs each raw column OID and exact scalar bytes with `information_schema.columns.xt_type`, read before and after every page. That native Arrow declaration must be monomorphic (nullable is allowed) and agree with the wire type. Its native width is hashed too, with I8 refused by the pinned pgwire implementation (corrected in round 11). Mixed unions refuse because XTDB widens their rows before pgwire; a column OID alone cannot prove row fidelity. A changed/missing catalog, unsupported type or timeout refuses. Existing pins must be regenerated.

Dprime version `tx2-e1/2` checks journal instants against the assigning transaction clock, then uses dense chronological ranks of distinct clocks. Equal instants share ranks; ties and order remain observable across independent seeds. IDs retain commit-order ranks. Full D continues to include original native types/bytes. These are offline/source-derived guarantees pending the live commands in LIVE-round10.md.

Round 11 corrects the catalog grammar: scalar `:i64`, nullable `[:? :i64]`, decimal `[:decimal precision scale bitwidth]`, nullable decimal `[:? :decimal precision scale bitwidth]`, mixed Poly `#{:i32 :i64}` in unspecified order. G0 still refuses all mixed types; probes now compare the complete set through nativeUnionLegs, a diagnostic parser with no granting path. I8 and bpchar OID 1042 refuse. WIRE-TYPES-round11.md cites the exact pinned-source lines for every supported scalar/OID and refusal policy. Existing shared G0 interfaces stay unchanged.

Round 13 preserves readG0/admitG0/readE1G0 signatures and adds optional Expected.tables (per-table written status and per-column non-NULL expectations) and Reader.catalog(signal). Production N01 always supplies the complete policy for all declared tables/columns and reads the typed information_schema inventory before and after the content scan. Missing written fields refuse; never-written NULL fields may be absent and are materialized as NULL. Absent tables can yield zero/empty scans only from that catalog proof. Existing unused tables are counted globally, including foreign scopes, and must be empty. Reader.count's optional fourth boolean requests that global count. Legacy/P5 readers remain compatible without this optional N01 policy; they still must provide complete scans/counts and preserve their lane's native types. Regenerate N01 pins because expected bindings and the generator sources changed.
