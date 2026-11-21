# DX-W1 part 10

The first step adds an optional compact witness to a person's existing save. The witness holds position, clock and the identities added by that save.
The existing revision and predecessor checks still decide. The witness has no effect on what a reader returns.
Untouched people have no witness. An ordinary first assertion still uses the existing writer. An eligible replacement initializes the witness without a rewrite.
The second step would move rows and retirements to new entities and make the compact current record authoritative. That is the proposed source of the scale improvement.
The measured fresh rolling6 writer reached 454 saves per second at 620 offered. The nearly flat 8B estimate remains a forecast.
The working design, cost model and gate scope are in [Owner head](lab/experiments/EXP-DX1/w1/OWNER-HEAD.md).

## Evidence audit

- The new ACK field measures a witness only after the durable native report has the exact owner, native transaction, logical position, clock and assertion identities. The existing operation, claim, revision and journal checks still own acceptance of the save.
- The native gate compares fresh reference and witness scopes, confirms the expected rows, held cuts, exact feed and native records, and counts the witness datoms by native t. The rolling gate checks actual launch readback, the observed witness on each real ACK, exact values at acknowledged cuts and recovered receipts after an actual refused append and restart.
- The removal case checks values at both exact cuts before removal, then compares the returned erased markers and clock to that attempt's removal receipt. It uses a fresh protected scope per mode.
- No server command is attached to the first step. It does not exercise the design's projected scale benefit.
