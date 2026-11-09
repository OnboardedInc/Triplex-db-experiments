# First reviewer attempt (retained)

The first `CX-VRQ01-offline-a1` execution obtained a heavy slot after waiting.
It exited 1 in review.mjs's `empty-ineligible` fault assertion before producing
its receipt. The review model's future-position guard ran before that injection,
so it threw the correct typed refusal and never returned the intended bad flag.
This is a reviewer probe bug, not a product or harness defect. The corrected
probe returns the injected flag before the model's guard. Its first three
completed fault receipts remain in evidence-a1. New execution uses evidence-a2.
The initial tool output reported `AssertionError: empty-ineligible: missing HE-1`.
