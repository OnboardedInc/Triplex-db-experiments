Round 4 of the plan-v2 review, same conversation. Stay adversarial and read-only: do not edit any file.

I accepted every round-3 item as rulings Q34a to Q34e (lab/reviews/plan-v2-round3.responses.md), then ruled Q33 (oracle RULING-NEEDED
items), Q35 (TDK1 decimal order key, one representation; lab/research/R20-order-preserving-decimal-encodings.md), Q36 (W0 open questions:
work item identity and outbox rule, fanout s = 0.5) and Q37 (contract author's questions). Contract 0.3.4 is generated and regenerates
byte-identically (`python3 -I lab/acceptance/build_contract.py`; changelog in ACCEPTANCE.md section 0). The O-TDK1 oracle and vectors are
in lab/oracles/decimal/. O-REPLAY's pin is a required null input until the oracle is accepted after EXP-O03.

Attack, in this order:
1. Round-3 items 14 to 18: CLOSED, PARTIAL or NOT CLOSED in the generated contract, with file:line evidence. For 14, check whether the
   five-block allocator allowlist can be satisfied by an adapter whose behavior changed outside those blocks.
2. Q35 TDK1: any path where a decimal value reaches an engine or an order comparison without passing through the key (for example
   JSON values containing decimals, aggregates, or the QLever lexical channel being used for ORDER BY).
3. Q36a and its clarification: can the "publish only a new id or a changed payload" rule drop a work item a consumer needed (for example
   after a consumer crash, or when a payload changes back to an earlier value)?
4. Whether anything now lets generation 2 make a comparative or promotion claim the evidence does not support, given Q37b (A0 runs
   produce diagnostics only while O-REPLAY's pin is null).

End with READY or NOT READY for generation-2 comparisons and the shortest list of changes to READY. Under 1,000 words, numbered, with
severity per item.
