# CX-VNSR-5 round 4 evidence

Verdict: **FIX-FIRST**. Report: [`../VERIFY-round4.md`](../VERIFY-round4.md).

Raw root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VNSR-5/round4/`.
[`SHA256SUMS`](SHA256SUMS) contains **1,190 files / 2,550,873 bytes**, relative to that root.
Every listed file was hashed and read back after the review processes finished. The checksum file itself
is excluded from its own inventory. Its SHA256 is
`c9cffd5300bbc96a922f9b42a5f4a84f0710c1bd87cdf639dcdeff0b388471f9`.
Raw keys, fixtures, built artifacts, layouts and output remain outside git.

Use **attempt-3** for the final result. Attempts 1 and 2 retain earlier versions of the same observations;
attempt 3 adds exact reviewer-source preimages and a checked acceptance diff. All three completed with
their expected assertions, including reproduction of the write-boundary defect. Exit zero is not acceptance.

| Evidence under `attempt-3/` | What it records |
| --- | --- |
| `summary.json`, `source-hashes.json` | Exact reviewed target, 17 verified source/lock files, Node version and observed check counts. |
| `reviewer-sources/` | Exact final executed review script, adapted original cases and native open tracer. |
| `round3-cases/results.json`, `round3-cases.log` | All 13 original case outcomes, their artifacts, candidate bytes, error classes and marker observations. |
| `builder-controls/`, `builder-controls-summary.json` | Fresh nine filesystem controls plus intact-layout baseline. |
| `exact-result.json`, `exact-output/` | Uninstrumented stock-driver run, its layout receipt, actual DIAGNOSTIC output, HR chunk and seal. |
| `traced-result.json`, `traced-output/`, `opened-set.json` | Stock artifact with native open/openat measurement; all observed opens, actual hashes, output writes and zero layout links. |
| `descriptors-62308.json` | Uninstrumented stock-process lsof snapshot. |
| `descriptors-62338.json` | Instrumented process snapshot; includes external measurement-library mapping/descriptor. |
| `envelope-result.json`, `launches.json` | Actual fixture-child environment/argv and captured stock/generated launch options. |
| `wildcard-result.json`, `wildcard/` | Fresh exact-byte sibling-write counterexample, declared empty output, source, config, manifest, runtime and receipt. |
| `stock-manifest.json`, `stock-artifact/` | Rebuilt stock driver and actual esbuild version/graph/support bindings. |

`reviewer-tools/` retains the final review, tracer, case and retention sources. The manifest also preserves
all earlier attempts. The builder's separate 785-file evidence manifest was independently checked against
its durable root; it was not copied into or relabeled as new reviewer execution.

The native interposer changes the traced child's environment solely for measurement. The uninstrumented
run and envelope fixture use the unchanged launcher. Tracing is limited to open/openat calls; the report
records native runtime files outside the inventory and does not claim an exhaustive OS syscall proof.
Descriptor snapshots are timed observations. The offline fixture has zero logical readers, an empty writer
trace and localhost consumer RPC, sufficient for this filesystem review; it is not performance or NS acceptance.

All review executions and retention hashing used `lab/bin/heavy.mjs`. No candidate fixes, acceptance edits,
engine/VM qualification, full regression suite, full G0, merge or push. Changed pinned paths: **none**.
