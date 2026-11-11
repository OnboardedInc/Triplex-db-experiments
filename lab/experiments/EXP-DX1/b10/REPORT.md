# DX-B10 report
North star: P2/P5, exact pipelined per-client commits and W0 seeding.
Result: implementation committed; required final verification INCOMPLETE at the three-hour budget.

Step 1 — c5779084:
Retained the gateway ReadConfig/primitive-key changes, sweep BFS decoder repair and fixture fixes already in ancestor d2568d78.
This commit adds the bounded gate runners; no inherited package piece was reverted.
Fresh native gates: 37 tests, 53,877 assertions passed.
Fresh differential: all 300 scenarios, 95,028 comparisons, 5,664 row closures passed.
Local order/decoder units: 9 passed. Package/dependency builds passed.
The combined legacy/lean suite reached its 800-second bound after concurrent, reach, decoder and peer checks; it did not finish.
Initial container setup failed on a codec mount beneath a read-only directory; separate codec mount fixed it. Raw failures retained.

Step 2 — 236a153a, verification pending:
1. Each SDK client object owns a UUID and increasing sequence, held in a WeakMap.
2. Existing clock-ticket issuance remains; sends release on socket flush, acknowledgements overlap.
3. Each gateway client has a next sequence and TreeMap buffering up to 64 early arrivals.
4. One monitor submits contiguous entries through transact-async in sequence; no timeout permits overtaking.
5. Transaction futures are acknowledged outside that monitor.
6. A default 30-second gap deadline fails the buffered suffix with CommitOrderGap and expectedSequence.
7. Buffer, client-budget and sequence/content conflicts fail explicitly; pending identity binds connection and input.
8. Definitive validation/duplicate rejections consume their ordered turn without a database write.
9. SDK exposes DatomicCommitOrderError; expectedSequence uses the existing maximum transport field; resume requires settled calls.
10. Native conflict/replay/identity/time checks remain; each attempt uses one commit HTTP request.

Executed after Step 2: build/typecheck passed; 10 local units passed; lint had zero warnings/errors.
Long regression slice passed on both layouts: reach.test.ts (3 each), concurrent-commits.test.ts (4 each), 14 tests total.
That includes 6,400 pipelined commands, 1,000 conflicting races, nested positions and historical/cold reach checks.
Added but NOT RUN: commit_order_test.clj (8 tests including 10,000 randomized arrivals/64 in flight, gap/resend and buffer cases).
Added but NOT RUN: strict-order.test.ts (4 tests/layout: 10,000 real reordered commits, deadline/resend, duplicate and invalid-turn handling).
Step 2 short, clock/peer and fresh differential gates did not run; full-suite acceptance is not claimed.

Measurements: window 1 NOT RUN; window 32 NOT RUN; commands/s unavailable; 1,000 commands/s target unassessed.
The requested sha256:ca15387e66e25ed5e19a4adc602e941f7f06dd8b0f1c6ca7d1a5d2f02f8171ad fingerprint was NOT checked.
The queued ordering proof waited over 100 minutes without admission. Its replacement and the admitted waiting grant were stopped before exit.
An admitted queued differential grant was retargeted toward ordering/seed proofs, but never acquired the measurement lock.
All owned trial containers/volumes were removed; no other worker's lock or containers were changed.
DatomicClient.ts, RowCache.ts, reach.ts and lab/acceptance were untouched. No merge or push.

Raw outputs: /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B10/ (about 11 MiB).
Key logs: step1-native2.log, step1-diff2.log, step1-suite2.log, step2-build-unit.log, step2-build-final.log, step2-long.log, step2-diff.log.
Commands used: pnpm install --offline --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store.
Builds: node lab/bin/heavy.mjs --label DX-B10-build -- node_modules/.bin/turbo run build (Datomic, W0, host and qualification dependency filters).
Gates: node lab/bin/heavy.mjs --label DX-B10-STEP -- bash lab/experiments/EXP-DX1/b10/window.sh PREFIX bash lab/experiments/EXP-DX1/b10/gates.sh PREFIX MODE.
Executed MODEs: native, diff, original combined all, long; pending order grant was cancelled. Current runner also offers base and clock slices.
Next: reserve a window for order/native/HTTP, base/clock and the W0 seed comparison, then rerun the fresh differential and independent review.
Raw clients need an HTTP timeout longer than the gap deadline; makeDatomicRuntime already uses 35 seconds.
