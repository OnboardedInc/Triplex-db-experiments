# For the console builder: the toy, the server and the catalogue

Builder A (branch `exp/DX-CON1-functions`) owns everything here and the toy database on the Mac. Builder B owns
`examples/console/**`. This page is the contract between the two.

## The toy database on the Mac

- **It is already up.** Builder A starts and stops it (`bash demo/toy/up.sh`, `bash demo/toy/down.sh`). Do not stop it.
- **Write only into `account-010`.** Builder A's gates write into `account-003` and read the other accounts.
- **Find the connection file** (written by `demo/connect.sh --toy`, mode 0600, outside the repository):

  ```
  ls -l ~/.triplex-demo/connection.json && node -e 'const c=require(process.env.HOME+"/.triplex-demo/connection.json"); console.log(c.kind, c.database.slice(0,12), "records", c.recordsAtBringUp, "head", c.headAtBringUp, "pinned", JSON.stringify(c.pinnedReads))'
  ```

  The same content, without the endpoints, is at `curl -s http://127.0.0.1:28580/api/connection`.

## A second console server from your worktree, on port 28582

In your worktree, after merging `origin/exp/DX-CON1-functions`, once per worktree:

```
pnpm install --store-dir "$(git rev-parse --path-format=absolute --git-common-dir)/../.pnpm-store" --frozen-lockfile --offline
node_modules/.bin/turbo run build --filter=@triplex-build/triplex-datomic
```

Then:

```
node examples/demo-mcp/src/page.ts 28582
```

It reads the same connection file, so it talks to the same toy. It serves `examples/console/dist` of the worktree it
runs from (or a placeholder page when `dist` is missing). A Vite dev server on 28581 can proxy `/api` to it: requests
whose `Origin` is `http://127.0.0.1:28581` or `http://localhost:28581` are accepted (`TRIPLEX_CONSOLE_DEV_PORTS` adds
others, comma-separated).

## The HTTP API

| Route | Answer |
| --- | --- |
| `GET /api/catalogue` | `{ version: "triplex-console-catalogue/1", server: "triplex-demo", groups, tools: [{ name, title, group, sentences, description, changes, annotations, inputSchema }] }`. `inputSchema` is JSON Schema (draft 2020-12) of the input, from the same zod shape the MCP server registers. |
| `GET /api/connection` | The connection file without `writeUrl` and `readUrl`, plus `file`, `label`, `subjects`, `recordTimeRange { first, lastAtBringUp }`, `pinnedReads { shortcut, cutLookup }`. 503 `{ error: { code: "NotConnected", message, file } }` when there is none. |
| `POST /api/tools/:name` | Body: the tool's input as JSON. 200: the tool's answer. 400: `{ error: { code, message } }` (a refusal or a gateway error; `code` is the store's or the tool's code, for example `InvalidInput`, `UnknownSubject`, `NotAWorkingCopy`, `ScanRefused`). |

**Rules.** The server listens on 127.0.0.1 only and refuses a request whose `Host` is not loopback. A request with an
`Origin` other than the console's own (its port, or 28581) is refused (403 `OriginRefused`). A tool with
`changes: true` runs only with the console's own `Origin` (403 `OriginRequired` otherwise); browsers send `Origin` on
every `POST`, so `fetch("/api/tools/save_facts", { method: "POST", ... })` from the app works as is.

**Every answer carries the envelope.** `position` (the commit position it was read or written at), `timing`
(`serverMs`: the gateways' own time summed over the requests; `roundTripMs`: wall time on this machine; `requests`;
`calls[]` with `route`, `status`, `serverMs`, `roundTripMs`), `database` (`{ id, kind: "toy" | "1b", label, workingCopy }`)
and `consoleUrl` (the console page that shows the same thing). Tools that evaluate in the console add
`timing.consoleMs`. Changes are attributed: actor `console` from HTTP, `assistant` from MCP.

## Console routes the answers link to (`consoleUrl`)

The app owns these paths; `tools.ts` (`routes`) builds them. Query parameters are optional.

| Path | Screen |
| --- | --- |
| `/` | Home |
| `/about` (`?tab=limits`) | About this database |
| `/accounts/:account` (`?from=N`, `?subjects=1,2,3&position=P`) | Account page |
| `/accounts/:account/subjects/:n` (`?position=P`, `?tab=time&at=..&attribute=..&recordedAt=..&believedPosition=P`) | Entity page of the subject's root |
| `/entities/:entityId` (URL-encoded; `?tab=facts|history|time|journal|derivations`, `&attribute=..`, `&position=P`, `&at=..`) | Entity page |
| `/types`, `/types/:name` | Type page |
| `/configuration` | Configuration |
| `/query` | Query |
| `/journal` (`?after=N&account=..`) | Journal |
| `/assistant#tool_name` | Ask your assistant |

## The tools, now and next

**Step 0: the 12 tools of the first demo**, names and inputs unchanged, plus `position` on `read_subject_at`
(the believed view at an exact position).

**Step 5 (published): `list_entity_types`, `describe_entity_type`, `define_entity_type`, `list_releases`,
`move_live`.** The toy now holds the starter type `Subject` and the demo's `Review` (outcome enum, note text, of a
reference to `Subject`, decided-on date) on `live`. Read the exact answers from `/api/catalogue` and by calling them.

**Step 6 (published): `create_entity`, `list_entities`, `read_entity`**, and on the existing tools (step 1):
`entity` instead of `account`/`subject`/`kind` on `save_facts`, `correct_past_value`, `retire_fact` and
`field_history` (values typed by the entity's type, writes pinned to the live release); `root` instead of
`account`/`subject` on `read_subject` and `read_subject_at`; `basis` on `read_subject`, `list_entities`, `read_entity`.
`account-003` on the toy holds Review entities made by the gates; make yours in `account-010`.

**Step 2 (published): `query`.** The ten example questions are in `demo/console/questions.json` (`name`, `note`,
`from`, `query`, optional `basis`, `explain`, `expect: "refused"`), written for subject 50000 of account-003 on the
1 billion database; on the toy use subjects 0 to 11. A refusal is a 400 with code `QueryRefused` and the exact text of
DESIGN.md 4.3. `columns[]` carry `note: "exact integer, evaluated as a number"` where it applies; `cursor` pages at the
first page's position; `timing.consoleMs` is the console's evaluation time.

**Step 3 (published): `change_feed` additions.** `entity` (that entity's transactions newest first, `before` to page
back with the returned `nextBefore`), `actor`, `summary: true` with `after` (who changed since: `subjects[]` with
`subject`, `account`, `root`, `transactions`, `factsChanged`, `lastPosition`; `transactionsRead`, `complete`,
`resumeAfter`), `waitMs` up to 30,000 (long poll for Live). Every transaction carries `configSnapshot` (the release that
governed it) beside `actor` and `commandId`. `database_summary` adds `liveRelease` and `entityTypes`.

**Step 8 (published): `evaluate_derivation`.** Input `derivation { name, query, identity }`, the subject (`account` and
`subject`, or `root`), `basis?`, `compareToPosition?`. Answer: `derivation` (id, pinnedTo release, dependencies),
`candidates[]` (`identity`, `result`, `sources[]` with `factId`, `entity`, `attribute`, `transaction`, `position`,
`validFrom`, `validTo`; `nextTemporalBoundary`), and with `compareToPosition` a `reconcile` (`added`, `removed`,
`changed`, `unchanged`, `counts`). All 22 tools now exist.

**Recorded examples.** `demo/console/examples.json` (`tools.<name> = { input, output, at }`, `database`, `recordedAt`)
holds one answer per tool. It is from the toy rehearsal now (its `database` says so); the proving run on the
1 billion database replaces it. `demo/inspector.html` is deleted; `page.ts` no longer serves it.

**Next, in this order, with the inputs of DESIGN.md section 6.2.** Each is added to the catalogue only when it runs,
so the Assistant page never lists a tool that does not exist. Build the screens against these shapes.

| Tool | Inputs | Answer, beyond the envelope |
| --- | --- | --- |
| `list_entity_types` | `ref?: "live" \| "test"` | `release { id, label, sequence }`, `refs { test, live }`, `types: [{ name, attributes, created }]` |
| `describe_entity_type` | `name`, `ref?` | `type { name, attributes: [{ key, valueType, required, cardinality: "one" \| "many", unique, refTarget?, enumValues? }], constraints: [{ id, kind, status }], revisions: [{ sequence, revision, release, change }] }` |
| `define_entity_type` | `name`, `attributes[]` (as above, `required?`, `cardinality?`, `unique?`, `refTarget?`, `enumValues?`), `label?`, `moveLive?` (default true) | `release { id, label, sequence, parent }`, `objects { added, changed, unchanged }`, `refs { test, live }`, `receipt` |
| `list_releases` | `limit?`, `compare?: [idA, idB]` | `refs`, `releases: [{ id, label, sequence, parent, objects, refs, position }]`, `difference?` |
| `move_live` | `snapshotId` | `before`, `after`, `receipt`, `note` |
| `create_entity` | `type`, `account`, `attributes` (keyword to value or values), `validFrom?`, `commandId?` | `entity`, `number`, `release`, `facts`, `receipt`, `readback`, `readbackMatches` |
| `list_entities` | `type`, `account`, `from?`, `count?` (at most 50), `basis?` | `created`, `entities: [{ number, entity, attributes }]` |
| `read_entity` | `entity`, `basis?`, `asSubject?` | `entity`, `entityType` (or `"untyped"`), `facts` (both intervals), and with `asSubject` the reach |
| `query` | `query` (Triplex Datalog JSON), `from: { subject: { account, subject } \| { entity } } \| { subjects: { account, subjects[] } } \| "store"`, `basis?`, `pageSize?`, `cursor?`, `explain?` | `columns`, `bindings`, `route`, `pulled { facts, entities }`, `plan?`, `cursor?`, `timing.consoleMs`; a refusal is a 400 with code `QueryRefused` and the text of DESIGN.md 4.3 |
| `evaluate_derivation` | `derivation { name, query, identity }`, the subject, `basis?`, `compareToPosition?` | `candidates`, `reconcile?` (step 8, last) |

`basis` is `{ validAt?, recordedAt?, position? }` on every reading tool, with `recordedAt` and `position` exclusive;
times are ISO text or epoch milliseconds. `entity` and `root` parameters arrive on the existing subject tools in step 1;
`change_feed` gains `entity?`, `actor?`, `summary?` in step 3.

## Questions across subjects (DX-XQ8)

**Four more tools** (group "Across subjects"), on the read gateway's two question routes from `exp/DX-XQ6-exact-sweep`
(`TX2_ID_LISTS` and `TX2_SWEEP`, now on in every demo stack through `demo/server/profile.mjs`; `server-up.sh` refuses
to finish unless the read gateway has both, and writes `questionRoutes` into the ready file):

| Tool | What it answers |
| --- | --- |
| `list_kinds` | The kinds of entity in one account (ID prefixes after `acct/<account>/`), each with its ID count from the ID list; a "roots only" shape where one applies (`pl:{8 digits}`). |
| `describe_kind` | The attributes seen on the first entities of a kind (default 24, in ID order), with value types and examples; protected attributes marked not filterable, their values never returned. |
| `list_ids` | The IDs of one kind, or their exact count, at the head, a position or a record time. No valid-time axis. |
| `ask_across_subjects` | Up to 8 conditions (all required) on one kind of one account, answered on the slow exact route at one position and one valid time: a list with columns, a count, or a count per value. Modes `fill` (default), `toEnd`, `page`; the store's cursor. |

Every answer states the position and valid time it holds for (`holdsFor`), whether it is complete, the subjects
examined and that it reads stored facts. Every typed refusal of the store comes back as `{ code, message, explanation,
storeCode, storeMessage, refused: true }`; busy answers (`SweepBusy`, `IndexBusy`) carry `busy: true` and
`retryAfterMs`, and the page retries them, showing "Busy, retrying".

**One place sends the question calls**: `questionClient()` in `examples/demo-mcp/src/questions.ts`. Unset, it is the
connection's read gateway. `TRIPLEX_QUESTION_READER_URL=http://127.0.0.1:<port>` (or `questionReaderUrl` in the
connection file) sends the ID list and sweep requests to a separate question reader (`exp/DX-XQ7-question-reader`)
serving the same database; nothing else moves.

**The fast answer from the index** has one marked place: `fastIndex()` in `questions.ts` (the tools) and
`FastIndexSlot` in `examples/console/src/pages/questions.tsx` (the page). Both say it is not built yet.

**The page** is `/questions` ("Ask across subjects" in the sidebar). `?ask=<question JSON>` opens it filled in; every
`ask_across_subjects` answer's `consoleUrl` uses it.

**Proofs** (on a second toy, never this one):

```
TRIPLEX_DEMO_STATE=~/.triplex-demo/connection-<name>.json node examples/demo-mcp/src/prove-questions.ts --out DIR [--keep]
node examples/console/e2e/questions-pass.mjs --url http://127.0.0.1:<its console port> --out DIR [--protected-url URL]
```

`prove-questions.ts` needs the second toy started with `DX_XQ3_ERASURE_DIRECTORY=1` (its protected scope removes values
on request); `--keep` leaves that scope and writes `connection-xq8prot.json` for a page server on it.

## The added question shapes (DX-XQ9)

`ask_across_subjects` and the "Ask across subjects" page also take, on a read gateway with `TX2_SWEEP_SHAPES` (the demo
profile sets `all`; `server-up.sh` records it as `questionRoutes.sweepShapes` in the ready file): `ne` ("is not"; a
subject with no value counts as not), `contains` (text, optionally any case), `has` (one level of related entities:
`related: { prefix, shape?, link: "key" | { ref } }`, `where`, `quantifier: some | none | { op, value }`), `anyOf` (up to
4 groups), `result: "top"` with `order: { by, type, direction }` and `limit` N up to 1,000, and `result: "sum"` with
`of`. Meanings, refusals and gates: `lab/experiments/EXP-DX1/xq9/QUESTION-SHAPES.md`. A console switched to the branch
`exp/DX-XQ9-question-shapes` follows the steps below from its worktree (`dx-xq9`) instead.

## Switch the owner's console to the questions build (keeps the toy's data)

Run in the worktree of `exp/DX-XQ8-console-questions`. The toy's working copy (`tx2-dxdemo1-toy-work`) is kept: no
`--reset` anywhere below.

1. Build once (dependencies, the SDK, the web app):

   ```
   pnpm install --store-dir "$(git rev-parse --path-format=absolute --git-common-dir)/../.pnpm-store" --frozen-lockfile --offline
   node_modules/.bin/turbo run build --filter=@triplex-build/triplex-datomic
   (cd examples/console && pnpm run build)
   ```

2. Stop the console server, the forwards and the stack. PostgreSQL shuts down cleanly and the working copy stays:

   ```
   bash demo/toy/down.sh
   ```

   It must end with `DEMO DOWN in N s; working copy: shut down`.

3. Start it again from this worktree, with both question routes on (they are in the profile now) and the console server
   on 127.0.0.1:28580:

   ```
   bash demo/toy/up.sh
   ```

   It must print `DEMO READY head=<the same head as before>` and the line `Console: http://127.0.0.1:28580/`. A head
   lower than before, or `DEMO READY` missing, means stop and look at the output; nothing was deleted.

4. Point the assistant's MCP server at this worktree (from the main checkout, where it is registered), then start a new
   Claude session:

   ```
   claude mcp remove triplex-demo
   claude mcp add triplex-demo -- node <this worktree>/examples/demo-mcp/src/mcp.ts
   ```

5. Reload the console tab. "Ask across subjects" is in the sidebar.

**What changes:** the stack's containers are new (new prefix), both gateways have `TX2_ID_LISTS=1`, `TX2_SWEEP=1` and a
fresh cursor key; the console and the MCP server run this branch's code. **What is lost:** about a minute of console
time, any open question's cursor, and the old console server's log (`demo-toy/logs/console.log` is rewritten). No data.
**To go back:** `bash demo/toy/down.sh`, then `bash demo/toy/up.sh` in the previous worktree (again without
`--reset`), and register the MCP server there.
