Round 3 of the plan-v2 review, same conversation. Stay adversarial and read-only: do not edit any file.

I accepted every PARTIAL and NEW item from your round 2 as rulings Q31a to Q31k (responses in lab/reviews/plan-v2-round2.responses.md),
then ruled on the contract author's questions (Q32a to Q32f) and compiled the EXP-F02 wire-exactness rulings (Q30). Contract 0.3.3 is
generated (lab/acceptance/ACCEPTANCE.md changelog section 0; validate with `python3 -I lab/acceptance/build_contract.py`). TARGETS 1.1,
4.1, 6.1 and 7 were revised. One design reversal: Q31e replaces Q28's ACK clause (ACK after source publication; read-your-own-write by
routing to an eligible reader), so a current-index outage no longer stops commits.

Attack, in this order:
1. For each round-2 item (2, 6, 7, 8, 9, 11, 14, 15, 16, 17, 18, 19, 20), CLOSED, PARTIAL or NOT CLOSED in the generated contract, with
   file:line evidence.
2. Q32e: the position falsifiers now gate only non-dense compositions, and a receipt that does not state density counts as non-dense. Is
   there a way for a non-dense candidate to present as dense?
3. Q31e: with ACK before the current index catches up, can read-your-own-write fail on any composition (for example a fallback that is
   itself behind, or a cross-language fallback that answers a different query)?
4. Q30: does rejecting -0 inside JSON values conflict with AMB-04 (bit-exact -0 for number assertions in the journal) or with Q14b?
5. Anything that would let generation 2 make a comparative or promotion claim that the evidence does not support.

End with READY or NOT READY for generation-2 comparisons and the shortest list of changes to READY. Under 1,200 words, numbered, with
severity per item.
