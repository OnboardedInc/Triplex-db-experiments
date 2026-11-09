# V-O04d delta check of O-REPLAY 0.4.2 (exp/O04b-oracle-0.4.2 3e38a61) against the accepted 0.4.1 (a9c1327)

**North star:** the correctness floor under every claim. Pinning 0.4.2 closes G9.erasure.residual-shapes and R.repo.mutation-controls and lets
G1.decimal.channel-routing select all of CS-DECIMAL-ROUTING again (Q59a). **Rulings:** Q52a-g and Q56a-i in lab/acceptance/RULINGS.md; Q66a-d in
lab/acceptance/RULINGS-PENDING.md. **Author's claims:** lab/experiments/EXP-O04-oracle-erasure/REPORT.md section "O-REPLAY 0.4.2".

## Commander's intent
Decide ACCEPT or FIX-FIRST for pinning 0.4.2 at 3e38a61. ACCEPT means: every Q52 shape is answered as the ruling says; Q52e's new in-flight
shape lists exactly the acceptable whole answers (Q66a narrows them to the n + 1 prefixes in position order, so 2^n subsets are a FIX-FIRST);
exactly three refusals remain (run.py:53, views.py:129, entities.py:61); nothing outside these shapes changed (differential against 0.4.1).

## What to check
1. Each of Q52a-g with your own expected answers derived from the ruling text, plus a planted wrong alternative per ruling in --self-test.
2. Q52e and Q66a: one, two and three in-flight erasure commits in one scope; the acceptable list must be the prefixes in position order. Q66b:
   say what `cursorFrom` on an in-flight entry does today.
3. Update probe_q49 and probe_035 for Q52g (the `erasure` spelling is now an E-INVALID-VALUE rejection) and for the new in-flight shape.
4. Differential 0.4.1 (a9c1327) against 0.4.2 (3e38a61) on your probe cases plus seeded random cases (seeds 49 and 4949 as before): every
   difference must be explained by a Q52 or Q56f change.
5. Source grep for X-NOT-MODELED sites; recompute the 29-file hash table.

## Boundaries
Branch verify/O02 (merge exp/O04b-oracle-0.4.2 into a scratch checkout only for running; never edit lab/oracles/replay). Write only
lab/verify/O02/V-O04d/** and lab/verify/O02/tools/**. Stdlib Python with python3 -I; no engines. Commits end with "Co-Authored-By: Claude Opus
5.5 <noreply@anthropic.com>".

## Report (return as text)
Verdict; per-ruling table; in-flight prefix results; differential counts; refusal sites; hash table; commit hash.
