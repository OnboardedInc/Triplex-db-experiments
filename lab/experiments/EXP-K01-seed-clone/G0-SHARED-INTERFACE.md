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

Stored IDs, receipt metadata and recorded timestamps are covered too: the round-8 request allows exclusion only when no
read/constraint/validation path reads a column. The old random-ID spelling exemption no longer applies. Consequently D
is now specific to one seed lineage. Comparing independently reseeded arms by raw D equality requires a separate approved
normalization policy or deterministic seed metadata; no such qualification or policy change is claimed by this offline fix.
