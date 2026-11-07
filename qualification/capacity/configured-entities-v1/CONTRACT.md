# Configured entity capacity recipe v1

SOURCE ONLY. No generator, schema release, test, ingestion or engine read is
qualified by these files. The existing raw1k diagnostics and142 expectations
stay unchanged. The first proposed backend fixture is8entities at sparse1 and
representative10;100k is a later explicitly blocked stage.

`packages/qualification/experiments/configured-entities-v1/recipe.mjs` uses public
Triplex Attribute/EntityType/TypeSchema declarations and assertion encoders.
Its required presence and type-version attributes are ordinary, explicit
application facts. Existing `entity_type` row metadata is counted independently.
Triplex does not automatically generate presence, cascade domain retractions or
enforce these fixture conventions. A configured entity is defined for this
fixture as a distinct domain subject with its required fields, one live
`:capacity/present=true` fact and one live type-version fact. Presence=false
temporarily reduces that entity count while its domain facts remain stored.

Both profiles use the SAME entity IDs, schema types, values, temporal windows
and history schedule. Sparse1 has one domain label fact; representative10 adds
binary64 score/amount, exact tagged int64 beyond2^53, boolean, reference, category,
instant, date and legacy integer. Each entity also has two structural facts.
SchemaV2 adds one optional note definition, while one entity per100 replaces its
label and type-version1→2. One entity per1000 cycles presence true→false→true.
The two schema releases go through actual ConfigStore.commit and retain their
content IDs/revisions/ref/transaction receipts. Optional note has no data fact.
Group references target an entity not later than their member. No new public
schema language or global presence/deletion policy is introduced.

Maximum domain command width is500 explicit assert/retract operations. Complete
entities remain atomic: sparse seed commands hold at most166entities/498ops;
dense commands at most41entities/492ops. This rounding is reported, never called
an exact500-op payload. Corrections use4ops/entity, presence transitions2ops.
Configuration commands are separately measured and must pass the same declared
operation/resource limit before their execution. Receipts retain actual command
width, assertion IDs, public transaction position/instant, scope/generation,
schema snapshot and operation ID. An unknown commit outcome stops the fixture;
no hidden replay, later-position substitution or partial-answer acceptance.

The independent Node-only `oracle.mjs` analytically counts all entity/fact/history
populations and explicitly replays the8entity fixture. Runtime ID mappings come
only from assertion receipts. Source commands may stream; a large-scale host
copy of facts is unnecessary. Query answers never define the expected state.
Freeze actual seed/correction/off/on positions into a separate immutable cut
catalog after ACKs, including actual recorded instants. Use position cuts for
every history phase, valid time20.25 and exclusive end30.5, current and full
client/file reopen. A recorded-time cut is qualified only if the retained ACK
instants and row metadata establish a nonambiguous boundary; never invent R.
Check complete tiny rows/typed values/IDs/history/retirement metadata, configured
entity membership, per-attribute counts, schema release identity and receipts.
At larger stages use independently specified server counts plus deterministic
boundary/history samples, while complete counts remain required. Query surfaces
are independently authored Datalog, XTQL/SQL and SPARQL against the same handles.
Three foundations each own one history; five query surfaces do not get five
target-scale copies. Q qualified-F and native100 use separate named settings
windows with before/after readback, never silent profile substitution.

Admission stages:8→1k→5k→20k→100k;1m/10m remain goals after measured admission.
At each stage separate configured entities, domain subjects/facts, structural
facts, assertion versions/retirements, configuration graph facts/objects,
transaction journal/claim/receipt metadata and backend-maintenance relations.
Report actual ingestion/reopen time, adapter/client RSS, engine caps/RSS,
baseline/steady/peak owned physical bytes, WAL/index/spill/compaction growth and
cleanup residuals. No old sparse fact-subject count becomes configured scale.

Before any larger write, reserve baseline+measured projected live increment plus
the separately observed peak WAL/spill/rebuild/backup increment and a declared
uncertainty allowance. Missing measurements BLOCK admission; no fabricated
bytes/entity or two-copy estimate. Count sparse APFS backing retention and ZIP
under46GB operational/50GB hard ownership limits, not merely directory du.
Backups/rebuilds and query working relations count even if temporary. Preserve
failed stages; do not delete evidence or replicas to imply a fit. No absolute
latency SLA, sustainable load, capacity winner or performance promotion follows
from the tiny conformance fixture.
