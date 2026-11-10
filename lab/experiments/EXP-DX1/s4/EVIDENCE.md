# DX-S4 evidence index

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S4/`.
`SHA256SUMS` paths are relative to that root; verify with `shasum -a 256 -c /absolute/path/to/SHA256SUMS` from it.
Bulky evidence is intentionally outside git. Retain all first failures and raw files.

| Directory/file | Meaning |
| --- | --- |
| `input-all/` | Complete 442,410-assertion corpus, source hashes, native match and reversible archive checks |
| `input/` | Current-only control; retained original/restored fixtures and manifests |
| `tx2-dxs4-anatomy4/` | Successful clone census, index/GC, before/after SQL, preservation digest and stopped `du` |
| `tx2-dxs4-anatomy4-footprint/` | Transactor-free footprint component; current-row denominator |
| `tx2-dxs4-retired3/` | Repeated transactor-free footprint; historical supplement of 214 strings |
| `tx2-dxs4-batch1-postgres/` | Complete typed PostgreSQL comparison, exact cell readback, clean stop and cleanup |
| `tx2-dxs4-batch1-{a,b,d,e}/` | Failed Bash array wrapper attempts; no declaration footprint |
| `tx2-dxs4-batch1-xtdb/` | Failed partial XTDB load; heap exhaustion; no accepted footprint |
| `tx2-dxs4-batch2/` | Cancellation before admission; no containers or store measurement |
| `launches/` | Immutable corrected launch preimages, frozen before scheduler waiting |
| `tx2-dxs4-{inspect,anatomy2,anatomy3}/` | First failures, including usable labelled census/export observations |
| `tx2-dxs4-{retired,retired2}/` | Disk refusal and mutable-wrapper failure |
| `owned-retention.json`, `owned-restoration.json` | Byte-verified reversible storage/restoration actions |
| `retired2-lock-recovery.json` | Empty-lock recovery evidence |
| `final-audit.json` | Syntax checks, final empty owned-resource inventories and logged removals |

The report distinguishes logical text bytes, SQL relation allocation and stopped-volume allocated `du` bytes.
It does not infer a semantic PASS from exit status, queued work or a partial load. Final checked-in sources may include
safety fixes made after earlier attempts; each attempt's source copies, rather than the final files, identify what executed.
