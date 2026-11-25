# One API call's reads: what they cost on the store, the batched read, and the run at 1 billion

DX-API1, 2026-11-24, branch `exp/DX-API1-api-call-reads` from `origin/exp/DX-INT1` `9092eb79d`. Mac evidence:
`evidence/DX-API1/` (private). Mac times are diagnostic (a Mac shared with five builders); counts are results. Nothing
here has run on a server.

**Answer (2026-11-24; Mac toy counts, diagnostic times; nothing has run on a server).**
- **One real API call today is tens to thousands of HTTP round trips.** A straightforward port reads entity by entity
  (the store has no `IN` query): a subject's page is 44 reads in 44 requests, 7 levels deep; a policy evaluation 61;
  a form submission 30 plus the save; a list page of 50 subjects with status columns 1,524. On the toy, a subject's
  page costs 33 to 46 ms of reader CPU per call under load (the Mac; about 50 ms on the server by the calibration
  below), 43 ms alone (p50, 102 ms p99); the list page 2.3 to 2.8 s of CPU and 1.2 s alone.
- **After the batch:** the same handler through `CallReads` (the loader) makes one request per level (5 for the
  subject page, 8 for the list page) and the one-request form makes 1. Reader CPU per call falls 2.0 to 4.8 times for
  the subject-centred shapes at 16 and 64 callers (subject page 33 to 46 → 10 to 14 ms; policy evaluation 62 to 76 →
  15 to 19 ms; a task's fields, 2 reads, 1.2 to 1.3 times), and 14 to 43 times for the list page read as 50 reach
  worlds (warm 2,790 → 65 ms, cold 2,173 → 155 ms); calls/s on the same reader rise 1.7 to 4.3 times (subject page
  46 to 54 → 163 to 222 calls/s); the subject page's alone p50 is 3.2 times lower (43 → 14 ms).
- **Can one call's reads straddle a commit today? Yes, and on the toy under saves they did in 26.5% of calls:** 97 of
  366 unpinned subject-page calls read a subject's root and its first task at two positions (a save writes the same
  value to both in one commit; the call saw two different values), and the reader's head moved during every one of
  the 366 calls. Pinned by hand (one `/basis` call first): 0 of 379. The loader: 0 of 1,052. The one-request batch:
  0 of 1,436. Unpinned reads after the call's own save missed it in 28 of 512 form submissions (5.5%; up to 9 of 48 at
  16 callers); the loader's and the batch's at-least reads missed 0 of 512 each.
- **Gate: 45,102 comparisons, 0 differences.** Every batched answer (the loader's and the one-request batch's) equal
  to the same read issued alone at the same position: nine shapes, at the head, at the seed cut and at a middle
  position, then at the head with 145 saves running; every call read at one position (two for the call that saves);
  12 of 12 refusals typed; a 64 KiB byte bound split one batch into 3 requests with answers equal to the unbounded
  one; a 12-entry batch took 1 read admission (3 permits).
- **Predicted at 1 billion (one 3-core tuned reader; section 5):** alone, every subject-centred shape's whole call is
  inside 50 ms with the batch (2.8 to 31 ms re-read, 6 to 36 ms random; the form submission 35 to 108 ms including
  its save); today the subject page, the policy evaluation and the form submission straddle 50 ms (low and high
  estimates 19 to 66, 33 to 81, 28 to 148 ms); per read today 3 to 15 ms alone, so "each read under 50 ms" holds
  for one caller (not for the list page's 1,524 reads queued on 3 permits). **At 256 concurrent callers nothing meets 50 ms or 200 ms per call, batched or not**: the reader saturates (calls/s =
  2.7 cores ÷ CPU per call), so a subject page's p50 is about 4.7 s today and 1.7 s batched; per read p99 today about
  0.25 to 4 s. At 64 callers only the smallest shape (a task's fields, 2 reads) stays inside 200 ms. **Cold worst
  case:** the list page of 50 random subjects, 1.6 to 2.4 s alone today and 0.2 to 0.3 s batched (about 130 to 570
  storage loads); a random subject's page 23 to 125 ms alone today.
- **What it meant before the floor work:** the batch takes the round trips out (1.7 to 4.3 times the calls per core)
  and makes every call one position; 256 subject pages at once inside 50 ms p99 would have needed about 175 reader
  cores (about 44 for 200 ms). Superseded by the next bullet.
- **The floor (section 10, added the same evening): about 1.4 ms of reader CPU per subject page on the Mac for
  subjects in memory, 2.1 ms on the server; 5.4 to 9.4 ms for random subjects at 1 billion (a model).** Where the
  CPU of the 44-read batch went: building tagged wire rows 21% of the call, JSON encoding 18%, the fixed HTTP request
  30%, Datomic index seeks 11.5%, row-text decode 6.4%, position resolve under 1%. Three steps took it down: the batch
  stopped re-parsing its own answers and its prefetch touches one seek per subject (14.1 → 10.0 ms on the Mac); the
  subject page as **one world read** (reach of the subject, which emits stored row texts and keeps parsed entities by
  revision) plus the account (11.1 → 1.9 ms); and **definitions kept in the product process by release hash** (1.9 →
  1.4 ms; it removes 13 of the subject page's 44 reads and 53 of the policy evaluation's 61). A decoded-subject cache
  was not built: it already exists on the world path (parsed entities by revision, about 0.3 to 0.4 MB per subject),
  and decoding is 6 to 9% of a call. Gate at the final code: 165,813 comparisons, 0 differences, 670 saves, four
  release changes.
- **The 50 ms and 200 ms bars are reachable with the floor.** Subject pages, server cores at f = 1.5:

  | Cores | 64 in flight | 256 in flight |
  | --- | ---: | ---: |
  | Re-read, p99 ≤ 50 ms | 5.1 | 20 |
  | Re-read, p99 ≤ 200 ms | 1.3 | 5.1 |
  | Random, p99 ≤ 50 ms | 18 (13 to 23) | 72 (52 to 91) |
  | Random, p99 ≤ 200 ms | 4.5 (3.3 to 5.7) | 18 (13 to 23) |

  That is about 426 subject pages per second per reader core for subjects in memory and about 121 (96 to 167) for
  random ones (today's port 14 and 13; the entity batch 54 and 45). 1,000 subject pages per second need about 4 cores
  re-read and about 15 random.
- **The floor's exactness and privacy gaps, closed (section 11, added the same night).** The parsed-entity cache
  predates this branch (`a3a499680`, 2026-11-10, on the one branch; every world read uses it). A removal on request does
  not move the revision it keys on (3 → 3); every answer masks the value, and now each reader also drops the removed
  entities' parsed entries when it first sees the removal (a first version missed drops when the sealed-key worker saw
  the removal first; fixed). Gate: 6,208 probes over removals (by assertion, entity and attribute, entity; sealed and
  unsealed), a removal committed but not published, settlement-shaped frames, an import, creations, a restarted reader
  and a stopped one, on two readers that each cached the worlds: **0 removed values served, 54,048 world entities equal
  to the rows route, 0 verification errors**. The definitions cache now checks each kept entity's revision and the
  removal sequence at the call's position: **167,357 comparisons, 0 differences, with 4 writes that change definitions
  without the marker**; two markers are refused (`DefinitionReleaseAmbiguous`, 84 of 84 cached calls that read the
  marker). A world follows outward references only, so a shared employer costs the same 5 entities at 1, 100 and
  10,000 sharing subjects; `stopAt` covers a shared entity that lists its members. A request's fixed cost is about 0.5
  ms of the floor's 1.9; keep-alive is on and compression off already; row texts for the account would save 0.43 ms
  (proposed). The floor moved to 1.56 ms on the Mac (2.34 on the server): about 385 subject pages per second per core
  re-read and 112 random; 256 in flight inside 50 ms need about 23 and 77 (55 to 100) reader cores.
- **Server run** (section 7): one bring-up of the 1 billion working copy with the tuned reader and the batch on, arms
  `today`, `batch1` and `floor` (worlds + the definitions cache), alone cells, 12 windows of the subject-centred mix at
  64 and 256 callers and 6 of the list page at 8, re-read and random subjects, saves at 23/s: 33 to 49 minutes, USD
  0.60 to 0.89. **Proposed scorecard line P10** in section 8, now with a rate per reader core.


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

## 2. What each shape costs on the store today, and after the batch (Mac toy; counts are results, times diagnostic)

**The toy** (`api1/gate.sh`, one lab container started by image ID `sha256:21a67288…`, the gateway source mounted
from this branch): PostgreSQL, a transactor, the writer (8080), and two read gateways, each the 1 billion arm's
tuned reader (both pinned options, the early filter, 3 read permits) with the batch, the ID list route and the read
profile on: **warm** (8081, 384 MB object cache; the subjects read before each cell) and **cold** (8082, 32 MB cache;
random subjects of 1,000). Two accounts of 500 deep subjects (SCALE1's `deepOwnFacts`, plus each task's reference to
its form), 24 forms, 8 property definitions and a policy of 39 rule nodes per account: 138,046 facts in 74 frames,
then 150 saves, indexed. **Counted:** requests (HTTP round trips) and reads per call; storage loads per call
(Datomic's io-stats: per request through the read profile for single reads, the batch's own `stats` for batches);
reader CPU per call (the reader JVM's user and system time over the cell, in 10 ms ticks); wall time. Rows decoded:
a whole-entity read decodes and returns every live row of the entity (the rows column of `counts-*.json`); a field
read decodes one row of about 20 with the early filter; segment decoding is the storage loads.

**Which reads are independent.** Every shape is written as levels (`api1/shapes.ts`); reads in one level depend only
on earlier levels and can run side by side; each level needs the references found by the one before it (a task's
subtasks, a placement's tasks, a rule's children). Depth (levels with reads): subject page 4 to 7 (subtasks are
chained up to three deep), task page 2 to 5, list page 5 to 8, form submission 5 then the save then 1, import row 2,
policy evaluation 4, check webhook 3, placement page 3 to 6, task fields 2. In `today` and `pinned` the reads of a
level go in parallel (the most a port can do); the loader sends one request per level; the one-request batch sends
the whole call (a save splits it in two).


**Warm reader** (one caller; reads, requests and loads per call; reader CPU per call, ms; wall p50 / p99, ms)

| Shape | Reads | Requests today / pinned / loader / batch | Storage loads today / loader / batch | CPU today / pinned / loader / batch | Wall p50 today / loader / batch | Wall p99 today / loader / batch |
| --- | ---: | --- | --- | --- | --- | --- |
| subject-page | 44.2 | 44.2 / 45.2 / 5.1 / 1.0 | 0.00 / 0.00 / 0.00 | 115.6 / 66.2 / 18.1 / 15.0 | 43.5 / 25.9 / 13.6 | 101.9 / 40.9 / 16.8 |
| task-page | 18.5 | 18.5 / 19.5 / 3.1 / 1.0 | 0.00 / 0.00 / 0.00 | 23.1 / 34.4 / 5.6 / 3.8 | 18.5 / 12.5 / 6.8 | 37.1 / 17.0 / 9.6 |
| subject-list | 1,524.0 | 1,524.0 / 1,525.0 / 8.0 / 1.0 | 0.00 / 0.00 / 0.00 | 2,285.0 / 1,945.0 / 290.0 / 25.0 | 1,235.2 / 374.1 / 39.3 | 2,613.1 / 507.1 / 61.8 |
| form-submit | 30.2 | 30.2 / 31.2 / 6.0 / 2.0 | 0.00 / 0.00 / 0.00 | 34.4 / 33.1 / 18.1 / 15.6 | 73.0 / 65.7 / 57.8 | 91.6 / 79.0 / 91.6 |
| import-row | 17.4 | 17.4 / 18.4 / 2.0 / 1.0 | 0.00 / 0.00 / 0.00 | 13.8 / 16.9 / 7.5 / 5.0 | 16.6 / 16.5 / 8.8 | 26.3 / 23.2 / 12.2 |
| policy-eval | 60.8 | 60.8 / 61.8 / 4.0 / 1.0 | 0.00 / 0.00 / 0.00 | 45.0 / 43.8 / 15.0 / 13.1 | 43.9 / 31.0 / 20.4 | 67.1 / 39.6 / 31.5 |
| check-webhook | 29.9 | 29.9 / 30.9 / 3.0 / 1.0 | 0.00 / 0.00 / 0.00 | 23.8 / 27.5 / 8.1 / 6.9 | 26.8 / 18.0 / 8.4 | 41.1 / 26.2 / 15.5 |
| placement-page | 32.0 | 32.0 / 33.0 / 4.1 / 1.0 | 0.00 / 0.00 / 0.00 | 28.8 / 26.2 / 9.4 / 7.5 | 32.7 / 21.1 / 10.3 | 48.6 / 31.2 / 15.9 |
| task-fields | 2.0 | 2.0 / 3.0 / 2.0 / 1.0 | 0.00 / 0.00 / 0.00 | 2.5 / 3.1 / 2.5 / 2.5 | 8.6 / 7.8 / 4.1 | 10.3 / 10.5 / 6.5 |

**warm, 16 callers** (calls/s; reader CPU per call, ms; wall p50 / p99, ms)

| Shape | Calls/s today / loader / batch | CPU today / loader / batch | p50 today / loader / batch | p99 today / loader / batch |
| --- | --- | --- | --- | --- |
| subject-page | 54.0 / 156.4 / 222.4 | 33.1 / 13.5 / 11.9 | 278.9 / 89.1 / 65.0 | 456.2 / 145.2 / 102.2 |
| task-page | 135.7 / 251.4 / 431.3 | 16.5 / 8.1 / 5.2 | 105.8 / 53.6 / 32.6 | 226.1 / 118.1 / 42.6 |
| subject-list | 1.1 / 4.6 / 20.0 | 2,790.0 / 345.0 / 65.0 | 14,955.3 / 3,252.8 / 390.7 | 15,022.3 / 3,501.7 / 801.0 |
| form-submit | 22.0 / 53.3 / 37.1 | 51.0 / 22.5 / 22.9 | 731.1 / 266.3 / 400.6 | 1,012.4 / 457.8 / 589.3 |
| import-row | 125.1 / 338.7 / 298.2 | 19.8 / 6.2 / 5.8 | 128.3 / 42.9 / 49.1 | 231.0 / 62.9 / 65.2 |
| policy-eval | 32.7 / 138.5 / 110.3 | 62.3 / 15.2 / 16.0 | 441.1 / 107.7 / 125.8 | 644.1 / 145.6 / 208.5 |
| check-webhook | 94.3 / 220.4 / 380.3 | 20.6 / 8.1 / 5.8 | 158.8 / 64.7 / 39.1 | 238.3 / 93.3 / 50.0 |
| placement-page | 78.9 / 217.1 / 254.4 | 21.9 / 10.2 / 9.4 | 186.2 / 65.9 / 61.5 | 300.4 / 114.2 / 77.8 |
| task-fields | 707.4 / 700.1 / 695.5 | 2.1 / 2.5 / 1.7 | 19.2 / 22.3 / 21.7 | 31.7 / 32.3 / 39.8 |

**warm, 64 callers** (calls/s; reader CPU per call, ms; wall p50 / p99, ms)

| Shape | Calls/s today / loader / batch | CPU today / loader / batch | p50 today / loader / batch | p99 today / loader / batch |
| --- | --- | --- | --- | --- |
| subject-page | 46.2 / 151.7 / 163.2 | 46.1 / 13.0 / 9.6 | 1,319.4 / 383.8 / 353.4 | 2,455.7 / 600.2 / 457.0 |
| task-page | 94.9 / 281.9 / 305.2 | 16.1 / 6.6 / 4.7 | 605.7 / 197.3 / 187.6 | 1,551.6 / 442.3 / 276.2 |
| form-submit | 35.0 / 73.9 / 87.8 | 27.9 / 16.3 / 13.9 | 1,465.5 / 711.9 / 648.4 | 3,356.3 / 2,385.6 / 1,302.2 |
| import-row | 111.4 / 267.7 / 311.6 | 22.8 / 6.6 / 6.4 | 551.1 / 239.3 / 188.4 | 978.4 / 286.4 / 257.8 |
| policy-eval | 31.2 / 127.5 / 97.4 | 76.4 / 14.8 / 18.7 | 1,963.2 / 475.2 / 529.4 | 2,769.1 / 579.0 / 869.0 |
| check-webhook | 56.0 / 215.8 / 242.1 | 41.7 / 10.3 / 8.8 | 1,153.4 / 282.0 / 260.2 | 1,480.2 / 417.3 / 328.0 |
| placement-page | 62.0 / 234.0 / 240.6 | 32.9 / 10.5 / 9.2 | 966.2 / 239.9 / 256.3 | 1,627.2 / 510.4 / 313.1 |
| task-fields | 1,183.7 / 951.8 / 1,043.7 | 2.4 / 2.7 / 1.9 | 47.3 / 61.3 / 53.6 | 106.6 / 115.4 / 70.5 |

**Cold reader** (one caller; reads, requests and loads per call; reader CPU per call, ms; wall p50 / p99, ms)

| Shape | Reads | Requests today / pinned / loader / batch | Storage loads today / loader / batch | CPU today / pinned / loader / batch | Wall p50 today / loader / batch | Wall p99 today / loader / batch |
| --- | ---: | --- | --- | --- | --- | --- |
| subject-page | 49.5 | 49.5 / 49.2 / 5.2 / 1.0 | 2.75 / 1.19 / 1.94 | 243.8 / 113.8 / 35.0 / 26.2 | 82.6 / 42.8 / 22.3 | 167.7 / 70.2 / 29.5 |
| task-page | 18.8 | 18.8 / 19.8 / 3.8 / 1.0 | 1.62 / 1.69 / 1.81 | 33.1 / 32.5 / 16.2 / 16.9 | 26.1 / 14.1 / 13.0 | 47.1 / 25.7 / 20.5 |
| subject-list | 1,764.5 | 1,764.5 / 1,606.2 / 8.0 / 1.0 | 147.08 / 84.25 / 49.50 | 3,850.0 / 2,110.0 / 540.0 / 265.0 | 1,600.7 / 556.1 / 181.6 | 1,691.9 / 685.1 / 257.1 |
| form-submit | 31.6 | 31.6 / 31.9 / 6.0 / 2.0 | 1.62 / 1.25 / 1.44 | 45.0 / 41.2 / 21.9 / 20.0 | 97.0 / 72.8 / 69.6 | 141.1 / 88.2 / 80.5 |
| import-row | 17.8 | 17.8 / 19.3 / 2.0 / 1.0 | 1.19 / 1.06 / 1.62 | 15.0 / 19.4 / 8.1 / 12.5 | 18.0 / 15.4 / 14.4 | 28.8 / 21.7 / 21.9 |
| policy-eval | 62.1 | 62.1 / 63.0 / 4.0 / 1.0 | 0.62 / 1.19 / 5.81 | 54.4 / 58.8 / 18.1 / 25.6 | 51.9 / 36.8 / 23.8 | 72.0 / 49.6 / 165.8 |
| check-webhook | 29.9 | 29.9 / 31.8 / 3.0 / 1.0 | 2.00 / 1.81 / 2.19 | 25.6 / 29.4 / 11.9 / 10.0 | 33.4 / 18.8 / 11.8 | 52.1 / 32.1 / 19.9 |
| placement-page | 36.3 | 36.3 / 39.3 / 3.9 / 1.0 | 1.94 / 1.94 / 2.06 | 31.2 / 36.9 / 11.9 / 10.0 | 31.7 / 22.0 / 11.5 | 55.3 / 36.6 / 20.4 |
| task-fields | 2.0 | 2.0 / 3.0 / 2.0 / 1.0 | 0.75 / 1.12 / 0.75 | 3.1 / 3.1 / 5.0 / 2.5 | 8.2 / 11.6 / 5.2 | 13.0 / 19.8 / 10.2 |

**cold, 16 callers** (calls/s; reader CPU per call, ms; wall p50 / p99, ms)

| Shape | Calls/s today / loader / batch | CPU today / loader / batch | p50 today / loader / batch | p99 today / loader / batch |
| --- | --- | --- | --- | --- |
| subject-page | 54.7 / 108.2 / 107.6 | 41.7 / 16.5 / 17.9 | 276.0 / 133.8 / 103.6 | 411.0 / 206.1 / 233.8 |
| task-page | 141.0 / 274.2 / 397.4 | 14.2 / 8.3 / 5.4 | 104.2 / 49.2 / 38.5 | 196.6 / 106.7 / 60.8 |
| subject-list | 1.1 / 3.2 / 15.1 | 2,172.5 / 540.0 / 155.0 | 14,675.7 / 4,985.9 / 669.2 | 14,696.8 / 5,010.8 / 1,058.7 |
| form-submit | 37.9 / 43.5 / 70.2 | 32.7 / 24.2 / 18.5 | 353.9 / 332.9 / 193.7 | 669.5 / 548.8 / 352.0 |
| import-row | 125.5 / 269.9 / 252.4 | 16.9 / 9.4 / 10.6 | 103.0 / 52.2 / 57.2 | 183.1 / 80.7 / 84.3 |
| policy-eval | 37.2 / 110.2 / 112.7 | 76.9 / 17.9 / 18.8 | 357.3 / 141.2 / 128.9 | 1,259.2 / 184.7 / 186.0 |
| check-webhook | 70.4 / 254.6 / 288.4 | 29.4 / 8.5 / 9.2 | 220.7 / 58.4 / 53.4 | 324.4 / 105.9 / 69.6 |
| placement-page | 64.8 / 169.1 / 203.7 | 32.1 / 10.6 / 9.8 | 247.9 / 84.5 / 71.9 | 376.0 / 151.8 / 98.5 |
| task-fields | 742.8 / 703.6 / 891.6 | 2.5 / 2.7 / 2.5 | 19.7 / 19.3 / 16.3 | 36.0 / 30.6 / 26.7 |

**cold, 64 callers** (calls/s; reader CPU per call, ms; wall p50 / p99, ms)

| Shape | Calls/s today / loader / batch | CPU today / loader / batch | p50 today / loader / batch | p99 today / loader / batch |
| --- | --- | --- | --- | --- |
| subject-page | 46.8 / 138.6 / 168.8 | 50.3 / 15.4 / 12.3 | 1,280.8 / 402.3 / 382.0 | 2,186.6 / 671.0 / 435.8 |
| task-page | 117.8 / 315.3 / 370.4 | 23.3 / 5.9 / 6.9 | 514.0 / 177.9 / 167.7 | 1,144.6 / 371.2 / 217.8 |
| form-submit | 45.5 / 57.8 / 77.0 | 33.6 / 17.7 / 16.7 | 1,193.9 / 971.9 / 694.3 | 2,365.0 / 1,607.5 / 1,140.1 |
| import-row | 93.9 / 253.6 / 307.3 | 30.5 / 7.8 / 7.8 | 660.9 / 241.9 / 197.9 | 955.2 / 290.3 / 238.1 |
| policy-eval | 27.0 / 66.1 / 73.7 | 103.4 / 26.4 / 21.9 | 2,275.2 / 926.9 / 834.8 | 3,334.3 / 1,092.4 / 1,838.1 |
| check-webhook | 70.9 / 198.8 / 280.9 | 30.5 / 8.6 / 7.1 | 823.2 / 313.9 / 222.1 | 1,245.0 / 397.1 / 259.4 |
| placement-page | 54.9 / 155.2 / 204.3 | 39.6 / 12.1 / 10.5 | 1,111.4 / 368.6 / 307.3 | 1,925.6 / 665.5 / 357.6 |
| task-fields | 896.4 / 1,065.8 / 1,046.4 | 2.1 / 2.6 / 2.4 | 64.5 / 56.0 / 52.1 | 125.9 / 90.8 / 80.8 |

exchange of 8 (cold): CPU 12.700 ms, loads 2.97, p50 6.50 ms


**Calibration exchange** (the 1 billion arm's own request: eight subjects' field 0 in one pinned `/read`): warm, 16
callers, 1.013 ms of reader CPU per exchange (1,914 exchanges/s on 1.94 cores; one caller 6.05 ms, JIT and background
threads included, so one-caller CPU figures above are high); cold, 16 callers, 6.36 ms; cold, one caller, 3.63
storage loads per exchange (0.45 per subject; 1.76 at 1 billion).

**The straddle check** (16 callers for 8 s per port on 10 hot subjects of the warm reader, two savers writing the same
new value to a subject's root `:placement/stamp` and its first task's `:task/progress` in one commit, 20 to 56 saves/s):

| Port | Calls | Calls whose two values differ (two positions) | Head moved during the call | Saves/s | Calls/s |
| --- | ---: | ---: | ---: | ---: | ---: |
| today (unpinned) | 366 | **97 (26.5%)** | 366 of 366 | 20.2 | 44.8 (two head reads per call added) |
| pinned (one `/basis` first) | 379 | 0 | — | 24.7 | 46.0 |
| loader (`CallReads`) | 1,052 | 0 | — | 38.4 | 130.2 |
| one-request batch | 1,436 | 0 | — | 55.5 | 177.6 |

**Read after the call's own write** (`form-submit`, the task read back after its save): unpinned reads missed the save
in 28 of 512 calls (warm: 1 of 16, 9 of 48, 12 of 192 at 1, 16, 64 callers; cold: 0, 5 of 48, 1 of 192); pinned at the
receipt 0 of 32; the loader (`afterWrite`, then the at-least read) and the batch (`atLeastPosition`) 0 of 512 each.

**Seen in the counts:** (1) the loader removes most of the requests but keeps one per level, so a deep call still
pays a round trip per level (subject page 5, list page 8); the one-request batch pays one. (2) Alone, the batch's
whole call runs on one request thread (entries one after another; only the storage loads overlap), so its wall time
is its CPU; a `today` call spreads its reads over the reader's 3 permits. Under load that difference disappears and
CPU per call decides. (3) The list page read as 50 reach worlds costs 65 to 98 ms of CPU against 290 to 345 for the
same 1,524 entities read as rows through the loader: reach walks a subject's references inside the gateway with one
identity memo. (4) On the cold toy the batch's prefetch loaded more segments than the single reads for the policy
evaluation (5.8 against 0.6 per call over 16 calls): it touches each definition entity's whole EAVT range, which a
32 MB cache had evicted; on the warm reader 0 everywhere. (5) One-caller CPU on the Mac carries JIT and background
threads (6 ms per exchange alone, 1 ms at 16 callers); the predictions use the loaded figures.


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

## 4. The exactness gate (Mac, `api1/run.ts` phase `gate`; counts are results)

Every batched answer is compared with the same read issued alone, through the single routes, at the batch's stated
position: per entity for `rows` entries (canonical rows sorted by ID), the whole answer for `reach` entries against
`/reach-many` with the same roots, the page for `ids` entries against `/ids` (volatile fields dropped: the peer's
head, scan time and io-stats). Both readers, both the loader and the one-request batch.

| Part | Comparisons | Differences |
| --- | ---: | ---: |
| subject page (12 subjects × 3 positions) | 3,504 | 0 |
| task page | 1,326 | 0 |
| list page (4 pages × 3 positions: ID page, 50 reach worlds, definitions) | 21,189 | 0 |
| form submission (head only: before and after its save) | 742 | 0 |
| import row | 1,302 | 0 |
| policy evaluation | 4,446 | 0 |
| check webhook | 2,184 | 0 |
| placement page | 2,682 | 0 |
| task fields | 144 | 0 |
| the eight subject-centred shapes at the head while 145 saves ran, and the cursor check | 7,583 | 0 |
| **Total** | **45,102** | **0** |

Positions: the head (the call pins it), the seed cut and a middle position (the call is pinned there by
`position`). Every loader call and every batch read at one position (two for the form submission, which saves);
entities found by reference were exactly the references of the source answer. **Refusals, typed (12 of 12):** history,
row ID lookup, a rows entry without subjects, a held handle, a record-time basis, a forward and a self reference, 257
entries, 4,097 subjects (`BatchTooLarge`), an unknown operation, no `validAt`, `atLeastPosition` with a pin
(`InvalidValue`). **Cursor:** a 64 KiB bound answered one subject page in 3 requests, answers equal to the unbounded
batch's. **Permits:** a 12-entry batch raised the reader's read admissions by exactly 1 (3 permits).

## 5. Predictions at 1 billion (written before any server run)

**The model** (`api1/predict.ts`, inputs: `counts-warm-run08.json`, `counts-cold-run07.json`,
`calibration-run08.json`; output `predictions.json`, all in the private evidence folder):
- **Speed of a server core:** f = 1.53 ms (the same exchange measured on the server at 1 billion, re-read subjects at
  256 seats: 1,302.5 exchanges/s on 1.99 reader cores) ÷ 1.013 ms (the Mac, 16 callers) = **1.51**. Server reader CPU
  per call, re-read = the Mac's warm CPU per call at 16 callers × 1.51.
- **Random subjects:** + 0.86 ms per storage load (RD5: 1.52 ms for 1.76 loads), loads per call = distinct subjects ×
  2.7 (EAVT 2.2: the measured 1.66 for one entity plus about half a leaf for the rest of a subject's 30 to 45
  entities; identity 0.11 per ID kind read; definitions stay cached); high case the toy's cold loads × 3.9 (1.76 per
  random subject at 1 billion against 0.45 on the toy).
- **Alone:** low = CPU ÷ 3 permits (today) or CPU on one request thread (batches) + 0.3 ms per round trip + 1.2 ms
  per storage wait (0.51 SQL + 0.69 decode; serial in single reads, one overlapped wave per level in a batch); high =
  the Mac's own alone p50 × 1.51 (it carries the client and the round trips into the lab VM, slower than a server's
  loopback) plus the 1 billion loads the toy did not make.
- **N callers on one 3-core reader** (closed loop): calls/s = 2.7 cores ÷ CPU per call; call p50 = max(alone, N ÷
  calls/s) (Little's law); p99 = 1.7 × p50 (the 1 billion windows' tail, 1.6 to 1.9). Per read (today): p50 = the
  requests in flight (N × the call's mean level width) × a read's CPU ÷ 2.7; p99 = 1.7 × that.

| Shape | Port | Requests | Reader CPU per call, ms (re-read / random) | Alone p50, ms (low to high): re-read / random | 64 callers p50 / p99, re-read | 256 callers p50 / p99, re-read | 256 callers p50 / p99, random | Calls/s, one 3-core reader (re-read / random) | Per read p99, today: alone / 256 callers |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- |
| subject-page | today | 44 | 50 / 52 | 19 to 66 / 23 to 125 | 1,186 / 2,015 | 4,742 / 8,062 | 4,966 / 8,443 | 54 / 52 | 4.5 / 1,152 |
| subject-page | loader | 5 | 20 / 23 | 22 to 39 / 28 to 67 | 485 / 824 | 1,939 / 3,296 | 2,163 / 3,677 | 132 / 118 | — |
| subject-page | batch1 | 1 | 18 / 20 | 18 to 20 / 24 to 35 | 425 / 722 | 1,700 / 2,890 | 1,924 / 3,271 | 151 / 133 | — |
| task-page | today | 18 | 25 / 27 | 9.8 to 28 / 14 to 41 | 589 / 1,001 | 2,356 / 4,005 | 2,571 / 4,371 | 109 / 100 | 3.1 / 801 |
| task-page | loader | 3 | 12 / 14 | 13 to 19 / 19 to 22 | 291 / 494 | 1,163 / 1,977 | 1,378 / 2,343 | 220 / 186 | — |
| task-page | batch1 | 1 | 7.9 / 10 | 8.2 to 10 / 14 to 21 | 186 / 317 | 746 / 1,268 | 961 / 1,633 | 343 / 266 | — |
| subject-list | today | 1,524 | 4,212 / 4,326 | 1,407 to 1,865 / 1,603 to 2,417 | 99,853 / 169,749 | 399,411 / 678,998 | 410,174 / 697,296 | 1 / 1 | 332 / 84,875 |
| subject-list | loader | 8 | 521 / 634 | 523 to 565 / 646 to 849 | 12,347 / 20,991 | 49,389 / 83,962 | 60,153 / 102,260 | 5 / 4 | — |
| subject-list | batch1 | 1 | 98 / 212 | 59 to 98 / 220 to 284 | 2,326 / 3,955 | 9,305 / 15,819 | 20,069 / 34,117 | 28 / 13 | — |
| form-submit | today | 30 | 77 / 79 | 28 to 110 / 31 to 148 | 1,827 / 3,105 | 7,307 / 12,422 | 7,522 / 12,788 | 35 / 34 | 8.1 / 2,070 |
| form-submit | loader | 6 | 34 / 36 | 36 to 99 / 42 to 112 | 805 / 1,369 | 3,221 / 5,476 | 3,436 / 5,842 | 79 / 74 | — |
| form-submit | batch1 | 2 | 35 / 37 | 35 to 87 / 41 to 108 | 820 / 1,394 | 3,281 / 5,577 | 3,496 / 5,943 | 78 / 73 | — |
| import-row | today | 17 | 30 / 32 | 11 to 25 / 14 to 29 | 708 / 1,204 | 2,833 / 4,817 | 3,040 / 5,167 | 90 / 84 | 9.4 / 2,408 |
| import-row | loader | 2 | 9.4 / 12 | 10 to 25 / 15 to 26 | 224 / 380 | 895 / 1,521 | 1,101 / 1,872 | 286 / 233 | — |
| import-row | batch1 | 1 | 8.8 / 11 | 9.1 to 13 / 12 to 23 | 209 / 355 | 835 / 1,420 | 1,041 / 1,770 | 307 / 246 | — |
| policy-eval | today | 61 | 94 / 96 | 33 to 66 / 36 to 81 | 2,229 / 3,790 | 8,918 / 15,160 | 9,124 / 15,511 | 29 / 28 | 15 / 3,790 |
| policy-eval | loader | 4 | 23 / 25 | 24 to 47 / 30 to 58 | 544 / 925 | 2,177 / 3,701 | 2,383 / 4,052 | 118 / 107 | — |
| policy-eval | batch1 | 1 | 24 / 26 | 24 to 31 / 30 to 36 | 574 / 976 | 2,296 / 3,904 | 2,503 / 4,255 | 111 / 102 | — |
| check-webhook | today | 30 | 31 / 33 | 11 to 40 / 15 to 51 | 738 / 1,255 | 2,953 / 5,019 | 3,168 / 5,385 | 87 / 81 | 6.5 / 1,673 |
| check-webhook | loader | 3 | 12 / 14 | 13 to 27 / 19 to 30 | 291 / 494 | 1,163 / 1,977 | 1,378 / 2,343 | 220 / 186 | — |
| check-webhook | batch1 | 1 | 8.8 / 11 | 9.1 to 13 / 14 to 19 | 209 / 355 | 835 / 1,420 | 1,050 / 1,786 | 307 / 244 | — |
| placement-page | today | 32 | 33 / 35 | 13 to 49 / 17 to 49 | 783 / 1,331 | 3,132 / 5,324 | 3,347 / 5,690 | 82 / 76 | 3.5 / 887 |
| placement-page | loader | 4 | 15 / 18 | 17 to 32 / 22 to 34 | 365 / 621 | 1,461 / 2,484 | 1,677 / 2,850 | 175 / 153 | — |
| placement-page | batch1 | 1 | 14 / 16 | 14 to 16 / 18 to 20 | 336 / 570 | 1,342 / 2,282 | 1,557 / 2,648 | 191 / 164 | — |
| task-fields | today | 2 | 3.1 / 5.1 | 1.6 to 13 / 5.1 to 14 | 75 / 127 | 298 / 507 | 487 / 827 | 858 / 526 | 3.2 / 254 |
| task-fields | loader | 2 | 3.8 / 5.8 | 4.4 to 12 / 8.8 to 20 | 89 / 152 | 358 / 608 | 546 / 929 | 715 / 469 | — |
| task-fields | batch1 | 1 | 2.5 / 4.5 | 2.8 to 6.1 / 6.0 to 10 | 60 / 101 | 239 / 406 | 427 / 726 | 1,073 / 600 | — |

**Against the bars:**

| Bar | Today (one HTTP read per entity) | Loader | One-request batch |
| --- | --- | --- | --- |
| Each read inside 50 ms, one caller | **met** (per read p99 3 to 15 ms; the list page's reads 330 ms p99 at the high end because 1,524 of them queue on 3 permits) | — (one request per level) | — (one request) |
| Each read inside 50 ms, 256 callers | **not met** (250 ms to 3.8 s for subject-centred shapes) | — | — |
| The whole call's reads inside 50 ms, one caller | met for task fields, task, import row, check webhook, placement pages at the low end; the subject page (19 to 66 ms re-read, 23 to 125 random) and the policy evaluation (33 to 66 / 36 to 81) at risk; the list page not (1.4 to 2.4 s) | met for most; the subject page and policy evaluation at risk (22 to 67, 24 to 58 ms); the list page not (0.5 to 0.8 s) | **met for every subject-centred shape** (re-read 2.8 to 31 ms, random 6 to 36 ms; the form submission's 35 to 108 ms include its save); the list page not (59 to 98 ms re-read, 220 to 284 random) |
| The whole call's reads inside 200 ms, one caller | all but the list page | all but the list page | **all, the list page re-read included** (random list page 220 to 284 ms: at risk) |
| Inside 50 ms or 200 ms per call at 64 callers | only task fields (75 / 127 ms) | only task fields (89 / 152) | only task fields (60 / 101); task page p99 317 |
| Inside 50 ms or 200 ms per call at 256 callers | none (p50 0.3 s to 400 s) | none | none (p50 0.24 s to 20 s) |

**Cold worst case:** a list page of 50 random subjects: about 130 storage loads (570 at the high end), 1.6 to 2.4 s
alone today, 0.2 to 0.3 s batched; at 256 callers 20 s p50 batched. A random subject's page: 2.8 loads (10.7 high),
23 to 125 ms alone today, 24 to 35 ms batched.

**Sizing that follows:** the per-call p99 at N closed-loop callers is about 1.7 × N × CPU ÷ 2.7 cores. For 256
subject pages at once inside 50 ms p99 the batch needs 256 × 18 ms × 1.7 ÷ 50 ms ÷ 0.9 ≈ 175 reader cores; inside
200 ms about 44. That is the arithmetic of CPU per entity read (0.3 to 0.4 ms on a server for whole entities), not of
round trips; the batch has already taken the round trips out.

**Superseded by section 10.6** (the floor): with the world read and the definitions cache the same bar needs about 20
reader cores for re-read subjects and about 72 (52 to 91) for random ones.



## 6. Reproduce on the Mac

```bash
# one ordinary heavy token per run; each run seeds its own toy (about 1.5 minutes) in one lab container started by image ID
node lab/bin/heavy.mjs --label DX-API1-gate -- bash lab/experiments/EXP-DX1/api1/gate.sh "$EVIDENCE/run-gate" gate,straddle
API1_READERS=warm node lab/bin/heavy.mjs --label DX-API1-counts -- bash lab/experiments/EXP-DX1/api1/gate.sh "$EVIDENCE/run-warm" counts,calibrate
API1_READERS=cold node lab/bin/heavy.mjs --label DX-API1-counts -- bash lab/experiments/EXP-DX1/api1/gate.sh "$EVIDENCE/run-cold" counts
node lab/bin/heavy.mjs --label DX-API1-serverdry -- bash lab/experiments/EXP-DX1/api1/gate.sh "$EVIDENCE/run-dry" server
python3 lab/experiments/EXP-DX1/api1/summarize.py "$EVIDENCE"/run-warm/out/counts.json "$EVIDENCE"/run-cold/out/counts.json
node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/api1/predict.ts \
  "$EVIDENCE"/run-warm/out/counts.json "$EVIDENCE"/run-cold/out/counts.json "$EVIDENCE"/run-warm/out/calibration.json
# the floor and its sizing (section 10): profile cells, the cold stand-in, then floor.py
API1_READERS=warm API1_PROFILE_READERS=warm node lab/bin/heavy.mjs --label DX-API1-floor -- bash lab/experiments/EXP-DX1/api1/gate.sh "$EVIDENCE/run-floor" counts,calibrate,profile
API1_READERS=cold API1_COLD_ENV=TX2_ENTITY_CACHE_BYTES=0 node lab/bin/heavy.mjs --label DX-API1-floor -- bash lab/experiments/EXP-DX1/api1/gate.sh "$EVIDENCE/run-floor-cold" counts
# the parsed-entity cache gate (section 11.2), then the shared entity and the request costs with the cache check off
API1_DRIVER=cache-gate.ts API1_READER_ENV=TX2_ENTITY_CACHE_VERIFY=1 node lab/bin/heavy.mjs --label DX-API1-cachegate -- bash lab/experiments/EXP-DX1/api1/gate.sh "$EVIDENCE/run-cache" cache
API1_DRIVER=cache-gate.ts node lab/bin/heavy.mjs --label DX-API1-shared -- bash lab/experiments/EXP-DX1/api1/gate.sh "$EVIDENCE/run-shared" cache,shared,request
API1_F=1.5 python3 lab/experiments/EXP-DX1/api1/floor.py "$EVIDENCE"/run-floor/out/counts.json "$EVIDENCE"/run-floor-cold/out/counts.json "$EVIDENCE"/run-floor/out/calibration.json
```

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
sudo env "PATH=$BUILD/tools/bin:$PATH" API1_WINDOW_SECONDS=60 API1_CALLERS=64,256 API1_LIST_CALLERS=8 API1_ARMS=today,batch1,floor \
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
3. **Alone:** one caller, no saves: each shape × each arm (`today`; `batch1`, the one-request batch of entity reads;
   `floor`, the subject page, the task page and the policy evaluation as world reads, every shape with the definitions
   cache) × each set (re-read, random),
   20 calls (5 for `subject-list` in `today`): per-call p50 and p99, requests and reads per call, storage loads per call
   (batch arms, Datomic io-stats), reader CPU per call (the reader's cgroup), per-request p99 (`today`).
4. **Windows:** 60 s each, beside saves of one subject each (17 rows on its first task, one commit, at 23 per second,
   through the product's own write path): the subject-centred mix below for each set × callers (64, 256) × arm (12
   windows), then the list page alone at 8 callers for each set × arm (6 windows; at 64 callers one list page of
   today's port takes longer than a window). Recorded: calls/s, reads/s, per-call p50 and p99, the share of calls
   inside 50 ms and inside 200 ms, per-read p99 (`today`), reader cores, CPU per call, timeouts (30 s), the saves' p50
   and p99, own writes not seen after the save (`form-submit`), definitions cache hits and misses per call (`floor`).
   The loader arm (`loader`) is dropped from the default to keep the run's length: in section 5 it sits between
   today and the one-request batch (within 5% of the batch for the form submission and the policy evaluation);
   `API1_ARMS` can add it back.

**The mix** (shares of calls; proposed, for the owner to correct): subject list 15%, subject page 15%, task page 15%,
task fields 15%, placement page 10%, form submission 10%, policy evaluation 8%, import row 7%, check webhook 5%. Basis:
the product's read load test (60% lists, 30% one resource, 10% sub-resources) with lists cut to 15% because the test's
lists span six kinds of resources of which subjects are one, and the write-path shapes at a third of calls. The
windows run the 85% without the list page as one mix and the list page in its own windows (above).

**Duration and cost:** bring-up 3 to 12 min; definitions and warm-up 2 to 4 min; alone 3 to 8 min (54 cells; the
random `today` list pages are the long ones); windows 18 × (60 s + about 20 s) = 24 min; down 1 min: **33 to 49
minutes, USD 0.60 to 0.89** at USD 1.09 per machine hour (ceiling 60 min, USD 1.09).

**Predictions for this run, written before it** (from section 5; one 3-core tuned reader; mixes weighted as above):

| Window | today: calls/s, p50 / p99 per call | one-request batch | floor (written 2026-11-24 evening) |
| --- | --- | --- | --- |
| Subject-centred mix, re-read, 64 callers | 60 to 75 calls/s (1,870 reads/s), 0.9 / 1.6 s | 170 to 210 (5,200 reads/s), 0.34 / 0.57 s | 250 to 330, 0.22 / 0.38 s |
| The same, 256 callers | 60 to 75, 3.8 / 6.4 s; per read p99 0.8 to 3.8 s | 170 to 210, 1.35 / 2.3 s | 250 to 330, 0.9 / 1.5 s |
| Subject-centred mix, random, 64 / 256 callers | 55 to 70 calls/s; 1.0 / 1.7 s and 4.0 / 6.8 s | 145 to 185; 0.39 / 0.66 s and 1.6 / 2.7 s | 180 to 250; 0.30 / 0.51 s and 1.2 / 2.0 s |
| List page, 8 callers, re-read / random | 0.6 calls/s, p50 13 s / 13 s (some time out at 30 s) | 28 / 13 calls/s, 0.29 / 0.62 s | as the batch (the list page already reads worlds), 5 to 10% more calls/s from the definitions cache |
| Alone (one caller), each shape | as the table of section 5 (low to high) | as section 5 | subject page 2.4 to 12 ms re-read, 10 to 18 ms random; policy evaluation 2 to 15 / 8 to 18 ms; task page 3 to 12 / 8 to 15 ms (low: the CPU, one round trip and two storage waves; high: the Mac's alone p50 in `run-15` × 1.5) |

The floor column (revised 2026-11-24 night for the revision check): the dry runs' mix CPU per call (5.3 to 6.9 ms on
the Mac, `run-15` and `run-27`) × f = 1.5 = 8 to 10 ms re-read, plus 2.7 loads × 0.86 ms and the parse for random
subjects, about 11 to 13 ms; calls/s = 2.7 cores ÷ that; p50 = callers ÷ calls/s;
p99 = 1.7 × p50. On one 3-core reader neither bar holds at 64 or 256 callers in any arm: the server run measures the
CPU per call and the rate per core that section 10.6 sizes from, not the bars themselves.

- Share of calls inside 50 ms at 64 or 256 callers: under 5% in every arm and set; inside 200 ms: under 10% at 256
  callers, 10 to 30% for the batch at 64 (task fields and import rows).
- Reader cores 2.6 to 2.9 in every window; saves stored at 23 per second with commit p99 50 to 80 ms (yesterday's S
  windows beside readers: 52 to 65 ms); 0 errors; own writes missed after the save: 2 to 10% of form submissions in
  `today`, 0 in the loader and the batch.
- Storage loads per random subject-centred call (batch arms, io-stats): 2.2 to 4.4 (central 2.7); per random list
  page 130 to 570.

**What would show them wrong:**
1. **Batch arms' calls/s below 1.8 times today's** in the subject-centred windows: per-request overhead is a smaller
   share of a server read than of a Mac read (f is per exchange; whole-entity rows may cost more per row than the
   exchange's one-row reads), so batching buys less than the toy says. Look at CPU per call by shape in the alone cells.
2. **Batch CPU per call above 25 ms re-read** for the subject page: the per-entity cost is higher at 1 billion than
   the calibration says (row texts of aged entities are longer: the 2,000 aged subjects per account carry about 1,400
   saves each; the re-read set is drawn from seed subjects, so this would point at the decode, not at history).
3. **Random subject-centred calls loading more than 6 segments each** (batch io-stats): a subject's entities are not
   adjacent at 1 billion as they are on the toy (the loader wrote whole subjects per frame; check `eavt-load` against
   the subject's entity count), and the cold model must count leaves per entity, not per subject.
4. **Any call whose reads see two positions in the loader or batch arms, any wrong answer, any error:** stop; the
   batch must not merge.
5. **The today arm's per-read p99 under 200 ms at 256 callers:** the reader is not saturated by single reads (Jetty or
   the client limits the requests in flight); then today's numbers measure the driver, not the store.
6. **Saves' commit p99 above 100 ms** in the batch windows but not in today's: the batch's prefetch pool competes with
   the writer (both on the machine's cores outside the reader's three); look at the prefetch counters.
7. **The floor arm's subject page alone above 4 ms of reader CPU re-read, or its mix under 1.6 times the batch's
   calls/s:** the fixed request cost or the world's reach is dearer on the server than f says; section 10.6's core
   counts scale with it. Compare the alone cells' CPU per call with 10.5.
8. **The floor arm's definition hits under 1 per call, or misses above 0.01 per call after the warm-up:** the
   definitions cache is not being used (as in the dry run `run-14`); the floor numbers are then the plain world's.
9. **Random floor calls above 9.4 ms of reader CPU** (the high end of 10.6): the parse or the storage loads per subject
   are dearer than modelled; then RD5's per-subject row cache, not more reader cores, is the next lever to cost.

## 8. What this adds to the scorecard: a tenth line, "an API call's reads" (proposed; the owner accepts or changes it)

**P10 An API call's reads.** At 1 billion records (and fresh), the API-call workload of section 7 on the card's read
gateway, beside the production-shaped saves:
1. **One position per call:** 0 calls whose reads see two positions (the paired-value check of section 2, with the
   product's port: the loader), and 0 reads after a call's own save that miss it. *(Predicted met with the loader and
   the batch; not met by unpinned reads: 26.5% and 5.5% on the toy.)*
2. **One caller:** every subject-centred shape's whole call p99 ≤ 50 ms for re-read subjects and ≤ 100 ms for random
   ones; the list page of 50 subjects p99 ≤ 200 ms re-read and ≤ 500 ms random. *(Predicted met with the batch, at risk
   with the loader for the subject page and the policy evaluation, not met today.)*
3. **Rate per reader core:** the subject page served through the floor (world read + the definitions cache) at
   **at least 300 calls per second per reader core for re-read subjects and at least 90 for random ones**, from the
   alone cells' reader CPU per call (cores busy ÷ calls/s in the windows as the check). *(Predicted about 385 and 112
   (87 to 159) with the revision check of section 11.3; today's port 14 and 13; the entity batch 54 and 45.)* The bar in milliseconds follows from it: with
   R the owner's peak rate of subject-reading API calls, the deployment's reader cores ≥ R ÷ (that rate × 0.5) keep
   the p99 inside 50 ms (section 10.6 gives the cores for 64 and 256 calls in flight).
4. **Reported, not judged:** calls/s and reader CPU per call at 64 and 256 callers per arm, per-read p99 of the single
   read port, storage loads per random call, definitions cache hits per call, the parsed-entity cache's bytes per
   subject.

Why these bars: the lead's sentence ("each [read] must return in under about 50 ms") is met per read by the store
today for one caller; what an API call needs is the whole call inside its budget and one consistent position, and
the store's cost under load is CPU per entity read, which a bar in calls per second per core states directly.

## 9. What is not verified

- **Nothing here ran on a server.** Every time above is a Mac time (diagnostic); the predictions scale them by one
  calibration exchange (f = 1.51) and by RD5's unit costs, which were measured for one-row field reads, not for whole
  entities.
- **The product's query counts are read from its code**, not traced at run time; auth and permission queries are left
  out of the shapes; the ORM's relation loading is counted as one query per relation level. The mix is a proposal.
- **The toy is not 1 billion:** 1,000 subjects, a 32 MB cache for "cold"; its loads per subject (0.45) are a quarter of
  1 billion's (1.76). The cold model's per-subject loads (2.7) is an estimate; command 7 measures it.
- **The 1 billion database has no task-to-form references and no definitions**: the server run adds the definitions in
  one commit per account and names forms literally, so the server's `forms` reads are literal, not by reference.
- **The server driver ran only as a dry run on this toy** (`run-09`: 8 and 4 callers, 10 s windows, the toy's ready file, 0 errors): its
  bring-up path (`demo/server-up.sh` with `DEMO_READER=tuned DX_READ_BATCH=1`) has not run; `profile.mjs` prints the
  tuned reader (checked) and is byte-identical without the setting (checked); `up.sh`'s `DX_READ_BATCH` refusal is not
  in the launch guard's cases.
- **The floor is measured on the Mac only.** The profile's shares come from a stack sampler on the request thread
  (250 µs) and per-stage thread CPU, on the toy with subjects in memory; the server's shares may differ. The random
  floor (5.4 to 9.4 ms) is a model: the cold stand-in (32 MB, the parsed-entity cache off) is not 1 billion's cold.
- **Closed in section 11:** the definitions cache no longer rests on the release rule (it checks revisions); the
  parsed-entity cache is gated under removals, a pending removal, frames, imports, creations, a restart and a stopped
  reader; the shared entity is measured.
- **Still not verified after section 11:** a Publish (DX-ACT8) and the archive writer's own settlement frames against
  the cache (frames were written in their shape); the owner-layout fold, which rewrites an owner's rows without a new
  revision; the cache gate on the per-account removal rule (DX-ERA2) once it merges; a reader that is behind and
  answers 503 (the stopped reader had caught up before its first answer); whether the product's port stores a member
  list on any shared entity; the gateway selftest on this branch (the new `revisions` entry, `stopAt` and the removal
  drop have no selftest case; the gates above are their evidence); every time here is a Mac time.
- **Gateway selftest not run** on this branch (the batch has no selftest case; its exactness is the gate's).
- **Not built:** batching inside the transaction path (reads inside `withTransaction` keep the adapter's own route);
  a merged reach world per batch for several roots of the loader (each root is its own entry); parallel entries inside
  one batch (entries run one after another on the request thread; only storage loads overlap). The batch's prefetch
  touches each entity's whole EAVT range, which loaded more segments than single reads did for definition entities on
  the cold toy (section 2, item 4); not tuned.
- **The ID list route allows one running list per account**; the today port retries `IndexBusy`, and a batch's ID list
  entries retry until the batch's time bound.

## 10. The floor of reader CPU per API call (added 2026-11-24 evening), and the sizing redone

Asked by the orchestrator after section 5's result (256 subject pages at once inside 50 ms would take about 175 reader
cores). Mac toy, diagnostic times, counts are results. Runs `run-10` (gate), `run-11` (warm profile and counts),
`run-12` (cold, parsed-entity cache on), `run-13` (cold stand-in: 32 MB object cache and the gateway's parsed-entity
cache off, `TX2_ENTITY_CACHE_BYTES=0`), `run-14` (final gate and the server driver's dry run), `run-15` (the dry run after the driver fix of 10.7).

### 10.1 Where the CPU goes (the subject page, subjects in memory, one-request batch of 44 entity reads)

Measured with the batch's own diagnostics (`"profile": true`, `batch.clj`): the request thread's CPU by stage, and a
sampler that reads the request thread's stack every 250 µs while it runs and names the innermost gateway or Datomic
frame (4,090 samples over 240 calls for the first row). The reader process's CPU over the same calls gives the rest
(the web server, request parse, response write, collection, the prefetch pool). Warm reader, 4 callers.

| Subject page, batched (per call, Mac) | As built at `07ca3e634` | Answers kept as built, first-seek prefetch | The same, prefetch off |
| --- | ---: | ---: | ---: |
| Reader process CPU | **14.1 ms** | **10.0 ms** | **8.2 ms** |
| Outside the batch handler (web server, request parse, response write, collection, the prefetch pool's threads) | 5.7 ms (40%) | 3.4 ms (34%) | 2.5 ms (30%) |
| Batch handler thread | 8.5 ms (60%) | 6.6 ms | 5.7 ms (70%) |
| … rows read (`storage/read-rows`: identity and index seeks, row-text decode, visibility and valid-time filter, tagged wire rows) | 4.6 ms | 4.1 ms | 3.7 ms |
| … encoding each answer to JSON | 1.7 ms | 1.6 ms | 1.5 ms |
| … re-parsing each answer (removed) | 1.0 ms | — | — |
| … prefetch on the request thread | 0.24 ms | 0.21 ms | — |
| … position resolve | 0.06 ms | 0.05 ms | 0.05 ms |
| … admission (permit wait, wall time, not CPU) | 1.3 ms | 0.65 ms | 0.34 ms |

**Sampler shares of the handler thread** (prefetch off): building tagged wire rows (every column of every row encoded
as `{"t","v"}` and checked by decoding it back, `codec/encode-value`) **30%**; JSON encoding **26%**; Datomic index
seeks (identity lookup, the row range, the pinned short-cut's checks) **17%**; row-text decode **9%**; the batch's own
code 9%; visibility, valid-time filter and assembly 4%; the rest under 3% each. **So for 44 entity reads the cost is
answer-building (tagged rows plus JSON, about 56% of the handler, 40% of the call) and the fixed request cost (30%),
not decoding (row text 6% of the call) and not the position or admission (under 1%).** The uncached-read builder's
finding (a read decodes a whole leaf and returns 0.25% of it) is the cold case: on subjects in memory Datomic keeps the
decoded segment, so the seek, not the decode, is what is paid.

**Two fixes from this profile, built:** (1) the batch no longer re-parses every answer it has just encoded (it was 11
to 48% of the handler; it keeps rows and ID list answers as built for references); (2) the batch's prefetch touches one
seek per subject instead of walking its whole EAVT range. Together **14.1 → 10.0 ms** on the subject page, 25.0 → 8.3
ms on the list page (`legacyParse: true` restores the old path for comparison).

### 10.2 One world read instead of 44 entity reads (built: `subject-page-world`, `task-page-world`, `policy-eval-world`)

The list page's own figure said it: a subject's **world** (`reach`: the root and every entity reachable from it by
reference) is answered by the reach route, which emits stored row texts as they are and keeps each parsed entity in
the gateway's existing parsed-entity cache, keyed by entity and revision (section 10.4). The three shapes as worlds:

| Shape | The world read covers | Not covered (read beside it, and why) |
| --- | --- | --- |
| Subject page | the root, profile, 1.8 placements, 5.7 tasks, about 31 subtasks (the chained ones too), 1.4 files, and the forms its tasks reference (`:task/template`): 44 to 49 entities, **all 44 of the entity reads but the definitions** | the account entity and its 8 property definitions (not referenced from the subject; definitions in force); nothing in other subjects (no subject references another on this toy; in the product a placement references a shared employer or client entity, which a reach would follow) |
| Task page | the task's world: the task, its subtasks, its form | the subject root and profile (the task does not reference its subject: the root is named by the task's ID convention, the profile by the root's reference), the account and its property definitions |
| Policy evaluation | the subject's world, and the policy's world (the policy and its 39 rule nodes, reached by `:policy/node` and `:rule/child`) in a second reach entry | the account and its property definitions |

**Exactness:** every entity of every world equal to the same entity read alone at the same position (decoded with the
SDK's reach decoder, filtered by valid time); every world equal to the single `/reach-many` at that position.

### 10.3 Definitions in force kept in the product process by release (built: `DefinitionCache` in the SDK)

*Revised in section 11.3: the cache now checks each kept entity's revision, so it no longer rests on the contract below.*

`DefinitionCache` holds definition answers under the account's **release pointer** (one fact on the account entity,
`:account/release`, naming the release in force by content hash). A call reads the pointer at its own position (the
account entity, which every shape reads anyway, in its first batch); a cached definition is used only when the
pointer at that position names the release it was cached under; a new release is read once and kept. `CallReads`
offers `definitionRows` and `definitionReach`; the batch port leaves the definition entries out of the call's request
when the cache holds a release, checks the pointer in the answer, and reads only what it misses, at the same position.
**The contract:** a definition entity changes only in a commit that also changes the pointer (a release is published
by writing its definitions and the new pointer together); the release-limits builder's definitions by reference give
the hash; this toy writes the hash itself. Not keep-warm: the cache fills only from the call's own reads.

**What it removes per call** (entity reads not sent): subject page 13 of 44 (8 property definitions, about 5 forms),
policy evaluation 53 of 61 (the policy, 39 rules, 8 properties, forms), placement page 11 of 32, check webhook 9 of 30,
import row 11 of 17; in the world shapes the 8 property definitions and the policy's world. Gate counts (run-10): the
four caches answered 8,533 definition lookups from the cache and read 346 (once per release and reader), across four
release changes made during the gate.

### 10.4 A reader-side cache of decoded subjects: it exists on the world path; not built again

*Gated in section 11.2 under removals, a pending removal, frames, imports, creations, a restart and a stopped reader; a
removal now also drops the entries of the entities it names.*

The reach route already keeps **parsed entities keyed by (database generation, entity, revision)** (`entity_cache.clj`,
DX-B7-S3, 256 MiB by default, `TX2_ENTITY_CACHE_VERIFY=1` re-parses and compares every hit). That is the cache the
question describes, made exact a different way: the key is not a position range but the entity's **revision**, which
every save of the entity changes; a read at any position first reads the entity's revision at that position (one index
seek, itself kept per cut in a small revision view) and then takes the parsed entry for that revision. A pinned read at
an older position finds an older revision: a different key, a hit only if that revision is still held. Removal on
request: the world route masks protected values at response time from the request's own removal frontier
(`append-protected-rows!`), and a removal writes a new revision, so a second reader's cached entry for the old revision
is never served at the removal's position. Settlement writes new revisions the same way.

**What it saves** (the world subject page, profile): reach-build 0.12 ms per subject world with the cache, 0.62 to 0.96
ms without it (run-13, parsed-entity cache off); the call 2.2 to 2.7 ms against 4.0 to 4.5 ms. **Memory:** reported by
`/v2/admin/scan-stats` (`entityCache`), run-14: the warm reader held 25,320 parsed entities in 218 MB (8.6 KB each; full, 121,302 evictions over the run), the cold one 4,198 in 27.8 MB (6.6 KB each). **About 0.3 to 0.4 MB per subject** (45 to 49 entities a world), so the default 256 MiB holds about 700 to 900 subjects; a re-read set of 10,000 subjects needs about 3 to 4 GB of reader heap (`TX2_ENTITY_CACHE_BYTES`), which the server's tuned reader has room for (its object cache is the larger user).
**Why nothing new is built:** decoding is not where the call's CPU is (row-text decode 6 to 9% of an entity-read call);
the world path already has the exact decoded cache; and for the rows path the cost is the tagged wire rows and JSON,
which a decoded cache would not remove. Not verified here: the cache under removals on request and settlement (the
gate ran neither); RD5's costing of a row cache per subject for random subjects (63 times the subjects of the segment
cache in the same bytes) still stands as the lever for subjects not in memory.

### 10.5 CPU per call, before and after each step (Mac; mean of the 16- and 64-caller cells)

| Shape | Reads | Requests: today → batch → world + definitions | Re-read subjects: today / batch / world / world + definitions | Subjects not held (cold stand-in): today / batch / world / world + definitions |
| --- | ---: | --- | --- | --- |
| Subject page | 44 | 44 → 1 → 1 | 43.8 / 11.1 / 1.9 / **1.4 ms** | 48.7 / 12.6 / 5.3 / **5.0 ms** |
| Task page | 18.5 | 18.5 → 1 → 1 | 18.1 / 4.5 / 2.7 / **1.9 ms** | 15.0 / 6.0 / 4.3 / **3.4 ms** |
| Policy evaluation | 61 | 61 → 1 → 1 | 56.1 / 11.7 / 2.8 / **1.25 ms** | 52.3 / 16.6 / 5.9 / **3.9 ms** |
| List page (50 subjects; already worlds in the batch) | 1,524 | 1,524 → 1 → 1 | 2,479 / 25.0 / — / 15.6 ms | 2,288 / 112.5 / — / 112.5 ms |
| Form submission (with its save) | 30 | 30 → 2 → 2.25 | 24.6 / 11.6 / — / 10.9 ms | not run |
| Import row | 17 | 17 → 1 → 1 | 14.8 / 5.3 / — / 4.0 ms | not run |
| Check webhook | 30 | 30 → 1 → 1.25 | 28.4 / 5.7 / — / 4.6 ms | not run |
| Placement page | 32 | 32 → 1 → 1.25 | 28.3 / 6.9 / — / 5.0 ms | not run |
| Task fields | 2 | 2 → 1 → 1 | 1.7 / 1.7 / — / 1.4 ms | not run |

The batch column is after 10.1's two fixes. **The floor for the subject page on this toy is about 1.4 ms of reader CPU
per call for subjects in memory**, of which about 0.9 ms is the fixed cost of one HTTP request (the web server, request
parse, response write, collection), 0.12 ms the world, about 0.15 ms the account entity's rows, 0.05 ms the position,
and the rest the batch's framing and prefetch. For subjects not held, 5.0 ms (the parse of each entity and the toy's
storage loads). Requests per call where definitions miss rise above 1 (the miss is read at the same position, once per
release). Mac noise: the calibration exchange measured 1.01, 1.34 and 1.53 ms in three runs on the same Mac.

### 10.6 The sizing, redone

*The world + definitions rows are superseded by section 11.6 (the revision check moved the floor from 1.41 to 1.56 ms on
the Mac).*

**Server CPU per subject page** = Mac × f. The calibration exchange gave f = 1.51, 1.14 and 1.0 in three runs on the
same Mac (1.01, 1.34 and 1.53 ms against the server's 1.53 ms); the sizing uses **f = 1.5**, the slowest. **Random
subjects** at 1 billion are a range: low = the re-read CPU + 2.7 storage loads × 0.86 ms (RD5's server unit) + the
parse the parsed-entity cache no longer saves (0.67 ms on the Mac, world arms only); high = the cold stand-in's CPU × f
(which already paid the toy's 0.45 loads per subject at the Mac's cost) + the 2.25 more loads per subject that 1
billion makes. The sizing uses the midpoint. Computed by `api1/floor.py` (`floor-f1.5.json` in the evidence folder).

| Subject page | Reader CPU per call (server) | Calls per second per reader core (90% busy) | Cores for p99 ≤ 50 ms, 64 in flight | ≤ 200 ms, 64 | ≤ 50 ms, 256 | ≤ 200 ms, 256 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Today (44 HTTP reads), re-read | 66 ms | 14 | 159 | 40 | 635 | 159 |
| Batch of entity reads, re-read | 16.6 ms | 54 | 40 | 10 | 161 | 40 |
| World, re-read | 2.9 ms | 316 | 6.9 | 1.7 | 28 | 6.9 |
| **World + definitions, re-read** | **2.1 ms** | **426** | **5.1** | **1.3** | **20** | **5.1** |
| Today, random subjects | 71 ms (68 to 75) | 13 | 173 | 43 | 691 | 173 |
| Batch of entity reads, random | 20 ms (19 to 21) | 45 | 48 | 12 | 192 | 48 |
| World, random | 8.0 ms (6.2 to 9.8) | 112 | 19 | 4.8 | 77 | 19 |
| **World + definitions, random** | **7.4 ms** (5.4 to 9.4) | **121** (96 to 167) | **18** (13 to 23) | **4.5** (3.3 to 5.7) | **72** (52 to 91) | **18** (13 to 23) |

Cores = 1.7 × in-flight calls × CPU per call ÷ (0.9 × the bar): the closed-loop rule of section 5 (Little's law, p99
1.7 × p50, a core 90% busy). Alone, every world + definitions call is far inside both bars (about 2.4 ms re-read,
about 10 ms random with two overlapped storage waves), so the cores decide, not the call.

**What concurrency means here.** "256 calls in flight" is 256 API calls being served at the same instant, each waiting
on its reads. With each call taking 2.4 to 10 ms alone, that is roughly 25,000 to 100,000 calls arriving per second,
far above what one account store receives. A capacity plan needs calls per second per reader core instead: **about
426 subject pages per second per core for subjects in memory and about 121 (96 to 167) for random ones** (today's
port: 14 and 13; the entity batch: 54 and 45). At an arrival rate of R calls per second, cores = R × CPU per call ÷
the utilization kept for the p99 (about 0.5 keeps the p99 near two to three times the alone time). For example, 1,000
subject pages per second need about 4 cores re-read and about 15 random.

**Against the product's current database (from the handler code; queries and rows, not time):** the product serves the
subject page (the subject's detail plus its tasks and placements as the page loads them) with about 15 to 20 queries
returning about 150 to 300 rows. Each query is an index lookup; the custom attributes' grouped query alone returns one
row per property definition, about 50, and runs twice. The store's floor serves it with 1 request of 2 entries: the
world (about 49 entities, about 170 stored row texts) and the account (10 rows), with the definitions from the
product's cache. The work is of the same order (rows returned); the store pays per entity seek and per row text, the
product per query.

**Are the bars reachable? Yes, with the world read and the definitions cache, at reader core counts a deployment can
hold:**
- 64 subject pages in flight inside 50 ms p99: about 5 cores for subjects in memory, about 18 (13 to 23) for random ones.
- 64 in flight inside 200 ms: 1.3 and 4.5.
- 256 in flight inside 50 ms: about 20 and 72 (52 to 91). The random case is several reader machines.
- 256 in flight inside 200 ms: 5 and 18.

Today's port needs 159 to 691 cores for the same bars; the entity batch 40 to 192. What is left at the floor is the
fixed cost of one HTTP request per call (about 65% of the re-read world call), so the next lever is a cheaper request
or fewer requests per call; for random subjects it is the storage loads and the parse (RD5's per-subject row cache).

### 10.7 The server driver's dry run with the floor arm (Mac toy, `run-14` and `run-15`)

`server.ts` with `API1_DRY=1` on the toy's ready file: 8 callers in the subject-centred mix, 4 on the list page, 10 s
windows, saves at 23 per second, Mac times (diagnostic).
- **`run-14` found a driver fault:** the floor arm never used its definitions cache. The driver committed the
  definitions a second time on a toy that was seeded with them, so the account carried two release pointers, and the
  cache rightly refuses to choose between two releases (it read every definition, as the plain batch does). The driver
  now keeps an account's pointer when one is present (the 1 billion database has none) and records cache hits and
  misses per call in every window.
- **`run-15`, after the fix:** 0 errors, 0 timeouts in every window; own writes missed after a save: 0 in the batch and
  floor arms, 2 and 1 in `today` (unpinned).

| Window (Mac, 8 callers, subject-centred mix) | Calls/s | Call p50 / p99, ms | Reader CPU per call | Requests per call | Definition hits / misses per call |
| --- | ---: | --- | ---: | ---: | --- |
| Re-read, today | 120 | 63 / 162 | 23.7 ms | 27.2 | — |
| Re-read, batch of entity reads | 383 | 18 / 66 | 8.6 ms | 1.11 | — |
| **Re-read, floor (worlds + definitions cache)** | **598** | **8.9 / 62** | **5.3 ms** | 1.12 | 1.54 / 0.002 |
| Random, today | 88 | 89 / 209 | 26.3 ms | 30.0 | — |
| Random, batch of entity reads | 322 | 21 / 73 | 8.6 ms | 1.10 | — |
| **Random, floor** | **519** | **10.2 / 65** | **5.5 ms** | 1.12 | 1.55 / 0 |
| List page (4 callers), re-read: today / batch / floor | 1 / 81 / 83 | 3,138 / 46 / 45 (p50) | 2,611 / 18.1 / 21.2 ms | 1,504 / 1 / 1 | — |

The mix's requests per call above 1 are the form submission's save and its after-reads (10% of calls). On this toy the
random set is not cold (the toy fits the reader's caches), so the random rows differ from the re-read rows only by
which subjects are drawn. The p99s carry the driver on the same Mac and whatever else the Mac was running.

## 11. The floor's exactness and privacy gaps closed, the shared entity, and a request's fixed cost (added 2026-11-24 night)

Asked by the orchestrator after section 10. Mac toy, counts are results, times diagnostic. Runs `run-17` to `run-27`;
the final code's runs are `run-21` (definitions gate and warm counts), `run-22` (cold stand-in counts), `run-24`
(shared entity and request costs, verify off), `run-26` (the parsed-entity cache gate, verify on), `run-27` (server
driver dry run).

### 11.1 The parsed-entity cache predates this branch

It was added by commit `a3a499680` (DX-B7 step 3, 2026-11-10) and is on the one branch (`exp/DX-INT1`) and every branch
made from it; it is not on `main`. It serves every world read: `POST /v2/db/{db}/reach` and `/reach-many` (the SDK's
subject reads), the journal route's inline worlds (`journal.clj`), DX-B8's report-fed revisions (`recent.clj`, off by
default) and, on this branch, the batch's `reach` entries. The rows route and the batch's `rows` entries do not use it.
So the gap was the one branch's, not only this branch's.

### 11.2 Removals on request and the cache (fix built; gate added permanently: `api1/cache-gate.ts`, phase `cache`)

**What a removal changes.** On this branch a removal on request does not touch the subject's datoms: `erase.clj`
`apply-native!` commits a journal entity, a claim and the database's removal sequence, so **the revision the cache keys
on does not move** (measured: the removed task's revision 3 before and 3 after, on both readers). The removed value is
kept out of answers at emission, from the request's own verified frontier: `privacy/masked` and `privacy/text` replace
it by assertion ID on the rows route, the journal and every world (`reach/append-protected-rows!`).

**The store's rule, from the code:** once a removal is published, its assertion is masked on every read at every
position (the mask is by assertion ID; it does not look at the read's position), so a pinned read at a position before
the removal must not serve it either. While a removal is committed in Datomic but not published, every request on the
database is refused 503 `ErasureFrontierUnavailable` (`privacy/cut` refuses while the pending record exists, and
`verify-data!` refuses when Datomic's sequence differs from the published one).

**The fix (the orchestrator's rule: a revision that does not move at a removal is a break).** Each reader now drops
the parsed entries of every entity a newly published removal names, the first time it sees that removal
(`privacy/cut` → `entity-cache/forget-entities!`). The first version missed drops: the sealed-key shred worker advances
every gateway's frontier every 500 ms without a database, so when the worker saw a removal first, the drop was skipped
(`run-25`: the second reader dropped 4 of the 5 entities it held). The named entities are now queued and dropped by the
next call that has a database (`run-26`: every named entity, on both readers). What this does: no entry parsed before a
removal outlives it. What it does not do: the next read parses the same stored bytes again (this branch does not excise
an unsealed value from Datomic) and masks them at emission as before; sealed values are held as tokens whose key is
shredded after the grace.

**The gate** (`run-26`; both readers with `TX2_ENTITY_CACHE_VERIFY=1`, so every cache hit is also parsed fresh and
compared). Two protected scopes (unsealed and sealed), 24 subjects each with a protected value on the profile and one
on the first task. Both readers (separate processes, each its own cache) first read every world. After each event every
subject is probed on both readers through `reach-many`, `reach-many` with a session, the batch (a reach and a rows
entry) and the rows route, at the head and at pinned positions before and after the event; every world entity is
compared with the rows route at the same position.

| Event (each in both scopes) | Result |
| --- | --- |
| (a) Three removals: by assertion, by entity and attribute, by entity | 768 probes per scope, at the head, the seed cut, before the removals and after: **0 removed values served** (pinned before the removal included), 0 kept values missing; the removed task's revision 3 → 3; drops 4 of 4 on each reader |
| (b) A removal committed but not published (its log record's path made a directory, so publication fails after the commit), with a derived write that copies the value, then the same command resent | while pending: 32 of 32 reads refused 503 on both readers; the derived write refused 503 `ErasureFrontierUnavailable`; resent: published as sequence 4; the derived write sent again with its old ticket refused 409 `ErasureFrontierChanged`; **no derived copy exists**; 768 probes, 0 removed values served; drops 1 of 1 on each reader |
| (c) A settlement-shaped frame (8 subjects' owed values, with the removal ticket) and a release change | the frame's task revision 7 → 30; 384 probes, 0 differences |
| (d) An import frame of a cached subject, entities created inside a cached world (a placement and a task referenced from the root), an import replay of a removed field | the root's revision 8 → 33; both new entities in the world; the replay refused `ErasureReplayDeclined`; 384 probes, 0 differences |
| (e1) A reader restarted (its caches empty) | 384 probes, 0 differences, 0 removed values served |
| (e2) A reader stopped (SIGSTOP) while a save and a removal land, then resumed and probed at once | its first 8 answers all 200 with the removal applied (it had caught up; no 503 seen); 384 probes, 0 removed values served; drop 1 of 1 |
| **Totals** | **6,208 probes, 54,048 world entities compared with the rows route: 0 differences, 0 removed values served, 0 verification errors** over 98,792 + 197,584 verified hits on the first reader and 20,254 on the second |

What this gate does not cover: settlement frames are written in their shape (ticketed writes through the same commit
path), not by the archive writer itself; a Publish (DX-ACT8) is not on this branch; the owner-layout fold (which
rewrites an owner's rows without a new revision, content-preserving by design) is not exercised (the toy's writer runs
without `TX2_SUBJECT_SAVE`).

**DX-ERA3's break** (a derived write whose ticket names no account committing while a removal is committed but not
published) is on `exp/DX-ERA2-removal-per-account`, whose per-account rule is not on this branch: here the same write is
refused 503 while pending and 409 after (case (b) above). When the per-account rule merges, case (b) must pass on the
merged code; it is in the gate for that.

### 11.3 The definitions cache without the unenforced rule (built; gate in `run.ts` phase `gate`)

A kept definition answer now carries the revision of every entity it holds and the removal sequence it was masked
with. A call uses it only when, at the call's own position, the release marker names the same hash, **every revision is
the kept one** (a batch `revisions` entry: one seek per entity, no rows, the reach route's own revision through the same
cut memo) and the removal sequence is the same. So a definition written without a new marker is seen: its revision moved,
the call reads the store's answer at the same position and keeps that. Two markers on one account are refused with
`DefinitionReleaseAmbiguous` (SDK `releaseHash`, `CallReads.definitionRows` and `definitionReach`, the batch port).

**Gate (`run-21`): 167,357 comparisons with single reads at each call's position, 0 differences**, across 683 saves, 4
release changes and **4 writes that break the rule** (rule values, a property name and a form field changed, the marker
unchanged). 28 kept answers were refused because a revision had moved (7, 8, 9 and 4 in the four caches). Two markers on
one account: 84 of 88 cached calls refused with `DefinitionReleaseAmbiguous`, 0 other errors; the other 4 are a task's
fields, whose batch reads no account entity and so keeps no definitions (it reads them on every call); the same 44
calls without a cache answered equal to single reads. The marker was then made single again for the later phases.

**A refusal in the store instead (not built).** It would go in the commit path (`storage/tx-data`, before the native
transaction, and as a check in the transaction function at the serial point): a commit that writes an entity of a
definition kind must also write the account's release marker. Cost: one set lookup per written entity on every commit,
plus a way to know an entity is a definition (an attribute namespace or ID prefix the schema declares). Checking that
the marker's hash matches the definitions' content would mean reading every definition of the release at the commit
(a Publish of 200 forms reads them all). The revision check makes the cache exact without it.

**What the revision check costs** (Mac, warm, mean of 16 and 64 callers; `run-11` → `run-21`): the subject page world
with definitions 1.41 → 1.56 ms, the task page 1.90 → 1.88 ms, the policy evaluation 1.25 → 1.80 ms (its 40 rule
entities' revisions). The policy evaluation read entity by entity with the cache now takes 2.9 to 3.9 requests per call
(nested definition steps' revisions are read after the first request); its world shape stays at 1.

### 11.4 A world with a shared entity (`run-24`, phase `shared`)

One shared employer (with one location entity of its own) referenced by each subject's enrolment
(`:enrolment/employer`), 1, 100 and 10,000 subjects; then the employer also listing its members (one
`:employer/enrolment` reference per enrolment). One subject's world, warm reader:

| Subjects sharing the employer | References | World read (follow every reference) | World with `stopAt: [":enrolment/employer"]` plus the employer's rows |
| ---: | --- | --- | --- |
| 1 | forward only | 5 entities, 2.3 KB, 0.85 ms | 3 entities + 1, 2.9 KB, 0.70 ms |
| 100 | forward only | 5 entities, 2.3 KB, 0.40 ms | 3 + 1, 2.9 KB, 0.75 ms |
| 10,000 | forward only | **5 entities, 2.3 KB, 0.60 ms** | 3 + 1, 2.9 KB, 2.55 ms (one noisy cell) |
| 1 | the employer lists its members | 5 entities, 2.5 KB, 0.65 ms | 3 + 1, 3.7 KB, 0.85 ms |
| 100 | the employer lists its members | **302 entities, 159 KB, 4.0 ms** | 3 + 1, 73 KB (the employer's own 100 member rows), 3.7 ms |
| 10,000 | the employer lists its members | **refused** (`declined: entity-budget`, above 5,000 entities) | refused (`BatchEntryTooLarge`: the employer's 10,000 rows exceed 4 MiB) |

(Reader CPU per call over 200 calls; the 10 ms tick makes each cell ±0.05 ms, and the Mac adds noise.)

**The rule for what a world includes:** a world follows the references stored on the entities it reaches, outward
only; the store keeps no reverse references. With the product's shape as the orchestrator describes it (the enrolment
references its employer; the employer does not list its enrolments), the world is the subject's own entities plus the
shared employer and the employer's own outward references: **5 entities at 1, 100 and 10,000 sharing subjects, so the
subject page's cost does not depend on how many subjects share it. That is the default (unchanged).** It stops holding
only if a shared entity stores a list of its members; then following it reads other subjects' worlds (302 entities at
100, refused at 10,000). For that case a world entry takes `stopAt` (built: reference attributes not followed, 1 to 64;
the gateway's parsed entity now records each reference's attribute): the world stops at the subject's own entities.
`stopAt` is exact (3 of 3 entities equal to the rows route; the employer absent). Reading such an employer whole is still
proportional to its members, so a member list should not be stored on a shared entity. Not verified: whether the product's
port stores any such list.

### 11.5 What one request costs before its reads (`run-24`, phase `request`)

Warm reader, 4 callers, 1,500 calls per variant, two rounds (reader CPU per call, Mac):

| Variant | Round 1 | Round 2 | Mean |
| --- | ---: | ---: | ---: |
| The floor: a world plus the account entity's rows (tagged wire rows) | 2.17 ms | 1.69 ms | **1.93 ms** |
| The account entity as row texts instead (a reach entry with `stopAt` its references) | 1.53 | 1.47 | **1.50 ms (−0.43, −22%)** |
| The same floor without keep-alive (a new connection per request) | 2.38 | 1.97 | 2.18 ms (+0.25) |
| A minimal batch (one revision of one entity) | 0.55 | 0.49 | **0.52 ms** |
| One world alone (`reach-many`) | 0.95 | 0.99 | 0.97 ms |
| The same with `gzipRows` | 1.03 | 0.96 | 1.00 ms (+0.02) |
| `GET /health` (no database) | 0.24 | 0.17 | 0.21 ms |

**So a database request's fixed cost is about 0.5 ms of the floor's 1.9** (27%): 0.2 ms for the web server alone, 0.3
ms for per-request database work (on a protected scope, the frontier read from the removal log; the position; admission;
the request parse). Section 10's "65% outside the handler" counted the response write and collection of the answer's
bytes too; those grow with the answer.

- **Keep-alive:** already on (the SDK's `http.Agent` keeps connections); off would add 0.25 ms. Nothing to build.
- **Compression:** already off by default; `gzipRows` costs 0.02 ms on a 30 KB world. Nothing to build.
- **A compact encoding for rows: 0.43 ms per call (22% of the floor), proposed, not built.** The account entity's 10 rows
  as tagged wire rows cost that much more than as stored row texts. Building it is not a few lines: the batch's
  references (`entityIdsFrom`, which the property definitions' and the revisions' entries use) read IDs only from a rows
  answer, so they would have to read a reach answer's rows too (about 30 lines and a gate case).

### 11.6 The numbers again

| Subject page, world + definitions | Before (section 10) | Now (revision check) |
| --- | ---: | ---: |
| Reader CPU per call, Mac, re-read | 1.41 ms | **1.56 ms** |
| The same, cold stand-in | 4.97 ms | 5.60 ms (a noisier run: the entity batch measured 17.5 against 12.6) |
| Server, re-read (f = 1.5) | 2.1 ms | **2.34 ms** |
| Server, random subjects (range; midpoint used) | 5.4 to 9.4 (7.4) ms | **5.7 to 10.3 (8.0) ms** |
| Calls per second per reader core, re-read / random | 426 / 121 | **385 / 112** (87 to 159) |

| Cores for the subject page (world + definitions) | 64 in flight | 256 in flight |
| --- | ---: | ---: |
| Re-read, p99 ≤ 50 ms | 5.7 | 23 |
| Re-read, p99 ≤ 200 ms | 1.4 | 5.7 |
| Random, p99 ≤ 50 ms | 19 (14 to 25) | 77 (55 to 100) |
| Random, p99 ≤ 200 ms | 4.8 (3.4 to 6.2) | 19 (14 to 25) |

The other shapes with the revision check (Mac, warm, world + definitions): the task page 1.88 ms, the policy evaluation
1.80 ms. Today's port and the entity batch did not change (section 10.6). Both bars stay reachable; the random case at
256 calls in flight inside 50 ms is several reader machines.

### 11.7 The server driver's dry run at the final code (`run-27`)

The floor arm with the revision check, 8 callers, the toy: 420 calls/s re-read and 470 random at 6.9 and 6.0 ms of reader
CPU per call (`run-15`: 598 and 519 at 5.3 and 5.5 ms on a quieter Mac); 1.13 and 1.11 requests per call (the revisions
ride in the first request); 1.54 and 1.58 definition hits per call, misses 0.003 and 0; 0 errors, 0 timeouts; the batch
arm 343 and 312 calls/s at 8.5 and 8.7 ms; today's port 112 and 86 at 22.4 and 23.8 ms.

## Evidence (private folder `evidence/DX-API1/`)

| File | Contents | SHA-256 |
| --- | --- | --- |
| `run-04.tar.gz` | the gate (45,102 comparisons, refusals, cursor, permits) and the straddle check, source `5a550b5bb` plus the harness edits committed in `e4cd0778c` | `03edf1e4f38f1b36c226cf51fa0791b7d16baa37d4dca25e044af6b6f052c86a` |
| `run-06.tar.gz` | warm counts with loader entries of 512 subjects, and the first dry run of the server driver | `d959549d2a4eef1029ccea09f7656562d4007f84147b512eee2cf913fa0d5310` |
| `run-07.tar.gz`, `counts-cold-run07.json` | cold counts (the tables above) | `377f6a6f…`, `944821b7…` |
| `run-08.tar.gz`, `counts-warm-run08.json`, `calibration-run08.json` | warm counts and the calibration exchange (the tables above) | `d8a31eac…`, `1fbd3216…`, `5ff947ca…` |
| `predictions.json` | section 5's model output | `48918f44…` |
| `run-09.tar.gz` | the server driver's dry run on the toy (both mixes, 18 windows of 10 s at 8 and 4 callers, definitions and saves through the product's write path; 0 call or save errors) | `8be27f64b948e580a05aa00c7819b4744a97b83a322260ab55aaea56f03e8b13` |
| `run-10.tar.gz` | the gate with the worlds and the definitions caches (165,813 comparisons, 0 differences; 4 release changes), before the first-seek prefetch | `54268f55…` |
| `run-11.tar.gz`, `counts-warm-run11.json`, `profile-run11.json`, `calibration-run11.json` | warm counts by step and the profile (section 10.1, 10.5) | `54cff7d2…`, `6b6eff89…`, `3a10e6b2…`, `cae08c8d…` |
| `run-12.tar.gz`, `counts-cold-run12.json`, `profile-cold-run12.json` | cold, 32 MB, parsed-entity cache on (not representative: the toy fits that cache) | `a8e6d5fe…`, `a68b7bf4…`, `db1153fd…` |
| `run-13.tar.gz`, `counts-cold-nocache-run13.json`, `profile-cold-nocache-run13.json`, `calibration-run13.json` | the cold stand-in: 32 MB and the parsed-entity cache off (section 10.5) | `ced20bf9…`, `c8082007…`, `87931125…`, `77464eb3…` |
| `run-14.tar.gz`, `gate-run14.json`, `server-dry-run14.jsonl` | the final gate at the final code (165,813 comparisons, 0 differences, 670 saves) and the dry run that found the driver's second release pointer; entity cache size | `17bf6639…`, `58c5f704…`, `bea93f2a…` |
| `run-15.tar.gz`, `server-dry-run15.jsonl` | the server driver's dry run after the fix (section 10.7) | `98ebb1c4…`, `2eb47d98…` |
| `floor-f1.5.json` | `floor.py`'s output at f = 1.5 (section 10.6) | `e68f8e1d…` |
| `run-16-failed.tar.gz`, `run-18-countsfailed.tar.gz`, `run-20-prerev.tar.gz` | a cache gate stopped by the Mac-side view of the bind mount (fixed: the fault is made inside the container); a counts phase stopped by the gate's second marker (fixed: one marker restored); cold counts before revisions stopped parsing rows | `7b93bc3b…`, `e36ebb44…`, `2332f3bd…` |
| `run-17.tar.gz`, `cache-gate-run17.json`; `run-23.tar.gz`, `cache-gate-run23.json`; `run-25.tar.gz`, `cache-gate-run25.json` | the cache gate before the final code (0 removed values served in each; `run-25` counted the missed drops) | `6b0894e0…`, `1a2b1d61…`, `8f1ad284…`, `fc40c25f…`, `04ae2d44…`, `cb8b77b3…` |
| `run-26.tar.gz`, `cache-gate-run26.json` | **the parsed-entity cache gate at the final code** (section 11.2) | `acc428b0…`, `7f1139c4…` |
| `run-19.tar.gz`, `gate-run19.json`, `counts-warm-run19.json` | the definitions gate with revisions read through parsed entities | `33662eca…`, `8f5094e1…`, `90aae1f5…` |
| `run-21.tar.gz`, `gate-run21.json`, `counts-warm-run21.json` | **the definitions gate and warm counts at the final code** (section 11.3) | `741eed9d…`, `425ef6c8…`, `2b686e1d…` |
| `run-22.tar.gz`, `counts-cold-nocache-run22.json` | cold stand-in counts at the final code | `653c8532…`, `f1744e51…` |
| `run-24.tar.gz`, `cache-gate-run24.json` | the shared entity and the request costs (sections 11.4, 11.5), with the cache gate verify off | `3819fced…`, `6a4c593e…` |
| `run-27.tar.gz`, `server-dry-run27.jsonl` | the server driver's dry run at the final code | `e72c483f…`, `0537f6ff…` |
| `run-05-failed.tar.gz` | a counts run stopped by a save conflict in the harness (fixed: conflicting saves retry) | `02ef7d73…` |

Every container ran image `sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be` (each run's
`image.json` records the container's own image); the gateway source is the branch's, mounted read-only.

