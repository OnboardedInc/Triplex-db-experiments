# Triplex Console proving run on the 1 billion database

`demo/PROVE-CONSOLE.md` on `exp/DX-CON1-functions` (published at `258418c92`; the branch head at launch is named with the result), run on Server 2 after the production-S card, headless, on a fresh working copy of the sealed held cluster.

## Predictions, copied from the document before launch


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

