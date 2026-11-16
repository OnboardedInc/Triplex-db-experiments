# One SQL commit per log write: safety probe, rejected

North star: P2 median and tail, with durable acknowledgements as the floor. No setting or default changes.

The pinned 1.0.7745 jar does not promise one connection for the pair. `sql/insert` and `sql/update` each call `sql/connect`, close the statement, and close the borrowed connection in separate `finally` blocks. `kv-sql-ext/create-datasource` uses a Tomcat pool (initial size two, validation on borrow); there is no encompassing transaction or connection binding. A normal observation on one backend is not a guarantee. `KVCluster.update_pod_STAR_` orders the two operations on one future thread, but wraps **each** in its own `retrying_write`. An UPDATE retry does not rerun the INSERT.

The isolated probe executes these original jar methods. A factory deliberately supplies two legal connections; both calls use the same thread, and the first closes before the second is borrowed. It then exercises original `KVCluster`/`KVSql`/retry classes with simulated SQL failure 08006. Autocommit retains the chunk and UPDATE retry is safe. Simulated atomic pairing rolls the chunk back on the first failed UPDATE, and the original UPDATE-only retry returns revision 1 while its chunk is absent. This rejects the proposed simple wrapper; it is a counterexample under fake SQL, **not** a real Postgres crash, lost-ACK test, or a proof that every external implementation is impossible.

| Durable state after interruption | Original autocommit | Correct atomic pair |
| --- | --- | --- |
| Before INSERT / before pair COMMIT | old pointer, no new chunk | old pointer, no new chunk |
| INSERT complete, UPDATE not committed | old pointer, durable unreferenced chunk; valid orphan | old pointer, no new chunk after rollback |
| UPDATE/pair COMMIT durable, reply lost | new pointer and durable chunk; CAS retry can read matching revision/tail and resume | same, if the pair outcome and chunk are retained across retries |
| Retried UPDATE after rollback, without restoring INSERT | impossible following a successful original INSERT | **new pointer, missing chunk**; the naive pairing is unsafe |

A zero-row conditional UPDATE is not an SQL exception: today the chunk may remain orphaned, then `update-pod` reads the pod and checks revision plus tail to distinguish an already-successful attempt from a competing writer. A wrapper must preserve that resolution and uncertain-COMMIT outcomes, not turn every zero row into success. Initial pod creation is an INSERT, while tail reset can read first; generic pairing by adjacent statement shape is insufficient.

A safe prototype needs an explicit pair identity, connection ownership through pool close/reborrow, and a retained/replayable INSERT across every retry, reconnect and ambiguous COMMIT. It must also keep unrelated index/log-tree INSERTs durable before reporting success to their publisher; a 1-ms timer and a thread-local held value do not establish that cross-thread ordering. None is implemented. The menu's `synchronous_commit=off` trigger violates this task's durability rule and is not run. The 0.5–0.8-ms menu saving remains a hypothesis, not a measured saving here. A storage-boundary API returning only after the combined durable transaction is the clearer later design.

After an uncertain COMMIT, an existing chunk must be compared byte-for-byte before a replay accepts it; ignoring a duplicate-key error alone would weaken the original failure behavior. A safe external protocol may be possible, but this probe does not establish one and does not claim it is impossible.

Evidence: `evidence/DX-T1/p11-safety/SOURCE-INDEX.json` seals the decompiled reading and jar; `tx2-dxt1-p11-pair-safety-g/{request.json,probe.jsonl,qualified.json}` binds the exact source bytes, current attempt, output and observed counterexample. Attempts a–f remain, including parser/row-model mistakes; g is the completed probe on committed source, with the active jar SHA256 matched to the decompiled reading. No database or seed was opened; no real crash/restart, differential or oracle is claimed for an unbuilt wrapper.

```sh
node lab/bin/heavy.mjs --label DX-T1-p11-pair-safety -- bash lab/experiments/EXP-DX1/t1/sql-pair-probe.sh tx2-dxt1-my-safety
```
