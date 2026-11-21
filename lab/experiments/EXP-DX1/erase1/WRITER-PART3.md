# Removal checks in one database

## Reusing a removed identity

The baseline accepted a save using the original assertion ID after Datomic had physically removed the row from history. The save returned HTTP 200 and left a committed receipt. The new write check asks the durable removal record about every new assertion ID. The native history check still runs for ordinary duplicates.

`ledger-reuse` proved the check for the original person and for another account in the same Datomic database. Each reuse returned HTTP 409 `ErasedAssertionIdentity` and left no receipt. Each matching fresh-ID control committed and returned the saved value when read back. This closes the application write path exercised by the test, including the raw-row case in the earlier [writer report](../wfix1/REPORT.md). A normal detached cleanup removes only encrypted value bodies.

The diagnostic removes the exact planted row from native history after a real recorded removal, verifies the new native cut, and then offers the original clear-synthetic assertion ID through the public write route. It verifies the actual operation receipt, checks the fresh-ID control at the destination, and checks that the removed ID did not reappear. The launcher records the fresh source, slot, compiled JavaScript and nonce, and checks removal of its stack and owned volumes.

## Independent saves and removal

The per-person writer includes the current removal sequence in the same native transaction function that checks the person's revision. The sequence check reads the installed scope flag and adds no writing turn. Regular writes in the unsealed protected fixture skip the scope's file lock. The reference writer retains its sequence check, and writes carrying an explicit source ticket still use the source lock. Removal itself checks its selected predecessor position on the native transaction cut. If that position moved, the removal first looks up the original operation before rebuilding an unpublished plan.

`ledger-parallel` paused one person's plan before native submission. A second person in the same account and a third person in another account each committed through the per-person writer while that plan was paused. Their receipts were positions 4 and 5, followed by the paused person's receipt at 6. After a real removal published at 7, an earlier per-person plan returned HTTP 409 `CasConflict` and left no receipt. The test reads back all three accepted values by their exact assertion IDs and checks the selected native writer on all three replies.

Sealed field writes still use the file key store and its writer lock. An in-progress removal may temporarily decline requests while the native mirror catches up. The quiet-neighbour server arm measures that wait with the same database and surrounding controls. The small native check for that arm exercises content and feed continuity.

## Quiet-account check

`fast-neighbours-smoke` checked all 40 saves and their actual feed receipts. The removal and cleanup blocks both overlapped a quiet save. Four held-read loops kept returning the same pinned rows. The removal matched the exact set of 100 planted values and returned the marker at its old pin. The cleanup matched those same 100 encrypted value bodies. The Mac smoke emitted counts. The prepared server arm uses 500 saves per block and compares each loaded block with both surrounding controls. [Server command](MODEL.md#prepared-quiet-account-comparison)

## Work after a Publish receipt

A protected source supplies its removal sequence when the release marker is written. Settlement rechecks that sequence when it loads the marker and when it returns archived output. The recorder also attaches the source sequence to durable packets and its cursor. Protected source worker copies use guarded reads because a detached whole image can carry values beyond the source cut. Direct unsealed archive export refuses a protected source.

The first held-queue test let both stale writes commit. It moved the settlement and notice heads from 1 and 0 to 2 and 1 after publication of the removal. The fix binds the source database and sequence to the exact destination claim while it waits, then includes both in every native write format. The gateway holds the source guard through the recipient write and checks the current sequence under that guard. Old archived output is refused by the application reader. Rebuilding obsolete work and migration of historical, unsealed copies are separate from that refusal.

The final native check returned both stale-sequence refusals with heads held at 1 and 0. The held-queue check plants a protected field, stores actual owed-release output as its control and holds two fresh writes before opening the native turn. It publishes a removal on the source while both writes wait, then checks the exact submitted database and sequence on both actual HTTP frames. It requires the native stale-sequence error, unchanged destination heads, rejection of the archived output and no protected copy image creation. The SDK transport tests check the serialized source ticket with and without a separate source database.

The quiet-account check verifies the native feed against every new save receipt and compares the returned pinned rows to the exact saved control rows from this attempt. Its fixtures use the same one-database gateway identified by the launcher. The deferred-write check verifies both destination heads and captures fresh exact HTTP source tickets under the same owner, attempt and source bindings. The new checks emit observations and fail if their content, current attempt or bindings disagree. Mac timing remains diagnostic.

[Evidence hashes relative to the experiment evidence directory](P3-WRITER-SHA256SUMS)

## Reopening a pinned Publish answer

The merged reader's local memo used the account's mask revision. A native removal advances a separate sequence. The old reader still returned its memoized E-Verify submit instruction at position 2 after the native removal reached sequence 1. A fresh reader at the same pin returned different bytes. The new check uses a separate synthetic account because the joined Publish install already refuses protected inputs that lack a retention rule.

The fix includes the verified native sequence in the old-pin memo key and stops the protected packed shortcut from opening without an authority check. It starts the first check alongside the account-head read. The native regression warms the memo, removes the exact synthetic assertion, compares the reopened reader with a fresh reader at the same basis and requires the erased-SSN task with no E-Verify submit instruction. The archive-write checks continue to verify both destination claims on the source's old sequence.
