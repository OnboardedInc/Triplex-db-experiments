# Proving Triplex Console on the 1 billion database

This page is for the server driver. It needs nothing from the builder. One script, `demo/prove-console.sh`, runs on a rented machine that already holds the sealed 1 billion record cluster. It installs and builds the checkout, brings the demo stack up on a working copy with both pinned-read options on, runs every console tool on the machine itself (no Mac tunnel), and times each row of the design's table 10.4. It also measures gap G13 and reads back every value it changed. It writes `console-proof.json` and `console-proof.md`, plus one archive.

## What it does, in order

| Step | What runs | Predicted time |
| --- | --- | --- |
| 1 | `pnpm install` and the `@triplex-build/triplex-datomic` build, once per checkout (from the bootstrap's package store when it has the packages, otherwise online) | 1 to 4 min |
| 2 | `demo/server-up.sh` on a working copy. It is the same bring-up as the first demo's slot, which took 169 s with the cluster on the machine. A fresh copy (`--reset`) adds 3 to 8 min. The script stops if the read gateway does not have both pinned-read options on. | 3 to 12 min |
| 3 | `examples/demo-mcp/src/prove.ts`: about 100 tool calls, table 10.4, G13, read backs | 2 to 6 min |
| 4 | `examples/demo-mcp/src/gate-catalogue.ts`: the MCP server and the console's HTTP server return the same JSON for every tool | under 1 min |
| 5 | The archive `<out>.tar.zst` and its `.sha256` | seconds |

**The whole run is predicted at 8 to 22 minutes.** The script stops the proof at 1,500 s (`--ceiling`). With bring-up and the gate, nothing can run past 40 minutes. The stack stays up when the script ends.

**What changes on the working copy.** These writes are real commits, all on the working copy: two configuration releases (`reviews-1` with the starter type `Subject` and `Review`, then `vehicles-1`), live moved back and forward, five `Review` entities in account-003, one typed save, one correction and one retirement on the first review, one text save on subject 50000's first task, and the catalogue gate's eight commits on the first task of subject 7 of account-003. The original cluster is never started or written.

## Commands

`<COMMIT>` is the head of `exp/DX-CON1-functions` named in the launch message. `<BUILD>` is the server's bootstrap build directory, the one whose `tools/bin` holds Node 22; it is the same `base-build` the first slot used on that server. The two paths below are the ones the first slot used on server 2; use that server's own paths on the other machine.

| Clock | Where | Command | Predicted |
| --- | --- | --- | --- |
| T+0 | server, `sudo -i` | `rm -rf /var/tmp/triplex-console-src && git clone --depth 1 --branch exp/DX-CON1-functions https://github.com/OnboardedInc/Triplex-db-experiments.git /var/tmp/triplex-console-src && cd /var/tmp/triplex-console-src && [[ $(git rev-parse HEAD) == <COMMIT> ]]` | 1 min |
| T+1 | server | `docker ps --format '{{.Names}}' && df -BG /var/tmp && free -g`. No other demo stack may run. 200 GB must be free for a fresh copy. The machine must have 89 GiB or more of memory. No measurement may be running, or the times are not quiet. | seconds |
| T+1 | server | `DEMO_ORIGINAL=/mnt/triplex-scale1-held-age/calibrated-post-ladder/cluster DEMO_HANDOFF=/var/tmp/triplex-scale1/age-v01-bulk-c/rung/1000000000/aged-scorecard.json bash demo/prove-console.sh --tools <BUILD> --reset --port 28590` | 8 to 22 min |
| T+23 | server | `bash demo/server-down.sh --delete-work` (removes the 177 GB copy; the original is untouched) | 1 to 2 min |
| T+25 | Mac | Copy `<out>.tar.zst` and its `.sha256` into `~/Claude/Projects/triplex-db-2/evidence/DX-CON1/`. The script prints the `<out>` path on its `results:` line; the default is `/var/tmp/triplex-console-proof/<UTC time>`. | 1 min |
| T+26 | Mac | In a checkout of the branch: copy `console-proof.md` to `demo/CONSOLE-PROOF-1B.md`, then `git add demo/CONSOLE-PROOF-1B.md && git -c user.name='Triplex Lab' -c user.email=noreply@anthropic.com commit -m 'Console proving run on the 1 billion database' && git push origin exp/DX-CON1-functions` | seconds |

**Options.**

- `--port N` is the loopback port for the gate's console server, default 28590. The script refuses 28580, the lab's reserved ports and any port in use.
- `--out DIR` sets where the results go.
- `--no-bring-up` uses a stack this checkout already brought up; the script reads its ready file as is.
- `--reset` is passed through to `server-up.sh`. Leave it out only to reuse a working copy you know.
- `--ceiling S` sets the proof's time limit, default 1500.

**What the script prints.** Lines that start `[prove Ns]`, the bring-up's `[demo]` lines, one `PASS` or `FAIL` line per check, one `ROW` line per row of table 10.4, and the last line, `CONSOLE PROVING RUN PASSED|FAILED proof=.. gate=.. total=..s commit=..`. It prints no address, credential or object storage value. The connection file it writes holds only 127.0.0.1 ports and stays out of the archive.

**The ready line must say** `DEMO READY head=28309866 records=1000251169 t=62888918` on a fresh copy. Any other head, t or record count stops the run, because the copy or the handoff is not the sealed cut.

## Predictions, copied unchanged from the design (table 10.4)

These were written before the run, as the project's rule requires. Recorded values are today's. The last column says what changes if the prediction fails.

| Operation at 1 billion | Predicted store time | Basis | If it fails |
| --- | --- | --- | --- |
| Configuration check (two ref entities by ID, write gateway) | 1 to 5 ms warm | A warm entity read is under 2 ms (recorded). | Over 50 ms: check every 10 s, not before every read. |
| First full configuration walk after a start | 60 to 300 ms | 20 to 40 small entities in four to six batched reads; about 30 ms for a cold read (recorded). | Over 1 s: the sidebar's slow state covers it once per start. |
| Commit a release with one new type | 30 to 120 ms warm; up to 500 ms as the first write | Correction 46 ms, retirement 32 ms, first save 448 ms (recorded). | Over 1 s: commit the first release before Ben arrives. |
| Create an entity | 20 to 80 ms | As above; the counter adds one replaced fact. | Over 300 ms: look at the precondition read. |
| A question on one subject | 1.84 ms for the pull, warm; under 10 ms in the console | Recorded pull; evaluation measured on the Mac. | Console over 50 ms: keep the in-memory copy between runs at one position. |
| A store-source question on an ordinary entity | 5 to 40 ms over three requests | 53.84 ms on the small database, including opening the scope. | Over 200 ms: label it. |
| A store-source question on a heavily saved entity | 0.2 to 5 s | It reads the full history: 225 ms warm, 4.4 s cold (recorded). | Keep the label. |
| An entity's journal, newest 20 | 20 to 300 ms; unknown on a heavily saved entity | 229 ms on the small database for one transaction of 124 changes. | Over 1 s: slow state on the Journal tab. |
| A read at position 87,002 with the options on | 1 to 3 ms | p50 1.37 ms (recorded). | Slower: the options are not on; check the profile. |
| A read with no entity ID reaching a gateway | Never | The guard. | Any such request is a defect. |

**How each row is measured.**

| Row | Measured as |
| --- | --- |
| Configuration check | The p50 of 20 checks in a fresh process, after its walk. One request each, to the write gateway. |
| First full walk | A fresh process after both releases exist. Store time over all its batched reads. |
| Commit a release | The store time of the transactions alone (the commit, then the live move). The second type, `Vehicle`, gives the warm number. The first, `Review`, is also the run's first write. The whole tool's time, which includes the stock loader's five bounded reads, is printed beside it. |
| Create an entity | The p50 of five creates, the transaction alone. The whole tool's p50 is printed beside it. |
| A question on one subject | "Tasks that are not complete" on subject 50000, ten times. The console's time (seeding the in-memory copy and evaluating) is the row. The pull's store time is printed beside it. |
| Store source, ordinary | `:task/status` of `acct/account-003/i9:00050000`, the p50 of the nine runs after the first. |
| Store source, heavily saved | The same question on `acct/account-003/i9:00000000`, the task the loader saved about 1,411 times. The row is its first, cold run; three warm runs are printed after it. |
| An entity's journal | `transactionsForEntity`, limit 20, on the ordinary task first. The created review and the heavily saved task (G13) are printed beside it. |
| Read at position 87,002 | `read_subject` of subject 50000 at position 87,002. The row is the p50 of 20 warm reads; the first read is printed. |
| No entity ID | Requests sent by a refused whole-database question plus a direct row read by attribute. It must be 0, with exactly one guard refusal (the deliberate one) in the whole run. |

**The builder's own prediction for G13, added before the run.** On the heavily saved task, `transactionsForEntity` with limit 20 is predicted at 50 to 1,500 ms on its first read and 20 to 400 ms after that. It should return 20 transactions. These results would show the prediction wrong:

- Over 5 s would mean the entity-transactions route reads the entity's whole history rather than its newest positions.
- Fewer than 20 transactions would mean it misses the loader's saves. The loader's position rows are read with the named compatibility option.

**Other things that would show the design wrong:**

- **The first release fails.** The cause would be the general writer refusing a configuration commit at this size. G12 passed on the lean-layout toy only. The script prints the error on the `3 first release` line, and every type row after it fails.
- **Bounded configuration reads differ from Triplex's own.** The toy gate compared them with the stock loader; at this size the stock loader would scan, so it is not run here.
- **A create takes over 300 ms.** The design says to look at the precondition read then.

## What the results contain

- **`console-proof.json`** holds:
  - the commit, the start and end times and the total seconds;
  - the identity (records at bring-up, sealed head, the head at the start and end, the pinned-read options, the memory profile);
  - each table row with its measured value, its verdict and how it was measured;
  - the G13 numbers and the configuration walk;
  - every check, and the guard's counters;
  - every call with its store time, console time, wall time and number of requests.
- **`console-proof.md`** holds the same as tables.
- **Each row gets one of these verdicts:** `within prediction`, `faster than predicted`, `slower than predicted, under the action line`, or `ACTION: <the design's If it fails text>`. The no-entity-ID row gets `holds` or `DEFECT`.

## Rehearsal on the Mac

The same `prove.ts` ran on the toy on 2026-11-23 and passed 34 of 34 checks in 5 s, followed by the catalogue gate (68 of 68). It ran from a simulated `prove-console.sh` with `--no-bring-up`, against a ready file with the forwarded ports. Its times are diagnostic only.
