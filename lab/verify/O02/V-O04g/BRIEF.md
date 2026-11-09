# V-O04g brief: re-check O-REPLAY 0.4.7 at exp/O04b-oracle-0.4.2 91ba352 against Q70a-k (saved brief, per Q59c)

## North star
The correctness floor under every erasure claim (P3, P5 and the GS erasure scenarios). ACCEPT means 0.4.7 is safe to pin in contract
0.3.11 together with compiled Q70.

## Commander's intent
A page sequence never mixes prefixes or read views, whichever way a case continues it (cursorFrom, a literal token, a journal `after`), and
a read decides what is in flight from the scope it reads. Nothing outside continuations and read scope changes. Try to break that.

## What changed since your V-O04f (acf9fce)
- 0.4.6 (565bc26): Q70f refuses an ambiguous literal token or journal `after` (typed X-NOT-MODELED at run.py:657); Q70g continues journal
  pages from their issuing read; Q70h compares issuers by view; Q70i applies fail-closed to the journal and needs the same journal scope.
- 0.4.7 (91ba352): Q70j and Q70k, `read_scope(query)`: in-flight erasures come from the scope the read reads, for every kind with a
  `scope` field.
- Rulings: lab/acceptance/RULINGS-PENDING.md Q70a-k on main. Author's report: lab/experiments/EXP-O04-oracle-erasure/REPORT.md, last two
  sections. Author's hashes: /Users/sam/Claude/Projects/triplex-db-2/EXP-O04b-oracle-0.4.2/hashes.0.4.7.txt.

## Checks
1. probe_q52 and `--self-test` at your 4fc48af tools. Turn your F9 and F10 OBSERVED rows into checked rows from Q70f-i; the two Q70d rows
   written for 0.4.5 should now expect the typed refusal. Add rows for Q70h (identical views, different page bodies: continue), Q70i (an
   ambiguous journal `after`: refused) and Q70j/k (a read on scope "t" with erasures on both scopes; at least one kind other than
   `transactions`). Write expectations from the rulings, not from the oracle's output.
2. Differential against acf9fce with your seeds; only continuation and read-scope rows may differ; explain each.
3. probe_q49, probe_035, probe_delta_033, unit tests, self-check, converters; confirm exactly four refusal sites.
4. Recompute all 29 file hashes against hashes.0.4.7.txt.
5. Enumerate every remaining way to continue a page or pick a read's scope that Q70a-k does not name; report any that mixes views.

## Limits
Run 0.4.7 only from a scratch `git archive` and keep it until you report. Tools and results on verify/O02 under lab/verify/O02/V-O04g/.
Never touch /Users/sam/projects/triplex-db or ports 15442 and 17019. Commits end with `Co-Authored-By: Claude Opus 5.5
<noreply@anthropic.com>`. Do not spawn subagents.

## Return
Verdict, per-check table, findings with reproduction, the hash table, your commit on verify/O02.
