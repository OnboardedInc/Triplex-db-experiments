# Proving slot on the 1 billion database (30 minutes)

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
| T+19 | Mac | optional: `bash demo/inspect.sh --page`, open http://127.0.0.1:28580/, load account-003 member 0, apply one save; stop it with Ctrl-C | 2 min |
| T+21 | Mac | `bash demo/disconnect.sh` | seconds |
| T+21 | server | `bash demo/server-down.sh --delete-work` (removes the 177 GB copy; the original is untouched) | 1 to 2 min |
| T+23 | server | `scp` or `cat` `/var/tmp/triplex-demo-up.log` and `/var/tmp/triplex-demo/state/evidence/` to the Mac evidence folder `evidence/DX-DEMO1/` (compressed) | 1 min |
| T+24 | Mac | in the demo checkout: `git add demo/EXAMPLES.md && git -c user.name='Triplex Lab' -c user.email=noreply@anthropic.com commit -m 'Fill the worked examples from the 1 billion database' && git push origin exp/DX-DEMO1-billion-demo` | seconds |

The Mac checkout must be the demo branch with `pnpm install` done and `@triplex-build/triplex-datomic` built (the builder's worktree is). `server-up.sh` refuses if a demo stack is already up or if the copy was not shut down cleanly.

## What the ready line must say

`DEMO READY head=28309866 records=1000251169 t=62888918`, with the AGE1 scorecard check passed (it runs only on a fresh copy, which this is). Any other head, t or record count stops the slot: the copy or the handoff is not the sealed cut.

## Predictions, written before the run

Gateway time (`serverMs`, the store's own time) per tool. The first call after start is cold (PostgreSQL pages and the peer caches are empty); the rest of the run is warm for the same person. Round trip adds about two Mac-to-Dallas round trips per request (40 to 70 ms each), so it is not the store's time.

| Tool | Predicted gateway ms |
| --- | --- |
| `database_summary` | 1 to 5 |
| `list_accounts` (10 entities) | 5 to 60 |
| `find_people` (5 roots) | 5 to 80 |
| `read_person`, cold (about 160 facts in about 35 entities) | 30 to 400 |
| `field_history` | 5 to 100 |
| `read_person_at` (three reads at one cut) | 30 to 500 |
| `change_feed` (5 transactions, aged history and new saves) | 5 to 100 |
| `save_facts` (about 6 requests; the transact alone 15 to 150) | 50 to 400; the first save after start up to 2,000 |
| `correct_past_value`, `retire_fact` | 50 to 400 |
| `read_many_people` (16 people, cold) | 100 to 1,500 |
| `read_person` again, warm | 2 to 20 |

**What would show these wrong:**

- **The store is slower than the scorecard implies:** a warm `read_person` above 200 ms, or a warm save's transact above 1 s with nothing else running. The quiet save p99 forecast at this size is 75 ms (PREP1 cache arm).
- **The compatibility rule is incomplete:** the change feed across the loader's history (example 9) throws "Journal position payload must be null" or "Noncanonical row text header". The Mac toy was aged by AGE1's own code and passed, so a failure here means the server's rows differ from the toy's.
- **Removal:** the gateway accepts the protection declaration in example 14. It refused on the toy (ProtectedScopeNeedsMigration); acceptance would mean the 1 billion scope is in a different state from the handoff's description.
- **Any exactness check fails:** the proof stops at the first failed check and names it.
