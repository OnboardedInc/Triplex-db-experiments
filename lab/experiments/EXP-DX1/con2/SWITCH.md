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
