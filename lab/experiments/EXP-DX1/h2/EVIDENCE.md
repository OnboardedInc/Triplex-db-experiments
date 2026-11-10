# DX-H2 evidence index

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H2/`.
All timings are diagnostic, CPU 6/7 on the shared triplex2 VM. No acceptance or promotion receipt.

| Path under durable root | Meaning |
| --- | --- |
| `runs/reach-1794259382576` | Original interrupted 1k seed; original receipt and prefix retained, `INTERRUPTED.json` gives reason |
| `runs/reach-1794259710067` | Completed 50-subject W1 + 64-reader diagnostic; PARTIAL, semantic gates checked; early unequal-window ratios are not acceptance evidence |
| `runs/reach-1794260056469` | Interrupted seed to fix duplicate-offer attribution; no gate verdict |
| `runs/reach-1794260501331` | Interrupted seed to work around confirmed whole-journal response cap; no gate verdict |
| `runs/reach-1794261000773` | Interrupted seed before bounded actual command-claim lookup; no gate verdict |
| `runs/reach-1794261626170` | Unqualified 1k W1 baseline, code `65bab24e`; seed and G0 passed, but writer queue did not drain before lease expiry; `TERMINAL.json` binds the observed exit 124 and retained raw prefix |
| `runs/reach-1794266722871` | Final fresh 1k W1 trial, code `7c2b126e`, bounded scalar precondition reads, primary TARGETS writer clock, 660-second baseline completed; FAIL on live-reader ReadError after four ACKed/verified pages (256/1000). Original FAIL receipt, exit 1 and separate TERMINAL.json retained |
| `reader-equivalence.log`, `reader-equivalence2.log` | First failures at 200 subjects; these remain failures |
| `count-diagnosis.log` | Nested actual `Gateway response exceeds 67108864 bytes`; requested public page size does not bound materialization |
| `reader-equivalence3.log` | 3/3 engine tests pass: recorded position content, every 200-subject page at both cuts, every 50-subject stored-journal page equals old route |
| `claims-equivalence.log` | Bounded stored-claim route versus original route, passed engine comparison |
| `reader-tests/` | All actual 50/200-subject seed attempts and scope bindings where available; failures retained |
| `checks4.log` | 21/21 earlier focused unit tests pass |
| `checks6.log` | 23 passed, 2 engine tests intentionally skipped in offline suite; includes malformed-head refusals and offer-to-ACK clock regression |
| `scalar-equivalence.log` | Engine gate passes: present/absent stored claims, every 50-subject journal page, scalar row equality on ten subjects at old/head cuts around a real retirement |
| `focused-typecheck4.log`, `focused-typecheck5.log`, `focused-typecheck7.log` | Changed-source typechecks pass |
| `typecheck.log` | Full bench typecheck with pre-existing unrelated errors |

Stack bring-up evidence is at sibling `evidence/DX-H1/tx2-dxh2-a1/stack.json`, with gateway source copy at `evidence/DX-H1/stage/tx2-dxh2-a1/`. That fixed evidence root is inherited from the supplied stack script. Containers, network and volume are owned by DX-H2 despite this directory label. Only local images were used.

Final cleanup: `cleanup/cleanup.json`, with exact pre-removal inspections/logs; all four containers, network and volume removed, subsequent owned-prefix inventories empty. `checks-final.log` records 4/4 focused tests after the diagnostic failure-logging change. [SHA256SUMS](SHA256SUMS) covers all retained files plus the sibling DX-H1 stack provenance. Raw outputs are never copied into git. Original interrupted receipts are not overwritten or promoted by later attempts.
