# Production SDK confirmation binding

Status: source-only plan after the first frame check. The profile frame's
three syntax checks, 22 pure methods and one-client 100k short correctness
run passed on their first attempt. Exact raw and compact receipts are
`evidence/antijoin-c2-frame-100k-one-reader-20261105{.raw,}.json`.
The native artifact remained B f44/55/af and the application SDK remained
original 754. No full one-client or reverse sixteen-client run is scheduled
on that old SDK: its harness FIFO must not be stacked over the production
SDK admission owner.

## New selected artifact, unchanged control

Wait for C's exact source checkpoint, compiled store/hash, private admission
helper and focused qualification receipt. A successor binding must name
those explicitly; do not change the existing native-candidate or config
binding bytes. The original e992 numerical budget and accepted 0.32 pins
remain baseline. The protected B0 archive f44/55/af, original SDK754 and
native-source/reference attestations c3/fe9/0eaf remain the control.

Use a new selected-SDK binding with two separate checks:

1. Validate the immutable B native reference against its existing binding,
   original SDK754 and protected source using the unchanged native helper.
2. Independently validate the selected production runtime: actual core,
   paired owner, control bridge and resolved engine must match that native
   reference; actual SDK chain must remain pinned; compiled store and its
   new private helper must match C's exact source/build checkpoint. Pin all
   imported adapter bytes, the admission-helper dependency, and build/source
   options. Preserve old and new hashes under their actual roles instead of
   rewriting the native binding to claim the new SDK is the old one.

Only the declared source changes are eligible. An arbitrary native, engine,
port, schema, compiler or SDK dependency change must reject, even if a
sidecar lists it. Verify both selected-runtime and reference identities
before and after each campaign. No native rebuild is needed for this
binding layer. Frozen runtime copies stay separate from source worktrees.

## One admission owner and exact profile

The selected production SDK is the sole admission owner. In the shared
runner, production-profile calls must dispatch directly to
`store.queryScalable`; `--read-admission` and any harness FIFO must be
rejected for that profile. Keep the original fixed/mixed loops, query,
oracle, write mutator, full-call timer and numerical evaluator unchanged.
There is no public runtime mode selector.

Record the SDK read/timeout contract as version 2: the captured original
write tail is retained, write FIFO and post-ACK visibility remain required,
and heavy-query timeout covers gate wait. This is a declared timeout-scope
change requiring its own tests, not a claim of byte-identical SDK behavior.
Light reads/statistics stay outside the heavy-query gate as specified by C.

The binding admits exactly one or sixteen logical clients, the matching
untouched original eight limits, DuckDB4/UV4 and the same source/recipe/caps.
The runtime may retain all configured reader connections while admitting
only `min(3,readerCount)` heavy calls. Observe actual physical control scopes
and pool leases: measured concurrent physical scopes/leases must never
exceed that effective limit; all logical clients must complete exact typed
samples, and all queued/leased work must drain before cleanup. Do not reuse
the old no-gateway assertion that requires sixteen simultaneous leases.
Report actual distinct ports separately from concurrency and configured
capacity; sixteen logical clients do not prove sixteen native tasks.

The first setup stage should run pure binding/CLI checks and a small actual
one-/sixteen-client correctness slice against the selected production SDK.
Include deadline while queued, queued abort without dispatch, error/reuse,
original-tail ordering, close/revalidation cleanup and mixed light/heavy
reads. Existing C and independent QA tests may supply these if their exact
selected bytes match; do not duplicate heavy runs for no new boundary.

Only after root reviews the exact new artifact and source pins should full
one-client qualification and fresh/reverse sixteen-client comparisons run.
Use the same ten-million source371/recipe532, query998, seed batches, cyclic
patches, original limits and first-outcome preservation. The earlier C2
harness result is motivation, not production-SDK performance evidence.
