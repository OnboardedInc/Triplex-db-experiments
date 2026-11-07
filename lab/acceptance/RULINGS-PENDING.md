# Rulings recorded but not yet compiled (Q38c: RULINGS.md holds only compiled or explicitly listed entries)

These move into RULINGS.md when the contract version that compiles them is built.

## Q41: rulings on contract 0.3.5 questions (2026-11-08; to compile in 0.3.6 with Q40)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q41a Q40 timing | Compile Q40 into 0.3.6 once W0-1.1.0 lands (Q40c and Q40h change the outbox rules again: a reappearing work item publishes a new sequence even with an unchanged payload). | Q40 |
| Q41b Q37c correction | Q37c's tdk1_reference.py hash 923f7577... is superseded by Q38e's fix; the pinned hash is 73467589...bf33. | Q38e |
| Q41c Q39b enforcement | Accepted: the 19 engine-scope XTDB obligations touching a native or raw surface are keyed by native language. | Q39b |
| Q41d admit_claim | Accepted: the generator's admit_claim is a reference model with structural receipt checks; lab/bin's evaluator implements it as a minimum and adds the full receipt-validity (VA) rules. | Q38b |
| Q41e O-TDK1 gating | Accepted: TDK1 and decimal-routing obligations fail closed until the independent vector review sets O-TDK1's acceptance and the V5 pin. | Q37b |
