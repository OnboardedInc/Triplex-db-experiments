# Triplex Console: one Triplex database, a web app and an MCP server

Triplex Console is a local web app with a matching MCP server for one Triplex database on this project's Datomic engine. A visitor can browse accounts, subjects and entity types, ask Triplex Datalog questions, define entity types as configuration releases, create entities from a form generated from their type, and read every change as facts, history and journal entries. Every answer shows the position it was read at and the store's own time. The design is the private `demo-design/DESIGN.md`; this page says how to run it.

**The app and the assistant call the same functions.** One catalogue, `examples/demo-mcp/src/tools.ts`, defines every tool. The MCP server registers that list. The console's local server exposes the same list at `POST /api/tools/:name`. The web app (`examples/console`) calls only those endpoints. So a change the assistant makes appears in the open app.

```
 Mac                                                          the database (the toy in the lab VM, or a rented machine)
 +------------------------------------------------+          +-------------------------------------------------+
 | browser: Triplex Console (examples/console)    |          |  read gateway  (pinned-read options on) --+     |
 |    | HTTP, 127.0.0.1:28580, own Origin only    |          |  write gateway ---------------------------+     |
 | page.ts  --+                                   |   SSH    |                    transactor, PostgreSQL 17     |
 |            +-- tools.ts (one catalogue) -------+--------->+  on a working copy; the original is never started|
 | mcp.ts   --+    guard.ts: no read without      | forwards |                                                 |
 |   | stdio        an entity ID is ever sent     |          +-------------------------------------------------+
 | assistant (Claude Code: triplex-demo)          |
 +------------------------------------------------+
```

## Run it on the Mac against the toy

| Step | Command | Time |
| --- | --- | --- |
| Build the toy once | `bash demo/toy/build-toy.sh` | about 10 minutes |
| Start everything | `bash demo/toy/up.sh` (`--reset` starts from the untouched toy) | about 40 s |
| Open the console | http://127.0.0.1:28580/ (the API is `/api/catalogue`, `/api/connection`, `POST /api/tools/:name`) | |
| Restart only the console server after a code change | `bash demo/toy/restart-console.sh` | 1 s |
| Stop everything | `bash demo/toy/down.sh` | about 12 s |

**What `up.sh` runs.** It brings the stack up in the lab VM through `DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock` under one heavy token, with both pinned-read options on. It then opens the SSH forwards (`demo/connect.sh --toy`) and starts the console server. The connection file is `~/.triplex-demo/connection.json` (mode 0600). It holds the local forward ports and stays outside the repository.

**Setting up a checkout.** A checkout needs `pnpm install --store-dir <main checkout>/.pnpm-store --frozen-lockfile` and `node_modules/.bin/turbo run build --filter=@triplex-build/triplex-datomic` once. Node 22.18 or later runs the TypeScript directly. A second console server from another worktree is `node examples/demo-mcp/src/page.ts 28582` (see `demo/toy/README-FOR-CONSOLE.md`).

## Run it against the 1 billion database

| Step | Where | Command |
| --- | --- | --- |
| Bring the server up | rented machine, root | `DEMO_ORIGINAL=<stopped cluster> DEMO_HANDOFF=<aged-scorecard.json> bash demo/server-up.sh` (prints `DEMO READY head=28309866 records=1000251169 t=62888918` on a fresh copy) |
| Connect | Mac | `bash demo/connect.sh` (the address stays in `~/.triplex-demo/server`) |
| Open | Mac | `node examples/demo-mcp/src/page.ts 28580`, then http://127.0.0.1:28580/ |
| Prove it, headless on the server | rented machine, root | `bash demo/prove-console.sh --tools <bootstrap build>`; see [PROVE-CONSOLE.md](PROVE-CONSOLE.md) |
| Shut down | both | `bash demo/disconnect.sh` on the Mac; `bash demo/server-down.sh [--delete-work]` on the server |

## Register the MCP server

```sh
claude mcp add --scope local triplex-demo -- node "$PWD/examples/demo-mcp/src/mcp.ts"
```

Run it from the checkout's root. In the Claude desktop app, add `"triplex-demo": { "command": "node", "args": ["<checkout>/examples/demo-mcp/src/mcp.ts"] }` to `mcpServers`.

## The tools

**There are 22 tools in ten groups.** The catalogue (`GET /api/catalogue`) gives each tool's sentences, description, input schema and whether it changes data. The console's "Ask your assistant" page is generated from it.

| Group | Tools |
| --- | --- |
| The database | `database_summary`, `list_accounts` |
| Types | `list_entity_types`, `describe_entity_type`, `define_entity_type`, `list_releases`, `move_live` |
| Entities | `create_entity`, `list_entities`, `read_entity` |
| Subjects | `find_subjects`, `read_subject`, `read_many_subjects` |
| Time | `read_subject_at`, `field_history` |
| Questions | `query` |
| Changes | `save_facts`, `correct_past_value`, `retire_fact` |
| The feed | `change_feed` |
| Derivations | `evaluate_derivation` |
| Removal | `remove_on_request` |

**Every answer carries five things.**

- `position`: the commit position it was read or written at.
- `timing.serverMs`: the gateways' own time, summed over the requests.
- `timing.roundTripMs`: wall time on this machine.
- `timing.consoleMs`: work the console did itself, such as evaluating a question.
- `database` and `consoleUrl`: which database answered, and the console page that shows the same thing.

Changes are real commits on the working copy. Each one is attributed: the actor is `assistant` over MCP and `console` from the app. Each has a command ID and a precondition on the entity's observed state. Typed writes are pinned to the release `live` points to. A changing tool refuses unless the connection file marks a working copy.

## How the console works on this engine

| Topic | What the console does | Where |
| --- | --- | --- |
| No scans | A guarded client refuses any row read without an entity ID before it is sent. The five configuration reads are the exception: they are given IDs found from the refs. The store's Datalog route is sent only after the query tool's checks. | `guard.ts` |
| Configuration | Triplex's stock `ConfigStore` runs unchanged. Its by-type reads are bounded to IDs found by walking from `test` and `live`. Every commit moves `test`; only `live` is moved by hand. | `config.ts`, `releases.ts` |
| Entities of a type | They are numbered per type and account, `acct/<account>/<type>:<8 digits>`, with one counter entity per type and account. Values are checked with Triplex's `EntityCodec`. Uniqueness is not enforced (gap G4). | `entities.ts` |
| Questions | A question runs over one subject (pulled in one request, then evaluated by Triplex's in-memory Datalog), up to 16 subjects at one position, or the store when every pattern names its entity. Whole-database questions are refused with the reason. | `query.ts`, `demo/console/questions.json` |
| Derivations | Triplex's `Derivation.evaluate` and `reconcile` run per subject with a reader over the pulled facts. Nothing is materialized. | `derive.ts` |
| The feed | Pages, one entity's journal, one actor's transactions, who changed since a position, and a long poll for Live. | `store.ts` (`changeFeed`) |

## Gates (the toy; times diagnostic)

| Gate | Command (in `examples/demo-mcp`) | What it proves |
| --- | --- | --- |
| Catalogue | `node src/gate-catalogue.ts` | MCP and HTTP return the same JSON for every tool; the Host and Origin rules hold |
| G12 | `node src/gate-g12.ts` | A stock `ConfigStore.commit` works on the lean-layout toy |
| Configuration | `node src/gate-config.ts` | The bounded load equals the stock load; a restart loses nothing; two processes commit in turn; the five tools work |
| Entities | `node src/gate-entities.ts` | Eight creates at once get eight numbers; read backs match; journal entries carry the release |
| Query | `node src/gate-query.ts` | A scan makes zero requests; the subject source equals the store source; counts equal the generator's arithmetic |
| Journal | `node src/gate-journal.ts` | Pages equal `Triples.transactions`; who changed since equals a direct count |
| Derivations | `node src/gate-derive.ts` | Candidates equal `Derivation.evaluate` over level-by-level reads; reconcile matches a hand-built case |
| Every tool | `node src/prove.ts --out DIR` | The proving run: every tool, table 10.4, read backs (also the rehearsal of the 1 billion run) |

## Particular to this database

- **The loader's journal rows.** The bulk loader wrote the position row of its 28,222,864 saves in a non-standard form. The console reads them with the named rule `acceptLoaderPositionRows(true)`. The rule is on only when the connection file says the loader built the database.
- **Record time runs about a year ahead.** The aging loader's record clock was ahead of wall time. A record time before the database's first is refused, with the range.
- **Loader-built facts carry no entity type.** The ten accounts are browsed by account and subject number. Their entities are "untyped". The starter type `Subject` exists so a new type can reference a real subject.

## What is refused or slow, and why

| What | Here | Gap |
| --- | --- | --- |
| A question with no entity named, `not`, `or` or rules sent to the store | Refused before sending | G3 |
| Listing entities by type | By entity number only | G2 |
| Uniqueness | Declared, not enforced | G4 |
| History of a heavily saved entity | 4.4 s cold, 225 ms warm at 1 billion (recorded) | G8 |
| Removal on request | Refused: no protected values, and a declaration is refused on a populated scope | G9 |
| Saves wider than three replacing facts | Taken by the general writer | G10 |

[EXAMPLES.md](EXAMPLES.md) holds the recorded examples. `demo/console/examples.json` is the same set in JSON for the Assistant page. The proving run on the 1 billion database rewrites both. Until then they come from the first demo, or from the toy rehearsal (`demo/console/examples.json` says which database recorded it).
