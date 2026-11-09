# Round 4 evidence index

Durable raw root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-NSR/round4/`.
`SHA256SUMS` indexes 785 retained files / 8,255,460 bytes relative to that root; all hashes were read back.
Raw artifacts, layouts, keys, HR chunks and logs remain outside git. `source-hashes.json` binds 23 source/lock
files and the exact independent review report, and independently verifies 14 executed layout receipts.
The original reviewer exploit source beside this index is byte-equal to the reviewer's round 3 file.

Final command (Mac, Node v24.18.0, offline-no-slot):

```sh
PATH=/opt/homebrew/opt/node@24/bin:$PATH \
NSR_EVIDENCE=/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-NSR/round4/nsr-4 \
P3M_EVIDENCE=/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-NSR/round4/p3m-4 \
node lab/bin/heavy.mjs --label CX-NSR-R4-final-100 --poll-ms 100 -- \
node --import tsx --test lab/bench/test/nsr.test.mjs lab/bench/test/p3.test.mjs
```

`attempt-4.log`: **15 passed, 0 failed**, including the nine new filesystem controls, ten prior artifact
controls, exact split/monolith accounting and feed parity, canonical answer keys/digests, capped RPC fuzz,
HMAC binding/freshness and P3M planted-delay/256-loop/negative receipt tests. `nsr-4/filesystem-*/results.json`
contains the three reviewer exploits' actual `ERR_ACCESS_DENIED`, `FileSystemRead` errors on their existing
candidate files, absent execution markers, exact bundle identities and full runtime layout receipts.
The six tamper/grant cases also require specific failures. Normal driver execution and the intact-layout
baseline pass; current support/source bytes match the executed manifests and all 14 receipt inventories.
The artifact-binding negative control intentionally changes its build artifact after a successful baseline;
its executed layout remains intact, and this deliberate tamper is recorded in `source-hashes.json`.

Earlier attempts remain original: attempt 1 failed on sandbox sysctl access; attempt 2 passed 14 tests but
failed its stale filesystem-control count assertion; attempt 3 was cancelled while still waiting (exit 143,
no nsr-3 output). `attempt-3-status.json` records the waiter PID and reason for supported shorter polling.
Admission retained four slots and never touched another job. Disk was 16 GiB free before the final run.

Formatting and lint passed on changed implementation/tests. `git diff --check` passed. No referenced
acceptance pins changed (`pin-changes.json`); acceptance files are unchanged. No full G0 rerun, actual G03
image/VM run, Linux run, provider/engine qualification, merge or push is claimed.
