# Triplex backend qualification status

This checkout contains partial implementations of Triplex-on-XTDB and the newly
added Triplex-on-QLever competitor. The complete ten-goal
target remains **unachieved**. In this checkout, see `qualification/PLAN.md`,
the machine-readable `qualification/ledger.json`, and
`qualification/benchmark-contract.json`.

Triplex reference commit is `e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0`:
core package 0.2.0, monorepo root 0.1.0. The DuckDB research/workload reference is
research-reference commit `5691739c718ff632f4e82bf98c5eb2a56a15e8b6`.
The create-only source manifest records 2,542 tracked reference files and seventeen
copied workload/oracle inputs. Its scope does not include untracked data or process state.

The copied packet validates all twenty families and 71 immutable-event oracle cases;
eight oracle unit tests pass. This is independent expected-answer evidence, **not**
XTDB execution. Original references remain untouched. The original three-engine
runner is retained for reading and is not executed: its relative output logic would
write beside its source, and it relies on the old DuckDB runtime layout.

The owned XTDB 2.2.0 container uses a pinned image digest, localhost port 5442,
four CPUs and an 8GiB hard cap. Its JVM settings are 3GiB heap and 2GiB direct memory;
those settings do not bound every native allocation. Resource admission checks host
and Docker guest/data free space and charges owned image/container/project storage.
The original QLever 0.6.0 development profile used port 7019 and a 4GiB cap,
with a 2G native allocator and sixteen worker threads. Three small read queries
caused real OOMs; those failures and recovered data are retained. Two temporary
2GiB/two-CPU candidates with 512M allocator/four threads passed fourteen focused
cases after two unsuccessful experiment waves. A separately owned `compact-v3`
4GiB/four-CPU profile is ready for fresh public qualification. It does
not turn the failed original profile into a passing gate.
Both backends share the fixed 12GiB owned-storage limit and 12GiB host-free reserve.
Fair performance runs require one backend at a time with the same 8GiB/four-CPU
server envelope. Native probes diagnose each backend; the only competitors are
the two public Triplex implementations. DuckDB remains a read-only reference.

Run copied expected-answer checks and inspect capacity:

```sh
python3 scripts/xtdb-oracles.py
node scripts/triplex-resources.mjs --backend xtdb --planned-bytes 33554432 --require-server
```

The complete unchanged upstream 44-case suite passed on the first qualified
runtime build after native-valid-period and aggregate-dialect fixes. Source hashes
were stable and tracked references remained unchanged. Earlier failed runs are retained.
Run it again after changes under the backend qualification lease:

```sh
env TRIPLEX_BACKEND=xtdb python3 scripts/triplex-lease.py --backend xtdb --purpose runtime-conformance -- node scripts/triplex-qualification.mjs --mode suite
```

QLever uses the identical gate with its backend selection and explicitly admitted
resource profile. No other agent probes that backend until the lease owner releases it.
It uses a fresh UUID scope
and explicitly installs `Capabilities.none`. The unchanged suite uses a live clock
because its historical fixtures intentionally sleep between recorded instants.
Passing it will establish the base
44-case runtime contract only; it cannot close crash, resource, expanded-language,
interval, maintained-recursion, full scale or comparative acceptance by itself.

`scripts/triplex-public-pilot.ts` is a bounded 10–1000-entity public transactional-batch
pilot with sparse/ten-fact profiles, 1/4/16 reader clients, corrections,
cursor continuation and reopen. It selects the same fixture for either backend.
The XTDB 100-entity profiles passed, with one and ten domain facts per entity.
Its small samples are diagnostic; it does not report qualified tail percentiles or
sustained-ingestion/scale completion.

The initial 100,000-entity sparse attempt stopped after 28,500 acknowledged entities
when its conservative estimate crossed admission bounds. Concurrent dependency
installation had inflated its whole-project bytes/fact estimate. Fresh public
reads verified the retained count, sum and final receipt; the failed gate remains.
Three simultaneous 2,000-entity batch-width experiments passed correctness using
100, 500 and 2,000 assertions per command. Their timings are diagnostic.

A separately frozen capacity model now attributes growth to the XTDB database
owner, normalizes retained assertion counts including journal facts, reserves twice
the future-growth estimate, and takes the maximum of loading/compaction and stopped
backup/restore phases. It preserves the original resource caps and charges every
actual owned byte. The retained prefix reached **100,000 distinct entities and
100,000 active domain facts**, through 200 acknowledged public commands.
Count/sum checks, endpoint retrieval, fresh connection verification and 1/4/16
small read-only client checks passed. Sixteen readers also passed 48 functional
checks during ingestion. Loading overlapped source development, so this is a
load/correctness checkpoint with no qualified latency claim. The representative
million-fact 100,000-entity profile and every larger entity stage remain open.
A ten-million-fact fixture is a different claim from ten million
distinct entities.

The shared public workload runner in `scripts/triplex-workloads.ts` projects immutable events
through atomic Triplex mutations and uses existing structured Datalog and interval
APIs. It preserves fixture knowledge groups and documents its coordinate encoding,
extra direct-reference facts, and bounded final-result normalization. The oracle
answers are used only after execution to check results. The frozen XTDB run passed all **142 of 142 current/reopened executions**
covering twenty families and 71 logical cases. The final public unchanged 44-case
runtime suite and all 44 individually isolated cases also passed with stable source
and compiled artifact hashes. Earlier integer-extrema, conjunctive-negation and
watchdog failures remain recorded.
Family 05 now submits actual duplicate commands and checks unchanged receipts and
positions. The first QLever packet attempt recorded 70 passing and 43 failing executions;
29 expected executions remained unrun after a real server OOM at its fixed 4GiB
development cap. Its typed payloads survived an owned restart. Fresh QLever fixes
are awaiting shared gates. The retained XTDB 44/142 receipts precede the latest
shared-core union-bounds change; that newer build requires fresh qualification.
The strict comparison reader binds report bytes to their receipt digest/run ID,
checks the exact 142 packet identities and requires matching shared public source,
compiled artifacts and harness hashes. Earlier unbound receipts remain incomplete
under this stronger contract. The full two-backend, twenty-workload scaled comparison
remains open.

Public callback transactions, interval queries and complete-generation maintained
results have additional focused evidence. These do not establish crash safety,
backend cancellation/reclamation, incremental maintenance, recursive intervals,
all schema/reference behavior or ten-million-entity support. The ledger retains
each outstanding acceptance gate and earlier failed receipts.

General stratified rules and negation over completed derived relations are not
implemented on either backend. QLever has no public maintained-query provider.
Its native multi-operation request can partially commit when a later operation
fails. A pinned source audit also raises a single-modify failure-atomicity concern,
but that is an inference: no empirical single-modify counterexample has been run.
The managed-writer model remains separate from the public runtime.

Measured capacity admission blocked the requested larger XTDB profiles before
writing: 100,000 representative entities or one million sparse entities projected
58.20GB peak owned storage against the fixed 12GiB cap. Higher profiles were also
blocked. These conservative model results do not prove physical impossibility.
The 100,000 sparse subjects passed fresh public distinct-entity/count/sum/receipt
verification on the frozen runtime; configured entity-presence/version profiles
remain separate.
