# Round-nine evidence

Raw evidence is retained outside git at:

`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2Q-R3/round9/`

[SHA256SUMS](SHA256SUMS) binds **1805 files**, **4,320,155 bytes**. Paths are relative to that durable root. Verify every retained byte against this manifest; first failures remain unchanged.

- `SUMMARY.json`: behavioral case/content readback at matrix source `5b16e04d`; includes the exact failed-case retry and 51+3 earlier-case union.
- `runtime-equality.json`: original/current source SHA256 and identical emitted JavaScript for the final two type-only refinements.
- `FINAL.json`: final source `a5109ce8`, fresh construction/typecheck receipt hashes, runtime binding, and operational observations.
- `retry/`: 1,113 passed offline tests and two typechecks; new live six passes plus the retained timeout.
- `live-retry/`: rejected zero-case selector and rejected expected-54 receipt with 51 actually passing cases. Those receipts are never relabeled.
- `journal-retry/`: accepted exact fresh journal retry and three copied nonzero-rewind controls.
- `type-final/`: accepted final construction suite and both current noEmit checks.
- `final/`: interrupted earlier attempt, retained unqualified.
- `lock-owner-readback.json`: 394 owned fixture lock records; none of their 35 owner PIDs was live at final readback.

All owned fixture states remain at the attempt-specific `V_P2Q_RUNS` paths in their receipts. No engine restart, exclusive reservation, main merge, push or publication. Independent acceptance and performance qualification remain open.
