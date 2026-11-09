# Contract 0.3.13 round 2 independent delta review

Exact revisions and attempt start: source.json. The tested synthetic merge includes candidate 191f51c and actual review-start main e4850f80. Only NOTEBOOK.md and STATE.md differ from the candidate; executed source is identical. Durable test-commit.txt retains its exact Git commit preimage, test-tree.txt its tree identities, and current-main-only.txt the complete note-only diff.

Run sequence in the private scratch clone:

- prepare.py (fresh directories only); audit_merge.py compares both parents, every composite merge file, exact engine patches and unchanged contract/evaluator/mutation identities.
- Each run.py mode (contract, evaluator, mutations, install, final) through lab/bin/heavy.mjs with this attempt's label; install uses the owned pnpm store, offline, frozen lockfile. Modes evaluator and mutations may run independently; wait for completion before final controls and G0.
- audit_mutations.py checks all actual child diagnostics, separately from the unchanged harness.
- correct_topology.py records why a normal clone failed the strict store policy, then registers the identical tested commit as a real linked worktree. The first G0 FAIL remains under G0-xtdb-first; first-G0-failure-retention.json checks all 30 raw files and 41 object references. Dependencies move to the same paths without source edits. The accepted evaluator is rerun as evaluator-linked on this final topology.
- run_g0.py directly admits each gate through heavy.mjs. Do not wrap that Python driver in another grant. It captures every immutable object and built-file preimage before the next gate builds.
- audit_results.py independently checks counts, expected skips, regenerated hashes, actual source/attempt/slot bindings, retained objects/build bytes, and the merge/mutation audits.
- seal.py checks source cleanliness, retains source identities, removes only this attempt's scratch clone, and hashes every durable/local artifact after all writers finish.

Bulky raw outputs, mutant records, CAS objects and complete built files are external under the raw root in source.json. RAW-SHA256SUMS covers those exact bytes; evidence-index.json gives count/size/manifest digest. Local SHA256SUMS also covers the report and review tooling. Historical builder or earlier reviewer PASS statements are not fresh evidence.
