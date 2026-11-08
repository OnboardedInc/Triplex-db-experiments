# V-O04h brief: re-check O-REPLAY 0.4.8 against Q70a-m (saved brief, per Q59c)

## Commander's intent
Same as V-O04g: a page sequence never mixes prefixes or read views, whichever way and through whichever paged kind a case continues it, and
a read decides what is in flight from the scope it reads. 0.4.8 adds Q70l (one continuation rule over a table of paged kinds, with a
self-check that no `next*`-bearing kind is missing) and Q70m (typed integer continuation values; malformed otherwise). ACCEPT means safe to
pin in contract 0.3.11.

## Checks
1. Your probe_q52 at 9984cdc: turn the three "beyond Q70" OBSERVED rows (F11, F12, F13) into checked rows from Q70l and Q70m; add a row
   per paged kind in the oracle's table, including `transactionsForEntity` with disagreeing issuers (refused) and with a different
   `snapshotPosition` (not matched); add `after` as "1", 1.0, -1 and true (all malformed, exit 2). Write expectations from the rulings.
2. Plant a new paged kind in a scratch copy (a query kind whose output carries a `next*` field, not in the table) and show the self-check
   fails.
3. Differential against 91ba352 with your seeds: only the F11-F13 rows and the new rows may differ; explain each.
4. probe_q49, probe_035, probe_delta_033, unit tests, self-check, converters; refusal sites (four, unless Q70m's malformed path is an exit
   2 rather than a raise site; say which).
5. Hashes against the author's hashes.0.4.8.txt; enumerate any remaining route Q70a-m does not name.

## Limits
Scratch `git archive` only, kept until you report; results under lab/verify/O02/V-O04h/ on verify/O02. Commits end with
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not spawn subagents.
