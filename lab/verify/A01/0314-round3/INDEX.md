# CX-VA01-0314 round-3 evidence

Verdict: **ACCEPT**, scoped to candidate `d117cdb349b100fe4451bfcfb422cb95b2db3d58` on tested reviewer head `c4eedaa5ccad4655a66db9b807de77e20d0c028e`, merged with frozen main `bb36862daf55b4f46a3cbf763f757c6341de4575`. See [the full review](../VERIFY-0.3.14-round3.md).

All requested contract checks pass freshly: standalone byte verification, 24 tests, 520/520 mutations (608 catalog / 88 retired), merged-main evaluator 108/108, full integration typecheck, and offline G0 XTDB 1223, Datomic 1277 (including 19 new boundary cases), QLever 1415. F1/F2 original probes and all four Datomic integration cases pass.

The original integration file remains **FAIL: 38/39**, sole unchanged 5000 ms memory timeout. The identical test body also times out on its historical GS12F runtime. Main lacks this test and domain module; the transplanted unchanged workload fails on unsupported integers instead. Separate 30000 ms diagnostics pass on historical and reviewed runtimes; they do not replace the failed original test. Main changes after the frozen merge are outside this review.

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-0314/round3/`.

- [SUMMARY.json](SUMMARY.json): exact source identities, semantic validation, every required execution, retained setup failures and all other attempts.
- [DURABLE-SHA256SUMS](DURABLE-SHA256SUMS): 2,046 files / 121,507,649 bytes; SHA256 `49ce667f2e3d43d7db9e608d1a7db35bddcf3a31619864455e6616078bf99556`. Resolve entries relative to the durable root.
- `*/execution.json`, `*/command.log`, `*/p2q/`: fresh UUID attempts, actual command/output, source maps, observations, planted compiler fixtures, pin/domain inventory and baseline bindings. No setup failure grants a semantic result.
- `g0-*/g0/`: actual canonical receipt, raw reports, content-addressed objects, copied builds and their individual manifest; captured after each lane before the next build.
- `prepare-timeout-*/p2q/`: exact main/historical source archives and full snapshot hashes. `snapshot-configs-*` and `snapshot-dependencies-*` record exact missing setup inputs and links. Comparison runs recheck snapshot bytes before and after execution.
- `review-tools/`: sealer source, historical/reviewed test source preimages and equal workspace catalogs. The sealer independently reconstructs G0 counts and allowed skips from actual raw assertions and checks every captured byte.

Re-run validation at the frozen tested head with `node lab/bin/heavy.mjs --label CX-VA01-0314-R3-seal --poll-ms 100 -- python3 -B lab/verify/A01/0314-round3/seal.py`. The final report commit only adds reviewer evidence; the source-bound head remains the one above.

No reviewed code or contract fix, live engine qualification, root check, publish, push or merge into main was performed. The full observation-to-verdict audit and open timeout/later-main limitations are in the review.
