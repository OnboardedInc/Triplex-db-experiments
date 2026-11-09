# GS12F round 3 evidence index

`adversarial.test.ts.original.txt` and `controls.test.ts.original.txt` retain the reviewer probes from verify/GS12F (`6bab84e`) byte-for-byte. `qa-probes.test.ts` and `qa-controls.test.ts` run copies against this worktree. Imports, output paths and formatting are adjusted; the old memory-integer rejection probe is replaced with a successful real callback/commit/get check because rejection is the bug this round fixes.

The persistent boundary suite is `test/integration/test/value-domains.test.ts`, included by both the integration package and this directory's Vitest configuration. It calls actual codecs without engines, then checks every profile at the public pre-claim boundary. FoundationDB shares the KV codec; this is no claim about native FoundationDB key/transaction limits.

Run `node lab/bin/heavy.mjs --label CX-GS12F -- sh lab/experiments/EXP-GS12F/round3/gates.sh <new-attempt>` from this worktree. The runner refuses admission below 5 GiB free. Each attempt retains raw output, independent exit codes and a source manifest; those are builder observations, not acceptance receipts. No engine or exclusive slot is used. QLever's earlier live timeouts remain DIAGNOSTIC under Q91a/R35.

`evidence/attempt-1/` is an intermediate failure: its 64 KiB cap rejected an existing KV large-string regression and its new integration test had TypeScript errors. Subsequent source raises the admission cap to 1 MiB and corrects the test harness. `typecheck-initial.log` and `preclaim-initial.log` precede later changes. `integer-2.log` records an incorrect Vitest working-directory invocation, not a semantic failure.

`cache-cleanup.json` records deletion of this worktree's generated package-consumer trees and npm download cache after their commands terminated. Historical tarballs and pack logs remain; consumer trees can be regenerated. This supersedes the earlier report's statement that those consumer trees remain present.
