# CON2: switch the owner's console on 127.0.0.1:28580 to the one branch's build, keeping the toy's data

Branch `exp/DX-CON2-console-switch`, from the one branch `exp/DX-INT1` at `efee27905`. The owner approved the switch on
2026-11-25. Times are local (EST) from `date`. Mac only; no server.

## 1. What runs now (read 17:07 to 17:12, nothing changed)

- **Console:** one `node examples/demo-mcp/src/page.ts 28580` process, started 2026-11-24 06:25:33 by `demo/toy/up.sh`
  (no `--reset`) in the worktree of `exp/DX-CON1-console` at `e6405e403`. No Triplex variable in its environment; it
  reads the private connection file and writes its log into the private toy folder.
- **Stack:** prefix `tx2-dxdemo1-toy-f3312cf7`, four containers in the lab VM, up about 35 hours: `-pg`
  (`postgres:17-alpine`), `-tx`, `-gw-w`, `-gw-r` (all three on image `sha256:21a67288...`, tag
  `tx2-datomic:1.0.7745-da00`, with the gateway source staged from `e6405e403` and mounted read-only at `/opt/gateway`).
  Gateways publish 18491 (write) and 18495 (read) on the VM's loopback; an SSH forward maps them to 28491 and 28492.
- **Data:** PostgreSQL's data directory is the **named volume `tx2-dxdemo1-toy-work`** (the toy's working copy, made
  2026-11-24 02:09 UTC from the volume `tx2-dxdemo1-toy-original`). So the data does not live only in the container:
  the container can be stopped and replaced without losing it. Database `datomic`, table `datomic_kvs`, 1,227 rows.
- **Datomic database:** the one scope database `s2-WyJ0cmlwbGV4...` of the toy: 10 accounts of 12 subjects (120), head
  position 279 (9 positions since the seal at 270), 45,105 records counted at bring-up; entity types `Subject` and
  `Review` (6 reviews in `account-003`).
- **Read gateway options now:** the two pinned-read options on; **no question routes** (`TX2_ID_LISTS`, `TX2_SWEEP`,
  `TX2_SWEEP_SHAPES` absent), so "Ask across subjects" could not answer on the running stack.
- **Agent tools:** the `triplex-demo` MCP server is registered in the local scope of the main checkout as
  `node <dx-con1-app>/examples/demo-mcp/src/mcp.ts`.

## 2. What the one branch needs that the running toy lacks

| Need | Where it comes from | On the running toy |
| --- | --- | --- |
| The one branch's gateway code | staged from the worktree's `packages/datomic/gateway` at stack start | `e6405e403`'s code |
| Read gateway `TX2_ID_LISTS=1`, `TX2_SWEEP=1`, `TX2_SWEEP_SHAPES=all` and one cursor key | `demo/server/profile.mjs` (on in every demo stack); `server-up.sh` refuses to finish without them | absent |
| This build's commit function and schema in the scope | `server-up.sh` opens the scope (`/v1/db/create`, never creates); it installs the commit function when its source hash differs, and additive schema | `e6405e403`'s |
| The console app, the console server and the MCP server of this branch | `examples/console/dist` (vite build), `examples/demo-mcp` | `e6405e403`'s |

**Not needed for the page, so left off (default off on the one branch):** the commit-time index
(`DEMO_CROSS_INDEX=1`, which would declare six attributes and backfill their entries into the owner's working copy),
the erasure directory (`DX_XQ3_ERASURE_DIRECTORY=1`, needed only by the questions proof on a second toy), the account
setting, the per-account removal option, the commit boundary, the sealing setting and every Publish setting.

**Image.** `stack/up.sh` uses only `/opt/datomic` and the Java runtime from the image; the gateway code is the staged
source. The image the toy runs (`21a67288`) and the image the merge agent built from the one branch today (receipt
`n1u1`) hold the same Java base digest and a byte-identical `/opt/datomic` (792 of 792 files, same SHA-256). A private
build from this head would need the merge agent's holder name (`--variant-receipt` is limited to DX-THIN1, DX-JVM1,
DX-CHK1), and a plain build retags the shared `tx2-datomic:1.0.7745-da00`. So no image is built: `stack/up.sh` pins
`21a67288` by ID as it does for every demo toy, and the one branch's code arrives through the staged gateway source.

## 3. Safety copy (17:11 to 17:13, before any change)

In the private backups folder `console-toy-2026-11-25/` (outside the repository): `pg_dump -Fc` of database `datomic`
(7,925,040 bytes, SHA-256 `112f63f7...51eb`; its listing shows table `datomic_kvs` and its data), the roles
(`globals.sql`), the row count and a content digest of `datomic_kvs` (1,227 rows, 22,666,117 value bytes, digest
`fae6c5b0...`), the four containers' and the volume's `docker inspect`, the old console's commit, command line and
environment, the connection and ready files, and 33 read-only answers of the old console (summary, accounts, the 12
subjects of every account, the reviews, four subjects read now, at a past valid time, at position 270 and at a past
record time, and the change feed after 250), plus four screenshots.

## 4. Plan (written 17:18, before executing)

The smallest switch that keeps the data: keep the working-copy volume; replace the stack's containers and the app.
Keeping the PostgreSQL container itself is not possible on the scripted path: `stack/up.sh` refuses to start a demo
stack while any container, running or stopped, uses the working copy ("Demo working copy is in use"). Building the
three Java containers by hand around it would bypass that guard, so the scripted path is used: PostgreSQL is shut down
cleanly and a new PostgreSQL container opens the same volume.

1. Build in the new worktree (no downtime): `pnpm install --frozen-lockfile --offline` with the shared store, the SDK
   build, the console's vite build, each under one heavy token.
2. Downtime starts: stop the old console server by its process ID (no pattern kill).
3. `bash demo/toy/down.sh` from the new worktree: gateways, transactor, then PostgreSQL with a clean shutdown; the old
   four containers and their network removed; forwards closed; volume kept. Must end `working copy: shut down`.
4. `bash demo/toy/up.sh` from the new worktree, no `--reset`, no `DEMO_CROSS_INDEX`, no erasure directory. It takes
   one heavy token itself (it cannot run inside another). Must print `DEMO READY head=279` (or the same head as
   before) and `Console: http://127.0.0.1:28580/`.
5. Verify (section 5), then re-register `triplex-demo` at the new worktree in the same local scope.
6. On a failed check: `down.sh`, then `up.sh` in `dx-con1-app` (no `--reset`), MCP back to `dx-con1-app`. If the data
   itself were damaged: restore the dump into a fresh volume (never needed so far).

**Predictions.**
- Head after start: 279 exactly, record count by a fresh peer 45,105 at bring-up time plus whatever the scope open
  writes (the commit function install is one transaction: head 280 or 281 after the open is expected; a head below
  279 means stop).
- Accounts 10, subjects 120, 12 per account, 6 reviews in `account-003`: unchanged.
- The four reads at a past valid time, at position 270 and at a past record time: equal to the old build's answers
  once timings and links are set aside; a reply that differs in shape only (a new field) is noted, a different value
  is a failure.
- "Ask across subjects" answers a question on the sweep route with `complete: true`; the index card says the index is
  not on for this database.
- Downtime: about 1 to 2 minutes of stack stop and start (the last full start took 41 s for the stack and 4 s for the
  identity check) plus the wait for a heavy token, which depends on the other agents' jobs (all four tokens held at
  17:16).
- `datomic_kvs` grows by a few rows (the open's transaction and index work); nothing shrinks.

## 5. What happened (executed 17:22 to 17:27)

- **Builds (17:22:28 to 17:23:12):** install, SDK and console app, each under one heavy token with `--poll-ms 100`. A
  first install at the default 1 s polling waited over 9 minutes without getting a token and was stopped by its own
  process ID; hence the one change of this branch: `demo/server-up.sh` now polls for the toy start's token every 100
  ms (`3b03e0511`). A smoke start of the new console server on a spare port answered `/api/health` and listed 27
  tools, then was stopped by its process ID.
- **Downtime: 17:23:36 to 17:25:35, 1 minute 59 seconds.** Old console stopped by its process ID at 17:23:36; no other
  `page.ts 28580` process existed. `down.sh`: `DEMO DOWN in 12 s; working copy: shut down`. `up.sh` (no `--reset`):
  start-stack 101 s (about 50 s of it waiting for a heavy token), identity 4 s, `DEMO READY head=279 records=45105
  t=4913`, forwards on the same local ports, `Console: http://127.0.0.1:28580/` at 17:25:35.
- **New stack:** prefix `tx2-dxdemo1-toy-d5643837`, PostgreSQL on the same volume `tx2-dxdemo1-toy-work`, the three
  Java roles on image `21a67288` by ID, gateway source staged from `3b03e0511` (the one branch's `efee27905` plus this
  page and the polling line; gateway files identical to `efee27905`).

## 6. Verification on the live console (17:25 to 17:27)

| Check | Before (old build) | After (one branch) |
| --- | --- | --- |
| Head position | 279 | 279 |
| Records counted at start | 45,105 | 45,105 |
| Accounts / subjects / per account | 10 / 120 / 12 each | 10 / 120 / 12 each |
| Reviews in `account-003` | 6 | 6 |
| 33 read-only answers (summary, accounts checked live, every account's subjects, reviews, four subjects now, at a past valid time, at position 270 and at a past record time, the change feed) | captured 17:13 | 0 value differences, 0 fields added or lost (timings and links set aside) |
| `datomic_kvs` rows / value bytes | 1,227 / 22,666,117 | 1,232 / 22,798,836 (grew; nothing lost) |
| "Ask across subjects": pending tasks of `account-003` | page absent | 12 of 48, complete, slow exact route, position 279 |
| Questions page pass (`questions-pass.mjs`, read-only), light and dark | — | 46 of 46 |
| Agent tool over MCP (`ask_across_subjects`) | — | 12, complete, slow exact route, position 279 |

The prediction that the scope open would move the head was wrong: the head stayed 279 (the open's work did not add a
logical position); the PostgreSQL table grew by 5 rows. Everything else matched the predictions.

**The index is off for this database** (`indexed_attributes`: nothing declared; the page says "Fast answer from the
index: off" and `IndexOff`). Turning it on (`DEMO_CROSS_INDEX=1 bash demo/toy/up.sh`) would start the read gateway
with `TX2_CROSS_INDEX`, declare six attributes (`:i9/status`, `:task/progress`, `:placement/status`, `:review/of`,
`:person/custom-pay-cents`, `:person/custom-start`) and backfill their entries into the owner's working copy
(database-wide, only growing; about 966 entries on a fresh toy), after which "Auto" would answer those questions from
the index and "Compare both routes" would show both. Not done: it is off by default and the page works without it.

**Options the toy runs with now:** read gateway `TX2_PINNED_SHORTCUT=1`, `TX2_PINNED_CUT_LOOKUP=1`, `TX2_ID_LISTS=1`,
`TX2_SWEEP=1`, `TX2_SWEEP_SHAPES=all`, a fresh sweep cursor key; the laptop memory profile as before. Off: the index,
the erasure directory, the batched read route of API1 (`TX2_READ_BATCH`; its code is in the gateway, the route is
absent), the account setting, per-account removal, the commit boundary, sealing and every Publish setting.

## 7. Agent tools

`triplex-demo` re-registered in the same local scope of the main checkout, now
`node <dx-con2-app>/examples/demo-mcp/src/mcp.ts`; `claude mcp get` reports it connected, and a stdio call listed 27
tools and answered `ask_across_subjects` (12, complete). Sessions already open keep their old MCP process until they
are restarted.

## 8. Rollback (not needed)

From the worktree `dx-con1-app`: `bash demo/toy/down.sh`, then `bash demo/toy/up.sh` (no `--reset`), then re-register
`triplex-demo` at `dx-con1-app`. The old worktree and the image are kept. The old build reinstalls its own commit
function on open; the schema this build added is additive. If the data itself were ever damaged, the private dump of
17:11 restores the working copy as it was before the switch.
