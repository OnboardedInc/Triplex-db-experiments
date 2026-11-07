# Rulings recorded but not yet compiled (Q38c: RULINGS.md holds only compiled or explicitly listed entries)

These move into RULINGS.md when the contract version that compiles them is built.

## Q46: rulings on contract 0.3.6 questions (2026-11-08; to compile in the next version)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q46a crash pairs | Accepted: Q42c's crash cases cover all 10 pairs of the five transitions, not only the 4 consecutive gaps. | Q42c |
| Q46b A0 control identity | Accepted: once EXP-N01/N02 measures A0 (at the budget re-freeze), the A0 commit and tree are pinned in the contract and the evaluator takes the control's identity from there, never from the claim. | Q42a |
| Q46c W0 pin layout | Accepted: the W0 pin's file list is adjusted when W0-1.1.1 merges, before V-D01's delta check. | Q44 |
| Q46d O04 follow-up | Accepted: when EXP-O04 lands and is re-verified, a new pin is compiled and the excludes and refusals shrink in that version, with the pin-scope expected-differences list updated. | Q45e |
