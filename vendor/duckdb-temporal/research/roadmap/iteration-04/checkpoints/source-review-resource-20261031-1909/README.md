# Item 4 reviewed source and resource-admission research

2026-10-31. **Source/documentation only. No compiler, extension load, oracle/harness, native, database, regression or benchmark execution occurred in these corpora. The build/test gate remains CLOSED.**

The new native/core, actual unstable DuckDB C API v2 binding and source-packaging changes are already preserved on [draft PR 7 at09138d32]([PRIVATE_REFERENCE_REMOVED]). The selected pre-code contract and prior primary research are separately saved on main. No store/planner activation or complete item4 acceptance follows from source-review closure. Item3 remains incomplete by user-directed sequencing override; goals5–10 remain queued.

## Human-readable reports

- [Native core review](reports/core-review.md): exact source002 identities, signed safety/SCC/waves/negative accounting/IR2/failure-state and legacy source comparisons; no blocking static defect found.
- [Actual-v2 binding review](reports/binding-review.md): two initial findings closed in revision002, exact carrier/FP/accounting/source identities; ABI/runtime behavior remains unverified.
- [Source packaging review](reports/export-review.md): ancestor-symlink selection and mode-provenance corrections closed in revision003; proposed regression tests remain UNRUN.
- [Resource-admission primary research](reports/resource-research.md): cgroup/ancestor and reservation/whole-job guarantees are not exposed; RLIMITs and snapshot estimates do not establish aggregate capacity.
- [Focused UID/namespace review](reports/uid-namespace-review.md): namespace-visible UID/caps do not exclude INIT_USER's NPROC exception. The original harmless true-only preflight was not attempted; its premise was not established. No actual denial is implied by this abort.

## Exact supporting evidence

Each `evidence/*.json` is a transparent UTF-8 container for one independently created NEW item4 corpus. Every logical filename, byte length and SHA256 is retained alongside its exact UTF-8 content; decode `content_utf8` to bytes without newline conversion. The coordinator independently restored/rehashed and compared every logical file. `LOGICAL-CORPUS-MANIFEST.json` records the inventories. Top-level `FILES.json` lists every published physical file and Git blob identity. These are new item4 reports and evidence, not the separately stopped item3 backup or an alternate publication of it.

The independent QA source and its ongoing peer review, and any later new compiler-feasibility research, are not falsely represented as part of this frozen snapshot. Newer results require their own exact checkpoint. No executable controls, custom syscall filter, compiler probe or project execution is authorized by these documents. Existing runtime gates and continuous-compatible-FP/trusted-callee assumptions remain unchanged.
