# Round 5 evidence

Durable raw root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-NSR/round5/`.
`SHA256SUMS` indexes the 683 retained files; every digest was read back. Raw artifacts, layouts, keys,
HR chunks and logs remain outside git. `source-hashes.json` binds 20 final source/lock files and the
independent review report hash, and independently checks all 15 final executed layout receipts against
actual retained files and current support/source bytes. Environment/grant checks require empty PATH,
exact read/write scopes, no stars and actual child environment equality with its receipt.

Final invocation (Mac, Node v24.18.0, offline-no-slot):

```sh
PATH=/opt/homebrew/opt/node@24/bin:$PATH \
NSR_EVIDENCE=/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-NSR/round5/nsr-3 \
P3M_EVIDENCE=/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-NSR/round5/p3m-3 \
node lab/bin/heavy.mjs --label CX-NSR-R5-final3 --poll-ms 100 -- \
node --import tsx --test lab/bench/test/nsr.test.mjs lab/bench/test/p3.test.mjs
```

`attempt-3.log`: **16 passed, 0 failed**, including eight new output/environment controls, nine prior
filesystem controls, ten prior artifact controls, RPC fuzz/caps, canonical answers, HR binding/freshness,
exact split/P3M accounting and feed parity, and planted-delay/256-loop/negative receipt controls.
`nsr-3/envelope-*/results.json` records actual child environment/argv/CWD, exact allowed write bytes,
actual denied sibling-write resource/class, full environment/grant receipt, and the negative results.
The eight controls cover normal child observation, output reuse refusal, literal output star, output
parent star, layout parent star, changed write flag, extra environment key, and host PATH.

The envelope test deliberately overwrites its original config for later path/reuse negatives. Its baseline
config preimage is reconstructed from the fixture's known exact JSON definition as
`baseline-config-reconstructed.json` and verified against the original receipt's sourceConfigSha256;
it is labeled as reconstruction, not a contemporaneous capture. The artifact-binding control deliberately
changes its build entry after the baseline; its executed runtime layout is unchanged. Both intentional
changes are scoped in `source-hashes.json`.

Attempts 1 and 2 remain **12 passed, 4 failed**. The audit caught an undeclared macOS CoreFoundation
variable, then caught macOS replacing a conflicting generic UID in that setting. The final profile
explicitly derives and records the canonical runtime UID value. The full actual child environment now
matches the receipt. No failed attempt is relabeled. Host disk had 8.5 GiB free before the final run;
all suite attempts used the same shared four-slot heavy semaphore and offline fixtures.

Formatting, lint and `git diff --check` pass. Acceptance unchanged; changed pinned paths: **none**
(`pin-changes.json`). Complete grant/environment/runtime exceptions: `PERMISSIONS.md`.
No full G0/package-consumer run, native-open retrace, Linux/G03/VM/container run, engine operation,
provider qualification, merge or push is claimed. Separate review remains required.
