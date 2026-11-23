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
