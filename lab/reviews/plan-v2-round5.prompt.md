Round 5 of the plan-v2 review, same conversation. Stay adversarial and read-only: do not edit any file.

I accepted every round-4 item as Q38a to Q38f (lab/acceptance/RULINGS.md), fixed the decimal vector generator's 28-digit rounding
(lab/oracles/decimal/README.md), and contract 0.3.5 is generated and verifies byte-identically (`python3 -I lab/acceptance/build_contract.py
--verify`). Q40 (W0 changes after an independent W0 review, lab/verify/D01/VERIFY.md) is recorded but not compiled; Q41 is pending in
lab/acceptance/RULINGS-PENDING.md. 124 of 149 obligations are gated on null oracle pins (O-REPLAY, O-TDK1) and fail closed.

Attack, in this order:
1. Round-4 items 1 to 8: CLOSED, PARTIAL or NOT CLOSED in the generated contract, with file:line evidence. For item 1, try to make a
   non-dense or misbehaving allocator pass all position cases including the four falsifiers.
2. Q38b's admit_claim: find any receipt-shaped input that it admits without the evidence existing (for example a receipt bound to the
   right source tree but produced by a different binary, or a falsifier receipt from an earlier commit).
3. Q38f plus Q40c, Q40d, Q40h (outbox sequence, basis ordering, retirement): any interleaving of evaluations, crashes and replays that
   yields a duplicate visible effect, a lost delivery, or a receiver ending on a stale payload.
4. Anything else that would let generation 2 make a comparative or promotion claim the evidence does not support.

End with READY or NOT READY for generation-2 comparisons (diagnostic A0 runs aside) and the shortest list of changes to READY. Under 900
words, numbered, with severity per item.
