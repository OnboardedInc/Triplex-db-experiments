# One API call's reads: what they cost on the store, the batched read, and the run at 1 billion

DX-API1, 2026-11-24, branch `exp/DX-API1-api-call-reads` from `origin/exp/DX-INT1` `9092eb79d`. Mac evidence:
`evidence/DX-API1/` (private). Mac times are diagnostic (a Mac shared with five builders); counts are results. Nothing
here has run on a server.

__ANSWER__

## 1. What a real API call reads (the product's handlers, counted from their code)

The product's codebase (read-only reference) was read handler by handler. The counts below are database queries one
call makes, counted from the code (each ORM relation level is one query; a lookup inside a loop is one query per
pass); they are not traced at run time. Tables and customers are not named; each call is written as a generic read
shape. "Auth" is the session, membership and permission lookups every authenticated call makes first (3 to 6
queries; they read configuration that is not subject facts, so the store's shapes below leave them out).

| # | Handler | Queries per call today (besides auth) | What they fetch | Generic read shape on the store |
| --- | --- | --- | --- | --- |
| 1 | A subject's page (the subject and, from the page, its tasks and placements) | 8 to 12 | the subject row, its custom values with the property definitions in force (one grouped query, called twice), the organization, its placements and tasks with subtasks and the forms they were made from | `subject-page`: 1 subject root + profile + 1.8 placements + 5.7 tasks + 31 subtasks + 1.4 files + the tasks' forms + 8 property definitions + the account's definitions entity, 7 levels deep (subtasks are chained) |
| 2 | A task's page | about 14 | the task with five joined relations (form, its lineage, employer, client, job type), the permission rules, the subject with its custom values, the task's latest file | `task-page`: 1 task + 5.5 subtasks + its form + subject root + profile + definitions, 5 levels |
| 3 | A list of subjects with status columns (50 per page) | about 12 | one keyset page of subject IDs (filtered, sorted, across subjects), then the 50 subjects with placements, tasks, subtasks and forms (one query per relation level, `IN` lists of 50 to 1,500 IDs), custom values for the 50 | `subject-list`: an ID list page of 50 + every subject's world (about 2,250 entities) + definitions |
| 4 | A dashboard count | 1 aggregate | a count of tasks waiting on the employer and of distinct subjects, across every subject of the account | not an API-call shape: a question across subjects (the exact sweep, XQ6); priced in section 5 only |
| 5 | A form page submission (read before write, then the next page) | 15 to 20 reads, then the save | the link's session and journey (subject, organization, its tasks with forms and sections), the submission snapshot (task, form version, pages, fields), a suspension check, the existing field values; then the save; then the next page | `form-submit`: subject root + profile + placements + tasks + forms + the task twice + its subtasks + the profile again; one save (one commit per subject's save); then the task and the root read back |
| 6 | One import row's lookups (an applicant-tracking sync) | 8 to 12 | the subject, its placement, the employer, client and job type, each by external ID; the property definitions | `import-row`: subject root and placement by ID (an external ID is the entity's ID) + 3 shared definitions + definitions + profile + the placement's task, 2 levels |
| 7 | A policy evaluated for one subject | 30 to 120 (5 definition queries, then 2 to 3 per rule node, node by node) | the subject's facts (subject, placements, tasks, custom values), the automations with edges, actions, conditions and form lineages, then each node of the rule graph read on its own as the evaluation walks it | `policy-eval`: subject root + profile + placements + tasks + forms + definitions + the policy and its 39 rule nodes read node by node, 4 levels |
| 8 | A check-result webhook | 15 to 25, plus one nested API call per field | the integration's configuration, the check order by its external reference, two field-definition lists, then per field the existing value (one query per field) before each field is written through another API call | `check-webhook`: the check's task by ID + its form + subtasks + subject root + profile + definitions + each of the task's 13 fields read on its own |
| 9 | A placement's page | about 20 | the placement with four relations, its progress row, the ranked tasks (one SQL query), the suggested tasks with two nested relations, the tasks with three relations, custom and system values with their definitions, the subject with custom values | `placement-page`: placement + its tasks + their forms and subtasks + subject root + profile + 3 shared definitions + definitions, 6 levels |
| 10 | A task's fields (public API) | about 5 | the task, its form's fields and the values | `task-fields`: the task + its form, 2 levels |

**Where "100 or more" comes from.** The product's SQL already batches: a relation level is one query with an `IN`
list, and custom attributes go through a request resolver that groups lookups. Two of its handlers do issue reads one
at a time (the policy evaluation walks the rule graph node by node; the webhook reads each field before writing it).
On this store a straightforward port has no `IN` query: the store's read is by entity, so each row the ORM would have
fetched becomes one read of one entity. That port is the one the engineering lead's sentence describes, and it is the
port measured below as `today`: 2 to 2,250 reads per call, a median shape around 50.

**The product's read mix** (from its own read load test): 60% list pages, 30% one
resource's detail, 10% a sub-resource (a subject's onboarding, a task's fields). The production write study gives the
write-path shapes (form saves are under a tenth of saves). The mix of section 7 is built from these two.

__MEASURE__

## 3. The batched read, the loader and the memo (built, default off)

### 3.1 `POST /v2/db/{db}/batch` (gateway `batch.clj`, behind `TX2_READ_BATCH=1`; the route is absent otherwise)

```json
{ "basis": { "validAt": 1795000000000, "recordedPosition": 28309866 },
  "atLeastPosition": 28309870,
  "reads": [
    { "op": "rows",  "entityIds": ["acct/a/pl:00000007", "acct/a/def/account"] },
    { "op": "rows",  "entityIdsFrom": { "entry": 0, "attribute": ":person/placement" } },
    { "op": "rows",  "entityIdsFrom": { "entry": 1, "attribute": ":placement/task" }, "pattern": { "attribute": ":task/field-0" } },
    { "op": "ids",   "account": "a", "prefix": "pl:", "shape": "pl:{8 digits}", "limit": 50 },
    { "op": "reach", "rootsFrom": { "entry": 3 } } ],
  "limits": { "maxBytes": 4194304, "timeMs": 1000 }, "from": 0, "prefetch": true, "stats": false }
```

- **One position.** The answer states `position` (and `t`). It is `basis.recordedPosition` when given (the batch
  waits for the reader to reach it, as a pinned read does), else this reader's head when the batch starts, after
  `atLeastPosition` when given (RD4's wait on the reader's own peer). Every entry is read at that position and the
  request's `validAt`. A batch cannot straddle a commit: all its entries run on one database value.
- **Every answer is the single route's answer.** A `rows` entry is answered by `storage/read-rows` (the `/read` route)
  with `entityIds` and the batch's basis; a `reach` entry by `reach/build-response` (the `/reach-many` route) with its
  roots; an `ids` entry by `ids/page` (the `/ids` route, needs `TX2_ID_LISTS=1`). Nothing new computes an answer.
- **By reference.** `entityIdsFrom` / `rootsFrom` take an earlier entry's answer: the IDs of an `ids` page, or the
  reference values of one attribute in a `rows` answer, in row order without repeats. So a call's dependent reads go
  in the same request. More than the reference's `limit` (at most 512; 64 for reach roots) is refused
  (`BatchTooLarge`), never truncated.
- **Prefetch.** Before entries run, the identity and EAVT rows of every subject whose ID is known are touched side by
  side on RD5's read prefetch pool (`uncached/touch-all!`, 16 threads by default, shared by every request); when an
  entry's subjects come from a reference, the next wave is touched as soon as the reference resolves. The reads then
  run unchanged and find the segments cached. `"prefetch": false` turns it off for a measurement.
- **Admission (the rule).** A batch holds exactly **one read permit** for all its row and reach entries, the same
  permit a single pinned read takes, and the waiting-read bound (`TX2_READ_WAIT_LIMIT`) applies to it as to one pinned
  read. Its ID list entries run first, before the permit, under the ID list pool's own admission. So one caller with
  256 entries takes one reader's share, never every permit; the gate counts it (one admission per batch).
- **Bounds and cursor.** At most 256 entries, 512 subjects per entry, 4,096 subjects per batch; answers up to
  `limits.maxBytes` (default 4 MiB, at most 8 MiB, counted in characters) and `limits.timeMs` (default 1,000, at most
  2,000). At a byte or time bound the batch stops between entries and answers `next`; the client sends the same batch
  with `basis.recordedPosition` = the stated position and `from` = `next` (entries before `from` that later entries
  reference are recomputed, not returned). `readBatch` in the SDK follows the cursor.
- **Typed refusals** (400 `BatchUnsupported`, the entry index in `maximum`): history reads, held handles, staged rows,
  ID lookups by row ID, scans (a `rows` entry without subjects), record-time bases, forward or self references,
  unknown fields or operations, a basis without `validAt`; 400 `BatchTooLarge` above the subject bounds; 413
  `BatchEntryTooLarge` when one entry alone exceeds `maxBytes`.
- **Diagnostics.** `"stats": true` adds Datomic's io-stats for the whole batch (storage loads, prefetch pool
  included), the handler thread's CPU and the batch's own time; `/v2/admin/scan-stats` carries `readBatch` counters
  and `write-options` carries `readBatch: true`, both only when the option is on.

### 3.2 The SDK helper: `CallReads` (`packages/datomic/src/callReads.ts`)

```ts
const reads = new CallReads(client, db, { validAt });          // one per API call
const [root, account] = await Promise.all([reads.rows(rootId), reads.rows(accountId)]);  // one request
const tasks = await Promise.all(placementIds.map((id) => reads.rows(id)));             // one more request
// ...save...  reads.afterWrite(receipt);  then reads continue at a new pin at least at the receipt
```

- **Coalescing.** Every `rows`, `reach` and `ids` read the handler issues before the next macrotask
  (`setImmediate`: everything under one `Promise.all`, and every continuation of the same tick) goes into one batch;
  rows reads with the same pattern share one entry and are split by entity afterwards. The handler keeps its shape: it
  is not rewritten as one query. A handler whose levels are written one after another makes one request per level.
- **What the first read pins.** The call's first batch names no position (or the caller's `position`); the gateway
  answers at its head (at least at `atLeast` when the call starts from a write receipt) and states the position;
  every later batch of the call is pinned to it. So all reads of one call see one position.
- **Read after the call's own write.** `afterWrite(receipt)` drops the pin and the memo; the next batch asks
  `atLeastPosition` = the receipt's position (RD4's at-least read: the reader waits on its own peer up to
  `basisWaitMs`, then answers at its head, at or after the receipt) and pins what it states. Reads before the save
  share the first position, reads after it the second; a call that writes reads at most one position per write.
- **Memo.** Per call and per pinned position, an entity with the same pattern, a reach root or an ID list request is
  asked for once; a second read is answered from the first answer without a request (dropped on `afterWrite`).
- `readBatch(client, db, request)` is the one-request form (it follows the cursor and checks every page's position).
- The SDK retries `ReadBusy` on `/batch` as it does on the single reads.

### 3.3 Changes to existing code (each default off; nothing changes when unset)

- Gateway `uncached.clj`: `touch-all!` split out of `prefetch!` (the batch calls it whatever `TX2_READ_PREFETCH` says;
  `prefetch!` is unchanged, its counters count only its own batches); `main.clj`: the route, `readBatch` in
  write-options and scan-stats only when on.
- SDK: `DatomicClient`'s `ReadBusy` retry list gains `/batch`; `index.ts` exports `CallReads` and `readBatch`.
- `stack/up.sh`: `DX_READ_BATCH=1` puts `TX2_READ_BATCH=1` on the read gateway (refused before the first Docker change
  unless 0 or 1). `demo/server/profile.mjs`: `DEMO_READER=tuned` gives the demo bring-up the card's tuned reader
  (three cores, 3 GiB cache in a 9 GiB heap, the early filter) beside the same 32 GiB transactor; unset, its output is
  byte-identical to before (checked).

## 7. Server run: API-call-shaped reads at 1 billion (for the day a machine is rented; none has run)

**Where it goes:** after step 2 of the next server session (`v01/READINESS.md`), in its own bring-up of the 1 billion
working copy (step 2's bring-up runs the default one-core reader for the ID lists and the sweep; this run needs the
card's tuned reader with the batched read on). It writes to the working copy (one commit of definitions per deep
account, then saves), so the copy is not reused.

```bash
# From step 1's build ($BUILD/repository at the commit that carries this page), on the 12-core, 96 GB machine.
cd "$BUILD/repository"
sudo env DEMO_READER=tuned DX_READ_BATCH=1 DX_ID_LISTS=1 DX_INDEX_QUERY_PERMITS=4 \
  DEMO_ORIGINAL="$SEALED_CLUSTER" DEMO_HANDOFF="$AGE_HANDOFF_JSON" bash demo/server-up.sh --reset
#    prints DEMO READY head=28309866 records=1000251169 t=62888918 (3 to 12 minutes)
sudo env "PATH=$BUILD/tools/bin:$PATH" API1_WINDOW_SECONDS=90 API1_CALLERS=64,256 API1_ARMS=today,loader,batch1 \
  API1_SETS=reread,random API1_SAVES_PER_SECOND=23 API1_ALONE_CALLS=20 \
  "$BUILD/tools/bin/node" --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/api1/server.ts \
  /var/tmp/triplex-demo/ready.json /var/tmp/api1-1b
sudo bash demo/server-down.sh
tar -C /var/tmp -czf api1-1b.tar.gz api1-1b   # copy back to evidence/DX-API1/server/
```

**What runs** (`api1/server.ts`; every line of `server.jsonl` is one record):
1. The reader's options are read back and must show the batched read and both pinned options (refused otherwise);
   one commit of the definitions in force per deep account (`definitionFacts`: 24 forms, the account entity, 8 property
   definitions, a policy with 39 rule nodes; about 360 facts each). The 1 billion subjects carry no task-to-form
   reference, so the shapes name each task's form literally (the same entities).
2. Warm-up: the re-read set (200 subjects of each deep account, 2,000 in all) read once per shape.
3. **Alone:** one caller, no saves: each shape × each arm (`today`, `loader`, `batch1`) × each set (re-read, random),
   20 calls (5 for `subject-list` in `today`): per-call p50 and p99, requests and reads per call, storage loads per call
   (batch arms, Datomic io-stats), reader CPU per call (the reader's cgroup), per-request p99 (`today`).
4. **Windows:** the mix below, 90 s each, for each set × callers (64, 256) × arm: 12 windows, beside saves of one subject
   each (17 rows on its first task, one commit, at 23 per second, through the product's own write path): calls/s,
   reads/s, per-call p50 and p99, the share of calls inside 50 ms and inside 200 ms, per-read p99 (`today`), reader
   cores, CPU per call, timeouts (30 s), the saves' p50 and p99, own writes not seen after the save (`form-submit`).

**The mix** (shares of calls; proposed, for the owner to correct): subject list 15%, subject page 15%, task page 15%,
task fields 15%, placement page 10%, form submission 10%, policy evaluation 8%, import row 7%, check webhook 5%. Basis:
the product's read load test (60% lists, 30% one resource, 10% sub-resources) with lists cut to 15% because the test's
lists span six kinds of resources of which subjects are one, and the write-path shapes at a third of calls.

**Duration and cost:** bring-up 3 to 12 min; definitions and warm-up 2 to 4 min; alone 3 to 8 min (54 cells; the
random `today` list pages are the long ones); windows 12 × (90 s + about 20 s) = 22 min; down 1 min: **31 to 47
minutes, USD 0.56 to 0.85** at USD 1.09 per machine hour (ceiling 60 min, USD 1.09).

__PREDICTIONS__

__REST__
