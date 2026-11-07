# Current-wave successor: explicit calibration/comparison phases

The [v3 source menu](recipes/current-wave-menu-20261107-v3.json) supersedes the
earlier unexecuted menu with SHA
`e3089829f6fbc97f01e6691004c518cca64d8538d8fe2dafa66e42d12bce5e36`.
The original file and source-checkpoint-v2 proposal remain unchanged and retained
locally. Its phrase “existing600s promotion policy” was incorrect. This note is
an explicit correction, not a reinterpretation of old receipts or a runtime
policy change.

Calibration comes first: three actual correct256-client capacity controls for
each of the five surfaces plus writer-progress evidence, then a frozen writer
schedule/floor. Candidate runs and10,000 tail samples are not prerequisites to
calibration. Later comparison/promotion requires at least three independent
controls and three independent candidates,10,000 observations per required
class in each run, and matching inputs/resources/cohorts with calibrated writers.
See [policy](policy.json) and [calibration/comparison code](compare.mjs). There is
no600-second promotion minimum. The current
600,000ms load duration bound and default worker timeout are maxima/defaults.
At16 total reads/s split equally between two classes, 10,000/class needs1250s;
the existing cap cannot supply that per-run population. Any longer window or
higher feasible rate needs a separately reviewed exact contract. The30s/480-read
diagnostics stay diagnostics; no absolute latency SLA is introduced.

Queue coherence must publish real replacements **before** retiring old records.
Prepare15 command:null hypothesis manifests and explicit command:null prerequisite
manifests for still-open cross-path calibration, configured capacity, metadata,
repair and foundation work. Validate them with the current manifest validator.
They are not runnable contracts or outcome proofs, and they require a separate
grant even to enqueue. After canonical publication, verify their exact IDs,
headers/dependencies and non-runnable status; then review any bounded
cancel-with-reason set. Retain each old placeholder without an explicit actual
successor, particularly `calibration-five-paths`. No queue is emptied merely
because redirect IDs appear in a source recipe.

The15 choices share foundation mechanisms/reservations across five query surfaces.
They do not imply native/Datalog equivalence or extra physical data copies. A
native-backed assertion-view helper is a separate declared SDK entrypoint; it
does not qualify the Datalog translator. Keep existing measured failures and
remaining goals visible. Preserve fair opportunity for aged READY jobs, the
three-heavy limit and shared resource/disk vectors. No controller change,
staging/commit, enqueue/cancel, native action or experiment execution is performed
by this source proposal.
