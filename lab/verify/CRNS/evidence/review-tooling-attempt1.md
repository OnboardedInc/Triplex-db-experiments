# Review metadata tooling: first failure

The first `node lab/verify/CRNS/record-verification.mjs` call exited 1 before producing a verification record. Node 22.23.2 reported `Error: spawnSync git ENOBUFS` at the acceptance-file readback of `lab/acceptance/obligations.json` from reviewed commit `2f299bfaeadc83ad644ad30e98d915e1c9dcf215`; the captured partial stdout was 1,076,786 bytes, beyond the default child-process capture limit. This note records the live tool output; it is not a successful check or a replacement for the incomplete blob.

The tool was changed to permit a bounded 64 MiB capture, then rerun. Evaluator bytes, tests, and acceptance files were not changed. `verification.json` is produced only by the completed rerun after all assertions, not by adopting the empty first output as success.
