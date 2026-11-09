# Contract 0.3.14 round 3 evidence

Tested source `109100f565a425f04919a2553ce5551c7c97b994`; main `35ae3fa006c3420fa7e591e667c2a14bc2637770` included. Independent review remains pending.

Final results: standalone byte-identical verify; 24 contract tests; 520/520 mutations (608 catalog, 88 retired); evaluator 108/108; 19 Datomic public write/receipt/readback fixture tests; full integration typecheck; full offline G0 on XTDB, Datomic and QLever. The full integration domain file FAILS: 38/39 pass, with all four Datomic cases passing and the unchanged memory endpoint test timing out at 5 seconds on three retained attempts. This is not a full-file PASS. Native Datomic boundary/durability qualification was not run.

- `validation-summary.json`, `validate.py`: semantic content checks, fresh timestamps, exact source/head/main/input bindings and retained G0 raw/object/build bytes.
- `source-and-hashes.json`: frozen source inventory, including the integration corpus.
- `pin-audit.json`: 247 active paths; changed source old/new hashes; no product source pins moved; builder and pending-file input hashes regenerated (old/new hashes listed).
- `main-pending-authority.md`: initial main pending rows; validator also checks all pending rows against the final included main commit, including Q101a.
- `G0-*-receipt.json`, captures and manifests: exact builds captured before the next lane build.
- `RUNS.json`: final attempts and retained preliminary failed/corrected test attempts, with actual log bytes and before/after input observations. Preliminary runs do not grant final gate acceptance.
- DURABLE-SHA256SUMS-1: 1983 files / 23,327,491 bytes at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-A01-0314`, freshly rehashed; historical rounds retain separate manifests.
- `SHA256SUMS`: small repository evidence. Bulky raw outputs and build preimages stay outside Git.
