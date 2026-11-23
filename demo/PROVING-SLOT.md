# Proving slots on the 1 billion database

## Second slot: rerun of the proof and one press of the dashboard's load (about 15 to 20 minutes)

The first slot (below) passed on server 2: 17 calls, 18 checks, bring-up 169 s. This rerun shows the renamed tools (subjects), the cheaper `list_accounts`, and the history pair: a subject with a short history and one the loader saved about 1,411 times, each labelled. It rewrites `demo/EXAMPLES.md` from the 1 billion database. `<COMMIT>` is the branch head named in the launch message.

| Clock | Where | Command | Predicted time |
| --- | --- | --- | --- |
| T+0 | server, `sudo -i` | `rm -rf /var/tmp/triplex-demo-src && git clone --depth 1 --branch exp/DX-DEMO1-billion-demo https://github.com/OnboardedInc/Triplex-db-experiments.git /var/tmp/triplex-demo-src && cd /var/tmp/triplex-demo-src && [[ $(git rev-parse HEAD) == <COMMIT> ]]` | 1 min |
| T+1 | server | `[[ -z $(docker ps -q) ]] && df -BG /var/tmp && export PATH=<the server's bootstrap build>/tools/bin:$PATH` (on server 2, the `tools/bin` the first slot used) | seconds |
| T+1 | server | `DEMO_ORIGINAL=/mnt/triplex-scale1-held-age/calibrated-post-ladder/cluster DEMO_HANDOFF=/var/tmp/triplex-scale1/age-v01-bulk-c/rung/1000000000/aged-scorecard.json bash demo/server-up.sh 2>&1 \| tee /var/tmp/triplex-demo-up-2.log` (state stays under `/var/tmp/triplex-demo`; a working copy left there is replaced only with `--reset`, so add `--reset` if one exists) | 3 min (first slot: 169 s) |
| T+4 | Mac | `git -C <demo checkout> pull --ff-only && bash demo/connect.sh` | 10 s |
| T+5 | Mac | `(cd examples/demo-mcp && node src/proof.ts --no-load --json ~/Claude/Projects/triplex-db-2/demo-1b/proof-1b-2.json)` (the examples; on a fresh copy only) | 1 to 2 min |
| T+7 | Mac | `bash demo/inspect.sh --dashboard &` then open http://127.0.0.1:28580/ and press **Start load** with the defaults: 20 saves/s, 200 reads/s, 300 subjects, 60 s; watch it to the end (or press STOP) | 1.5 min |
| T+9 | Mac | `(cd examples/demo-mcp && node src/load-check.ts --dashboard http://127.0.0.1:28580 --existing \| tee ~/Claude/Projects/triplex-db-2/demo-1b/load-check-1b.txt)`; then stop the dashboard server (Ctrl-C or `pkill -f 'demo-mcp/src/page.ts 28580'`) | 1 to 2 min (it re-reads every save and read through the tunnel) |
| T+11 | Mac | `bash demo/disconnect.sh` | seconds |
| T+11 | server | `bash demo/server-down.sh --delete-work` | 20 s |
| T+12 | Mac | `git add demo/EXAMPLES.md && git -c user.name='Triplex Lab' -c user.email=noreply@anthropic.com commit -m 'Fill the worked examples from the 1 billion database (second slot)' && git push origin exp/DX-DEMO1-billion-demo` | seconds |

**Ready line:** `head=28309866 records=1000251169 t=62888918`, as in the first slot.

**Predictions for the calls that change (gateway ms):**

| Call | First slot | Predicted |
| --- | ---: | --- |
| `list_accounts` (now the checked roster plus one basis call) | 220.64 | 1 to 10 |
| `field_history`, subject 1 (no loader saves), cold | not run | 2 to 40 |
| `field_history`, subject 0 (about 1,411 loader saves), cold | 4,404.67 | 3,000 to 6,000 |
| `field_history`, subject 0, after the save (warm) | 225.21 | 150 to 400 |
| every other call | as measured | within 2 times the first slot's figure |

**The load press (bounds and predictions).** Bounds: 20 saves/s and 200 reads/s offered for at most 60 s across 300 subjects (subjects 2 and up of each account, `:task/field-4`), from the Mac through the tunnel; at most 40 saves and 256 reads in flight. Predicted:

| Measure | Predicted |
| --- | --- |
| Saves acknowledged | 1,150 to 1,200 (20/s for 60 s; a few still in flight at the end); head advances by the same |
| Reads returned | 11,000 to 12,000 (200/s; the tunnel's 60 to 80 ms round trip needs about 16 in flight, under the 256 cap) |
| Commit alone, gateway p50 / p99 | 10 to 40 ms / 50 to 300 ms (the scorecard's 50/s cell: 12.80 / 60.67 ms; the first seconds are cold) |
| Whole save, gateway p50 / p99 (its reads, commit, readback) | 30 to 120 ms / 150 to 800 ms |
| Current reads, gateway p50 / p99 | 1 to 10 ms / 20 to 120 ms (cold subjects first) |
| Pinned reads about 1,000 behind the head, gateway p50 / p99 | 1 to 10 ms / 20 to 150 ms (the probe: p50 1.26 ms at head minus 1,000) |
| Round trip | gateway time plus about 60 to 80 ms per request |
| Errors | 0 |
| Load check | every acknowledged save present at its position; every read exact |

What would show this wrong: any error or a failed check; pinned reads near the head above 30 ms at p50 (they would then share the old-pin cost of about 40 ms of reader CPU); the commit's p99 above 1 s at 20 saves/s.

**What would show the explanation wrong:** subject 1's history read takes over 200 ms cold (then the cost is not the entity's own history), or subject 0's cold read is under 500 ms (then the first slot's 4.4 s was something else, such as a cold peer just after start).

## First slot (ran 2026-11-23 on server 2, passed)

Run on the rented machine that already holds the sealed cluster, after its measurements end and before it is deleted. Nothing is fetched. The machine is used for about 25 minutes, with 5 minutes of slack. `<COMMIT>` is the demo branch commit named in the launch message; `<ADDRESS>` stays in the private brief and in `~/.triplex-demo/server` on the Mac.

## Sequence

| Clock | Where | Command | Predicted time |
| --- | --- | --- | --- |
| T+0 | server, `sudo -i` | `cd /var/tmp && git clone --depth 1 --branch exp/DX-DEMO1-billion-demo https://github.com/OnboardedInc/Triplex-db-experiments.git triplex-demo && cd triplex-demo && git checkout <COMMIT>` (the commit must be the branch head) | 1 min |
| T+1 | server | `[[ -z $(docker ps -q) ]] && df -BG /var/tmp && free -g` (no stack may run; 200 GB free for the copy; 89 GiB or more memory) | seconds |
| T+2 | server | `export PATH=/var/tmp/triplex-bm1/bench4/base-build/tools/bin:$PATH` (Node from the bench bootstrap; on server 2 use its own `base-build/tools/bin`) | seconds |
| T+2 | server | `DEMO_ORIGINAL=/mnt/triplex-scale1-held-age/calibrated-post-ladder/cluster DEMO_HANDOFF=/var/tmp/triplex-scale1/age-v01-bulk-c/rung/1000000000/aged-scorecard.json bash demo/server-up.sh 2>&1 \| tee /var/tmp/triplex-demo-up.log` | 8 to 14 min: bootstrap check under 10 s; copy 3 to 8 min; start 1 to 4 min; identity 1 to 3 min |
| T+15 | Mac | `echo <ADDRESS> > ~/.triplex-demo/server && bash demo/connect.sh` | 10 s |
| T+16 | Mac | `mkdir -p ~/Claude/Projects/triplex-db-2/demo-1b && (cd examples/demo-mcp && node src/proof.ts --json ~/Claude/Projects/triplex-db-2/demo-1b/proof-1b.json)` | 1 to 3 min |
| T+19 | Mac | optional: `bash demo/inspect.sh --page`, open http://127.0.0.1:28580/, load account-003 subject 0, apply one save; stop it with Ctrl-C | 2 min |
| T+21 | Mac | `bash demo/disconnect.sh` | seconds |
| T+21 | server | `bash demo/server-down.sh --delete-work` (removes the 177 GB copy; the original is untouched) | 1 to 2 min |
| T+23 | server | `scp` or `cat` `/var/tmp/triplex-demo-up.log` and `/var/tmp/triplex-demo/state/evidence/` to the Mac evidence folder `evidence/DX-DEMO1/` (compressed) | 1 min |
| T+24 | Mac | in the demo checkout: `git add demo/EXAMPLES.md && git -c user.name='Triplex Lab' -c user.email=noreply@anthropic.com commit -m 'Fill the worked examples from the 1 billion database' && git push origin exp/DX-DEMO1-billion-demo` | seconds |

The Mac checkout must be the demo branch with `pnpm install` done and `@triplex-build/triplex-datomic` built (the builder's worktree is). `server-up.sh` refuses if a demo stack is already up or if the copy was not shut down cleanly.

## What the ready line must say

`DEMO READY head=28309866 records=1000251169 t=62888918`, with the AGE1 scorecard check passed (it runs only on a fresh copy, which this is). Any other head, t or record count stops the slot: the copy or the handoff is not the sealed cut.

## Predictions, written before the run

Gateway time (`serverMs`, the store's own time) per tool. The first call after start is cold (PostgreSQL pages and the peer caches are empty); the rest of the run is warm for the same subject. Round trip adds about two Mac-to-Dallas round trips per request (40 to 70 ms each), so it is not the store's time.

| Tool | Predicted gateway ms |
| --- | --- |
| `database_summary` | 1 to 5 |
| `list_accounts` (10 entities) | 5 to 60 |
| `find_subjects` (5 roots) | 5 to 80 |
| `read_subject`, cold (about 160 facts in about 35 entities) | 30 to 400 |
| `field_history` | 5 to 100 |
| `read_subject_at` (three reads at one cut) | 30 to 500 |
| `change_feed` (5 transactions, aged history and new saves) | 5 to 100 |
| `save_facts` (about 6 requests; the transact alone 15 to 150) | 50 to 400; the first save after start up to 2,000 |
| `correct_past_value`, `retire_fact` | 50 to 400 |
| `read_many_subjects` (16 subjects, cold) | 100 to 1,500 |
| `read_subject` again, warm | 2 to 20 |

**What would show these wrong:**

- **The store is slower than the scorecard implies:** a warm `read_subject` above 200 ms, or a warm save's transact above 1 s with nothing else running. The quiet save p99 forecast at this size is 75 ms (PREP1 cache arm).
- **The compatibility rule is incomplete:** the change feed across the loader's history (example 9) throws "Journal position payload must be null" or "Noncanonical row text header". The Mac toy was aged by AGE1's own code and passed, so a failure here means the server's rows differ from the toy's.
- **Removal:** the gateway accepts the protection declaration in example 14. It refused on the toy (ProtectedScopeNeedsMigration); acceptance would mean the 1 billion scope is in a different state from the handoff's description.
- **Any exactness check fails:** the proof stops at the first failed check and names it.
