# Fixture-only codec metadata correction

V2 preserves the failed V1 scope/source/receipts and uses a fresh scope. The
only semantic expectation correction is the pinned XTDB adapter metadata
`schemaVersion=Some(1)` (XtdbStorageAdapter.ts448; Core TriplesLive.ts129). It is
separate from explicit application type-version1→2 and ConfigStore release
revisions. No automatic schema evolution is inferred from this metadata name.
All domain/history oracle bytes and the stronger as-of metadata target remain
unchanged. A pure assertion helper rejects missing/wrong/other codec versions;
it does not normalize, default, coerce or change returned rows. The old eight
subject partial dataset is retained and included in the physical baseline; the
new fixture counts eight subjects in its own fresh scope, not the foundation
global population. No product/build/default/observer change is included.

# Tiny current-public XTDB fixture

SOURCE PROPOSAL ONLY. No schema commit, engine read, ingestion or new service
is authorized by this text. Ordinary public XTDB factory/Core/Effect resolution
is used; experimental handoff selectors/default replacements are absent.

One fresh scope owns exactly8domain subjects. SchemaV1 is deployed through the
public ConfigStore. An atomic24-operation sparse seed gives each subject one
label plus explicit presence/type-version facts; a72-operation expansion adds
the other nine domain attributes to the SAME subjects. The two profile cuts
therefore have24/96live fixture facts and8configured entities, not16entities or
two physical foundation copies. Their history follows the independently frozen
8entity sparse/dense oracles. SchemaV2 then deploys its optional note definition;
one subject changes label/version and one cycles presence off/on. The ceil
populations are each1at8entities, not exact1%/0.1% observations. No optional note
data fact is added. Five domain commands and two schema commits are declared.

All explicit command widths are500ops maximum, complete entities/changes atomic.
Before either schema write, the public pure InMemoryConfigStore reference derives
the expected content-addressed release and a source-bound ConfigStore operation
count; a count above500refuses before fixture access. The actual schema command
result/assertion and retraction counts must match. This estimate is an admission
guard from ConfigStore.ts, not an independent implementation of its hashing.
Actual persisted releases/ref/root/constraints are read back through a fresh
public runtime and compared with the declared pure reference; the independent
domain/history oracle imports only Node builtins and never engine answers.

Valid time is[10.125,30.5), with20.25inside and30.5excluded. Public deterministic
runtime clocks are explicit input controls at distinct1000.25…1006.25instants;
all ACK/row/journal instants are checked rather than assumed. Actual positions,
transaction/assertion identities and command receipts are retained before any
assertion, then frozen into an immutable cut catalog. Ordinary Triplex APIs
accept public recordedAt/validAt only: all historical requests use the distinct
retained ACK instants. Returned sourceP is recorded as observability/receipt
identity, never supplied as an extra private input. Both original seed R cuts,
current, retirement metadata and complete histories are read after all writes.
A fresh public Runtime and
Effect scope completes acquisition/finalization per call; final repeats use
new client scopes, not an engine restart or native-file reopen claim.

As-of retirement metadata is a NEW_SHARED_SNAPSHOT_TARGET in this extension,
not a claimed upstream44/142 regression. The public TemporalBasis contract
(core/Temporal.ts3–21) defines historical knowledge by recordedAt, but the public
match/history declarations (store/Triples.ts249–255) do not explicitly promise
metadata masking; history explicitly retains the full lifetime. The native
helper DOES mask future retirement channels (xtdb/native/Sources.ts58–97 and
xtdb/README.md180). This supplies an existing helper contract and the inspiration
for the stronger shared target. Raw ordinary API lifetime metadata is preserved
as compatibility evidence. The strict combined tiny byte gate requires the
stronger target to pass, separately from typed membership, schema, receipts and
growth. A mismatch is retained and the remaining predeclared independent read
cases continue; unknown ACK/transport/scope failures stop.

Persisting a schema is separate from runtime enforcement. The one invalid
command retracts the first subject's required label under the actual persisted
Required rule passed explicitly as public transaction meta.enforce. It must
return ConstraintViolationError, preserve the entire pre-state/position and
leave no command receipt/journal/native operation residue. Valid commands also
pass the persisted graph-rule set explicitly. Datatype checks are existing
local TypeSchema normalization; automatic enforcement of stored datatype
definitions is UNQUALIFIED. Presence=false remains an application convention:
domain facts and reference targets are retained, with no implicit cascade.

Raw scoped XTDB metadata reads are limited to grouped logical assertion counts,
command claims and durable operation receipts; all counts/positions use the
separately reviewed safe metadata decoder, never the fact int64 codec. Public
transaction/journal/command reads and actual operation resolution are checked.
Domain, presence, type-version, configuration graph, journal and native claim/
receipt populations remain distinct. No raw whole-store fact download is used
to evaluate a query. This tiny fixture qualifies foundation writes/reads and
one simple public Datalog presence query; it does not qualify all five query
surfaces or borrow handoff/old142 build evidence.

Growth collection uses stat/block metadata only plus the existing bounded
storage checker. Engine logical file bytes, st_blocks, APFS backing allocation
and nested-VM inclusion are reported separately and counted once for the cap.
Phase snapshots provide an observed high-water mark; transient peaks, rebuild,
backup and full WAL/spill envelopes remain unmeasured. Other actual canonical
co-runners are retained; overlapping XTDB clients invalidate growth attribution
without rewriting semantic answers. No idle-engine, exclusive physical byte,
bytes/entity extrapolation or sustainable-capacity claim follows.100k is BLOCKED.

Proposed one-job envelope:1.25GiB/1CPU/256MiBowned growth+artifact reservation,
300s worker, Node768; existing3GiB/2CPU XTDB foundation remains separately
charged. Unknown ACK/outcome, unsafe metadata, source drift, incomplete typed
rows/history, width/resource violation or failed readback stops immediately.
All predecessors/partial writes remain retained; no retry, cleanup deletion,
service restart, cap change, package build or default integration is included.
