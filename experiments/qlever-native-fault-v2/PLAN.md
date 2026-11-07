# Modern QLever native fault packet: review proposal

Status: **source/plan only; no service pause, copy, mount, new server or fault is
executed or authorized by these files**. The original
`experiments/qlever-managed-writer/` packet remains unchanged historical input.
This replacement must be reviewed before operational code is enabled. The
policy module contains pure validation/redaction helpers, not an executor.

The native-only rate16 run returned448 correct reads and32 deadline errors,
and failed the in-window writer floor. All six commands reconciled during drain
and planner100 remained selected. Its
[retained receipt](../../qualification/evidence/qlever-native-only-rate16-load-v1-failure.json)
separates this from wrong-answer, OOM, durability or cancellation acceptance.
These faults target correctness at the native writer boundary, not a repair or
rerun of that load profile. Q stays query-idle during the separately granted X
measurement window.

## Fixed foundation identity and replacement budget

- Private Docker daemon only: `83f54592-d273-4f4e-9f03-4b0b7c1dd105`, reached
  through the existing owned environment wrapper. Never default Docker/Colima.
- Main CID: `e225d359e2a8211de8c5b3551e1aff8952b92b41922c4f90505ca4c6afc30b3f`;
  image `sha256:37d5ede193f1bffb6aebf734d15d2a4c2a3228ee102858b0c6c2e65c149a78ec`;
  runtime0.6.0/6c5861a; main `/data` binds only
  `/Users/sam/projects/triplex-db/.runtime/engines/qlever-main/data`.
- Main/fault cap2GiB memory and swap,1.5CPU,pids256,nonroot501:20; native
  query-memory512MiB/cache64MiB/entry32MiB,j4,planner100. The fault container has a
  read-only root filesystem, explicit init/signal forwarding and bounded64MiB
  `/tmp`, charged inside its cgroup. New fault logging driver is `none`; a bounded
  redacting stdout attachment begins after readiness. Startup banners are not
  retained, and logs are not used as the readiness authority.
- **Stop main Q completely**, prove `Running=false`, and retain its canonical
  UNKNOWN reservation throughout downtime. Commission at most one separately
  reserved2GiB fault server. Docker pause/freezer is not a physical replacement.
  The [controlled-stop disposition](CONTROLLED-STOP.md) binds the known PID1
  behavior and conservative4.875GiB total Q reservation; no unreserved startup.
  XTDB3GiB plus fault2GiB plus VM OS1.25GiB fits the existing8GiB guest. Mac
  controller/broker/client reservation896MiB/1CPU is separate; no new VM or larger
  engine heap is assumed. Global max3 heavy/10GiB/8CPU still applies.
- Only main Q may be stopped; the existing XTDB, default VM and other services
  stay unchanged. New fault CIDs have exact case labels, image/caps/read-only
  roots/ports/mount proofs and a distinct canonical owner. Main CID/data are never
  replaced. All project-owned Q CIDs are checked by exact owner/backend labels,
  including today's `triplex-db-qlever-main`; no historical name-prefix filter.

## Storage and immutable-source fencing

The live source observation is26 regular files,139,100,350 logical bytes and
152,145,920 allocated bytes, with no symlinks. This is reservation evidence, not
a consistent snapshot. The latest whole-project guard counted19,924,299,776B
including the original ZIP, with28.9GB free inside the hard45GB image. The hard
project limit remains50,000,000,000B and operational stop46,000,000,000B.

Reserve2GiB additional task disk before any action. The proposed fault-data
boundary is one new task-owned **1.5GiB fixed-address-space APFS sparse image**
(3,145,728 sectors) inside the existing owned image, mounted only under a fresh
`.runtime/qlever-native-fault-v2/<packet-id>/` directory. Three retained case
directories share that hard1.5GiB boundary. Native root is read-only; native `/tmp`
is capped; broker/trace/journal caps fit the remaining reservation. Its backing
is already inside the outer image and is never double-counted as inner VM/data.
No disk resize, unrelated quota change or global automount configuration occurs.

The stopped authoritative source must be at most224MiB; larger input blocks the
packet for review. Each case starts from a byte-verified full copy of that source,
with fresh inodes and no links back to main. A case allows at most8MiB of synthetic
payload and bounded journal/trace output. Whole native snapshots may briefly
retain old/new delta files; their footprint is charged. The shared case volume
is the hard fault-data ceiling; per-directory observations are not called quotas.
If nested-volume sharing or exact bounded-volume enforcement is unavailable, the
packet stops before native startup rather than pretending polling is a hard cap.

Hash every authoritative main file after stop. Verify identical paths/bytes
before each case, after all faults and before main restart. No file under the
main data directory is writable from a fault container. Existing main and copied
forensic data are retained; no automatic deletion makes a case fit.

## Ordered operational protocol awaiting review

1. A canonical read-only preflight inventories current acknowledged scope/cut,
   command/attempt receipts and full bounded expected fault payloads; it verifies
   the exact private daemon/main owner, cap/mount/start identity, planner100 and
   no active Q query. Include both new load scopes at their final P8 and all
   business/foundation/native-entry ACK references available in retained receipts;
   enumerate and bind the actual current scoped payload/claim inventory as a
   separately charged continuity baseline. Reports that omitted individual ACK
   details remain an authority gap; a fresh baseline cannot retroactively prove
   those older acknowledgements. Do not use an old45-fact fixture or pretend the earlier70-audit/17-scope proof covers later writes. Freeze a full source
   hash manifest only after stop.
2. Acquire the exact canonical maintenance/resource grant and satisfy every
   gate in [CONTROLLED-STOP.md](CONTROLLED-STOP.md). The selected proposal is an
   explicitly reviewed controlledSIGKILL after ACK/continuity preservation, not
   a repeated knownSIGTERM timeout or a claim of graceful shutdown. No stop is
   currently authorized. Main remainsUNKNOWN/reserved; a prepared-stopped fault
   reservation must exist before any fault server starts.
3. Create/mount only the new bounded fault volume, copy the frozen source and
   verify every member hash. Commission a stopped case-specific container under
   the replacement reservation; start/register only after exact labels, cgroup,
   port, image, nonroot and writable-mount proof. Native readiness must prove
   version6c/planner100/cache settings and the complete copied baseline.
4. Run one reviewed case at a time through the canonical queue. Each mutation
   rechecks exact fault owner and that no other owned Q is running. Native query
   IDs, timeouts, registered activity and final outcomes are recorded without
   changing shared engine caps. Stop that case on any unknown ownership,
   partial-payload, source-drift, budget, cleanup or recovery condition.
5. Stop/release the fault owner only with fresh actual stopped proof. Retain each
   case's volume/data, journals, full bounded payload oracles, container identity,
   redacted logs and failed outcomes. At most one fault server is live. Never
   infer cleanup from a dead Mac broker or its process group.
6. Recheck original main hashes unchanged, restart **the same main CID** with
   original caps/mount/config, perform a fresh canonical native readiness plus
   declared full ACK/history/claim reconciliation, and refresh its existing
   UNKNOWN foundation identity through the reviewed controller API. No manual state edit,
   unanchored PASS adoption or silent larger heap. Restore planner100 and verify.
   Unknown cleanup/recovery retains reservation and blocks ordinary Q trials.

## Three separately reported native cases

- Registered running update cancellation: prove the exact native query ID is
  active, send a real websocket cancellation request, observe final HTTP/error
  and active-state settlement, then close/reload and verify every bounded payload
  row. A sent frame, aborting the caller, timeout alone, or missing registration
  is not physical cancellation proof; the last outcome is INCONCLUSIVE.
- Snapshot publication permission failure: on the copied case only, run as the
  real nonroot UID, make the target directory unwritable, and prove an actual
  new-file creation is denied. Exercise the real native publication path, retain
  the error/outcome, restore only owned permissions and close/reload. Existing
  writable file descriptors do not establish denied snapshot creation. No chmod
  or permission change touches main data.
- Native completion before broker ACK: terminate only the named owned broker
  child at the declared native-publication/ACK boundary. A different process must
  resolve the same durable operation without blind replay. Independently compare
  complete old/attempted/next payload sets, counts, content digests and operation
  receipts after reload; marker-only success is insufficient. Two independent
  writer processes and a shared fsynced lock/journal must actually be exercised.

The expected oracle is a fresh deterministic native graph with an explicit packet
namespace and bounded payload, generated independently of native query results.
The copied main graph is also checked unchanged. Closed/reloaded old-or-complete-new
outcomes are explicit per case; any mixture is failure. Old offline/model PASS
receipts are not new native execution.

## Secrets, evidence and scope

All token values remain in owned0600 files/process memory. Tool argv never embeds
literal tokens. Full Docker inspect/startup logs are never printed or copied into artifacts;
new fault containers disable daemon log retention rather than inheriting the old
startup-token logging behavior. The original main daemon logs stay untouched;
selected identity fields are copied and raw log chunks are redacted **before**
writing a bounded artifact, including a token cut at a capture boundary. Record
safe error class/code/hash instead of raw errors that can echo secrets. The
observer's independently found/fixed error-echo problem motivates this rule.

Every attempt preserves source/controller preimages, independent oracle bytes,
container/cgroup/mount/VM receipt, pre/post storage, query IDs, actual cancellations,
ACK/unknown outcomes and cleanup/recovery evidence. An independent verifier must
inspect the packet's complete rows and failure phases before any qualification.

This native broker packet is a **component candidate**, not full Triplex SDK
transaction acceptance or power-loss proof. Public callback/CAS/command receipt,
read-your-writes, independent SDK writer, staged rollback and unknown-outcome
integration need their own bridge gates. A native helper cannot silently replace
shared Triplex writes merely because a raw fault packet passes. No performance,
full ten-goal,256-client or target-scale claim follows.
