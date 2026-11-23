# Demo: the 1 billion record database from a Mac

Show an engineer, live, what the store does at one billion records: questions answered with the time each took, changes committed and read back, and what the store keeps (history, both time axes, the change feed).

The database lives on a rented machine. Its gateways listen only on that machine's loopback interface. The Mac reaches them through SSH port forwards. An assistant reaches them through a local MCP server. A browser reaches them through the MCP Inspector or a one-page inspector.

```
 Mac                                                     rented machine (12 cores, 96 GB, 2 NVMe)
 +----------------------------+                         +---------------------------------------------+
 | assistant (Claude Code or  |                         |  read gateway  127.0.0.1:18495 --+          |
 | the desktop app)           |                         |  write gateway 127.0.0.1:18491 --+          |
 |   | stdio                  |      SSH (TCP 22)       |                     |    transactor (32 GiB    |
 | examples/demo-mcp (MCP) ---+-- 127.0.0.1:2849x ------+---------------------+    object cache)         |
 | inspector page :28580 -----+   (demo/connect.sh)     |                     |         |                |
 | MCP Inspector (browser) ---+                         |               PostgreSQL 17 on               |
 +----------------------------+                         |               work/cluster (a byte copy)     |
                                                        |               original cluster: never started|
                                                        +---------------------------------------------+
```

## The three commands

| Step | Where | Command | Time |
| --- | --- | --- | --- |
| 1. Bring the server up | rented machine, as root, in a checkout of this branch | `DEMO_ORIGINAL=<stopped cluster> DEMO_HANDOFF=<aged-scorecard.json> bash demo/server-up.sh` | about 10 minutes with the cluster on the machine (copy 3 to 8, start 1 to 4, identity checks 1 to 3); add about 25 to 40 minutes for `--fetch` from object storage; add 10 to 15 minutes on a freshly installed machine (bootstrap) |
| 2. Connect | Mac | `bash demo/connect.sh` | under 10 seconds |
| 3. Use it | Mac | an assistant with the MCP server registered (below), or `bash demo/inspect.sh` (MCP Inspector), or `bash demo/inspect.sh --page` (one-page inspector) | seconds |

**Step 1 in detail.** `server-up.sh` bootstraps what is missing (Docker, Node, the two Datomic images, through `lab/experiments/EXP-DX1/t1/bare-metal.sh --prepare`), fetches the cluster when it is not on the machine, copies it to `/var/tmp/triplex-demo/work/cluster`, starts PostgreSQL, the transactor and both gateways on the copy with the 32 GiB cache settings, runs the identity checks, and prints one line:

```
DEMO READY head=28309866 records=1000251169 t=62888918 ...
```

- **Identity checks:** the handoff file's SHA-256; the live head from the write gateway and from a fresh Datomic peer; the native t and the stored record count (Datomic datoms) from that peer; and, on a fresh copy, the AGE1 scorecard check that the V01 card runs (`lab/experiments/EXP-DX1/age1/scorecard.mjs check`: head, t, records, last receipt, original membership rows, feed page).
- **Fetch from object storage:** `--fetch` with the four storage values in the environment for that command only (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `S3_BUCKET`; take them from the private `cloud/object-storage.env`, never from this repository). It downloads `aged-1b/cluster.tar.zst` and its JSON files, checks the archive and handoff digests, extracts with owners and modes, and checks the tree digest (1,642 files, 176,078,670,513 bytes). It needs 520 GB free.
- **On the Mac (toy):** `bash demo/toy/build-toy.sh` once, then `bash demo/server-up.sh --toy`.

**Step 2 in detail.** Put the server's address in `~/.triplex-demo/server` (one line; it stays on the Mac, outside the repository). `connect.sh` opens the two forwards on free local ports (never 15442, 17019, 5432, 6379, 4222, 4566 or 16686), checks both gateways answer, prints the head and record count, and writes `~/.triplex-demo/connection.json` (mode 0600), which the MCP server and the inspector page read. `bash demo/disconnect.sh` closes the forwards.

## Register the MCP server

**Claude Code, local scope** (stays out of the repository; run from the repository root):

```sh
claude mcp add --scope local triplex-demo -- node "$PWD/examples/demo-mcp/src/mcp.ts"
```

**Claude desktop app:** Settings, Developer, Edit Config, then add to `mcpServers` and restart the app:

```json
"triplex-demo": { "command": "node", "args": ["<absolute path to this checkout>/examples/demo-mcp/src/mcp.ts"] }
```

Node 22.18 or later runs the TypeScript directly. Run `pnpm install` and `node_modules/.bin/turbo run build --filter=@triplex-build/triplex-datomic` once in the checkout first.

## The tools

**Subjects.** The store's unit is the subject: everything recorded about one subject hangs from its root record. In this test data each subject is a worker record (a profile, placements, tasks, subtasks and files), ten accounts of 100,000 subjects each.

Every answer carries `timing.serverMs` (the gateways' own handling time, summed over the requests), `timing.roundTripMs` (wall time on the Mac, tunnel included), the requests made, and `position` (the database position read or written at).

| Tool | What it shows |
| --- | --- |
| `database_summary` | records counted at bring-up, subjects, accounts, sealed head, live head, the record-time range, transactions added since the seal |
| `list_accounts` | the ten accounts and their subject counts, from the sealed roster that bring-up checked (one basis call); `checkDirectories` also reads each account's directory entity live (about 220 ms cold at 1 billion) |
| `find_subjects` | subjects by account and subject number (the store's subject key; protected values are never looked up by value) |
| `read_subject` | every current fact of one subject (root, profile, placements, tasks, subtasks, files) at one exact position, one request |
| `read_subject_at` | both time axes: what is now known to have been true on a date, and what the store believed about that date at a record time |
| `field_history` | every stored row of one field, retired ones included, with valid and record times and positions; reports how many rows of the entity's history the gateway read (see "History reads" below) |
| `change_feed` | committed transactions after a position, optionally one account's changes only |
| `read_many_subjects` | up to 16 subjects at the identical position in one request |
| `save_facts` (changes) | new values from now on; receipt with durable position; readback at that position |
| `correct_past_value` (changes) | a valid-time correction from a past date; the belief before and after |
| `retire_fact` (changes) | a fact stops being current; its past stays in history |
| `remove_on_request` (changes) | checks the database's removal state; on this database it explains why removal cannot be shown and changes nothing |

Changing tools commit for real (durable, synchronous) and refuse unless the connection file says the target is a demo working copy. [Worked examples](EXAMPLES.md) has eighteen prompts in showing order with real outputs and times.

## History reads

A history read costs what that one entity's history costs, not what the database's size costs. The gateway reads every row the entity ever stored (all its attributes, every value ever written) and, for each retired row, the position and clock of the transaction that retired it; it filters to the asked attribute afterwards. The aging loader saved the first three fields of 20,000 subjects' first tasks (2,000 per account) about 1,411 times each, every 20,000 positions, so such a subject's task holds thousands of retired rows spread across the whole index. On the 1 billion database `field_history` for one of them (account-003, subject 0: 1,412 rows of `:task/field-0`) took 4,404.67 ms of gateway time cold and 225.21 ms warm. A subject outside that sample (subject 1) has one row per field. The worked examples show both, each labelled with its number of saves.

## Two things particular to this database

- **A compatibility rule for the loader's journal rows.** The bulk loader that built this database (AGE1's aging loader) wrote one field of each save's journal in a non-standard form: the position row of all 28,222,864 aged saves (positions 87,003 to 28,309,866) carries the position as a payload under the ordinary marker, where product writers write a null payload under the "P" marker. The product's reader refuses those rows, so the change feed and journal reads across the aged history would fail. The demo reads them with a named compatibility rule, `acceptLoaderPositionRows(true)` in `@triplex-build/triplex-datomic`: it accepts exactly that form (the payload must equal the row's own position, under the ordinary marker) and nothing else. It is off in the product's default reader and on only when the connection file says the database was built by that loader. `database_summary` and `change_feed` say when it is on.
- **Record time runs about a year ahead.** The aging loader's record clock starts a year after the seed's and advances in simulated days, so record times on this database fall about a year ahead of wall time, and every new save is recorded after the last aged save. `database_summary` prints the database's own record-time range. A "what did the store believe on this date" question must use a record time inside that range; valid times (what was true when) are ordinary dates.

## Reset and shut down

- **Reset to the sealed state:** `sudo bash demo/server-down.sh`, then `sudo bash demo/server-up.sh --reset` (with the same `DEMO_ORIGINAL` and `DEMO_HANDOFF`). The copy is replaced from the untouched original (3 to 8 minutes).
- **Shut down:** `bash demo/disconnect.sh` on the Mac, then `sudo bash demo/server-down.sh` on the server (under a minute; PostgreSQL stops cleanly, so the next bring-up can reuse the copy with its changes). Add `--delete-work` to remove the 177 GB copy.

## What the demo does not show

- **Removal on request.** The integrated build accepts a protection declaration only before a scope's first save; the 1 billion database was loaded without one, so it holds no protected values to remove. The tool says so and changes nothing. On the toy aged by the same loader code, the gateway itself refused a declaration (409 ProtectedScopeNeedsMigration), which is what the tool's explanation states.
- **Publish answers and group reads.** The read gateway's Publish path needs a release written into the scope first; the demo does not write one into the sealed database.
- **Fast reads far back in time.** A read "as of" a position far behind the head costs about 40 ms of read-gateway CPU at 1 billion (the RD1 diagnosis, `rd1/PINNED-1B.md` on `exp/DX-RD1-readers`); `read_subject_at` measured 24 to 25 ms of gateway time in the proving slot. A fix is being built as an option; it is not in this demo.
- **Fast history for heavily saved subjects.** See "History reads": about 4.4 s cold for a subject the loader saved about 1,411 times.
- **Load.** Each answer is one request at a time from one client. The measured rates and tails are in the scorecard runs, not here.
- **Live record counts.** The record count is the peer's count at bring-up; the summary reports positions added since.
- **Times through the tunnel.** `roundTripMs` includes the Mac's network path to the machine. `serverMs` is the store's own time.
