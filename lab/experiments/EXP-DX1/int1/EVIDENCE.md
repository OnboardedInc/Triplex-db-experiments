# Integrated account evidence

All paths below are relative to the durable `evidence/DX-THIN1/int1` directory. Verify the files there against this experiment’s `SHA256SUMS`.

| Directory or files | Observation |
| --- | --- |
| `proof-b`, `proof-c` | Native, fresh thin and deep scopes, actual receipt and release cuts, Python O-REPLAY and O-DOMAIN, stable page publication and the 23 original publication schedules. The later proof adds a real post-capture write and the DRV1 receipt worker. |
| `idle-c` | Native per-process RSS, thread counts and lazy reader entries for one and then eight provisioned scopes. |
| `thin-c`, `deep-c` | Native 100k thin and 10k deep. Seed the 2% cohort first and read half. Add only never-touched people, wait for the reader watermark, then take a second observation. Measure first-ever reads on the other half after the complete import. |
| `moving-*.json` | Real V8 process memory using a stateless wire fixture, 48k distinct requested worlds and then a second traversal. The first pair ran in one chain of microtasks. The later pair gives V8 event-loop boundaries before collecting discarded weak references. |
| `checks` | Package and branch-specific checks, queue plan, binding and cleanup evidence. `thin-b` preserves a failed native census before the collector retried fresh role observations. |

The 64-byte comparison uses the difference in role RSS divided by newly added never-touched people. The reader-entry and gateway-cache gauges attribute application data directly. Shared runtime RSS includes allocator and storage-engine behavior. PostgreSQL sums process RSS and can count shared pages more than once. The mean idle cost subtracts one already opened scope and divides by the seven additional scopes. Native read latency includes IPC to the separately measured reader process.

For account placement, both bench cases use the frozen SCALE1 size mix and the same account-local deep seed values. Each account gets a disjoint public ID range in both placements. The fixed 2% access and update schedule measures P7. The comparison checks every account’s ordered roster and logical work outputs across placements, in addition to each placement’s native guards, original receipts and pinned reads. Source pins, the slot nonce and ordered per-page publication receipts bind each arm. The controller prepares a clean public clone, takes the BM1 exclusion, uses systemd deadlines and verifies owned cleanup. `control.ts --plan` reads the plan locally.
