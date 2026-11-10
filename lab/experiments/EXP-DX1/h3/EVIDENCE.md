# DX-H3 evidence index

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H3`. Bulky evidence is not committed.

- Final medium: `tx2-dxh3-m5/driver/ns-report.json`, `driver.log`, `stack.json`, `containers.json`, source/build hashes, cgroups, scan intervals and cleanup inventories.
- Final 10k: `tx2-dxh3-r4/driver/ns-report.json` and the same bindings; `native-logs/1794285164939/` contains post-phase peer/transactor files with exact-ID collection observations.
- Original oracle cases/expected bytes and fresh-UUID bridge requests/responses remain per attempt. The real oracle FAIL is unchanged.
- First failures, aborted and queued attempts retain their unique prefix directories and logs. `PRIOR-ATTEMPTS.json` indexes the early attempts; later prefixes remain directly inspectable.
- `SOURCE-AND-CLEANUP-VERIFY.json`: 49 medium and 50 real runtime bench source hashes match the recorded preflight Git commits; final owned containers/networks/volumes are empty.
- `ORACLE-PROVENANCE.json`: embedded archive commit and 12 matched Python source hashes.
- `vm-tests-delivery.log`: 22/22 focused Linux tests. `typecheck-delivery.log`: broad check still fails in unchanged diagnostics.
- `SHA256SUMS`: 678 retained files, 1022716310 bytes; current verification has zero mismatches. Manifest SHA-256: `6868fb127582eca7cd8c010939511bbaf6730fba58a2c02de5cf2908765c06ad`.

Verify from the durable root with `shasum -a 256 -c /absolute/path/to/h3/EVIDENCE.SHA256SUMS`. `MANIFEST-VERIFY.json` is derived after the manifest and excluded from its own input set. Original benchmark data and their failed verdicts were not edited.
