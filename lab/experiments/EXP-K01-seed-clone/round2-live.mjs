// [EXP-K01-R7] Why: the old T1-T7/process-verdict runner is retired by Q93. Rejected: silently using stop diagnostics or deleting a prior golden from runner cleanup.
throw Error('Retired: use engine.mjs golden/clone/fresh, then the benchmark driver with the seed manifest. Goldens are retained and removed only by explicit engine.mjs golden-rm. See E1-PLAN.md.');
