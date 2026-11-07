# Controller publication memory

Tags: `problem:controller-state-growth`, `mechanism:immutable-manifest-sidecars`,
`status:observed`, `source:actual-local-controller`, `goal:6`, `goal:7`.

Two outer controllers using a256MiB old-space limit aborted while publishing
terminal state. The canonical v1 file had grown to68,051,831bytes across105jobs;
compact repeated input arrays alone accounted for50,167,377bytes. The observed
stack passed through string flattening/UTF-8 byte length and `writeFile` of the
full state. Raw child reports were small and both owned process groups were
gone. QLever's container remained running with `OOMKilled=false`.

The affected raw outcomes are `xtdb-native-packet-v5/0001` and
`qlever-native-packet-v4/0001`. Both have142 passing child checks and local raw
terminals, but neither received a canonical terminal-hash publication anchor.
They remain **unqualified controller-publication failures**, never retroactive
passes. The exact [pre-reconcile observation](../../.runtime/controller-orphans/4efc218d-22f1-480f-960e-e09bac3c185b/observation.json)
and [Q forensic annotation](../../qualification/evidence/qlever-native-v4-controller-publication-failure.json)
preserve that distinction. Conservative reconciliation retained reservations.
The later explicit [cleanup disposition](../../.runtime/controller-orphans/4efc218d-22f1-480f-960e-e09bac3c185b/cleanup-disposition.json)
checked exact original identities, two empty owned-PGID observations, unchanged
raw terminals, fresh private-backend identity/caps/mounts/StartedAt and an actual
read-only scalar from each engine. It released only the proven-gone client
reservations and recorded `controller_publication_failed`. Shared foundation
reservations stay charged; missing terminal publication anchors remain missing.

## Scoped repair and evidence

The v2 scheduler stores existing manifest headers without `inputs`, plus a byte
hash/length/path reference to the existing immutable job envelope. Full inputs
are hydrated only for selected execution, retry, verification or comparison.
Hydration checks the owned exact job path, every symlink component, envelope
bytes, manifest identity and matching scheduling header. Missing or altered
sidecars refuse work before any attempt is created. Existing small first
outcomes and all attempt/result files remain unchanged.

The explicit `migrate-state` operation preserved the exact post-reconcile v1
snapshot and a prepared-before-rename provenance record. The actual105-job
history migrated under a256MiB heap in2.10s, from68,051,863 to478,048bytes;
maximum observed RSS was343,113,728bytes. A heap limit is not an RSS cap.
The [published migration receipt](../../.devloop/migrations/e9876f57-b4d2-4cbb-b6e4-85b94c2e1872/published.json)
binds both the exact legacy snapshot and initial v2 publication.

The [27-test checkpoint](../../qualification/devloop/evidence/controller-thin-state-20261106.json)
includes actual command lifecycle tests, sidecar tamper/missing/path refusals,
old anchored receipt reads, and a killed child after the temporary v2 file was
fsynced but before rename. That crash left canonical v1 byte exact and no
published migration receipt. A separate actual-history audit checked all105
hydrated manifests, three old engine receipts, both orphan refusals and20
repeated small-state publications under the same256MiB heap. This is controller
evidence; no engine, load or ten-goal promotion follows from it.

Independent review is [linked separately](../../qualification/devloop/evidence/controller-thin-state-independent-link-20261106.json):
six checks over the real105-job legacy mapping, twelve independently authored
component checks including actual pre-rename SIGKILL/source/result validation,
and five explicit cleanup-disposition checks. V2 is ready for fresh captures;
old unpublished outputs are not reused as qualified final runs.

Exact source hashes alone do not reconstruct overwritten working files. The
ZIP/Git baseline is recoverable; older working-tree runs have hash/command/query
trace records and only partial source reconstruction. The [current implementation
checkpoint](../../.runtime/source-checkpoints/4430cb24-e593-423f-be8b-b9aa5727221d/checkpoint.json)
preserves590 source/doc files, current Git HEAD and dirty patch in a1.03MB archive.
No file or tracked diff changed during capture. It excludes caches, credentials,
runtime data and generated builds. Future content-addressed source/runner/oracle/
recipe preimages are now [implemented and independently checked](../../qualification/devloop/evidence/controller-preimages-20261106.json).
Enqueue binds declared copies in the immutable envelope; invocation additionally
captures actual controller code. Objects have independent inodes and byte-bound
indexes, with exact declared coverage checked before grant and during retained
attempt verification. Credential, dependency and build-cache contents are not
copied. The complete31-test suite and nine independent checks pass; an actual
[canonical logical recipe](../../qualification/devloop/evidence/controller-preimages-canonical-verification-20261106.json)
also executes/verifies. This cannot repair missing historical bytes retroactively.
