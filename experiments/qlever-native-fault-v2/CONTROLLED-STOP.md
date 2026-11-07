# Explicit main-Q controlled-stop disposition for review

Status: proposed, not authorized/executed. This replaces the PLAN's earlier
SIGTERM-wait branch. We must not repeat a known timeout as evidence of grace.
The actual prior [maintenance receipt](../../provenance/storage-maintenance-20261106.json)
records Docker's60s timeout followed by SIGKILL: exit137,OOMKilled=false, no query
in flight. That is an observed process termination, not clean shutdown or a
verified graceful administrative path. This proposal does not assert a new
signal handler from differently versioned source.

## Selected stop semantics

After the separately reviewed gates below, send **one explicit SIGKILL to the
exact main CID** and classify it `CONTROLLED_NATIVE_PROCESS_STOP_NOT_GRACEFUL`.
Do not send a cosmetic SIGTERM first, wait a predictable60s, or call the result
clean. No power-loss/fsync durability claim follows. Fault-container processes
use a separate init profile; main's existing CID/configuration is unchanged.

No stop is permitted unless all of these actual preconditions hold:

1. Root grants a bounded exclusive Q maintenance sequence. No active or granted
   Q client job, no unknown/unreconciled update outcome, and no new Q admission
   is allowed during it. Other physical engines need not be stopped.
2. Fresh private-daemon inspection matches main CID/image/labels/caps/mount and
   its registered StartedAt. Planner100 is read back. A bounded native active-query
   observation is empty twice, and all registered owned client groups are gone.
   These checks supplement, rather than replace, reconciliation of writes.
3. A canonical read-only preflight records actual scope/P/R/claim/operation state
   and bounded full serialized row-payload digests at the current source cuts,
   including both load scopes atP8. Enumerate actual scopes; the local
   `ack_inventory.py` catalog is only a retained-report authority index, not a
   complete live inventory. Earlier individual ACK gaps remain explicitly gaps.
   Intentionally damaged test scopes are preserved, not silently repaired.
4. The preflight binds exact available ACK/command references and all current
   scope frontiers to a continuity baseline, independent expected fault payloads,
   source/build/daemon identities and storage headroom. The maximum input snapshot
   remains224MiB and the declared canonical resource/disk profile applies.
5. Preserve actual native metadata, source file paths/sizes/live hashes and all
   raw results before stopping; label live hashes as live, not a closed snapshot.
   Any unexpected change/unknown native work stops the sequence for review.

After SIGKILL, prove exact CID `Running=false`,guest PID0,exit137 andOOMKilled=false.
Do not use a guest PID as a Mac process identity. Hash all stopped authoritative
files and bind the immutable source manifest. Unexpected loss, unresolved write
or file change blocks fault execution and preserves the original bytes. Never
replace, repair, delete or restore over the main data directory automatically.

Before injecting any new native fault, a first bounded copy must load and match
that continuity baseline. A mismatch is a controlled-stop/reload failure, not a
later fault-case result: retain it, abandon the fault packet and prioritize
same-CID main restoration plus an explicit unresolved-state report. No old or
new ACK is silently discarded to make the copy pass.

## Canonical reservation handoff: retain main's UNKNOWN reservation

The existing main owner remains registered asUNKNOWN, with its2GiB/1.5CPU
reservation held throughout downtime. Do not release/re-register it merely to
free capacity. This preserves the original owner token/recovery history, blocks
ordinary required-owner Q jobs, and permits the existing anchored
`resident-refresh` path on the exact same CID after restoration.

A fault container is a distinct2GiB/1.5CPU canonical Docker owner; client work is
896MiB/1CPU. The conservative Q reservation is therefore4.875GiB/4CPU while main
is stopped, even though only one Q server may be live. XTDB's3GiB/2CPU remains
charged. Some peers can co-run, but all three client groups may not fit10GiB/8CPU;
ordinary vector admission decides. No global serial-performance policy or new
capacity is invented. Guest physical memory is XTDB3GiB+oneQ2GiB+OS1.25GiB.

There is one concrete controller prerequisite before operational implementation:
`registerResident` currently requires an already running container. A new fault
server must have its2GiB reservation **before** startup and retain it if its Mac
controller disappears. A brief unreserved container start or a fake host keeper
PID would not satisfy that requirement.

The minimal proposed extension is an explicit `prepared-stopped` Docker resident
mode: fresh exact private CID/image/label/cgroup/mount proof withRunning=false,
allocate the normal budget asUNKNOWN, allow no required-owner trial yet, then
use the existing fresh anchored readiness/`resident-refresh` mechanism after
startup. No service is started by registration. Tests must cover cap/identity
and capacity refusal, no child start, unknown reservation retention on abort,
no ordinary trial before readiness, and same-CID successful readiness/refresh.
This is a proposal, not a request to hand-edit canonical state. Root must approve
and independently verify that narrow controller path before a fault executor
can be operational. No SDK or engine rewrite is required.

At case end, retain its reservation until fresh stopped proof, then release only
that case owner. At packet end all fault CIDs must be stopped/released. Restart
main with its exact original CID/image/caps/mount/config under its retainedUNKNOWN
reservation, run a separate canonical read-only continuity/readiness job, and
refresh only after the anchored proof passes. This recovery job is separate from
fault-case success: a failed case remains failed even if main restoration passes.
No resource gap, retroactive PASS, larger heap or unrelated restart is allowed.

## Authorization boundary

Only source/policy/model review has occurred. The source-only local checkpoint
and passing six pure policy tests grant no signal, checkpoint, snapshot copy,
volume creation/mount, new server, native fault or recovery action. Root's review
must explicitly approve this controlled-stop disposition and the actual updated
executor before any such step.
