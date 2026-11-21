# DX-W1 part 12

North star P1, P2 and P4. Test exact current and pinned reads, durable writes and their storage cost. [Scope](lab/SCOPE.md) · [North star](lab/NORTH-STAR.md) · [Targets](lab/TARGETS.md)

Base: integration head `666b625e5`. The read-first trial compares the existing writer, append retirement, the paged owner root and a covering root. The covering root stores up to eight edited live rows and eight superseded legacy identities. A current or pinned read of a covered person walks the owner range once and resolves no pointers. A larger delta returns to the paged format. Coverage therefore needs a realistic distribution of distinct live edits per person. Normal application routes remain outside this trial.

## Evidence audit

- The isolated SQL fixture derives the covering root from the exact legacy or migrated basis. The native transaction compares its root bytes and writes the authoritative clock, version rows and retirement markers. The peer verifies all root, version, retirement and page bytes against the durable report before resolving the operation and claim.
- The four fixture arms share identical input edits and compare full current and pinned rows and the ordinary journal. Each fresh JVM checks the exact row digest on every sample. Recorded native writes resolve the caller's acknowledged t to a single log entry and compare its record count before computing string bytes. Phase timings carry the attempt, database, both native cuts and the JVM identity and have no acceptance threshold.
