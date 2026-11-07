Round 6 of the plan-v2 review, same conversation. Stay adversarial and read-only: do not edit any file.

Since round 5 I accepted Q42a to Q42c (evidence-backed admission, receiver ordering, one atomic outbox unit), the oracle was independently
accepted (lab/verify/O02/VERIFY.md, V-O03) and pinned with a scope, W0 was reviewed twice (lab/verify/D01/VERIFY.md) and is at W0-1.1.1
(not merged), and contract 0.3.6 compiles Q40 to Q45 (`python3 -I lab/acceptance/build_contract.py --verify`; changelog in ACCEPTANCE.md
section 0). Q46 is pending in lab/acceptance/RULINGS-PENDING.md.

Attack, in this order:
1. Round-5 items 4, 8, 9, 10, 11: CLOSED, PARTIAL or NOT CLOSED in the generated contract, with file:line evidence.
2. The O-REPLAY pin scope (106 closable, 13 blocked; per-oracle exclusion list): any obligation that can close on an answer the oracle
   refuses or gets wrong, or that depends on an unmodeled rule through a case it selects indirectly.
3. Q42a admission as now specified: any receipt-shaped input that it admits without the evidence existing.
4. Anything else that would let generation 2 make a comparative or promotion claim the evidence does not support.

End with READY or NOT READY for generation-2 comparisons (once A0 runs exist) and the shortest list of changes to READY. Under 800 words,
numbered, with severity per item.
