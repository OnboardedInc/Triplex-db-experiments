# Owned sparse storage, spill and maintenance

Tags: `problem:owned-storage`, `backend:duckdb`, `goal:6`, `mechanism:finite-spill-budget`, `mechanism:same-image-compaction`, `status:observed`.

The first Duck common packet exceeded its512MiB disk admission estimate, leaving~5.3GB forensic scratch and transiently growing sparse-image backing to41.63GB. Total owned allocation reached44.94GB of the46GB operational stop despite~11.94GB live APFS allocation. Admission estimates alone did not enforce per-job spill limits; a startup-setting readback did not explain the effective automatic32.1GiB spill error.

The coordinated [maintenance proof](../../provenance/storage-maintenance-20261106.json) stopped only owned services, preserved all16,184 authoritative file/link hashes including spill evidence, detached/compacted/remounted the same fixed45GB image/UUID, and restored the same engine container identities/caps with anchored readiness. Backing shrank41.63→12.15GB. No forensic database was deleted or quota enlarged. APFS live/folder/free/backing observations are not additive.

The later [functional public-lease resource gate](../../.devloop/jobs/duckdb-resource-entry-v3/attempts/0001/terminal.json) verifies actual1MiB native spill rejection, explicit owned temporary location, native interruption/drain/healthy reuse and incompatible cached-file resource refusal. Root cause of the earlier automatic budget remains unresolved. Hard local disk is50,000,000,000B including original ZIP;46GB remains the operational stop. Engine memory limits and sampled Mac process watchdogs have different scopes.
