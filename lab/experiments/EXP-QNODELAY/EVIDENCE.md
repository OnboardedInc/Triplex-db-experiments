# CX-QNODELAY evidence index

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QNODELAY`. 115 regular files, 5,518,888 bytes. `SHA256SUMS` lists their exact absolute paths and SHA-256 values; verify with `shasum -a 256 -c lab/experiments/EXP-QNODELAY/SHA256SUMS`.

- `attempt1/`: retained first-failure expected datatype mismatch; start/result plus copied source.
- `attempt2/`, `attempt3/`: successful source-client diagnostics; separate attempts, never overwrite the failure.
- `attempt4/`: final built-public-export diagnostic, start/result, copied runner/client/slot configuration/build/lock preimages. Every response's decoded binding bytes, timing, mode, nonce/query, expected/result hashes and content check are in `result.json`. These are decoded results, not a raw HTTP packet capture.
- `tests.json`, `tests3.log`: final package test report, 38 passed and 21 skipped. `tests.log` retains the package-config startup/cache-path failure.
- `qlever-build.log`, `testkit-build.log`, `typecheck.log`: final build/dependency/typecheck command output. Typecheck exit zero was observed; an empty diagnostic stream alone is not used as acceptance evidence.
- `probe4.log`: final per-cell timing summary.
- `pack.log`, package `.tgz`, `pack-check.json`, `packed-consumer.log`, `packed-consumer/`: packed-public-export inspection and consumer smoke. Symlinked local dependency directories in the consumer are not copied into the checksum manifest.

All timings are DIAGNOSTIC (Q91a). No source/state population or independent production qualification is claimed. `REPORT.md` records the PASS audit, limitations, changed pin, default proposal and reproduction command.
