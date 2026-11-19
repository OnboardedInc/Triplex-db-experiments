# Proposed rule for the lazy publication mode

North star P5. The one-second experiment measures an immediate release from its scheduled offer to its durable receipt and its first verified cold response. The frozen P5 sweep separately requires a fresh evaluation of every roster member. The owner must decide which meaning the product may advertise. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Read visibility

The activation asserts one fact in the account’s own durable database. It contains the immutable release hash, effective instant, authorized business slot and account profile. Its native assertion identity distinguishes a rollback from the earlier use of the same rules. The journal supplies the wakeup and the original command receipt. Activation reads only account metadata.

Capture the authoritative position and the requested valid instant at read start. Resolve a record-time pin to the last eligible native position in the strict account. At that prefix apply W0’s ordering by effective instant, native position and release hash. Every read uses the same position and microsecond instant for its complete world. A new account database generation or an erasure invalidates old cached bytes. Historical requests obey the current erasure barrier. Point reads and listings have no publication authority. A cached historical fill can only populate its exact key.

## Admission and recovery

Ordinary proposals name a scope, generation-bound computation, subject, source position and authorized live business instant. The service assigns the instant. A worker may present a proposal for validation but cannot supply replacement work items. Recompute from the authoritative world and compare the full witness. Verify enrollment, previous item state and the absence of an earlier unclosed source event. Compare the original position again against the native transactor’s actual predecessor in the same commit as the item and pending changes. This conservative comparison also retries on unrelated same-account writes.

The account consumer can accept an ordinary worker’s own current single-person source event. It verifies the ordered event identity and binds the original witness, items, pending keys and cursor in the same transaction. Earlier debt, a partial range or a multi-person event stays with the dispatcher. A closed cursor must trace back to its native publication and source receipt.

An ordinary no-change reconciliation has a read response and zero subject writes. It has no durable per-call receipt. A changed command can recover its original receipt after restart. W0 C82 exposes a subject guard after a no-op and C123 accepts different supplied records at equal clocks. Those pure operations retain their existing behavior. A live application cannot mint two different genuine decisions over identical inputs. [W0 sections 8.8–8.9](../../../world/W0/SPEC.md)

## Pushed work

One consumer owns the ordered effect prefix per account. A compulsory release, source mutation or due boundary is reconstructed at its own cut. A scheduled boundary precedes the first later-arriving source command with a business slot at or beyond it. A release newly committed at the same instant can win at its own position. A correction can change an old screen while an earlier genuinely owed effect remains payable. The consumer checks its predecessor and event identity and atomically appends the changed owners’ items, retirement flags, pending entries and new cursor. A live writer cannot jump a gap.

A sealed, ordered source roster includes people with no facts. Release-independent indexes track location membership, pay bands, state and local floors, reverse references and due dates. The initial R1 baseline is an explicit migration. For subsequent changes between R1 and the local-floor releases, seek locations whose local floor exceeds the state floor or has no state floor, then members paid below it. R2/R3 overtime edits require zero release-only W0 deliveries. Source mutations and real deadlines have their own ordered work even when that release predicate is empty. Unsupported releases or incomplete indexes cannot close a range. On restart the pilot rebuilds its disk-backed projection from the native journal.

Send creation, changed payload and reappearance in W0 order. Retirement preserves sequence and sends nothing. A recipient transaction persists an effect and its idempotency key together. Sender acknowledgement follows durable recipient application, and later IDs for the same subject wait behind an earlier unacknowledged one. A complete push proof and final recipient application have their own clocks.

Protected E-Verify submissions remain ineligible until the owner defines which intent may survive erasure. Replay encountering erased evidence leaves the affected event open. The read gate verifies redaction at prior pins. Physical shredding, legal retention and migration of an existing outbox/receiver baseline need separate qualification.
