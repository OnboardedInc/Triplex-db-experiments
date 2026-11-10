# Observation audit (DX-N1)

Diagnostic only; none of this code promotes acceptance or writes to `lab/acceptance/`.

- `stack.py` readiness: every gateway health body must report the hash of the just-copied/adapted gateway files. Effective
  Postgres settings are read from the just-created cluster and fsync/synchronous_commit/full_page_writes must all be on.
  A fresh exclusive run directory, owned PIDs with recorded birth/command identity, loopback ports, source file maps and
  variant bind the observations. Readiness means ready to test, not semantically correct or durable under power loss.
- `stack.py` cleanup: live roots must match their recorded PID birth/command before signalling; cleanup records require
  those PIDs to be absent. Data removal follows shutdown. Direct children are reaped. Missing processes count as gone,
  never as transaction success. Unknown PID identity refuses cleanup and prevents normal lock release.
- `smoke.mjs`: asserts a fresh UUID scope's actual SDK commit can be read at its returned instant, with exact value and
  cardinality. The run's source/build hashes, endpoint/PID manifest and retained receipt/rows bind it. This is one operation,
  not the N1 suite or acceptance.
- `sampler-check.mjs`: the fresh child PID is sampled twice around real CPU work; the delta must be positive and finite
  within a broad physically possible range and RSS positive. The child stops in finally. This checks CPU accounting only.
- `matched.sh`: the native run's original gateway hash must equal the immediately preceding VM arm's recorded source hash.
  Both are fresh prefixes inside one hold. The sole native adaptation changes the listener. The same built worktree and
  generated client recipe serve both arms. This equality is source equivalence, not result equivalence.
- `prepare-matched.py`: derives B6/B7 byte snapshots and records source/derived SHA256. It retains B6's operation-bound
  commit diagnostic assertions and B7's final-seed ACK/basis and route/fault assertions. It shortens only the stated writer
  counts/duration, changes output location/import resolution, and adds native CPU reads and CPU fields. Each arm has fresh
  seed files and UUID scopes. No new semantic PASS emitter is introduced. B7 is a diagnostic workload, not an oracle proof.
- `run.sh`: runs the existing source tests with the existing lean setup (explicit legacy/lean differential choices survive),
  and the existing north-star driver/oracle. Exit zero alone is not reclassified into acceptance. Test JSON, driver report,
  raw output, source/build hashes and effective settings are retained per fresh attempt. The original test assertions and
  oracle comparison remain the content checks; any timeout/error remains a failed or incomplete attempt.
- `driver.ts` native addition only supplies actual process CPU samples, removes the quota throughput bar, and labels the
  used-core denominator. Linux sampling stays unchanged. It adds no semantic PASS path. Missing/dead native roots fail sampling.
- `summarize-matched.py` renders retained values only. Absent arm/phase data is printed unavailable; it never infers a result.

Existing north-star/oracle PASS generation is inherited, not independently qualified by this spike. All diagnostic results
still require the separately assigned reviewer before they can carry verdict runs.
