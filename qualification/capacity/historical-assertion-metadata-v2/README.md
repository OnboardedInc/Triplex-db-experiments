# Historical assertion oracle: narrow v2 correction

This is a source-only successor to the [committed v1 proposal](../historical-assertion-metadata-v1/MENU.md).
Its nine test definitions have not run. It implements neither proposed helper A
nor adapter projection B, and changes no product/default source or raw lifetime
contract. The actual configured tiny V4 remains a strict failed target.

The [independent v1 source review](../../reviews/historical-assertion-metadata-v1-source-independent.json)
identified two oracle defects. This revision deep-freezes the declared finite
event and cut fixtures, copies each assertion input into every fresh lifetime
replay with `structuredClone`, and treats `validTo:null` as an unbounded upper
limit. Finite validity remains half-open. Returned nested values can be mutated
without changing event authority or a later replay.

The original seven test definitions are retained. Two added definitions cover
returned JSON-value/lifetime-row mutation and null/open-ended validity at the
start and far beyond it. The mutation definition also checks protected source
fixtures/cuts. These are finite plain-data oracle controls, not a generic clone,
serialization or schema validator. A test label mentioning a fresh client means
a fresh pure replay here; no SDK client is constructed or reopened.

All original events, finite expected memberships, inclusive P/R cut predicates,
same-recorded-time distinction, lineage and explicit raw-lifetime compatibility
remain unchanged. `capturedUpperP` is only an oracle coordinate. Existing public
`TemporalBasis` still accepts R/V only; no private P is added to that input.
The A native-helper and B adapter-read entrypoints remain distinct source-only
alternatives in v1. An eventual native-backed helper does not qualify a Datalog
translator or transfer sibling performance/capacity acceptance.

The proposed offline gate uses the pinned Node executable, Node builtins and the
existing reviewed admission helper/controller sources. It requests 768 MiB,
one CPU, 64 MiB disk and 120 seconds; no resident owner is required. Its child
selects the built-in TAP reporter explicitly, allows one test worker and has a
60-second timeout and 2 MiB captured-output bound. The runner retains TAP,
stderr and child outcome before assertions. A successful evidence check requires
all nine exact test names and zero failed/canceled/skipped/todo tests.

`prepare.mjs` freezes `offline-v1/{contract,expected,manifest}.json`, a source-only
delta record and declared source preimages. Preparation reads and hashes files;
it does not import the oracle or test module, enqueue, compile, build, construct
an SDK or call an engine. Installed third-party packages are not imported by
the proposed test path. The pinned Node binary/declared controller sources are
not a claim to a complete OS, Python standard-library or host-file read closure.

Independent source/manifest review and a separate root grant are required before
the offline gate. No helper implementation, native write/read, build, larger
configured-entity ingestion or performance comparison is authorized by these
files. Preserve all v1 sources, proposals and failure/review receipts unchanged.
