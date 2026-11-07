# Process cleanup and backend recovery are separate

Tags: goal:6, goal:7, goal:9, problem:recovery, status:observed

The controller can observe owned process-group termination and retain result
bytes. It cannot infer whether a server committed a command or stopped work
merely because the client exited or its request timed out. Record command IDs,
full receipts, returned cuts and ACK delivery; reconcile uncertainty through the
owning backend before retrying mutations or releasing forensic state.

The controller conservatively holds stale owners/reservations and refuses
cleanup of unknown state. Its generic cleanup removes only explicitly declared
rebuildable scratch. Receipt/result files remain. Native fixture/database
deletion, lost-ACK reconciliation and service restart are separate qualified
recipes; the CLI does not silently guess their outcome.

All active input identities and first-failure receipts remain preserved. A corrected rerun has a
new attempt/terminal record and a reason. For a changed implementation or proof
contract, create a new job rather than relabeling old results.

The fresh QLever correlated-negation packet hit its existing2GiB cgroup limit.
The engine remained the same owned container and its UNKNOWN2GiB reservation
stayed charged. A recovery helper restarted that exact container, then audited50
persisted ACK/position/claim/history checks without changing the retained data.
Its first256MB helper allocation failed the Mac process-group watchdog before
restart. The512MB retry performed the audits but failed a byte oracle because
the authored expected file used a different JSON layout. A new read-only v3
observation matched the corrected independently authored oracle. All failures
remain; none is rewritten as a pass.

`resident-refresh` subsequently verified the actual recovery artifact and the
fresh private-daemon identity/caps/new startup time before returning the owner
to ACTIVE. It retained the original reservation and token and wrote an immutable
recovery proof. This is read-OOM recovery evidence, not a write-crash durability
claim. Independent recovery/failure-artifact review:
`.artifacts/failure-artifact-independent/2fcad030-b550-40dc-a1f3-fc28fc660517/review.json`.

Tags: `#read-oom`, `#resident-recovery`, `#first-failure`, `#exact-result-bytes`.

An observed admission gap survived between an engine OOM and explicit reconcile:
the cached owner still said ACTIVE, so `qlever-negation-minus-family12-v1` was
admitted against the stopped server. That retained attempt is setup failure,
not MINUS semantic or performance evidence. The current pre-grant repair freshly
checks each required Docker CID/image/running state/caps/owned mounts/StartedAt,
or each Mac PID birth identity. Any mismatch or unavailable observation is
durably UNKNOWN before refusing the grant; the reservation remains and no
attempt/child is created. Healthy grants retain their fresh observations.

The current23-test suite passes actual stopped-Mac-owner denial, healthy birth
proof, changed identity, stopped/restarted Docker observations and resource-cap
rejection alongside the earlier controller gates. Independent actual stopped-aux
review [passes five checks](../../.artifacts/required-owner-independent/c3a76549-6a2b-4fc4-8766-06bae324dd1e/review.json) and leaves the canonical foundations untouched. It copies
the real released/stopped auxiliary's prior owner proof into isolated component
ACTIVE state, then observes fresh rejection, durable UNKNOWN, unchanged reservation
and zero attempt/child. A real live own PID with mismatched birth is also refused.
